#!/usr/bin/env python3
"""Қамишзорлар (сув бўйи ўтлоқ ботқоқликлари) → plant-protection/data/wetland.json ва wetland-mask.png

Осиё (кўчманчи) чигирткаси (Locusta migratoria) асосан қамишзорларда тухум қўяди ва кўпаяди (Амударё
делтаси, Орол бўйи, Сирдарё ва кўллар атрофи). Қамишзор — ESA WorldCover 2021 синфи 90 «Herbaceous wetland»
(ўтлоқ ботқоқлик; қамиш, ғўға). Ҳар туман учун: қамишзор майдони (км²) ва улуши (%); харита учун —
қамишзор қатлами (PNG, 0.02° ≈ 2 км, синф 90 улуши).

Маълумот: ESA WorldCover 10 m 2021 v200 (CC-BY 4.0), ~300 м обзор даражасида (build-landcover.py билан бир хил).
Ишга тушириш (rasterio, shapely, numpy, Pillow; интернет): python3 scripts/build-wetland.py
"""
import importlib.util
import json
import math
import os
import sys

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.transform import from_origin
from shapely.geometry import mapping

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_sp = importlib.util.spec_from_file_location("lc", os.path.join(ROOT, "scripts", "build-landcover.py"))
lc_mod = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(lc_mod)

P = lc_mod.P
OUT = os.path.join(P, "data", "wetland.json")
MASK = os.path.join(P, "data", "wetland-mask.png")
WET = 90
DEC, PX, URL = lc_mod.DEC, lc_mod.PX, lc_mod.URL
MASK_RES = 0.02


def main():
    dist = lc_mod.load_districts()
    minx = min(g.bounds[0] for _, _, g, _ in dist)
    miny = min(g.bounds[1] for _, _, g, _ in dist)
    maxx = max(g.bounds[2] for _, _, g, _ in dist)
    maxy = max(g.bounds[3] for _, _, g, _ in dist)
    lon0, lat0 = math.floor(minx / 3) * 3, math.floor(miny / 3) * 3
    lon1, lat1 = math.ceil(maxx / 3) * 3, math.ceil(maxy / 3) * 3
    # ҳар плита алоҳида ~80 м аниқликда (DEC2 = 8): кичик қамишзорлар ҳам ҳисобга кирсин
    DEC2 = int(os.environ.get("WET_DEC", "8"))
    N = 36000 // DEC2
    px = 3.0 / N
    f = max(1, int(round(MASK_RES / px)))
    Wm, Hm = int(round((lon1 - lon0) / (f * px))), int(round((lat1 - lat0) / (f * px)))
    wetm = np.zeros((Hm, Wm), dtype=np.float32)
    insm = np.zeros((Hm, Wm), dtype=np.float32)
    wet_km2 = np.zeros(len(dist) + 1)
    tot_km2 = np.zeros(len(dist) + 1)
    n = 0
    for la in range(lat0, lat1, 3):
        for lo in range(lon0, lon1, 3):
            box = (lo, la, lo + 3, la + 3)
            sel = [(j, g) for j, (_, _, g, _) in enumerate(dist) if not (g.bounds[2] < box[0] or g.bounds[0] > box[2] or g.bounds[3] < box[1] or g.bounds[1] > box[3])]
            if not sel:
                continue
            name = lc_mod.tile_name(la, lo)
            try:
                with rasterio.open(URL % name) as ds:
                    a = ds.read(1, out_shape=(N, N), resampling=Resampling.nearest)
            except Exception:
                continue
            n += 1
            tr = from_origin(lo, la + 3, px, px)
            ids = rasterize(((mapping(g), j + 1) for j, g in sel), out_shape=(N, N), transform=tr, fill=0, dtype="int32")
            lat_c = la + 3 - (np.arange(N) + 0.5) * px
            ar = np.broadcast_to(((px * 111.32) * (px * 111.32 * np.cos(np.radians(lat_c))))[:, None], (N, N))
            wet = a == WET
            tot_km2 += np.bincount(ids.ravel(), weights=ar.ravel(), minlength=len(dist) + 1)
            wet_km2 += np.bincount(ids[wet], weights=ar[wet], minlength=len(dist) + 1)
            # харита қатлами
            r0, c0 = int(round((lat1 - (la + 3)) / (f * px))), int(round((lo - lon0) / (f * px)))
            k = N // f
            wf = wet[:k * f, :k * f].reshape(k, f, k, f).mean(axis=(1, 3))
            inf = (ids[:k * f, :k * f] > 0).reshape(k, f, k, f).mean(axis=(1, 3))
            wetm[r0:r0 + k, c0:c0 + k] = wf[:Hm - r0, :Wm - c0] if r0 + k > Hm or c0 + k > Wm else wf
            insm[r0:r0 + k, c0:c0 + k] = inf[:Hm - r0, :Wm - c0] if r0 + k > Hm or c0 + k > Wm else inf
            print("tile", name, "wet px", int(wet.sum()), file=sys.stderr, flush=True)
    print("tiles %d" % n, file=sys.stderr)
    res = {}
    for j, (key, name, g, ctr) in enumerate(dist):
        km2, tot = float(wet_km2[j + 1]), float(tot_km2[j + 1])
        if tot and km2 >= 0.5:
            res[key] = [round(km2, 1), round(100 * km2 / tot, 2)]
    frac, inside = wetm, insm
    # харита қатлами: синф 90 улуши (0.02° пиксел), кичик улушлар ҳам кўринсин (×4)
    from PIL import Image
    al = np.clip(frac * 4, 0, 1) * (inside > 0)
    rgba = np.zeros((Hm, Wm, 4), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = 0x00, 0x96, 0x88  # қамишзор — тўқ феруза
    rgba[..., 3] = (al * 230).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(MASK, optimize=True)
    out = {"src": "ESA WorldCover 10 m 2021 v200 (CC-BY 4.0), синф 90 (Herbaceous wetland), ~80 м",
           "mask": {"png": "data/wetland-mask.png", "w": lon0, "n": lat1, "e": lon0 + Wm * f * px, "s": lat1 - Hm * f * px},
           "f": ["km2", "pct"], "d": res}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    uz = sorted(((v[0], k) for k, v in res.items() if not k.startswith("n")), reverse=True)
    print("туманлар: %d (Ўзбекистон %d), жами Ўзбекистон қамишзори %.0f км²; энг катта: %s" % (
        len(res), len(uz), sum(v for v, _ in uz), ", ".join("%s %.0f" % (k, v) for v, k in uz[:8])), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
