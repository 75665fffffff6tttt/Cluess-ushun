"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportInput, ReportMeta, ComputedReport } from "@/lib/types";
import type { DetectionResult } from "@/lib/calc/detect";

type Mode = "counts" | "disease" | "weeds";

interface VariantState {
  id: string;
  name: string;
  isControl: boolean;
  isReference: boolean;
}

const META_FIELDS: { key: keyof ReportMeta; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "preparatName", label: "Препарат номи", placeholder: "Мисол: Актеллик, 50% э.к.", wide: true },
  { key: "activeIngredients", label: "Таъсир этувчи модда(лар)", placeholder: "Мисол: Пиримифос-метил 500 г/л" },
  { key: "preparatForm", label: "Препарат шакли", placeholder: "эмульсия концентрати" },
  { key: "manufacturer", label: "Ишлаб чиқарувчи фирма", placeholder: "Фирма номи" },
  { key: "country", label: "Давлат", placeholder: "Ўзбекистон" },
  { key: "crop", label: "Экин тури", placeholder: "Ғўза" },
  { key: "variety", label: "Нави", placeholder: "Султон" },
  { key: "targetOrganism", label: "Зарарли организм", placeholder: "Ўргимчаккана", wide: true },
  { key: "applicationRate", label: "Сарф меъёри", placeholder: "1,0 л/га" },
  { key: "referenceName", label: "Эталон препарат", placeholder: "Эталон номи" },
  { key: "workingSolution", label: "Ишчи эритма меъёри", placeholder: "300 л/га" },
  { key: "site", label: "Синов жойи", placeholder: "Тошкент вилояти, ... тумани" },
  { key: "trialDate", label: "Синов санаси", placeholder: "2026-06-15" },
  { key: "laboratory", label: "Лаборатория", placeholder: "Марказий давлат синов лабораторияси", wide: true },
  { key: "staff", label: "Илмий ходимлар", placeholder: "И.Каримов, А.Собиров", wide: true },
  { key: "weather", label: "Ҳаво ҳарорати / об-ҳаво", placeholder: "26–33°C, намлик 45%", wide: true },
];

const OFFICIAL_FIELDS: { key: keyof ReportMeta; label: string; placeholder: string; wide?: boolean }[] = [
  { key: "institute", label: "Илмий-тадқиқот институти", placeholder: "Ўсимликлар карантини ва ҳимояси ИТИ", wide: true },
  { key: "director", label: "Институт директори (ТАСДИҚЛАЙМАН)", placeholder: "А.Анорбаев" },
  { key: "protocolNumber", label: "Кенгаш баённомаси №", placeholder: "12" },
  { key: "applicantOrg", label: "Рўйхатга талабгор ташкилот", placeholder: "AGRO-SERVICE-TORG МЧЖ" },
  { key: "tradeName", label: "Савдо номи", placeholder: "Flurog 40" },
  { key: "testEquipment", label: "Жиҳоз / ускуна", placeholder: "FST-909 Knapsack Power Sprayer" },
  { key: "applicationMethod", label: "Қўллаш усули", placeholder: "пуркаш" },
  { key: "experimentType", label: "Тажриба тури", placeholder: "кичик дала тажрибаси" },
  { key: "referenceFullDesc", label: "Эталон тўлиқ тавсифи (3.10)", placeholder: "Унико ККР (Fluroxypyr 100 + florasulam 2,5), 1,0 л/га", wide: true },
  { key: "labConclusion", label: "Лаборатория хулосаси (3.9)", placeholder: "бегона ўтлар 1 м² да 10-50 та", wide: true },
  { key: "maxTreatments", label: "Макс. ишлов сони", placeholder: "1" },
  { key: "waitingPeriod", label: "Кутиш вақти (кун)", placeholder: "15" },
  { key: "phytotoxicity", label: "Фитотоксик хусусияти", placeholder: "Кузатилмади" },
  { key: "cropPhase", label: "Экин ривожланиш фазаси", placeholder: "ўсиш даврида, култивация қилинган", wide: true },
  { key: "actDate", label: "Далолатнома санаси", placeholder: "05.09.2026" },
  { key: "references", label: "Фойдаланилган адабиётлар (ҳар сатр — битта)", placeholder: "1. Доспехов Б.А. ...\n2. ...", wide: true },
];

const emptyMeta: ReportMeta = {
  preparatName: "", activeIngredients: "", preparatForm: "", manufacturer: "", country: "Ўзбекистон",
  crop: "", variety: "", targetOrganism: "", applicationRate: "", referenceName: "",
  workingSolution: "", site: "", trialDate: "", laboratory: "", staff: "", weather: "",
};

let idc = 0;
const nid = () => `v${++idc}`;

function num(s: string): number | null {
  if (s == null || s.trim() === "") return null;
  const v = Number(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

const btn = "px-4 py-2 rounded-md font-semibold text-sm transition disabled:opacity-50";
const inp =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600";

export default function ReportForm() {
  const [meta, setMeta] = useState<ReportMeta>(emptyMeta);
  const [explicitType, setExplicitType] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);

  const [variants, setVariants] = useState<VariantState[]>([
    { id: nid(), name: "Назорат (ишловсиз)", isControl: true, isReference: false },
    { id: nid(), name: "Тажриба варианти", isControl: false, isReference: false },
    { id: nid(), name: "Эталон варианти", isControl: false, isReference: true },
  ]);

  const [daysStr, setDaysStr] = useState("3, 7, 14, 21");
  const days = useMemo(
    () => Array.from(new Set(daysStr.split(/[,;\s]+/).map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n)))).sort((a, b) => a - b),
    [daysStr],
  );

  const [mode, setMode] = useState<Mode>("counts");
  const [manualMode, setManualMode] = useState(false);

  // Дала маълумотлари (id бўйича, string сифатида)
  const [counts, setCounts] = useState<Record<string, { before: string; byDay: Record<number, string> }>>({});
  const [disease, setDisease] = useState<Record<string, Record<number, string>>>({});
  const [species, setSpecies] = useState<string[]>(["Курмак", "Шўра"]);
  const [weeds, setWeeds] = useState<Record<string, Record<string, Record<number, string>>>>({});
  const [weedBefore, setWeedBefore] = useState<Record<string, string>>({});

  const [yieldReps, setYieldReps] = useState(4);
  const [yieldUnit, setYieldUnit] = useState("ц/га");
  const [yieldData, setYieldData] = useState<Record<string, string[]>>({});

  const [preview, setPreview] = useState<ComputedReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // шаблон таҳлили
  const [templateInfo, setTemplateInfo] = useState<{
    fileName: string;
    analysis: { paragraphCount: number; tableCount: number; detectedSections: string[]; headings: string[] };
  } | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);

  const onTemplate = async (file: File) => {
    setTemplateBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/template", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setTemplateInfo({ fileName: data.fileName, analysis: data.analysis });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTemplateBusy(false);
    }
  };

  // --- жонли тур аниқлаш ---
  useEffect(() => {
    const ai = meta.activeIngredients.trim();
    if (!ai && !explicitType) {
      setDetection(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeIngredient: ai, explicitType }),
        });
        const data = await res.json();
        if (data.ok) {
          setDetection(data.result);
          if (!manualMode) {
            const m = data.result.meta.efficacyMethod;
            setMode(m === "disease" ? "disease" : m === "weed" ? "weeds" : "counts");
          }
        }
      } catch {
        /* тармоқ хатоси — эътиборсиз */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [meta.activeIngredients, explicitType, manualMode]);

  const setMetaField = (k: keyof ReportMeta, v: string) => setMeta((p) => ({ ...p, [k]: v }));

  // --- вариант операциялари ---
  const addVariant = () =>
    setVariants((p) => [...p, { id: nid(), name: `Вариант ${p.length + 1}`, isControl: false, isReference: false }]);
  const removeVariant = (id: string) => setVariants((p) => p.filter((v) => v.id !== id));
  const updateVariant = (id: string, patch: Partial<VariantState>) =>
    setVariants((p) =>
      p.map((v) => {
        if (v.id !== id) {
          // фақат битта назорат бўлсин
          if (patch.isControl) return { ...v, isControl: false };
          return v;
        }
        return { ...v, ...patch };
      }),
    );

  // --- маълумот сеттерлари ---
  const setCount = (id: string, day: number | "before", val: string) =>
    setCounts((p) => {
      const cur = p[id] ?? { before: "", byDay: {} };
      if (day === "before") return { ...p, [id]: { ...cur, before: val } };
      return { ...p, [id]: { ...cur, byDay: { ...cur.byDay, [day]: val } } };
    });
  const setDiseaseVal = (id: string, day: number, val: string) =>
    setDisease((p) => ({ ...p, [id]: { ...(p[id] ?? {}), [day]: val } }));
  const setWeedVal = (id: string, sp: string, day: number, val: string) =>
    setWeeds((p) => ({
      ...p,
      [id]: { ...(p[id] ?? {}), [sp]: { ...((p[id] ?? {})[sp] ?? {}), [day]: val } },
    }));
  const setYieldVal = (id: string, rep: number, val: string) =>
    setYieldData((p) => {
      const arr = [...(p[id] ?? Array(yieldReps).fill(""))];
      arr[rep] = val;
      return { ...p, [id]: arr };
    });

  // --- ReportInput қуриш ---
  const buildInput = useCallback((): ReportInput => {
    const nameById = Object.fromEntries(variants.map((v) => [v.id, v.name]));
    const inputVariants = variants.map((v) => ({
      name: v.name,
      isControl: v.isControl,
      isReference: v.isReference,
    }));

    const assessment: ReportInput["assessment"] = { days };
    if (mode === "counts") {
      const c: NonNullable<ReportInput["assessment"]["counts"]> = {};
      for (const v of variants) {
        const cur = counts[v.id];
        const byDay: Record<number, number> = {};
        for (const d of days) {
          const n = num(cur?.byDay?.[d] ?? "");
          if (n != null) byDay[d] = n;
        }
        c[nameById[v.id]] = { before: num(cur?.before ?? ""), byDay };
      }
      assessment.counts = c;
    } else if (mode === "disease") {
      const dz: NonNullable<ReportInput["assessment"]["disease"]> = {};
      for (const v of variants) {
        const byDayIndex: Record<number, number> = {};
        for (const d of days) {
          const n = num(disease[v.id]?.[d] ?? "");
          if (n != null) byDayIndex[d] = n;
        }
        dz[nameById[v.id]] = { byDayIndex };
      }
      assessment.disease = dz;
    } else {
      const density: Record<string, Record<string, Record<number, number>>> = {};
      for (const v of variants) {
        density[nameById[v.id]] = {};
        for (const sp of species) {
          const byDay: Record<number, number> = {};
          for (const d of days) {
            const n = num(weeds[v.id]?.[sp]?.[d] ?? "");
            if (n != null) byDay[d] = n;
          }
          density[nameById[v.id]][sp] = byDay;
        }
      }
      const beforeOut: Record<string, number> = {};
      for (const sp of species) {
        const n = num(weedBefore[sp] ?? "");
        if (n != null) beforeOut[sp] = n;
      }
      assessment.weeds = { species: species.filter((s) => s.trim()), density, before: beforeOut };
    }

    const yieldOut: Record<string, number[]> = {};
    for (const v of variants) {
      const arr = (yieldData[v.id] ?? []).map(num).filter((n): n is number => n != null);
      if (arr.length) yieldOut[nameById[v.id]] = arr;
    }

    return {
      meta,
      explicitType: explicitType || undefined,
      variants: inputVariants,
      assessment,
      yieldData: Object.keys(yieldOut).length ? yieldOut : undefined,
      yieldUnit,
    };
  }, [variants, days, mode, counts, disease, species, weeds, weedBefore, yieldData, meta, explicitType, yieldUnit]);

  const doCompute = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildInput()),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setPreview(data.report);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildInput()),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ҳисобот яратилмади");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (meta.preparatName || "hisobot").replace(/\s+/g, "_") + "_davlat_sinov_hisoboti.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const modeLabel: Record<Mode, string> = {
    counts: "Зараркунанда сони (инсектицид/акарицид)",
    disease: "Касаллик индекси (фунгицид)",
    weeds: "Бегона ўтлар зичлиги (гербицид)",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Сарлавҳа */}
      <header className="mb-6 rounded-xl bg-gradient-to-r from-green-800 to-green-600 p-6 text-white shadow">
        <div className="text-sm opacity-90">Ўзбекистон Республикаси · Ўсимликлар карантини ва ҳимояси агентлиги</div>
        <h1 className="mt-1 text-2xl font-bold">Давлат синови илмий ҳисобот генератори</h1>
        <p className="mt-1 text-sm opacity-90">
          Дала ўлчов маълумотларини киритинг — тизим биологик самарадорлик, статистика ва расмий .docx ҳисоботни автоматик тайёрлайди.
        </p>
      </header>

      {/* 0. Шаблон юклаш (ихтиёрий) */}
      <Section title="Намуна шаблон (.docx) — ихтиёрий">
        <p className="mb-3 text-sm text-gray-600">
          Расмий давлат синови ҳисоботи намунасини (.docx) юкласангиз, тизим унинг тузилишини таҳлил қилади. Ҳозирча ҳисобот
          ички расмий тузилиш (16 бўлим) асосида яратилади; юкланган шаблон тузилишни солиштириш учун кўрсатилади.
        </p>
        <input
          type="file"
          accept=".docx"
          onChange={(e) => e.target.files?.[0] && onTemplate(e.target.files[0])}
          className="text-sm"
        />
        {templateBusy && <span className="ml-3 text-sm text-blue-700">Таҳлил қилинмоқда…</span>}
        {templateInfo && (
          <div className="mt-3 rounded-md bg-green-50 p-3 text-sm">
            <div className="font-semibold text-green-900">✓ {templateInfo.fileName}</div>
            <div className="mt-1 text-gray-700">
              Параграфлар: {templateInfo.analysis.paragraphCount} · Жадваллар: {templateInfo.analysis.tableCount}
            </div>
            {templateInfo.analysis.detectedSections.length > 0 && (
              <div className="mt-1 text-gray-700">
                Аниқланган бўлимлар: {templateInfo.analysis.detectedSections.join(", ")}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* 1. Препарат маълумотлари */}
      <Section title="1. Препарат ва синов маълумотлари">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {META_FIELDS.map((f) => (
            <label key={f.key} className={f.wide ? "sm:col-span-2 lg:col-span-3" : ""}>
              <span className="mb-1 block text-sm font-medium text-gray-700">{f.label}</span>
              <input
                className={inp}
                value={meta[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setMetaField(f.key, e.target.value)}
              />
            </label>
          ))}
        </div>

        {/* Аниқланган тур */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Аниқланган препарат тури:</span>
          {detection ? (
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                detection.needsConfirmation ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
              }`}
            >
              {detection.meta.nameUz}
              {detection.matchedIngredient ? ` · ${detection.matchedIngredient}` : ""}
              {detection.needsConfirmation ? " · тасдиқ керак" : ""}
            </span>
          ) : (
            <span className="text-sm text-gray-400">— (таъсир этувчи моддани киритинг)</span>
          )}
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-gray-600">Қўлбола тур:</span>
            <select className={inp + " w-auto"} value={explicitType} onChange={(e) => setExplicitType(e.target.value)}>
              <option value="">Авто</option>
              <option value="гербицид">Гербицид</option>
              <option value="инсектицид">Инсектицид</option>
              <option value="фунгицид">Фунгицид</option>
              <option value="акарицид">Акарицид</option>
              <option value="нематицид">Нематицид</option>
              <option value="родентицид">Родентицид</option>
              <option value="дефолиант">Дефолиант</option>
              <option value="десикант">Десикант</option>
              <option value="биопрепарат">Биопрепарат</option>
            </select>
          </label>
        </div>
      </Section>

      {/* 1b. Расмий реквизитлар (йиғма) */}
      <details className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-lg font-bold text-green-900">
          1b. Расмий реквизитлар (ихтиёрий — титул, баёнома, далолатнома учун)
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICIAL_FIELDS.map((f) =>
            f.key === "references" ? (
              <label key={f.key} className="sm:col-span-2 lg:col-span-3">
                <span className="mb-1 block text-sm font-medium text-gray-700">{f.label}</span>
                <textarea
                  className={inp + " h-24 resize-y"}
                  value={meta[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setMetaField(f.key, e.target.value)}
                />
              </label>
            ) : (
              <label key={f.key} className={f.wide ? "sm:col-span-2 lg:col-span-3" : ""}>
                <span className="mb-1 block text-sm font-medium text-gray-700">{f.label}</span>
                <input
                  className={inp}
                  value={meta[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setMetaField(f.key, e.target.value)}
                />
              </label>
            ),
          )}
        </div>
      </details>

      {/* 2. Вариантлар */}
      <Section title="2. Тажриба вариантлари">
        <div className="space-y-2">
          {variants.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-gray-50 p-2">
              <input
                className={inp + " flex-1 min-w-[200px]"}
                value={v.name}
                onChange={(e) => updateVariant(v.id, { name: e.target.value })}
              />
              <label className="flex items-center gap-1 text-sm">
                <input type="radio" name="control" checked={v.isControl} onChange={() => updateVariant(v.id, { isControl: true })} />
                назорат
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={v.isReference} onChange={(e) => updateVariant(v.id, { isReference: e.target.checked })} />
                эталон
              </label>
              <button className="text-red-600 hover:text-red-800" onClick={() => removeVariant(v.id)} title="Ўчириш">✕</button>
            </div>
          ))}
        </div>
        <button className={btn + " mt-3 bg-green-700 text-white hover:bg-green-800"} onClick={addVariant}>
          + Вариант қўшиш
        </button>
      </Section>

      {/* 3. Кузатиш кунлари + режим */}
      <Section title="3. Кузатиш кунлари ва дала маълумотлари тури">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-medium text-gray-700">Кузатиш кунлари (вергул билан)</span>
            <input className={inp} value={daysStr} onChange={(e) => setDaysStr(e.target.value)} placeholder="3, 7, 14, 21, 30" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-gray-700">Дала маълумотлари тури</span>
            <select
              className={inp}
              value={mode}
              onChange={(e) => {
                setManualMode(true);
                setMode(e.target.value as Mode);
              }}
            >
              <option value="counts">{modeLabel.counts}</option>
              <option value="disease">{modeLabel.disease}</option>
              <option value="weeds">{modeLabel.weeds}</option>
            </select>
          </label>
        </div>
      </Section>

      {/* 4. Дала ҳисоблари */}
      <Section title="4. Дала ҳисоблари (ўлчов маълумотлари)">
        {days.length === 0 ? (
          <p className="text-sm text-amber-700">Аввал кузатиш кунларини киритинг.</p>
        ) : mode === "counts" ? (
          <DataTable
            headers={["Вариант", "Ишловгача", ...days.map((d) => `${d}-кун`)]}
            rows={variants.map((v) => (
              <tr key={v.id} className="border-t">
                <Td>{v.name}</Td>
                <Td>
                  <CellInput value={counts[v.id]?.before ?? ""} onChange={(val) => setCount(v.id, "before", val)} />
                </Td>
                {days.map((d) => (
                  <Td key={d}>
                    <CellInput value={counts[v.id]?.byDay?.[d] ?? ""} onChange={(val) => setCount(v.id, d, val)} />
                  </Td>
                ))}
              </tr>
            ))}
          />
        ) : mode === "disease" ? (
          <DataTable
            headers={["Вариант", ...days.map((d) => `${d}-кун (индекс %)`)]}
            rows={variants.map((v) => (
              <tr key={v.id} className="border-t">
                <Td>{v.name}</Td>
                {days.map((d) => (
                  <Td key={d}>
                    <CellInput value={disease[v.id]?.[d] ?? ""} onChange={(val) => setDiseaseVal(v.id, d, val)} />
                  </Td>
                ))}
              </tr>
            ))}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Бегона ўт турлари:</span>
              {species.map((sp, i) => (
                <input
                  key={i}
                  className={inp + " w-40"}
                  value={sp}
                  onChange={(e) => setSpecies((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                />
              ))}
              <button className={btn + " bg-green-700 text-white"} onClick={() => setSpecies((p) => [...p, `Тур ${p.length + 1}`])}>
                + тур
              </button>
              {species.length > 1 && (
                <button className={btn + " bg-gray-200"} onClick={() => setSpecies((p) => p.slice(0, -1))}>
                  − тур
                </button>
              )}
            </div>
            {species.map((sp) => (
              <div key={sp}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-700">
                  <span>{sp} — зичлик (дона/м²)</span>
                  <span className="font-normal text-gray-500">· Ишловгача (1 м²):</span>
                  <input
                    className="w-24 rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-green-600"
                    inputMode="decimal"
                    value={weedBefore[sp] ?? ""}
                    onChange={(e) => setWeedBefore((p) => ({ ...p, [sp]: e.target.value }))}
                  />
                </div>
                <DataTable
                  headers={["Вариант", ...days.map((d) => `${d}-кун`)]}
                  rows={variants.map((v) => (
                    <tr key={v.id} className="border-t">
                      <Td>{v.name}</Td>
                      {days.map((d) => (
                        <Td key={d}>
                          <CellInput value={weeds[v.id]?.[sp]?.[d] ?? ""} onChange={(val) => setWeedVal(v.id, sp, d, val)} />
                        </Td>
                      ))}
                    </tr>
                  ))}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 5. Ҳосилдорлик */}
      <Section title="5. Ҳосилдорлик натижалари (повторностлар бўйича)">
        <div className="mb-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            Такрорлар сони:
            <input
              type="number"
              min={2}
              max={8}
              className={inp + " w-20"}
              value={yieldReps}
              onChange={(e) => setYieldReps(Math.max(2, Math.min(8, Number(e.target.value) || 2)))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            Бирлик:
            <input className={inp + " w-28"} value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)} />
          </label>
        </div>
        <DataTable
          headers={["Вариант", ...Array.from({ length: yieldReps }, (_, i) => `${i + 1}-такр.`)]}
          rows={variants.map((v) => (
            <tr key={v.id} className="border-t">
              <Td>{v.name}</Td>
              {Array.from({ length: yieldReps }, (_, i) => (
                <Td key={i}>
                  <CellInput value={yieldData[v.id]?.[i] ?? ""} onChange={(val) => setYieldVal(v.id, i, val)} />
                </Td>
              ))}
            </tr>
          ))}
        />
      </Section>

      {/* Амаллар */}
      <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <button className={btn + " bg-blue-700 text-white hover:bg-blue-800"} onClick={doCompute} disabled={busy}>
          {busy ? "Ҳисобланмоқда…" : "Ҳисоблаш ва кўриб чиқиш"}
        </button>
        <button className={btn + " bg-green-700 text-white hover:bg-green-800"} onClick={doDownload} disabled={busy}>
          📄 Word (.docx) юклаб олиш
        </button>
        {error && <span className="text-sm font-medium text-red-600">Хатолик: {error}</span>}
      </div>

      {/* Preview */}
      {preview && <Preview report={preview} />}

      <footer className="mt-8 text-center text-xs text-gray-400">
        Барча самарадорлик ва статистик кўрсаткичлар фақат киритилган дала ўлчовларидан ҳисобланади.
      </footer>
    </div>
  );
}

// --- кичик компонентлар ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 border-b border-gray-100 pb-2 text-lg font-bold text-green-900">{title}</h2>
      {children}
    </section>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px] border-collapse text-sm">
        <thead>
          <tr className="bg-green-50">
            {headers.map((h, i) => (
              <th key={i} className="border border-gray-200 px-2 py-2 text-left font-semibold text-green-900">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="border border-gray-200 px-2 py-1">{children}</td>;
}

function CellInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="w-24 rounded border border-gray-200 px-2 py-1 text-sm outline-none focus:border-green-600"
      value={value}
      inputMode="decimal"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Preview({ report }: { report: ComputedReport }) {
  return (
    <section className="mt-6 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-blue-900">Ҳисоблаш натижаси (кўриб чиқиш)</h2>
      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        <span className="rounded bg-green-100 px-2 py-1 font-medium text-green-800">Тури: {report.typeNameUz}</span>
        <span className="rounded bg-gray-100 px-2 py-1">Методика: {report.efficacyMethodLabel}</span>
        <span className="rounded bg-gray-100 px-2 py-1">Назорат: {report.controlVariant ?? "—"}</span>
      </div>

      {report.warnings.length > 0 && (
        <ul className="mb-3 list-disc rounded bg-amber-50 p-3 pl-8 text-sm text-amber-800">
          {report.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 font-semibold">Биологик самарадорлик, %</h3>
      <div className="mb-4 overflow-x-auto">
        <table className="w-full min-w-[400px] border-collapse text-sm">
          <thead>
            <tr className="bg-green-50">
              <th className="border px-2 py-1 text-left">Вариант</th>
              {report.days.map((d) => (
                <th key={d} className="border px-2 py-1">{d}-кун</th>
              ))}
              <th className="border px-2 py-1">Ўртача</th>
            </tr>
          </thead>
          <tbody>
            {report.efficacyRows.map((r) => (
              <tr key={r.variant} className={r.isControl ? "bg-gray-50 font-medium" : ""}>
                <td className="border px-2 py-1 text-left">{r.variant}{r.isReference ? " (эталон)" : ""}</td>
                {report.days.map((d) => (
                  <td key={d} className="border px-2 py-1 text-center">
                    {r.isControl ? "—" : r.byDay[d] ?? "—"}
                  </td>
                ))}
                <td className="border px-2 py-1 text-center font-semibold">{r.isControl ? "—" : r.mean ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.yieldRows && report.yieldRows.length > 0 && (
        <>
          <h3 className="mb-2 font-semibold">Ҳосилдорлик ({report.yieldUnit})</h3>
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[300px] border-collapse text-sm">
              <thead>
                <tr className="bg-green-50">
                  <th className="border px-2 py-1 text-left">Вариант</th>
                  <th className="border px-2 py-1">Ўртача</th>
                  <th className="border px-2 py-1">Назоратга нисбатан, %</th>
                </tr>
              </thead>
              <tbody>
                {report.yieldRows.map((r) => (
                  <tr key={r.variant}>
                    <td className="border px-2 py-1 text-left">{r.variant}</td>
                    <td className="border px-2 py-1 text-center">{r.mean ?? "—"}</td>
                    <td className="border px-2 py-1 text-center">
                      {r.increaseVsControlPct == null ? "—" : `+${r.increaseVsControlPct}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {report.yieldAnova && (
        <div className="rounded bg-blue-50 p-3 text-sm">
          <strong>Дисперсион таҳлил (ANOVA):</strong> НСР₀.₀₅ = {report.yieldAnova.lsd05}; CV% = {report.yieldAnova.cvPct};
          F = {report.yieldAnova.fValue}; P = {report.yieldAnova.pValue};{" "}
          {report.yieldAnova.significant ? "фарқ ишончли (P<0.05)" : "фарқ ишончли эмас"}
        </div>
      )}
    </section>
  );
}
