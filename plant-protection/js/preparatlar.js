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
    types: { insecticide: "Инсектицид", fungicide: "Фунгицид", herbicide: "Гербицид", acaricide: "Акарицид", biopreparat: "Биопрепарат", defoliant: "Дефолиант" }
  } : {
    search: "Қидирув: ном, модда, экин, зараркунанда...",
    all_types: "Барча турлар", all_crops: "Барча экинлар",
    found: "Топилди", of: "дан",
    cols: ["Савдо номи", "Таъсир этувчи модда", "Тури", "Экин", "Зарарли организм", "Меъёр"],
    detail: "Батафсил", company: "Ишлаб чиқарувчи", rate: "Сарф меъёри", solution: "Ишчи эритма",
    reg: "Рўйхат рақами", expiry: "Рўйхат муддати", hazard: "Хавфлилик синфи", waiting: "Кутиш вақти",
    close: "Ёпиш", nores: "Ҳеч нарса топилмади",
    types: { insecticide: "Инсектицид", fungicide: "Фунгицид", herbicide: "Гербицид", acaricide: "Акарицид", biopreparat: "Биопрепарат", defoliant: "Дефолиант" }
  };

  function tradeName(p) { return LANG === "ru" ? p.trade_ru : p.trade_uz; }
  function cropName(p) { return LANG === "ru" ? p.crop_ru : p.crop_uz; }
  function targetName(p) { return LANG === "ru" ? p.target_ru : p.target_uz; }
  function typeLabel(t) { return T.types[t] || t; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var typeColors = { insecticide: "#c62828", fungicide: "#1565c0", herbicide: "#2e7d32", acaricide: "#6a1b9a", biopreparat: "#00838f", defoliant: "#ef6c00" };

  // UI
  root.innerHTML =
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
      "</div>";
    modal.style.display = "flex";
    document.getElementById("reg-close").addEventListener("click", function () { modal.style.display = "none"; });
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

  render();
})();
