/**
 * Дала тажрибаси статистик таҳлили — дисперсион таҳлил (ANOVA).
 *
 * Тасодифий блокли (randomized complete block, повторностли) тажриба схемаси
 * учун Доспехов Б.А. "Методика полевого опыта" услубиятига мувофиқ:
 *   - Вариантлар ва повторностлар бўйича квадратлар йиғиндиси
 *   - НСР₀.₀₅ (LSD0.05), Sx (ўртача хатоси), Sd (айирма хатоси)
 *   - CV% (вариация коэффициенти), тажриба аниқлиги P%
 *   - F-мезон ва P-value
 *
 * Барча ҳисоблар фойдаланувчи КИРИТГАН такрорий ўлчовлардан бажарилади.
 */

import { jStat } from "jstat";

export interface AnovaResult {
  nVariants: number;
  nReps: number;
  nTotal: number;
  grandMean: number;
  ssTotal: number;
  ssTreatment: number;
  ssReplication: number;
  ssError: number;
  dfTreatment: number;
  dfReplication: number;
  dfError: number;
  msTreatment: number;
  msError: number;
  fValue: number;
  pValue: number;
  lsd05: number; // НСР₀.₀₅
  seMean: number; // Sx
  seDiff: number; // Sd
  cvPct: number;
  precisionPct: number; // P%
  variantMeans: Record<string, number>;
  significant: boolean;
}

function round(v: number, n = 2): number {
  const f = Math.pow(10, n);
  return Math.round(v * f) / f;
}

/**
 * Тасодифий блокли тажриба дисперсион таҳлили.
 * data: {вариант: [повторност1, повторност2, ...]} — такрорлар сони бир хил бўлиши шарт.
 */
export function anovaRcbd(data: Record<string, number[]>, alpha = 0.05): AnovaResult {
  const variants = Object.keys(data);
  const nVariants = variants.length;
  if (nVariants < 2) throw new Error("Камида 2 та вариант керак.");

  const repLengths = new Set(variants.map((v) => data[v].length));
  if (repLengths.size !== 1) {
    throw new Error("Ҳар бир вариантда такрорлар сони бир хил бўлиши керак.");
  }
  const nReps = repLengths.values().next().value as number;
  if (nReps < 2) throw new Error("Камида 2 та такрор (повторност) керак.");

  const matrix = variants.map((v) => data[v]); // [variant][rep]
  const nTotal = nVariants * nReps;
  const allValues = matrix.flat();
  const grandMean = allValues.reduce((a, b) => a + b, 0) / nTotal;

  const variantMeans = matrix.map((row) => row.reduce((a, b) => a + b, 0) / nReps);
  const repMeans: number[] = [];
  for (let j = 0; j < nReps; j++) {
    let s = 0;
    for (let i = 0; i < nVariants; i++) s += matrix[i][j];
    repMeans.push(s / nVariants);
  }

  const ssTotal = allValues.reduce((acc, x) => acc + (x - grandMean) ** 2, 0);
  const ssTreatment =
    nReps * variantMeans.reduce((acc, m) => acc + (m - grandMean) ** 2, 0);
  const ssReplication =
    nVariants * repMeans.reduce((acc, m) => acc + (m - grandMean) ** 2, 0);
  const ssError = ssTotal - ssTreatment - ssReplication;

  const dfTreatment = nVariants - 1;
  const dfReplication = nReps - 1;
  const dfError = dfTreatment * dfReplication;

  const msTreatment = dfTreatment ? ssTreatment / dfTreatment : 0;
  const msError = dfError ? ssError / dfError : 0;

  let fValue: number;
  let pValue: number;
  if (msError > 0) {
    fValue = msTreatment / msError;
    pValue = 1 - jStat.centralF.cdf(fValue, dfTreatment, dfError);
  } else {
    fValue = Infinity;
    pValue = 0;
  }

  const seMean = msError > 0 ? Math.sqrt(msError / nReps) : 0;
  const seDiff = msError > 0 ? Math.sqrt((2 * msError) / nReps) : 0;
  const tCrit = dfError ? jStat.studentt.inv(1 - alpha / 2, dfError) : 0;
  const lsd05 = tCrit * seDiff;
  const cvPct = grandMean ? (Math.sqrt(msError) / grandMean) * 100 : 0;
  const precisionPct = grandMean ? (seMean / grandMean) * 100 : 0;

  const variantMeansObj: Record<string, number> = {};
  variants.forEach((v, i) => (variantMeansObj[v] = round(variantMeans[i], 3)));

  return {
    nVariants,
    nReps,
    nTotal,
    grandMean: round(grandMean, 3),
    ssTotal: round(ssTotal, 3),
    ssTreatment: round(ssTreatment, 3),
    ssReplication: round(ssReplication, 3),
    ssError: round(ssError, 3),
    dfTreatment,
    dfReplication,
    dfError,
    msTreatment: round(msTreatment, 3),
    msError: round(msError, 3),
    fValue: Number.isFinite(fValue) ? round(fValue, 3) : fValue,
    pValue: round(pValue, 4),
    lsd05: round(lsd05, 2),
    seMean: round(seMean, 3),
    seDiff: round(seDiff, 3),
    cvPct: round(cvPct, 2),
    precisionPct: round(precisionPct, 2),
    variantMeans: variantMeansObj,
    significant: pValue < alpha,
  };
}

export interface Descriptive {
  mean: number | null;
  sd: number | null;
  se: number | null;
  cvPct: number | null;
  n: number;
}

/** Оддий тавсифий статистика: ўртача, SD, SE, CV%. */
export function descriptive(values: (number | null)[]): Descriptive {
  const arr = values.filter((v): v is number => v != null);
  const n = arr.length;
  if (n === 0) return { mean: null, sd: null, se: null, cvPct: null, n: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const sd =
    n > 1 ? Math.sqrt(arr.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (n - 1)) : 0;
  const se = n > 1 ? sd / Math.sqrt(n) : 0;
  const cv = mean ? (sd / mean) * 100 : 0;
  return { mean: round(mean, 3), sd: round(sd, 3), se: round(se, 3), cvPct: round(cv, 2), n };
}

export interface PairComparison {
  a: string;
  b: string;
  diff: number;
  significant: boolean;
}

/** Вариантлар ўртачаларини НСР₀.₀₅ бўйича жуфт-жуфт таққослайди. */
export function significantPairs(result: AnovaResult): PairComparison[] {
  const items = Object.entries(result.variantMeans);
  const pairs: PairComparison[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const [a, ma] = items[i];
      const [b, mb] = items[j];
      const diff = Math.abs(ma - mb);
      pairs.push({ a, b, diff: round(diff, 2), significant: diff >= result.lsd05 });
    }
  }
  return pairs;
}
