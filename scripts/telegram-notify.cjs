// Ҳафталик Telegram хабари: кейинги 7 кунда қайси туманларда қайси фаза бошланади.
// Модел — сайтдаги fenologik.js'нинг ўзи (браузерда очиб, window.FENO_WEEK чақирилади),
// шунинг учун хабар ва харита ҳар доим бир хил натижа беради.
//
// Ишга тушириш: SITE_DIR=plant-protection node scripts/telegram-notify.cjs
// Муҳит ўзгарувчилари:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — бўлмаса хабар фақат логга чиқарилади (синов)
//   SITE_URL — хабар охиридаги ҳавола
//   FORCE=1 — янги фаза бўлмаса ҳам юбориш; FAKE_DATE=2026-07-14 — синов санаси
//   PESTS — қайси зараркунандалар (масалан "bollworm,cutworm"); бўш — ҳаммаси
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const SITE_DIR = path.resolve(process.env.SITE_DIR || "plant-protection");
const SITE_URL = process.env.SITE_URL || "https://75665fffffff6tttt.github.io/Cluess-ushun/fenologik.html";
const ONLY = (process.env.PESTS || "").split(",").map((s) => s.trim()).filter(Boolean);
const MONTHS = ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];
const ICON = { bollworm: "🐛", cutworm: "🐛", caradrina: "🐛", mite: "🕷", aphid: "🦟" };

function serve(dir) {
  const types = { ".html": "text/html", ".js": "application/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".geojson": "application/json" };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(dir, p);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function dmy(iso) { const [y, m, d] = iso.split("-").map(Number); return d + " " + MONTHS[m - 1]; }
function range(a, b) {
  const [ya, ma, da] = a.split("-").map(Number), [yb, mb, db] = b.split("-").map(Number);
  return (ma === mb ? da + "–" + db + " " + MONTHS[mb - 1] : dmy(a) + " – " + dmy(b)) + " " + yb;
}

function pestBlock(p) {
  const lines = ["<b>" + (ICON[p.id] || "•") + " " + esc(p.nm) + "</b>"];
  // бугунги ҳолат: фазалар бўйича туманлар сони
  const now = {};
  p.d.forEach((x) => { if (x.cur) { const k = x.cur.nm; now[k] = (now[k] || 0) + 1; } });
  const nowTxt = Object.entries(now).sort((a, b) => b[1] - a[1]).map(([k, n]) => esc(k.toLowerCase()) + " — " + n).join(", ");
  if (nowTxt) lines.push("Ҳозир (туманлар сони): " + nowTxt);
  // кейинги 7 кунда бошланадиган фазалар: фаза номи бўйича (авлодлар бирлаштирилади), вилоятлар — туманлар сони билан
  const by = {};
  p.d.forEach((x) => {
    const seen = {};
    x.nx.forEach((e) => {
      const key = e.k === "w" ? "❄ " + e.nm : e.nm;
      const o = (by[key] = by[key] || { first: e.d, gens: new Set(), regs: {}, n: 0 });
      if (e.d < o.first) o.first = e.d;
      if (e.k !== "w") o.gens.add(e.g);
      if (seen[key]) return; seen[key] = 1; // бир туман бир фазада бир марта
      o.n++; o.regs[x.r] = (o.regs[x.r] || 0) + 1;
    });
  });
  const keys = Object.keys(by).sort((a, b) => by[a].first.localeCompare(by[b].first));
  if (!keys.length) { lines.push("Бу ҳафта янги фаза бошланмайди."); return lines.join("\n"); }
  lines.push("Бу ҳафта бошланади:");
  keys.forEach((k) => {
    const o = by[k], g = [...o.gens].sort((a, b) => a - b);
    const gt = g.length ? " (" + (g.length > 1 ? g[0] + "–" + g[g.length - 1] : g[0]) + "-авлод)" : "";
    const regs = Object.entries(o.regs).sort((a, b) => b[1] - a[1]).map(([r, n]) => esc(r.replace(" Республикаси", "").replace(" вилояти", " в.")) + " " + n);
    lines.push("▸ <b>" + esc(k) + gt + "</b> — " + o.n + " туман, " + dmy(o.first) + " дан");
    lines.push("   " + regs.join(", "));
  });
  return lines.join("\n");
}

// Telegram: бир хабар 4096 белгигача — узун бўлса зараркунанда бўйича бўлиб юборилади
function chunks(header, blocks, footer) {
  const out = []; let cur = header;
  blocks.forEach((b) => {
    if ((cur + "\n\n" + b).length > 3900) { out.push(cur); cur = b; } else cur += "\n\n" + b;
  });
  cur += "\n\n" + footer; out.push(cur);
  return out;
}

async function send(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log("— TELEGRAM_BOT_TOKEN/CHAT_ID йўқ: хабар юборилмади (синов) —\n" + text + "\n"); return; }
  const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error("Telegram: " + (j.description || r.status));
  console.log("юборилди, message_id", j.result.message_id);
}

(async () => {
  const srv = await serve(SITE_DIR), port = srv.address().port;
  const b = await chromium.launch();
  const pg = await b.newPage();
  if (process.env.FAKE_DATE) await pg.clock.setFixedTime(new Date(process.env.FAKE_DATE + "T08:00:00")); // синов учун: бошқа сана
  await pg.route(/auth\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: "" })); // парол-эшик — локал нусхада керак эмас
  await pg.goto("http://127.0.0.1:" + port + "/fenologik.html", { waitUntil: "networkidle" });
  await pg.waitForFunction(() => window.FENO_WEEK && window.FENO_WEEK(7), null, { timeout: 120000 });
  const W = await pg.evaluate(() => window.FENO_WEEK(7));
  await b.close(); srv.close();

  const pests = W.pests.filter((p) => !ONLY.length || ONLY.includes(p.id));
  const header = "📅 <b>Фенологик прогноз: " + range(W.from, W.to) + "</b>\nЎзбекистон туманлари бўйича (самарали ҳарорат модели, об-ҳаво прогнози билан)";
  const footer = "🗺 Харита ва календар: " + SITE_URL + "\n<i>Модел баҳоси, расмий мониторинг эмас.</i>";
  // қишда (ҳеч қаерда янги фаза бошланмаса) хабар юборилмайди — каналда бўш хабарлар тўпланмасин; FORCE=1 — барибир юбориш
  const quiet = pests.every((p) => p.d.every((x) => !x.nx.length));
  if (quiet && process.env.FORCE !== "1") { console.log("Бу ҳафта ҳеч қаерда янги фаза бошланмайди — хабар юборилмади."); return; }
  for (const t of chunks(header, pests.map(pestBlock), footer)) await send(t);
})().catch((e) => { console.error(e); process.exit(1); });
