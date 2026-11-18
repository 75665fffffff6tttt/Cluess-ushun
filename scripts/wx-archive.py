#!/usr/bin/env python3
"""Ўтган йиллар ҳарорат архиви (Open-Meteo archive) → plant-protection/data/wx-ЙИЛ.json (сайтдаги йил танлаш учун)

Ҳар ишга туширишда бир оз (WX_ARCHIVE_BUDGET оғирлик бирлиги, асл wx.json янгиланишига лимит қолсин) — тўлмаган
биринчи йилдан (WX_YEARS тартибида) давом этади. Ҳар йилда аввал Ўзбекистон туманлари катаклари, кейин қўшни
давлатлар катаклари. Ўзбекистон катаклари тўлмагунча натижа data-hist/wx-ЙИЛ.partial.json да туради (сайтга
чиқмайди); тўлгач — data/wx-ЙИЛ.json ёзилади ва wx-years.json янгиланади (сайтда йил пайдо бўлади), қўшни
давлатлар кейинги ишга туширишларда шу файлга қўшилади.
Муҳит: WX_YEARS (масалан "2025,2024,2023"), WX_ARCHIVE_BUDGET (бир ишга тушириш, оғирлик), WX_MAX_MINUTES.
"""
import datetime as dt
import importlib.util
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_sp = importlib.util.spec_from_file_location("uw", os.path.join(ROOT, "scripts", "update-weather.py"))
uw = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(uw)
call, put, weight, log, Stop = uw.call, uw.put, uw.weight, uw.log, uw.Stop

DATA = os.path.join(uw.P, "data")
HIST = os.path.join(ROOT, "data-hist")
BUDGET = float(os.environ.get("WX_ARCHIVE_BUDGET", "4000"))


def cells_from_points():
    """wx-points.json → ({калит: (lat, lon)}, Ўзбекистон катаклари тўплами)."""
    with open(os.path.join(DATA, "wx-points.json"), encoding="utf-8") as fh:
        X = json.load(fh)["d"]
    cells, uz = {}, set()
    for k, e in X.items():
        lst = e if isinstance(e, list) else [c[0] for c in e.get("c", [])]
        for c in lst:
            la, lo = (float(x) for x in c.split(","))
            cells.setdefault(c, (la, lo))
            if not k.startswith("n"):
                uz.add(c)
    return cells, uz


def paths(y):
    return os.path.join(DATA, "wx-%d.json" % y), os.path.join(HIST, "wx-%d.partial.json" % y)


def load(y, keys):
    final, part = paths(y)
    start = dt.date(y, 1, 1)
    days = (dt.date(y, 12, 31) - start).days + 1
    st = None
    for p in (final, part):
        if os.path.exists(p):
            with open(p, encoding="utf-8") as fh:
                st = json.load(fh)
            break
    if not st or st.get("start") != start.isoformat():
        st = {"v": 1, "start": start.isoformat(), "days": days, "tz": uw.TZ, "step": uw.STEP, "archived": True, "cells": {}}
    st["days"] = days
    for k in keys:
        a = st["cells"].setdefault(k, [None] * (2 * days))
        if len(a) < 2 * days:
            a += [None] * (2 * days - len(a))
    return st, start, days


def full(st, k, days):
    a = st["cells"].get(k)
    return bool(a) and all(a[2 * j] is not None for j in range(days))


def save(y, st, uz, days):
    final, part = paths(y)
    st["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    uz_ok = all(full(st, k, days) for k in uz)
    target = final if uz_ok or os.path.exists(final) else part
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(st, fh, separators=(",", ":"), sort_keys=True)
    os.replace(tmp, target)
    if target == final and os.path.exists(part):
        os.remove(part)
    return uz_ok


def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    years = [int(x) for x in os.environ.get("WX_YEARS", "").replace(" ", "").split(",") if x]
    years = [y for y in years if y < today.year]
    if not years:
        log("WX_YEARS бўш — иш йўқ")
        return 0
    cells, uz = cells_from_points()
    uz = uz & set(cells)
    order = sorted(cells, key=lambda k: (k not in uz, k))  # аввал Ўзбекистон катаклари
    spent = 0.0
    try:
        for y in years:
            st, start, days = load(y, order)
            todo = [k for k in order if not full(st, k, days)]
            if not todo:
                log("%d: тўлиқ" % y)
                continue
            log("%d: %d катак тўлмаган (Ўзбекистон: %d)" % (y, len(todo), sum(1 for k in todo if k in uz)))
            groups = {}
            for k in todo:
                first = next(j for j in range(days) if st["cells"][k][2 * j] is None)
                groups.setdefault((k not in uz, first), []).append(k)
            for (nb, first) in sorted(groups):
                g = groups[(nb, first)]
                d0 = start + dt.timedelta(days=first)
                n = days - first
                per = max(1, min(40, int(uw.MIN_CAP // weight(1, n))))
                for i in range(0, len(g), per):
                    ch = g[i:i + per]
                    w = weight(len(ch), n)
                    if spent + w > BUDGET:
                        raise Stop("run budget %.0f" % BUDGET)
                    resp = call(uw.ARCHIVE, {
                        "latitude": ",".join("%.2f" % cells[k][0] for k in ch),
                        "longitude": ",".join("%.2f" % cells[k][1] for k in ch),
                        "start_date": d0.isoformat(), "end_date": "%d-12-31" % y,
                        "daily": "temperature_2m_max,temperature_2m_min", "timezone": uw.TZ,
                    }, len(ch), n)
                    spent += w
                    if resp:
                        put(st, start, ch, resp)
                    uz_ok = save(y, st, uz, days)
                    log("%d: +%d катак (%s), оғирлик %.0f, Ўзбекистон тўлиқ: %s" % (y, len(ch), "қўшни" if nb else "uz", spent, uz_ok))
            if save(y, st, uz, days):
                uw.update_years(today.year)
    except Stop as e:
        log("тўхтади:", e)
    for y in years:  # сайтдаги йил рўйхати (тўлган йиллар)
        if os.path.exists(paths(y)[0]):
            uw.update_years(today.year)
            break
    log("жами оғирлик %.0f" % spent)
    return 0


if __name__ == "__main__":
    sys.exit(main())
