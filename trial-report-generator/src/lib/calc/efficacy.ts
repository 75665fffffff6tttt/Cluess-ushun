/**
 * Биологик самарадорлик ҳисоблаш модули.
 *
 * БАРЧА функциялар фойдаланувчи КИРИТГАН дала ўлчов маълумотларидан натижа
 * ҳисоблайди. Ҳеч қандай ўлчов қиймати "ўйлаб чиқарилмайди" — модул фақат
 * стандарт формулалар бўйича ҳисоб-китоб қилади.
 *
 * Манбалар:
 *   - Abbott W.S. (1925) A method of computing the effectiveness of an insecticide.
 *   - Henderson C.F., Tilton E.W. (1955) Tests with acaricides against the brown wheat mite.
 *   - Доспехов Б.А. Методика полевого опыта.
 *   - EPPO PP1 стандартлари.
 */

export function safeDiv(numerator: number, denominator: number): number | null {
  if (denominator === 0 || denominator === null || denominator === undefined) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  return numerator / denominator;
}

export function roundOrNull(value: number | null, ndigits = 2): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const f = Math.pow(10, ndigits);
  return Math.round(value * f) / f;
}

// ---------------------------------------------------------------------------
// Инсектицид / акарицид — зараркунанда сони бўйича
// ---------------------------------------------------------------------------

/**
 * Abbott (1925) формуласи.
 *   E% = ((C - T) / C) * 100
 *   C = назоратда даволашдан кейинги сони, T = тажрибада даволашдан кейинги сони.
 */
export function abbottEfficacy(controlAfter: number, treatedAfter: number): number | null {
  const reduction = safeDiv(controlAfter - treatedAfter, controlAfter);
  return reduction === null ? null : reduction * 100;
}

/**
 * Henderson–Tilton (1955) формуласи — даволашгача сонлар тенг бўлмаган ҳолларда.
 *   E% = (1 - (Ta/Tb) * (Cb/Ca)) * 100
 */
export function hendersonTiltonEfficacy(
  controlBefore: number,
  controlAfter: number,
  treatedBefore: number,
  treatedAfter: number,
): number | null {
  const taTb = safeDiv(treatedAfter, treatedBefore);
  const cbCa = safeDiv(controlBefore, controlAfter);
  if (taTb === null || cbCa === null) return null;
  return (1 - taTb * cbCa) * 100;
}

/**
 * Техник самарадорлик — популяция камайиши (назоратсиз).
 *   PR% = ((before - after) / before) * 100
 */
export function populationReduction(before: number, after: number): number | null {
  const reduction = safeDiv(before - after, before);
  return reduction === null ? null : reduction * 100;
}

// ---------------------------------------------------------------------------
// Фунгицид — касаллик кўрсаткичлари
// ---------------------------------------------------------------------------

/** Касаллик тарқалиши, P% = (касалланган / текширилган жами) * 100 */
export function diseaseIncidence(diseasedPlants: number, totalPlants: number): number | null {
  const ratio = safeDiv(diseasedPlants, totalPlants);
  return ratio === null ? null : ratio * 100;
}

/**
 * Касаллик ривожланиш индекси, R% = Σ(a*b) / (N*K) * 100
 *   classCounts: {бал: ўсимликлар_сони}, N = жами, K = энг юқори бал.
 */
export function diseaseDevelopmentIndex(
  classCounts: Record<number, number>,
  totalPlants: number,
  maxClassScore: number,
): number | null {
  if (!totalPlants || !maxClassScore) return null;
  let weighted = 0;
  for (const [score, count] of Object.entries(classCounts)) {
    weighted += Number(score) * count;
  }
  const ratio = safeDiv(weighted, totalPlants * maxClassScore);
  return ratio === null ? null : ratio * 100;
}

/** Фунгицид биологик самарадорлиги — ривожланиш индекси бўйича. */
export function diseaseBiologicalEfficacy(
  controlIndex: number,
  treatedIndex: number,
): number | null {
  const reduction = safeDiv(controlIndex - treatedIndex, controlIndex);
  return reduction === null ? null : reduction * 100;
}

// ---------------------------------------------------------------------------
// Гербицид — бегона ўтлар
// ---------------------------------------------------------------------------

/** Гербицид биологик самарадорлиги — бегона ўтлар зичлиги (дона/м² ёки г/м²). */
export function weedBiologicalEfficacy(
  controlDensity: number,
  treatedDensity: number,
): number | null {
  const reduction = safeDiv(controlDensity - treatedDensity, controlDensity);
  return reduction === null ? null : reduction * 100;
}

// ---------------------------------------------------------------------------
// Ҳосилдорлик ва иқтисодий самарадорлик
// ---------------------------------------------------------------------------

/** Ҳосил қўшимчаси, YI% = ((Y_treated - Y_control) / Y_control) * 100 */
export function yieldIncrease(treatedYield: number, controlYield: number): number | null {
  const inc = safeDiv(treatedYield - controlYield, controlYield);
  return inc === null ? null : inc * 100;
}

export interface EconomicResult {
  grossIncome: number | null;
  netProfit: number | null;
  profitabilityPct: number | null;
}

export function economicEfficiency(
  yieldGainPerHa: number | null,
  productPricePerUnit: number | null,
  treatmentCostPerHa: number | null,
): EconomicResult {
  let gross: number | null = null;
  if (yieldGainPerHa != null && productPricePerUnit != null) {
    gross = yieldGainPerHa * productPricePerUnit;
  }
  let net: number | null = null;
  if (gross != null && treatmentCostPerHa != null) {
    net = gross - treatmentCostPerHa;
  }
  let profitability: number | null = null;
  if (net != null && treatmentCostPerHa) {
    profitability = (net / treatmentCostPerHa) * 100;
  }
  return {
    grossIncome: roundOrNull(gross),
    netProfit: roundOrNull(net),
    profitabilityPct: roundOrNull(profitability),
  };
}

// ---------------------------------------------------------------------------
// Юқори даражали структурали ҳисоб — баҳолаш кунлари бўйича
// ---------------------------------------------------------------------------

export type EfficacyMethod = "abbott" | "henderson_tilton" | "population" | "weed" | "disease";

export interface AssessmentResult {
  day: number;
  treatedAfter: number | null;
  controlAfter: number | null;
  efficacyPct: number | null;
  method: EfficacyMethod;
}

export interface EfficacySeries {
  method: EfficacyMethod;
  results: AssessmentResult[];
  meanEfficacy: number | null;
}

function mean(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return roundOrNull(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * Инсектицид/акарицид учун баҳолаш кунлари бўйича самарадорлик қатори.
 */
export function insecticideSeries(params: {
  controlBefore: number;
  treatedBefore: number;
  controlAfterByDay: Record<number, number>;
  treatedAfterByDay: Record<number, number>;
  method?: "abbott" | "henderson_tilton";
}): EfficacySeries {
  const method = params.method ?? "henderson_tilton";
  const days = Array.from(
    new Set([
      ...Object.keys(params.controlAfterByDay).map(Number),
      ...Object.keys(params.treatedAfterByDay).map(Number),
    ]),
  ).sort((a, b) => a - b);

  const results: AssessmentResult[] = days.map((day) => {
    const cAfter = params.controlAfterByDay[day];
    const tAfter = params.treatedAfterByDay[day];
    let eff: number | null = null;
    if (method === "abbott") {
      if (cAfter != null && tAfter != null) eff = abbottEfficacy(cAfter, tAfter);
    } else {
      if ([params.controlBefore, cAfter, params.treatedBefore, tAfter].every((v) => v != null)) {
        eff = hendersonTiltonEfficacy(params.controlBefore, cAfter, params.treatedBefore, tAfter);
      }
    }
    return {
      day,
      treatedAfter: tAfter ?? null,
      controlAfter: cAfter ?? null,
      efficacyPct: roundOrNull(eff),
      method,
    };
  });

  return { method, results, meanEfficacy: mean(results.map((r) => r.efficacyPct)) };
}
