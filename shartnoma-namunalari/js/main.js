// Shared Excel export helpers (SpreadsheetML 2003 XML - a single, dependency-free
// XML file that Excel/LibreOffice/Sheets open natively when saved with a .xls
// extension). Used by the contract generators to export the full contract as
// a real spreadsheet, not just plain text.
function xlsXmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSpreadsheetXml(sheetName, rows, colWidths) {
  var styles = "" +
    "<Style ss:ID=\"Default\" ss:Name=\"Normal\"><Alignment ss:Vertical=\"Top\" ss:WrapText=\"1\"/><Font ss:FontName=\"Times New Roman\" ss:Size=\"11\"/></Style>" +
    "<Style ss:ID=\"Bold\"><Font ss:FontName=\"Times New Roman\" ss:Size=\"11\" ss:Bold=\"1\"/><Alignment ss:Vertical=\"Top\" ss:WrapText=\"1\"/></Style>" +
    "<Style ss:ID=\"Center\"><Font ss:FontName=\"Times New Roman\" ss:Size=\"11\"/><Alignment ss:Vertical=\"Top\" ss:Horizontal=\"Center\" ss:WrapText=\"1\"/></Style>" +
    "<Style ss:ID=\"CenterBold\"><Font ss:FontName=\"Times New Roman\" ss:Size=\"11\" ss:Bold=\"1\"/><Alignment ss:Vertical=\"Top\" ss:Horizontal=\"Center\" ss:WrapText=\"1\"/></Style>" +
    "<Style ss:ID=\"Right\"><Font ss:FontName=\"Times New Roman\" ss:Size=\"11\"/><Alignment ss:Vertical=\"Top\" ss:Horizontal=\"Right\" ss:WrapText=\"1\"/></Style>" +
    "<Style ss:ID=\"Header\"><Font ss:FontName=\"Times New Roman\" ss:Size=\"11\" ss:Bold=\"1\"/><Alignment ss:Vertical=\"Center\" ss:Horizontal=\"Center\" ss:WrapText=\"1\"/><Borders>" +
    "<Border ss:Position=\"Bottom\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/></Borders></Style>" +
    "<Style ss:ID=\"Cell\"><Font ss:FontName=\"Times New Roman\" ss:Size=\"11\"/><Alignment ss:Vertical=\"Top\" ss:WrapText=\"1\"/><Borders>" +
    "<Border ss:Position=\"Bottom\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Top\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/>" +
    "<Border ss:Position=\"Left\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/><Border ss:Position=\"Right\" ss:LineStyle=\"Continuous\" ss:Weight=\"1\"/></Borders></Style>";

  var colsXml = (colWidths || []).map(function (w) {
    return "<Column ss:Width=\"" + w + "\"/>";
  }).join("");

  var rowsXml = rows.map(function (row) {
    if (row === null) return "<Row><Cell/></Row>";
    // A null entry marks a column consumed by a preceding cell's
    // ss:MergeAcross - it must be omitted entirely (not an empty <Cell>),
    // otherwise the next real cell lands one column too far right.
    var cellsXml = row.filter(function (cell) { return cell != null; }).map(function (cell) {
      var styleId = cell.style || (cell.bold ? "Bold" : "Default");
      var type = cell.type || "String";
      var mergeAttr = cell.merge ? " ss:MergeAcross=\"" + cell.merge + "\"" : "";
      var val = cell.value == null ? "" : cell.value;
      return "<Cell ss:StyleID=\"" + styleId + "\"" + mergeAttr + "><Data ss:Type=\"" + type + "\">" + xlsXmlEscape(val) + "</Data></Cell>";
    }).join("");
    return "<Row>" + cellsXml + "</Row>";
  }).join("");

  return "<?xml version=\"1.0\"?>" +
    "<?mso-application progid=\"Excel.Sheet\"?>" +
    "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">" +
    "<Styles>" + styles + "</Styles>" +
    "<Worksheet ss:Name=\"" + xlsXmlEscape(sheetName) + "\">" +
    "<Table>" + colsXml + rowsXml + "</Table>" +
    "</Worksheet>" +
    "</Workbook>";
}

function downloadXlsFile(filename, xml) {
  var blob = new Blob(["﻿", xml], { type: "application/vnd.ms-excel" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      var expanded = nav.classList.contains("open");
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
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

  document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.querySelector(btn.getAttribute("data-copy-target"));
      var feedback = document.querySelector(btn.getAttribute("data-feedback"));
      if (!target) return;
      var text = target.innerText;
      var done = function () {
        if (feedback) {
          feedback.textContent = btn.dataset.doneMessage || "Nusxalandi!";
          setTimeout(function () { feedback.textContent = ""; }, 2500);
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        var range = document.createRange();
        range.selectNode(target);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
        done();
      }
    });
  });

  document.querySelectorAll("[data-print]").forEach(function (btn) {
    btn.addEventListener("click", function () { window.print(); });
  });
});
