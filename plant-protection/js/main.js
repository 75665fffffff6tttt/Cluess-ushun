/* ——— GoatCounter — реал (глобал) ташриф ҳисоблагичи ———
 * РОСТЛАШ (1 дақиқа): https://www.goatcounter.com/ да бепул рўйхатдан ўтиб,
 * ўзингизга код (субдомен) оласиз. Масалан «agrohimoya» ни танласангиз —
 * ҳисоблагич дарҳол ишлайди. Кодни қуйига ёзинг. Бўш ("") қолдирсангиз — ўчади.
 * Махфийликка зарарсиз: cookie ишлатмайди, шахсий маълумот тўпламайди. */
(function () {
  var GOATCOUNTER_CODE = "agrohimoya"; // ← ўз кодингизга алмаштиринг
  if (!GOATCOUNTER_CODE) return;
  var h = location.hostname;
  if (location.protocol === "file:" || h === "localhost" || h === "127.0.0.1") return; // локал синовда санамаймиз
  var s = document.createElement("script");
  s.async = true;
  s.src = "//gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://" + GOATCOUNTER_CODE + ".goatcounter.com/count");
  (document.head || document.documentElement).appendChild(s);
})();

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.getElementById("sidebar-toggle");
  var sidebar = document.getElementById("sidebar");
  var backdrop = document.getElementById("sidebar-backdrop");
  function closeSidebar() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("visible");
    toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && sidebar && backdrop) {
    toggle.addEventListener("click", function () {
      var isOpen = sidebar.classList.toggle("open");
      backdrop.classList.toggle("visible", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    backdrop.addEventListener("click", closeSidebar);
  }

  // Эски юқори-меню (main-nav) — main тармоғидаги контент саҳифалари учун
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      mainNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", mainNav.classList.contains("open") ? "true" : "false");
    });
  }

  var form = document.querySelector(".contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = form.querySelector(".form-note");
      if (note) {
        note.textContent = form.dataset.successMessage || "Xabar qabul qilindi.";
        note.style.display = "block";
      }
      form.reset();
    });
  }
});

// Телефонга ўрнатиш ва интернетсиз ишлаш (sw.js): охирги очилган саҳифа ва маълумот кешда сақланади
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
}
(function () { // интернет йўқлигида кичик ёзув: кўрсатилаётган маълумот — охирги сақланган нусха
  var ru = (document.documentElement.lang || "").indexOf("ru") === 0, el = null;
  function show() {
    if (navigator.onLine) { if (el) el.style.display = "none"; return; }
    if (!el) {
      el = document.createElement("div"); el.className = "offline-note"; el.setAttribute("role", "status");
      el.style.cssText = "position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;background:#37474f;color:#fff;padding:8px 14px;border-radius:18px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.25);max-width:92vw;text-align:center";
      el.textContent = ru ? "📴 Нет интернета — показаны последние сохранённые данные" : "📴 Интернет йўқ — охирги сақланган маълумот кўрсатилмоқда";
      document.body.appendChild(el);
    }
    el.style.display = "";
  }
  window.addEventListener("online", show); window.addEventListener("offline", show);
  document.addEventListener("DOMContentLoaded", show);
})();
