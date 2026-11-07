/* Оддий ташриф ҳисоблагичи — ташқи хизматсиз, махфийликка зарарсиз.
 * Ҳисоб localStorage'да сақланади (фақат шу браузер/қурилма).
 * Ҳар сеанс (session) учун битта ташриф санайди; ҳар саҳифада кичик белги кўрсатади. */
(function () {
  "use strict";
  try {
    var K_TOTAL = "agro_visits_total", K_DAY = "agro_visits_day", K_DATE = "agro_visits_date", S_FLAG = "agro_visit_counted";
    var today = new Date().toISOString().slice(0, 10);
    var total = parseInt(localStorage.getItem(K_TOTAL), 10) || 0;
    var day = (localStorage.getItem(K_DATE) === today) ? (parseInt(localStorage.getItem(K_DAY), 10) || 0) : 0;

    // Битта сеансда фақат бир марта санаш (ҳар саҳифа ўтишида эмас)
    if (!sessionStorage.getItem(S_FLAG)) {
      total += 1;
      day += 1;
      localStorage.setItem(K_TOTAL, total);
      localStorage.setItem(K_DAY, day);
      localStorage.setItem(K_DATE, today);
      sessionStorage.setItem(S_FLAG, "1");
    }

    var ru = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0;
    var lbl = ru
      ? ("Визитов: " + total + " · сегодня: " + day)
      : ("Ташрифлар: " + total + " · бугун: " + day);

    function makeBadge() {
      if (document.getElementById("visit-counter")) return;
      var b = document.createElement("div");
      b.id = "visit-counter";
      b.textContent = "👁 " + lbl;
      b.title = ru ? "Счётчик визитов (на этом устройстве)" : "Ташриф ҳисоблагичи (шу қурилмада)";
      b.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:9998;background:rgba(20,45,22,.82);color:#fff;" +
        "font:12px/1.4 system-ui,-apple-system,Segoe UI,Arial,sans-serif;padding:5px 11px;border-radius:14px;" +
        "box-shadow:0 2px 8px rgba(0,0,0,.25);opacity:.85;user-select:none;cursor:default;max-width:70vw";
      // Босилса — яширинади
      b.addEventListener("click", function () { b.style.display = "none"; });
      document.body.appendChild(b);
    }
    if (document.body) makeBadge();
    else document.addEventListener("DOMContentLoaded", makeBadge);
  } catch (e) { /* localStorage бўлмаса — жимгина ўтказамиз */ }
})();
