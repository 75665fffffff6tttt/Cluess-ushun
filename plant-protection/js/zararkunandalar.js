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

  // ===== Zoom / Pan қатлами =====
  var base = fullVB.split(/\s+/).map(Number);   // [x,y,w,h] — тўлиқ кўриниш
  var vb = base.slice();
  var MINW = base[2] * 0.11;                     // энг катта zoom (~9x)
  function applyVB() { svg.setAttribute("viewBox", vb.join(" ")); }
  function xform() {
    var r = svg.getBoundingClientRect();
    var sc = Math.min(r.width / vb[2], r.height / vb[3]);
    return { r: r, sc: sc, ox: (r.width - vb[2] * sc) / 2, oy: (r.height - vb[3] * sc) / 2 };
  }
  function toWorld(cx, cy) { var t = xform(); return [vb[0] + (cx - t.r.left - t.ox) / t.sc, vb[1] + (cy - t.r.top - t.oy) / t.sc]; }
  function clampVB() {
    if (vb[2] >= base[2] || vb[3] >= base[3]) { vb[0] = base[0]; vb[1] = base[1]; vb[2] = base[2]; vb[3] = base[3]; return; }
    if (vb[0] < base[0]) vb[0] = base[0];
    if (vb[1] < base[1]) vb[1] = base[1];
    if (vb[0] + vb[2] > base[0] + base[2]) vb[0] = base[0] + base[2] - vb[2];
    if (vb[1] + vb[3] > base[1] + base[3]) vb[1] = base[1] + base[3] - vb[3];
  }
  // вилоят bbox'ини base нисбатини сақлаган ҳолда мослаш
  function fitRegion(bb) {
    var pad = 1.12;
    var s = Math.max(bb[2] / base[2], bb[3] / base[3]) * pad;
    var w = base[2] * s, h = base[3] * s;
    var cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function zoomAt(factor, cx, cy) {
    var world = toWorld(cx, cy), t = xform();
    var newW = vb[2] * factor;
    if (newW > base[2]) newW = base[2];
    if (newW < MINW) newW = MINW;
    var ratio = newW / vb[2], newH = vb[3] * ratio;
    var relX = cx - t.r.left, relY = cy - t.r.top;
    var nsc = Math.min(t.r.width / newW, t.r.height / newH);
    var ox = (t.r.width - newW * nsc) / 2, oy = (t.r.height - newH * nsc) / 2;
    vb[0] = world[0] - (relX - ox) / nsc; vb[1] = world[1] - (relY - oy) / nsc;
    vb[2] = newW; vb[3] = newH; clampVB(); applyVB();
  }
  function panPx(dx, dy) { var t = xform(); vb[0] -= dx / t.sc; vb[1] -= dy / t.sc; clampVB(); applyVB(); }
  function zoomBtn(f) { var r = svg.getBoundingClientRect(); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); }
  function tweenTo(tgt, ms) {
    var cur = vb.slice(), t0 = performance.now();
    function step(now) {
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      vb = cur.map(function (c, i) { return c + (tgt[i] - c) * e; });
      applyVB();
      if (k < 1) requestAnimationFrame(step); else clampVB(), applyVB();
    }
    requestAnimationFrame(step);
  }
  function resetView() { curReg = null; tweenTo(base.slice(), 450); paint(); updatePanel(); }

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
      document.getElementById("zkback").addEventListener("click", resetView);
    } else {
      var ca = countryAvg();
      pnl.innerHTML = '<div class="zkhint">' + T.hint + '</div>' +
        '<div class="zkst">' + T.regavg + ': <b>' + ca + '%</b> (' + band(ca).lab + ')</div>';
    }
  }

  // ===== ҳодисалар: drill + hover + pan + wheel + pinch =====
  function drill(i) {
    var rid = items[i].r;
    if (curReg !== rid) { curReg = rid; tweenTo(fitRegion(regById[rid].bbox), 500); paint(); updatePanel(); }
  }
  function showTip(e) {
    var t = e.target;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), it = items[i], v = val(it.r);
      var line = v == null ? T.nodata : ((LANG === "ru" ? "риск" : "хавф") + ": " + v + "% · " + band(v).lab);
      tip.innerHTML = "<b>" + dname(it) + "</b><br>" + rname(regById[it.r]) + "<br>" + line;
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
      if (pinchD > 0 && d > 0) {
        var mx = (ptrs[ids[0]].x + ptrs[ids[1]].x) / 2, my = (ptrs[ids[0]].y + ptrs[ids[1]].y) / 2;
        zoomAt(pinchD / d, mx, my);
      }
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
      var t = e.target;
      if (t && t.tagName === "path" && t.hasAttribute("data-i")) drill(+t.getAttribute("data-i"));
    }
    delete ptrs[e.pointerId];
    var n = Object.keys(ptrs).length;
    if (n < 2) pinchD = 0;
    if (n === 0) { panLast = null; downT = null; }
  }
  svg.addEventListener("pointerup", endPtr);
  svg.addEventListener("pointercancel", endPtr);
  svg.addEventListener("pointerleave", function () { tip.style.display = "none"; });
  svg.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.18 : 0.85, e.clientX, e.clientY); }, { passive: false });

  // zoom тугмалари
  var zc = document.createElement("div"); zc.className = "zoomctl";
  zc.innerHTML = '<button type="button" data-z="in" aria-label="Катталаштириш">+</button>' +
    '<button type="button" data-z="out" aria-label="Кичрайтириш">−</button>' +
    '<button type="button" data-z="reset" aria-label="Асл ҳолат">⟳</button>';
  map.appendChild(zc);
  zc.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var z = b.getAttribute("data-z");
    if (z === "in") zoomBtn(0.72); else if (z === "out") zoomBtn(1.38); else resetView();
  });

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
