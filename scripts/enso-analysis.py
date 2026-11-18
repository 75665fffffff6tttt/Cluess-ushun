#!/usr/bin/env python3
"""ENSO ва бизнинг маълумотлар: 1995–2026 мавсумлари (data-hist/rust-history.json, 26 туман нуқтаси, ERA5 соатлик)
ва куз–қиш ONI (plant-protection/data/enso.json) ўртасидаги боғлиқлик → data-hist/enso-analysis.json

Предиктор: ONI «OND» (октябр–декабр, ҳосил йилидан олдинги йил) — январ бошида маълум бўлади (мавсум олди сигнали);
қўшимча: «DJF» (декабр–феврал).
Кўрсаткичлар (буғдой майдони бўйича ўртача): март–май намлиги, ёмғирли соатлари, юқиш кунлари; найчалаш–гуллашда юқиш
кунлари; *** 5 кунликлар; март ўртача ҳарорати; январ–феврал совуқ кунлари; ноябр–феврал ёмғирли соатлари ва
декабр–феврал ўртача ҳарорати; SEIR индекси; кучли сариқ занг йиллари (data-hist/rust-epidemics.json).
Статистика: Спирмен корреляцияси, 20 000 марта аралаштириш билан p-қиймат (икки томонлама); El Niño / нейтрал /
La Niña гуруҳлари ўртачалари; кучли йилларни ажратиш AUC. Кўп текширув туфайли (≈ 12 кўрсаткич) p < 0.004 (Бонферрони)
ишончли, p < 0.05 — фақат ишора.
"""
import datetime as dt
import json
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(ROOT, "data-hist", "rust-history.json")
LAB = os.path.join(ROOT, "data-hist", "rust-epidemics.json")
SEIRP = os.path.join(ROOT, "plant-protection", "data", "seir-par.json")
ENSO = os.environ.get("ENSO_FILE") or os.path.join(ROOT, "plant-protection", "data", "enso.json")
OUT = os.path.join(ROOT, "data-hist", "enso-analysis.json")
NPERM = int(os.environ.get("ENSO_NPERM", "20000"))

NAMES = {
    "rh": "март–май ўртача намлик, %", "rain": "март–май ёмғирли соатлар", "inf": "март–май юқиш кунлари (сариқ занг)",
    "infw": "найчалаш–гуллашда юқиш кунлари", "p3": "март–май *** 5 кунликлар", "tmar": "март ўртача ҳарорати, °C",
    "cold": "январ–феврал совуқ кунлар (< 0 °C)", "wrain": "ноябр–феврал ёмғирли соатлар", "wtemp": "декабр–феврал ўртача ҳарорат, °C",
    "seir": "SEIR индекси (20 майгача касаллик, %)",
}


def winter(ser, y):
    """ser 1-октябр (y−1) дан: ноябр–феврал ёмғирли соатлар, декабр–феврал ўртача ҳарорат."""
    d0 = dt.date(y - 1, 10, 1)
    r = 0
    T = []
    for j, tm in enumerate(ser.get("tm", [])):
        d = d0 + dt.timedelta(days=j)
        if tm is None:
            continue
        if d.month in (11, 12, 1, 2):
            r += ser["r"][j] or 0
        if d.month in (12, 1, 2):
            T.append(tm / 10)
    return r, (sum(T) / len(T) if T else None)


def rank(x):
    o = sorted(range(len(x)), key=lambda i: x[i])
    r = [0.0] * len(x)
    i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and x[o[j + 1]] == x[o[i]]:
            j += 1
        for k in range(i, j + 1):
            r[o[k]] = (i + j) / 2.0
        i = j + 1
    return r


def pearson(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    sa = sum((x - ma) ** 2 for x in a) ** 0.5
    sb = sum((x - mb) ** 2 for x in b) ** 0.5
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa and sb else 0.0


def spearman(a, b):
    return pearson(rank(a), rank(b))


def perm_p(a, b, stat, rng):
    obs = stat(a, b)
    bb = list(b)
    c = 0
    for _ in range(NPERM):
        rng.shuffle(bb)
        if abs(stat(a, bb)) >= abs(obs) - 1e-12:
            c += 1
    return obs, (c + 1) / (NPERM + 1)


def auc(pos, neg):
    s = sum(1.0 if a > b else 0.5 if a == b else 0.0 for a in pos for b in neg)
    return s / (len(pos) * len(neg))


def main():
    with open(ENSO, encoding="utf-8") as fh:
        E = json.load(fh)["s"]
    with open(HIST, encoding="utf-8") as fh:
        H = json.load(fh)
    L = json.load(open(LAB, encoding="utf-8"))
    strong = set(L["strong"])
    seir = json.load(open(SEIRP, encoding="utf-8")).get("index", {}) if os.path.exists(SEIRP) else {}
    pts = H["pts"]
    rows = []
    for ys, Y in sorted(H["y"].items(), key=lambda kv: int(kv[0])):
        y = int(ys)
        if not Y:
            continue
        ond = E.get(str(y - 1), {}).get("OND")
        djf = E.get(str(y), {}).get("DJF")
        if ond is None:
            continue
        W = {k: pts[k]["ha"] for k in Y}
        sw = sum(W.values())
        m = {}
        for key in ("rh", "rain", "inf", "infw", "p3", "tmar", "cold"):
            m[key] = sum(Y[k][key] * W[k] for k in Y) / sw
        wr, wt = [], []
        for k in Y:
            r_, t_ = winter(Y[k].get("ser", {}), y)
            wr.append(r_ * W[k])
            if t_ is not None:
                wt.append((t_, W[k]))
        m["wrain"] = sum(wr) / sw
        m["wtemp"] = sum(t * w for t, w in wt) / sum(w for _, w in wt) if wt else None
        if ys in seir:
            m["seir"] = seir[ys]
        rows.append({"year": y, "ond": ond, "djf": djf, "strong": y in strong, "m": m})
    rng = random.Random(2026)
    res = {"years": [r["year"] for r in rows], "n": len(rows), "nperm": NPERM, "method": __doc__.strip().splitlines()[0],
           "made": dt.date.today().isoformat(), "corr": {}, "groups": {}, "strong": {}, "table": rows}
    print("Мавсумлар: %d (%d–%d)\n" % (len(rows), rows[0]["year"], rows[-1]["year"]))
    print("%-42s %8s %8s   %8s %8s" % ("кўрсаткич", "ρ(OND)", "p", "ρ(DJF)", "p"))
    for key, nm in NAMES.items():
        R = [r for r in rows if r["m"].get(key) is not None]
        x = [r["ond"] for r in R]
        v = [r["m"][key] for r in R]
        rho, p = perm_p(x, v, spearman, rng)
        R2 = [r for r in R if r["djf"] is not None]
        rho2, p2 = perm_p([r["djf"] for r in R2], [r["m"][key] for r in R2], spearman, rng)
        res["corr"][key] = {"name": nm, "n": len(R), "rho_ond": round(rho, 3), "p_ond": round(p, 4), "rho_djf": round(rho2, 3), "p_djf": round(p2, 4)}
        g = {}
        for ph, f in (("elnino", lambda o: o >= 0.5), ("neutral", lambda o: -0.5 < o < 0.5), ("lanina", lambda o: o <= -0.5)):
            vv = [r["m"][key] for r in R if f(r["ond"])]
            g[ph] = {"n": len(vv), "mean": round(sum(vv) / len(vv), 2) if vv else None}
        res["groups"][key] = g
        flag = "  ← ишончли" if p < 0.004 else "  ← ишора" if p < 0.05 else ""
        print("%-42s %+8.2f %8.3f   %+8.2f %8.3f%s" % (nm, rho, p, rho2, p2, flag))
    print("\nГуруҳлар бўйича ўртача (OND бўйича: El Niño ≥ +0.5, La Niña ≤ −0.5):")
    for key, g in res["groups"].items():
        print("  %-42s El Niño %s (n=%d) | нейтрал %s (n=%d) | La Niña %s (n=%d)" % (
            NAMES[key], g["elnino"]["mean"], g["elnino"]["n"], g["neutral"]["mean"], g["neutral"]["n"], g["lanina"]["mean"], g["lanina"]["n"]))
    S = [r for r in rows if r["strong"]]
    O = [r for r in rows if not r["strong"]]
    a = auc([r["ond"] for r in S], [r["ond"] for r in O])
    # AUC учун аралаштириш тести
    xs = [r["ond"] for r in rows]
    lab = [r["strong"] for r in rows]
    c = 0
    for _ in range(NPERM):
        rng.shuffle(lab)
        a2 = auc([x for x, l in zip(xs, lab) if l], [x for x, l in zip(xs, lab) if not l])
        if abs(a2 - 0.5) >= abs(a - 0.5) - 1e-12:
            c += 1
    pa = (c + 1) / (NPERM + 1)
    res["strong"] = {"years": [{"year": r["year"], "ond": r["ond"], "phase": "elnino" if r["ond"] >= 0.5 else "lanina" if r["ond"] <= -0.5 else "neutral"} for r in S],
                     "auc_ond": round(a, 3), "p": round(pa, 4)}
    print("\nКучли сариқ занг йиллари ва куз (OND) ENSO ҳолати:")
    for s in res["strong"]["years"]:
        print("  %d: OND %+.1f (%s)" % (s["year"], s["ond"], s["phase"]))
    print("ONI бўйича кучли йилларни ажратиш: AUC %.2f (p = %.3f; 0.5 — тасодифий)" % (a, pa))
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(res, fh, ensure_ascii=False, indent=1)
    print("\n→", os.path.relpath(OUT, ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
