/* Ҳисобот генератори — форма контроллери (браузер).
 * hisobot.js (window.Hisobot) моторидан фойдаланади.
 */
(function () {
  "use strict";
  if (!window.Hisobot) { console.error("Hisobot мотори юкланмади"); return; }

  var META_KEYS = ["preparatName", "activeIngredients", "preparatForm", "manufacturer", "country",
    "crop", "variety", "targetOrganism", "applicationRate", "referenceName", "workingSolution",
    "site", "trialDate", "laboratory", "staff", "weather",
    "institute", "director", "reportCity", "scientificSecretary", "deputyDirector",
    "protocolNumber", "applicantOrg", "tradeName", "testEquipment",
    "applicationMethod", "experimentType", "referenceFullDesc", "labConclusion",
    "maxTreatments", "waitingPeriod", "phytotoxicity", "cropPhase", "references"];

  function $(id) { return document.getElementById(id); }
  function num(s) { if (s == null) return null; s = String(s).trim().replace(",", "."); if (s === "") return null; var v = Number(s); return isFinite(v) ? v : null; }

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
    counts: {}, disease: {}, weeds: {}, weedBefore: {}, yieldData: {}, yieldReps: 4
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
    var nameById = {}; state.variants.forEach(function (v) { nameById[v.id] = v.name; });
    var variants = state.variants.map(function (v) { return { name: v.name, isControl: v.isControl, isReference: v.isReference }; });
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
    h += '<div class="hb-tags"><span class="hb-tag hb-tag-g">Тури: ' + rep.typeNameUz + '</span>';
    h += '<span class="hb-tag">Методика: ' + rep.efficacyMethodLabel + '</span>';
    h += '<span class="hb-tag">Назорат: ' + (rep.controlVariant || "—") + '</span></div>';
    if (rep.warnings.length) { h += '<ul class="hb-warnbox">'; rep.warnings.forEach(function (w) { h += '<li>' + w + '</li>'; }); h += '</ul>'; }
    h += '<h3 class="hb-h3">Биологик самарадорлик, %</h3><div class="hb-scroll"><table class="hb-table"><thead><tr><th>Вариант</th>';
    rep.days.forEach(function (d) { h += '<th>' + d + '-кун</th>'; });
    h += '<th>Ўртача</th></tr></thead><tbody>';
    rep.efficacyRows.forEach(function (r) {
      h += '<tr' + (r.isControl ? ' class="hb-ctrl"' : '') + '><td class="hb-td-name">' + r.variant + (r.isReference ? ' (эталон)' : '') + '</td>';
      rep.days.forEach(function (d) { h += '<td>' + (r.isControl ? "—" : (r.byDay[d] == null ? "—" : r.byDay[d])) + '</td>'; });
      h += '<td><b>' + (r.isControl ? "—" : (r.mean == null ? "—" : r.mean)) + '</b></td></tr>';
    });
    h += '</tbody></table></div>';
    if (rep.yieldRows && rep.yieldRows.length) {
      h += '<h3 class="hb-h3">Ҳосилдорлик (' + (rep.yieldUnit || "") + ')</h3><div class="hb-scroll"><table class="hb-table"><thead><tr><th>Вариант</th><th>Ўртача</th><th>Назоратга нисбатан, %</th></tr></thead><tbody>';
      rep.yieldRows.forEach(function (r) { h += '<tr><td class="hb-td-name">' + r.variant + '</td><td>' + (r.mean == null ? "—" : r.mean) + '</td><td>' + (r.increaseVsControlPct == null ? "—" : "+" + r.increaseVsControlPct) + '</td></tr>'; });
      h += '</tbody></table></div>';
    }
    if (rep.yieldAnova) { var a = rep.yieldAnova; h += '<div class="hb-anova">Дисперсион таҳлил (ANOVA): НСР₀.₀₅ = ' + a.lsd05 + '; CV% = ' + a.cvPct + '; F = ' + a.fValue + '; P = ' + a.pValue + '; ' + (a.significant ? "фарқ ишончли (P<0.05)" : "фарқ ишончли эмас") + '</div>'; }
    box.innerHTML = h;
  }

  function setStatus(msg, kind) { var s = $("status"); s.textContent = msg || ""; s.className = "hb-status" + (kind ? " hb-status-" + kind : ""); }

  function doCompute() {
    setStatus("Ҳисобланмоқда…", "info");
    try { var rep = window.Hisobot.computeReport(buildInput()); renderPreview(rep); setStatus("", ""); }
    catch (e) { setStatus("Хатолик: " + e.message, "err"); }
  }
  function doDownload() {
    setStatus("Ҳужжат яратилмоқда…", "info");
    try {
      var input = buildInput(), rep = window.Hisobot.computeReport(input);
      window.Hisobot.generateDocx(rep, input.meta).then(function (blob) {
        var url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = (input.meta.preparatName || "hisobot").replace(/\s+/g, "_") + "_davlat_sinov_hisoboti.docx";
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        setStatus("Тайёр — ҳужжат юклаб олинди.", "ok");
      }).catch(function (e) { setStatus("Хатолик: " + e.message, "err"); });
    } catch (e) { setStatus("Хатолик: " + e.message, "err"); }
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", function () {
    if (!$("variants-list")) return; // бу саҳифа эмас
    renderAll();
    updateDetect();
    var dbnc; $("m_activeIngredients").addEventListener("input", function () { clearTimeout(dbnc); dbnc = setTimeout(updateDetect, 350); });
    $("explicit-type").addEventListener("change", updateDetect);
    $("add-variant").addEventListener("click", function () { state.variants.push({ id: nid(), name: "Вариант " + (state.variants.length + 1), isControl: false, isReference: false }); renderAll(); });
    $("days-input").addEventListener("input", function () { renderFieldData(); });
    $("mode-select").addEventListener("change", function () { state.manualMode = true; state.mode = $("mode-select").value; renderFieldData(); });
    $("yield-reps").addEventListener("input", function () { var n = parseInt($("yield-reps").value, 10); state.yieldReps = Math.max(2, Math.min(8, isFinite(n) ? n : 4)); renderYield(); });
    $("btn-compute").addEventListener("click", doCompute);
    $("btn-download").addEventListener("click", doDownload);
  });
})();
