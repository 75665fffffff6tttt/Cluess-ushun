// Узоқ муддатли прогноз → plant-protection/data/outlook.json
// Сайтнинг ўз модели (fenologik.js, window.FENO_OUTLOOK) браузерда ишлатилади: бугунгача ҳақиқий
// ҳарорат + 16 кунлик прогноз, ундан кейин — ўтган ҳар бир йилнинг об-ҳавоси (data-hist/hist-1deg.json,
// scripts/build-hist.py). Натижа: ҳар туман ва зараркунанда учун кейинги фазалар санасининг 10/50/90%.
//
// Ишга тушириш: node scripts/build-outlook.cjs   (playwright керак)
// FAKE_DATE=2026-06-01 — синов учун бошқа «бугун»
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "plant-protection");
const HIST = path.join(ROOT, "data-hist", "hist-1deg.json");
const OUT = path.join(SITE_DIR, "data", "outlook.json");
const MIN_YEARS = +(process.env.OUTLOOK_MIN_YEARS || 3);

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

(async () => {
  if (!fs.existsSync(HIST)) { console.log("data-hist/hist-1deg.json йўқ — ўтказиб юборилди"); return; }
  const H = JSON.parse(fs.readFileSync(HIST, "utf8"));
  const srv = await serve(SITE_DIR), port = srv.address().port;
  const b = await chromium.launch();
  const pg = await b.newPage();
  if (process.env.FAKE_DATE) await pg.clock.setFixedTime(new Date(process.env.FAKE_DATE + "T08:00:00"));
  await pg.route(/auth\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: "" }));
  await pg.route(/outlook\.json/, (r) => r.fulfill({ status: 404, body: "" })); // эски натижа керак эмас
  await pg.goto("http://127.0.0.1:" + port + "/fenologik.html", { waitUntil: "networkidle" });
  await pg.waitForFunction(() => window.FENO_OUTLOOK && window.FENO_WEEK && window.FENO_WEEK(1), null, { timeout: 120000 });
  const t0 = Date.now();
  // синов санасида: шу кундан 15 кун кейингача «прогноз», ундан кейинги ҳақиқий маълумот ташланади
  const cut = process.env.FAKE_DATE ? new Date(new Date(process.env.FAKE_DATE + "T12:00:00").getTime() + 15 * 864e5).toISOString().slice(0, 10) : null;
  const O = await pg.evaluate(([h, c]) => window.FENO_OUTLOOK(h, c), [H, cut]);
  await b.close(); srv.close();
  if (!O) throw new Error("FENO_OUTLOOK: маълумот тайёр эмас");
  const nd = Object.keys(O.p[Object.keys(O.p)[0]] || {}).length;
  console.log("years", O.years.join(","), "| districts", nd, "| fcEnd", O.fcEnd, "|", Date.now() - t0, "ms");
  if (O.years.length < MIN_YEARS) { console.log("йиллар кам (" + O.years.length + " < " + MIN_YEARS + ") — outlook.json ёзилмади"); return; }
  fs.writeFileSync(OUT, JSON.stringify(O));
  console.log("→", path.relative(ROOT, OUT), Math.round(fs.statSync(OUT).size / 1024), "KB");
})().catch((e) => { console.error(e); process.exit(1); });
