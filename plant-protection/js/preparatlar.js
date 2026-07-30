/* Пестицидлар қидирувли базаси — рендер, қидирув, фильтр, тафсилот. */
(function () {
  "use strict";
  var root = document.getElementById("reg-app");
  if (!root || !window.PREPARATLAR) return;

  var LANG = document.documentElement.lang.indexOf("ru") === 0 ? "ru" : "uz";

  var T = LANG === "ru" ? {
    search: "Поиск: название, вещество, культура, вредитель...",
    all_types: "Все типы", all_crops: "Все культуры",
    found: "Найдено", of: "из",
    cols: ["Торговое название", "Действующее вещество", "Тип", "Культура", "Вредный организм", "Норма"],
    detail: "Подробно", company: "Производитель", rate: "Норма расхода", solution: "Рабочий раствор",
    reg: "Рег. номер", expiry: "Срок регистрации", hazard: "Класс опасности", waiting: "Срок ожидания",
    close: "Закрыть", nores: "Ничего не найдено",
    calc_title: "💧 Калькулятор дозы", calc_area: "Площадь, га", calc_rate: "Норма расхода /га",
    calc_sol: "Рабочий раствор, л/га", calc_need: "Требуется препарата", calc_water: "Требуется рабочего раствора (воды)",
    calc_hint: "Значения можно редактировать. Расчёт выполняется только из введённых норм — сверяйте с официальной этикеткой.",
    sc_pick: "Препарат (необязательно — заполнит нормы)", sc_none: "— ручной ввод —", sc_unit: "Единица",
    types: { insecticide: "Инсектицид", fungicide: "Фунгицид", herbicide: "Гербицид", acaricide: "Акарицид", biopreparat: "Биопрепарат", defoliant: "Дефолиант" }
  } : {
    search: "Қидирув: ном, модда, экин, зараркунанда...",
    all_types: "Барча турлар", all_crops: "Барча экинлар",
    found: "Топилди", of: "дан",
    cols: ["Савдо номи", "Таъсир этувчи модда", "Тури", "Экин", "Зарарли организм", "Меъёр"],
    detail: "Батафсил", company: "Ишлаб чиқарувчи", rate: "Сарф меъёри", solution: "Ишчи эритма",
    reg: "Рўйхат рақами", expiry: "Рўйхат муддати", hazard: "Хавфлилик синфи", waiting: "Кутиш вақти",
    close: "Ёпиш", nores: "Ҳеч нарса топилмади",
    calc_title: "💧 Доза калькулятори", calc_area: "Майдон, га", calc_rate: "Сарф меъёри /га",
    calc_sol: "Ишчи эритма, л/га", calc_need: "Керакли препарат", calc_water: "Керакли ишчи эритма (сув)",
    calc_hint: "Қийматларни таҳрирлаш мумкин. Ҳисоб фақат киритилган меъёрлардан бажарилади — расмий этикеткага солиштиринг.",
    sc_pick: "Препарат (ихтиёрий — меъёрни тўлдиради)", sc_none: "— қўлда киритиш —", sc_unit: "Бирлик",
    types: { insecticide: "Инсектицид", fungicide: "Фунгицид", herbicide: "Гербицид", acaricide: "Акарицид", biopreparat: "Биопрепарат", defoliant: "Дефолиант" }
  };

  // Сарф меъёри/эритма қаторидан сон ва бирликни ажратиш (масалан «1,0–1,5 л/га» → 1.0, «л»)
  function firstNum(s) { var m = String(s == null ? "" : s).replace(/,/g, ".").match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; }
  function rateUnit(s) { return /кг|кг\s*\/\s*га|g\/|г\/га|кг\/га/i.test(String(s || "")) ? (LANG === "ru" ? "кг" : "кг") : (LANG === "ru" ? "л" : "л"); }
  function fmtNum(n) { if (n == null || !isFinite(n)) return "—"; var r = Math.round(n * 1000) / 1000; return String(r).replace(".", ","); }

  function tradeName(p) { return LANG === "ru" ? p.trade_ru : p.trade_uz; }
  function cropName(p) { return LANG === "ru" ? p.crop_ru : p.crop_uz; }
  function targetName(p) { return LANG === "ru" ? p.target_ru : p.target_uz; }
  function typeLabel(t) { return T.types[t] || t; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var typeColors = { insecticide: "#c62828", fungicide: "#1565c0", herbicide: "#2e7d32", acaricide: "#6a1b9a", biopreparat: "#00838f", defoliant: "#ef6c00" };

  // UI
  var inpS = "padding:7px 9px;border:1px solid #cfd8dc;border-radius:8px;font:inherit";
  var prepOpts = window.PREPARATLAR.map(function (p, i) { return '<option value="' + i + '">' + esc(tradeName(p)) + '</option>'; }).join("");
  var standalone =
    '<div class="reg-calc-standalone" style="margin-bottom:18px;padding:18px;border:1px solid #cfe0cf;border-radius:14px;background:#f3f8f3">' +
      '<div style="font-weight:700;font-size:17px;margin-bottom:12px">' + esc(T.calc_title) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;flex:1;min-width:220px">' + esc(T.sc_pick) +
          '<select id="sc-prep" style="' + inpS + '"><option value="">' + esc(T.sc_none) + '</option>' + prepOpts + '</select></label>' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">' + esc(T.calc_area) + '<input id="sc-area" type="number" min="0" step="0.1" value="1" style="width:100px;' + inpS + '"></label>' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">' + esc(T.calc_rate) +
          '<span style="display:flex;gap:4px"><input id="sc-rate" type="number" min="0" step="0.01" style="width:90px;' + inpS + '">' +
          '<select id="sc-unit" style="' + inpS + '"><option value="л">л</option><option value="кг">кг</option></select></span></label>' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">' + esc(T.calc_sol) + '<input id="sc-sol" type="number" min="0" step="1" value="300" style="width:100px;' + inpS + '"></label>' +
      '</div>' +
      '<div id="sc-out" style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px"></div>' +
      '<div style="margin-top:8px;font-size:11.5px;color:#607d8b;line-height:1.4">' + esc(T.calc_hint) + '</div>' +
    '</div>';
  root.innerHTML =
    standalone +
    '<div class="reg-controls">' +
      '<input id="reg-q" class="reg-inp" placeholder="' + esc(T.search) + '">' +
      '<select id="reg-type" class="reg-inp reg-sel"><option value="">' + esc(T.all_types) + '</option></select>' +
      '<select id="reg-crop" class="reg-inp reg-sel"><option value="">' + esc(T.all_crops) + '</option></select>' +
    '</div>' +
    '<p id="reg-count" class="reg-count"></p>' +
    '<div class="reg-scroll"><table class="reg-table"><thead><tr>' +
      T.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") +
    '</tr></thead><tbody id="reg-tbody"></tbody></table></div>' +
    '<div id="reg-modal" class="reg-modal" style="display:none;"></div>';

  var qEl = document.getElementById("reg-q");
  var typeEl = document.getElementById("reg-type");
  var cropEl = document.getElementById("reg-crop");
  var tbody = document.getElementById("reg-tbody");
  var countEl = document.getElementById("reg-count");
  var modal = document.getElementById("reg-modal");

  // фильтр опциялари
  var types = {}, crops = {};
  window.PREPARATLAR.forEach(function (p) {
    types[p.type] = 1;
    cropName(p).split(/[,;]+/).forEach(function (c) { c = c.trim(); if (c) crops[c] = 1; });
  });
  Object.keys(types).forEach(function (t) { var o = document.createElement("option"); o.value = t; o.textContent = typeLabel(t); typeEl.appendChild(o); });
  Object.keys(crops).sort().forEach(function (c) { var o = document.createElement("option"); o.value = c; o.textContent = c; cropEl.appendChild(o); });

  function render() {
    var q = (qEl.value || "").toLowerCase().trim();
    var ft = typeEl.value, fc = cropEl.value;
    var rows = window.PREPARATLAR.filter(function (p) {
      if (ft && p.type !== ft) return false;
      if (fc && cropName(p).toLowerCase().indexOf(fc.toLowerCase()) < 0) return false;
      if (q) {
        var hay = [tradeName(p), p.ai, cropName(p), targetName(p), p.company].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    countEl.textContent = T.found + ": " + rows.length + " " + T.of + " " + window.PREPARATLAR.length;
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" class="reg-empty">' + esc(T.nores) + "</td></tr>"; return; }
    tbody.innerHTML = rows.map(function (p) {
      var i = window.PREPARATLAR.indexOf(p);
      return '<tr class="reg-row" data-i="' + i + '">' +
        "<td><b>" + esc(tradeName(p)) + "</b></td>" +
        "<td>" + esc(p.ai) + "</td>" +
        '<td><span class="reg-badge" style="background:' + (typeColors[p.type] || "#555") + '">' + esc(typeLabel(p.type)) + "</span></td>" +
        "<td>" + esc(cropName(p)) + "</td>" +
        "<td>" + esc(targetName(p)) + "</td>" +
        "<td>" + esc(p.rate) + "</td>" +
      "</tr>";
    }).join("");
  }

  function showDetail(p) {
    modal.innerHTML =
      '<div class="reg-modal-box">' +
        '<div class="reg-modal-head"><h3>' + esc(tradeName(p)) + '</h3><button id="reg-close">&times;</button></div>' +
        '<span class="reg-badge" style="background:' + (typeColors[p.type] || "#555") + '">' + esc(typeLabel(p.type)) + "</span>" +
        '<table class="reg-kv">' +
          kv(T.company, p.company) +
          kv("Таъсир этувчи модда", p.ai) +
          kv(LANG === "ru" ? "Культура" : "Экин", cropName(p)) +
          kv(LANG === "ru" ? "Вредный организм" : "Зарарли организм", targetName(p)) +
          kv(T.rate, p.rate) +
          kv(T.solution, p.solution) +
          kv(T.hazard, p.hazard) +
          kv(T.waiting, p.waiting) +
          kv(T.reg, p.reg) +
          kv(T.expiry, p.expiry) +
          moaRow(p) +
        "</table>" +
        calcBlock(p) +
      "</div>";
    modal.style.display = "flex";
    document.getElementById("reg-close").addEventListener("click", function () { modal.style.display = "none"; });
    wireCalc(p);
  }

  // Доза калькулятори — препарат меъёридан майдонга кўра умумий сарфни ҳисоблайди
  function calcBlock(p) {
    var unit = rateUnit(p.rate);
    var rate0 = firstNum(p.rate), sol0 = firstNum(p.solution);
    var inp = "style=\"width:90px;padding:6px 8px;border:1px solid #cfd8dc;border-radius:8px;font:inherit\"";
    return '<div class="reg-calc" style="margin-top:16px;padding:14px;border:1px solid #d7e3d7;border-radius:12px;background:#f5f9f5">' +
      '<div style="font-weight:600;margin-bottom:10px">' + esc(T.calc_title) + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">' + esc(T.calc_area) + '<input id="cx-area" type="number" min="0" step="0.1" value="1" ' + inp + '></label>' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">' + esc(T.calc_rate) + ' (' + esc(unit) + ')<input id="cx-rate" type="number" min="0" step="0.01" value="' + (rate0 != null ? rate0 : "") + '" ' + inp + '></label>' +
        '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">' + esc(T.calc_sol) + '<input id="cx-sol" type="number" min="0" step="1" value="' + (sol0 != null ? sol0 : "") + '" ' + inp + '></label>' +
      '</div>' +
      '<div id="cx-out" style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px"></div>' +
      '<div style="margin-top:8px;font-size:11.5px;color:#607d8b;line-height:1.4">' + esc(T.calc_hint) + '</div>' +
    '</div>';
  }
  function wireCalc(p) {
    var unit = rateUnit(p.rate);
    var aEl = document.getElementById("cx-area"), rEl = document.getElementById("cx-rate"), sEl = document.getElementById("cx-sol"), out = document.getElementById("cx-out");
    if (!aEl) return;
    function card(label, val, u) {
      return '<div style="flex:1;min-width:150px;background:#fff;border:1px solid #dbe7db;border-radius:10px;padding:10px 12px">' +
        '<div style="font-size:12px;color:#607d8b">' + esc(label) + '</div>' +
        '<div style="font-size:20px;font-weight:700;color:#2e7d32">' + esc(fmtNum(val)) + ' <span style="font-size:13px;font-weight:600;color:#455a64">' + esc(u) + '</span></div>' +
      '</div>';
    }
    function recompute() {
      var a = parseFloat(aEl.value), r = parseFloat(rEl.value), s = parseFloat(sEl.value);
      var html = "";
      if (isFinite(a) && a > 0 && isFinite(r) && r > 0) html += card(T.calc_need, a * r, unit);
      if (isFinite(a) && a > 0 && isFinite(s) && s > 0) html += card(T.calc_water, a * s, "л");
      out.innerHTML = html || '<span style="color:#90a4ae;font-size:13px">—</span>';
    }
    aEl.addEventListener("input", recompute);
    rEl.addEventListener("input", recompute);
    sEl.addEventListener("input", recompute);
    recompute();
  }
  function kv(k, v) { return "<tr><th>" + esc(k) + "</th><td>" + esc(v || "—") + "</td></tr>"; }
  function moaRow(p) {
    if (!window.MOA) return "";
    var r = window.MOA.lookup(p.ai);
    if (!r) return "";
    var label = LANG === "ru" ? "Группа MoA (резистентность)" : "MoA гуруҳи (резистентлик)";
    var moa = LANG === "ru" ? r.moa_ru : r.moa_uz;
    return '<tr><th>' + esc(label) + '</th><td><b>' + esc(r.system + " · " + r.group) + "</b> — " + esc(moa) + "</td></tr>";
  }

  qEl.addEventListener("input", render);
  typeEl.addEventListener("change", render);
  cropEl.addEventListener("change", render);
  tbody.addEventListener("click", function (e) {
    var tr = e.target.closest(".reg-row"); if (!tr) return;
    showDetail(window.PREPARATLAR[+tr.getAttribute("data-i")]);
  });
  modal.addEventListener("click", function (e) { if (e.target === modal) modal.style.display = "none"; });

  // Стандалон доза калькулятори (қидирувдан юқорида, препарат танлаш ихтиёрий)
  (function () {
    var prepEl = document.getElementById("sc-prep"), aEl = document.getElementById("sc-area"),
        rEl = document.getElementById("sc-rate"), uEl = document.getElementById("sc-unit"),
        sEl = document.getElementById("sc-sol"), out = document.getElementById("sc-out");
    if (!aEl) return;
    function scCard(label, val, u) {
      return '<div style="flex:1;min-width:160px;background:#fff;border:1px solid #dbe7db;border-radius:10px;padding:12px 14px">' +
        '<div style="font-size:12px;color:#607d8b">' + esc(label) + '</div>' +
        '<div style="font-size:22px;font-weight:700;color:#2e7d32">' + esc(fmtNum(val)) + ' <span style="font-size:14px;font-weight:600;color:#455a64">' + esc(u) + '</span></div>' +
      '</div>';
    }
    function scRecompute() {
      var a = parseFloat(aEl.value), r = parseFloat(rEl.value), s = parseFloat(sEl.value), u = uEl.value || "л";
      var html = "";
      if (isFinite(a) && a > 0 && isFinite(r) && r > 0) html += scCard(T.calc_need, a * r, u);
      if (isFinite(a) && a > 0 && isFinite(s) && s > 0) html += scCard(T.calc_water, a * s, "л");
      out.innerHTML = html || '<span style="color:#90a4ae;font-size:13px">—</span>';
    }
    prepEl.addEventListener("change", function () {
      var v = prepEl.value;
      if (v === "") return; // қўлда киритиш — тегмаймиз
      var p = window.PREPARATLAR[+v];
      var r0 = firstNum(p.rate), s0 = firstNum(p.solution);
      if (r0 != null) rEl.value = r0;
      if (s0 != null) sEl.value = s0;
      uEl.value = rateUnit(p.rate);
      scRecompute();
    });
    [aEl, rEl, sEl, uEl].forEach(function (el) { el.addEventListener("input", scRecompute); el.addEventListener("change", scRecompute); });
    scRecompute();
  })();

  render();
})();
