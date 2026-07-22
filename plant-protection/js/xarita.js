document.addEventListener("DOMContentLoaded", function () {
  var mapWrap = document.getElementById("region-map-wrap");
  if (!mapWrap || !window.REGIONS) return;

  var LANG = document.documentElement.lang.indexOf("ru") === 0 ? "ru" : "uz";
  var PROGNOZ_PAGE = LANG === "ru" ? "prognoz.ru.html" : "prognoz.html";

  var T = LANG === "ru" ? {
    empty: "Хотите узнать погоду и риск для конкретного региона? Нажмите на точку на карте.",
    capital: "Административный центр",
    tumans: "Районы",
    weatherBtn: "Посмотреть погоду и риск →",
    caption: "Схематичное изображение — не отражает точные географические границы и площади регионов."
  } : {
    empty: "Аниқ вилоят учун об-ҳаво ва хавфни билмоқчимисиз? Харитадаги нуқтани босинг.",
    capital: "Маркази",
    tumans: "Туманлар",
    weatherBtn: "Об-ҳаво ва хавфни кўриш →",
    caption: "Схематик тасвир — вилоятларнинг аниқ географик чегара ва майдонларини ифодаламайди."
  };

  var LAT_MIN = 36.5, LAT_MAX = 46.0, LON_MIN = 55.5, LON_MAX = 73.5;
  var W = 760, H = 460, PAD = 36;

  function px(lon) { return PAD + (lon - LON_MIN) / (LON_MAX - LON_MIN) * (W - 2 * PAD); }
  function py(lat) { return PAD + (LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * (H - 2 * PAD); }

  var LABEL_OFFSETS = {
    "toshkent-viloyati": { dx: -78, dy: 16 },
    "toshkent-shahri": { dx: 10, dy: -12 },
    "namangan": { dx: -78, dy: -6 },
    "andijon": { dx: 14, dy: 6 },
    "fargona": { dx: -70, dy: 20 }
  };

  var panel = document.getElementById("region-panel");
  var gmapFrame = document.getElementById("gmap-frame");

  function setGmap(lat, lon, zoom) {
    if (!gmapFrame) return;
    gmapFrame.src = "https://maps.google.com/maps?q=" + lat + "," + lon + "&z=" + zoom + "&output=embed";
  }

  function renderPanel(region) {
    var name = LANG === "ru" ? region.name_ru : region.name_uz;
    var capital = LANG === "ru" ? region.capital_ru : region.capital_uz;
    var tumans = LANG === "ru" ? region.tumans_ru : region.tumans_uz;
    var chips = tumans.map(function (t) { return '<span class="chip" style="cursor:default;">' + t + "</span>"; }).join("");
    panel.innerHTML =
      "<h2 style=\"margin:0 0 4px;\">" + name + "</h2>" +
      '<p style="margin:0 0 14px; color:var(--ink-600);"><strong>' + T.capital + ":</strong> " + capital + "</p>" +
      '<a class="btn btn-primary" style="margin-bottom:16px;" href="' + PROGNOZ_PAGE + "?city=" + encodeURIComponent(region.capital_search) + '">' + T.weatherBtn + "</a>" +
      '<h3 style="font-size:0.95rem; margin:0 0 8px;">' + T.tumans + " (" + tumans.length + ")</h3>" +
      '<div class="chip-row">' + chips + "</div>";
  }

  function clearPanel() {
    panel.innerHTML = '<p style="color:var(--ink-600); margin:0;">' + T.empty + "</p>";
  }

  clearPanel();

  var svgParts = [];
  svgParts.push(
    '<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="map">'
  );
  svgParts.push(
    '<rect x="6" y="6" width="' + (W - 12) + '" height="' + (H - 12) + '" rx="18" ' +
    'style="fill:var(--green-100); stroke:var(--border); stroke-dasharray:6 6" stroke-width="1.5"></rect>'
  );

  window.REGIONS.forEach(function (region) {
    var x = px(region.lon), y = py(region.lat);
    var off = LABEL_OFFSETS[region.key] || { dx: 12, dy: 4 };
    var name = LANG === "ru" ? region.capital_ru : region.capital_uz;
    svgParts.push(
      '<g class="region-node" data-key="' + region.key + '" style="cursor:pointer;">' +
      '<circle cx="' + x + '" cy="' + y + '" r="8" class="region-dot" style="fill:var(--green-700); stroke:#fff; stroke-width:2"></circle>' +
      '<text x="' + (x + off.dx) + '" y="' + (y + off.dy) + '" font-size="12" font-weight="600" style="fill:var(--ink-900)">' + name + "</text>" +
      "</g>"
    );
  });

  svgParts.push("</svg>");
  mapWrap.innerHTML = svgParts.join("");

  mapWrap.querySelectorAll(".region-node").forEach(function (node) {
    node.addEventListener("click", function () {
      mapWrap.querySelectorAll(".region-dot").forEach(function (dot) {
        dot.style.fill = "var(--green-700)";
        dot.setAttribute("r", "8");
      });
      var dot = node.querySelector(".region-dot");
      dot.style.fill = "var(--red-600)";
      dot.setAttribute("r", "10");

      var key = node.getAttribute("data-key");
      var region = window.REGIONS.filter(function (r) { return r.key === key; })[0];
      if (region) {
        renderPanel(region);
        setGmap(region.lat, region.lon, 9);
      }
    });
  });

  var caption = document.getElementById("map-caption");
  if (caption) caption.textContent = T.caption;

  // Default view: whole Uzbekistan
  setGmap(41.3, 64.6, 6);
});
