/* Degree-Day (фаол ҳарорат йиғиндиси) / фенологик прогноз.
 *
 * Об-ҳаво Open-Meteo (архив + прогноз, калитсиз) дан олинади.
 * Кунлик DD = max(0, ((min(Tmax,upper)+Tmin)/2) - Base). Йиғилган DD асосида
 * зараркунанда авлодлари/босқичлари санаси башорат қилинади.
 *
 * ⚠️ Бу — МОДЕЛ БАҲОСИ. Base ҳарорат ва авлод учун DL қийматлари тахминий;
 * дала мониторинги (феромон тутқич ва ҳ.к.) билан бирга ишлатилиши керак.
 */
(function () {
  "use strict";

  // --- DD ҳисоблаш (тоза функциялар — тест учун ҳам) ---
  function computeDD(days, base, upper) {
    // days: [{date, tmax, tmin}] -> [{date, dd, cum}]
    var cum = 0, out = [];
    days.forEach(function (d) {
      if (d.tmax == null || d.tmin == null) { out.push({ date: d.date, dd: null, cum: cum }); return; }
      var tmax = (upper != null && !isNaN(upper)) ? Math.min(d.tmax, upper) : d.tmax;
      var tavg = (tmax + d.tmin) / 2;
      var dd = Math.max(0, tavg - base);
      cum += dd;
      out.push({ date: d.date, dd: Math.round(dd * 10) / 10, cum: Math.round(cum * 10) / 10 });
    });
    return out;
  }
  function predictGenerations(series, genDD, gens) {
    var res = [];
    for (var g = 1; g <= gens; g++) {
      var target = g * genDD, hit = null;
      for (var i = 0; i < series.length; i++) {
        if (series[i].cum >= target) { hit = series[i].date; break; }
      }
      res.push({ gen: g, targetDD: target, date: hit });
    }
    return res;
  }
  window.FenDD = { computeDD: computeDD, predictGenerations: predictGenerations };

  // --- шаҳарлар (тезкор изоҳлаш) ---
  var CITY_DB = {
    "тошкент": [41.2995, 69.2401], "ташкент": [41.2995, 69.2401], "toshkent": [41.2995, 69.2401],
    "самарқанд": [39.627, 66.975], "самарканд": [39.627, 66.975], "samarqand": [39.627, 66.975],
    "бухоро": [39.7747, 64.4286], "бухара": [39.7747, 64.4286], "buxoro": [39.7747, 64.4286],
    "андижон": [40.7821, 72.3442], "андижан": [40.7821, 72.3442], "andijon": [40.7821, 72.3442],
    "наманган": [41.0011, 71.6726], "namangan": [41.0011, 71.6726],
    "фарғона": [40.3864, 71.7864], "фергана": [40.3864, 71.7864], "fargona": [40.3864, 71.7864],
    "қарши": [38.8606, 65.7891], "карши": [38.8606, 65.7891], "qarshi": [38.8606, 65.7891],
    "термиз": [37.2242, 67.2783], "термез": [37.2242, 67.2783], "termiz": [37.2242, 67.2783],
    "нукус": [42.4531, 59.6103], "nukus": [42.4531, 59.6103],
    "урганч": [41.55, 60.6333], "ургенч": [41.55, 60.6333], "urganch": [41.55, 60.6333],
    "гулистон": [40.4897, 68.7842], "гулистан": [40.4897, 68.7842],
    "жиззах": [40.1158, 67.8422], "джизак": [40.1158, 67.8422], "jizzax": [40.1158, 67.8422],
    "навоий": [40.0844, 65.3792], "навои": [40.0844, 65.3792], "navoiy": [40.0844, 65.3792]
  };

  // Зараркунанда пресетлари (тахминий: base °C, авлод учун DD)
  var PRESETS = [
    { key: "custom", uz: "— Қўлбола —", ru: "— Вручную —", base: 10, gen: 500, gens: 3 },
    { key: "bollworm", uz: "Ғўза тунлами (H. armigera)", ru: "Хлопковая совка", base: 10, gen: 470, gens: 3 },
    { key: "codling", uz: "Олма мевахўри (C. pomonella)", ru: "Яблонная плодожорка", base: 10, gen: 560, gens: 2 },
    { key: "spidermite", uz: "Ўргимчаккана (T. urticae)", ru: "Паутинный клещ", base: 11, gen: 120, gens: 8 },
    { key: "cpb", uz: "Колорадо қўнғизи", ru: "Колорадский жук", base: 10, gen: 360, gens: 2 },
    { key: "aphid", uz: "Ширалар (Aphididae)", ru: "Тли", base: 5, gen: 120, gens: 10 }
  ];

  var LANG = document.documentElement.lang.indexOf("ru") === 0 ? "ru" : "uz";
  var T = LANG === "ru" ? {
    cityPh: "Город (напр.: Ташкент)", start: "Начало сезона (биофикс)", base: "Базовая температура, °C",
    upper: "Верхний порог, °C (необяз.)", genDD: "DD на поколение", gens: "Число поколений",
    preset: "Вредитель (пресет)", calc: "Рассчитать", calculating: "Загрузка данных...",
    curDD: "Накоплено DD (на сегодня)", gen: "Поколение", date: "Прогноз. дата", status: "Статус",
    reached: "достигнуто", forecast: "прогноз", cityNF: "Город не найден",
    err: "Ошибка загрузки погоды. Проверьте интернет/название города.",
    chartTitle: "Накопление DD", today: "сегодня",
    note: "⚠️ Модельная оценка. Base и DD-пороги ориентировочные — используйте вместе с полевым мониторингом."
  } : {
    cityPh: "Шаҳар (масалан: Тошкент)", start: "Мавсум боши (биофикс)", base: "Base ҳарорат, °C",
    upper: "Юқори чегара, °C (ихтиёрий)", genDD: "Авлод учун DD", gens: "Авлодлар сони",
    preset: "Зараркунанда (пресет)", calc: "Ҳисоблаш", calculating: "Маълумот юкланмоқда...",
    curDD: "Йиғилган DD (бугунга)", gen: "Авлод", date: "Башорат сана", status: "Ҳолат",
    reached: "етди", forecast: "башорат", cityNF: "Шаҳар топилмади",
    err: "Об-ҳаво юкланмади. Интернет/шаҳар номини текширинг.",
    chartTitle: "DD йиғилиши", today: "бугун",
    note: "⚠️ Модель баҳоси. Base ва DD-чегаралар тахминий — дала мониторинги билан бирга ишлатинг."
  };

  var root = document.getElementById("fen-app");
  if (!root) return;

  var presetOpts = PRESETS.map(function (p) { return '<option value="' + p.key + '">' + (LANG === "ru" ? p.ru : p.uz) + "</option>"; }).join("");
  var today = new Date();
  var defStart = new Date(today.getFullYear(), 3, 1); // 1 апрел
  function ymd(d) { return d.toISOString().slice(0, 10); }

  root.innerHTML =
    '<div class="fen-form">' +
      '<div class="fen-grid">' +
        field("fen-city", T.cityPh, '<input id="fen-city" class="reg-inp" placeholder="' + esc(T.cityPh) + '">') +
        field("fen-preset", T.preset, '<select id="fen-preset" class="reg-inp">' + presetOpts + "</select>") +
        field("fen-start", T.start, '<input id="fen-start" type="date" class="reg-inp" value="' + ymd(defStart) + '">') +
        field("fen-base", T.base, '<input id="fen-base" type="number" step="0.5" class="reg-inp" value="10">') +
        field("fen-upper", T.upper, '<input id="fen-upper" type="number" step="0.5" class="reg-inp" placeholder="35">') +
        field("fen-gendd", T.genDD, '<input id="fen-gendd" type="number" class="reg-inp" value="500">') +
        field("fen-gens", T.gens, '<input id="fen-gens" type="number" min="1" max="12" class="reg-inp" value="3">') +
      "</div>" +
      '<button id="fen-calc" class="btn btn-primary" style="margin-top:6px;">' + esc(T.calc) + "</button>" +
      '<span id="fen-status" class="fen-status"></span>' +
    "</div>" +
    '<div id="fen-result"></div>';

  function field(id, label, control) {
    return '<label class="fen-field"><span>' + esc(label) + "</span>" + control + "</label>";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // пресет танланганда base/gendd/gens тўлдириш
  document.getElementById("fen-preset").addEventListener("change", function () {
    var p = PRESETS.filter(function (x) { return x.key === this.value; }.bind(this))[0];
    if (p && p.key !== "custom") {
      document.getElementById("fen-base").value = p.base;
      document.getElementById("fen-gendd").value = p.gen;
      document.getElementById("fen-gens").value = p.gens;
    }
  });

  // --- геолокация ---
  function geocode(name) {
    var key = (name || "").trim().toLowerCase();
    if (CITY_DB[key]) return Promise.resolve({ lat: CITY_DB[key][0], lon: CITY_DB[key][1], label: name });
    var url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(name) + "&count=1&language=ru";
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.results && j.results.length) return { lat: j.results[0].latitude, lon: j.results[0].longitude, label: j.results[0].name };
      throw new Error(T.cityNF);
    });
  }

  // --- об-ҳаво (архив + прогноз) ---
  function fetchWeather(lat, lon, startDate) {
    var tzp = "&timezone=auto&daily=temperature_2m_max,temperature_2m_min";
    var y = new Date(); y.setDate(y.getDate() - 6);
    var arcEnd = ymd(y);
    var arcUrl = "https://archive-api.open-meteo.com/v1/archive?latitude=" + lat + "&longitude=" + lon +
      "&start_date=" + startDate + "&end_date=" + arcEnd + tzp;
    var fcUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&past_days=7&forecast_days=16" + tzp;
    return Promise.all([
      fetch(arcUrl).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch(fcUrl).then(function (r) { return r.json(); })
    ]).then(function (res) {
      var map = {};
      [res[0], res[1]].forEach(function (j) {
        if (!j || !j.daily || !j.daily.time) return;
        j.daily.time.forEach(function (t, i) {
          map[t] = { date: t, tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i] };
        });
      });
      return Object.keys(map).sort().map(function (k) { return map[k]; }).filter(function (d) { return d.date >= startDate; });
    });
  }

  // --- натижа ---
  function ddChart(series, genDD, gens, todayStr) {
    var W = 760, H = 320, pl = 50, pr = 16, pt = 20, pb = 40, aw = W - pl - pr, ah = H - pt - pb;
    var maxCum = Math.max(gens * genDD, series.length ? series[series.length - 1].cum : 1) * 1.05;
    var n = series.length;
    var xAt = function (i) { return pl + (n <= 1 ? aw / 2 : aw * i / (n - 1)); };
    var yAt = function (v) { return pt + ah - (v / maxCum) * ah; };
    var parts = ['<rect width="' + W + '" height="' + H + '" fill="#fff"/>'];
    // авлод чегара чизиқлари
    for (var g = 1; g <= gens; g++) {
      var y = yAt(g * genDD);
      parts.push('<line x1="' + pl + '" y1="' + y + '" x2="' + (W - pr) + '" y2="' + y + '" stroke="#f0c36d" stroke-dasharray="4 4"/>');
      parts.push('<text x="' + (W - pr) + '" y="' + (y - 3) + '" font-size="10" text-anchor="end" fill="#a67c00">' + T.gen + " " + g + "</text>");
    }
    // Y ўқи
    for (var t = 0; t <= 4; t++) { var yv = maxCum * t / 4, yy = yAt(yv); parts.push('<text x="' + (pl - 6) + '" y="' + (yy + 3) + '" font-size="10" text-anchor="end" fill="#666">' + Math.round(yv) + "</text>"); }
    // йиғилган DD чизиғи
    var pts = series.map(function (s, i) { return xAt(i) + "," + yAt(s.cum); }).join(" ");
    parts.push('<polyline points="' + pts + '" fill="none" stroke="#2e7d32" stroke-width="2.5"/>');
    // бугун маркери
    var ti = -1; for (var k = 0; k < series.length; k++) { if (series[k].date === todayStr) { ti = k; break; } if (series[k].date > todayStr) { ti = k; break; } }
    if (ti >= 0) { var tx = xAt(ti); parts.push('<line x1="' + tx + '" y1="' + pt + '" x2="' + tx + '" y2="' + (pt + ah) + '" stroke="#1565c0" stroke-dasharray="3 3"/>'); parts.push('<text x="' + (tx + 3) + '" y="' + (pt + 10) + '" font-size="10" fill="#1565c0">' + T.today + "</text>"); }
    // X белгилари (бошланиш, ўрта, охир)
    [0, Math.floor(n / 2), n - 1].forEach(function (i) { if (i >= 0 && i < n) parts.push('<text x="' + xAt(i) + '" y="' + (pt + ah + 16) + '" font-size="10" text-anchor="middle" fill="#666">' + series[i].date.slice(5) + "</text>"); });
    parts.push('<line x1="' + pl + '" y1="' + (pt + ah) + '" x2="' + (W - pr) + '" y2="' + (pt + ah) + '" stroke="#333"/>');
    return '<svg viewBox="0 0 ' + W + " " + H + '" class="fen-svg" xmlns="http://www.w3.org/2000/svg">' + parts.join("") + "</svg>";
  }

  function renderResult(series, base, genDD, gens) {
    var todayStr = ymd(new Date());
    var cur = null;
    for (var i = 0; i < series.length; i++) { if (series[i].date <= todayStr) cur = series[i]; }
    var curDD = cur ? cur.cum : 0;
    var preds = predictGenerations(series, genDD, gens);
    var rows = preds.map(function (p) {
      var reached = curDD >= p.targetDD;
      return "<tr><td>" + T.gen + " " + p.gen + "</td><td>" + p.targetDD + " DD</td><td>" + (p.date ? p.date : "—") + "</td><td>" +
        (reached ? '<span class="fen-ok">✓ ' + T.reached + "</span>" : '<span class="fen-fc">' + T.forecast + "</span>") + "</td></tr>";
    }).join("");
    document.getElementById("fen-result").innerHTML =
      '<div class="fen-card"><div class="fen-cur">' + T.curDD + ': <b>' + Math.round(curDD) + " DD</b></div>" +
      '<div class="fen-scroll">' + ddChart(series, genDD, gens, todayStr) + "</div></div>" +
      '<div class="fen-card"><div class="reg-scroll"><table class="reg-table"><thead><tr>' +
        "<th>" + T.gen + "</th><th>DD</th><th>" + T.date + "</th><th>" + T.status + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<p class="fen-note">' + esc(T.note) + "</p></div>";
  }

  function setStatus(m) { document.getElementById("fen-status").textContent = m || ""; }

  document.getElementById("fen-calc").addEventListener("click", function () {
    var city = document.getElementById("fen-city").value;
    var start = document.getElementById("fen-start").value;
    var base = parseFloat(document.getElementById("fen-base").value);
    var upper = document.getElementById("fen-upper").value ? parseFloat(document.getElementById("fen-upper").value) : null;
    var genDD = parseFloat(document.getElementById("fen-gendd").value);
    var gens = parseInt(document.getElementById("fen-gens").value, 10) || 3;
    if (!city.trim()) { setStatus(T.cityNF); return; }
    setStatus(T.calculating);
    geocode(city).then(function (loc) {
      return fetchWeather(loc.lat, loc.lon, start);
    }).then(function (days) {
      var series = computeDD(days, base, upper);
      setStatus("");
      renderResult(series, base, genDD, gens);
    }).catch(function (e) { setStatus(e.message || T.err); });
  });
})();
