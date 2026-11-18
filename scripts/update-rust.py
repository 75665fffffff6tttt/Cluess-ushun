#!/usr/bin/env python3
"""Буғдой сариқ занги учун соатлик об-ҳаво кўрсаткичлари → plant-protection/data/rust.json

Ҳар туман (Ўзбекистон, 199; қўшни давлатлар — «n…» калитлар) учун битта нуқта: туман экин майдонидаги энг катта вазнли 0.25°
катак (data/wx-points.json), бўлмаса туман маркази. Open-Meteo соатлик маълумотидан ҳар кун учун:
  w  — юқиш учун қулай соатлар: ҳарорат 5–15 °C ва барг ҳўл (нисбий намлик ≥ 90 %,
       ёки ёмғир > 0.1 мм, ёки ҳарорат − шудринг нуқтаси ≤ 2 °C)
  tm — кунлик ўртача ҳарорат ×10, tx — кунлик энг юқори ×10
  r  — ёмғирли соатлар (> 0.1 мм), h — нисбий намлик ≥ 90 % соатлар,
  c  — энг узун УЗЛУКСИЗ салқин ва ҳўл давр (соат) — споралар униши учун узлуксиз ҳўллик керак
  rh — кунлик ўртача нисбий намлик (%), td/tn — кундузги (07–18) ва тунги ўртача ҳарорат ×10
  e  — юқиш учун қулай соатлар (De Wolf ва бошқ., 2026, Plant Disease): намлик ≥ 87 % ва 5–25 °C;
       кунда > 8 соат — «юқиш ҳодисаси»
  wl, tw — SEIR учун: (d−1) 12:00 – d 12:00 ойнасида энг узун узлуксиз ҳўл давр (соат; намлик ≥ 90 % ёки ёмғир)
       ва шу даврдаги ўртача ҳарорат ×10 (scripts/wetnight.py)
Файл (v5): {"start": "YYYY-01-01", "days": N, "n": 12, "d": {"0": [w, tm, tx, r, h, c, rh, td, tn, e, wl, tw, ...]}, ...}
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
_spec2 = importlib.util.spec_from_file_location("wn", os.path.join(ROOT, "scripts", "wetnight.py"))
wn = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(wn)

OUT = os.path.join(uw.P, "data", "rust.json")
BUDGET = float(os.environ.get("RUST_BUDGET", "3000"))
HOURLY = "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation"
T_LO, T_HI, RH_WET, DEW_GAP = 5.0, 15.0, 90.0, 2.0
INF_RH, INF_TLO, INF_THI = 87.0, 5.0, 25.0  # юқиш ҳодисаси соати (De Wolf ва бошқ., 2026)


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
    # қўшни давлатлар туманлари (харитадаги «n…» ҳудудлар): экин майдони бор энг катта вазнли катак
    for k, e in wp.items():
        if k.startswith("n") and isinstance(e, dict) and e.get("c"):
            best = max(e["c"], key=lambda kw: kw[1])[0]
            la, lo = (float(x) for x in best.split(","))
            pts[k] = (la, lo)
    return pts


NF = 12  # кун учун майдонлар сони (v3: + ўртача намлик, кундузги ва тунги ҳарорат — расмий календарь; v4: + юқиш соатлари; v5: + ҳўл тун)


def daily(obj):
    """Соатлик жавоб → {сана: (w, tm10, tx10, r, h, c, rh, td10, tn10, e)}"""
    h = (obj or {}).get("hourly") or {}
    tt, t, rh, dp, pr = (h.get(k) or [] for k in ("time", "temperature_2m", "relative_humidity_2m", "dew_point_2m", "precipitation"))
    out = {}
    for j, ts in enumerate(tt):
        if j >= len(t) or t[j] is None:
            continue
        d = ts[:10]
        o = out.setdefault(d, [0, 0.0, -99.0, 0, 0, 0, 0, 0, 0.0, 0, 0.0, 0, 0.0, 0, 0])  # w, sumT, tx, n, r, h, run, cmax, sumRH, nRH, sumDay, nDay, sumNight, nNight, inf
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
        if j < len(rh) and rh[j] is not None:
            o[8] += rh[j]; o[9] += 1
            if rh[j] >= INF_RH and INF_TLO <= T <= INF_THI:
                o[14] += 1
        hr = int(ts[11:13])
        if 7 <= hr <= 18:
            o[10] += T; o[11] += 1
        else:
            o[12] += T; o[13] += 1
    WN = wn.wet_nights(tt, t, rh, pr)
    res = {}
    for d, v in out.items():
        if v[3] < 20:
            continue
        w_ = WN.get(dt.date.fromisoformat(d))
        res[d] = (v[0], int(round(v[1] / v[3] * 10)), int(round(v[2] * 10)), v[4], v[5], v[7],
                  int(round(v[8] / max(1, v[9]))), int(round(v[10] / max(1, v[11]) * 10)), int(round(v[12] / max(1, v[13]) * 10)), v[14],
                  w_[0] if w_ else None, (int(round(w_[1] * 10)) if w_ and w_[1] is not None else None))
    return res


def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    past = int(os.environ.get("RUST_YEAR") or 0)  # ўтган йил: фақат архив → rust-YEAR.json
    if past and past < today.year:
        global OUT
        OUT = os.path.join(uw.P, "data", "rust-%d.json" % past)
        start = dt.date(past, 1, 1)
        days = (dt.date(past, 12, 31) - start).days + 1
        end = dt.date.fromisoformat(os.environ["RUST_TO"]) if os.environ.get("RUST_TO") else dt.date(past, 12, 31)
        today = end + dt.timedelta(days=6)  # архив охири = RUST_TO ёки 31-декабр
    else:
        past = 0
        start = dt.date(today.year, 1, 1)
        days = (today - start).days + uw.FC_FUTURE
    j_from = 0
    if os.environ.get("RUST_FROM"):  # архивни шу санадан тўлдириш (масалан 2025-08-01)
        j_from = max(0, (dt.date.fromisoformat(os.environ["RUST_FROM"]) - start).days)
    st = None
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as fh:
                st = json.load(fh)
        except Exception:
            st = None
    if not past and st and st.get("start") != start.isoformat():
        arc = os.path.join(uw.P, "data", "rust-%s.json" % st["start"][:4])  # янги йил: ўтган йил сақланади
        y0 = dt.date.fromisoformat(st["start"])
        n_y = min(st.get("days", 0), (dt.date(y0.year, 12, 31) - y0).days + 1)  # фақат 31-декабргача (прогноз кунлари кесилади)
        nf = st.get("n", NF)
        st["d"] = {k: a[:nf * n_y] for k, a in st["d"].items()}
        st["days"] = n_y
        with open(arc, "w", encoding="utf-8") as fh:
            json.dump(st, fh, separators=(",", ":"))
        st = None
    if st and st.get("v") == 3 and st.get("n") == 9:
        # v3 → v4: эски 9 майдон сақланади, юқиш соатлари (e) бўш — архивдан қайта тўлдирилади
        for k, a in st["d"].items():
            b = []
            for j in range(st["days"]):
                b += a[9 * j:9 * j + 9] + [None]
            st["d"][k] = b
        st.update({"v": 4, "n": NF})
        st.setdefault("rule", {})["inf"] = [INF_RH, INF_TLO, INF_THI]
    if st and st.get("v") == 4 and st.get("n") == 10:
        # v4 → v5: ҳўл тун майдонлари (wl, tw) бўш — архивдан қайта тўлдирилади
        for k, a in st["d"].items():
            b = []
            for j in range(st["days"]):
                b += a[10 * j:10 * j + 10] + [None, None]
            st["d"][k] = b
        st.update({"v": 5, "n": NF})
    if st and st.get("v") != 5:
        st = None  # эски формат — қайтадан
    if not st:
        st = {"v": 5, "n": NF, "start": start.isoformat(), "days": days, "d": {},
              "rule": {"tLo": T_LO, "tHi": T_HI, "rh": RH_WET, "dew": DEW_GAP, "inf": [INF_RH, INF_TLO, INF_THI]}}
    if st["days"] < days:
        for k in st["d"]:
            st["d"][k] += [None] * (NF * (days - st["days"]))
        st["days"] = days
    pts = points()
    if os.environ.get("RUST_ONLY") == "uz":  # фақат Ўзбекистон туманлари (лимитни тежаш)
        pts = {k: v for k, v in pts.items() if not k.startswith("n")}
    for k in pts:
        st["d"].setdefault(k, [None] * (NF * days))
    keys = sorted(pts, key=lambda k: (k.startswith("n"), int(k.lstrip("n"))))
    spent = 0.0

    def put(ch, resp, until=None, since=None):
        for k, obj in zip(ch, resp):
            for ds, vals in daily(obj).items():
                d = dt.date.fromisoformat(ds)
                if (until and d > until) or (since and d < since):
                    continue
                if vals[10] is None:  # ойна тўлиқ эмас (сўровнинг биринчи куни) — бор қийматни бузмаймиз
                    j = (d - start).days
                    if 0 <= j < days and st["d"][k][NF * j + 10] is not None:
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
        # 1) прогноз: охирги 7 кун + 16 кун (ўтган йил учун йўқ)
        for i in range(0, len(keys) if not past else 0, 50):
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
            first = next((j for j in range(j_from, last + 1) if a[NF * j] is None or a[NF * j + 9] is None or a[NF * j + 10] is None), None)
            if first is not None:
                groups.setdefault(first, []).append(k)
        for first in sorted(groups):
            d0 = start + dt.timedelta(days=first)
            n = (arch_end - d0).days + 1
            q0 = max(dt.date(1940, 1, 2), d0 - dt.timedelta(days=1))  # ҳўл тун ойнаси учун олдинги кун ҳам
            g = groups[first]
            per = max(1, min(20, int(uw.MIN_CAP // weight(1, n))))
            for i in range(0, len(g), per):
                ch = g[i:i + per]
                w = weight(len(ch), n + 1)
                if spent + w > BUDGET:
                    raise Stop("run budget")
                resp = call(uw.ARCHIVE, {
                    "latitude": ",".join("%.2f" % pts[k][0] for k in ch), "longitude": ",".join("%.2f" % pts[k][1] for k in ch),
                    "start_date": q0.isoformat(), "end_date": arch_end.isoformat(), "hourly": HOURLY, "timezone": uw.TZ,
                }, len(ch), n + 1)
                spent += w
                if resp:
                    put(ch, resp, until=arch_end, since=d0)
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
