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
      '<td style="text-align:center;"><input type="checkbox" class="f-qoshimcha" ' + (data.qoshimcha ? "checked" : "") + '></td>' +
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
    var qoshimchaChecked = tr.querySelector(".f-qoshimcha").checked;
    var qoshimcha = qoshimchaChecked ? Math.round(baho * 0.3) : 0;
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
  addRow({ preparat: "FARBIOBAC (Azotobacter chroococcum, Bacillus subtilis, kamida 1x10⁸ KTB/ml)", ekin: "G‘o‘za", obyekt: "O‘g‘it, shuningdek fungitsidlik xususiyati bor", meyor: "3 l/ga, 2 marta", baho: 15647500, qoshimcha: true });
  addRow({ preparat: "FARBIOBAC (Azotobacter chroococcum, Bacillus subtilis, kamida 1x10⁸ KTB/ml)", ekin: "Bug‘doy", obyekt: "O‘g‘it, shuningdek fungitsidlik xususiyati bor", meyor: "3 l/ga, 2 marta", baho: 15647500, qoshimcha: true });
  addRow({ preparat: "FARBIOBAC (Azotobacter chroococcum, Bacillus subtilis, kamida 1x10⁸ KTB/ml)", ekin: "Sabzavot (pomidor)", obyekt: "O‘g‘it, shuningdek fungitsidlik xususiyati bor", meyor: "3 l/ga, 1 marta", baho: 15647500, qoshimcha: false });

  function formatDateUz(isoDate) {
    if (!isoDate) return "“______” ____________ 2026 yil";
    var d = new Date(isoDate + "T00:00:00");
    var months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
    return "“" + d.getDate() + "” " + months[d.getMonth()] + " " + d.getFullYear() + " yil";
  }

  function val(id) { return document.getElementById(id).value.trim(); }

  function buildSignatureBlock() {
    return [
      '“BAJARUVCHI”                                                    “BUYURTMACHI”',
      val("bMuassasa"),
      'Manzil: ' + val("bManzil"),
      'Bank: ' + val("bBank"),
      'H/r: ' + val("bXr"),
      'Sh.x.r: ' + val("bShxr"),
      'MFO: ' + val("bMfo") + '   STIR: ' + val("bInn"),
      'Tel: ' + val("bTel"),
      '',
      'Direktor _______________ ' + val("bDirektor"),
      '',
      (val("oNomi") || "____________________ MCHJ, O‘zbekiston"),
      'Manzil: ' + (val("oManzil") || "____________________"),
      'Bank: ' + (val("oBank") || "____________________"),
      'H/r: ' + (val("oXr") || "____________________"),
      'MFO: ' + (val("oMfo") || "____________________") + '   STIR: ' + (val("oInn") || "____________________"),
      'OKED: ' + (val("oOked") || "____________________"),
      'Tel: ' + (val("oTel") || "____________________"),
      '',
      'Direktor _______________ ' + (val("oDirektor") || "____________________"),
    ].join("\n");
  }

  function buildCalcTableText() {
    var rows = calcRows.querySelectorAll("tr");
    var lines = [];
    lines.push("№ | Preparat | Ekin turi | Ob'ekt | Sarf me'yori | 1 me'yor bo'yicha sinov bahosi | +30% qo'shimcha | Jami baho");
    var total = 0;
    rows.forEach(function (tr, idx) {
      var preparat = tr.querySelector(".f-preparat").value;
      var ekin = tr.querySelector(".f-ekin").value;
      var obyekt = tr.querySelector(".f-obyekt").value;
      var meyor = tr.querySelector(".f-meyor").value;
      var baho = parseFloat(tr.querySelector(".f-baho").value) || 0;
      var qoshimchaChecked = tr.querySelector(".f-qoshimcha").checked;
      var qoshimcha = qoshimchaChecked ? Math.round(baho * 0.3) : 0;
      var jami = baho + qoshimcha;
      total += jami;
      lines.push((idx + 1) + " | " + preparat + " | " + ekin + " | " + obyekt + " | " + meyor + " | " +
        formatNumber(baho) + " | " + formatNumber(qoshimcha) + " | " + formatNumber(jami));
    });
    lines.push("");
    lines.push("Jami: " + formatNumber(total) + " so‘m");
    return lines.join("\n");
  }

  function buildContractText() {
    var fNo = val("fNo") || "___";
    var joy = val("fJoy") || "Qibray tumani";
    var sanaText = formatDateUz(document.getElementById("fSana").value);
    var muddatIso = document.getElementById("fMuddat").value;
    var muddatText = muddatIso ? formatDateUz(muddatIso) : "2026-yil 31-dekabrgacha";
    var preparatKun = val("fPreparatYetkazish") || "3";
    var tolovKun = val("fTolovKun") || "15";
    var penyaKun = val("fPenyaKun") || "0.4";
    var penyaMax = val("fPenyaMax") || "50";

    var rows = calcRows.querySelectorAll("tr");
    var total = 0;
    rows.forEach(function (tr) {
      var baho = parseFloat(tr.querySelector(".f-baho").value) || 0;
      var qoshimcha = tr.querySelector(".f-qoshimcha").checked ? Math.round(baho * 0.3) : 0;
      total += baho + qoshimcha;
    });
    var totalWords = total > 0 ? capitalize(numberToWordsUz(total)) : "____________";

    var firstPreparat = rows.length ? rows[0].querySelector(".f-preparat").value : "____________";

    var text = [];
    text.push("SHARTNOMA № " + fNo);
    text.push("");
    text.push(joy + "                                                             " + sanaText);
    text.push("");
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
    text.push("");
    text.push(buildSignatureBlock());
    text.push("");
    text.push("————————————————————————————————");
    text.push("");
    text.push(sanaText + " dagi № " + fNo + "-sonli shartnomaga ILOVA");
    text.push("");
    text.push("KALKULYATSIYA");
    text.push("registratsiya sinovlari xarajatlarining hisob-kitobi, " + (val("oNomi") || "“Buyurtmachi”") + " preparatlari bo‘yicha, " + fNo + "-sonli shartnomaga muvofiq");
    text.push("");
    text.push(buildCalcTableText());
    text.push("");
    text.push(buildSignatureBlock());

    return text.join("\n");
  }

  generateBtn.addEventListener("click", function () {
    recalcAll();
    contractOutput.textContent = buildContractText();
    outputSection.classList.remove("results-hidden");
    outputSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      var text = contractOutput.textContent;
      if (!text) return;
      var escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      var html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
        "<head><meta charset='utf-8'><title>Shartnoma</title></head>" +
        "<body style=\"font-family:'Times New Roman',serif; font-size:13pt; white-space:pre-wrap;\">" + escaped + "</body></html>";
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
