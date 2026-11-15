#!/usr/bin/env python3
"""Кузги буғдой майдонлари (Sentinel-2) → plant-protection/data/wheat-area.json

Асосий усул (WA_MODE=spring, андоза): ҳосил йилининг баҳор–ёз суратлари — spring_main() га қаранг.
Қуйидаги кузги усул (WA_MODE=autumn) текширувда ишламади: ноябр ўртасида кейин буғдой бўлган
далалар NDVI бўйича бошқа далалардан фарқ қилмайди (медиана 0.21 ва 0.22) — фақат тажриба учун қолдирилди.
Кузги усул (тахминий):
- экин пикселлари: data-hist/ndvi-grid.npz (Esri/IO 2024 «Crops», ~250 м);
- ҳар куз учун икки композит (тайл бўйича энг тоза 2 та расм, 80 м обзор, энг юқори NDVI):
    ОКТ: 1–15 октябр (экиш олди ёки эндигина экилган), НОЯ: 1–14 ноябр (майсалар кўкарган);
- кузги буғдой белгиси: НОЯ ≥ 0.25 ва НОЯ − ОКТ ≥ 0.05 (ноябрда кўкариш; ғўза бу пайтда қурийди,
  беда ва боғлар октябрда ҳам яшил — ўсиш бўлмайди);
- туман бўйича майдон (га) = белгили пикселлар × пиксел майдони.
Чиқиш: {"years": [..], "d": {туман: {"2025": га, "2026": га, "crop": экин га}}, "rule": ...}
Муҳит: WA_YEARS="2025,2026", WA_THREADS.
"""
import datetime as dt
import json
import math
import os
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.vrt import WarpedVRT
from rasterio.windows import from_bounds

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID = os.path.join(ROOT, "data-hist", "ndvi-grid.npz")
TILES = os.path.join(ROOT, "data-hist", "ndvi-tiles.json")
OUT = os.path.join(ROOT, "plant-protection", "data", "wheat-area.json")
CACHE = os.path.join(ROOT, "data-hist", "wheat-comp-%s.npz")
S3 = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/"
PRE = "sentinel-s2-l2a-cogs/"
YEARS = [int(y) for y in os.environ.get("WA_YEARS", "2025,2026").split(",")]
THREADS = int(os.environ.get("WA_THREADS", "12"))
N_MIN, D_MIN = 0.25, 0.05


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return r.read()
        except Exception:
            if k == tries - 1:
                raise
            time.sleep(3 * (k + 1))


def ls(prefix):
    x = get(S3 + "?list-type=2&delimiter=/&prefix=" + prefix).decode()
    return re.findall(r"<Prefix>([^<]*)</Prefix>", x)[1:]


def composite(a, b, tiles, lab, minx, maxy, px):
    H, W = lab.shape
    comp = np.full((H, W), -1.0, dtype=np.float32)

    def one(t):
        cand = []
        for m in range(a.month, b.month + 1):
            try:
                ps = [p for p in ls(PRE + "%s/%d/%d/" % (t["t"], a.year, m)) if p.endswith("L2A/")]
            except Exception:
                ps = []
            for p in ps:
                ds = re.search(r"_(\d{8})_", p).group(1)
                d = dt.date(int(ds[:4]), int(ds[4:6]), int(ds[6:]))
                if a <= d <= b:
                    nm = p.rstrip("/").split("/")[-1]
                    try:
                        pr = json.loads(get(S3 + p + nm + ".json"))["properties"]
                        cc, nd = pr.get("eo:cloud_cover", 100), pr.get("s2:nodata_pixel_percentage", 100)
                    except Exception:
                        continue
                    if cc < 40 and nd < 90:
                        cand.append((cc + nd * 0.3, p))
        r0, c0, hh, ww = t["w"]
        wtr = from_origin(minx + c0 * px, maxy - r0 * px, px, px)
        best = None
        for _, p in sorted(cand)[:2]:
            try:
                bands = []
                for bnd in ("B04", "B08"):
                    with rasterio.open("/vsicurl/" + S3 + p + bnd + ".tif", OVERVIEW_LEVEL=2) as src:
                        with WarpedVRT(src, crs="EPSG:4326", transform=wtr, width=ww, height=hh,
                                       resampling=Resampling.average, nodata=0) as v:
                            bands.append(v.read(1).astype(np.float32))
            except Exception as e:
                log("  fail", p, e)
                continue
            r, n = bands
            ndv = np.where((r > 0) & (n > 0), (n - r) / (n + r + 1e-6), -1)
            best = ndv if best is None else np.maximum(best, ndv)
        return t["w"], best

    with ThreadPoolExecutor(max_workers=THREADS) as ex:
        for (r0, c0, hh, ww), best in ex.map(one, tiles):
            if best is not None:
                sub = comp[r0:r0 + hh, c0:c0 + ww]
                np.maximum(sub, best, out=sub)
    return comp


def spring_main(y):
    """Ҳосил йили y учун буғдой ниқоби баҳорги белгидан (ишончли усул):
    чўққи max(апрел 5–25, май 1–20) ≥ 0.5; ўрилгандан кейин min(июн 20–июл 5, июл 8–25) — чўққидан ≥ 0.25 паст;
    феврал (1–28) булутсиз бўлса ≥ 0.2 (кузги экин қишда яшил). Натижа — туманлар бўйича га."""
    g = np.load(GRID)
    lab = g["lab"]
    minx, maxy, px = (float(v) for v in g["transform"])
    H, W = lab.shape
    tr = from_origin(minx, maxy, px, px)
    keep = []
    with open(TILES) as fh:
        tiles = json.load(fh)
    for t in tiles:
        w0, s0, e0, n0 = t["b"]
        win = from_bounds(max(w0, minx), max(s0, maxy - H * px), min(e0, minx + W * px), min(n0, maxy), tr).round_offsets().round_lengths()
        r0, c0 = max(0, int(win.row_off)), max(0, int(win.col_off))
        hh, ww = min(H - r0, int(win.height)), min(W - c0, int(win.width))
        if hh > 0 and ww > 0 and lab[r0:r0 + hh, c0:c0 + ww].any():
            t["w"] = (r0, c0, hh, ww)
            keep.append(t)
    cf = CACHE % ("spring%d" % y)
    C = dict(np.load(cf)) if os.path.exists(cf) else {}
    for nm, a, b in (("feb", (2, 1), (2, 28)), ("apr", (4, 5), (4, 25)), ("may", (5, 1), (5, 20)),
                     ("jun", (6, 20), (7, 5)), ("jul", (7, 8), (7, 25))):
        if nm not in C:
            C[nm] = composite(dt.date(y, *a), dt.date(y, *b), keep, lab, minx, maxy, px)
            np.savez_compressed(cf, **C)
            log(y, nm, "done")
    feb, apr, may, jun, jul = (C[k] for k in ("feb", "apr", "may", "jun", "jul"))
    pk = np.maximum(apr, may)
    lo = np.minimum(np.where(jun > -1, jun, 9), np.where(jul > -1, jul, 9))
    m = (lab > 0) & (pk >= 0.5) & (lo < 9) & (pk - lo >= 0.25) & ((feb <= -1) | (feb >= 0.2)) & (apr > -1)
    rows = np.arange(H)
    pha = ((px * 111320.0) ** 2 * np.cos(np.radians(maxy - (rows + 0.5) * px)) / 1e4)[:, None] * np.ones((1, W))
    nd = int(lab.max())
    wha = np.bincount(lab[m], weights=pha[m], minlength=nd + 1)
    cha = np.bincount(lab.ravel(), weights=pha.ravel(), minlength=nd + 1)
    res = {"year": y, "method": "spring", "rule": {"peak": 0.5, "drop": 0.25, "feb": 0.2},
           "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
           "d": {str(i - 1): {"ha": round(float(wha[i])), "crop": round(float(cha[i]))} for i in range(1, nd + 1) if cha[i] > 0}}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(res, fh, separators=(",", ":"))
    log("wheat %d ≈ %.0f ming ga" % (y, wha[1:].sum() / 1000))


def main():
    if os.environ.get("WA_MODE", "spring") == "spring":
        return spring_main(int(os.environ.get("WA_YEAR", "2026")))
    g = np.load(GRID)
    lab = g["lab"]
    minx, maxy, px = (float(v) for v in g["transform"])
    nd = max(int(g["n"][0]), int(lab.max()))
    H, W = lab.shape
    tr = from_origin(minx, maxy, px, px)
    with open(TILES) as fh:
        tiles = json.load(fh)
    keep = []
    for t in tiles:
        w0, s0, e0, n0 = t["b"]
        win = from_bounds(max(w0, minx), max(s0, maxy - H * px), min(e0, minx + W * px), min(n0, maxy), tr).round_offsets().round_lengths()
        r0, c0 = max(0, int(win.row_off)), max(0, int(win.col_off))
        hh, ww = min(H - r0, int(win.height)), min(W - c0, int(win.width))
        if hh > 0 and ww > 0 and lab[r0:r0 + hh, c0:c0 + ww].any():
            t["w"] = (r0, c0, hh, ww)
            keep.append(t)
    rows = np.arange(H)
    pha = ((px * 111320.0) ** 2 * np.cos(np.radians(maxy - (rows + 0.5) * px)) / 1e4).astype(np.float32)  # га
    PHA = pha[:, None] * np.ones((1, W), dtype=np.float32)
    crop_ha = np.bincount(lab.ravel(), weights=PHA.ravel(), minlength=nd + 1)
    res = {"rule": {"novMin": N_MIN, "riseMin": D_MIN, "oct": "10-01..10-15", "nov": "11-01..11-14"}, "years": YEARS, "d": {}}
    for y in YEARS:
        cf = CACHE % y
        if os.path.exists(cf):
            z = np.load(cf)
            oct_, nov = z["oct"], z["nov"]
        else:
            t0 = time.time()
            oct_ = composite(dt.date(y, 10, 1), dt.date(y, 10, 15), keep, lab, minx, maxy, px)
            log(y, "oct done %.0fs" % (time.time() - t0))
            nov = composite(dt.date(y, 11, 1), dt.date(y, 11, 14), keep, lab, minx, maxy, px)
            log(y, "nov done %.0fs" % (time.time() - t0))
            np.savez_compressed(cf, oct=oct_, nov=nov)
        valid = (lab > 0) & (oct_ > -1) & (nov > -1)
        wheat = valid & (nov >= N_MIN) & (nov - oct_ >= D_MIN)
        wha = np.bincount(lab[wheat], weights=PHA[wheat], minlength=nd + 1)
        vha = np.bincount(lab[valid], weights=PHA[valid], minlength=nd + 1)
        for i in range(1, nd + 1):
            e = res["d"].setdefault(str(i - 1), {"crop": round(float(crop_ha[i]))})
            # кузатилмаган (булут) пикселлар улуши катта бўлса — экин майдонига мутаносиб кенгайтирилади
            cov = vha[i] / crop_ha[i] if crop_ha[i] else 0
            e[str(y)] = round(float(wha[i] / cov)) if cov >= 0.5 else None
            e["cov" + str(y)] = round(float(cov), 2)
    res["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(res, fh, separators=(",", ":"))
    for y in YEARS:
        tot = sum(v[str(y)] or 0 for v in res["d"].values())
        log(y, "winter wheat ≈ %.0f ming ga" % (tot / 1000))


if __name__ == "__main__":
    main()
