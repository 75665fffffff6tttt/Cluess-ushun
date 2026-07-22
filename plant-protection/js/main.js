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
