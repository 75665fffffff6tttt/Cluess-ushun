#!/usr/bin/env python3
"""Сариқ занг: ёзлов ва қишлов зоналари (Хитой эпидемиологик зоналари услубида) → plant-protection/data/rust-zones.json

Хитой тажрибаси: патоген ёзни салқин баландликда (энг иссиқ 10 кунлик ўртача ҳарорат ≈ 22 °C дан паст),
қишни эса кузги майсаларда (январ ўртача ҳарорати ≈ −6 °C дан юқори) ўтказади; шу «манба» зоналаридан
кузда ва баҳорда споралар экин ҳудудларига тарқалади. Чегаралар — Хитой адабиётидаги тахминий қийматлар.

Маълумот:
- ҳарорат: data/rust.json (жорий йил) ва data/rust-<ўтган йил>.json — ҳар туманнинг экин нуқтаси, кунлик ўртача;
- рельеф: Copernicus DEM GLO-90 (AWS очиқ архиви, калит керак эмас), ~1 км тўрга ўртачаланган;
- баландлик бўйича ҳарорат: ҳар 1000 м га −6.5 °C (стандарт пасайиш).
Ҳар туман учун:
  z0  — экин нуқтасининг баландлиги (м)
  tj  — қишдаги энг совуқ 30 кунлик ўртача ҳарорат (экин нуқтасида, °C; январ атрофи)
  ts  — ёздаги энг иссиқ 10 кунлик ўртача ҳарорат (экин нуқтасида, °C)
  zs  — ёзлов мумкин бўлган баландлик: z0 + (ts − 22) / 0.0065 (м)
  os  — туман ҳудудининг zs дан баланд (ва 3500 м дан паст) қисми, %; osk — км²
  ow  — қишлов: 2 — ишончли (≥ 0 °C, қишда ҳам споралар ҳосил бўлади), 1 — мумкин (−6…0 °C), 0 — йўқ (< −6 °C)
"""
import datetime as dt
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
from rasterio.warp import reproject
from shapely.geometry import mapping

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "plant-protection")
OUT = os.path.join(P, "data", "rust-zones.json")
DEM = "https://copernicus-dem-90m.s3.amazonaws.com/Copernicus_DSM_COG_30_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM/Copernicus_DSM_COG_30_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM.tif"
PX = 0.01               # ~1 км
LAPSE = 0.0065          # °C / м
T_SUMMER = 22.0         # ёзлов: энг иссиқ 10 кунлик ўртача шундан паст
T_WINTER = -6.0         # қишлов: энг совуқ 30 кунлик ўртача шундан юқори
Z_MAX = 3500.0          # бундан баландда ўт қоплами деярли йўқ

_spec = importlib.util.spec_from_file_location("lc", os.path.join(ROOT, "scripts", "build-landcover.py"))
lc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(lc)


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def dem_grid(minx, miny, maxx, maxy):
    """Copernicus DEM 1° тайлларидан ~1 км тўр (ўртача баландлик, денгиз/бўш — NaN)."""
    W, H = int(math.ceil((maxx - minx) / PX)), int(math.ceil((maxy - miny) / PX))
    tr = from_origin(minx, maxy, PX, PX)
    z = np.full((H, W), np.nan, dtype=np.float32)
    for la in range(int(math.floor(miny)), int(math.ceil(maxy))):
        for lo in range(int(math.floor(minx)), int(math.ceil(maxx))):
            url = DEM.format(ns="N" if la >= 0 else "S", la=abs(la), ew="E" if lo >= 0 else "W", lo=abs(lo))
            try:
                with rasterio.open("/vsicurl/" + url, OVERVIEW_LEVEL=1) as src:  # ~360 м
                    a = src.read(1).astype(np.float32)
                    tmp = np.full((H, W), np.nan, dtype=np.float32)
                    reproject(a, tmp, src_transform=src.transform, src_crs=src.crs, dst_transform=tr,
                              dst_crs="EPSG:4326", resampling=Resampling.average, src_nodata=None, dst_nodata=np.nan)
                    m = ~np.isnan(tmp)
                    z[m] = tmp[m]
            except Exception:
                continue  # денгиз ёки тайл йўқ
        log("dem row", la)
    return z, tr


def series():
    """Ҳар туман калити → [(сана, ўртача ҳарорат)] (ўтган йил + жорий йил)."""
    out = {}
    files = sorted(f for f in os.listdir(os.path.join(P, "data")) if f.startswith("rust") and f.endswith(".json") and f != "rust-zones.json")
    for f in files:
        with open(os.path.join(P, "data", f), encoding="utf-8") as fh:
            d = json.load(fh)
        n, s0 = d.get("n", 3), dt.date.fromisoformat(d["start"])
        for k, a in d["d"].items():
            L = out.setdefault(k, {})
            for j in range(d["days"]):
                if n * j + 1 < len(a) and a[n * j] is not None:
                    L[s0 + dt.timedelta(days=j)] = a[n * j + 1] / 10
    return out


def roll(vals, w, fn):
    """Сирғанувчи ўртача (w кун) — энг катта ёки энг кичик қиймат."""
    if len(vals) < w:
        return None
    c = np.convolve(np.array(vals, dtype=float), np.ones(w) / w, mode="valid")
    return float(fn(c))


def main():
    dist = lc.load_districts()
    with open(os.path.join(P, "data", "wx-points.json"), encoding="utf-8") as fh:
        wp = json.load(fh)["d"]
    S = series()
    minx = min(g.bounds[0] for _, _, g, _ in dist) - 0.1
    miny = min(g.bounds[1] for _, _, g, _ in dist) - 0.1
    maxx = max(g.bounds[2] for _, _, g, _ in dist) + 0.1
    maxy = max(g.bounds[3] for _, _, g, _ in dist) + 0.1
    z, tr = dem_grid(minx, miny, maxx, maxy)
    H, W = z.shape
    keys = [k for k, _, _, _ in dist]
    lab = rasterize(((mapping(g), i + 1) for i, (_, _, g, _) in enumerate(dist)), out_shape=(H, W), transform=tr, fill=0, dtype="int32")
    cell_km2 = lambda r: (PX * 111.32) * (PX * 111.32 * math.cos(math.radians(maxy - (r + 0.5) * PX)))
    km2 = np.array([cell_km2(r) for r in range(H)], dtype=np.float32)[:, None] * np.ones((1, W), dtype=np.float32)

    # мавсум: ўтган йил 1-августдан жорий йилнинг 31-июлигача (ёз — жорий йил июн–сентябри, қиш — ноябр–март)
    today = dt.date.today()
    y = today.year if today.month >= 10 else today.year - 1
    w0, w1 = dt.date(y - 1, 11, 1), dt.date(y, 3, 31)
    s0, s1 = dt.date(y, 6, 1), dt.date(y, 9, 30)
    res = {}
    for idx, k in enumerate(keys):
        L = S.get(k)
        e = wp.get(k)
        if not L or not isinstance(e, dict) or not e.get("c"):
            continue
        la, lo = (float(v) for v in max(e["c"], key=lambda kw: kw[1])[0].split(","))
        r, c = int((maxy - la) / PX), int((lo - minx) / PX)
        z0 = float(np.nanmean(z[max(0, r - 1):r + 2, max(0, c - 1):c + 2])) if 0 <= r < H and 0 <= c < W else float("nan")
        win = [L[d] for d in sorted(L) if w0 <= d <= w1]
        sumr = [L[d] for d in sorted(L) if s0 <= d <= s1]
        tj = roll(win, 30, np.min)
        ts = roll(sumr, 10, np.max)
        if tj is None or ts is None or math.isnan(z0):
            continue
        zs = z0 + (ts - T_SUMMER) / LAPSE
        m = lab == idx + 1
        zz = z[m]
        ok = (zz >= zs) & (zz <= Z_MAX)
        area = float(km2[m].sum())
        osk = float(km2[m][ok].sum())
        res[k] = {"z0": round(z0), "tj": round(tj, 1), "ts": round(ts, 1), "zs": round(zs),
                  "os": round(100 * osk / area, 1) if area else 0, "osk": round(osk),
                  "zmax": int(np.nanmax(zz)) if zz.size and not np.all(np.isnan(zz)) else None,
                  "ow": 2 if tj >= 0 else 1 if tj >= T_WINTER else 0}
    out = {"v": 1, "season": [w0.isoformat(), s1.isoformat()], "rule": {"tSummer": T_SUMMER, "tWinter": T_WINTER, "lapse": LAPSE, "zMax": Z_MAX},
           "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "d": res}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    log("districts", len(res), "oversummer>1%:", sum(1 for v in res.values() if v["os"] > 1),
        "overwinter:", sum(1 for v in res.values() if v["ow"] > 0))


if __name__ == "__main__":
    main()
