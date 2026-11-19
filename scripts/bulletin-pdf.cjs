#!/usr/bin/env node
/* Ҳафталик бюллетен PDF: byulleten.html (ўзбекча) ва byulleten.ru.html маҳаллий серверда очилади (кириш калити
 * auth.js'дан), #report.ready кутилади ва A4 PDF ёзилади → plant-protection/byulleten/ЙЙЙЙ-ОО-КК.pdf (+ .ru.pdf),
 * latest.pdf, latest.ru.pdf; index.json — архив рўйхати (сайтдаги бюллетен саҳифаси ўқийди). Энг кўпи 60 та сақланади.
 *   node scripts/bulletin-pdf.cjs */
"use strict";
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "plant-protection");
const OUT = path.join(ROOT, "byulleten");
const PORT = 8133, BASE = "http://127.0.0.1:" + PORT + "/", KEEP = 60;
const auth = fs.readFileSync(path.join(ROOT, "js", "auth.js"), "utf8");
const HASH = (auth.match(/hash:\s*"([0-9a-f]{64})"/) || [])[1], KEY = (auth.match(/key:\s*"([^"]+)"/) || [])[1];

async function up(ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if ((await fetch(BASE + "index.html")).ok) return true; } catch (e) { /* */ } await new Promise((r) => setTimeout(r, 300)); }
  return false;
}

(async () => {
  if (!HASH || !KEY) throw new Error("auth.js: калит топилмади");
  const srv = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  try {
    if (!(await up(15000))) throw new Error("сервер ишга тушмади");
    const d = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); // Тошкент санаси
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    for (const [page, suf] of [["byulleten.html", ""], ["byulleten.ru.html", ".ru"]]) {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 1600 }, serviceWorkers: "block" });
      await ctx.addInitScript(([k, h]) => { try { localStorage.setItem(k, h); } catch (e) { /* */ } }, [KEY, HASH]);
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      await p.goto(BASE + page, { waitUntil: "load" });
      await p.waitForSelector("#report.ready", { timeout: 120000 });
      if (errs.length) throw new Error(page + ": " + errs.join(" | "));
      const txt = await p.$eval("#report", (e) => e.innerText);
      if (txt.length < 400) throw new Error(page + ": бюллетен бўш чиқди");
      await p.emulateMedia({ media: "print" });
      const file = path.join(OUT, d + suf + ".pdf");
      await p.pdf({ path: file, format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
      fs.copyFileSync(file, path.join(OUT, "latest" + suf + ".pdf"));
      console.log("→", path.relative(path.join(__dirname, ".."), file), Math.round(fs.statSync(file).size / 1024) + " КБ");
      await ctx.close();
    }
    await browser.close();
    // архив рўйхати ва эски файлларни тозалаш
    const files = fs.readdirSync(OUT).filter((f) => /^\d{4}-\d{2}-\d{2}\.pdf$/.test(f)).sort().reverse();
    files.slice(KEEP).forEach((f) => { fs.rmSync(path.join(OUT, f)); fs.rmSync(path.join(OUT, f.replace(".pdf", ".ru.pdf")), { force: true }); });
    const list = files.slice(0, KEEP).map((f) => ({ date: f.slice(0, 10), file: f, ru: f.replace(".pdf", ".ru.pdf") }));
    fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ updated: new Date().toISOString(), f: list }));
  } finally { srv.kill(); }
})().catch((e) => { console.error(e); process.exit(1); });
