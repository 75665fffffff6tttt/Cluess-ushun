// Ўсимликларни ҳимоя қилиш — янгиликларни автоматик йиғиш.
// Google News RSS'дан (калит йўқ, барқарор) uz ва ru тилларда қидиради,
// натижани plant-protection/data/news.json га ёзади. Seed ёзувлари сақланади.
// Node 20+ (built-in fetch). Ташқи боғлиқлик йўқ.
import fs from "node:fs";

const OUT = "plant-protection/data/news.json";

const FEEDS = [
  { lang: "uz", q: "ўсимликларни ҳимоя қилиш зараркунанда пестицид ҳосил", hl: "uz", ceid: "UZ:uz" },
  { lang: "ru", q: "защита растений пестициды вредители Узбекистан урожай", hl: "ru", ceid: "UZ:ru" }
];

function feedUrl(f) {
  return "https://news.google.com/rss/search?q=" + encodeURIComponent(f.q) +
    "&hl=" + f.hl + "&gl=UZ&ceid=" + f.ceid;
}
function tag(xml, name) {
  const m = xml.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)<\\/" + name + ">"));
  return m ? m[1] : "";
}
function clean(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchFeed(f) {
  try {
    const res = await fetch(feedUrl(f), { headers: { "User-Agent": "Mozilla/5.0 (compatible; AgroHimoyaBot/1.0)" } });
    if (!res.ok) { console.error("feed", f.lang, "HTTP", res.status); return []; }
    const xml = await res.text();
    const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 15);
    return blocks.map(function (m) {
      const b = m[1];
      let title = clean(tag(b, "title"));
      const url = clean(tag(b, "link"));
      const pub = clean(tag(b, "pubDate"));
      const source = clean(tag(b, "source"));
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3)).trim();
      let date = "";
      if (pub) { const d = new Date(pub); if (!isNaN(d)) date = d.toISOString().slice(0, 10); }
      return { lang: f.lang, date, title, url, source };
    }).filter(function (x) { return x.title && x.url; });
  } catch (e) {
    console.error("feed", f.lang, "error", e.message);
    return [];
  }
}

// Доимий (seed) ёзувлар — ҳар доим сақланади (кодга ёзилган, файлга боғлиқ эмас).
const SEED = [
  { lang: "uz", date: "2025-04-01", title: "Ўзбекистонда ўғит ва пестицидларни рақамли маркировкалаш 2025-йил 1 майдан жорий этилди", url: "https://buxgalter.uz/uz/publish/doc/text207722_ugitlar_va_pesticidlar_aylanmasi_ishtirokchilari_qanday_qadamlarni_amalga_oshirishi_kerak", source: "Buxgalter.uz", summary: "Ўғит ва пестицидлар айланмаси иштирокчилари учун мажбурий рақамли маркировка тартиби ва қадамлар." },
  { lang: "ru", date: "2025-04-01", title: "Цифровая маркировка удобрений и пестицидов в Узбекистане с 1 мая 2025 года", url: "https://buxgalter.uz/uz/publish/doc/text207722_ugitlar_va_pesticidlar_aylanmasi_ishtirokchilari_qanday_qadamlarni_amalga_oshirishi_kerak", source: "Buxgalter.uz", summary: "Порядок обязательной цифровой маркировки для участников оборота удобрений и пестицидов." },
  { lang: "uz", date: "2024-01-01", title: "EPPO Global Database — зараркунанда, касаллик ва бегона ўтларнинг халқаро базаси", url: "https://gd.eppo.int/", source: "EPPO", summary: "Ўсимлик зарарли организмлари бўйича расмий халқаро маълумотлар базаси ва методикалар." },
  { lang: "ru", date: "2024-01-01", title: "EPPO Global Database — международная база вредителей, болезней и сорняков", url: "https://gd.eppo.int/", source: "EPPO", summary: "Официальная международная база данных по вредным организмам растений и методикам." },
  { lang: "uz", date: "2024-01-01", title: "IRAC — инсектицидлар резистентлигини бошқариш бўйича халқаро қўмита", url: "https://irac-online.org/", source: "IRAC", summary: "Таъсир механизми (MoA) гуруҳлари ва резистентликка қарши ротация тавсиялари." },
  { lang: "ru", date: "2024-01-01", title: "IRAC — международный комитет по управлению резистентностью к инсектицидам", url: "https://irac-online.org/", source: "IRAC", summary: "Группы механизма действия (MoA) и рекомендации по ротации против резистентности." }
];

let fetched = [];
for (const f of FEEDS) { fetched = fetched.concat(await fetchFeed(f)); }

const all = SEED.concat(fetched);
const seen = new Set();
const uniq = [];
for (const it of all) {
  const key = it.lang + "|" + (it.url || "").split("?")[0]; // тил+URL — тил бўйича бир хил манба такрорланмайди
  if (it.url && !seen.has(key)) { seen.add(key); uniq.push(it); }
}
uniq.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
const items = uniq.slice(0, 40);

const out = { updated: new Date().toISOString().slice(0, 10), note: "GitHub Actions томонидан автоматик янгиланади (scripts/fetch-news.mjs).", items: items };
fs.mkdirSync("plant-protection/data", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log("news.json ёзилди:", items.length, "ёзув (seed:", SEED.length, "+ янги:", fetched.length, ")");
