/* Ҳаво харорати харитаси — туманлар кесимида, ЖОНЛИ (Open-Meteo).
 * Геометрия: js/uz-districts.js (geoBoundaries ADM1/ADM2, CC-BY 4.0).
 * Координаталар: js/uz-geo.js (туман марказлари, geoBoundaries).
 * Ҳарорат: Open-Meteo API (api.open-meteo.com) — бепул, калитсиз. */
(function () {
  "use strict";
  var stage = document.getElementById("stage");
  var map = document.getElementById("uzmap");
  if (!stage || !map || !window.UZ_DISTRICTS || !window.UZ_GEO) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";

  var T = LANG === "ru" ? {
    title: "ТЕМПЕРАТУРА ВОЗДУХА", hint: "👆 Нажмите на район — область увеличится и покажет свои районы.",
    back: "← Вся страна", districts: "районов", region: "Область", avg: "Средняя",
    label: "Показатель", nodata: "нет данных", regavg: "в среднем",
    loading: "⏳ Загрузка данных…", err: "⚠️ Не удалось загрузить данные. Обновите страницу.",
    updated: "Обновлено", src: "Источник: Open-Meteo",
    modes: [["now", "Сейчас"], ["tmax", "Днём макс."], ["tmin", "Ночью мин."]]
  } : {
    title: "ҲАВО ҲАРОРАТИ", hint: "👆 Туманни босинг — ўша вилоят катталашиб, туманлари кўрсатилади.",
    back: "← Бутун мамлакат", districts: "туман", region: "Вилоят", avg: "Ўртача",
    label: "Кўрсаткич", nodata: "маълумот йўқ", regavg: "ўртача",
    loading: "⏳ Маълумот юкланмоқда…", err: "⚠️ Маълумот юкланмади. Саҳифани янгиланг.",
    updated: "Янгиланди", src: "Манба: Open-Meteo",
    modes: [["now", "Ҳозир"], ["tmax", "Кундузи макс."], ["tmin", "Кечаси мин."]]
  };

  // ҳарорат → ранг (континуал градиент, °C)
  var STOPS = [[-15, [49, 54, 149]], [-5, [69, 117, 180]], [0, [116, 173, 209]], [5, [171, 217, 233]],
  [10, [224, 243, 248]], [15, [255, 255, 191]], [20, [254, 224, 144]], [25, [253, 174, 97]],
  [30, [244, 109, 67]], [35, [215, 48, 39]], [42, [165, 0, 38]]];
  var NODATA_COL = "#d6dde2";
  function lerp(a, b, f) { return Math.round(a + (b - a) * f); }
  function rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
  function colorT(t) {
    if (t == null || isNaN(t)) return NODATA_COL;
    if (t <= STOPS[0][0]) return rgb(STOPS[0][1]);
    if (t >= STOPS[STOPS.length - 1][0]) return rgb(STOPS[STOPS.length - 1][1]);
    for (var i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], f = (t - a[0]) / (b[0] - a[0]);
        return rgb([lerp(a[1][0], b[1][0], f), lerp(a[1][1], b[1][1], f), lerp(a[1][2], b[1][2], f)]);
      }
    }
    return NODATA_COL;
  }
  function fmtT(t) { return (t == null || isNaN(t)) ? "—" : (t > 0 ? "+" : "") + Math.round(t) + "°"; }

  var DATA = window.UZ_DISTRICTS, items = DATA.items, regions = DATA.regions, GEO = window.UZ_GEO;
  var regById = {}; regions.forEach(function (r) { regById[r.id] = r; });
  function rname(r) { return LANG === "ru" ? r.ru : r.c; }
  function dname(it) { return LANG === "ru" ? it.n : it.c; }

  var tempsAll = new Array(items.length);  // {now,tmax,tmin}
  var mode = "now", curReg = null, updatedAt = null, loadState = "loading";
  function curT(i) { var t = tempsAll[i]; return t ? t[mode] : null; }

  function centroid(d) {
    var nums = d.match(/-?\d+(?:\.\d+)?/g); if (!nums) return [0, 0];
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i + 1 < nums.length; i += 2) { sx += +nums[i]; sy += +nums[i + 1]; n++; }
    return [sx / n, sy / n];
  }
  items.forEach(function (it) { it.ctr = centroid(it.d); });

  stage.querySelector(".title") && (stage.querySelector(".title").textContent = T.title);

  // режим танлагич
  var modeBox = document.getElementById("modesel");
  if (modeBox) modeBox.innerHTML = T.modes.map(function (m, i) {
    return '<button class="pbtn' + (i === 0 ? ' on' : '') + '" data-m="' + m[0] + '">' + m[1] + '</button>';
  }).join("");

  // легенда — градиент банд
  (function () {
    var lg = document.getElementById("legend"); if (!lg) return;
    var grad = STOPS.map(function (s) {
      var pct = ((s[0] - STOPS[0][0]) / (STOPS[STOPS.length - 1][0] - STOPS[0][0]) * 100).toFixed(1);
      return rgb(s[1]) + " " + pct + "%";
    }).join(",");
    var ticks = [-15, -5, 5, 15, 25, 35, 42];
    lg.innerHTML = '<div class="tempbar"><div class="tbar" style="background:linear-gradient(90deg,' + grad + ')"></div>' +
      '<div class="tticks">' + ticks.map(function (t) { return '<span>' + (t > 0 ? "+" : "") + t + '°</span>'; }).join("") + '</div></div>';
  })();

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

  // ===== Zoom / Pan =====
  var base = fullVB.split(/\s+/).map(Number), vb = base.slice(), MINW = base[2] * 0.045;
  function applyVB() { svg.setAttribute("viewBox", vb.join(" ")); }
  function xform() { var r = svg.getBoundingClientRect(); var sc = Math.min(r.width / vb[2], r.height / vb[3]); return { r: r, sc: sc, ox: (r.width - vb[2] * sc) / 2, oy: (r.height - vb[3] * sc) / 2 }; }
  function toWorld(cx, cy) { var t = xform(); return [vb[0] + (cx - t.r.left - t.ox) / t.sc, vb[1] + (cy - t.r.top - t.oy) / t.sc]; }
  function clampVB() {
    if (vb[2] >= base[2] || vb[3] >= base[3]) { vb[0] = base[0]; vb[1] = base[1]; vb[2] = base[2]; vb[3] = base[3]; return; }
    if (vb[0] < base[0]) vb[0] = base[0]; if (vb[1] < base[1]) vb[1] = base[1];
    if (vb[0] + vb[2] > base[0] + base[2]) vb[0] = base[0] + base[2] - vb[2];
    if (vb[1] + vb[3] > base[1] + base[3]) vb[1] = base[1] + base[3] - vb[3];
  }
  function fitRegion(bb) { var s = Math.max(bb[2] / base[2], bb[3] / base[3]) * 1.12, w = base[2] * s, h = base[3] * s, cx = bb[0] + bb[2] / 2, cy = bb[1] + bb[3] / 2; return [cx - w / 2, cy - h / 2, w, h]; }
  function zoomAt(factor, cx, cy) {
    var world = toWorld(cx, cy), t = xform(), newW = vb[2] * factor;
    if (newW > base[2]) newW = base[2]; if (newW < MINW) newW = MINW;
    var newH = vb[3] * (newW / vb[2]), relX = cx - t.r.left, relY = cy - t.r.top;
    var nsc = Math.min(t.r.width / newW, t.r.height / newH), ox = (t.r.width - newW * nsc) / 2, oy = (t.r.height - newH * nsc) / 2;
    vb[0] = world[0] - (relX - ox) / nsc; vb[1] = world[1] - (relY - oy) / nsc; vb[2] = newW; vb[3] = newH; clampVB(); applyVB();
  }
  function panPx(dx, dy) { var t = xform(); vb[0] -= dx / t.sc; vb[1] -= dy / t.sc; clampVB(); applyVB(); }
  function zoomBtn(factor) { var cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2, newW = vb[2] * factor; if (newW > base[2]) newW = base[2]; if (newW < MINW) newW = MINW; var newH = vb[3] * (newW / vb[2]); vb[0] = cx - newW / 2; vb[1] = cy - newH / 2; vb[2] = newW; vb[3] = newH; clampVB(); applyVB(); }
  function tweenTo(tgt, ms) {
    var cur = vb.slice(), t0 = performance.now();
    function step(now) {
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      vb = cur.map(function (c, i) { return c + (tgt[i] - c) * e; }); applyVB();
      if (k < 1) requestAnimationFrame(step); else { clampVB(); applyVB(); }
    }
    requestAnimationFrame(step);
  }
  function resetView() { curReg = null; tweenTo(base.slice(), 450); paint(); updatePanel(); }

  function paint() {
    for (var i = 0; i < items.length; i++) {
      var inReg = !curReg || items[i].r === curReg;
      paths[i].setAttribute("fill", colorT(curT(i)));
      paths[i].setAttribute("opacity", inReg ? "1" : "0.12");
      paths[i].setAttribute("stroke-width", curReg && items[i].r === curReg ? "0.9" : "0.5");
    }
    gl.innerHTML = "";
    if (curReg) {
      var reg = regById[curReg], fs = Math.max(reg.bbox[2], reg.bbox[3]) / 42;
      items.forEach(function (it, i) {
        if (it.r !== curReg) return;
        var t = document.createElementNS(ns, "text");
        t.setAttribute("x", it.ctr[0]); t.setAttribute("y", it.ctr[1]); t.setAttribute("font-size", fs);
        t.setAttribute("text-anchor", "middle"); t.setAttribute("fill", "#12240f"); t.setAttribute("stroke", "#fff");
        t.setAttribute("stroke-width", fs * 0.14); t.setAttribute("paint-order", "stroke");
        t.setAttribute("style", "font-weight:700;pointer-events:none");
        var tv = curT(i);
        t.textContent = dname(it) + (tv != null && !isNaN(tv) ? " " + fmtT(tv) : "");
        gl.appendChild(t);
      });
    }
  }

  function regionAvg(rid) {
    var s = 0, n = 0;
    items.forEach(function (it, i) { if (it.r === rid) { var v = curT(i); if (v != null && !isNaN(v)) { s += v; n++; } } });
    return n ? s / n : null;
  }
  function countryAvg() {
    var s = 0, n = 0;
    for (var i = 0; i < items.length; i++) { var v = curT(i); if (v != null && !isNaN(v)) { s += v; n++; } }
    return n ? s / n : null;
  }

  function setStatus() {
    var el = document.getElementById("status"); if (!el) return;
    if (loadState === "loading") { el.textContent = T.loading; return; }
    if (loadState === "error") { el.textContent = T.err; return; }
    var u = updatedAt ? (" · " + T.updated + ": " + updatedAt.toLocaleTimeString(LANG === "ru" ? "ru-RU" : "ru-RU", { hour: "2-digit", minute: "2-digit" })) : "";
    el.textContent = T.src + u;
  }

  function updatePanel() {
    var pnl = document.getElementById("zkpanel"); if (!pnl) return;
    if (curReg) {
      var reg = regById[curReg], av = regionAvg(curReg), n = 0;
      items.forEach(function (it) { if (it.r === curReg) n++; });
      pnl.innerHTML = '<button id="zkback" class="zkback">' + T.back + '</button>' +
        '<div class="zkreg"><b>' + rname(reg) + '</b> · ' + n + ' ' + T.districts + '</div>' +
        '<div class="zkst">' + (av != null ? '<span style="color:' + colorT(av) + '">● </span>' + T.avg + ': <b>' + fmtT(av) + 'C</b>' : '<b>' + T.nodata + '</b>') + '</div>';
      document.getElementById("zkback").addEventListener("click", resetView);
    } else {
      var ca = countryAvg();
      pnl.innerHTML = '<div class="zkhint">' + T.hint + '</div>' +
        '<div class="zkst">' + (ca != null ? T.regavg + ': <b>' + fmtT(ca) + 'C</b>' : (loadState === "loading" ? T.loading : T.nodata)) + '</div>';
    }
  }

  // ===== ҳодисалар =====
  function drill(i) { var rid = items[i].r; if (curReg !== rid) { curReg = rid; tweenTo(fitRegion(regById[rid].bbox), 500); paint(); updatePanel(); } }
  function showTip(e) {
    var t = e.target;
    if (t && t.tagName === "path" && t.hasAttribute("data-i")) {
      var i = +t.getAttribute("data-i"), it = items[i], v = curT(i);
      tip.innerHTML = "<b>" + dname(it) + "</b><br>" + rname(regById[it.r]) + "<br>" + (LANG === "ru" ? "темп." : "ҳарорат") + ": " + fmtT(v) + "C";
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
      if (pinchD > 0 && d > 0) { var mx = (ptrs[ids[0]].x + ptrs[ids[1]].x) / 2, my = (ptrs[ids[0]].y + ptrs[ids[1]].y) / 2; zoomAt(pinchD / d, mx, my); }
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
    if (downT && moved <= 4) { var t = e.target; if (t && t.tagName === "path" && t.hasAttribute("data-i")) drill(+t.getAttribute("data-i")); }
    delete ptrs[e.pointerId]; var n = Object.keys(ptrs).length;
    if (n < 2) pinchD = 0; if (n === 0) { panLast = null; downT = null; }
  }
  svg.addEventListener("pointerup", endPtr);
  svg.addEventListener("pointercancel", endPtr);
  svg.addEventListener("pointerleave", function () { tip.style.display = "none"; });
  svg.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.18 : 0.85, e.clientX, e.clientY); }, { passive: false });

  // zoom тугмалари
  var zc = document.createElement("div"); zc.className = "zoomctl";
  zc.innerHTML = '<button type="button" data-z="in" aria-label="+">+</button>' +
    '<button type="button" data-z="out" aria-label="−">−</button>' +
    '<button type="button" data-z="reset" aria-label="⟳">⟳</button>';
  map.appendChild(zc);
  zc.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var z = b.getAttribute("data-z"); if (z === "in") zoomBtn(0.72); else if (z === "out") zoomBtn(1.38); else resetView(); });

  if (modeBox) modeBox.addEventListener("click", function (e) {
    var b = e.target.closest(".pbtn"); if (!b) return;
    mode = b.getAttribute("data-m");
    [].forEach.call(modeBox.children, function (x) { x.classList.toggle("on", x === b); });
    paint(); updatePanel();
  });

  // ===== маълумот юклаш (Open-Meteo) =====
  function loadTemps() {
    var lat = [], lon = [], idx = [];
    GEO.forEach(function (g, i) { if (g) { lat.push(g[0]); lon.push(g[1]); idx.push(i); } });
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.join(",") + "&longitude=" + lon.join(",") +
      "&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto";
    loadState = "loading"; setStatus(); updatePanel();
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      var arr = Array.isArray(data) ? data : [data];
      arr.forEach(function (d, k) {
        var i = idx[k]; if (i == null) return;
        tempsAll[i] = {
          now: d.current ? d.current.temperature_2m : null,
          tmax: d.daily && d.daily.temperature_2m_max ? d.daily.temperature_2m_max[0] : null,
          tmin: d.daily && d.daily.temperature_2m_min ? d.daily.temperature_2m_min[0] : null
        };
      });
      updatedAt = new Date(); loadState = "ok"; setStatus(); paint(); updatePanel();
    }).catch(function () { loadState = "error"; setStatus(); updatePanel(); });
  }

  paint(); updatePanel(); setStatus(); loadTemps();

  // экранга мослаш
  var wrap = stage.parentElement;
  function fit() { var w = wrap.clientWidth, s = w / 1080; stage.style.transform = "scale(" + s + ")"; wrap.style.height = (1080 * s) + "px"; }
  fit(); window.addEventListener("resize", fit);
  if (window.ResizeObserver) { try { new ResizeObserver(fit).observe(wrap); } catch (e) {} }
})();
