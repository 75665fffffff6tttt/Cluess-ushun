/**
 * Ҳисоблаш оркестратори: ReportInput -> ComputedReport.
 *
 * Препарат турига қараб мос методикани танлайди:
 *   - Инсектицид/акарицид/биопрепарат: Henderson–Tilton (before мавжуд бўлса) ёки Abbott.
 *   - Фунгицид: касаллик ривожланиш индекси бўйича биологик самарадорлик.
 *   - Гербицид: бегона ўтлар зичлиги бўйича биологик самарадорлик.
 *
 * Барча самарадорлик қийматлари фойдаланувчи КИРИТГАН сонлардан ҳисобланади.
 */

import {
  abbottEfficacy,
  hendersonTiltonEfficacy,
  diseaseBiologicalEfficacy,
  weedBiologicalEfficacy,
  yieldIncrease,
  roundOrNull,
} from "./calc/efficacy";
import { anovaRcbd, type AnovaResult } from "./calc/statistics";
import { detectType } from "./calc/detect";
import type {
  ReportInput,
  ComputedReport,
  EfficacyRow,
  CountRow,
  YieldRow,
  DetailedResults,
  DetailRow,
  DetailPeriod,
} from "./types";

const METHOD_LABELS: Record<string, string> = {
  henderson_tilton: "Henderson–Tilton (1955)",
  abbott: "Abbott (1925)",
  disease: "Касаллик ривожланиш индекси бўйича (EPPO / давлат методикаси)",
  weed: "Бегона ўтлар зичлиги бўйича (давлат гербицид синов методикаси)",
  population: "Популяция камайиши бўйича",
  defoliation: "Барг тўкилиши / қуриш даражаси бўйича",
};

function mean(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return roundOrNull(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function findControl(input: ReportInput): string | null {
  const flagged = input.variants.find((v) => v.isControl);
  if (flagged) return flagged.name;
  const byName = input.variants.find((v) =>
    /назорат|контрол|control|ишловсиз/i.test(v.name),
  );
  return byName ? byName.name : null;
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  return roundOrNull(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** Бегона ўтлар учун батафсил жадвал (тур × давр). */
function buildWeedDetail(
  input: ReportInput,
  control: string | null,
  days: number[],
): DetailedResults | undefined {
  const weeds = input.assessment.weeds;
  if (!weeds) return undefined;
  const species = weeds.species.filter((s) => s.trim());
  // ноназорат вариантлар: аввал эталон, кейин қолгани
  const nonControl = input.variants
    .filter((v) => !(v.isControl || v.name === control))
    .sort((a, b) => Number(!!b.isReference) - Number(!!a.isReference))
    .map((v) => v.name);

  const dens = (variant: string, sp: string, day: number): number | null =>
    weeds.density[variant]?.[sp]?.[day] ?? null;

  const periods: DetailPeriod[] = days.map((day) => {
    const rows: DetailRow[] = species.map((sp) => {
      const controlD = control ? dens(control, sp, day) : null;
      const byVariant: DetailRow["byVariant"] = {};
      for (const nv of nonControl) {
        const d = dens(nv, sp, day);
        byVariant[nv] = {
          density: d,
          pct: controlD != null && d != null ? roundOrNull(weedBiologicalEfficacy(controlD, d)) : null,
        };
      }
      return {
        organism: sp,
        organismLatin: weeds.speciesLatin?.[sp],
        before: weeds.before?.[sp] ?? null,
        control: controlD,
        byVariant,
      };
    });
    // ўртача қатор
    const meanRow: DetailRow = {
      organism: "ўртача",
      before: avg(rows.map((r) => r.before)),
      control: avg(rows.map((r) => r.control)),
      byVariant: Object.fromEntries(
        nonControl.map((nv) => [
          nv,
          {
            density: avg(rows.map((r) => r.byVariant[nv]?.density ?? null)),
            pct: avg(rows.map((r) => r.byVariant[nv]?.pct ?? null)),
          },
        ]),
      ),
    };
    return { day, rows, meanRow };
  });

  const overallMeanRow: DetailRow = {
    organism: `ўртача ${periods.length}-ҳисоб`,
    before: avg(periods.map((p) => p.meanRow.before)),
    control: avg(periods.map((p) => p.meanRow.control)),
    byVariant: Object.fromEntries(
      nonControl.map((nv) => [
        nv,
        {
          density: avg(periods.map((p) => p.meanRow.byVariant[nv]?.density ?? null)),
          pct: avg(periods.map((p) => p.meanRow.byVariant[nv]?.pct ?? null)),
        },
      ]),
    ),
  };

  return { unit: "дона/м²", nonControlVariants: nonControl, controlVariant: control, periods, overallMeanRow };
}

export function computeReport(input: ReportInput): ComputedReport {
  const warnings: string[] = [];
  const det = detectType(input.meta.activeIngredients, input.explicitType);
  const days = [...input.assessment.days].sort((a, b) => a - b);
  const control = findControl(input);
  if (!control) {
    warnings.push(
      "Назорат (ишловсиз) варианти аниқланмади — биологик самарадорликни ҳисоблаш учун камида битта вариантни назорат деб белгиланг.",
    );
  }

  const efficacyRows: EfficacyRow[] = [];
  let countRows: CountRow[] | undefined;
  let methodKey: string = det.meta.efficacyMethod;

  // -----------------------------------------------------------------------
  // Инсектицид / акарицид / биопрепарат / нематицид / родентицид — сони бўйича
  // -----------------------------------------------------------------------
  if (input.assessment.counts) {
    const counts = input.assessment.counts;
    countRows = input.variants.map((v) => ({
      variant: v.name,
      isControl: !!v.isControl || v.name === control,
      before: counts[v.name]?.before ?? null,
      byDay: Object.fromEntries(days.map((d) => [d, counts[v.name]?.byDay?.[d] ?? null])),
    }));

    const ctrl = control ? counts[control] : undefined;
    const useHT =
      ctrl?.before != null &&
      input.variants.some((v) => v.name !== control && counts[v.name]?.before != null);
    methodKey = useHT ? "henderson_tilton" : "abbott";

    for (const v of input.variants) {
      const isControl = !!v.isControl || v.name === control;
      const c = counts[v.name];
      const byDay: Record<number, number | null> = {};
      for (const d of days) {
        if (isControl) {
          byDay[d] = null;
          continue;
        }
        let eff: number | null = null;
        const treatedAfter = c?.byDay?.[d];
        const controlAfter = ctrl?.byDay?.[d];
        if (useHT && c?.before != null && ctrl?.before != null) {
          if (treatedAfter != null && controlAfter != null) {
            eff = hendersonTiltonEfficacy(ctrl.before, controlAfter, c.before, treatedAfter);
          }
        } else if (controlAfter != null && treatedAfter != null) {
          eff = abbottEfficacy(controlAfter, treatedAfter);
        }
        byDay[d] = roundOrNull(eff);
      }
      efficacyRows.push({
        variant: v.name,
        isControl,
        isReference: !!v.isReference,
        byDay,
        mean: isControl ? null : mean(Object.values(byDay)),
      });
    }
  }

  // -----------------------------------------------------------------------
  // Фунгицид — касаллик ривожланиш индекси бўйича
  // -----------------------------------------------------------------------
  else if (input.assessment.disease) {
    methodKey = "disease";
    const disease = input.assessment.disease;
    const ctrl = control ? disease[control] : undefined;
    for (const v of input.variants) {
      const isControl = !!v.isControl || v.name === control;
      const d1 = disease[v.name];
      const byDay: Record<number, number | null> = {};
      for (const d of days) {
        if (isControl) {
          byDay[d] = null;
          continue;
        }
        const ci = ctrl?.byDayIndex?.[d];
        const ti = d1?.byDayIndex?.[d];
        byDay[d] =
          ci != null && ti != null ? roundOrNull(diseaseBiologicalEfficacy(ci, ti)) : null;
      }
      efficacyRows.push({
        variant: v.name,
        isControl,
        isReference: !!v.isReference,
        byDay,
        mean: isControl ? null : mean(Object.values(byDay)),
      });
    }
  }

  // -----------------------------------------------------------------------
  // Гербицид — бегона ўтлар зичлиги бўйича (жами тур бўйича)
  // -----------------------------------------------------------------------
  else if (input.assessment.weeds) {
    methodKey = "weed";
    const weeds = input.assessment.weeds;
    const totalDensity = (variant: string, day: number): number | null => {
      const perSpecies = weeds.density[variant];
      if (!perSpecies) return null;
      let sum = 0;
      let any = false;
      for (const sp of weeds.species) {
        const val = perSpecies[sp]?.[day];
        if (val != null) {
          sum += val;
          any = true;
        }
      }
      return any ? sum : null;
    };
    for (const v of input.variants) {
      const isControl = !!v.isControl || v.name === control;
      const byDay: Record<number, number | null> = {};
      for (const d of days) {
        if (isControl) {
          byDay[d] = null;
          continue;
        }
        const cd = control ? totalDensity(control, d) : null;
        const td = totalDensity(v.name, d);
        byDay[d] =
          cd != null && td != null ? roundOrNull(weedBiologicalEfficacy(cd, td)) : null;
      }
      efficacyRows.push({
        variant: v.name,
        isControl,
        isReference: !!v.isReference,
        byDay,
        mean: isControl ? null : mean(Object.values(byDay)),
      });
    }
  } else {
    warnings.push("Дала ҳисоблари киритилмаган — самарадорлик жадвали бўш.");
  }

  // -----------------------------------------------------------------------
  // Ҳосилдорлик + ANOVA
  // -----------------------------------------------------------------------
  let yieldRows: YieldRow[] | undefined;
  let yieldAnova: AnovaResult | null = null;
  if (input.yieldData && Object.keys(input.yieldData).length > 0) {
    const ctrlReps = control ? input.yieldData[control] : undefined;
    const ctrlMean =
      ctrlReps && ctrlReps.length
        ? ctrlReps.reduce((a, b) => a + b, 0) / ctrlReps.length
        : null;
    yieldRows = input.variants
      .filter((v) => input.yieldData![v.name]?.length)
      .map((v) => {
        const reps = input.yieldData![v.name];
        const m = reps.reduce((a, b) => a + b, 0) / reps.length;
        const isControl = !!v.isControl || v.name === control;
        return {
          variant: v.name,
          isControl,
          mean: roundOrNull(m),
          reps,
          increaseVsControlPct:
            !isControl && ctrlMean != null ? roundOrNull(yieldIncrease(m, ctrlMean)) : null,
        };
      });

    // ANOVA фақат барча вариантларда такрорлар сони бир хил бўлса
    const repCounts = new Set(
      Object.values(input.yieldData).map((r) => r.length).filter((n) => n > 0),
    );
    if (repCounts.size === 1 && (repCounts.values().next().value as number) >= 2) {
      try {
        yieldAnova = anovaRcbd(input.yieldData);
      } catch (e) {
        warnings.push(`Ҳосилдорлик ANOVA ҳисобланмади: ${(e as Error).message}`);
      }
    } else if (Object.keys(input.yieldData).length >= 2) {
      warnings.push(
        "Ҳосилдорлик дисперсион таҳлили учун ҳар бир вариантда бир хил (≥2) такрорлар керак.",
      );
    }
  }

  // Батафсил жадвал ва организмлар рўйхати (ҳозирча бегона ўтлар учун)
  let detailed: DetailedResults | undefined;
  let organisms: ComputedReport["organisms"];
  if (input.assessment.weeds) {
    detailed = buildWeedDetail(input, control, days);
    const w = input.assessment.weeds;
    organisms = w.species
      .filter((s) => s.trim())
      .map((s) => ({ name: s, latin: w.speciesLatin?.[s], before: w.before?.[s] ?? null }));
  }

  return {
    typeKey: det.typeKey,
    typeNameUz: det.meta.nameUz,
    detection: {
      confidence: det.confidence,
      matchedIngredient: det.matchedIngredient,
      needsConfirmation: det.needsConfirmation,
    },
    days,
    controlVariant: control,
    countRows,
    efficacyRows,
    efficacyMethodLabel: METHOD_LABELS[methodKey] ?? methodKey,
    detailed,
    organisms,
    yieldRows,
    yieldUnit: input.yieldUnit,
    yieldAnova,
    warnings,
  };
}
