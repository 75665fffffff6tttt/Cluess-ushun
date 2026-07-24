/* Ўсимликларни ҳимоя қилиш воситалари давлат синови илмий ҳисобот генератори.
 * Тўлиқ браузерда (серверсиз) ишлайди: ҳисоблаш + .docx яратиш.
 * Кутубхоналар: docx (глобал `docx`), jStat (глобал `jStat`).
 * Барча самарадорлик/статистика фойдаланувчи киритган дала ўлчовларидан ҳисобланади.
 */
(function () {
  "use strict";

  // ===================== ЁРДАМЧИ =====================
  function num(s) {
    if (s == null) return null;
    s = String(s).trim().replace(",", ".");
    if (s === "") return null;
    var v = Number(s);
    return isFinite(v) ? v : null;
  }
  function round(v, n) {
    if (v == null || !isFinite(v)) return null;
    n = n == null ? 2 : n;
    var f = Math.pow(10, n);
    return Math.round(v * f) / f;
  }
  function fmt(v, d) {
    d = d == null ? 1 : d;
    if (v == null || !isFinite(v)) return "—";
    return v.toFixed(d).replace(".", ",");
  }
  function avg(arr) {
    var xs = arr.filter(function (v) { return v != null && isFinite(v); });
    if (!xs.length) return null;
    return round(xs.reduce(function (a, b) { return a + b; }, 0) / xs.length);
  }
  function el(id) { return document.getElementById(id); }

  // ===================== САМАРАДОРЛИК =====================
  function safeDiv(a, b) { return (b === 0 || b == null) ? null : a / b; }
  function abbott(cA, tA) { var r = safeDiv(cA - tA, cA); return r == null ? null : r * 100; }
  function hendersonTilton(cB, cA, tB, tA) {
    var a = safeDiv(tA, tB), b = safeDiv(cB, cA);
    if (a == null || b == null) return null;
    return (1 - a * b) * 100;
  }
  function diseaseBioEff(cI, tI) { var r = safeDiv(cI - tI, cI); return r == null ? null : r * 100; }
  function weedBioEff(cD, tD) { var r = safeDiv(cD - tD, cD); return r == null ? null : r * 100; }

  // ===================== СТАТИСТИКА (jStat) =====================
  function anovaRcbd(data, alpha) {
    alpha = alpha || 0.05;
    var variants = Object.keys(data);
    var nV = variants.length;
    if (nV < 2) throw new Error("Камида 2 та вариант керак.");
    var lens = {};
    variants.forEach(function (v) { lens[data[v].length] = 1; });
    if (Object.keys(lens).length !== 1) throw new Error("Такрорлар сони бир хил бўлиши керак.");
    var nR = data[variants[0]].length;
    if (nR < 2) throw new Error("Камида 2 та такрор керак.");
    var matrix = variants.map(function (v) { return data[v]; });
    var all = [].concat.apply([], matrix);
    var nT = all.length;
    var grand = all.reduce(function (a, b) { return a + b; }, 0) / nT;
    var vMeans = matrix.map(function (row) { return row.reduce(function (a, b) { return a + b; }, 0) / nR; });
    var rMeans = [];
    for (var j = 0; j < nR; j++) { var s = 0; for (var i = 0; i < nV; i++) s += matrix[i][j]; rMeans.push(s / nV); }
    var ssT = all.reduce(function (a, x) { return a + Math.pow(x - grand, 2); }, 0);
    var ssTr = nR * vMeans.reduce(function (a, m) { return a + Math.pow(m - grand, 2); }, 0);
    var ssR = nV * rMeans.reduce(function (a, m) { return a + Math.pow(m - grand, 2); }, 0);
    var ssE = ssT - ssTr - ssR;
    var dfTr = nV - 1, dfR = nR - 1, dfE = dfTr * dfR;
    var msTr = dfTr ? ssTr / dfTr : 0, msE = dfE ? ssE / dfE : 0;
    var F, P;
    if (msE > 0) { F = msTr / msE; P = 1 - jStat.centralF.cdf(F, dfTr, dfE); }
    else { F = Infinity; P = 0; }
    var seMean = msE > 0 ? Math.sqrt(msE / nR) : 0;
    var seDiff = msE > 0 ? Math.sqrt(2 * msE / nR) : 0;
    var tCrit = dfE ? jStat.studentt.inv(1 - alpha / 2, dfE) : 0;
    var lsd = tCrit * seDiff;
    var cv = grand ? Math.sqrt(msE) / grand * 100 : 0;
    var prec = grand ? seMean / grand * 100 : 0;
    var vm = {};
    variants.forEach(function (v, k) { vm[v] = round(vMeans[k], 3); });
    return {
      nVariants: nV, nReps: nR, grandMean: round(grand, 3),
      lsd05: round(lsd, 2), seMean: round(seMean, 3), seDiff: round(seDiff, 3),
      cvPct: round(cv, 2), precisionPct: round(prec, 2),
      fValue: isFinite(F) ? round(F, 3) : F, pValue: round(P, 4),
      variantMeans: vm, significant: P < alpha
    };
  }

  // ===================== ТУР АНИҚЛАШ =====================
  var CYR2LAT = { "а":"a","б":"b","в":"v","г":"g","ғ":"g","д":"d","е":"e","ё":"yo","ж":"j","з":"z","и":"i","й":"y","к":"k","қ":"q","л":"l","м":"m","н":"n","о":"o","ў":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"x","ҳ":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sh","ъ":"","ы":"i","ь":"","э":"e","ю":"yu","я":"ya" };
  function normalize(t) {
    t = (t || "").toLowerCase().trim();
    var out = ""; for (var i = 0; i < t.length; i++) out += (CYR2LAT[t[i]] != null ? CYR2LAT[t[i]] : t[i]);
    out = out.replace(/[^a-z0-9\s,.-]/g, " ").replace(/\s+/g, " ");
    return out.replace(/ph/g, "f").replace(/ck/g, "k");
  }
  var ING = {
    gerbitsid: ["glyphosate","glifosat","2,4-d","mcpa","tribenuron","metribuzin","pendimethalin","clethodim","imazethapyr","nicosulfuron","metsulfuron","trifluralin","prometrin","metolachlor","clopyralid","fluazifop","dicamba","bentazone","florasulam","fluroxypyr","fluroksipir","mesotrione","diflufenican","imazamox"],
    insektitsid: ["imidacloprid","imidakloprid","thiamethoxam","acetamiprid","atsetamiprid","lambda","cypermethrin","tsipermetrin","chlorpyrifos","xlorpirifos","deltamethrin","deltametrin","emamectin","spinosad","indoxacarb","malathion","malation","dimethoate","dimetoat","bifenthrin","pirimiphos","lufenuron","fipronil"],
    fungitsid: ["tebuconazole","tebukonazol","azoxystrobin","azoksistrobin","mancozeb","mankotseb","propiconazole","propikonazol","difenoconazole","difenokonazol","carbendazim","karbendazim","cymoxanil","metalaxyl","metalaksil","copper","mis","sulfur","oltingugurt","hexaconazole","flutriafol"],
    akaritsid: ["abamectin","abamektin","propargite","propargit","fenpyroximate","spirodiclofen","hexythiazox","etoxazole","pyridaben"],
    nematitsid: ["fosthiazate","oxamyl","fenamiphos","cadusafos"],
    rodentitsid: ["bromadiolone","bromadiolon","brodifacoum","zinc phosphide","difenacoum"],
    defoliant: ["thidiazuron","tidiazuron","tribufos","dropp","magniy xlorati"],
    desikant: ["diquat","dikvat","glufosinate","natriy xlorati"],
    biopreparat: ["bacillus","trichoderma","trixoderma","beauveria","boverin","metarhizium","pseudomonas"]
  };
  var TMETA = {
    gerbitsid: { name: "Гербицид", method: "weed", days: [15, 30, 45, 60] },
    insektitsid: { name: "Инсектицид", method: "henderson_tilton", days: [3, 7, 14, 21, 30] },
    fungitsid: { name: "Фунгицид", method: "disease", days: [7, 14, 21, 30] },
    akaritsid: { name: "Акарицид", method: "henderson_tilton", days: [3, 7, 14, 21, 30] },
    nematitsid: { name: "Нематицид", method: "population", days: [14, 30, 45, 60] },
    rodentitsid: { name: "Родентицид", method: "population", days: [3, 7, 14, 30] },
    defoliant: { name: "Дефолиант", method: "defoliation", days: [7, 14, 21] },
    desikant: { name: "Десикант", method: "defoliation", days: [3, 7, 14] },
    biopreparat: { name: "Биопрепарат", method: "henderson_tilton", days: [3, 7, 14, 21, 30] },
    unknown: { name: "Аниқланмаган", method: "population", days: [7, 14, 21, 30] }
  };
  var TALIAS = { "гербицид":"gerbitsid","инсектицид":"insektitsid","фунгицид":"fungitsid","акарицид":"akaritsid","нематицид":"nematitsid","родентицид":"rodentitsid","дефолиант":"defoliant","десикант":"desikant","биопрепарат":"biopreparat" };
  function detectType(ai, explicit) {
    if (explicit) {
      var k = TALIAS[explicit.toLowerCase()] || explicit.toLowerCase();
      if (TMETA[k] && k !== "unknown") return { key: k, meta: TMETA[k], matched: null, confirm: false };
    }
    var norm = normalize(ai);
    if (!norm) return { key: "unknown", meta: TMETA.unknown, matched: null, confirm: true };
    for (var t in ING) {
      for (var i = 0; i < ING[t].length; i++) {
        var ing = ING[t][i].replace(/ph/g, "f").replace(/ck/g, "k");
        if (norm.indexOf(ing) >= 0) return { key: t, meta: TMETA[t], matched: ING[t][i], confirm: false };
      }
    }
    return { key: "unknown", meta: TMETA.unknown, matched: null, confirm: true };
  }

  var METHOD_LABELS = {
    henderson_tilton: "Henderson–Tilton (1955)",
    abbott: "Abbott (1925)",
    disease: "Касаллик ривожланиш индекси бўйича (EPPO / давлат методикаси)",
    weed: "Бегона ўтлар зичлиги бўйича (давлат гербицид синов методикаси)",
    population: "Популяция камайиши бўйича",
    defoliation: "Барг тўкилиши / қуриш даражаси бўйича",
    storage_scale: "Касаллик ривожланиш даражаси шкаласи бўйича (сақлаш синови методикаси)"
  };

  // ===================== ҲИСОБЛАШ ОРКЕСТРАТОРИ =====================
  function findControl(input) {
    var c = input.variants.filter(function (v) { return v.isControl; })[0];
    if (c) return c.name;
    var n = input.variants.filter(function (v) { return /назорат|контрол|control|ишловсиз/i.test(v.name); })[0];
    return n ? n.name : null;
  }

  function computeReport(input) {
    var warnings = [];
    var det = detectType(input.meta.activeIngredients, input.explicitType);
    var days = input.assessment.days.slice().sort(function (a, b) { return a - b; });
    var control = findControl(input);
    if (!control) warnings.push("Назорат (ишловсиз) варианти аниқланмади — камида битта вариантни назорат деб белгиланг.");

    var efficacyRows = [], countRows = null, methodKey = det.meta.method, detailed = null, organisms = null, storage = null;
    var A = input.assessment;

    if (A.counts) {
      countRows = input.variants.map(function (v) {
        var c = A.counts[v.name] || { before: null, byDay: {} };
        var bd = {}; days.forEach(function (d) { bd[d] = c.byDay[d] != null ? c.byDay[d] : null; });
        return { variant: v.name, isControl: !!v.isControl || v.name === control, before: c.before != null ? c.before : null, byDay: bd };
      });
      var ctrl = control ? A.counts[control] : null;
      var useHT = ctrl && ctrl.before != null && input.variants.some(function (v) { return v.name !== control && A.counts[v.name] && A.counts[v.name].before != null; });
      methodKey = useHT ? "henderson_tilton" : "abbott";
      input.variants.forEach(function (v) {
        var isC = !!v.isControl || v.name === control, c = A.counts[v.name], bd = {};
        days.forEach(function (d) {
          if (isC) { bd[d] = null; return; }
          var tA = c && c.byDay[d] != null ? c.byDay[d] : null, cA = ctrl && ctrl.byDay[d] != null ? ctrl.byDay[d] : null, eff = null;
          if (useHT && c && c.before != null && ctrl && ctrl.before != null) { if (tA != null && cA != null) eff = hendersonTilton(ctrl.before, cA, c.before, tA); }
          else if (cA != null && tA != null) eff = abbott(cA, tA);
          bd[d] = round(eff);
        });
        efficacyRows.push({ variant: v.name, isControl: isC, isReference: !!v.isReference, byDay: bd, mean: isC ? null : avg(days.map(function (d) { return bd[d]; })) });
      });
    } else if (A.disease) {
      methodKey = "disease";
      var dctrl = control ? A.disease[control] : null;
      input.variants.forEach(function (v) {
        var isC = !!v.isControl || v.name === control, d1 = A.disease[v.name], bd = {};
        days.forEach(function (d) {
          if (isC) { bd[d] = null; return; }
          var ci = dctrl && dctrl.byDayIndex[d] != null ? dctrl.byDayIndex[d] : null, ti = d1 && d1.byDayIndex[d] != null ? d1.byDayIndex[d] : null;
          bd[d] = (ci != null && ti != null) ? round(diseaseBioEff(ci, ti)) : null;
        });
        efficacyRows.push({ variant: v.name, isControl: isC, isReference: !!v.isReference, byDay: bd, mean: isC ? null : avg(days.map(function (d) { return bd[d]; })) });
      });
    } else if (A.weeds) {
      methodKey = "weed";
      var W = A.weeds, spp = W.species.filter(function (s) { return s.trim(); });
      function dens(varn, sp, day) { return (W.density[varn] && W.density[varn][sp] && W.density[varn][sp][day] != null) ? W.density[varn][sp][day] : null; }
      input.variants.forEach(function (v) {
        var isC = !!v.isControl || v.name === control, bd = {};
        days.forEach(function (d) {
          if (isC) { bd[d] = null; return; }
          var cd = 0, td = 0, any = false;
          spp.forEach(function (sp) { var c = control ? dens(control, sp, d) : null, t = dens(v.name, sp, d); if (c != null && t != null) { cd += c; td += t; any = true; } });
          bd[d] = any ? round(weedBioEff(cd, td)) : null;
        });
        efficacyRows.push({ variant: v.name, isControl: isC, isReference: !!v.isReference, byDay: bd, mean: isC ? null : avg(days.map(function (d) { return bd[d]; })) });
      });
      // батафсил жадвал
      var nonControl = input.variants.filter(function (v) { return !(v.isControl || v.name === control); })
        .sort(function (a, b) { return (b.isReference ? 1 : 0) - (a.isReference ? 1 : 0); })
        .map(function (v) { return v.name; });
      var periods = days.map(function (day) {
        var rows = spp.map(function (sp) {
          var cD = control ? dens(control, sp, day) : null, bv = {};
          nonControl.forEach(function (nv) { var d = dens(nv, sp, day); bv[nv] = { density: d, pct: (cD != null && d != null) ? round(weedBioEff(cD, d)) : null }; });
          return { organism: sp, before: (W.before && W.before[sp] != null) ? W.before[sp] : null, control: cD, byVariant: bv };
        });
        var meanRow = { organism: "ўртача", before: avg(rows.map(function (r) { return r.before; })), control: avg(rows.map(function (r) { return r.control; })), byVariant: {} };
        nonControl.forEach(function (nv) { meanRow.byVariant[nv] = { density: avg(rows.map(function (r) { return r.byVariant[nv].density; })), pct: avg(rows.map(function (r) { return r.byVariant[nv].pct; })) }; });
        return { day: day, rows: rows, meanRow: meanRow };
      });
      var overall = { organism: "ўртача " + periods.length + "-ҳисоб", before: avg(periods.map(function (p) { return p.meanRow.before; })), control: avg(periods.map(function (p) { return p.meanRow.control; })), byVariant: {} };
      nonControl.forEach(function (nv) { overall.byVariant[nv] = { density: avg(periods.map(function (p) { return p.meanRow.byVariant[nv].density; })), pct: avg(periods.map(function (p) { return p.meanRow.byVariant[nv].pct; })) }; });
      detailed = { unit: "дона/м²", nonControlVariants: nonControl, controlVariant: control, periods: periods, overallMeanRow: overall };
      organisms = spp.map(function (s) { return { name: s, before: (W.before && W.before[s] != null) ? W.before[s] : null }; });
    } else if (A.storage) {
      // Мева/сабзавот сақлаш синови: турғорлик, касалланмаган %, касаллик даражаси/оғирлиги
      methodKey = "storage_scale";
      var S = A.storage, diseases = S.diseases.filter(function (d) { return d.trim(); });
      var ctrlS = control ? S.data[control] : null;
      var srows = input.variants.map(function (v) {
        var d = S.data[v.name] || { firmness: null, healthy: null, byDisease: {} };
        var isC = !!v.isControl || v.name === control, perD = {};
        diseases.forEach(function (dis) {
          var cur = d.byDisease[dis] || { severity: null, massLost: null };
          var ctrlSev = (ctrlS && ctrlS.byDisease[dis]) ? ctrlS.byDisease[dis].severity : null;
          var eff = (!isC && ctrlSev != null && ctrlSev > 0 && cur.severity != null) ? round((ctrlSev - cur.severity) / ctrlSev * 100) : null;
          perD[dis] = { severity: cur.severity, massLost: cur.massLost, efficacyPct: eff };
        });
        return { variant: v.name, isControl: isC, isReference: !!v.isReference, firmness: d.firmness, healthy: d.healthy, byDisease: perD };
      });
      storage = { diseases: diseases, rows: srows, controlVariant: control };
      // энг яхши вариантни аниқлаш учун efficacyRows (mean = касалланмаган %)
      srows.forEach(function (r) { efficacyRows.push({ variant: r.variant, isControl: r.isControl, isReference: r.isReference, byDay: {}, mean: r.isControl ? null : r.healthy }); });
      days = [];
    } else {
      warnings.push("Дала ҳисоблари киритилмаган — самарадорлик жадвали бўш.");
    }

    // ҳосилдорлик
    var yieldRows = null, yieldAnova = null;
    if (input.yieldData && Object.keys(input.yieldData).length) {
      var yc = control ? input.yieldData[control] : null;
      var cMean = yc && yc.length ? yc.reduce(function (a, b) { return a + b; }, 0) / yc.length : null;
      yieldRows = input.variants.filter(function (v) { return input.yieldData[v.name] && input.yieldData[v.name].length; }).map(function (v) {
        var reps = input.yieldData[v.name], m = reps.reduce(function (a, b) { return a + b; }, 0) / reps.length, isC = !!v.isControl || v.name === control;
        return { variant: v.name, isControl: isC, mean: round(m), reps: reps, increaseVsControlPct: (!isC && cMean != null) ? round((m - cMean) / cMean * 100) : null };
      });
      var lens2 = {}; Object.keys(input.yieldData).forEach(function (k) { if (input.yieldData[k].length) lens2[input.yieldData[k].length] = 1; });
      if (Object.keys(lens2).length === 1 && Number(Object.keys(lens2)[0]) >= 2) {
        try { yieldAnova = anovaRcbd(input.yieldData); } catch (e) { warnings.push("Ҳосилдорлик ANOVA: " + e.message); }
      } else if (Object.keys(input.yieldData).length >= 2) { warnings.push("ANOVA учун ҳар вариантда бир хил (≥2) такрор керак."); }
    }

    return {
      typeKey: det.key, typeNameUz: det.meta.name, detection: det, days: days, controlVariant: control,
      countRows: countRows, efficacyRows: efficacyRows, efficacyMethodLabel: METHOD_LABELS[methodKey] || methodKey,
      detailed: detailed, organisms: organisms, storage: storage, yieldRows: yieldRows, yieldUnit: input.yieldUnit, yieldAnova: yieldAnova, warnings: warnings
    };
  }

  // ===================== ГРАФИК (SVG → PNG) =====================
  function svgEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function barSvg(title, labels, values, maxY) {
    var W = 720, H = 400, pl = 55, pr = 20, pt = 46, pb = 50, aw = W - pl - pr, ah = H - pt - pb;
    maxY = maxY || 100; var n = labels.length, slot = aw / n, bw = slot * 0.55, parts = [];
    parts.push('<rect width="' + W + '" height="' + H + '" fill="#fff"/>');
    parts.push('<text x="' + (W / 2) + '" y="26" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle">' + svgEsc(title) + '</text>');
    for (var t = 0; t <= 5; t++) { var yv = maxY * t / 5, y = pt + ah - (yv / maxY) * ah; parts.push('<line x1="' + pl + '" y1="' + y + '" x2="' + (W - pr) + '" y2="' + y + '" stroke="#e0e0e0"/>'); parts.push('<text x="' + (pl - 6) + '" y="' + (y + 4) + '" font-family="Arial" font-size="12" text-anchor="end" fill="#555">' + Math.round(yv) + '</text>'); }
    labels.forEach(function (lb, i) { var v = values[i], cx = pl + slot * i + slot / 2; if (v != null) { var bh = Math.max(0, v) / maxY * ah, y = pt + ah - bh; parts.push('<rect x="' + (cx - bw / 2) + '" y="' + y + '" width="' + bw + '" height="' + bh + '" fill="#2e7d32"/>'); parts.push('<text x="' + cx + '" y="' + (y - 5) + '" font-family="Arial" font-size="12" text-anchor="middle">' + v.toFixed(1) + '</text>'); } parts.push('<text x="' + cx + '" y="' + (pt + ah + 18) + '" font-family="Arial" font-size="11" text-anchor="middle">' + svgEsc(lb) + '</text>'); });
    parts.push('<line x1="' + pl + '" y1="' + (pt + ah) + '" x2="' + (W - pr) + '" y2="' + (pt + ah) + '" stroke="#333"/>');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' + parts.join("") + '</svg>';
  }
  function svgToPng(svg) {
    return new Promise(function (resolve) {
      var img = new Image();
      var svg64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
      img.onload = function () {
        var c = document.createElement("canvas"); c.width = 720; c.height = 400;
        var ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 720, 400); ctx.drawImage(img, 0, 0);
        var b64 = c.toDataURL("image/png").split(",")[1];
        var bin = atob(b64), arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(arr);
      };
      img.onerror = function () { resolve(null); };
      img.src = svg64;
    });
  }

  // ===================== .DOCX ЯРАТИШ =====================
  // Расмий шаблон (Flurog_40) бўйича: Times New Roman 14 pt (size 28),
  // асосий матн икки томонга текисланган (justify), сатр оралиғи 1,5.
  var D = null; // docx global
  var FONT = "Times New Roman";
  var BODY = 28;   // 14 pt — асосий матн
  var TBL = 24;    // 12 pt — жадвал катаклари
  var HEAD = 28;   // 14 pt — бўлим сарлавҳалари
  var LINE = 360;  // 1,5 сатр оралиғи

  function P(text, o) {
    o = o || {};
    // асосий матн бандлари икки томонга текисланади; марказ/ўнг талаб қилинса — берилади
    var align = o.align || (o.indent ? "both" : "left");
    return new D.Paragraph({ alignment: align, spacing: { before: o.before || 0, after: o.after == null ? 120 : o.after, line: o.line || LINE }, indent: o.indent ? { firstLine: 709 } : undefined,
      children: [new D.TextRun({ text: text, bold: o.bold, italics: o.italics, font: FONT, size: o.size || BODY })] });
  }
  function H(text) { return new D.Paragraph({ alignment: "center", spacing: { before: 260, after: 160 }, keepNext: true, children: [new D.TextRun({ text: text, bold: true, font: FONT, size: HEAD })] }); }
  function FLD(nnum, label, value) { return new D.Paragraph({ alignment: "both", spacing: { after: 80, line: LINE }, children: [new D.TextRun({ text: nnum + " " + label + " – ", font: FONT, size: BODY }), new D.TextRun({ text: value || "—", bold: true, font: FONT, size: BODY })] }); }
  function CELL(text, o) {
    o = o || {};
    var b = { top: { style: "single", size: 4, color: "000000" }, bottom: { style: "single", size: 4, color: "000000" }, left: { style: "single", size: 4, color: "000000" }, right: { style: "single", size: 4, color: "000000" } };
    var mg = o.compact ? { top: 20, bottom: 20, left: 50, right: 50 } : { top: 40, bottom: 40, left: 80, right: 80 };
    // Жадвал катакларида фон ранги ишлатилмайди (оқ фон)
    return new D.TableCell({ borders: b, width: o.width ? { size: o.width, type: "dxa" } : undefined, columnSpan: o.colSpan, rowSpan: o.rowSpan, verticalAlign: "center", margins: mg,
      children: [new D.Paragraph({ alignment: o.align || "center", spacing: { after: 0, line: o.compact ? 200 : 240 }, children: [new D.TextRun({ text: text, bold: o.bold, font: FONT, size: o.size || TBL })] })] });
  }
  var TBORDERS = {
    top: { style: "single", size: 4, color: "000000" }, bottom: { style: "single", size: 4, color: "000000" },
    left: { style: "single", size: 4, color: "000000" }, right: { style: "single", size: 4, color: "000000" },
    insideHorizontal: { style: "single", size: 4, color: "000000" }, insideVertical: { style: "single", size: 4, color: "000000" }
  };
  function TABLE(rows) { return new D.Table({ width: { size: 100, type: "pct" }, borders: TBORDERS, rows: rows }); }
  function IMG(u8, w, h) { return new D.Paragraph({ alignment: "center", spacing: { before: 100, after: 140 }, children: [new D.ImageRun({ type: "png", data: u8, transformation: { width: w || 540, height: h || 300 } })] }); }
  function CAP(text) { return new D.Paragraph({ alignment: "center", spacing: { after: 160 }, children: [new D.TextRun({ text: text, italics: true, font: FONT, size: TBL })] }); }
  // Мундарижа қатори — нуқтали чизиқ (dot leader) ва ўнгда бет рақами
  function TOCLINE(text, page) {
    return new D.Paragraph({
      tabStops: [{ type: "right", position: 9600, leader: "dot" }],
      spacing: { after: 60, line: 276 },
      children: [new D.TextRun({ text: text, font: FONT, size: BODY }), new D.TextRun({ text: "\t" + (page || ""), font: FONT, size: BODY })]
    });
  }

  function detailTable(rep) {
    var d = rep.detailed, nv = d.nonControlVariants, rows = [];
    var h1 = [CELL("Организм", { bold: true, shade: "e8e8e8", rowSpan: 2, align: "left" }), CELL("Ишловгача, 1 м²", { bold: true, shade: "e8e8e8", rowSpan: 2 }), CELL("Назорат, 1 м²", { bold: true, shade: "e8e8e8", rowSpan: 2 })];
    nv.forEach(function (name) { h1.push(CELL(name, { bold: true, shade: "e8e8e8", colSpan: 2 })); });
    rows.push(new D.TableRow({ tableHeader: true, children: h1 }));
    var h2 = []; nv.forEach(function () { h2.push(CELL(d.unit, { bold: true, shade: "f0f0f0" })); h2.push(CELL("%", { bold: true, shade: "f0f0f0" })); });
    rows.push(new D.TableRow({ tableHeader: true, children: h2 }));
    var totalCols = 3 + nv.length * 2;
    function rowFor(r, bold) {
      var c = [CELL(r.organism, { align: "left", bold: bold }), CELL(fmt(r.before, 1), { bold: bold }), CELL(fmt(r.control, 1), { bold: bold })];
      nv.forEach(function (name) { c.push(CELL(fmt(r.byVariant[name].density, 1), { bold: bold })); c.push(CELL(fmt(r.byVariant[name].pct, 1), { bold: bold })); });
      return new D.TableRow({ children: c });
    }
    d.periods.forEach(function (per) {
      rows.push(new D.TableRow({ children: [CELL(per.day + " кундан кейин", { bold: true, shade: "f7f7f7", colSpan: totalCols, align: "left" })] }));
      per.rows.forEach(function (r) { rows.push(rowFor(r, false)); });
      rows.push(rowFor(per.meanRow, true));
    });
    rows.push(rowFor(d.overallMeanRow, true));
    return TABLE(rows);
  }
  function effTable(rep) {
    var rows = [];
    var h = [CELL("Вариант", { bold: true, shade: "e8e8e8", align: "left" })];
    rep.days.forEach(function (dd) { h.push(CELL(dd + "-кун, %", { bold: true, shade: "e8e8e8" })); });
    h.push(CELL("Ўртача, %", { bold: true, shade: "e8e8e8" }));
    rows.push(new D.TableRow({ tableHeader: true, children: h }));
    rep.efficacyRows.forEach(function (r) {
      var c = [CELL(r.variant + (r.isReference ? " (андоза)" : ""), { align: "left", bold: r.isControl })];
      rep.days.forEach(function (dd) { c.push(CELL(r.isControl ? "—" : fmt(r.byDay[dd], 1))); });
      c.push(CELL(r.isControl ? "—" : fmt(r.mean, 1), { bold: true }));
      rows.push(new D.TableRow({ children: c }));
    });
    return TABLE(rows);
  }

  // Сақлаш синови жадваллари (1-жадвал: турғорлик/касалланиш даражаси; 2-жадвал: касалланган оғирлик)
  function storageTables(ch, rep, meta) {
    var st = rep.storage, dis = st.diseases, rows = st.rows;
    function tedModda(r) { return r.isControl ? "—" : (r.isReference ? (meta.referenceFullDesc || meta.referenceName || "андоза") : meta.activeIngredients); }
    // 1-жадвал
    ch.push(P("1-жадвал", { align: "right", size: TBL, after: 40 }),
      P(meta.crop + " маҳсулотини сақлашда " + meta.preparatName + " препаратининг самарадорлиги (турғорлик ва касалланиш даражаси)", { bold: true, align: "center", size: BODY }));
    var h1 = [CELL("Вариантлар", { bold: true, shade: "e8e8e8", align: "left" }), CELL("Таъсир этувчи моддаси", { bold: true, shade: "e8e8e8" }), CELL("Мевалар турғорлиги, кг/см²", { bold: true, shade: "e8e8e8" }), CELL("Касалланмаган мевалар, %", { bold: true, shade: "e8e8e8" })];
    dis.forEach(function (d) { h1.push(CELL("Касалланиш даражаси, % (" + d + ")", { bold: true, shade: "e8e8e8" })); });
    var r1 = [new D.TableRow({ tableHeader: true, children: h1 })];
    rows.forEach(function (r) {
      var c = [CELL(r.variant + (r.isReference ? " (андоза)" : (r.isControl ? " (назорат)" : "")), { align: "left", bold: r.isControl }), CELL(tedModda(r), { size: 18 }), CELL(fmt(r.firmness, 2)), CELL(fmt(r.healthy, 1))];
      dis.forEach(function (d) { c.push(CELL(fmt(r.byDisease[d].severity, 1))); });
      r1.push(new D.TableRow({ children: c }));
    });
    ch.push(TABLE(r1));
    // 2-жадвал — касалланган мевалар оғирлиги
    ch.push(P("", { after: 120 }), P("2-жадвал", { align: "right", size: TBL, after: 40 }),
      P(meta.crop + " маҳсулотини сақлашда касалланган мевалар оғирлиги ва биологик самарадорлик", { bold: true, align: "center", size: BODY }));
    var h2 = [CELL("Вариантлар", { bold: true, shade: "e8e8e8", align: "left" })];
    dis.forEach(function (d) { h2.push(CELL("Касалланган мевалар, кг (" + d + ")", { bold: true, shade: "e8e8e8" })); h2.push(CELL("Самарадорлик, % (" + d + ")", { bold: true, shade: "e8e8e8" })); });
    var r2 = [new D.TableRow({ tableHeader: true, children: h2 })];
    rows.forEach(function (r) {
      var c = [CELL(r.variant + (r.isReference ? " (андоза)" : (r.isControl ? " (назорат)" : "")), { align: "left", bold: r.isControl })];
      dis.forEach(function (d) { c.push(CELL(fmt(r.byDisease[d].massLost, 2))); c.push(CELL(r.isControl ? "—" : fmt(r.byDisease[d].efficacyPct, 1))); });
      r2.push(new D.TableRow({ children: c }));
    });
    ch.push(TABLE(r2));
  }

  function bestNonControl(rep) {
    if (!rep.detailed) return "";
    var best = rep.detailed.nonControlVariants[0] || "", bp = -Infinity;
    rep.detailed.nonControlVariants.forEach(function (nv) { var pct = rep.detailed.overallMeanRow.byVariant[nv].pct; if (pct != null && pct > bp) { bp = pct; best = nv; } });
    return best;
  }

  function buildReport(rep, meta) {
    D = window.docx;
    var ch = [], institute = meta.institute || "ЎСИМЛИКЛАР КАРАНТИНИ ВА ҲИМОЯСИ ИЛМИЙ-ТАДҚИҚОТ ИНСТИТУТИ";
    var nonControl = rep.detailed ? rep.detailed.nonControlVariants : [];
    var overallBest = rep.detailed ? rep.detailed.overallMeanRow.byVariant[bestNonControl(rep)].pct : (rep.efficacyRows.filter(function (r) { return !r.isControl && r.mean != null; }).sort(function (a, b) { return (b.mean || 0) - (a.mean || 0); })[0] || {}).mean;

    // ===== Титул варағи (расмий шаблон бўйича) =====
    var city = (meta.reportCity && meta.reportCity.trim()) || "Тошкент";
    var staffList = (meta.staff || "").split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    ch.push(P(meta.committee || "ЎЗБЕКИСТОН РЕСПУБЛИКАСИ ОЗИҚ-ОВҚАТ МАҲСУЛОТЛАРИ ХАВФСИЗЛИГИ ҚЎМИТАСИ", { align: "center", bold: true, after: 60 }),
      P("ЎСИМЛИКЛАР КАРАНТИНИ ВА ҲИМОЯСИ АГЕНТЛИГИ", { align: "center", bold: true, after: 60 }),
      P(institute, { align: "center", bold: true, after: 360 }),
      // Тасдиқлаш блоки — марказда (шаблондагидек)
      P("«ТАСДИҚЛАЙМАН»", { align: "center", bold: true, after: 40 }),
      P(institute + " директори", { align: "center", after: 40 }),
      P("________________ " + (meta.director || "____________"), { align: "center", after: 40 }),
      P("«___»__________ 2026 йил", { align: "center", after: 500 }),
      P("ИЛМИЙ ҲИСОБОТ", { align: "center", bold: true, size: 32, after: 260 }),
      P(meta.crop + " экинида " + meta.targetOrganism + "га қарши " + meta.preparatName + " препаратининг биологик самарадорлигини рўйхатга олиш учун синов натижалари", { align: "center", after: 600 }));
    // Маъсул ижрочи / Ижрочилар
    if (staffList.length) {
      ch.push(new D.Table({
        width: { size: 100, type: "pct" },
        borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
        columnWidths: [3000, 6600],
        rows: [
          new D.TableRow({ children: [
            new D.TableCell({ borders: {}, verticalAlign: "top", children: [P("Маъсул ижрочи:", { after: 0 })] }),
            new D.TableCell({ borders: {}, verticalAlign: "top", children: [P(staffList[0], { after: 0 })] })
          ] }),
          new D.TableRow({ children: [
            new D.TableCell({ borders: {}, verticalAlign: "top", children: [P(staffList.length > 1 ? "Ижрочилар:" : "", { after: 0 })] }),
            new D.TableCell({ borders: {}, verticalAlign: "top", children: staffList.slice(1).map(function (s) { return P(s, { after: 0 }); }) })
          ] })
        ]
      }));
    }
    ch.push(P(city + " – 2026 й.", { align: "center", bold: true, before: 300, after: 400 }),
      P(institute + " илмий кенгашида №___-сонли баённома, «___»________ 2026 йилда кўриб чиқилди.", { align: "center", after: 200 }),
      P("Илмий котиб, қ.х.ф.д.                                        " + (meta.scientificSecretary || "____________"), { align: "center" }),
      new D.Paragraph({ children: [new D.PageBreak()] }));

    // ===== Мундарижа (нуқтали чизиқ + бет рақами) =====
    ch.push(P("МУНДАРИЖА", { align: "center", bold: true, size: HEAD, after: 200 }));
    var toc = [
      ["Кириш", "4"], ["1. Адабиётлар шарҳи", "4"], ["2. Синов баённомаси", "5"],
      ["3. Синов ўтказиш жойи ва услублари (методикаси)", "6"], ["4. Тажриба (тадқиқот) натижалари", "7"],
      ["5. Хулоса ва тавсиялар", "8"], ["6. Фойдаланилган адабиётлар рўйхати", "9"], ["7. Синов якуни бўйича хулоса ва тавсиялар", "10"]
    ];
    toc.forEach(function (t) { ch.push(TOCLINE(t[0], t[1])); });
    ch.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    // 1. Кириш (тахминан 1 бет)
    var org = meta.targetOrganism, crop = meta.crop, prep = meta.preparatName, ai = meta.activeIngredients;
    var tl = rep.typeNameUz.toLowerCase();
    ch.push(H("КИРИШ"),
      P("Жаҳон миқёсида аҳолини озиқ-овқат маҳсулотлари билан барқарор таъминлаш ва қишлоқ хўжалиги ишлаб чиқаришини ривожлантириш бугунги куннинг устувор вазифаларидан биридир. Дунё аҳолисининг тобора ортиб бориши шароитида мавжуд ер, сув ва меҳнат ресурсларидан оқилона фойдаланиб, экин майдони бирлигидан олинадиган ҳосил миқдорини ошириш ҳамда унинг сифатини яхшилаш долзарб аҳамият касб этмоқда. Ўзбекистон Республикасида ҳам қишлоқ хўжалигини интенсив ривожлантириш, соҳага илм-фан ютуқлари ва замонавий агротехнологияларни жорий этишга алоҳида эътибор қаратилмоқда.", { indent: true }),
      P(crop + " экини республика деҳқончилигида муҳим ўрин тутади ва аҳолининг озиқ-овқатга бўлган эҳтиёжини қондиришда, шунингдек саноат хомашёсини таъминлашда стратегик аҳамиятга эга. Ушбу экиндан юқори ва барқарор ҳосил олиш кўп жиҳатдан агротехник тадбирларнинг сифати ҳамда ўсимликни зарарли организмлардан ўз вақтида ва самарали ҳимоя қилишга боғлиқ.", { indent: true }),
      P("Экин ҳосилдорлигини камайтирувчи асосий омиллардан бири — " + org + " ҳисобланади. Жаҳон ва маҳаллий тадқиқотларда қайд этилишича, ушбу зарарли организмлар назорат қилинмаган ҳолда сезиларли ҳосил нобудгарчилигига (айрим ҳолларда умумий ҳосилнинг 20–50% гача) олиб келиши, шунингдек маҳсулот сифатини пасайтириши мумкин. Зарарли организмлар нафақат тўғридан-тўғри зарар етказади, балки касаллик тарқатувчи ва экологик мувозанатни бузувчи омил сифатида ҳам намоён бўлади.", { indent: true }),
      P("Зарарли организмларга қарши курашда механик, агротехник, биологик ва кимёвий усуллар мажмуасидан фойдаланилади. Интеграллашган ҳимоя тизимида кимёвий усул — ўсимликларни ҳимоя қилиш воситаларини қўллаш — ўзининг тезкорлиги, юқори самарадорлиги ва катта майдонларда қўллаш имконияти билан алоҳида ўрин тутади. Айни вақтда кимёвий воситаларни танлаб, мақбул меъёр ва муддатларда, атроф-муҳит ҳамда фойдали организмларга зарар етказмаган ҳолда қўллаш талаб этилади.", { indent: true }),
      P("Ҳозирги кунда илмий асосланган, юқори биологик самарали, кам сарф меъёрида қўлланиладиган ва экологик хавфсиз препаратларни ишлаб чиқариш ҳамда амалиётга жорий этиш муҳим вазифа ҳисобланади. Ҳар қандай янги восита Давлат рўйхатига киритилишидан аввал белгиланган методикалар асосида давлат синовидан ўтказилиши, унинг биологик самарадорлиги, танланувчанлиги ва хавфсизлиги маҳаллий тупроқ-иқлим шароитида текширилиши шарт.", { indent: true }),
      P("Мазкур илмий ҳисобот " + prep + " (таъсир этувчи модда – " + ai + ") препаратининг " + tl + " сифатида " + crop + " экинида " + org + "га қарши биологик самарадорлигини давлат синови методикаси асосида аниқлашга бағишланган. Тадқиқотнинг асосий мақсади — препаратнинг " + meta.applicationRate + " сарф меъёридаги самарадорлигини баҳолаш, уни эталон (андоза) " + meta.referenceName + " билан таққослаш, ҳосилдорликка таъсирини ўрганиш ва Давлат рўйхатига киритиш бўйича асосланган хулоса тайёрлашдан иборат. Синов " + meta.site + "да, " + crop + " экинининг «" + (meta.variety || "—") + "» навида ўтказилди.", { indent: true }),
      P("Тадқиқот натижалари олинган восита бўйича амалий тавсиялар ишлаб чиқиш, ҳимоя тадбирларини илмий асослаш ва минтақа деҳқончилигида барқарор ҳосил етиштиришни таъминлаш нуқтаи назаридан илмий ва амалий аҳамиятга эга.", { indent: true }));

    // 2. Адабиётлар шарҳи (халқаро адабиётлар таҳлили)
    ch.push(H("1. Адабиётлар шарҳи"),
      P("Ўсимликларни ҳимоя қилиш воситаларининг биологик самарадорлигини баҳолаш халқаро миқёсда стандартлаштирилган методикаларга асосланади. Европа ва Ўрта ер денгизи ўсимликларни ҳимоя қилиш ташкилоти (EPPO) нинг PP1 туркумидаги стандартлари, БМТнинг Озиқ-овқат ва қишлоқ хўжалиги ташкилоти (FAO) ҳамда Иқтисодий ҳамкорлик ва тараққиёт ташкилоти (OECD) нинг йўриқномалари синов дизайни, ҳисоб-китоб усуллари ва натижаларни талқин қилишда ягона ёндашувни белгилайди [1, 2].", { indent: true }),
      P("Самарадорликни ҳисоблашда халқаро амалиётда бир қатор классик усуллар қўлланилади. Зараркунандаларга қарши воситалар учун Abbott (1925) ва Henderson–Tilton (1955) формулалари, шунингдек Schneider–Orelli тузатиши, касалликларга қарши препаратлар учун касалланиш даражаси ва ривожланиш индексига асосланган EPPO усуллари, бегона ўтларга қарши гербицидлар учун эса зичлик ва биомасса бўйича ҳисоблаш методлари кенг тарқалган [3, 4]. Ушбу усуллар турли мамлакатларда ўтказилган тадқиқотлар натижаларини қиёслаш имконини беради.", { indent: true }),
      P("Таъсир этувчи модда " + ai + " ва унга ўхшаш препаратлар бўйича хорижий адабиётларда уларнинг таъсир механизми, мақсадли организмлар спектри ҳамда танланувчанлиги батафсил ўрганилган. Дала ва лаборатория тажрибаларида ушбу гуруҳ препаратлари мақсадли зарарли организмларга нисбатан юқори биологик фаоллик кўрсатиши, айни вақтда маданий ўсимликка нисбатан танланувчан таъсир этиши қайд этилган [5, 6, 7].", { indent: true }),
      P("Халқаро тадқиқотларда препаратлар самарадорлиги об-ҳаво шароити, қўллаш муддати, зарарли организм ривожланиш фазаси ва сарф меъёрига боғлиқлиги алоҳида таъкидланади. Кўплаб муаллифлар воситани зарарли организм ривожланишининг дастлабки босқичларида қўллаш энг юқори самара беришини кўрсатган [8, 9]. Шунингдек, резистентликнинг олдини олиш мақсадида таъсир механизми турлича бўлган препаратларни навбатлаб қўллаш (IRAC, FRAC, HRAC тавсиялари) муҳим омил сифатида эътироф этилади [10].", { indent: true }),
      P("Маҳаллий ва МДҲ мамлакатлари тадқиқотчилари ишларида дала тажрибаларини ташкил этиш ва статистик таҳлил қилишнинг Доспехов Б.А. услубияти, шунингдек Ўзбекистон Республикасининг давлат синов методикалари асос қилиб олинган. Ушбу ишларда халқаро ёндашувлар маҳаллий тупроқ-иқлим шароитига мослаштирилиб, минтақа учун самарали ҳимоя тизимлари ишлаб чиқилган [11, 12].", { indent: true }),
      P("Атроф-муҳит ва озиқ-овқат хавфсизлиги нуқтаи назаридан халқаро миқёсда Кодекс Алиментариус (FAO/ЖССТ) томонидан белгиланган қолдиқ миқдорнинг рухсат этилган энг юқори даражалари (MRL) ва Жаҳон соғлиқни сақлаш ташкилотининг препаратлар хавфлилик таснифи муҳим мезон сифатида қаралади. Бу эса препаратларни нафақат самарадорлиги, балки хавфсизлиги бўйича ҳам ҳар томонлама баҳолашни тақозо этади.", { indent: true }),
      P("Адабиётлар таҳлили шуни кўрсатадики, хорижда препаратлар бўйича етарли маълумот мавжуд бўлса-да, ҳар бир восита муайян мамлакатнинг тупроқ-иқлим шароити, экин навлари ва зарарли организмлар турига нисбатан маҳаллий давлат синовидан ўтказилиши зарур. Мазкур тадқиқот " + prep + " препаратини " + meta.site + " шароитида синаб, ана шу илмий-амалий эҳтиёжни қондиришга қаратилган.", { indent: true }));

    // 3. Синов баёномаси
    ch.push(H("2. Синов баённомаси"),
      FLD("3.1.", "Талабгор ташкилот номи, давлати", (meta.applicantOrg || meta.manufacturer) + (meta.country ? ", " + meta.country : "")),
      FLD("3.2.", "Савдо номи", meta.tradeName || meta.preparatName),
      FLD("3.3.", "Таъсир этувчи моддаси", meta.activeIngredients),
      FLD("3.4.", "Препарат шакли", meta.preparatForm),
      FLD("3.5.", "Зарарли организм номи", meta.targetOrganism),
      FLD("3.6.", "Синов жойи ва хўжалик номи", meta.site),
      FLD("3.7.", "Синов ўтказилган муддат", meta.trialDate),
      FLD("3.8.", "Экин тури, нави", meta.crop + (meta.variety ? ", " + meta.variety : "")),
      FLD("3.9.", "Лаборатория хулосаси", meta.labConclusion || "—"),
      FLD("3.10.", "Андоза (эталон)", meta.referenceFullDesc || meta.referenceName),
      FLD("3.11.", "Сарф меъёри (ишчи эритма)", meta.applicationRate + (meta.workingSolution ? "; " + meta.workingSolution : "")),
      FLD("3.12.", "Тажриба тури", meta.experimentType || "кичик дала тажрибаси"),
      FLD("3.13.", "Жиҳоз/ускуна", meta.testEquipment || "—"),
      FLD("3.14.", "Қўллаш усули", meta.applicationMethod || "пуркаш"),
      FLD("3.15.", "Ҳаво ҳарорати, намлик", meta.weather));

    // 4. Методика
    ch.push(H("3. Синов ўтказиш жойи ва услублари (методикаси)"),
      P(meta.preparatName + " препарати биологик самарадорлиги давлат синов методикаси, ҳосилдорлик Б.А.Доспехов (1985) усулида олиб борилди. Ҳисоблаш методикаси: " + rep.efficacyMethodLabel + ".", { indent: true }));
    if (rep.storage) {
      ch.push(P("Касаллик ривожланиш даражаси R = Σ(a·b)·100/(N·K) формуласи бўйича, касалланган мевалар улуши эса Km = (A−a)·100/A формуласи бўйича аниқланди. Бунда: a·b — зарарланган органларнинг балл ифодасига кўпайтмаси йиғиндиси; N — кузатилган намуналар умумий сони; K — шкаладаги энг юқори балл; A — соғлом мевалар оғирлиги; a — касалланган мевалар оғирлиги. Биологик самарадорлик назорат вариантига нисбатан касалланиш даражасининг камайиши бўйича баҳоланди.", { indent: true }));
    }
    ch.push(P("Тажриба тизими:", { bold: true, after: 60 }));
    rep.efficacyRows.forEach(function (r, i) { var lb = r.isControl ? "(ишлов ўтказилмаган)" : (r.isReference ? "(андоза)" : ""); ch.push(P((i + 1) + ". " + r.variant + " " + lb, { size: BODY, after: 40 })); });
    if (rep.organisms && rep.organisms.length) {
      ch.push(P("1-жадвал", { align: "right", size: TBL, after: 40 }), P("Тажриба майдонларида учрайдиган асосий " + meta.targetOrganism.toLowerCase(), { bold: true, align: "center", size: BODY }));
      var orows = [new D.TableRow({ tableHeader: true, children: [CELL("№", { bold: true, shade: "e8e8e8" }), CELL("Организм номи", { bold: true, shade: "e8e8e8", align: "left" }), CELL("1 м² даги сони (ишловгача)", { bold: true, shade: "e8e8e8" })] })];
      rep.organisms.forEach(function (o, i) { orows.push(new D.TableRow({ children: [CELL(String(i + 1)), CELL(o.name, { align: "left" }), CELL(fmt(o.before, 1))] })); });
      ch.push(TABLE(orows));
    }

    // 5. Натижалар
    ch.push(H("4. Тажриба (тадқиқот) натижалари"));
    if (rep.storage) {
      storageTables(ch, rep, meta);
    } else {
      ch.push(P("2-жадвал", { align: "right", size: TBL, after: 40 }),
        P(meta.preparatName + " препаратининг " + meta.targetOrganism + "га қарши биологик самарадорлиги", { bold: true, align: "center", size: BODY }));
      ch.push(rep.detailed && rep.detailed.periods.length ? detailTable(rep) : effTable(rep));
    }

    return { children: ch, institute: institute, nonControl: nonControl, overallBest: overallBest };
  }

  // асосий: тўлиқ ҳужжат (график билан, async)
  function generateDocx(rep, meta) {
    var built = buildReport(rep, meta);
    var ch = built.children, overallBest = built.overallBest, institute = built.institute;
    var best = rep.efficacyRows.filter(function (r) { return !r.isControl && r.mean != null; }).sort(function (a, b) { return (b.mean || 0) - (a.mean || 0); })[0];

    var chartPromises = [];
    if (best && rep.days.length && !rep.storage) chartPromises.push(svgToPng(barSvg("Биологик самарадорлик — " + best.variant + ", %", rep.days.map(String), rep.days.map(function (d) { return best.byDay[d]; }), 100)).then(function (png) { return { type: "eff", png: png, variant: best.variant }; }));
    if (rep.yieldRows && rep.yieldRows.length) {
      var ymax = Math.max.apply(null, rep.yieldRows.map(function (r) { return r.mean || 0; })) * 1.2 || 1;
      chartPromises.push(svgToPng(barSvg("Ҳосилдорлик, " + (rep.yieldUnit || "ц/га"), rep.yieldRows.map(function (r) { return r.variant.length > 14 ? r.variant.slice(0, 13) + "…" : r.variant; }), rep.yieldRows.map(function (r) { return r.mean || 0; }), ymax)).then(function (png) { return { type: "yield", png: png }; }));
    }

    return Promise.all(chartPromises).then(function (charts) {
      var effChart = charts.filter(function (c) { return c.type === "eff"; })[0];
      var yChart = charts.filter(function (c) { return c.type === "yield"; })[0];
      if (effChart && effChart.png) { ch.push(IMG(effChart.png)); ch.push(CAP("1-расм. «" + effChart.variant + "» варианти бўйича биологик самарадорлик динамикаси.")); }

      // матнли таҳлил
      if (rep.detailed) {
        built.nonControl.forEach(function (nv) {
          var per = rep.detailed.periods.map(function (p) { return p.day + " кундан кейин – " + fmt(p.meanRow.byVariant[nv].pct, 1) + "%"; }).join(", ");
          ch.push(P(nv + " қўлланганда самарадорлик: " + per + "; ўртача " + rep.detailed.periods.length + "-ҳисобда – " + fmt(rep.detailed.overallMeanRow.byVariant[nv].pct, 1) + "%.", { indent: true }));
        });
      }
      if (rep.storage) {
        rep.storage.rows.filter(function (r) { return !r.isControl; }).forEach(function (r) {
          var parts = rep.storage.diseases.map(function (d) { return d + " бўйича касалланиш даражаси " + fmt(r.byDisease[d].severity, 1) + "% (самарадорлик " + fmt(r.byDisease[d].efficacyPct, 1) + "%)"; }).join(", ");
          ch.push(P(r.variant + " қўлланганда касалланмаган мевалар улуши " + fmt(r.healthy, 1) + "%, мевалар турғорлиги " + fmt(r.firmness, 2) + " кг/см² бўлди; " + parts + ".", { indent: true }));
        });
      }

      // 3-жадвал ҳосилдорлик
      if (rep.yieldRows && rep.yieldRows.length) {
        ch.push(P("3-жадвал", { align: "right", size: TBL, after: 40 }), P(meta.preparatName + " препаратининг " + meta.crop + " ҳосилдорлигига таъсири", { bold: true, align: "center", size: BODY }));
        var ctrl = rep.yieldRows.filter(function (r) { return r.isControl; })[0], cMean = ctrl ? ctrl.mean : null;
        var yrows = [new D.TableRow({ tableHeader: true, children: [CELL("Вариант", { bold: true, shade: "e8e8e8", align: "left" }), CELL("Ҳосилдорлик, " + (rep.yieldUnit || "ц/га"), { bold: true, shade: "e8e8e8" }), CELL("Қўшимча ҳосил", { bold: true, shade: "e8e8e8" })] })];
        rep.yieldRows.forEach(function (r) { var ex = (r.isControl || cMean == null || r.mean == null) ? null : r.mean - cMean; yrows.push(new D.TableRow({ children: [CELL(r.variant, { align: "left", bold: r.isControl }), CELL(fmt(r.mean, 1)), CELL(r.isControl ? "—" : fmt(ex, 1))] })); });
        ch.push(TABLE(yrows));
        if (yChart && yChart.png) { ch.push(IMG(yChart.png)); ch.push(CAP("2-расм. Вариантлар бўйича ўртача ҳосилдорлик.")); }
        if (rep.yieldAnova) {
          var a = rep.yieldAnova;
          ch.push(P("Дисперсион таҳлил (ANOVA): НСР₀.₀₅ = " + fmt(a.lsd05, 2) + "; CV% = " + fmt(a.cvPct, 2) + "; F = " + fmt(a.fValue, 2) + "; P = " + fmt(a.pValue, 4) + ". " + (a.significant ? "Вариантлар фарқи статистик ишончли (P<0,05)." : "Фарқ статистик ишончли эмас."), { indent: true }));
        }
      }

      // 6. Хулоса
      ch.push(H("5. Хулоса ва тавсиялар"),
        P("1. Олиб борилган тажриба натижаларига кўра " + meta.preparatName + " (" + meta.applicationRate + ") препарати " + meta.targetOrganism + "га қарши " + fmt(overallBest, 1) + "% биологик самарадорлик кўрсатди.", { indent: true }),
        P("2. Препарат мақбул меъёрда қўлланганда токсик (фитотоксик) ҳолатлар кузатилмади.", { indent: true }));
      if (rep.yieldRows) { var ctrl2 = rep.yieldRows.filter(function (r) { return r.isControl; })[0], tr = rep.yieldRows.filter(function (r) { return !r.isControl && r.increaseVsControlPct != null; })[0]; if (ctrl2 && tr && ctrl2.mean != null && tr.mean != null) ch.push(P("3. Назоратга нисбатан қўшимча " + fmt(tr.mean - ctrl2.mean, 1) + " " + (rep.yieldUnit || "ц/га") + " ҳосил олинди.", { indent: true })); }
      ch.push(P("4. Тажриба натижаларидан келиб чиққан ҳолда " + meta.preparatName + " (" + meta.applicationRate + ") препаратини Давлат рўйхатига киритиш тавсия этилади.", { indent: true }));

      // 7. Адабиётлар
      ch.push(H("6. Фойдаланилган адабиётлар рўйхати"));
      var refs = (meta.references || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (refs.length) refs.forEach(function (r, i) { ch.push(P(/^\d/.test(r) ? r : (i + 1) + ". " + r, { size: BODY, after: 40 })); });
      else ["Доспехов Б.А. Методика полевого опыта. – Москва, 1985.", "Методические указания по государственным испытаниям гербицидов. – Ташкент, 2007.", "EPPO Standards PP1 — Efficacy evaluation of plant protection products."].forEach(function (r, i) { ch.push(P((i + 1) + ". " + r, { size: BODY, after: 40 })); });

      // 8. 1-форма — рўйхатга олиш бўйича хулоса ва тавсиялар (АЛБОМ бўлими)
      var form1 = [];
      var L = { align: "left", after: 30, line: 240, size: TBL };  // ихчам банд
      form1.push(P("1-форма", { align: "right", after: 30 }),
        P("Рўйхатга олиш учун синовлар якуни бўйича хулоса ва тавсиялар", { bold: true, align: "center", size: BODY, after: 120 }),
        P("1. Ўсимликларни ҳимоя қилиш воситасининг савдо номи – " + (meta.tradeName || meta.preparatName), L),
        P("2. Таъсир этувчи моддаси – " + meta.activeIngredients + ".", L),
        P("3. Рўйхатга олиш учун талабгор ташкилотнинг номи, давлати – " + (meta.applicantOrg || meta.manufacturer || "—") + (meta.country ? ", " + meta.country : "") + ".", L),
        P("4. Рўйхатга олиш учун синовларни ўтказган ташкилотнинг номи – " + institute + ".", L),
        P("5. Рўйхатга олиш учун синов ўтказилган жой ва муддати – " + meta.site + "да " + meta.trialDate + ".", { align: "left", after: 120, line: 240, size: TBL }));

      // Расмий 9 устунли жадвал — албом бетга ихчам жойлашади
      var recText = "«" + meta.preparatName + "» " + meta.applicationRate + " сарф-меъёрда " + meta.crop + " экинида " + meta.targetOrganism + "га қарши рўйхатга олишга тавсия этилсин.";
      var tavHead = "Тавсиялар: «рўйхатга олишга тавсия этилсин (сарф меъёри ва бошқалар)». «Рўйхатга олиш учун синовлар давом эттирилсин». «Кейинги синовлар рад этилсин» (сабаблари кўрсатилади).";
      var cw = [950, 1320, 1600, 1650, 2750, 1480, 1320, 1380, 2950]; // сумма ≈ 15400 (албом эни)
      var HC = { bold: true, shade: "e8e8e8", compact: true, size: 18 };
      var DC = { compact: true, size: 18 };
      form1.push(new D.Table({
        width: { size: 15400, type: "dxa" }, borders: TBORDERS, columnWidths: cw,
        rows: [
          new D.TableRow({ cantSplit: true, tableHeader: true, children: [
            CELL("Экин тури", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[0] }),
            CELL("Зарарли организм номи", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[1] }),
            CELL("Воситани синовдан ўтган сарф меъёрлари, л(кг)/га", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[2] }),
            CELL("Биологик самарадорлик (%), ҳисоб куни", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[3] }),
            CELL("Воситани қўллаш усули", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[4] }),
            CELL("Қўллаш такрорийлиги", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[5] }),
            CELL("Кутиш муддати, кун", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[6] }),
            CELL("Фитотоксиклик хусусияти", { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[7] }),
            CELL(tavHead, { bold: true, shade: "e8e8e8", compact: true, size: 18, width: cw[8], align: "left" })
          ] }),
          new D.TableRow({ cantSplit: true, children: [
            CELL(meta.crop, { compact: true, size: 18, width: cw[0] }),
            CELL(meta.targetOrganism, { compact: true, size: 18, width: cw[1] }),
            CELL(meta.applicationRate, { compact: true, size: 18, width: cw[2] }),
            CELL(fmt(overallBest, 1), { compact: true, size: 18, width: cw[3] }),
            CELL(meta.applicationMethod || "пуркаш", { compact: true, size: 18, width: cw[4], align: "left" }),
            CELL(meta.maxTreatments ? ("мавсумда " + meta.maxTreatments + " марта") : "мавсумда 1 марта", { compact: true, size: 18, width: cw[5] }),
            CELL(meta.waitingPeriod || "—", { compact: true, size: 18, width: cw[6] }),
            CELL(meta.phytotoxicity || "Йўқ", { compact: true, size: 18, width: cw[7] }),
            CELL(recText, { compact: true, size: 18, width: cw[8], align: "left" })
          ] })
        ]
      }));
      form1.push(P("", { after: 120 }));

      // Имзолар
      form1.push(new D.Table({
        width: { size: 100, type: "pct" },
        borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
        rows: [new D.TableRow({ children: [
          new D.TableCell({ borders: {}, children: [P("Директор ўринбосари", { bold: true, after: 0 })] }),
          new D.TableCell({ borders: {}, children: [P(meta.deputyDirector || "____________", { bold: true, align: "right", after: 0 })] })
        ] }), new D.TableRow({ children: [
          new D.TableCell({ borders: {}, children: [P("Маъсул ижрочи", { bold: true, before: 200, after: 0 })] }),
          new D.TableCell({ borders: {}, children: [P((((meta.staff || "").split(/[,;\n]+/)[0]) || "").trim() || "____________", { bold: true, align: "right", before: 200, after: 0 })] })
        ] })]
      }));

      var doc = new D.Document({
        creator: institute, title: meta.preparatName + " — давлат синови ҳисоботи",
        sections: [
          // Асосий ҳисобот — тик (portrait)
          { properties: { page: { margin: { top: 1134, bottom: 1134, left: 1417, right: 850 } } }, children: ch },
          // 1-форма — албом (landscape)
          { properties: { page: { size: { orientation: "landscape", width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: form1 }
        ]
      });
      return D.Packer.toBlob(doc);
    });
  }

  // экспорт
  window.Hisobot = { computeReport: computeReport, generateDocx: generateDocx, detectType: detectType };
})();
