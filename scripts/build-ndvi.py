#!/usr/bin/env python3
"""Sentinel-2 NDVI туманлар бўйича (ҳар 10 кун) → plant-protection/data/ndvi.json

- Манба: AWS очиқ архиви (s3://sentinel-cogs, Sentinel-2 L2A COG), калит керак эмас.
- Тўр ва экин майдони: data-hist/ndvi-grid.npz (scripts/build-ndvi-grid.py).
- Ҳар 10 кунлик давр (декада, 1 апрел – 31 октябр) учун ҳар тайлдан энг тоза 2 та расм,
  80 м обзор (B04, B08) → энг юқори NDVI (булут/соя NDVI'ни пасайтиради — max уларни
  чиқариб ташлайди) → туман экин пикселлари бўйича ўртача.
- Давом эттирилади: тугаган декадалар қайта ҳисобланмайди; жорий декада тугагунча янгиланади.
- Муҳит: NDVI_YEARS="2025,2026", NDVI_MAX_MINUTES (вақт чегараси).
"""
import datetime as dt
import json
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
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID = os.path.join(ROOT, "data-hist", "ndvi-grid.npz")
TILES = os.path.join(ROOT, "data-hist", "ndvi-tiles.json")
OUT = os.path.join(ROOT, "plant-protection", "data", "ndvi.json")
S3 = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/"
PRE = "sentinel-s2-l2a-cogs/"
MAX_SEC = float(os.environ.get("NDVI_MAX_MINUTES", "300")) * 60
T0 = time.time()
THREADS = int(os.environ.get("NDVI_THREADS", "8"))
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
YEARS = [int(y) for y in os.environ.get("NDVI_YEARS", "%d,%d" % (TODAY.year - 1, TODAY.year)).split(",")]


def log(*a):
    print(*a, flush=True)


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return r.read()
        except Exception as e:
            if k == tries - 1:
                raise
            time.sleep(3 * (k + 1))


def ls(prefix):
    x = get(S3 + "?list-type=2&delimiter=/&prefix=" + prefix).decode()
    return re.findall(r"<Prefix>([^<]*)</Prefix>", x)[1:]


def dekads(y):
    out = []
    for m in range(4, 11):
        last = (dt.date(y, m + 1, 1) - dt.timedelta(days=1)).day
        for a, b in ((1, 10), (11, 20), (21, last)):
            out.append((dt.date(y, m, a), dt.date(y, m, b)))
    return out  # 21 та


def tile_list(gbounds):
    """Ўзбекистон экин майдонини қоплайдиган MGRS тайллари (тўлиқ тайл чегараси STAC'дан)."""
    if os.path.exists(TILES):
        with open(TILES) as fh:
            return json.load(fh)
    lo0, la0, lo1, la1 = gbounds
    out = []
    for zone in range(int((lo0 + 180) // 6) + 1, int((lo1 + 180) // 6) + 2):
        for band in "ST":
            for sq in ls(PRE + "%d/%s/" % (zone, band)):
                t = sq[len(PRE):].rstrip("/")
                sc = []
                for m in (7, 8):
                    sc = [p for p in ls(PRE + t + "/2025/%d/" % m) if p.endswith("L2A/")]
                    if sc:
                        break
                if not sc:
                    continue
                nm = sc[0].rstrip("/").split("/")[-1]
                j = json.loads(get(S3 + sc[0] + nm + ".json"))
                a = j["assets"].get("red") or j["assets"].get("B04") or {}
                epsg = a.get("proj:epsg") or j["properties"].get("proj:epsg")
                t6, shp = a.get("proj:transform"), a.get("proj:shape")
                if not (epsg and t6 and shp):
                    continue
                x0, y1 = t6[2], t6[5]
                bb = (x0, y1 + t6[4] * shp[0], x0 + t6[0] * shp[1], y1)  # тўлиқ тайл (UTM)
                w, s, e, n = transform_bounds("EPSG:%d" % epsg, "EPSG:4326", *bb)
                if e < lo0 or w > lo1 or n < la0 or s > la1:
                    continue
                out.append({"t": t, "b": [w, s, e, n]})
    if out:
        with open(TILES, "w") as fh:
            json.dump(out, fh)
    return out


def main():
    g = np.load(GRID)
    lab = g["lab"]
    minx, maxy, px = (float(v) for v in g["transform"])
    nd = int(g["n"][0])
    H, W = lab.shape
    tr = from_origin(minx, maxy, px, px)
    cnt = np.bincount(lab.ravel(), minlength=nd + 1).astype(float)
    ys, xs = np.nonzero(lab)
    gb = (minx + xs.min() * px, maxy - (ys.max() + 1) * px, minx + (xs.max() + 1) * px, maxy - ys.min() * px)
    tiles = [t for t in tile_list(gb)]
    if not tiles:
        raise SystemExit("тайллар топилмади")
    keep = []
    for t in tiles:  # тайл ойнаси тўрда; экин пиксели йўқ тайллар ташланади
        w0, s0, e0, n0 = t["b"]
        win = from_bounds(max(w0, minx), max(s0, maxy - H * px), min(e0, minx + W * px), min(n0, maxy), tr).round_offsets().round_lengths()
        r0, c0 = max(0, int(win.row_off)), max(0, int(win.col_off))
        hh, ww = min(H - r0, int(win.height)), min(W - c0, int(win.width))
        if hh > 0 and ww > 0 and lab[r0:r0 + hh, c0:c0 + ww].any():
            t["w"] = (r0, c0, hh, ww)
            keep.append(t)
    tiles = keep
    log("tiles with cropland", len(tiles))
    log("tiles", len(tiles), "crop px", int(cnt[1:].sum()))
    res = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            res = json.load(fh)
    res.setdefault("dekads", ["%02d-%02d" % (a.month, a.day) for a, _ in dekads(2026)])
    res.setdefault("y", {})
    res.setdefault("final", {})
    scache = {}

    def scenes(t, y, m):
        k = (t, y, m)
        if k not in scache:
            try:
                scache[k] = [p for p in ls(PRE + "%s/%d/%d/" % (t, y, m)) if p.endswith("L2A/")]
            except Exception:
                scache[k] = []
        return scache[k]

    def meta(p):
        nm = p.rstrip("/").split("/")[-1]
        try:
            pr = json.loads(get(S3 + p + nm + ".json"))["properties"]
            return pr.get("eo:cloud_cover", 100), pr.get("s2:nodata_pixel_percentage", 100)
        except Exception:
            return 100, 100

    todo = []
    for y in YEARS:
        for k, (a, b) in enumerate(dekads(y)):
            key = "%d-%d" % (y, k)
            if res["final"].get(key) or a > TODAY:
                continue
            todo.append((y, k, a, b))
    log("dekads to do", len(todo))
    for y, k, a, b in todo:
        if time.time() - T0 > MAX_SEC:
            log("time budget reached")
            break
        comp = np.full((H, W), -1.0, dtype=np.float32)

        def one_tile(t):
            """Тайлнинг шу декададаги энг тоза 2 расми → (ойна, max NDVI, расмлар сони)."""
            cand = []
            for m in range(a.month, b.month + 1):
                for p in scenes(t["t"], y, m):
                    ds = re.search(r"_(\d{8})_", p).group(1)
                    d = dt.date(int(ds[:4]), int(ds[4:6]), int(ds[6:]))
                    if a <= d <= b:
                        cc, nodata = meta(p)
                        if cc < 40 and nodata < 90:
                            cand.append((cc + nodata * 0.3, p))
            r0, c0, hh, ww = t["w"]
            wtr = from_origin(minx + c0 * px, maxy - r0 * px, px, px)
            best, n_ok = None, 0
            for _, p in sorted(cand)[:2]:
                bands = []
                try:
                    for bnd in ("B04", "B08"):
                        with rasterio.open("/vsicurl/" + S3 + p + bnd + ".tif", OVERVIEW_LEVEL=2) as src:  # 80 м
                            with WarpedVRT(src, crs="EPSG:4326", transform=wtr, width=ww, height=hh,
                                           resampling=Resampling.average, nodata=0) as v:
                                bands.append(v.read(1).astype(np.float32))
                except Exception as e:
                    log("  fail", p, e)
                    continue
                r, n = bands
                ok = (r > 0) & (n > 0)
                ndv = np.where(ok, (n - r) / (n + r + 1e-6), -1)
                best = ndv if best is None else np.maximum(best, ndv)
                n_ok += 1
            return t["w"], best, n_ok

        nsc = 0
        with ThreadPoolExecutor(max_workers=THREADS) as ex:
            for (r0, c0, hh, ww), best, n_ok in ex.map(one_tile, tiles):
                if best is not None:
                    sub = comp[r0:r0 + hh, c0:c0 + ww]
                    np.maximum(sub, best, out=sub)
                    nsc += n_ok
        valid = (comp > -1) & (lab > 0)
        s = np.bincount(lab[valid], weights=comp[valid], minlength=nd + 1)
        c = np.bincount(lab[valid], minlength=nd + 1).astype(float)
        vals = []
        for i in range(1, nd + 1):
            vals.append(round(float(s[i] / c[i]), 3) if cnt[i] >= 20 and c[i] >= 0.3 * cnt[i] else None)
        res["y"].setdefault(str(y), [None] * 21)[k] = vals
        # декада тугаганидан 6 кун ўтгач — якуний (кейинги расмлар келиб улгуради)
        res["final"]["%d-%d" % (y, k)] = (TODAY - b).days > 6 and nsc > 0
        res["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
        tmp = OUT + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(res, fh, separators=(",", ":"))
        os.replace(tmp, OUT)
        log("%d dekad %d (%s) scenes %d, districts %d, %.0fs" % (y, k, a, nsc, sum(v is not None for v in vals), time.time() - T0))


if __name__ == "__main__":
    sys.exit(main())
