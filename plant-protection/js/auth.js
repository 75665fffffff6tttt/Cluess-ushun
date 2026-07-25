/* Оддий парол-эшик (client-side gate) — бутун сайт учун.
 *
 * ⚠️ ДИҚҚАТ: бу — ХАВФСИЗ (криптографик) ҳимоя ЭМАС. GitHub Pages статик
 * сайт бўлгани учун сервер йўқ; бу эшик фақат оддий фойдаланувчиларни
 * тўсади. Техник билимли одам код орқали айланиб ўтиши мумкин. Ҳақиқий
 * хавфсизлик учун сервер (pp-system, Laravel) керак.
 *
 * Логин/паролни ўзгартириш:
 *   1. Логинни AUTH.user да ёзинг.
 *   2. Янги парол хешини олинг (браузер консолида):
 *        crypto.subtle.digest('SHA-256', new TextEncoder().encode('ЯНГИ_ПАРОЛ'))
 *          .then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
 *      ва натижани AUTH.hash га қўйинг.
 */
(function () {
  "use strict";

  var AUTH = {
    user: "agrohimoya",
    // SHA-256("Himoya2026!") — паролни ўзгартиргач, бу хешни ҳам янгиланг
    hash: "5b739daf3ac90d37593fe43751c34b98b3ccc3049877e3acdbb72a2f869ffaa2",
    key: "agrohimoya_auth_v2"
  };

  // Аллақачон кирган бўлса — ҳеч нарса қилмаймиз
  try { if (localStorage.getItem(AUTH.key) === AUTH.hash) return; } catch (e) {}

  // Контентни дарҳол яширамиз (эшик очилгунча)
  var rootHidden = document.createElement("style");
  rootHidden.id = "auth-hide";
  rootHidden.textContent = "body>*:not(#auth-gate){visibility:hidden !important}";
  (document.head || document.documentElement).appendChild(rootHidden);

  function sha256(text) {
    var enc = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", enc).then(function (buf) {
      return [].map.call(new Uint8Array(buf), function (x) { return x.toString(16).padStart(2, "0"); }).join("");
    });
  }

  function buildGate() {
    var g = document.createElement("div");
    g.id = "auth-gate";
    g.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-brand"><span class="auth-ico">🌿</span><div><b>АгроҲимоя</b><small>Ҳимояланган тизим</small></div></div>' +
        '<h2>Тизимга кириш</h2>' +
        '<label>Логин<input id="auth-user" autocomplete="username" placeholder="Логин"></label>' +
        '<label>Парол<input id="auth-pass" type="password" autocomplete="current-password" placeholder="Парол"></label>' +
        '<div id="auth-err" class="auth-err"></div>' +
        '<button id="auth-btn" type="button">Кириш</button>' +
        '<p class="auth-note">Кириш маълумотларини маъмуридан олинг.</p>' +
      '</div>';
    var css = document.createElement("style");
    css.textContent =
      '#auth-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
      'background:linear-gradient(135deg,#0f5132,#198754);font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:16px}' +
      '#auth-gate .auth-card{background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);padding:28px 26px;width:100%;max-width:360px}' +
      '#auth-gate .auth-brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}' +
      '#auth-gate .auth-ico{font-size:30px}' +
      '#auth-gate .auth-brand b{display:block;color:#0f5132;font-size:18px}' +
      '#auth-gate .auth-brand small{color:#6c757d;font-size:12px}' +
      '#auth-gate h2{margin:6px 0 16px;font-size:20px;color:#212529}' +
      '#auth-gate label{display:block;font-size:13px;color:#495057;margin-bottom:10px}' +
      '#auth-gate input{width:100%;box-sizing:border-box;margin-top:4px;padding:11px 12px;border:1px solid #ced4da;border-radius:9px;font-size:15px}' +
      '#auth-gate input:focus{outline:none;border-color:#198754;box-shadow:0 0 0 3px rgba(25,135,84,.15)}' +
      '#auth-gate button{width:100%;margin-top:6px;padding:12px;border:0;border-radius:9px;background:#198754;color:#fff;font-size:16px;font-weight:600;cursor:pointer}' +
      '#auth-gate button:hover{background:#157347}' +
      '#auth-gate .auth-err{color:#dc3545;font-size:13px;min-height:18px;margin-bottom:4px}' +
      '#auth-gate .auth-note{color:#adb5bd;font-size:12px;text-align:center;margin:14px 0 0}';
    document.head.appendChild(css);
    document.body.appendChild(g);

    var userI = g.querySelector("#auth-user"), passI = g.querySelector("#auth-pass"),
        btn = g.querySelector("#auth-btn"), err = g.querySelector("#auth-err");

    function fail(msg) { err.textContent = msg || "Логин ёки парол нотўғри."; passI.value = ""; passI.focus(); }

    function submit() {
      err.textContent = "";
      var u = (userI.value || "").trim();
      if (u.toLowerCase() !== AUTH.user.toLowerCase()) { fail(); return; }
      sha256(passI.value || "").then(function (h) {
        if (h === AUTH.hash) {
          try { localStorage.setItem(AUTH.key, AUTH.hash); } catch (e) {}
          var hide = document.getElementById("auth-hide"); if (hide) hide.remove();
          g.remove();
        } else { fail(); }
      }).catch(function () { fail("Хатолик юз берди."); });
    }

    btn.addEventListener("click", submit);
    passI.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    userI.addEventListener("keydown", function (e) { if (e.key === "Enter") passI.focus(); });
    userI.focus();
  }

  // Глобал: чиқиш (истаган саҳифада AgroAuth.logout() чақириш мумкин)
  window.AgroAuth = { logout: function () { try { localStorage.removeItem(AUTH.key); } catch (e) {} location.reload(); } };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildGate);
  else buildGate();
})();
