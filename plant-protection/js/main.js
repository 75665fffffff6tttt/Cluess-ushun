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
