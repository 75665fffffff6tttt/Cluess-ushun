#!/usr/bin/env python3
"""Ҳар туман учун ҳарорат нуқталари → plant-protection/data/wx-points.json

Катта туманнинг ҳарорати битта марказ нуқтадан эмас, туман ичидаги бир
нечта нуқтанинг ўртачасидан олинади (масалан, Туркманистоннинг 140 км
чўзилган Ферап тумани маркази чўлда бўлиб, воҳадаги қўшни туманлардан
сунъий фарқ берарди).

Қоида: туман ичига тушган 0.5° тўр нуқталари (энг кўпи MAX_PTS та, текис
танланади). Битта ҳам нуқта тушмаса (кичик туман) — туман марказининг 0.25°
катаги. Калитлар фенологик саҳифа билан бир хил: Ўзбекистон тумани — индекс
(uz-districts.js), қўшни туман — "n" + uz-neighbors.geojson'даги тартиб рақами.

Туман чегаралари ўзгарганда қайта ишга туширинг (shapely керак):
    python3 scripts/build-wx-points.py
"""
import json
import math
import os
import re

from shapely.geometry import MultiPolygon, Point, Polygon, shape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "plant-protection")
OUT = os.path.join(P, "data", "wx-points.json")
GRID = 0.5
MAX_PTS = 9
PX0, PY0, PS = 55.9987, 45.5901, 58.3397  # uz-districts.js SVG проекцияси


def snap(v, s=0.25):
    return math.floor(v / s + 0.5) * s


def key(lat, lon):
    return "%.2f,%.2f" % (snap(lat), snap(lon))


def svg_to_geom(d):
    polys = []
    for part in re.split(r"[Mm]", d):
        nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", part)]
        pts = [(nums[i] / PS + PX0, PY0 - nums[i + 1] / PS) for i in range(0, len(nums) - 1, 2)]
        if len(pts) >= 3:
            g = Polygon(pts).buffer(0)
            polys += list(g.geoms) if hasattr(g, "geoms") else [g]
    return MultiPolygon(polys).buffer(0)


def grid_points(g):
    minx, miny, maxx, maxy = g.bounds
    out = []
    la = math.ceil(miny / GRID) * GRID
    while la <= maxy + 1e-9:
        lo = math.ceil(minx / GRID) * GRID
        while lo <= maxx + 1e-9:
            if g.contains(Point(lo, la)):
                out.append((round(la, 2), round(lo, 2)))
            lo += GRID
        la += GRID
    if len(out) > MAX_PTS:  # текис танлаш
        out = [out[round(j * (len(out) - 1) / (MAX_PTS - 1))] for j in range(MAX_PTS)]
    return out


def ring_area(r):
    return sum(r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1] for i in range(len(r))) / 2


def ring_ctr(r):  # фенологик.js'даги ringCtr билан бир хил
    a = cx = cy = 0.0
    for i in range(len(r)):
        f = r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1]
        a += f
        cx += (r[i - 1][0] + r[i][0]) * f
        cy += (r[i - 1][1] + r[i][1]) * f
    a /= 2
    return r[0] if abs(a) < 1e-12 else [cx / (6 * a), cy / (6 * a)]


def main():
    with open(os.path.join(P, "js", "uz-districts.js"), encoding="utf-8") as fh:
        D = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    with open(os.path.join(P, "js", "uz-geo.js"), encoding="utf-8") as fh:
        G = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    with open(os.path.join(P, "data", "uz-neighbors.geojson"), encoding="utf-8") as fh:
        NB = json.load(fh)

    out, multi = {}, 0
    for i, it in enumerate(D["items"]):
        if not G[i]:
            continue
        pts = grid_points(svg_to_geom(it["d"]))
        multi += len(pts) >= 2
        out[str(i)] = sorted({key(*p) for p in pts}) or [key(G[i][0], G[i][1])]
    for k, f in enumerate(NB["features"]):
        g = f.get("geometry")
        if not g:
            continue
        pts = grid_points(shape(g))
        multi += len(pts) >= 2
        if pts:
            out["n%d" % k] = sorted({key(*p) for p in pts})
        else:
            polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
            best = max((p[0] for p in polys), key=lambda r: abs(ring_area(r)))
            c = ring_ctr(best)
            out["n%d" % k] = [key(c[1], c[0])]

    cells = sorted({c for v in out.values() for c in v})
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"v": 1, "grid": GRID, "max": MAX_PTS, "d": out}, fh, separators=(",", ":"), sort_keys=True)
    print("districts %d (multi-point %d) → cells %d → %s" % (len(out), multi, len(cells), OUT))


if __name__ == "__main__":
    main()
