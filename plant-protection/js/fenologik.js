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

  // GDD модель параметрлари:
  //  base/upper — ост/юқори ҳарорат чегараси; emerge — қишловдан баҳорги уйғонишгача GDD (1-январдан, биофикс);
  //  gen — бир авлод учун GDD (Ўзбекистондаги маълум йиллик авлод сонига мослаштирилган: ғўза тунлами 3–5,
  //  кузги тунлам 2–3, ўргимчаккана 12–18, ширалар 20–26); crit — кузги диапаузани қўзғатувчи кун узунлиги (соат);
  //  bin — харита рангида нечта авлод бир синфга киради. ⚠️ Тахминий қийматлар — дала маълумоти билан калибрлаш керак.
  var PESTS = LANG === "ru" ? [
    { id: "bollworm", nm: "Хлопковая совка", win: [0.05, 0.22], wst: "яйца и молодые гусеницы",  base: 10.5, upper: 35, gen: 650, emerge: 250, crit: 12.9, bin: 1, winter: "куколка — в почве (5–10 см)", rec: "Глубокая зяблевая вспашка уничтожает зимующих куколок." },
    { id: "mite", nm: "Паутинный клещ", win: [0, 0.35], wst: "яйца и личинки",  base: 11, upper: 40, gen: 160, emerge: 80, crit: 13.3, bin: 3, winter: "оплодотворённые самки — под растительными остатками и корой", rec: "Удаление и измельчение растительных остатков хлопчатника." },
    { id: "cutworm", nm: "Озимая совка", win: [0.05, 0.2], wst: "яйца и молодые гусеницы",  base: 10, upper: 35, gen: 1100, emerge: 200, crit: 13.0, bin: 1, winter: "гусеницы и куколки — в почве", rec: "Глубокая вспашка и борьба с сорняками." },
    { id: "aphid", nm: "Тли", win: [0, 0.4], wst: "молодые колонии (личинки)",  base: 6.5, upper: 35, gen: 155, emerge: 120, crit: 12.5, bin: 5, winter: "яйца — на сорняках и побегах", rec: "Борьба с сорняками снижает запас зимующих яиц." }
  ] : [
    { id: "bollworm", nm: "Ғўза тунлами (кўсак қурти)", win: [0.05, 0.22], wst: "тухум ва ёш қуртлар",  base: 10.5, upper: 35, gen: 650, emerge: 250, crit: 12.9, bin: 1, winter: "ғумбак — тупроқда (5–10 см чуқурликда)", rec: "Кузги чуқур шудгор қишлаётган ғумбакларни нобуд қилади." },
    { id: "mite", nm: "Ўргимчаккана", win: [0, 0.35], wst: "тухум ва личинкалар",  base: 11, upper: 40, gen: 160, emerge: 80, crit: 13.3, bin: 3, winter: "уруғланган урғочи — ўсимлик қолдиғи ва пўстлоқ остида", rec: "Ғўзапоя ва ўсимлик қолдиқларини йиғиштириш/майдалаш." },
    { id: "cutworm", nm: "Кузги тунлам", win: [0.05, 0.2], wst: "тухум ва ёш қуртлар",  base: 10, upper: 35, gen: 1100, emerge: 200, crit: 13.0, bin: 1, winter: "катта ёшли қурт ва ғумбак — тупроқда", rec: "Кузги чуқур шудгор ва бегона ўтларни йўқотиш." },
    { id: "aphid", nm: "Ширалар", win: [0, 0.4], wst: "ёш колониялар (личинкалар)",  base: 6.5, upper: 35, gen: 155, emerge: 120, crit: 12.5, bin: 5, winter: "тухум — бегона ўт ва новдаларда", rec: "Бегона ўтларни йўқотиш қишлаётган тухумни камайтиради." }
  ];
  var T = LANG === "ru" ? {
    title: "ФЕНОЛОГИЧЕСКИЙ ПРОГНОЗ", label: "Вредитель", region: "Область", districts: "районов",
    back: "← Вся страна", hint: "👆 Нажмите на район — область увеличится, и календарь покажет её поколения.",
    gen: "Поколение", gdd: "Накоплено ГДД", next: "Следующее поколение", progress: "до следующего",
    nodata: "нет данных", loading: "⏳ Расчёт по температуре…", wxPending: "⏳ Данные о температуре готовятся (первый сбор ~2 часа). Обновите страницу позже.", err: "⚠️ Не удалось загрузить данные.",
    ended: "сезон завершён (диапауза)", approx: "≈ прогноз", src: "Модель ГДД (синус-метод) · Open-Meteo · посевы: ESA WorldCover",
    base: "порог", country: "В среднем по стране", today: "сегодня", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендарь — поколения за сезон", note: "⚠️ Модельная оценка (градусо-дни с учётом весеннего выхода с зимовки и осеннего короткого дня; параметры подогнаны к известному числу поколений в Узбекистане), не официальный мониторинг.",
    nowLabel: "Текущее состояние", phaseActive: "АКТИВНОЕ РАЗВИТИЕ", phaseDiapause: "ДИАПАУЗА (зимовка)",
    phasePre: "ЗИМОВКА — ожидается весеннее пробуждение", winterLabel: "Форма зимовки", recLabel: "Рекомендация",
    windowLabel: "Окно обработки", windowTxt: "перед яйцекладкой следующего поколения",
    sumTitle: "Заключение", sumUnit: "р-нов", sumActive: "Активное развитие", sumDiap: "Зимовка (диапауза)",
    sumMaxGen: "Макс. поколений", sumAvgGen: "В среднем", sumTop: "Наибольшее давление", desertTip: "🏜 Пустыня — посевов нет, прогноз не даётся", nocropTip: "Посевов нет (степь/горы) — прогноз не даётся", sumNoFc: "Без прогноза (пустыня/нет посевов)", diToday: "Сегодня (max / min)", di7: "Средняя за 7 дней", diCrop: "Посевы", diCity: "Городская территория — температура по центру района", diClose: "Закрыть", bioL: "Начало сезона (выход с зимовки)", cutL: "Осенняя диапауза (короткий день)", noNextCut: "новое поколение не начнётся — короткий день", genAbbr: "пок.", winNow: "ОТКРЫТО сейчас", winOpenL: "⚠ Окно обработки открыто сейчас", winSoonL: "Откроется в ближайшие 7 дней", winShort: "время обработки", winNone: "в этом сезоне больше нет", dateL: "Показана дата", tlLabel: "Дата", tlToday: "Сегодня", tlPlay: "▶ Сезон", tlPause: "⏸ Пауза", tlFc: "прогноз", tlPast: "прошлое", tlHint: "Двигайте ползунок — карта, календарь и окна обработки покажут состояние на выбранную дату.",
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
    calTitle: "Фенокалендар — мавсум давомидаги авлодлар", note: "⚠️ Моделга асосланган тахмин (эффектив ҳарорат, баҳорги уйғониш ва кузги кун қисқариши ҳисобга олинган; параметрлар Ўзбекистондаги маълум авлод сонига мослаштирилган), расмий мониторинг эмас.",
    nowLabel: "Бугунги ҳолат", phaseActive: "ФАОЛ РИВОЖЛАНИШ", phaseDiapause: "ДИАПАУЗА (қишлов)",
    phasePre: "ҚИШЛОВ — баҳорда уйғониш кутилмоқда", winterLabel: "Қишлаш шакли", recLabel: "Тавсия",
    windowLabel: "Ишлов бериш ойнаси", windowTxt: "навбатдаги авлод тухум қўйиши олдидан",
    sumTitle: "Хулоса", sumUnit: "туман", sumActive: "Фаол ривожланиш", sumDiap: "Қишлов (диапауза)",
    sumMaxGen: "Энг кўп авлод", sumAvgGen: "Ўртача", sumTop: "Энг юқори босим", desertTip: "🏜 Чўл — экин майдони йўқ, прогноз берилмайди", nocropTip: "Экин майдони йўқ (дашт/тоғ) — прогноз берилмайди", sumNoFc: "Прогноз берилмади (чўл/экин майдони йўқ)", diToday: "Бугун (max / min)", di7: "Охирги 7 кун ўртача", diCrop: "Экин майдони", diCity: "Шаҳар ҳудуди — ҳарорат туман марказидан", diClose: "Ёпиш", bioL: "Мавсум боши (қишловдан чиқиш)", cutL: "Кузги диапауза (кун қисқариши)", noNextCut: "янги авлод бошланмайди — кун қисқа", genAbbr: "авлод", winNow: "ҲОЗИР очиқ", winOpenL: "⚠ Ишлов бериш ойнаси ҳозир очиқ", winSoonL: "7 кун ичида очилади", winShort: "ишлов бериш вақти", winNone: "бу мавсумда бошқа йўқ", dateL: "Кўрсатилган сана", tlLabel: "Сана", tlToday: "Бугун", tlPlay: "▶ Мавсум", tlPause: "⏸ Тўхтатиш", tlFc: "прогноз", tlPast: "ўтган кун", tlHint: "Сургични суринг — харита, календар ва ишлов бериш ойналари танланган кундаги ҳолатни кўрсатади.",
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
  function genColor(g) { if (g == null || g < 1) return GENCOL[0]; var b = (PESTS[curPest] && PESTS[curPest].bin) || 1; return GENCOL[Math.min(Math.ceil(g / b), GENCOL.length - 1)]; }
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
  // ?sana=YYYY-MM-DD — исталган санадаги ҳолатни кўриш (масалан, ёзги ишлов бериш ойналари)
  var NOW = (function () { var m = /[?&]sana=(\d{4})-(\d{2})-(\d{2})/.exec(location.search); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; })();
  var WXR = null; // ҳарорат маълумоти санаси оралиғи (wx.json: start, days)
  var loadState = "loading", updatedAt = null, wxPending = false, selDist = null, WXP = null;

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
  function resetView() { curReg = null; selDist = null; tweenTo(base.slice(), 450); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend(); }

  // легенда: авлод синфлари танланган зараркунанданинг шкаласи бўйича
  var lgFirst = null;
  function renderLegend() {
    var lg = document.getElementById("legend"); if (!lg) return;
    var bs = lg.querySelectorAll(".lg b"), b = pestOf().bin || 1;
    if (lgFirst == null && bs[0]) lgFirst = bs[0].textContent;
    for (var c = 1; c <= 6 && c <= bs.length; c++) {
      var t = b === 1 ? (c === 1 ? lgFirst : (c < 6 ? String(c) : "6+")) : (c < 6 ? ((c - 1) * b + 1) + "–" + (c * b) : (5 * b + 1) + "+");
      if (b > 1 && c === 1) t += " " + T.genAbbr;
      bs[c - 1].textContent = t;
    }
  }
  function pestOf() { return PESTS[curPest]; }

  function paint() {
    for (var i = 0; i < items.length; i++) {
      var inReg = !curReg || items[i].r === curReg;
      paths[i].setAttribute("fill", fillFor(i));
      paths[i].setAttribute("opacity", inReg ? "1" : "0.12");
      var selU = selDist && selDist.t === "u" && selDist.i === i;
      var wOpen = !zoneD[i] && dpheno[i] && dpheno[i].win && dpheno[i].win.open;
      paths[i].setAttribute("stroke", selU ? "#0f2b1f" : (wOpen ? "#e65100" : "#fff"));
      paths[i].setAttribute("stroke-width", selU ? "2.2" : (wOpen ? "1.1" : (curReg && items[i].r === curReg ? "0.9" : "0.5")));
    }
    for (var k = 0; k < npaths.length; k++) {
      var nph = npheno[k];
      npaths[k].setAttribute("fill", zoneN[k] ? DESERT_COL : (nph ? (nph.ended ? DIA_COL : genColor(nph.gen)) : "#e3e8ea"));
      var selN = selDist && selDist.t === "n" && selDist.i === k;
      npaths[k].setAttribute("opacity", selN ? "0.9" : (curReg ? "0.12" : "0.55"));
      npaths[k].setAttribute("stroke", selN ? "#0f2b1f" : "#607d8b");
      npaths[k].setAttribute("stroke-width", selN ? "1.8" : "0.45");
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
    var nowPct = pct(updatedAt || new Date()), cutPct = ph.cutoff ? pct(ph.cutoff) : null;
    var lastEnd = (cutPct != null && cutPct < nowPct) ? cutPct : nowPct;
    if (!ph.pre && lastEnd > lastStart) segs += '<div class="fc-seg" style="left:' + lastStart + '%;width:' + Math.max(0.6, lastEnd - lastStart) + '%;background:' + genColor(ph.gen) + '"></div>';
    if (cutPct != null && nowPct > cutPct) segs += '<div class="fc-seg" style="left:' + cutPct + '%;width:' + Math.max(0.6, nowPct - cutPct) + '%;background:' + DIA_COL + '" title="' + T.cutL + '"></div>';
    if (cutPct != null) segs += '<div class="fc-mark" style="left:' + cutPct + '%;border-left:2px dashed #546e7a" title="' + T.cutL + ': ' + fmtDate(ph.cutoff) + '"><span>❄</span></div>';
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
        '<div class="fn-rec"><b>' + T.windowLabel + ':</b> ' + (ph.win ? winText(ph.win, pest) : T.winNone) + '</div>';
    } else {
      var pre = !!ph.pre;
      cls = "diapause"; phase = pre ? T.phasePre : T.phaseDiapause;
      body = '<b>' + T.winterLabel + ':</b> ' + pest.winter +
        '<div class="fn-rec"><b>' + T.recLabel + ':</b> ' + pest.rec + '</div>';
    }
    box.innerHTML = '<div class="fn-head">' + T.nowLabel + ' · ' + who + ' · ' + pest.nm + '</div>' +
      '<div class="fn-phase ' + cls + '">' + phase + '</div>' +
      '<div class="fn-body">' + body + '</div>';
  }

  // ===== Хулоса (бутун мамлакат бўйича синтез) =====
  function winSummary() {
    var now = (updatedAt || new Date()).getTime(), open = [], soon = [];
    dIdx.forEach(function (i) {
      var w = dpheno[i] && dpheno[i].win; if (!w || zoneD[i]) return;
      if (w.open) open.push(dname(items[i])); else if (w.from.getTime() - now <= 7 * 86400000) soon.push(dname(items[i]));
    });
    function lst(a) { return a.length + " (" + a.slice(0, 8).join(", ") + (a.length > 8 ? ", …" : "") + ")"; }
    return (open.length ? '<div class="fn-rec" style="color:#bf360c"><b>' + T.winOpenL + ':</b> ' + lst(open) + '</div>' : '') +
           (soon.length ? '<div class="fn-rec"><b>' + T.winSoonL + ':</b> ' + lst(soon) + '</div>' : '');
  }
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
      '<div class="fn-head">' + T.sumTitle + ' · ' + pest.nm + ' · ' + withData + ' ' + T.sumUnit + (NOW ? ' · 📅 ' + T.dateL + ': ' + fmtDate(NOW) : '') + '</div>' +
      '<div class="fn-phase ' + (over ? "diapause" : "active") + '">' + (over ? T.sumOverLead : T.sumActiveLead) + '</div>' +
      '<div class="fs-grid">' +
        stat(T.sumActive, active, "#1b5e20") +
        stat(T.sumDiap, ended, "#546e7a") +
        stat(T.sumMaxGen, genMax, genColor(genMax)) +
        stat(T.sumAvgGen, avgTxt, null) +
      '</div>' +
      '<div class="fn-body">' + (over ? fill(T.sumOverTxt) : fill(T.sumActiveTxt)) +
        '<div class="fn-rec"><b>' + T.sumTop + ':</b> ' + (topRegs.join(", ") || "—") + '</div>' +
        winSummary() +
        (Object.keys(zoneD).length ? '<div class="fn-rec"><b>' + T.sumNoFc + ':</b> ' + Object.keys(zoneD).map(function (i) { return dname(items[i]); }).join(", ") + '</div>' : '') +
        (over ? '<div class="fn-rec"><b>' + T.recLabel + ':</b> ' + pest.rec + '</div>' : '') +
      '</div>' +
      '<div class="fc-note">' + T.note + ' · ' + T.src + '</div>';
  }

  // ===== ҳодисалар =====
  function drill(i) { var rid = items[i].r; if (curReg !== rid) { curReg = rid; tweenTo(fitRegion(regById[rid].bbox), 500); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend(); } }
  function winText(w, pest) {
    if (!w) return "—";
    var t = w.open ? (LANG === "ru" ? T.winNow + " — до " + fmtDate(w.to) : T.winNow + " — " + fmtDate(w.to) + "гача")
                   : fmtDate(w.from) + " – " + fmtDate(w.to);
    return t + (w.approx ? " " + T.approx : "") + " <span class=\"di-sub\">(" + w.gen + (LANG === "ru" ? "-е пок.: " : "-авлод: ") + pest.wst + ")</span>";
  }
  function phLine(ph) { return ph ? (ph.ended ? "❄ " + T.phaseDiapause : (T.gen + " " + ph.gen + " · " + Math.round(ph.gdd) + "°Д" + (ph.win && ph.win.open ? " · ⚠ " + T.winShort : ""))) : (loadState === "loading" ? T.loading : T.nodata); }
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
    if (downT && moved <= 4) {
      var t = downT; // pointer capture туфайли pointerup'нинг target'и — svg; шунинг учун pointerdown пайтидаги элемент
      if (t && t.tagName === "path" && t.hasAttribute("data-i")) { var di = +t.getAttribute("data-i"); selDist = { t: "u", i: di }; svg.insertBefore(t, svg.querySelector("#desertlayer") || svg.querySelector("#uzborder") || gl); drill(di); paint(); renderDistrict(); }
      else if (t && t.tagName === "path" && t.hasAttribute("data-n")) { selDist = { t: "n", i: +t.getAttribute("data-n") }; gN.appendChild(t); paint(); renderDistrict(); }
    }
    delete ptrs[e.pointerId]; var n = Object.keys(ptrs).length;
    if (n < 2) pinchD = 0; if (n === 0) { panLast = null; downT = null; }
  }
  svg.addEventListener("pointerup", endPtr);
  svg.addEventListener("pointercancel", endPtr);
  svg.addEventListener("pointerleave", function () { tip.style.display = "none"; });
  svg.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.18 : 0.85, e.clientX, e.clientY); }, { passive: false });

  // ===== босилган туман маълумоти (хаританинг ўнг юқори бурчаги) =====
  var dinfo = document.createElement("div"); dinfo.className = "dinfo"; dinfo.style.display = "none"; map.appendChild(dinfo);
  ["pointerdown", "pointerup", "wheel"].forEach(function (ev) { dinfo.addEventListener(ev, function (e) { e.stopPropagation(); }); });
  dinfo.addEventListener("click", function (e) { if (e.target.closest(".di-x")) { selDist = null; renderDistrict(); paint(); } });
  function dayOf(ser, ds) { if (!ser) return null; for (var j = ser.length - 1; j >= 0; j--) if (iso(ser[j].t) === ds) return ser[j]; return null; }
  function renderDistrict() {
    if (!selDist) { dinfo.style.display = "none"; return; }
    var i = selDist.i, nm, rg, ph, ser, zone, e;
    if (selDist.t === "u") { var it = items[i]; nm = dname(it); rg = rname(regById[it.r]); ph = dpheno[i]; ser = dseries[i]; zone = zoneD[i]; e = WXP && WXP.d && WXP.d[String(i)]; }
    else { var n = NB[i]; nm = n.nm || n.cn; rg = n.cn; ph = npheno[i]; ser = nseries[i]; zone = zoneN[i]; e = WXP && WXP.d && WXP.d["n" + n.fi]; }
    var pest = pestOf();
    var h = '<button class="di-x" type="button" aria-label="' + T.diClose + '" title="' + T.diClose + '">×</button>' +
      '<div class="di-name">' + nm + '</div><div class="di-reg">' + rg + '</div><div class="di-pest">' + pest.nm + '</div>';
    if (zone) h += '<div class="di-phase desert">' + T[zone + "Tip"] + '</div>';
    else if (loadState === "loading") h += '<div class="di-row">' + T.loading + '</div>';
    else if (!ph) h += '<div class="di-row">' + T.nodata + '</div>';
    else {
      h += '<div class="di-phase ' + (ph.ended ? "dia" : "active") + '">' + (ph.pre ? "❄ " + T.phasePre : (ph.ended ? "❄ " + T.phaseDiapause : T.phaseActive)) + '</div>';
      var rows = [
        [T.gen, '<b>' + ph.gen + '</b> <span class="di-sub">(' + Math.round(ph.progress * 100) + '% ' + T.progress + ')</span>'],
        [T.gdd, '<b>' + Math.round(ph.gdd) + '</b> °Д <span class="di-sub">(' + T.base + ' ' + pest.base + '°C)</span>'],
        [T.next, '<b>' + (ph.ended ? T.ended : (ph.noNext ? T.noNextCut : (ph.next ? fmtDate(ph.next) + (ph.approx ? " " + T.approx : "") : "—"))) + '</b>']
      ];
      if (!ph.ended || ph.win) rows.push([T.windowLabel, '<b>' + (ph.win ? winText(ph.win, pest) : T.winNone) + '</b>']);
      if (ph.seasonStart) rows.push([T.bioL, '<b>' + fmtDate(ph.seasonStart) + '</b>']);
      if (ph.cutoff) rows.push([T.cutL, '<b>' + fmtDate(ph.cutoff) + '</b>']);
      var now = updatedAt || new Date(), td = dayOf(ser, iso(now)), s7 = 0, c7 = 0;
      if (td) rows.push([NOW ? fmtDate(NOW) + ' (max / min)' : T.diToday, '<b>' + Math.round(td.mx) + '° / ' + Math.round(td.mn) + '°</b>']);
      if (ser) for (var j = 0; j < ser.length; j++) { var dd = (now - ser[j].t) / 86400000; if (dd >= 0 && dd < 7) { s7 += (ser[j].mx + ser[j].mn) / 2; c7++; } }
      if (c7) rows.push([T.di7, '<b>' + (s7 / c7).toFixed(1) + '°C</b>']);
      h += '<table class="di-t">' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join("") + '</table>';
    }
    if (e && !Array.isArray(e) && e.crop != null)
      h += '<div class="di-crop">' + (e.zone === "city" ? T.diCity : T.diCrop + ': <b>' + Math.round(e.crop) + ' км²</b> (' + e.cropPct + '%)') + '</div>';
    dinfo.innerHTML = h; dinfo.style.display = "";
  }

  var zc = document.createElement("div"); zc.className = "zoomctl";
  zc.innerHTML = '<button type="button" data-z="in">+</button><button type="button" data-z="out">−</button><button type="button" data-z="reset">⟳</button>';
  map.appendChild(zc);
  zc.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var z = b.getAttribute("data-z"); if (z === "in") zoomBtn(0.72); else if (z === "out") zoomBtn(1.38); else resetView(); });

  if (pestBox) pestBox.addEventListener("click", function (e) {
    var b = e.target.closest(".pbtn"); if (!b) return;
    curPest = +b.getAttribute("data-p");
    [].forEach.call(pestBox.children, function (x) { x.classList.toggle("on", x === b); });
    recompute(); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
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
  // кун узунлиги (соат), CBM модели (Forsythe 1995), p = 0.8333° (қуёш чиқиши/ботиши)
  function dayLen(lat, d) {
    var J = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000), r = Math.PI / 180;
    var th = 0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.00860 * (J - 186))), ph = Math.asin(0.39795 * Math.cos(th));
    var x = (Math.sin(0.8333 * r) + Math.sin(lat * r) * Math.sin(ph)) / (Math.cos(lat * r) * Math.cos(ph));
    return 24 - (24 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, x)));
  }
  // Фенология: биофикс (pest.emerge GDD — қишловдан чиқиш) дан авлодлар саналади;
  // кузда кун узунлиги pest.crit дан қисқаргач янги авлод бошланмайди (диапауза).
  function computePheno(ser, pest, lat) {
    if (!ser || !ser.length) return null;
    var now = (updatedAt || new Date()), cum = 0, cumArr = [], bio = -1, cut = -1;
    for (var i = 0; i < ser.length; i++) {
      cum += sineDD(ser[i].mn, ser[i].mx, pest.base, pest.upper); cumArr.push(cum);
      if (bio < 0 && cum >= pest.emerge) bio = i;
      if (cut < 0 && lat != null && ser[i].t.getMonth() >= 6 && dayLen(lat, ser[i].t) < pest.crit) cut = i;
    }
    var todayIdx = 0;
    for (var j = 0; j < ser.length; j++) { if (ser[j].t.getTime() <= now.getTime()) todayIdx = j; }
    var gddToday = cumArr[todayIdx];
    var pre = bio < 0 || todayIdx < bio;            // баҳорги уйғониш ҳали бўлмаган (қишлов)
    var pastCut = cut >= 0 && todayIdx >= cut;      // кузги кун қисқариши — янги авлод йўқ
    var eff = Math.max(0, cumArr[pastCut ? cut : todayIdx] - pest.emerge);
    var gen = pre ? 0 : Math.floor(eff / pest.gen) + 1;
    var progress = pre ? Math.min(1, gddToday / pest.emerge) : (eff % pest.gen) / pest.gen;
    // авлод чегаралари (сана) — биофиксдан кузги кесишгача
    var boundaries = [], k = 1, lim = cut >= 0 ? cut : ser.length - 1;
    if (bio >= 0) for (var m = bio; m <= lim; m++) { while (cumArr[m] - pest.emerge >= k * pest.gen) { boundaries.push({ k: k, date: ser[m].t }); k++; } }
    var next = null, approx = false, ended = false, noNext = false;
    if (pre || pastCut) ended = true;
    else {
      for (var bb = 0; bb < boundaries.length; bb++) { if (boundaries[bb].date.getTime() > now.getTime()) { next = boundaries[bb].date; break; } }
      if (!next) {
        // сўнгги 14 кун: ўртача ҳарорат ва ўртача GDD/кун
        var mt = 0, s = 0, c = 0;
        for (var q = Math.max(0, todayIdx - 13); q <= todayIdx; q++) { mt += (ser[q].mx + ser[q].mn) / 2; s += sineDD(ser[q].mn, ser[q].mx, pest.base, pest.upper); c++; }
        var meanT = c ? mt / c : 0, daily = c ? s / c : 0;
        if (meanT < pest.base || daily < 0.5) ended = true;
        else {
          var days = Math.ceil((pest.gen - (eff % pest.gen)) / daily), nd = new Date(now.getTime() + days * 86400000);
          if (days > 45) ended = true;
          else if (cut >= 0 && nd.getTime() >= ser[cut].t.getTime()) noNext = true;
          else { next = nd; approx = true; }
        }
      }
    }
    // ишлов бериш ойнаси: (k+1)-авлоднинг тухум ва ёш қуртлари — эфф. GDD k·gen + [win0, win1]·gen оралиғи
    var win = null;
    if (!pre && !pastCut && bio >= 0 && pest.win) {
      var L = ser.length - 1, r7 = 0, n7 = 0;
      for (var z = Math.max(0, L - 6); z <= L; z++) { r7 += sineDD(ser[z].mn, ser[z].mx, pest.base, pest.upper); n7++; }
      r7 = n7 ? r7 / n7 : 0;
      var effAt = function (x) { // эфф. GDD x га етадиган сана (серия охиридан кейин — сўнгги 7 кун тезлигида)
        for (var mm = bio; mm <= L; mm++) if (cumArr[mm] - pest.emerge >= x) return { d: ser[mm].t, ap: false };
        if (r7 < 0.5) return null;
        var dd = Math.ceil((x - (cumArr[L] - pest.emerge)) / r7);
        return dd > 60 ? null : { d: new Date(ser[L].t.getTime() + dd * 86400000), ap: true };
      };
      var effCut = cut >= 0 ? cumArr[cut] - pest.emerge : Infinity;
      for (var kk = 0; kk < 200; kk++) {
        var g0 = kk * pest.gen; if (g0 > effCut) break; // авлод кузги кесишдан кейин бошланади — ойна йўқ
        var A = effAt(g0 + pest.win[0] * pest.gen), B = effAt(g0 + pest.win[1] * pest.gen);
        if (!A) break;
        if (B && B.d.getTime() < now.getTime() - 43200000) continue; // ўтиб кетган ойна
        win = { gen: kk + 1, from: A.d, to: B ? B.d : null, open: A.d.getTime() <= now.getTime(), approx: A.ap || (B ? B.ap : true) };
        break;
      }
    }
    return { gdd: gddToday, gen: gen, progress: progress, boundaries: boundaries, next: next, approx: approx, ended: ended,
      win: win, pre: pre, noNext: noNext, seasonStart: bio >= 0 ? ser[bio].t : null, cutoff: cut >= 0 ? ser[cut].t : null, pastCut: pastCut };
  }
  function recompute() {
    var pest = pestOf();
    dpheno = {};
    dIdx.forEach(function (i) { dpheno[i] = computePheno(dseries[i], pest, GEO[i][0]); });
    regPheno = {};
    regIds.forEach(function (rid) { var ds = regDistricts[rid] || [], la = 0; ds.forEach(function (i) { la += GEO[i][0]; }); regPheno[rid] = computePheno(regSeries[rid], pest, ds.length ? la / ds.length : 41.3); });
    countryPheno = computePheno(countrySeries, pest, 41.3);
    npheno = {};
    NB.forEach(function (n, k) { npheno[k] = computePheno(nseries[k], pest, n.ll[0]); });
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
    updatedAt = NOW || new Date(); loadState = have ? "ok" : "error";
    recompute(); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
  }
  // ===== сана сургичи (2.2): исталган кундаги ҳолат; ▶ — мавсумни анимация қилиш =====
  var tlPlay = null;
  function refreshAt(d) {
    var today = new Date(); today.setHours(12, 0, 0, 0);
    NOW = (d && iso(d) !== iso(today)) ? d : null;
    updatedAt = NOW || new Date();
    recompute(); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
    try { history.replaceState(null, "", location.pathname + (NOW ? "?sana=" + iso(NOW) : "") + location.hash); } catch (e) {}
  }
  function buildTimeline() {
    var box = document.getElementById("fenotime"); if (!box || !WXR || loadState !== "ok") return;
    var p0 = WXR.start.split("-").map(Number), d0 = new Date(p0[0], p0[1] - 1, p0[2], 12);
    var dayAt = function (k) { return new Date(p0[0], p0[1] - 1, p0[2] + k, 12); };
    var today = new Date(); today.setHours(12, 0, 0, 0);
    var tIdx = Math.max(0, Math.min(WXR.days - 1, Math.round((today - d0) / 86400000)));
    var cur = NOW ? Math.max(0, Math.min(WXR.days - 1, Math.round((NOW - d0) / 86400000))) : tIdx;
    var ticks = T.months.map(function (m, i) {
      var k = Math.round((new Date(p0[0], i, 1, 12) - d0) / 86400000);
      return k < WXR.days ? '<span style="left:' + (k / (WXR.days - 1) * 100) + '%">' + m + '</span>' : '';
    }).join("");
    box.innerHTML =
      '<div class="tl-row"><b class="tl-lbl">📅 ' + T.tlLabel + ':</b>' +
      '<span class="tl-date" id="tl-date"></span>' +
      '<button type="button" class="tl-btn" id="tl-today">' + T.tlToday + '</button>' +
      '<button type="button" class="tl-btn tl-play" id="tl-play">' + T.tlPlay + '</button></div>' +
      '<div class="tl-track"><input type="range" id="tl-range" min="0" max="' + (WXR.days - 1) + '" step="1" value="' + cur + '" aria-label="' + T.tlLabel + '">' +
      '<div class="tl-todaymark" style="left:' + (tIdx / (WXR.days - 1) * 100) + '%" title="' + T.tlToday + '"></div>' +
      '<div class="tl-fc" style="left:' + (tIdx / (WXR.days - 1) * 100) + '%;width:' + ((WXR.days - 1 - tIdx) / (WXR.days - 1) * 100) + '%"></div></div>' +
      '<div class="tl-ticks">' + ticks + '</div>' +
      '<div class="tl-hint">' + T.tlHint + '</div>';
    var rng = document.getElementById("tl-range"), lab = document.getElementById("tl-date"), raf = 0;
    function label(k) {
      var d = dayAt(k), tag = k === tIdx ? T.tlToday.toLowerCase() : (k > tIdx ? T.tlFc : T.tlPast);
      lab.innerHTML = fmtDate(d) + ' ' + d.getFullYear() + ' <span class="tl-tag' + (k > tIdx ? ' fc' : '') + '">' + tag + '</span>';
    }
    function go(k) { label(k); if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { raf = 0; refreshAt(dayAt(k)); }); }
    function stop() { if (tlPlay) { clearInterval(tlPlay); tlPlay = null; document.getElementById("tl-play").textContent = T.tlPlay; } }
    label(cur);
    rng.addEventListener("input", function () { go(+rng.value); });
    document.getElementById("tl-today").addEventListener("click", function () { stop(); rng.value = tIdx; go(tIdx); });
    document.getElementById("tl-play").addEventListener("click", function () {
      if (tlPlay) { stop(); return; }
      if (+rng.value >= WXR.days - 1) rng.value = 0;
      this.textContent = T.tlPause;
      tlPlay = setInterval(function () {
        var k = Math.min(WXR.days - 1, +rng.value + 3); rng.value = k; go(k);
        if (k >= WXR.days - 1) stop();
      }, 140);
    });
  }

  function loadData() {
    loadState = "loading"; updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
    var pts = dIdx.map(function (i) { return { key: i, pk: String(i), lat: GEO[i][0], lon: GEO[i][1] }; })
      .concat(NB.map(function (n, k) { return { key: "n" + k, pk: "n" + n.fi, lat: n.ll[0], lon: n.ll[1] }; }));
    var t = new Date(), stamp = t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate() + "-" + t.getHours();
    Promise.all([
      fetch("data/wx.json?h=" + stamp).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch("data/wx-points.json?h=" + stamp).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) { WXP = res[1]; WXR = { start: res[0].start, days: res[0].days }; addDesertLayer(res[1]); finish(wxMaps(res[0], pts, res[1])); buildTimeline(); })
      .catch(function (e) { wxPending = !!(e && e.message === "404"); loadState = "error"; updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend(); });
  }

  paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
  loadNeighbors().then(loadData);

  var wrap = stage.parentElement;
  // кенг экранда — кенгроқ саҳна (харита каттароқ), телефонда — эски квадрат (матн кичраймаслиги учун)
  function fit() {
    var w = wrap.clientWidth, wide = w >= 760, W = wide ? 1500 : 1080, H = wide ? 1180 : 1080, s = w / W;
    stage.style.width = W + "px"; stage.style.height = H + "px"; stage.classList.toggle("narrow", !wide);
    stage.style.transform = "scale(" + s + ")"; wrap.style.height = (H * s) + "px";
  }
  fit(); window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
