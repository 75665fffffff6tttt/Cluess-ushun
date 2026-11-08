/* Зараркунандалар хавф харитаси — ИНТЕРАКТИВ (анимациясиз).
 * Вилоят туманини босганда — ўша вилоят катталашиб, туманлари кесимида кўрсатилади.
 * Туман чегаралари: js/uz-districts.js (geoBoundaries ADM1/ADM2, CC-BY 4.0).
 * Хавф қийматлари: 2026 узоқ муддатли башорат (ғўза зараркунандалари, % экин майдонига нисбатан),
 * вилоят даражасида. */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var map = document.getElementById("uzmap");
  if (!stage || !map || !window.UZ_DISTRICTS) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";

  var T = LANG === "ru" ? {
    org1: "Республика Узбекистан", org2: "Система защиты и карантина растений",
    title: "РИСК РАСПРОСТРАНЕНИЯ ВРЕДИТЕЛЕЙ", avg: "Риск",
    note: "Источник: долгосрочный прогноз 2026 (вредители хлопчатника, % к площади посева), по областям.",
    hint: "👆 Нажмите на район — область увеличится и покажет свои районы.",
    back: "← Вся страна", districts: "районов", worst: "Макс. риск", region: "Область"
  } : {
    org1: "Ўзбекистон Республикаси", org2: "Ўсимликларни ҳимоя қилиш ва карантин тизими",
    title: "ЗАРАРКУНАНДАЛАР ТАРҚАЛИШ ХАВФИ", avg: "Хавф",
    note: "Манба: 2026 узоқ муддатли башорат (ғўза зараркунандалари, % экин майдонига нисбатан), вилоятлар кесимида.",
    hint: "👆 Туманни босинг — ўша вилоят катталашиб, туманлари кўрсатилади.",
    back: "← Бутун мамлакат", districts: "туман", worst: "Энг юқори", region: "Вилоят"
  };
  var PESTS = LANG === "ru" ? [
    "Хлопковая совка", "Паутинный клещ", "Тли", "Белокрылка", "Озимая совка"
  ] : [
    "Ғўза тунлами", "Ўргимчаккана", "Ширалар", "Оқ пашша", "Кузги тунлам"
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
  // Реал 2026 башорат — хавф вилоят даражасида (ғўза зараркунандалари, % майдон)
  function demoVal(i, p) { var r = regById[items[i].r]; return (r && r.risk) ? r.risk[p] : 0; }

  var DATA = window.UZ_DISTRICTS, items = DATA.items, regions = DATA.regions;
  var regById = {}; regions.forEach(function (r) { regById[r.id] = r; });
  function rname(r) { return LANG === "ru" ? r.ru : r.c; }
  function dname(it) { return LANG === "ru" ? it.n : it.c; }

  // path марказини ҳисоблаш (label жойлаш учун)
  function centroid(d) {
    var nums = d.match(/-?\d+(?:\.\d+)?/g); if (!nums) return [0, 0];
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i + 1 < nums.length; i += 2) { sx += +nums[i]; sy += +nums[i + 1]; n++; }
    return [sx / n, sy / n];
  }
  items.forEach(function (it) { it.ctr = centroid(it.d); });

  // статик матнлар
  stage.querySelector(".hdr-t1").textContent = T.org1;
  stage.querySelector(".hdr-t2").textContent = T.org2;
  stage.querySelector(".title").textContent = T.title;
  stage.querySelector(".note").textContent = T.note;

  // легенда
  document.getElementById("legend").innerHTML = BANDS.map(function (b) {
    return '<div class="lg"><i style="background:' + b.col + '"></i><b>' + b.lab + '</b><span>' + b.rng + '</span></div>';
  }).join("");

  // зараркунанда танлагич
  var pestBox = document.getElementById("pestsel");
  pestBox.innerHTML = PESTS.map(function (nm, i) {
    return '<button class="pbtn' + (i === 0 ? ' on' : '') + '" data-p="' + i + '">' + nm + '</button>';
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

  var tip = document.getElementById("zktip");
  var curPest = 0, curReg = null;

  function regionStats(rid, p) {
    var reg = regById[rid], n = 0;
    items.forEach(function (it) { if (it.r === rid) n++; });
    var has = reg && reg.risk && reg.risk[p] != null;
    return { val: has ? reg.risk[p] : null, n: n };
  }
  function countryAvg(p) {
    var s = 0, n = 0;
    regions.forEach(function (r) { if (r.risk && r.risk[p] != null) { s += r.risk[p]; n++; } });
    return n ? Math.round(s / n) : 0;
  }

  function paint() {
    for (var i = 0; i < items.length; i++) {
      var inReg = !curReg || items[i].r === curReg;
      paths[i].setAttribute("fill", band(demoVal(i, curPest)).col);
      paths[i].setAttribute("opacity", inReg ? "1" : "0.12");
      paths[i].setAttribute("stroke-width", curReg && items[i].r === curReg ? "0.9" : "0.5");
    }
    // лейблар
    gl.innerHTML = "";
    if (curReg) {
      var reg = regById[curReg], fs = Math.max(reg.bbox[2], reg.bbox[3]) / 26;
      items.forEach(function (it, i) {
        if (it.r !== curReg) return;
        var t = document.createElementNS(ns, "text");
        t.setAttribute("x", it.ctr[0]); t.setAttribute("y", it.ctr[1]);
        t.setAttribute("font-size", fs); t.setAttribute("text-anchor", "middle");
        t.setAttribute("fill", "#12240f"); t.setAttribute("stroke", "#fff"); t.setAttribute("stroke-width", fs * 0.14);
        t.setAttribute("paint-order", "stroke"); t.setAttribute("style", "font-weight:700;pointer-events:none");
        t.textContent = dname(it);
        gl.appendChild(t);
      });
    }
  }

  function tweenVB(target, ms) {
    var cur = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    var tgt = target.split(/\s+/).map(Number), t0 = performance.now();
    function step(now) {
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      var v = cur.map(function (c, idx) { return c + (tgt[idx] - c) * e; });
      svg.setAttribute("viewBox", v.join(" "));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updatePanel() {
    var pnl = document.getElementById("zkpanel");
    if (curReg) {
      var reg = regById[curReg], st = regionStats(curReg, curPest);
      var bd = st.val != null ? band(st.val) : null;
      var na = LANG === "ru" ? "нет данных" : "маълумот йўқ";
      pnl.innerHTML = '<button id="zkback" class="zkback">' + T.back + '</button>' +
        '<div class="zkreg"><b>' + rname(reg) + '</b> · ' + st.n + ' ' + T.districts + '</div>' +
        '<div class="zkst">' + (st.val != null
          ? '<span style="color:' + bd.col + '">● </span>' + T.avg + ': <b>' + st.val + '%</b> (' + bd.lab + ')'
          : '<b>' + na + '</b>') + '</div>';
      document.getElementById("zkback").addEventListener("click", function () { curReg = null; tweenVB(fullVB, 500); paint(); updatePanel(); });
    } else {
      var ca = countryAvg(curPest), rlab = LANG === "ru" ? "ср. по областям" : "вилоятлар ўртача";
      pnl.innerHTML = '<div class="zkhint">' + T.hint + '</div>' +
        '<div class="zkst">' + rlab + ': <b>' + ca + '%</b> (' + band(ca).lab + ')</div>';
    }
  }

  // ҳодисалар
  svg.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), rid = items[i].r;
      if (curReg !== rid) {
        curReg = rid;
        var bb = regById[rid].bbox, pad = Math.max(bb[2], bb[3]) * 0.08;
        tweenVB((bb[0] - pad) + " " + (bb[1] - pad) + " " + (bb[2] + pad * 2) + " " + (bb[3] + pad * 2), 500);
        paint(); updatePanel();
      }
    }
  });
  svg.addEventListener("mousemove", function (e) {
    var t = e.target;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), it = items[i], v = demoVal(i, curPest);
      tip.innerHTML = "<b>" + dname(it) + "</b><br>" + rname(regById[it.r]) + "<br>" + (LANG === "ru" ? "риск" : "хавф") + ": " + v + "% · " + band(v).lab;
      tip.style.display = "block";
      var r = map.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left + 12) + "px"; tip.style.top = (e.clientY - r.top + 12) + "px";
    }
  });
  svg.addEventListener("mouseleave", function () { tip.style.display = "none"; });
  pestBox.addEventListener("click", function (e) {
    var b = e.target.closest(".pbtn"); if (!b) return;
    curPest = +b.getAttribute("data-p");
    [].forEach.call(pestBox.children, function (x) { x.classList.toggle("on", x === b); });
    paint(); updatePanel();
  });

  paint(); updatePanel();

  // экранга мослаш
  var wrap = stage.parentElement;
  function fit() { var w = wrap.clientWidth, s = w / 1080; stage.style.transform = "scale(" + s + ")"; wrap.style.height = (1080 * s) + "px"; }
  fit(); window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
