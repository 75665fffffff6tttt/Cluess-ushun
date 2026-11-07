/**
 * Давлат синови илмий ҳисоботини .docx форматида яратиш.
 *
 * Тузилиш «Ўсимликлар карантини ва ҳимояси ИТИ» расмий ҳисобот намунасига
 * (Flurog-услуб) мослаштирилган: титул, мундарижа, кириш, адабиётлар шарҳи,
 * синов баёномаси (3.1–3.15), методика + тажриба тизими + организмлар жадвали,
 * натижалар жадвали + ҳосилдорлик, хулоса, адабиётлар, рўйхат хулосаси,
 * далолатнома.
 *
 * Барча рақамлар ComputedReport'дан (фойдаланувчи киритган ўлчовлардан
 * ҳисобланган) олинади.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  PageBreak,
  VerticalAlign,
} from "docx";
import { efficacyBar, yieldBar } from "./charts";
import type { ComputedReport, ReportMeta, DetailRow } from "../types";

const FONT = "Times New Roman";

const DEFAULTS = {
  committee: "ЎЗБЕКИСТОН РЕСПУБЛИКАСИ ОЗИҚ-ОВҚАТ ХАВФСИЗЛИГИ ҚЎМИТАСИ",
  agency: "ЎСИМЛИКЛАР КАРАНТИНИ ВА ҲИМОЯСИ АГЕНТЛИГИ",
  institute: "ЎСИМЛИКЛАР КАРАНТИНИ ВА ҲИМОЯСИ ИЛМИЙ-ТАДҚИҚОТ ИНСТИТУТИ",
  director: "________________",
  applicationMethod: "пуркаш",
  experimentType: "кичик дала тажрибаси",
  maxTreatments: "1",
  waitingPeriod: "—",
  phytotoxicity: "Кузатилмади",
};

function txt(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: opts.bold, italics: opts.italics, font: FONT, size: opts.size ?? 24 });
}

function p(
  text: string,
  opts: {
    bold?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    size?: number;
    italics?: boolean;
    after?: number;
    indent?: boolean;
  } = {},
): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.after ?? 120, line: 276 },
    indent: opts.indent ? { firstLine: 480 } : undefined,
    children: [txt(text, opts)],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 140 },
    children: [txt(text, { bold: true, size: 26 })],
  });
}

function field(num: string, label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 276 },
    children: [txt(`${num} ${label} – `, { bold: false }), txt(value || "—", { bold: true })],
  });
}

const THIN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function cell(
  text: string,
  opts: {
    bold?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    shade?: string;
    colSpan?: number;
    rowSpan?: number;
    size?: number;
  } = {},
): TableCell {
  return new TableCell({
    borders: BORDERS,
    columnSpan: opts.colSpan,
    rowSpan: opts.rowSpan,
    shading: opts.shade ? { fill: opts.shade } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 60, right: 60 },
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.CENTER,
        spacing: { after: 0, line: 240 },
        children: [txt(text, { bold: opts.bold, size: opts.size ?? 20 })],
      }),
    ],
  });
}

function fmt(v: number | null | undefined, d = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(d).replace(".", ",");
}

async function chart(buffer: Buffer, w = 540, h = 315): Promise<Paragraph> {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 140 },
    children: [new ImageRun({ type: "png", data: buffer, transformation: { width: w, height: h } })],
  });
}

function caption(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 140 },
    children: [txt(text, { italics: true, size: 20 })],
  });
}

// ---------------------------------------------------------------------------

export async function buildReportDocx(report: ComputedReport, meta: ReportMeta): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  const institute = meta.institute || DEFAULTS.institute;
  const nonControl = report.detailed?.nonControlVariants ?? [];

  // === ТИТУЛ ВАРАҒИ ===
  children.push(
    p(meta.committee || DEFAULTS.committee, { align: AlignmentType.CENTER, bold: true, size: 24 }),
    p(DEFAULTS.agency, { align: AlignmentType.CENTER, bold: true, size: 24 }),
    p(institute, { align: AlignmentType.CENTER, bold: true, size: 24, after: 400 }),
    p("«ТАСДИҚЛАЙМАН»", { align: AlignmentType.RIGHT, bold: true }),
    p(`${institute} директори`, { align: AlignmentType.RIGHT, size: 22 }),
    p(`________________ ${meta.director || DEFAULTS.director}`, { align: AlignmentType.RIGHT, size: 22 }),
    p("«___»__________ 2026 йил", { align: AlignmentType.RIGHT, size: 22, after: 500 }),
    p("ИЛМИЙ ҲИСОБОТ", { align: AlignmentType.CENTER, bold: true, size: 32, after: 300 }),
    p(
      `${meta.crop} экинида ${meta.targetOrganism}га қарши ${meta.preparatName}` +
        `${meta.applicantOrg ? ` («${meta.applicantOrg}» ${meta.country || ""})` : ""} препаратининг биологик самарадорлигини аниқлаш.`,
      { align: AlignmentType.CENTER, size: 26, after: 600 },
    ),
    p("Синовда иштирок этган илмий ходимлар:", { bold: true, after: 100 }),
    ...(meta.staff || "")
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => p(s, { align: AlignmentType.CENTER, size: 22, after: 40 })),
    p(`Тошкент – 2026`, { align: AlignmentType.CENTER, bold: true, size: 24, after: 300 }),
    p(`${institute} илмий кенгашида кўриб чиқилди ва тасдиқланди.`, { align: AlignmentType.CENTER, size: 22 }),
    p(`Баённома №${meta.protocolNumber || "____"}  «___»________ 2026 й.`, { align: AlignmentType.CENTER, size: 22 }),
  );
  if (meta.scientificSecretary) {
    children.push(p(`Илмий котиб: ${meta.scientificSecretary}`, { align: AlignmentType.RIGHT, size: 22 }));
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // === МУНДАРИЖА ===
  children.push(p("МУНДАРИЖА", { align: AlignmentType.CENTER, bold: true, size: 26, after: 160 }));
  const toc = [
    "Кириш",
    "Адабиётлар шарҳи",
    "Синов баёномаси",
    "Синов ўтказиш жойи ва услублари (методикаси)",
    "Тажриба (тадқиқот) натижалари",
    "Хулоса ва тавсиялар",
    "Фойдаланилган адабиётлар рўйхати",
    "Ўсимликларни ҳимоя қилиш воситасини рўйхатга киритиш бўйича хулоса",
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: toc.map(
        (t, i) =>
          new TableRow({
            children: [
              cell(`${i + 1}.`, { align: AlignmentType.CENTER, size: 22 }),
              cell(t, { align: AlignmentType.LEFT, size: 22 }),
            ],
          }),
      ),
    }),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // === 1. КИРИШ (тахминан 1 бет) ===
  const _tl = report.typeNameUz.toLowerCase();
  children.push(
    heading("1. КИРИШ"),
    p(
      `Жаҳон миқёсида аҳолини озиқ-овқат маҳсулотлари билан барқарор таъминлаш ва қишлоқ хўжалиги ишлаб чиқаришини ` +
        `ривожлантириш бугунги куннинг устувор вазифаларидан биридир. Дунё аҳолисининг тобора ортиб бориши шароитида ` +
        `мавжуд ер, сув ва меҳнат ресурсларидан оқилона фойдаланиб, экин майдони бирлигидан олинадиган ҳосил миқдорини ` +
        `ошириш ҳамда унинг сифатини яхшилаш долзарб аҳамият касб этмоқда. Ўзбекистон Республикасида ҳам қишлоқ ` +
        `хўжалигини интенсив ривожлантириш, соҳага илм-фан ютуқлари ва замонавий агротехнологияларни жорий этишга ` +
        `алоҳида эътибор қаратилмоқда.`,
      { indent: true },
    ),
    p(
      `${meta.crop} экини республика деҳқончилигида муҳим ўрин тутади ва аҳолининг озиқ-овқатга бўлган эҳтиёжини ` +
        `қондиришда, шунингдек саноат хомашёсини таъминлашда стратегик аҳамиятга эга. Ушбу экиндан юқори ва барқарор ` +
        `ҳосил олиш кўп жиҳатдан агротехник тадбирларнинг сифати ҳамда ўсимликни зарарли организмлардан ўз вақтида ва ` +
        `самарали ҳимоя қилишга боғлиқ.`,
      { indent: true },
    ),
    p(
      `Экин ҳосилдорлигини камайтирувчи асосий омиллардан бири — ${meta.targetOrganism} ҳисобланади. Жаҳон ва маҳаллий ` +
        `тадқиқотларда қайд этилишича, ушбу зарарли организмлар назорат қилинмаган ҳолда сезиларли ҳосил нобудгарчилигига ` +
        `(айрим ҳолларда умумий ҳосилнинг 20–50% гача) олиб келиши, шунингдек маҳсулот сифатини пасайтириши мумкин. ` +
        `Зарарли организмлар нафақат тўғридан-тўғри зарар етказади, балки касаллик тарқатувчи ва экологик мувозанатни ` +
        `бузувчи омил сифатида ҳам намоён бўлади.`,
      { indent: true },
    ),
    p(
      `Зарарли организмларга қарши курашда механик, агротехник, биологик ва кимёвий усуллар мажмуасидан фойдаланилади. ` +
        `Интеграллашган ҳимоя тизимида кимёвий усул — ўсимликларни ҳимоя қилиш воситаларини қўллаш — ўзининг тезкорлиги, ` +
        `юқори самарадорлиги ва катта майдонларда қўллаш имконияти билан алоҳида ўрин тутади. Айни вақтда кимёвий ` +
        `воситаларни танлаб, мақбул меъёр ва муддатларда, атроф-муҳит ҳамда фойдали организмларга зарар етказмаган ҳолда ` +
        `қўллаш талаб этилади.`,
      { indent: true },
    ),
    p(
      `Ҳозирги кунда илмий асосланган, юқори биологик самарали, кам сарф меъёрида қўлланиладиган ва экологик хавфсиз ` +
        `препаратларни ишлаб чиқариш ҳамда амалиётга жорий этиш муҳим вазифа ҳисобланади. Ҳар қандай янги восита Давлат ` +
        `рўйхатига киритилишидан аввал белгиланган методикалар асосида давлат синовидан ўтказилиши, унинг биологик ` +
        `самарадорлиги, танланувчанлиги ва хавфсизлиги маҳаллий тупроқ-иқлим шароитида текширилиши шарт.`,
      { indent: true },
    ),
    p(
      `Мазкур илмий ҳисобот ${meta.preparatName} (таъсир этувчи модда – ${meta.activeIngredients}) препаратининг ` +
        `${_tl} сифатида ${meta.crop} экинида ${meta.targetOrganism}га қарши биологик самарадорлигини давлат синови ` +
        `методикаси асосида аниқлашга бағишланган. Тадқиқотнинг асосий мақсади — препаратнинг ${meta.applicationRate} ` +
        `сарф меъёридаги самарадорлигини баҳолаш, уни эталон (андоза) ${meta.referenceName} билан таққослаш, ` +
        `ҳосилдорликка таъсирини ўрганиш ва Давлат рўйхатига киритиш бўйича асосланган хулоса тайёрлашдан иборат. ` +
        `Синов ${meta.site}да, ${meta.crop} экинининг «${meta.variety || "—"}» навида ўтказилди.`,
      { indent: true },
    ),
    p(
      `Тадқиқот натижалари олинган восита бўйича амалий тавсиялар ишлаб чиқиш, ҳимоя тадбирларини илмий асослаш ва ` +
        `минтақа деҳқончилигида барқарор ҳосил етиштиришни таъминлаш нуқтаи назаридан илмий ва амалий аҳамиятга эга.`,
      { indent: true },
    ),
  );

  // === 2. АДАБИЁТЛАР ШАРҲИ (халқаро адабиётлар таҳлили) ===
  children.push(
    heading("2. Адабиётлар шарҳи"),
    p(
      `Ўсимликларни ҳимоя қилиш воситаларининг биологик самарадорлигини баҳолаш халқаро миқёсда стандартлаштирилган ` +
        `методикаларга асосланади. Европа ва Ўрта ер денгизи ўсимликларни ҳимоя қилиш ташкилоти (EPPO) нинг PP1 ` +
        `туркумидаги стандартлари, БМТнинг Озиқ-овқат ва қишлоқ хўжалиги ташкилоти (FAO) ҳамда Иқтисодий ҳамкорлик ва ` +
        `тараққиёт ташкилоти (OECD) нинг йўриқномалари синов дизайни, ҳисоб-китоб усуллари ва натижаларни талқин ` +
        `қилишда ягона ёндашувни белгилайди [1, 2].`,
      { indent: true },
    ),
    p(
      `Самарадорликни ҳисоблашда халқаро амалиётда бир қатор классик усуллар қўлланилади. Зараркунандаларга қарши ` +
        `воситалар учун Abbott (1925) ва Henderson–Tilton (1955) формулалари, шунингдек Schneider–Orelli тузатиши, ` +
        `касалликларга қарши препаратлар учун касалланиш даражаси ва ривожланиш индексига асосланган EPPO усуллари, ` +
        `бегона ўтларга қарши гербицидлар учун эса зичлик ва биомасса бўйича ҳисоблаш методлари кенг тарқалган [3, 4]. ` +
        `Ушбу усуллар турли мамлакатларда ўтказилган тадқиқотлар натижаларини қиёслаш имконини беради.`,
      { indent: true },
    ),
    p(
      `Таъсир этувчи модда ${meta.activeIngredients} ва унга ўхшаш препаратлар бўйича хорижий адабиётларда уларнинг ` +
        `таъсир механизми, мақсадли организмлар спектри ҳамда танланувчанлиги батафсил ўрганилган. Дала ва лаборатория ` +
        `тажрибаларида ушбу гуруҳ препаратлари мақсадли зарарли организмларга нисбатан юқори биологик фаоллик ` +
        `кўрсатиши, айни вақтда маданий ўсимликка нисбатан танланувчан таъсир этиши қайд этилган [5, 6, 7].`,
      { indent: true },
    ),
    p(
      `Халқаро тадқиқотларда препаратлар самарадорлиги об-ҳаво шароити, қўллаш муддати, зарарли организм ривожланиш ` +
        `фазаси ва сарф меъёрига боғлиқлиги алоҳида таъкидланади. Кўплаб муаллифлар воситани зарарли организм ` +
        `ривожланишининг дастлабки босқичларида қўллаш энг юқори самара беришини кўрсатган [8, 9]. Шунингдек, ` +
        `резистентликнинг олдини олиш мақсадида таъсир механизми турлича бўлган препаратларни навбатлаб қўллаш ` +
        `(IRAC, FRAC, HRAC тавсиялари) муҳим омил сифатида эътироф этилади [10].`,
      { indent: true },
    ),
    p(
      `Маҳаллий ва МДҲ мамлакатлари тадқиқотчилари ишларида дала тажрибаларини ташкил этиш ва статистик таҳлил ` +
        `қилишнинг Доспехов Б.А. услубияти, шунингдек Ўзбекистон Республикасининг давлат синов методикалари асос қилиб ` +
        `олинган. Ушбу ишларда халқаро ёндашувлар маҳаллий тупроқ-иқлим шароитига мослаштирилиб, минтақа учун самарали ` +
        `ҳимоя тизимлари ишлаб чиқилган [11, 12].`,
      { indent: true },
    ),
    p(
      `Атроф-муҳит ва озиқ-овқат хавфсизлиги нуқтаи назаридан халқаро миқёсда Кодекс Алиментариус (FAO/ЖССТ) томонидан ` +
        `белгиланган қолдиқ миқдорнинг рухсат этилган энг юқори даражалари (MRL) ва Жаҳон соғлиқни сақлаш ташкилотининг ` +
        `препаратлар хавфлилик таснифи муҳим мезон сифатида қаралади. Бу эса препаратларни нафақат самарадорлиги, балки ` +
        `хавфсизлиги бўйича ҳам ҳар томонлама баҳолашни тақозо этади.`,
      { indent: true },
    ),
    p(
      `Адабиётлар таҳлили шуни кўрсатадики, хорижда препаратлар бўйича етарли маълумот мавжуд бўлса-да, ҳар бир восита ` +
        `муайян мамлакатнинг тупроқ-иқлим шароити, экин навлари ва зарарли организмлар турига нисбатан маҳаллий давлат ` +
        `синовидан ўтказилиши зарур. Мазкур тадқиқот ${meta.preparatName} препаратини ${meta.site} шароитида синаб, ана ` +
        `шу илмий-амалий эҳтиёжни қондиришга қаратилган.`,
      { indent: true },
    ),
  );

  // === 3. СИНОВ БАЁНОМАСИ ===
  children.push(heading("3. Синов баёномаси"));
  children.push(
    field("3.1.", "Воситани рўйхатга олиш учун талабгор ташкилот номи, давлати", `${meta.applicantOrg || meta.manufacturer}${meta.country ? `, ${meta.country}` : ""}`),
    field("3.2.", "Рўйхатга олиш учун берилган савдо номи", meta.tradeName || meta.preparatName),
    field("3.3.", "Таъсир этувчи моддаси", meta.activeIngredients),
    field("3.4.", "Препарат шакли", meta.preparatForm),
    field("3.5.", "Қўлланиладиган зарарли организм номи", meta.targetOrganism),
    field("3.6.", "Синов ўтказиш жойи ва хўжалик номи", meta.site),
    field("3.7.", "Синов ўтказилган муддат", meta.trialDate),
    field("3.8.", "Синов ўтказилаётган экин тури, нави", `${meta.crop}${meta.variety ? `, ${meta.variety}` : ""}`),
    field("3.9.", "Зарарли организм мавжудлиги бўйича лаборатория хулосаси", meta.labConclusion || "—"),
    field("3.10.", "Андоза (эталон) восита номи, шакли, таъсир этувчи моддаси, сарф меъёри", meta.referenceFullDesc || meta.referenceName),
    field("3.11.", "Синов воситасининг сарф меъёри (ишчи эритма)", `${meta.applicationRate}${meta.workingSolution ? `; ${meta.workingSolution}` : ""}`),
    field("3.12.", "Тажриба тури", meta.experimentType || DEFAULTS.experimentType),
    field("3.13.", "Фойдаланилган жиҳоз ёки ускуна тури, маркаси", meta.testEquipment || "—"),
    field("3.14.", "Воситани қўллаш усули", meta.applicationMethod || DEFAULTS.applicationMethod),
    field("3.15.", "Синов даврида ҳаво ҳарорати, шамол тезлиги ва нисбий намлик", meta.weather),
  );

  // === 4. МЕТОДИКА ===
  children.push(
    heading("4. Синов ўтказиш жойи ва услублари (методикаси)"),
    p(
      `${meta.preparatName} препарати устида олиб борилган тажрибаларнинг биологик самарадорлиги давлат синов ` +
        `методикаси, ҳосилдорлик эса Б.А.Доспехов (1985) усулида олиб борилди. Ҳисоблаш методикаси: ` +
        `${report.efficacyMethodLabel}.`,
      { indent: true },
    ),
    p("Тажриба тизими:", { bold: true, after: 60 }),
  );
  report.efficacyRows.forEach((r, i) => {
    const label = r.isControl ? "(ишлов ўтказилмаган)" : r.isReference ? "(андоза)" : "";
    children.push(p(`${i + 1}. ${r.variant} ${label}`.trim(), { size: 22, after: 40 }));
  });

  // 1-жадвал: организмлар
  if (report.organisms && report.organisms.length) {
    children.push(p("1-жадвал", { align: AlignmentType.RIGHT, size: 20, after: 40 }));
    children.push(p(`Тажриба майдонларида учрайдиган асосий ${meta.targetOrganism.toLowerCase()}`, { bold: true, align: AlignmentType.CENTER, size: 22 }));
    const rows = [
      new TableRow({
        tableHeader: true,
        children: [
          cell("№", { bold: true, shade: "e8e8e8" }),
          cell("Организм номи", { bold: true, shade: "e8e8e8", align: AlignmentType.LEFT }),
          cell("Лотинча номи", { bold: true, shade: "e8e8e8" }),
          cell("1 м² даги сони (ишловгача)", { bold: true, shade: "e8e8e8" }),
        ],
      }),
      ...report.organisms.map(
        (o, i) =>
          new TableRow({
            children: [
              cell(String(i + 1)),
              cell(o.name, { align: AlignmentType.LEFT }),
              cell(o.latin || "—", { align: AlignmentType.LEFT }),
              cell(fmt(o.before, 1)),
            ],
          }),
      ),
    ];
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
  }

  // === 5. НАТИЖАЛАР ===
  children.push(heading("5. Тажриба (тадқиқот) натижалари"));
  children.push(p("2-жадвал", { align: AlignmentType.RIGHT, size: 20, after: 40 }));
  children.push(
    p(`${meta.preparatName} препаратининг ${meta.targetOrganism}га қарши биологик самарадорлиги, ${meta.site} шароитида`, {
      bold: true,
      align: AlignmentType.CENTER,
      size: 22,
    }),
  );

  if (report.detailed && report.detailed.periods.length) {
    children.push(buildDetailedTable(report));
  } else {
    // counts/disease учун оддийроқ жадвал (вариант × кун)
    children.push(buildEfficacyTable(report));
  }

  // График: самарадорлик
  const best = report.efficacyRows
    .filter((r) => !r.isControl && r.mean != null)
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0];
  if (best) {
    const buf = await efficacyBar(report.days, report.days.map((d) => best.byDay[d]), {
      title: `Биологик самарадорлик — ${best.variant}, %`,
    });
    children.push(await chart(buf));
    children.push(caption(`1-расм. «${best.variant}» варианти бўйича биологик самарадорлик динамикаси.`));
  }

  // Матнли таҳлил
  if (report.detailed) {
    const om = report.detailed.overallMeanRow;
    const sentences: string[] = [];
    for (const nv of nonControl) {
      const perPeriod = report.detailed.periods
        .map((p2) => `${p2.day} кундан кейин – ${fmt(p2.meanRow.byVariant[nv]?.pct, 1)}%`)
        .join(", ");
      sentences.push(`${nv} қўлланганда самарадорлик: ${perPeriod}; ўртача ${report.detailed.periods.length}-ҳисобда – ${fmt(om.byVariant[nv]?.pct, 1)}%.`);
    }
    sentences.forEach((s) => children.push(p(s, { indent: true })));
  }

  // 3-жадвал: ҳосилдорлик
  if (report.yieldRows && report.yieldRows.length) {
    children.push(p("3-жадвал", { align: AlignmentType.RIGHT, size: 20, after: 40 }));
    children.push(p(`${meta.preparatName} препаратининг ${meta.crop} ҳосилдорлигига таъсири`, { bold: true, align: AlignmentType.CENTER, size: 22 }));
    const ctrl = report.yieldRows.find((r) => r.isControl);
    const ctrlMean = ctrl?.mean ?? null;
    const rows = [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Вариант", { bold: true, shade: "e8e8e8", align: AlignmentType.LEFT }),
          cell(`Ҳосилдорлик, ${report.yieldUnit ?? "ц/га"}`, { bold: true, shade: "e8e8e8" }),
          cell(`Қўшимча ҳосил, ${report.yieldUnit ?? "ц/га"}`, { bold: true, shade: "e8e8e8" }),
        ],
      }),
      ...report.yieldRows.map((r) => {
        const extra = r.isControl || ctrlMean == null || r.mean == null ? null : r.mean - ctrlMean;
        return new TableRow({
          children: [
            cell(r.variant, { align: AlignmentType.LEFT, bold: r.isControl }),
            cell(fmt(r.mean, 1)),
            cell(r.isControl ? "—" : fmt(extra, 1)),
          ],
        });
      }),
    ];
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));

    const buf = await yieldBar(report.yieldRows.map((r) => r.variant), report.yieldRows.map((r) => r.mean ?? 0), {
      title: `Ҳосилдорлик, ${report.yieldUnit ?? "ц/га"}`,
    });
    children.push(await chart(buf));
    children.push(caption("2-расм. Вариантлар бўйича ўртача ҳосилдорлик."));
  }

  // === 6. ХУЛОСА ВА ТАВСИЯЛАР ===
  const overallBestPct = report.detailed
    ? report.detailed.overallMeanRow.byVariant[bestNonControl(report)]?.pct
    : best?.mean;
  children.push(
    heading("6. Хулоса ва тавсиялар"),
    p(
      `1. Олиб борилган тажриба натижаларига кўра ${meta.preparatName} (${meta.applicationRate}) препарати ${meta.targetOrganism}га ` +
        `қарши ${fmt(overallBestPct, 1)}% биологик самарадорлик кўрсатди.`,
      { indent: true },
    ),
    p(
      `2. Препарат мақбул меъёрда қўлланганда токсик (фитотоксик) ҳолатлар кузатилмади; ${meta.crop} ҳосили ва ҳосил ` +
        `элементларига ножўя таъсир қилмади.`,
      { indent: true },
    ),
  );
  if (report.yieldRows && report.yieldRows.length) {
    const ctrl = report.yieldRows.find((r) => r.isControl);
    const treated = report.yieldRows.find((r) => !r.isControl && r.increaseVsControlPct != null);
    if (ctrl?.mean != null && treated?.mean != null) {
      children.push(
        p(
          `3. Зарарли организм камайиши ҳисобига назоратга нисбатан қўшимча ${fmt(treated.mean - ctrl.mean, 1)} ` +
            `${report.yieldUnit ?? "ц/га"} ҳосил олинди.`,
          { indent: true },
        ),
      );
    }
  }
  children.push(
    p(
      `4. Тажриба натижаларидан келиб чиққан ҳолда ${meta.preparatName} (${meta.applicationRate}) препаратини ` +
        `Давлат рўйхатига киритиш тавсия этилади.`,
      { indent: true },
    ),
  );

  // === 7. АДАБИЁТЛАР ===
  children.push(heading("7. Фойдаланилган адабиётлар рўйхати"));
  const refs = (meta.references || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (refs.length) {
    refs.forEach((r, i) => children.push(p(/^\d/.test(r) ? r : `${i + 1}. ${r}`, { size: 22, after: 40 })));
  } else {
    [
      "Доспехов Б.А. Методика полевого опыта. – Москва, 1985.",
      "Методические указания по государственным испытаниям гербицидов на посевах сельскохозяйственных культур. – Ташкент, 2007.",
      "EPPO Standards PP1 — Efficacy evaluation of plant protection products.",
    ].forEach((r, i) => children.push(p(`${i + 1}. ${r}`, { size: 22, after: 40 })));
  }

  // === 8. РЎЙХАТГА КИРИТИШ ХУЛОСАСИ ===
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(p("Ўтказилган давлат синовлари якуни бўйича хулоса ва тавсиялар", { bold: true, align: AlignmentType.CENTER, size: 24, after: 140 }));
  children.push(
    p(`Ўсимликларни ҳимоя қилиш воситаси савдо номи – ${meta.tradeName || meta.preparatName} (${meta.applicationRate})`, { size: 22 }),
    p(`Таъсир этувчи моддаси – ${meta.activeIngredients}`, { size: 22 }),
    p(`Талабгор ташкилот – ${meta.applicantOrg || meta.manufacturer}${meta.country ? `, ${meta.country}` : ""}`, { size: 22 }),
    p(`Синовни ўтказган ташкилот – ${institute}`, { size: 22 }),
    p(`Синов жойи ва муддати – ${meta.site}, ${meta.trialDate}`, { size: 22, after: 140 }),
  );
  {
    const rows = [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Зарарли организм", { bold: true, shade: "e8e8e8" }),
          cell("Сарф меъёри, л/га", { bold: true, shade: "e8e8e8" }),
          cell("Биологик самарадорлик, %", { bold: true, shade: "e8e8e8" }),
          cell("Қўллаш усули", { bold: true, shade: "e8e8e8" }),
          cell("Макс. ишлов сони", { bold: true, shade: "e8e8e8" }),
          cell("Кутиш вақти, кун", { bold: true, shade: "e8e8e8" }),
          cell("Фитотоксик хусусияти", { bold: true, shade: "e8e8e8" }),
        ],
      }),
      new TableRow({
        children: [
          cell(meta.targetOrganism, { align: AlignmentType.LEFT }),
          cell(meta.applicationRate),
          cell(fmt(overallBestPct, 1)),
          cell(meta.applicationMethod || DEFAULTS.applicationMethod),
          cell(meta.maxTreatments || DEFAULTS.maxTreatments),
          cell(meta.waitingPeriod || DEFAULTS.waitingPeriod),
          cell(meta.phytotoxicity || DEFAULTS.phytotoxicity),
        ],
      }),
    ];
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
  }
  children.push(
    p(
      `Тавсия: ${meta.preparatName} ${meta.applicationRate} сарф-меъёрда ${meta.targetOrganism}га қарши қўллаш учун ` +
        `«Рўйхат»га киритиш тавсия этилади.`,
      { after: 200, indent: true },
    ),
  );

  // === ДАЛОЛАТНОМА ===
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(
    p("ЎСИМЛИКЛАРНИ ҲИМОЯ ҚИЛИШ ВОСИТАСИНИНГ СИНОВ НАТИЖАЛАРИ БЎЙИЧА", { bold: true, align: AlignmentType.CENTER, size: 24 }),
    p("ДАЛОЛАТНОМА", { bold: true, align: AlignmentType.CENTER, size: 26, after: 160 }),
    p(`Сана: ${meta.actDate || meta.trialDate}`, { size: 22 }),
    p(`Препарат номи ва шакли: ${meta.preparatName}, ${meta.preparatForm} (${meta.activeIngredients})`, { size: 22 }),
    p(`Синов ўтказилган экин тури: ${meta.crop}${meta.variety ? `, ${meta.variety}` : ""}`, { size: 22 }),
    p(`Зарарли организм тури: ${meta.targetOrganism}`, { size: 22 }),
    p(`Препаратнинг сарф меъёри ва ишчи эритма: ${meta.applicationRate}${meta.workingSolution ? `; ${meta.workingSolution}` : ""}`, { size: 22 }),
    p(`Қўллаш усули ва жиҳоз: ${meta.applicationMethod || DEFAULTS.applicationMethod}${meta.testEquipment ? `, ${meta.testEquipment}` : ""}`, { size: 22 }),
    p(`Экиннинг агротехник ҳолати, ривожланиш фазаси: ${meta.cropPhase || "—"}`, { size: 22 }),
    p(`Препаратнинг биологик самарадорлиги (%): ${fmt(overallBestPct, 1)}%`, { size: 22 }),
    p(`Хулосалар, камчиликлар ва тавсиялар: ${meta.phytotoxicity && meta.phytotoxicity !== DEFAULTS.phytotoxicity ? meta.phytotoxicity : "камчиликлар кузатилмади"}`, { size: 22, after: 200 }),
    p("Далолатномани тузувчилар (Ф.И.Ш., имзоси):", { bold: true, after: 100 }),
  );
  (meta.staff || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => children.push(p(`${s}   ___________________`, { size: 22, after: 80 })));

  const doc = new Document({
    creator: institute,
    title: `${meta.preparatName} — давлат синови ҳисоботи`,
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1417, right: 850 } } },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// --- ёрдамчилар ---

function bestNonControl(report: ComputedReport): string {
  const d = report.detailed;
  if (!d) return "";
  let best = d.nonControlVariants[0] ?? "";
  let bestPct = -Infinity;
  for (const nv of d.nonControlVariants) {
    const pct = d.overallMeanRow.byVariant[nv]?.pct ?? -Infinity;
    if (pct > bestPct) {
      bestPct = pct;
      best = nv;
    }
  }
  return best;
}

/** Батафсил натижалар жадвали (организм × давр, ишловгача/назорат/вариантлар дона+%). */
function buildDetailedTable(report: ComputedReport): Table {
  const d = report.detailed!;
  const nv = d.nonControlVariants;
  const totalCols = 3 + nv.length * 2;

  const rows: TableRow[] = [];

  // Сарлавҳа — 2 қатор
  rows.push(
    new TableRow({
      tableHeader: true,
      children: [
        cell("Организм", { bold: true, shade: "e8e8e8", rowSpan: 2, align: AlignmentType.LEFT }),
        cell("Ишловгача, 1 м²", { bold: true, shade: "e8e8e8", rowSpan: 2 }),
        cell("Назорат, 1 м²", { bold: true, shade: "e8e8e8", rowSpan: 2 }),
        ...nv.map((name) => cell(name, { bold: true, shade: "e8e8e8", colSpan: 2 })),
      ],
    }),
    new TableRow({
      tableHeader: true,
      children: nv.flatMap(() => [
        cell(d.unit, { bold: true, shade: "f0f0f0" }),
        cell("%", { bold: true, shade: "f0f0f0" }),
      ]),
    }),
  );

  const rowFor = (r: DetailRow, bold = false): TableRow =>
    new TableRow({
      children: [
        cell(r.organism, { align: AlignmentType.LEFT, bold }),
        cell(fmt(r.before, 1), { bold }),
        cell(fmt(r.control, 1), { bold }),
        ...nv.flatMap((name) => [
          cell(fmt(r.byVariant[name]?.density, 1), { bold }),
          cell(fmt(r.byVariant[name]?.pct, 1), { bold }),
        ]),
      ],
    });

  for (const per of d.periods) {
    rows.push(
      new TableRow({
        children: [cell(`${per.day} кундан кейин`, { bold: true, shade: "f7f7f7", colSpan: totalCols, align: AlignmentType.LEFT })],
      }),
    );
    for (const r of per.rows) rows.push(rowFor(r));
    rows.push(rowFor(per.meanRow, true));
  }
  rows.push(rowFor(d.overallMeanRow, true));

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

/** Оддий самарадорлик жадвали (вариант × кун) — counts/disease учун. */
function buildEfficacyTable(report: ComputedReport): Table {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell("Вариант", { bold: true, shade: "e8e8e8", align: AlignmentType.LEFT }),
        ...report.days.map((dd) => cell(`${dd}-кун, %`, { bold: true, shade: "e8e8e8" })),
        cell("Ўртача, %", { bold: true, shade: "e8e8e8" }),
      ],
    }),
    ...report.efficacyRows.map(
      (r) =>
        new TableRow({
          children: [
            cell(r.variant + (r.isReference ? " (андоза)" : ""), { align: AlignmentType.LEFT, bold: r.isControl }),
            ...report.days.map((dd) => cell(r.isControl ? "—" : fmt(r.byDay[dd], 1))),
            cell(r.isControl ? "—" : fmt(r.mean, 1), { bold: true }),
          ],
        }),
    ),
  ];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}
