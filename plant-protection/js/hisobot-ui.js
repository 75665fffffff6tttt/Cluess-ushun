/* Ҳисобот генератори — форма контроллери (браузер).
 * hisobot.js (window.Hisobot) моторидан фойдаланади.
 */
(function () {
  "use strict";
  if (!window.Hisobot) { console.error("Hisobot мотори юкланмади"); return; }

  var META_KEYS = ["preparatName", "activeIngredients", "preparatForm", "manufacturer", "country",
    "crop", "variety", "targetOrganism", "applicationRate", "referenceName", "workingSolution",
    "site", "trialDate", "laboratory", "staff", "weather",
    "institute", "director", "reportCity", "scientificSecretary", "secretaryDegree", "deputyDirector",
    "protocolNumber", "applicantOrg", "tradeName", "testEquipment",
    "applicationMethod", "experimentType", "referenceFullDesc", "labConclusion",
    "maxTreatments", "waitingPeriod", "phytotoxicity", "cropPhase", "references"];

  function $(id) { return document.getElementById(id); }
  function num(s) { if (s == null) return null; s = String(s).trim().replace(",", "."); if (s === "") return null; var v = Number(s); return isFinite(v) ? v : null; }
  var IS_RU = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0;
  function T(u, r) { return IS_RU ? r : u; }

  var vid = 0;
  function nid() { return "v" + (++vid); }
  var state = {
    variants: [
      { id: nid(), name: "Назорат (ишловсиз)", isControl: true, isReference: false },
      { id: nid(), name: "Тажриба варианти", isControl: false, isReference: false },
      { id: nid(), name: "Эталон варианти", isControl: false, isReference: true }
    ],
    species: ["Курмак", "Шўра"],
    mode: "counts", manualMode: false, detection: null,
    counts: {}, disease: {}, weeds: {}, weedBefore: {}, yieldData: {}, yieldReps: 4,
    storageDiseases: ["Кулранг чириш", "Антракноз"], storage: {}
  };

  function getDays() {
    var raw = ($("days-input").value || "").split(/[,;\s]+/).map(function (s) { return parseInt(s, 10); }).filter(function (n) { return isFinite(n); });
    var seen = {}, out = [];
    raw.forEach(function (n) { if (!seen[n]) { seen[n] = 1; out.push(n); } });
    return out.sort(function (a, b) { return a - b; });
  }

  function getMeta() {
    var m = {};
    META_KEYS.forEach(function (k) { var el = $("m_" + k); m[k] = el ? el.value : ""; });
    return m;
  }

  // ---------- localStorage авто-сақлаш ----------
  var LSKEY = "hisobot_state_v1", saveT;
  function persist() {
    try {
      var metaVals = {}; META_KEYS.forEach(function (k) { var el = $("m_" + k); if (el) metaVals[k] = el.value; });
      localStorage.setItem(LSKEY, JSON.stringify({
        v: 1, state: state, meta: metaVals,
        days: ($("days-input") || {}).value, yieldUnit: ($("yield-unit") || {}).value,
        explicitType: ($("explicit-type") || {}).value
      }));
    } catch (e) {}
  }
  function persistSoon() { clearTimeout(saveT); saveT = setTimeout(persist, 400); }
  function restore() {
    try {
      var raw = localStorage.getItem(LSKEY); if (!raw) return;
      var d = JSON.parse(raw); if (!d || !d.state) return;
      if (d.meta) META_KEYS.forEach(function (k) { var el = $("m_" + k); if (el && d.meta[k] != null) el.value = d.meta[k]; });
      if (d.days != null && $("days-input")) $("days-input").value = d.days;
      if (d.yieldUnit != null && $("yield-unit")) $("yield-unit").value = d.yieldUnit;
      if (d.explicitType != null && $("explicit-type")) $("explicit-type").value = d.explicitType;
      Object.keys(d.state).forEach(function (k) { state[k] = d.state[k]; });
      var maxId = 0; (state.variants || []).forEach(function (v) { var n = parseInt(String(v.id).replace(/\D/g, ""), 10); if (isFinite(n) && n > maxId) maxId = n; });
      vid = maxId;
      if ($("yield-reps")) $("yield-reps").value = state.yieldReps || 4;
      if ($("mode-select")) $("mode-select").value = state.mode || "counts";
    } catch (e) {}
  }
  function clearSaved() { try { localStorage.removeItem(LSKEY); } catch (e) {} }

  // ---------- вариантлар ----------
  function renderVariants() {
    var box = $("variants-list"); box.innerHTML = "";
    state.variants.forEach(function (v) {
      var row = document.createElement("div"); row.className = "hb-variant";
      row.innerHTML =
        '<input class="hb-inp hb-vname" value="' + escAttr(v.name) + '">' +
        '<label class="hb-chk"><input type="radio" name="hb-control" ' + (v.isControl ? "checked" : "") + '> назорат</label>' +
        '<label class="hb-chk"><input type="checkbox" ' + (v.isReference ? "checked" : "") + '> эталон</label>' +
        '<button class="hb-x" title="Ўчириш">✕</button>';
      var name = row.querySelector(".hb-vname"), radio = row.querySelector('input[type=radio]'), chk = row.querySelector('input[type=checkbox]'), x = row.querySelector(".hb-x");
      name.addEventListener("input", function () { v.name = name.value; });
      radio.addEventListener("change", function () { state.variants.forEach(function (o) { o.isControl = (o.id === v.id); }); });
      chk.addEventListener("change", function () { v.isReference = chk.checked; });
      x.addEventListener("click", function () { state.variants = state.variants.filter(function (o) { return o.id !== v.id; }); renderAll(); });
      box.appendChild(row);
    });
  }

  // ---------- дала маълумотлари ----------
  function cellInput(val, on) {
    var i = document.createElement("input");
    i.className = "hb-cell"; i.value = val || ""; i.inputMode = "decimal";
    i.addEventListener("input", function () { on(i.value); });
    return i;
  }
  function mkTable(headers) {
    var t = document.createElement("table"); t.className = "hb-table";
    var thead = document.createElement("thead"), tr = document.createElement("tr");
    headers.forEach(function (h) { var th = document.createElement("th"); th.textContent = h; tr.appendChild(th); });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = document.createElement("tbody"); t.appendChild(tb);
    return { table: t, body: tb };
  }

  function renderFieldData() {
    var box = $("fielddata"); box.innerHTML = "";
    if (state.mode === "storage") { renderStorage(box); return; }
    var days = getDays();
    if (!days.length) { box.innerHTML = '<p class="hb-warn">Аввал кузатиш кунларини киритинг.</p>'; return; }

    if (state.mode === "counts") {
      var tbl = mkTable(["Вариант", "Ишловгача"].concat(days.map(function (d) { return d + "-кун"; })));
      state.variants.forEach(function (v) {
        state.counts[v.id] = state.counts[v.id] || { before: "", byDay: {} };
        var tr = document.createElement("tr");
        tr.appendChild(td(v.name));
        var bc = document.createElement("td"); bc.appendChild(cellInput(state.counts[v.id].before, function (val) { state.counts[v.id].before = val; })); tr.appendChild(bc);
        days.forEach(function (d) { var c = document.createElement("td"); c.appendChild(cellInput(state.counts[v.id].byDay[d], function (val) { state.counts[v.id].byDay[d] = val; })); tr.appendChild(c); });
        tbl.body.appendChild(tr);
      });
      box.appendChild(tbl.table);
    } else if (state.mode === "disease") {
      var tbl2 = mkTable(["Вариант"].concat(days.map(function (d) { return d + "-кун (индекс %)"; })));
      state.variants.forEach(function (v) {
        state.disease[v.id] = state.disease[v.id] || {};
        var tr = document.createElement("tr"); tr.appendChild(td(v.name));
        days.forEach(function (d) { var c = document.createElement("td"); c.appendChild(cellInput(state.disease[v.id][d], function (val) { state.disease[v.id][d] = val; })); tr.appendChild(c); });
        tbl2.body.appendChild(tr);
      });
      box.appendChild(tbl2.table);
    } else {
      // weeds
      var spWrap = document.createElement("div"); spWrap.className = "hb-species-row";
      spWrap.innerHTML = '<span class="hb-lbl">Бегона ўт турлари:</span>';
      state.species.forEach(function (sp, i) {
        var inp = document.createElement("input"); inp.className = "hb-inp hb-sp"; inp.value = sp;
        inp.addEventListener("input", function () { state.species[i] = inp.value; });
        spWrap.appendChild(inp);
      });
      var addSp = btn("+ тур", function () { state.species.push("Тур " + (state.species.length + 1)); renderFieldData(); });
      spWrap.appendChild(addSp);
      if (state.species.length > 1) spWrap.appendChild(btn("− тур", function () { state.species.pop(); renderFieldData(); }));
      box.appendChild(spWrap);

      state.species.forEach(function (sp) {
        var head = document.createElement("div"); head.className = "hb-sp-head";
        head.appendChild(document.createTextNode(sp + " — зичлик (дона/м²) · Ишловгача (1 м²): "));
        var bi = document.createElement("input"); bi.className = "hb-cell"; bi.inputMode = "decimal"; bi.value = state.weedBefore[sp] || "";
        bi.addEventListener("input", function () { state.weedBefore[sp] = bi.value; });
        head.appendChild(bi); box.appendChild(head);
        var tbl3 = mkTable(["Вариант"].concat(days.map(function (d) { return d + "-кун"; })));
        state.variants.forEach(function (v) {
          state.weeds[v.id] = state.weeds[v.id] || {};
          state.weeds[v.id][sp] = state.weeds[v.id][sp] || {};
          var tr = document.createElement("tr"); tr.appendChild(td(v.name));
          days.forEach(function (d) { var c = document.createElement("td"); c.appendChild(cellInput(state.weeds[v.id][sp][d], function (val) { state.weeds[v.id][sp][d] = val; })); tr.appendChild(c); });
          tbl3.body.appendChild(tr);
        });
        box.appendChild(tbl3.table);
      });
    }
  }

  // ---------- сақлаш синови (мева/сабзавот) ----------
  function renderStorage(box) {
    var dz = state.storageDiseases;
    var dWrap = document.createElement("div"); dWrap.className = "hb-species-row";
    dWrap.innerHTML = '<span class="hb-lbl">Касалликлар:</span>';
    dz.forEach(function (d, i) {
      var inp = document.createElement("input"); inp.className = "hb-inp hb-sp"; inp.value = d;
      inp.addEventListener("input", function () { state.storageDiseases[i] = inp.value; });
      dWrap.appendChild(inp);
    });
    dWrap.appendChild(btn("+ касаллик", function () { state.storageDiseases.push("Касаллик " + (dz.length + 1)); renderFieldData(); }));
    if (dz.length > 1) dWrap.appendChild(btn("− касаллик", function () { state.storageDiseases.pop(); renderFieldData(); }));
    box.appendChild(dWrap);

    var headers = ["Вариант", "Турғорлик, кг/см²", "Касалланмаган, %"];
    dz.forEach(function (d) { headers.push(d + " — даража, %"); headers.push(d + " — касал. кг"); });
    var tbl = mkTable(headers);
    state.variants.forEach(function (v) {
      state.storage[v.id] = state.storage[v.id] || { firmness: "", healthy: "", byDisease: {} };
      var s = state.storage[v.id];
      var tr = document.createElement("tr"); tr.appendChild(td(v.name));
      var fc = document.createElement("td"); fc.appendChild(cellInput(s.firmness, function (val) { s.firmness = val; })); tr.appendChild(fc);
      var hc = document.createElement("td"); hc.appendChild(cellInput(s.healthy, function (val) { s.healthy = val; })); tr.appendChild(hc);
      dz.forEach(function (d) {
        s.byDisease[d] = s.byDisease[d] || { severity: "", massLost: "" };
        var sc = document.createElement("td"); sc.appendChild(cellInput(s.byDisease[d].severity, function (val) { s.byDisease[d].severity = val; })); tr.appendChild(sc);
        var mc = document.createElement("td"); mc.appendChild(cellInput(s.byDisease[d].massLost, function (val) { s.byDisease[d].massLost = val; })); tr.appendChild(mc);
      });
      tbl.body.appendChild(tr);
    });
    box.appendChild(tbl.table);
  }

  function renderYield() {
    var box = $("yield-table"); box.innerHTML = "";
    var reps = state.yieldReps;
    var tbl = mkTable(["Вариант"].concat(Array.apply(null, { length: reps }).map(function (_, i) { return (i + 1) + "-такр."; })));
    state.variants.forEach(function (v) {
      state.yieldData[v.id] = state.yieldData[v.id] || [];
      var tr = document.createElement("tr"); tr.appendChild(td(v.name));
      for (var i = 0; i < reps; i++) (function (i) {
        var c = document.createElement("td"); c.appendChild(cellInput(state.yieldData[v.id][i], function (val) { state.yieldData[v.id][i] = val; })); tr.appendChild(c);
      })(i);
      tbl.body.appendChild(tr);
    });
    box.appendChild(tbl.table);
  }

  function td(text) { var c = document.createElement("td"); c.className = "hb-td-name"; c.textContent = text; return c; }
  function btn(text, on) { var b = document.createElement("button"); b.className = "hb-btn-sm"; b.textContent = text; b.addEventListener("click", on); return b; }
  function escAttr(s) { return String(s).replace(/"/g, "&quot;"); }
  function escHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function renderAll() { renderVariants(); renderFieldData(); renderYield(); }

  // ---------- тур аниқлаш ----------
  function updateDetect() {
    var ai = $("m_activeIngredients").value, expl = $("explicit-type").value;
    var det = window.Hisobot.detectType(ai, expl);
    state.detection = det;
    var badge = $("detect-badge");
    if (!ai && !expl) { badge.textContent = "— (таъсир этувчи моддани киритинг)"; badge.className = "hb-badge hb-badge-empty"; }
    else {
      badge.textContent = det.meta.name + (det.matched ? " · " + det.matched : "") + (det.confirm ? " · тасдиқ керак" : "");
      badge.className = "hb-badge " + (det.confirm ? "hb-badge-warn" : "hb-badge-ok");
    }
    if (!state.manualMode) {
      var m = det.meta.method;
      var mode = m === "disease" ? "disease" : (m === "weed" ? "weeds" : "counts");
      if (mode !== state.mode) { state.mode = mode; $("mode-select").value = mode; renderFieldData(); }
    }
  }

  // ---------- input қуриш ----------
  function buildInput() {
    var meta = getMeta(), days = getDays();
    // Вариант номлари ноёб бўлиши шарт (ном калит сифатида ишлатилади) — такрор бўлса суффикс қўшилади
    var nameById = {}, usedNames = {};
    state.variants.forEach(function (v) {
      var base = (v.name || "").trim() || "Вариант", nm = base, k = 2;
      while (usedNames[nm]) { nm = base + " (" + (k++) + ")"; }
      usedNames[nm] = 1; nameById[v.id] = nm;
    });
    var variants = state.variants.map(function (v) { return { name: nameById[v.id], isControl: v.isControl, isReference: v.isReference }; });
    var assessment = { days: days };
    if (state.mode === "counts") {
      var c = {};
      state.variants.forEach(function (v) {
        var cur = state.counts[v.id] || { before: "", byDay: {} }, bd = {};
        days.forEach(function (d) { var n = num(cur.byDay[d]); if (n != null) bd[d] = n; });
        c[nameById[v.id]] = { before: num(cur.before), byDay: bd };
      });
      assessment.counts = c;
    } else if (state.mode === "disease") {
      var dz = {};
      state.variants.forEach(function (v) {
        var bd = {}; days.forEach(function (d) { var n = num((state.disease[v.id] || {})[d]); if (n != null) bd[d] = n; });
        dz[nameById[v.id]] = { byDayIndex: bd };
      });
      assessment.disease = dz;
    } else if (state.mode === "storage") {
      var sdata = {}, sdis = state.storageDiseases.filter(function (s) { return s.trim(); });
      state.variants.forEach(function (v) {
        var cur = state.storage[v.id] || { firmness: "", healthy: "", byDisease: {} }, byD = {};
        sdis.forEach(function (d) { var c = (cur.byDisease || {})[d] || {}; byD[d] = { severity: num(c.severity), massLost: num(c.massLost) }; });
        sdata[nameById[v.id]] = { firmness: num(cur.firmness), healthy: num(cur.healthy), byDisease: byD };
      });
      assessment.storage = { diseases: sdis, data: sdata };
    } else {
      var density = {}, before = {};
      state.variants.forEach(function (v) {
        density[nameById[v.id]] = {};
        state.species.forEach(function (sp) {
          var bd = {}; days.forEach(function (d) { var n = num(((state.weeds[v.id] || {})[sp] || {})[d]); if (n != null) bd[d] = n; });
          density[nameById[v.id]][sp] = bd;
        });
      });
      state.species.forEach(function (sp) { var n = num(state.weedBefore[sp]); if (n != null) before[sp] = n; });
      assessment.weeds = { species: state.species.filter(function (s) { return s.trim(); }), density: density, before: before };
    }
    var yieldOut = {};
    state.variants.forEach(function (v) {
      var arr = (state.yieldData[v.id] || []).map(num).filter(function (n) { return n != null; });
      if (arr.length) yieldOut[nameById[v.id]] = arr;
    });
    return { meta: meta, explicitType: $("explicit-type").value || undefined, variants: variants, assessment: assessment, yieldData: Object.keys(yieldOut).length ? yieldOut : undefined, yieldUnit: $("yield-unit").value || "ц/га" };
  }

  // ---------- preview ----------
  function renderPreview(rep) {
    var box = $("preview"); box.style.display = "block";
    var h = '<h2 class="hb-h2">Ҳисоблаш натижаси</h2>';
    h += '<div class="hb-tags"><span class="hb-tag hb-tag-g">Тури: ' + escHtml(rep.typeNameUz) + '</span>';
    h += '<span class="hb-tag">Методика: ' + escHtml(rep.efficacyMethodLabel) + '</span>';
    h += '<span class="hb-tag">Назорат: ' + escHtml(rep.controlVariant || "—") + '</span></div>';
    if (rep.warnings.length) { h += '<ul class="hb-warnbox">'; rep.warnings.forEach(function (w) { h += '<li>' + escHtml(w) + '</li>'; }); h += '</ul>'; }
    if (rep.storage) {
      var dz = rep.storage.diseases;
      h += '<h3 class="hb-h3">Сақлаш синови натижалари</h3><div class="hb-scroll"><table class="hb-table"><thead><tr><th>Вариант</th><th>Турғорлик, кг/см²</th><th>Касалланмаган, %</th>';
      dz.forEach(function (d) { h += '<th>' + escHtml(d) + ' даража, %</th><th>' + escHtml(d) + ' самар., %</th>'; });
      h += '</tr></thead><tbody>';
      rep.storage.rows.forEach(function (r) {
        h += '<tr' + (r.isControl ? ' class="hb-ctrl"' : '') + '><td class="hb-td-name">' + escHtml(r.variant) + (r.isReference ? ' (эталон)' : '') + '</td>';
        h += '<td>' + (r.firmness == null ? "—" : r.firmness) + '</td><td><b>' + (r.healthy == null ? "—" : r.healthy) + '</b></td>';
        dz.forEach(function (d) { h += '<td>' + (r.byDisease[d].severity == null ? "—" : r.byDisease[d].severity) + '</td><td>' + (r.isControl ? "—" : (r.byDisease[d].efficacyPct == null ? "—" : r.byDisease[d].efficacyPct)) + '</td>'; });
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    } else {
      var beforeByVar = {}, hasBefore = false;
      if (rep.countRows) rep.countRows.forEach(function (cr) { beforeByVar[cr.variant] = cr.before; if (cr.before != null) hasBefore = true; });
      h += '<h3 class="hb-h3">Биологик самарадорлик, %</h3><div class="hb-scroll"><table class="hb-table"><thead><tr><th>Вариант</th>';
      if (hasBefore) h += '<th>Ишловгача</th>';
      rep.days.forEach(function (d) { h += '<th>' + d + '-кун</th>'; });
      h += '<th>Ўртача</th></tr></thead><tbody>';
      rep.efficacyRows.forEach(function (r) {
        h += '<tr' + (r.isControl ? ' class="hb-ctrl"' : '') + '><td class="hb-td-name">' + escHtml(r.variant) + (r.isReference ? ' (эталон)' : '') + '</td>';
        if (hasBefore) h += '<td>' + (beforeByVar[r.variant] == null ? "—" : beforeByVar[r.variant]) + '</td>';
        rep.days.forEach(function (d) { h += '<td>' + (r.isControl ? "—" : (r.byDay[d] == null ? "—" : r.byDay[d])) + '</td>'; });
        h += '<td><b>' + (r.isControl ? "—" : (r.mean == null ? "—" : r.mean)) + '</b></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    if (rep.yieldRows && rep.yieldRows.length) {
      h += '<h3 class="hb-h3">Ҳосилдорлик (' + (rep.yieldUnit || "") + ')</h3><div class="hb-scroll"><table class="hb-table"><thead><tr><th>Вариант</th><th>Ўртача</th><th>Назоратга нисбатан, %</th></tr></thead><tbody>';
      rep.yieldRows.forEach(function (r) { h += '<tr><td class="hb-td-name">' + escHtml(r.variant) + '</td><td>' + (r.mean == null ? "—" : r.mean) + '</td><td>' + (r.increaseVsControlPct == null ? "—" : "+" + r.increaseVsControlPct) + '</td></tr>'; });
      h += '</tbody></table></div>';
    }
    if (rep.yieldAnova) {
      var a = rep.yieldAnova;
      var fv = (a.fValue == null || !isFinite(a.fValue)) ? "—" : a.fValue;
      var concl = a.zeroError ? "хатолик дисперсияси ≈ 0 — маълумотни текширинг" : (a.significant ? "фарқ ишончли (P<0.05)" : "фарқ ишончли эмас");
      h += '<div class="hb-anova">Дисперсион таҳлил (ANOVA): НСР₀.₀₅ = ' + a.lsd05 + '; CV% = ' + a.cvPct + '; F = ' + fv + '; P = ' + a.pValue + '; ' + concl + '</div>';
    }
    box.innerHTML = h;
  }

  function setStatus(msg, kind) { var s = $("status"); s.textContent = msg || ""; s.className = "hb-status" + (kind ? " hb-status-" + kind : ""); }

  // ---------- валидация ----------
  function validate(input) {
    var msgs = [], m = input.meta, A = input.assessment;
    if (!m.preparatName) msgs.push(T("Препарат номи киритилмаган.", "Не указано название препарата."));
    if (!m.crop) msgs.push(T("Экин тури киритилмаган.", "Не указан вид культуры."));
    if (!m.targetOrganism) msgs.push(T("Зарарли организм киритилмаган.", "Не указан вредный организм."));
    if (input.variants.length < 2) msgs.push(T("Камида 2 та вариант керак.", "Требуется минимум 2 варианта."));
    if (!input.variants.some(function (v) { return v.isControl; })) msgs.push(T("Назорат варианти белгиланмаган.", "Не отмечен контрольный вариант."));
    if (!input.variants.some(function (v) { return v.isReference; })) msgs.push(T("Эталон варианти белгиланмаган (ихтиёрий).", "Не отмечен эталонный вариант (необязательно)."));
    // дала маълумотлари киритилганми
    var hasData = false;
    if (A.counts) hasData = Object.keys(A.counts).some(function (k) { var c = A.counts[k]; return c && (c.before != null || Object.keys(c.byDay || {}).length); });
    else if (A.disease) hasData = Object.keys(A.disease).some(function (k) { return Object.keys(A.disease[k].byDayIndex || {}).length; });
    else if (A.storage) hasData = Object.keys(A.storage.data || {}).some(function (k) { var s = A.storage.data[k]; return s && (s.healthy != null || s.firmness != null); });
    else if (A.weeds) hasData = Object.keys(A.weeds.density || {}).length > 0 && Object.keys(A.weeds.before || {}).length > 0;
    if (!hasData) msgs.push(T("Дала ўлчов маълумотлари киритилмаган.", "Не введены полевые данные измерений."));
    return msgs;
  }

  function doCompute() {
    setStatus(T("Ҳисобланмоқда…", "Идёт расчёт…"), "info");
    try {
      var input = buildInput();
      var vmsgs = validate(input);
      var rep = window.Hisobot.computeReport(input);
      rep.warnings = vmsgs.concat(rep.warnings || []);
      renderPreview(rep);
      setStatus(vmsgs.length ? T("Диққат: " + vmsgs.length + " та эслатма — пастга қаранг.", "Внимание: " + vmsgs.length + " замечаний — см. ниже.") : "", vmsgs.length ? "warn" : "");
    }
    catch (e) { setStatus(T("Хатолик: ", "Ошибка: ") + e.message, "err"); }
  }
  function doDownload() {
    setStatus(T("Ҳужжат яратилмоқда…", "Создаётся документ…"), "info");
    try {
      var input = buildInput(), rep = window.Hisobot.computeReport(input);
      window.Hisobot.generateDocx(rep, input.meta).then(function (blob) {
        var url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = (input.meta.preparatName || "hisobot").replace(/\s+/g, "_") + "_davlat_sinov_hisoboti.docx";
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        setStatus(T("Тайёр — ҳужжат юклаб олинди.", "Готово — документ загружен."), "ok");
      }).catch(function (e) { setStatus(T("Хатолик: ", "Ошибка: ") + e.message, "err"); });
    } catch (e) { setStatus(T("Хатолик: ", "Ошибка: ") + e.message, "err"); }
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", function () {
    if (!$("variants-list")) return; // бу саҳифа эмас
    restore();
    renderAll();
    updateDetect();
    var dbnc; $("m_activeIngredients").addEventListener("input", function () { clearTimeout(dbnc); dbnc = setTimeout(updateDetect, 350); });
    $("explicit-type").addEventListener("change", updateDetect);
    $("add-variant").addEventListener("click", function () { state.variants.push({ id: nid(), name: "Вариант " + (state.variants.length + 1), isControl: false, isReference: false }); renderAll(); persist(); });
    $("days-input").addEventListener("input", function () { renderFieldData(); });
    $("mode-select").addEventListener("change", function () { state.manualMode = true; state.mode = $("mode-select").value; renderFieldData(); persist(); });
    $("yield-reps").addEventListener("input", function () { var n = parseInt($("yield-reps").value, 10); state.yieldReps = Math.max(2, Math.min(8, isFinite(n) ? n : 4)); renderYield(); persist(); });
    $("btn-compute").addEventListener("click", doCompute);
    $("btn-download").addEventListener("click", doDownload);
    // Ҳар қандай киритиш/ўзгаришда авто-сақлаш (форма контейнери)
    var app = document.querySelector(".hb-app");
    if (app) { app.addEventListener("input", persistSoon); app.addEventListener("change", persistSoon); }
    // Тозалаш тугмаси (агар мавжуд бўлса)
    var clr = $("btn-clear");
    if (clr) clr.addEventListener("click", function () {
      var isRu = (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0;
      if (!confirm(isRu ? "Очистить все введённые данные?" : "Барча киритилган маълумотлар ўчирилсинми?")) return;
      clearSaved(); location.reload();
    });
  });
})();
