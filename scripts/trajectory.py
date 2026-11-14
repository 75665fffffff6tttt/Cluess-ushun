#!/usr/bin/env python3
"""Капалаклар қаердан учиб келган бўлиши мумкин: орқага шамол траекторияси (ERA5, Open-Meteo архиви)

Тунги учиш (19:00–04:00, Тошкент вақти) давомида капалак шамол билан бирга сурилади деб олинади
(кўчиб юрувчи тунламлар учун кенг қўлланадиган соддалаштириш; Хитойдаги тадқиқотлардагидек).
Ҳар тун учун қабул қилувчи нуқтадан (масалан, Урганч) орқага — 1, 2, 3 тун. Кундузи капалак
дам олади (силжимайди). Учиш шарти: тун бошида (19:00) ҳаво ҳарорати ≥ FLY_T °C.

Шамол: 100 м баландликдаги (ERA5) — капалаклар одатда юқорироқ (200–1000 м) учади,
шунинг учун натижа йўналишни кўрсатади, аниқ масофани эмас.

Чиқиш: data-hist/traj-<йил>.json — ҳар тун учун орқага 1, 2, 3 тун кейинги нуқталар.
Муҳит: TRAJ_START, TRAJ_END (YYYY-MM-DD), TRAJ_GRID="lat0,lat1,lon0,lon1", FLY_T.
"""
import datetime as dt
import importlib.util
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("uw", os.path.join(ROOT, "scripts", "update-weather.py"))
uw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uw)
log, call = uw.log, uw.call

START = dt.date.fromisoformat(os.environ.get("TRAJ_START", "2026-03-01"))
END = dt.date.fromisoformat(os.environ.get("TRAJ_END", "2026-06-30"))
LA0, LA1, LO0, LO1 = (int(x) for x in os.environ.get("TRAJ_GRID", "33,46,50,70").split(","))
FLY_T = float(os.environ.get("FLY_T", "12"))
NIGHTS = 3
RECEPTORS = {"Урганч": (41.55, 60.63), "Нукус": (42.46, 59.61), "Тўрткўл": (41.55, 61.0)}
OUT = os.path.join(ROOT, "data-hist", "traj-%d.json" % START.year)


def fetch_grid():
    pts = [(la, lo) for la in range(LA0, LA1 + 1) for lo in range(LO0, LO1 + 1)]
    n = (END - START).days + 1
    W = {}
    B = 10
    for i in range(0, len(pts), B):
        ch = pts[i:i + B]
        resp = call(uw.ARCHIVE, {
            "latitude": ",".join(str(p[0]) for p in ch), "longitude": ",".join(str(p[1]) for p in ch),
            "start_date": START.isoformat(), "end_date": END.isoformat(),
            "hourly": "wind_speed_100m,wind_direction_100m,temperature_2m", "wind_speed_unit": "ms",
            "timezone": uw.TZ,
        }, len(ch), n)
        if not resp:
            raise SystemExit("archive request failed")
        for p, obj in zip(ch, resp):
            h = obj.get("hourly") or {}
            ws, wd, tt = h.get("wind_speed_100m") or [], h.get("wind_direction_100m") or [], h.get("temperature_2m") or []
            u, v = [], []
            for s, d in zip(ws, wd):
                if s is None or d is None:
                    u.append(None); v.append(None); continue
                r = math.radians(d)  # шамол қаердан эсади → u,v (қаерга)
                u.append(-s * math.sin(r)); v.append(-s * math.cos(r))
            W[p] = (u, v, tt)
        log("grid %d/%d" % (min(i + B, len(pts)), len(pts)))
    return W, n * 24


def interp(W, la, lo, hidx, k):
    la0, lo0 = math.floor(la), math.floor(lo)
    if la0 < LA0 or la0 + 1 > LA1 or lo0 < LO0 or lo0 + 1 > LO1:
        return None
    fy, fx = la - la0, lo - lo0
    acc = 0.0
    for (a, b, w) in ((la0, lo0, (1 - fy) * (1 - fx)), (la0 + 1, lo0, fy * (1 - fx)), (la0, lo0 + 1, (1 - fy) * fx), (la0 + 1, lo0 + 1, fy * fx)):
        val = W[(a, b)][k][hidx]
        if val is None:
            return None
        acc += w * val
    return acc


def main():
    W, H = fetch_grid()
    out = {"start": START.isoformat(), "end": END.isoformat(), "grid": [LA0, LA1, LO0, LO1], "flyT": FLY_T,
           "wind": "100m ERA5", "receptors": {k: list(v) for k, v in RECEPTORS.items()}, "nights": []}
    day = START + dt.timedelta(days=NIGHTS)
    while day <= END:
        for name, (la, lo) in RECEPTORS.items():
            path = [[round(la, 3), round(lo, 3)]]
            ok_nights = 0
            cla, clo = la, lo
            for nb in range(NIGHTS):
                # тун: (day-nb-1) 19:00 → (day-nb) 04:00; орқага: 04:00 дан 19:00 гача
                end_h = ((day - dt.timedelta(days=nb)) - START).days * 24 + 4
                st_h = end_h - 9
                if st_h < 0:
                    break
                t0 = interp(W, cla, clo, st_h, 2)
                for hh in range(end_h, st_h, -1):
                    u = interp(W, cla, clo, hh, 0); v = interp(W, cla, clo, hh, 1)
                    if u is None or v is None:
                        break
                    cla -= v * 3600 / 111000.0
                    clo -= u * 3600 / (111000.0 * math.cos(math.radians(cla)))
                path.append([round(cla, 3), round(clo, 3)])
                if t0 is not None and t0 >= FLY_T:
                    ok_nights += 1
            out["nights"].append({"d": day.isoformat(), "r": name, "p": path, "fly": ok_nights})
        day += dt.timedelta(days=1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    log("→ %s, %d trajectories" % (OUT, len(out["nights"])))


if __name__ == "__main__":
    main()
