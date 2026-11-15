#!/usr/bin/env python3
"""Сариқ занг: спораларнинг шамол билан тарқалиши (Эфиопия огоҳлантириш тизими услубида, соддалаштирилган)
→ plant-protection/data/spores.json

1) Манба (ҳар туман, ҳар кун): S = 10–24 кун олдинги «юқиш кунлари» сони (кунда > 8 соат намлик ≥ 87 %,
   5–25 °C; data/rust*.json) — шу доғлар ҳозир споралар чиқаради; буғдой бор даврда (1-октябрдан пишгунча).
   + тоғ олди ёзлов зоналари (data/rust-zones.json, os ≥ 1 %) июл–сентябрда кучсиз доимий манба (S = 1);
   + дала кузатуви (data/obs.json): охирги 20 кунда сариқ занг топилган туман — S += 5 × даража.
2) Тарқалиш: ҳар куни 10:00 да ҳар манбанинг экин нуқтасидан 24 соат олдинга траектория
   (ERA5 / прогноз, 100 м шамол, 1° тўр, Open-Meteo). Ҳар соатдаги нуқта атрофига споралар тушади:
   оғирлик exp(−соат/12) × (25/σ)² × exp(−масофа² / 2σ²), σ = 25 + 3 × соат (км).
3) Ҳар Ўзбекистон тумани учун: бошқа туманлардан келган споралар индекси (ўзиники ҳисобланмайди)
   ва энг катта ҳисса қўшган манба.
Чиқиш: {"start", "days", "q": [паст, ўртача, юқори чегаралар], "d": {туман: [индекс×10 ёки null]},
        "s": {туман: [манба калити ёки ""]}, "fin": архив тугаган кун рақами}
Барча параметрлар — тахминий, моделни соддалаштириш учун танланган; дала кузатуви билан текширилмаган.
Муҳим: бу касаллик эмас, «споралар келиши мумкинлиги» индекси.
"""
import datetime as dt
import importlib.util
import json
import math
import os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("uw", os.path.join(ROOT, "scripts", "update-weather.py"))
uw = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uw)
log, call, Stop, weight = uw.log, uw.call, uw.Stop, uw.weight

P = uw.P
OUT = os.path.join(P, "data", "spores.json")
LA0, LA1, LO0, LO1 = 33, 46, 50, 76
BUDGET = float(os.environ.get("SPORE_BUDGET", "4500"))
CHUNK = 14
REL_H = 10           # споралар чиқадиган соат (маҳаллий)
HOURS = 24
TAU = 12.0           # соат
SIG0, SIG1 = 25.0, 3.0  # км
INF_H = 8
LAT0, LAT1 = 10, 24  # манба: 10–24 кун олдинги юқишлар


def season_start(today):
    y = today.year if today.month >= 8 else today.year - 1
    return dt.date(y - 1, 8, 1)  # ўтган мавсум ҳам (август–август GIF учун)


def load_rust():
    """Туман → {сана: (ўртача ҳарорат, юқиш соатлари)}; калитлар: '0'..'198', 'n…'."""
    out = {}
    for f in sorted(os.listdir(os.path.join(P, "data"))):
        if not (f.startswith("rust") and f.endswith(".json")) or f == "rust-zones.json":
            continue
        with open(os.path.join(P, "data", f), encoding="utf-8") as fh:
            d = json.load(fh)
        n, s0 = d.get("n", 3), dt.date.fromisoformat(d["start"])
        if n < 10:
            continue
        for k, a in d["d"].items():
            L = out.setdefault(k, {})
            for j in range(d["days"]):
                if a[n * j] is not None:
                    L[s0 + dt.timedelta(days=j)] = (a[n * j + 1] / 10, a[n * j + 9])
    return out


def host_days(L):
    """Буғдой бор кунлар: 1-октябрдан кейинги йилда 1-феврадан 0 °C йиғинди ≥ 1950 гача."""
    host = set()
    if not L:
        return host
    years = sorted({d.year for d in L})
    for y in years:
        g, rip = 0.0, None
        d = dt.date(y, 2, 1)
        while d <= dt.date(y, 7, 31):
            if d in L:
                g += max(0.0, L[d][0])
                if g >= 1950:
                    rip = d
                    break
            d += dt.timedelta(days=1)
        rip = rip or dt.date(y, 6, 30)
        d = dt.date(y - 1, 10, 1)
        while d < rip:
            host.add(d)
            d += dt.timedelta(days=1)
        d = dt.date(y, 10, 1)
        while d <= dt.date(y, 12, 31):
            host.add(d)
            d += dt.timedelta(days=1)
    return host


def sources(day, R, H, Z, OBS):
    S = {}
    for k, L in R.items():
        s = 0.0
        if day in H[k]:
            for j in range(LAT0, LAT1 + 1):
                v = L.get(day - dt.timedelta(days=j))
                if v and v[1] is not None and v[1] > INF_H:
                    s += 1
        z = Z.get(k)
        if z and z.get("os", 0) >= 1 and day.month in (7, 8, 9):
            s += 1
        for o in OBS:
            if o["k"] == k and 0 <= (day - o["d"]).days <= 20:
                s += 5 * max(1, o["sev"])
        if s > 0:
            S[k] = s
    return S


def fetch_wind(d0, d1, archive):
    """[d0, d1] кунлари учун соатлик 100 м шамол (u, v, м/с) 1° тўрда → массив (ny, nx, соат, 2)."""
    pts = [(la, lo) for la in range(LA0, LA1 + 1) for lo in range(LO0, LO1 + 1)]
    n = (d1 - d0).days + 1
    A = np.full((LA1 - LA0 + 1, LO1 - LO0 + 1, n * 24, 2), np.nan, dtype=np.float32)
    spent = 0.0
    for i in range(0, len(pts), 10):
        ch = pts[i:i + 10]
        prm = {"latitude": ",".join(str(p[0]) for p in ch), "longitude": ",".join(str(p[1]) for p in ch),
               "hourly": "wind_speed_100m,wind_direction_100m", "wind_speed_unit": "ms", "timezone": uw.TZ}
        if archive:
            prm.update(start_date=d0.isoformat(), end_date=d1.isoformat())
            url = uw.ARCHIVE
        else:
            prm.update(start_date=d0.isoformat(), end_date=d1.isoformat())
            url = uw.FORECAST
        resp = call(url, prm, len(ch), n)
        spent += weight(len(ch), n)
        if not resp:
            raise Stop("wind request failed")
        for (la, lo), obj in zip(ch, resp):
            h = obj.get("hourly") or {}
            ws, wd = h.get("wind_speed_100m") or [], h.get("wind_direction_100m") or []
            for t, (s, w) in enumerate(zip(ws, wd)):
                if t >= n * 24 or s is None or w is None:
                    continue
                r = math.radians(w)
                A[la - LA0, lo - LO0, t] = (-s * math.sin(r), -s * math.cos(r))
    return A, spent


def interp(A, la, lo, t):
    y, x = la - LA0, lo - LO0
    y0, x0 = int(math.floor(y)), int(math.floor(x))
    if y0 < 0 or x0 < 0 or y0 + 1 >= A.shape[0] or x0 + 1 >= A.shape[1] or t >= A.shape[2]:
        return None
    fy, fx = y - y0, x - x0
    v = (A[y0, x0, t] * (1 - fy) * (1 - fx) + A[y0 + 1, x0, t] * fy * (1 - fx) +
         A[y0, x0 + 1, t] * (1 - fy) * fx + A[y0 + 1, x0 + 1, t] * fy * fx)
    return None if np.isnan(v).any() else v


def dose_day(A, t0, S, PT, recv, rxy):
    """Бир кун: ҳар қабул қилувчига келган споралар ва энг катта манба."""
    dose = np.zeros(len(recv))
    best = np.zeros(len(recv))
    bsrc = [""] * len(recv)
    for k, s in S.items():
        la, lo = PT[k]
        pos = []
        for h in range(HOURS):
            uv = interp(A, la, lo, t0 + h)
            if uv is None:
                break
            la += uv[1] * 3600 / 111000.0
            lo += uv[0] * 3600 / (111000.0 * math.cos(math.radians(la)))
            pos.append((la, lo, h + 1))
        if not pos:
            continue
        P_ = np.array(pos)
        dy = (rxy[:, None, 0] - P_[None, :, 0]) * 111.0
        dx = (rxy[:, None, 1] - P_[None, :, 1]) * 111.0 * np.cos(np.radians(rxy[:, None, 0]))
        sig = SIG0 + SIG1 * P_[None, :, 2]
        w = np.exp(-P_[None, :, 2] / TAU) * (SIG0 / sig) ** 2 * np.exp(-(dx * dx + dy * dy) / (2 * sig * sig))
        c = s * w.sum(axis=1)
        for i, r in enumerate(recv):
            if r == k:
                c[i] = 0.0  # ўзиники — «келган» эмас
        dose += c
        m = c > best
        best[m] = c[m]
        for i in np.nonzero(m)[0]:
            bsrc[i] = k
    return dose, bsrc


def main():
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5))).date()
    start = season_start(today)
    days = (today - start).days + 1 + uw.FC_FUTURE
    with open(os.path.join(P, "data", "wx-points.json"), encoding="utf-8") as fh:
        wp = json.load(fh)["d"]
    R = load_rust()
    PT = {}
    for k in R:
        e = wp.get(k)
        if isinstance(e, dict) and e.get("c"):
            PT[k] = tuple(float(v) for v in max(e["c"], key=lambda kw: kw[1])[0].split(","))
    R = {k: v for k, v in R.items() if k in PT}
    H = {k: host_days(L) for k, L in R.items()}
    Z = {}
    try:
        with open(os.path.join(P, "data", "rust-zones.json"), encoding="utf-8") as fh:
            Z = json.load(fh)["d"]
    except Exception:
        pass
    OBS = []
    try:
        with open(os.path.join(P, "data", "obs.json"), encoding="utf-8") as fh:
            for o in json.load(fh).get("o", []):
                if o.get("dis") == "sariq" and (o.get("sev") or 0) >= 1:
                    OBS.append({"k": str(o["i"]), "d": dt.date.fromisoformat(o["d"]), "sev": o["sev"]})
    except Exception:
        pass
    recv = sorted([k for k in PT if not k.startswith("n")], key=int)
    rxy = np.array([PT[k] for k in recv])

    st = None
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            st = json.load(fh)
        if st.get("start") != start.isoformat():
            st = None
    if not st:
        st = {"v": 1, "start": start.isoformat(), "days": days, "fin": -1, "d": {}, "s": {}}
    for k in recv:
        st["d"].setdefault(k, [])
        st["s"].setdefault(k, [])
        st["d"][k] += [None] * (days - len(st["d"][k]))
        st["s"][k] += [""] * (days - len(st["s"][k]))
    st["days"] = days

    def save():
        vals = sorted(v for k in recv for v in st["d"][k] if v)
        if vals:
            st["q"] = [vals[int(len(vals) * q)] for q in (0.5, 0.8, 0.95)]
        st["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
        tmp = OUT + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(st, fh, separators=(",", ":"))
        os.replace(tmp, OUT)

    def run(d0, d1, archive, extend):
        # extend: эртасини ҳам оламиз — кечки споралар ярим тундан кейин ҳам учади
        A, w = fetch_wind(d0, d1 + dt.timedelta(days=1) if extend else d1, archive)
        for j in range((d1 - d0).days + 1):
            day = d0 + dt.timedelta(days=j)
            S = sources(day, R, H, Z, OBS)
            idx = (day - start).days
            if not S:
                for k in recv:
                    st["d"][k][idx] = 0
                    st["s"][k][idx] = ""
                continue
            dose, src = dose_day(A, j * 24 + REL_H, S, PT, recv, rxy)
            for i, k in enumerate(recv):
                st["d"][k][idx] = int(round(dose[i] * 10))
                st["s"][k][idx] = src[i] if dose[i] * 10 >= 1 else ""
        return w

    spent = 0.0
    arch_end = today - dt.timedelta(days=6)
    try:
        # 1) архив: охирги тайёр кундан кейин, 14 кунлик бўлаклар
        d = start + dt.timedelta(days=st["fin"] + 1)
        while d <= arch_end:
            e = min(arch_end, d + dt.timedelta(days=CHUNK - 1))
            need = weight(1, (e - d).days + 2) * ((LA1 - LA0 + 1) * (LO1 - LO0 + 1))
            if spent + need > BUDGET:
                raise Stop("run budget")
            spent += run(d, e, True, e < arch_end)
            st["fin"] = (e - start).days
            save()
            log("archive %s..%s, weight %.0f" % (d, e, spent))
            d = e + dt.timedelta(days=1)
        # 2) яқин кунлар ва прогноз (ҳар сафар қайта)
        f0 = arch_end + dt.timedelta(days=1)
        f1 = today + dt.timedelta(days=uw.FC_FUTURE - 1)
        if spent + weight(1, (f1 - f0).days + 1) * 378 <= BUDGET:
            spent += run(f0, f1, False, False)
            log("forecast %s..%s" % (f0, f1))
    except Stop as e:
        log("stopped:", e)
    save()
    log("done, weight %.0f, fin=%d/%d" % (spent, st["fin"], days))


if __name__ == "__main__":
    main()
