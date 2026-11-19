#!/usr/bin/env python3
"""Сариқ занг (Puccinia striiformis) қишлаб қолиш индекси → plant-protection/data/overwinter.json

Сариқ занг кузда кўкарган буғдойни юқтиради ва қишни барг ичида (мицелий) ўтказади: илиқ қишда тирик қолади ва
баҳорда эрта бошланади, қаҳратон қишда (узоқ −5…−10 °C дан паст) барг билан нобуд бўлади (Coakley ва бошқ., 1984,
Phytopathology 74: 213; Ma, 2015 — Хитойда январ ўртача ҳарорати қишлов чегараси сифатида).
Бизнинг маълумотда (data-hist/rust-history.json, 1995–2026, 26 нуқта): январ–феврал ўртача ҳарорати кучли сариқ
занг йилларини AUC ≈ 0.90 билан ажратади (аралаштириш тести, p ≈ 0.002; кучли йиллар — data-hist/rust-epidemics.json).

Туман бўйича (data/rust.json ва ўтган йил архиви, мавсум 1-октябрдан):
  ai — кузги юқиш кунлари (октябр–декабр): узлуксиз ҳўл давр ≥ 8 соат ва шу пайтдаги ҳарорат 5–15 °C;
  wm — 1-декабрдан бугунгача (28-февралгача) ўртача ҳарорат, °C; fr — шу даврда ўртача ҳарорат ≤ −5 °C кунлар.
  Балл: илиқлик (wm ≥ 3 °C → 2, 0…3 °C → 1, < 0 → 0) + кузги юқиш (ai ≥ 3 → 1) − қаҳратон (fr ≥ 10 → 1).
  Синф: ≥ 3 — қишлаш учун қулай, 2 — ўртача, ≤ 1 — ноқулай. Декабргача фақат кузги юқиш кўрсатилади.
Мамлакат бўйича (26 нуқта, буғдой майдони вазни): 1-декабрдан шу санагача ўртача ҳарорат ва ўтган 32 йилнинг шу
даврдаги қийматлари (кучли йиллар белгиланган).
"""
import datetime as dt
import json
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "plant-protection", "data")
HIST = os.path.join(ROOT, "data-hist", "rust-history.json")
LAB = os.path.join(ROOT, "data-hist", "rust-epidemics.json")
OUT = os.path.join(DATA, "overwinter.json")
FIELDS = ["w", "tm", "tx", "r", "h", "c", "rh", "td", "tn", "e", "wl", "tw"]


def today():
    s = os.environ.get("OW_TODAY")
    return dt.date.fromisoformat(s) if s else dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()


def load(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        j = json.load(fh)
    j["_s"] = dt.date.fromisoformat(j["start"])
    return j


def getter(files):
    """(калит, сана) → {tm, wl, tw} ёки None (бир нечта файлдан)."""
    def g(k, d):
        for j in files:
            off = (d - j["_s"]).days
            if off < 0 or off >= j["days"]:
                continue
            a, n = j["d"].get(k), j.get("n", 3)
            if not a or n * off + 1 >= len(a) or a[n * off + 1] is None:
                return None
            row = a[n * off:n * off + n]
            f = dict(zip(FIELDS[:n], row))
            wl, tw = f.get("wl"), f.get("tw")
            if wl is None and f.get("e") is not None:  # wl йўқ (эски архив) — захира: намлик ≥ 87 % соатлари ва тунги ҳарорат
                wl, tw = f["e"], f.get("tn")
            return {"tm": f["tm"] / 10, "wl": wl, "tw": tw / 10 if tw is not None else None}
        return None
    return g


def auc(p, n):
    return sum(1.0 if a > b else 0.5 if a == b else 0.0 for a in p for b in n) / (len(p) * len(n))


def history(win_days):
    """Ўтган йиллар: 1-декабрдан win_days кун ўртача ҳарорат (26 нуқта, вазнли) ва январ–феврал AUC."""
    H = json.load(open(HIST, encoding="utf-8"))
    strong = set(json.load(open(LAB, encoding="utf-8"))["strong"])
    rows = []
    for ys, Y in sorted(H["y"].items(), key=lambda kv: int(kv[0])):
        if not Y:
            continue
        y = int(ys)
        d0 = dt.date(y - 1, 10, 1)
        dec1 = (dt.date(y - 1, 12, 1) - d0).days
        jan1 = (dt.date(y, 1, 1) - d0).days
        mar1 = (dt.date(y, 3, 1) - d0).days
        sw = sv = sjf = 0.0
        for k, v in Y.items():
            tm = v["ser"]["tm"]
            w = H["pts"][k]["ha"]
            a = [x / 10 for x in tm[dec1:dec1 + win_days] if x is not None]
            b = [x / 10 for x in tm[jan1:mar1] if x is not None]
            if not a or not b:
                continue
            sw += w
            sv += w * sum(a) / len(a)
            sjf += w * sum(b) / len(b)
        if sw:
            rows.append({"y": y, "v": round(sv / sw, 2), "jf": round(sjf / sw, 2), "s": y in strong})
    S = [r["jf"] for r in rows if r["s"]]
    O = [r["jf"] for r in rows if not r["s"]]
    A = auc(S, O)
    rng = random.Random(2026)
    x = [r["jf"] for r in rows]
    lab = [r["s"] for r in rows]
    c, N = 0, 5000
    for _ in range(N):
        rng.shuffle(lab)
        a2 = auc([v for v, l in zip(x, lab) if l], [v for v, l in zip(x, lab) if not l])
        if abs(a2 - 0.5) >= abs(A - 0.5) - 1e-12:
            c += 1
    return H["pts"], rows, round(A, 3), round((c + 1) / (N + 1), 4)


def main():
    t = today()
    y0 = t.year if t.month >= 8 else t.year - 1  # мавсум: y0 куз → y0+1 баҳор
    cur = load(os.path.join(DATA, "rust.json"))
    if not cur:
        print("rust.json йўқ", file=sys.stderr)
        return 1
    files = [cur]
    for y in (y0, y0 + 1):  # кузги ой ўтган йил архивида бўлиши мумкин
        if cur["_s"].year != y:
            j = load(os.path.join(DATA, "rust-%d.json" % y))
            if j:
                files.append(j)
    g = getter(files)
    oct1, dec1, jan1 = dt.date(y0, 10, 1), dt.date(y0, 12, 1), dt.date(y0 + 1, 1, 1)
    end = min(t - dt.timedelta(days=1), dt.date(y0 + 1, 2, 28))
    keys = sorted(set().union(*[set(j["d"]) for j in files]), key=lambda k: (k.startswith("n"), k))
    D = {}
    for k in keys:
        ai = 0
        d = oct1
        while d < jan1 and d <= end:
            r = g(k, d)
            if r and r["wl"] is not None and r["tw"] is not None and r["wl"] >= 8 and 5 <= r["tw"] <= 15:
                ai += 1
            d += dt.timedelta(days=1)
        T = []
        fr = 0
        d = dec1
        while d <= end:
            r = g(k, d)
            if r:
                T.append(r["tm"])
                if r["tm"] <= -5:
                    fr += 1
            d += dt.timedelta(days=1)
        wm = sum(T) / len(T) if len(T) >= 7 else None
        if wm is None:
            c, sc = None, None
        else:
            sc = (2 if wm >= 3 else 1 if wm >= 0 else 0) + (1 if ai >= 3 else 0) - (1 if fr >= 10 else 0)
            sc = max(0, sc)
            c = 2 if sc >= 3 else 1 if sc == 2 else 0
        D[k] = [ai, round(wm * 10) if wm is not None else None, fr, sc, c]
    win = (end - dec1).days + 1
    nat = None
    if win >= 7:
        pts, rows, A, p = history(win)
        sw = sv = 0.0
        for k, e in pts.items():
            v = D.get(k)
            if v and v[1] is not None:
                sw += e["ha"]
                sv += e["ha"] * v[1] / 10
        if sw:
            curv = round(sv / sw, 2)
            nat = {"cur": curv, "rank": 1 + sum(1 for r in rows if r["v"] > curv), "n": len(rows) + 1,
                   "hist": [[r["y"], r["v"], 1 if r["s"] else 0] for r in rows], "auc": A, "p": p}
    out = {"made": t.isoformat(), "season": "%d/%02d" % (y0, (y0 + 1) % 100), "upto": end.isoformat(),
           "win": [dec1.isoformat(), end.isoformat()] if win >= 1 else None, "nat": nat,
           "f": ["ai", "wm", "fr", "sc", "c"], "d": D}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    cls = [v[4] for k, v in D.items() if not k.startswith("n")]
    print("қишлаш %s, %s гача: қулай %d, ўртача %d, ноқулай %d, кутилмоқда %d; мамлакат: %s" % (
        out["season"], out["upto"], cls.count(2), cls.count(1), cls.count(0), cls.count(None),
        "%.1f °C, %d/%d-ўрин" % (nat["cur"], nat["rank"], nat["n"]) if nat else "—"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
