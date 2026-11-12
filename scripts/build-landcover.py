#!/usr/bin/env python3
"""Ер қопламаси (ESA WorldCover 2021) → plant-protection/data/wx-points.json (v2)

Ғўза зараркунандалари фақат экин майдонларида (суғориладиган воҳаларда)
ривожланади. Шунинг учун:
- ҳар туманда экин майдони (WorldCover синфи 40) ва очиқ чўл (синф 60)
  улуши ҳисобланади;
- экин майдони йўқ (ёки жуда кам) туман — "desert"/"nocrop": прогноз
  берилмайди;
- экин майдони бор туманда ҳарорат фақат экин майдони тушган 0.25°
  катаклардан, экин майдони юзасига мутаносиб вазн билан олинади (энг кўпи
  MAX_CELLS та катак).

Қўшимча: plant-protection/data/desert-mask.png — очиқ чўл (синф 60) қатлами,
харитада туман ранглари устидан қумранг кўрсатилади (barcha зараркунандалар учун).

Маълумот: ESA WorldCover 10 m 2021 v200 (CC-BY 4.0), AWS S3 очиқ COG'лари,
~300 м обзор (overview) даражасида ўқилади.

Ишга тушириш (rasterio, shapely, numpy керак; интернет):
    python3 scripts/build-landcover.py
"""
import json
import math
import os
import re
import sys

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.features import rasterize
from rasterio.transform import from_origin
from shapely.geometry import MultiPolygon, Polygon, shape, mapping

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "plant-protection")
OUT = os.path.join(P, "data", "wx-points.json")
MASK = os.path.join(P, "data", "desert-mask.png")
MASK_RES = 0.02  # чўл қатлами пиксели (°) ≈ 2 км
CROP_NEAR_KM = float(os.environ.get("CROP_NEAR_KM", "6"))  # экиндан шунча км узоқ ер — рангсиз
URL = "/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_%s_Map.tif"
DEC = 32                      # 10 м × 32 ≈ 300 м пиксел
PX = 3.0 / (36000 // DEC)     # пиксел ўлчами (градус)
MAX_CELLS = 6
MIN_CROP_KM2 = float(os.environ.get("MIN_CROP_KM2", "10"))  # бундан кам экин — прогноз йўқ
CROP, BARE, BUILT = 40, 60, 50
PX0, PY0, PS = 55.9987, 45.5901, 58.3397  # uz-districts.js SVG проекцияси


def snap(v, s=0.25):
    return math.floor(v / s + 0.5) * s


def svg_to_geom(d):
    polys = []
    for part in re.split(r"[Mm]", d):
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", part)]
        pts = [(nums[i] / PS + PX0, PY0 - nums[i + 1] / PS) for i in range(0, len(nums) - 1, 2)]
        if len(pts) >= 3:
            g = Polygon(pts).buffer(0)
            polys += list(g.geoms) if hasattr(g, "geoms") else [g]
    return MultiPolygon(polys).buffer(0)


def tile_name(lat0, lon0):
    return "%s%02d%s%03d" % ("N" if lat0 >= 0 else "S", abs(lat0), "E" if lon0 >= 0 else "W", abs(lon0))


def load_districts():
    with open(os.path.join(P, "js", "uz-districts.js"), encoding="utf-8") as fh:
        D = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    with open(os.path.join(P, "js", "uz-geo.js"), encoding="utf-8") as fh:
        G = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    with open(os.path.join(P, "data", "uz-neighbors.geojson"), encoding="utf-8") as fh:
        NB = json.load(fh)
    out = []  # (key, name, geom, centre(lat,lon))
    for i, it in enumerate(D["items"]):
        if G[i]:
            out.append((str(i), it["c"], svg_to_geom(it["d"]), (G[i][0], G[i][1])))
    for k, f in enumerate(NB["features"]):
        if f.get("geometry"):
            g = shape(f["geometry"])
            c = g.representative_point()
            out.append(("n%d" % k, f["properties"].get("c") or "", g, (c.y, c.x)))
    return out


def main():
    dist = load_districts()
    minx = min(g.bounds[0] for _, _, g, _ in dist)
    miny = min(g.bounds[1] for _, _, g, _ in dist)
    maxx = max(g.bounds[2] for _, _, g, _ in dist)
    maxy = max(g.bounds[3] for _, _, g, _ in dist)
    lon0, lat0 = math.floor(minx / 3) * 3, math.floor(miny / 3) * 3
    lon1, lat1 = math.ceil(maxx / 3) * 3, math.ceil(maxy / 3) * 3
    W, H = int(round((lon1 - lon0) / PX)), int(round((lat1 - lat0) / PX))
    lc = np.zeros((H, W), dtype=np.uint8)
    n = 0
    for la in range(lat0, lat1, 3):
        for lo in range(lon0, lon1, 3):
            name = tile_name(la, lo)
            try:
                with rasterio.open(URL % name) as ds:
                    a = ds.read(1, out_shape=(36000 // DEC, 36000 // DEC), resampling=Resampling.nearest)
            except Exception:
                continue  # денгиз/тайл йўқ
            r0 = int(round((lat1 - (la + 3)) / PX))
            c0 = int(round((lo - lon0) / PX))
            lc[r0:r0 + a.shape[0], c0:c0 + a.shape[1]] = a
            n += 1
            print("tile", name, file=sys.stderr, flush=True)
    print("tiles read: %d, mosaic %dx%d" % (n, W, H), file=sys.stderr)

    tr = from_origin(lon0, lat1, PX, PX)
    ids = rasterize(((mapping(g), j + 1) for j, (_, _, g, _) in enumerate(dist)),
                    out_shape=(H, W), transform=tr, fill=0, dtype="int32")
    rows = np.arange(H)
    lat_c = lat1 - (rows + 0.5) * PX
    pix_km2 = (PX * 111.32) * (PX * 111.32 * np.cos(np.radians(lat_c)))  # ҳар қатор учун
    area_px = np.broadcast_to(pix_km2[:, None], (H, W))
    lat_key = np.floor(lat_c / 0.25 + 0.5) * 0.25
    lon_c = lon0 + (np.arange(W) + 0.5) * PX
    lon_key = np.floor(lon_c / 0.25 + 0.5) * 0.25

    # --- чўл қатлами (PNG, EPSG:4326 — SVG проекцияси ҳам чизиқли lon/lat) ---
    from PIL import Image
    f = max(1, int(round(MASK_RES / PX)))
    Hm, Wm = H // f, W // f
    sub = lc[:Hm * f, :Wm * f]
    cropf = (sub == CROP).reshape(Hm, f, Wm, f).mean(axis=(1, 3))
    builtf = (sub == BUILT).reshape(Hm, f, Wm, f).mean(axis=(1, 3))
    inside = (ids[:Hm * f, :Wm * f] > 0).reshape(Hm, f, Wm, f).mean(axis=(1, 3))
    # экин майдонига яқинлик: CROP_NEAR_KM радиусдаги энг катта экин улуши
    # (чўл, дашт, бута, тоғ, сув — экин йўқ ҳамма жой ёпилади; масалан
    # Қўнғирот шимолидаги Устюрт дашти (синф 30) олдин рангли қолган эди)
    rad = max(1, int(round(CROP_NEAR_KM / (MASK_RES * 111.32))))
    pad = np.pad(cropf, rad)
    near = np.zeros_like(cropf)
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            if dy * dy + dx * dx <= rad * rad:
                near = np.maximum(near, pad[rad + dy:rad + dy + Hm, rad + dx:rad + dx + Wm])
    nocrop = 1 - np.clip(near / 0.02, 0, 1)        # 2% экин бўлса — экин зонаси
    alpha = np.clip(nocrop * (1 - builtf * 3) * inside * 1.15, 0, 1)
    alpha[alpha < 0.12] = 0
    rgba = np.zeros((Hm, Wm, 4), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = 0xFF, 0xFF, 0xFF  # экин майдони йўқ — оқ
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(MASK, optimize=True)
    mask_meta = {"png": "data/desert-mask.png", "w": lon0, "n": lat1,
                 "e": lon0 + Wm * f * PX, "s": lat1 - Hm * f * PX}
    print("desert mask %dx%d → %s (%d KB)" % (Wm, Hm, MASK, os.path.getsize(MASK) // 1024), file=sys.stderr)

    res = {}
    stats = []
    for j, (key, name, g, ctr) in enumerate(dist):
        m = ids == (j + 1)
        if not m.any():
            continue
        cls = lc[m]
        ar = area_px[m]
        tot = ar.sum()
        crop_m = cls == CROP
        crop = ar[crop_m].sum()
        bare = ar[cls == BARE].sum()
        rr, cc = np.nonzero(m)
        built = ar[cls == BUILT].sum()
        entry = {"crop": round(float(crop), 1), "cropPct": round(100 * float(crop / tot), 2),
                 "barePct": round(100 * float(bare / tot), 1), "builtPct": round(100 * float(built / tot), 1)}
        if crop >= MIN_CROP_KM2:
            r2, c2, a2 = rr[crop_m], cc[crop_m], ar[crop_m]
            cell = {}
            for la_k, lo_k, a_k in zip(lat_key[r2], lon_key[c2], a2):
                k = "%.2f,%.2f" % (la_k, lo_k)
                cell[k] = cell.get(k, 0.0) + float(a_k)
            top = sorted(cell.items(), key=lambda kv: -kv[1])[:MAX_CELLS]
            s = sum(v for _, v in top)
            entry["c"] = [[k, round(v / s, 4)] for k, v in sorted(top)]
        elif entry["builtPct"] >= 15 or "шаҳри" in name:
            # шаҳар — чўл эмас: прогноз олдингидек туман марказидан
            entry["zone"] = "city"
            entry["c"] = [["%.2f,%.2f" % (snap(ctr[0]), snap(ctr[1])), 1.0]]
        else:
            # табиий ер, экин йўқ: очиқ чўл (bare ≥ 50%) ёки дашт/тоғ
            entry["zone"] = "desert" if entry["barePct"] >= 50 else "nocrop"
        res[key] = entry
        stats.append((key, name, entry))

    cells = sorted({k for e in res.values() for k, _ in e.get("c", [])})
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"v": 2, "src": "ESA WorldCover 2021 v200 (CC-BY 4.0)", "minCropKm2": MIN_CROP_KM2,
                   "desertMask": mask_meta, "d": res}, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    nd = sum(1 for e in res.values() if e.get("zone") == "desert")
    nn = sum(1 for e in res.values() if e.get("zone") == "nocrop")
    nc = sum(1 for e in res.values() if e.get("zone") == "city")
    print("districts %d | forecast %d (of them city %d) | desert %d | no-crop (steppe/mountain) %d | weather cells %d → %s"
          % (len(res), len(res) - nd - nn, nc, nd, nn, len(cells), OUT))
    if os.environ.get("LC_REPORT"):
        for key, name, e in sorted(stats, key=lambda s: s[2]["crop"]):
            print("%-6s %-26s crop %8.1f km² (%5.2f%%) bare %5.1f%% %s" %
                  (key, name, e["crop"], e["cropPct"], e["barePct"], e.get("zone", "")))


if __name__ == "__main__":
    main()
