#!/usr/bin/env python3
"""ENSO (El Niño / La Niña) индекси — NOAA CPC Oceanic Niño Index (ONI) → plant-protection/data/enso.json

ONI — Niño 3.4 ҳудудида денгиз сирти ҳарорати аномалиясининг 3 ойлик сирғанувчи ўртачаси (ERSSTv5).
Ҳолат (NOAA мезони): ONI ≥ +0.5 — El Niño, ≤ −0.5 — La Niña, оралиқ — нейтрал.
Файл: {"src": ..., "updated": ..., "last": {"season": "SON", "year": 2026, "oni": ..., "phase": ...},
       "s": {"1950": {"DJF": -1.53, ...}, ...}}  — йил: CPC жадвалидаги йил (DJF 1950 = 1949 дек – 1950 фев).
"""
import datetime as dt
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "plant-protection", "data", "enso.json")
URLS = ["https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"]
SEAS = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]


def phase(v):
    return "elnino" if v >= 0.5 else "lanina" if v <= -0.5 else "neutral"


def parse(txt):
    s = {}
    for line in txt.splitlines():
        p = line.split()
        if len(p) == 4 and p[0] in SEAS and p[1].isdigit():
            s.setdefault(p[1], {})[p[0]] = float(p[3])
    return s


def main():
    txt, src = None, None
    for u in URLS:
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "agrohimoya-enso/1.0"}), timeout=60) as r:
                txt, src = r.read().decode("utf-8", "replace"), u
            break
        except Exception as e:
            print("ONI олинмади:", u, e, file=sys.stderr)
    if not txt:
        return 1
    s = parse(txt)
    if len(s) < 50:
        print("ONI жадвали кутилгандан қисқа:", len(s), file=sys.stderr)
        return 1
    y = max(s, key=int)
    k = max(s[y], key=SEAS.index)
    last = {"season": k, "year": int(y), "oni": s[y][k], "phase": phase(s[y][k])}
    out = {"src": src, "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "last": last, "s": s}
    old = None
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            old = json.load(fh)
    if old and old.get("s") == s:
        print("ўзгариш йўқ; охирги:", last)
        return 0
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print("ONI %d йил; охирги %s %d: %+.2f (%s)" % (len(s), k, int(y), last["oni"], last["phase"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
