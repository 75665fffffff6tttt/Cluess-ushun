#!/usr/bin/env node
/* Сайтнинг автоматик текшируви (smoke test): 14 саҳифа браузерда очилади ва асосий нарсалар текширилади.
 *   node tests/smoke.cjs            — plant-protection/ папкасини ўзи маҳаллий серверда очади
 *   BASE=https://... node tests/smoke.cjs — тайёр сайтни текшириш
 *   SITE_DIR=<папка> FAKE_DATE=2027-03-10 node tests/smoke.cjs — бошқа нусха ва сохта сана (tests/rollover.py билан)
 * Текширилади: JavaScript хатолари, очилмаган файллар (4xx/5xx), парол ойнаси, харита туманлари бўялгани,
 * сана сургичи, касаллик хулосаси, зараркунанда режимлари, бош саҳифа карточкалари.
 * Маълумот эскирганлиги (wx.json > 3 кун) — фақат огоҳлантириш, хато эмас.
 * Хато бўлса — чиқиш коди 1. */
"use strict";
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.join(__dirname, "..", "plant-protection");
const FAKE = process.env.FAKE_DATE ? new Date(process.env.FAKE_DATE + "T10:00:00+05:00") : null;
const PORT = 8123;
let BASE = process.env.BASE || "";
const HASH = (fs.readFileSync(path.join(ROOT, "js", "auth.js"), "utf8").match(/hash:\s*"([0-9a-f]{64})"/) || [])[1];
const KEY = (fs.readFileSync(path.join(ROOT, "js", "auth.js"), "utf8").match(/key:\s*"([^"]+)"/) || [])[1];

const MAP_PAGES = ["fenologik", "kasallik", "qongir-zang"];
const PAGES = ["index", "fenologik", "kasallik", "qongir-zang", "zararkunandalar-xarita", "hisobot", "aloqa"]
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
    if (MAP_PAGES.includes(name)) {
      await p.waitForFunction(() => {
        const ps = [...document.querySelectorAll("#uzmap path[data-i]")];
        return ps.length >= 199 && ps.filter((e) => !["#cfd8dc", "#e3e8ea", null].includes(e.getAttribute("fill"))).length >= 150;
      }, null, { timeout: 45000 }).catch(() => fail(file, "харита туманлари бўялмади (199 тадан камида 150)"));
      if (!(await p.$("#fenotime input[type=range]"))) fail(file, "сана сургичи йўқ");
      if (name !== "fenologik") {
        await p.waitForSelector("#rustsum .rs-chips", { timeout: 45000 }).catch(() => fail(file, "касаллик хулосаси (#rustsum) чиқмади"));
        await p.waitForFunction(() => [...document.querySelectorAll("path[data-n]")].some((e) => e.getAttribute("fill") !== "#e3e8ea"), null, { timeout: 45000 })
          .catch(() => fail(file, "қўшни давлатлар туманлари бўялмади"));
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
  console.log("\n✓ " + PAGES.length + " саҳифа текширилди, хато йўқ (" + ((Date.now() - t0) / 1000).toFixed(0) + " с)");
})().catch((e) => { console.error(e); process.exit(1); });
