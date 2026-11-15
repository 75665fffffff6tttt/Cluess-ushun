#!/usr/bin/env python3
"""Буғдой сариқ занги учун соатлик об-ҳаво кўрсаткичлари → plant-protection/data/rust.json

Ҳар туман (Ўзбекистон, 199) учун битта нуқта: туман экин майдонидаги энг катта вазнли 0.25°
катак (data/wx-points.json), бўлмаса туман маркази. Open-Meteo соатлик маълумотидан ҳар кун учун:
  w  — юқиш учун қулай соатлар: ҳарорат 5–15 °C ва барг ҳўл (нисбий намлик ≥ 90 %,
       ёки ёмғир > 0.1 мм, ёки ҳарорат − шудринг нуқтаси ≤ 2 °C)
  tm — кунлик ўртача ҳарорат ×10, tx — кунлик энг юқори ×10
  r  — ёмғирли соатлар (> 0.1 мм), h — нисбий намлик ≥ 90 % соатлар,
  c  — энг узун УЗЛУКСИЗ салқин ва ҳўл давр (соат) — споралар униши учун узлуксиз ҳўллик керак
Файл (v2): {"start": "YYYY-01-01", "days": N, "n": 6, "d": {"0": [w, tm, tx, r, h, c, ...]}, ...}
Прогноз (охирги 7 + 16 кун) ҳар ишга туширишда; архив (1-январдан) — бўш кунлар, лимит ичида.
Модел (юқиш хавфи, яширин давр) — сайтда (js/fenologik.js). Параметрлар — тахминий, текширилмаган.
"""
import datetime as dt
import importlib.util
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("uw", os.path.join(ROOT, "scripts", "update-weather.py"))
uw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uw)
log, call, Stop, weight = uw.log, uw.call, uw.Stop, uw.weight

OUT = os.path.join(uw.P, "data", "rust.json")
BUDGET = float(os.environ.get("RUST_BUDGET", "3000"))
HOURLY = "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation"
T_LO, T_HI, RH_WET, DEW_GAP = 5.0, 15.0, 90.0, 2.0


def points():
    with open(os.path.join(uw.P, "js", "uz-geo.js"), encoding="utf-8") as fh:
        geo = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    wp = {}
    try:
        with open(os.path.join(uw.P, "data", "wx-points.json"), encoding="utf-8") as fh:
            wp = json.load(fh)["d"]
    except Exception:
        pass
    pts = {}
    for i, g in enumerate(geo):
        if not g:
            continue
        e = wp.get(str(i))
        best = None
        if isinstance(e, dict) and e.get("c"):
            best = max(e["c"], key=lambda kw: kw[1])[0]
        elif isinstance(e, list) and e:
            best = e[0]
        if best:
            la, lo = (float(x) for x in best.split(","))
        else:
            la, lo = uw.snap(g[0]), uw.snap(g[1])
        pts[str(i)] = (la, lo)
    return pts


NF = 6  # кун учун майдонлар сони


def daily(obj):
    """Соатлик жавоб → {сана: (w, tm10, tx10, r, h, c)}"""
    h = (obj or {}).get("hourly") or {}
    tt, t, rh, dp, pr = (h.get(k) or [] for k in ("time", "temperature_2m", "relative_humidity_2m", "dew_point_2m", "precipitation"))
    out = {}
    for j, ts in enumerate(tt):
        if j >= len(t) or t[j] is None:
            continue
        d = ts[:10]
        o = out.setdefault(d, [0, 0.0, -99.0, 0, 0, 0, 0, 0])  # w, sumT, tx, n, r, h, run, cmax
        T = t[j]
        rain = j < len(pr) and pr[j] is not None and pr[j] > 0.1
        humid = j < len(rh) and rh[j] is not None and rh[j] >= RH_WET
        dew = j < len(dp) and dp[j] is not None and T - dp[j] <= DEW_GAP
        good = T_LO <= T <= T_HI and (rain or humid or dew)
        if good:
            o[0] += 1
        o[1] += T
        o[2] = max(o[2], T)
        o[3] += 1
        o[4] += 1 if rain else 0
        o[5] += 1 if humid else 0
        o[6] = o[6] + 1 if good else 0
        o[7] = max(o[7], o[6])
    return {d: (v[0], int(round(v[1] / v[3] * 10)), int(round(v[2] * 10)), v[4], v[5], v[7]) for d, v in out.items() if v[3] >= 20}


def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    start = dt.date(today.year, 1, 1)
    days = (today - start).days + uw.FC_FUTURE
    st = None
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as fh:
                st = json.load(fh)
        except Exception:
            st = None
    if st and st.get("start") != start.isoformat():
        arc = os.path.join(uw.P, "data", "rust-%s.json" % st["start"][:4])  # янги йил: ўтган йил сақланади
        with open(arc, "w", encoding="utf-8") as fh:
            json.dump(st, fh, separators=(",", ":"))
        st = None
    if st and st.get("v") != 2:
        st = None  # эски формат (3 майдон) — қайтадан
    if not st:
        st = {"v": 2, "n": NF, "start": start.isoformat(), "days": days, "d": {},
              "rule": {"tLo": T_LO, "tHi": T_HI, "rh": RH_WET, "dew": DEW_GAP}}
    if st["days"] < days:
        for k in st["d"]:
            st["d"][k] += [None] * (NF * (days - st["days"]))
        st["days"] = days
    pts = points()
    for k in pts:
        st["d"].setdefault(k, [None] * (NF * days))
    keys = sorted(pts, key=int)
    spent = 0.0

    def put(ch, resp, until=None):
        for k, obj in zip(ch, resp):
            for ds, vals in daily(obj).items():
                d = dt.date.fromisoformat(ds)
                if until and d > until:
                    continue
                j = (d - start).days
                if 0 <= j < days:
                    st["d"][k][NF * j:NF * j + NF] = list(vals)

    def save():
        st["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
        tmp = OUT + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(st, fh, separators=(",", ":"))
        os.replace(tmp, OUT)

    try:
        # 1) прогноз: охирги 7 кун + 16 кун
        for i in range(0, len(keys), 50):
            ch = keys[i:i + 50]
            resp = call(uw.FORECAST, {
                "latitude": ",".join("%.2f" % pts[k][0] for k in ch), "longitude": ",".join("%.2f" % pts[k][1] for k in ch),
                "hourly": HOURLY, "past_days": uw.FC_PAST, "forecast_days": uw.FC_FUTURE, "timezone": uw.TZ,
            }, len(ch), uw.FC_PAST + uw.FC_FUTURE)
            spent += weight(len(ch), uw.FC_PAST + uw.FC_FUTURE)
            if resp:
                put(ch, resp)
        save()
        log("forecast ok, weight %.0f" % spent)
        # 2) архив: 1-январдан бугун−6 гача бўш кунлар (энг эскисидан)
        arch_end = today - dt.timedelta(days=6)
        last = (arch_end - start).days
        groups = {}
        for k in keys:
            a = st["d"][k]
            first = next((j for j in range(0, last + 1) if a[NF * j] is None), None)
            if first is not None:
                groups.setdefault(first, []).append(k)
        for first in sorted(groups):
            d0 = start + dt.timedelta(days=first)
            n = (arch_end - d0).days + 1
            g = groups[first]
            per = max(1, min(20, int(uw.MIN_CAP // weight(1, n))))
            for i in range(0, len(g), per):
                ch = g[i:i + per]
                w = weight(len(ch), n)
                if spent + w > BUDGET:
                    raise Stop("run budget")
                resp = call(uw.ARCHIVE, {
                    "latitude": ",".join("%.2f" % pts[k][0] for k in ch), "longitude": ",".join("%.2f" % pts[k][1] for k in ch),
                    "start_date": d0.isoformat(), "end_date": arch_end.isoformat(), "hourly": HOURLY, "timezone": uw.TZ,
                }, len(ch), n)
                spent += w
                if resp:
                    put(ch, resp, until=arch_end)
                save()
                log("archive %s +%d days, %d points" % (d0, n, len(ch)))
    except Stop as e:
        log("stopped:", e)
    save()
    full = sum(1 for k in keys if st["d"][k][0] is not None)
    log("districts %d, from Jan 1: %d, weight %.0f" % (len(keys), full, spent))
    return 0


if __name__ == "__main__":
    sys.exit(main())
