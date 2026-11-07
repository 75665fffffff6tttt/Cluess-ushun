/* Резистентликни бошқариш — MoA гуруҳини аниқлаш + ротация текшируви. */
(function () {
  "use strict";
  var root = document.getElementById("rez-app");
  if (!root || !window.MOA) return;
  var LANG = document.documentElement.lang.indexOf("ru") === 0 ? "ru" : "uz";

  var T = LANG === "ru" ? {
    detectLabel: "Действующее вещество:",
    detectPh: "Напр.: Тебуконазол, Имидаклоприд, Глифосат...",
    notFound: "Группа не найдена в базе. Проверьте по официальной базе IRAC/FRAC/HRAC.",
    system: "Система", group: "Группа", moa: "Механизм действия",
    progTitle: "Программа обработок (проверка ротации)",
    progHint: "Добавьте препараты в порядке применения — система предупредит, если подряд идут вещества одной группы (риск резистентности).",
    add: "+ Добавить обработку", rowPh: "Действующее вещество",
    warnSame: "⚠️ Подряд одна группа — чередуйте механизм действия!",
    okRot: "✓ Хорошая ротация",
    countWarn: function (g, n) { return "⚠️ Группа " + g + " использована " + n + " раз — не более 2–3 за сезон."; },
    principles: "Принципы управления резистентностью"
  } : {
    detectLabel: "Таъсир этувчи модда:",
    detectPh: "Мисол: Тебуконазол, Имидаклоприд, Глифосат...",
    notFound: "Гуруҳ базада топилмади. IRAC/FRAC/HRAC расмий базасидан текширинг.",
    system: "Тизим", group: "Гуруҳ", moa: "Таъсир механизми",
    progTitle: "Пуркаш дастури (ротация текшируви)",
    progHint: "Препаратларни қўллаш тартибида қўшинг — тизим кетма-кет бир гуруҳ келса огоҳлантиради (резистентлик хавфи).",
    add: "+ Ишлов қўшиш", rowPh: "Таъсир этувчи модда",
    warnSame: "⚠️ Кетма-кет бир гуруҳ — таъсир механизмини навбатланг!",
    okRot: "✓ Яхши ротация",
    countWarn: function (g, n) { return "⚠️ " + g + " гуруҳи " + n + " марта — мавсумда 2–3 мартадан ошмасин."; },
    principles: "Резистентликни бошқариш тамойиллари"
  };

  function moaName(r) { return LANG === "ru" ? r.moa_ru : r.moa_uz; }
  function sysInfo(s) { return LANG === "ru" ? window.MOA.systemInfo[s].ru : window.MOA.systemInfo[s].uz; }
  var sysColor = { IRAC: "#c62828", FRAC: "#1565c0", HRAC: "#2e7d32" };
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  root.innerHTML =
    '<div class="rez-card">' +
      '<label class="rez-lbl">' + esc(T.detectLabel) + '</label>' +
      '<input id="rez-detect" class="reg-inp" style="width:100%;max-width:420px;" placeholder="' + esc(T.detectPh) + '">' +
      '<div id="rez-detect-out" class="rez-out"></div>' +
    '</div>' +
    '<div class="rez-card">' +
      '<h3 class="rez-h3">' + esc(T.progTitle) + '</h3>' +
      '<p class="rez-hint">' + esc(T.progHint) + '</p>' +
      '<div id="rez-prog"></div>' +
      '<button id="rez-add" class="hb-btn-sm" style="margin-top:10px;">' + esc(T.add) + '</button>' +
    '</div>';

  // --- 1. Аниқлаш ---
  var detEl = document.getElementById("rez-detect"), detOut = document.getElementById("rez-detect-out");
  detEl.addEventListener("input", function () {
    var r = window.MOA.lookup(detEl.value);
    if (!detEl.value.trim()) { detOut.innerHTML = ""; return; }
    if (!r) { detOut.innerHTML = '<div class="rez-nf">' + esc(T.notFound) + "</div>"; return; }
    detOut.innerHTML =
      '<div class="rez-result">' +
        '<span class="rez-badge" style="background:' + sysColor[r.system] + '">' + r.system + " · " + esc(r.group) + "</span>" +
        '<div class="rez-kv"><b>' + esc(T.moa) + ":</b> " + esc(moaName(r)) + "</div>" +
        '<div class="rez-sys">' + esc(sysInfo(r.system)) + "</div>" +
      "</div>";
  });

  // --- 2. Ротация дастури ---
  var prog = [{ v: "" }, { v: "" }];
  var progEl = document.getElementById("rez-prog");

  function renderProg() {
    var looked = prog.map(function (p) { return { v: p.v, r: window.MOA.lookup(p.v) }; });
    var html = "";
    looked.forEach(function (item, i) {
      var r = item.r;
      var badge = r ? '<span class="rez-badge sm" style="background:' + sysColor[r.system] + '">' + r.system + "·" + esc(r.group) + "</span>"
                    : (item.v.trim() ? '<span class="rez-badge sm" style="background:#999">?</span>' : "");
      // кетма-кет бир гуруҳ огоҳлантириши
      var warn = "";
      if (i > 0 && r && looked[i - 1].r && r.system === looked[i - 1].r.system && r.group === looked[i - 1].r.group) {
        warn = '<div class="rez-warn">' + esc(T.warnSame) + "</div>";
      }
      html += '<div class="rez-row">' +
        '<span class="rez-num">' + (i + 1) + ".</span>" +
        '<input class="reg-inp rez-prog-inp" data-i="' + i + '" value="' + esc(item.v) + '" placeholder="' + esc(T.rowPh) + '">' +
        badge +
        (prog.length > 1 ? '<button class="rez-del" data-del="' + i + '">✕</button>' : "") +
      "</div>" + warn;
    });
    progEl.innerHTML = html;

    // гуруҳ такрорланиши огоҳлантириши
    var counts = {};
    looked.forEach(function (it) { if (it.r) { var k = it.r.system + " " + it.r.group; counts[k] = (counts[k] || 0) + 1; } });
    var notes = [];
    Object.keys(counts).forEach(function (k) { if (counts[k] >= 3) notes.push(T.countWarn(k, counts[k])); });
    var goodRotation = looked.filter(function (x) { return x.r; }).length >= 2 && !progEl.querySelector(".rez-warn") && notes.length === 0;
    if (goodRotation) notes.unshift(T.okRot);
    if (notes.length) {
      var box = document.createElement("div");
      box.className = "rez-summary";
      box.innerHTML = notes.map(function (n) { return "<div>" + esc(n) + "</div>"; }).join("");
      progEl.appendChild(box);
    }

    // input ва delete ҳодисалари
    progEl.querySelectorAll(".rez-prog-inp").forEach(function (inp) {
      inp.addEventListener("input", function () { prog[+inp.getAttribute("data-i")].v = inp.value; renderProg(); restoreFocus(+inp.getAttribute("data-i")); });
    });
    progEl.querySelectorAll(".rez-del").forEach(function (b) {
      b.addEventListener("click", function () { prog.splice(+b.getAttribute("data-del"), 1); renderProg(); });
    });
  }
  var lastFocus = null;
  function restoreFocus(i) {
    var el = progEl.querySelector('.rez-prog-inp[data-i="' + i + '"]');
    if (el) { el.focus(); var v = el.value; el.value = ""; el.value = v; }
  }
  document.getElementById("rez-add").addEventListener("click", function () { prog.push({ v: "" }); renderProg(); });

  renderProg();
})();
