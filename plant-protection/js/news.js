/* Ўсимликларни ҳимоя қилиш — янгиликлар бўлими.
 * data/news.json ни ўқийди (уни GitHub Actions ҳар куни автоматик янгилайди). */
(function () {
  "use strict";
  var root = document.getElementById("news-app");
  if (!root) return;
  var LANG = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz";
  var T = LANG === "ru" ? {
    loading: "Загрузка новостей…", empty: "Пока нет новостей.",
    updated: "Обновлено", source: "Источник",
    auto: "Новости обновляются автоматически (ежедневно).", read: "Читать →"
  } : {
    loading: "Янгиликлар юкланмоқда…", empty: "Ҳозирча янгиликлар йўқ.",
    updated: "Янгиланди", source: "Манба",
    auto: "Янгиликлар автоматик янгиланади (ҳар куни).", read: "Ўқиш →"
  };
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmtDate(iso) {
    if (!iso) return "";
    try { return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString(LANG === "ru" ? "ru-RU" : "ru-RU", { year: "numeric", month: "long", day: "numeric" }); }
    catch (e) { return iso; }
  }
  root.innerHTML = '<p class="news-status">' + esc(T.loading) + '</p>';

  fetch("data/news.json?ts=" + Date.now()).then(function (r) { return r.json(); }).then(function (d) {
    var items = (d.items || []).filter(function (x) { return !x.lang || x.lang === LANG || x.lang === "all"; });
    items.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    if (!items.length) { root.innerHTML = '<p class="news-status">' + esc(T.empty) + '</p>'; return; }
    var html = '<p class="news-meta">🕒 ' + esc(T.updated) + ': ' + esc(fmtDate(d.updated)) + ' · ' + esc(T.auto) + '</p>';
    html += '<div class="news-list">' + items.map(function (it) {
      return '<article class="news-card">' +
        '<div class="news-date">' + esc(fmtDate(it.date)) + '</div>' +
        '<h3 class="news-title"><a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.title) + '</a></h3>' +
        (it.summary ? '<p class="news-sum">' + esc(it.summary) + '</p>' : '') +
        '<div class="news-src">' + esc(T.source) + ': <b>' + esc(it.source || "—") + '</b>' +
          ' · <a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(T.read) + '</a></div>' +
      '</article>';
    }).join("") + '</div>';
    root.innerHTML = html;
  }).catch(function () {
    root.innerHTML = '<p class="news-status">' + esc(T.empty) + '</p>';
  });
})();
