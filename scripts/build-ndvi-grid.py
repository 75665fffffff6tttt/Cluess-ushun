#!/usr/bin/env python3
"""NDVI ҳисоби учун тўр: Ўзбекистон туманлари × экин майдони → data-hist/ndvi-grid.npz

Бир марта (ер қоплами янгиланганда) ишга туширилади. 0.0025° (~250 м) тўрда ҳар пиксел учун
туман рақами (uz-districts.js тартибида, 1..199), фақат экин майдони (Esri/IO 2024, синф «Crops»)
бўлган пикселларда; қолганлари 0. scripts/build-ndvi.py шу тўр бўйича Sentinel-2 NDVI'ни
туманлар бўйича ўртачалайди.
"""
import importlib.util
import os
import sys

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.transform import from_origin
from rasterio.warp import reproject
from shapely.geometry import mapping

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data-hist", "ndvi-grid.npz")
PX = 0.0025
_spec = importlib.util.spec_from_file_location("lc", os.path.join(ROOT, "scripts", "build-landcover.py"))
lc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lc)


def main():
    dist = [d for d in lc.load_districts() if not d[0].startswith("n")]  # фақат Ўзбекистон
    minx = min(g.bounds[0] for _, _, g, _ in dist) - 0.05
    miny = min(g.bounds[1] for _, _, g, _ in dist) - 0.05
    maxx = max(g.bounds[2] for _, _, g, _ in dist) + 0.05
    maxy = max(g.bounds[3] for _, _, g, _ in dist) + 0.05
    W, H = int(np.ceil((maxx - minx) / PX)), int(np.ceil((maxy - miny) / PX))
    tr = from_origin(minx, maxy, PX, PX)
    crop = np.zeros((H, W), dtype=np.uint8)
    for zone in range(int((minx + 180) // 6) + 1, int((maxx + 180) // 6) + 2):
        for band in "STU":
            name = "%02d%s" % (zone, band)
            try:
                with rasterio.open(lc.IO_URL % (name, lc.IO_YEAR), OVERVIEW_LEVEL=3) as ds:  # 160 м
                    a = ds.read(1)
                    src_tr, src_crs = ds.transform, ds.crs
            except Exception:
                continue
            tmp = np.zeros((H, W), dtype=np.uint8)
            # экин улуши (0..255): average — 250 м пикселда экин ярмидан кўп бўлса экин
            reproject(((a == 5) * 255).astype(np.uint8), tmp, src_transform=src_tr, src_crs=src_crs,
                      dst_transform=tr, dst_crs="EPSG:4326", resampling=Resampling.average)
            crop = np.maximum(crop, tmp)
            print("io tile", name, file=sys.stderr, flush=True)
    lab = rasterize(((mapping(g), int(k) + 1) for k, _, g, _ in dist), out_shape=(H, W), transform=tr,
                    fill=0, dtype="int16")
    lab[crop < 128] = 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    np.savez_compressed(OUT, lab=lab, transform=np.array([minx, maxy, PX]), n=np.array([len(dist)]))
    cnt = np.bincount(lab.ravel(), minlength=len(dist) + 1)
    print("grid %dx%d, crop px %d, districts with crop %d → %s (%d KB)" % (
        W, H, int((lab > 0).sum()), int((cnt[1:] > 0).sum()), OUT, os.path.getsize(OUT) // 1024))


if __name__ == "__main__":
    main()
