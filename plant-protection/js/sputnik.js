/* Спутник харита — Leaflet + Esri World Imagery (бепул, калитсиз)
 * + фенологик прогноз (GDD) қатлами + фенокалендар, туманлар кесимида.
 * Чегара: OSM (omadli/uzbekistan-regions, ODbL) — 205 туман/шаҳар,
 * шу жумладан Қорақалпоғистоннинг барча 16 тумани. Ҳарорат: Open-Meteo. */
(function () {
  "use strict";
  if (!window.L) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";

  var PESTS = LANG === "ru" ? [
    { nm: "Хлопковая совка", base: 10.5, upper: 35, gen: 500, winter: "куколка — в почве", rec: "Глубокая зяблевая вспашка." },
    { nm: "Паутинный клещ", base: 11, upper: 40, gen: 110, winter: "самки — в растительных остатках", rec: "Удаление остатков." },
    { nm: "Озимая совка", base: 10, upper: 35, gen: 520, winter: "гусеницы/куколки — в почве", rec: "Вспашка, борьба с сорняками." },
    { nm: "Тли", base: 6.5, upper: 35, gen: 90, winter: "яйца — на сорняках", rec: "Борьба с сорняками." }
  ] : [
    { nm: "Ғўза тунлами (кўсак қурти)", base: 10.5, upper: 35, gen: 500, winter: "ғумбак — тупроқда", rec: "Кузги чуқур шудгор." },
    { nm: "Ўргимчаккана", base: 11, upper: 40, gen: 110, winter: "урғочи — ўсимлик қолдиғида", rec: "Қолдиқларни йиғиштириш." },
    { nm: "Кузги тунлам", base: 10, upper: 35, gen: 520, winter: "қурт/ғумбак — тупроқда", rec: "Шудгор, бегона ўтлар." },
    { nm: "Ширалар", base: 6.5, upper: 35, gen: 90, winter: "тухум — бегона ўтларда", rec: "Бегона ўтларни йўқотиш." }
  ];
  var T = LANG === "ru" ? {
    labels: "Названия и границы", loading: "⏳ Расчёт по температуре…", err: "⚠️ Не удалось загрузить данные.",
    gen: "Поколение", gdd: "Накоплено ГДД", next: "След. поколение", progress: "до след.", ended: "диапауза (зимовка)",
    approx: "≈ прогноз", nodata: "нет данных", pickHint: "Нажмите на район — поколения и календарь.",
    winterL: "Форма зимовки", recL: "Рекомендация", calTitle: "Фенокалендарь — поколения за сезон",
    base: "порог", note: "Модель ГДД (синус) · Open-Meteo · оценка", countriesL: "Соседние страны",
    dataL: "данные", cacheL: "(из кэша)", noData0: "⚠️ Сервис погоды (Open-Meteo) не ответил. Обновите страницу через 1–2 мин (F5).",
    months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    phaseA: "АКТИВНОЕ РАЗВИТИЕ", phaseD: "ДИАПАУЗА (зимовка)", today: "сегодня"
  } : {
    labels: "Номлар ва чегаралар", loading: "⏳ Ҳарорат бўйича ҳисоб…", err: "⚠️ Маълумот юкланмади.",
    gen: "Авлод", gdd: "Йиғилган GDD", next: "Кейинги авлод", progress: "кейингисигача", ended: "диапауза (қишлов)",
    approx: "≈ прогноз", nodata: "маълумот йўқ", pickHint: "Туманни босинг — авлод ва календар.",
    winterL: "Қишлаш шакли", recL: "Тавсия", calTitle: "Фенокалендар — мавсум давомидаги авлодлар",
    base: "ост-ҳарорат", note: "GDD модели (синус) · Open-Meteo · тахмин", countriesL: "Қўшни давлатлар",
    dataL: "маълумот", cacheL: "(кэшдан)", noData0: "⚠️ Ҳаво хизмати (Open-Meteo) жавоб бермади. 1–2 дақиқадан сўнг саҳифани янгиланг (F5).",
    months: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    phaseA: "ФАОЛ РИВОЖЛАНИШ", phaseD: "ДИАПАУЗА (қишлов)", today: "бугун"
  };
  // яшил (кам авлод) → сариқ → қизил (кўп авлод)
  var GENCOL = ["#d6dde2", "#2ecc71", "#a3d93a", "#f1c40f", "#f39c12", "#e74c3c", "#c0392b"];
  var DIA_COL = "#90a4ae";
  // қўшни давлат чегараси ранглари (geojson'даги color билан мос)
  var NBC = LANG === "ru" ? [
    ["Казахстан", "#00e5ff"], ["Туркменистан", "#ff4081"], ["Таджикистан", "#ff6d00"], ["Кыргызстан", "#b388ff"], ["Афганистан", "#69f0ae"]
  ] : [
    ["Қозоғистон", "#00e5ff"], ["Туркманистон", "#ff4081"], ["Тожикистон", "#ff6d00"], ["Қирғизистон", "#b388ff"], ["Афғонистон", "#69f0ae"]
  ];
  function genColor(g) { if (g == null || g < 1) return GENCOL[0]; return GENCOL[Math.min(g, GENCOL.length - 1)]; }
  function ddAbove(tmin, tmax, TH) {
    if (tmax <= TH) return 0;
    var avg = (tmax + tmin) / 2, amp = (tmax - tmin) / 2;
    if (tmin >= TH) return avg - TH;
    if (amp < 1e-9) return 0;
    var r = (TH - avg) / amp; if (r > 1) r = 1; if (r < -1) r = -1;
    var th = Math.asin(r);
    return ((avg - TH) * (Math.PI / 2 - th) + amp * Math.cos(th)) / Math.PI;
  }
  function sineDD(tmin, tmax, LT, UT) { if (tmax < tmin) { var t = tmax; tmax = tmin; tmin = t; } var d = ddAbove(tmin, tmax, LT) - ddAbove(tmin, tmax, UT); return d > 0 ? d : 0; }
  function computePheno(ser, pest, now) {
    if (!ser || !ser.length) return null;
    var cum = 0, cumArr = [];
    for (var i = 0; i < ser.length; i++) { cum += sineDD(ser[i].mn, ser[i].mx, pest.base, pest.upper); cumArr.push(cum); }
    var todayIdx = 0;
    for (var j = 0; j < ser.length; j++) { if (ser[j].t.getTime() <= now.getTime()) todayIdx = j; }
    var gddToday = cumArr[todayIdx], gen = Math.floor(gddToday / pest.gen) + 1, progress = (gddToday % pest.gen) / pest.gen;
    var boundaries = [], k = 1;
    for (var m = 0; m < ser.length; m++) { while (cumArr[m] >= k * pest.gen) { boundaries.push({ k: k, date: ser[m].t }); k++; } }
    var next = null, approx = false, ended = false;
    for (var b = 0; b < boundaries.length; b++) { if (boundaries[b].date.getTime() > now.getTime()) { next = boundaries[b].date; break; } }
    if (!next) {
      var mt = 0, s = 0, c = 0;
      for (var q = Math.max(0, todayIdx - 13); q <= todayIdx; q++) { mt += (ser[q].mx + ser[q].mn) / 2; s += sineDD(ser[q].mn, ser[q].mx, pest.base, pest.upper); c++; }
      var meanT = c ? mt / c : 0, daily = c ? s / c : 0;
      if (meanT < pest.base || daily < 0.5) ended = true;
      else { var rem = pest.gen - (gddToday % pest.gen), days = Math.ceil(rem / daily); if (days > 45) ended = true; else { next = new Date(now.getTime() + days * 86400000); approx = true; } }
    }
    var seasonStart = null;
    for (var z = 0; z < cumArr.length; z++) { if (cumArr[z] >= 1) { seasonStart = ser[z].t; break; } }
    return { gdd: gddToday, gen: gen, progress: progress, boundaries: boundaries, next: next, approx: approx, ended: ended, seasonStart: seasonStart };
  }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function fmtDate(d) { if (!d) return "—"; return d.getDate() + "-" + T.months[d.getMonth()].toLowerCase(); }

  // геометриядан марказ (энг катта полигоннинг outer ринги) → [lat,lon]
  function ringArea(r) { var a = 0; for (var i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; }
  function ringCentroid(r) { var a = 0, cx = 0, cy = 0; for (var i = 0, j = r.length - 1; i < r.length; j = i++) { var f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f; } a /= 2; if (Math.abs(a) < 1e-12) { var sx = 0, sy = 0; r.forEach(function (p) { sx += p[0]; sy += p[1]; }); return [sx / r.length, sy / r.length]; } return [cx / (6 * a), cy / (6 * a)]; }
  function featCentroid(geom) {
    var polys = geom.type === "Polygon" ? [geom.coordinates] : (geom.type === "MultiPolygon" ? geom.coordinates : []);
    var best = null, bestA = -1;
    polys.forEach(function (poly) { var a = Math.abs(ringArea(poly[0])); if (a > bestA) { bestA = a; best = poly[0]; } });
    if (!best) return null;
    var c = ringCentroid(best); return [c[1], c[0]];
  }

  var FEATS = [], CTR = [], dseries = {}, dpheno = {}, updatedAt = null, curPest = 0, loadState = "loading", selFi = null;
  function dnm(p) { return LANG === "ru" ? (p.ru || p.c) : (p.c || p.ru); }
  function rnm(p) { return LANG === "ru" ? (p.regru || p.reg) : (p.reg || p.regru); }

  // ===== Leaflet =====
  var el = document.getElementById("map"); if (!el) return;
  var map = L.map(el, { minZoom: 5, maxZoom: 17 }).setView([41.4, 63.9], 6);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18, attribution: "Tiles &copy; Esri — World Imagery, Maxar · Туман чегаралари &copy; OpenStreetMap (ODbL)"
  }).addTo(map);
  var labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18 });
  // чегарадош давлат туманлари номлари (доимий ёрлиқлар, яқинлаштирилганда кўринади)
  var nbLabels = L.layerGroup(), LBL_ZOOM = 7;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function updateLabelVis() { try { if (map.getZoom() >= LBL_ZOOM) L.DomUtil.removeClass(el, "hidelbl"); else L.DomUtil.addClass(el, "hidelbl"); } catch (e) {} }
  function buildForeignLabels() {
    FEATS.forEach(function (f, i) {
      var p = f.properties; if (!p || !p.foreign) return;
      var nm = dnm(p); if (!nm) return;
      var c = CTR[i]; if (!c) return;
      var icon = L.divIcon({ className: "nb-lbl", html: '<span class="nb-lbl-t">' + esc(nm) + "</span>", iconSize: [0, 0], iconAnchor: [0, 0] });
      nbLabels.addLayer(L.marker(c, { icon: icon, interactive: false, keyboard: false }));
    });
    nbLabels.addTo(map); updateLabelVis();
  }
  map.on("zoomend", updateLabelVis);

  function phOf(lyr) { return (lyr && lyr._fi != null) ? dpheno[lyr._fi] : null; }
  function styleFn(ph, sel, foreign) {
    var col = ph ? (ph.ended ? DIA_COL : genColor(ph.gen)) : "#cccccc";
    return { color: foreign ? "#ffeb3b" : "#ffffff", weight: sel ? 2.6 : (foreign ? 1.3 : 0.7), opacity: sel ? 1 : (foreign ? 0.95 : 0.8), dashArray: foreign ? "4,3" : null, fillColor: col, fillOpacity: ph ? (sel ? 0.9 : 0.75) : (foreign ? 0.22 : 0.15) };
  }
  function isForeign(lyr) { return !!(lyr && lyr.feature && lyr.feature.properties && lyr.feature.properties.foreign); }
  function bindTip(lyr, p) {
    var ph = phOf(lyr);
    var line = loadState === "loading" ? T.loading : (ph ? (ph.ended ? "❄ " + T.ended : T.gen + " " + ph.gen + " · " + Math.round(ph.gdd) + "°Д") : T.nodata);
    lyr.bindTooltip("<b>" + dnm(p) + "</b><br>" + (rnm(p) ? rnm(p) + "<br>" : "") + line, { sticky: true, direction: "top", opacity: 0.95 });
  }
  var dLayer = L.geoJSON(null, {
    style: function (f) { return styleFn(null, false, f && f.properties && f.properties.foreign); },
    onEachFeature: function (f, lyr) {
      lyr._fi = f.__i;
      lyr.on("mouseover", function () { if (selFi !== lyr._fi) lyr.setStyle({ weight: 2, color: "#fff" }); lyr.bringToFront(); });
      lyr.on("mouseout", function () { if (selFi !== lyr._fi) lyr.setStyle(styleFn(phOf(lyr), false, isForeign(lyr))); });
      lyr.on("click", function () { selFi = lyr._fi; restyle(); showPanel(lyr._fi); });
      bindTip(lyr, f.properties);
    }
  }).addTo(map);
  // Қўшни давлатлар чегаралари (ҳар давлат ўз ранги билан)
  var nbBorderLayer = L.geoJSON(null, { interactive: false, style: function (f) { return { color: (f.properties && f.properties.color) || "#ffffff", weight: 3.8, opacity: 0.97, fill: false, lineJoin: "round", lineCap: "round" }; } });
  // Ўзбекистон давлат чегараси (қора контур)
  var borderLayer = L.geoJSON(null, { interactive: false, style: { color: "#000000", weight: 4.5, opacity: 0.97, fill: false, lineJoin: "round" } });
  function restyle() {
    dLayer.eachLayer(function (lyr) { lyr.setStyle(styleFn(phOf(lyr), selFi === lyr._fi, isForeign(lyr))); if (selFi === lyr._fi) lyr.bringToFront(); bindTip(lyr, lyr.feature.properties); });
    if (nbBorderLayer) nbBorderLayer.bringToFront();
    if (borderLayer) borderLayer.bringToFront();
  }

  var status = document.getElementById("map-status");
  Promise.all([
    fetch("data/uz-districts.geojson?v=3").then(function (r) { return r.json(); }),
    fetch("data/uz-neighbors.geojson?v=3").then(function (r) { return r.json(); }).catch(function () { return { features: [] }; })
  ]).then(function (res) {
    var gj = res[0] || { features: [] }, ng = res[1] || { features: [] };
    var all = (gj.features || []).concat(ng.features || []);
    FEATS = all;
    FEATS.forEach(function (f, i) { f.__i = i; CTR[i] = featCentroid(f.geometry); });
    dLayer.addData({ type: "FeatureCollection", features: all });
    fetch("data/uz-neighbor-borders.geojson?v=2").then(function (r) { return r.json(); }).then(function (nb) { nbBorderLayer.addData(nb); nbBorderLayer.addTo(map); nbBorderLayer.bringToFront(); }).catch(function () {});
    fetch("data/uz-border.geojson?v=1").then(function (r) { return r.json(); }).then(function (bg) { borderLayer.addData(bg); borderLayer.addTo(map); borderLayer.bringToFront(); }).catch(function () {});
    try { map.fitBounds(dLayer.getBounds(), { padding: [10, 10] }); } catch (e) { try { map.fitBounds(L.geoJSON(gj).getBounds(), { padding: [12, 12] }); } catch (e2) {} }
    loadTemps();                               // фенопрогноз — критик йўл, ҳеч нарса тўсмаслиги керак
    try { buildForeignLabels(); } catch (e) {} // ном ёрлиқлари — алоҳида, йиқилса ҳам прогнозга таъсир қилмайди
  }).catch(function () { if (status) status.textContent = T.err; });

  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
  var overlays = {}; overlays[T.labels] = labels;
  L.control.layers(null, overlays, { position: "topright", collapsed: true }).addTo(map);
  var legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    var div = L.DomUtil.create("div", "sat-legend");
    var html = GENCOL.slice(1).map(function (c, i) { return '<span><i style="background:' + c + '"></i>' + (i + 1) + (i === 5 ? "+" : "") + '</span>'; }).join("");
    var cnt = NBC.map(function (n) { return '<span><i style="width:14px;height:0;border-top:3px solid ' + n[1] + ';border-radius:0"></i>' + n[0] + '</span>'; }).join("");
    div.innerHTML = '<b>' + T.gen + '</b> ' + html + '<span><i style="background:' + DIA_COL + '"></i>❄</span>'
      + '<div style="flex-basis:100%;height:5px"></div><b>' + T.countriesL + '</b> ' + cnt
      + '<span><i style="width:14px;height:0;border-top:3px solid #000"></i>' + (LANG === "ru" ? "Узбекистан" : "Ўзбекистон") + '</span>';
    return div;
  };
  legend.addTo(map);

  var pestBox = document.getElementById("pestsel");
  if (pestBox) {
    pestBox.innerHTML = PESTS.map(function (p, i) { return '<button class="pbtn' + (i === 0 ? ' on' : '') + '" data-p="' + i + '">' + p.nm + '</button>'; }).join("");
    pestBox.addEventListener("click", function (e) {
      var b = e.target.closest(".pbtn"); if (!b) return;
      curPest = +b.getAttribute("data-p");
      [].forEach.call(pestBox.children, function (x) { x.classList.toggle("on", x === b); });
      recompute(); restyle(); if (selFi != null) showPanel(selFi);
    });
  }

  function mergeInto(dst, resp) {
    var dl = resp && resp.daily; if (!dl || !dl.time) return;
    for (var i = 0; i < dl.time.length; i++) { var mx = dl.temperature_2m_max[i], mn = dl.temperature_2m_min[i]; if (mx == null || mn == null) continue; dst[dl.time[i]] = { mx: mx, mn: mn }; }
  }
  function recompute() {
    var pest = PESTS[curPest], now = updatedAt || new Date();
    dpheno = {};
    FEATS.forEach(function (f, i) { dpheno[i] = computePheno(dseries[i], pest, now); });
  }
  // ===== Ҳарорат кэши (localStorage) — кунига бир марта юклаш, қайта-қайta API'ни чақирмаслик =====
  var TCACHE_KEY = "sputnik_temps_v1";
  function tStamp() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function readTCache(n) {
    try {
      var raw = localStorage.getItem(TCACHE_KEY); if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || o.day !== tStamp() || o.n !== n || !o.dates || !o.d) return null;
      var ser = {}, i;
      for (i in o.d) ser[i] = o.d[i].map(function (t) { return { t: new Date(o.dates[t[0]] + "T00:00:00"), mx: t[1], mn: t[2] }; });
      return ser;
    } catch (e) { return null; }
  }
  function writeTCache(n, ser) {
    try {
      var dateSet = {}, dates = [], d = {}, i;
      for (i in ser) ser[i].forEach(function (p) { var k = iso(p.t); if (!(k in dateSet)) { dateSet[k] = dates.length; dates.push(k); } });
      for (i in ser) d[i] = ser[i].map(function (p) { return [dateSet[iso(p.t)], Math.round(p.mx * 10) / 10, Math.round(p.mn * 10) / 10]; });
      localStorage.setItem(TCACHE_KEY, JSON.stringify({ day: tStamp(), n: n, dates: dates, d: d }));
    } catch (e) {}
  }
  function applySeries(ser, fromCache) {
    dseries = ser; var withData = 0, tot = 0;
    FEATS.forEach(function (f, i) { if (CTR[i]) { tot++; if (dseries[i] && dseries[i].length) withData++; } });
    updatedAt = new Date();
    recompute(); restyle();
    if (withData === 0) { loadState = "error"; if (status) status.textContent = T.noData0; }
    else { loadState = "ok"; if (status) status.textContent = T.pickHint + " · " + T.dataL + ": " + withData + "/" + tot + (fromCache ? " " + T.cacheL : ""); }
  }
  function loadTemps() {
    loadState = "loading"; if (status) status.textContent = T.loading;
    var idx = []; FEATS.forEach(function (f, i) { if (CTR[i]) idx.push(i); });
    var cached = readTCache(FEATS.length);
    if (cached) { applySeries(cached, true); return; } // кэшдан — API'сиз
    var now = new Date(), y = now.getFullYear(), archEnd = new Date(now.getTime() - 6 * 86400000);
    var maps = {}; idx.forEach(function (i) { maps[i] = {}; });
    var CH = 40, chunks = [];
    for (var k = 0; k < idx.length; k += CH) chunks.push(idx.slice(k, k + CH));
    // JSON олиш — Open-Meteo хато объектини (reason) ҳам, тармоқ хатосини ҳам, бир марта қайта уриниш билан
    function getJSON(url, tries) {
      return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.error) throw new Error(d.reason || "api error");
        return d;
      }).catch(function (e) {
        if (tries > 0) return new Promise(function (res) { setTimeout(res, 1300); }).then(function () { return getJSON(url, tries - 1); });
        throw e;
      });
    }
    function merge(ch, d) { (Array.isArray(d) ? d : [d]).forEach(function (o, j) { var i = ch[j]; if (i != null) mergeInto(maps[i], o); }); }
    var tasks = [];
    chunks.forEach(function (ch) {
      var lat = ch.map(function (i) { return CTR[i][0]; }).join(","), lon = ch.map(function (i) { return CTR[i][1]; }).join(",");
      var au = "https://archive-api.open-meteo.com/v1/archive?latitude=" + lat + "&longitude=" + lon + "&start_date=" + y + "-01-01&end_date=" + iso(archEnd) + "&daily=temperature_2m_max,temperature_2m_min&timezone=auto";
      var fu = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&daily=temperature_2m_max,temperature_2m_min&past_days=10&forecast_days=16&timezone=auto";
      // ҳар сўров алоҳида — биттаси муваффақиятсиз бўлса бошқалари ишлайверади
      tasks.push(getJSON(au, 1).then(function (d) { merge(ch, d); }).catch(function () {}));
      tasks.push(getJSON(fu, 1).then(function (d) { merge(ch, d); }).catch(function () {}));
    });
    Promise.all(tasks).then(function () {
      var ser = {}, withData = 0;
      idx.forEach(function (i) {
        var m = maps[i] || {}, keys = Object.keys(m).sort();
        ser[i] = keys.map(function (ds) { return { t: new Date(ds + "T00:00:00"), mx: m[ds].mx, mn: m[ds].mn }; });
        if (ser[i].length) withData++;
      });
      if (withData > 0) writeTCache(FEATS.length, ser); // кэшга ёзиш — эртага/қайта юкланганда API'ни чақирмаслик
      applySeries(ser, false);
    }).catch(function () { loadState = "error"; if (status) status.textContent = T.err; });
  }

  function showPanel(i) {
    var box = document.getElementById("sat-panel"); if (!box) return;
    if (i == null || !FEATS[i]) { box.style.display = "none"; return; }
    var p = FEATS[i].properties, ph = dpheno[i], pest = PESTS[curPest];
    box.style.display = "";
    if (!ph) { box.innerHTML = '<div class="sp-h"><b>' + dnm(p) + '</b> · ' + rnm(p) + '</div><div>' + (loadState === "loading" ? T.loading : T.nodata) + '</div>'; return; }
    var active = !ph.ended;
    var phase = active ? ('<span class="sp-ph active">' + T.phaseA + '</span>') : ('<span class="sp-ph dia">' + T.phaseD + '</span>');
    var body = active
      ? (T.gen + ': <b>' + ph.gen + '</b> (' + Math.round(ph.progress * 100) + '% ' + T.progress + ') · ' + T.next + ': <b>' + (ph.next ? fmtDate(ph.next) + (ph.approx ? ' ' + T.approx : '') : '—') + '</b>')
      : ('<b>' + T.winterL + ':</b> ' + pest.winter + '<br><b>' + T.recL + ':</b> ' + pest.rec);
    box.innerHTML = '<div class="sp-h"><b>' + dnm(p) + '</b> · ' + rnm(p) + ' · ' + pest.nm + '</div>' +
      '<div class="sp-badge">' + phase + '</div>' +
      '<div class="sp-body">' + body + '</div>' +
      '<div class="sp-gdd">' + T.gdd + ': <b>' + Math.round(ph.gdd) + '</b> °Д</div>' +
      calHTML(ph, pest);
  }
  function calHTML(ph, pest) {
    var y = (updatedAt || new Date()).getFullYear(), y0 = new Date(y, 0, 1).getTime(), y1 = new Date(y + 1, 0, 1).getTime(), span = y1 - y0;
    function pct(d) { return Math.max(0, Math.min(100, (d.getTime() - y0) / span * 100)); }
    var bnds = ph.boundaries || [], segs = "", start = ph.seasonStart ? pct(ph.seasonStart) : (bnds.length ? pct(bnds[0].date) : 0);
    for (var k = 0; k < bnds.length; k++) { var s = k === 0 ? start : pct(bnds[k - 1].date), e = pct(bnds[k].date); segs += '<div class="sc-seg" style="left:' + s + '%;width:' + Math.max(0.6, e - s) + '%;background:' + genColor(k + 1) + '"></div>'; }
    var lastStart = bnds.length ? pct(bnds[bnds.length - 1].date) : start, nowP = pct(updatedAt || new Date());
    if (nowP > lastStart) segs += '<div class="sc-seg" style="left:' + lastStart + '%;width:' + Math.max(0.6, nowP - lastStart) + '%;background:' + (ph.ended ? DIA_COL : genColor(ph.gen)) + '"></div>';
    var marks = bnds.map(function (b, k) { return '<div class="sc-mark" style="left:' + pct(b.date) + '%"><span>' + (k + 2) + '</span></div>'; }).join("");
    var mticks = T.months.map(function (m, i) { return '<div class="sc-month" style="left:' + (i / 12 * 100) + '%">' + m + '</div>'; }).join("");
    return '<div class="sc-wrap"><div class="sc-title">' + T.calTitle + ' <span class="sc-base">(' + T.base + ' +' + pest.base + '°C)</span></div>' +
      '<div class="sc-track">' + segs + marks + '<div class="sc-today" style="left:' + nowP + '%"></div></div>' +
      '<div class="sc-axis">' + mticks + '</div>' +
      '<div class="sc-note">' + T.today + ': ' + fmtDate(updatedAt || new Date()) + ' · ' + T.note + '</div></div>';
  }
})();
