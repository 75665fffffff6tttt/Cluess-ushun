#!/usr/bin/env python3
"""Буғдой сариқ занги — SEIR эпидемиологик модели (туманлар бўйича, кунлик қадам) → plant-protection/data/seir.json

Методология: «Сариқ занг учун SEIR моделига ҳарорат, намлик ва шамол траекторияси параметрларини киритиш»
(фойдаланувчи ҳужжати). Ҳолатлар (буғдой барг майдони улуши, N = 1): S → E → I → R.
  β(t) = β_max · f_T(T) · f_W(W)
     f_T — кардинал ҳароратлар Бета-функцияси: T_min 0, T_opt 12, T_max 25 °C (α = 1); T — тунги ўртача (барг ҳўл пайт)
     f_W — логистик: W — намлик ≥ 90 % соатлари, W_50 = 5 соат, k = 1.2
  σ(t) = max(0, min(T, 20) − 0) / 150 °C·кун (яширин давр)
  γ(t) = 1/20 (доғнинг спора чиқариш даври) + юқори ҳарорат: max ҳарорат ≥ 28 °C да тез ўлим
  Тарқалиш: dE_i = β_i S_i (I_i + Σ_j M_ji I_j) − σ_i E_i, M_ji = c0 · e^(−d/λ) · max(0, cos(θ_ji − φ_j))^p · S_UV
     (шамол — кунлик устун йўналиш ва тезлик, 2° тўр; S_UV: ёмғирли/булутли кун 1, очиқ кун 0.3)
  Бошланғич манба (1-октябр ёки 1-январ): ишончли қишлов / ёзда сақланиш зонаси 1e-5, қишлов мумкин 1e-6, қолган 1e-7.
  Буғдой йўқ давр (пишгандан 1-октябргача) — ҳолат нолланади.
Натижа: ҳар туман учун кўринадиган касаллик (I + R, %) ва юққан (E + I + R, %) кунлар бўйича.
Параметрлар (β_max, c0) — 2023, 2024 (эпидемия) ва 2025, 2026 (оддий) йиллар баҳори бўйича тахминий калибрланган.
Режимлар: python seir.py            — жорий мавсум (1-октябрдан бугун + прогноз) → data/seir.json
          python seir.py calibrate  — калибрлаш (шамолсиз), натижа экранга
"""
import datetime as dt
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "plant-protection")
OUT = os.path.join(P, "data", "seir.json")
WIND = os.path.join(ROOT, "data-hist", "wind-2deg.json")

PAR = {"bmax": 3.0, "Tmin": 0.0, "Topt": 12.0, "Tmax": 25.0, "alpha": 1.0, "W50": 5.0, "k": 1.2,
       "Tup": 20.0, "Klat": 150.0, "g0": 0.05, "Thot": 28.0, "c0": 0.02, "lam": 25.0, "p": 2.0}


def fT(T, p=PAR):
    if T <= p["Tmin"] or T >= p["Tmax"]:
        return 0.0
    a = p["alpha"]
    e2 = a * (p["Tmax"] - p["Topt"]) / (p["Topt"] - p["Tmin"])
    return ((T - p["Tmin"]) / (p["Topt"] - p["Tmin"])) ** a * ((p["Tmax"] - T) / (p["Tmax"] - p["Topt"])) ** e2


def fW(W, p=PAR):
    return 1.0 / (1.0 + math.exp(-p["k"] * (W - p["W50"])))


def load_series():
    """туман → {сана: (tm, tx, h, tn, r)} барча rust*.json файллардан."""
    out = {}
    for f in sorted(os.listdir(os.path.join(P, "data"))):
        if not (f.startswith("rust") and f.endswith(".json")) or f == "rust-zones.json":
            continue
        with open(os.path.join(P, "data", f), encoding="utf-8") as fh:
            d = json.load(fh)
        n, s0 = d.get("n", 3), dt.date.fromisoformat(d["start"])
        if n < 9:
            continue
        for k, a in d["d"].items():
            L = out.setdefault(k, {})
            for j in range(d["days"]):
                if a[n * j] is not None:
                    x = a[n * j:n * j + n]
                    L[s0 + dt.timedelta(days=j)] = (x[1] / 10, x[2] / 10, x[4], x[8] / 10, x[3])
    return out


def ripe_date(L, y):
    g, d = 0.0, dt.date(y, 2, 1)
    while d <= dt.date(y, 7, 31):
        v = L.get(d)
        if v:
            g += max(0.0, v[0])
            if g >= 1950:
                return d
        d += dt.timedelta(days=1)
    return dt.date(y, 6, 30)


def seed(z):
    if z and (z.get("ow") == 2 or z.get("os", 0) >= 1):
        return 1e-5
    if z and z.get("ow") == 1:
        return 1e-6
    return 1e-7


def run(S_, keys, start, end, Z, PT=None, W=None, OBS=(), p=PAR):
    """SEIR [start, end]; натижа: туман → [(сана, кўринадиган %, юққан %)]"""
    st = {k: [1.0, 0.0, seed(Z.get(k)), 0.0] for k in keys}  # S, E, I, R
    rip = {}
    res = {k: [] for k in keys}
    d = start
    while d <= end:
        # шамол орқали келган споралар
        imp = {k: 0.0 for k in keys}
        if W is not None and PT:
            for j in keys:
                Ij = st[j][2]
                if Ij < 1e-9:
                    continue
                w = W(PT[j], d)
                if not w:
                    continue
                v, phi, wet = w
                lam = p["lam"] * max(0.5, v)
                suv = 1.0 if wet else 0.3
                for i in keys:
                    if i == j:
                        continue
                    dy = (PT[i][0] - PT[j][0]) * 111.0
                    dx = (PT[i][1] - PT[j][1]) * 111.0 * math.cos(math.radians(PT[j][0]))
                    dist = math.hypot(dx, dy)
                    if dist > 6 * lam:
                        continue
                    th = math.degrees(math.atan2(dx, dy)) % 360  # j → i азимути
                    c = math.cos(math.radians(th - phi))
                    if c <= 0:
                        continue
                    imp[i] += p["c0"] * math.exp(-dist / lam) * c ** p["p"] * suv * Ij
        for k in keys:
            L = S_[k]
            v = L.get(d)
            y = d.year if d.month < 10 else d.year + 1
            if y not in rip.setdefault(k, {}):
                rip[k][y] = ripe_date(L, y)
            host = not (rip[k][y] <= d < dt.date(d.year, 10, 1))
            s = st[k]
            if not host:
                st[k] = [1.0, 0.0, seed(Z.get(k)), 0.0]
                res[k].append((d, None, None))
                d_ok = False
            elif v is None:
                res[k].append((d, None, None))
                continue
            else:
                tm, tx, h, tn, r = v
                for o in OBS:
                    if o["k"] == k and o["d"] == d:
                        s[2] = max(s[2], 0.001 * max(1, o["sev"]))
                b = p["bmax"] * fT(tn) * fW(h)
                sig = max(0.0, min(tm, p["Tup"])) / p["Klat"]
                gam = min(1.0, p["g0"] + (0.15 * (tx - p["Thot"]) if tx >= p["Thot"] else 0.0))
                inf = min(s[0], b * s[0] * (s[2] + imp[k]))
                eo = min(s[1], sig * s[1])
                io = min(s[2], gam * s[2])
                s[0] -= inf
                s[1] += inf - eo
                s[2] += eo - io
                s[3] += io
                res[k].append((d, 100 * (s[2] + s[3]), 100 * (s[1] + s[2] + s[3])))
        d += dt.timedelta(days=1)
    return res


def calibrate():
    S_ = load_series()
    with open(os.path.join(P, "data", "rust-zones.json"), encoding="utf-8") as fh:
        Z = json.load(fh)["d"]
    with open(os.path.join(P, "data", "wheat-area.json"), encoding="utf-8") as fh:
        WA = {k: v["ha"] for k, v in json.load(fh)["d"].items()}
    keys = [k for k in S_ if not k.startswith("n") and WA.get(k, 0) > 0]
    epi = {2023: 1, 2024: 1, 2025: 0, 2026: 0}
    print("bmax | " + " | ".join("%d%s" % (y, "*" if e else "") for y, e in epi.items()) + "   (буғдой майдони бўйича ўртача кўринадиган касаллик, 31-май, %)")
    for b in (0.5, 1, 1.5, 2, 3, 4, 6, 8):
        PAR["bmax"] = b
        row = []
        for y in epi:
            r = run(S_, keys, dt.date(y, 1, 1), dt.date(y, 5, 31), Z)
            num = den = 0.0
            for k in keys:
                last = [x for x in r[k] if x[1] is not None]
                if last:
                    num += WA[k] * last[-1][1]
                    den += WA[k]
            row.append(num / den if den else float("nan"))
        print("%4.1f | " % b + " | ".join("%6.2f" % v for v in row))


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "calibrate":
        return calibrate()
    S_ = load_series()
    with open(os.path.join(P, "data", "rust-zones.json"), encoding="utf-8") as fh:
        Z = json.load(fh)["d"]
    with open(os.path.join(P, "data", "wx-points.json"), encoding="utf-8") as fh:
        wp = json.load(fh)["d"]
    PT = {}
    for k, e in wp.items():
        if isinstance(e, dict) and e.get("c"):
            PT[k] = tuple(float(v) for v in max(e["c"], key=lambda kw: kw[1])[0].split(","))
    keys = [k for k in S_ if k in PT]
    OBS = []
    try:
        with open(os.path.join(P, "data", "obs.json"), encoding="utf-8") as fh:
            for o in json.load(fh).get("o", []):
                if o.get("dis") == "sariq" and (o.get("sev") or 0) >= 1:
                    OBS.append({"k": str(o["i"]), "d": dt.date.fromisoformat(o["d"]), "sev": o["sev"]})
    except Exception:
        pass
    Wf = None
    if os.path.exists(WIND):
        with open(WIND, encoding="utf-8") as fh:
            WD = json.load(fh)

        def Wf(pt, d):
            c = "%d,%d" % (2 * round(pt[0] / 2), 2 * round(pt[1] / 2))
            v = WD.get("d", {}).get(c, {}).get(d.isoformat())
            return v  # [тезлик м/с, қаёққа эсади (азимут), ёмғирли?]
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    y0 = today.year if today.month >= 10 else today.year - 1
    start = dt.date(y0, 10, 1)
    end = max(d for L in S_.values() for d in L)
    res = run(S_, keys, start, end, Z, PT, Wf, OBS)
    out = {"start": start.isoformat(), "days": (end - start).days + 1, "par": PAR, "wind": Wf is not None,
           "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "d": {}}
    for k, L in res.items():
        out["d"][k] = [None if v is None else round(v, 2) for _, v, _ in L]
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print("seir: %d districts, %s → %s, wind %s" % (len(keys), start, end, Wf is not None), file=sys.stderr)


if __name__ == "__main__":
    main()
