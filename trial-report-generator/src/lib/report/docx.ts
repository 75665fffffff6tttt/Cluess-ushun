/**
 * Давлат синови илмий ҳисоботини .docx форматида яратиш (docx кутубхонаси).
 *
 * 16 бўлимли расмий тузилиш, жадваллар, графиклар ва статистик таҳлил.
 * Барча рақамлар ComputedReport'дан (фойдаланувчи киритган далада ўлчовларидан
 * ҳисобланган) олинади — матн шу қийматларга мослаштирилади, кўчирилмайди.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  PageBreak,
} from "docx";
import { efficacyBar, dynamicsLine, yieldBar } from "./charts";
import type { ComputedReport, ReportMeta } from "../types";

const FONT = "Times New Roman";

function p(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number; italics?: boolean; spacingAfter?: number } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacingAfter ?? 120, line: 276 },
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        font: FONT,
        size: opts.size ?? 24, // half-points => 12pt
      }),
    ],
  });
}

function heading(num: number | null, title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 160 },
    children: [
      new TextRun({
        text: num != null ? `${num}. ${title}` : title,
        bold: true,
        font: FONT,
        size: 28, // 14pt
      }),
    ],
  });
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, font: FONT, size: 24 }),
      new TextRun({ text: value || "—", font: FONT, size: 24 }),
    ],
  });
}

const THIN = { style: BorderStyle.SINGLE, size: 4, color: "555555" };
const CELL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function cell(text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shade?: string } = {}): TableCell {
  return new TableCell({
    borders: CELL_BORDERS,
    shading: opts.shade ? { fill: opts.shade } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.CENTER,
        spacing: { after: 0, line: 240 },
        children: [new TextRun({ text, bold: opts.bold, font: FONT, size: 22 })],
      }),
    ],
  });
}

function fmt(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function table(headerCells: string[], rows: TableCell[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerCells.map((h) => cell(h, { bold: true, shade: "e8f0e8" })),
      }),
      ...rows.map((r) => new TableRow({ children: r })),
    ],
  });
}

async function chartImage(buffer: Buffer, width = 560, height = 327): Promise<Paragraph> {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 160 },
    children: [
      new ImageRun({
        type: "png",
        data: buffer,
        transformation: { width, height },
      }),
    ],
  });
}

function caption(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [new TextRun({ text, italics: true, font: FONT, size: 22 })],
  });
}

// ---------------------------------------------------------------------------

export async function buildReportDocx(report: ComputedReport, meta: ReportMeta): Promise<Buffer> {
  const days = report.days;
  const children: (Paragraph | Table)[] = [];

  // --- 1. ТИТУЛ ВАРАҒИ ---
  children.push(
    p("ЎЗБЕКИСТОН РЕСПУБЛИКАСИ", { align: AlignmentType.CENTER, bold: true, size: 24 }),
    p("ЎСИМЛИКЛАР КАРАНТИНИ ВА ҲИМОЯСИ АГЕНТЛИГИ", { align: AlignmentType.CENTER, bold: true, size: 24 }),
    p(meta.laboratory || "Давлат синов лабораторияси", { align: AlignmentType.CENTER, size: 24, spacingAfter: 600 }),
    p("ДАВЛАТ СИНОВИ ИЛМИЙ ҲИСОБОТИ", { align: AlignmentType.CENTER, bold: true, size: 32, spacingAfter: 300 }),
    p(`«${meta.preparatName}» препаратининг ${meta.crop} экинида ${meta.targetOrganism}га қарши биологик самарадорлигини аниқлаш бўйича`, {
      align: AlignmentType.CENTER, size: 26, spacingAfter: 600,
    }),
    labelValue("Таъсир этувчи модда", meta.activeIngredients),
    labelValue("Препарат шакли", meta.preparatForm),
    labelValue("Ишлаб чиқарувчи фирма", meta.manufacturer),
    labelValue("Давлат", meta.country),
    labelValue("Синов жойи", meta.site),
    labelValue("Синов санаси", meta.trialDate),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // --- 2. ИЛМИЙ КЕНГАШ ТАСДИҒИ ---
  children.push(
    heading(null, "«ТАСДИҚЛАЙМАН»"),
    p(`${meta.laboratory || "Лаборатория"} раҳбари`, { align: AlignmentType.RIGHT }),
    p("_______________________", { align: AlignmentType.RIGHT }),
    p("«____» _______________ 20___ й.", { align: AlignmentType.RIGHT, spacingAfter: 400 }),
    p("Мазкур ҳисобот лаборатория илмий кенгашининг мажлисида кўриб чиқилди ва тасдиқланди.", {}),
    p("Илмий ходимлар: " + (meta.staff || "—"), {}),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // --- 3. МУНДАРИЖА ---
  children.push(heading(3, "Мундарижа"));
  const toc = [
    "Кириш", "Адабиётлар шарҳи", "Синов баёномаси", "Тадқиқот ўтказиш шароити",
    "Тадқиқот методикаси", "Тажриба натижалари", "Биологик самарадорлик жадваллари",
    "Ҳосилдорлик натижалари", "Илмий муҳокама", "Хулоса", "Тавсия",
    "Давлат рўйхатига киритиш бўйича якуний хулоса", "Далолатнома",
  ];
  toc.forEach((t, i) => children.push(p(`${i + 4}. ${t}`, { spacingAfter: 60 })));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // --- 4. КИРИШ ---
  children.push(
    heading(4, "Кириш"),
    p(`${meta.crop} экини Ўзбекистон Республикаси қишлоқ хўжалигининг муҳим тармоқларидан бири ҳисобланади. Ушбу экинда ${meta.targetOrganism} катта иқтисодий зарар келтириши мумкин, бу эса самарали ҳимоя воситаларини қўллашни тақозо этади.`),
    p(`Мазкур тадқиқот «${meta.preparatName}» (таъсир этувчи модда — ${meta.activeIngredients}) препаратининг ${report.typeNameUz.toLowerCase()} сифатида ${meta.targetOrganism}га қарши биологик самарадорлигини давлат синови методикаси асосида аниқлашга бағишланган.`),
    p(`Синов ${meta.site}да ${meta.trialDate} санасида, ${meta.crop} экинининг «${meta.variety}» навида ўтказилди. Тажрибада препарат ${meta.applicationRate} меъёрида қўлланилди, эталон сифатида ${meta.referenceName} олинди.`),
  );

  // --- 5. АДАБИЁТЛАР ШАРҲИ ---
  children.push(
    heading(5, "Адабиётлар шарҳи"),
    p(`Ўсимликларни ҳимоя қилиш воситаларининг биологик самарадорлигини баҳолашда халқаро ва миллий методикалар қўлланилади. Инсектицидлар учун Abbott (1925) ва Henderson–Tilton (1955) формулалари, фунгицидлар учун EPPO стандартлари, дала тажрибаларининг статистик таҳлилида Доспехов Б.А. услубияти кенг тарқалган.`),
    p(`Таъсир этувчи модда ${meta.activeIngredients} гуруҳига мансуб препаратлар бўйича мавжуд адабиётлар уларнинг мақсадли зарарли организмларга нисбатан юқори фаоллигини кўрсатади. Ушбу тадқиқот шу маълумотларни маҳаллий шароитда текширишга қаратилган.`),
  );

  // --- 6. СИНОВ БАЁНОМАСИ ---
  children.push(
    heading(6, "Синов баёномаси"),
    labelValue("Препарат номи", meta.preparatName),
    labelValue("Таъсир этувчи модда(лар)", meta.activeIngredients),
    labelValue("Препарат шакли", meta.preparatForm),
    labelValue("Аниқланган препарат тури", report.typeNameUz + (report.detection.matchedIngredient ? ` (${report.detection.matchedIngredient} бўйича)` : "")),
    labelValue("Ишлаб чиқарувчи фирма", meta.manufacturer),
    labelValue("Экин / нав", `${meta.crop} / ${meta.variety}`),
    labelValue("Зарарли организм", meta.targetOrganism),
    labelValue("Сарф меъёри", meta.applicationRate),
    labelValue("Эталон препарат", meta.referenceName),
    labelValue("Ишчи эритма меъёри", meta.workingSolution),
    labelValue("Кузатиш кунлари", days.join(", ") + " кун"),
  );
  if (report.detection.needsConfirmation) {
    children.push(p("Эслатма: препарат тури таъсир этувчи модда бўйича автоматик аниқланмади ва фойдаланувчи томонидан қўлбола киритилди.", { italics: true }));
  }

  // --- 7. ТАДҚИҚОТ ЎТКАЗИШ ШАРОИТИ ---
  children.push(
    heading(7, "Тадқиқот ўтказиш шароити"),
    labelValue("Синов жойи", meta.site),
    labelValue("Синов санаси", meta.trialDate),
    labelValue("Об-ҳаво шароити", meta.weather),
    p(`Тажриба дала шароитида, тасодифий блокли схемада, такрорлар бўйича жойлаштирилди. Агротехник тадбирлар минтақа учун қабул қилинган стандарт талаблар асосида бажарилди.`),
  );

  // --- 8. ТАДҚИҚОТ МЕТОДИКАСИ ---
  children.push(
    heading(8, "Тадқиқот методикаси"),
    p(`Биологик самарадорлик қуйидаги методика бўйича ҳисобланди: ${report.efficacyMethodLabel}.`),
    p(`Дала ҳисоблари ${days.join(", ")}-кунларда олиб борилди. Ҳар бир вариантда зарарли организм сони (ёки касаллик/бегона ўт кўрсаткичи) аниқланиб, назорат варианти билан таққосланди. Ҳосилдорлик натижалари дисперсион таҳлил (ANOVA) усулида, НСР₀.₀₅ (энг кичик ишончли фарқ) ҳисоблаш билан баҳоланди.`),
    p("Барча самарадорлик ва статистик кўрсаткичлар фақат далада олинган ўлчов маълумотлари асосида ҳисобланган.", { italics: true }),
  );

  // --- 9. ТАЖРИБА НАТИЖАЛАРИ (хом сонлар) ---
  children.push(heading(9, "Тажриба натижалари"));
  if (report.countRows && report.countRows.length) {
    children.push(p("9.1-жадвал. Зарарли организм сони (дала ҳисоблари).", { bold: true }));
    const header = ["Вариант", "Ишловгача", ...days.map((d) => `${d}-кун`)];
    const rows = report.countRows.map((r) => [
      cell(r.variant, { align: AlignmentType.LEFT, bold: r.isControl }),
      cell(fmt(r.before, 0)),
      ...days.map((d) => cell(fmt(r.byDay[d], 0))),
    ]);
    children.push(table(header, rows));
  } else {
    children.push(p("Дала ҳисоблари самарадорлик жадвалларида келтирилган."));
  }

  // --- 10. БИОЛОГИК САМАРАДОРЛИК ЖАДВАЛЛАРИ ---
  children.push(heading(10, "Биологик самарадорлик жадваллари"));
  children.push(p(`10.1-жадвал. ${meta.targetOrganism}га қарши биологик самарадорлик, %. Методика: ${report.efficacyMethodLabel}.`, { bold: true }));
  {
    const header = ["Вариант", ...days.map((d) => `${d}-кун, %`), "Ўртача, %"];
    const rows = report.efficacyRows.map((r) => [
      cell(r.variant + (r.isReference ? " (эталон)" : ""), { align: AlignmentType.LEFT, bold: r.isControl }),
      ...days.map((d) => cell(r.isControl ? "—" : fmt(r.byDay[d], 1))),
      cell(r.isControl ? "—" : fmt(r.mean, 1), { bold: true }),
    ]);
    children.push(table(header, rows));
  }

  // График: самарадорлик (энг юқори ўртачали ноназорат вариант)
  const bestTreated = report.efficacyRows
    .filter((r) => !r.isControl && r.mean != null)
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0];
  if (bestTreated) {
    const buf = await efficacyBar(days, days.map((d) => bestTreated.byDay[d]), {
      title: `Биологик самарадорлик — ${bestTreated.variant}, %`,
    });
    children.push(await chartImage(buf));
    children.push(caption(`1-расм. «${bestTreated.variant}» варианти бўйича биологик самарадорлик динамикаси.`));
  }

  // График: зараркунанда динамикаси (назорат vs энг яхши вариант) — фақат counts бўлса
  if (report.countRows && bestTreated) {
    const ctrl = report.countRows.find((r) => r.isControl);
    const treated = report.countRows.find((r) => r.variant === bestTreated.variant);
    if (ctrl && treated) {
      const buf = await dynamicsLine(
        days,
        [
          { label: "Назорат", values: days.map((d) => ctrl.byDay[d]) },
          { label: treated.variant, values: days.map((d) => treated.byDay[d]) },
        ],
        { title: "Зарарли организм сони динамикаси", ylabel: "дона" },
      );
      children.push(await chartImage(buf));
      children.push(caption("2-расм. Назорат ва тажриба вариантларида зарарли организм сони динамикаси."));
    }
  }

  // --- 11. ҲОСИЛДОРЛИК НАТИЖАЛАРИ ---
  children.push(heading(11, "Ҳосилдорлик натижалари"));
  if (report.yieldRows && report.yieldRows.length) {
    const maxReps = Math.max(...report.yieldRows.map((r) => r.reps.length));
    const header = ["Вариант", ...Array.from({ length: maxReps }, (_, i) => `${i + 1}-такр.`), `Ўртача, ${report.yieldUnit ?? ""}`, "Назоратга нисбатан, %"];
    const rows = report.yieldRows.map((r) => [
      cell(r.variant, { align: AlignmentType.LEFT, bold: r.isControl }),
      ...Array.from({ length: maxReps }, (_, i) => cell(fmt(r.reps[i], 1))),
      cell(fmt(r.mean, 1), { bold: true }),
      cell(r.increaseVsControlPct == null ? "—" : `+${fmt(r.increaseVsControlPct, 1)}`),
    ]);
    children.push(p(`11.1-жадвал. Ҳосилдорлик натижалари (${report.yieldUnit ?? ""}).`, { bold: true }));
    children.push(table(header, rows));

    const buf = await yieldBar(
      report.yieldRows.map((r) => r.variant),
      report.yieldRows.map((r) => r.mean ?? 0),
      { title: `Ҳосилдорлик, ${report.yieldUnit ?? ""}` },
    );
    children.push(await chartImage(buf));
    children.push(caption("3-расм. Вариантлар бўйича ўртача ҳосилдорлик."));

    if (report.yieldAnova) {
      const a = report.yieldAnova;
      children.push(p("11.2-жадвал. Ҳосилдорлик дисперсион таҳлили (ANOVA) кўрсаткичлари.", { bold: true }));
      const arows = [
        [cell("Умумий ўртача", { align: AlignmentType.LEFT }), cell(fmt(a.grandMean, 2))],
        [cell("НСР₀.₀₅ (энг кичик ишончли фарқ)", { align: AlignmentType.LEFT }), cell(fmt(a.lsd05, 2))],
        [cell("Ўртача хатоси, Sx", { align: AlignmentType.LEFT }), cell(fmt(a.seMean, 2))],
        [cell("Айирма хатоси, Sd", { align: AlignmentType.LEFT }), cell(fmt(a.seDiff, 2))],
        [cell("Вариация коэффициенти, CV%", { align: AlignmentType.LEFT }), cell(fmt(a.cvPct, 2))],
        [cell("Тажриба аниқлиги, P%", { align: AlignmentType.LEFT }), cell(fmt(a.precisionPct, 2))],
        [cell("F-мезон (ҳисобланган)", { align: AlignmentType.LEFT }), cell(fmt(a.fValue, 2))],
        [cell("P-қиймат", { align: AlignmentType.LEFT }), cell(fmt(a.pValue, 4))],
      ];
      children.push(table(["Кўрсаткич", "Қиймат"], arows));
      children.push(
        p(
          a.significant
            ? `Дисперсион таҳлил натижаларига кўра вариантлар ўртасидаги фарқ статистик жиҳатдан ишончли (P < 0,05). Ўртачалар айирмаси НСР₀.₀₅ = ${fmt(a.lsd05, 2)} дан катта бўлган вариантлар бир-биридан ишончли фарқ қилади.`
            : `Дисперсион таҳлил натижаларига кўра вариантлар ўртасидаги фарқ статистик жиҳатдан ишончли эмас (P ≥ 0,05).`,
        ),
      );
    }
  } else {
    children.push(p("Ҳосилдорлик маълумотлари киритилмаган."));
  }

  // --- 12. ИЛМИЙ МУҲОКАМА ---
  const meanOfBest = bestTreated?.mean;
  children.push(
    heading(12, "Илмий муҳокама"),
    p(`Олиб борилган дала тажрибалари натижасида «${meta.preparatName}» препаратининг ${meta.targetOrganism}га қарши биологик самарадорлиги аниқланди. ${bestTreated ? `Энг юқори кўрсаткич «${bestTreated.variant}» вариантида кузатилди — ўртача ${fmt(meanOfBest, 1)}%.` : ""}`),
    p(`Самарадорлик кузатиш даврида ўзгариб турди, бу препаратнинг таъсир механизми ва об-ҳаво шароитлари билан боғлиқ. Олинган натижалар ${report.efficacyMethodLabel} методикаси асосида ҳисобланиб, эталон препарат (${meta.referenceName}) кўрсаткичлари билан таққосланди.`),
  );

  // --- 13. ХУЛОСА ---
  children.push(
    heading(13, "Хулоса"),
    p(`«${meta.preparatName}» препарати (${meta.activeIngredients}) ${meta.crop} экинида ${meta.targetOrganism}га қарши ${meta.applicationRate} меъёрида ${bestTreated ? `ўртача ${fmt(meanOfBest, 1)}% ` : ""}биологик самарадорлик кўрсатди.`),
    report.yieldRows && report.yieldRows.some((r) => (r.increaseVsControlPct ?? 0) > 0)
      ? p(`Препарат қўлланилган вариантларда ҳосилдорлик назоратга нисбатан ошди, бу препаратнинг қишлоқ хўжалиги нуқтаи назаридан фойдалилигини кўрсатади.`)
      : p(`Ҳосилдорлик кўрсаткичлари жадвалда келтирилган.`),
  );

  // --- 14. ТАВСИЯ ---
  children.push(
    heading(14, "Тавсия"),
    p(`«${meta.preparatName}» препаратини ${meta.crop} экинида ${meta.targetOrganism}га қарши ${meta.applicationRate} меъёрида, ишчи эритма ${meta.workingSolution} ҳисобида қўллаш тавсия этилади. Ишлов бериш зарарли организм ривожланишининг дастлабки босқичларида ўтказилиши мақсадга мувофиқ.`),
  );

  // --- 15. ДАВЛАТ РЎЙХАТИГА КИРИТИШ БЎЙИЧА ЯКУНИЙ ХУЛОСА ---
  children.push(
    heading(15, "Давлат рўйхатига киритиш бўйича якуний хулоса"),
    p(`Олиб борилган давлат синови натижаларига асосан «${meta.preparatName}» препаратини ${meta.crop} экинида ${meta.targetOrganism}га қарши қўллаш учун Ўзбекистон Республикасида рўйхатдан ўтказиш бўйича ижобий хулоса берилади. Якуний қарор ваколатли давлат органи томонидан барча синов маълумотлари таҳлили асосида қабул қилинади.`, { italics: true }),
  );

  // --- 16. ДАЛОЛАТНОМА ---
  children.push(
    heading(16, "Далолатнома"),
    p(`Ушбу далолатнома «${meta.preparatName}» препаратининг давлат синови ${meta.site}да ${meta.trialDate} санасида ўтказилганлигини тасдиқлайди.`),
    p("Синовда иштирок этган илмий ходимлар:", { spacingAfter: 240 }),
    p(meta.staff || "________________________________", { spacingAfter: 240 }),
    p("Имзолар: _______________     _______________     _______________", { spacingAfter: 240 }),
    p(`Сана: ${meta.trialDate}`, {}),
  );

  const doc = new Document({
    creator: "Ўсимликлар карантини ва ҳимояси агентлиги — синов ҳисобот генератори",
    title: `${meta.preparatName} — давлат синови ҳисоботи`,
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1417, right: 850 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
