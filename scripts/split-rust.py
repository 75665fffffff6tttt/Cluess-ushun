#!/usr/bin/env python3
"""rust.json (ва rust-ЙИЛ.json архивлари) → сайт учун кичик қисмлар: plant-protection/data/rust/ЙИЛ-uz.json ва ЙИЛ-nb.json

Нега: тўлиқ rust.json ≈ 4 МБ (gzip ≈ 1 МБ) ва унда сайт ишлатмайдиган майдонлар бор (w, tx, r, h, c).
Сайт (js/fenologik.js) фақат tm, rh, td, tn, e, wl, tw ни ишлатади. Ўзбекистон туманлари (uz) биринчи юкланади
ва харита дарҳол чизилади; қўшни давлатлар туманлари («n…» калитлар, nb) кейин юкланади.
Тўлиқ rust.json скриптлар (seir.py, build-rust-zones.py) учун ўзгармай қолади; қисмлар алоҳида «rust/» папкасида,
чунки бу скриптлар data/ ичидаги rust*.json файлларини ўқийди.

Қисм файли: {"v": 1, "src": манба файл, "start": "ЙИЛ-01-01", "days": N, "updated": ..., "f": [майдонлар], "n": 7,
             "part": "uz"|"nb", "d": {"калит": [кун0 майдонлари..., кун1 ...]}} — қийматлар манбадагидек (ҳарорат ×10).
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "plant-protection", "data")
OUTD = os.path.join(DATA, "rust")
SRC_FIELDS = ["w", "tm", "tx", "r", "h", "c", "rh", "td", "tn", "e", "wl", "tw"]  # rust.json v5 тартиби
KEEP = ["tm", "rh", "td", "tn", "e", "wl", "tw"]


def split(path):
    with open(path, encoding="utf-8") as fh:
        d = json.load(fh)
    n, days = d.get("n", 3), d["days"]
    src = SRC_FIELDS[:n]
    keep = [f for f in KEEP if f in src]
    idx = [src.index(f) for f in keep]
    year = d["start"][:4]
    parts = {"uz": {}, "nb": {}}
    for k, a in d["d"].items():
        out = []
        for j in range(days):
            o = n * j
            row = a[o:o + n]
            if len(row) < n or row[0] is None or row[1] is None:
                out.extend([None] * len(keep))
            else:
                out.extend(row[q] for q in idx)
        while out and all(v is None for v in out[-len(keep):]):  # охиридаги бўш кунлар
            del out[-len(keep):]
        parts["nb" if k.startswith("n") else "uz"][k] = out
    os.makedirs(OUTD, exist_ok=True)
    res = []
    for p, dd in parts.items():
        obj = {"v": 1, "src": os.path.basename(path), "start": d["start"], "days": days, "updated": d.get("updated"),
               "f": keep, "n": len(keep), "part": p, "d": dd}
        fn = os.path.join(OUTD, "%s-%s.json" % (year, p))
        txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        old = None
        if os.path.exists(fn):
            with open(fn, encoding="utf-8") as fh:
                old = fh.read()
        if old != txt:
            with open(fn, "w", encoding="utf-8") as fh:
                fh.write(txt)
        res.append("%s %d туман %d КБ%s" % (os.path.basename(fn), len(dd), len(txt) // 1024, "" if old != txt else " (ўзгармади)"))
    return res


def main():
    files = sorted(f for f in os.listdir(DATA) if re.fullmatch(r"rust(-\d{4})?\.json", f))
    if not files:
        print("rust*.json йўқ")
        return 0
    for f in files:
        try:
            for line in split(os.path.join(DATA, f)):
                print(f, "→", line)
        except (KeyError, ValueError) as e:
            print(f, "ўтказиб юборилди:", e, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
