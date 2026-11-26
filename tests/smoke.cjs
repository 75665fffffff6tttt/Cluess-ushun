#!/usr/bin/env node
/* Сайтнинг автоматик текшируви (smoke test): 24 саҳифа браузерда очилади ва асосий нарсалар текширилади.
 *   node tests/smoke.cjs            — plant-protection/ папкасини ўзи маҳаллий серверда очади
 *   BASE=https://... node tests/smoke.cjs — тайёр сайтни текшириш
 *   SITE_DIR=<папка> FAKE_DATE=2027-03-10 node tests/smoke.cjs — бошқа нусха ва сохта сана (tests/rollover.py билан)
 * Текширилади: JavaScript хатолари, очилмаган файллар (4xx/5xx), парол ойнаси, харита туманлари бўялгани,
 * сана сургичи, касаллик хулосаси, зараркунанда режимлари, бош саҳифа карточкалари.
 * Телефон (Pixel 7, ўзбекча 12 саҳифа): ён томонга чиқмаслик, легенда харита остида ва ёзуви ≥ 12px,
 * такрорий сарлавҳа яширилган, «Тест режими» ёзуви йўқ; компьютерда легенда харита ичида.
 * Маълумот эскирганлиги (wx.json > 3 кун) — фақат огоҳлантириш, хато эмас.
 * Хато бўлса — чиқиш коди 1. */
"use strict";
const { chromium, devices } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.join(__dirname, "..", "plant-protection");
const FAKE = process.env.FAKE_DATE ? new Date(process.env.FAKE_DATE + "T10:00:00+05:00") : null;
const PORT = 8123;
let BASE = process.env.BASE || "";
const HASH = (fs.readFileSync(path.join(ROOT, "js", "auth.js"), "utf8").match(/hash:\s*"([0-9a-f]{64})"/) || [])[1];
const KEY = (fs.readFileSync(path.join(ROOT, "js", "auth.js"), "utf8").match(/key:\s*"([^"]+)"/) || [])[1];

const MAP_PAGES = ["fenologik", "kasallik", "qongir-zang", "septorioz", "un-shudring"];
const PAGES = ["index", "fenologik", "kasallik", "qongir-zang", "septorioz", "un-shudring", "mavsum", "byulleten", "prognoz", "zararkunandalar-xarita", "hisobot", "aloqa"]
  .flatMap((p) => [p + ".html", p + ".ru.html"]);

const fails = [], warns = [];
const fail = (page, msg) => fails.push(page + ": " + msg);

async function waitServer(url, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.ok) return true; } catch (e) { /* ҳали тайёр эмас */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function checkPage(browser, file) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1000 } });
  await ctx.addInitScript(([k, h]) => { try { localStorage.setItem(k, h); } catch (e) { /* */ } }, [KEY, HASH]);
  const p = await ctx.newPage();
  if (FAKE) await p.clock.setFixedTime(FAKE);
  const errs = [];
  p.on("pageerror", (e) => errs.push("JS: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push("console: " + m.text().slice(0, 160)); });
  p.on("response", (r) => {
    const u = r.url();
    if (u.startsWith(BASE) && r.status() >= 400) errs.push(r.status() + " " + u.slice(BASE.length));
  });
  await p.goto(BASE + file, { waitUntil: "load" });
  const name = file.replace(/(\.ru)?\.html$/, "");
  try {
    if (await p.$("#auth-gate")) fail(file, "парол ойнаси сақланган кириш билан ҳам чиқди");
    if (await p.$(".test-banner")) fail(file, "«Тест режими» ёзуви қайтиб келган");
    if (MAP_PAGES.includes(name)) {
      // аввал маълумот юкланишини кутамиз (сана сургичи ҳарорат маълумоти келгач чизилади), кейин харита рангини текширамиз
      await p.waitForSelector("#fenotime input[type=range]", { timeout: 45000 }).catch(() => fail(file, "сана сургичи чиқмади (ҳарорат маълумоти юкланмади)"));
      await p.waitForFunction(() => {
        const ps = [...document.querySelectorAll("#uzmap path[data-i]")];
        return ps.length >= 199 && ps.filter((e) => !["#cfd8dc", "#e3e8ea", null].includes(e.getAttribute("fill"))).length >= 150;
      }, null, { timeout: 45000 }).catch(() => fail(file, "харита туманлари бўялмади (199 тадан камида 150)"));
      if (name !== "fenologik") {
        await p.waitForSelector("#rustsum .rs-chips", { timeout: 45000 }).catch(() => fail(file, "касаллик хулосаси (#rustsum) чиқмади"));
        if (await p.$("#legend.lg-out")) fail(file, "компьютерда легенда харита ичида бўлиши керак");
        await p.waitForFunction(() => [...document.querySelectorAll("path[data-n]")].some((e) => e.getAttribute("fill") !== "#e3e8ea"), null, { timeout: 45000 })
          .catch(() => fail(file, "қўшни давлатлар туманлари бўялмади"));
        await p.waitForSelector("#rustsum .yc-t", { timeout: 45000 }).catch(() => fail(file, "йилларни солиштириш жадвали чиқмади"));
        if (name === "kasallik") { // қишлаб қолиш индекси режими
          const b = await p.$('.pbtn[data-m="ow"]');
          if (!b) fail(file, "«Қишлаб қолиш» тугмаси йўқ");
          else {
            await b.click();
            await p.waitForFunction(() => { const e = document.querySelector("#rustsum .rs-h"); return e && e.textContent.indexOf("❄") >= 0; }, null, { timeout: 15000 })
              .catch(() => fail(file, "қишлаб қолиш хулосаси чиқмади"));
          }
        }
      } else {
        for (const m of ["gen", "phase", "ndvi", "ei"]) {
          const b = await p.$('.pbtn[data-m="' + m + '"]');
          if (!b) { fail(file, "режим тугмаси йўқ: " + m); continue; }
          await b.click(); await p.waitForTimeout(700);
          const t = await p.$eval(".bd-t", (e) => e.textContent).catch(() => "");
          if (!t) fail(file, "режим «" + m + "» да сарлавҳа йўқ");
        }
      }
    } else if (name === "index") {
      const n = await p.$$eval(".home-card", (a) => a.length);
      if (n < 6) fail(file, "бош саҳифада карточкалар кам: " + n);
    } else if (name === "prognoz") {
      await p.waitForSelector("#rustsum .rs-h", { timeout: 60000 }).catch(() => fail(file, "эрта бошланиш хулосаси чиқмади"));
      for (const m of ["f27", "g27"]) {
        const b = await p.$('.pbtn[data-m="' + m + '"]');
        if (!b) { fail(file, "режим тугмаси йўқ: " + m); continue; }
        await b.click();
        await p.waitForSelector("#rustsum .yc-t", { timeout: 30000 }).catch(() => fail(file, "«" + m + "» режимида вилоятлар жадвали чиқмади (forecast.json)"));
      }
    } else if (name === "mavsum" || name === "byulleten") {
      await p.waitForSelector("#report.ready", { timeout: 90000 }).catch(() => fail(file, "ҳисобот (#report) тайёр бўлмади"));
      const n = await p.$eval("#report", (e) => e.innerText.length).catch(() => 0);
      if (n < 400) fail(file, "ҳисобот бўш ёки жуда қисқа (" + n + " белги)");
      if (!(await p.$("#report table.rp-t"))) fail(file, "ҳисоботда жадвал йўқ");
    } else if (name === "zararkunandalar-xarita") {
      await p.waitForSelector("#uzmap svg", { timeout: 30000 }).catch(() => fail(file, "харита чизилмади"));
    } else if (name === "hisobot") {
      if (!(await p.$("#btn-compute"))) fail(file, "ҳисоблаш тугмаси йўқ");
    } else if (name === "aloqa") {
      if (!(await p.$("#message"))) fail(file, "алоқа шакли йўқ");
    }
    await p.waitForTimeout(1500);
  } catch (e) { fail(file, "текширишда хато: " + e.message); }
  errs.forEach((e) => fail(file, e));
  await ctx.close();
}

// телефон: ўзбекча саҳифалар, Pixel 7
async function checkPhone(browser, file) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  await ctx.addInitScript(([k, h]) => { try { localStorage.setItem(k, h); } catch (e) { /* */ } }, [KEY, HASH]);
  const p = await ctx.newPage();
  if (FAKE) await p.clock.setFixedTime(FAKE);
  const errs = [];
  p.on("pageerror", (e) => errs.push("JS: " + e.message));
  const tag = file + " (телефон)";
  await p.goto(BASE + file, { waitUntil: "load" });
  const name = file.replace(/\.html$/, "");
  try {
    if (MAP_PAGES.includes(name) || name === "zararkunandalar-xarita") {
      await p.waitForSelector("#legend.lg-out", { timeout: 45000 }).catch(() => fail(tag, "легенда харита остига чиқмади"));
      // легенда маълумот юклангач қайта чизилади — шуни кутиб, кўринадиган ёзувларнинг энг кичигини ўлчаймиз
      if (MAP_PAGES.includes(name)) await p.waitForSelector("#fenotime input[type=range]", { timeout: 45000 }).catch(() => {});
      await p.waitForTimeout(500);
      const fs = await p.evaluate(() => {
        const L = [...document.querySelectorAll("#legend .lg b")].filter((e) => e.getClientRects().length);
        return L.length ? Math.min.apply(null, L.map((e) => parseFloat(getComputedStyle(e).fontSize))) : -1;
      });
      if (process.env.DBG) console.log("DBG", tag, fs);
      if (!(fs >= 12)) fail(tag, fs < 0 ? "легендада кўринадиган ёзув йўқ" : "легенда ёзуви кичик: " + fs + "px");
    }
    if (MAP_PAGES.includes(name)) {
      const disp = await p.$eval(".feno-ctl .title", (e) => getComputedStyle(e).display).catch(() => "none");
      if (disp !== "none") fail(tag, "такрорий сарлавҳа телефонда кўринмоқда");
    }
    await p.waitForTimeout(1000);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 2) fail(tag, "саҳифа ён томонга " + over + "px чиқиб кетган");
    if (await p.$(".test-banner")) fail(tag, "«Тест режими» ёзуви қайтиб келган");
  } catch (e) { fail(tag, "текширишда хато: " + e.message); }
  errs.forEach((e) => fail(tag, e));
  await ctx.close();
}

async function checkGate(browser) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  if (FAKE) await p.clock.setFixedTime(FAKE);
  await p.goto(BASE + "index.html");
  if (!(await p.$("#auth-gate"))) fail("index.html", "киришсиз очилганда парол ойнаси чиқмади");
  else {
    await p.fill("#auth-user", "agrohimoya"); await p.fill("#auth-pass", "нотўғри-парол"); await p.click("#auth-btn");
    await p.waitForTimeout(400);
    if (!(await p.$("#auth-gate"))) fail("index.html", "нотўғри парол қабул қилинди");
  }
  await ctx.close();
}

(async () => {
  if (!HASH || !KEY) { console.error("auth.js дан хеш ёки калит топилмади"); process.exit(1); }
  let srv = null;
  if (!BASE) {
    srv = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
    BASE = "http://127.0.0.1:" + PORT + "/";
    if (!(await waitServer(BASE + "index.html", 15000))) { console.error("маҳаллий сервер ишга тушмади"); srv.kill(); process.exit(1); }
  } else if (!BASE.endsWith("/")) BASE += "/";
  if (!FAKE) try {
    const wx = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "wx.json"), "utf8"));
    const age = (Date.now() - Date.parse(wx.updated)) / 864e5;
    if (age > 3) warns.push("wx.json " + age.toFixed(1) + " кундан бери янгиланмаган (" + wx.updated + ")");
  } catch (e) { warns.push("wx.json ўқилмади: " + e.message); }
  const browser = await chromium.launch();
  const t0 = Date.now();
  try {
    await checkGate(browser);
    for (const f of PAGES) { const t = Date.now(); await checkPage(browser, f); console.log("  " + f.padEnd(32) + ((Date.now() - t) / 1000).toFixed(1) + " с"); }
    for (const f of PAGES.filter((x) => !x.includes(".ru."))) { const t = Date.now(); await checkPhone(browser, f); console.log("  " + (f + " 📱").padEnd(32) + ((Date.now() - t) / 1000).toFixed(1) + " с"); }
  } finally {
    await browser.close();
    if (srv) srv.kill();
  }
  warns.forEach((w) => console.log("⚠ " + w));
  if (fails.length) {
    console.log("\n✗ " + fails.length + " та хато:");
    fails.forEach((f) => console.log("  - " + f));
    process.exit(1);
  }
  console.log("\n✓ " + PAGES.length + " саҳифа + " + PAGES.length / 2 + " саҳифа телефонда текширилди, хато йўқ (" + ((Date.now() - t0) / 1000).toFixed(0) + " с)");
})().catch((e) => { console.error(e); process.exit(1); });
