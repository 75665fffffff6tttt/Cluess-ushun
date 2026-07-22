/**
 * Препарат турини таъсир этувчи модда номидан аниқлаш.
 *
 * Агар модда луғатда бўлмаса — тур "unknown" қайтарилади ва фойдаланувчидан
 * тасдиқ сўралиши керак (ҳисоботда нотўғри тур ишлатилмаслиги учун).
 */

export type PesticideType =
  | "gerbitsid"
  | "insektitsid"
  | "fungitsid"
  | "akaritsid"
  | "nematitsid"
  | "rodentitsid"
  | "defoliant"
  | "desikant"
  | "biopreparat"
  | "unknown";

export interface TypeMeta {
  nameUz: string;
  nameRu: string;
  targetUz: string;
  targetRu: string;
  efficacyMethod: "weed" | "henderson_tilton" | "disease" | "population" | "defoliation";
  unitUz: string;
  defaultDays: number[];
}

const ACTIVE_INGREDIENTS: Record<Exclude<PesticideType, "unknown">, string[]> = {
  gerbitsid: [
    "glyphosate", "glifosat", "2,4-d", "mcpa", "tribenuron", "metribuzin",
    "pendimethalin", "clethodim", "imazethapyr", "nicosulfuron", "quizalofop",
    "metsulfuron", "sulfosulfuron", "trifluralin", "prometryn", "prometrin",
    "s-metolachlor", "metolachlor", "clopyralid", "fluazifop", "haloxyfop",
    "oxyfluorfen", "dicamba", "bentazone", "propaquizafop", "florasulam",
  ],
  insektitsid: [
    "imidacloprid", "imidakloprid", "thiamethoxam", "acetamiprid", "atsetamiprid",
    "lambda-cyhalothrin", "lambda", "cypermethrin", "tsipermetrin", "chlorpyrifos",
    "xlorpirifos", "deltamethrin", "deltametrin", "emamectin", "spinosad",
    "indoxacarb", "flubendiamide", "chlorantraniliprole", "malathion", "malation",
    "dimethoate", "dimetoat", "thiacloprid", "clothianidin", "bifenthrin",
    "pirimiphos", "diflubenzuron", "lufenuron", "pymetrozine", "fipronil",
  ],
  fungitsid: [
    "tebuconazole", "tebukonazol", "azoxystrobin", "azoksistrobin", "mancozeb",
    "mankotseb", "propiconazole", "propikonazol", "difenoconazole", "difenokonazol",
    "carbendazim", "karbendazim", "cymoxanil", "metalaxyl", "metalaksil",
    "chlorothalonil", "copper", "mis", "sulfur", "oltingugurt", "sulphur",
    "triadimefon", "cyproconazole", "epoxiconazole", "boscalid", "fluopyram",
    "pyraclostrobin", "krezoksim", "kresoxim", "hexaconazole", "flutriafol",
  ],
  akaritsid: [
    "abamectin", "abamektin", "propargite", "propargit", "fenpyroximate",
    "spirodiclofen", "hexythiazox", "clofentezine", "etoxazole", "bifenazate",
    "pyridaben", "tebufenpyrad",
  ],
  nematitsid: ["fosthiazate", "oxamyl", "fluopyram", "fenamiphos", "cadusafos", "dazomet"],
  rodentitsid: [
    "bromadiolone", "bromadiolon", "brodifacoum", "brodifakum", "zinc phosphide",
    "rux fosfidi", "difenacoum", "flocoumafen", "warfarin", "varfarin",
  ],
  defoliant: [
    "thidiazuron", "tidiazuron", "tribufos", "dropp", "magnesium chlorate",
    "magniy xlorati", "diuron",
  ],
  desikant: [
    "diquat", "dikvat", "glufosinate", "glyufosinat", "sodium chlorate", "natriy xlorati",
  ],
  biopreparat: [
    "bacillus thuringiensis", "bacillus", "trichoderma", "trixoderma", "beauveria",
    "boverin", "metarhizium", "pseudomonas", "azotobacter", "verticillium", "npv",
    "granulovirus", "spinetoram",
  ],
};

export const TYPE_META: Record<PesticideType, TypeMeta> = {
  gerbitsid: {
    nameUz: "Гербицид", nameRu: "Гербицид", targetUz: "бегона ўтлар",
    targetRu: "сорные растения", efficacyMethod: "weed", unitUz: "дона/м²",
    defaultDays: [15, 30, 45, 60],
  },
  insektitsid: {
    nameUz: "Инсектицид", nameRu: "Инсектицид", targetUz: "зараркунандалар",
    targetRu: "вредители", efficacyMethod: "henderson_tilton", unitUz: "дона",
    defaultDays: [3, 7, 14, 21, 30],
  },
  fungitsid: {
    nameUz: "Фунгицид", nameRu: "Фунгицид", targetUz: "касалликлар",
    targetRu: "болезни", efficacyMethod: "disease", unitUz: "%",
    defaultDays: [7, 14, 21, 30],
  },
  akaritsid: {
    nameUz: "Акарицид", nameRu: "Акарицид", targetUz: "каналар",
    targetRu: "клещи", efficacyMethod: "henderson_tilton", unitUz: "дона",
    defaultDays: [3, 7, 14, 21, 30],
  },
  nematitsid: {
    nameUz: "Нематицид", nameRu: "Нематицид", targetUz: "нематодалар",
    targetRu: "нематоды", efficacyMethod: "population", unitUz: "дона",
    defaultDays: [14, 30, 45, 60],
  },
  rodentitsid: {
    nameUz: "Родентицид", nameRu: "Родентицид", targetUz: "кемирувчилар",
    targetRu: "грызуны", efficacyMethod: "population", unitUz: "дона",
    defaultDays: [3, 7, 14, 30],
  },
  defoliant: {
    nameUz: "Дефолиант", nameRu: "Дефолиант", targetUz: "барг тўкилиши",
    targetRu: "опадение листьев", efficacyMethod: "defoliation", unitUz: "%",
    defaultDays: [7, 14, 21],
  },
  desikant: {
    nameUz: "Десикант", nameRu: "Десикант", targetUz: "ўсимлик қуриши",
    targetRu: "высушивание растений", efficacyMethod: "defoliation", unitUz: "%",
    defaultDays: [3, 7, 14],
  },
  biopreparat: {
    nameUz: "Биопрепарат", nameRu: "Биопрепарат", targetUz: "зарарли организмлар",
    targetRu: "вредные организмы", efficacyMethod: "henderson_tilton", unitUz: "дона",
    defaultDays: [3, 7, 14, 21, 30],
  },
  unknown: {
    nameUz: "Аниқланмаган", nameRu: "Не определён", targetUz: "зарарли организмлар",
    targetRu: "вредные организмы", efficacyMethod: "population", unitUz: "дона",
    defaultDays: [7, 14, 21, 30],
  },
};

const CYR2LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", ў: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ҳ: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
};

function translit(text: string): string {
  let out = "";
  for (const ch of text) out += CYR2LAT[ch] ?? ch;
  return out;
}

/** Кимёвий ном мослиги учун: ph->f, th->t, ъ/ь белгиларини бартараф этиш. */
function chemFold(s: string): string {
  return s.replace(/ph/g, "f").replace(/ck/g, "k");
}

function normalize(text: string): string {
  let t = (text || "").toLowerCase().trim();
  t = translit(t);
  t = t.replace(/[^\p{L}\p{N}\s,.-]/gu, " ");
  t = t.replace(/\s+/g, " ");
  return chemFold(t);
}

const TYPE_ALIAS: Record<string, PesticideType> = {
  гербицид: "gerbitsid", herbicide: "gerbitsid",
  инсектицид: "insektitsid", insecticide: "insektitsid",
  фунгицид: "fungitsid", fungicide: "fungitsid",
  акарицид: "akaritsid", acaricide: "akaritsid",
  нематицид: "nematitsid", nematicide: "nematitsid",
  родентицид: "rodentitsid", rodenticide: "rodentitsid",
  дефолиант: "defoliant", defoliant: "defoliant",
  десикант: "desikant", desiccant: "desikant",
  биопрепарат: "biopreparat", biopreparat: "biopreparat",
};

export interface DetectionResult {
  typeKey: PesticideType;
  confidence: "high" | "none";
  matchedIngredient: string | null;
  meta: TypeMeta;
  needsConfirmation: boolean;
}

/**
 * Препарат турини аниқлайди.
 * explicitType берилса — фойдаланувчи қиймати устувор.
 */
export function detectType(activeIngredient: string, explicitType?: string): DetectionResult {
  if (explicitType) {
    const key = explicitType.trim().toLowerCase();
    const resolved = (TYPE_ALIAS[key] ?? key) as PesticideType;
    if (resolved in TYPE_META && resolved !== "unknown") {
      return {
        typeKey: resolved,
        confidence: "high",
        matchedIngredient: null,
        meta: TYPE_META[resolved],
        needsConfirmation: false,
      };
    }
  }

  const norm = normalize(activeIngredient || "");
  if (!norm) {
    return {
      typeKey: "unknown",
      confidence: "none",
      matchedIngredient: null,
      meta: TYPE_META.unknown,
      needsConfirmation: true,
    };
  }

  for (const [typeKey, ingredients] of Object.entries(ACTIVE_INGREDIENTS)) {
    for (const ing of ingredients) {
      if (norm.includes(chemFold(ing))) {
        return {
          typeKey: typeKey as PesticideType,
          confidence: "high",
          matchedIngredient: ing,
          meta: TYPE_META[typeKey as PesticideType],
          needsConfirmation: false,
        };
      }
    }
  }

  return {
    typeKey: "unknown",
    confidence: "none",
    matchedIngredient: null,
    meta: TYPE_META.unknown,
    needsConfirmation: true,
  };
}
