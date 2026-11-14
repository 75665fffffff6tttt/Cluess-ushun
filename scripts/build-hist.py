#!/usr/bin/env python3
"""Ўтган йиллар кунлик ҳарорати (Open-Meteo ERA5 архиви) → data-hist/hist-1deg.json

Узоқ муддатли прогноз (scripts/build-outlook.cjs) учун: бугундан кейинги кунлар ўрнига
ўтган 10 йилнинг ҳар бирининг об-ҳавоси қўйилади («аналог йиллар»).

- Тўр: 1° (Ўзбекистон экин майдонлари учун ~95 нуқта) — 0.25° катакдан 16 марта кам
  сўров; ҳарорат аномалиялари катта масофада бир хил. Майда катак билан фарқ
  (тоғ/водий) жорий йил маълумоти бўйича ойлик тузатма билан йўқотилади (build-outlook).
- Йиллар: охирги 10 тўлиқ йил (энг янгисидан бошлаб) + жорий йил (1-январдан, ҳар куни
  фақат янги кунлар — тузатма учун).
- Open-Meteo лимитлари: бир ишга туширишда HIST_BUDGET оғирликдан ошмайди; тугамаса,
  келаси ишга туширишда давом этади (файл ҳар қадамда сақланади).
- Файл сайтга чиқмайди (plant-protection/ ташқарисида).

Фақат стандарт кутубхона; сўров/лимит функциялари — scripts/update-weather.py'дан.
"""
import datetime as dt
import importlib.util
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data-hist", "hist-1deg.json")
NYEARS = int(os.environ.get("HIST_YEARS", "10"))
BUDGET = float(os.environ.get("HIST_BUDGET", "3500"))  # шу ишга туширишдаги энг кўп оғирлик
LAG = 6  # ERA5 архиви ~5 кун кечикади

_spec = importlib.util.spec_from_file_location("uw", os.path.join(ROOT, "scripts", "update-weather.py"))
uw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uw)
log, call, Stop, weight = uw.log, uw.call, uw.Stop, uw.weight


def snap1(v):
    return math.floor(v + 0.5)


def coarse_keys():
    """wx-points.json'даги барча 0.25° катаклар + туман марказлари → 1° нуқталар."""
    keys = set()
    with open(os.path.join(uw.P, "data", "wx-points.json"), encoding="utf-8") as fh:
        for ent in json.load(fh)["d"].values():
            lst = ent if isinstance(ent, list) else [c[0] for c in ent.get("c", [])]
            for k in lst:
                la, lo = (float(x) for x in k.split(","))
                keys.add((snap1(la), snap1(lo)))
    for la, lo in uw.all_points():
        keys.add((snap1(la), snap1(lo)))
    return sorted(keys)


def key(la, lo):
    return "%d,%d" % (la, lo)


def load():
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            return json.load(fh)
    return {"v": 1, "step": 1, "cells": {}}


def save(h):
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    h["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(h, fh, separators=(",", ":"), sort_keys=True)
    os.replace(tmp, OUT)


def fetch(pts, d0, d1):
    """pts: [(la, lo)], d0..d1 (сана) → {key: [mx10, mn10, ...]} (кунлар d0 дан бошлаб)."""
    n = (d1 - d0).days + 1
    resp = call(uw.ARCHIVE, {
        "latitude": ",".join("%.2f" % p[0] for p in pts), "longitude": ",".join("%.2f" % p[1] for p in pts),
        "start_date": d0.isoformat(), "end_date": d1.isoformat(),
        "daily": "temperature_2m_max,temperature_2m_min", "timezone": uw.TZ,
    }, len(pts), n)
    if not resp:
        return {}
    out = {}
    for p, obj in zip(pts, resp):
        d = (obj or {}).get("daily") or {}
        mx, mn = d.get("temperature_2m_max") or [], d.get("temperature_2m_min") or []
        arr = [None] * (2 * n)
        for i in range(min(n, len(mx), len(mn))):
            if mx[i] is not None and mn[i] is not None:
                arr[2 * i], arr[2 * i + 1] = int(round(mx[i] * 10)), int(round(mn[i] * 10))
        out[key(*p)] = arr
    return out


def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    pts = coarse_keys()
    h = load()
    cur = today.year
    years = list(range(cur - NYEARS, cur))
    h["years"], h["cur"] = years, cur
    cells = h.setdefault("cells", {})
    for p in pts:
        cells.setdefault(key(*p), {})
    for k in list(cells):  # керак бўлмаган нуқталар ва эски йиллар
        if k not in {key(*p) for p in pts}:
            del cells[k]
        else:
            for y in list(cells[k]):
                if y != "cur" and int(y) not in years:
                    del cells[k][y]
    log("1° points %d, years %d–%d" % (len(pts), years[0], years[-1]))
    spent = 0.0
    B = 10  # бир сўровда нуқталар

    try:
        # 1) жорий йил (тузатма учун): ҳар нуқтада охирги сақланган кундан кейингилар
        end = today - dt.timedelta(days=LAG)
        start = dt.date(cur, 1, 1)
        if h.get("curStart") != start.isoformat():
            for k in cells:
                cells[k].pop("cur", None)
            h["curStart"] = start.isoformat()
        groups = {}
        for p in pts:
            arr = cells[key(*p)].get("cur") or []
            have = len(arr) // 2
            d0 = start + dt.timedelta(days=have)
            if d0 <= end:
                groups.setdefault(d0, []).append(p)
        for d0, gp in sorted(groups.items()):
            for i in range(0, len(gp), B):
                ch = gp[i:i + B]
                w = weight(len(ch), (end - d0).days + 1)
                if spent + w > BUDGET:
                    raise Stop("run budget")
                got = fetch(ch, d0, end)
                spent += w
                for p in ch:
                    k = key(*p)
                    if k in got:
                        cells[k]["cur"] = (cells[k].get("cur") or [])[: 2 * (d0 - start).days] + got[k]
                save(h)
        # 2) ўтган йиллар — энг янгисидан
        for y in reversed(years):
            todo = [p for p in pts if str(y) not in cells[key(*p)]]
            if not todo:
                continue
            d0, d1 = dt.date(y, 1, 1), dt.date(y, 12, 31)
            log("year %d: %d points" % (y, len(todo)))
            for i in range(0, len(todo), B):
                ch = todo[i:i + B]
                w = weight(len(ch), (d1 - d0).days + 1)
                if spent + w > BUDGET:
                    raise Stop("run budget")
                got = fetch(ch, d0, d1)
                spent += w
                for p in ch:
                    k = key(*p)
                    if k in got and sum(v is not None for v in got[k]) > 600:
                        cells[k][str(y)] = got[k]
                save(h)
    except Stop as e:
        log("stopped:", e)
    save(h)
    full = [y for y in years if all(str(y) in c for c in cells.values())]
    log("spent weight %.0f | complete years: %s" % (spent, full))


if __name__ == "__main__":
    main()
