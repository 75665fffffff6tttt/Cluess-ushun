/* Зараркунандалар хавф харитаси — анимацияли, икки тилли, экранга мослашадиган.
 * ⚠️ Қийматлар НАМУНАВИЙ (демо). Реал мониторинг маълумоти билан алмаштириш мумкин. */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  if (!stage) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";

  var T = LANG === "ru" ? {
    date: "07–08.11.2026", avg: "Средний риск", cycle: "Циклический прогноз по основным вредителям", org1: "Республика Узбекистан", org2: "Система защиты и карантина растений", title: "РИСК РАСПРОСТРАНЕНИЯ ВРЕДИТЕЛЕЙ", note: "⚠️ ДЕМО-данные — не официальный мониторинг."
  } : {
    date: "07–08.11.2026", avg: "Ўртача хавф", cycle: "Асосий зараркунандалар бўйича айланма прогноз", org1: "Ўзбекистон Республикаси", org2: "Ўсимликларни ҳимоя қилиш ва карантин тизими", title: "ЗАРАРКУНАНДАЛАР ТАРҚАЛИШ ХАВФИ", note: "⚠️ НАМУНАВИЙ маълумот — расмий мониторинг эмас."
  };

  var REGIONS = [
    { id: "qq", uz: "Қорақалпоғистон", ru: "Каракалпакстан", x: 20, y: 26 },
    { id: "xo", uz: "Хоразм", ru: "Хорезм", x: 27, y: 44 },
    { id: "na", uz: "Навоий", ru: "Навои", x: 46, y: 38 },
    { id: "bu", uz: "Бухоро", ru: "Бухара", x: 42, y: 54 },
    { id: "sa", uz: "Самарқанд", ru: "Самарканд", x: 58, y: 52 },
    { id: "qa", uz: "Қашқадарё", ru: "Кашкадарья", x: 55, y: 66 },
    { id: "su", uz: "Сурхондарё", ru: "Сурхандарья", x: 63, y: 82 },
    { id: "ji", uz: "Жиззах", ru: "Джизак", x: 64, y: 42 },
    { id: "si", uz: "Сирдарё", ru: "Сырдарья", x: 71, y: 35 },
    { id: "to", uz: "Тошкент", ru: "Ташкент", x: 78, y: 27 },
    { id: "nm", uz: "Наманган", ru: "Наманган", x: 85, y: 40 },
    { id: "an", uz: "Андижон", ru: "Андижан", x: 92, y: 48 },
    { id: "fa", uz: "Фарғона", ru: "Фергана", x: 86, y: 55 }
  ];
  var PESTS = [
    { uz: "Ғўза тунлами (Helicoverpa armigera)", ru: "Хлопковая совка (Helicoverpa armigera)", v: { qq: 35, xo: 48, na: 40, bu: 62, sa: 70, qa: 78, su: 84, ji: 66, si: 72, to: 58, nm: 46, an: 52, fa: 50 } },
    { uz: "Ўргимчаккана (Tetranychus urticae)", ru: "Паутинный клещ (Tetranychus urticae)", v: { qq: 28, xo: 40, na: 55, bu: 68, sa: 60, qa: 72, su: 80, ji: 52, si: 58, to: 64, nm: 70, an: 76, fa: 74 } },
    { uz: "Ширалар (Aphididae)", ru: "Тли (Aphididae)", v: { qq: 44, xo: 50, na: 35, bu: 46, sa: 55, qa: 48, su: 52, ji: 60, si: 66, to: 72, nm: 58, an: 62, fa: 64 } },
    { uz: "Оқ пашша (Bemisia tabaci)", ru: "Белокрылка (Bemisia tabaci)", v: { qq: 30, xo: 38, na: 42, bu: 58, sa: 64, qa: 70, su: 76, ji: 50, si: 62, to: 68, nm: 54, an: 60, fa: 58 } },
    { uz: "Кузги тунлам (Agrotis segetum)", ru: "Озимая совка (Agrotis segetum)", v: { qq: 40, xo: 44, na: 48, bu: 52, sa: 58, qa: 60, su: 56, ji: 64, si: 54, to: 62, nm: 66, an: 68, fa: 70 } }
  ];
  var BANDS = LANG === "ru" ? [
    { max: 20, col: "#27ae60", lab: "Низкий", rng: "0–20" },
    { max: 40, col: "#f1c40f", lab: "Средний", rng: "21–40", dark: true },
    { max: 60, col: "#e67e22", lab: "Заметный", rng: "41–60" },
    { max: 80, col: "#e74c3c", lab: "Высокий", rng: "61–80" },
    { max: 101, col: "#8e1b1b", lab: "Очень высокий", rng: "81–100" }
  ] : [
    { max: 20, col: "#27ae60", lab: "Паст", rng: "0–20" },
    { max: 40, col: "#f1c40f", lab: "Ўртача", rng: "21–40", dark: true },
    { max: 60, col: "#e67e22", lab: "Сезиларли", rng: "41–60" },
    { max: 80, col: "#e74c3c", lab: "Юқори", rng: "61–80" },
    { max: 101, col: "#8e1b1b", lab: "Жуда юқори", rng: "81–100" }
  ];
  function band(v) { for (var i = 0; i < BANDS.length; i++) if (v <= BANDS[i].max) return BANDS[i]; return BANDS[4]; }
  function rnm(r) { return LANG === "ru" ? r.ru : r.uz; }

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

  // чиплар
  var chips = {}, cont = document.getElementById("chips");
  REGIONS.forEach(function (r) {
    var d = document.createElement("div");
    d.className = "chip"; d.style.left = r.x + "%"; d.style.top = r.y + "%";
    d.innerHTML = '<div class="nm">' + rnm(r) + '</div><div class="vl" id="v_' + r.id + '">—</div>';
    cont.appendChild(d); chips[r.id] = d;
  });
  // айланма барлар
  var cyc = document.getElementById("cyc");
  PESTS.forEach(function () { var b = document.createElement("div"); b.className = "bar"; b.style.height = "22px"; cyc.appendChild(b); });
  var bars = cyc.children;

  function avgOf(p) { var s = 0, n = 0; REGIONS.forEach(function (r) { s += p.v[r.id]; n++; }); return Math.round(s / n); }

  function render(pi) {
    var p = PESTS[pi];
    document.getElementById("pestName").textContent = LANG === "ru" ? p.ru : p.uz;
    REGIONS.forEach(function (r) {
      var v = p.v[r.id], bd = band(v), c = chips[r.id];
      c.style.background = bd.col;
      c.classList.toggle("dark", !!bd.dark);
      document.getElementById("v_" + r.id).textContent = v;
    });
    var avg = avgOf(p);
    document.getElementById("avgVal").textContent = avg + " (" + band(avg).lab + ")";
    document.getElementById("idxLbl").textContent = (pi + 1) + " / " + PESTS.length;
    for (var i = 0; i < bars.length; i++) {
      var av = avgOf(PESTS[i]);
      bars[i].style.height = (18 + av * 0.34) + "px";
      bars[i].style.background = i === pi ? band(av).col : "#b9ccbf";
    }
  }
  var pi = 0; render(0);
  window.renderPest = render;
  if (location.search.indexOf("capture") < 0) {
    setInterval(function () { pi = (pi + 1) % PESTS.length; render(pi); }, 2600);
  }

  // экранга мослаш (1080px саҳнани контейнер энига масштаблаш)
  var wrap = stage.parentElement;
  function fit() {
    var w = wrap.clientWidth, s = w / 1080;
    stage.style.transform = "scale(" + s + ")";
    wrap.style.height = (1080 * s) + "px";
  }
  fit();
  window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
