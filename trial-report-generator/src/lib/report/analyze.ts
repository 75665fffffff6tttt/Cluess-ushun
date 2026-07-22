/**
 * Юкланган .docx шаблонни таҳлил қилиш — расмий тузилишни (сарлавҳалар,
 * жадваллар сони, параграфлар) аниқлаш учун.
 *
 * Бу маълумот генерацияланадиган ҳисоботни фойдаланувчи намунасига
 * мослаштиришда йўналтирувчи сифатида ишлатилади.
 */

import PizZip from "pizzip";

export interface TemplateAnalysis {
  paragraphCount: number;
  tableCount: number;
  headings: string[]; // эҳтимолий сарлавҳалар (қисқа, ярим қалин сатрлар)
  detectedSections: string[]; // маълум бўлимлар билан мослик
  sampleParagraphs: string[];
}

const KNOWN_SECTIONS = [
  "титул", "тасдиқ", "мундарижа", "кириш", "адабиёт", "баёнома", "шароит",
  "методика", "натижа", "самарадорлик", "ҳосилдорлик", "муҳокама", "хулоса",
  "тавсия", "рўйхат", "далолатнома",
];

function extractTexts(xml: string): string[] {
  const runs = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
  // параграфлар бўйича гуруҳлаш: <w:p> чегаралари
  const paras: string[] = [];
  const pBlocks = xml.split(/<w:p[ >]/).slice(1);
  for (const block of pBlocks) {
    const t = [...block.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
    if (t.trim()) paras.push(t.trim());
  }
  return paras.length ? paras : runs;
}

export function analyzeTemplate(buffer: Buffer): TemplateAnalysis {
  const zip = new PizZip(buffer);
  const file = zip.file("word/document.xml");
  if (!file) {
    throw new Error("Бу .docx файлда word/document.xml топилмади — файл шикастланган бўлиши мумкин.");
  }
  const xml = file.asText();
  const paragraphs = extractTexts(xml);
  const tableCount = (xml.match(/<w:tbl>/g) || []).length;

  const headings = paragraphs.filter(
    (t) => t.length > 0 && t.length < 80 && /[А-Яа-яЎўҚқҒғҲҳ]/.test(t),
  );

  const lowerAll = paragraphs.join(" ").toLowerCase();
  const detectedSections = KNOWN_SECTIONS.filter((s) => lowerAll.includes(s));

  return {
    paragraphCount: paragraphs.length,
    tableCount,
    headings: headings.slice(0, 40),
    detectedSections,
    sampleParagraphs: paragraphs.slice(0, 15),
  };
}
