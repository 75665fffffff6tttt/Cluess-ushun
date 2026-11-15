#!/usr/bin/env python3
"""Дала кузатувлари (Google Form → Google Sheets, CSV) → plant-protection/data/obs.json

Google жадвали «Файл → Улашиш → Интернетда чоп этиш → CSV» билан чоп этилади; унинг манзили
GitHub'да OBS_CSV_URL (Settings → Secrets and variables → Actions → Variables) га ёзилади.
Шахсий маълумот (исм, телефон, e-mail, расм ҳаволаси) сайтга чиқмайди — фақат қуйидагилар:
  {"d": сана, "i": туман рақами (uz-districts.js тартибида), "dis": касаллик, "st": буғдой босқичи,
   "inc": тарқалиш %, "sev": ривожланиш 0–3}
Устунлар сарлавҳа сўзлари бўйича топилади (тартиби муҳим эмас), туман номи — uz-districts.js
номлари билан солиштирилади (кирилл/лотин, «тумани», «шаҳри» сўзлари эътиборга олинмайди).
Муҳит: OBS_CSV_URL (http(s) ёки локал файл), OBS_FORM_URL (сайтдаги «Кузатув қўшиш» тугмаси).
"""
import csv
import datetime as dt
import io
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "plant-protection")
OUT = os.path.join(P, "data", "obs.json")

LAT2CYR = [("sh", "ш"), ("ch", "ч"), ("o'", "ў"), ("g'", "ғ"), ("o‘", "ў"), ("g‘", "ғ"), ("yo", "ё"), ("yu", "ю"), ("ya", "я"),
           ("ts", "ц"), ("a", "а"), ("b", "б"), ("d", "д"), ("e", "е"), ("f", "ф"), ("g", "г"), ("h", "ҳ"), ("i", "и"), ("j", "ж"),
           ("k", "к"), ("l", "л"), ("m", "м"), ("n", "н"), ("o", "о"), ("p", "п"), ("q", "қ"), ("r", "р"), ("s", "с"), ("t", "т"),
           ("u", "у"), ("v", "в"), ("x", "х"), ("y", "й"), ("z", "з")]
STOP = ("тумани", "туман", "шаҳри", "шаҳар", "район", "город", "tumani", "shahri", "shahar", "district", "city", "г.")
CITY = re.compile(r"шаҳри|шаҳар|shahri|shahar|city|город|^г\.|\bг\. ", re.I)


def translit(s):
    """Лотин ёзувини кириллга (ўзбек лотини → кирилл, тахминий)."""
    s = (s or "").lower().replace("’", "'").replace("ʻ", "'").replace("`", "'")
    if re.search(r"[a-z]", s):
        for a, b in LAT2CYR:
            s = s.replace(a, b)
    return s


def norm(s):
    """Туман номини солиштириш учун: кичик ҳарф, лотин → кирилл, «тумани/шаҳри» ва белгилар олиб ташланади."""
    s = (s or "").strip().lower().replace("’", "'").replace("ʻ", "'").replace("`", "'")
    for w in STOP:
        s = s.replace(w, " ")
    s = translit(s)
    for w in STOP:
        s = s.replace(w, " ")
    s = s.replace("х", "ҳ").replace("ы", "и").replace("э", "е").replace("ъ", "")
    return re.sub(r"[^а-яёўқғҳ]", "", s)


def districts():
    """uz-districts.js → [(рақам, вилоят id, номлар тўплами, шаҳарми)]"""
    with open(os.path.join(P, "js", "uz-districts.js"), encoding="utf-8") as fh:
        U = json.loads(fh.read().split("=", 1)[1].strip().rstrip(";"))
    regs = {r["id"]: {norm(r["c"]), norm(r.get("ru", ""))} for r in U["regions"]}
    out = []
    for i, it in enumerate(U["items"]):
        names = {norm(it.get(k, "")) for k in ("c", "u", "n", "ru")} - {""}
        out.append((i, it["r"], names, bool(CITY.search(" ".join(it.get(k, "") for k in ("c", "u", "n", "ru"))))))
    return out, regs


def match(name, region, D, regs):
    """Туман номи (ва ихтиёрий вилоят) → туман рақами ёки None. Бир хил ном бир неча вилоятда бўлса — вилоят бўйича."""
    n = norm(name)
    if not n:
        return None
    rn = norm(region)
    city = bool(CITY.search(name or ""))
    hits = [(i, r, c) for i, r, names, c in D if n in names]
    if not hits:
        hits = [(i, r, c) for i, r, names, c in D if any(len(n) >= 4 and (x.startswith(n) or n.startswith(x)) for x in names if x)]
    if len(hits) > 1:
        h2 = [h for h in hits if h[2] == city]  # «Урганч» — туман, «Урганч шаҳри» — шаҳар
        hits = h2 or hits
    if len(hits) > 1 and rn:
        h2 = [h for h in hits if any(rn and (rn in x or x in rn) for x in regs.get(h[1], ()))]
        hits = h2 or hits
    return hits[0][0] if len(hits) == 1 or (hits and len({h[0] for h in hits}) == 1) else None


def col(header, *keys):
    """Сарлавҳада калит сўзлардан бири бор биринчи устун рақами."""
    for k in keys:
        for j, h in enumerate(header):
            if k in h.lower():
                return j
    return None


def num(s):
    m = re.search(r"-?\d+(?:[.,]\d+)?", s or "")
    return float(m.group(0).replace(",", ".")) if m else None


def parse_date(s):
    s = (s or "").strip()
    for f in ("%Y-%m-%d", "%d.%m.%Y", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S", "%d.%m.%Y %H:%M:%S", "%m/%d/%Y %H:%M:%S"):
        try:
            return dt.datetime.strptime(s, f).date()
        except ValueError:
            pass
    return None


DIS = [("sariq", ("сариқ", "sariq", "жёлт", "желт", "stripe", "yellow")), ("qongir", ("қўнғир", "qo'ng'ir", "бур", "leaf", "brown")),
       ("none", ("йўқ", "yo'q", "соғлом", "нет", "здоров", "none"))]
STAGE = [("aut", ("кузги", "майса", "всход")), ("til", ("туплан", "кущ")), ("jnt", ("найча", "трубк")), ("hd", ("бошоқ", "гулла", "колош", "цвет")),
         ("gf", ("дон", "налив")), ("rip", ("пиш", "созрев"))]


def pick(s, table):
    s = translit(s)
    for code, keys in table:
        if any(k in s for k in keys):
            return code
    return None


def rows_to_obs(text, D, regs):
    """CSV матни → (кузатувлар рўйхати, топилмаган туман номлари)"""
    rd = list(csv.reader(io.StringIO(text)))
    if not rd:
        return [], []
    h = rd[0]
    c_date = col(h, "кузатув санаси", "сана", "дата", "date")
    c_ts = col(h, "timestamp", "отметка", "вақт")
    c_reg = col(h, "вилоят", "область", "region")
    c_dist = col(h, "туман", "район", "district")
    c_dis = col(h, "касаллик", "болезн", "disease")
    c_st = col(h, "босқич", "фаза", "stage")
    c_inc = col(h, "тарқалиш", "распростр", "incidence", "%")
    c_sev = col(h, "ривожланиш", "даража", "степень", "балл", "severity")
    out, miss = [], []
    for r in rd[1:]:
        g = lambda c: r[c] if c is not None and c < len(r) else ""
        d = parse_date(g(c_date)) or parse_date(g(c_ts))
        i = match(g(c_dist), g(c_reg), D, regs)
        if d is None or i is None:
            if g(c_dist).strip():
                miss.append(g(c_dist).strip())
            continue
        o = {"d": d.isoformat(), "i": i, "dis": pick(g(c_dis), DIS) or "sariq"}
        st = pick(g(c_st), STAGE)
        if st:
            o["st"] = st
        inc = num(g(c_inc))
        if inc is not None:
            o["inc"] = max(0.0, min(100.0, round(inc, 1)))
        sev = num(g(c_sev))
        if sev is not None:
            o["sev"] = int(max(0, min(3, round(sev))))
        elif inc is not None:
            o["sev"] = 0 if inc == 0 else 1 if inc < 10 else 2 if inc < 30 else 3  # фақат даража берилмаган бўлса — тахминий
        if o["dis"] == "none":
            o["sev"], o["inc"] = 0, 0.0
        out.append(o)
    out.sort(key=lambda o: (o["d"], o["i"]))
    return out, miss


def fetch(url):
    if re.match(r"https?://", url):
        with urllib.request.urlopen(url, timeout=60) as r:
            return r.read().decode("utf-8-sig")
    with open(url, encoding="utf-8-sig") as fh:
        return fh.read()


def main():
    url = os.environ.get("OBS_CSV_URL", "").strip()
    if not url:
        print("OBS_CSV_URL йўқ — ўтказиб юборилди")
        return 0
    D, regs = districts()
    obs, miss = rows_to_obs(fetch(url), D, regs)
    res = {"form": os.environ.get("OBS_FORM_URL", "").strip(), "n": len(obs), "o": obs}
    old = None
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            old = json.load(fh)
    if old and {k: old.get(k) for k in ("form", "o")} == {k: res[k] for k in ("form", "o")}:
        print("ўзгариш йўқ, %d кузатув" % len(obs))
        return 0
    res["updated"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(res, fh, ensure_ascii=False, separators=(",", ":"))
    print("%d кузатув; туман топилмади: %s" % (len(obs), ", ".join(sorted(set(miss))) or "—"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
