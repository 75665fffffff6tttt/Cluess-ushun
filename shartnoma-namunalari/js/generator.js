document.addEventListener("DOMContentLoaded", function () {
  var calcRows = document.getElementById("calc-rows");
  var addRowBtn = document.getElementById("add-row-btn");
  var generateBtn = document.getElementById("generate-btn");
  var downloadBtn = document.getElementById("download-doc-btn");
  var outputSection = document.getElementById("output-section");
  var contractOutput = document.getElementById("contract-output");
  if (!calcRows) return; // not the generator page

  var rowSeq = 0;

  var ONES = ["", "bir", "ikki", "uch", "to‘rt", "besh", "olti", "yetti", "sakkiz", "to‘qqiz"];
  var TENS = ["", "o‘n", "yigirma", "o‘ttiz", "qirq", "ellik", "oltmish", "yetmish", "sakson", "to‘qson"];
  var SCALE = ["", "ming", "million", "milliard", "trillion"];

  function threeDigitsToWords(n) {
    var h = Math.floor(n / 100), r = n % 100, t = Math.floor(r / 10), o = r % 10;
    var parts = [];
    if (h) { parts.push(ONES[h], "yuz"); }
    if (t) { parts.push(TENS[t]); }
    if (o) { parts.push(ONES[o]); }
    return parts.join(" ");
  }

  function numberToWordsUz(n) {
    n = Math.round(n);
    if (n === 0) return "nol";
    var groups = [];
    var num = n;
    while (num > 0) {
      groups.push(num % 1000);
      num = Math.floor(num / 1000);
    }
    var parts = [];
    for (var i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      var text = threeDigitsToWords(groups[i]);
      if (SCALE[i]) text += " " + SCALE[i];
      parts.push(text);
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatNumber(n) {
    return Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function rowTemplate(data) {
    rowSeq++;
    var tr = document.createElement("tr");
    tr.dataset.rowId = rowSeq;
    tr.innerHTML =
      '<td class="row-index">' + 0 + '</td>' +
      '<td><input type="text" class="f-preparat" value="' + (data.preparat || "") + '"></td>' +
      '<td><input type="text" class="f-ekin" value="' + (data.ekin || "") + '"></td>' +
      '<td><input type="text" class="f-obyekt" value="' + (data.obyekt || "") + '"></td>' +
      '<td><input type="text" class="f-meyor" value="' + (data.meyor || "") + '"></td>' +
      '<td><input type="number" class="f-baho" value="' + (data.baho || 0) + '" min="0"></td>' +
      '<td><input type="number" class="f-qoshimcha-pct" value="' + (data.qoshimchaPct != null ? data.qoshimchaPct : 30) + '" min="0" step="1" style="width:80px;"></td>' +
      '<td class="jami-cell">0</td>' +
      '<td><button type="button" class="btn btn-outline btn-small remove-row-btn">✕</button></td>';
    return tr;
  }

  function addRow(data) {
    var tr = rowTemplate(data || {});
    calcRows.appendChild(tr);
    recalcAll();
  }

  function recalcRow(tr) {
    var baho = parseFloat(tr.querySelector(".f-baho").value) || 0;
    var pct = parseFloat(tr.querySelector(".f-qoshimcha-pct").value) || 0;
    var qoshimcha = Math.round(baho * (pct / 100));
    var jami = baho + qoshimcha;
    tr.querySelector(".jami-cell").textContent = formatNumber(jami);
    return jami;
  }

  function recalcAll() {
    var rows = calcRows.querySelectorAll("tr");
    var total = 0;
    rows.forEach(function (tr, idx) {
      tr.querySelector(".row-index").textContent = idx + 1;
      total += recalcRow(tr);
    });
    document.getElementById("total-sum").textContent = formatNumber(total);
    var wordsEl = document.getElementById("total-sum-words");
    if (total > 0) {
      wordsEl.textContent = capitalize(numberToWordsUz(total)) + " so‘m";
    } else {
      wordsEl.textContent = "";
    }
  }

  calcRows.addEventListener("input", function (e) {
    var tr = e.target.closest("tr");
    if (tr) recalcAll();
  });

  calcRows.addEventListener("click", function (e) {
    if (e.target.classList.contains("remove-row-btn")) {
      var tr = e.target.closest("tr");
      if (calcRows.querySelectorAll("tr").length > 1) {
        tr.remove();
        recalcAll();
      }
    }
  });

  addRowBtn.addEventListener("click", function () { addRow(); });

  // Seed with the sample rows from the source contract
  addRow({ preparat: "FARBIOBAC (Azotobacter chroococcum, Bacillus subtilis, kamida 1x10⁸ KTB/ml)", ekin: "G‘o‘za", obyekt: "O‘g‘it, shuningdek fungitsidlik xususiyati bor", meyor: "3 l/ga, 2 marta", baho: 15647500, qoshimchaPct: 30 });
  addRow({ preparat: "FARBIOBAC (Azotobacter chroococcum, Bacillus subtilis, kamida 1x10⁸ KTB/ml)", ekin: "Bug‘doy", obyekt: "O‘g‘it, shuningdek fungitsidlik xususiyati bor", meyor: "3 l/ga, 2 marta", baho: 15647500, qoshimchaPct: 30 });
  addRow({ preparat: "FARBIOBAC (Azotobacter chroococcum, Bacillus subtilis, kamida 1x10⁸ KTB/ml)", ekin: "Sabzavot (pomidor)", obyekt: "O‘g‘it, shuningdek fungitsidlik xususiyati bor", meyor: "3 l/ga, 1 marta", baho: 15647500, qoshimchaPct: 0 });

  function formatDateUz(isoDate) {
    if (!isoDate) return "“______” ____________ 2026 yil";
    var d = new Date(isoDate + "T00:00:00");
    var months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
    return "“" + d.getDate() + "” " + months[d.getMonth()] + " " + d.getFullYear() + " yil";
  }

  function val(id) { return document.getElementById(id).value.trim(); }

  function buildSignatureData() {
    return {
      bajaruvchi: {
        label: "“BAJARUVCHI”",
        name: val("bMuassasa"),
        manzil: val("bManzil"),
        bank: val("bBank"),
        xr: val("bXr"),
        shxr: val("bShxr"),
        mfo: val("bMfo"),
        inn: val("bInn"),
        tel: val("bTel"),
        direktor: val("bDirektor")
      },
      buyurtmachi: {
        label: "“BUYURTMACHI”",
        name: val("oNomi") || "____________________ MCHJ, O‘zbekiston",
        manzil: val("oManzil") || "____________________",
        bank: val("oBank") || "____________________",
        xr: val("oXr") || "____________________",
        mfo: val("oMfo") || "____________________",
        inn: val("oInn") || "____________________",
        oked: val("oOked") || "____________________",
        tel: val("oTel") || "____________________",
        direktor: val("oDirektor") || "____________________"
      }
    };
  }

  function signatureCellLines(p) {
    var lines = [p.label, p.name, "Manzil: " + p.manzil, "Bank: " + p.bank, "H/r: " + p.xr];
    if (p.shxr) lines.push("Sh.x.r: " + p.shxr);
    lines.push("MFO: " + p.mfo + "   STIR: " + p.inn);
    if (p.oked) lines.push("OKED: " + p.oked);
    lines.push("Tel: " + p.tel);
    lines.push("");
    lines.push("Direktor _______________ " + p.direktor);
    return lines;
  }

  function buildSignatureTableEl(sig) {
    var wrap = document.createElement("div");
    wrap.className = "table-scroll";
    var table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.margin = "18px 0";
    var tr = document.createElement("tr");
    [sig.bajaruvchi, sig.buyurtmachi].forEach(function (p) {
      var td = document.createElement("td");
      td.style.verticalAlign = "top";
      td.style.width = "50%";
      td.style.padding = "8px 14px";
      signatureCellLines(p).forEach(function (line, i) {
        var lineEl = document.createElement("div");
        lineEl.style.fontSize = "0.92em";
        if (i === 0) {
          lineEl.style.fontWeight = "700";
          lineEl.style.textAlign = "center";
        } else if (i === 1) {
          lineEl.style.fontWeight = "700";
        }
        lineEl.innerHTML = line ? escapeHtml(line) : "&nbsp;";
        td.appendChild(lineEl);
      });
      tr.appendChild(td);
    });
    table.appendChild(tr);
    wrap.appendChild(table);
    return wrap;
  }

  function signatureTableToHtmlString(sig) {
    function cellHtml(p) {
      return signatureCellLines(p).map(function (line, i) {
        var style = "font-size:11pt;";
        if (i === 0) style += "font-weight:bold; text-align:center;";
        else if (i === 1) style += "font-weight:bold;";
        return "<div style='" + style + "'>" + (line ? escapeHtml(line) : "&nbsp;") + "</div>";
      }).join("");
    }
    return "<table style='width:100%; border-collapse:collapse; margin:18px 0;'><tr>" +
      "<td style='vertical-align:top; width:50%; padding:8px 14px;'>" + cellHtml(sig.bajaruvchi) + "</td>" +
      "<td style='vertical-align:top; width:50%; padding:8px 14px;'>" + cellHtml(sig.buyurtmachi) + "</td>" +
      "</tr></table>";
  }

  var CALC_HEADERS = ["№", "Preparat", "Ekin turi", "Ob'ekt",
    "Preparat sarf me'yori, l/kg/ga va l/kg/t",
    "1 preparat, 1 ekin, 1 ob'ekt, 1 me'yor bo'yicha sinov bahosi (so‘m)",
    "Qo'shimcha me'yor (ob'ekt uchun, %)", "Jami bahosi (so‘m)"];

  function getCalcRowsData() {
    var trs = calcRows.querySelectorAll("tr");
    var rows = [];
    var total = 0;
    trs.forEach(function (tr, idx) {
      var baho = parseFloat(tr.querySelector(".f-baho").value) || 0;
      var pct = parseFloat(tr.querySelector(".f-qoshimcha-pct").value) || 0;
      var qoshimcha = Math.round(baho * (pct / 100));
      var jami = baho + qoshimcha;
      total += jami;
      rows.push({
        n: idx + 1,
        preparat: tr.querySelector(".f-preparat").value,
        ekin: tr.querySelector(".f-ekin").value,
        obyekt: tr.querySelector(".f-obyekt").value,
        meyor: tr.querySelector(".f-meyor").value,
        baho: baho,
        pct: pct,
        qoshimcha: qoshimcha,
        jami: jami
      });
    });
    return { rows: rows, total: total };
  }

  function calcRowCells(r) {
    return [r.n, r.preparat, r.ekin, r.obyekt, r.meyor,
      formatNumber(r.baho), r.pct + "% (" + formatNumber(r.qoshimcha) + ")", formatNumber(r.jami)];
  }

  function buildCalcTableEl(calcData) {
    var wrap = document.createElement("div");
    wrap.className = "table-scroll";
    var table = document.createElement("table");
    table.className = "data-table";
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    CALC_HEADERS.forEach(function (h) {
      var th = document.createElement("th");
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    calcData.rows.forEach(function (r) {
      var tr = document.createElement("tr");
      calcRowCells(r).forEach(function (c, i) {
        var td = document.createElement("td");
        td.textContent = c;
        if (i >= 5) td.style.textAlign = "right";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    var totalTr = document.createElement("tr");
    var labelTd = document.createElement("td");
    labelTd.colSpan = CALC_HEADERS.length - 1;
    labelTd.style.textAlign = "right";
    labelTd.style.fontWeight = "700";
    labelTd.textContent = "Jami:";
    var totalTd = document.createElement("td");
    totalTd.style.textAlign = "right";
    totalTd.style.fontWeight = "700";
    totalTd.textContent = formatNumber(calcData.total) + " so‘m";
    totalTr.appendChild(labelTd);
    totalTr.appendChild(totalTd);
    tbody.appendChild(totalTr);

    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function calcTableToHtmlString(calcData) {
    var html = "<table style=\"border-collapse:collapse; width:100%; font-size:9pt;\">";
    html += "<tr>" + CALC_HEADERS.map(function (h) {
      return "<th style=\"border:1px solid #999; padding:5px 7px; font-weight:bold;\">" + escapeHtml(h) + "</th>";
    }).join("") + "</tr>";
    calcData.rows.forEach(function (r) {
      html += "<tr>" + calcRowCells(r).map(function (c) {
        return "<td style=\"border:1px solid #999; padding:5px 7px;\">" + escapeHtml(c) + "</td>";
      }).join("") + "</tr>";
    });
    html += "<tr><td colspan=\"" + (CALC_HEADERS.length - 1) + "\" style=\"border:1px solid #999; padding:5px 7px; text-align:right; font-weight:bold;\">Jami:</td>" +
      "<td style=\"border:1px solid #999; padding:5px 7px; font-weight:bold;\">" + formatNumber(calcData.total) + " so‘m</td></tr>";
    html += "</table>";
    return html;
  }

  // A line is a section heading ("1. Title") if it starts with "N. " but is not
  // a numbered clause ("1.1. text").
  function isHeadingLine(line) {
    return /^\d+\.\s/.test(line) && !/^\d+\.\d/.test(line);
  }

  function renderParagraphsInto(container, text) {
    text.split("\n").forEach(function (line) {
      if (!line.trim()) return;
      var p = document.createElement("div");
      if (isHeadingLine(line)) {
        p.style.textAlign = "center";
        p.style.fontWeight = "700";
        p.style.margin = "18px 0 8px";
      } else {
        p.style.textAlign = "justify";
        p.style.textIndent = "28px";
        p.style.margin = "0 0 8px";
      }
      p.textContent = line;
      container.appendChild(p);
    });
  }

  function paragraphsToHtmlString(text) {
    return text.split("\n").filter(function (l) { return l.trim(); }).map(function (line) {
      if (isHeadingLine(line)) {
        return "<p align='center' style='font-weight:bold; margin:18px 0 8px;'>" + escapeHtml(line) + "</p>";
      }
      return "<p align='justify' style='text-indent:28px; margin:0 0 8px;'>" + escapeHtml(line) + "</p>";
    }).join("");
  }

  function buildContractParts() {
    var fNo = val("fNo") || "___";
    var joy = val("fJoy") || "Qibray tumani";
    var sanaText = formatDateUz(document.getElementById("fSana").value);
    var muddatIso = document.getElementById("fMuddat").value;
    var muddatText = muddatIso ? formatDateUz(muddatIso) : "2026-yil 31-dekabrgacha";
    var preparatKun = val("fPreparatYetkazish") || "3";
    var tolovKun = val("fTolovKun") || "15";
    var penyaKun = val("fPenyaKun") || "0.4";
    var penyaMax = val("fPenyaMax") || "50";

    var calcData = getCalcRowsData();
    var total = calcData.total;
    var totalWords = total > 0 ? capitalize(numberToWordsUz(total)) : "____________";

    var firstPreparat = calcData.rows.length ? calcData.rows[0].preparat : "____________";

    var title = "SHARTNOMA № " + fNo;
    var dateLine = joy + "   " + sanaText;

    var text = [];
    text.push(val("bMuassasa") + " korxona Nizomi asosida faoliyat yurituvchi direktori " + val("bDirektor") +
      " “Bajaruvchi” bir tomondan va " + (val("oNomi") || "____________________") + ", nizomi asosida harakat qiluvchi direktori " +
      (val("oDirektor") || "____________________") + " “Buyurtmachi” ikkinchi tomondan ushbu shartnomani quyidagilar to‘g‘risida tuzdilar.");
    text.push("");
    text.push("1. Shartnoma predmeti");
    text.push("1.1. “Bajaruvchi” “Buyurtmachi”ga tegishli " + firstPreparat + " kimyoviy (agrobiologik) preparatini ro‘yxatdan o‘tkazish maqsadida sinovdan o‘tkazish xizmatini ko‘rsatadi. Xizmat turlari, bahosi va xizmat ko‘rsatish shartlari mazkur shartnomada ko‘rsatiladi.");
    text.push("1.2. Buyurtmachi esa ushbu xizmatni qabul qilish va bajariladigan xizmat uchun haqni oldindan to‘lash majburiyatini oladi.");
    text.push("1.3. Yetkazib beriladigan preparatning aniq turlari, sinovdan o‘tkazish bahosi mazkur shartnomaning tarkibiy qismi hisoblangan ilovada (Kalkulyatsiya) keltiriladi.");
    text.push("");
    text.push("2. Shartnoma qiymati va hisob-kitob tartibi");
    text.push("2.1. Shartnomaning umumiy summasi ilovaga muvofiq " + formatNumber(total) + " (" + totalWords + ") so‘mni tashkil etadi. Ushbu narx shartnoma shartlarini bajarishda tomonlarning qo‘shimcha kelishuviga ko‘ra o‘zgarishi mumkin.");
    text.push("2.2. “Buyurtmachi” ish bajarishda kimyoviy preparatni sinovini tashkil etish uchun shartnomaning 2.1-bandiga asosan shartnoma imzolangan kundan boshlab " + tolovKun + " bank ish kunida to‘lovni 100 foiz oldindan to‘laydi.");
    text.push("2.3. “Buyurtmachi” shartnomaning 2.1-bandiga asosan belgilangan " + tolovKun + " bank ish kuni ichida to‘lovning 100 foizini amalga oshirmagan taqdirda, “Bajaruvchi” ish (xizmatlarni) to‘liq bajarib, bu haqda “Buyurtmachi”ni yozma ravishda ogohlantirgandan so‘ng, xizmat to‘liq bajarilgan hisoblanadi.");
    text.push("");
    text.push("3. Kimyoviy preparatni yetkazib berish va undan foydalanish tartibi");
    text.push("3.1. “Buyurtmachi” kimyoviy preparatni shartnoma imzolangan kundan boshlab " + preparatKun + " (" + preparatKun + ") ish kunida “Bajaruvchi”ga preparat namunalarini yetkazib berilishini ta’minlaydi va preparatlarni sinov jarayonida qatnashish huquqiga ega.");
    text.push("3.2. “Buyurtmachi” sinov jarayonining to‘xtatilish omillari yuzaga kelganda, shartnomaning 3.1-bandi bajarilgandan so‘ng " + preparatKun + " ish kunida “Bajaruvchi”ni yozma ravishda ogohlantirishi shart.");
    text.push("3.3. “Buyurtmachi” sinov jarayonining tashkil etilishida zaruriy andoza uchun preparatlar hamda sinov jarayonlari uchun zaruriy qo‘shimcha materiallar bilan ta’minlash majburiyatini oladi.");
    text.push("3.4. “Bajaruvchi” qabul qilingan preparatlarni sinovini belgilangan tartibda tashkil etadi.");
    text.push("3.5. “Bajaruvchi” sinov jarayonining tashkil etilmasligiga sabab bo‘luvchi omillar yuzaga kelganda “Buyurtmachi”ni yozma ravishda ogohlantiradi.");
    text.push("");
    text.push("4. Taraflarning javobgarligi va nizolarni hal qilish tartibi");
    text.push("4.1. “Buyurtmachi” bajarilgan xizmatlar uchun “Bajaruvchi”ga shartnomada ko‘rsatilgan haqni o‘z vaqtida to‘lamagan taqdirda, muddati kechiktirilgan har bir kun uchun to‘lov summasining " + penyaKun + " foizi miqdorida penya to‘laydi, biroq bu penya summasi shartnomada ko‘rsatilgan summaning " + penyaMax + " foizidan ortiq bo‘lmasligi kerak.");
    text.push("4.2. Shartnoma bajarilishini bir tomonlama rad etishga yoki shartnoma shartlarini bir tomonlama o‘zgartirishga yo‘l qo‘yilmaydi, qonun hujjatlarida belgilangan hollar bundan mustasno.");
    text.push("4.3. Ushbu shartnomada nazarda tutilmagan javobgarlik va boshqa masalalar O‘zbekiston Respublikasining Fuqarolik Kodeksi, “Xo‘jalik yurituvchi sub’ektlar faoliyatining shartnomaviy-huquqiy bazasi to‘g‘risida”gi Qonuni hamda boshqa qonun hujjatlari bilan tartibga solinadi.");
    text.push("");
    text.push("5. Fors-major va javobgarlikdan ozod etish");
    text.push("5.1. Taraflardan biri shartnomani yengib bo‘lmaydigan kuch, ya’ni favqulodda va muayyan sharoitlarda oldini olib bo‘lmaydigan vaziyatlar (zilzila, qurg‘oqchilik, suv toshqini, yong‘in, sel, do‘l, jala va boshqa tabiiy ofatlar) tufayli shartnoma majburiyatlarini bajarmaganligini yoki lozim darajada bajarmaganligini (fors-major holatini) isbotlasa, javobgar bo‘lmaydi.");
    text.push("");
    text.push("6. Shartnomaning amal qilishi");
    text.push("6.1. Mazkur shartnoma imzolangan vaqtdan boshlab kuchga kiradi va " + muddatText + " amal qiladi.");
    text.push("6.2. Taraflar o‘rtasidagi munosabatlar ular tomonidan mazkur shartnomaning barcha shartlari bajarilgan va hisob-kitob to‘liq tugallangan taqdirda to‘xtatiladi.");
    text.push("");
    text.push("7. Korrupsiyaga qarshi shartlar");
    text.push("7.1. Tomonlar qonunlarning me’yorlarini buzishi mumkin bo‘lgan har qanday choralarni ko‘rmaslikka, shu jumladan tijorat tashkilotlari, hokimiyat va idoralar, davlat xizmatchilari, nodavlat yuridik shaxslar va ularning vakillariga taklif, avtorizatsiya, va’da berish yoki noqonuniy to‘lovlarni amalga oshirmaslik (shu bilan cheklanmagan holda) majburiyatini oladilar. Tomonlar korrupsiyaga qarshi kurash to‘g‘risidagi qonunlar talablarini bajarishga va ushbu shartnoma bilan bog‘liq ravishda har qanday jismoniy yoki yuridik shaxsga pul yoki boshqa shakldagi pora bermaslikka majburdirlar.");
    text.push("7.2. Tomonlardan biri ushbu bandning 7.1-bandida ko‘rsatilgan majburiyatlarni buzgan taqdirda, boshqa tomon ushbu shartnomani bajarishdan bir tomonlama va suddan tashqari rad etishga haqlidir. Shartnoma ushbu bandga muvofiq bekor qilingan taqdirda, ushbu bandning shartlarini buzgan tomonning zararlari qoplanmaydi.");
    text.push("");
    text.push("8. Nizolarni hal etish tartibi");
    text.push("8.1. Kelishmovchiliklar va nizoli masalalar kelib chiqqan taqdirda, taraflar, qoidaga ko‘ra, ularni sudgacha (muzokaralar yo‘li bilan) hal etish yuzasidan mustaqil choralar ko‘radi.");
    text.push("8.2. Taraflar o‘zaro kelisha olmagan nizolar qonun hujjatlarida belgilangan tartibda Iqtisodiy sud tomonidan hal qilinadi.");
    text.push("");
    text.push("9. Taraflarning yuridik manzillari va bank rekvizitlari");

    return {
      title: title,
      dateLine: dateLine,
      bodyBefore: text.join("\n"),
      signatureData: buildSignatureData(),
      ilovaRef: sanaText + " dagi\n№ " + fNo + "-sonli shartnomaga\nIlova",
      kalkTitle: "KALKULYATSIYA",
      kalkDesc: "registratsiya sinovlari xarajatlarining hisob-kitobi, " + (val("oNomi") || "“Buyurtmachi”") + " preparatlari bo‘yicha, " + fNo + "-sonli shartnomaga muvofiq",
      calcData: calcData
    };
  }

  var lastParts = null;

  generateBtn.addEventListener("click", function () {
    recalcAll();
    lastParts = buildContractParts();
    contractOutput.innerHTML = "";

    var titleEl = document.createElement("div");
    titleEl.style.textAlign = "center";
    titleEl.style.fontWeight = "700";
    titleEl.textContent = lastParts.title;
    contractOutput.appendChild(titleEl);

    var dateEl = document.createElement("div");
    dateEl.style.textAlign = "center";
    dateEl.style.marginBottom = "1em";
    dateEl.textContent = lastParts.dateLine;
    contractOutput.appendChild(dateEl);

    var bodyBeforeEl = document.createElement("div");
    renderParagraphsInto(bodyBeforeEl, lastParts.bodyBefore);
    contractOutput.appendChild(bodyBeforeEl);

    contractOutput.appendChild(buildSignatureTableEl(lastParts.signatureData));

    var sepEl = document.createElement("div");
    sepEl.style.textAlign = "center";
    sepEl.style.margin = "18px 0";
    sepEl.textContent = "————————————————————————————————";
    contractOutput.appendChild(sepEl);

    var ilovaEl = document.createElement("div");
    ilovaEl.style.textAlign = "right";
    ilovaEl.style.fontSize = "0.92em";
    ilovaEl.style.margin = "0 0 18px";
    lastParts.ilovaRef.split("\n").forEach(function (line) {
      var d = document.createElement("div");
      d.textContent = line;
      ilovaEl.appendChild(d);
    });
    contractOutput.appendChild(ilovaEl);

    var kalkTitleEl = document.createElement("div");
    kalkTitleEl.style.textAlign = "center";
    kalkTitleEl.style.fontWeight = "700";
    kalkTitleEl.textContent = lastParts.kalkTitle;
    contractOutput.appendChild(kalkTitleEl);

    var kalkDescEl = document.createElement("div");
    kalkDescEl.style.textAlign = "center";
    kalkDescEl.style.margin = "0 0 10px";
    kalkDescEl.style.fontSize = "0.92em";
    kalkDescEl.textContent = lastParts.kalkDesc;
    contractOutput.appendChild(kalkDescEl);

    var tableEl = buildCalcTableEl(lastParts.calcData);
    tableEl.style.margin = "10px 0 18px";
    contractOutput.appendChild(tableEl);

    contractOutput.appendChild(buildSignatureTableEl(lastParts.signatureData));

    outputSection.classList.remove("results-hidden");
    outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      if (!lastParts) return;
      var sigHtml = signatureTableToHtmlString(lastParts.signatureData);
      var ilovaHtml = "<p align='right' style='font-size:10pt; margin:0 0 18px;'>" +
        lastParts.ilovaRef.split("\n").map(escapeHtml).join("<br>") + "</p>";
      var html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
        "<head><meta charset='utf-8'><title>Shartnoma</title>" +
        "<style>@page WordSection1 { size: 21cm 29.7cm; margin: 1.5cm 1.5cm 1.5cm 1.5cm; mso-page-orientation: portrait; } div.WordSection1 { page: WordSection1; }</style>" +
        "</head>" +
        "<body style=\"font-family:'Times New Roman',serif; font-size:13pt;\">" +
        "<div class=\"WordSection1\">" +
        "<p align='center' style='font-weight:bold; margin:0;'>" + escapeHtml(lastParts.title) + "</p>" +
        "<p align='center' style='margin:0 0 1em;'>" + escapeHtml(lastParts.dateLine) + "</p>" +
        paragraphsToHtmlString(lastParts.bodyBefore) +
        sigHtml +
        "<p align='center' style='margin:18px 0;'>————————————————————————————————</p>" +
        ilovaHtml +
        "<p align='center' style='font-weight:bold; margin:0;'>" + escapeHtml(lastParts.kalkTitle) + "</p>" +
        "<p align='center' style='font-size:10pt; margin:0 0 10px;'>" + escapeHtml(lastParts.kalkDesc) + "</p>" +
        "<div style=\"margin:0 0 18px;\">" + calcTableToHtmlString(lastParts.calcData) + "</div>" +
        sigHtml +
        "</div>" +
        "</body></html>";
      var blob = new Blob(['﻿', html], { type: "application/msword" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "shartnoma-" + (val("fNo") || "1") + ".doc";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
});
