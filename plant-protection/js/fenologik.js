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
    nodata: "нет данных", loading: "⏳ Расчёт по температуре…", wxPending: "⏳ Данные о температуре готовятся (первый сбор ~2 часа). Обновите страницу позже.", err: "⚠️ Не удалось загрузить данные.",
    ended: "сезон завершён (диапауза)", approx: "≈ прогноз", src: "Модель ГДД (синус-метод) · Open-Meteo · посевы: ESA WorldCover",
    base: "порог", country: "В среднем по стране", today: "сегодня", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендарь — поколения за сезон", note: "⚠️ Модельная оценка (градусо-дни), не официальный мониторинг.",
    nowLabel: "Текущее состояние", phaseActive: "АКТИВНОЕ РАЗВИТИЕ", phaseDiapause: "ДИАПАУЗА (зимовка)",
    phasePre: "ЗИМОВКА — ожидается весеннее пробуждение", winterLabel: "Форма зимовки", recLabel: "Рекомендация",
    windowLabel: "Окно обработки", windowTxt: "перед яйцекладкой следующего поколения",
    sumTitle: "Заключение", sumUnit: "р-нов", sumActive: "Активное развитие", sumDiap: "Зимовка (диапауза)",
    sumMaxGen: "Макс. поколений", sumAvgGen: "В среднем", sumTop: "Наибольшее давление", desertTip: "🏜 Пустыня — посевов нет, прогноз не даётся", nocropTip: "Посевов нет (степь/горы) — прогноз не даётся", sumNoFc: "Без прогноза (пустыня/нет посевов)",
    sumOverLead: "Сезон в основном завершён", sumActiveLead: "Вредитель ещё активен",
    sumOverTxt: "из {N} районов {E} перешли в диапаузу (зимовку). За сезон накоплено до {G} поколений.",
    sumActiveTxt: "в {A} районах идёт активное развитие (до {G} поколений). Проведите обработку перед яйцекладкой следующего поколения.",
    sumToGen: "до {G} поколений"
  } : {
    title: "ФЕНОЛОГИК ПРОГНОЗ", label: "Зараркунанда", region: "Вилоят", districts: "туман",
    back: "← Бутун мамлакат", hint: "👆 Туманни босинг — вилоят катталашиб, календарь ўша вилоят авлодларини кўрсатади.",
    gen: "Авлод", gdd: "Йиғилган GDD", next: "Кейинги авлод", progress: "кейингисигача",
    nodata: "маълумот йўқ", loading: "⏳ Ҳарорат бўйича ҳисоб…", wxPending: "⏳ Ҳарорат маълумоти тайёрланмоқда (биринчи йиғиш ~2 соат). Бироздан сўнг саҳифани янгиланг.", err: "⚠️ Маълумот юкланмади.",
    ended: "мавсум якуни (диапауза)", approx: "≈ прогноз", src: "GDD модели (синус усули) · Open-Meteo · экин майдонлари: ESA WorldCover",
    base: "ост-ҳарорат", country: "Республика ўртачаси", today: "бугун", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендар — мавсум давомидаги авлодлар", note: "⚠️ Моделга асосланган тахмин (эффектив ҳарорат), расмий мониторинг эмас.",
    nowLabel: "Бугунги ҳолат", phaseActive: "ФАОЛ РИВОЖЛАНИШ", phaseDiapause: "ДИАПАУЗА (қишлов)",
    phasePre: "ҚИШЛОВ — баҳорда уйғониш кутилмоқда", winterLabel: "Қишлаш шакли", recLabel: "Тавсия",
    windowLabel: "Ишлов бериш ойнаси", windowTxt: "навбатдаги авлод тухум қўйиши олдидан",
    sumTitle: "Хулоса", sumUnit: "туман", sumActive: "Фаол ривожланиш", sumDiap: "Қишлов (диапауза)",
    sumMaxGen: "Энг кўп авлод", sumAvgGen: "Ўртача", sumTop: "Энг юқори босим", desertTip: "🏜 Чўл — экин майдони йўқ, прогноз берилмайди", nocropTip: "Экин майдони йўқ (дашт/тоғ) — прогноз берилмайди", sumNoFc: "Прогноз берилмади (чўл/экин майдони йўқ)",
    sumOverLead: "Мавсум асосан якунланди", sumActiveLead: "Зараркунанда ҳали фаол",
    sumOverTxt: "{N} тумандан {E} таси диапаузага (қишловга) ўтган. Мавсум давомида {G} авлодгача ривожланган.",
    sumActiveTxt: "{A} туманда фаол ривожланиш кетмоқда ({G} авлодгача). Навбатдаги авлод тухум қўйишидан олдин ишлов беринг.",
    sumToGen: "{G} авлодгача"
  };

  // авлод рақами → ранг (кўп авлод = кучли босим)
  var GENCOL = ["#d6dde2", "#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"];
  var DIA_COL = "#90a4ae"; // диапауза (қишлов) — нейтрал кулранг-кўк, фаол эмас (хавфсиз эмас!)
  var DESERT_COL = "#ead9b0"; // чўл / экин майдони йўқ — прогноз йўқ (ESA WorldCover)
  var zoneD = {}, zoneN = {}; // туман → "desert" | "nocrop" (data/wx-points.json)
  function genColor(g) { if (g == null || g < 1) return GENCOL[0]; return GENCOL[Math.min(g, GENCOL.length - 1)]; }
  function fillFor(i) { if (zoneD[i]) return DESERT_COL; var ph = dpheno[i]; if (!ph) return GENCOL[0]; return ph.ended ? DIA_COL : genColor(ph.gen); }

  var DATA = window.UZ_DISTRICTS, items = DATA.items, regions = DATA.regions, GEO = window.UZ_GEO;
  var regById = {}; regions.forEach(function (r) { regById[r.id] = r; });
  function rname(r) { return LANG === "ru" ? r.ru : r.c; }
  function dname(it) { return LANG === "ru" ? it.n : it.c; }

  // туман индекслари (координатаси бор) ва вилоят → туманлар
  var dIdx = [];
  GEO.forEach(function (g, i) { if (g) dIdx.push(i); });
  var regDistricts = {};
  items.forEach(function (it, i) { if (GEO[i]) (regDistricts[it.r] = regDistricts[it.r] || []).push(i); });
  var regIds = regions.map(function (r) { return r.id; }).filter(function (id) { return regDistricts[id] && regDistricts[id].length; });

  var curPest = 0, curReg = null;
  var dseries = {}, dpheno = {};     // туман (индекс) бўйича: серия ва фенология
  var regSeries = {}, regPheno = {}; // вилоят ўртачаси
  var countrySeries = [], countryPheno = null;
  var loadState = "loading", updatedAt = null, wxPending = false;

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
  // қўшни давлатлар туманлари — Ўзбекистон остида (пунктир)
  var gN = document.createElementNS(ns, "g"); gN.setAttribute("id", "nb"); svg.insertBefore(gN, svg.firstChild);
  var NB = [], npaths = [], nseries = {}, npheno = {};
  var PX0 = 55.9987, PY0 = 45.5901, PS = 58.3397; // uz-districts.js проекцияси (lon/lat → SVG)
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
  function resetView() { curReg = null; tweenTo(base.slice(), 450); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); }

  function pestOf() { return PESTS[curPest]; }

  function paint() {
    for (var i = 0; i < items.length; i++) {
      var inReg = !curReg || items[i].r === curReg;
      paths[i].setAttribute("fill", fillFor(i));
      paths[i].setAttribute("opacity", inReg ? "1" : "0.12");
      paths[i].setAttribute("stroke-width", curReg && items[i].r === curReg ? "0.9" : "0.5");
    }
    for (var k = 0; k < npaths.length; k++) {
      var nph = npheno[k];
      npaths[k].setAttribute("fill", zoneN[k] ? DESERT_COL : (nph ? (nph.ended ? DIA_COL : genColor(nph.gen)) : "#e3e8ea"));
      npaths[k].setAttribute("opacity", curReg ? "0.12" : "0.55");
    }
    gl.innerHTML = "";
    if (curReg) {
      var reg = regById[curReg], fs = Math.max(reg.bbox[2], reg.bbox[3]) / 42;
      items.forEach(function (it, i) {
        if (it.r !== curReg) return;
        var ph = dpheno[i], g = ph ? ph.gen : null, dia = ph && ph.ended;
        var t = document.createElementNS(ns, "text");
        t.setAttribute("x", it.ctr[0]); t.setAttribute("y", it.ctr[1]); t.setAttribute("font-size", fs);
        t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", "#12240f"); t.setAttribute("stroke", "#fff");
        t.setAttribute("stroke-width", fs * 0.14); t.setAttribute("paint-order", "stroke");
        t.setAttribute("style", "font-weight:700;pointer-events:none");
        t.textContent = dname(it) + (zoneD[i] ? " 🏜" : (dia ? " ❄" : (g ? " " + g + (LANG === "ru" ? "п" : "а") : "")));
        gl.appendChild(t);
      });
    }
  }

  function fmtDate(d) { if (!d) return "—"; return d.getDate() + "-" + T.months[d.getMonth()].toLowerCase(); }

  function updatePanel() {
    var pnl = document.getElementById("zkpanel"); if (!pnl) return;
    if (loadState === "loading") { pnl.innerHTML = '<div class="zkhint">' + T.loading + '</div>'; return; }
    if (loadState === "error") { pnl.innerHTML = '<div class="zkhint">' + (wxPending ? T.wxPending : T.err) + '</div>'; return; }
    var ph = curReg ? regPheno[curReg] : countryPheno;
    var head = curReg ? ('<b>' + rname(regById[curReg]) + '</b>') : ('<b>' + T.country + '</b>');
    var backBtn = curReg ? ('<button id="zkback" class="zkback">' + T.back + '</button>') : ('<div class="zkhint">' + T.hint + '</div>');
    if (!ph) { pnl.innerHTML = backBtn + '<div class="zkreg">' + head + '</div><div class="zkst"><b>' + T.nodata + '</b></div>'; if (curReg) document.getElementById("zkback").addEventListener("click", resetView); return; }
    var nextTxt = ph.ended ? T.ended : (ph.next ? fmtDate(ph.next) + (ph.approx ? " " + T.approx : "") : "—");
    pnl.innerHTML = backBtn +
      '<div class="zkreg">' + head + ' · <span style="color:' + (ph.ended ? DIA_COL : genColor(ph.gen)) + '">●</span> ' + T.gen + ': <b>' + ph.gen + '</b> (' + Math.round(ph.progress * 100) + '% ' + T.progress + ')</div>' +
      '<div class="zkst">' + T.gdd + ': <b>' + Math.round(ph.gdd) + '</b> °Д · ' + T.next + ': <b>' + nextTxt + '</b></div>';
    if (curReg) document.getElementById("zkback").addEventListener("click", resetView);
  }

  // ===== фенокалендар (саҳифа оқимида, стейдждан ташқари) =====
  function drawCal() {
    var box = document.getElementById("fenocal"); if (!box) return;
    if (loadState !== "ok") { box.innerHTML = '<div class="fc-empty">' + (loadState === "loading" ? T.loading : T.err) + '</div>'; return; }
    var rid = curReg, ph = rid ? regPheno[rid] : countryPheno;
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
    var ph = curReg ? regPheno[curReg] : countryPheno;
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

  // ===== Хулоса (бутун мамлакат бўйича синтез) =====
  function renderSummary() {
    var box = document.getElementById("fenosum"); if (!box) return;
    if (loadState !== "ok") { box.style.display = "none"; return; }
    var pest = pestOf();
    var withData = 0, ended = 0, active = 0, genSum = 0, genMax = 0, regGenMax = {};
    dIdx.forEach(function (i) {
      var ph = dpheno[i]; if (!ph) return;
      withData++; if (ph.ended) ended++; else active++;
      var g = ph.gen || 0; genSum += g; if (g > genMax) genMax = g;
      var rid = items[i].r; if (!(rid in regGenMax) || g > regGenMax[rid]) regGenMax[rid] = g;
    });
    if (!withData) { box.style.display = "none"; return; }
    box.style.display = "";
    var avgTxt = Math.round((genSum / withData) * 10) / 10;
    var over = ended >= active;
    var topRegs = Object.keys(regGenMax).filter(function (r) { return regGenMax[r] === genMax; })
      .map(function (r) { return rname(regById[r]); });
    if (topRegs.length > 3) topRegs = topRegs.slice(0, 3).concat(["…"]);
    function fill(s) { return s.replace("{N}", withData).replace("{E}", ended).replace("{A}", active).replace("{G}", genMax); }
    function stat(lbl, val, col) {
      return '<div class="fs-stat"><div class="fs-v"' + (col ? ' style="color:' + col + '"' : '') + '>' + val + '</div><div class="fs-l">' + lbl + '</div></div>';
    }
    box.innerHTML =
      '<div class="fn-head">' + T.sumTitle + ' · ' + pest.nm + ' · ' + withData + ' ' + T.sumUnit + '</div>' +
      '<div class="fn-phase ' + (over ? "diapause" : "active") + '">' + (over ? T.sumOverLead : T.sumActiveLead) + '</div>' +
      '<div class="fs-grid">' +
        stat(T.sumActive, active, "#1b5e20") +
        stat(T.sumDiap, ended, "#546e7a") +
        stat(T.sumMaxGen, genMax, genColor(genMax)) +
        stat(T.sumAvgGen, avgTxt, null) +
      '</div>' +
      '<div class="fn-body">' + (over ? fill(T.sumOverTxt) : fill(T.sumActiveTxt)) +
        '<div class="fn-rec"><b>' + T.sumTop + ':</b> ' + (topRegs.join(", ") || "—") + '</div>' +
        (Object.keys(zoneD).length ? '<div class="fn-rec"><b>' + T.sumNoFc + ':</b> ' + Object.keys(zoneD).map(function (i) { return dname(items[i]); }).join(", ") + '</div>' : '') +
        (over ? '<div class="fn-rec"><b>' + T.recLabel + ':</b> ' + pest.rec + '</div>' : '') +
      '</div>' +
      '<div class="fc-note">' + T.note + ' · ' + T.src + '</div>';
  }

  // ===== ҳодисалар =====
  function drill(i) { var rid = items[i].r; if (curReg !== rid) { curReg = rid; tweenTo(fitRegion(regById[rid].bbox), 500); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); } }
  function phLine(ph) { return ph ? (ph.ended ? "❄ " + T.phaseDiapause : (T.gen + " " + ph.gen + " · " + Math.round(ph.gdd) + "°Д")) : (loadState === "loading" ? T.loading : T.nodata); }
  function showTip(e) {
    var t = e.target, html = null;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), it = items[i];
      html = "<b>" + dname(it) + "</b><br>" + rname(regById[it.r]) + "<br>" + (zoneD[i] ? T[zoneD[i] + "Tip"] : phLine(dpheno[i]));
    } else if (t && t.tagName === "path" && t.hasAttribute("data-n")) {
      var k = +t.getAttribute("data-n"), n = NB[k];
      html = (n.nm ? "<b>" + n.nm + "</b><br>" : "") + n.cn + "<br>" + (zoneN[k] ? T[zoneN[k] + "Tip"] : phLine(npheno[k]));
    }
    if (html) {
      tip.innerHTML = html;
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
    recompute(); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary();
  });

  // ===== GDD ҳисоби (Baskerville–Emin СИНУС усули + юқори чегара) =====
  // Кунлик ҳароратни синус эгри деб олиб, LT–UT оралиғидаги градус-кунни ҳисоблайди.
  function ddAbove(tmin, tmax, TH) {
    if (tmax <= TH) return 0;
    var avg = (tmax + tmin) / 2, amp = (tmax - tmin) / 2;
    if (tmin >= TH) return avg - TH;          // бутун эгри чегарадан юқори
    if (amp < 1e-9) return 0;
    var r = (TH - avg) / amp; if (r > 1) r = 1; if (r < -1) r = -1;
    var theta = Math.asin(r);                  // [-π/2, π/2]
    return ((avg - TH) * (Math.PI / 2 - theta) + amp * Math.cos(theta)) / Math.PI;
  }
  // горизонтал юқори чегара: UT устидаги иссиқликни чиқариб ташлаш
  function sineDD(tmin, tmax, LT, UT) {
    if (tmax < tmin) { var t = tmax; tmax = tmin; tmin = t; }
    var dd = ddAbove(tmin, tmax, LT) - ddAbove(tmin, tmax, UT);
    return dd > 0 ? dd : 0;
  }
  function computePheno(ser, pest) {
    if (!ser || !ser.length) return null;
    var cum = 0, cumArr = [], now = (updatedAt || new Date());
    for (var i = 0; i < ser.length; i++) {
      cum += sineDD(ser[i].mn, ser[i].mx, pest.base, pest.upper); cumArr.push(cum);
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
      // сўнгги 14 кун: ўртача ҳарорат ва ўртача GDD/кун
      var mt = 0, s = 0, c = 0;
      for (var q = Math.max(0, todayIdx - 13); q <= todayIdx; q++) { mt += (ser[q].mx + ser[q].mn) / 2; s += sineDD(ser[q].mn, ser[q].mx, pest.base, pest.upper); c++; }
      var meanT = c ? mt / c : 0, daily = c ? s / c : 0;
      // диапауза: ўртача ҳарорат ост-ҳароратдан паст ёки ривожланиш деярли тўхтаган
      if (meanT < pest.base || daily < 0.5) ended = true;
      else {
        var remain = pest.gen - (gddToday % pest.gen), days = Math.ceil(remain / daily);
        if (days > 45) ended = true;        // 45 кундан узоқ — мавсум тугамоқда
        else { next = new Date(now.getTime() + days * 86400000); approx = true; }
      }
    }
    // мавсум боши (GDD биринчи 1°Д дан ошган кун)
    var seasonStart = null;
    for (var z = 0; z < cumArr.length; z++) { if (cumArr[z] >= 1) { seasonStart = ser[z].t; break; } }
    return { gdd: gddToday, gen: gen, progress: progress, boundaries: boundaries, next: next, approx: approx, ended: ended, seasonStart: seasonStart };
  }
  function recompute() {
    var pest = pestOf();
    dpheno = {};
    dIdx.forEach(function (i) { dpheno[i] = computePheno(dseries[i], pest); });
    regPheno = {};
    regIds.forEach(function (rid) { regPheno[rid] = computePheno(regSeries[rid], pest); });
    countryPheno = computePheno(countrySeries, pest);
    npheno = {};
    NB.forEach(function (n, k) { npheno[k] = computePheno(nseries[k], pest); });
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
      dst[dl.time[i]] = { mx: mx, mn: mn };
    }
  }
  function avgByDate(list) {
    // list: массив {t,mx,mn} элементлари → сана бўйича ўртача
    var by = {};
    list.forEach(function (p) { var ds = iso(p.t); (by[ds] = by[ds] || []).push(p); });
    return Object.keys(by).sort().map(function (ds) {
      var a = by[ds], smx = 0, smn = 0;
      a.forEach(function (v) { smx += v.mx; smn += v.mn; });
      return { t: new Date(ds + "T00:00:00"), mx: smx / a.length, mn: smn / a.length };
    });
  }
  function buildSeries(maps) {
    // maps: туман индекс -> {date:{mx,mn}}
    dseries = {};
    dIdx.forEach(function (i) {
      var m = maps[i] || {}, keys = Object.keys(m).sort();
      dseries[i] = keys.map(function (dstr) { return { t: new Date(dstr + "T00:00:00"), mx: m[dstr].mx, mn: m[dstr].mn }; });
    });
    // вилоят ўртачаси ва республика ўртачаси (сана бўйича)
    regSeries = {};
    regIds.forEach(function (rid) {
      var all = []; (regDistricts[rid] || []).forEach(function (i) { all = all.concat(dseries[i] || []); });
      regSeries[rid] = avgByDate(all);
    });
    var allD = [];
    dIdx.forEach(function (i) { allD = allD.concat(dseries[i] || []); });
    countrySeries = avgByDate(allD);
  }
  // ===== қўшни давлатлар туманлари (data/uz-neighbors.geojson → SVG проекция) =====
  function pj(lon, lat) { return [(lon - PX0) * PS, (PY0 - lat) * PS]; }
  function ringArea(r) { var a = 0; for (var i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; }
  function ringCtr(r) { var a = 0, cx = 0, cy = 0; for (var i = 0, j = r.length - 1; i < r.length; j = i++) { var f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f; } a /= 2; if (Math.abs(a) < 1e-12) return r[0]; return [cx / (6 * a), cy / (6 * a)]; }
  function loadNeighbors() {
    return fetch("data/uz-neighbors.geojson?v=4").then(function (r) { return r.json(); }).then(function (gj) {
      var mnx = 0, mny = 0, mxx = base[2], mxy = base[3];
      (gj.features || []).forEach(function (f, fi) {
        var g = f.geometry, p = f.properties || {}; if (!g) return;
        var polys = g.type === "Polygon" ? [g.coordinates] : (g.type === "MultiPolygon" ? g.coordinates : []);
        var d = "", best = null, bestA = -1;
        polys.forEach(function (poly) {
          var a0 = Math.abs(ringArea(poly[0])); if (a0 > bestA) { bestA = a0; best = poly[0]; }
          poly.forEach(function (ring) {
            var out = [], last = null;
            ring.forEach(function (c) {
              var q = pj(c[0], c[1]);
              if (last && Math.abs(q[0] - last[0]) + Math.abs(q[1] - last[1]) < 0.6) return;
              out.push(q[0].toFixed(1) + "," + q[1].toFixed(1)); last = q;
              if (q[0] < mnx) mnx = q[0]; if (q[1] < mny) mny = q[1]; if (q[0] > mxx) mxx = q[0]; if (q[1] > mxy) mxy = q[1];
            });
            if (out.length > 2) d += "M" + out.join(" ") + "Z";
          });
        });
        if (!d || !best) return;
        var ll = ringCtr(best), k = NB.length;
        NB.push({ nm: LANG === "ru" ? (p.ru || p.c) : (p.c || p.ru), cn: LANG === "ru" ? (p.regru || p.reg) : (p.reg || p.regru), ll: [ll[1], ll[0]], fi: fi });
        var el = document.createElementNS(ns, "path");
        el.setAttribute("d", d); el.setAttribute("fill-rule", "evenodd"); el.setAttribute("fill", "#e3e8ea");
        el.setAttribute("stroke", "#607d8b"); el.setAttribute("stroke-width", "0.45"); el.setAttribute("stroke-dasharray", "2.2,1.6");
        el.setAttribute("data-n", k); gN.appendChild(el); npaths.push(el);
      });
      // кўриниш чегараси — қўшни туманларни ҳам қамраб олади
      var pad = 8;
      base = [Math.floor(mnx - pad), Math.floor(mny - pad), Math.ceil(mxx - mnx + 2 * pad), Math.ceil(mxy - mny + 2 * pad)];
      vb = base.slice(); MINW = base[2] * 0.035; applyVB(); paint();
      // Ўзбекистон давлат чегараси — ингичка тўқ контур (фарқлаш учун)
      return fetch("data/uz-border.geojson?v=1").then(function (r) { return r.json(); }).then(function (bg) {
        var d = "";
        (bg.features || []).forEach(function (f) {
          var g = f.geometry; if (!g) return;
          var polys = g.type === "Polygon" ? [g.coordinates] : (g.type === "MultiPolygon" ? g.coordinates : []);
          polys.forEach(function (poly) { poly.forEach(function (ring) { d += "M" + ring.map(function (c) { var q = pj(c[0], c[1]); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ") + "Z"; }); });
        });
        if (!d) return;
        var bl = document.createElementNS(ns, "path");
        bl.setAttribute("d", d); bl.setAttribute("fill", "none"); bl.setAttribute("stroke", "#263238");
        bl.setAttribute("stroke-width", "1.3"); bl.setAttribute("stroke-linejoin", "round"); bl.setAttribute("opacity", "0.8");
        bl.setAttribute("style", "pointer-events:none"); bl.setAttribute("id", "uzborder"); svg.insertBefore(bl, svg.querySelector("#desertlayer") ? svg.querySelector("#desertlayer").nextSibling : gl);
      });
    }).catch(function () {});
  }

  // ===== ҳарорат: data/wx.json — GitHub Actions ҳар куни тайёрлайди (scripts/update-weather.py).
  // Браузер Open-Meteo'ни умуман чақирмайди → бепул лимит тугамайди.
  try { ["feno_temps_v1", "feno_temps_v2"].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  function snapC(v) { return Math.round(v * 4) / 4; }
  function wxCell(W, lat, lon) { // 0.25° катак (топилмаса — энг яқин қўшни катак)
    var la = snapC(lat), lo = snapC(lon), best = null, bd = 1e9;
    for (var a = -2; a <= 2; a++) for (var b = -2; b <= 2; b++) {
      var c = W.cells[(la + a * 0.25).toFixed(2) + "," + (lo + b * 0.25).toFixed(2)];
      if (c && a * a + b * b < bd) { bd = a * a + b * b; best = c; }
    }
    return best;
  }
  // туман ичидаги бир нечта нуқта (data/wx-points.json) ҳароратининг ўртачаси;
  // улар ҳали тайёр бўлмаса — туман марказининг катаги
  // очиқ чўл қатлами (ESA WorldCover, data/desert-mask.png) — барча зараркунандалар учун
  // туман ранглари устидан қумранг; тултиплар ишлайверади (pointer-events:none)
  function addDesertLayer(X) {
    var m = X && X.desertMask; if (!m || svg.querySelector("#desertlayer")) return;
    var im = document.createElementNS(ns, "image");
    im.setAttribute("id", "desertlayer"); im.setAttribute("href", m.png + "?v=1");
    im.setAttribute("x", (m.w - PX0) * PS); im.setAttribute("y", (PY0 - m.n) * PS);
    im.setAttribute("width", (m.e - m.w) * PS); im.setAttribute("height", (m.n - m.s) * PS);
    im.setAttribute("preserveAspectRatio", "none"); im.setAttribute("style", "pointer-events:none");
    var b = svg.querySelector("#uzborder"); svg.insertBefore(im, b || gl);
  }
  // ҳарорат: туманнинг ЭКИН МАЙДОНИ тушган катаклари, экин юзасига мутаносиб вазн билан
  // (data/wx-points.json, scripts/build-landcover.py — ESA WorldCover). Чўл / экин йўқ туман —
  // прогноз берилмайди. Катаклар ҳали тайёр бўлмаса — туман марказининг катаги.
  function wxMaps(W, pts, X) {
    var p0 = W.start.split("-").map(Number), maps = {}, dates = [];
    for (var d = 0; d < W.days; d++) dates.push(iso(new Date(p0[0], p0[1] - 1, p0[2] + d)));
    zoneD = {}; zoneN = {};
    pts.forEach(function (p) {
      var e = X && X.d && X.d[p.pk], list = [], m = {};
      if (e && !Array.isArray(e) && !e.c && (e.zone === "desert" || e.zone === "nocrop")) {
        if (typeof p.key === "number") zoneD[p.key] = e.zone; else zoneN[+String(p.key).slice(1)] = e.zone;
        maps[p.key] = m; return;
      }
      var ks = !e ? [] : (Array.isArray(e) ? e.map(function (k) { return [k, 1]; }) : e.c);
      ks.forEach(function (kw) { var c = W.cells[kw[0]]; if (c && c[0] != null) list.push([c, kw[1]]); }); // 1-январдан тўлиқ катаклар
      if (!list.length) { var c0 = wxCell(W, p.lat, p.lon); if (c0 && c0[0] != null) list.push([c0, 1]); }
      for (var d = 0; d < W.days; d++) {
        var sx = 0, sn = 0, sw = 0;
        for (var j = 0; j < list.length; j++) { var c = list[j][0], w = list[j][1], mx = c[2 * d], mn = c[2 * d + 1]; if (mx != null && mn != null) { sx += w * mx; sn += w * mn; sw += w; } }
        if (sw > 0) m[dates[d]] = { mx: sx / sw / 10, mn: sn / sw / 10 };
      }
      maps[p.key] = m;
    });
    return maps;
  }
  function finish(maps) {
    buildSeries(maps);
    nseries = {};
    NB.forEach(function (n, k) { var m = maps["n" + k] || {}, keys = Object.keys(m).sort(); nseries[k] = keys.map(function (ds) { return { t: new Date(ds + "T00:00:00"), mx: m[ds].mx, mn: m[ds].mn }; }); });
    var have = dIdx.filter(function (i) { return dseries[i] && dseries[i].length; }).length;
    updatedAt = new Date(); loadState = have ? "ok" : "error";
    recompute(); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary();
  }
  function loadData() {
    loadState = "loading"; updatePanel(); drawCal(); renderStatus(); renderSummary();
    var pts = dIdx.map(function (i) { return { key: i, pk: String(i), lat: GEO[i][0], lon: GEO[i][1] }; })
      .concat(NB.map(function (n, k) { return { key: "n" + k, pk: "n" + n.fi, lat: n.ll[0], lon: n.ll[1] }; }));
    var t = new Date(), stamp = t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate() + "-" + t.getHours();
    Promise.all([
      fetch("data/wx.json?h=" + stamp).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch("data/wx-points.json?h=" + stamp).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) { addDesertLayer(res[1]); finish(wxMaps(res[0], pts, res[1])); })
      .catch(function (e) { wxPending = !!(e && e.message === "404"); loadState = "error"; updatePanel(); drawCal(); renderStatus(); renderSummary(); });
  }

  paint(); updatePanel(); drawCal(); renderStatus(); renderSummary();
  loadNeighbors().then(loadData);

  var wrap = stage.parentElement;
  // кенг экранда — кенгроқ саҳна (харита каттароқ), телефонда — эски квадрат (матн кичраймаслиги учун)
  function fit() {
    var w = wrap.clientWidth, wide = w >= 760, W = wide ? 1500 : 1080, H = wide ? 1180 : 1080, s = w / W;
    stage.style.width = W + "px"; stage.style.height = H + "px";
    stage.style.transform = "scale(" + s + ")"; wrap.style.height = (H * s) + "px";
  }
  fit(); window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
