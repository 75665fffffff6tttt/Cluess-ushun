#!/usr/bin/env python3
"""Сариқ занг модели кўрсаткичлари кўп йиллар бўйича (ERA5 соатлик, Open-Meteo архиви) → data-hist/rust-history.json

Мақсад: моделни маълум эпидемия йиллари (1999, 2004, 2009, 2010, 2016, 2023, 2024) билан текшириш.
Нуқталар: ҳар вилоятдан буғдой майдони энг катта 2 туман (data/wheat-area.json), уларнинг экин нуқтаси
(data/wx-points.json). Ҳар йил учун 1-январ – 30-июн соатлик маълумотдан ҳисобланади (соатлик маълумот сақланмайди):
  p3, p2   — март–май: *** ва ** 5 кунликлар (расмий мезон: 15–25 °C ва намлик ≥ 70 %; 5–15 °C ва ≥ 55 %)
  inf      — март–май: юқиш кунлари (кунда > 8 соат намлик ≥ 87 % ва 5–25 °C; De Wolf ва бошқ., 2026)
  infw     — найчалаш–гуллаш (1-феврадан 0 °C йиғинди 400–1150) даври юқиш кунлари
  rh, rain — март–май ўртача намлик (%) ва ёмғирли соатлар; tmar — март ўртача ҳарорат
  cold     — январ–феврал: ўртача ҳарорат < 0 °C кунлар
Давом эттирилади (тайёр йиллар қайта олинмайди). Муҳит: RH_YEARS="1995-2026", RH_BUDGET.
"""
import datetime as dt
import importlib.util
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("uw", os.path.join(ROOT, "scripts", "update-weather.py"))
uw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uw)
log, call, Stop, weight = uw.log, uw.call, uw.Stop, uw.weight

OUT = os.path.join(ROOT, "data-hist", "rust-history.json")
BUDGET = float(os.environ.get("RH_BUDGET", "4500"))
HOURLY = "temperature_2m,relative_humidity_2m,precipitation"
VER = 2  # v2: кунлик қатор ҳам сақланади (SEIR калибрлаш учун)


def years():
    a, b = os.environ.get("RH_YEARS", "1995-2026").split("-")
    return list(range(int(a), int(b) + 1))


def points():
    P = uw.P
    with open(os.path.join(P, "js", "uz-districts.js"), encoding="utf-8") as fh:
        U = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    with open(os.path.join(P, "data", "wheat-area.json"), encoding="utf-8") as fh:
        WA = json.load(fh)["d"]
    with open(os.path.join(P, "data", "wx-points.json"), encoding="utf-8") as fh:
        WP = json.load(fh)["d"]
    by = {}
    for k, v in WA.items():
        e = WP.get(k)
        if not (isinstance(e, dict) and e.get("c")):
            continue
        r = U["items"][int(k)]["r"]
        by.setdefault(r, []).append((v["ha"], k, max(e["c"], key=lambda kw: kw[1])[0]))
    pts = {}
    for r, L in by.items():
        for ha, k, cell in sorted(L, reverse=True)[:2]:
            if ha < 2000:
                continue
            la, lo = (float(x) for x in cell.split(","))
            pts[k] = {"r": r, "lat": la, "lon": lo, "ha": ha}
    return pts


def metrics(obj, y):
    h = (obj or {}).get("hourly") or {}
    tt, T, RH, PR = (h.get(k) or [] for k in ("time", "temperature_2m", "relative_humidity_2m", "precipitation"))
    D = {}
    for j, ts in enumerate(tt):
        if j >= len(T) or T[j] is None or j >= len(RH) or RH[j] is None:
            continue
        o = D.setdefault(ts[:10], [0.0, 0.0, 0, 0, 0])  # sumT, sumRH, n, infH, rainH
        o[0] += T[j]; o[1] += RH[j]; o[2] += 1
        if RH[j] >= 87 and 5 <= T[j] <= 25:
            o[3] += 1
        if j < len(PR) and PR[j] is not None and PR[j] > 0.1:
            o[4] += 1
    day = {dt.date.fromisoformat(d): (v[0] / v[2], v[1] / v[2], v[3], v[4]) for d, v in D.items() if v[2] >= 20}
    # кунлик қатор (1-январдан): tm×10, tx×10, h (намлик ≥ 90 % соат), tn×10 (тунги 19–06), r (ёмғирли соат)
    ser = {"tm": [], "tx": [], "h": [], "tn": [], "r": []}
    TX, H90, TN = {}, {}, {}
    for j, ts in enumerate(tt):
        if j >= len(T) or T[j] is None:
            continue
        dd, hr = ts[:10], int(ts[11:13])
        TX[dd] = max(TX.get(dd, -99), T[j])
        if j < len(RH) and RH[j] is not None and RH[j] >= 90:
            H90[dd] = H90.get(dd, 0) + 1
        if hr >= 19 or hr <= 6:
            a_ = TN.setdefault(dd, [0.0, 0])
            a_[0] += T[j]; a_[1] += 1
    d = dt.date(y, 1, 1)
    while d <= dt.date(y, 6, 30):
        k_ = d.isoformat(); v = day.get(d)
        ok = v is not None and k_ in TN and TN[k_][1]
        ser["tm"].append(int(round(v[0] * 10)) if ok else None)
        ser["tx"].append(int(round(TX[k_] * 10)) if ok else None)
        ser["h"].append(H90.get(k_, 0) if ok else None)
        ser["tn"].append(int(round(TN[k_][0] / TN[k_][1] * 10)) if ok else None)
        ser["r"].append(v[3] if ok else None)
        d += dt.timedelta(days=1)
    g, inf, infw, rh, rain, tmar, cold = 0.0, 0, 0, [], 0, [], 0
    d = dt.date(y, 1, 1)
    while d <= dt.date(y, 6, 30):
        v = day.get(d)
        if v:
            if d.month <= 2 and v[0] < 0:
                cold += 1
            if d >= dt.date(y, 2, 1):
                g += max(0.0, v[0])
            if 3 <= d.month <= 5:
                rh.append(v[1]); rain += v[3]
                if v[2] > 8:
                    inf += 1
            if d.month == 3:
                tmar.append(v[0])
            if 400 <= g < 1150 and v[2] > 8:
                infw += 1
        d += dt.timedelta(days=1)
    p3 = p2 = 0
    for m in (3, 4, 5):
        last = (dt.date(y, m + 1, 1) - dt.timedelta(days=1)).day
        for p in range(6):
            a, b = 1 + 5 * p, (5 + 5 * p if p < 5 else last)
            vs = [day[dt.date(y, m, q)] for q in range(a, b + 1) if dt.date(y, m, q) in day]
            if not vs:
                continue
            t_, h_ = sum(x[0] for x in vs) / len(vs), sum(x[1] for x in vs) / len(vs)
            if 15 <= t_ <= 25 and h_ >= 70:
                p3 += 1
            elif 5 <= t_ < 15 and h_ >= 55:
                p2 += 1
    return {"p3": p3, "p2": p2, "inf": inf, "infw": infw, "rh": round(sum(rh) / max(1, len(rh)), 1),
            "rain": rain, "tmar": round(sum(tmar) / max(1, len(tmar)), 1), "cold": cold, "ser": ser}


def main():
    pts = points()
    keys = sorted(pts, key=int)
    st = {"pts": pts, "y": {}}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            old = json.load(fh)
        if set(old.get("pts", {})) == set(pts):
            st = old
    st["v"] = VER
    spent = 0.0
    n = 182
    try:
        for y in years():
            if str(y) in st["y"] and len(st["y"][str(y)]) == len(keys) and all("ser" in v for v in st["y"][str(y)].values()):
                continue
            res = {}
            for i in range(0, len(keys), 13):
                ch = keys[i:i + 13]
                w = weight(len(ch), n)
                if spent + w > BUDGET:
                    raise Stop("run budget")
                resp = call(uw.ARCHIVE, {
                    "latitude": ",".join("%.2f" % pts[k]["lat"] for k in ch), "longitude": ",".join("%.2f" % pts[k]["lon"] for k in ch),
                    "start_date": "%d-01-01" % y, "end_date": "%d-06-30" % y, "hourly": HOURLY, "timezone": uw.TZ,
                }, len(ch), n)
                spent += w
                if not resp:
                    raise Stop("request failed")
                for k, obj in zip(ch, resp):
                    res[k] = metrics(obj, y)
            st["y"][str(y)] = res
            with open(OUT, "w", encoding="utf-8") as fh:
                json.dump(st, fh, ensure_ascii=False, separators=(",", ":"))
            log("year %d done, weight %.0f" % (y, spent))
    except Stop as e:
        log("stopped:", e)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(st, fh, ensure_ascii=False, separators=(",", ":"))
    log("years done: %d" % len(st["y"]))


if __name__ == "__main__":
    sys.exit(main())
