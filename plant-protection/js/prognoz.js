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
      cropThreats: {
        tomato_potato: [
          { name: "Кечки куйиш (фитофтороз)", cat: "fungal", href: "kasalliklar.html" },
          { name: "Колорадо қўнғизи", cat: "pest", href: "zararkunandalar.html" },
          { name: "Шира", cat: "pest", href: "zararkunandalar.html" }
        ],
        grain: [
          { name: "Занг касаллиги", cat: "fungal", href: "kasalliklar.html" },
          { name: "Чигиртка", cat: "locust", href: "zararkunandalar.html" },
          { name: "Кўп йиллик бегона ўтлар", cat: "weed", href: "begona-otlar.html" }
        ],
        fruit_trees: [
          { name: "Бактериал куйиш", cat: "fungal", href: "kasalliklar.html" },
          { name: "Ун-шудринг касаллиги", cat: "fungal", href: "kasalliklar.html" },
          { name: "Шира", cat: "pest", href: "zararkunandalar.html" }
        ],
        vegetables: [
          { name: "Ун-шудринг касаллиги", cat: "fungal", href: "kasalliklar.html" },
          { name: "Ўргимчаккана", cat: "mite", href: "zararkunandalar.html" },
          { name: "Шира", cat: "pest", href: "zararkunandalar.html" }
        ],
        grapes: [
          { name: "Ун-шудринг (оидиум)", cat: "fungal", href: "kasalliklar.html" },
          { name: "Ўргимчаккана", cat: "mite", href: "zararkunandalar.html" },
          { name: "Занг", cat: "fungal", href: "kasalliklar.html" }
        ]
      },
      recoTexts: {
        fungal: "Ўсимликлар орасидаги масофани сақланг, ортиқча суғоришдан қочинг, зарур бўлса мис асосидаги фунгицид билан профилактик ишлов беринг.",
        pest: "Феромон ва ёпишқоқ тузоқлар ўрнатинг, фойдали ҳашаротлар учун шароит яратинг, юқори даражада рухсат этилган инсектицид қўлланг.",
        mite: "Ҳаво намлигини ошириш чораларини кўринг, юқори даражада акарицид қўллашни режалаштиринг.",
        locust: "Ҳудудий мониторингни кучайтиринг, дала четларини назорат остига олинг, оммавий тарқалишда тезкор ишлов беринг.",
        weed: "Мулчалаш қилинг, ўз вақтида ўтоқ ишларини бажаринг, экинни зич жойлаштиришдан фойдаланинг."
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
      cropThreats: {
        tomato_potato: [
          { name: "Фитофтороз", cat: "fungal", href: "kasalliklar.ru.html" },
          { name: "Колорадский жук", cat: "pest", href: "zararkunandalar.ru.html" },
          { name: "Тля", cat: "pest", href: "zararkunandalar.ru.html" }
        ],
        grain: [
          { name: "Ржавчина", cat: "fungal", href: "kasalliklar.ru.html" },
          { name: "Саранча", cat: "locust", href: "zararkunandalar.ru.html" },
          { name: "Многолетние сорняки", cat: "weed", href: "begona-otlar.ru.html" }
        ],
        fruit_trees: [
          { name: "Бактериальный ожог", cat: "fungal", href: "kasalliklar.ru.html" },
          { name: "Мучнистая роса", cat: "fungal", href: "kasalliklar.ru.html" },
          { name: "Тля", cat: "pest", href: "zararkunandalar.ru.html" }
        ],
        vegetables: [
          { name: "Мучнистая роса", cat: "fungal", href: "kasalliklar.ru.html" },
          { name: "Паутинный клещ", cat: "mite", href: "zararkunandalar.ru.html" },
          { name: "Тля", cat: "pest", href: "zararkunandalar.ru.html" }
        ],
        grapes: [
          { name: "Мучнистая роса (оидиум)", cat: "fungal", href: "kasalliklar.ru.html" },
          { name: "Паутинный клещ", cat: "mite", href: "zararkunandalar.ru.html" },
          { name: "Ржавчина", cat: "fungal", href: "kasalliklar.ru.html" }
        ]
      },
      recoTexts: {
        fungal: "Соблюдайте расстояние между растениями, избегайте избыточного полива, при необходимости проведите профилактическую обработку медьсодержащим фунгицидом.",
        pest: "Установите феромонные и клеевые ловушки, создайте условия для полезных насекомых, при высоком уровне примените разрешённый инсектицид.",
        mite: "Примите меры по повышению влажности воздуха, при высоком уровне запланируйте применение акарицида.",
        locust: "Усильте мониторинг территории, возьмите под контроль края поля, при массовом распространении проведите срочную обработку.",
        weed: "Проведите мульчирование, своевременно выполняйте прополку, используйте более плотную посадку культуры."
      }
    }
  };

  var CATEGORY_ORDER = ["fungal", "pest", "mite", "locust", "weed"];
  var t = T[LANG];

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
    var threats = t.cropThreats[crop] || [];
    threats.forEach(function (item) {
      var level = levelOf(scores[item.cat]);
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="threat-name">' + item.name + "<small>" + t.categories[item.cat] + "</small></span>" +
        '<span style="display:flex; align-items:center; gap:10px;">' +
        '<span class="risk-level-label risk-level-' + level + '">' + t.levels[level] + "</span>" +
        '<a href="' + item.href + '">' + t.detailLink + "</a></span>";
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
        li.innerHTML = "<strong>" + t.categories[cat] + ":</strong> " + t.recoTexts[cat];
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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var inputs = {
      crop: document.getElementById("crop").value,
      season: document.getElementById("season").value,
      temp: document.getElementById("temp").value,
      humidity: document.getElementById("humidity").value,
      rain: document.getElementById("rain").value
    };
    var scores = computeScores(inputs);
    renderResults(inputs.crop, scores);
  });
});
