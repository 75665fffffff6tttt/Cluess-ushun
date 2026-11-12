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
    { id: "bollworm", nm: "Хлопковая совка", win: [0.14, 0.37], wst: "яйца и молодые гусеницы",  base: 11, upper: 35, gen: 640, emerge: 250, crit: 12.9, bin: 1, winter: "куколка — в почве (5–10 см)", rec: "Глубокая зяблевая вспашка уничтожает зимующих куколок." },
    { id: "mite", nm: "Паутинный клещ", win: [0, 0.45], wst: "яйца и личинки",  base: 7.1, upper: 40, gen: 190, emerge: 70, crit: 13.3, bin: 4, winter: "оплодотворённые самки — под растительными остатками и корой", rec: "Удаление и измельчение растительных остатков хлопчатника." },
    { id: "cutworm", nm: "Озимая совка", win: [0.18, 0.4], wst: "яйца и молодые гусеницы",  base: 10, upper: 35, gen: 670, emerge: 150, crit: 13.0, bin: 1, winter: "куколка — в почве", rec: "Глубокая вспашка и борьба с сорняками." },
    { id: "aphid", nm: "Тли", win: [0, 0.35], wst: "молодые колонии (личинки)",  base: 5, upper: 30, gen: 140, emerge: 25, crit: 12.5, bin: 5, winter: "яйца — на сорняках и побегах", rec: "Борьба с сорняками снижает запас зимующих яиц." }
  ] : [
    { id: "bollworm", nm: "Ғўза тунлами (кўсак қурти)", win: [0.14, 0.37], wst: "тухум ва ёш қуртлар",  base: 11, upper: 35, gen: 640, emerge: 250, crit: 12.9, bin: 1, winter: "ғумбак — тупроқда (5–10 см чуқурликда)", rec: "Кузги чуқур шудгор қишлаётган ғумбакларни нобуд қилади." },
    { id: "mite", nm: "Ўргимчаккана", win: [0, 0.45], wst: "тухум ва личинкалар",  base: 7.1, upper: 40, gen: 190, emerge: 70, crit: 13.3, bin: 4, winter: "уруғланган урғочи — ўсимлик қолдиғи ва пўстлоқ остида", rec: "Ғўзапоя ва ўсимлик қолдиқларини йиғиштириш/майдалаш." },
    { id: "cutworm", nm: "Кузги тунлам", win: [0.18, 0.4], wst: "тухум ва ёш қуртлар",  base: 10, upper: 35, gen: 670, emerge: 150, crit: 13.0, bin: 1, winter: "ғумбак — тупроқда", rec: "Кузги чуқур шудгор ва бегона ўтларни йўқотиш." },
    { id: "aphid", nm: "Ширалар", win: [0, 0.35], wst: "ёш колониялар (личинкалар)",  base: 5, upper: 30, gen: 140, emerge: 25, crit: 12.5, bin: 5, winter: "тухум — бегона ўт ва новдаларда", rec: "Бегона ўтларни йўқотиш қишлаётган тухумни камайтиради." }
  ];
  var T = LANG === "ru" ? {
    title: "ФЕНОЛОГИЧЕСКИЙ ПРОГНОЗ", label: "Вредитель", region: "Область", districts: "районов",
    back: "← Вся страна", hint: "👆 Нажмите на район — область увеличится, и календарь покажет её поколения.",
    gen: "Поколение", gdd: "Накоплено ГДД", next: "Следующее поколение", progress: "до следующего",
    nodata: "нет данных", loading: "⏳ Расчёт по температуре…", wxPending: "⏳ Данные о температуре готовятся (первый сбор ~2 часа). Обновите страницу позже.", err: "⚠️ Не удалось загрузить данные.",
    ended: "сезон завершён (диапауза)", approx: "≈ прогноз", src: "Модель ГДД (синус-метод) · Open-Meteo · посевы: ESA WorldCover",
    base: "порог", country: "В среднем по стране", today: "сегодня", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендарь — поколения за сезон", note: "⚠️ Модельная оценка (градусо-дни с учётом весеннего выхода с зимовки и осеннего короткого дня; параметры подогнаны к известному числу поколений в Узбекистане), не официальный мониторинг.",
    nowLabel: "Текущее состояние", stateOn: "— состояние", phaseActive: "АКТИВНОЕ РАЗВИТИЕ", phaseDiapause: "ДИАПАУЗА (зимовка)",
    phasePre: "ЗИМОВКА — ожидается весеннее пробуждение", winterLabel: "Форма зимовки", recLabel: "Рекомендация",
    windowLabel: "Окно обработки", windowTxt: "перед яйцекладкой следующего поколения",
    sumTitle: "Заключение", sumUnit: "р-нов", sumActive: "Активное развитие", sumDiap: "Зимовка (диапауза)",
    sumMaxGen: "Макс. поколений", sumAvgGen: "В среднем", sumTop: "Наибольшее давление", desertTip: "🏜 Пустыня — посевов нет, прогноз не даётся", nocropTip: "Посевов нет (степь/горы) — прогноз не даётся", sumNoFc: "Без прогноза (пустыня/нет посевов)", diToday: "Сегодня (max / min)", di7: "Средняя за 7 дней", diCrop: "Посевы", diCity: "Городская территория — температура по центру района", diClose: "Закрыть", bioL: "Начало сезона (выход с зимовки)", cutL: "Осенняя диапауза (короткий день)", noNextCut: "новое поколение не начнётся — короткий день", genAbbr: "пок.", winNow: "ОТКРЫТО сейчас", winOpenL: "⚠ Окно обработки открыто сейчас", winSoonL: "Откроется в ближайшие 7 дней", winShort: "время обработки", winNone: "в этом сезоне больше нет", dateL: "Показана дата", tlLabel: "Дата", tlToday: "Сегодня", tlPlay: "▶ Сезон", tlPause: "⏸ Пауза", tlFc: "прогноз", tlPast: "прошлое", tlHint: "Двигайте ползунок — карта, календарь и окна обработки покажут состояние на выбранную дату.",
    sumOverLead: "Сезон в основном завершён", sumActiveLead: "Вредитель ещё активен",
    sumOverTxt: "из {N} районов {E} перешли в диапаузу (зимовку). За сезон накоплено до {G} поколений.",
    sumActiveTxt: "в {A} районах идёт активное развитие (до {G} поколений). Проведите обработку перед яйцекладкой следующего поколения.",
    pcAllRows: "Все строки", pcActRows: "Только активные строки", pcWinL: "окно обработки (яйца и молодые личинки)", pcSumTitle: "Даты по поколениям", pcWinterSpring: "Зимовка (весна)", pcWinterAut: "Уход на зимовку", pcUntil: "до {D}", pcFrom: "с {D}", pcOngoing: "продолжается", pcFcMark: "≈ — по прогнозу погоды; ✓ — фаза завершена.", pcDistSel: "Район", pcRegAvgOpt: "— среднее по области —", pcOrg: "Организация (для печати):", pcOrgPh: "напр.: Андижанский областной центр защиты растений", pcOrgCap: "(наименование организации)", pcApprove: "УТВЕРЖДАЮ", pcDateLine: "«___» ____________ {Y} г.", pcCompiled: "Составил", pcResp: "Ответственный специалист", pcSign: "(Ф.И.О., подпись)", pcPrinted: "Дата печати", pcTipAcc: "накоплено", pcXlsSheet1: "Календарь", pcXlsSheet2: "Даты", pcXlsFile: "Фенокалендарь", pcTitle: "{Y} г. — фенологический календарь: {W}", pcRegAvg: "среднее по области", pcBase: "Нижний порог развития", pcGen: "сумма эффективных температур на поколение", pcStart: "весенний выход с зимовки", pcWinter: "Зимующая фаза", pcPrint: "Печать / PDF", pc5: "5 дней", pcMean: "Средняя °C", pcEff: "Эффект. °C (5 дн.)", pcAcc: "Накоплено в фазе °C", pcDoneL: "фаза завершилась в эти 5 дней", pcFcL: "прогноз", pcNote: "Эффективные температуры — синус-метод по суточным max/min (нижний и верхний порог), до весеннего выхода с зимовки идёт развитие зимующей фазы; осенью при коротком дне развитие останавливается на зимующей фазе. Модельная оценка, не официальный мониторинг.", monthsFull: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    sumToGen: "до {G} поколений"
  } : {
    title: "ФЕНОЛОГИК ПРОГНОЗ", label: "Зараркунанда", region: "Вилоят", districts: "туман",
    back: "← Бутун мамлакат", hint: "👆 Туманни босинг — вилоят катталашиб, календарь ўша вилоят авлодларини кўрсатади.",
    gen: "Авлод", gdd: "Йиғилган GDD", next: "Кейинги авлод", progress: "кейингисигача",
    nodata: "маълумот йўқ", loading: "⏳ Ҳарорат бўйича ҳисоб…", wxPending: "⏳ Ҳарорат маълумоти тайёрланмоқда (биринчи йиғиш ~2 соат). Бироздан сўнг саҳифани янгиланг.", err: "⚠️ Маълумот юкланмади.",
    ended: "мавсум якуни (диапауза)", approx: "≈ прогноз", src: "GDD модели (синус усули) · Open-Meteo · экин майдонлари: ESA WorldCover",
    base: "ост-ҳарорат", country: "Республика ўртачаси", today: "бугун", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендар — мавсум давомидаги авлодлар", note: "⚠️ Моделга асосланган тахмин (эффектив ҳарорат, баҳорги уйғониш ва кузги кун қисқариши ҳисобга олинган; параметрлар Ўзбекистондаги маълум авлод сонига мослаштирилган), расмий мониторинг эмас.",
    nowLabel: "Бугунги ҳолат", stateOn: "ҳолати", phaseActive: "ФАОЛ РИВОЖЛАНИШ", phaseDiapause: "ДИАПАУЗА (қишлов)",
    phasePre: "ҚИШЛОВ — баҳорда уйғониш кутилмоқда", winterLabel: "Қишлаш шакли", recLabel: "Тавсия",
    windowLabel: "Ишлов бериш ойнаси", windowTxt: "навбатдаги авлод тухум қўйиши олдидан",
    sumTitle: "Хулоса", sumUnit: "туман", sumActive: "Фаол ривожланиш", sumDiap: "Қишлов (диапауза)",
    sumMaxGen: "Энг кўп авлод", sumAvgGen: "Ўртача", sumTop: "Энг юқори босим", desertTip: "🏜 Чўл — экин майдони йўқ, прогноз берилмайди", nocropTip: "Экин майдони йўқ (дашт/тоғ) — прогноз берилмайди", sumNoFc: "Прогноз берилмади (чўл/экин майдони йўқ)", diToday: "Бугун (max / min)", di7: "Охирги 7 кун ўртача", diCrop: "Экин майдони", diCity: "Шаҳар ҳудуди — ҳарорат туман марказидан", diClose: "Ёпиш", bioL: "Мавсум боши (қишловдан чиқиш)", cutL: "Кузги диапауза (кун қисқариши)", noNextCut: "янги авлод бошланмайди — кун қисқа", genAbbr: "авлод", winNow: "ҲОЗИР очиқ", winOpenL: "⚠ Ишлов бериш ойнаси ҳозир очиқ", winSoonL: "7 кун ичида очилади", winShort: "ишлов бериш вақти", winNone: "бу мавсумда бошқа йўқ", dateL: "Кўрсатилган сана", tlLabel: "Сана", tlToday: "Бугун", tlPlay: "▶ Мавсум", tlPause: "⏸ Тўхтатиш", tlFc: "прогноз", tlPast: "ўтган кун", tlHint: "Сургични суринг — харита, календар ва ишлов бериш ойналари танланган кундаги ҳолатни кўрсатади.",
    sumOverLead: "Мавсум асосан якунланди", sumActiveLead: "Зараркунанда ҳали фаол",
    sumOverTxt: "{N} тумандан {E} таси диапаузага (қишловга) ўтган. Мавсум давомида {G} авлодгача ривожланган.",
    sumActiveTxt: "{A} туманда фаол ривожланиш кетмоқда ({G} авлодгача). Навбатдаги авлод тухум қўйишидан олдин ишлов беринг.",
    pcAllRows: "Барча қаторлар", pcActRows: "Фақат фаол қаторлар", pcWinL: "ишлов бериш ойнаси (тухум ва ёш личинкалар)", pcSumTitle: "Авлодлар бўйича саналар", pcWinterSpring: "Қишлов (баҳор)", pcWinterAut: "Қишловга кетиш", pcUntil: "{D} гача", pcFrom: "{D} дан", pcOngoing: "давом этмоқда", pcFcMark: "≈ — об-ҳаво прогнози бўйича; ✓ — фаза тугади.", pcDistSel: "Туман", pcRegAvgOpt: "— вилоят ўртачаси —", pcOrg: "Ташкилот (чоп этиш учун):", pcOrgPh: "мас.: Андижон вилояти ўсимликларни ҳимоя қилиш маркази", pcOrgCap: "(ташкилот номи)", pcApprove: "ТАСДИҚЛАЙМАН", pcDateLine: "«___» ____________ {Y} й.", pcCompiled: "Тузувчи", pcResp: "Масъул мутахассис", pcSign: "(Ф.И.Ш., имзо)", pcPrinted: "Чоп этилган сана", pcTipAcc: "тўпланган", pcXlsSheet1: "Календар", pcXlsSheet2: "Саналар", pcXlsFile: "Фенокалендар", pcTitle: "{Y} йил — фенологик календар: {W}", pcRegAvg: "вилоят ўртачаси", pcBase: "Ривожланишнинг қуйи ҳарорат чегараси", pcGen: "бир авлод учун самарали ҳарорат йиғиндиси", pcStart: "баҳорги уйғониш", pcWinter: "Қишловчи фаза", pcPrint: "Чоп этиш / PDF", pc5: "5 кун", pcMean: "Ўртача °C", pcEff: "Самарали °C (5 кун)", pcAcc: "Фазада тўпланган °C", pcDoneL: "фаза шу 5 кунликда тугади", pcFcL: "прогноз", pcNote: "Самарали ҳарорат — кунлик max/min бўйича синус усулида (қуйи ва юқори чегара); баҳорги уйғонишгача қишловчи фаза ривожланади; кузда кун қисқаргач ривожланиш қишловчи фазада тўхтайди. Модел баҳоси, расмий мониторинг эмас.", monthsFull: ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"],
    sumToGen: "{G} авлодгача"
  };

  // авлод рақами → ранг (кўп авлод = кучли босим)
  var GENCOL = ["#d6dde2", "#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"];
  var DIA_COL = "#90a4ae"; // диапауза (қишлов) — нейтрал кулранг-кўк, фаол эмас (хавфсиз эмас!)
  var DESERT_COL = "#ead9b0"; // чўл / экин майдони йўқ — прогноз йўқ (ESA WorldCover)
  var zoneD = {}, zoneN = {}; // туман → "desert" | "nocrop" (data/wx-points.json)
  function genColor(g) { if (g == null || g < 1) return GENCOL[0]; var b = (PESTS[curPest] && PESTS[curPest].bin) || 1; return GENCOL[Math.min(Math.ceil(g / b), GENCOL.length - 1)]; }
  // қишловдаги туман: ранг — мавсумда етишган авлод сони, устида кулранг штрих (❄)
  function genIdx(g) { if (g == null || g < 1) return 0; var b = (PESTS[curPest] && PESTS[curPest].bin) || 1; return Math.min(Math.ceil(g / b), GENCOL.length - 1); }
  function phFill(ph) { if (!ph) return GENCOL[0]; if (!ph.ended) return genColor(ph.gen); var k = genIdx(ph.gen); return k ? "url(#dia" + k + ")" : DIA_COL; }
  function fillFor(i) { if (zoneD[i]) return DESERT_COL; return phFill(dpheno[i]); }

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
  (function () { // қишлов штрихи: ҳар авлод ранги учун
    var defs = document.createElementNS(ns, "defs"), h = "";
    for (var k = 1; k < GENCOL.length; k++)
      h += '<pattern id="dia' + k + '" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">' +
        '<rect width="5" height="5" fill="' + GENCOL[k] + '"/><rect width="1.6" height="5" fill="' + DIA_COL + '" fill-opacity=".75"/></pattern>';
    defs.innerHTML = h; svg.appendChild(defs);
  })();
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
      npaths[k].setAttribute("fill", zoneN[k] ? DESERT_COL : (nph ? phFill(nph) : "#e3e8ea"));
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
    drawPentCal();
  }

  // ===== 5 кунлик фенологик календар (жадвал, PDF шаклида) =====
  // Фазалар бир авлод GDD'сининг улуши сифатида (ғўза тунлами: 90+50+300+200 = 640 °Д
  // нисбатида). w — қишловчи фаза: баҳорда уйғонишгача (emerge) шу фаза ривожланади,
  // кузда кун қисқаргач навбатдаги шу фазага етганда қишловга кетади.
  var STG = {
    bollworm: { s: [["im", "+", 90], ["eg", "•", 50], ["la", "—", 300], ["pu", "⬬", 200]], w: 3 },
    cutworm: { s: [["im", "+", 120], ["eg", "•", 50], ["la", "—", 350], ["pu", "⬬", 150]], w: 3 }, // расмий календар (dala.efito.uz): 120+50+350+150 = 670 °C
    mite: { s: [["eg", "•", 30], ["la", "—", 90], ["im", "+", 70]], w: 2 }, // расмий календар: имаго 70 + тухум 30 + личинка/нимфа 90 = 190 °C, қишлайди — етук зот
    aphid: { s: [["eg", "•", 25], ["la", "—", 90], ["im", "+", 25]], w: 0 } // расмий календар: нимфа 90 + имаго 25 + тухум 25 = 140 °C, қишлайди — тухум
  };
  var STN = LANG === "ru"
    ? { im: "Имаго (взрослые)", eg: "Развитие яиц", la: "Личинка (гусеница)", pu: "Куколка", nm: "Нимфа", la_mite: "Личинка и нимфы", la_aphid: "Личинки (нимфы)", im_mite: "Самка до яйцекладки", im_aphid: "Взрослые (размножение)" }
    : { im: "Имаго (етук зот)", eg: "Тухум ривожи", la: "Личинка (қуртлик)", pu: "Ғумбак (лик)", la_mite: "Личинка ва нимфалар", la_aphid: "Личинкалар (нимфалар)", im_mite: "Урғочи (тухум қўйгунча)", im_aphid: "Етук зот (кўпайиш)" };
  function stageList(pest) {
    var d = STG[pest.id], tot = 0, i;
    for (i = 0; i < d.s.length; i++) tot += d.s[i][2];
    return d.s.map(function (x) { return { k: x[0], sym: x[1], dd: pest.gen * x[2] / tot, nm: STN[x[0] + "_" + pest.id] || STN[x[0]] }; });
  }
  function pcalTarget() {
    if (selDist && selDist.t === "u" && zoneD[selDist.i]) return { zone: zoneD[selDist.i], who: dname(items[selDist.i]) };
    if (selDist && selDist.t === "n" && zoneN[selDist.i]) return { zone: zoneN[selDist.i], who: NB[selDist.i].nm || NB[selDist.i].cn };
    if (selDist && selDist.t === "u" && !zoneD[selDist.i]) { var it = items[selDist.i]; return { ser: dseries[selDist.i], lat: GEO[selDist.i][0], who: rname(regById[it.r]) + " · " + dname(it) }; }
    if (selDist && selDist.t === "n" && !zoneN[selDist.i]) { var n = NB[selDist.i]; return { ser: nseries[selDist.i], lat: n.ll[0], who: n.cn + " · " + (n.nm || "") }; }
    if (curReg) { var ds = regDistricts[curReg] || [], la = 0; ds.forEach(function (i) { la += GEO[i][0]; }); return { ser: regSeries[curReg], lat: ds.length ? la / ds.length : 41.3, who: rname(regById[curReg]) + " — " + T.pcRegAvg }; }
    return { ser: countrySeries, lat: 41.3, who: T.country };
  }
  // кунма-кун: фаза ривожи → 5 кунлик катаклар, фаза саналари (ev), ишлов бериш ойнаси
  function pentCal(ser, pest, lat) {
    var st = stageList(pest), def = STG[pest.id], y = ser[0].t.getFullYear(), nowMs = Date.now();
    var byDay = {}; ser.forEach(function (r) { byDay[iso(r.t)] = r; });
    var pents = [];
    for (var m = 0; m < 12; m++) {
      var last = new Date(y, m + 1, 0).getDate();
      for (var p = 0; p < 6; p++) { var a = 1 + 5 * p, b = p < 5 ? a + 4 : last; pents.push({ m: m, p: p, a: new Date(y, m, a), b: new Date(y, m, b), n: b - a + 1 }); }
    }
    var cum = 0, bio = false, cut = false, si = 0, acc = 0, gen = 0, maxGen = 0, winDone = false, eff = 0;
    var ev = [], cur = null, wins = {}, w0 = pest.win ? pest.win[0] : null, w1 = pest.win ? pest.win[1] : null;
    function open(o, d) { cur = o; cur.from = d; ev.push(cur); }
    function close(d) { if (cur) cur.to = d; }
    pents.forEach(function (P) {
      P.days = 0; P.mean = 0; P.dd = 0; P.cells = {}; P.fc = false; P.win = {}; P.end = null;
      for (var d = new Date(P.a); d <= P.b; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        var r = byDay[iso(d)]; if (!r) continue;
        P.days++; P.mean += (r.mx + r.mn) / 2;
        var dd = sineDD(r.mn, r.mx, pest.base, pest.upper); P.dd += dd;
        if (d.getTime() > nowMs) P.fc = true;
        if (!cut && lat != null && d.getMonth() >= 6 && dayLen(lat, d) < pest.crit) cut = true;
        var c;
        if (!bio) { // баҳорги уйғонишгача — қишловчи фаза
          if (!cur) open({ g: 1, w: 1 }, d);
          cum += dd; c = P.cells[1] = P.cells[1] || [];
          addSym(c, { w: 1, act: dd > 0.5 });
          if (cum >= pest.emerge) {
            bio = true; gen = 1; maxGen = 1; si = def.w >= 0 ? (def.w + 1) % st.length : 0; acc = cum - pest.emerge; eff = acc;
            close(d); open({ g: 1, s: si }, d);
          }
          continue;
        }
        if (winDone) { c = P.cells[gen] = P.cells[gen] || []; addSym(c, { w: 1, act: dd > 0.5 }); continue; }
        acc += dd; eff += dd; c = P.cells[gen] = P.cells[gen] || [];
        addSym(c, { s: si });
        while (!winDone && acc >= st[si].dd) {
          acc -= st[si].dd; markDone(c, si); close(d);
          si++;
          if (si >= st.length) { // авлод тугади
            si = 0;
            if (cut && def.w === 0) { winDone = true; acc = 0; open({ g: gen, w: 1 }, d); c = P.cells[gen] = P.cells[gen] || []; addSym(c, { w: 1, act: true }); break; } // ширалар: кузда тухум қўйиб қишлайди
            gen++; maxGen = Math.max(maxGen, gen);
          }
          if (cut && si === def.w) { winDone = true; acc = 0; open({ g: gen, w: 1 }, d); }
          else open({ g: gen, s: si }, d);
          c = P.cells[gen] = P.cells[gen] || []; addSym(c, winDone ? { w: 1, act: true } : { s: si });
        }
        // ишлов бериш ойнаси: авлод бошидан эфф. GDD улуши [win0, win1]
        if (!winDone && w0 != null) {
          var fr = (eff - (gen - 1) * pest.gen) / pest.gen;
          if (fr >= w0 && fr <= w1) {
            P.win[gen] = true;
            var W = wins[gen] = wins[gen] || { from: new Date(d) }; W.to = new Date(d);
          }
        }
      }
      if (P.days) P.mean /= P.days;
      P.acc = P.days ? (bio && !winDone ? acc : null) : null;
      if (P.days && bio && !winDone) P.end = { g: gen, s: si, acc: acc };
    });
    if (cur && !cur.to) cur.to = null;
    function addSym(c, o) { for (var i = 0; i < c.length; i++) if (c[i].s === o.s && c[i].w === o.w) { if (o.act) c[i].act = true; return; } c.push(o); }
    function markDone(c, s) { for (var i = 0; i < c.length; i++) if (c[i].s === s) c[i].done = true; }
    return { pents: pents, st: st, maxGen: maxGen, ev: ev, wins: wins, y: y,
      wsym: def.w >= 0 ? st[def.w].sym : def.ws, wnm: def.w >= 0 ? st[def.w].nm : (LANG === "ru" ? "Яйцо" : "Тухум") };
  }
  var pcAll = false, pcLast = null;
  var STCOL = { im: "#dbe7fb", eg: "#fff1b8", la: "#d9efcf", pu: "#ead8c4", w: "#e6eaed" };
  function d2(d) { return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2); }
  function dfc(d) { return (d.getTime() > Date.now() ? "≈" : "") + d2(d); }
  function esc(x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  // туман/вилоят танлаш (рўйхатдан)
  function pcSelectRegion(rid) {
    selDist = null;
    if (!rid) { resetView(); return; }
    curReg = rid; tweenTo(fitRegion(regById[rid].bbox), 500);
    paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
  }
  function pcSelectDistrict(i) {
    selDist = { t: "u", i: i };
    if (curReg !== items[i].r) { curReg = items[i].r; tweenTo(fitRegion(regById[curReg].bbox), 500); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderLegend(); }
    paint(); renderDistrict();
  }
  function pcSelectors() {
    var rsel = curReg || "", dsel = selDist && selDist.t === "u" ? selDist.i : "";
    var ro = '<option value="">' + T.country + '</option>' + regIds.map(function (id) { return '<option value="' + id + '"' + (id === rsel ? " selected" : "") + '>' + esc(rname(regById[id])) + '</option>'; }).join("");
    var dl = rsel ? (regDistricts[rsel] || []).slice().sort(function (a, b) { return dname(items[a]).localeCompare(dname(items[b])); }) : [];
    var dopt = '<option value="">' + (rsel ? T.pcRegAvgOpt : "—") + '</option>' + dl.map(function (i) { return '<option value="' + i + '"' + (i === dsel ? " selected" : "") + '>' + esc(dname(items[i])) + (zoneD[i] ? " 🏜" : "") + '</option>'; }).join("");
    return '<div class="pc-sel"><label>' + T.region + ' <select id="pc-reg">' + ro + '</select></label>' +
      '<label>' + T.pcDistSel + ' <select id="pc-dist"' + (rsel ? "" : " disabled") + '>' + dopt + '</select></label></div>';
  }
  function bindSelectors(box) {
    var r = box.querySelector("#pc-reg"), d = box.querySelector("#pc-dist");
    if (r) r.onchange = function () { pcSelectRegion(r.value); };
    if (d) d.onchange = function () { if (d.value === "") pcSelectRegion(curReg); else pcSelectDistrict(+d.value); };
  }
  function drawPentCal() {
    var box = document.getElementById("fenopcal"); if (!box) return;
    if (loadState !== "ok") { box.innerHTML = ""; return; }
    var tg = pcalTarget(), pest = pestOf();
    if (tg.zone) { box.innerHTML = pcSelectors() + '<div class="fc-empty"><b>' + tg.who + '</b> — ' + T[tg.zone + "Tip"] + '</div>'; bindSelectors(box); return; }
    if (!tg.ser || !tg.ser.length) { box.innerHTML = pcSelectors() + '<div class="fc-empty">' + tg.who + ' — ' + T.nodata + '</div>'; bindSelectors(box); return; }
    var R = pentCal(tg.ser, pest, tg.lat), y = R.y;
    var nG = Math.max(1, R.maxGen);
    pcLast = { R: R, pest: pest, who: tg.who };
    var leg = R.st.map(function (x) { return '<span class="pc-lg"><i class="pc-sw" style="background:' + STCOL[x.k] + '"></i>' + x.nm + ' <i>(' + Math.round(x.dd) + ' °C)</i> <b>' + x.sym + '</b></span>'; }).join("") +
      '<span class="pc-lg"><i class="pc-sw" style="background:' + STCOL.w + '"></i>' + T.pcWinter + ': ' + R.wnm + ' <b>(' + R.wsym + ')</b></span>';
    function keyOf(o) { return o.w ? "w" : R.st[o.s].k; }
    function cellBg(arr) {
      if (!arr || !arr.length) return "";
      var ks = []; arr.forEach(function (o) { var k = keyOf(o); if (ks.indexOf(k) < 0) ks.push(k); });
      if (ks.length === 1) return "background:" + STCOL[ks[0]];
      var n = ks.length; return "background:linear-gradient(90deg," + ks.map(function (k, i) { return STCOL[k] + " " + Math.round(i / n * 100) + "% " + Math.round((i + 1) / n * 100) + "%"; }).join(",") + ")";
    }
    function cellHtml(arr) {
      if (!arr) return "";
      return arr.map(function (o) {
        if (o.w) return '<span class="pc-w">' + (o.act ? R.wsym : "(" + R.wsym + ")") + '</span>';
        return '<span class="' + (o.done ? "pc-done" : "") + '">' + R.st[o.s].sym + '</span>';
      }).join("");
    }
    function tipFor(P, g) {
      var lines = [g + "-" + T.genAbbr + " · " + T.monthsFull[P.m] + " " + ["I", "II", "III", "IV", "V", "VI"][P.p] + " (" + d2(P.a) + "–" + d2(P.b) + ")"];
      R.ev.forEach(function (e) {
        if (e.g !== g) return;
        var to = e.to || new Date(y, 11, 31);
        if (e.from > P.b || to < P.a) return;
        var nm = e.w ? T.pcWinter + " (" + R.wnm + ")" : R.st[e.s].nm;
        lines.push(nm + ": " + dfc(e.from) + " – " + (e.to ? dfc(e.to) + (e.w ? "" : " ✓") : "…"));
      });
      if (P.end && P.end.g === g && P.cells[g]) { var s = R.st[P.end.s]; lines.push(T.pcTipAcc + ": " + Math.round(P.end.acc) + " / " + Math.round(s.dd) + " °C (" + s.nm + ")"); }
      if (P.win[g]) lines.push("⚠ " + T.pcWinL);
      if (P.fc) lines.push(T.pcFcL);
      return lines.join("\n");
    }
    var nowD = updatedAt || new Date(), h = "";
    for (var blk = 0; blk < 3; blk++) {
      var ps = R.pents.slice(blk * 24, blk * 24 + 24);
      var gens = [];
      for (var g0 = 1; g0 <= nG; g0++) {
        var used = pcAll || ps.some(function (P) { return P.cells[g0] && P.cells[g0].length; });
        if (used) gens.push(g0);
      }
      var head1 = '<tr><th class="pc-rh"></th>' + [0, 1, 2, 3].map(function (q) { return '<th colspan="6" class="pc-mon">' + T.monthsFull[blk * 4 + q] + '</th>'; }).join("") + '</tr>';
      var cls = function (P) { return (P.fc ? " pc-fc" : "") + (nowD >= P.a && nowD < new Date(P.b.getTime() + 86400000) ? " pc-now" : "") + (P.p === 0 ? " pc-m0" : ""); };
      var row = function (lab, f, rc) { return '<tr' + (rc ? ' class="' + rc + '"' : '') + '><th class="pc-rh">' + lab + '</th>' + ps.map(function (P) { return '<td class="' + cls(P) + '">' + (P.days ? f(P) : "") + '</td>'; }).join("") + '</tr>'; };
      h += '<div class="pc-scroll"><table class="pc-t">' + head1 +
        row(T.pc5, function (P) { return ["I", "II", "III", "IV", "V", "VI"][P.p]; }, "pc-num") +
        row(T.pcMean, function (P) { return P.mean.toFixed(1); }) +
        row(T.pcEff, function (P) { return P.dd.toFixed(1); }) +
        row(T.pcAcc, function (P) { return P.acc == null ? "" : P.acc.toFixed(0); });
      gens.forEach(function (g, gi) {
        h += '<tr class="pc-gen' + (gi === 0 ? " pc-g1" : "") + '"><th class="pc-rh">' + g + "-" + T.genAbbr + '</th>' + ps.map(function (P) {
          var arr = P.days ? P.cells[g] : null, has = arr && arr.length;
          return '<td class="' + cls(P) + (P.win[g] ? " pc-win" : "") + '"' + (has ? ' style="' + cellBg(arr) + '" data-tip="' + esc(tipFor(P, g)) + '"' : "") + '>' + (has ? cellHtml(arr) : "") + '</td>';
        }).join("") + '</tr>';
      });
      if (!gens.length) h += '<tr class="pc-gen pc-g1"><th class="pc-rh">—</th>' + ps.map(function () { return '<td></td>'; }).join("") + '</tr>';
      h += '</table></div>';
    }
    // авлодлар бўйича саналар жадвали
    var cols = R.st.map(function (x) { return x.nm + " " + x.sym; });
    var sumRows = "";
    var wSpring = R.ev.filter(function (e) { return e.w && e.g === 1 && e.from.getMonth() < 6; })[0];
    if (wSpring) sumRows += '<tr class="pc-sw-row"><th>' + T.pcWinterSpring + '</th><td colspan="' + (cols.length + 1) + '">' + R.wnm + ' (' + R.wsym + ') — ' + (wSpring.to ? T.pcUntil.replace("{D}", dfc(wSpring.to)) : T.pcOngoing) + '</td></tr>';
    for (var g = 1; g <= nG; g++) {
      var cells = R.st.map(function (x, si) {
        var e = R.ev.filter(function (z) { return z.g === g && z.s === si; })[0];
        return '<td>' + (e ? dfc(e.from) + " – " + (e.to ? dfc(e.to) : "…") : "") + '</td>';
      }).join("");
      var W = R.wins[g];
      sumRows += '<tr><th>' + g + '</th>' + cells + '<td class="' + (W ? "pc-wincell" : "") + '">' + (W ? dfc(W.from) + " – " + dfc(W.to) : "") + '</td></tr>';
    }
    var wAut = R.ev.filter(function (e) { return e.w && e.from.getMonth() >= 6; })[0];
    if (wAut) sumRows += '<tr class="pc-sw-row"><th>' + T.pcWinterAut + '</th><td colspan="' + (cols.length + 1) + '">' + R.wnm + ' (' + R.wsym + ') — ' + T.pcFrom.replace("{D}", dfc(wAut.from)) + '</td></tr>';
    var sumTbl = '<div class="pc-sumt"><div class="pc-h2">' + T.pcSumTitle + '</div><div class="pc-scroll"><table class="pc-st"><tr><th>' + T.gen + '</th>' +
      cols.map(function (c) { return '<th>' + c + '</th>'; }).join("") + '<th>⚠ ' + T.pcWinL + '</th></tr>' + sumRows + '</table></div>' +
      '<div class="pc-note">' + T.pcFcMark + '</div></div>';
    box.innerHTML =
      pcSelectors() +
      '<div class="pc-top"><div><div class="pc-title">' + T.pcTitle.replace("{Y}", y).replace("{W}", tg.who) + '</div>' +
      '<div class="pc-pest">' + pest.nm + '</div>' +
      '<div class="pc-sub">' + T.pcBase + ' ' + pest.base + ' °C · ' + T.pcGen + ' ' + Math.round(pest.gen) + ' °C · ' + T.pcStart + ' ' + pest.emerge + ' °C</div></div>' +
      '<div class="pc-btns"><button type="button" class="pc-btn" id="pc-rows">' + (pcAll ? T.pcActRows : T.pcAllRows) + '</button>' +
      '<button type="button" class="pc-btn" id="pc-xls">⬇ Excel</button>' +
      '<button type="button" class="pc-btn pc-print" id="pc-print">🖨 ' + T.pcPrint + '</button></div></div>' +
      '<div class="pc-org"><label>' + T.pcOrg + ' <input id="pc-org" type="text" maxlength="160" value="' + esc(lsGet("pcOrg")) + '" placeholder="' + T.pcOrgPh + '"></label></div>' +
      '<div class="pc-legend">' + leg + '<span class="pc-lg"><span class="pc-done">' + R.st[0].sym + '</span> — ' + T.pcDoneL + '</span><span class="pc-lg"><i class="pc-winbox"></i> ' + T.pcWinL + '</span><span class="pc-lg"><i class="pc-fcbox"></i> ' + T.pcFcL + '</span></div>' +
      h + sumTbl +
      '<div class="pc-note">' + T.pcNote + '</div><div class="pc-tip" id="pc-tip"></div>';
    bindSelectors(box);
    box.querySelector("#pc-org").oninput = function () { lsSet("pcOrg", this.value); };
    box.querySelector("#pc-rows").onclick = function () { pcAll = !pcAll; drawPentCal(); };
    box.querySelector("#pc-xls").onclick = function () { pcExcel(); };
    box.querySelector("#pc-print").onclick = function () { pcPrint(box); };
    // катак изоҳи (сичқонча ёки бармоқ)
    var tipEl = box.querySelector("#pc-tip");
    function showTipFor(td) {
      tipEl.textContent = td.getAttribute("data-tip"); tipEl.style.display = "block";
      var br = box.getBoundingClientRect(), r = td.getBoundingClientRect();
      var x = r.left - br.left + r.width / 2, yy = r.bottom - br.top + 6;
      tipEl.style.left = Math.max(4, Math.min(x - 130, box.clientWidth - 270)) + "px"; tipEl.style.top = yy + "px";
    }
    box.onmouseover = function (e) { var td = e.target.closest("td[data-tip]"); if (td) showTipFor(td); };
    box.onmouseout = function (e) { if (e.target.closest("td[data-tip]") && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("td[data-tip]"))) tipEl.style.display = "none"; };
    box.onclick = function (e) { var td = e.target.closest("td[data-tip]"); if (td) showTipFor(td); else if (!e.target.closest(".pc-tip")) tipEl.style.display = "none"; };
  }
  // чоп этиш: сарлавҳа (ташкилот, ТАСДИҚЛАЙМАН), календар, саналар, имзо қаторлари
  function pcPrint(box) {
    var css = [].map.call(document.querySelectorAll("style"), function (x) { return x.textContent; }).join("\n");
    var w = window.open("", "_blank");
    if (!w) { window.print(); return; }
    var org = lsGet("pcOrg"), y = pcLast ? pcLast.R.y : new Date().getFullYear(), today = new Date();
    var clone = box.cloneNode(true);
    ["#pc-tip", ".pc-sel", ".pc-org", ".pc-btns"].forEach(function (s) { var x = clone.querySelector(s); if (x) x.parentNode.removeChild(x); });
    var head = '<div class="pp-head"><div class="pp-org">' + (org ? esc(org) : "_______________________________________") + '<div class="pp-cap">' + T.pcOrgCap + '</div></div>' +
      '<div class="pp-appr"><b>' + T.pcApprove + '</b><div>____________________________</div><div>____________________________</div><div>' + T.pcDateLine.replace("{Y}", y) + '</div></div></div>';
    var foot = '<div class="pp-foot"><div>' + T.pcCompiled + ': ____________________ ' + T.pcSign + '</div><div>' + T.pcResp + ': ____________________ ' + T.pcSign + '</div><div>' + T.pcPrinted + ': ' + d2(today) + '.' + today.getFullYear() + '</div></div>';
    w.document.write('<!doctype html><html lang="' + document.documentElement.lang + '"><head><meta charset="utf-8"><title>' +
      esc(box.querySelector(".pc-title").textContent) + '</title><style>' + css +
      '@page{size:A4 landscape;margin:8mm}body{margin:0;font-family:"Segoe UI",system-ui,Arial,sans-serif;color:#111}' +
      '.feno-pcal{max-width:none;margin:0;border:none;box-shadow:none;padding:0}.pc-scroll{overflow:visible;break-inside:avoid}' +
      '.pc-t{min-width:0;font-size:8.5px}.pc-t th,.pc-t td{padding:1px 1px}.pc-t tr.pc-gen td{height:auto;font-size:10.5px}.pc-t .pc-rh{width:96px;position:static}' +
      '.pc-legend{margin:4px 0 2px}.pc-lg{font-size:10px;padding:1px 6px}.pc-scroll{margin-top:5px}.pc-title{font-size:14px}.pc-pest{font-size:15px}.pc-note{font-size:9px;margin-top:4px}' +
      '.pc-sumt{break-before:page}.pc-st{font-size:10px;min-width:0}' +
      '.pp-head{display:flex;justify-content:space-between;gap:20px;margin-bottom:6px;font-size:12px}.pp-org{font-weight:700;max-width:55%}.pp-cap{font-weight:400;font-size:9px;color:#555}' +
      '.pp-appr{text-align:left;min-width:230px;line-height:1.6}.pp-appr b{letter-spacing:.06em}' +
      '.pp-foot{display:flex;justify-content:space-between;gap:16px;margin-top:14px;font-size:11px;flex-wrap:wrap}' +
      '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' + head + '<div class="feno-pcal">' + clone.innerHTML + '</div>' + foot + '</body></html>');
    w.document.close(); w.focus();
    setTimeout(function () { w.print(); }, 300);
  }
  // ===== Excel (.xlsx) — кутубхонасиз: SpreadsheetML + сиқилмаган ZIP =====
  function pcExcel() {
    if (!pcLast) return;
    var R = pcLast.R, pest = pcLast.pest, title = T.pcTitle.replace("{Y}", R.y).replace("{W}", pcLast.who);
    var nG = Math.max(1, R.maxGen), sym = ["I", "II", "III", "IV", "V", "VI"];
    function cellTxt(arr) { return arr ? arr.map(function (o) { return o.w ? (o.act ? R.wsym : "(" + R.wsym + ")") : R.st[o.s].sym + (o.done ? "*" : ""); }).join("") : ""; }
    // 1-варақ: 5 кунлик календар (3 блок)
    var s1 = [[title], [pest.nm], [T.pcBase + " " + pest.base + " °C; " + T.pcGen + " " + Math.round(pest.gen) + " °C; " + T.pcStart + " " + pest.emerge + " °C"],
      [R.st.map(function (x) { return x.sym + " " + x.nm + " (" + Math.round(x.dd) + " °C)"; }).join("; ") + "; (" + R.wsym + ") " + T.pcWinter + "; * — " + T.pcDoneL + "; ! — " + T.pcWinL], []];
    var merges = [], bold = {};
    for (var blk = 0; blk < 3; blk++) {
      var ps = R.pents.slice(blk * 24, blk * 24 + 24), r0 = s1.length;
      var mrow = [""]; for (var q = 0; q < 4; q++) { mrow.push(T.monthsFull[blk * 4 + q]); for (var k = 0; k < 5; k++) mrow.push(""); merges.push([r0, 1 + q * 6, r0, 6 + q * 6]); }
      s1.push(mrow); bold[r0] = 1;
      s1.push([T.pc5].concat(ps.map(function (P) { return sym[P.p]; }))); bold[r0 + 1] = 1;
      s1.push([T.pcMean].concat(ps.map(function (P) { return P.days ? +P.mean.toFixed(1) : ""; })));
      s1.push([T.pcEff].concat(ps.map(function (P) { return P.days ? +P.dd.toFixed(1) : ""; })));
      s1.push([T.pcAcc].concat(ps.map(function (P) { return P.acc == null ? "" : Math.round(P.acc); })));
      for (var g = 1; g <= nG; g++) {
        if (!pcAll && !ps.some(function (P) { return P.cells[g] && P.cells[g].length; })) continue;
        s1.push([g + "-" + T.genAbbr].concat(ps.map(function (P) { return P.days ? cellTxt(P.cells[g]) + (P.win[g] ? "!" : "") : ""; })));
      }
      s1.push([]);
    }
    s1.push([T.pcNote]);
    // 2-варақ: авлодлар бўйича саналар
    var s2 = [[title], [pest.nm], [], [T.gen].concat(R.st.map(function (x) { return x.nm + " " + x.sym; })).concat([T.pcWinL])];
    var b2 = { 3: 1 };
    var wS = R.ev.filter(function (e) { return e.w && e.g === 1 && e.from.getMonth() < 6; })[0];
    if (wS) s2.push([T.pcWinterSpring, R.wnm + " — " + (wS.to ? T.pcUntil.replace("{D}", dfc(wS.to)) : T.pcOngoing)]);
    for (var gg = 1; gg <= nG; gg++) {
      var rw = [gg];
      R.st.forEach(function (x, si) { var e = R.ev.filter(function (z) { return z.g === gg && z.s === si; })[0]; rw.push(e ? dfc(e.from) + " – " + (e.to ? dfc(e.to) : "…") : ""); });
      var W = R.wins[gg]; rw.push(W ? dfc(W.from) + " – " + dfc(W.to) : ""); s2.push(rw);
    }
    var wA = R.ev.filter(function (e) { return e.w && e.from.getMonth() >= 6; })[0];
    if (wA) s2.push([T.pcWinterAut, R.wnm + " — " + T.pcFrom.replace("{D}", dfc(wA.from))]);
    s2.push([]); s2.push([T.pcFcMark]);
    var blob = xlsxBlob([{ name: T.pcXlsSheet1, rows: s1, merges: merges, bold: bold, w0: 22, w: 6 }, { name: T.pcXlsSheet2, rows: s2, merges: [], bold: b2, w0: 18, w: 20 }]);
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (T.pcXlsFile + "_" + pcLast.who + "_" + pest.id + "_" + R.y).replace(/[\\/:*?"<>|·—\s]+/g, "_") + ".xlsx";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function xlsxBlob(sheets) {
    function x(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
    function col(n) { var s = ""; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
    var files = [];
    files.push(["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + '</Types>']);
    files.push(["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>']);
    files.push(["xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map(function (s, i) { return '<sheet name="' + x(s.name.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + '</sheets></workbook>']);
    files.push(["xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>']);
    files.push(["xl/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']);
    sheets.forEach(function (s, i) {
      var maxc = 0; s.rows.forEach(function (r) { if (r.length > maxc) maxc = r.length; });
      var cols = '<cols><col min="1" max="1" width="' + s.w0 + '" customWidth="1"/>' + (maxc > 1 ? '<col min="2" max="' + maxc + '" width="' + s.w + '" customWidth="1"/>' : "") + '</cols>';
      var data = s.rows.map(function (r, ri) {
        return '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) {
          if (v === "" || v == null) return "";
          var ref = col(ci) + (ri + 1), st = (s.bold[ri] || ri < 2) ? ' s="1"' : "";
          return typeof v === "number" ? '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>' : '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + x(v) + '</t></is></c>';
        }).join("") + '</row>';
      }).join("");
      var mg = s.merges.length ? '<mergeCells count="' + s.merges.length + '">' + s.merges.map(function (m) { return '<mergeCell ref="' + col(m[1]) + (m[0] + 1) + ':' + col(m[3]) + (m[2] + 1) + '"/>'; }).join("") + '</mergeCells>' : "";
      files.push(["xl/worksheets/sheet" + (i + 1) + ".xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + cols + '<sheetData>' + data + '</sheetData>' + mg + '</worksheet>']);
    });
    return zipStore(files, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }
  var CRC_T = null;
  function crc32(u8) {
    if (!CRC_T) { CRC_T = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) crc = CRC_T[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files, mime) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    function le(n, b) { var a = []; for (var i = 0; i < b; i++) { a.push(n & 0xFF); n = n >>> 8; } return a; }
    files.forEach(function (f) {
      var name = enc.encode(f[0]), data = enc.encode(f[1]), crc = crc32(data);
      var lh = [].concat([0x50, 0x4B, 0x03, 0x04], le(20, 2), le(0x0800, 2), le(0, 2), le(0, 2), le(0x21, 2), le(crc, 4), le(data.length, 4), le(data.length, 4), le(name.length, 2), le(0, 2));
      parts.push(new Uint8Array(lh), name, data);
      central.push(new Uint8Array([].concat([0x50, 0x4B, 0x01, 0x02], le(20, 2), le(20, 2), le(0x0800, 2), le(0, 2), le(0, 2), le(0x21, 2), le(crc, 4), le(data.length, 4), le(data.length, 4), le(name.length, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(off, 4))), name);
      off += lh.length + name.length + data.length;
    });
    var csize = 0; central.forEach(function (c) { csize += c.length; });
    var end = new Uint8Array([].concat([0x50, 0x4B, 0x05, 0x06], le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2), le(csize, 4), le(off, 4), le(0, 2)));
    return new Blob(parts.concat(central).concat([end]), { type: mime });
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
    box.innerHTML = '<div class="fn-head">' + (NOW && NOW.toDateString() !== new Date().toDateString() ? fmtDate(NOW) + ' ' + T.stateOn : T.nowLabel) + ' · ' + who + ' · ' + pest.nm + '</div>' +
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
    if (!selDist) { dinfo.style.display = "none"; drawPentCal(); return; }
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
    drawPentCal();
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
    im.setAttribute("id", "desertlayer"); im.setAttribute("href", m.png + "?v=2");
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
