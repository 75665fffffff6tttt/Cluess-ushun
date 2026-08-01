document.addEventListener("DOMContentLoaded", function () {
  var calcRows = document.getElementById("calc-rows");
  var addRowBtn = document.getElementById("add-row-btn");
  var generateBtn = document.getElementById("generate-btn");
  var downloadBtn = document.getElementById("download-doc-btn");
  var outputSection = document.getElementById("output-section");
  var contractOutput = document.getElementById("contract-output");
  if (!calcRows || !document.getElementById("cName")) return; // not the foreign-contract generator page

  var rowSeq = 0;

  function val(id) { return document.getElementById(id).value.trim(); }

  function formatNumber(n) {
    return Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---------- English number-to-words ----------
  var ONES_EN = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS_EN = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  var SCALE_EN = ["", "thousand", "million", "billion", "trillion"];

  function threeDigitsEn(n) {
    var h = Math.floor(n / 100), r = n % 100;
    var parts = [];
    if (h) parts.push(ONES_EN[h], "hundred");
    if (r > 0) {
      if (r < 20) {
        parts.push(ONES_EN[r]);
      } else {
        var t = Math.floor(r / 10), o = r % 10;
        parts.push(o ? TENS_EN[t] + "-" + ONES_EN[o] : TENS_EN[t]);
      }
    }
    return parts.join(" ");
  }

  function numberToWordsEn(n) {
    n = Math.round(n);
    if (n === 0) return "zero";
    var groups = [], num = n;
    while (num > 0) { groups.push(num % 1000); num = Math.floor(num / 1000); }
    var parts = [];
    for (var i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      var t = threeDigitsEn(groups[i]);
      if (SCALE_EN[i]) t += " " + SCALE_EN[i];
      parts.push(t);
    }
    return parts.join(" ");
  }

  function dollarsEn(n) {
    return numberToWordsEn(n) + " US " + (Math.round(n) === 1 ? "dollar" : "dollars");
  }

  // ---------- Russian number-to-words ----------
  var RU_ONES_M = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  var RU_ONES_F = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  var RU_TEENS = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  var RU_TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  var RU_HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];
  var RU_SCALE = [null,
    { one: "тысяча", few: "тысячи", many: "тысяч", fem: true },
    { one: "миллион", few: "миллиона", many: "миллионов", fem: false },
    { one: "миллиард", few: "миллиарда", many: "миллиардов", fem: false }];

  function ruPluralForm(n, forms) {
    var n100 = n % 100, n10 = n % 10;
    if (n100 > 10 && n100 < 20) return forms.many;
    if (n10 === 1) return forms.one;
    if (n10 >= 2 && n10 <= 4) return forms.few;
    return forms.many;
  }

  function threeDigitsRu(n, fem) {
    var h = Math.floor(n / 100), r = n % 100, t = Math.floor(r / 10), o = r % 10;
    var parts = [];
    if (h) parts.push(RU_HUNDREDS[h]);
    if (t === 1) {
      parts.push(RU_TEENS[o]);
    } else {
      if (t > 1) parts.push(RU_TENS[t]);
      if (o) parts.push(fem ? RU_ONES_F[o] : RU_ONES_M[o]);
    }
    return parts.join(" ");
  }

  function numberToWordsRu(n) {
    n = Math.round(n);
    if (n === 0) return "ноль";
    var groups = [], num = n;
    while (num > 0) { groups.push(num % 1000); num = Math.floor(num / 1000); }
    var parts = [];
    for (var i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      var scale = RU_SCALE[i];
      var t = threeDigitsRu(groups[i], scale ? scale.fem : false);
      if (scale) t += " " + ruPluralForm(groups[i], scale);
      parts.push(t);
    }
    return parts.join(" ");
  }

  function dollarsRu(n) {
    return numberToWordsRu(n) + " " + ruPluralForm(Math.round(n), { one: "доллар", few: "доллара", many: "долларов" }) + " США";
  }

  // ---------- calc rows ----------
  function rowTemplate(data) {
    rowSeq++;
    var tr = document.createElement("tr");
    tr.dataset.rowId = rowSeq;
    tr.innerHTML =
      '<td class="row-index">' + 0 + '</td>' +
      '<td><input type="text" class="f-preparat" value="' + (data.preparat || "") + '"></td>' +
      '<td><input type="text" class="f-crop" value="' + (data.crop || "") + '"></td>' +
      '<td><input type="text" class="f-target" value="' + (data.target || "") + '"></td>' +
      '<td><input type="text" class="f-rate" value="' + (data.rate || "") + '"></td>' +
      '<td><input type="number" class="f-cost" value="' + (data.cost || 0) + '" min="0"></td>' +
      '<td><input type="number" class="f-pct" value="' + (data.pct != null ? data.pct : 30) + '" min="0" step="1" style="width:70px;"></td>' +
      '<td class="jami-cell">0</td>' +
      '<td><button type="button" class="btn btn-outline btn-small remove-row-btn">✕</button></td>';
    return tr;
  }

  function addRow(data) {
    calcRows.appendChild(rowTemplate(data || {}));
    recalcAll();
  }

  function recalcRow(tr) {
    var cost = parseFloat(tr.querySelector(".f-cost").value) || 0;
    var pct = parseFloat(tr.querySelector(".f-pct").value) || 0;
    var surcharge = Math.round(cost * (pct / 100));
    var total = cost + surcharge;
    tr.querySelector(".jami-cell").textContent = formatNumber(total);
    return total;
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
    wordsEl.textContent = total > 0 ? capitalize(dollarsEn(total)) + " / " + capitalize(dollarsRu(total)) : "";
  }

  calcRows.addEventListener("input", function (e) {
    if (e.target.closest("tr")) recalcAll();
  });

  calcRows.addEventListener("click", function (e) {
    if (e.target.classList.contains("remove-row-btn")) {
      var tr = e.target.closest("tr");
      if (calcRows.querySelectorAll("tr").length > 1) { tr.remove(); recalcAll(); }
    }
  });

  addRowBtn.addEventListener("click", function () { addRow(); });

  // Seed with rows from the source Bayer AG contract
  [
    { preparat: "SIVANTO PRIME", crop: "Яблоня / Apple", target: "Яблонный цветоед, тля, щитовка / Apple blossom weevil, aphids, scale insects", rate: "0,4–0,9 l/ga", cost: 2580, pct: 30 },
    { preparat: "", crop: "Картофель / Potato", target: "Тля, колорадский жук / Aphids, Colorado potato beetle", rate: "0,4-1,0 l/ga", cost: 2580, pct: 30 },
    { preparat: "", crop: "Лук / Onion", target: "Трипс / Thrips", rate: "0,4-1,0 l/ga", cost: 2580, pct: 30 },
    { preparat: "", crop: "Капуста / Cabbage", target: "Трипс / Thrips", rate: "0,7 l/ga", cost: 2580, pct: 0 },
    { preparat: "", crop: "Томат защищённого грунта / Greenhouse tomato", target: "Белокрылка, тля, трипс / Whitefly, aphids, thrips", rate: "0,5-1,0 l/ga", cost: 2580, pct: 30 },
    { preparat: "", crop: "Огурец защищённого грунта / Greenhouse cucumber", target: "Белокрылка, тля, трипс / Whitefly, aphids, thrips", rate: "0,5-1,0 l/ga", cost: 2580, pct: 30 },
    { preparat: "Soligor к.э.", crop: "Яровая пшеница / Spring wheat", target: "Ржавчины, септориоз, гельминтоспориозные пятнистости, мучнистая роса / Rusts, septoria, helminthosporium spot, powdery mildew", rate: "0,4-0,6 л/га", cost: 2580, pct: 30 },
    { preparat: "", crop: "Озимая пшеница / Winter wheat", target: "Стеблевая ржавчина, гельминтоспориозные пятнистости, мучнистая роса / Stem rust, helminthosporium spot, powdery mildew", rate: "0,4-0,6", cost: 2580, pct: 30 },
    { preparat: "", crop: "Яровой ячмень / Spring barley", target: "Фузариоз колоса, септориоз колоса, чернь колоса / Fusarium head blight, septoria, black head mold", rate: "0,6-0,8 л/га", cost: 2580, pct: 30 },
    { preparat: "", crop: "Хлопчатник / Cotton", target: "Вилт, фузариоз / Verticillium wilt, fusarium", rate: "0,6-0,8 л/га", cost: 2580, pct: 30 },
    { preparat: "REDIGO M к.с.", crop: "Кукуруза / Maize", target: "Пыльная и пузырчатая головня, корневые и стеблевые гнили, плесневение семян / Loose and common smut, root and stem rot, seed mold", rate: "0,9–1,0 l/t", cost: 2580, pct: 30 },
    { preparat: "Мушкет Плюс м.д.", crop: "Яровая пшеница / Spring wheat", target: "Однолетние и многолетние двудольные сорняки / Annual and perennial broadleaf weeds", rate: "0,4–0,7 l/ga", cost: 2580, pct: 30 },
    { preparat: "", crop: "Озимая пшеница / Winter wheat", target: "Однолетние и многолетние двудольные сорняки / Annual and perennial broadleaf weeds", rate: "0,4–0,7 l/ga", cost: 2580, pct: 30 },
    { preparat: "", crop: "Яровой ячмень / Spring barley", target: "Однолетние и многолетние двудольные сорняки / Annual and perennial broadleaf weeds", rate: "0,4–0,7 l/ga", cost: 2580, pct: 30 },
    { preparat: "ALIETTE", crop: "Яблоня / Apple", target: "Бактериальный ожог / Fire blight", rate: "1,5-3,0 кг/га", cost: 2580, pct: 30 },
    { preparat: "", crop: "Томат / Tomato", target: "Фитофтороз / Late blight", rate: "1,5-2,0 кг/га", cost: 2580, pct: 30 },
    { preparat: "", crop: "Картофель / Potato", target: "Фитофтороз / Late blight", rate: "1,5-2,0 кг/га", cost: 2580, pct: 30 },
    { preparat: "", crop: "Огурец / Cucumber", target: "Переноспориоз / Downy mildew", rate: "2,0 кг/га", cost: 2580, pct: 0 },
    { preparat: "Laudis", crop: "Кукуруза / Maize", target: "Однолетние двудольные и злаковые сорняки / Annual broadleaf and grass weeds", rate: "0,4–0,5 кг/га", cost: 2580, pct: 30 },
    { preparat: "FOLICUR к.э.", crop: "Виноградная лоза / Grapevine", target: "Оидиум / Powdery mildew", rate: "0,3 л/га", cost: 2580, pct: 0 }
  ].forEach(addRow);

  function formatDateBi(isoDate) {
    if (!isoDate) return { en: '"____" __________ 2026', ru: '«____» _________ 2026 г.' };
    var d = new Date(isoDate + "T00:00:00");
    var monthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var monthsRu = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    return {
      en: d.getDate() + " " + monthsEn[d.getMonth()] + ", " + d.getFullYear(),
      ru: '«' + d.getDate() + '» ' + monthsRu[d.getMonth()] + ' ' + d.getFullYear() + ' г.'
    };
  }

  function getCalcRowsData() {
    var trs = calcRows.querySelectorAll("tr");
    var rows = [], total = 0;
    trs.forEach(function (tr, idx) {
      var cost = parseFloat(tr.querySelector(".f-cost").value) || 0;
      var pct = parseFloat(tr.querySelector(".f-pct").value) || 0;
      var surcharge = Math.round(cost * (pct / 100));
      var rowTotal = cost + surcharge;
      total += rowTotal;
      rows.push({
        n: idx + 1,
        preparat: tr.querySelector(".f-preparat").value,
        crop: tr.querySelector(".f-crop").value,
        target: tr.querySelector(".f-target").value,
        rate: tr.querySelector(".f-rate").value,
        cost: cost, pct: pct, surcharge: surcharge, total: rowTotal
      });
    });
    return { rows: rows, total: total };
  }

  var CALC_HEADERS = ["№", "Препараты / Products", "Культура / Crop", "Вредители, Болезни, Назначение / Target Pests, Diseases, Purpose",
    "Норма расхода / Rate", "Стоимость испытаний / Cost per trial ($)", "Надбавка / Surcharge (%)", "Общая стоимость / Total ($)"];

  function calcRowCells(r) {
    return [r.n, r.preparat, r.crop, r.target, r.rate, formatNumber(r.cost), r.pct + "% (" + formatNumber(r.surcharge) + ")", formatNumber(r.total)];
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
    labelTd.textContent = "Итого / Total:";
    var totalTd = document.createElement("td");
    totalTd.style.textAlign = "right";
    totalTd.style.fontWeight = "700";
    totalTd.textContent = "$" + formatNumber(calcData.total);
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
    html += "<tr><td colspan=\"" + (CALC_HEADERS.length - 1) + "\" style=\"border:1px solid #999; padding:5px 7px; text-align:right; font-weight:bold;\">Итого / Total:</td>" +
      "<td style=\"border:1px solid #999; padding:5px 7px; font-weight:bold;\">$" + formatNumber(calcData.total) + "</td></tr>";
    html += "</table>";
    return html;
  }

  // ---------- signature blocks ----------
  function contractorLines(lang) {
    if (lang === "en") {
      return [
        "TIN: " + val("bTin"),
        "Address: " + val("bAddressEn"),
        "Correspondent account: " + val("bCorrAcc"),
        "Beneficiary: " + val("bBeneficiary"),
        "BIC code: " + val("bBic"),
        "Bank address: " + val("bBankAddress"),
        "Recipient's bank: " + val("bRecipientBank"),
        "SWIFT code: " + val("bSwift"),
        "Correspondent bank: " + val("bCorrBank"),
        "Correspondent account: " + val("bCorrBankAcc"),
        "SWIFT code: " + val("bCorrBankSwift"),
        "Another correspondent account: " + val("bAltCorrAcc"),
        "Payment details:",
        "Treasury account: " + val("bTreasuryAcc"),
        "(in US dollars)"
      ];
    }
    return [
      "ИНН: " + val("bTin"),
      "Адрес: " + val("bAddressRu"),
      "Корреспондентский счёт: " + val("bCorrAcc"),
      "Бенефициар: " + val("bBeneficiary"),
      "БИК-код: " + val("bBic"),
      "Адрес: " + val("bBankAddress"),
      "Банк получателя: " + val("bRecipientBank"),
      "SWIFT-код: " + val("bSwift"),
      "Банк-корреспондент: " + val("bCorrBank"),
      "Корреспондентский счёт: " + val("bCorrBankAcc"),
      "SWIFT-код: " + val("bCorrBankSwift"),
      "Корреспондентский счёт: " + val("bAltCorrAcc"),
      "Назначение платежа:",
      "Казначейский счёт: " + val("bTreasuryAcc"),
      "(в долларах США)"
    ];
  }

  function clientLines() {
    return [
      "Address: " + val("cAddress"),
      "Tel: " + val("cTel"),
      "Bank name: " + val("cBankName"),
      "Bank address: " + val("cBankAddress"),
      "Account number (IBAN): " + val("cIban"),
      "SWIFT: " + val("cSwift")
    ];
  }

  function signatureData() {
    return {
      contractor: {
        labelEn: "EXECUTOR", labelRu: "ИСПОЛНИТЕЛЬ",
        nameEn: val("bMuassasaEn"), nameRu: val("bMuassasaRu"),
        direktor: val("bDirektorShort")
      },
      client: {
        labelEn: "CLIENT", labelRu: "ЗАКАЗЧИК",
        nameEn: '"' + val("cName") + '" (' + val("cCountryEn") + ")",
        nameRu: '«' + val("cName") + '» (' + val("cCountryRu") + ")",
        direktor: val("cRepNameShort")
      }
    };
  }

  // Contractor and client blocks stack vertically within each language
  // column (matching the source document), unlike the final bilingual
  // signature block which places them side by side.
  function sigBlockLines(p, lang, lines, signLabel) {
    var label = lang === "en" ? p.labelEn : p.labelRu;
    var name = lang === "en" ? p.nameEn : p.nameRu;
    return [label, name].concat(lines).concat(["", signLabel + " _______________ " + p.direktor]);
  }

  function buildSignatureStackEl(sig, lang) {
    var wrap = document.createElement("div");
    wrap.style.margin = "18px 0";
    [
      { p: sig.contractor, lines: contractorLines(lang), signLabel: lang === "en" ? "Director:" : "Директор:" },
      { p: sig.client, lines: clientLines(), signLabel: lang === "en" ? "Representative:" : "Представитель:" }
    ].forEach(function (block, idx) {
      sigBlockLines(block.p, lang, block.lines, block.signLabel).forEach(function (line, i) {
        var lineEl = document.createElement("div");
        lineEl.style.fontSize = "0.88em";
        if (i === 0) { lineEl.style.fontWeight = "700"; lineEl.style.textAlign = "center"; }
        else if (i === 1) { lineEl.style.fontWeight = "700"; }
        lineEl.innerHTML = line ? escapeHtml(line) : "&nbsp;";
        wrap.appendChild(lineEl);
      });
      if (idx === 0) {
        var spacer = document.createElement("div");
        spacer.innerHTML = "&nbsp;";
        wrap.appendChild(spacer);
      }
    });
    return wrap;
  }

  function signatureStackToHtmlString(sig, lang) {
    function blockHtml(p, lines, signLabel) {
      return sigBlockLines(p, lang, lines, signLabel).map(function (line, i) {
        var style = "font-size:10pt;";
        if (i === 0) style += "font-weight:bold; text-align:center;";
        else if (i === 1) style += "font-weight:bold;";
        return "<div style='" + style + "'>" + (line ? escapeHtml(line) : "&nbsp;") + "</div>";
      }).join("");
    }
    return "<div style='margin:18px 0;'>" +
      blockHtml(sig.contractor, contractorLines(lang), lang === "en" ? "Director:" : "Директор:") +
      "<div>&nbsp;</div>" +
      blockHtml(sig.client, clientLines(), lang === "en" ? "Representative:" : "Представитель:") +
      "</div>";
  }

  function buildBilingualSignatureTableEl(sig) {
    var wrap = document.createElement("div");
    wrap.className = "table-scroll";
    var table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.margin = "18px 0";
    var tr = document.createElement("tr");
    [
      { label: sig.contractor.labelRu + "/ CONTRACTOR " + sig.contractor.labelEn, name: sig.contractor.nameRu + " / " + sig.contractor.nameEn, dir: (val("bDirektorShort")) },
      { label: sig.client.labelRu + "/ " + sig.client.labelEn, name: sig.client.nameRu + " / " + sig.client.nameEn, dir: val("cRepNameShort") }
    ].forEach(function (p, idx) {
      var td = document.createElement("td");
      td.style.verticalAlign = "top";
      td.style.width = "50%";
      td.style.padding = "8px 14px";
      var labelEl = document.createElement("div");
      labelEl.style.fontWeight = "700";
      labelEl.style.textAlign = "center";
      labelEl.textContent = p.label;
      var nameEl = document.createElement("div");
      nameEl.style.fontWeight = "700";
      nameEl.style.margin = "4px 0 10px";
      nameEl.textContent = p.name;
      var dirEl = document.createElement("div");
      dirEl.textContent = (idx === 0 ? "Director / Директор: " : "Representative / Специалист: ") + "_______________ " + p.dir;
      td.appendChild(labelEl);
      td.appendChild(nameEl);
      td.appendChild(dirEl);
      tr.appendChild(td);
    });
    table.appendChild(tr);
    wrap.appendChild(table);
    return wrap;
  }

  function bilingualSignatureTableToHtmlString(sig) {
    function cellHtml(p) {
      return "<div style='font-weight:bold; text-align:center;'>" + escapeHtml(p.label) + "</div>" +
        "<div style='font-weight:bold; margin:4px 0 10px;'>" + escapeHtml(p.name) + "</div>" +
        "<div>" + escapeHtml(p.dirLabel) + " _______________ " + escapeHtml(p.dir) + "</div>";
    }
    var left = { label: sig.contractor.labelRu + "/ CONTRACTOR " + sig.contractor.labelEn, name: sig.contractor.nameRu + " / " + sig.contractor.nameEn, dirLabel: "Director / Директор:", dir: val("bDirektorShort") };
    var right = { label: sig.client.labelRu + "/ " + sig.client.labelEn, name: sig.client.nameRu + " / " + sig.client.nameEn, dirLabel: "Representative / Специалист:", dir: val("cRepNameShort") };
    return "<table style='width:100%; border-collapse:collapse; margin:18px 0;'><tr>" +
      "<td style='vertical-align:top; width:50%; padding:8px 14px; font-size:10pt;'>" + cellHtml(left) + "</td>" +
      "<td style='vertical-align:top; width:50%; padding:8px 14px; font-size:10pt;'>" + cellHtml(right) + "</td>" +
      "</tr></table>";
  }

  // A line is a section heading ("1. Title") if it starts with "N. " but is not a
  // numbered clause ("1.1. text").
  function isHeadingLine(line) {
    return /^\d+\.\s/.test(line) && !/^\d+\.\d/.test(line);
  }

  // linesEn/linesRu are built in lockstep (same push order in both language
  // branches), so pairing them by index keeps every clause on the same row -
  // instead of two independently-flowing columns that drift apart once the
  // Russian wording runs longer than the English.
  function clauseParagraphEl(line) {
    var p = document.createElement("div");
    if (isHeadingLine(line)) {
      p.style.textAlign = "center";
      p.style.fontWeight = "700";
    } else {
      p.style.textAlign = "justify";
      p.style.textIndent = "28px";
    }
    p.textContent = line;
    return p;
  }

  function buildParallelClauseTableEl(linesEn, linesRu) {
    var wrap = document.createElement("div");
    wrap.className = "table-scroll";
    var table = document.createElement("table");
    table.className = "bilingual-columns bilingual-rows";
    var tbody = document.createElement("tbody");
    for (var i = 0; i < linesEn.length; i++) {
      var enLine = linesEn[i] || "", ruLine = linesRu[i] || "";
      var tr = document.createElement("tr");
      if (!enLine.trim() && !ruLine.trim()) {
        var spacer = document.createElement("td");
        spacer.colSpan = 2;
        spacer.className = "bilingual-row-spacer";
        tr.appendChild(spacer);
        tbody.appendChild(tr);
        continue;
      }
      var tdEn = document.createElement("td");
      tdEn.className = "bilingual-col left";
      tdEn.appendChild(clauseParagraphEl(enLine));
      var tdRu = document.createElement("td");
      tdRu.className = "bilingual-col right";
      tdRu.appendChild(clauseParagraphEl(ruLine));
      tr.appendChild(tdEn);
      tr.appendChild(tdRu);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function parallelClauseTableToHtmlString(linesEn, linesRu) {
    function cellHtml(line) {
      if (!line.trim()) return "&nbsp;";
      if (isHeadingLine(line)) return "<p align='center' style='font-weight:bold; margin:0;'>" + escapeHtml(line) + "</p>";
      return "<p align='justify' style='text-indent:28px; margin:0;'>" + escapeHtml(line) + "</p>";
    }
    var rows = [];
    for (var i = 0; i < linesEn.length; i++) {
      var enLine = linesEn[i] || "", ruLine = linesRu[i] || "";
      if (!enLine.trim() && !ruLine.trim()) {
        rows.push("<tr><td colspan='2' style='height:10px;'>&nbsp;</td></tr>");
        continue;
      }
      rows.push("<tr>" +
        "<td style='width:50%; vertical-align:top; padding:6px 24px 6px 0; border-right:1px solid #999;'>" + cellHtml(enLine) + "</td>" +
        "<td style='width:50%; vertical-align:top; padding:6px 0 6px 24px;'>" + cellHtml(ruLine) + "</td>" +
        "</tr>");
    }
    return "<table style='width:100%; border-collapse:collapse; table-layout:fixed;'>" + rows.join("") + "</table>";
  }

  function buildContractLines(lang, ctx) {
    var isEn = lang === "en";
    var fNo = ctx.fNo, total = ctx.total, totalWords = ctx.totalWords, tolovKun = ctx.tolovKun,
      preparatKun = ctx.preparatKun, penyaKun = ctx.penyaKun, penyaMax = ctx.penyaMax, muddatText = ctx.muddatText;
    var bMuassasa = isEn ? val("bMuassasaEn") : val("bMuassasaRu");
    var bDirektor = val("bDirektor");
    var cName = val("cName"), cCountry = isEn ? val("cCountryEn") : val("cCountryRu");
    var cRepTitle = isEn ? val("cRepTitleEn") : val("cRepTitleRu");
    var cRepName = isEn ? val("cRepNameEn") : val("cRepNameRu");

    var text = [];
    if (isEn) {
      text.push("On the one hand, the " + bMuassasa + ", acting on the basis of its Charter, represented by Director " + bDirektor +
        ", hereinafter referred to as the “Contractor,” and on the other hand, “" + cName + "” (" + cCountry +
        ") acting on the basis of its Charter, represented by " + cRepTitle + " " + cRepName +
        ", hereinafter referred to as the “Client,” have concluded this contract as follows:");
      text.push("1. Subject of the Contract");
      text.push("1.1. The types of services provided, their cost, and conditions are specified in this contract.");
      text.push("1.2. The Client agrees to accept the specified services and pay for them in advance.");
      text.push("1.3. Specific types of supplied preparations and the cost of their testing are provided in the annex, which is an integral part of this contract.");
      text.push("2. Contract Value and Payment Procedure");
      text.push("2.1. The total amount of the contract is $" + formatNumber(total) + " (" + capitalize(totalWords) + ") in accordance with the annex. The specified cost may be changed by additional agreement of the parties when fulfilling the conditions of the contract.");
      text.push("2.2. The Client makes a 100% prepayment within " + tolovKun + " banking working days from the date of signing the contract in accordance with clause 2.1 of this contract for the organization of chemical preparation testing.");
      text.push("2.3. If the Client does not make a 100% payment within " + tolovKun + " banking working days from the date of signing the contract, the Contractor, having fully performed the services and notifying the Client in writing of the completion of services, considers the services fully rendered.");
      text.push("3. Procedure for Delivery and Use of Chemical Preparations");
      text.push("3.1. The Client ensures the delivery of chemical preparation samples to the Contractor within " + preparatKun + " (" + preparatKun + ") working days from the date of signing the contract and has the right to participate in the testing process of the preparations.");
      text.push("3.2. In case of factors leading to the suspension of the testing process, the Client is obliged to notify the Contractor in writing within " + preparatKun + " (" + preparatKun + ") working days after fulfilling clause 3.1 of this contract.");
      text.push("3.3. The Client agrees to provide the necessary standards of preparations and additional materials required for testing.");
      text.push("3.4. The Contractor organizes the testing of accepted preparations in the prescribed manner.");
      text.push("3.5. In case of factors hindering the organization of testing, the Contractor notifies the Client in writing.");
      text.push("4. Liability of the Parties and Dispute Resolution Procedure");
      text.push("4.1. In case of late payment by the Client for the services rendered by the Contractor in accordance with the terms of the contract, the Client pays a penalty of " + penyaKun + "% of the payment amount for each day of delay, but not more than " + penyaMax + "% of the amount specified in the contract.");
      text.push("4.2. Unilateral refusal to execute the contract or unilateral change of contract terms is not allowed, except in cases provided by law.");
      text.push("4.3. Liability and other issues not provided for in this contract are governed by the Civil Code of the Republic of Uzbekistan, the Law “On the Contractual and Legal Framework of Business Entities,” and other regulatory acts.");
      text.push("5. Force Majeure and Exemption from Liability");
      text.push("5.1. A party that has not fulfilled or improperly fulfilled its obligations under the contract due to force majeure circumstances, that is, extraordinary and unavoidable circumstances under the given conditions (earthquakes, droughts, floods, fires, mudflows, hail, storms, and other natural disasters), is not liable provided that such circumstances (force majeure) are proven.");
      text.push("6. Contract Duration");
      text.push("6.1. This contract comes into force upon signing and is valid until " + muddatText.en + ".");
      text.push("6.2. Relations between the parties terminate after the full implementation of all conditions of this contract and the completion of mutual settlements.");
      text.push("7. Anti-Corruption Conditions");
      text.push("7.1. The parties agree not to take actions that may violate legal norms, including (but not limited to) offering, authorizing, promising, or making illegal payments to commercial organizations, government bodies, public officials, non-governmental legal entities, and their representatives. The parties agree to comply with anti-corruption legislation requirements and not to allow bribery in monetary or other forms to any individuals or legal entities in connection with the rights or obligations provided by this contract.");
      text.push("7.2. In case of violation by one of the parties of the obligations specified in clause 7.1, the other party has the right to unilaterally and extrajudicially refuse to execute this contract. Upon termination of the contract in accordance with this clause, the losses of the party that violated the conditions are not reimbursed.");
      text.push("8. Dispute Resolution Procedure");
      text.push("8.1. In case of disagreements and disputes, the parties take independent measures for their pre-trial settlement.");
      text.push("8.2. Disputes not settled by the parties are resolved in the Economic Court.");
      text.push("9. Legal Addresses and Banking Details of the Parties");
    } else {
      text.push("С одной стороны, " + bMuassasa + ", действующий на основании Устава, в лице директора " + bDirektor +
        ", именуемого в дальнейшем «Исполнитель», и с другой стороны, «" + cName + "» (" + cCountry +
        "), действующее на основании Устава, в лице " + cRepTitle + " " + cRepName +
        ", именуемого в дальнейшем «Заказчик», заключили настоящий договор о нижеследующем:");
      text.push("1. Предмет договора");
      text.push("1.1. Виды оказываемых услуг, их стоимость и условия оказания услуг указаны в настоящем договоре.");
      text.push("1.2. Заказчик обязуется принять указанные услуги и оплатить стоимость выполняемых услуг заранее.");
      text.push("1.3. Конкретные виды поставляемых препаратов и стоимость их испытаний приведены в приложении, являющемся неотъемлемой частью настоящего договора.");
      text.push("2. Стоимость договора и порядок расчётов");
      text.push("2.1. Общая сумма договора составляет $" + formatNumber(total) + " (" + capitalize(totalWords) + ") в соответствии с приложением. Указанная стоимость может быть изменена по дополнительному соглашению сторон при выполнении условий договора.");
      text.push("2.2. Заказчик производит 100% предоплату в течение " + tolovKun + " банковских рабочих дней с момента подписания договора в соответствии с пунктом 2.1 настоящего договора для организации испытаний химических препаратов.");
      text.push("2.3. В случае, если Заказчик не произведёт 100% оплату в течение " + tolovKun + " банковских рабочих дней с момента подписания договора, Исполнитель, полностью выполнив услуги и уведомив Заказчика в письменной форме о завершении услуг, считает услуги полностью выполненными.");
      text.push("3. Порядок поставки химических препаратов и их использования");
      text.push("3.1. Заказчик обеспечивает доставку образцов химических препаратов Исполнителю в течение " + preparatKun + " (" + preparatKun + ") рабочих дней с момента подписания договора и имеет право участвовать в процессе испытаний препаратов.");
      text.push("3.2. В случае возникновения факторов, приводящих к приостановке процесса испытаний, Заказчик обязан уведомить Исполнителя в письменной форме в течение " + preparatKun + " (" + preparatKun + ") рабочих дней после выполнения пункта 3.1 настоящего договора.");
      text.push("3.3. Заказчик обязуется обеспечить необходимые стандарты препаратов и дополнительные материалы, необходимые для проведения испытаний.");
      text.push("3.4. Исполнитель организует испытания принятых препаратов в установленном порядке.");
      text.push("3.5. В случае возникновения факторов, препятствующих организации испытаний, Исполнитель уведомляет Заказчика в письменной форме.");
      text.push("4. Ответственность сторон и порядок разрешения споров");
      text.push("4.1. В случае несвоевременной оплаты Заказчиком выполненных услуг Исполнителю в соответствии с условиями договора, Заказчик уплачивает пеню в размере " + penyaKun + "% от суммы платежа за каждый день просрочки, но не более " + penyaMax + "% от суммы, указанной в договоре.");
      text.push("4.2. Односторонний отказ от исполнения договора или одностороннее изменение условий договора не допускается, за исключением случаев, предусмотренных законодательством.");
      text.push("4.3. Ответственность и иные вопросы, не предусмотренные настоящим договором, регулируются Гражданским кодексом Республики Узбекистан, Законом «О договорно-правовой базе деятельности хозяйствующих субъектов» и иными нормативными актами.");
      text.push("5. Форс-мажор и освобождение от ответственности");
      text.push("5.1. Сторона, не исполнившая или ненадлежаще исполнившая обязательства по договору в связи с обстоятельствами непреодолимой силы, то есть чрезвычайными и непредотвратимыми в данных условиях обстоятельствами (землетрясения, засуха, наводнения, пожары, сели, град, буря и другие природные катастрофы), не несёт ответственности при условии доказательства таких обстоятельств (форс-мажора).");
      text.push("6. Срок действия договора");
      text.push("6.1. Настоящий договор вступает в силу с момента подписания и действует до " + muddatText.ru + ".");
      text.push("6.2. Отношения между сторонами прекращаются после полного выполнения всех условий настоящего договора и завершения взаиморасчётов.");
      text.push("7. Условия противодействия коррупции");
      text.push("7.1. Стороны обязуются не предпринимать действия, которые могут нарушить нормы законодательства, включая (но не ограничиваясь) предложение, авторизацию, обещание или осуществление незаконных платежей коммерческим организациям, органам власти, государственным служащим, негосударственным юридическим лицам и их представителям. Стороны обязуются соблюдать требования законодательства о противодействии коррупции и не допускать дачу взяток в денежной или иной форме любым физическим или юридическим лицам в связи с правами или обязательствами, предусмотренными настоящим договором.");
      text.push("7.2. В случае нарушения одной из сторон обязательств, указанных в пункте 7.1, другая сторона имеет право в одностороннем и внесудебном порядке отказаться от исполнения настоящего договора. При расторжении договора в соответствии с данным пунктом убытки стороны, нарушившей условия, не возмещаются.");
      text.push("8. Порядок разрешения споров");
      text.push("8.1. В случае возникновения разногласий и спорных вопросов стороны предпринимают самостоятельные меры для их досудебного урегулирования.");
      text.push("8.2. Споры, не урегулированные сторонами, разрешаются в Экономическом суде.");
      text.push("9. Юридические адреса и банковские реквизиты сторон");
    }
    return text;
  }

  function buildContractParts() {
    var fNo = val("fNo") || "___";
    var joyEn = val("fJoyEn") || "Kibray District";
    var joyRu = val("fJoyRu") || "Кибрайский район";
    var dateVal = document.getElementById("fSana").value;
    var dateBi = formatDateBi(dateVal);
    var muddatIso = document.getElementById("fMuddat").value;
    var muddatBi = muddatIso ? formatDateBi(muddatIso) : { en: "December 31, 2026", ru: "31 декабря 2026 года" };

    var calcData = getCalcRowsData();
    var total = calcData.total;
    var totalWordsEn = total > 0 ? dollarsEn(total) : "____________";
    var totalWordsRu = total > 0 ? dollarsRu(total) : "____________";

    var ctxEn = {
      fNo: fNo, total: total, totalWords: totalWordsEn,
      tolovKun: val("fTolovKun") || "30", preparatKun: val("fPreparatYetkazish") || "3",
      penyaKun: val("fPenyaKun") || "0.1", penyaMax: val("fPenyaMax") || "10",
      muddatText: muddatBi
    };
    var ctxRu = {
      fNo: fNo, total: total, totalWords: totalWordsRu,
      tolovKun: val("fTolovKun") || "30", preparatKun: val("fPreparatYetkazish") || "3",
      penyaKun: val("fPenyaKun") || "0.1", penyaMax: val("fPenyaMax") || "10",
      muddatText: muddatBi
    };

    return {
      titleEn: "CONTRACT № " + fNo,
      dateLineEn: joyEn + ", " + dateBi.en,
      linesEn: buildContractLines("en", ctxEn),
      titleRu: "ДОГОВОР № " + fNo,
      dateLineRu: joyRu + " " + dateBi.ru,
      linesRu: buildContractLines("ru", ctxRu),
      signatureData: signatureData(),
      annexRefEn: "Appendix No. " + fNo,
      annexRefRu: "Приложение №" + fNo,
      kalkTitle: "КАЛЬКУЛЯЦИЯ / CALCULATION",
      kalkDescRu: "Стоимость регистрационных испытаний препаратов фирмы «" + val("cName") + "» (" + val("cCountryRu") + "), по договору №" + fNo,
      kalkDescEn: "The cost of registration trials of the products of “" + val("cName") + "” (" + val("cCountryEn") + "), under Contract No. " + fNo,
      calcData: calcData
    };
  }

  var lastParts = null;

  function headingEl(text) {
    var d = document.createElement("div");
    d.style.textAlign = "center";
    d.style.fontWeight = "700";
    d.textContent = text;
    return d;
  }
  function sublineEl(text, marginBottom) {
    var d = document.createElement("div");
    d.style.textAlign = "center";
    d.style.marginBottom = marginBottom || "1em";
    d.textContent = text;
    return d;
  }

  function buildTwoColumnLayoutEl(leftEl, rightEl) {
    var wrap = document.createElement("div");
    wrap.className = "table-scroll";
    var table = document.createElement("table");
    table.className = "bilingual-columns";
    var tr = document.createElement("tr");
    var leftTd = document.createElement("td");
    leftTd.className = "bilingual-col left";
    leftTd.appendChild(leftEl);
    var rightTd = document.createElement("td");
    rightTd.className = "bilingual-col right";
    rightTd.appendChild(rightEl);
    tr.appendChild(leftTd);
    tr.appendChild(rightTd);
    table.appendChild(tr);
    wrap.appendChild(table);
    return wrap;
  }

  function renderContract(parts) {
    contractOutput.innerHTML = "";

    var titleCol = document.createElement("div");
    titleCol.appendChild(headingEl(parts.titleEn));
    titleCol.appendChild(sublineEl(parts.dateLineEn));
    var titleColRu = document.createElement("div");
    titleColRu.appendChild(headingEl(parts.titleRu));
    titleColRu.appendChild(sublineEl(parts.dateLineRu));
    contractOutput.appendChild(buildTwoColumnLayoutEl(titleCol, titleColRu));

    contractOutput.appendChild(buildParallelClauseTableEl(parts.linesEn, parts.linesRu));

    var sigEn = buildSignatureStackEl(parts.signatureData, "en");
    var sigRu = buildSignatureStackEl(parts.signatureData, "ru");
    contractOutput.appendChild(buildTwoColumnLayoutEl(sigEn, sigRu));

    var sep2 = document.createElement("div");
    sep2.style.textAlign = "center";
    sep2.style.margin = "24px 0";
    sep2.textContent = "————————————————————————————————";
    contractOutput.appendChild(sep2);

    contractOutput.appendChild(sublineEl(parts.annexRefRu + " / " + parts.annexRefEn, "10px"));
    contractOutput.appendChild(headingEl(parts.kalkTitle));
    var kalkDescEl = document.createElement("div");
    kalkDescEl.style.textAlign = "center";
    kalkDescEl.style.margin = "0 0 10px";
    kalkDescEl.style.fontSize = "0.92em";
    kalkDescEl.textContent = parts.kalkDescRu;
    contractOutput.appendChild(kalkDescEl);
    var kalkDescEl2 = document.createElement("div");
    kalkDescEl2.style.textAlign = "center";
    kalkDescEl2.style.margin = "0 0 10px";
    kalkDescEl2.style.fontSize = "0.92em";
    kalkDescEl2.textContent = parts.kalkDescEn;
    contractOutput.appendChild(kalkDescEl2);

    var tableEl = buildCalcTableEl(parts.calcData);
    tableEl.style.margin = "10px 0 18px";
    contractOutput.appendChild(tableEl);

    contractOutput.appendChild(buildBilingualSignatureTableEl(parts.signatureData));
  }

  generateBtn.addEventListener("click", function () {
    recalcAll();
    lastParts = buildContractParts();
    renderContract(lastParts);
    outputSection.classList.remove("results-hidden");
    outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function twoColHtmlWrap(leftHtml, rightHtml) {
    return "<table style='width:100%; border-collapse:collapse; table-layout:fixed;'><tr>" +
      "<td style='width:50%; vertical-align:top; padding:0 24px 0 0; border-right:1px solid #999;'>" + leftHtml + "</td>" +
      "<td style='width:50%; vertical-align:top; padding:0 0 0 24px;'>" + rightHtml + "</td>" +
      "</tr></table>";
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      if (!lastParts) return;
      var p = lastParts;
      var titleHtml = twoColHtmlWrap(
        "<p align='center' style='font-weight:bold; margin:0;'>" + escapeHtml(p.titleEn) + "</p>" +
        "<p align='center' style='margin:0 0 1em;'>" + escapeHtml(p.dateLineEn) + "</p>",
        "<p align='center' style='font-weight:bold; margin:0;'>" + escapeHtml(p.titleRu) + "</p>" +
        "<p align='center' style='margin:0 0 1em;'>" + escapeHtml(p.dateLineRu) + "</p>"
      );
      var clauseTableHtml = parallelClauseTableToHtmlString(p.linesEn, p.linesRu);
      var sigHtml = twoColHtmlWrap(
        signatureStackToHtmlString(p.signatureData, "en"),
        signatureStackToHtmlString(p.signatureData, "ru")
      );
      var html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
        "<head><meta charset='utf-8'><title>Contract</title>" +
        "<style>@page WordSection1 { size: 21cm 29.7cm; margin: 1.5cm 1.5cm 1.5cm 1.5cm; mso-page-orientation: portrait; } div.WordSection1 { page: WordSection1; }</style>" +
        "</head>" +
        "<body style=\"font-family:'Times New Roman',serif; font-size:11pt;\">" +
        "<div class=\"WordSection1\">" +
        titleHtml + clauseTableHtml + sigHtml +
        "<p align='center' style='margin:24px 0;'>————————————————————————————————</p>" +
        "<p align='center' style='margin:0 0 10px;'>" + escapeHtml(p.annexRefRu + " / " + p.annexRefEn) + "</p>" +
        "<p align='center' style='font-weight:bold; margin:0;'>" + escapeHtml(p.kalkTitle) + "</p>" +
        "<p align='center' style='font-size:10pt; margin:0 0 4px;'>" + escapeHtml(p.kalkDescRu) + "</p>" +
        "<p align='center' style='font-size:10pt; margin:0 0 10px;'>" + escapeHtml(p.kalkDescEn) + "</p>" +
        "<div style=\"margin:0 0 18px;\">" + calcTableToHtmlString(p.calcData) + "</div>" +
        bilingualSignatureTableToHtmlString(p.signatureData) +
        "</div>" +
        "</body></html>";
      var blob = new Blob(['﻿', html], { type: "application/msword" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "contract-" + (val("fNo") || "1") + ".doc";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
});
