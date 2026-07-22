import { describe, it, expect } from "vitest";
import { computeReport } from "./compute";
import type { ReportInput } from "./types";

const baseMeta = {
  preparatName: "Тест-препарат, 20% с.к.",
  activeIngredients: "Имидаклоприд 200 г/л",
  preparatForm: "суспензия концентрати",
  manufacturer: "Тест-фирма",
  country: "Ўзбекистон",
  crop: "Ғўза",
  variety: "Султон",
  targetOrganism: "Ўргимчаккана / шира",
  applicationRate: "0,3 л/га",
  referenceName: "Эталон-препарат",
  workingSolution: "300 л/га",
  site: "Тошкент вилояти",
  trialDate: "2026-06-15",
  laboratory: "Марказий лаборатория",
  staff: "И.Каримов, А.Собиров",
  weather: "25–32°C, нисбий намлик 45%",
};

describe("computeReport — insecticide (Henderson-Tilton)", () => {
  const input: ReportInput = {
    meta: baseMeta,
    variants: [
      { name: "Назорат (ишловсиз)", isControl: true },
      { name: "Тажриба 0,3 л/га" },
      { name: "Эталон 0,3 л/га", isReference: true },
    ],
    assessment: {
      days: [3, 7, 14],
      counts: {
        "Назорат (ишловсиз)": { before: 50, byDay: { 3: 52, 7: 55, 14: 60 } },
        "Тажриба 0,3 л/га": { before: 48, byDay: { 3: 10, 7: 6, 14: 9 } },
        "Эталон 0,3 л/га": { before: 49, byDay: { 3: 12, 7: 8, 14: 11 } },
      },
    },
    yieldData: {
      "Назорат (ишловсиз)": [28.1, 27.6, 28.4, 27.9],
      "Тажриба 0,3 л/га": [34.2, 35.1, 34.8, 35.5],
      "Эталон 0,3 л/га": [33.0, 32.6, 33.4, 32.9],
    },
    yieldUnit: "ц/га",
  };

  const r = computeReport(input);

  it("detects insecticide + Henderson-Tilton method", () => {
    expect(r.typeKey).toBe("insektitsid");
    expect(r.efficacyMethodLabel).toContain("Henderson");
    expect(r.controlVariant).toBe("Назорат (ишловсиз)");
    expect(r.warnings).toHaveLength(0);
  });

  it("computes efficacy rows (control blank, treated high)", () => {
    const control = r.efficacyRows.find((x) => x.isControl)!;
    expect(control.mean).toBeNull();
    const treated = r.efficacyRows.find((x) => x.variant === "Тажриба 0,3 л/га")!;
    expect(treated.mean).not.toBeNull();
    expect(treated.mean!).toBeGreaterThan(70); // юқори самарадорлик
    expect(treated.byDay[7]).toBeGreaterThan(80);
  });

  it("computes yield rows + ANOVA + increase vs control", () => {
    expect(r.yieldRows).toBeDefined();
    const treated = r.yieldRows!.find((x) => x.variant === "Тажриба 0,3 л/га")!;
    expect(treated.increaseVsControlPct).toBeGreaterThan(0);
    expect(r.yieldAnova).not.toBeNull();
    expect(r.yieldAnova!.significant).toBe(true);
    expect(r.yieldAnova!.lsd05).toBeGreaterThan(0);
  });
});

describe("computeReport — fungicide (disease index)", () => {
  const input: ReportInput = {
    meta: { ...baseMeta, activeIngredients: "Тебуконазол 250 г/л", targetOrganism: "Ун-шудринг" },
    variants: [
      { name: "Назорат", isControl: true },
      { name: "Тажриба 0,5 л/га" },
    ],
    assessment: {
      days: [7, 14, 21],
      disease: {
        "Назорат": { byDayIndex: { 7: 18, 14: 32, 21: 45 } },
        "Тажриба 0,5 л/га": { byDayIndex: { 7: 6, 14: 8, 21: 11 } },
      },
    },
  };
  const r = computeReport(input);
  it("detects fungicide + disease method", () => {
    expect(r.typeKey).toBe("fungitsid");
    expect(r.efficacyMethodLabel).toContain("Касаллик");
    const treated = r.efficacyRows.find((x) => !x.isControl)!;
    expect(treated.mean).toBeGreaterThan(60);
  });
});

describe("computeReport — herbicide (weed density)", () => {
  const input: ReportInput = {
    meta: { ...baseMeta, activeIngredients: "Глифосат 360 г/л", targetOrganism: "Аралаш бегона ўтлар" },
    variants: [
      { name: "Назорат", isControl: true },
      { name: "Тажриба 3 л/га" },
    ],
    assessment: {
      days: [15, 30, 45],
      weeds: {
        species: ["Курмак", "Шўра"],
        density: {
          "Назорат": {
            "Курмак": { 15: 40, 30: 45, 45: 50 },
            "Шўра": { 15: 30, 30: 33, 45: 36 },
          },
          "Тажриба 3 л/га": {
            "Курмак": { 15: 8, 30: 5, 45: 4 },
            "Шўра": { 15: 6, 30: 4, 45: 3 },
          },
        },
      },
    },
  };
  const r = computeReport(input);
  it("detects herbicide + weed method", () => {
    expect(r.typeKey).toBe("gerbitsid");
    expect(r.efficacyMethodLabel).toContain("гербицид");
    const treated = r.efficacyRows.find((x) => !x.isControl)!;
    expect(treated.mean).toBeGreaterThan(80);
  });
});
