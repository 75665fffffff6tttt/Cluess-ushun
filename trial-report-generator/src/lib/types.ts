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

  // Ҳосилдорлик
  yieldRows?: YieldRow[];
  yieldUnit?: string;
  yieldAnova?: import("./calc/statistics").AnovaResult | null;

  warnings: string[];
}
