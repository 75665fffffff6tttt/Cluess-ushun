#!/usr/bin/env python3
"""Йил алмашинуви текшируви: маълумот скриптлари (update-weather, update-rust, split-rust, split-wx, seir)
репозиторийнинг алоҳида нусхасида сохта санада ишга туширилади; Open-Meteo жавоблари сунъий (тармоқ керак эмас).

  python3 tests/rollover.py [--keep ПАПКА]

Саналар: 31.12 (жорий йил) → 1.01 (янги йил) → 2.01 → 10.01 → 10.03. Текширилади: ўтган йил архивлари (wx-ЙИЛ.json,
rust-ЙИЛ.json) 31-декабрда тугайди, wx-years.json янги йилни кўрсатади, иккала йил учун сайт қисмлари (data/wx/,
data/rust/) бор, янги йил файллари 1-январдан бошланади, SEIR хатосиз ишлайди, январда ўтган йилнинг 24–31 декабри
ҳақиқий архивдан қайта олинади ("final": true; сунъий архив прогноздан +0.3 °C фарқ қилади — шу билан текширилади).
Сайтни шу нусхада браузерда текшириш: SITE_DIR=<ПАПКА>/plant-protection FAKE_DATE=2027-03-10 node tests/smoke.cjs
"""
import argparse
import datetime
import importlib.util
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


ARCH_OFF = 0.3  # сунъий архив жавоблари прогноздан шунча иссиқроқ — архивдан олинганини ажратиш учун


def clim(d, lat, h=None):
    doy = d.timetuple().tm_yday
    base = 14 - (lat - 40) * 0.8 + 15 * math.sin(2 * math.pi * (doy - 105) / 365)
    return (base + 6, base - 6) if h is None else base + 6 * math.sin(2 * math.pi * (h - 9) / 24)


def run_day(sim, day):
    """Битта сана учун скриптлар (алоҳида жараёнда чақирилади — сана сохталаштирилади)."""
    DAY = datetime.date.fromisoformat(day)
    FIXED = datetime.datetime(DAY.year, DAY.month, DAY.day, 9, 0, tzinfo=datetime.timezone.utc)

    class FD(datetime.datetime):
        @classmethod
        def now(cls, tz=None):
            return FIXED.astimezone(tz) if tz else FIXED.replace(tzinfo=None)
    datetime.datetime = FD

    def fake(base, params, n_loc, n_days):
        off = ARCH_OFF if "archive" in base else 0.0
        lats = [float(x) for x in params["latitude"].split(",")]
        if "start_date" in params:
            d0, d1 = datetime.date.fromisoformat(params["start_date"]), datetime.date.fromisoformat(params["end_date"])
        else:
            d0 = DAY - datetime.timedelta(days=params["past_days"])
            d1 = DAY + datetime.timedelta(days=params["forecast_days"] - 1)
        days = [d0 + datetime.timedelta(days=i) for i in range((d1 - d0).days + 1)]
        out = []
        for la in lats:
            if "daily" in params:
                v = [(a + off, b + off) for a, b in (clim(d, la) for d in days)]
                out.append({"daily": {"time": [d.isoformat() for d in days], "temperature_2m_max": [a for a, b in v],
                                      "temperature_2m_min": [b for a, b in v]}})
            else:
                tt, T, RH, DP, PR = [], [], [], [], []
                for d in days:
                    for h in range(24):
                        t = clim(d, la, h) + off
                        rh = min(100, 65 + 25 * math.cos(2 * math.pi * (h - 4) / 24))
                        tt.append("%sT%02d:00" % (d.isoformat(), h)); T.append(round(t, 1)); RH.append(round(rh))
                        DP.append(round(t - (100 - rh) / 5, 1)); PR.append(0.3 if d.day % 6 == 0 and h < 6 else 0)
                out.append({"hourly": {"time": tt, "temperature_2m": T, "relative_humidity_2m": RH, "dew_point_2m": DP,
                                       "precipitation": PR}})
        return out

    def load(name):
        sp = importlib.util.spec_from_file_location(name.replace("-", "_"), os.path.join(sim, "scripts", name + ".py"))
        m = importlib.util.module_from_spec(sp)
        sp.loader.exec_module(m)
        return m

    os.environ.setdefault("WX_MAX_MINUTES", "30")
    os.environ["RUST_BUDGET"] = "1e9"
    w = load("update-weather"); w.call = fake; w.budget_wait = lambda *a: None; w.nap = lambda *a: None
    w.main()
    r = load("update-rust"); r.call = fake; r.uw.budget_wait = lambda *a: None; r.uw.nap = lambda *a: None
    r.main()
    load("split-rust").main()
    load("split-wx").main()
    sm = load("seir")

    def no_wind(*a):
        raise RuntimeError("шамол йўқ (синов)")
    sm.wind_update = no_wind
    sm.main()


def check(sim, y0):
    D = os.path.join(sim, "plant-protection", "data")
    y1 = y0 + 1
    errs = []
    yrs = json.load(open(os.path.join(D, "wx-years.json")))
    if yrs.get("cur") != y1 or y0 not in yrs.get("years", []):
        errs.append("wx-years.json: %s" % yrs)
    n0 = (datetime.date(y0, 12, 31) - datetime.date(y0, 1, 1)).days + 1
    for f in ("wx-%d.json" % y0, "rust-%d.json" % y0):
        p = os.path.join(D, f)
        if not os.path.exists(p):
            errs.append(f + " йўқ")
            continue
        j = json.load(open(p))
        if j.get("days") != n0 or j.get("start") != "%d-01-01" % y0:
            errs.append("%s: start %s days %s (кутилган %d-01-01, %d)" % (f, j.get("start"), j.get("days"), y0, n0))
    for f in ("wx-%d.json" % y0, "rust-%d.json" % y0):
        p = os.path.join(D, f)
        if os.path.exists(p) and not json.load(open(p)).get("final"):
            errs.append(f + ": январда 24–31 декабр ҳақиқий архивдан олинмади (final йўқ)")
    p = os.path.join(D, "wx-%d.json" % y0)
    if os.path.exists(p):
        j = json.load(open(p))
        k = sorted(j["cells"])[0]
        jd = (datetime.date(y0, 12, 30) - datetime.date(y0, 1, 1)).days
        want = int(round((clim(datetime.date(y0, 12, 30), float(k.split(",")[0]))[0] + ARCH_OFF) * 10))
        if j["cells"][k][2 * jd] != want:
            errs.append("wx-%d.json: 30 декабр %s — %s, архивдан кутилган %s" % (y0, k, j["cells"][k][2 * jd], want))
    for f in ("wx.json", "rust.json"):
        j = json.load(open(os.path.join(D, f)))
        if j.get("start") != "%d-01-01" % y1:
            errs.append("%s: start %s" % (f, j.get("start")))
    for sub in ("wx", "rust"):
        for y in (y0, y1):
            for part in ("uz", "nb"):
                p = os.path.join(D, sub, "%d-%s.json" % (y, part))
                if not os.path.exists(p):
                    errs.append("%s/%d-%s.json йўқ" % (sub, y, part))
                elif part == "uz" and not json.load(open(p)).get("cells" if sub == "wx" else "d"):
                    errs.append("%s/%d-%s.json бўш" % (sub, y, part))
    return errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", help="нусха шу папкада қолади (браузер текшируви учун)")
    ap.add_argument("--day")
    ap.add_argument("--sim")
    a = ap.parse_args()
    if a.day:
        run_day(a.sim, a.day)
        return 0
    sim = a.keep or tempfile.mkdtemp(prefix="rollover-")
    if os.path.exists(sim):
        shutil.rmtree(sim)
    os.makedirs(sim)
    for d in ("scripts", "plant-protection", "data-hist"):
        shutil.copytree(os.path.join(ROOT, d), os.path.join(sim, d), ignore=shutil.ignore_patterns("*.npz", "__pycache__"))
    y0 = json.load(open(os.path.join(sim, "plant-protection", "data", "wx.json")))["start"][:4]
    y0 = int(y0)
    days = ["%d-12-31" % y0, "%d-01-01" % (y0 + 1), "%d-01-02" % (y0 + 1), "%d-01-10" % (y0 + 1), "%d-03-10" % (y0 + 1)]
    for d in days:
        print("== %s" % d, flush=True)
        p = subprocess.run([sys.executable, os.path.abspath(__file__), "--day", d, "--sim", sim], capture_output=True, text=True)
        tail = (p.stdout + p.stderr).strip().splitlines()[-3:]
        print("   " + "\n   ".join(tail))
        if p.returncode != 0:
            print("✗ %s да скрипт хато билан тугади:\n%s" % (d, p.stderr[-3000:]))
            return 1
        if "Traceback" in p.stderr:
            print("✗ %s: хато:\n%s" % (d, p.stderr[-3000:]))
            return 1
    errs = check(sim, y0)
    if errs:
        print("✗ йил алмашинувида %d та муаммо:" % len(errs))
        for e in errs:
            print("  - " + e)
        return 1
    print("✓ йил алмашинуви %d → %d тўғри (нусха: %s)" % (y0, y0 + 1, sim))
    if not a.keep:
        shutil.rmtree(sim)
    return 0


if __name__ == "__main__":
    sys.exit(main())
