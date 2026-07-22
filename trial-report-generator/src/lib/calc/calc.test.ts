import { describe, it, expect } from "vitest";
import {
  abbottEfficacy,
  hendersonTiltonEfficacy,
  populationReduction,
  diseaseDevelopmentIndex,
  diseaseBiologicalEfficacy,
  weedBiologicalEfficacy,
  yieldIncrease,
  insecticideSeries,
} from "./efficacy";
import { anovaRcbd, significantPairs, descriptive } from "./statistics";
import { detectType } from "./detect";

describe("efficacy formulas", () => {
  it("Abbott", () => {
    expect(abbottEfficacy(100, 20)).toBeCloseTo(80, 6);
    expect(abbottEfficacy(0, 5)).toBeNull(); // нолга бўлиш ҳимояси
  });

  it("Henderson-Tilton", () => {
    // Cb=40, Ca=60, Tb=50, Ta=5 -> 93.33%
    expect(hendersonTiltonEfficacy(40, 60, 50, 5)).toBeCloseTo(93.333, 2);
  });

  it("population reduction", () => {
    expect(populationReduction(200, 50)).toBeCloseTo(75, 6);
  });

  it("disease index + efficacy", () => {
    // {0:10,1:5,2:3,3:2}, N=20, K=4 -> 21.25
    expect(diseaseDevelopmentIndex({ 0: 10, 1: 5, 2: 3, 3: 2 }, 20, 4)).toBeCloseTo(21.25, 6);
    expect(diseaseBiologicalEfficacy(40, 10)).toBeCloseTo(75, 6);
  });

  it("weed efficacy + yield increase", () => {
    expect(weedBiologicalEfficacy(120, 18)).toBeCloseTo(85, 6);
    expect(yieldIncrease(35, 28)).toBeCloseTo(25, 6);
  });

  it("insecticide series (Henderson-Tilton over days)", () => {
    const s = insecticideSeries({
      controlBefore: 50,
      treatedBefore: 48,
      controlAfterByDay: { 3: 52, 7: 55, 14: 60 },
      treatedAfterByDay: { 3: 12, 7: 8, 14: 10 },
    });
    expect(s.results).toHaveLength(3);
    expect(s.results[0].efficacyPct).not.toBeNull();
    expect(s.meanEfficacy).not.toBeNull();
  });
});

describe("ANOVA (RCBD) — hand-computed example", () => {
  const data = { A: [10, 12, 11], B: [14, 15, 13], C: [20, 22, 21] };
  const res = anovaRcbd(data);

  it("sum of squares decomposition", () => {
    expect(res.ssTotal).toBeCloseTo(164, 1);
    expect(res.ssTreatment).toBeCloseTo(158, 1);
    expect(res.ssReplication).toBeCloseTo(4.667, 2);
    expect(res.ssError).toBeCloseTo(1.333, 2);
    // тождество: SS_total = SS_treatment + SS_replication + SS_error
    expect(res.ssTreatment + res.ssReplication + res.ssError).toBeCloseTo(res.ssTotal, 6);
  });

  it("degrees of freedom + LSD + CV", () => {
    expect(res.dfError).toBe(4);
    expect(res.lsd05).toBeCloseTo(1.31, 1);
    expect(res.cvPct).toBeCloseTo(3.77, 1);
    expect(res.significant).toBe(true);
  });

  it("variant means and significant pairs", () => {
    expect(res.variantMeans.A).toBeCloseTo(11, 6);
    expect(res.variantMeans.C).toBeCloseTo(21, 6);
    const pairs = significantPairs(res);
    expect(pairs.every((p) => p.significant)).toBe(true);
  });

  it("descriptive stats", () => {
    const d = descriptive([10, 12, 11]);
    expect(d.mean).toBeCloseTo(11, 6);
    expect(d.n).toBe(3);
  });
});

describe("pesticide type detection", () => {
  it("Latin active ingredients", () => {
    expect(detectType("Glyphosate 360 g/l").typeKey).toBe("gerbitsid");
    expect(detectType("Abamectin 18 g/l").typeKey).toBe("akaritsid");
    expect(detectType("Bacillus thuringiensis").typeKey).toBe("biopreparat");
  });

  it("Cyrillic active ingredients (transliteration)", () => {
    expect(detectType("Имидаклоприд 200 г/л").typeKey).toBe("insektitsid");
    expect(detectType("Тебуконазол 250 г/л").typeKey).toBe("fungitsid");
    expect(detectType("Циперметрин").typeKey).toBe("insektitsid");
  });

  it("unknown requires confirmation; explicit type overrides", () => {
    const u = detectType("Номаълум модда XYZ");
    expect(u.typeKey).toBe("unknown");
    expect(u.needsConfirmation).toBe(true);
    expect(detectType("nimadir", "фунгицид").typeKey).toBe("fungitsid");
  });
});
