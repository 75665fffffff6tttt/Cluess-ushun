/* Фенологик прогноз — ғўза зараркунандалари (GDD / эффектив ҳарорат йиғиндиси).
 * Геометрия: js/uz-districts.js; координаталар: js/uz-geo.js (geoBoundaries).
 * Ҳарорат: Open-Meteo (архив + прогноз), бепул, калитсиз.
 * ⚠️ Моделга асосланган тахминий прогноз — расмий мониторинг эмас. */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var map = document.getElementById("uzmap");
  if (!stage || !map || !window.UZ_DISTRICTS || !window.UZ_GEO) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";

  // GDD модель параметрлари (илмий адабиёт, ўртача қийматлар)
  var PESTS = LANG === "ru" ? [
    { id: "bollworm", nm: "Хлопковая совка", base: 10.5, upper: 35, gen: 500, winter: "куколка — в почве (5–10 см)", rec: "Глубокая зяблевая вспашка уничтожает зимующих куколок." },
    { id: "mite", nm: "Паутинный клещ", base: 11, upper: 40, gen: 110, winter: "оплодотворённые самки — под растительными остатками и корой", rec: "Удаление и измельчение растительных остатков хлопчатника." },
    { id: "cutworm", nm: "Озимая совка", base: 10, upper: 35, gen: 520, winter: "гусеницы и куколки — в почве", rec: "Глубокая вспашка и борьба с сорняками." },
    { id: "aphid", nm: "Тли", base: 6.5, upper: 35, gen: 90, winter: "яйца — на сорняках и побегах", rec: "Борьба с сорняками снижает запас зимующих яиц." }
  ] : [
    { id: "bollworm", nm: "Ғўза тунлами (кўсак қурти)", base: 10.5, upper: 35, gen: 500, winter: "ғумбак — тупроқда (5–10 см чуқурликда)", rec: "Кузги чуқур шудгор қишлаётган ғумбакларни нобуд қилади." },
    { id: "mite", nm: "Ўргимчаккана", base: 11, upper: 40, gen: 110, winter: "уруғланган урғочи — ўсимлик қолдиғи ва пўстлоқ остида", rec: "Ғўзапоя ва ўсимлик қолдиқларини йиғиштириш/майдалаш." },
    { id: "cutworm", nm: "Кузги тунлам", base: 10, upper: 35, gen: 520, winter: "катта ёшли қурт ва ғумбак — тупроқда", rec: "Кузги чуқур шудгор ва бегона ўтларни йўқотиш." },
    { id: "aphid", nm: "Ширалар", base: 6.5, upper: 35, gen: 90, winter: "тухум — бегона ўт ва новдаларда", rec: "Бегона ўтларни йўқотиш қишлаётган тухумни камайтиради." }
  ];
  var T = LANG === "ru" ? {
    title: "ФЕНОЛОГИЧЕСКИЙ ПРОГНОЗ", label: "Вредитель", region: "Область", districts: "районов",
    back: "← Вся страна", hint: "👆 Нажмите на район — область увеличится, и календарь покажет её поколения.",
    gen: "Поколение", gdd: "Накоплено ГДД", next: "Следующее поколение", progress: "до следующего",
    nodata: "нет данных", loading: "⏳ Расчёт по температуре…", err: "⚠️ Не удалось загрузить данные.",
    ended: "сезон завершён (диапауза)", approx: "≈ прогноз", src: "Модель ГДД · Open-Meteo",
    base: "порог", country: "В среднем по стране", today: "сегодня", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендарь — поколения за сезон", note: "⚠️ Модельная оценка (градусо-дни), не официальный мониторинг.",
    nowLabel: "Текущее состояние", phaseActive: "АКТИВНОЕ РАЗВИТИЕ", phaseDiapause: "ДИАПАУЗА (зимовка)",
    phasePre: "ЗИМОВКА — ожидается весеннее пробуждение", winterLabel: "Форма зимовки", recLabel: "Рекомендация",
    windowLabel: "Окно обработки", windowTxt: "перед яйцекладкой следующего поколения"
  } : {
    title: "ФЕНОЛОГИК ПРОГНОЗ", label: "Зараркунанда", region: "Вилоят", districts: "туман",
    back: "← Бутун мамлакат", hint: "👆 Туманни босинг — вилоят катталашиб, календарь ўша вилоят авлодларини кўрсатади.",
    gen: "Авлод", gdd: "Йиғилган GDD", next: "Кейинги авлод", progress: "кейингисигача",
    nodata: "маълумот йўқ", loading: "⏳ Ҳарорат бўйича ҳисоб…", err: "⚠️ Маълумот юкланмади.",
    ended: "мавсум якуни (диапауза)", approx: "≈ прогноз", src: "GDD модели · Open-Meteo",
    base: "ост-ҳарорат", country: "Республика ўртачаси", today: "бугун", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендар — мавсум давомидаги авлодлар", note: "⚠️ Моделга асосланган тахмин (эффектив ҳарорат), расмий мониторинг эмас.",
    nowLabel: "Бугунги ҳолат", phaseActive: "ФАОЛ РИВОЖЛАНИШ", phaseDiapause: "ДИАПАУЗА (қишлов)",
    phasePre: "ҚИШЛОВ — баҳорда уйғониш кутилмоқда", winterLabel: "Қишлаш шакли", recLabel: "Тавсия",
    windowLabel: "Ишлов бериш ойнаси", windowTxt: "навбатдаги авлод тухум қўйиши олдидан"
  };

  // авлод рақами → ранг (кўп авлод = кучли босим)
  var GENCOL = ["#d6dde2", "#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"];
  function genColor(g) { if (g == null || g < 1) return GENCOL[0]; return GENCOL[Math.min(g, GENCOL.length - 1)]; }

  var DATA = window.UZ_DISTRICTS, items = DATA.items, regions = DATA.regions, GEO = window.UZ_GEO;
  var regById = {}; regions.forEach(function (r) { regById[r.id] = r; });
  function rname(r) { return LANG === "ru" ? r.ru : r.c; }
  function dname(it) { return LANG === "ru" ? it.n : it.c; }

  // вилоят маркази = туманлар координаталари ўртачаси
  var regPt = {};
  (function () {
    var acc = {};
    items.forEach(function (it, i) { var g = GEO[i]; if (!g) return; (acc[it.r] = acc[it.r] || []).push(g); });
    Object.keys(acc).forEach(function (rid) { var a = acc[rid], la = 0, lo = 0; a.forEach(function (p) { la += p[0]; lo += p[1]; }); regPt[rid] = [la / a.length, lo / a.length]; });
  })();
  var regIds = regions.map(function (r) { return r.id; }).filter(function (id) { return regPt[id]; });

  var curPest = 0, curReg = null;
  var series = {};        // regionId -> [{t:Date, avg:°C}]
  var countrySeries = []; // республика ўртачаси
  var pheno = {};         // regionId -> {gdd,gen,progress,boundaries,next,ended}
  var countryPheno = null;
  var loadState = "loading", updatedAt = null;

  function centroid(d) {
    var nums = d.match(/-?\d+(?:\.\d+)?/g); if (!nums) return [0, 0];
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i + 1 < nums.length; i += 2) { sx += +nums[i]; sy += +nums[i + 1]; n++; }
    return [sx / n, sy / n];
  }
  items.forEach(function (it) { it.ctr = centroid(it.d); });

  stage.querySelector(".title") && (stage.querySelector(".title").textContent = T.title);

  var pestBox = document.getElementById("pestsel");
  if (pestBox) pestBox.innerHTML = PESTS.map(function (p, i) {
    return '<button class="pbtn' + (i === 0 ? ' on' : '') + '" data-p="' + i + '">' + p.nm + '</button>';
  }).join("");

  // SVG
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  var fullVB = DATA.viewBox;
  svg.setAttribute("viewBox", fullVB);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
  var paths = [];
  items.forEach(function (it, i) {
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", it.d); p.setAttribute("stroke", "#fff"); p.setAttribute("stroke-width", "0.5");
    p.setAttribute("data-i", i); svg.appendChild(p); paths.push(p);
  });
  var gl = document.createElementNS(ns, "g"); gl.setAttribute("id", "labels"); svg.appendChild(gl);
  map.appendChild(svg);
  var tip = document.getElementById("zktip");

  // ===== Zoom / Pan =====
  var base = fullVB.split(/\s+/).map(Number), vb = base.slice(), MINW = base[2] * 0.045;
  function applyVB() { svg.setAttribute("viewBox", vb.join(" ")); }
  function xform() { var r = svg.getBoundingClientRect(); var sc = Math.min(r.width / vb[2], r.height / vb[3]); return { r: r, sc: sc, ox: (r.width - vb[2] * sc) / 2, oy: (r.height - vb[3] * sc) / 2 }; }
  function toWorld(cx, cy) { var t = xform(); return [vb[0] + (cx - t.r.left - t.ox) / t.sc, vb[1] + (cy - t.r.top - t.oy) / t.sc]; }
  function clampVB() {
    if (vb[2] >= base[2] || vb[3] >= base[3]) { vb[0] = base[0]; vb[1] = base[1]; vb[2] = base[2]; vb[3] = base[3]; return; }
    if (vb[0] < base[0]) vb[0] = base[0]; if (vb[1] < base[1]) vb[1] = base[1];
    if (vb[0] + vb[2] > base[0] + base[2]) vb[0] = base[0] + base[2] - vb[2];
    if (vb[1] + vb[3] > base[1] + base[3]) vb[1] = base[1] + base[3] - vb[3];
  }
  function fitRegion(bb) { var s = Math.max(bb[2] / base[2], bb[3] / base[3]) * 1.12, w = base[2] * s, h = base[3] * s, cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2; return [cx - w / 2, cy - h / 2, w, h]; }
  function zoomAt(factor, cx, cy) {
    var world = toWorld(cx, cy), t = xform(), newW = vb[2] * factor;
    if (newW > base[2]) newW = base[2]; if (newW < MINW) newW = MINW;
    var newH = vb[3] * (newW / vb[2]), relX = cx - t.r.left, relY = cy - t.r.top;
    var nsc = Math.min(t.r.width / newW, t.r.height / newH), ox = (t.r.width - newW * nsc) / 2, oy = (t.r.height - newH * nsc) / 2;
    vb[0] = world[0] - (relX - ox) / nsc; vb[1] = world[1] - (relY - oy) / nsc; vb[2] = newW; vb[3] = newH; clampVB(); applyVB();
  }
  function panPx(dx, dy) { var t = xform(); vb[0] -= dx / t.sc; vb[1] -= dy / t.sc; clampVB(); applyVB(); }
  function zoomBtn(factor) { var cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2, newW = vb[2] * factor; if (newW > base[2]) newW = base[2]; if (newW < MINW) newW = MINW; var newH = vb[3] * (newW / vb[2]); vb[0] = cx - newW / 2; vb[1] = cy - newH / 2; vb[2] = newW; vb[3] = newH; clampVB(); applyVB(); }
  function tweenTo(tgt, ms) { var cur = vb.slice(), t0 = performance.now(); function step(now) { var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); vb = cur.map(function (c, i) { return c + (tgt[i] - c) * e; }); applyVB(); if (k < 1) requestAnimationFrame(step); else { clampVB(); applyVB(); } } requestAnimationFrame(step); }
  function resetView() { curReg = null; tweenTo(base.slice(), 450); paint(); updatePanel(); drawCal(); renderStatus(); }

  function pestOf() { return PESTS[curPest]; }
  function phenoOf(rid) { return pheno[rid]; }
  function curGen(rid) { var p = pheno[rid]; return p ? p.gen : null; }

  function paint() {
    for (var i = 0; i < items.length; i++) {
      var inReg = !curReg || items[i].r === curReg;
      paths[i].setAttribute("fill", genColor(curGen(items[i].r)));
      paths[i].setAttribute("opacity", inReg ? "1" : "0.12");
      paths[i].setAttribute("stroke-width", curReg && items[i].r === curReg ? "0.9" : "0.5");
    }
    gl.innerHTML = "";
    if (curReg) {
      var reg = regById[curReg], fs = Math.max(reg.bbox[2], reg.bbox[3]) / 42, g = curGen(curReg);
      items.forEach(function (it, i) {
        if (it.r !== curReg) return;
        var t = document.createElementNS(ns, "text");
        t.setAttribute("x", it.ctr[0]); t.setAttribute("y", it.ctr[1]); t.setAttribute("font-size", fs);
        t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", "#12240f"); t.setAttribute("stroke", "#fff");
        t.setAttribute("stroke-width", fs * 0.14); t.setAttribute("paint-order", "stroke");
        t.setAttribute("style", "font-weight:700;pointer-events:none");
        t.textContent = dname(it) + (g ? " " + g + (LANG === "ru" ? "п" : "а") : "");
        gl.appendChild(t);
      });
    }
  }

  function fmtDate(d) { if (!d) return "—"; return d.getDate() + "-" + T.months[d.getMonth()].toLowerCase(); }

  function updatePanel() {
    var pnl = document.getElementById("zkpanel"); if (!pnl) return;
    if (loadState === "loading") { pnl.innerHTML = '<div class="zkhint">' + T.loading + '</div>'; return; }
    if (loadState === "error") { pnl.innerHTML = '<div class="zkhint">' + T.err + '</div>'; return; }
    var ph = curReg ? pheno[curReg] : countryPheno;
    var head = curReg ? ('<b>' + rname(regById[curReg]) + '</b>') : ('<b>' + T.country + '</b>');
    var backBtn = curReg ? ('<button id="zkback" class="zkback">' + T.back + '</button>') : ('<div class="zkhint">' + T.hint + '</div>');
    if (!ph) { pnl.innerHTML = backBtn + '<div class="zkreg">' + head + '</div><div class="zkst"><b>' + T.nodata + '</b></div>'; if (curReg) document.getElementById("zkback").addEventListener("click", resetView); return; }
    var nextTxt = ph.ended ? T.ended : (ph.next ? fmtDate(ph.next) + (ph.approx ? " " + T.approx : "") : "—");
    pnl.innerHTML = backBtn +
      '<div class="zkreg">' + head + ' · <span style="color:' + genColor(ph.gen) + '">●</span> ' + T.gen + ': <b>' + ph.gen + '</b> (' + Math.round(ph.progress * 100) + '% ' + T.progress + ')</div>' +
      '<div class="zkst">' + T.gdd + ': <b>' + Math.round(ph.gdd) + '</b> °Д · ' + T.next + ': <b>' + nextTxt + '</b></div>';
    if (curReg) document.getElementById("zkback").addEventListener("click", resetView);
  }

  // ===== фенокалендар (саҳифа оқимида, стейдждан ташқари) =====
  function drawCal() {
    var box = document.getElementById("fenocal"); if (!box) return;
    if (loadState !== "ok") { box.innerHTML = '<div class="fc-empty">' + (loadState === "loading" ? T.loading : T.err) + '</div>'; return; }
    var rid = curReg, ph = rid ? pheno[rid] : countryPheno;
    var who = rid ? rname(regById[rid]) : T.country;
    if (!ph) { box.innerHTML = '<div class="fc-empty">' + who + ' — ' + T.nodata + '</div>'; return; }
    var y = (updatedAt || new Date()).getFullYear();
    var y0 = new Date(y, 0, 1).getTime(), y1 = new Date(y + 1, 0, 1).getTime(), span = y1 - y0;
    function pct(d) { return Math.max(0, Math.min(100, (d.getTime() - y0) / span * 100)); }
    // авлод сегментлари (чегаралар орасидаги оралиқ)
    var segs = "", bnds = ph.boundaries || [], prev = ph.seasonStart || null;
    var startPct = prev ? pct(prev) : (bnds.length ? pct(bnds[0].date) : 0);
    for (var k = 0; k < bnds.length; k++) {
      var s = k === 0 ? (prev ? pct(prev) : pct(bnds[0].date)) : pct(bnds[k - 1].date);
      var e = pct(bnds[k].date);
      segs += '<div class="fc-seg" style="left:' + s + '%;width:' + Math.max(0.6, e - s) + '%;background:' + genColor(k + 1) + '" title="' + T.gen + ' ' + (k + 1) + '"></div>';
    }
    // охирги (жорий) авлод сегменти — чегарадан бугунгача
    var lastStart = bnds.length ? pct(bnds[bnds.length - 1].date) : startPct;
    var nowPct = pct(updatedAt || new Date());
    if (nowPct > lastStart) segs += '<div class="fc-seg" style="left:' + lastStart + '%;width:' + Math.max(0.6, nowPct - lastStart) + '%;background:' + genColor(ph.gen) + '"></div>';
    // чегара белгилари
    var marks = bnds.map(function (b, k) { return '<div class="fc-mark" style="left:' + pct(b.date) + '%"><span>' + (k + 2) + '</span></div>'; }).join("");
    // ой ўқи
    var mticks = T.months.map(function (m, i) { return '<div class="fc-month" style="left:' + (i / 12 * 100) + '%">' + m + '</div>'; }).join("");
    var todayMark = '<div class="fc-today" style="left:' + nowPct + '%" title="' + T.today + '"></div>';
    box.innerHTML =
      '<div class="fc-head"><b>' + T.calTitle + '</b> · ' + who + ' · ' + pestOf().nm + ' <span class="fc-base">(' + T.base + ' +' + pestOf().base + '°C)</span></div>' +
      '<div class="fc-track">' + segs + marks + todayMark + '</div>' +
      '<div class="fc-axis">' + mticks + '</div>' +
      '<div class="fc-leg"><span>' + T.gen + ' 1 → ' + (ph.gen) + '</span> · <span class="fc-td">' + T.today + ': ' + fmtDate(updatedAt || new Date()) + '</span></div>' +
      '<div class="fc-note">' + T.note + ' · ' + T.src + (updatedAt ? ' · ' + updatedAt.toLocaleDateString(LANG === "ru" ? "ru-RU" : "ru-RU") : '') + '</div>';
  }

  // ===== Бугунги ҳолат (фаза + қишлаш шакли + тавсия) =====
  function renderStatus() {
    var box = document.getElementById("fenostat"); if (!box) return;
    if (loadState !== "ok") { box.style.display = "none"; return; }
    var ph = curReg ? pheno[curReg] : countryPheno;
    var who = curReg ? rname(regById[curReg]) : T.country, pest = pestOf();
    if (!ph) { box.style.display = "none"; return; }
    box.style.display = "";
    var now = updatedAt || new Date(), mon = now.getMonth(), cls, phase, body;
    if (!ph.ended) {
      cls = "active"; phase = T.phaseActive;
      var nextTxt = ph.next ? (fmtDate(ph.next) + (ph.approx ? " " + T.approx : "")) : "—";
      body = T.gen + ': <b>' + ph.gen + '</b> (' + Math.round(ph.progress * 100) + '% ' + T.progress + ') · ' + T.next + ': <b>' + nextTxt + '</b>' +
        '<div class="fn-rec"><b>' + T.windowLabel + ':</b> ' + T.windowTxt + '</div>';
    } else {
      var pre = (mon <= 3) && (ph.gdd < pest.gen * 0.5);
      cls = "diapause"; phase = pre ? T.phasePre : T.phaseDiapause;
      body = '<b>' + T.winterLabel + ':</b> ' + pest.winter +
        '<div class="fn-rec"><b>' + T.recLabel + ':</b> ' + pest.rec + '</div>';
    }
    box.innerHTML = '<div class="fn-head">' + T.nowLabel + ' · ' + who + ' · ' + pest.nm + '</div>' +
      '<div class="fn-phase ' + cls + '">' + phase + '</div>' +
      '<div class="fn-body">' + body + '</div>';
  }

  // ===== ҳодисалар =====
  function drill(i) { var rid = items[i].r; if (curReg !== rid) { curReg = rid; tweenTo(fitRegion(regById[rid].bbox), 500); paint(); updatePanel(); drawCal(); renderStatus(); } }
  function showTip(e) {
    var t = e.target;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), it = items[i], ph = pheno[it.r];
      var line = ph ? (T.gen + " " + ph.gen + " · " + Math.round(ph.gdd) + "°Д") : T.nodata;
      tip.innerHTML = "<b>" + dname(it) + "</b><br>" + rname(regById[it.r]) + "<br>" + line;
      tip.style.display = "block";
      var r = map.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left + 12) + "px"; tip.style.top = (e.clientY - r.top + 12) + "px";
    } else { tip.style.display = "none"; }
  }
  var ptrs = {}, pinchD = 0, panLast = null, downT = null, moved = 0;
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  svg.style.touchAction = "none";
  svg.addEventListener("pointerdown", function (e) {
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { panLast = { x: e.clientX, y: e.clientY }; downT = e.target; moved = 0; }
    else if (ids.length === 2) { pinchD = dist(ptrs[ids[0]], ptrs[ids[1]]); panLast = null; tip.style.display = "none"; }
  });
  svg.addEventListener("pointermove", function (e) {
    if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
    var ids = Object.keys(ptrs);
    if (ids.length >= 2) {
      tip.style.display = "none";
      var d = dist(ptrs[ids[0]], ptrs[ids[1]]);
      if (pinchD > 0 && d > 0) { var mx = (ptrs[ids[0]].x + ptrs[ids[1]].x) / 2, my = (ptrs[ids[0]].y + ptrs[ids[1]].y) / 2; zoomAt(pinchD / d, mx, my); }
      pinchD = d; return;
    }
    if (panLast && (e.buttons || e.pointerType === "touch")) {
      var dx = e.clientX - panLast.x, dy = e.clientY - panLast.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 4) { panPx(dx, dy); panLast = { x: e.clientX, y: e.clientY }; tip.style.display = "none"; return; }
    }
    showTip(e);
  });
  function endPtr(e) {
    if (downT && moved <= 4) { var t = e.target; if (t && t.tagName === "path" && t.hasAttribute("data-i")) drill(+t.getAttribute("data-i")); }
    delete ptrs[e.pointerId]; var n = Object.keys(ptrs).length;
    if (n < 2) pinchD = 0; if (n === 0) { panLast = null; downT = null; }
  }
  svg.addEventListener("pointerup", endPtr);
  svg.addEventListener("pointercancel", endPtr);
  svg.addEventListener("pointerleave", function () { tip.style.display = "none"; });
  svg.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.18 : 0.85, e.clientX, e.clientY); }, { passive: false });

  var zc = document.createElement("div"); zc.className = "zoomctl";
  zc.innerHTML = '<button type="button" data-z="in">+</button><button type="button" data-z="out">−</button><button type="button" data-z="reset">⟳</button>';
  map.appendChild(zc);
  zc.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var z = b.getAttribute("data-z"); if (z === "in") zoomBtn(0.72); else if (z === "out") zoomBtn(1.38); else resetView(); });

  if (pestBox) pestBox.addEventListener("click", function (e) {
    var b = e.target.closest(".pbtn"); if (!b) return;
    curPest = +b.getAttribute("data-p");
    [].forEach.call(pestBox.children, function (x) { x.classList.toggle("on", x === b); });
    recompute(); paint(); updatePanel(); drawCal(); renderStatus();
  });

  // ===== GDD ҳисоби =====
  function computePheno(ser, pest) {
    if (!ser || !ser.length) return null;
    var cum = 0, cumArr = [], now = (updatedAt || new Date());
    var span = pest.upper - pest.base;
    for (var i = 0; i < ser.length; i++) {
      var g = ser[i].avg - pest.base; if (g < 0) g = 0; if (g > span) g = span;
      cum += g; cumArr.push(cum);
    }
    // бугунги индекс
    var todayIdx = 0;
    for (var j = 0; j < ser.length; j++) { if (ser[j].t.getTime() <= now.getTime()) todayIdx = j; }
    var gddToday = cumArr[todayIdx];
    var gen = Math.floor(gddToday / pest.gen) + 1;
    var progress = (gddToday % pest.gen) / pest.gen;
    // авлод чегаралари (сана)
    var boundaries = [], k = 1;
    for (var m = 0; m < ser.length; m++) {
      while (cumArr[m] >= k * pest.gen) { boundaries.push({ k: k, date: ser[m].t }); k++; }
    }
    // кейинги авлод санаси
    var next = null, approx = false, ended = false;
    for (var b = 0; b < boundaries.length; b++) { if (boundaries[b].date.getTime() > now.getTime()) { next = boundaries[b].date; break; } }
    if (!next) {
      // сўнгги 14 кун ўртача GDD/кун
      var s = 0, c = 0;
      for (var q = Math.max(0, todayIdx - 13); q <= todayIdx; q++) { var gg = ser[q].avg - pest.base; if (gg < 0) gg = 0; if (gg > span) gg = span; s += gg; c++; }
      var daily = c ? s / c : 0;
      if (daily < 0.4) ended = true;
      else { var remain = pest.gen - (gddToday % pest.gen); var days = Math.ceil(remain / daily); next = new Date(now.getTime() + days * 86400000); approx = true; }
    }
    // мавсум боши (GDD биринчи 1°Д дан ошган кун)
    var seasonStart = null;
    for (var z = 0; z < cumArr.length; z++) { if (cumArr[z] >= 1) { seasonStart = ser[z].t; break; } }
    return { gdd: gddToday, gen: gen, progress: progress, boundaries: boundaries, next: next, approx: approx, ended: ended, seasonStart: seasonStart };
  }
  function recompute() {
    var pest = pestOf();
    pheno = {};
    regIds.forEach(function (rid) { pheno[rid] = computePheno(series[rid], pest); });
    countryPheno = computePheno(countrySeries, pest);
  }

  // ===== маълумот юклаш (Open-Meteo архив + прогноз) =====
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parseResp(data) { return Array.isArray(data) ? data : [data]; }
  function mergeInto(dst, resp) {
    // resp: {daily:{time[],temperature_2m_max[],temperature_2m_min[]}}
    var dl = resp && resp.daily; if (!dl || !dl.time) return;
    for (var i = 0; i < dl.time.length; i++) {
      var mx = dl.temperature_2m_max[i], mn = dl.temperature_2m_min[i];
      if (mx == null || mn == null) continue;
      dst[dl.time[i]] = (mx + mn) / 2;
    }
  }
  function buildSeries(maps) {
    // maps: regionId -> {date:avg}
    regIds.forEach(function (rid) {
      var m = maps[rid] || {}, keys = Object.keys(m).sort();
      series[rid] = keys.map(function (dstr) { return { t: new Date(dstr + "T00:00:00"), avg: m[dstr] }; });
    });
    // республика ўртачаси: сана бўйича вилоятлар ўртачаси
    var allDates = {};
    regIds.forEach(function (rid) { (series[rid] || []).forEach(function (p) { var dstr = iso(p.t); (allDates[dstr] = allDates[dstr] || []).push(p.avg); }); });
    countrySeries = Object.keys(allDates).sort().map(function (dstr) { var a = allDates[dstr], s = 0; a.forEach(function (v) { s += v; }); return { t: new Date(dstr + "T00:00:00"), avg: s / a.length }; });
  }
  function loadData() {
    loadState = "loading"; updatePanel(); drawCal(); renderStatus();
    var lat = regIds.map(function (rid) { return regPt[rid][0]; }).join(",");
    var lon = regIds.map(function (rid) { return regPt[rid][1]; }).join(",");
    var now = new Date(), y = now.getFullYear();
    var archEnd = new Date(now.getTime() - 6 * 86400000);
    var archUrl = "https://archive-api.open-meteo.com/v1/archive?latitude=" + lat + "&longitude=" + lon +
      "&start_date=" + y + "-01-01&end_date=" + iso(archEnd) + "&daily=temperature_2m_max,temperature_2m_min&timezone=auto";
    var fcUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&daily=temperature_2m_max,temperature_2m_min&past_days=10&forecast_days=16&timezone=auto";
    var maps = {}; regIds.forEach(function (rid) { maps[rid] = {}; });
    Promise.all([
      fetch(archUrl).then(function (r) { return r.json(); }),
      fetch(fcUrl).then(function (r) { return r.json(); })
    ]).then(function (res) {
      [res[0], res[1]].forEach(function (data) {
        var arr = parseResp(data);
        arr.forEach(function (d, k) { var rid = regIds[k]; if (rid) mergeInto(maps[rid], d); });
      });
      buildSeries(maps);
      updatedAt = new Date(); loadState = "ok";
      recompute(); paint(); updatePanel(); drawCal(); renderStatus();
    }).catch(function () { loadState = "error"; updatePanel(); drawCal(); renderStatus(); });
  }

  paint(); updatePanel(); drawCal(); renderStatus(); loadData();

  var wrap = stage.parentElement;
  function fit() { var w = wrap.clientWidth, s = w / 1080; stage.style.transform = "scale(" + s + ")"; wrap.style.height = (1080 * s) + "px"; }
  fit(); window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
