#!/usr/bin/env python3
"""wx.json (ва wx-ЙИЛ.json архивлари) → сайт учун икки қисм: plant-protection/data/wx/ЙИЛ-uz.json ва ЙИЛ-nb.json

wx.json ≈ 1,7 МБ: 0,25° катаклар бўйича кунлик max/min ҳарорат. Туманлар катакларга data/wx-points.json
орқали боғланган. «uz» қисмида Ўзбекистон туманлари ишлатадиган катаклар, «nb» қисмида қолганлари
(фақат қўшни давлатлар туманлари учун). Сайт (js/fenologik.js) аввал «uz»ни юклаб харитани чизади, кейин «nb»ни
қўшиб қайта ҳисоблайди. Тўлиқ wx.json скриптлар учун ўзгармай қолади.
Қисм файли: wx.json мета майдонлари (v, start, days, step, tz, updated, fc_at) + {"part": "uz"|"nb", "src": ..., "cells": {...}}.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "plant-protection", "data")
OUTD = os.path.join(DATA, "wx")
META = ("v", "start", "days", "step", "tz", "updated", "fc_at")


def uz_cells():
    with open(os.path.join(DATA, "wx-points.json"), encoding="utf-8") as fh:
        X = json.load(fh)
    s = set()
    for k, e in X["d"].items():
        if k.startswith("n"):
            continue
        if isinstance(e, list):
            s.update(e)
        elif isinstance(e, dict):
            s.update(c[0] for c in e.get("c", []))
    return s


def split(path, U):
    with open(path, encoding="utf-8") as fh:
        W = json.load(fh)
    year = W["start"][:4]
    cells = W["cells"]
    parts = {"uz": {k: v for k, v in cells.items() if k in U}, "nb": {k: v for k, v in cells.items() if k not in U}}
    os.makedirs(OUTD, exist_ok=True)
    out = []
    for p, cc in parts.items():
        obj = {k: W[k] for k in META if k in W}
        obj.update({"part": p, "src": os.path.basename(path), "cells": cc})
        txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        fn = os.path.join(OUTD, "%s-%s.json" % (year, p))
        old = None
        if os.path.exists(fn):
            with open(fn, encoding="utf-8") as fh:
                old = fh.read()
        if old != txt:
            with open(fn, "w", encoding="utf-8") as fh:
                fh.write(txt)
        out.append("%s %d катак %d КБ%s" % (os.path.basename(fn), len(cc), len(txt) // 1024, "" if old != txt else " (ўзгармади)"))
    return out


def main():
    U = uz_cells()
    files = sorted(f for f in os.listdir(DATA) if re.fullmatch(r"wx(-\d{4})?\.json", f))
    for f in files:
        try:
            for line in split(os.path.join(DATA, f), U):
                print(f, "→", line)
        except (KeyError, ValueError) as e:
            print(f, "ўтказиб юборилди:", e, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
