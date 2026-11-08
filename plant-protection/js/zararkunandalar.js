/* Зараркунандалар хавф харитаси — ИНТЕРАКТИВ (анимациясиз).
 * Экин + зараркунанда танланади; вилоятни босганда ўша вилоят катталашиб,
 * туманлари кесимида кўрсатилади.
 * Геометрия: js/uz-districts.js (geoBoundaries ADM1/ADM2, CC-BY 4.0).
 * Хавф: js/uz-pest-forecast.js (2026 узоқ муддатли башорат, % экин майдонига нисбатан),
 * вилоят даражасида. */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var map = document.getElementById("uzmap");
  if (!stage || !map || !window.UZ_DISTRICTS || !window.UZ_CROPS) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";

  var T = LANG === "ru" ? {
    org1: "Республика Узбекистан", org2: "Система защиты и карантина растений",
    title: "РИСК РАСПРОСТРАНЕНИЯ ВРЕДИТЕЛЕЙ", avg: "Риск",
    note: "Источник: долгосрочный прогноз 2026 (% к площади посева), по областям.",
    hint: "👆 Нажмите на район — область увеличится и покажет свои районы.",
    back: "← Вся страна", districts: "районов", region: "Область",
    crop: "Культура", nodata: "нет данных", regavg: "ср. по областям"
  } : {
    org1: "Ўзбекистон Республикаси", org2: "Ўсимликларни ҳимоя қилиш ва карантин тизими",
    title: "ЗАРАРКУНАНДАЛАР ТАРҚАЛИШ ХАВФИ", avg: "Хавф",
    note: "Манба: 2026 узоқ муддатли башорат (% экин майдонига нисбатан), вилоятлар кесимида.",
    hint: "👆 Туманни босинг — ўша вилоят катталашиб, туманлари кўрсатилади.",
    back: "← Бутун мамлакат", districts: "туман", region: "Вилоят",
    crop: "Экин", nodata: "маълумот йўқ", regavg: "вилоятлар ўртача"
  };
  var BANDS = LANG === "ru" ? [
    { max: 20, col: "#27ae60", lab: "Низкий", rng: "0–20" }, { max: 40, col: "#f1c40f", lab: "Средний", rng: "21–40" },
    { max: 60, col: "#e67e22", lab: "Заметный", rng: "41–60" }, { max: 80, col: "#e74c3c", lab: "Высокий", rng: "61–80" },
    { max: 101, col: "#8e1b1b", lab: "Очень высокий", rng: "81–100" }
  ] : [
    { max: 20, col: "#27ae60", lab: "Паст", rng: "0–20" }, { max: 40, col: "#f1c40f", lab: "Ўртача", rng: "21–40" },
    { max: 60, col: "#e67e22", lab: "Сезиларли", rng: "41–60" }, { max: 80, col: "#e74c3c", lab: "Юқори", rng: "61–80" },
    { max: 101, col: "#8e1b1b", lab: "Жуда юқори", rng: "81–100" }
  ];
  var NODATA_COL = "#d6dde2";
  function band(v) { for (var i = 0; i < BANDS.length; i++) if (v <= BANDS[i].max) return BANDS[i]; return BANDS[4]; }

  var DATA = window.UZ_DISTRICTS, items = DATA.items, regions = DATA.regions;
  var CROPS = window.UZ_CROPS.crops;
  var regById = {}; regions.forEach(function (r) { regById[r.id] = r; });
  function rname(r) { return LANG === "ru" ? r.ru : r.c; }
  function dname(it) { return LANG === "ru" ? it.n : it.c; }

  var curCrop = 0, curPest = 0, curReg = null;
  function crop() { return CROPS[curCrop]; }
  function pestName(p) { var ps = crop().pests[p]; return LANG === "ru" ? ps.ru : ps.uz; }
  // хавф қиймати: вилоят даражасида (туман ўз вилояти қийматини олади)
  function val(rid) { var r = crop().risk[rid]; return (r && r[curPest] != null) ? r[curPest] : null; }

  // path марказини ҳисоблаш (label жойлаш учун)
  function centroid(d) {
    var nums = d.match(/-?\d+(?:\.\d+)?/g); if (!nums) return [0, 0];
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i + 1 < nums.length; i += 2) { sx += +nums[i]; sy += +nums[i + 1]; n++; }
    return [sx / n, sy / n];
  }
  items.forEach(function (it) { it.ctr = centroid(it.d); });

  // статик матнлар (баъзи элементлар бўлмаслиги мумкин)
  function setTxt(sel, v) { var el = stage.querySelector(sel); if (el) el.textContent = v; }
  setTxt(".hdr-t1", T.org1);
  setTxt(".hdr-t2", T.org2);
  setTxt(".title", T.title);
  setTxt(".note", T.note);

  // легенда
  document.getElementById("legend").innerHTML = BANDS.map(function (b) {
    return '<div class="lg"><i style="background:' + b.col + '"></i><b>' + b.lab + '</b><span>' + b.rng + '</span></div>';
  }).join("");

  // экин танлагич
  var cropBox = document.getElementById("cropsel");
  if (cropBox) {
    cropBox.innerHTML = CROPS.map(function (c, i) {
      return '<button class="cbtn' + (i === 0 ? ' on' : '') + '" data-c="' + i + '">' + (LANG === "ru" ? c.ru : c.uz) + '</button>';
    }).join("");
  }
  // зараркунанда танлагич
  var pestBox = document.getElementById("pestsel");
  function buildPests() {
    pestBox.innerHTML = crop().pests.map(function (ps, i) {
      return '<button class="pbtn' + (i === curPest ? ' on' : '') + '" data-p="' + i + '">' + (LANG === "ru" ? ps.ru : ps.uz) + '</button>';
    }).join("");
  }
  buildPests();

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

  function regionStats(rid) {
    var reg = regById[rid], n = 0;
    items.forEach(function (it) { if (it.r === rid) n++; });
    var r = crop().risk[rid];
    return { val: (r && r[curPest] != null) ? r[curPest] : null, n: n };
  }
  function countryAvg() {
    var s = 0, n = 0;
    for (var rid in crop().risk) {
      var r = crop().risk[rid];
      if (r && r[curPest] != null) { s += r[curPest]; n++; }
    }
    return n ? Math.round(s / n) : 0;
  }

  function paint() {
    for (var i = 0; i < items.length; i++) {
      var inReg = !curReg || items[i].r === curReg;
      var v = val(items[i].r);
      paths[i].setAttribute("fill", v == null ? NODATA_COL : band(v).col);
      paths[i].setAttribute("opacity", inReg ? "1" : "0.12");
      paths[i].setAttribute("stroke-width", curReg && items[i].r === curReg ? "0.9" : "0.5");
    }
    gl.innerHTML = "";
    if (curReg) {
      var reg = regById[curReg], fs = Math.max(reg.bbox[2], reg.bbox[3]) / 42;
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
      var reg = regById[curReg], st = regionStats(curReg);
      var bd = st.val != null ? band(st.val) : null;
      pnl.innerHTML = '<button id="zkback" class="zkback">' + T.back + '</button>' +
        '<div class="zkreg"><b>' + rname(reg) + '</b> · ' + st.n + ' ' + T.districts + '</div>' +
        '<div class="zkst">' + (st.val != null
          ? '<span style="color:' + bd.col + '">● </span>' + T.avg + ': <b>' + st.val + '%</b> (' + bd.lab + ')'
          : '<b>' + T.nodata + '</b>') + '</div>';
      document.getElementById("zkback").addEventListener("click", function () { curReg = null; tweenVB(fullVB, 500); paint(); updatePanel(); });
    } else {
      var ca = countryAvg();
      pnl.innerHTML = '<div class="zkhint">' + T.hint + '</div>' +
        '<div class="zkst">' + T.regavg + ': <b>' + ca + '%</b> (' + band(ca).lab + ')</div>';
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
      var i = +t.getAttribute("data-i"), it = items[i], v = val(it.r);
      var line = v == null ? T.nodata : ((LANG === "ru" ? "риск" : "хавф") + ": " + v + "% · " + band(v).lab);
      tip.innerHTML = "<b>" + dname(it) + "</b><br>" + rname(regById[it.r]) + "<br>" + line;
      tip.style.display = "block";
      var r = map.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left + 12) + "px"; tip.style.top = (e.clientY - r.top + 12) + "px";
    }
  });
  svg.addEventListener("mouseleave", function () { tip.style.display = "none"; });

  if (cropBox) cropBox.addEventListener("click", function (e) {
    var b = e.target.closest(".cbtn"); if (!b) return;
    curCrop = +b.getAttribute("data-c"); curPest = 0;
    [].forEach.call(cropBox.children, function (x) { x.classList.toggle("on", x === b); });
    buildPests(); paint(); updatePanel();
  });
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
