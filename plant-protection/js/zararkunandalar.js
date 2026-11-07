/* Зараркунандалар хавф харитаси — ТУМАН даражасида (199 туман), анимацияли, икки тилли.
 * Харита маълумоти: js/uz-districts.js (geoBoundaries ADM2, CC-BY 4.0).
 * ⚠️ Хавф қийматлари НАМУНАВИЙ (демо) — расмий мониторинг эмас. */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var map = document.getElementById("uzmap");
  if (!stage || !map || !window.UZ_DISTRICTS) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";

  var T = LANG === "ru" ? {
    date: "07–08.11.2026", avg: "Средний риск", cycle: "Циклический прогноз по основным вредителям",
    org1: "Республика Узбекистан", org2: "Система защиты и карантина растений",
    title: "РИСК РАСПРОСТРАНЕНИЯ ВРЕДИТЕЛЕЙ", note: "⚠️ ДЕМО-данные по районам — не официальный мониторинг.",
    units: "районов"
  } : {
    date: "07–08.11.2026", avg: "Ўртача хавф", cycle: "Асосий зараркунандалар бўйича айланма прогноз",
    org1: "Ўзбекистон Республикаси", org2: "Ўсимликларни ҳимоя қилиш ва карантин тизими",
    title: "ЗАРАРКУНАНДАЛАР ТАРҚАЛИШ ХАВФИ", note: "⚠️ НАМУНАВИЙ (туманлар) маълумот — расмий мониторинг эмас.",
    units: "туман"
  };
  var PESTS = LANG === "ru" ? [
    "Хлопковая совка (Helicoverpa armigera)", "Паутинный клещ (Tetranychus urticae)",
    "Тли (Aphididae)", "Белокрылка (Bemisia tabaci)", "Озимая совка (Agrotis segetum)"
  ] : [
    "Ғўза тунлами (Helicoverpa armigera)", "Ўргимчаккана (Tetranychus urticae)",
    "Ширалар (Aphididae)", "Оқ пашша (Bemisia tabaci)", "Кузги тунлам (Agrotis segetum)"
  ];
  var BANDS = LANG === "ru" ? [
    { max: 20, col: "#27ae60", lab: "Низкий", rng: "0–20" }, { max: 40, col: "#f1c40f", lab: "Средний", rng: "21–40" },
    { max: 60, col: "#e67e22", lab: "Заметный", rng: "41–60" }, { max: 80, col: "#e74c3c", lab: "Высокий", rng: "61–80" },
    { max: 101, col: "#8e1b1b", lab: "Очень высокий", rng: "81–100" }
  ] : [
    { max: 20, col: "#27ae60", lab: "Паст", rng: "0–20" }, { max: 40, col: "#f1c40f", lab: "Ўртача", rng: "21–40" },
    { max: 60, col: "#e67e22", lab: "Сезиларли", rng: "41–60" }, { max: 80, col: "#e74c3c", lab: "Юқори", rng: "61–80" },
    { max: 101, col: "#8e1b1b", lab: "Жуда юқори", rng: "81–100" }
  ];
  function band(v) { for (var i = 0; i < BANDS.length; i++) if (v <= BANDS[i].max) return BANDS[i]; return BANDS[4]; }
  // НАМУНАВИЙ хавф — детерминистик (туман индекси × зараркунанда)
  function demoVal(i, p) { var x = Math.sin((i + 1) * 12.9898 + (p + 1) * 78.233) * 43758.5453; x = x - Math.floor(x); return 18 + Math.floor(x * 78); }

  // статик матнлар
  stage.querySelector(".hdr-t1").textContent = T.org1;
  stage.querySelector(".hdr-t2").textContent = T.org2;
  stage.querySelector(".title").textContent = T.title;
  stage.querySelector("#dateLbl").textContent = T.date;
  stage.querySelector(".note").textContent = T.note;
  stage.querySelector(".foot-lbls span").textContent = T.cycle;
  stage.querySelector(".avgchip").firstChild.textContent = T.avg + ": ";

  // легенда
  document.getElementById("legend").innerHTML = BANDS.map(function (b) {
    return '<div class="lg"><i style="background:' + b.col + '"></i><b>' + b.lab + '</b><span>' + b.rng + '</span></div>';
  }).join("");

  // харита SVG — 199 туман
  var DATA = window.UZ_DISTRICTS, items = DATA.items;
  var ns = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", DATA.viewBox);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
  var paths = [];
  items.forEach(function (it, i) {
    var pth = document.createElementNS(ns, "path");
    pth.setAttribute("d", it.d);
    pth.setAttribute("stroke", "#ffffff");
    pth.setAttribute("stroke-width", "0.6");
    pth.setAttribute("data-i", i);
    svg.appendChild(pth); paths.push(pth);
  });
  map.appendChild(svg);

  // тултип
  var tip = document.getElementById("zktip");
  svg.addEventListener("mousemove", function (e) {
    var t = e.target;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), it = items[i], v = demoVal(i, cur);
      tip.innerHTML = "<b>" + (LANG === "ru" ? it.n : it.c) + "</b><br>" + (LANG === "ru" ? "риск" : "хавф") + ": " + v + " · " + band(v).lab;
      tip.style.display = "block";
      var r = map.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left + 12) + "px";
      tip.style.top = (e.clientY - r.top + 12) + "px";
    }
  });
  svg.addEventListener("mouseleave", function () { tip.style.display = "none"; });

  // айланма барлар
  var cyc = document.getElementById("cyc");
  PESTS.forEach(function () { var b = document.createElement("div"); b.className = "bar"; b.style.height = "22px"; cyc.appendChild(b); });
  var bars = cyc.children;
  function avgOf(p) { var s = 0; for (var i = 0; i < items.length; i++) s += demoVal(i, p); return Math.round(s / items.length); }

  var cur = 0;
  function render(p) {
    cur = p;
    stage.querySelector("#pestName").textContent = PESTS[p];
    for (var i = 0; i < items.length; i++) paths[i].setAttribute("fill", band(demoVal(i, p)).col);
    var avg = avgOf(p);
    stage.querySelector("#avgVal").textContent = avg + " (" + band(avg).lab + ")";
    stage.querySelector("#idxLbl").textContent = (p + 1) + " / " + PESTS.length + " · " + items.length + " " + T.units;
    for (var k = 0; k < bars.length; k++) {
      var av = avgOf(k);
      bars[k].style.height = (18 + av * 0.34) + "px";
      bars[k].style.background = k === p ? band(av).col : "#b9ccbf";
    }
  }
  render(0);
  if (location.search.indexOf("capture") < 0) {
    setInterval(function () { render((cur + 1) % PESTS.length); }, 2600);
  }
  window.renderPest = render;

  // экранга мослаш
  var wrap = stage.parentElement;
  function fit() { var w = wrap.clientWidth, s = w / 1080; stage.style.transform = "scale(" + s + ")"; wrap.style.height = (1080 * s) + "px"; }
  fit(); window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
