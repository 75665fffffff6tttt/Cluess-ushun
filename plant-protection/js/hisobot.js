/* Ўсимликларни ҳимоя қилиш воситалари давлат синови илмий ҳисобот генератори.
 * Тўлиқ браузерда (серверсиз) ишлайди: ҳисоблаш + .docx яратиш.
 * Кутубхоналар: docx (глобал `docx`), jStat (глобал `jStat`).
 * Барча самарадорлик/статистика фойдаланувчи киритган дала ўлчовларидан ҳисобланади.
 */
(function () {
  "use strict";

  // ===================== ТИЛ (UZ / RU) =====================
  var LANG = "uz";
  function detectLang() {
    try { return (document.documentElement.lang || "").toLowerCase().indexOf("ru") === 0 ? "ru" : "uz"; }
    catch (e) { return "uz"; }
  }
  function tr(u, r) { return LANG === "ru" ? r : u; }

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
  function diseaseBioEff(cI, tI) { var r = safeDiv(cI - tI, cI); return r == null ? null : r * 100; }
  function weedBioEff(cD, tD) { var r = safeDiv(cD - tD, cD); return r == null ? null : r * 100; }

  // ===================== СТАТИСТИКА (jStat) =====================
  function anovaRcbd(data, alpha) {
    alpha = alpha || 0.05;
    var variants = Object.keys(data);
    var nV = variants.length;
    if (nV < 2) throw new Error(tr("Камида 2 та вариант керак.", "Требуется минимум 2 варианта."));
    var lens = {};
    variants.forEach(function (v) { lens[data[v].length] = 1; });
    if (Object.keys(lens).length !== 1) throw new Error(tr("Такрорлар сони бир хил бўлиши керак.", "Число повторностей должно быть одинаковым."));
    var nR = data[variants[0]].length;
    if (nR < 2) throw new Error(tr("Камида 2 та такрор керак.", "Требуется минимум 2 повторности."));
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
      variantMeans: vm, significant: msE > 0 && P < alpha, zeroError: !(msE > 0)
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
    insektitsid: { name: "Инсектицид", method: "abbott", days: [3, 7, 14, 21, 30] },
    fungitsid: { name: "Фунгицид", method: "disease", days: [7, 14, 21, 30] },
    akaritsid: { name: "Акарицид", method: "abbott", days: [3, 7, 14, 21, 30] },
    nematitsid: { name: "Нематицид", method: "population", days: [14, 30, 45, 60] },
    rodentitsid: { name: "Родентицид", method: "population", days: [3, 7, 14, 30] },
    defoliant: { name: "Дефолиант", method: "defoliation", days: [7, 14, 21] },
    desikant: { name: "Десикант", method: "defoliation", days: [3, 7, 14] },
    biopreparat: { name: "Биопрепарат", method: "abbott", days: [3, 7, 14, 21, 30] },
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

  function methodLabel(k) {
    var M = {
      abbott: "Abbott (1925)",
      disease: tr("Касаллик ривожланиш индекси бўйича (EPPO / давлат методикаси)", "По индексу развития болезни (EPPO / государственная методика)"),
      weed: tr("Бегона ўтлар зичлиги бўйича (давлат гербицид синов методикаси)", "По плотности сорняков (государственная методика испытания гербицидов)"),
      population: tr("Популяция камайиши бўйича", "По снижению популяции"),
      defoliation: tr("Барг тўкилиши / қуриш даражаси бўйича", "По степени дефолиации / подсыхания"),
      storage_scale: tr("Касаллик ривожланиш даражаси шкаласи бўйича (сақлаш синови методикаси)", "По шкале степени развития болезни (методика испытания при хранении)")
    };
    return M[k] || k;
  }

  // ===================== ҲИСОБЛАШ ОРКЕСТРАТОРИ =====================
  function findControl(input) {
    var c = input.variants.filter(function (v) { return v.isControl; })[0];
    if (c) return c.name;
    var n = input.variants.filter(function (v) { return /назорат|контрол|control|ишловсиз/i.test(v.name); })[0];
    return n ? n.name : null;
  }

  function computeReport(input) {
    LANG = detectLang();
    var warnings = [];
    var det = detectType(input.meta.activeIngredients, input.explicitType);
    var days = input.assessment.days.slice().sort(function (a, b) { return a - b; });
    var control = findControl(input);
    if (!control) warnings.push(tr("Назорат (ишловсиз) варианти аниқланмади — камида битта вариантни назорат деб белгиланг.", "Контрольный (необработанный) вариант не определён — отметьте хотя бы один вариант как контроль."));

    var efficacyRows = [], countRows = null, methodKey = det.meta.method, detailed = null, organisms = null, storage = null;
    var A = input.assessment;

    if (A.counts) {
      countRows = input.variants.map(function (v) {
        var c = A.counts[v.name] || { before: null, byDay: {} };
        var bd = {}; days.forEach(function (d) { bd[d] = c.byDay[d] != null ? c.byDay[d] : null; });
        return { variant: v.name, isControl: !!v.isControl || v.name === control, before: c.before != null ? c.before : null, byDay: bd };
      });
      var ctrl = control ? A.counts[control] : null;
      methodKey = "abbott";
      input.variants.forEach(function (v) {
        var isC = !!v.isControl || v.name === control, c = A.counts[v.name], bd = {};
        days.forEach(function (d) {
          if (isC) { bd[d] = null; return; }
          var tA = c && c.byDay[d] != null ? c.byDay[d] : null, cA = ctrl && ctrl.byDay[d] != null ? ctrl.byDay[d] : null, eff = null;
          if (cA != null && tA != null) eff = abbott(cA, tA);
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
        var meanRow = { organism: tr("ўртача", "среднее"), before: avg(rows.map(function (r) { return r.before; })), control: avg(rows.map(function (r) { return r.control; })), byVariant: {} };
        nonControl.forEach(function (nv) { meanRow.byVariant[nv] = { density: avg(rows.map(function (r) { return r.byVariant[nv].density; })), pct: avg(rows.map(function (r) { return r.byVariant[nv].pct; })) }; });
        return { day: day, rows: rows, meanRow: meanRow };
      });
      var overall = { organism: tr("ўртача " + periods.length + "-ҳисоб", "среднее по " + periods.length + " учётам"), before: avg(periods.map(function (p) { return p.meanRow.before; })), control: avg(periods.map(function (p) { return p.meanRow.control; })), byVariant: {} };
      nonControl.forEach(function (nv) { overall.byVariant[nv] = { density: avg(periods.map(function (p) { return p.meanRow.byVariant[nv].density; })), pct: avg(periods.map(function (p) { return p.meanRow.byVariant[nv].pct; })) }; });
      detailed = { unit: tr("дона/м²", "шт./м²"), nonControlVariants: nonControl, controlVariant: control, periods: periods, overallMeanRow: overall };
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
          var ctrlMass = (ctrlS && ctrlS.byDisease[dis]) ? ctrlS.byDisease[dis].massLost : null;
          // Даража (степень поражения) бўйича самарадорлик — 1-жадвал/хулоса учун
          var eff = (!isC && ctrlSev != null && ctrlSev > 0 && cur.severity != null) ? round((ctrlSev - cur.severity) / ctrlSev * 100) : null;
          // Касалланган мевалар оғирлиги бўйича самарадорлик — 2-жадвал учун
          var massEff = (!isC && ctrlMass != null && ctrlMass > 0 && cur.massLost != null) ? round((ctrlMass - cur.massLost) / ctrlMass * 100) : null;
          perD[dis] = { severity: cur.severity, massLost: cur.massLost, efficacyPct: eff, massEfficacyPct: massEff };
        });
        return { variant: v.name, isControl: isC, isReference: !!v.isReference, firmness: d.firmness, healthy: d.healthy, byDisease: perD };
      });
      storage = { diseases: diseases, rows: srows, controlVariant: control };
      // энг яхши вариантни аниқлаш учун efficacyRows (mean = касалланмаган %)
      srows.forEach(function (r) { efficacyRows.push({ variant: r.variant, isControl: r.isControl, isReference: r.isReference, byDay: {}, mean: r.isControl ? null : r.healthy }); });
      days = [];
    } else {
      warnings.push(tr("Дала ҳисоблари киритилмаган — самарадорлик жадвали бўш.", "Полевые учёты не введены — таблица эффективности пуста."));
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
        try { yieldAnova = anovaRcbd(input.yieldData); } catch (e) { warnings.push(tr("Ҳосилдорлик ANOVA: ", "Урожайность ANOVA: ") + e.message); }
      } else if (Object.keys(input.yieldData).length >= 2) { warnings.push(tr("ANOVA учун ҳар вариантда бир хил (≥2) такрор керак.", "Для ANOVA нужно одинаковое (≥2) число повторностей в каждом варианте.")); }
    }

    return {
      typeKey: det.key, typeNameUz: det.meta.name, detection: det, days: days, controlVariant: control,
      countRows: countRows, efficacyRows: efficacyRows, methodKey: methodKey, efficacyMethodLabel: methodLabel(methodKey),
      detailed: detailed, organisms: organisms, storage: storage, yieldRows: yieldRows, yieldUnit: input.yieldUnit, yieldAnova: yieldAnova, warnings: warnings
    };
  }

  // ===================== ГРАФИК (SVG → PNG) =====================
  function svgEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function barSvg(title, labels, values, maxY, unit) {
    unit = unit || "";
    var W = 720, H = 400, pl = 58, pr = 24, pt = 54, pb = 52, aw = W - pl - pr, ah = H - pt - pb;
    maxY = maxY || 100; var n = labels.length, slot = aw / n, bw = Math.min(slot * 0.5, 88), r = Math.min(bw / 2, 7), parts = [];
    // орқа фон (оқ)
    parts.push('<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>');
    // устунлар учун қора градиент
    parts.push('<defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#555555"/><stop offset="1" stop-color="#0a0a0a"/></linearGradient></defs>');
    // сарлавҳа — қора, Times New Roman
    parts.push('<text x="' + (W / 2) + '" y="30" font-family="Times New Roman, serif" font-size="18" font-weight="bold" fill="#000000" text-anchor="middle">' + svgEsc(title) + '</text>');
    // тўр чизиқлари (нозик кулранг) + Y ўқи қийматлари (қора)
    for (var t = 0; t <= 5; t++) { var yv = maxY * t / 5, y = pt + ah - (yv / maxY) * ah; parts.push('<line x1="' + pl + '" y1="' + y + '" x2="' + (W - pr) + '" y2="' + y + '" stroke="#cccccc" stroke-width="1"/>'); parts.push('<text x="' + (pl - 8) + '" y="' + (y + 4) + '" font-family="Times New Roman, serif" font-size="12" text-anchor="end" fill="#000000">' + Math.round(yv) + '</text>'); }
    // устунлар (юмалоқ юқори бурчакли, қора контурли оқ) — қиймат ёзуви, Х белгилари
    labels.forEach(function (lb, i) {
      var v = values[i], cx = pl + slot * i + slot / 2, x = cx - bw / 2;
      if (v != null) {
        var bh = Math.max(r, Math.max(0, v) / maxY * ah), y = pt + ah - bh;
        // юқори бурчаклари юмалоқ устун (path) — оқ тўлдириш, қора контур
        parts.push('<path d="M' + x.toFixed(1) + ' ' + (pt + ah) + ' V' + (y + r).toFixed(1) + ' a' + r + ' ' + r + ' 0 0 1 ' + r + ' -' + r + ' h' + (bw - 2 * r).toFixed(1) + ' a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + ' V' + (pt + ah) + ' Z" fill="url(#barGrad)"/>');
        parts.push('<text x="' + cx + '" y="' + (y - 7) + '" font-family="Times New Roman, serif" font-size="12.5" font-weight="bold" fill="#000000" text-anchor="middle">' + v.toFixed(1) + unit + '</text>');
      }
      parts.push('<text x="' + cx + '" y="' + (pt + ah + 20) + '" font-family="Times New Roman, serif" font-size="12" fill="#000000" text-anchor="middle">' + svgEsc(lb) + '</text>');
    });
    // асосий (Х) ўқ чизиғи
    parts.push('<line x1="' + pl + '" y1="' + (pt + ah) + '" x2="' + (W - pr) + '" y2="' + (pt + ah) + '" stroke="#000000" stroke-width="1.5"/>');
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
    return new D.Paragraph({ heading: o.heading, alignment: align, spacing: { before: o.before || 0, after: o.after == null ? 120 : o.after, line: o.line || LINE }, indent: o.indentLeft ? { left: o.indentLeft } : (o.indent ? { firstLine: 709 } : undefined),
      children: [new D.TextRun({ text: text, bold: o.bold, italics: o.italics, font: FONT, size: o.size || BODY })] });
  }
  // Бўлим сарлавҳаси — Heading1 услуби (авто-МУНДАРИЖА йиғиши учун)
  function H(text) { return new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, alignment: "center", spacing: { before: 260, after: 160 }, keepNext: true, children: [new D.TextRun({ text: text, bold: true, font: FONT, size: HEAD, color: "000000" })] }); }
  function FLD(nnum, label, value) { return new D.Paragraph({ alignment: "both", spacing: { after: 80, line: LINE }, children: [new D.TextRun({ text: nnum + " " + label + " – ", font: FONT, size: BODY }), new D.TextRun({ text: value || "—", font: FONT, size: BODY })] }); }
  function CELL(text, o) {
    o = o || {};
    var b = { top: { style: "single", size: 4, color: "000000" }, bottom: { style: "single", size: 4, color: "000000" }, left: { style: "single", size: 4, color: "000000" }, right: { style: "single", size: 4, color: "000000" } };
    var mg = o.compact ? { top: 20, bottom: 20, left: 50, right: 50 } : { top: 40, bottom: 40, left: 80, right: 80 };
    // Жадвал катакларида фон ранги ишлатилмайди (оқ фон)
    return new D.TableCell({ borders: b, width: o.width ? { size: o.width, type: "dxa" } : undefined, columnSpan: o.colSpan, rowSpan: o.rowSpan, verticalAlign: "center", margins: mg,
      children: [new D.Paragraph({ alignment: o.align || "center", spacing: { after: 0, line: o.compact ? 260 : 240 }, children: [new D.TextRun({ text: text, bold: o.bold, font: FONT, size: o.size || TBL })] })] });
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
    var h1 = [CELL(tr("Организм", "Организм"), { bold: true, shade: "e8e8e8", rowSpan: 2, align: "left" }), CELL(tr("Ишловгача, 1 м²", "До обработки, 1 м²"), { bold: true, shade: "e8e8e8", rowSpan: 2 }), CELL(tr("Назорат, 1 м²", "Контроль, 1 м²"), { bold: true, shade: "e8e8e8", rowSpan: 2 })];
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
      rows.push(new D.TableRow({ children: [CELL(tr(per.day + " кундан кейин", "После " + per.day + " суток"), { bold: true, shade: "f7f7f7", colSpan: totalCols, align: "left" })] }));
      per.rows.forEach(function (r) { rows.push(rowFor(r, false)); });
      rows.push(rowFor(per.meanRow, true));
    });
    rows.push(rowFor(d.overallMeanRow, true));
    return TABLE(rows);
  }
  function effTable(rep) {
    var rows = [];
    // Зараркунанда режимида «ишловгача» (бошланғич зичлик) сонлари бўлса — уларни устун қилиб кўрсатамиз
    var beforeByVar = {}, hasBefore = false;
    if (rep.countRows) rep.countRows.forEach(function (cr) { beforeByVar[cr.variant] = cr.before; if (cr.before != null) hasBefore = true; });
    var h = [CELL(tr("Вариант", "Вариант"), { bold: true, shade: "e8e8e8", align: "left" })];
    if (hasBefore) h.push(CELL(tr("Ишловгача, 1 м²", "До обработки, 1 м²"), { bold: true, shade: "e8e8e8" }));
    rep.days.forEach(function (dd) { h.push(CELL(tr(dd + "-кун, %", dd + "-е сут., %"), { bold: true, shade: "e8e8e8" })); });
    h.push(CELL(tr("Ўртача, %", "Среднее, %"), { bold: true, shade: "e8e8e8" }));
    rows.push(new D.TableRow({ tableHeader: true, children: h }));
    rep.efficacyRows.forEach(function (r) {
      var c = [CELL(r.variant + (r.isReference ? tr(" (андоза)", " (эталон)") : ""), { align: "left", bold: r.isControl })];
      if (hasBefore) c.push(CELL(fmt(beforeByVar[r.variant], 1)));
      rep.days.forEach(function (dd) { c.push(CELL(r.isControl ? "—" : fmt(r.byDay[dd], 1))); });
      c.push(CELL(r.isControl ? "—" : fmt(r.mean, 1), { bold: true }));
      rows.push(new D.TableRow({ children: c }));
    });
    return TABLE(rows);
  }

  // Сақлаш синови жадваллари (1-жадвал: турғорлик/касалланиш даражаси; 2-жадвал: касалланган оғирлик)
  function storageTables(ch, rep, meta) {
    var st = rep.storage, dis = st.diseases, rows = st.rows;
    function tedModda(r) { return r.isControl ? "—" : (r.isReference ? (meta.referenceFullDesc || meta.referenceName || tr("андоза", "эталон")) : meta.activeIngredients); }
    function vSuffix(r) { return r.isReference ? tr(" (андоза)", " (эталон)") : (r.isControl ? tr(" (назорат)", " (контроль)") : ""); }
    // 1-жадвал
    ch.push(P(tr("1-жадвал", "Таблица 1"), { align: "right", size: TBL, after: 40 }),
      P(tr(meta.crop + " маҳсулотини сақлашда " + meta.preparatName + " препаратининг самарадорлиги (турғорлик ва касалланиш даражаси)", "Эффективность препарата " + meta.preparatName + " при хранении продукции " + meta.crop + " (твёрдость и степень поражения)"), { bold: true, align: "center", size: BODY }));
    var h1 = [CELL(tr("Вариантлар", "Варианты"), { bold: true, shade: "e8e8e8", align: "left" }), CELL(tr("Таъсир этувчи моддаси", "Действующее вещество"), { bold: true, shade: "e8e8e8" }), CELL(tr("Мевалар турғорлиги, кг/см²", "Твёрдость плодов, кг/см²"), { bold: true, shade: "e8e8e8" }), CELL(tr("Касалланмаган мевалар, %", "Здоровые плоды, %"), { bold: true, shade: "e8e8e8" })];
    dis.forEach(function (d) { h1.push(CELL(tr("Касалланиш даражаси, % (" + d + ")", "Степень поражения, % (" + d + ")"), { bold: true, shade: "e8e8e8" })); });
    var r1 = [new D.TableRow({ tableHeader: true, children: h1 })];
    rows.forEach(function (r) {
      var c = [CELL(r.variant + vSuffix(r), { align: "left", bold: r.isControl }), CELL(tedModda(r), { size: 18 }), CELL(fmt(r.firmness, 2)), CELL(fmt(r.healthy, 1))];
      dis.forEach(function (d) { c.push(CELL(fmt(r.byDisease[d].severity, 1))); });
      r1.push(new D.TableRow({ children: c }));
    });
    ch.push(TABLE(r1));
    // 2-жадвал — касалланган мевалар оғирлиги
    ch.push(P("", { after: 120 }), P(tr("2-жадвал", "Таблица 2"), { align: "right", size: TBL, after: 40 }),
      P(tr(meta.crop + " маҳсулотини сақлашда касалланган мевалар оғирлиги ва биологик самарадорлик", "Масса поражённых плодов и биологическая эффективность при хранении продукции " + meta.crop), { bold: true, align: "center", size: BODY }));
    var h2 = [CELL(tr("Вариантлар", "Варианты"), { bold: true, shade: "e8e8e8", align: "left" })];
    dis.forEach(function (d) { h2.push(CELL(tr("Касалланган мевалар, кг (" + d + ")", "Поражённые плоды, кг (" + d + ")"), { bold: true, shade: "e8e8e8" })); h2.push(CELL(tr("Самарадорлик (оғирлик б-ча), % (" + d + ")", "Эффективность (по массе), % (" + d + ")"), { bold: true, shade: "e8e8e8" })); });
    var r2 = [new D.TableRow({ tableHeader: true, children: h2 })];
    rows.forEach(function (r) {
      var c = [CELL(r.variant + vSuffix(r), { align: "left", bold: r.isControl })];
      dis.forEach(function (d) { c.push(CELL(fmt(r.byDisease[d].massLost, 2))); c.push(CELL(r.isControl ? "—" : fmt(r.byDisease[d].massEfficacyPct, 1))); });
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

  // Русча: институт номини қаратқич келишигига («институт» → «института») ўтказиш
  function ruAdjGen(w) {
    return w
      .replace(/ский$/, "ского").replace(/ская$/, "ской")
      .replace(/цкий$/, "цкого")
      .replace(/ный$/, "ного").replace(/ная$/, "ной")
      .replace(/ой$/, "ого")
      .replace(/ий$/, "ого").replace(/ый$/, "ого");
  }
  function ruGenitive(name) {
    var s = (name || "").trim();
    if (!s) return s;
    s = s.charAt(0).toLowerCase() + s.slice(1);
    var idx = s.indexOf("институт");
    if (idx < 0) return s; // «институт» топилмаса — ўзгартирмаймиз
    var head = s.slice(0, idx).replace(/\s+$/, "");
    // Эслатма: JS regex'да \b кирилл ҳарфлар билан ишламайди — шунинг учун lookahead
    var rest = s.slice(idx).replace(/^институт(?=\s|,|\.|$)/, "института");
    var words = head ? head.split(/\s+/).map(ruAdjGen) : [];
    return (words.join(" ") + " " + rest).trim();
  }

  // Жумла ўртасидаги ном учун биринчи ҳарфни кичик қилиш (масалан «Икки паллали...» → «икки паллали...»)
  function lcFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  // Титул сарлавҳаси учун препаратдан кейинги «(ишлаб чиқарувчи, давлат)» қисми
  function titleMaker(meta) {
    var m = (meta.manufacturer || meta.applicantOrg || "").trim();
    var c = (meta.country || "").trim();
    if (!m && !c) return "";
    var inside = "";
    if (m) inside += /["«»“”]/.test(m) ? m : "«" + m + "»";
    if (c) inside += (m ? ", " : "") + c;
    return " (" + inside + ")";
  }

  function buildReport(rep, meta) {
    D = window.docx;
    LANG = detectLang();
    var ch = [], institute = meta.institute || tr("Ўсимликлар карантини ва ҳимояси илмий-тадқиқот институти", "Научно-исследовательский институт карантина и защиты растений");
    var nonControl = rep.detailed ? rep.detailed.nonControlVariants : [];
    var overallBest = rep.detailed ? rep.detailed.overallMeanRow.byVariant[bestNonControl(rep)].pct : (rep.efficacyRows.filter(function (r) { return !r.isControl && r.mean != null; }).sort(function (a, b) { return (b.mean || 0) - (a.mean || 0); })[0] || {}).mean;

    // ===== Титул варағи (расмий шаблон бўйича) =====
    var city = (meta.reportCity && meta.reportCity.trim()) || tr("Тошкент", "Ташкент");
    var reportYear = (String(meta.trialDate || "").match(/\b(?:19|20)\d{2}\b/) || [String(new Date().getFullYear())])[0];
    var staffList = (meta.staff || "").split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    ch.push(P(meta.committee || tr("ЎЗБЕКИСТОН РЕСПУБЛИКАСИ ОЗИҚ-ОВҚАТ МАҲСУЛОТЛАРИ ХАВФСИЗЛИГИ ҚЎМИТАСИ", "КОМИТЕТ ПО БЕЗОПАСНОСТИ ПИЩЕВОЙ ПРОДУКЦИИ РЕСПУБЛИКИ УЗБЕКИСТАН"), { align: "center", bold: true, after: 60 }),
      P(tr("ЎСИМЛИКЛАР КАРАНТИНИ ВА ҲИМОЯСИ АГЕНТЛИГИ", "АГЕНТСТВО ПО КАРАНТИНУ И ЗАЩИТЕ РАСТЕНИЙ"), { align: "center", bold: true, after: 60 }),
      P(institute.toUpperCase(), { align: "center", bold: true, after: 360 }),
      // Тасдиқлаш блоки — саҳифанинг ўнг ярмида, марказга текисланган
      P(tr("“ТАСДИҚЛАЙМАН”", "“УТВЕРЖДАЮ”"), { indentLeft: 4200, align: "center", bold: true, after: 40 }),
      // «илмий-тадқиқот» бир бутун қолиши учун дефисни узилмас дефисга алмаштирамиз (сатр ундан олдин узилади)
      P(tr(institute.replace(/-/g, "‑") + " директори", "Директор " + ruGenitive(institute).replace(/-/g, "‑")), { indentLeft: 4200, align: "center", after: 40 }),
      P("___________" + (meta.director || "А.Анорбаев"), { indentLeft: 4200, align: "center", after: 40 }),
      P(tr("«___»___________ " + reportYear + " йил.", "«___»___________ " + reportYear + " г."), { indentLeft: 4200, align: "center", after: 500 }),
      P(tr("ИЛМИЙ ҲИСОБОТ", "НАУЧНЫЙ ОТЧЁТ"), { align: "center", bold: true, size: 32, after: 260 }));
    // Титул жумласи ўртасида организм номи кичик ҳарфдан бошланади
    var orgTitle = lcFirst(meta.targetOrganism);
    ch.push(P(tr(
        meta.crop + " экинида " + orgTitle + "га қарши " + meta.preparatName + titleMaker(meta) + " препаратининг биологик самарадорлиги бўйича рўйхатга олиш учун синов натижалари",
        "Результаты испытаний для регистрации биологической эффективности препарата " + meta.preparatName + titleMaker(meta) + " против " + orgTitle + " на культуре " + lcFirst(meta.crop)
      ), { align: "center", after: 600 }));
    // Маъсул ижрочи / Ижрочилар — ном ёнида имзо чекишга жой (чизиқ)
    if (staffList.length) {
      var noB = { borders: {}, verticalAlign: "top" };
      var SIG = ""; // имзо чекишга бўш жой (чизиқсиз)
      ch.push(new D.Table({
        alignment: "center",
        width: { size: 7900, type: "dxa" },
        borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
        columnWidths: [2900, 2500, 2500],
        rows: [
          new D.TableRow({ children: [
            new D.TableCell(Object.assign({}, noB, { children: [P(tr("Маъсул ижрочи:", "Ответственный исполнитель:"), { after: 480 })] })),
            new D.TableCell(Object.assign({}, noB, { children: [P(SIG, { after: 480 })] })),
            new D.TableCell(Object.assign({}, noB, { children: [P(staffList[0], { after: 480 })] }))
          ] }),
          new D.TableRow({ children: [
            new D.TableCell(Object.assign({}, noB, { children: [P(staffList.length > 1 ? tr("Ижрочилар:", "Исполнители:") : "", { after: 480 })] })),
            new D.TableCell(Object.assign({}, noB, { children: staffList.slice(1).map(function () { return P(SIG, { after: 480 }); }) })),
            new D.TableCell(Object.assign({}, noB, { children: staffList.slice(1).map(function (s) { return P(s, { after: 480 }); }) }))
          ] })
        ]
      }));
    }
    // Шаҳар/йил — саҳифа пастига яқин (қатъий эмас; узун ном/кўп ижрочида ошиб кетмаслиги учун мўътадил оралиқ)
    ch.push(P(tr(city + " – " + reportYear + " й.", city + " – " + reportYear + " г."), { align: "center", bold: true, before: 3200, after: 0 }),
      // Кенгаш баённомаси + Илмий котиб — алоҳида 2-варақда
      new D.Paragraph({ children: [new D.PageBreak()] }),
      P(tr(institute + " илмий кенгашида №___-сонли баённома, «___»________ " + reportYear + " йилда кўриб чиқилди.", "Рассмотрено на учёном совете " + ruGenitive(institute) + ", протокол №___ от «___»________ " + reportYear + " г."), { align: "center", after: 200 }),
      P(tr("Илмий котиб", "Учёный секретарь") + "                                        " + (meta.scientificSecretary || "О.Сулаймонов"), { align: "center", before: 720 }),
      new D.Paragraph({ children: [new D.PageBreak()] }));

    // ===== Мундарижа — ҳақиқий авто-жадвал (Word очганда бет рақами ўзи тўлади) =====
    ch.push(P(tr("МУНДАРИЖА", "СОДЕРЖАНИЕ"), { align: "center", bold: true, size: HEAD, after: 200 }));
    ch.push(new D.TableOfContents(tr("Мундарижа", "Содержание"), { hyperlink: true, headingStyleRange: "1-1" }));
    ch.push(new D.Paragraph({ children: [new D.PageBreak()] }));

    // 1. Кириш — синов турига қараб (сақлаш ёки дала)
    var org = lcFirst(meta.targetOrganism), crop = meta.crop, prep = meta.preparatName, ai = meta.activeIngredients;
    var tl = rep.typeNameUz.toLowerCase();
    if (tl === "аниқланмаган") tl = tr("аниқланмаган препарат", "препарат");
    var variety = meta.variety || "—";
    if (rep.storage) {
      // ——— Сақлаш синови учун Кириш ———
      ch.push(H(tr("КИРИШ", "ВВЕДЕНИЕ")),
        P(tr("Қишлоқ хўжалиги маҳсулотларини етиштириш билан бир қаторда, уларни йиғим-теримдан кейин сифатли сақлаш ва нобудгарчиликни камайтириш ҳам озиқ-овқат хавфсизлигини таъминлашнинг муҳим шартларидан биридир. Жаҳон миқёсида йиғиб олинган мева ва сабзавот маҳсулотларининг сезиларли қисми — айрим маълумотларга кўра 20–40% гача — сақлаш ва ташиш жараёнида нобуд бўлади. Шу боис сақлаш муддатини узайтириш ва маҳсулот сифатини сақлаб қолиш илмий ҳамда амалий жиҳатдан долзарб вазифа ҳисобланади.", "Наряду с выращиванием сельскохозяйственной продукции важным условием обеспечения продовольственной безопасности является её качественное послеуборочное хранение и снижение потерь. В мировом масштабе значительная часть собранных плодов и овощей — по некоторым данным до 20–40% — теряется при хранении и транспортировке. Поэтому продление срока хранения и сохранение качества продукции является актуальной научной и практической задачей."), { indent: true }),
        P(tr(crop + " маҳсулоти республика деҳқончилигида ва экспорт салоҳиятида муҳим ўрин тутади. Унинг тижорат қиймати кўп жиҳатдан йиғим-теримдан кейинги сифати — ташқи кўриниши, турғорлиги, таъми ва сақланиш муддатига боғлиқ. Сақлаш жараёнида маҳсулот физиологик ва микробиологик ўзгаришларга учрайди, натижада унинг сифат кўрсаткичлари пасаяди.", "Продукция " + crop + " занимает важное место в земледелии республики и её экспортном потенциале. Её коммерческая ценность во многом зависит от послеуборочного качества — внешнего вида, твёрдости, вкуса и срока хранения. В процессе хранения продукция подвергается физиологическим и микробиологическим изменениям, вследствие чего её качественные показатели снижаются."), { indent: true }),
        P(tr("Сақлаш даврида сифатни пасайтирувчи асосий омиллардан бири — " + org + " ҳисобланади. Бундай касалликлар маҳсулот тўқималарини бузади, сув йўқотилишини кучайтиради ва товар кўринишини йўқотиб, сақлаш муддатини қисқартиради. Назорат қилинмаган ҳолда улар сақланаётган маҳсулотнинг катта қисмини нобуд қилиши мумкин.", "Одним из основных факторов, снижающих качество при хранении, является " + org + ". Такие болезни разрушают ткани продукции, усиливают потерю влаги и, ухудшая товарный вид, сокращают срок хранения. Без контроля они могут погубить значительную часть хранимой продукции."), { indent: true }),
        P(tr("Сақлашдаги нобудгарчиликни камайтириш учун ҳарорат ва намликни бошқариш (совутгичли сақлаш), маҳсулотни қадоқлаш ҳамда биологик ва кимёвий консервант/ҳимоя воситаларидан фойдаланиш каби усуллар қўлланилади. Айни вақтда истеъмолчи хавфсизлигини таъминлаш мақсадида кам қолдиқли, экологик хавфсиз ва фитотоксик таъсирга эга бўлмаган воситаларга устунлик берилади.", "Для снижения потерь при хранении применяются такие методы, как регулирование температуры и влажности (холодильное хранение), упаковка продукции, а также использование биологических и химических консервирующих/защитных средств. При этом в целях обеспечения безопасности потребителя предпочтение отдаётся малоостаточным, экологически безопасным и не обладающим фитотоксическим действием средствам."), { indent: true }),
        P(tr("Ҳар қандай янги сақлаш воситаси амалиётга кенг жорий этилишидан аввал белгиланган методикалар асосида давлат синовидан ўтказилиши, унинг биологик самарадорлиги, маҳсулот сифатига таъсири ва хавфсизлиги маҳаллий шароитда текширилиши шарт.", "Любое новое средство для хранения перед широким внедрением в практику должно пройти государственное испытание на основе установленных методик, при этом его биологическая эффективность, влияние на качество продукции и безопасность проверяются в местных условиях."), { indent: true }),
        P(tr("Мазкур илмий ҳисобот " + prep + " (таъсир этувчи модда – " + ai + ") воситасининг " + crop + " маҳсулотини сақлаш жараёнида " + org + "га қарши биологик самарадорлигини аниқлашга бағишланган. Тадқиқотнинг асосий мақсади — воситанинг " + meta.applicationRate + " сарф меъёридаги самарадорлигини баҳолаш, уни эталон (андоза) " + meta.referenceName + " билан таққослаш, маҳсулот турғорлиги ва сифатига таъсирини ўрганиш ҳамда Давлат рўйхатига киритиш бўйича асосланган хулоса тайёрлашдан иборат. Синов " + meta.site + "да, «" + variety + "» навида ўтказилди.", "Настоящий научный отчёт посвящён определению биологической эффективности средства " + prep + " (действующее вещество – " + ai + ") против " + org + " в процессе хранения продукции " + crop + ". Основная цель исследования — оценить эффективность средства при норме расхода " + meta.applicationRate + ", сравнить его с эталоном " + meta.referenceName + ", изучить влияние на твёрдость и качество продукции, а также подготовить обоснованное заключение о включении в Государственный реестр. Испытание проведено в " + meta.site + ", на сорте «" + variety + "»."), { indent: true }));
      // ——— Сақлаш синови учун Адабиётлар шарҳи ———
      ch.push(H(tr("1. Адабиётлар шарҳи", "1. Обзор литературы")),
        P(tr("Мева ва сабзавот маҳсулотларини йиғим-теримдан кейин сақлаш ҳамда сифатини баҳолаш халқаро миқёсда стандартлаштирилган ёндашувларга асосланади. Европа ва Ўрта ер денгизи ўсимликларни ҳимоя қилиш ташкилоти (EPPO), БМТнинг Озиқ-овқат ва қишлоқ хўжалиги ташкилоти (FAO) ҳамда Кодекс Алиментариус комиссияси йиғим-теримдан кейинги ишлов ва сифат мезонлари бўйича ягона тамойилларни белгилайди [1, 2].", "Послеуборочное хранение плодов и овощей и оценка их качества основываются на международно стандартизированных подходах. Европейская и Средиземноморская организация по защите растений (EPPO), Продовольственная и сельскохозяйственная организация ООН (FAO) и Комиссия Кодекс Алиментариус устанавливают единые принципы послеуборочной обработки и критериев качества [1, 2]."), { indent: true }),
        P(tr("Йиғим-теримдан кейинги касалликлар (масалан, кулранг чириш — Botrytis cinerea ва бошқа замбуруғли касалликлар) паст ҳарорат ва юқори намлик шароитида ҳам ривожланиши, маҳсулот тўқималарини бузиши ва сақлаш давомида йирик нобудгарчиликка сабаб бўлиши хорижий тадқиқотларда кўрсатилган [3, 4]. Ушбу касалликларнинг ривожланиши маҳсулот физиологияси, ҳарорат ва намлик режими билан узвий боғлиқ.", "В зарубежных исследованиях показано, что послеуборочные болезни (например, серая гниль — Botrytis cinerea и другие грибные болезни) могут развиваться даже при низкой температуре и высокой влажности, разрушать ткани продукции и вызывать крупные потери при хранении [3, 4]. Развитие этих болезней тесно связано с физиологией продукции, температурным и влажностным режимом."), { indent: true }),
        P(tr("Таъсир этувчи модда " + ai + " ва унга ўхшаш консервант/ҳимоя воситалари бўйича хорижий адабиётларда уларнинг антимикроб ва замбуруғга қарши таъсир механизми батафсил ўрганилган. Тадқиқотларда бундай воситалар патоген ҳужайра деворига таъсир қилиб, спора ривожланишини секинлаштириши ва фитотоксик таъсир кўрсатмасдан маҳсулот сифатини сақлашга ёрдам бериши қайд этилган [5, 6, 7].", "В зарубежной литературе подробно изучен антимикробный и противогрибной механизм действия действующего вещества " + ai + " и аналогичных консервирующих/защитных средств. В исследованиях отмечено, что такие средства воздействуют на клеточную стенку патогена, замедляют развитие спор и, не оказывая фитотоксического действия, способствуют сохранению качества продукции [5, 6, 7]."), { indent: true }),
        P(tr("Сақлаш самарадорлиги ҳарорат, нисбий намлик, қадоқлаш усули, восита сарф меъёри ва қўллаш муддатига боғлиқлиги халқаро тадқиқотларда алоҳида таъкидланади. Кўплаб муаллифлар совутгичли сақлаш ва тегишли ишлов бирга қўлланганда сақлаш муддати сезиларли узайишини кўрсатган [8, 9].", "В международных исследованиях особо подчёркивается зависимость эффективности хранения от температуры, относительной влажности, способа упаковки, нормы расхода средства и срока применения. Многие авторы показали, что при совместном применении холодильного хранения и соответствующей обработки срок хранения существенно увеличивается [8, 9]."), { indent: true }),
        P(tr("Маҳаллий ва МДҲ мамлакатлари тадқиқотчилари ишларида тажрибаларни ташкил этиш ва статистик таҳлил қилишнинг Доспехов Б.А. услубияти, шунингдек Ўзбекистон Республикасининг давлат синов методикалари асос қилиб олинган. Ушбу ишларда халқаро ёндашувлар маҳаллий шароитга мослаштирилган [10, 11].", "В работах местных исследователей и учёных стран СНГ за основу приняты методика организации опытов и статистической обработки Б.А. Доспехова, а также государственные методики испытаний Республики Узбекистан. В этих работах международные подходы адаптированы к местным условиям [10, 11]."), { indent: true }),
        P(tr("Озиқ-овқат хавфсизлиги нуқтаи назаридан Кодекс Алиментариус (FAO/ЖССТ) томонидан белгиланган қолдиқ миқдорнинг рухсат этилган энг юқори даражалари (MRL) муҳим мезон ҳисобланади. Бу эса сақлаш воситаларини нафақат самарадорлиги, балки хавфсизлиги бўйича ҳам баҳолашни тақозо этади [12].", "С точки зрения продовольственной безопасности важным критерием являются максимально допустимые уровни остаточных количеств (MRL), установленные Кодекс Алиментариус (FAO/ВОЗ). Это требует оценки средств для хранения не только по эффективности, но и по безопасности [12]."), { indent: true }),
        P(tr("Адабиётлар таҳлили шуни кўрсатадики, ҳар бир сақлаш воситаси муайян маҳсулот тури, нави ва маҳаллий сақлаш шароитига нисбатан давлат синовидан ўтказилиши зарур. Мазкур тадқиқот " + prep + " воситасини " + meta.site + " шароитида синаб, ана шу илмий-амалий эҳтиёжни қондиришга қаратилган.", "Анализ литературы показывает, что каждое средство для хранения должно проходить государственное испытание применительно к конкретному виду продукции, сорту и местным условиям хранения. Настоящее исследование, испытывая средство " + prep + " в условиях " + meta.site + ", направлено на удовлетворение этой научно-практической потребности."), { indent: true }));
    } else {
      // ——— Дала синови учун Кириш ———
      ch.push(H(tr("КИРИШ", "ВВЕДЕНИЕ")),
        P(tr("Жаҳон миқёсида аҳолини озиқ-овқат маҳсулотлари билан барқарор таъминлаш ва қишлоқ хўжалиги ишлаб чиқаришини ривожлантириш бугунги куннинг устувор вазифаларидан биридир. Дунё аҳолисининг тобора ортиб бориши шароитида мавжуд ер, сув ва меҳнат ресурсларидан оқилона фойдаланиб, экин майдони бирлигидан олинадиган ҳосил миқдорини ошириш ҳамда унинг сифатини яхшилаш долзарб аҳамият касб этмоқда. Ўзбекистон Республикасида ҳам қишлоқ хўжалигини интенсив ривожлантириш, соҳага илм-фан ютуқлари ва замонавий агротехнологияларни жорий этишга алоҳида эътибор қаратилмоқда.", "Устойчивое обеспечение населения продовольствием и развитие сельскохозяйственного производства — одна из приоритетных задач современности. В условиях постоянного роста населения мира актуальное значение приобретает рациональное использование имеющихся земельных, водных и трудовых ресурсов, повышение урожайности с единицы площади и улучшение качества продукции. В Республике Узбекистан также уделяется особое внимание интенсивному развитию сельского хозяйства, внедрению научных достижений и современных агротехнологий."), { indent: true }),
        P(tr(crop + " экини республика деҳқончилигида муҳим ўрин тутади ва аҳолининг озиқ-овқатга бўлган эҳтиёжини қондиришда, шунингдек саноат хомашёсини таъминлашда стратегик аҳамиятга эга. Ушбу экиндан юқори ва барқарор ҳосил олиш кўп жиҳатдан агротехник тадбирларнинг сифати ҳамда ўсимликни зарарли организмлардан ўз вақтида ва самарали ҳимоя қилишга боғлиқ.", "Культура " + crop + " занимает важное место в земледелии республики и имеет стратегическое значение в удовлетворении потребности населения в продовольствии, а также в обеспечении промышленного сырья. Получение высокого и устойчивого урожая этой культуры во многом зависит от качества агротехнических мероприятий и своевременной и эффективной защиты растений от вредных организмов."), { indent: true }),
        P(tr("Экин ҳосилдорлигини камайтирувчи асосий омиллардан бири — " + org + " ҳисобланади. Жаҳон ва маҳаллий тадқиқотларда қайд этилишича, ушбу зарарли организмлар назорат қилинмаган ҳолда сезиларли ҳосил нобудгарчилигига (айрим ҳолларда умумий ҳосилнинг 20–50% гача) олиб келиши, шунингдек маҳсулот сифатини пасайтириши мумкин. Зарарли организмлар нафақат тўғридан-тўғри зарар етказади, балки касаллик тарқатувчи ва экологик мувозанатни бузувчи омил сифатида ҳам намоён бўлади.", "Одним из основных факторов, снижающих урожайность культуры, является " + org + ". Как отмечается в мировых и местных исследованиях, эти вредные организмы без контроля могут приводить к значительным потерям урожая (в отдельных случаях до 20–50% от общего урожая), а также снижать качество продукции. Вредные организмы не только причиняют прямой ущерб, но и проявляются как фактор распространения болезней и нарушения экологического равновесия."), { indent: true }),
        P(tr("Зарарли организмларга қарши курашда механик, агротехник, биологик ва кимёвий усуллар мажмуасидан фойдаланилади. Уйғунлашган ҳимоя тизимида кимёвий усул — ўсимликларни ҳимоя қилиш воситаларини қўллаш — ўзининг тезкорлиги, юқори самарадорлиги ва катта майдонларда қўллаш имконияти билан алоҳида ўрин тутади. Айни вақтда кимёвий воситаларни танлаб, мақбул меъёр ва муддатларда, атроф-муҳит ҳамда фойдали организмларга зарар етказмаган ҳолда қўллаш талаб этилади.", "В борьбе с вредными организмами используется комплекс механических, агротехнических, биологических и химических методов. В интегрированной системе защиты химический метод — применение средств защиты растений — занимает особое место благодаря своей оперативности, высокой эффективности и возможности применения на больших площадях. При этом требуется избирательное применение химических средств в оптимальных нормах и в оптимальные сроки, без нанесения ущерба окружающей среде и полезным организмам."), { indent: true }),
        P(tr("Ҳозирги кунда илмий асосланган, юқори биологик самарали, кам сарф меъёрида қўлланиладиган ва экологик хавфсиз препаратларни ишлаб чиқариш ҳамда амалиётга жорий этиш муҳим вазифа ҳисобланади. Ҳар қандай янги восита Давлат рўйхатига киритилишидан аввал белгиланган методикалар асосида давлат синовидан ўтказилиши, унинг биологик самарадорлиги, танланувчанлиги ва хавфсизлиги маҳаллий тупроқ-иқлим шароитида текширилиши шарт.", "На сегодняшний день важной задачей является разработка и внедрение в практику научно обоснованных, высокоэффективных, применяемых в малых нормах расхода и экологически безопасных препаратов. Любое новое средство перед включением в Государственный реестр должно пройти государственное испытание на основе установленных методик, при этом его биологическая эффективность, избирательность и безопасность проверяются в местных почвенно-климатических условиях."), { indent: true }),
        P(tr("Мазкур илмий ҳисобот " + prep + " (таъсир этувчи модда – " + ai + ") препаратининг " + tl + " сифатида " + crop + " экинида " + org + "га қарши биологик самарадорлигини давлат синови методикаси асосида аниқлашга бағишланган. Тадқиқотнинг асосий мақсади — препаратнинг " + meta.applicationRate + " сарф меъёридаги самарадорлигини баҳолаш, уни эталон (андоза) " + meta.referenceName + " билан таққослаш, ҳосилдорликка таъсирини ўрганиш ва Давлат рўйхатига киритиш бўйича асосланган хулоса тайёрлашдан иборат. Синов " + meta.site + "да, " + crop + " экинининг «" + variety + "» навида ўтказилди.", "Настоящий научный отчёт посвящён определению биологической эффективности препарата " + prep + " (действующее вещество – " + ai + ") в качестве " + tl + " против " + org + " на культуре " + crop + " на основе государственной методики испытаний. Основная цель исследования — оценить эффективность препарата при норме расхода " + meta.applicationRate + ", сравнить его с эталоном " + meta.referenceName + ", изучить влияние на урожайность и подготовить обоснованное заключение о включении в Государственный реестр. Испытание проведено в " + meta.site + ", на сорте «" + variety + "» культуры " + crop + "."), { indent: true }),
        P(tr("Тадқиқот натижалари олинган восита бўйича амалий тавсиялар ишлаб чиқиш, ҳимоя тадбирларини илмий асослаш ва минтақа деҳқончилигида барқарор ҳосил етиштиришни таъминлаш нуқтаи назаридан илмий ва амалий аҳамиятга эга.", "Результаты исследования имеют научное и практическое значение с точки зрения разработки практических рекомендаций по данному средству, научного обоснования защитных мероприятий и обеспечения устойчивого получения урожая в земледелии региона."), { indent: true }));
      // ——— Дала синови учун Адабиётлар шарҳи ———
      ch.push(H(tr("1. Адабиётлар шарҳи", "1. Обзор литературы")),
        P(tr("Ўсимликларни ҳимоя қилиш воситаларининг биологик самарадорлигини баҳолаш халқаро миқёсда стандартлаштирилган методикаларга асосланади. Европа ва Ўрта ер денгизи ўсимликларни ҳимоя қилиш ташкилоти (EPPO) нинг PP1 туркумидаги стандартлари, БМТнинг Озиқ-овқат ва қишлоқ хўжалиги ташкилоти (FAO) ҳамда Иқтисодий ҳамкорлик ва тараққиёт ташкилоти (OECD) нинг йўриқномалари синов дизайни, ҳисоб-китоб усуллари ва натижаларни талқин қилишда ягона ёндашувни белгилайди [2, 3].", "Оценка биологической эффективности средств защиты растений основывается на международно стандартизированных методиках. Стандарты серии PP1 Европейской и Средиземноморской организации по защите растений (EPPO), руководства Продовольственной и сельскохозяйственной организации ООН (FAO) и Организации экономического сотрудничества и развития (OECD) устанавливают единый подход к дизайну испытаний, методам расчёта и интерпретации результатов [2, 3]."), { indent: true }),
        P(tr("Самарадорликни ҳисоблашда халқаро амалиётда бир қатор классик усуллар қўлланилади. Зараркунандаларга қарши воситалар учун Abbott (1925) формуласи ва Schneider–Orelli тузатиши, касалликларга қарши препаратлар учун касалланиш даражаси ва ривожланиш индексига асосланган EPPO усуллари, бегона ўтларга қарши гербицидлар учун эса зичлик ва биомасса бўйича ҳисоблаш методлари кенг тарқалган [2]. Ушбу усуллар турли мамлакатларда ўтказилган тадқиқотлар натижаларини қиёслаш имконини беради.", "В международной практике при расчёте эффективности применяется ряд классических методов. Для средств против вредителей широко распространена формула Abbott (1925) и поправка Schneider–Orelli; для препаратов против болезней — методы EPPO, основанные на степени поражения и индексе развития; для гербицидов против сорняков — методы расчёта по плотности и биомассе [2]. Эти методы позволяют сопоставлять результаты исследований, проведённых в разных странах."), { indent: true }),
        P(tr("Таъсир этувчи модда " + ai + " ва унга ўхшаш препаратлар бўйича хорижий адабиётларда уларнинг таъсир механизми, мақсадли организмлар спектри ҳамда танланувчанлиги батафсил ўрганилган. Дала ва лаборатория тажрибаларида ушбу гуруҳ препаратлари мақсадли зарарли организмларга нисбатан юқори биологик фаоллик кўрсатиши, айни вақтда маданий ўсимликка нисбатан танланувчан таъсир этиши қайд этилган [3].", "В зарубежной литературе подробно изучены механизм действия, спектр целевых организмов и избирательность действующего вещества " + ai + " и аналогичных препаратов. В полевых и лабораторных опытах отмечено, что препараты этой группы проявляют высокую биологическую активность против целевых вредных организмов и при этом оказывают избирательное действие по отношению к культурному растению [3]."), { indent: true }),
        P(tr("Халқаро тадқиқотларда препаратлар самарадорлиги об-ҳаво шароити, қўллаш муддати, зарарли организм ривожланиш фазаси ва сарф меъёрига боғлиқлиги алоҳида таъкидланади. Кўплаб муаллифлар воситани зарарли организм ривожланишининг дастлабки босқичларида қўллаш энг юқори самара беришини кўрсатган [2, 3]. Шунингдек, резистентликнинг олдини олиш мақсадида таъсир механизми турлича бўлган препаратларни навбатлаб қўллаш (IRAC, FRAC, HRAC тавсиялари) муҳим омил сифатида эътироф этилади [6].", "В международных исследованиях особо подчёркивается зависимость эффективности препаратов от погодных условий, срока применения, фазы развития вредного организма и нормы расхода. Многие авторы показали, что применение средства на ранних стадиях развития вредного организма даёт наибольший эффект [2, 3]. Кроме того, в целях предотвращения резистентности важным фактором признаётся чередование препаратов с различным механизмом действия (рекомендации IRAC, FRAC, HRAC) [6]."), { indent: true }),
        P(tr("Маҳаллий ва МДҲ мамлакатлари тадқиқотчилари ишларида дала тажрибаларини ташкил этиш ва статистик таҳлил қилишнинг Доспехов Б.А. услубияти, шунингдек Ўзбекистон Республикасининг давлат синов методикалари асос қилиб олинган. Ушбу ишларда халқаро ёндашувлар маҳаллий тупроқ-иқлим шароитига мослаштирилиб, минтақа учун самарали ҳимоя тизимлари ишлаб чиқилган [1, 6].", "В работах местных исследователей и учёных стран СНГ за основу приняты методика организации полевых опытов и статистической обработки Б.А. Доспехова, а также государственные методики испытаний Республики Узбекистан. В этих работах международные подходы адаптированы к местным почвенно-климатическим условиям, разработаны эффективные системы защиты для региона [1, 6]."), { indent: true }),
        P(tr("Атроф-муҳит ва озиқ-овқат хавфсизлиги нуқтаи назаридан халқаро миқёсда Кодекс Алиментариус (FAO/ЖССТ) томонидан белгиланган қолдиқ миқдорнинг рухсат этилган энг юқори даражалари (MRL) ва Жаҳон соғлиқни сақлаш ташкилотининг препаратлар хавфлилик таснифи муҳим мезон сифатида қаралади. Бу эса препаратларни нафақат самарадорлиги, балки хавфсизлиги бўйича ҳам ҳар томонлама баҳолашни тақозо этади.", "С точки зрения экологической и продовольственной безопасности важным критерием считаются установленные в международном масштабе Кодекс Алиментариус (FAO/ВОЗ) максимально допустимые уровни остаточных количеств (MRL) и классификация препаратов по опасности Всемирной организации здравоохранения. Это требует всесторонней оценки препаратов не только по эффективности, но и по безопасности."), { indent: true }),
        P(tr("Адабиётлар таҳлили шуни кўрсатадики, хорижда препаратлар бўйича етарли маълумот мавжуд бўлса-да, ҳар бир восита муайян мамлакатнинг тупроқ-иқлим шароити, экин навлари ва зарарли организмлар турига нисбатан маҳаллий давлат синовидан ўтказилиши зарур. Мазкур тадқиқот " + prep + " препаратини " + meta.site + " шароитида синаб, ана шу илмий-амалий эҳтиёжни қондиришга қаратилган.", "Анализ литературы показывает, что, несмотря на наличие достаточных данных о препаратах за рубежом, каждое средство должно проходить местное государственное испытание применительно к почвенно-климатическим условиям конкретной страны, сортам культур и видам вредных организмов. Настоящее исследование, испытывая препарат " + prep + " в условиях " + meta.site + ", направлено на удовлетворение этой научно-практической потребности."), { indent: true }));
    }

    // 3. Синов баёномаси
    ch.push(H(tr("2. Синов баённомаси", "2. Протокол испытания")),
      FLD("2.1.", tr("Талабгор ташкилот номи, давлати", "Наименование и страна организации-заявителя"), (meta.applicantOrg || meta.manufacturer) + (meta.country ? ", " + meta.country : "")),
      FLD("2.2.", tr("Савдо номи", "Торговое наименование"), meta.tradeName || meta.preparatName),
      FLD("2.3.", tr("Таъсир этувчи моддаси", "Действующее вещество"), meta.activeIngredients),
      FLD("2.4.", tr("Препарат шакли", "Препаративная форма"), meta.preparatForm),
      FLD("2.5.", tr("Зарарли организм номи", "Наименование вредного организма"), meta.targetOrganism),
      FLD("2.6.", tr("Синов жойи ва хўжалик номи", "Место испытания и наименование хозяйства"), meta.site),
      FLD("2.7.", tr("Синов ўтказилган муддат", "Срок проведения испытания"), meta.trialDate),
      FLD("2.8.", tr("Экин тури, нави", "Вид культуры, сорт"), meta.crop + (meta.variety ? ", " + meta.variety : "")),
      FLD("2.9.", tr("Лаборатория хулосаси", "Заключение лаборатории"), meta.labConclusion || "—"),
      FLD("2.10.", tr("Андоза (эталон)", "Эталон"), meta.referenceFullDesc || meta.referenceName),
      FLD("2.11.", tr("Сарф меъёри (ишчи эритма)", "Норма расхода (рабочий раствор)"), meta.applicationRate + (meta.workingSolution ? "; " + meta.workingSolution : "")),
      FLD("2.12.", tr("Тажриба тури", "Тип опыта"), meta.experimentType || tr("кичик дала тажрибаси", "мелкоделяночный полевой опыт")),
      FLD("2.13.", tr("Жиҳоз/ускуна", "Оборудование/аппаратура"), meta.testEquipment || "—"),
      FLD("2.14.", tr("Қўллаш усули", "Способ применения"), meta.applicationMethod || tr("пуркаш", "опрыскивание")),
      FLD("2.15.", tr("Ҳаво ҳарорати, намлик", "Температура воздуха, влажность"), meta.weather));
    if (meta.laboratory && meta.laboratory.trim()) ch.push(FLD("2.16.", tr("Лаборатория", "Лаборатория"), meta.laboratory));
    if (meta.cropPhase && meta.cropPhase.trim()) ch.push(FLD("2.17.", tr("Экин ривожланиш фазаси", "Фаза развития культуры"), meta.cropPhase));

    // 4. Методика
    ch.push(H(tr("3. Синов ўтказиш жойи ва услублари (методикаси)", "3. Место и методы (методика) проведения испытания")),
      P(tr(
        (meta.site ? "Синов " + meta.site + "да ўтказилди. " : "") + meta.preparatName + " препарати биологик самарадорлиги давлат синов методикаси, ҳосилдорлик Б.А.Доспехов (1985) усулида олиб борилди. Ҳисоблаш методикаси: " + rep.efficacyMethodLabel + ".",
        (meta.site ? "Испытание проведено в " + meta.site + ". " : "") + "Биологическая эффективность препарата " + meta.preparatName + " определялась по государственной методике испытаний, урожайность — по методу Б.А. Доспехова (1985). Методика расчёта: " + rep.efficacyMethodLabel + "."
      ), { indent: true }));
    if (rep.storage) {
      ch.push(P(tr("Касаллик ривожланиш даражаси R = Σ(a·b)·100/(N·K) формуласи бўйича, касалланган мевалар улуши эса Km = (A−a)·100/A формуласи бўйича аниқланди. Бунда: a·b — зарарланган органларнинг балл ифодасига кўпайтмаси йиғиндиси; N — кузатилган намуналар умумий сони; K — шкаладаги энг юқори балл; A — соғлом мевалар оғирлиги; a — касалланган мевалар оғирлиги. Биологик самарадорлик назорат вариантига нисбатан касалланиш даражасининг камайиши бўйича баҳоланди.", "Степень развития болезни определялась по формуле R = Σ(a·b)·100/(N·K), а доля поражённых плодов — по формуле Km = (A−a)·100/A. Здесь: a·b — сумма произведений числа поражённых органов на балл; N — общее число наблюдаемых образцов; K — высший балл шкалы; A — масса здоровых плодов; a — масса поражённых плодов. Биологическая эффективность оценивалась по снижению степени поражения относительно контрольного варианта."), { indent: true }));
    }
    // Ҳисоблаш формуласи — метод турига қараб (сақлаш формуласи юқорида)
    if (!rep.storage) {
      var formUz = null, formRu = null;
      if (rep.methodKey === "weed") {
        formUz = "Биологик самарадорлик қуйидаги формула бўйича ҳисобланди: С = (Зн − Зт) / Зн × 100, бунда: С — биологик самарадорлик, %; Зн — назорат вариантидаги бегона ўтлар зичлиги (дона/м²); Зт — тажриба вариантидаги бегона ўтлар зичлиги (дона/м²).";
        formRu = "Биологическая эффективность рассчитывалась по формуле: Э = (Пк − Пт) / Пк × 100, где: Э — биологическая эффективность, %; Пк — плотность сорняков в контроле (шт./м²); Пт — плотность сорняков в опыте (шт./м²).";
      } else if (rep.methodKey === "disease") {
        formUz = "Биологик самарадорлик қуйидаги формула бўйича ҳисобланди: С = (Ин − Ит) / Ин × 100, бунда: С — биологик самарадорлик, %; Ин — назорат вариантидаги касаллик ривожланиш индекси, %; Ит — тажриба вариантидаги касаллик ривожланиш индекси, %.";
        formRu = "Биологическая эффективность рассчитывалась по формуле: Э = (Ик − Ит) / Ик × 100, где: Э — биологическая эффективность, %; Ик — индекс развития болезни в контроле, %; Ит — индекс развития болезни в опыте, %.";
      } else if (rep.methodKey === "abbott" || rep.countRows) {
        formUz = "Биологик самарадорлик Abbott (1925) формуласи бўйича ҳисобланди: С = (К − Т) / К × 100, бунда: С — биологик самарадорлик, %; К — назорат вариантидаги зарарли организмлар сони (ишловдан кейин); Т — тажриба вариантидаги зарарли организмлар сони (ишловдан кейин).";
        formRu = "Биологическая эффективность рассчитывалась по формуле Abbott (1925): Э = (К − О) / К × 100, где: Э — биологическая эффективность, %; К — численность вредных организмов в контроле (после обработки); О — численность вредных организмов в опыте (после обработки).";
      }
      if (formUz) ch.push(P(tr(formUz, formRu), { indent: true }));
    }
    // Кузатиш кунлари — реал дала маълумотидан
    if (rep.days && rep.days.length) {
      var dd = rep.days.map(String);
      var joinU = dd.length > 1 ? dd.slice(0, -1).join(", ") + " ва " + dd[dd.length - 1] : dd[0];
      var joinR = dd.length > 1 ? dd.slice(0, -1).join(", ") + " и " + dd[dd.length - 1] : dd[0];
      ch.push(P(tr("Биологик самарадорлик ишлов берилгандан кейин " + joinU + "-кунлари аниқланди.", "Биологическая эффективность определялась на " + joinR + "-е сутки после обработки."), { indent: true }));
    }
    // Тажриба шароити — форма майдонларидан (фақат тўлдирилганлари)
    (function () {
      var pu = [], pr = [];
      if (meta.replications) { pu.push("такрорлар сони — " + meta.replications); pr.push("повторность — " + meta.replications + "-кратная"); }
      if (meta.plotArea) { pu.push("делянка майдони — " + meta.plotArea + " м²"); pr.push("площадь делянки — " + meta.plotArea + " м²"); }
      if (meta.plotLayout) { pu.push("жойлаштириш усули — " + meta.plotLayout); pr.push("размещение делянок — " + meta.plotLayout); }
      if (pu.length) ch.push(P(tr("Тажриба шароити: " + pu.join("; ") + ".", "Условия опыта: " + pr.join("; ") + "."), { indent: true }));
    })();
    ch.push(P(tr("Тажриба тизими:", "Схема опыта:"), { bold: true, after: 60 }));
    rep.efficacyRows.forEach(function (r, i) { var lb = r.isControl ? tr("(ишлов ўтказилмаган)", "(без обработки)") : (r.isReference ? tr("(андоза)", "(эталон)") : ""); ch.push(P((i + 1) + ". " + r.variant + " " + lb, { size: BODY, after: 40 })); });
    if (rep.organisms && rep.organisms.length) {
      ch.push(P(tr("1-жадвал", "Таблица 1"), { align: "right", size: TBL, after: 40 }), P(tr("Тажриба майдонларида учрайдиган асосий " + meta.targetOrganism.toLowerCase(), "Основные " + meta.targetOrganism.toLowerCase() + ", встречающиеся на опытных участках"), { bold: true, align: "center", size: BODY }));
      var orows = [new D.TableRow({ tableHeader: true, children: [CELL("№", { bold: true, shade: "e8e8e8" }), CELL(tr("Организм номи", "Наименование организма"), { bold: true, shade: "e8e8e8", align: "left" }), CELL(tr("1 м² даги сони (ишловгача)", "Численность на 1 м² (до обработки)"), { bold: true, shade: "e8e8e8" })] })];
      rep.organisms.forEach(function (o, i) { orows.push(new D.TableRow({ children: [CELL(String(i + 1)), CELL(o.name, { align: "left" }), CELL(fmt(o.before, 1))] })); });
      ch.push(TABLE(orows));
    }

    // 5. Натижалар
    ch.push(H(tr("4. Тажриба (тадқиқот) натижалари", "4. Результаты опыта (исследования)")));
    if (rep.storage) {
      storageTables(ch, rep, meta);
    } else {
      ch.push(P(tr("2-жадвал", "Таблица 2"), { align: "right", size: TBL, after: 40 }),
        P(tr(meta.preparatName + " препаратининг " + lcFirst(meta.targetOrganism) + "га қарши биологик самарадорлиги", "Биологическая эффективность препарата " + meta.preparatName + " против " + lcFirst(meta.targetOrganism)), { bold: true, align: "center", size: BODY }));
      ch.push(rep.detailed && rep.detailed.periods.length ? detailTable(rep) : effTable(rep));
    }

    return { children: ch, institute: institute, nonControl: nonControl, overallBest: overallBest };
  }

  // асосий: тўлиқ ҳужжат (график билан, async)
  function generateDocx(rep, meta) {
    LANG = detectLang();
    var built = buildReport(rep, meta);
    var ch = built.children, overallBest = built.overallBest, institute = built.institute;
    var best = rep.efficacyRows.filter(function (r) { return !r.isControl && r.mean != null; }).sort(function (a, b) { return (b.mean || 0) - (a.mean || 0); })[0];

    var chartPromises = [];
    if (best && rep.days.length && !rep.storage) chartPromises.push(svgToPng(barSvg(tr("Биологик самарадорлик — ", "Биологическая эффективность — ") + best.variant + ", %", rep.days.map(function (d) { return tr(d + "-кун", d + " сут."); }), rep.days.map(function (d) { return best.byDay[d]; }), 100, "%")).then(function (png) { return { type: "eff", png: png, variant: best.variant }; }));
    if (rep.yieldRows && rep.yieldRows.length) {
      var ymax = Math.max.apply(null, rep.yieldRows.map(function (r) { return r.mean || 0; })) * 1.2 || 1;
      chartPromises.push(svgToPng(barSvg(tr("Ҳосилдорлик, ", "Урожайность, ") + (rep.yieldUnit || tr("ц/га", "ц/га")), rep.yieldRows.map(function (r) { return r.variant.length > 14 ? r.variant.slice(0, 13) + "…" : r.variant; }), rep.yieldRows.map(function (r) { return r.mean || 0; }), ymax)).then(function (png) { return { type: "yield", png: png }; }));
    }

    return Promise.all(chartPromises).then(function (charts) {
      var effChart = charts.filter(function (c) { return c.type === "eff"; })[0];
      var yChart = charts.filter(function (c) { return c.type === "yield"; })[0];
      if (effChart && effChart.png) { ch.push(IMG(effChart.png)); ch.push(CAP(tr("1-расм. «" + effChart.variant + "» варианти бўйича биологик самарадорлик динамикаси.", "Рисунок 1. Динамика биологической эффективности по варианту «" + effChart.variant + "»."))); }

      // матнли таҳлил
      if (rep.detailed) {
        built.nonControl.forEach(function (nv) {
          var per = rep.detailed.periods.map(function (p) { return tr(p.day + " кундан кейин – ", "после " + p.day + " сут. – ") + fmt(p.meanRow.byVariant[nv].pct, 1) + "%"; }).join(", ");
          ch.push(P(tr(nv + " қўлланганда самарадорлик: " + per + "; ўртача " + rep.detailed.periods.length + "-ҳисобда – " + fmt(rep.detailed.overallMeanRow.byVariant[nv].pct, 1) + "%.", "При применении " + nv + " эффективность: " + per + "; в среднем по " + rep.detailed.periods.length + " учётам – " + fmt(rep.detailed.overallMeanRow.byVariant[nv].pct, 1) + "%."), { indent: true }));
        });
      }
      if (rep.storage) {
        rep.storage.rows.filter(function (r) { return !r.isControl; }).forEach(function (r) {
          var parts = rep.storage.diseases.map(function (d) { return tr(d + " бўйича касалланиш даражаси " + fmt(r.byDisease[d].severity, 1) + "% (самарадорлик " + fmt(r.byDisease[d].efficacyPct, 1) + "%)", "степень поражения по " + d + " " + fmt(r.byDisease[d].severity, 1) + "% (эффективность " + fmt(r.byDisease[d].efficacyPct, 1) + "%)"); }).join(", ");
          ch.push(P(tr(r.variant + " қўлланганда касалланмаган мевалар улуши " + fmt(r.healthy, 1) + "%, мевалар турғорлиги " + fmt(r.firmness, 2) + " кг/см² бўлди; " + parts + ".", "При применении " + r.variant + " доля здоровых плодов составила " + fmt(r.healthy, 1) + "%, твёрдость плодов — " + fmt(r.firmness, 2) + " кг/см²; " + parts + "."), { indent: true }));
        });
      }

      // 3-жадвал ҳосилдорлик
      if (rep.yieldRows && rep.yieldRows.length) {
        ch.push(P(tr("3-жадвал", "Таблица 3"), { align: "right", size: TBL, after: 40 }), P(tr(meta.preparatName + " препаратининг " + lcFirst(meta.crop) + " ҳосилдорлигига таъсири", "Влияние препарата " + meta.preparatName + " на урожайность " + lcFirst(meta.crop)), { bold: true, align: "center", size: BODY }));
        var ctrl = rep.yieldRows.filter(function (r) { return r.isControl; })[0], cMean = ctrl ? ctrl.mean : null;
        var yrows = [new D.TableRow({ tableHeader: true, children: [CELL(tr("Вариант", "Вариант"), { bold: true, shade: "e8e8e8", align: "left" }), CELL(tr("Ҳосилдорлик, ", "Урожайность, ") + (rep.yieldUnit || "ц/га"), { bold: true, shade: "e8e8e8" }), CELL(tr("Қўшимча ҳосил", "Прибавка урожая"), { bold: true, shade: "e8e8e8" })] })];
        rep.yieldRows.forEach(function (r) { var ex = (r.isControl || cMean == null || r.mean == null) ? null : r.mean - cMean; yrows.push(new D.TableRow({ children: [CELL(r.variant, { align: "left", bold: r.isControl }), CELL(fmt(r.mean, 1)), CELL(r.isControl ? "—" : fmt(ex, 1))] })); });
        ch.push(TABLE(yrows));
        if (yChart && yChart.png) { ch.push(IMG(yChart.png)); ch.push(CAP(tr("2-расм. Вариантлар бўйича ўртача ҳосилдорлик.", "Рисунок 2. Средняя урожайность по вариантам."))); }
        if (rep.yieldAnova) {
          var a = rep.yieldAnova;
          var concl = a.zeroError
            ? tr("Хатолик дисперсияси ≈ 0 (такрорлар айнан бир хил) — F ва НСР ишончли баҳоланмади; дала маълумотларини текширинг.", "Дисперсия ошибки ≈ 0 (повторности практически совпадают) — F и НСР оценить достоверно нельзя; проверьте полевые данные.")
            : (a.significant ? tr("Вариантлар фарқи статистик ишончли (P<0,05).", "Различия между вариантами статистически достоверны (P<0,05).") : tr("Фарқ статистик ишончли эмас.", "Различия статистически недостоверны."));
          ch.push(P(tr("Дисперсион таҳлил (ANOVA): НСР₀.₀₅ = " + fmt(a.lsd05, 2) + "; CV% = " + fmt(a.cvPct, 2) + "; F = " + fmt(a.fValue, 2) + "; P = " + fmt(a.pValue, 4) + ". " + concl, "Дисперсионный анализ (ANOVA): НСР₀.₀₅ = " + fmt(a.lsd05, 2) + "; CV% = " + fmt(a.cvPct, 2) + "; F = " + fmt(a.fValue, 2) + "; P = " + fmt(a.pValue, 4) + ". " + concl), { indent: true }));
        }
      }

      // 6. Хулоса — синов турига мос
      ch.push(H(tr("5. Хулоса ва тавсиялар", "5. Выводы и рекомендации")));
      // Тавсия шарти: биологик самарадорлик 60% дан паст бўлса — рўйхатга тавсия этилмайди
      var recommend = (overallBest != null && overallBest >= 60);
      if (rep.storage) {
        // ——— Сақлаш синови учун хулоса ———
        var sBest = rep.storage.rows.filter(function (r) { return !r.isControl; }).sort(function (a, b) { return (b.healthy || 0) - (a.healthy || 0); })[0];
        var sCtrl = rep.storage.rows.filter(function (r) { return r.isControl; })[0];
        var disTxt = sBest ? rep.storage.diseases.map(function (d) { return tr(d + " бўйича касалланиш даражаси " + fmt(sBest.byDisease[d].severity, 1) + "% (самарадорлик " + fmt(sBest.byDisease[d].efficacyPct, 1) + "%)", "степень поражения по " + d + " " + fmt(sBest.byDisease[d].severity, 1) + "% (эффективность " + fmt(sBest.byDisease[d].efficacyPct, 1) + "%)"); }).join(", ") : "";
        var n = 0;
        ch.push(P(tr((n + 1) + ". " + meta.crop + " маҳсулотини сақлашда " + meta.preparatName + " (" + meta.applicationRate + ") воситаси қўлланганда касалланмаган мевалар улуши " + fmt(sBest ? sBest.healthy : overallBest, 1) + "%, мевалар турғорлиги " + (sBest ? fmt(sBest.firmness, 2) + " кг/см²" : "юқори даражада") + " бўлди; " + disTxt + ".", (n + 1) + ". При применении средства " + meta.preparatName + " (" + meta.applicationRate + ") при хранении продукции " + lcFirst(meta.crop) + " доля здоровых плодов составила " + fmt(sBest ? sBest.healthy : overallBest, 1) + "%, твёрдость плодов — " + (sBest ? fmt(sBest.firmness, 2) + " кг/см²" : "на высоком уровне") + "; " + disTxt + "."), { indent: true })); n++;
        if (sCtrl) { ch.push(P(tr((n + 1) + ". Назорат вариантида (ишлов берилмаган) касалланмаган мевалар улуши атиги " + fmt(sCtrl.healthy, 1) + "% ни ташкил этди — бу восита сақлаш давомида микробиологик фаолликни пасайтириши ва маҳсулот сифатини сақлашга ёрдам беришини кўрсатади.", (n + 1) + ". В контрольном варианте (без обработки) доля здоровых плодов составила лишь " + fmt(sCtrl.healthy, 1) + "% — это свидетельствует о том, что средство снижает микробиологическую активность при хранении и способствует сохранению качества продукции."), { indent: true })); n++; }
        ch.push(P(tr((n + 1) + ". Восита мақбул меъёрда қўлланганда фитотоксик таъсир, ёт ҳид ёки қолдиқ модда кузатилмади; уни қўллаш технологияси оддий ва иқтисодий жиҳатдан мақбул.", (n + 1) + ". При применении средства в оптимальной норме фитотоксического действия, постороннего запаха или остаточных веществ не наблюдалось; технология его применения проста и экономически приемлема."), { indent: true })); n++;
        ch.push(P(recommend
          ? tr((n + 1) + ". Тажриба натижаларидан келиб чиққан ҳолда " + meta.preparatName + " (" + meta.applicationRate + ") воситасини " + lcFirst(meta.crop) + " маҳсулотини сақлашда " + lcFirst(meta.targetOrganism) + "нинг олдини олиш учун Давлат рўйхатига киритиш тавсия этилади.", (n + 1) + ". Исходя из результатов опыта, рекомендуется включить средство " + meta.preparatName + " (" + meta.applicationRate + ") в Государственный реестр для предотвращения " + lcFirst(meta.targetOrganism) + " при хранении продукции " + lcFirst(meta.crop) + ".")
          : tr((n + 1) + ". Самарадорлик кўрсаткичи 60% дан паст (" + fmt(overallBest, 1) + "%) бўлгани сабабли " + meta.preparatName + " воситасини Давлат рўйхатига киритиш ушбу синов натижалари асосида тавсия этилмайди; синовларни такрорлаш ёки давом эттириш тавсия этилади.", (n + 1) + ". Поскольку показатель эффективности ниже 60% (" + fmt(overallBest, 1) + "%), включение средства " + meta.preparatName + " в Государственный реестр по результатам данного испытания не рекомендуется; рекомендуется повторить или продолжить испытания."), { indent: true }));
      } else {
        // ——— Дала синови учун хулоса ———
        ch.push(P(tr("1. Олиб борилган тажриба натижаларига кўра " + meta.preparatName + " (" + meta.applicationRate + ") препарати " + lcFirst(meta.targetOrganism) + "га қарши " + fmt(overallBest, 1) + "% биологик самарадорлик кўрсатди.", "1. По результатам проведённого опыта препарат " + meta.preparatName + " (" + meta.applicationRate + ") показал биологическую эффективность против " + lcFirst(meta.targetOrganism) + " на уровне " + fmt(overallBest, 1) + "%."), { indent: true }),
          P(tr("2. Препарат мақбул меъёрда қўлланганда токсик (фитотоксик) ҳолатлар кузатилмади.", "2. При применении препарата в оптимальной норме токсических (фитотоксических) явлений не наблюдалось."), { indent: true }));
        if (rep.yieldRows) { var ctrl2 = rep.yieldRows.filter(function (r) { return r.isControl; })[0], trow = rep.yieldRows.filter(function (r) { return !r.isControl && r.increaseVsControlPct != null; })[0]; if (ctrl2 && trow && ctrl2.mean != null && trow.mean != null) ch.push(P(tr("3. Назоратга нисбатан қўшимча " + fmt(trow.mean - ctrl2.mean, 1) + " " + (rep.yieldUnit || "ц/га") + " ҳосил олинди.", "3. По сравнению с контролем получена дополнительная прибавка урожая " + fmt(trow.mean - ctrl2.mean, 1) + " " + (rep.yieldUnit || "ц/га") + "."), { indent: true })); }
        ch.push(P(recommend
          ? tr("4. Тажриба натижаларидан келиб чиққан ҳолда " + meta.preparatName + " (" + meta.applicationRate + ") препаратини Давлат рўйхатига киритиш тавсия этилади.", "4. Исходя из результатов опыта, рекомендуется включить препарат " + meta.preparatName + " (" + meta.applicationRate + ") в Государственный реестр.")
          : tr("4. Биологик самарадорлик 60% дан паст (" + fmt(overallBest, 1) + "%) бўлгани сабабли " + meta.preparatName + " препаратини Давлат рўйхатига киритиш ушбу синов натижалари асосида тавсия этилмайди; синовларни такрорлаш ёки давом эттириш тавсия этилади.", "4. Поскольку биологическая эффективность ниже 60% (" + fmt(overallBest, 1) + "%), включение препарата " + meta.preparatName + " в Государственный реестр по результатам данного испытания не рекомендуется; рекомендуется повторить или продолжить испытания."), { indent: true }));
      }

      // 7. Адабиётлар — ГОСТ 7.1-2003 талабида, синов турига мос
      ch.push(H(tr("6. Фойдаланилган адабиётлар рўйхати", "6. Список использованной литературы")));
      var refs = (meta.references || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      // Умумий ўзак — барча дала синовлари учун
      var gostCore = [
        "Доспехов, Б. А. Методика полевого опыта (с основами статистической обработки результатов исследований) / Б. А. Доспехов. – 5-е изд., перераб. и доп. – Москва : Агропромиздат, 1985. – 351 с.",
        "EPPO Standard PP 1/152 (4). Design and analysis of efficacy evaluation trials // EPPO Bulletin. – Paris : EPPO, 2012. – Vol. 42, № 3. – P. 367–381.",
        "EPPO Standard PP 1/181 (5). Conduct and reporting of efficacy evaluation trials, including good experimental practice // EPPO Bulletin. – Paris : EPPO, 2021.",
        "FAO. International Code of Conduct on Pesticide Management. – Rome : Food and Agriculture Organization of the United Nations, 2014. – 44 p.",
        "Codex Alimentarius. Pesticide Residues in Food and Feed : Maximum Residue Limits (MRLs). – Rome : FAO/WHO, 2021.",
        tr("Ўсимликларни ҳимоя қилиш воситаларини рўйхатга олиш бўйича давлат синовларини ўтказиш услубий кўрсатмалари. – Тошкент : Ўсимликлар карантини ва ҳимояси агентлиги, 2020.", "Методические указания по проведению государственных испытаний средств защиты растений для регистрации. – Ташкент : Агентство по карантину и защите растений, 2020."),
        "ГОСТ 7.1–2003. Библиографическая запись. Библиографическое описание. Общие требования и правила составления. – Москва : Изд-во стандартов, 2004. – 48 с."
      ];
      // Синов турига хос манбалар (methodKey бўйича)
      var gostExtra = {
        abbott: [
          "Abbott, W. S. A method of computing the effectiveness of an insecticide / W. S. Abbott // Journal of Economic Entomology. – 1925. – Vol. 18, № 2. – P. 265–267.",
          "Schneider-Orelli, O. Entomologisches Praktikum / O. Schneider-Orelli. – Aarau : Sauerländer, 1947. – 237 S.",
          "IRAC. Mode of Action Classification Scheme. Version 10.4 / Insecticide Resistance Action Committee. – 2023. – 32 p."
        ],
        disease: [
          "FRAC. FRAC Code List : Fungicides sorted by mode of action / Fungicide Resistance Action Committee. – 2023."
        ],
        weed: [
          "HRAC. Global Herbicide Mode of Action Classification / Herbicide Resistance Action Committee. – 2022."
        ]
      };
      // Ўзак [1–7] аввал (тур мустақил, барқарор рақамлаш), тур-специфик манбалар охирида [8+]
      var gostField = gostCore.concat(gostExtra[rep.methodKey] || []);
      var gostStorage = [
        "Kader, A. A. Postharvest Technology of Horticultural Crops / A. A. Kader. – 3rd ed. – Oakland : University of California, Agriculture and Natural Resources, 2002. – 535 p.",
        "Snowdon, A. L. A Colour Atlas of Post-harvest Diseases and Disorders of Fruits and Vegetables. Vol. 1 : General Introduction and Fruits / A. L. Snowdon. – London : Wolfe Scientific, 1990. – 302 p.",
        "Barkai-Golan, R. Postharvest Diseases of Fruits and Vegetables : Development and Control / R. Barkai-Golan. – Amsterdam : Elsevier, 2001. – 418 p.",
        "Доспехов, Б. А. Методика полевого опыта (с основами статистической обработки результатов исследований) / Б. А. Доспехов. – 5-е изд., перераб. и доп. – Москва : Агропромиздат, 1985. – 351 с.",
        "EPPO Standard PP 1/152 (4). Design and analysis of efficacy evaluation trials // EPPO Bulletin. – Paris : EPPO, 2012. – Vol. 42, № 3. – P. 367–381.",
        "FAO. Manual for the Preparation and Sale of Fruits and Vegetables : From Field to Market. – Rome : Food and Agriculture Organization of the United Nations, 2004. – 189 p.",
        "FAO. International Code of Conduct on Pesticide Management. – Rome : Food and Agriculture Organization of the United Nations, 2014. – 44 p.",
        "Codex Alimentarius. Pesticide Residues in Food and Feed : Maximum Residue Limits (MRLs). – Rome : FAO/WHO, 2021.",
        "WHO. The WHO Recommended Classification of Pesticides by Hazard and Guidelines to Classification 2019. – Geneva : World Health Organization, 2020. – 92 p.",
        "FAO. Reducing Post-harvest Losses in the Food Supply Chain. – Rome : Food and Agriculture Organization of the United Nations, 2019.",
        tr("Ўсимликларни ҳимоя қилиш воситаларини рўйхатга олиш бўйича давлат синовларини ўтказиш услубий кўрсатмалари. – Тошкент : Ўсимликлар карантини ва ҳимояси агентлиги, 2020.", "Методические указания по проведению государственных испытаний средств защиты растений для регистрации. – Ташкент : Агентство по карантину и защите растений, 2020."),
        "ГОСТ 7.1–2003. Библиографическая запись. Библиографическое описание. Общие требования и правила составления. – Москва : Изд-во стандартов, 2004. – 48 с."
      ];
      var refList = refs.length ? refs : (rep.storage ? gostStorage : gostField);
      refList.forEach(function (r, i) { ch.push(P(/^\d+\.\s/.test(r) ? r : (i + 1) + ". " + r, { size: BODY, after: 60 })); });

      // 8. 1-форма — рўйхатга олиш бўйича хулоса ва тавсиялар (АЛБОМ бўлими)
      var form1 = [];
      var L = { align: "left", after: 30, line: 240, size: TBL };  // ихчам банд
      form1.push(P(tr("1-форма", "Форма 1"), { align: "right", after: 30 }),
        P(tr("Рўйхатга олиш учун синовлар якуни бўйича хулоса ва тавсиялар", "Выводы и рекомендации по итогам испытаний для регистрации"), { heading: D.HeadingLevel.HEADING_1, bold: true, align: "center", size: BODY, after: 120 }),
        P(tr("1. Ўсимликларни ҳимоя қилиш воситасининг савдо номи – " + (meta.tradeName || meta.preparatName), "1. Торговое наименование средства защиты растений – " + (meta.tradeName || meta.preparatName)), L),
        P(tr("2. Таъсир этувчи моддаси – " + meta.activeIngredients + ".", "2. Действующее вещество – " + meta.activeIngredients + "."), L),
        P(tr("3. Рўйхатга олиш учун талабгор ташкилотнинг номи, давлати – " + (meta.applicantOrg || meta.manufacturer || "—") + (meta.country ? ", " + meta.country : "") + ".", "3. Наименование и страна организации-заявителя для регистрации – " + (meta.applicantOrg || meta.manufacturer || "—") + (meta.country ? ", " + meta.country : "") + "."), L),
        P(tr("4. Рўйхатга олиш учун синовларни ўтказган ташкилотнинг номи – " + institute + ".", "4. Наименование организации, проводившей испытания для регистрации – " + institute + "."), L),
        P(tr("5. Рўйхатга олиш учун синов ўтказилган жой ва муддати – " + meta.site + "да " + meta.trialDate + ".", "5. Место и срок проведения испытания для регистрации – " + meta.site + ", " + meta.trialDate + "."), { align: "left", after: 120, line: 240, size: TBL }));

      // Расмий 9 устунли жадвал — албом бетга ихчам жойлашади
      var recText = recommend
        ? tr("«" + meta.preparatName + "» " + meta.applicationRate + " сарф-меъёрда " + lcFirst(meta.crop) + " экинида " + lcFirst(meta.targetOrganism) + "га қарши рўйхатга олишга тавсия этилсин.", "Рекомендовать «" + meta.preparatName + "» к регистрации при норме расхода " + meta.applicationRate + " против " + lcFirst(meta.targetOrganism) + " на культуре " + lcFirst(meta.crop) + ".")
        : tr("Биологик самарадорлик 60% дан паст (" + fmt(overallBest, 1) + "%) бўлгани сабабли рўйхатга олишга тавсия этилмайди; рўйхатга олиш учун синовлар давом эттирилсин.", "Поскольку биологическая эффективность ниже 60% (" + fmt(overallBest, 1) + "%), к регистрации не рекомендуется; продолжить испытания для регистрации.");
      var tavHead = tr("Тавсиялар: «рўйхатга олишга тавсия этилсин (сарф меъёри ва бошқалар)». «Рўйхатга олиш учун синовлар давом эттирилсин». «Кейинги синовлар рад этилсин» (сабаблари кўрсатилади).", "Рекомендации: «рекомендовать к регистрации (норма расхода и др.)». «Продолжить испытания для регистрации». «Отклонить дальнейшие испытания» (с указанием причин).");
      var cw = [950, 1320, 1600, 1650, 2750, 1480, 1320, 1380, 2950]; // сумма ≈ 15400 (албом эни)
      form1.push(new D.Table({
        width: { size: 15400, type: "dxa" }, borders: TBORDERS, columnWidths: cw,
        rows: [
          new D.TableRow({ cantSplit: true, tableHeader: true, children: [
            CELL(tr("Экин тури", "Вид культуры"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[0] }),
            CELL(tr("Зарарли организм номи", "Наименование вредного организма"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[1] }),
            CELL(tr("Воситани синовдан ўтган сарф меъёрлари, л(кг)/га", "Испытанные нормы расхода средства, л(кг)/га"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[2] }),
            CELL(tr("Биологик самарадорлик (%), ҳисоб куни", "Биологическая эффективность (%), день учёта"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[3] }),
            CELL(tr("Воситани қўллаш усули", "Способ применения средства"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[4] }),
            CELL(tr("Қўллаш такрорийлиги", "Кратность применения"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[5] }),
            CELL(tr("Кутиш муддати, кун", "Срок ожидания, суток"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[6] }),
            CELL(tr("Фитотоксиклик хусусияти", "Фитотоксичность"), { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[7] }),
            CELL(tavHead, { bold: true, shade: "e8e8e8", compact: true, size: 22, width: cw[8] })
          ] }),
          new D.TableRow({ cantSplit: true, children: [
            CELL(meta.crop, { compact: true, size: 22, width: cw[0] }),
            CELL(meta.targetOrganism, { compact: true, size: 22, width: cw[1] }),
            CELL(meta.applicationRate, { compact: true, size: 22, width: cw[2] }),
            CELL(fmt(overallBest, 1), { compact: true, size: 22, width: cw[3] }),
            CELL(meta.applicationMethod || tr("пуркаш", "опрыскивание"), { compact: true, size: 22, width: cw[4] }),
            CELL(meta.maxTreatments ? tr("мавсумда " + meta.maxTreatments + " марта", meta.maxTreatments + " раза за сезон") : tr("мавсумда 1 марта", "1 раз за сезон"), { compact: true, size: 22, width: cw[5] }),
            CELL(meta.waitingPeriod || "—", { compact: true, size: 22, width: cw[6] }),
            CELL(meta.phytotoxicity || tr("Йўқ", "Нет"), { compact: true, size: 22, width: cw[7] }),
            CELL(recText, { compact: true, size: 22, width: cw[8] })
          ] })
        ]
      }));
      form1.push(P("", { after: 120 }), P("", { after: 0 }), P("", { after: 0 }));

      // Имзолар — марказда, лавозим ва Ф.И.Ш. орасида имзо чекишга бўш жой
      form1.push(new D.Table({
        alignment: "center",
        width: { size: 10400, type: "dxa" },
        columnWidths: [3400, 4200, 2800],
        borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
        rows: [new D.TableRow({ children: [
          new D.TableCell({ borders: {}, children: [P(tr("Директор ўринбосари", "Заместитель директора"), { bold: true, after: 0 })] }),
          new D.TableCell({ borders: {}, children: [P("", { after: 0 })] }),
          new D.TableCell({ borders: {}, children: [P(meta.deputyDirector || "Н.Қурбонова", { bold: true, align: "left", after: 0 })] })
        ] }), new D.TableRow({ children: [
          new D.TableCell({ borders: {}, children: [P(tr("Маъсул ижрочи", "Ответственный исполнитель"), { bold: true, before: 200, after: 0 })] }),
          new D.TableCell({ borders: {}, children: [P("", { before: 200, after: 0 })] }),
          new D.TableCell({ borders: {}, children: [P((((meta.staff || "").split(/[,;\n]+/)[0]) || "").trim() || "____________", { bold: true, align: "left", before: 200, after: 0 })] })
        ] })]
      }));

      // Футерда автоматик бет рақами (марказда)
      function pageFooter() {
        return new D.Footer({ children: [new D.Paragraph({ alignment: "center", spacing: { before: 0, after: 0 }, children: [new D.TextRun({ children: [D.PageNumber.CURRENT], font: FONT, size: TBL })] })] });
      }
      var doc = new D.Document({
        creator: institute, title: meta.preparatName + tr(" — давлат синови ҳисоботи", " — отчёт государственного испытания"),
        features: { updateFields: true }, // Word очганда МУНДАРИЖА майдонини янгилайди
        sections: [
          // Асосий ҳисобот — тик (portrait)
          { properties: { page: { margin: { top: 1134, bottom: 1134, left: 1417, right: 850 } } }, footers: { default: pageFooter() }, children: ch },
          // 1-форма — албом (landscape)
          { properties: { page: { size: { orientation: "landscape", width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, footers: { default: pageFooter() }, children: form1 }
        ]
      });
      return D.Packer.toBlob(doc);
    });
  }

  // экспорт
  window.Hisobot = { computeReport: computeReport, generateDocx: generateDocx, detectType: detectType };
})();
