"""Барг ҳўллиги: «тун» бўйича энг узун узлуксиз ҳўл давр (SEIR ва маълумот скриптлари учун умумий).

Сана d учун ойна — (d−1) 12:00 дан d 12:00 гача (кечки шудринг ва тонгги ҳўллик бир ойнада, икки календар
кунга бўлинмайди). Ҳўл соат: нисбий намлик ≥ 90 % ёки ёмғир > 0.1 мм.
Натижа: {сана: (wl — энг узун узлуксиз ҳўл давр, соат; tw — шу даврдаги ўртача ҳарорат, °C ёки None)}
"""
import datetime as dt

RH_WET = 90.0


def wet_nights(times, T, RH, PR=None):
    hours = []
    for j, ts in enumerate(times):
        if j >= len(T) or T[j] is None or j >= len(RH) or RH[j] is None:
            hours.append(None)
            continue
        wet = RH[j] >= RH_WET or (PR is not None and j < len(PR) and PR[j] is not None and PR[j] > 0.1)
        hours.append((ts, wet, T[j]))
    out = {}
    cur = {}
    for h in hours:
        if h is None:
            continue
        ts, wet, t = h
        d = dt.date.fromisoformat(ts[:10])
        hr = int(ts[11:13])
        key = d if hr < 12 else d + dt.timedelta(days=1)  # ойна эгаси
        s = cur.setdefault(key, {"run": 0, "sum": 0.0, "best": 0, "bsum": 0.0, "n": 0})
        s["n"] += 1
        if wet:
            s["run"] += 1
            s["sum"] += t
            if s["run"] > s["best"]:
                s["best"], s["bsum"] = s["run"], s["sum"]
        else:
            s["run"], s["sum"] = 0, 0.0
    for d, s in cur.items():
        if s["n"] >= 18:  # ойнанинг камида 18 соати бор бўлса
            out[d] = (s["best"], round(s["bsum"] / s["best"], 1) if s["best"] else None)
    return out
