// Узоқ муддатли прогноз → plant-protection/data/outlook.json
// Сайтнинг ўз модели (fenologik.js, window.FENO_OUTLOOK) браузерда ишлатилади: бугунгача ҳақиқий
// ҳарорат + 16 кунлик прогноз, ундан кейин — ўтган ҳар бир йилнинг об-ҳавоси (data-hist/hist-1deg.json,
// scripts/build-hist.py). Натижа: ҳар туман ва зараркунанда учун кейинги фазалар санасининг 10/50/90%.
//
// Келаси йил прогнози (prognoz.html): window.FENO_YEAR — ўтган йиллар ENSO вазни билан → data/forecast.json
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
const FAKE = !!process.env.FAKE_DATE;

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
  // CLIMEX усулидаги экоиқлим индекси (ҳар туман, ҳар йил) → data/climex.json
  const CX = FAKE ? null : await pg.evaluate((h) => window.FENO_CLIMEX && window.FENO_CLIMEX(h), H);
  // келаси йил прогнози (prognoz.html): ўтган йиллар об-ҳавоси ENSO ўхшашлиги бўйича вазнли → data/forecast.json
  let FCY = null;
  if (!FAKE) {
    const now = new Date(), TY = now.getFullYear() + (now.getMonth() >= 7 ? 1 : 0);
    const W = {}; let enso = null;
    try {
      const E = JSON.parse(fs.readFileSync(path.join(SITE_DIR, "data", "enso.json"), "utf8")), cur = E.last && E.last.oni;
      // аналог йил y учун: ундан олдинги кузнинг (y−1) OND ONI си; вазн = Гаусс (σ = 1.2), энг ками 0.15
      if (cur != null) {
        enso = { oni: cur, season: E.last.season, year: E.last.year, sigma: 1.2, floor: 0.15 };
        for (let y = 1990; y < TY; y++) { const v = E.s[String(y - 1)] && E.s[String(y - 1)].OND; if (v != null) W[y] = Math.max(0.15, Math.exp(-((v - cur) ** 2) / (2 * 1.44))); }
      }
    } catch (e) { console.log("enso.json ўқилмади — вазнсиз:", e.message); }
    FCY = await pg.evaluate(([h, w, ty]) => window.FENO_YEAR && window.FENO_YEAR(h, w, ty), [H, W, TY]);
    if (FCY) { FCY.enso = enso; for (const y of Object.keys(FCY.w)) FCY.w[y] = Math.round(FCY.w[y] * 100) / 100; }
    // 🧪 сценарийлар (prognoz.html): ENSO ҳолати × ҳарорат ўзгариши → фақат медианалар (data/forecast-scen.json)
    if (FCY && process.env.SCEN !== "0") {
      let E = null; try { E = JSON.parse(fs.readFileSync(path.join(SITE_DIR, "data", "enso.json"), "utf8")); } catch (e) { /* */ }
      const wOf = (oni) => { const w = {}; if (!E || oni == null) return w; for (let y = 1990; y < TY; y++) { const v = E.s[String(y - 1)] && E.s[String(y - 1)].OND; if (v != null) w[y] = Math.max(0.15, Math.exp(-((v - oni) ** 2) / (2 * 1.44))); } return w; };
      const ENS = { cur: enso ? enso.oni : 0, elnino: 1.5, neutral: 0, lanina: -1.2 }, DTS = [-2, -1, 0, 1, 2, 3], SC = { year: TY, made: FCY.made, enso: ENS, dts: DTS, s: {} };
      const t1 = Date.now();
      for (const ek of Object.keys(ENS)) for (const dt of DTS) {
        const R = await pg.evaluate(([h, w, ty, d]) => window.FENO_YEAR(h, w, ty, d), [H, wOf(ENS[ek]), TY, dt]);
        if (!R) continue;
        const o = { p: {}, loc: {}, loca: {} };
        for (const pid of Object.keys(R.p)) { o.p[pid] = {}; for (const i of Object.keys(R.p[pid])) { const a = R.p[pid][i]; o.p[pid][i] = [a[1], a[4]]; } }
        for (const k of ["loc", "loca"]) for (const i of Object.keys(R[k] || {})) o[k][i] = R[k][i][1];
        SC.s[ek + "|" + dt] = o;
      }
      fs.writeFileSync(path.join(SITE_DIR, "data", "forecast-scen.json"), JSON.stringify(SC));
      console.log("→ forecast-scen.json", Object.keys(SC.s).length, "scenarios", Math.round((Date.now() - t1) / 1000) + " s", Math.round(fs.statSync(path.join(SITE_DIR, "data", "forecast-scen.json")).size / 1024), "KB");
    }
  }
  await b.close(); srv.close();
  if (FCY && Object.keys(FCY.p).some((k) => Object.keys(FCY.p[k]).length)) {
    const ff = path.join(SITE_DIR, "data", "forecast.json");
    fs.writeFileSync(ff, JSON.stringify(FCY));
    console.log("→ forecast.json", FCY.year, "years", FCY.years.join(","), "w", JSON.stringify(FCY.w), Math.round(fs.statSync(ff).size / 1024), "KB");
  }
  if (CX && Object.keys(CX.d).length) {
    const cf = path.join(SITE_DIR, "data", "climex.json");
    fs.writeFileSync(cf, JSON.stringify(CX));
    console.log("→ climex.json", Object.keys(CX.d).length, "districts, years", CX.years.join(","), Math.round(fs.statSync(cf).size / 1024), "KB");
  }
  if (!O) throw new Error("FENO_OUTLOOK: маълумот тайёр эмас");
  const nd = Object.keys(O.p[Object.keys(O.p)[0]] || {}).length;
  console.log("years", O.years.join(","), "| districts", nd, "| fcEnd", O.fcEnd, "|", Date.now() - t0, "ms");
  if (O.years.length < MIN_YEARS) {
    // ҳали кам йил: бўш файл (сайт 404 хатосини кўрсатмасин, карточкада бўлим чиқмайди)
    if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, JSON.stringify({ year: O.year, made: O.made, years: [], p: {} }));
    console.log("йиллар кам (" + O.years.length + " < " + MIN_YEARS + ") — outlook.json тўлдирилмади"); return;
  }
  fs.writeFileSync(OUT, JSON.stringify(O));
  console.log("→", path.relative(ROOT, OUT), Math.round(fs.statSync(OUT).size / 1024), "KB");
})().catch((e) => { console.error(e); process.exit(1); });
