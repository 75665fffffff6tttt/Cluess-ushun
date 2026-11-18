#!/usr/bin/env python3
"""Буғдой сариқ занги — SEIR эпидемиологик модели (туманлар бўйича, кунлик қадам) → plant-protection/data/seir.json

Асос: фойдаланувчи ҳужжати «Сариқ занг учун SEIR моделига ҳарорат, намлик ва шамол траекторияси параметрларини
киритиш». Ҳужжатдаги камчиликлар тузатилган (2026-11-15 таҳлили):
  А-1 туманлараро тарқалиш манба майдонига мутаносиб: M_ji · I_j · A_j / A_i (A — буғдой майдони, га);
  А-2 шамол: Open-Meteo «dominant direction» — шамол ҚАЕРДАН эсади; споралар учун +180° (ҚАЁҚҚА);
  А-3 зарур ҳўллик ҳароратга боғлиқ: W50(T) = 4 + 12·(1 − f_T(T)) соат (оптимумда 4, четларда 16 гача);
  А-5 барг майдони ўсади: N(t) = 0.15 (куз–қиш) → 1.0 (1-феврадан 0 °C йиғинди 300 → 1000), янги барг — соғлом (S);
  А-8 σ 20 °C дан юқорида камаяди;
  Б-2 мавсум 1-октябрдан; Б-3/Б-4 ҳўллик «тун» ойнасида (d−1 12:00 – d 12:00) энг узун узлуксиз ҳўл давр ва
      шу даврдаги ҳарорат (scripts/wetnight.py; маълумот: rust*.json v5 «wl, tw», rust-history v3).
Тенгламалар (улуш — тумандаги энг катта барг майдонига нисбатан):
  β = β_max · f_T(tw) · f_W(wl; W50(tw)),  f_T — Бета (0 / 12 / 25 °C),  f_W — логистик (k = 1.2)
  σ = r(T)/150 °C·кун,  γ = 1/20 + 0.15·(Tmax − 28) (≥ 28 °C)
  dS = dN − β S (I + imp),  dE = β S (I + imp) − σE,  dI = σE − γI,  dR = γI
  imp_i = Σ_j c0 · e^(−d/λ) · cos^p(θ_ji − φ_j) · S_UV · I_j · A_j / A_i,  λ = 25 км × шамол (м/с)
Бошланғич манба (1-октябр): ишончли қишлов ёки ёзда сақланиш зонаси 1e-5, қишлов мумкин 1e-6, қолган 1e-7.
Натижа: кўринадиган касаллик (I + R) / N, %. Параметрлар (β_max) — 1995–2026 эпидемия йиллари бўйича калибрланади
(`python seir.py calibrate`), бошқалари ҳужжат ва адабиётдан; барчаси тахминий.
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
HIST = os.path.join(ROOT, "data-hist", "rust-history.json")
LAB = os.path.join(ROOT, "data-hist", "rust-epidemics.json")

PAR = {"bmax": 2.0, "Tmin": 0.0, "Topt": 12.0, "Tmax": 25.0, "alpha": 1.0, "k": 1.2, "W50o": 4.0, "W50d": 12.0,
       "Tup": 20.0, "Klat": 150.0, "g0": 0.05, "Thot": 28.0, "c0": 0.02, "lam": 25.0, "p": 2.0,
       "N0": 0.15, "g1": 300.0, "g2": 1000.0, "rip": 1950.0}
PFILE = os.path.join(P, "data", "seir-par.json")  # калибрланган параметрлар (бор бўлса)


def load_par():
    if os.path.exists(PFILE):
        with open(PFILE, encoding="utf-8") as fh:
            PAR.update(json.load(fh).get("par", {}))


def fT(T, p=PAR):
    if T is None or T <= p["Tmin"] or T >= p["Tmax"]:
        return 0.0
    a = p["alpha"]
    e2 = a * (p["Tmax"] - p["Topt"]) / (p["Topt"] - p["Tmin"])
    return ((T - p["Tmin"]) / (p["Topt"] - p["Tmin"])) ** a * ((p["Tmax"] - T) / (p["Tmax"] - p["Topt"])) ** e2


def fW(W, T, p=PAR):
    if not W:
        return 0.0
    w50 = p["W50o"] + p["W50d"] * (1.0 - fT(T))
    return 1.0 / (1.0 + math.exp(-p["k"] * (W - w50)))


def rdev(T, p=PAR):
    """Яширин давр ривожланиш тезлиги (°C·кун/кун): 0…20 °C чизиқли, 20 °C дан юқорида камаяди (40 °C да 0)."""
    if T <= 0:
        return 0.0
    if T <= p["Tup"]:
        return T
    return max(0.0, p["Tup"] - (T - p["Tup"]))


def seed(z):
    if z and (z.get("ow") == 2 or z.get("os", 0) >= 1):
        return 1e-5
    if z and z.get("ow") == 1:
        return 1e-6
    return 1e-7


class District:
    """Бир туман: кунлик об-ҳаво {сана: (tm, tx, wl, tw, r)}"""

    def __init__(self, days, zone=None, area=1.0):
        self.days, self.zone, self.area = days, zone, area
        self.reset()

    def reset(self):
        n0 = PAR["N0"]
        i0 = seed(self.zone) * n0
        self.S, self.E, self.I, self.R, self.N, self.g = n0 - i0, 0.0, i0, 0.0, n0, 0.0
        self.ripe = False

    def step(self, d, imp=0.0, obs=0.0):
        v = self.days.get(d)
        if d.month == 10 and d.day == 1:
            self.reset()
        if self.ripe or (7 <= d.month <= 9):
            self.ripe = True if d.month < 10 else False
            return None
        if v is None:
            return None
        tm, tx, wl, tw, r = v
        if d.month >= 2 and d.month < 10:
            self.g += max(0.0, tm)
        if self.g >= PAR["rip"]:
            self.ripe = True
            return None
        f = min(1.0, max(0.0, (self.g - PAR["g1"]) / (PAR["g2"] - PAR["g1"])))
        N2 = max(self.N, PAR["N0"] + (1 - PAR["N0"]) * f)
        self.S += N2 - self.N
        self.N = N2
        if obs:
            self.I = max(self.I, obs * self.N)
        b = PAR["bmax"] * fT(tw) * fW(wl, tw)
        sig = rdev(tm) / PAR["Klat"]
        gam = min(1.0, PAR["g0"] + (0.15 * (tx - PAR["Thot"]) if tx >= PAR["Thot"] else 0.0))
        inf = min(self.S, b * self.S * (self.I / self.N + imp))
        eo, io = min(self.E, sig * self.E), min(self.I, gam * self.I)
        self.S -= inf
        self.E += inf - eo
        self.I += eo - io
        self.R += io
        return 100.0 * (self.I + self.R) / self.N


def run(D, start, end, PT=None, W=None, OBS=None):
    """D: калит → District. Натижа: калит → [кўринадиган %, ...] (start..end)."""
    keys = list(D)
    res = {k: [] for k in keys}
    d = start
    while d <= end:
        imp = {k: 0.0 for k in keys}
        if W is not None and PT:
            for j in keys:
                dj = D[j]
                if dj.ripe or dj.I <= 1e-12:
                    continue
                w = W(PT[j], d)
                if not w:
                    continue
                v, phi_to, wet = w
                lam = PAR["lam"] * max(0.5, v)
                suv = 1.0 if wet else 0.3
                for i in keys:
                    if i == j:
                        continue
                    dy = (PT[i][0] - PT[j][0]) * 111.0
                    dx = (PT[i][1] - PT[j][1]) * 111.0 * math.cos(math.radians(PT[j][0]))
                    dist = math.hypot(dx, dy)
                    if dist > 6 * lam:
                        continue
                    c = math.cos(math.radians(math.degrees(math.atan2(dx, dy)) % 360 - phi_to))
                    if c > 0:
                        imp[i] += PAR["c0"] * math.exp(-dist / lam) * c ** PAR["p"] * suv * (dj.I / dj.N) * dj.area / max(1.0, D[i].area)
        for k in keys:
            o = (OBS or {}).get((k, d), 0.0)
            v = D[k].step(d, imp[k], o)
            res[k].append(None if v is None else round(v, 2))
        d += dt.timedelta(days=1)
    return res


# ---------- калибрлаш (1995–2026, 26 нуқта, эпидемия йиллари) ----------
def hist_districts(H, y):
    out = {}
    for k, v in H["y"][str(y)].items():
        s = v["ser"]
        d0 = dt.date(y - 1, 10, 1)
        days = {}
        for j in range(len(s["tm"])):
            if s["tm"][j] is None or s["wl"][j] is None:
                continue
            days[d0 + dt.timedelta(days=j)] = (s["tm"][j] / 10, s["tx"][j] / 10, s["wl"][j],
                                              None if s["tw"][j] is None else s["tw"][j] / 10, s["r"][j])
        out[k] = (days, H["pts"][k]["ha"])
    return out


def season_index(H, Z, y, until=(5, 20)):
    """Ўртача кўринадиган касаллик (буғдой майдони бўйича) ой/кун «until» ҳолатида."""
    DD = hist_districts(H, y)
    D = {k: District(days, Z.get(k), ha) for k, (days, ha) in DD.items()}
    end = dt.date(y, *until)
    res = run(D, dt.date(y - 1, 10, 1), end)
    num = den = 0.0
    for k, L in res.items():
        vals = [x for x in L if x is not None]
        if vals:
            num += D[k].area * max(vals)
            den += D[k].area
    return num / den if den else None


def auc(pos, neg):
    if not pos or not neg:
        return None
    s = 0.0
    for a in pos:
        for b in neg:
            s += 1.0 if a > b else 0.5 if a == b else 0.0
    return s / (len(pos) * len(neg))


def calibrate():
    with open(HIST, encoding="utf-8") as fh:
        H = json.load(fh)
    with open(LAB, encoding="utf-8") as fh:
        L = json.load(fh)
    with open(os.path.join(P, "data", "rust-zones.json"), encoding="utf-8") as fh:
        Z = json.load(fh)["d"]
    years = sorted(int(y) for y, v in H["y"].items() if v and all("wl" in x.get("ser", {}) for x in v.values()))
    strong, moder, weak = set(L["strong"]), set(L["moderate"]), set(L.get("not_strong", []))
    best = None
    rows = []
    for b in (0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0):
        PAR["bmax"] = b
        idx = {y: season_index(H, Z, y) for y in years}
        S_ = [idx[y] for y in years if y in strong]
        O_ = [idx[y] for y in years if y not in strong]
        a = auc(S_, O_)
        rows.append((b, a, idx))
        med_s = sorted(S_)[len(S_) // 2] if S_ else 0
        if a is not None and (best is None or (a, -abs(med_s - 30)) > (best[1], -abs(best[3] - 30))):
            best = (b, a, idx, med_s)
    print("йиллар:", years)
    print("кучли:", sorted(strong & set(years)), "ўртача:", sorted(moder & set(years)), "кучли эмас:", sorted(weak & set(years)))
    for b, a, idx in rows:
        print("bmax %.2f  AUC(кучли/қолган) %s" % (b, "—" if a is None else "%.2f" % a))
    if best:
        b, a, idx, _ = best
        PAR["bmax"] = b
        print("\nтанланди bmax = %.2f (AUC %.2f)" % (b, a))
        for y in years:
            tag = "КУЧЛИ" if y in strong else "ўртача" if y in moder else "кучли эмас" if y in weak else ""
            print("  %d  %6.1f %%  %s" % (y, idx[y], tag))
        with open(PFILE, "w", encoding="utf-8") as fh:
            json.dump({"par": {"bmax": b}, "auc": round(a, 3), "years": len(years),
                       "index": {str(y): round(idx[y], 2) for y in years}}, fh, ensure_ascii=False)


# ---------- шамол (2° тўр, кунлик, Open-Meteo) ----------
def wind_update(start, end):
    """data-hist/wind-2deg.json: катак → {сана: [тезлик м/с, ҚАЁҚҚА азимут, ёмғирли]}; етишмаган кунлар олинади."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("uw", os.path.join(ROOT, "scripts", "update-weather.py"))
    uw = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(uw)
    W = {"d": {}}
    if os.path.exists(WIND):
        with open(WIND, encoding="utf-8") as fh:
            W = json.load(fh)
    cells = [(la, lo) for la in range(34, 48, 2) for lo in range(54, 78, 2)]
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    for url, a, b in ((uw.ARCHIVE, start, min(end, today - dt.timedelta(days=6))),
                      (uw.FORECAST, max(start, today - dt.timedelta(days=5)), end)):
        if a > b:
            continue
        need = [c for c in cells if any((a + dt.timedelta(days=i)).isoformat() not in W["d"].get("%d,%d" % c, {})
                                        for i in range((b - a).days + 1))] if url == uw.ARCHIVE else cells
        for i in range(0, len(need), 20):
            ch = need[i:i + 20]
            resp = uw.call(url, {"latitude": ",".join(str(c[0]) for c in ch), "longitude": ",".join(str(c[1]) for c in ch),
                                 "daily": "wind_speed_10m_max,wind_direction_10m_dominant,precipitation_hours",
                                 "wind_speed_unit": "ms", "timezone": uw.TZ,
                                 "start_date": a.isoformat(), "end_date": b.isoformat()}, len(ch), (b - a).days + 1)
            for c, obj in zip(ch, resp or []):
                dd = (obj or {}).get("daily") or {}
                cc = W["d"].setdefault("%d,%d" % c, {})
                for t, v, ph, pr in zip(dd.get("time", []), dd.get("wind_speed_10m_max", []),
                                        dd.get("wind_direction_10m_dominant", []), dd.get("precipitation_hours", [])):
                    if v is not None and ph is not None:
                        cc[t] = [round(v * 0.6, 1), (ph + 180) % 360, 1 if (pr or 0) >= 2 else 0]  # ўртача ≈ 0.6 × max
    os.makedirs(os.path.dirname(WIND), exist_ok=True)
    with open(WIND, "w", encoding="utf-8") as fh:
        json.dump(W, fh, separators=(",", ":"))
    return W


def load_rust():
    out = {}
    for f in sorted(os.listdir(os.path.join(P, "data"))):
        if not (f.startswith("rust") and f.endswith(".json")) or f in ("rust-zones.json",):
            continue
        with open(os.path.join(P, "data", f), encoding="utf-8") as fh:
            d = json.load(fh)
        n, s0 = d.get("n", 3), dt.date.fromisoformat(d["start"])
        if n < 12:
            continue
        for k, a in d["d"].items():
            L = out.setdefault(k, {})
            for j in range(d["days"]):
                x = a[n * j:n * j + n]
                if x and x[0] is not None and x[10] is not None:
                    L[s0 + dt.timedelta(days=j)] = (x[1] / 10, x[2] / 10, x[10], None if x[11] is None else x[11] / 10, x[3])
    return out


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "calibrate":
        return calibrate()
    load_par()
    R = load_rust()
    with open(os.path.join(P, "data", "rust-zones.json"), encoding="utf-8") as fh:
        Z = json.load(fh)["d"]
    with open(os.path.join(P, "data", "wx-points.json"), encoding="utf-8") as fh:
        wp = json.load(fh)["d"]
    WA = {}
    try:
        with open(os.path.join(P, "data", "wheat-area.json"), encoding="utf-8") as fh:
            WA = {k: v["ha"] for k, v in json.load(fh)["d"].items()}
    except Exception:
        pass
    PT = {k: tuple(float(v) for v in max(e["c"], key=lambda kw: kw[1])[0].split(","))
          for k, e in wp.items() if isinstance(e, dict) and e.get("c")}
    keys = [k for k in R if k in PT]
    if not keys:
        print("seir: v5 маълумот (wl, tw) ҳали йўқ — ўтказиб юборилди", file=sys.stderr)
        return 0
    OBS = {}
    try:
        with open(os.path.join(P, "data", "obs.json"), encoding="utf-8") as fh:
            for o in json.load(fh).get("o", []):
                if o.get("dis") == "sariq" and (o.get("sev") or 0) >= 1:
                    OBS[(str(o["i"]), dt.date.fromisoformat(o["d"]))] = 0.001 * o["sev"]
    except Exception:
        pass
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    start = dt.date(today.year - 1 if today.month >= 10 else today.year - 2, 10, 1)  # ўтган ва жорий мавсум
    end = max(d for L in R.values() for d in L)
    Wf = None  # шамол билан туманлараро тарқалиш ўчиқ (фойдаланувчи қарори, 2026-11-18): Open-Meteo лимити сарфланмайди
    if os.environ.get("SEIR_WIND") == "1":  # қайта ёқиш учун (калибрланмаган)
        try:
            WD = wind_update(start, end)

            def Wf(pt, d):
                return WD["d"].get("%d,%d" % (2 * round(pt[0] / 2), 2 * round(pt[1] / 2)), {}).get(d.isoformat())
        except Exception as e:
            print("seir: шамол олинмади —", e, file=sys.stderr)
    med = sorted(WA.values())[len(WA) // 2] if WA else 1.0
    D = {k: District(R[k], Z.get(k), WA.get(k, med)) for k in keys}
    res = run(D, start, end, PT, Wf, OBS)
    out = {"start": start.isoformat(), "days": (end - start).days + 1, "par": PAR, "wind": Wf is not None,
           "updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "d": res}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print("seir: %d туман, %s → %s, шамол %s" % (len(keys), start, end, Wf is not None), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
