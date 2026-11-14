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
    { id: "bollworm", heat: 36, harm: ["la"], etl: "Экономический порог: 3–5 гусениц на 100 растений (тонковолокнистый хлопчатник), 8–12 — средневолокнистый.", nm: "Хлопковая совка", ttl: "Прогноз распространения хлопковой совки", win: [0.14, 0.37], wst: "яйца и молодые гусеницы",  base: 11, upper: 35, gen: 640, emerge: 250, crit: 12.9, bin: 1, winter: "куколка — в почве (5–10 см)", rec: "Глубокая зяблевая вспашка уничтожает зимующих куколок." },
    { id: "mite", harm: ["la", "im"], nm: "Паутинный клещ", ttl: "Прогноз распространения паутинного клеща", win: [0, 0.45], wst: "яйца и личинки",  base: 7.1, upper: 40, gen: 190, emerge: 70, crit: 12.8, bin: 4, winter: "оплодотворённые самки — под растительными остатками и корой", rec: "Удаление и измельчение растительных остатков хлопчатника." },
    { id: "cutworm", harm: ["la"], nm: "Озимая совка", ttl: "Прогноз распространения озимой совки", win: [0.18, 0.4], wst: "яйца и молодые гусеницы",  base: 10, upper: 35, gen: 670, emerge: 150, crit: 13.0, bin: 1, winter: "куколка — в почве", rec: "Глубокая вспашка и борьба с сорняками." },
    { id: "aphid", harm: ["la", "im"], nm: "Тли", ttl: "Прогноз распространения тлей", win: [0, 0.35], wst: "молодые колонии (личинки)",  base: 5, upper: 30, gen: 140, emerge: 25, crit: 12.5, bin: 5, winter: "яйца — на сорняках и побегах", rec: "Борьба с сорняками снижает запас зимующих яиц." }
  ] : [
    { id: "bollworm", heat: 36, harm: ["la"], etl: "Иқтисодий зарар чегараси: 100 ўсимликда 3–5 қурт (ингичка толали ғўза), 8–12 қурт (ўрта толали).", nm: "Ғўза тунлами (кўсак қурти)", ttl: "Ғўза тунламини тарқалиш прогнози", win: [0.14, 0.37], wst: "тухум ва ёш қуртлар",  base: 11, upper: 35, gen: 640, emerge: 250, crit: 12.9, bin: 1, winter: "ғумбак — тупроқда (5–10 см чуқурликда)", rec: "Кузги чуқур шудгор қишлаётган ғумбакларни нобуд қилади." },
    { id: "mite", harm: ["la", "im"], nm: "Ўргимчаккана", ttl: "Ўргимчакканани тарқалиш прогнози", win: [0, 0.45], wst: "тухум ва личинкалар",  base: 7.1, upper: 40, gen: 190, emerge: 70, crit: 12.8, bin: 4, winter: "уруғланган урғочи — ўсимлик қолдиғи ва пўстлоқ остида", rec: "Ғўзапоя ва ўсимлик қолдиқларини йиғиштириш/майдалаш." },
    { id: "cutworm", harm: ["la"], nm: "Кузги тунлам", ttl: "Кузги тунламни тарқалиш прогнози", win: [0.18, 0.4], wst: "тухум ва ёш қуртлар",  base: 10, upper: 35, gen: 670, emerge: 150, crit: 13.0, bin: 1, winter: "ғумбак — тупроқда", rec: "Кузги чуқур шудгор ва бегона ўтларни йўқотиш." },
    { id: "aphid", harm: ["la", "im"], nm: "Ширалар", ttl: "Шираларни тарқалиш прогнози", win: [0, 0.35], wst: "ёш колониялар (личинкалар)",  base: 5, upper: 30, gen: 140, emerge: 25, crit: 12.5, bin: 5, winter: "тухум — бегона ўт ва новдаларда", rec: "Бегона ўтларни йўқотиш қишлаётган тухумни камайтиради." }
  ];
  var T = LANG === "ru" ? {
    title: "ФЕНОЛОГИЧЕСКИЙ ПРОГНОЗ", label: "Вредитель", region: "Область", districts: "районов",
    back: "← Вся страна", hint: "👆 Нажмите на район — область увеличится, и календарь покажет её поколения.",
    gen: "Поколение", gdd: "Накоплено ГДД", next: "Следующее поколение", progress: "до следующего",
    nodata: "нет данных", loading: "⏳ Расчёт по температуре…", wxPending: "⏳ Данные о температуре готовятся (первый сбор ~2 часа). Обновите страницу позже.", err: "⚠️ Не удалось загрузить данные.",
    ended: "сезон завершён (диапауза)", approx: "≈ прогноз", src: "Модель ГДД (синус-метод) · Open-Meteo · посевы: Esri/IO Land Cover 2024",
    base: "порог", country: "В среднем по стране", today: "сегодня", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендарь — поколения за сезон", note: "⚠️ Модельная оценка (градусо-дни с учётом весеннего выхода с зимовки и осеннего короткого дня; параметры подогнаны к известному числу поколений в Узбекистане), не официальный мониторинг.",
    nowLabel: "Текущее состояние", stateOn: "— состояние", phaseActive: "АКТИВНОЕ РАЗВИТИЕ", phaseDiapause: "ДИАПАУЗА (зимовка)",
    phasePre: "ЗИМОВКА — ожидается весеннее пробуждение", winterLabel: "Форма зимовки", recLabel: "Рекомендация",
    windowLabel: "Окно обработки", windowTxt: "перед яйцекладкой следующего поколения",
    sumTitle: "Заключение", sumUnit: "р-нов", sumActive: "Активное развитие", sumDiap: "Зимовка (диапауза)",
    sumMaxGen: "Макс. поколений", sumAvgGen: "В среднем", sumTop: "Наибольшее давление", desertTip: "🏜 Пустыня — посевов нет, прогноз не даётся", nocropTip: "Посевов нет (степь/горы) — прогноз не даётся", sumNoFc: "Без прогноза (пустыня/нет посевов)", diToday: "Сегодня (max / min)", di7: "Средняя за 7 дней", diCrop: "Посевы", diCity: "Городская территория — температура по центру района", diClose: "Закрыть", bioL: "Начало сезона (выход с зимовки)", cutL: "Осенняя диапауза (короткий день)", noNextCut: "новое поколение не начнётся — короткий день", genAbbr: "пок.", winNow: "ОТКРЫТО сейчас", winOpenL: "⚠ Окно обработки открыто сейчас", winSoonL: "Откроется в ближайшие 7 дней", winShort: "время обработки", winNone: "в этом сезоне больше нет", dateL: "Показана дата", cmpAdd: "К сравнению", cmpAdded: "В сравнении", cmpTitle: "Сравнение районов", cmpSub: "Даты начала поколений (для 1-го — выход с зимовки, начало сезона)", cmpMore: "(показаны первые 8 из {N})", cmpDist: "Район", cmpSeason: "начало сезона", cmpGens: "Поколений", cmpClear: "Очистить", cmpNote: "Жирным — самая ранняя дата в столбце. До 5 районов: выберите район и нажмите «К сравнению».", cmpXls: "Сравнение", monthsGen: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"], smoBtn: "Сплошная заливка", harmBtn: "Вредящая стадия", harmNote: "Вредящая стадия — проведите учёт численности на полях.", heatDia: "риск летней диапаузы (жара)", heatLeg: "Куколка в жару — риск летней диапаузы (max ≥ {T}°C)", heatNote: "☀ Перед окукливанием 5 дней средний max {A}°C — часть куколок может впасть в летнюю диапаузу; вылет бабочек может задержаться (в модели не учтено).", olTitle: "📆 Прогноз до конца сезона", olSub: "по погоде прошлых {N} лет: наиболее вероятная дата (диапазон 10–90%)", olYears: "в {K} из {N} лет", olNone: "до конца года новых фаз не ожидается", sprBtn: "Граница распространения", sprLeg: "Граница территории распространения (посевы, где сезон вредителя начался)", srcLine: "Источник: Open-Meteo, Esri/IO Land Cover 2024 · модель ГДД", mapMode: "Карта", modeGen: "Поколения", modePhase: "Фаза (стадия)", phaseNow: "Фаза на дату", lgDesert: "🏜 Нет посевов", tlYear: "Год", tlYearEnd: "Конец года", wxFresh: "🔄 Данные о температуре обновлены: {D} ({H} ч назад)", wxStale: "⚠ Данные о температуре не обновлялись {H} ч (последнее: {D}) — прогноз может быть устаревшим.", wxArchive: "📦 Архив {Y} г. — данные о температуре по 31 декабря", tlLabel: "Дата", tlToday: "Сегодня", tlPlay: "▶ Сезон", tlPause: "⏸ Пауза", tlFc: "прогноз", tlPast: "прошлое", tlHint: "Двигайте ползунок — карта, календарь и окна обработки покажут состояние на выбранную дату.",
    sumOverLead: "Сезон в основном завершён", sumActiveLead: "Вредитель ещё активен",
    sumOverTxt: "из {N} районов {E} перешли в диапаузу (зимовку). За сезон накоплено до {G} поколений.",
    sumActiveTxt: "в {A} районах идёт активное развитие (до {G} поколений).",
    pcCmpOn: "☰ Компактно", pcCmpOff: "☷ Каждое поколение отдельно", pcSymMode: "+ • — Символы", pcIcoMode: "🐛 Рисунки", pcAllRows: "Все строки", pcActRows: "Только активные строки", pcWinL: "окно обработки (яйца и молодые личинки)", pcSumTitle: "Даты по поколениям", pcWinterSpring: "Зимовка (весна)", pcWinterAut: "Уход на зимовку", pcUntil: "до {D}", pcFrom: "с {D}", pcOngoing: "продолжается", pcFcMark: "≈ — по прогнозу погоды; ✓ — фаза завершена.", pcDistSel: "Район", pcRegAvgOpt: "— среднее по области —", pcOrg: "Организация (для печати):", pcOrgPh: "напр.: Андижанский областной центр защиты растений", pcOrgCap: "(наименование организации)", pcApprove: "УТВЕРЖДАЮ", pcDateLine: "«___» ____________ {Y} г.", pcCompiled: "Составил", pcResp: "Ответственный специалист", pcSign: "(Ф.И.О., подпись)", pcPrinted: "Дата печати", pcTipAcc: "накоплено", pcXlsSheet1: "Календарь", pcXlsSheet2: "Даты", pcXlsFile: "Фенокалендарь", pcTitle: "{Y} г. — фенологический календарь: {W}", pcRegAvg: "среднее по области", pcBase: "Нижний порог развития", pcGen: "сумма эффективных температур на поколение", pcStart: "весенний выход с зимовки", pcWinter: "Зимующая фаза", pcPrint: "Печать / PDF", pc5: "5 дней", pcMean: "Средняя °C", pcEff: "Эффект. °C (5 дн.)", pcAcc: "Накоплено в фазе °C", pcDoneL: "фаза завершилась в эти 5 дней", pcFcL: "прогноз", pcNote: "Эффективные температуры — синус-метод по суточным max/min (нижний и верхний порог), до весеннего выхода с зимовки идёт развитие зимующей фазы; осенью при коротком дне развитие останавливается на зимующей фазе. Модельная оценка, не официальный мониторинг.", monthsFull: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    sumToGen: "до {G} поколений"
  } : {
    title: "ФЕНОЛОГИК ПРОГНОЗ", label: "Зараркунанда", region: "Вилоят", districts: "туман",
    back: "← Бутун мамлакат", hint: "👆 Туманни босинг — вилоят катталашиб, календарь ўша вилоят авлодларини кўрсатади.",
    gen: "Авлод", gdd: "Йиғилган GDD", next: "Кейинги авлод", progress: "кейингисигача",
    nodata: "маълумот йўқ", loading: "⏳ Ҳарорат бўйича ҳисоб…", wxPending: "⏳ Ҳарорат маълумоти тайёрланмоқда (биринчи йиғиш ~2 соат). Бироздан сўнг саҳифани янгиланг.", err: "⚠️ Маълумот юкланмади.",
    ended: "мавсум якуни (диапауза)", approx: "≈ прогноз", src: "GDD модели (синус усули) · Open-Meteo · экин майдонлари: Esri/IO Land Cover 2024",
    base: "ост-ҳарорат", country: "Республика ўртачаси", today: "бугун", months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    calTitle: "Фенокалендар — мавсум давомидаги авлодлар", note: "⚠️ Моделга асосланган тахмин (эффектив ҳарорат, баҳорги уйғониш ва кузги кун қисқариши ҳисобга олинган; параметрлар Ўзбекистондаги маълум авлод сонига мослаштирилган), расмий мониторинг эмас.",
    nowLabel: "Бугунги ҳолат", stateOn: "ҳолати", phaseActive: "ФАОЛ РИВОЖЛАНИШ", phaseDiapause: "ДИАПАУЗА (қишлов)",
    phasePre: "ҚИШЛОВ — баҳорда уйғониш кутилмоқда", winterLabel: "Қишлаш шакли", recLabel: "Тавсия",
    windowLabel: "Ишлов бериш ойнаси", windowTxt: "навбатдаги авлод тухум қўйиши олдидан",
    sumTitle: "Хулоса", sumUnit: "туман", sumActive: "Фаол ривожланиш", sumDiap: "Қишлов (диапауза)",
    sumMaxGen: "Энг кўп авлод", sumAvgGen: "Ўртача", sumTop: "Энг юқори босим", desertTip: "🏜 Чўл — экин майдони йўқ, прогноз берилмайди", nocropTip: "Экин майдони йўқ (дашт/тоғ) — прогноз берилмайди", sumNoFc: "Прогноз берилмади (чўл/экин майдони йўқ)", diToday: "Бугун (max / min)", di7: "Охирги 7 кун ўртача", diCrop: "Экин майдони", diCity: "Шаҳар ҳудуди — ҳарорат туман марказидан", diClose: "Ёпиш", bioL: "Мавсум боши (қишловдан чиқиш)", cutL: "Кузги диапауза (кун қисқариши)", noNextCut: "янги авлод бошланмайди — кун қисқа", genAbbr: "авлод", winNow: "ҲОЗИР очиқ", winOpenL: "⚠ Ишлов бериш ойнаси ҳозир очиқ", winSoonL: "7 кун ичида очилади", winShort: "ишлов бериш вақти", winNone: "бу мавсумда бошқа йўқ", dateL: "Кўрсатилган сана", cmpAdd: "Солиштиришга", cmpAdded: "Солиштиришда", cmpTitle: "Туманларни солиштириш", cmpSub: "Авлодлар бошланиш саналари (1-авлод — қишловдан чиқиш, мавсум боши)", cmpMore: "({N} тадан биринчи 8 таси)", cmpDist: "Туман", cmpSeason: "мавсум боши", cmpGens: "Авлодлар", cmpClear: "Тозалаш", cmpNote: "Қалин — устундаги энг эрта сана. 5 тагача туман: туманни танланг ва «Солиштиришга» тугмасини босинг.", cmpXls: "Солиштириш", smoBtn: "Силлиқ ранг", harmBtn: "Зарарли босқич", harmNote: "Зарарли босқич — далада зараркунанда сонини ҳисобга олинг.", heatDia: "ёзги диапауза хавфи (жазирама)", heatLeg: "Жазирамадаги ғумбак — ёзги диапауза хавфи (max ≥ {T}°C)", heatNote: "☀ Ғумбакка ўтиш олдидан 5 кун ўртача max {A}°C — ғумбакларнинг бир қисми ёзги диапаузага кириши мумкин; капалак учиб чиқиши кечикиши мумкин (моделда ҳисобга олинмаган).", olTitle: "📆 Мавсум охиригача прогноз", olSub: "ўтган {N} йил об-ҳавоси бўйича: энг эҳтимолли сана (10–90% оралиқ)", olYears: "{N} йилдан {K} тасида", olNone: "йил охиригача янги фаза кутилмайди", sprBtn: "Тарқалиш чегараси", sprLeg: "Тарқалган майдон чегараси (мавсуми бошланган экин майдонлари)", srcLine: "Манба: Open-Meteo, Esri/IO Land Cover 2024 · GDD модели", mapMode: "Харита", modeGen: "Авлодлар", modePhase: "Фаза (босқич)", phaseNow: "Шу кундаги фаза", lgDesert: "🏜 Экин майдони йўқ", tlYear: "Йил", tlYearEnd: "Йил охири", wxFresh: "🔄 Ҳарорат маълумоти янгиланган: {D} ({H} соат олдин)", wxStale: "⚠ Ҳарорат маълумоти {H} соатдан бери янгиланмаган (охирги: {D}) — прогноз эскирган бўлиши мумкин.", wxArchive: "📦 {Y} йил архиви — ҳарорат маълумоти 31-декабргача", tlLabel: "Сана", tlToday: "Бугун", tlPlay: "▶ Мавсум", tlPause: "⏸ Тўхтатиш", tlFc: "прогноз", tlPast: "ўтган кун", tlHint: "Сургични суринг — харита, календар ва ишлов бериш ойналари танланган кундаги ҳолатни кўрсатади.",
    sumOverLead: "Мавсум асосан якунланди", sumActiveLead: "Зараркунанда ҳали фаол",
    sumOverTxt: "{N} тумандан {E} таси диапаузага (қишловга) ўтган. Мавсум давомида {G} авлодгача ривожланган.",
    sumActiveTxt: "{A} туманда фаол ривожланиш кетмоқда ({G} авлодгача).",
    pcCmpOn: "☰ Ихчам кўриниш", pcCmpOff: "☷ Ҳар авлод алоҳида", pcSymMode: "+ • — Белгилар", pcIcoMode: "🐛 Расмлар", pcAllRows: "Барча қаторлар", pcActRows: "Фақат фаол қаторлар", pcWinL: "ишлов бериш ойнаси (тухум ва ёш личинкалар)", pcSumTitle: "Авлодлар бўйича саналар", pcWinterSpring: "Қишлов (баҳор)", pcWinterAut: "Қишловга кетиш", pcUntil: "{D} гача", pcFrom: "{D} дан", pcOngoing: "давом этмоқда", pcFcMark: "≈ — об-ҳаво прогнози бўйича; ✓ — фаза тугади.", pcDistSel: "Туман", pcRegAvgOpt: "— вилоят ўртачаси —", pcOrg: "Ташкилот (чоп этиш учун):", pcOrgPh: "мас.: Андижон вилояти ўсимликларни ҳимоя қилиш маркази", pcOrgCap: "(ташкилот номи)", pcApprove: "ТАСДИҚЛАЙМАН", pcDateLine: "«___» ____________ {Y} й.", pcCompiled: "Тузувчи", pcResp: "Масъул мутахассис", pcSign: "(Ф.И.Ш., имзо)", pcPrinted: "Чоп этилган сана", pcTipAcc: "тўпланган", pcXlsSheet1: "Календар", pcXlsSheet2: "Саналар", pcXlsFile: "Фенокалендар", pcTitle: "{Y} йил — фенологик календар: {W}", pcRegAvg: "вилоят ўртачаси", pcBase: "Ривожланишнинг қуйи ҳарорат чегараси", pcGen: "бир авлод учун самарали ҳарорат йиғиндиси", pcStart: "баҳорги уйғониш", pcWinter: "Қишловчи фаза", pcPrint: "Чоп этиш / PDF", pc5: "5 кун", pcMean: "Ўртача °C", pcEff: "Самарали °C (5 кун)", pcAcc: "Фазада тўпланган °C", pcDoneL: "фаза шу 5 кунликда тугади", pcFcL: "прогноз", pcNote: "Самарали ҳарорат — кунлик max/min бўйича синус усулида (қуйи ва юқори чегара); баҳорги уйғонишгача қишловчи фаза ривожланади; кузда кун қисқаргач ривожланиш қишловчи фазада тўхтайди. Модел баҳоси, расмий мониторинг эмас.", monthsFull: ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"],
    sumToGen: "{G} авлодгача"
  };

  // авлод рақами → ранг (кўп авлод = кучли босим)
  var GENCOL = ["#d6dde2", "#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"];
  var DIA_COL = "#90a4ae"; // диапауза (қишлов) — нейтрал кулранг-кўк, фаол эмас (хавфсиз эмас!)
  var DESERT_COL = "#ffffff"; // чўл / экин майдони йўқ — прогноз йўқ (Esri/IO Land Cover 2024)
  var zoneD = {}, zoneN = {}; // туман → "desert" | "nocrop" (data/wx-points.json)
  function genColor(g) { if (g == null || g < 1) return GENCOL[0]; var b = (PESTS[curPest] && PESTS[curPest].bin) || 1; return GENCOL[Math.min(Math.ceil(g / b), GENCOL.length - 1)]; }
  // қишловдаги туман: ранг — мавсумда етишган авлод сони, устида кулранг штрих (❄)
  function genIdx(g) { if (g == null || g < 1) return 0; var b = (PESTS[curPest] && PESTS[curPest].bin) || 1; return Math.min(Math.ceil(g / b), GENCOL.length - 1); }
  function phFill(ph) { if (!ph) return GENCOL[0]; if (!ph.ended) return genColor(ph.gen); var k = genIdx(ph.gen); return k ? "url(#dia" + k + ")" : DIA_COL; }
  function fillFor(i) { if (zoneD[i]) return DESERT_COL; if (MAPMODE === "phase") return phaseCol(phaseOf("u", i)); return phFill(dpheno[i]); }
  // ===== фаза харитаси: танланган кунда ҳар туманда қайси фаза (тухум/қурт/ғумбак/етук зот/қишлов) =====
  var MAPMODE = "phase", PHC = {}; // харита очилганда — фаза режими
  var PHCOL = { im: "#4f86c6", eg: "#f2c12e", la: "#e53935", pu: "#43a047", ph: "#1b4d20", w: "#b0bec5" }; // ph — жазирамада ғумбак (ёзги диапауза хавфи)
  var HARM = false, HARM_OFF = "#e6e9eb"; // «Зарарли босқич» режими: бошқа фазалар хира // тухум — сариқ, қурт/личинка — қизил, ғумбак — яшил
  function phaseR(t, i) {
    var pest = pestOf(), key = pest.id + ":" + t + i;
    if (!(key in PHC)) {
      var ser = t === "u" ? dseries[i] : nseries[i], lat = t === "u" ? GEO[i][0] : NB[i].ll[0];
      PHC[key] = ser && ser.length ? pentCal(ser, pest, lat) : null;
    }
    return PHC[key];
  }
  function phaseOf(t, i) {
    var R = phaseR(t, i); if (!R) return null;
    var d = updatedAt || new Date(), dd = new Date(d.getFullYear(), d.getMonth(), d.getDate()), hit = null;
    for (var j = 0; j < R.ev.length; j++) { var e = R.ev[j]; if (e.from <= dd && (!e.to || e.to >= dd)) hit = e; }
    if (!hit) return null;
    var k = hit.w ? "w" : R.st[hit.s].k, nm = hit.w ? T.pcWinter + " — " + R.wnm : R.st[hit.s].nm;
    if (k === "pu" && hit.heat) { k = "ph"; nm += " — ☀ " + T.heatDia; }
    return { k: k, g: hit.g, nm: nm, w: !!hit.w, heat: hit.heat || null, R: R };
  }
  // ғўза тунлами учун харита ранглари: тухум — сариқ, қурт — қизил, ғумбак — яшил
  var PHCOL_P = { bollworm: { eg: "#f2c12e", la: "#e53935", pu: "#43a047" } };
  function phc(k) { var o = PHCOL_P[pestOf().id]; return (o && o[k]) || PHCOL[k]; }
  function isHarm(k) { var h = pestOf().harm || ["la"]; return h.indexOf(k) >= 0; }
  function phcM(k) { return HARM && !isHarm(k) ? HARM_OFF : phc(k); } // харита ранги (режимни ҳисобга олиб)
  function phaseCol(ph) { return ph ? phcM(ph.k) : GENCOL[0]; }
  function phaseTxt(ph) { return ph ? (ph.w ? "❄ " + ph.nm : ph.g + "-" + T.genAbbr + ": " + ph.nm) : T.nodata; }

  var DATA = window.UZ_DISTRICTS, items = DATA.items, regions = DATA.regions, GEO = window.UZ_GEO;
  var regById = {}; regions.forEach(function (r) { regById[r.id] = r; });
  function rname(r) { return LANG === "ru" ? r.ru : r.c; }
  function dname(it) { return LANG === "ru" ? (it.ru || it.n) : (it.u || it.c); }

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
  // йил архиви: ?yil=YYYY → data/wx-YYYY.json; январ–февралда ўтган мавсум (бор бўлса) кўрсатилади
  var YQ = (function () { var m = /[?&]yil=(\d{4})/.exec(location.search); return m ? +m[1] : null; })();
  var YEAR = null, CURY = null, YEARS = [], PAST = false, WXU = null;
  var loadState = "loading", updatedAt = null, wxPending = false, selDist = null, WXP = null;
  var WXRAW = null, OUTLOOK = null; // OUTLOOK — data/outlook.json (scripts/build-outlook.cjs)

  function centroid(d) {
    var nums = d.match(/-?\d+(?:\.\d+)?/g); if (!nums) return [0, 0];
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i + 1 < nums.length; i += 2) { sx += +nums[i]; sy += +nums[i + 1]; n++; }
    return [sx / n, sy / n];
  }
  items.forEach(function (it) { it.ctr = centroid(it.d); });

  var ctlT = document.querySelector(".feno-ctl .title"); if (ctlT) ctlT.textContent = T.title;

  var pestBox = document.getElementById("pestsel");
  (function () { // харита кўриниши: авлод / фаза
    var tb = document.querySelector(".feno-ctl"); if (!tb) return;
    var row = document.createElement("div"); row.className = "selrow";
    row.innerHTML = '<span class="sellab">' + T.mapMode + ':</span><div class="pestsel" id="modesel">' +
      '<button class="pbtn" data-m="gen">' + T.modeGen + '</button><button class="pbtn on" data-m="phase">' + T.modePhase + '</button>' +
      '<button class="pbtn spr on" data-spr="1">▬ ' + T.sprBtn + '</button>' +
      '<button class="pbtn smo on" data-smo="1"><i class="smo-ic"></i>' + T.smoBtn + '</button>' +
      '<button class="pbtn harm" data-harm="1">⚠ ' + T.harmBtn + '</button></div>';
    tb.appendChild(row);
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".pbtn"); if (!b) return;
      if (b.hasAttribute("data-spr")) { SPR.on = !SPR.on; b.classList.toggle("on", SPR.on); SPR.key = null; drawSpread(); return; }
      if (b.hasAttribute("data-smo")) { FLD.on = !FLD.on; b.classList.toggle("on", FLD.on); FLD.key = null; paint(); return; }
      if (b.hasAttribute("data-harm")) {
        HARM = !HARM; b.classList.toggle("on", HARM); FLD.key = null;
        if (HARM && MAPMODE !== "phase") { MAPMODE = "phase"; [].forEach.call(row.querySelectorAll(".pbtn[data-m]"), function (x) { x.classList.toggle("on", x.getAttribute("data-m") === "phase"); }); }
        paint(); renderLegend(); renderDistrict(); return;
      }
      MAPMODE = b.getAttribute("data-m");
      [].forEach.call(row.querySelectorAll(".pbtn[data-m]"), function (x) { x.classList.toggle("on", x === b); });
      paint(); renderLegend(); renderDistrict();
    });
  })();
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
  // ===== инфографика қатлами: давлат номлари ва шаҳарлар (вилоятга яқинлашганда яширинади) =====
  var gI = document.createElementNS(ns, "g"); gI.setAttribute("id", "infolayer"); gI.setAttribute("pointer-events", "none"); svg.insertBefore(gI, gl);
  var INFO_C = LANG === "ru"
    ? [["КАЗАХСТАН", 66.2, 44.9], ["ТУРКМЕНИСТАН", 59.4, 39.9], ["ТАДЖИКИСТАН", 70.4, 38.75], ["КЫРГЫЗСТАН", 73.25, 41.95], ["АФГАНИСТАН", 65.9, 36.7]]
    : [["ҚОЗОҒИСТОН", 66.2, 44.9], ["ТУРКМАНИСТОН", 59.4, 39.9], ["ТОЖИКИСТОН", 70.4, 38.75], ["ҚИРҒИЗИСТОН", 73.25, 41.95], ["АФҒОНИСТОН", 65.9, 36.7]];
  var INFO_UZ = [LANG === "ru" ? "УЗБЕКИСТАН" : "ЎЗБЕКИСТОН", 63.4, 42.35];
  // [ном uz, ном ru, lon, lat, ёзув жойи: r — ўнгда, l — чапда, t — тепада, b — пастда, пойтахт]
  var INFO_T = [["Тошкент", "Ташкент", 69.24, 41.31, "r", 1], ["Самарқанд", "Самарканд", 66.96, 39.65, "r"], ["Бухоро", "Бухара", 64.42, 39.77, "b"],
    ["Андижон", "Андижан", 72.34, 40.78, "r"], ["Наманган", "Наманган", 71.67, 41.0, "t"], ["Фарғона", "Фергана", 71.78, 40.38, "b"],
    ["Қарши", "Карши", 65.79, 38.86, "r"], ["Термиз", "Термез", 67.28, 37.22, "r"], ["Нукус", "Нукус", 59.61, 42.46, "l"],
    ["Урганч", "Ургенч", 60.63, 41.55, "b"], ["Навоий", "Навои", 65.38, 40.10, "t"], ["Жиззах", "Джизак", 67.84, 40.12, "b"], ["Гулистон", "Гулистан", 68.78, 40.49, "r"]];
  function svgEl(tag, at, txt) { var e = document.createElementNS(ns, tag); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
  function buildInfo() {
    gI.innerHTML = "";
    INFO_C.forEach(function (c) { var p = pj(c[1], c[2]); gI.appendChild(svgEl("text", { x: p[0], y: p[1], "class": "ig-country", "text-anchor": "middle" }, c[0])); });
    var u = pj(INFO_UZ[1], INFO_UZ[2]); gI.appendChild(svgEl("text", { x: u[0], y: u[1], "class": "ig-uz", "text-anchor": "middle" }, INFO_UZ[0]));
    INFO_T.forEach(function (c) {
      var p = pj(c[2], c[3]), nm = LANG === "ru" ? c[1] : c[0], pos = c[4];
      if (c[5]) gI.appendChild(svgEl("rect", { x: p[0] - 3.6, y: p[1] - 3.6, width: 7.2, height: 7.2, "class": "ig-cap" }));
      else gI.appendChild(svgEl("circle", { cx: p[0], cy: p[1], r: 2.8, "class": "ig-dot" }));
      var at = { "class": "ig-city" + (c[5] ? " cap" : "") };
      if (pos === "r") { at.x = p[0] + 6; at.y = p[1] + 4; }
      else if (pos === "l") { at.x = p[0] - 6; at.y = p[1] + 4; at["text-anchor"] = "end"; }
      else if (pos === "t") { at.x = p[0]; at.y = p[1] - 7; at["text-anchor"] = "middle"; }
      else { at.x = p[0]; at.y = p[1] + 15; at["text-anchor"] = "middle"; }
      gI.appendChild(svgEl("text", at, nm));
    });
  }
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
  var lgGenHtml = null;
  function renderLegend() {
    var lg = document.getElementById("legend"); if (!lg) return;
    if (lgGenHtml == null) lgGenHtml = lg.innerHTML;
    if (MAPMODE === "phase") {
      var pest = pestOf(), st = stageList(pest), def = STG[pest.id];
      var wk = def.w >= 0 ? st[def.w].k : "eg", wnm = def.w >= 0 ? st[def.w].nm : (LANG === "ru" ? "Яйцо" : "Тухум");
      lg.innerHTML = st.map(function (x) {
        var row = '<div class="lg full">' + ico(pest.id, x.k) + '<i style="background:' + phcM(x.k) + '"></i><b>' + x.nm + (HARM && isHarm(x.k) ? " ⚠" : "") + '</b></div>';
        if (x.k === "pu" && pest.heat) row += '<div class="lg full">' + ico(pest.id, "pu") + '<i style="background:' + phcM("ph") + '"></i><b>☀ ' + T.heatLeg.replace("{T}", pest.heat) + '</b></div>';
        return row;
      }).join("") +
        '<div class="lg full">' + ico(pest.id, wk, "pc-wi") + '<i style="background:' + (HARM ? HARM_OFF : PHCOL.w) + '"></i><b>❄ ' + T.pcWinter + ' (' + wnm + ')</b></div>' +
        '<div class="lg full"><i class="lg-spr"></i><b>' + T.sprLeg + '</b></div>';
      return;
    }
    if (lg.innerHTML !== lgGenHtml) lg.innerHTML = lgGenHtml;
    var bs = lg.querySelectorAll(".lg b"), b = pestOf().bin || 1;
    if (lgFirst == null && bs[0]) lgFirst = bs[0].textContent;
    for (var c = 1; c <= 6 && c <= bs.length; c++) {
      var t = b === 1 ? (c === 1 ? lgFirst : (c < 6 ? String(c) : "6+")) : (c < 6 ? ((c - 1) * b + 1) + "–" + (c * b) : (5 * b + 1) + "+");
      if (b > 1 && c === 1) t += " " + T.genAbbr;
      bs[c - 1].textContent = t;
      // ғўза ва кузги тунлам: 6 авлод бўлмайди (энг кўпи 5) — «6+» кўрсатилмайди
      bs[c - 1].parentNode.style.display = (b === 1 && c === 6) ? "none" : "";
    }
  }
  function pestOf() { return PESTS[curPest]; }

  function paint() {
    if (gI.nextSibling !== gl) svg.insertBefore(gI, gl); // номлар — чўл қатлами ва чегара устида
    var ub = svg.querySelector("#uzborder"); if (ub && ub.nextSibling !== gI) svg.insertBefore(ub, gI); // давлат чегараси — тарқалиш чизиғи устида
    spreadSoon();
    gI.style.display = curReg ? "none" : "";
    var bd = document.getElementById("bigdate"), dd = updatedAt || new Date();
    if (bd) bd.innerHTML = '<div class="bd-t">' + pestOf().ttl + '</div><div class="bd-d">' + dd.getDate() + ' ' + (T.monthsGen || T.monthsFull)[dd.getMonth()].toUpperCase() + ' <span class="bd-y">' + dd.getFullYear() + '</span></div>';
    var nt = stage.querySelector(".note"), nowR = new Date();
    if (nt) nt.textContent = T.srcLine + " · " + d2(nowR) + "." + nowR.getFullYear();
    var smo = fieldOn();
    fieldSoon();
    for (var i = 0; i < items.length; i++) {
      var inReg = !curReg || items[i].r === curReg;
      paths[i].setAttribute("fill", fillFor(i));
      paths[i].setAttribute("opacity", smo ? "0" : (inReg ? "1" : "0.12")); // силлиқ майдонда — кўринмас (лекин тултип/босиш ишлайди)
      var selU = selDist && selDist.t === "u" && selDist.i === i;
      paths[i].setAttribute("stroke", selU ? "#0f2b1f" : "#fff");
      paths[i].setAttribute("stroke-width", selU ? "2.2" : (curReg && items[i].r === curReg ? "0.9" : "0.5"));
    }
    for (var k = 0; k < npaths.length; k++) {
      var nph = npheno[k];
      npaths[k].setAttribute("fill", zoneN[k] ? DESERT_COL : (MAPMODE === "phase" ? (nph ? phaseCol(phaseOf("n", k)) : "#e3e8ea") : (nph ? phFill(nph) : "#e3e8ea")));
      var selN = selDist && selDist.t === "n" && selDist.i === k;
      npaths[k].setAttribute("opacity", smo ? (selN ? "0.9" : "0") : (selN ? "0.9" : (curReg ? "0.12" : "0.42")));
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
    ? { im: "Имаго (взрослые)", eg: "Развитие яиц", la: "Гусеница", pu: "Куколка", nm: "Нимфа", la_mite: "Личинка и нимфы", la_aphid: "Личинки (нимфы)", im_mite: "Самка до яйцекладки", im_aphid: "Взрослые (размножение)" }
    : { im: "Имаго (етук зот)", eg: "Тухум ривожи", la: "Қурт", pu: "Ғумбак (лик)", la_mite: "Личинка ва нимфалар", la_aphid: "Личинкалар (нимфалар)", im_mite: "Урғочи (тухум қўйгунча)", im_aphid: "Етук зот (кўпайиш)" };
  function stageList(pest) {
    var d = STG[pest.id], tot = 0, i;
    for (i = 0; i < d.s.length; i++) tot += d.s[i][2];
    return d.s.map(function (x) { return { k: x[0], sym: x[1], dd: pest.gen * x[2] / tot, nm: STN[x[0] + "_" + pest.id] || STN[x[0]] }; });
  }
  function pcalTarget() {
    if (selDist && selDist.t === "u" && zoneD[selDist.i]) return { zone: zoneD[selDist.i], who: dname(items[selDist.i]) };
    if (selDist && selDist.t === "n" && zoneN[selDist.i]) return { zone: zoneN[selDist.i], who: NB[selDist.i].nm || NB[selDist.i].cn };
    if (selDist && selDist.t === "u" && !zoneD[selDist.i]) { var it = items[selDist.i]; return { ser: dseries[selDist.i], lat: GEO[selDist.i][0], who: rname(regById[it.r]) + " · " + dname(it), key: "u" + selDist.i }; }
    if (selDist && selDist.t === "n" && !zoneN[selDist.i]) { var n = NB[selDist.i]; return { ser: nseries[selDist.i], lat: n.ll[0], who: n.cn + " · " + (n.nm || ""), key: "n" + selDist.i }; }
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
    var cum = 0, bio = false, cut = false, si = 0, acc = 0, gen = 0, maxGen = 0, winDone = false, eff = 0, dd10 = [], mx5 = [];
    var ev = [], cur = null, wins = {}, w0 = pest.win ? pest.win[0] : null, w1 = pest.win ? pest.win[1] : null;
    function open(o, d) { cur = o; cur.from = d; ev.push(cur); }
    function close(d) { if (cur) cur.to = d; }
    pents.forEach(function (P) {
      P.days = 0; P.mean = 0; P.dd = 0; P.cells = {}; P.fc = false; P.win = {}; P.end = null;
      for (var d = new Date(P.a); d <= P.b; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        var r = byDay[iso(d)]; if (!r) continue;
        mx5.push(r.mx); if (mx5.length > 5) mx5.shift();
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
        // кеч кузги авлод: кун қисқа (диапауза) ва совуқ тушди (охирги 10 кунда < 20 °C·кун) ёки ноябр —
        // ривожланиш тўхтайди, авлод қишловчи фазага ўтади (аввал «қурт» босқичида йил охиригача қолиб кетарди)
        dd10.push(dd); if (dd10.length > 10) dd10.shift();
        if (cut && d.getMonth() >= 9 && (d.getMonth() >= 10 || (dd10.length === 10 && dd10.reduce(function (x, v) { return x + v; }, 0) < 20))) {
          close(d); winDone = true; acc = 0; open({ g: gen, w: 1 }, d);
          c = P.cells[gen] = P.cells[gen] || []; addSym(c, { w: 1, act: true }); continue;
        }
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
          else {
            open({ g: gen, s: si }, d);
            // ёзги диапауза: ғумбакка ўтиш олдидан (қурт/олдинғумбак) 5 кунлик ўртача max ≥ pest.heat (33–39 °C
            // тажрибаларида эркакларнинг ~63%, урғочиларнинг ~11% ғумбаги «ухлаб қолган»)
            if (pest.heat && st[si].k === "pu" && mx5.length === 5) { var a5 = mx5.reduce(function (x, v) { return x + v; }, 0) / 5; if (a5 >= pest.heat) cur.heat = Math.round(a5 * 10) / 10; }
          }
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
      wsym: def.w >= 0 ? st[def.w].sym : def.ws, wk: def.w >= 0 ? st[def.w].k : "eg", wnm: def.w >= 0 ? st[def.w].nm : (LANG === "ru" ? "Яйцо" : "Тухум") };
  }
  var pcAll = false, pcLast = null;
  var STCOL = { im: "#dbe7fb", eg: "#fff1b8", la: "#d9efcf", pu: "#ead8c4", w: "#e6eaed" };
  function d2(d) { return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2); }
  function dfc(d) { return (d.getTime() > Date.now() ? "≈" : "") + d2(d); }
  function esc(x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  // ===== фаза расмлари (SVG, currentColor) =====
  var ICO = (function () {
    var L = ' fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"';
    var egg = '<ellipse cx="12" cy="13" rx="6" ry="8"/><ellipse cx="10" cy="10" rx="1.6" ry="2.4" fill="#fff" opacity=".55"/>';
    var larva = '<circle cx="4.5" cy="14" r="2.6"/><circle cx="8.3" cy="12.6" r="2.8"/><circle cx="12.2" cy="12.2" r="2.8"/><circle cx="16" cy="12.6" r="2.8"/><circle cx="19.6" cy="11.4" r="3"/><circle cx="20.5" cy="10.5" r=".8" fill="#fff"/><path d="M7.5 15.3v2.4M11.5 15v2.4M15.5 15.3v2.4"' + L + '/>';
    var pupa = '<path d="M12 2.5c3.6 2.8 5 6.3 5 9.8 0 4.4-2.2 7.7-5 9.2-2.8-1.5-5-4.8-5-9.2 0-3.5 1.4-7 5-9.8z"/><path d="M8.3 12h7.4M8.7 15h6.6M9.7 18h4.6" stroke="#fff" stroke-width=".9" opacity=".6"/>';
    var moth = '<path d="M12 7c-1 0-1.4 1-1.4 2.2v8.6c0 1.2.6 2.2 1.4 2.2s1.4-1 1.4-2.2V9.2C13.4 8 13 7 12 7z"/><path d="M10.6 10 3 6.5c-.8-.4-1.5.3-1.2 1.1L5 15.5c.3.7 1 .9 1.6.6l4-2.2z"/><path d="M13.4 10 21 6.5c.8-.4 1.5.3 1.2 1.1L19 15.5c-.3.7-1 .9-1.6.6l-4-2.2z"/><path d="M11.5 7.5 9.5 4M12.5 7.5l2-3.5"' + L + '/>';
    var mite = '<ellipse cx="12" cy="13.2" rx="5" ry="5.6"/><circle cx="12" cy="7" r="1.8"/><circle cx="10.2" cy="12.4" r="1.1" fill="#fff" opacity=".5"/><circle cx="13.8" cy="14" r="1.1" fill="#fff" opacity=".5"/><path d="M7.6 10.4 3.4 7.6M7.1 12.6H2.6M7.2 14.8 3.2 17.6M8.2 16.8 5 21M16.4 10.4l4.2-2.8M16.9 12.6h4.5M16.8 14.8l4 2.8M15.8 16.8 19 21"' + L + '/>';
    var aphid = '<path d="M12 6.8c2.6 0 4.2 2.6 4.2 6.2 0 4-1.9 7.2-4.2 7.2s-4.2-3.2-4.2-7.2c0-3.6 1.6-6.2 4.2-6.2z"/><circle cx="12" cy="5.6" r="1.7"/><path d="M11.2 4.5 8 1.6M12.8 4.5 16 1.6M8.2 10 4.4 8.4M8 13H3.8M8.4 16 5 18.6M15.8 10l3.8-1.6M16 13h4.2M15.6 16l3.4 2.6M10.2 19.2 9.2 22M13.8 19.2l1 2.8"' + L + '/>';
    function small(g) { return '<g transform="translate(12 13) scale(.72) translate(-12 -13)">' + g + '</g>'; }
    var set = { im: moth, eg: egg, la: larva, pu: pupa };
    return {
      bollworm: set, cutworm: set,
      mite: { eg: egg, la: small(mite), im: mite },
      aphid: { eg: egg, la: small(aphid), im: aphid }
    };
  })();
  function ico(pestId, k, cls) { var g = (ICO[pestId] || {})[k]; return g ? '<svg class="pc-ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + g + '</svg>' : ""; }
  var pcIco = lsGet("pcIco") !== "0";
  var pcCmp = lsGet("pcCmp") === "1";
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
  function drawPentCal() { drawPentCal0(); drawCmp(); }
  function drawPentCal0() {
    var box = document.getElementById("fenopcal"); if (!box) return;
    if (loadState !== "ok") { box.innerHTML = ""; return; }
    var tg = pcalTarget(), pest = pestOf();
    if (tg.zone) { box.innerHTML = pcSelectors() + '<div class="fc-empty"><b>' + tg.who + '</b> — ' + T[tg.zone + "Tip"] + '</div>'; bindSelectors(box); return; }
    if (!tg.ser || !tg.ser.length) { box.innerHTML = pcSelectors() + '<div class="fc-empty">' + tg.who + ' — ' + T.nodata + '</div>'; bindSelectors(box); return; }
    var R = pentCal(tg.ser, pest, tg.lat), y = R.y;
    var nG = Math.max(1, R.maxGen);
    pcLast = { R: R, pest: pest, who: tg.who };
    var pid = pest.id;
    function symOf(k, sym, cls) { return pcIco ? ico(pid, k, cls) : '<span class="' + (cls || "") + '">' + sym + '</span>'; }
    var leg = R.st.map(function (x) { return '<span class="pc-lg"><i class="pc-sw" style="background:' + STCOL[x.k] + '"></i>' + (pcIco ? ico(pid, x.k) + " " : "") + x.nm + ' <i>(' + Math.round(x.dd) + ' °C)</i> <b>' + x.sym + '</b></span>'; }).join("") +
      '<span class="pc-lg"><i class="pc-sw" style="background:' + STCOL.w + '"></i>' + (pcIco ? ico(pid, R.wk, "pc-wi") + " " : "") + T.pcWinter + ': ' + R.wnm + ' <b>(' + R.wsym + ')</b></span>';
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
        if (o.w) return pcIco ? ico(pid, R.wk, o.act ? "pc-wa" : "pc-wi") : '<span class="pc-w">' + (o.act ? R.wsym : "(" + R.wsym + ")") + '</span>';
        return symOf(R.st[o.s].k, R.st[o.s].sym, o.done ? "pc-done" : "");
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
      if (pcCmp && nG > 6) {
        h += '<tr class="pc-gen pc-g1 pc-cmp"><th class="pc-rh">' + T.gen + '</th>' + ps.map(function (P) {
          var ks = P.days ? Object.keys(P.cells).map(Number).filter(function (k) { return P.cells[k].length; }).sort(function (a, b) { return a - b; }) : [];
          if (!ks.length) return '<td class="' + cls(P) + '"></td>';
          var all = []; ks.forEach(function (k) { all = all.concat(P.cells[k]); });
          return '<td class="' + cls(P) + '" style="background:#f7faf7" data-tip="' + esc(ks.map(function (k) { return tipFor(P, k); }).join("\n\n")) + '">' +
            ks.map(function (k) { return '<span class="pc-cg"><span class="pc-gn">' + k + '</span>' + cellHtml(P.cells[k]) + '</span>'; }).join("") + '</td>';
        }).join("") + '</tr>';
        gens = [];
      }
      gens.forEach(function (g, gi) {
        h += '<tr class="pc-gen' + (gi === 0 ? " pc-g1" : "") + '"><th class="pc-rh">' + g + "-" + T.genAbbr + '</th>' + ps.map(function (P) {
          var arr = P.days ? P.cells[g] : null, has = arr && arr.length;
          return '<td class="' + cls(P) + '"' + (has ? ' style="' + cellBg(arr) + '" data-tip="' + esc(tipFor(P, g)) + '"' : "") + '>' + (has ? cellHtml(arr) : "") + '</td>';
        }).join("") + '</tr>';
      });
      if (!gens.length && !(pcCmp && nG > 6)) h += '<tr class="pc-gen pc-g1"><th class="pc-rh">—</th>' + ps.map(function () { return '<td></td>'; }).join("") + '</tr>';
      h += '</table></div>';
    }
    // авлодлар бўйича саналар жадвали
    var cols = R.st.map(function (x) { return (pcIco ? ico(pid, x.k) + " " : "") + x.nm + " " + x.sym; });
    var sumRows = "";
    var wSpring = R.ev.filter(function (e) { return e.w && e.g === 1 && e.from.getMonth() < 6; })[0];
    if (wSpring) sumRows += '<tr class="pc-sw-row"><th>' + T.pcWinterSpring + '</th><td colspan="' + cols.length + '">' + R.wnm + ' (' + R.wsym + ') — ' + (wSpring.to ? T.pcUntil.replace("{D}", dfc(wSpring.to)) : T.pcOngoing) + '</td></tr>';
    for (var g = 1; g <= nG; g++) {
      var cells = R.st.map(function (x, si) {
        var e = R.ev.filter(function (z) { return z.g === g && z.s === si; })[0];
        return '<td>' + (e ? dfc(e.from) + " – " + (e.to ? dfc(e.to) : "…") : "") + '</td>';
      }).join("");
      sumRows += '<tr><th>' + g + '</th>' + cells + '</tr>';
    }
    var wAut = R.ev.filter(function (e) { return e.w && e.from.getMonth() >= 6; })[0];
    if (wAut) sumRows += '<tr class="pc-sw-row"><th>' + T.pcWinterAut + '</th><td colspan="' + cols.length + '">' + R.wnm + ' (' + R.wsym + ') — ' + T.pcFrom.replace("{D}", dfc(wAut.from)) + '</td></tr>';
    var sumTbl = '<div class="pc-sumt"><div class="pc-h2">' + T.pcSumTitle + '</div><div class="pc-scroll"><table class="pc-st"><tr><th>' + T.gen + '</th>' +
      cols.map(function (c) { return '<th>' + c + '</th>'; }).join("") + '</tr>' + sumRows + '</table></div>' +
      '<div class="pc-note">' + T.pcFcMark + '</div></div>';
    box.innerHTML =
      pcSelectors() +
      '<div class="pc-top"><div><div class="pc-title">' + T.pcTitle.replace("{Y}", y).replace("{W}", tg.who) + '</div>' +
      '<div class="pc-pest">' + pest.nm + '</div>' +
      '<div class="pc-sub">' + T.pcBase + ' ' + pest.base + ' °C · ' + T.pcGen + ' ' + Math.round(pest.gen) + ' °C · ' + T.pcStart + ' ' + pest.emerge + ' °C</div></div>' +
      '<div class="pc-btns">' + (tg.key ? '<button type="button" class="pc-btn" id="pc-add"' + (cmpHas(tg.key) || CMP.length >= 5 ? ' disabled' : '') + '>➕ ' + (cmpHas(tg.key) ? T.cmpAdded : T.cmpAdd) + '</button>' : '') + '<button type="button" class="pc-btn" id="pc-ico">' + (pcIco ? T.pcSymMode : T.pcIcoMode) + '</button>' + (nG > 6 ? '<button type="button" class="pc-btn" id="pc-cmp">' + (pcCmp ? T.pcCmpOff : T.pcCmpOn) + '</button>' : '') + '<button type="button" class="pc-btn" id="pc-rows"' + (pcCmp && nG > 6 ? ' style="display:none"' : '') + '>' + (pcAll ? T.pcActRows : T.pcAllRows) + '</button>' +
      '<button type="button" class="pc-btn" id="pc-xls">⬇ Excel</button>' +
      '<button type="button" class="pc-btn pc-print" id="pc-print">🖨 ' + T.pcPrint + '</button></div></div>' +
      '<div class="pc-org"><label>' + T.pcOrg + ' <input id="pc-org" type="text" maxlength="160" value="' + esc(lsGet("pcOrg")) + '" placeholder="' + T.pcOrgPh + '"></label></div>' +
      '<div class="pc-legend">' + leg + '<span class="pc-lg">' + symOf(R.st[0].k, R.st[0].sym, "pc-done") + ' — ' + T.pcDoneL + '</span><span class="pc-lg"><i class="pc-fcbox"></i> ' + T.pcFcL + '</span></div>' +
      h + sumTbl +
      '<div class="pc-note">' + T.pcNote + '</div><div class="pc-tip" id="pc-tip"></div>';
    bindSelectors(box);
    box.querySelector("#pc-org").oninput = function () { lsSet("pcOrg", this.value); };
    box.querySelector("#pc-rows").onclick = function () { pcAll = !pcAll; drawPentCal(); };
    var cmpB = box.querySelector("#pc-cmp"); if (cmpB) cmpB.onclick = function () { pcCmp = !pcCmp; lsSet("pcCmp", pcCmp ? "1" : "0"); drawPentCal(); };
    box.querySelector("#pc-ico").onclick = function () { pcIco = !pcIco; lsSet("pcIco", pcIco ? "1" : "0"); drawPentCal(); };
    box.querySelector("#pc-xls").onclick = function () { pcExcel(); };
    var addB = box.querySelector("#pc-add"); if (addB) addB.onclick = function () { if (!cmpHas(tg.key) && CMP.length < 5) { CMP.push(tg.key); cmpSave(); drawPentCal(); var c = document.getElementById("fenocmp"); if (c) c.scrollIntoView({ behavior: "smooth", block: "nearest" }); } };
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
  // ===== туманларни солиштириш (2–5 туман): авлодлар бошланиш саналари =====
  var CMP = (function () { try { var a = JSON.parse(localStorage.getItem("pcCmpList") || "[]"); return Array.isArray(a) ? a.slice(0, 5) : []; } catch (e) { return []; } })();
  function cmpSave() { lsSet("pcCmpList", JSON.stringify(CMP)); }
  function cmpHas(k) { return CMP.indexOf(k) >= 0; }
  function cmpName(k) {
    var t = k.charAt(0), i = +k.slice(1);
    if (t === "u") return items[i] ? rname(regById[items[i].r]) + " · " + dname(items[i]) : k;
    return NB[i] ? NB[i].cn + " · " + (NB[i].nm || "") : k;
  }
  function cmpData() {
    var rows = [], maxG = 0;
    CMP.forEach(function (k) {
      var t = k.charAt(0), i = +k.slice(1);
      var zone = t === "u" ? zoneD[i] : zoneN[i];
      var R = zone ? null : phaseR(t, i);
      var r = { k: k, nm: cmpName(k), starts: [], wout: null, gens: 0, zone: zone };
      if (R) {
        R.ev.forEach(function (e) {
          if (!e.w && r.starts[e.g - 1] == null) r.starts[e.g - 1] = e.from;
          if (e.w && e.from.getMonth() >= 6 && !r.wout) r.wout = e.from;
        });
        r.gens = R.maxGen; if (R.maxGen > maxG) maxG = R.maxGen;
      }
      rows.push(r);
    });
    return { rows: rows, maxG: maxG, cols: Math.min(maxG, 8) };
  }
  function drawCmp() {
    var box = document.getElementById("fenocmp"); if (!box) return;
    if (loadState !== "ok" || !CMP.length) { box.innerHTML = ""; return; }
    var D = cmpData(), pest = pestOf(), h = "";
    var hdr = '<tr><th>' + T.cmpDist + '</th>';
    for (var g = 1; g <= D.cols; g++) hdr += '<th>' + g + '-' + T.genAbbr + (g === 1 ? '<br><small>' + T.cmpSeason + '</small>' : '') + '</th>';
    hdr += '<th>' + T.pcWinterAut + '</th><th>' + T.cmpGens + '</th><th></th></tr>';
    // ҳар устунда энг эрта сана — қалин
    var early = [];
    for (var c = 0; c < D.cols; c++) { var mn = null; D.rows.forEach(function (r) { var d = r.starts[c]; if (d && (!mn || d < mn)) mn = d; }); early.push(mn); }
    D.rows.forEach(function (r, ri) {
      h += '<tr><th>' + esc(r.nm) + '</th>';
      if (r.zone) { h += '<td colspan="' + (D.cols + 2) + '" class="cmp-z">' + T[r.zone + "Tip"] + '</td>'; }
      else {
        for (var c2 = 0; c2 < D.cols; c2++) { var d = r.starts[c2]; h += '<td' + (d && early[c2] && d.getTime() === early[c2].getTime() && D.rows.length > 1 ? ' class="cmp-early"' : '') + '>' + (d ? dfc(d) : "—") + '</td>'; }
        h += '<td>' + (r.wout ? dfc(r.wout) : "—") + '</td><td><b>' + r.gens + '</b></td>';
      }
      h += '<td><button type="button" class="cmp-x" data-k="' + r.k + '" title="' + T.diClose + '">×</button></td></tr>';
    });
    box.innerHTML = '<div class="pc-top"><div><div class="pc-title">' + T.cmpTitle + '</div><div class="pc-pest">' + pest.nm + '</div>' +
      '<div class="pc-sub">' + T.cmpSub + (D.maxG > D.cols ? ' ' + T.cmpMore.replace("{N}", D.maxG) : '') + '</div></div>' +
      '<div class="pc-btns"><button type="button" class="pc-btn" id="cmp-xls">⬇ Excel</button><button type="button" class="pc-btn" id="cmp-print">🖨 ' + T.pcPrint + '</button><button type="button" class="pc-btn" id="cmp-clear">' + T.cmpClear + '</button></div></div>' +
      '<div class="pc-scroll"><table class="pc-st cmp-t">' + hdr + h + '</table></div>' +
      '<div class="pc-note">' + T.cmpNote + ' ' + T.pcFcMark + '</div>';
    [].forEach.call(box.querySelectorAll(".cmp-x"), function (b) { b.onclick = function () { CMP = CMP.filter(function (k) { return k !== b.getAttribute("data-k"); }); cmpSave(); drawPentCal(); }; });
    box.querySelector("#cmp-clear").onclick = function () { CMP = []; cmpSave(); drawPentCal(); };
    box.querySelector("#cmp-print").onclick = function () { printDoc(box, T.cmpTitle + " — " + pest.nm); };
    box.querySelector("#cmp-xls").onclick = function () {
      var rows = [[T.cmpTitle + " — " + pest.nm + " — " + (YEAR || "")], [T.cmpSub], [],
        [T.cmpDist].concat((function () { var a = []; for (var g = 1; g <= D.maxG; g++) a.push(g + "-" + T.genAbbr); return a; })()).concat([T.pcWinterAut, T.cmpGens])];
      D.rows.forEach(function (r) {
        if (r.zone) { rows.push([r.nm, T[r.zone + "Tip"]]); return; }
        var a = [r.nm]; for (var g = 0; g < D.maxG; g++) a.push(r.starts[g] ? dfc(r.starts[g]) : "");
        rows.push(a.concat([r.wout ? dfc(r.wout) : "", r.gens]));
      });
      rows.push([]); rows.push([T.cmpNote + " " + T.pcFcMark]);
      saveBlob(xlsxBlob([{ name: T.cmpXls, rows: rows, merges: [], bold: { 3: 1 }, w0: 30, w: 11 }]), (T.cmpXls + "_" + pest.id + "_" + (YEAR || "")) + ".xlsx");
    };
  }
  function saveBlob(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name.replace(/[\\/:*?"<>|·—\s]+/g, "_");
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  // умумий чоп этиш (сарлавҳа: ташкилот + ТАСДИҚЛАЙМАН; пастда имзо қаторлари)
  function printDoc(box, title) {
    var css = [].map.call(document.querySelectorAll("style"), function (x) { return x.textContent; }).join("\n");
    var w = window.open("", "_blank"); if (!w) { window.print(); return; }
    var org = lsGet("pcOrg"), y = YEAR || new Date().getFullYear(), today = new Date();
    var clone = box.cloneNode(true);
    [].forEach.call(clone.querySelectorAll(".pc-btns,.cmp-x,.pc-sel,.pc-org,#pc-tip"), function (x) { x.parentNode.removeChild(x); });
    w.document.write('<!doctype html><html lang="' + document.documentElement.lang + '"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + css +
      '@page{size:A4 landscape;margin:10mm}body{margin:0;font-family:"Segoe UI",system-ui,Arial,sans-serif;color:#111}.feno-pcal{max-width:none;margin:0;border:none;box-shadow:none;padding:0}.pc-scroll{overflow:visible}' +
      '.pp-head{display:flex;justify-content:space-between;gap:20px;margin-bottom:10px;font-size:12px}.pp-org{font-weight:700;max-width:55%}.pp-cap{font-weight:400;font-size:9px;color:#555}.pp-appr{min-width:230px;line-height:1.6}.pp-appr b{letter-spacing:.06em}' +
      '.pp-foot{display:flex;justify-content:space-between;gap:16px;margin-top:18px;font-size:11px;flex-wrap:wrap}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>' +
      '<div class="pp-head"><div class="pp-org">' + (org ? esc(org) : "_______________________________________") + '<div class="pp-cap">' + T.pcOrgCap + '</div></div><div class="pp-appr"><b>' + T.pcApprove + '</b><div>____________________________</div><div>____________________________</div><div>' + T.pcDateLine.replace("{Y}", y) + '</div></div></div>' +
      '<div class="feno-pcal">' + clone.innerHTML + '</div>' +
      '<div class="pp-foot"><div>' + T.pcCompiled + ': ____________________ ' + T.pcSign + '</div><div>' + T.pcResp + ': ____________________ ' + T.pcSign + '</div><div>' + T.pcPrinted + ': ' + d2(today) + '.' + today.getFullYear() + '</div></div></body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 300);
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
      [R.st.map(function (x) { return x.sym + " " + x.nm + " (" + Math.round(x.dd) + " °C)"; }).join("; ") + "; (" + R.wsym + ") " + T.pcWinter + "; * — " + T.pcDoneL], []];
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
        s1.push([g + "-" + T.genAbbr].concat(ps.map(function (P) { return P.days ? cellTxt(P.cells[g]) : ""; })));
      }
      s1.push([]);
    }
    s1.push([T.pcNote]);
    // 2-варақ: авлодлар бўйича саналар
    var s2 = [[title], [pest.nm], [], [T.gen].concat(R.st.map(function (x) { return x.nm + " " + x.sym; }))];
    var b2 = { 3: 1 };
    var wS = R.ev.filter(function (e) { return e.w && e.g === 1 && e.from.getMonth() < 6; })[0];
    if (wS) s2.push([T.pcWinterSpring, R.wnm + " — " + (wS.to ? T.pcUntil.replace("{D}", dfc(wS.to)) : T.pcOngoing)]);
    for (var gg = 1; gg <= nG; gg++) {
      var rw = [gg];
      R.st.forEach(function (x, si) { var e = R.ev.filter(function (z) { return z.g === gg && z.s === si; })[0]; rw.push(e ? dfc(e.from) + " – " + (e.to ? dfc(e.to) : "…") : ""); });
      s2.push(rw);
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
      body = T.gen + ': <b>' + ph.gen + '</b> (' + Math.round(ph.progress * 100) + '% ' + T.progress + ') · ' + T.next + ': <b>' + nextTxt + '</b>';
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
        (Object.keys(zoneD).length ? '<div class="fn-rec"><b>' + T.sumNoFc + ':</b> ' + Object.keys(zoneD).map(function (i) { return dname(items[i]); }).join(", ") + '</div>' : '') +
        (over ? '<div class="fn-rec"><b>' + T.recLabel + ':</b> ' + pest.rec + '</div>' : '') +
      '</div>' +
      '<div class="fc-note">' + T.note + ' · ' + T.src + '</div>';
  }

  // ===== ҳодисалар =====
  function drill(i) { var rid = items[i].r; if (curReg !== rid) { curReg = rid; tweenTo(fitRegion(regById[rid].bbox), 500); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend(); } }
  function phLine(ph) { return ph ? (ph.ended ? "❄ " + T.phaseDiapause : (T.gen + " " + ph.gen + " · " + Math.round(ph.gdd) + "°Д")) : (loadState === "loading" ? T.loading : T.nodata); }
  function showTip(e) {
    var t = e.target, html = null;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), it = items[i];
      html = "<b>" + dname(it) + "</b><br>" + rname(regById[it.r]) + "<br>" + (zoneD[i] ? T[zoneD[i] + "Tip"] : (MAPMODE === "phase" ? phaseTxt(phaseOf("u", i)) : phLine(dpheno[i])));
    } else if (t && t.tagName === "path" && t.hasAttribute("data-n")) {
      var k = +t.getAttribute("data-n"), n = NB[k];
      html = (n.nm ? "<b>" + n.nm + "</b><br>" : "") + n.cn + "<br>" + (zoneN[k] ? T[zoneN[k] + "Tip"] : (MAPMODE === "phase" ? phaseTxt(phaseOf("n", k)) : phLine(npheno[k])));
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
  // узоқ муддатли прогноз: ўтган йиллар об-ҳавоси билан ҳисобланган кейинги фазалар (data/outlook.json)
  function outlookHtml(i, pest) {
    var P = OUTLOOK.p && OUTLOOK.p[pest.id], L = P && P[String(i)]; if (!L) return "";
    var N = OUTLOOK.years.length, t = updatedAt || new Date(), t0 = Math.floor((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(YEAR, 0, 1)) / 864e5);
    var st = stageList(pest), nm = {}; st.forEach(function (x) { nm[x.k] = x.nm; });
    function dd(k) { return fmtDate(new Date(YEAR, 0, 1 + k)); }
    var rows = L.filter(function (r) { return r[3] >= t0; }).slice(0, 10).map(function (r) {
      var lab = r[1] === "w" ? "❄ " + T.pcWinter : (nm[r[1]] || r[1]) + " · " + r[0] + "-" + T.genAbbr;
      var rng = r[2] === r[4] ? "" : ' <span class="di-sub">(' + dd(r[2]) + " – " + dd(r[4]) + ")</span>";
      var yrs = r[5] < N ? ' <span class="di-sub">· ' + T.olYears.replace("{K}", r[5]).replace("{N}", N) + "</span>" : "";
      return "<tr><td>" + lab + "</td><td><b>" + dd(r[3]) + "</b>" + rng + yrs + "</td></tr>";
    });
    return '<div class="di-ol"><div class="di-olh">' + T.olTitle + '</div><div class="di-ols">' + T.olSub.replace("{N}", N) + '</div>' +
      (rows.length ? '<table class="di-t">' + rows.join("") + "</table>" : '<div class="di-ols">' + T.olNone + "</div>") + "</div>";
  }
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
      var phN = phaseOf(selDist.t, i);
      var rows = [
        [T.phaseNow, '<b>' + phaseTxt(phN) + '</b>'],
        [T.gen, '<b>' + ph.gen + '</b> <span class="di-sub">(' + Math.round(ph.progress * 100) + '% ' + T.progress + ')</span>'],
        [T.gdd, '<b>' + Math.round(ph.gdd) + '</b> °Д <span class="di-sub">(' + T.base + ' ' + pest.base + '°C)</span>'],
        [T.next, '<b>' + (ph.ended ? T.ended : (ph.noNext ? T.noNextCut : (ph.next ? fmtDate(ph.next) + (ph.approx ? " " + T.approx : "") : "—"))) + '</b>']
      ];
      if (ph.seasonStart) rows.push([T.bioL, '<b>' + fmtDate(ph.seasonStart) + '</b>']);
      if (ph.cutoff) rows.push([T.cutL, '<b>' + fmtDate(ph.cutoff) + '</b>']);
      var now = updatedAt || new Date(), td = dayOf(ser, iso(now)), s7 = 0, c7 = 0;
      if (td) rows.push([NOW ? fmtDate(NOW) + ' (max / min)' : T.diToday, '<b>' + Math.round(td.mx) + '° / ' + Math.round(td.mn) + '°</b>']);
      if (ser) for (var j = 0; j < ser.length; j++) { var dd = (now - ser[j].t) / 86400000; if (dd >= 0 && dd < 7) { s7 += (ser[j].mx + ser[j].mn) / 2; c7++; } }
      if (c7) rows.push([T.di7, '<b>' + (s7 / c7).toFixed(1) + '°C</b>']);
      h += '<table class="di-t">' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join("") + '</table>';
      if (phN && phN.heat) h += '<div class="di-note heat">' + T.heatNote.replace("{A}", phN.heat) + '</div>';
      if (phN && !phN.w && isHarm(phN.k)) h += '<div class="di-note harm">⚠ ' + (pest.etl || T.harmNote) + '</div>';
    }
    if (OUTLOOK && selDist.t === "u" && !zone && ph) h += outlookHtml(i, pest);
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
    return fetch("data/uz-neighbors.geojson?v=6").then(function (r) { return r.json(); }).then(function (gj) {
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
        bl.setAttribute("d", d); bl.setAttribute("fill", "none"); bl.setAttribute("stroke", "#000");
        bl.setAttribute("stroke-width", "2.2"); bl.setAttribute("stroke-linejoin", "round");
        bl.setAttribute("style", "pointer-events:none"); bl.setAttribute("id", "uzborder"); svg.insertBefore(bl, gI);
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
  // очиқ чўл қатлами (Esri/IO Land Cover 2024, data/desert-mask.png) — барча зараркунандалар учун
  // туман ранглари устидан қумранг; тултиплар ишлайверади (pointer-events:none)
  // маска кўриниши: 3 марта катталаштириб (билинеар + юмшатиш), ярим даражада кесилади → яқинлаштирганда
  // зинапоя-катаклар ўрнига силлиқ эгри чет (чети 1 пиксел юмшатилган)
  function smoothMask(src) {
    var K = 3, W = src.width * K, H = src.height * K, c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.filter = "blur(" + (K * 0.9) + "px)"; x.drawImage(src, 0, 0, W, H); x.filter = "none"; // бурчакларни юмалоқлаш
    var id = x.getImageData(0, 0, W, H), d = id.data;
    for (var k = 3; k < d.length; k += 4) { var v = d[k]; d[k] = v < 112 ? 0 : (v > 144 ? 255 : Math.round((v - 112) * 255 / 32)); d[k - 3] = d[k - 2] = d[k - 1] = 255; }
    x.putImageData(id, 0, 0);
    return c.toDataURL("image/png");
  }
  function addDesertLayer(X) {
    var m = X && X.desertMask; if (!m || svg.querySelector("#desertlayer")) return;
    var im = document.createElementNS(ns, "image");
    im.setAttribute("id", "desertlayer"); im.setAttribute("href", m.png + "?v=7");
    im.setAttribute("x", (m.w - PX0) * PS); im.setAttribute("y", (PY0 - m.n) * PS);
    im.setAttribute("width", (m.e - m.w) * PS); im.setAttribute("height", (m.n - m.s) * PS);
    im.setAttribute("preserveAspectRatio", "none"); im.setAttribute("style", "pointer-events:none");
    var b = svg.querySelector("#uzborder"); svg.insertBefore(im, b || gl);
    // тарқалган майдон чегараси учун: экин йўқ (чўл) пикселлари
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
        var x = c.getContext("2d"); x.drawImage(img, 0, 0);
        var px = x.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
        for (var k = 0; k < a.length; k++) a[k] = px[k * 4 + 3];
        // жуда кичик экин доғлари (≤ 12 пиксел ≈ 50 км²) — яқинлаштирганда «юлдузча» бўлиб кўринади → оқ
        var W0 = c.width, H0 = c.height, seen = new Uint8Array(a.length), st = [], comp = [], nfix = 0;
        for (var s0 = 0; s0 < a.length; s0++) {
          if (seen[s0] || a[s0] >= 40) continue;
          st.length = 0; comp.length = 0; st.push(s0); seen[s0] = 1;
          while (st.length) {
            var q = st.pop(); comp.push(q);
            var qx = q % W0, nb4 = [qx > 0 ? q - 1 : -1, qx < W0 - 1 ? q + 1 : -1, q - W0, q + W0];
            for (var t = 0; t < 4; t++) { var r = nb4[t]; if (r >= 0 && r < a.length && !seen[r] && a[r] < 40) { seen[r] = 1; st.push(r); } }
          }
          if (comp.length <= 12) for (var t2 = 0; t2 < comp.length; t2++) { var z = comp[t2]; a[z] = 255; px[z * 4] = px[z * 4 + 1] = px[z * 4 + 2] = 255; px[z * 4 + 3] = 255; nfix++; }
        }
        var id = x.createImageData(W0, H0); id.data.set(px); x.putImageData(id, 0, 0);
        im.setAttribute("href", smoothMask(c));
        SPR.mask = { m: m, W: c.width, H: c.height, a: a }; SPR.key = null; spreadSoon(); paint();
      } catch (e) {}
    };
    img.src = m.png + "?v=7";
  }
  // ===== тарқалган майдон чегараси: мавсуми бошланган туманлардаги экин майдонининг чети =====
  var SPR = { mask: null, key: null, on: true, t: 0 };
  var gS = document.createElementNS(ns, "g"); gS.setAttribute("id", "spreadlayer"); gS.setAttribute("pointer-events", "none");
  // сургич сурилаётганда чизиқ яширинади (катта контурни ҳар кадрда қайта чизиш секин), тўхтагач пайдо бўлади
  function spreadSoon() { gS.style.visibility = "hidden"; clearTimeout(SPR.t); SPR.t = setTimeout(function () { drawSpread(); gS.style.visibility = ""; }, tlPlay ? 700 : 250); }
  function spreadZone() {
    var u = [], n = [];
    dIdx.forEach(function (i) { var ph = dpheno[i]; if (!zoneD[i] && ph && !ph.pre) u.push(i); });
    NB.forEach(function (nb, k) { var ph = npheno[k]; if (!zoneN[k] && ph && !ph.pre) n.push(k); });
    return { u: u, n: n, key: curPest + "|" + u.join(",") + "|" + n.join(",") };
  }
  function drawSpread() {
    var ub2 = svg.querySelector("#uzborder"), top = ub2 || gI;
    if (gS.parentNode !== svg || gS.nextSibling !== top) svg.insertBefore(gS, top);
    gS.style.display = SPR.on ? "" : "none";
    var M = SPR.mask; if (!M || !SPR.on || loadState !== "ok") return;
    var Z = spreadZone(); if (Z.key === SPR.key) return; SPR.key = Z.key;
    if (!Z.u.length && !Z.n.length) { gS.innerHTML = ""; return; }
    var W = M.W, H = M.H, m = M.m;
    // 1) танланган туманларни маска тўрига чизиш (SVG → пиксел)
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d");
    var sx = W / ((m.e - m.w) * PS), sy = H / ((m.n - m.s) * PS);
    x.setTransform(sx, 0, 0, sy, (PX0 - m.w) * W / (m.e - m.w), (m.n - PY0) * H / (m.n - m.s));
    x.fillStyle = "#000";
    Z.u.forEach(function (i) { x.fill(new Path2D(items[i].d)); });
    Z.n.forEach(function (k) { var d = npaths[k] && npaths[k].getAttribute("d"); if (d) x.fill(new Path2D(d)); });
    var dp = x.getImageData(0, 0, W, H).data;
    // 2) туман ичида ВА экин майдони (чўл маскаси йўқ) → 1
    var f = new Float32Array(W * H);
    for (var k = 0; k < f.length; k++) f[k] = (dp[k * 4 + 3] > 127 && M.a[k] < 40) ? 1 : 0;
    // 3) силлиқлаш: 2 марта 3×3 ўртача (алоҳида горизонтал ва вертикал ўтиш — тез)
    var tmp = new Float32Array(W * H);
    for (var pass = 0; pass < 2; pass++) {
      for (var yy = 0; yy < H; yy++) { var o = yy * W;
        for (var xx = 0; xx < W; xx++) { var l = xx > 0 ? f[o + xx - 1] : f[o + xx], r = xx < W - 1 ? f[o + xx + 1] : f[o + xx]; tmp[o + xx] = (l + f[o + xx] + r) / 3; } }
      for (var y3 = 0; y3 < H; y3++) { var up = y3 > 0 ? -W : 0, dn = y3 < H - 1 ? W : 0;
        for (var x3 = 0; x3 < W; x3++) { var q0 = y3 * W + x3; f[q0] = (tmp[q0 + up] + tmp[q0] + tmp[q0 + dn]) / 3; } }
    }
    // 4) marching squares (0.5 даражада) → SVG чизиқлари
    var kx = (m.e - m.w) / W, ky = (m.n - m.s) / H;
    function X(px) { return ((m.w + (px + 0.5) * kx) - PX0) * PS; }
    function Y(py) { return (PY0 - (m.n - (py + 0.5) * ky)) * PS; }
    var out = [], T0 = 0.5;
    function lerp(a, b) { return (T0 - a) / (b - a); }
    for (var j = 0; j < H - 1; j++) for (var i = 0; i < W - 1; i++) {
      var a0 = f[j * W + i], a1 = f[j * W + i + 1], a2 = f[(j + 1) * W + i + 1], a3 = f[(j + 1) * W + i];
      var cs = (a0 > T0 ? 8 : 0) | (a1 > T0 ? 4 : 0) | (a2 > T0 ? 2 : 0) | (a3 > T0 ? 1 : 0);
      if (cs === 0 || cs === 15) continue;
      var top = [i + lerp(a0, a1), j], right = [i + 1, j + lerp(a1, a2)], bot = [i + lerp(a3, a2), j + 1], left = [i, j + lerp(a0, a3)];
      var segs;
      switch (cs) {
        case 1: case 14: segs = [[left, bot]]; break;
        case 2: case 13: segs = [[bot, right]]; break;
        case 3: case 12: segs = [[left, right]]; break;
        case 4: case 11: segs = [[top, right]]; break;
        case 5: segs = [[left, top], [bot, right]]; break;
        case 6: case 9: segs = [[top, bot]]; break;
        case 7: case 8: segs = [[left, top]]; break;
        case 10: segs = [[left, bot], [top, right]]; break;
      }
      for (var q = 0; q < segs.length; q++) {
        var s0 = segs[q][0], s1 = segs[q][1];
        out.push("M" + X(s0[0]).toFixed(1) + " " + Y(s0[1]).toFixed(1) + "L" + X(s1[0]).toFixed(1) + " " + Y(s1[1]).toFixed(1));
      }
    }
    var d = out.join("");
    gS.innerHTML = '<path d="' + d + '" class="spr-halo"/><path d="' + d + '" class="spr-line"/>';
  }
  // ===== силлиқ ранг майдони (C3S мавсумий прогноз харитасидек): туман чегараларисиз, фазалар ранги
  // текис оқиб ўтади. Ҳар фаза учун туманлар қопламаси → Гаусс-сингари текислаш → энг кўп улушли фаза.
  // Фақат фаза режимида ва бутун мамлакат кўринишида (вилоятга кирганда — туманлар бўйича).
  var FLD = { on: true, key: null, t: 0, im: null, p2: {} };
  var FLD_K = ["eg", "la", "pu", "im", "w", "ph", "nd"], FLD_ND = FLD_K.length - 1; // охирги — «маълумот йўқ»
  function fieldOn() { return FLD.on && MAPMODE === "phase" && !curReg && loadState === "ok" && !!SPR.mask; }
  function fieldSoon() {
    if (!fieldOn()) { if (FLD.im) FLD.im.style.display = "none"; return; }
    // «Мавсум» ўйналаётганда — throttle (интервал 140 мс debounce'дан қисқа эди → харита умуман янгиланмасди)
    if (tlPlay) { if (!FLD.t) FLD.t = setTimeout(function () { FLD.t = 0; drawField(); }, 20); return; }
    clearTimeout(FLD.t); FLD.t = setTimeout(function () { FLD.t = 0; drawField(); }, 60);
  }
  function p2d(key, d) { var o = FLD.p2[key]; if (!o) o = FLD.p2[key] = new Path2D(d); return o; }
  function drawField() {
    if (!fieldOn()) { if (FLD.im) FLD.im.style.display = "none"; return; }
    var M = SPR.mask, m = M.m, W = Math.round(M.W / 2), H = Math.round(M.H / 2), N = W * H;
    var cls = { u: [], n: [] }, key = curPest + (HARM ? "H" : "") + "|";
    for (var i = 0; i < items.length; i++) { var ph = zoneD[i] ? null : phaseOf("u", i), c = ph ? FLD_K.indexOf(ph.k) : FLD_ND; if (c < 0) c = FLD_ND; cls.u.push(c); key += c; }
    for (var k = 0; k < npaths.length; k++) { var pn = (zoneN[k] || !npheno[k]) ? null : phaseOf("n", k), cn = pn ? FLD_K.indexOf(pn.k) : FLD_ND; if (cn < 0) cn = FLD_ND; cls.n.push(cn); key += cn; }
    if (FLD.im && key === FLD.key) { FLD.im.style.display = ""; return; }
    FLD.key = key;
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d", { willReadFrequently: true });
    var sx = W / ((m.e - m.w) * PS), sy = H / ((m.n - m.s) * PS);
    // қатламлар: 0..5 — фазалар (5 — маълумот йўқ)
    var L = [];
    function layer(fn) {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
      x.setTransform(sx, 0, 0, sy, (PX0 - m.w) * W / (m.e - m.w), (m.n - PY0) * H / (m.n - m.s));
      x.fillStyle = "#000"; fn();
      var dp = x.getImageData(0, 0, W, H).data, f = new Float32Array(N);
      for (var q = 0; q < N; q++) f[q] = dp[q * 4 + 3] / 255;
      return f;
    }
    for (var c = 0; c < FLD_ND; c++) { // «маълумот йўқ» қатлами керак эмас (шаффоф)
      L.push(layer(function () {
        for (var i = 0; i < items.length; i++) if (cls.u[i] === c) x.fill(p2d("u" + i, items[i].d));
        for (var k = 0; k < npaths.length; k++) if (cls.n[k] === c) x.fill(p2d("n" + k, npaths[k].getAttribute("d")));
      }));
    }
    // текислаш: радиус ≈ 0.12° (3 марта box-blur ≈ Гаусс)
    var R = Math.max(2, Math.round(0.12 / ((m.e - m.w) / W))), tmp = new Float32Array(N);
    function blur(f) {
      for (var pass = 0; pass < 3; pass++) {
        for (var y = 0; y < H; y++) { var o = y * W, acc = 0, n = 0;
          for (var xx = 0; xx < Math.min(R, W); xx++) { acc += f[o + xx]; n++; }
          for (var xx2 = 0; xx2 < W; xx2++) { var ad = xx2 + R, rm = xx2 - R - 1;
            if (ad < W) { acc += f[o + ad]; n++; } if (rm >= 0) { acc -= f[o + rm]; n--; } tmp[o + xx2] = acc / n; } }
        for (var x3 = 0; x3 < W; x3++) { var acc2 = 0, n2 = 0;
          for (var y2 = 0; y2 < Math.min(R, H); y2++) { acc2 += tmp[y2 * W + x3]; n2++; }
          for (var y3 = 0; y3 < H; y3++) { var ad2 = y3 + R, rm2 = y3 - R - 1;
            if (ad2 < H) { acc2 += tmp[ad2 * W + x3]; n2++; } if (rm2 >= 0) { acc2 -= tmp[rm2 * W + x3]; n2--; } f[y3 * W + x3] = acc2 / n2; } }
      }
    }
    L.forEach(blur);
    var rgb = FLD_K.map(function (k2) { var h = k2 === "nd" ? "#ffffff" : (HARM && !isHarm(k2) ? HARM_OFF : (k2 === "w" ? PHCOL.w : phc(k2))); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
    var img = x.createImageData(W, H), px = img.data;
    for (var p = 0; p < N; p++) {
      var best = -1, bv = 0, ph = 0;
      for (var c2 = 0; c2 < FLD_ND; c2++) { var v = L[c2][p]; ph += v; if (v > bv) { bv = v; best = c2; } }
      // маълумотли фазалар улуши 0.4…0.6 оралиғида — шаффофлик аста ўзгаради (катталаштирганда чети зинапоя бўлмайди)
      var al = (ph - 0.4) * 5; if (best < 0 || al <= 0) continue; if (al > 1) al = 1;
      var col = rgb[best]; // қўшни давлатлар ҳам Ўзбекистон билан бир хил ёрқинликда
      px[p * 4] = col[0]; px[p * 4 + 1] = col[1]; px[p * 4 + 2] = col[2]; px[p * 4 + 3] = Math.round(255 * al);
    }
    x.setTransform(1, 0, 0, 1, 0, 0); x.putImageData(img, 0, 0);
    if (!FLD.im) {
      FLD.im = document.createElementNS(ns, "image"); FLD.im.setAttribute("id", "fieldlayer");
      FLD.im.setAttribute("preserveAspectRatio", "none"); FLD.im.setAttribute("style", "pointer-events:none");
      FLD.im.setAttribute("x", (m.w - PX0) * PS); FLD.im.setAttribute("y", (PY0 - m.n) * PS);
      FLD.im.setAttribute("width", (m.e - m.w) * PS); FLD.im.setAttribute("height", (m.n - m.s) * PS);
    }
    var dl = svg.querySelector("#desertlayer"); if (dl && FLD.im.nextSibling !== dl) svg.insertBefore(FLD.im, dl);
    FLD.im.setAttribute("href", cv.toDataURL("image/png")); FLD.im.style.display = "";
  }
  // ҳарорат: туманнинг ЭКИН МАЙДОНИ тушган катаклари, экин юзасига мутаносиб вазн билан
  // (data/wx-points.json, scripts/build-landcover.py — Esri/IO Land Cover 2024). Чўл / экин йўқ туман —
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
    PHC = {};
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
    NOW = (d && (PAST || iso(d) !== iso(today))) ? d : null;
    updatedAt = NOW || new Date();
    recompute(); paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
    var q = [];
    if (PAST) q.push("yil=" + YEAR);
    if (NOW && !(PAST && NOW.getMonth() === 11 && NOW.getDate() === 31)) q.push("sana=" + iso(NOW));
    try { history.replaceState(null, "", location.pathname + (q.length ? "?" + q.join("&") : "") + location.hash); } catch (e) {}
  }
  // йил танлаш + ҳарорат маълумоти янгилангани
  function tlMeta() {
    var h = '<div class="tl-meta">';
    if (YEARS.length > 1) h += '<label class="tl-yr">' + T.tlYear + ': <select id="tl-year">' + YEARS.slice().reverse().map(function (y) { return '<option value="' + y + '"' + (y === YEAR ? " selected" : "") + '>' + y + '</option>'; }).join("") + '</select></label>';
    if (PAST) h += '<span class="tl-fresh">' + T.wxArchive.replace("{Y}", YEAR) + '</span>';
    else if (WXU) {
      var u = new Date(WXU), hrs = Math.max(0, Math.round((Date.now() - u.getTime()) / 3600000));
      var ds = fmtDate(u) + " " + ("0" + u.getHours()).slice(-2) + ":" + ("0" + u.getMinutes()).slice(-2);
      h += hrs > 18 ? '<span class="tl-fresh stale">' + T.wxStale.replace("{H}", hrs).replace("{D}", ds) + '</span>'
                    : '<span class="tl-fresh">' + T.wxFresh.replace("{H}", hrs).replace("{D}", ds) + '</span>';
    }
    return h + '</div>';
  }
  function buildTimeline() {
    var box = document.getElementById("fenotime"); if (!box || !WXR || loadState !== "ok") return;
    var p0 = WXR.start.split("-").map(Number), d0 = new Date(p0[0], p0[1] - 1, p0[2], 12);
    var dayAt = function (k) { return new Date(p0[0], p0[1] - 1, p0[2] + k, 12); };
    var today = PAST ? new Date(YEAR, 11, 31, 12) : new Date(); today.setHours(12, 0, 0, 0);
    var tIdx = Math.max(0, Math.min(WXR.days - 1, Math.round((today - d0) / 86400000)));
    var todayLbl = PAST ? T.tlYearEnd : T.tlToday;
    var cur = NOW ? Math.max(0, Math.min(WXR.days - 1, Math.round((NOW - d0) / 86400000))) : tIdx;
    var ticks = T.months.map(function (m, i) {
      var k = Math.round((new Date(p0[0], i, 1, 12) - d0) / 86400000);
      return k < WXR.days ? '<span style="left:' + (k / (WXR.days - 1) * 100) + '%">' + m + '</span>' : '';
    }).join("");
    box.innerHTML =
      '<div class="tl-row"><b class="tl-lbl">📅 ' + T.tlLabel + ':</b>' +
      '<span class="tl-date" id="tl-date"></span>' +
      '<button type="button" class="tl-btn" id="tl-today">' + todayLbl + '</button>' +
      '<button type="button" class="tl-btn tl-play" id="tl-play">' + T.tlPlay + '</button></div>' +
      '<div class="tl-track"><input type="range" id="tl-range" min="0" max="' + (WXR.days - 1) + '" step="1" value="' + cur + '" aria-label="' + T.tlLabel + '">' +
      '<div class="tl-todaymark" style="left:' + (tIdx / (WXR.days - 1) * 100) + '%" title="' + T.tlToday + '"></div>' +
      '<div class="tl-fc" style="left:' + (tIdx / (WXR.days - 1) * 100) + '%;width:' + ((WXR.days - 1 - tIdx) / (WXR.days - 1) * 100) + '%"></div></div>' +
      '<div class="tl-ticks">' + ticks + '</div>' +
      '<div class="tl-hint">' + T.tlHint + '</div>' + tlMeta();
    var yrSel = document.getElementById("tl-year");
    if (yrSel) yrSel.addEventListener("change", function () { location.href = location.pathname + "?yil=" + yrSel.value; });
    var rng = document.getElementById("tl-range"), lab = document.getElementById("tl-date"), raf = 0;
    function label(k) {
      var d = dayAt(k), tag = k === tIdx ? todayLbl.toLowerCase() : (k > tIdx ? T.tlFc : T.tlPast);
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
    fetch("data/wx-years.json?h=" + stamp).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (yrs) {
      YEARS = yrs && yrs.years ? yrs.years : []; CURY = yrs ? yrs.cur : null;
      var want = YQ || (CURY && t.getMonth() < 2 && YEARS.indexOf(CURY - 1) >= 0 ? CURY - 1 : null);
      PAST = !!(want && want !== CURY && YEARS.indexOf(want) >= 0);
      return Promise.all([
        fetch((PAST ? "data/wx-" + want + ".json" : "data/wx.json") + "?h=" + stamp).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch("data/wx-points.json?h=" + stamp).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      ]);
    }).then(function (res) {
      WXP = res[1]; WXR = { start: res[0].start, days: res[0].days }; WXU = res[0].updated || null;
      YEAR = +res[0].start.slice(0, 4);
      if (PAST && !NOW) NOW = new Date(YEAR, 11, 31, 12);
      WXRAW = res[0];
      addDesertLayer(res[1]); finish(wxMaps(res[0], pts, res[1])); buildTimeline();
      OUTLOOK = null;
      if (!PAST) fetch("data/outlook.json?h=" + stamp).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
        .then(function (o) { if (o && o.year === YEAR) { OUTLOOK = o; renderDistrict(); } });
    })
      .catch(function (e) { wxPending = !!(e && e.message === "404"); loadState = "error"; updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend(); });
  }

  buildInfo();
  paint(); updatePanel(); drawCal(); renderStatus(); renderSummary(); renderDistrict(); renderLegend();
  loadNeighbors().then(loadData);

  // ===== Telegram ҳафталик хабари учун (scripts/telegram-notify.cjs): сайтдаги АЙНАН шу модел натижаси =====
  // window.FENO_WEEK(7) → ҳар зараркунанда, ҳар туман: бугунги фаза ва кейинги N кунда бошланадиган фазалар
  window.FENO_WEEK = function (N) {
    if (loadState !== "ok") return null;
    var t0 = new Date(), d0 = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()), d1 = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + (N || 7));
    return { from: iso(d0), to: iso(new Date(d1.getTime() - 864e5)), pests: PESTS.map(function (pest) {
      return { id: pest.id, nm: pest.nm, ttl: pest.ttl, d: dIdx.filter(function (i) { return !zoneD[i]; }).map(function (i) {
        var ser = dseries[i]; if (!ser || !ser.length) return null;
        var R = pentCal(ser, pest, GEO[i][0]), cur = null, nx = [];
        R.ev.forEach(function (e) {
          var k = e.w ? "w" : R.st[e.s].k, nm = e.w ? T.pcWinter : R.st[e.s].nm;
          if (e.from <= d0 && (!e.to || e.to >= d0)) cur = { k: k, nm: nm, g: e.g };
          if (e.from > d0 && e.from < d1) nx.push({ k: k, nm: nm, g: e.g, d: iso(e.from) });
        });
        return { n: dname(items[i]), r: rname(regById[items[i].r]), cur: cur, nx: nx };
      }).filter(Boolean) };
    }) };
  };

  // ===== узоқ муддатли прогноз ҳисоби (scripts/build-outlook.cjs чақиради): H — data-hist/hist-1deg.json =====
  // Ҳар туман: ҳақиқий + 16 кунлик прогноз, ундан кейин — ўтган ҳар бир йилнинг (1° нуқта) ҳарорати +
  // ойлик тузатма (туман сериясининг жорий йилдаги 1° нуқтадан фарқи). Ҳар йил учун модел → фаза бошланиш
  // саналарининг 10/50/90% квантиллари.
  window.FENO_OUTLOOK = function (H, cutAt) { // cutAt (YYYY-MM-DD) — синов: шу кундан кейинги ҳақиқий маълумот ташланади
    if (loadState !== "ok" || PAST || !H || !H.cells) return null;
    var Y0 = new Date(YEAR, 0, 1), t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var cs = H.curStart ? new Date(H.curStart + "T00:00:00") : Y0;
    function ck(k) { var a = k.split(","); return Math.floor(+a[0] + 0.5) + "," + Math.floor(+a[1] + 0.5); }
    function doy(d) { return Math.round((d - new Date(d.getFullYear(), 0, 1)) / 864e5); }
    function q(a, p) { var x = (a.length - 1) * p, lo = Math.floor(x), hi = Math.ceil(x); return Math.round(a[lo] + (a[hi] - a[lo]) * (x - lo)); }
    var years = (H.years || []).filter(function (y) { return Object.keys(H.cells).some(function (k) { return H.cells[k][y]; }); });
    var out = { year: YEAR, made: iso(today), years: years, p: {} };
    PESTS.forEach(function (pest) { out.p[pest.id] = {}; });
    var fcEnd = null;
    dIdx.forEach(function (i) {
      if (zoneD[i]) return;
      var ser = dseries[i]; if (cutAt && ser) ser = ser.filter(function (r) { return iso(r.t) <= cutAt; });
      if (!ser || !ser.length) return;
      var last = ser[ser.length - 1].t; if (!fcEnd || last > fcEnd) fcEnd = last;
      // туман катаклари → 1° нуқталар вазни
      var e = WXP && WXP.d && WXP.d[String(i)], ks = !e ? [] : (Array.isArray(e) ? e.map(function (k) { return [k, 1]; }) : (e.c || []));
      if (!ks.length) ks = [[snapC(GEO[i][0]).toFixed(2) + "," + snapC(GEO[i][1]).toFixed(2), 1]];
      var cw = {}; ks.forEach(function (kw) { var c = ck(kw[0]); if (H.cells[c]) cw[c] = (cw[c] || 0) + kw[1]; });
      var cks = Object.keys(cw); if (!cks.length) return;
      function coarse(arr, j) { var sx = 0, sn = 0, sw = 0; cks.forEach(function (c) { var a = arr(c); if (a && a[2 * j] != null && a[2 * j + 1] != null) { sx += cw[c] * a[2 * j]; sn += cw[c] * a[2 * j + 1]; sw += cw[c]; } }); return sw ? [sx / sw / 10, sn / sw / 10] : null; }
      // ойлик тузатма: туман (0.25°, Open-Meteo) − 1° (ERA5), жорий йил
      var om = [], on = [];
      for (var m = 0; m < 12; m++) { om.push([0, 0]); on.push(0); }
      ser.forEach(function (r) {
        var j = Math.round((r.t - cs) / 864e5); if (j < 0) return;
        var c = coarse(function (k) { return H.cells[k].cur; }, j); if (!c) return;
        var mo = r.t.getMonth(); om[mo][0] += r.mx - c[0]; om[mo][1] += r.mn - c[1]; on[mo]++;
      });
      var off = om.map(function (v, mo) {
        for (var dm = 0; dm < 12; dm++) for (var sg = -1; sg <= 1; sg += 2) { var k = ((mo + sg * dm) % 12 + 12) % 12; if (on[k]) return [om[k][0] / on[k], om[k][1] / on[k]]; }
        return [0, 0];
      });
      var acc = {}; PESTS.forEach(function (pest) { acc[pest.id] = {}; });
      years.forEach(function (y) {
        var tail = [], ok = true;
        for (var d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1); d.getFullYear() === YEAR; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
          var mo = d.getMonth(), da = d.getDate(); if (mo === 1 && da === 29 && y % 4) da = 28;
          var c = coarse(function (k) { return H.cells[k][y]; }, doy(new Date(y, mo, da)));
          if (!c) { ok = false; break; }
          tail.push({ t: d, mx: c[0] + off[mo][0], mn: c[1] + off[mo][1] });
        }
        if (!ok) return;
        var full = ser.concat(tail);
        PESTS.forEach(function (pest) {
          var R = pentCal(full, pest, GEO[i][0]), seen = {};
          R.ev.forEach(function (ev) {
            if (ev.from <= today) return;
            var key = ev.g + "|" + (ev.w ? "w" : R.st[ev.s].k); if (seen[key]) return; seen[key] = 1;
            (acc[pest.id][key] = acc[pest.id][key] || []).push(Math.round((ev.from - Y0) / 864e5));
          });
        });
      });
      PESTS.forEach(function (pest) {
        var A = acc[pest.id], rows = Object.keys(A).map(function (key) {
          var v = A[key].sort(function (a, b) { return a - b; }), kk = key.split("|");
          return [+kk[0], kk[1], q(v, 0.1), q(v, 0.5), q(v, 0.9), v.length];
        }).filter(function (r) { return r[5] * 2 >= years.length; }) // ярмидан кам йилда учраган фазалар — тасодифий
          .sort(function (a, b) { return a[3] - b[3]; }).slice(0, 12); // карточкада 10 тагача кўрсатилади
        out.p[pest.id][String(i)] = rows;
      });
    });
    out.fcEnd = fcEnd ? iso(fcEnd) : null;
    return out;
  };

  var wrap = stage.parentElement;
  // кенг экранда — кенгроқ саҳна (харита каттароқ), телефонда — эски квадрат (матн кичраймаслиги учун)
  function fit() {
    var w = wrap.clientWidth, wide = w >= 760, W = wide ? 1500 : 1080, H = wide ? 1000 : 920, s = w / W;
    stage.style.width = W + "px"; stage.style.height = H + "px"; stage.classList.toggle("narrow", !wide);
    stage.style.transform = "scale(" + s + ")"; wrap.style.height = (H * s) + "px";
  }
  fit(); window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
