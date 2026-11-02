// ──────────────────────────────────────────────
// 集中管理的能源參數
// 所有預設值都在此檔案，元件中不另外寫死數值。
// 使用者輸入的數值一律優先於這裡的預設值。
// ──────────────────────────────────────────────

export type SourceType =
  /** 引用自官方公告之換算值（使用前仍建議核對最新版本） */
  | 'official'
  /** 物理定義或國際通用換算 */
  | 'definition'
  /** 教學示範值：依常見產品規格或文獻整理之合理估計，非官方統計 */
  | 'demo';

export interface EnergyParam {
  key: string;
  /** 參數名稱 */
  name: string;
  /** 數值 */
  value: number;
  /** 單位 */
  unit: string;
  /** 參數用途 */
  purpose: string;
  /** 參考來源或資料依據 */
  source: string;
  /** 參考資料年度 */
  year: string;
  /** 來源類型 */
  sourceType: SourceType;
  /** 是否為示範值 */
  isDemo: boolean;
  /** 估算範圍 [下限, 上限] */
  range?: [number, number];
  /** 不確定性或使用說明 */
  note?: string;
}

const KCAL_TO_MJ = 4.1868 / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

const DEMO_SOURCE =
  '教學示範值：依市售產品標示規格與一般文獻常見範圍整理，非官方統計，請依實際產品標示修改';

export const PARAMS = {
  // ── 單位換算 ─────────────────────────────
  kwhToMJ: {
    key: 'kwhToMJ',
    name: '電能換算係數',
    value: 3.6,
    unit: 'MJ / kWh',
    purpose: '將用電量（kWh，度）換算為能源量（MJ）',
    source: '國際單位制定義：1 kWh = 3,600,000 J = 3.6 MJ',
    year: '—',
    sourceType: 'definition',
    isDemo: false,
  },
  kcalToMJ: {
    key: 'kcalToMJ',
    name: '熱量單位換算',
    value: KCAL_TO_MJ,
    unit: 'MJ / kcal',
    purpose: '將以千卡（kcal）公告的燃料熱值換算為 MJ',
    source: '國際蒸汽表卡（IT cal）：1 kcal = 4.1868 kJ',
    year: '—',
    sourceType: 'definition',
    isDemo: false,
  },

  // ── 燃料熱值 ─────────────────────────────
  gasolineHV: {
    key: 'gasolineHV',
    name: '車用汽油熱值',
    value: round2(7800 * KCAL_TO_MJ),
    unit: 'MJ / L',
    purpose: '機車、汽油汽車的燃料量換算為能源量',
    source: '經濟部能源署「能源產品單位熱值表」車用汽油 7,800 kcal/L（使用前請核對最新公告）',
    year: '能源署現行熱值表',
    sourceType: 'official',
    isDemo: false,
    range: [32.0, 33.5],
    note: '熱值依油品組成略有差異。',
  },
  dieselHV: {
    key: 'dieselHV',
    name: '柴油熱值',
    value: round2(8400 * KCAL_TO_MJ),
    unit: 'MJ / L',
    purpose: '柴油汽車、公車的燃料量換算為能源量',
    source: '經濟部能源署「能源產品單位熱值表」柴油 8,400 kcal/L（使用前請核對最新公告）',
    year: '能源署現行熱值表',
    sourceType: 'official',
    isDemo: false,
    range: [34.5, 36.0],
  },
  naturalGasHV: {
    key: 'naturalGasHV',
    name: '天然氣熱值',
    value: round2(9000 * KCAL_TO_MJ),
    unit: 'MJ / m³（度）',
    purpose: '家用天然氣用量（度＝立方公尺）換算為能源量',
    source:
      '依經濟部能源署熱值表液化天然氣約 9,000 kcal/m³ 估算；各地天然氣公司供氣熱值略有不同',
    year: '能源署現行熱值表',
    sourceType: 'official',
    isDemo: false,
    range: [35.5, 40.0],
    note: '各縣市天然氣公司的供氣熱值不同，可參考帳單上的標示熱值修改。',
  },
  lpgHV: {
    key: 'lpgHV',
    name: '液化石油氣（LPG）熱值',
    value: round2(12000 * KCAL_TO_MJ),
    unit: 'MJ / kg',
    purpose: '桶裝瓦斯用量（kg）換算為能源量',
    source: '經濟部能源署「能源產品單位熱值表」液化石油氣 12,000 kcal/kg（使用前請核對最新公告）',
    year: '能源署現行熱值表',
    sourceType: 'official',
    isDemo: false,
    range: [46.0, 50.5],
  },
  lpgCylinderKg: {
    key: 'lpgCylinderKg',
    name: '家用桶裝瓦斯每桶重量',
    value: 20,
    unit: 'kg / 桶',
    purpose: '將每月使用桶數換算為公斤',
    source: '臺灣家用桶裝瓦斯常見規格（另有 4、16、50 kg 等規格）',
    year: '—',
    sourceType: 'demo',
    isDemo: true,
    range: [4, 50],
  },
  stoveKw: {
    key: 'stoveKw',
    name: '家用瓦斯爐熱輸入功率（單口）',
    value: 3.0,
    unit: 'kW',
    purpose: '「依設備功率估算」模式中，推算燃料用量',
    source: DEMO_SOURCE,
    year: '—',
    sourceType: 'demo',
    isDemo: true,
    range: [2.0, 4.7],
    note: '瓦斯爐常以 kcal/h 標示，1 kW ≈ 860 kcal/h。實際使用多為中小火，平均熱輸入低於標示值。',
  },
  charcoalHV: {
    key: 'charcoalHV',
    name: '木炭熱值',
    value: 28,
    unit: 'MJ / kg',
    purpose: '自訂燃料：烤肉、傳統爐具',
    source: DEMO_SOURCE,
    year: '—',
    sourceType: 'demo',
    isDemo: true,
    range: [26, 31],
  },
  butaneHV: {
    key: 'butaneHV',
    name: '卡式瓦斯罐（丁烷）熱值',
    value: 49,
    unit: 'MJ / kg',
    purpose: '自訂燃料：卡式爐、露營爐',
    source: DEMO_SOURCE,
    year: '—',
    sourceType: 'demo',
    isDemo: true,
    range: [45, 50],
  },

  // ── 家庭電器（示範值） ─────────────────────
  acPowerKw: {
    key: 'acPowerKw',
    name: '冷氣額定輸入功率',
    value: 0.9,
    unit: 'kW',
    purpose: '冷氣耗電量估算',
    source: `${DEMO_SOURCE}；約對應冷房能力 2.8 kW 的分離式冷氣`,
    year: '—',
    sourceType: 'demo',
    isDemo: true,
    range: [0.4, 3.0],
    note: '請看冷氣室外機或說明書上的「額定冷氣消耗電功率」，不是「冷氣能力」。',
  },
  acLoadPercent: {
    key: 'acLoadPercent',
    name: '冷氣平均負載比例',
    value: 60,
    unit: '%',
    purpose: '修正壓縮機並非全程以額定功率運轉',
    source: DEMO_SOURCE,
    year: '—',
    sourceType: 'demo',
    isDemo: true,
    range: [30, 100],
    note: '變頻冷氣在室溫接近設定溫度後會降頻運轉；定頻冷氣會啟停循環。室外溫度愈高、設定溫度愈低，平均負載愈高。',
  },
  acHours: {
    key: 'acHours', name: '冷氣每日使用時間', value: 6, unit: '小時', purpose: '預設使用時間',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 24],
  },
  fanW: {
    key: 'fanW', name: '電風扇功率', value: 35, unit: 'W', purpose: '電風扇耗電量估算',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [15, 70],
    note: 'DC 直流扇約 15–30 W，傳統 AC 扇約 40–60 W。',
  },
  fanHours: {
    key: 'fanHours', name: '電風扇每日使用時間', value: 8, unit: '小時', purpose: '預設使用時間',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 24],
  },
  computerW: {
    key: 'computerW', name: '電腦／筆電平均功率', value: 50, unit: 'W', purpose: '電腦耗電量估算',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [15, 400],
    note: '筆電約 15–65 W；桌上型電腦加螢幕約 100–400 W（玩遊戲時較高）。',
  },
  computerHours: {
    key: 'computerHours', name: '電腦每日使用時間', value: 3, unit: '小時', purpose: '預設使用時間',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 24],
  },
  tvW: {
    key: 'tvW', name: '電視功率', value: 100, unit: 'W', purpose: '電視耗電量估算',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [40, 300],
    note: '依尺寸與面板而異，可參考能源效率標示。',
  },
  tvHours: {
    key: 'tvHours', name: '電視每日使用時間', value: 2, unit: '小時', purpose: '預設使用時間',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 24],
  },
  phoneWh: {
    key: 'phoneWh', name: '手機每次充電耗電量', value: 18, unit: 'Wh', purpose: '手機充電耗電量估算',
    source: `${DEMO_SOURCE}；約為 4,500 mAh 電池容量加上充電損失`,
    year: '—', sourceType: 'demo', isDemo: true, range: [8, 35],
    note: '電池容量（Wh）≈ mAh × 3.85 V ÷ 1000，充電器另有約 10–20% 損失。',
  },
  phoneCharges: {
    key: 'phoneCharges', name: '手機每日充電次數', value: 1, unit: '次', purpose: '預設充電次數',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 5],
  },
  waterHeaterKw: {
    key: 'waterHeaterKw', name: '電熱水器功率', value: 4, unit: 'kW', purpose: '電熱水器耗電量估算',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [1.5, 9],
    note: '儲熱式電熱水器常見 3–6 kW；瞬熱式可達 6–9 kW。',
  },
  waterHeaterHours: {
    key: 'waterHeaterHours', name: '電熱水器每日加熱時間', value: 1, unit: '小時',
    purpose: '加熱元件實際通電時間（非熱水器插電時間）',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 12],
  },
  riceCookerW: {
    key: 'riceCookerW', name: '電鍋功率', value: 800, unit: 'W', purpose: '電鍋耗電量估算',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [300, 1500],
  },
  riceCookerHours: {
    key: 'riceCookerHours', name: '電鍋每日使用時間', value: 0.5, unit: '小時', purpose: '預設使用時間',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 6],
  },
  microwaveW: {
    key: 'microwaveW', name: '微波爐輸入功率', value: 1200, unit: 'W',
    purpose: '微波爐耗電量估算（輸入功率高於標示的微波輸出功率）',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [700, 2000],
  },
  microwaveHours: {
    key: 'microwaveHours', name: '微波爐每日使用時間', value: 0.1, unit: '小時', purpose: '預設使用時間（6 分鐘）',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0, 3],
  },
  customApplianceW: {
    key: 'customApplianceW', name: '自訂電器預設功率', value: 100, unit: 'W', purpose: '新增電器時的起始值',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true,
  },

  // ── 交通能源效率（示範值） ─────────────────
  scooterKmL: {
    key: 'scooterKmL', name: '機車燃油效率', value: 40, unit: 'km / L', purpose: '機車耗油量估算',
    source: `${DEMO_SOURCE}；125 cc 機車實際道路油耗常見範圍`,
    year: '—', sourceType: 'demo', isDemo: true, range: [25, 60],
    note: '官方測試值通常高於實際道路油耗，可依實際加油紀錄修改。',
  },
  gasCarKmL: {
    key: 'gasCarKmL', name: '汽油汽車燃油效率', value: 12, unit: 'km / L', purpose: '汽油汽車耗油量估算',
    source: `${DEMO_SOURCE}；可參考能源署「車輛耗能資訊」查詢各車型`,
    year: '—', sourceType: 'demo', isDemo: true, range: [6, 25],
    note: '油電混合車可達 20 km/L 以上；市區走走停停會降低效率。',
  },
  dieselCarKmL: {
    key: 'dieselCarKmL', name: '柴油汽車燃油效率', value: 14, unit: 'km / L', purpose: '柴油汽車耗油量估算',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [8, 22],
  },
  eScooterKwhKm: {
    key: 'eScooterKwhKm', name: '電動機車單位距離耗電', value: 0.03, unit: 'kWh / km',
    purpose: '電動機車用電量估算（含充電損失）',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0.02, 0.06],
  },
  eCarKwhKm: {
    key: 'eCarKwhKm', name: '電動汽車單位距離耗電', value: 0.16, unit: 'kWh / km',
    purpose: '電動汽車用電量估算（含充電損失）',
    source: DEMO_SOURCE, year: '—', sourceType: 'demo', isDemo: true, range: [0.12, 0.25],
  },
  busMJpkm: {
    key: 'busMJpkm', name: '公車每人每公里能源（個人分攤）', value: 0.8, unit: 'MJ / 人·km',
    purpose: '以「個人分攤」方式估算搭乘柴油公車的能源',
    source: `${DEMO_SOURCE}；以柴油公車油耗與平均載客人數推估`,
    year: '—', sourceType: 'demo', isDemo: true, range: [0.4, 2.0],
    note: '高度取決於載客率：尖峰滿載時每人分攤很低，離峰空車時很高。電動公車可改用「其他已知能源」輸入。',
  },
  metroKwhPkm: {
    key: 'metroKwhPkm', name: '捷運／火車每人每公里用電（個人分攤）', value: 0.03, unit: 'kWh / 人·km',
    purpose: '以「個人分攤」方式估算搭乘電聯車的能源',
    source: `${DEMO_SOURCE}；以都會捷運系統年用電量與旅客人公里推估之量級`,
    year: '—', sourceType: 'demo', isDemo: true, range: [0.015, 0.07],
    note: '包含列車牽引用電，不含車站空調照明等設施用電；不同路線與載客率差異大。',
  },
} satisfies Record<string, EnergyParam>;

export type ParamKey = keyof typeof PARAMS;

/** 取得參數數值 */
export const P = (key: ParamKey): number => PARAMS[key].value;

/** 欄位驗證的合理上限（防止極端值）與「偏高提醒」門檻 */
export const LIMITS = {
  hours: { min: 0, max: 24, warn: 16 },
  powerW: { min: 0, max: 10000, warn: 3000 },
  powerKw: { min: 0, max: 15, warn: 6 },
  loadPercent: { min: 0, max: 100, warn: 100 },
  share: { min: 1, max: 50, warn: 20 },
  phoneWh: { min: 0, max: 200, warn: 60 },
  phoneCharges: { min: 0, max: 20, warn: 5 },
  distance: { min: 0, max: 500, warn: 150 },
  daysPerWeek: { min: 0, max: 7, warn: 7 },
  kmPerL: { min: 1, max: 100, warn: 70 },
  kwhPerKm: { min: 0.005, max: 1, warn: 0.4 },
  mjPerPkm: { min: 0.01, max: 10, warn: 3 },
  kwhPerPkm: { min: 0.001, max: 0.5, warn: 0.1 },
  occupants: { min: 1, max: 60, warn: 8 },
  fuelDaily: { min: 0, max: 100, warn: 5 },
  fuelMonthly: { min: 0, max: 2000, warn: 150 },
  cylinderKg: { min: 1, max: 50, warn: 50 },
  equipmentKw: { min: 0, max: 30, warn: 8 },
  household: { min: 1, max: 50, warn: 20 },
  heatValue: { min: 0.1, max: 200, warn: 60 },
  knownEnergy: { min: 0, max: 5000, warn: 500 },
  adjustPercent: { min: 0, max: 300, warn: 200 },
} as const;

export type LimitKey = keyof typeof LIMITS;
