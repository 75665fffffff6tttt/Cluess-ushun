#!/usr/bin/env python3
"""Кунлик ҳарорат маълумоти (Open-Meteo) → plant-protection/data/wx.json

Фенологик прогноз саҳифаси учун ҳарорат маълумотини
GitHub Actions'да кунига бир марта йиғади, шунда сайтга кирувчилар
Open-Meteo'ни умуман чақирмайди (бепул лимит тугамайди).

- Нуқталар: фенологик прогноз саҳифасидаги туман марказлари, 0.25° тўрга
  яхлитланиб, такрорсиз катакларга бирлаштирилади.
- Прогноз (past_days=7, +16 кун) — 18 соатда бир марта.
- Архив (1-январдан) — фақат бўш кунлар учун (биринчи марта тўлиқ, кейин
  фақат узилишлар).
- Лимитлар: Open-Meteo сўров "оғирлиги" = жойлар × max(кунлар/14, 1).
  Скрипт минутлик/соатлик чегарадан ошмасликка ҳаракат қилади; 429 бўлса
  кутади ёки ишни тўхтатиб, келаси ишга туширишда давом этади.

Фақат стандарт кутубхона. Муҳит ўзгарувчилари (синов учун):
  OM_FORECAST, OM_ARCHIVE — API манзиллари
  WX_MIN_CAP, WX_HOUR_CAP — минут/соат оғирлик чегараси
  WX_MAX_MINUTES          — бир ишга туширишда энг кўп вақт
  WX_SLEEP_SCALE          — кутишлар коэффициенти (синовда 0.01)
"""
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "plant-protection")
OUT = os.path.join(P, "data", "wx.json")

FORECAST = os.environ.get("OM_FORECAST", "https://api.open-meteo.com/v1/forecast")
ARCHIVE = os.environ.get("OM_ARCHIVE", "https://archive-api.open-meteo.com/v1/archive")
TZ = "Asia/Tashkent"
STEP = 0.25
FC_PAST, FC_FUTURE = 7, 16
FC_EVERY_H = 18
MIN_CAP = float(os.environ.get("WX_MIN_CAP", "450"))
HOUR_CAP = float(os.environ.get("WX_HOUR_CAP", "4200"))
MAX_SEC = float(os.environ.get("WX_MAX_MINUTES", "200")) * 60
SLEEP_SCALE = float(os.environ.get("WX_SLEEP_SCALE", "1"))
T0 = time.time()


class Stop(Exception):
    """Лимит/вақт тугади — шу пайтгача йиғилганини сақлаб, тўхтаймиз."""


def log(*a):
    print(*a, flush=True)


def nap(sec):
    time.sleep(max(0.0, sec) * SLEEP_SCALE)


# ---------- нуқталар (саҳифалардаги JS билан бир хил марказ ҳисоби) ----------
def ring_area(r):
    return sum(r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1] for i in range(len(r))) / 2


def ring_ctr(r):
    a = cx = cy = 0.0
    for i in range(len(r)):
        f = r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]
        a += f
        cx += (r[i - 1][0] + r[i][0]) * f
        cy += (r[i - 1][1] + r[i][1]) * f
    a /= 2
    if abs(a) < 1e-12:
        return r[0]
    return [cx / (6 * a), cy / (6 * a)]


def geojson_points(path):
    out = []
    with open(path, encoding="utf-8") as fh:
        gj = json.load(fh)
    for ft in gj.get("features", []):
        g = ft.get("geometry") or {}
        if g.get("type") == "Polygon":
            polys = [g["coordinates"]]
        elif g.get("type") == "MultiPolygon":
            polys = g["coordinates"]
        else:
            continue
        best = max((p[0] for p in polys), key=lambda r: abs(ring_area(r)))
        c = ring_ctr(best)
        out.append((c[1], c[0]))  # (lat, lon)
    return out


def all_points():
    with open(os.path.join(P, "js", "uz-geo.js"), encoding="utf-8") as fh:
        geo = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    pts = [(g[0], g[1]) for g in geo if g]
    pts += geojson_points(os.path.join(P, "data", "uz-neighbors.geojson"))
    return pts


def snap(v):
    # JS: Math.round(v*4)/4 (ярмида юқорига) — бир хил натижа учун floor(x+0.5)
    return math.floor(v / STEP + 0.5) * STEP


def cell_key(lat, lon):
    return "%.2f,%.2f" % (snap(lat), snap(lon))


# ---------- маълумот файли ----------
def load_state(today):
    year = today.year
    start = dt.date(year, 1, 1)
    days = (today - start).days + FC_FUTURE  # бугун + 15 кун (forecast_days=16 бугунни ҳам ўз ичига олади)
    st = None
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as fh:
                st = json.load(fh)
        except Exception:
            st = None
    if not st or st.get("start") != start.isoformat():
        st = {"v": 1, "start": start.isoformat(), "days": days, "tz": TZ, "step": STEP, "cells": {}}
    if st["days"] < days:
        for k in st["cells"]:
            st["cells"][k] += [None] * (2 * (days - st["days"]))
        st["days"] = days
    return st, start


def save_state(st):
    st["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(st, fh, separators=(",", ":"), sort_keys=True)
    os.replace(tmp, OUT)


# ---------- Open-Meteo: оғирлик, чегара, сўров ----------
_spent = []  # (вақт, оғирлик)


def weight(n_loc, n_days):
    return n_loc * max(n_days / 14.0, 1.0)


def budget_wait(w):
    while True:
        now = time.time()
        _spent[:] = [(t, x) for t, x in _spent if now - t < 3600]
        last_min = sum(x for t, x in _spent if now - t < 60)
        last_hour = sum(x for t, x in _spent)
        if last_min + w <= MIN_CAP and last_hour + w <= HOUR_CAP:
            _spent.append((now, w))
            return
        if last_hour + w > HOUR_CAP:
            oldest = min(t for t, _ in _spent)
            wait = 3600 - (now - oldest) + 5
        else:
            oldest = min(t for t, _ in _spent if now - t < 60)
            wait = 60 - (now - oldest) + 2
        if time.time() - T0 + wait * SLEEP_SCALE > MAX_SEC:
            raise Stop("time budget (pacing)")
        log("  … pacing %.0fs (min %.0f, hour %.0f)" % (wait, last_min, last_hour))
        nap(wait)
        if SLEEP_SCALE < 1:  # синовда — вақтни "сурамиз"
            _spent[:] = []


def call(base, params, n_loc, n_days):
    w = weight(n_loc, n_days)
    url = base + "?" + urllib.parse.urlencode(params, safe=",")
    for attempt in range(4):
        budget_wait(w)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "agrohimoya-weather/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = json.loads(r.read().decode("utf-8"))
            if isinstance(data, dict) and data.get("error"):
                raise RuntimeError(data.get("reason", "api error"))
            return data if isinstance(data, list) else [data]
        except urllib.error.HTTPError as e:
            try:
                reason = json.loads(e.read().decode("utf-8")).get("reason", "")
            except Exception:
                reason = ""
            low = reason.lower()
            log("  HTTP %s: %s" % (e.code, reason or e.reason))
            if "daily" in low:
                raise Stop("daily limit")
            if "hourly" in low:
                wait = 3600 - (time.time() % 3600) + 30
                if time.time() - T0 + wait * SLEEP_SCALE > MAX_SEC:
                    raise Stop("hourly limit")
                nap(wait)
                continue
            if e.code == 429 or "minutely" in low:
                nap(65)
                continue
            if e.code == 400:
                return None  # нотўғри сўров — қайтаришдан фойда йўқ
            nap(10 * (attempt + 1))
        except Stop:
            raise
        except Exception as e:  # тармоқ/тайм-аут
            log("  error:", e)
            nap(10 * (attempt + 1))
    return None


def put(st, start, keys, resp, only_until=None):
    """Жавобдаги кунлик max/min'ни катакларга ёзади (×10, бутун сон)."""
    n = 0
    for key, obj in zip(keys, resp):
        d = (obj or {}).get("daily") or {}
        tt, mx, mn = d.get("time") or [], d.get("temperature_2m_max") or [], d.get("temperature_2m_min") or []
        arr = st["cells"][key]
        for i, ds in enumerate(tt):
            day = dt.date.fromisoformat(ds)
            if only_until and day > only_until:
                continue
            j = (day - start).days
            if 0 <= j < st["days"] and i < len(mx) and i < len(mn) and mx[i] is not None and mn[i] is not None:
                arr[2 * j] = int(round(mx[i] * 10))
                arr[2 * j + 1] = int(round(mn[i] * 10))
                n += 1
    return n


def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()  # Тошкент
    pts = all_points()
    cells = {}
    for lat, lon in pts:
        cells.setdefault(cell_key(lat, lon), (snap(lat), snap(lon)))
    keys = sorted(cells)
    log("points %d → cells %d" % (len(pts), len(keys)))

    st, start = load_state(today)
    for k in keys:
        st["cells"].setdefault(k, [None] * (2 * st["days"]))
    for k in list(st["cells"]):
        if k not in cells:
            del st["cells"][k]

    stopped = None
    try:
        # 1) прогноз (охирги 7 кун + 16 кун олдинга) — 18 соатда бир марта
        fc_at = st.get("fc_at")
        fresh = False
        if fc_at:
            age = dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(fc_at)
            fresh = age < dt.timedelta(hours=FC_EVERY_H)
        ti = (today - start).days
        fc_keys = keys if not fresh else [k for k in keys if st["cells"][k][2 * ti] is None]  # янги катаклар — доим
        if fc_keys:
            ok = 0
            for i in range(0, len(fc_keys), 100):
                ch = fc_keys[i:i + 100]
                params = {
                    "latitude": ",".join("%.2f" % cells[k][0] for k in ch),
                    "longitude": ",".join("%.2f" % cells[k][1] for k in ch),
                    "daily": "temperature_2m_max,temperature_2m_min",
                    "past_days": FC_PAST, "forecast_days": FC_FUTURE, "timezone": TZ,
                }
                resp = call(FORECAST, params, len(ch), FC_PAST + FC_FUTURE)
                if resp:
                    put(st, start, ch, resp)
                    ok += len(ch)
                log("forecast %d/%d" % (min(i + 100, len(fc_keys)), len(fc_keys)))
            if ok == len(fc_keys) and not fresh:
                st["fc_at"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
            save_state(st)
        else:
            log("forecast fresh (%s) — skip" % fc_at)

        # 2) архив — фақат бўш кунлар (1-январдан бугун-7 гача)
        arch_end = today - dt.timedelta(days=6)
        last_old = (today - dt.timedelta(days=FC_PAST) - start).days
        if arch_end >= start and last_old >= 0:
            groups = {}
            for k in keys:
                arr = st["cells"][k]
                first = next((j for j in range(0, last_old + 1) if arr[2 * j] is None), None)
                if first is not None:
                    groups.setdefault(first, []).append(k)
            todo = sum(len(v) for v in groups.values())
            log("archive gaps: %d cells" % todo)
            done = 0
            for first in sorted(groups):
                g = groups[first]
                d0 = start + dt.timedelta(days=first)
                n_days = (arch_end - d0).days + 1
                if n_days <= 0:
                    continue
                per = max(1, min(40, int(MIN_CAP // weight(1, n_days))))
                for i in range(0, len(g), per):
                    ch = g[i:i + per]
                    params = {
                        "latitude": ",".join("%.2f" % cells[k][0] for k in ch),
                        "longitude": ",".join("%.2f" % cells[k][1] for k in ch),
                        "start_date": d0.isoformat(), "end_date": arch_end.isoformat(),
                        "daily": "temperature_2m_max,temperature_2m_min", "timezone": TZ,
                    }
                    resp = call(ARCHIVE, params, len(ch), n_days)
                    if resp:
                        put(st, start, ch, resp, only_until=arch_end)
                    done += len(ch)
                    log("archive %d/%d cells (from %s)" % (done, todo, d0))
                    save_state(st)
    except Stop as e:
        stopped = str(e)
        log("STOP:", stopped)

    save_state(st)
    full = sum(1 for k in keys if st["cells"][k][0] is not None)
    log("done: %d/%d cells have data from %s; stopped=%s" % (full, len(keys), st["start"], stopped))
    return 0


if __name__ == "__main__":
    sys.exit(main())
