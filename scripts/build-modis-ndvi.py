#!/usr/bin/env python3
"""MODIS NDVI (MOD13Q1, 250 м, 16 кунлик) 2000–2026: буғдой ниқоби ва туманлар бўйича баҳорги NDVI
→ data-hist/modis-ndvi.json

Манба: Microsoft Planetary Computer (STAC, «modis-13Q1-061»), калит керак эмас (SAS токен очиқ берилади).
Ҳар йил учун феврал–июл композитлари (DOY 033…193), сифат: pixel_reliability ≤ 1 (яхши/қониқарли).
Тўр: data-hist/ndvi-grid.npz экин пикселлари, 2 баробар сийраклаштирилган (~500 м).
Ҳар йил ва туман учун:
  ha    — буғдой майдони (га): чўққи max(DOY 081–145) ≥ 0.5 ва min(DOY 177, 193) ≤ чўққи − 0.25
          (ўша йилнинг ўзида MODIS бўйича — алмашлаб экиш ҳисобга олинади)
  nd    — буғдой пикселлари бўйича ўртача NDVI ҳар композитда (×1000, null — маълумот йўқ)
  tot   — NDVI_Total: март охири – май боши (DOY 081–129) композитлари йиғиндиси
  slope — NDVI_Slope: шу даврда NDVI га чизиқли регрессия қиялиги (1/кун ×1000)
Китоб: Dong, Huang ва бошқ. (2022), 8.1-бўлим. Давом эттирилади. Муҳит: MODIS_YEARS="2000-2026", MODIS_MAX_MINUTES.
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.request

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.vrt import WarpedVRT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID = os.path.join(ROOT, "data-hist", "ndvi-grid.npz")
OUT = os.path.join(ROOT, "data-hist", "modis-ndvi.json")
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
SAS = "https://planetarycomputer.microsoft.com/api/sas/v1/token/modis-13Q1-061"
COLL = "modis-13Q1-061"
DOYS = [33, 49, 65, 81, 97, 113, 129, 145, 161, 177, 193]
TOT = [81, 97, 113, 129]
MAX_SEC = float(os.environ.get("MODIS_MAX_MINUTES", "280")) * 60
T0 = time.time()
STEP = 2


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def http(url, data=None, tries=4):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None,
                                         headers={"Content-Type": "application/json"} if data else {})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except Exception as e:
            if k == tries - 1:
                raise
            log("  retry", url[:80], e)
            time.sleep(5 * (k + 1))


_tok = {"t": None, "at": 0}


def token():
    if not _tok["t"] or time.time() - _tok["at"] > 1800:
        _tok["t"] = http(SAS)["token"]
        _tok["at"] = time.time()
    return _tok["t"]


def items(y, bbox):
    """Йил учун феврал–июл элементлари → {doy: [item, ...]}"""
    out, body = {}, {"collections": [COLL], "bbox": bbox, "datetime": "%d-01-25/%d-07-31" % (y, y), "limit": 200}
    r = http(STAC, body)
    feats = r.get("features", [])
    while True:
        nxt = next((l for l in r.get("links", []) if l.get("rel") == "next"), None)
        if not nxt:
            break
        r = http(nxt["href"], nxt.get("body"))
        feats += r.get("features", [])
    for f in feats:
        p = f["properties"]
        d = dt.date.fromisoformat((p.get("start_datetime") or p.get("datetime"))[:10])
        doy = d.timetuple().tm_yday
        k = min(DOYS, key=lambda x: abs(x - doy))
        if abs(k - doy) <= 3:
            out.setdefault(k, []).append(f)
    return out


def src_url(href):
    return "/vsicurl/" + href + "?" + token()


def composite(feats, tr, H, W):
    """Бир композит (бир неча тайл) → NDVI массив (H×W), сифатсиз/йўқ — NaN."""
    arr = np.full((H, W), np.nan, dtype=np.float32)
    for f in feats:
        a = f["assets"]
        nd, qa = a.get("250m_16_days_NDVI"), a.get("250m_16_days_pixel_reliability")
        if not nd:
            continue
        try:
            with rasterio.open(src_url(nd["href"])) as src:
                with WarpedVRT(src, crs="EPSG:4326", transform=tr, width=W, height=H,
                               resampling=Resampling.nearest, src_nodata=-3000, nodata=-3000) as v:
                    x = v.read(1).astype(np.float32)
            q = None
            if qa:
                with rasterio.open(src_url(qa["href"])) as src:
                    with WarpedVRT(src, crs="EPSG:4326", transform=tr, width=W, height=H,
                                   resampling=Resampling.nearest, src_nodata=-1, nodata=-1) as v:
                        q = v.read(1)
            ok = x > -3000
            if q is not None:
                ok &= (q >= 0) & (q <= 1)  # -1 — йўқ, 2 — қор, 3 — булут
            arr[ok] = x[ok] / 10000.0
        except Exception as e:
            log("  tile fail", f.get("id"), e)
    return arr


def main():
    g = np.load(GRID)
    lab0 = g["lab"]
    minx, maxy, px0 = (float(v) for v in g["transform"])
    lab = lab0[::STEP, ::STEP]
    px = px0 * STEP
    H, W = lab.shape
    tr = from_origin(minx, maxy, px, px)
    nd = int(lab.max())
    rows = np.arange(H)
    pha = ((px * 111320.0) ** 2 * np.cos(np.radians(maxy - (rows + 0.5) * px)) / 1e4)[:, None] * np.ones((1, W))
    bbox = [minx, maxy - H * px, minx + W * px, maxy]
    a, b = os.environ.get("MODIS_YEARS", "2000-2026").split("-")
    st = {"doy": DOYS, "y": {}}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            st = json.load(fh)
    crop = lab > 0
    for y in range(int(a), int(b) + 1):
        if str(y) in st["y"]:
            continue
        if time.time() - T0 > MAX_SEC:
            log("time budget reached")
            break
        its = items(y, bbox)
        if not its:
            log(y, "no items")
            continue
        C = {}
        for doy in DOYS:
            if doy in its:
                C[doy] = composite(its[doy], tr, H, W)
                log(y, "doy", doy, "tiles", len(its[doy]), "valid %.0f%%" % (100 * np.mean(~np.isnan(C[doy][crop]))))
        pk = np.nanmax(np.stack([C[d] for d in (81, 97, 113, 129, 145) if d in C]), axis=0) if any(d in C for d in (81, 97, 113, 129, 145)) else None
        late = np.nanmin(np.stack([C[d] for d in (177, 193) if d in C]), axis=0) if any(d in C for d in (177, 193)) else None
        if pk is None or late is None:
            log(y, "incomplete season")
            continue
        wheat = crop & (pk >= 0.5) & (late <= pk - 0.25)
        res = {}
        for i in range(1, nd + 1):
            m = wheat & (lab == i)
            if not m.any():
                continue
            ser = []
            for d in DOYS:
                v = C.get(d)
                vals = v[m] if v is not None else np.array([])
                vals = vals[~np.isnan(vals)]
                ser.append(int(round(float(vals.mean()) * 1000)) if vals.size >= max(3, 0.3 * m.sum()) else None)
            tv = [(d, ser[DOYS.index(d)]) for d in TOT if ser[DOYS.index(d)] is not None]
            tot = sum(v for _, v in tv) if len(tv) == len(TOT) else None
            slope = None
            if len(tv) >= 3:
                xs = np.array([d for d, _ in tv], float)
                ys = np.array([v for _, v in tv], float)
                slope = round(float(np.polyfit(xs, ys, 1)[0]), 2)
            res[str(i - 1)] = {"ha": round(float(pha[m].sum())), "nd": ser, "tot": tot, "slope": slope}
        st["y"][str(y)] = res
        st["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
        with open(OUT, "w", encoding="utf-8") as fh:
            json.dump(st, fh, separators=(",", ":"))
        log(y, "wheat %.0f ming ga, districts %d, %.0fs" % (sum(v["ha"] for v in res.values()) / 1000, len(res), time.time() - T0))


if __name__ == "__main__":
    main()
