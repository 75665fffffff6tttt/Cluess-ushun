/* Таъсир механизми (Mode of Action) гуруҳлари — IRAC / FRAC / HRAC.
 *
 * Резистентликнинг олдини олиш учун препаратларни таъсир механизми гуруҳи
 * бўйича навбатлаб (ротация) қўллаш халқаро тавсия ҳисобланади.
 *
 * ⚠️ Гуруҳ таснифи маълумот характерида. Аниқ гуруҳни IRAC (insecticides),
 * FRAC (fungicides), HRAC (herbicides) расмий базаларидан текширинг.
 */
(function () {
  "use strict";

  // Кирилл -> лотин + ph->f (detect.js билан бир хил услуб)
  var CYR2LAT = { "а":"a","б":"b","в":"v","г":"g","ғ":"g","д":"d","е":"e","ё":"yo","ж":"j","з":"z","и":"i","й":"y","к":"k","қ":"q","л":"l","м":"m","н":"n","о":"o","ў":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"x","ҳ":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sh","ъ":"","ы":"i","ь":"","э":"e","ю":"yu","я":"ya" };
  function norm(s) {
    s = (s || "").toLowerCase().trim();
    var o = ""; for (var i = 0; i < s.length; i++) o += (CYR2LAT[s[i]] != null ? CYR2LAT[s[i]] : s[i]);
    return o.replace(/[^a-z0-9\s,.-]/g, " ").replace(/\s+/g, " ").replace(/ph/g, "f").replace(/ck/g, "k");
  }

  // Ҳар бир ёзув: match (норм. лотин калит қисмлар), system, group, moa_uz, moa_ru
  var DB = [
    // --- IRAC (инсектицид/акарицид) ---
    { m: ["pirimifos","dimetoat","xlorpirifos","malation","fosfamid"], system: "IRAC", group: "1B", moa_uz: "Ацетилхолинэстераза ингибитори (фосфорорганик)", moa_ru: "Ингибитор ацетилхолинэстеразы (ФОС)" },
    { m: ["karbaril","metomil","karbofuran","pirimikarb"], system: "IRAC", group: "1A", moa_uz: "Ацетилхолинэстераза ингибитори (карбамат)", moa_ru: "Ингибитор ацетилхолинэстеразы (карбамат)" },
    { m: ["fipronil"], system: "IRAC", group: "2B", moa_uz: "GABA-канал блокатори (фенилпиразол)", moa_ru: "Блокатор GABA-канала (фенилпиразол)" },
    { m: ["tsipermetrin","tsihalotrin","galotrin","lyambda","lambda","deltametrin","bifentrin","permetrin","alfa-tsiper","zeta-tsiper"], system: "IRAC", group: "3A", moa_uz: "Натрий каналлари модулятори (пиретроид)", moa_ru: "Модулятор натриевых каналов (пиретроид)" },
    { m: ["imidakloprid","tiametoksam","atsetamiprid","klotianidin","tiakloprid"], system: "IRAC", group: "4A", moa_uz: "Никотин ацетилхолин рецептори агонисти (неоникотиноид)", moa_ru: "Агонист никотиновых рецепторов (неоникотиноид)" },
    { m: ["spinosad","spinetoram"], system: "IRAC", group: "5", moa_uz: "Никотин рецептори аллостерик модулятори (спинозин)", moa_ru: "Аллостерический модулятор (спинозин)" },
    { m: ["abamektin","emamektin","avermektin"], system: "IRAC", group: "6", moa_uz: "Глутамат хлор каналлари модулятори (авермектин)", moa_ru: "Модулятор хлорных каналов (авермектин)" },
    { m: ["pimetrozin"], system: "IRAC", group: "9B", moa_uz: "Озуқланишни тўхтатувчи (пиметрозин)", moa_ru: "Ингибитор питания (пиметрозин)" },
    { m: ["klofentezin","geksitiazoks","heksitiazoks"], system: "IRAC", group: "10A", moa_uz: "Кана ўсишини ингибитори", moa_ru: "Ингибитор роста клещей" },
    { m: ["etoksazol"], system: "IRAC", group: "10B", moa_uz: "Кана ўсишини ингибитори (этоксазол)", moa_ru: "Ингибитор роста клещей (этоксазол)" },
    { m: ["diflubenzuron","lufenuron","teflubenzuron"], system: "IRAC", group: "15", moa_uz: "Хитин синтези ингибитори (бензоилмочевина)", moa_ru: "Ингибитор синтеза хитина (бензоилмочевина)" },
    { m: ["propargit"], system: "IRAC", group: "12C", moa_uz: "Митохондрия ATФ синтаза ингибитори", moa_ru: "Ингибитор АТФ-синтазы" },
    { m: ["piridaben","fenpiroksimat","tebufenpirad"], system: "IRAC", group: "21A", moa_uz: "Митохондрия комплекс I ингибитори (METI)", moa_ru: "Ингибитор комплекса I (METI)" },
    { m: ["spirodiklofen"], system: "IRAC", group: "23", moa_uz: "Липид синтези ингибитори", moa_ru: "Ингибитор синтеза липидов" },
    { m: ["xlorantraniliprol","flubendiamid"], system: "IRAC", group: "28", moa_uz: "Рианодин рецептори модулятори (диамид)", moa_ru: "Модулятор рианодиновых рецепторов (диамид)" },
    { m: ["bacillus thuringiensis","btk"], system: "IRAC", group: "11", moa_uz: "Микроб токсинлари (Bt)", moa_ru: "Микробные токсины (Bt)" },

    // --- FRAC (фунгицид) ---
    { m: ["tebukonazol","propikonazol","difenokonazol","tsiprokonazol","epoksikonazol","heksakonazol","penkonazol","flutriafol","triadimefon"], system: "FRAC", group: "3 (DMI)", moa_uz: "Стерол биосинтези ингибитори (триазол, DMI)", moa_ru: "Ингибитор биосинтеза стеролов (триазол, DMI)" },
    { m: ["azoksistrobin","pikoksistrobin","piraklostrobin","krezoksim","kresoksim","trifloksistrobin"], system: "FRAC", group: "11 (QoI)", moa_uz: "Митохондрия нафас олиши ингибитори (стробилурин, QoI)", moa_ru: "Ингибитор дыхания (стробилурин, QoI)" },
    { m: ["metalaksil","mefenoksam"], system: "FRAC", group: "4", moa_uz: "РНК синтези ингибитори (фениламид)", moa_ru: "Ингибитор синтеза РНК (фениламид)" },
    { m: ["karbendazim","benomil","tiofanat"], system: "FRAC", group: "1 (MBC)", moa_uz: "β-тубулин йиғилиши ингибитори (бензимидазол)", moa_ru: "Ингибитор сборки β-тубулина (бензимидазол)" },
    { m: ["boskalid","fluopiram","pentiopirad"], system: "FRAC", group: "7 (SDHI)", moa_uz: "Сукцинат дегидрогеназа ингибитори (SDHI)", moa_ru: "Ингибитор сукцинатдегидрогеназы (SDHI)" },
    { m: ["simoksanil"], system: "FRAC", group: "27", moa_uz: "Цианоацетамид-оксим", moa_ru: "Цианоацетамид-оксим" },
    { m: ["mankotseb","metiram","propineb"], system: "FRAC", group: "M03", moa_uz: "Кўп нуқтали контакт (дитиокарбамат)", moa_ru: "Многосайтовый контактный (дитиокарбамат)" },
    { m: ["xlorotalonil"], system: "FRAC", group: "M05", moa_uz: "Кўп нуқтали контакт (хлорнитрил)", moa_ru: "Многосайтовый контактный (хлорнитрил)" },
    { m: ["mis ","mis,","mis.","kuprum","bordo"], system: "FRAC", group: "M01", moa_uz: "Кўп нуқтали контакт (мис бирикмалари)", moa_ru: "Многосайтовый контактный (медь)" },
    { m: ["oltingugurt","sera","sulfur"], system: "FRAC", group: "M02", moa_uz: "Кўп нуқтали контакт (олтингугурт)", moa_ru: "Многосайтовый контактный (сера)" },

    // --- HRAC (гербицид) ---
    { m: ["glifosat"], system: "HRAC", group: "9", moa_uz: "EPSP синтаза ингибитори (глифосат)", moa_ru: "Ингибитор EPSP-синтазы (глифосат)" },
    { m: ["fenoksaprop","fluazifop","haloksifop","kletodim","kvizalofop","propakvizafop"], system: "HRAC", group: "1", moa_uz: "ACCase ингибитори (FOP/DIM)", moa_ru: "Ингибитор ACCase (FOP/DIM)" },
    { m: ["tribenuron","metsulfuron","nikosulfuron","sulfosulfuron","imazetapir","imazamoks","florasulam","xlorsulfuron"], system: "HRAC", group: "2", moa_uz: "ALS (ацетолактат синтаза) ингибитори", moa_ru: "Ингибитор ALS (ацетолактатсинтазы)" },
    { m: ["2,4-d","mtspa","mcpa","dikamba","fluroksipir","klopiralid","aminopiralid"], system: "HRAC", group: "4", moa_uz: "Синтетик ауксин", moa_ru: "Синтетический ауксин" },
    { m: ["metribuzin","prometrin","izoproturon","diuron","atrazin"], system: "HRAC", group: "5", moa_uz: "Фотосистема II ингибитори (триазин/мочевина)", moa_ru: "Ингибитор фотосистемы II (триазин/мочевина)" },
    { m: ["bentazon"], system: "HRAC", group: "6", moa_uz: "Фотосистема II ингибитори (бентазон)", moa_ru: "Ингибитор фотосистемы II (бентазон)" },
    { m: ["pendimetalin","trifluralin"], system: "HRAC", group: "3", moa_uz: "Микротубула йиғилиши ингибитори (динитроанилин)", moa_ru: "Ингибитор сборки микротрубочек (динитроанилин)" },
    { m: ["metolaxlor","s-metolaxlor","atsetoxlor"], system: "HRAC", group: "15", moa_uz: "Узун занжирли ёғ кислоталари синтези ингибитори (VLCFA)", moa_ru: "Ингибитор синтеза VLCFA" },
    { m: ["oksifluorfen"], system: "HRAC", group: "14", moa_uz: "PPO (протопорфириноген оксидаза) ингибитори", moa_ru: "Ингибитор PPO" },
    { m: ["glyufosinat","glufosinat"], system: "HRAC", group: "10", moa_uz: "Глутамин синтетаза ингибитори", moa_ru: "Ингибитор глутаминсинтетазы" },
    { m: ["dikvat"], system: "HRAC", group: "22", moa_uz: "Фотосистема I электрон ўғриси (дикват)", moa_ru: "Отвод электронов фотосистемы I (дикват)" },
    { m: ["mesotrion","topramezon"], system: "HRAC", group: "27", moa_uz: "HPPD ингибитори", moa_ru: "Ингибитор HPPD" },
    { m: ["diflufenikan"], system: "HRAC", group: "12", moa_uz: "PDS (каротиноид) синтези ингибитори", moa_ru: "Ингибитор синтеза каротиноидов (PDS)" }
  ];

  var SYSTEM_INFO = {
    IRAC: { uz: "IRAC — Инсектицидлар резистентлигини бошқариш қўмитаси", ru: "IRAC — Комитет по борьбе с резистентностью к инсектицидам" },
    FRAC: { uz: "FRAC — Фунгицидлар резистентлигини бошқариш қўмитаси", ru: "FRAC — Комитет по борьбе с резистентностью к фунгицидам" },
    HRAC: { uz: "HRAC — Гербицидлар резистентлигини бошқариш қўмитаси", ru: "HRAC — Комитет по борьбе с резистентностью к гербицидам" }
  };

  function lookup(ai) {
    var n = norm(ai);
    if (!n) return null;
    for (var i = 0; i < DB.length; i++) {
      for (var j = 0; j < DB[i].m.length; j++) {
        var key = DB[i].m[j].replace(/ph/g, "f").replace(/ck/g, "k");
        if (n.indexOf(key.trim()) >= 0) return DB[i];
      }
    }
    return null;
  }

  window.MOA = { lookup: lookup, systemInfo: SYSTEM_INFO, db: DB };
})();
