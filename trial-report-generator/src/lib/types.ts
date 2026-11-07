/**
 * Ҳисобот генератори учун умумий маълумот модели.
 *
 * Муҳим: `assessment` ва `yield` — фойдаланувчи КИРИТГАН дала ўлчовлари.
 * Тизим улардан фақат самарадорлик ва статистикани ҲИСОБЛАЙДИ, ўлчов
 * қийматларини ўзи ўйлаб чиқармайди.
 */

import type { PesticideType } from "./calc/detect";

/** Титул ва тавсиф маълумотлари (фойдаланувчи киритади). */
export interface ReportMeta {
  preparatName: string; // Препарат номи
  activeIngredients: string; // Таъсир этувчи модда(лар)
  preparatForm: string; // Препарат шакли
  manufacturer: string; // Ишлаб чиқарувчи фирма
  country: string; // Давлат
  crop: string; // Экин тури
  variety: string; // Нави
  targetOrganism: string; // Зарарли организм
  applicationRate: string; // Сарф меъёри
  referenceName: string; // Эталон препарат
  workingSolution: string; // Ишчи эритма меъёри
  site: string; // Синов жойи
  trialDate: string; // Синов санаси
  laboratory: string; // Лаборатория
  staff: string; // Илмий ходимлар
  weather: string; // Ҳаво ҳарорати / об-ҳаво

  // --- Расмий реквизитлар (ихтиёрий, default билан) ---
  committee?: string; // юқори қўмита номи
  institute?: string; // илмий-тадқиқот институти
  director?: string; // институт директори (ТАСДИҚЛАЙМАН)
  directorDeputy?: string; // директор ўринбосари
  responsiblePerson?: string; // масъул ижрочи
  scientificSecretary?: string; // илмий котиб
  protocolNumber?: string; // кенгаш баённомаси №
  applicantOrg?: string; // рўйхатга талабгор ташкилот
  tradeName?: string; // савдо номи
  testEquipment?: string; // жиҳоз/ускуна
  applicationMethod?: string; // қўллаш усули (default: пуркаш)
  experimentType?: string; // тажриба тури (кичик/катта дала)
  labConclusion?: string; // 3.9 лаборатория хулосаси
  referenceFullDesc?: string; // 3.10 эталон тўлиқ тавсифи
  maxTreatments?: string; // рухсат этилган максимал ишлов сони
  waitingPeriod?: string; // кутиш вақти (кун)
  phytotoxicity?: string; // фитотоксик хусусияти
  references?: string; // фойдаланилган адабиётлар (сатрма-сатр)
  actDate?: string; // далолатнома санаси
  cropPhase?: string; // экин ривожланиш фазаси
}

/** Тажриба варианти. */
export interface Variant {
  name: string;
  isControl?: boolean; // назорат (ишловсиз)
  isReference?: boolean; // эталон
  rate?: string; // шу вариант учун сарф меъёри
}

/** Инсектицид/акарицид/нематицид/родентицид/биопрепарат — зараркунанда сони. */
export interface CountData {
  before: number | null; // ишловгача сони
  byDay: Record<number, number>; // {кун: ишловдан кейинги сони}
}

/** Фунгицид — касаллик кўрсаткичлари. */
export interface DiseaseData {
  byDayIndex: Record<number, number>; // {кун: касаллик ривожланиш индекси, %}
  byDayIncidence?: Record<number, number>; // {кун: касаллик тарқалиши, %}
}

/** Гербицид — бегона ўтлар зичлиги. */
export interface WeedData {
  species: string[]; // бегона ўт турлари
  // {вариант: {тур: {кун: зичлик дона/м²}}}
  density: Record<string, Record<string, Record<number, number>>>;
  before?: Record<string, number>; // {тур: ишлов бергунга қадар зичлик дона/м²}
  speciesLatin?: Record<string, string>; // {тур: лотинча ном}
}

export interface Assessment {
  days: number[]; // кузатиш кунлари
  counts?: Record<string, CountData>; // {вариант: сони}
  disease?: Record<string, DiseaseData>; // {вариант: касаллик}
  weeds?: WeedData;
}

export interface ReportInput {
  meta: ReportMeta;
  explicitType?: string; // фойдаланувчи қўлбола танлаган тур (ихтиёрий)
  variants: Variant[];
  assessment: Assessment;
  yieldData?: Record<string, number[]>; // {вариант: [повторностлар бўйича ҳосил]}
  yieldUnit?: string; // масалан "ц/га"
}

// ---------------------------------------------------------------------------
// Ҳисобланган натижа
// ---------------------------------------------------------------------------

export interface EfficacyRow {
  variant: string;
  isControl: boolean;
  isReference: boolean;
  byDay: Record<number, number | null>; // {кун: биологик самарадорлик %}
  mean: number | null;
}

export interface CountRow {
  variant: string;
  isControl: boolean;
  before: number | null;
  byDay: Record<number, number | null>;
}

export interface YieldRow {
  variant: string;
  isControl: boolean;
  mean: number | null;
  reps: number[];
  increaseVsControlPct: number | null;
}

/** Битта вариант учун (дона/зичлик + самарадорлик %). */
export interface DetailVariantCell {
  density: number | null; // дона/м² ёки дона
  pct: number | null; // биологик самарадорлик %
}

/** Битта организм (бегона ўт тури) бўйича бир кундаги қатор. */
export interface DetailRow {
  organism: string;
  organismLatin?: string;
  before: number | null; // ишлов бергунга қадар
  control: number | null; // назорат (гербицидсиз)
  byVariant: Record<string, DetailVariantCell>; // ноназорат вариантлар
}

/** Бир баҳолаш даври (масалан 15 кундан кейин). */
export interface DetailPeriod {
  day: number;
  rows: DetailRow[];
  meanRow: DetailRow; // ўртача
}

/** Батафсил натижалар жадвали (шаблонга мос). */
export interface DetailedResults {
  unit: string; // "дона/м²" ёки "дона"
  nonControlVariants: string[]; // ноназорат вариантлар (эталон, тажриба, ...)
  controlVariant: string | null;
  periods: DetailPeriod[];
  overallMeanRow: DetailRow; // ўртача N-ҳисоб
}

export interface ComputedReport {
  typeKey: PesticideType;
  typeNameUz: string;
  detection: {
    confidence: "high" | "none";
    matchedIngredient: string | null;
    needsConfirmation: boolean;
  };
  days: number[];
  controlVariant: string | null;

  // Хом сонлар (кўрсатиш учун)
  countRows?: CountRow[];

  // Асосий чиқиш: самарадорлик жадвали
  efficacyRows: EfficacyRow[];
  efficacyMethodLabel: string; // масалан "Henderson–Tilton (1955)"

  // Батафсил жадвал (организм × давр) — шаблонга мос расмий кўриниш
  detailed?: DetailedResults;

  // организмлар рўйхати (1-жадвал учун): {ном, лотинча, ишловгача зичлик}
  organisms?: { name: string; latin?: string; before: number | null }[];

  // Ҳосилдорлик
  yieldRows?: YieldRow[];
  yieldUnit?: string;
  yieldAnova?: import("./calc/statistics").AnovaResult | null;

  warnings: string[];
}
