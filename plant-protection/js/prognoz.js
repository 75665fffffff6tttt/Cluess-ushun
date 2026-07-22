document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("risk-form");
  if (!form) return;

  var LANG = document.documentElement.lang.indexOf("ru") === 0 ? "ru" : "uz";

  var T = {
    uz: {
      categories: {
        fungal: "Замбуруғ/бактерия касалликлари",
        pest: "Ҳашарот зараркунандалар",
        mite: "Кана (ўргимчаккана)",
        locust: "Чигиртка хавфи",
        weed: "Бегона ўт ўсиши"
      },
      levels: { low: "Паст", medium: "Ўртача", high: "Юқори", critical: "Жуда юқори" },
      summaryTitle: {
        low: "Умумий хавф — паст",
        medium: "Умумий хавф — ўртача",
        high: "Умумий хавф — юқори",
        critical: "Умумий хавф — жуда юқори"
      },
      summaryText: {
        low: "Ҳозирги шароитда жиддий хавф кузатилмаяпти. Одатдаги ҳафталик кузатувни давом эттиринг.",
        medium: "Айрим зараркунанда ёки касалликлар учун шароит қулайлашмоқда. Кузатувни кучайтиринг.",
        high: "Бир нечта таҳдид учун шароит юқори. Профилактик чораларни дарҳол кўринг.",
        critical: "Кўп таҳдидлар учун шароит жуда қулай. Тезкор аралашув талаб этилади."
      },
      threatsTitle: "Танланган экин учун асосий таҳдидлар",
      recoTitle: "Тавсия этилган чоралар",
      recoNone: "Ҳозирча жиддий чора талаб этилмайди — режали кузатувни давом эттиринг.",
      detailLink: "Батафсил →",
      weather: {
        locating: "Жойлашувингиз аниқланмоқда...",
        searching: "«{city}» қидирилмоқда...",
        fetching: "Об-ҳаво маълумотлари олинмоқда...",
        cityEmpty: "Илтимос, шаҳар номини киритинг.",
        cityNotFound: "Шаҳар топилмади. Номини текшириб, қайта уриниб кўринг.",
        geoDenied: "Жойлашувга рухсат берилмади. Шаҳар номини қўлда киритинг.",
        geoUnsupported: "Браузерингиз геолокацияни қўллаб-қувватламайди. Шаҳар номини киритинг.",
        network: "Маълумот олишда хатолик юз берди. Интернет алоқасини текшириб, қайта уриниб кўринг.",
        success: "📍 {place}: ҳарорат {temp}°C, намлик {hum}%, бугунги ёғин {rain} мм — {time}. Шароит қуйида автоматик тўлдирилди.",
        chartSub: "Соатлик ҳарорат прогнози (Open-Meteo)"
      }
    },
    ru: {
      categories: {
        fungal: "Грибковые/бактериальные болезни",
        pest: "Насекомые-вредители",
        mite: "Клещи (паутинный клещ)",
        locust: "Риск саранчи",
        weed: "Рост сорняков"
      },
      levels: { low: "Низкий", medium: "Средний", high: "Высокий", critical: "Очень высокий" },
      summaryTitle: {
        low: "Общий риск — низкий",
        medium: "Общий риск — средний",
        high: "Общий риск — высокий",
        critical: "Общий риск — очень высокий"
      },
      summaryText: {
        low: "В текущих условиях серьёзного риска не наблюдается. Продолжайте обычный еженедельный осмотр.",
        medium: "Условия становятся благоприятными для отдельных вредителей или болезней. Усильте наблюдение.",
        high: "Условия высоки сразу для нескольких угроз. Незамедлительно примите профилактические меры.",
        critical: "Условия крайне благоприятны для множества угроз. Требуется срочное вмешательство."
      },
      threatsTitle: "Основные угрозы для выбранной культуры",
      recoTitle: "Рекомендуемые меры",
      recoNone: "Срочных мер пока не требуется — продолжайте плановое наблюдение.",
      detailLink: "Подробнее →",
      weather: {
        locating: "Определяем ваше местоположение...",
        searching: "Поиск «{city}»...",
        fetching: "Получаем данные о погоде...",
        cityEmpty: "Пожалуйста, введите название города.",
        cityNotFound: "Город не найден. Проверьте написание и попробуйте снова.",
        geoDenied: "Доступ к геолокации не разрешён. Введите название города вручную.",
        geoUnsupported: "Ваш браузер не поддерживает геолокацию. Введите название города.",
        network: "Ошибка при получении данных. Проверьте подключение к интернету и попробуйте снова.",
        success: "📍 {place}: температура {temp}°C, влажность {hum}%, осадки сегодня {rain} мм — {time}. Условия ниже заполнены автоматически.",
        chartSub: "Почасовой прогноз температуры (Open-Meteo)"
      }
    }
  };

  var CATEGORY_ORDER = ["fungal", "pest", "mite", "locust", "weed"];
  var t = T[LANG];

  var CROP_THREATS = {
    tomato_potato: [
      { cat: "fungal", href_uz: "kasalliklar.html", href_ru: "kasalliklar.ru.html", name_uz: "Кечки куйиш (фитофтороз)", name_ru: "Фитофтороз" },
      { cat: "pest", href_uz: "zararkunandalar.html", href_ru: "zararkunandalar.ru.html", name_uz: "Колорадо қўнғизи", name_ru: "Колорадский жук" },
      { cat: "pest", href_uz: "zararkunandalar.html", href_ru: "zararkunandalar.ru.html", name_uz: "Шира", name_ru: "Тля" }
    ],
    grain: [
      { cat: "fungal", href_uz: "kasalliklar.html", href_ru: "kasalliklar.ru.html", name_uz: "Занг касаллиги", name_ru: "Ржавчина" },
      { cat: "locust", href_uz: "zararkunandalar.html", href_ru: "zararkunandalar.ru.html", name_uz: "Чигиртка", name_ru: "Саранча" },
      { cat: "weed", href_uz: "begona-otlar.html", href_ru: "begona-otlar.ru.html", name_uz: "Кўп йиллик бегона ўтлар", name_ru: "Многолетние сорняки" }
    ],
    fruit_trees: [
      { cat: "fungal", href_uz: "kasalliklar.html", href_ru: "kasalliklar.ru.html", name_uz: "Бактериал куйиш", name_ru: "Бактериальный ожог" },
      { cat: "fungal", href_uz: "kasalliklar.html", href_ru: "kasalliklar.ru.html", name_uz: "Ун-шудринг касаллиги", name_ru: "Мучнистая роса" },
      { cat: "pest", href_uz: "zararkunandalar.html", href_ru: "zararkunandalar.ru.html", name_uz: "Шира", name_ru: "Тля" }
    ],
    vegetables: [
      { cat: "fungal", href_uz: "kasalliklar.html", href_ru: "kasalliklar.ru.html", name_uz: "Ун-шудринг касаллиги", name_ru: "Мучнистая роса" },
      { cat: "mite", href_uz: "zararkunandalar.html", href_ru: "zararkunandalar.ru.html", name_uz: "Ўргимчаккана", name_ru: "Паутинный клещ" },
      { cat: "pest", href_uz: "zararkunandalar.html", href_ru: "zararkunandalar.ru.html", name_uz: "Шира", name_ru: "Тля" }
    ],
    grapes: [
      { cat: "fungal", href_uz: "kasalliklar.html", href_ru: "kasalliklar.ru.html", name_uz: "Ун-шудринг (оидиум)", name_ru: "Мучнистая роса (оидиум)" },
      { cat: "mite", href_uz: "zararkunandalar.html", href_ru: "zararkunandalar.ru.html", name_uz: "Ўргимчаккана", name_ru: "Паутинный клещ" },
      { cat: "fungal", href_uz: "kasalliklar.html", href_ru: "kasalliklar.ru.html", name_uz: "Занг", name_ru: "Ржавчина" }
    ]
  };

  var RECO_TEXTS = {
    fungal: {
      uz: "Ўсимликлар орасидаги масофани сақланг, ортиқча суғоришдан қочинг, зарур бўлса мис асосидаги фунгицид билан профилактик ишлов беринг.",
      ru: "Соблюдайте расстояние между растениями, избегайте избыточного полива, при необходимости проведите профилактическую обработку медьсодержащим фунгицидом."
    },
    pest: {
      uz: "Феромон ва ёпишқоқ тузоқлар ўрнатинг, фойдали ҳашаротлар учун шароит яратинг, юқори даражада рухсат этилган инсектицид қўлланг.",
      ru: "Установите феромонные и клеевые ловушки, создайте условия для полезных насекомых, при высоком уровне примените разрешённый инсектицид."
    },
    mite: {
      uz: "Ҳаво намлигини ошириш чораларини кўринг, юқори даражада акарицид қўллашни режалаштиринг.",
      ru: "Примите меры по повышению влажности воздуха, при высоком уровне запланируйте применение акарицида."
    },
    locust: {
      uz: "Ҳудудий мониторингни кучайтиринг, дала четларини назорат остига олинг, оммавий тарқалишда тезкор ишлов беринг.",
      ru: "Усильте мониторинг территории, возьмите под контроль края поля, при массовом распространении проведите срочную обработку."
    },
    weed: {
      uz: "Мулчалаш қилинг, ўз вақтида ўтоқ ишларини бажаринг, экинни зич жойлаштиришдан фойдаланинг.",
      ru: "Проведите мульчирование, своевременно выполняйте прополку, используйте более плотную посадку культуры."
    }
  };

  function clamp(v) {
    return Math.max(0, Math.min(100, Math.round(v)));
  }

  function levelOf(score) {
    if (score >= 75) return "critical";
    if (score >= 50) return "high";
    if (score >= 25) return "medium";
    return "low";
  }

  function computeScores(inputs) {
    var tempFactor = { low: 0, med: 1, high: 2 }[inputs.temp];
    var humFactor = { low: 0, med: 1, high: 2 }[inputs.humidity];
    var rainFactor = { none: 0, light: 1, heavy: 2 }[inputs.rain];
    var seasonWarm = inputs.season === "spring" || inputs.season === "summer" ? 1 : 0;

    var fungal = clamp(humFactor * 30 + (tempFactor === 1 ? 20 : tempFactor === 2 ? 10 : 0) + rainFactor * 15);
    var pest = clamp((seasonWarm ? 35 : 10) + tempFactor * 15 + (humFactor === 1 ? 10 : 0));
    var mite = clamp(tempFactor * 35 + (2 - humFactor) * 15);
    var locust = clamp((inputs.season === "summer" ? 40 : inputs.season === "spring" ? 20 : 5) + tempFactor * 20 + (2 - humFactor) * 10);
    var weed = clamp(rainFactor * 30 + (seasonWarm ? 25 : 10) + tempFactor * 10);

    return { fungal: fungal, pest: pest, mite: mite, locust: locust, weed: weed };
  }

  function renderResults(crop, scores) {
    var overall = clamp(
      (scores.fungal + scores.pest + scores.mite + scores.locust + scores.weed) / 5
    );
    var overallLevel = levelOf(overall);

    var ring = document.getElementById("risk-ring");
    ring.textContent = overall + "%";
    ring.className = "ring risk-level-" + overallLevel;
    document.getElementById("risk-summary-title").textContent = t.summaryTitle[overallLevel];
    document.getElementById("risk-summary-text").textContent = t.summaryText[overallLevel];

    var grid = document.getElementById("risk-grid");
    grid.innerHTML = "";
    CATEGORY_ORDER.forEach(function (cat) {
      var score = scores[cat];
      var level = levelOf(score);
      var card = document.createElement("div");
      card.className = "risk-card";
      card.innerHTML =
        '<div class="risk-top"><h4>' + t.categories[cat] + '</h4><span class="risk-pct">' + score + '%</span></div>' +
        '<div class="risk-bar"><div class="risk-bar-fill risk-level-' + level + '" style="width:' + score + '%"></div></div>' +
        '<span class="risk-level-label risk-level-' + level + '">' + t.levels[level] + "</span>";
      grid.appendChild(card);
    });

    var threatList = document.getElementById("threat-list");
    threatList.innerHTML = "";
    var threats = CROP_THREATS[crop] || [];
    threats.forEach(function (item) {
      var level = levelOf(scores[item.cat]);
      var name = LANG === "ru" ? item.name_ru : item.name_uz;
      var href = LANG === "ru" ? item.href_ru : item.href_uz;
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="threat-name">' + name + "<small>" + t.categories[item.cat] + "</small></span>" +
        '<span style="display:flex; align-items:center; gap:10px;">' +
        '<span class="risk-level-label risk-level-' + level + '">' + t.levels[level] + "</span>" +
        '<a href="' + href + '">' + t.detailLink + "</a></span>";
      threatList.appendChild(li);
    });

    var recoList = document.getElementById("reco-list");
    recoList.innerHTML = "";
    var anyReco = false;
    CATEGORY_ORDER.forEach(function (cat) {
      var level = levelOf(scores[cat]);
      if (level === "medium" || level === "high" || level === "critical") {
        anyReco = true;
        var li = document.createElement("li");
        li.innerHTML = "<strong>" + t.categories[cat] + ":</strong> " + RECO_TEXTS[cat][LANG];
        recoList.appendChild(li);
      }
    });
    if (!anyReco) {
      var li = document.createElement("li");
      li.textContent = t.recoNone;
      recoList.appendChild(li);
    }

    document.getElementById("risk-results").classList.remove("results-hidden");
    document.getElementById("risk-results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function computeAndRenderFromForm() {
    var inputs = {
      crop: document.getElementById("crop").value,
      season: document.getElementById("season").value,
      temp: document.getElementById("temp").value,
      humidity: document.getElementById("humidity").value,
      rain: document.getElementById("rain").value
    };
    var scores = computeScores(inputs);
    renderResults(inputs.crop, scores);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    computeAndRenderFromForm();
  });

  // --- Live weather (Open-Meteo, no API key required) ---
  var statusEl = document.getElementById("weather-status");
  var cityInput = document.getElementById("city-input");
  var cityBtn = document.getElementById("fetch-city-btn");
  var geoBtn = document.getElementById("fetch-geo-btn");
  if (!statusEl || !cityBtn || !geoBtn) return;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "weather-status" + (kind ? " weather-status-" + kind : "");
  }

  function fillTemplate(str, map) {
    return str.replace(/\{(\w+)\}/g, function (_, k) {
      return map[k] != null ? map[k] : "";
    });
  }

  function seasonFromDate(date) {
    var m = date.getMonth() + 1;
    if (m === 12 || m <= 2) return "winter";
    if (m <= 5) return "spring";
    if (m <= 8) return "summer";
    return "autumn";
  }

  function tempBucket(c) {
    if (c < 15) return "low";
    if (c <= 25) return "med";
    return "high";
  }

  function humBucket(pct) {
    if (pct < 40) return "low";
    if (pct <= 70) return "med";
    return "high";
  }

  function rainBucket(mm) {
    if (mm <= 0.1) return "none";
    if (mm <= 5) return "light";
    return "heavy";
  }

  var chipRow = document.getElementById("weather-chip-row");
  var chartCard = document.getElementById("temp-chart-card");
  var chartWrap = document.getElementById("temp-chart-wrap");
  var chartSub = document.getElementById("temp-chart-sub");

  function clearWeather() {
    if (chipRow) chipRow.innerHTML = "";
    setStatus("", null);
    if (chartCard) chartCard.classList.add("results-hidden");
  }

  function renderChip(place) {
    if (!chipRow) return;
    chipRow.innerHTML = "";
    var chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = "📍 " + place + ' <span class="chip-remove" role="button" tabindex="0" aria-label="close">✕</span>';
    chip.querySelector(".chip-remove").addEventListener("click", clearWeather);
    chipRow.appendChild(chip);
  }

  function hourLabel(iso) {
    return new Date(iso).toLocaleTimeString(LANG === "ru" ? "ru-RU" : "uz-UZ", { hour: "2-digit" });
  }

  function buildSparklineSvg(times, temps) {
    var w = 600, h = 170, padL = 34, padR = 14, padT = 18, padB = 28;
    var n = temps.length;
    var min = Math.min.apply(null, temps);
    var max = Math.max.apply(null, temps);
    if (min === max) { max = min + 1; }
    var xStep = (w - padL - padR) / (n - 1);
    function X(i) { return padL + i * xStep; }
    function Y(v) { return padT + (1 - (v - min) / (max - min)) * (h - padT - padB); }

    var linePts = temps.map(function (v, i) { return X(i).toFixed(1) + "," + Y(v).toFixed(1); }).join(" ");
    var areaPts = linePts + " " + X(n - 1).toFixed(1) + "," + (h - padB) + " " + X(0).toFixed(1) + "," + (h - padB);
    var midIdx = Math.floor((n - 1) / 2);

    return (
      '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="temperature chart">' +
      '<polygon points="' + areaPts + '" style="fill:var(--green-100)"></polygon>' +
      '<polyline points="' + linePts + '" fill="none" style="stroke:var(--green-700)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>' +
      '<text x="4" y="' + (Y(max) + 4).toFixed(1) + '" font-size="11" style="fill:var(--ink-600)">' + Math.round(max) + '°</text>' +
      '<text x="4" y="' + (Y(min) + 4).toFixed(1) + '" font-size="11" style="fill:var(--ink-600)">' + Math.round(min) + '°</text>' +
      '<text x="' + X(0).toFixed(1) + '" y="' + (h - 8) + '" font-size="10" text-anchor="start" style="fill:var(--ink-600)">' + hourLabel(times[0]) + '</text>' +
      '<text x="' + X(midIdx).toFixed(1) + '" y="' + (h - 8) + '" font-size="10" text-anchor="middle" style="fill:var(--ink-600)">' + hourLabel(times[midIdx]) + '</text>' +
      '<text x="' + X(n - 1).toFixed(1) + '" y="' + (h - 8) + '" font-size="10" text-anchor="end" style="fill:var(--ink-600)">' + hourLabel(times[n - 1]) + '</text>' +
      "</svg>"
    );
  }

  function renderTempChart(place, hourly, now) {
    if (!chartCard || !hourly || !hourly.time || !hourly.temperature_2m) {
      if (chartCard) chartCard.classList.add("results-hidden");
      return;
    }
    var times = hourly.time, temps = hourly.temperature_2m;
    var startIdx = 0;
    for (var i = 0; i < times.length; i++) {
      if (new Date(times[i]) >= now) { startIdx = i; break; }
    }
    var sliceTimes = times.slice(startIdx, startIdx + 24);
    var sliceTemps = temps.slice(startIdx, startIdx + 24);
    if (sliceTemps.length < 2) {
      chartCard.classList.add("results-hidden");
      return;
    }
    chartWrap.innerHTML = buildSparklineSvg(sliceTimes, sliceTemps);
    chartSub.textContent = place + " — " + t.weather.chartSub;
    chartCard.classList.remove("results-hidden");
  }

  function applyWeather(place, current, dailyRain, hourly) {
    var temp = current.temperature_2m;
    var hum = current.relative_humidity_2m;
    var rain = dailyRain != null ? dailyRain : current.precipitation || 0;
    var now = new Date();

    document.getElementById("season").value = seasonFromDate(now);
    document.getElementById("temp").value = tempBucket(temp);
    document.getElementById("humidity").value = humBucket(hum);
    document.getElementById("rain").value = rainBucket(rain);

    setStatus(
      fillTemplate(t.weather.success, {
        place: place,
        temp: Math.round(temp),
        hum: Math.round(hum),
        rain: rain.toFixed(1),
        time: now.toLocaleTimeString(LANG === "ru" ? "ru-RU" : "uz-UZ", { hour: "2-digit", minute: "2-digit" })
      }),
      "success"
    );
    renderChip(place);
    renderTempChart(place, hourly, now);

    computeAndRenderFromForm();
  }

  function fetchWeatherForCoords(lat, lon, place) {
    setStatus(t.weather.fetching, "loading");
    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(lat) +
      "&longitude=" + encodeURIComponent(lon) +
      "&current=temperature_2m,relative_humidity_2m,precipitation" +
      "&hourly=temperature_2m" +
      "&daily=precipitation_sum&timezone=auto&forecast_days=2";

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("weather-fetch-failed");
        return res.json();
      })
      .then(function (data) {
        if (!data.current) throw new Error("weather-empty");
        var dailyRain = data.daily && data.daily.precipitation_sum ? data.daily.precipitation_sum[0] : null;
        applyWeather(place, data.current, dailyRain, data.hourly);
      })
      .catch(function () {
        setStatus(t.weather.network, "error");
      });
  }

  function geocodeCity(name) {
    setStatus(fillTemplate(t.weather.searching, { city: name }), "loading");
    var url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(name) +
      "&count=1&language=" + (LANG === "ru" ? "ru" : "en") + "&format=json";

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("geocode-failed");
        return res.json();
      })
      .then(function (data) {
        if (!data.results || !data.results.length) {
          setStatus(t.weather.cityNotFound, "error");
          return;
        }
        var r = data.results[0];
        var label = r.name + (r.country ? ", " + r.country : "");
        fetchWeatherForCoords(r.latitude, r.longitude, label);
      })
      .catch(function () {
        setStatus(t.weather.network, "error");
      });
  }

  cityBtn.addEventListener("click", function () {
    var name = cityInput.value.trim();
    if (!name) {
      setStatus(t.weather.cityEmpty, "error");
      return;
    }
    geocodeCity(name);
  });

  cityInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      cityBtn.click();
    }
  });

  geoBtn.addEventListener("click", function () {
    if (!navigator.geolocation) {
      setStatus(t.weather.geoUnsupported, "error");
      return;
    }
    setStatus(t.weather.locating, "loading");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        fetchWeatherForCoords(pos.coords.latitude, pos.coords.longitude, LANG === "ru" ? "Ваше местоположение" : "Жойлашувингиз");
      },
      function () {
        setStatus(t.weather.geoDenied, "error");
      },
      { timeout: 10000 }
    );
  });
});
