// ──────────────────────────────────────────────
// 型別定義：使用者輸入資料與計算結果
// ──────────────────────────────────────────────

/** 能源載體（終端能源的形式） */
export type CarrierKey = 'electricity' | 'gasoline' | 'diesel' | 'naturalGas' | 'lpg' | 'otherFuel';

/** 輸入類別 */
export type Category = 'electricity' | 'transport' | 'cooking' | 'other';

export type ApplianceKind =
  | 'ac'
  | 'fan'
  | 'computer'
  | 'tv'
  | 'waterHeater'
  | 'riceCooker'
  | 'microwave'
  | 'custom';

export interface Appliance {
  id: string;
  kind: ApplianceKind;
  name: string;
  enabled: boolean;
  /** 輸入功率數值 */
  powerValue: number;
  powerUnit: 'W' | 'kW';
  /** 每日使用時間（小時） */
  hours: number;
  /** 平均負載比例（%），一般電器為 100 */
  loadPercent: number;
  /** 共同使用（分攤）人數 */
  share: number;
}

export interface PhoneCharging {
  enabled: boolean;
  /** 每次充電耗電量（Wh） */
  whPerCharge: number;
  /** 每日充電次數 */
  chargesPerDay: number;
}

export type TransportKind =
  | 'scooter'
  | 'gasCar'
  | 'dieselCar'
  | 'eScooter'
  | 'eCar'
  | 'bus'
  | 'metro'
  | 'active';

export interface TransportItem {
  id: string;
  kind: TransportKind;
  name: string;
  enabled: boolean;
  /** 距離（公里），依 distanceMode 解讀 */
  distance: number;
  distanceMode: 'oneway' | 'round';
  /** 每週使用天數（0–7），計算結果為「平均每日」 */
  daysPerWeek: number;
  /** 燃油效率（km/L）、單位耗電（kWh/km）或每人每公里能耗，依 kind 而定 */
  efficiency: number;
  /** 共乘人數（僅私人車輛） */
  occupants: number;
}

export type FuelMode = 'daily' | 'monthly' | 'equipment';

export interface FuelItem {
  id: string;
  kind: 'naturalGas' | 'lpg' | 'custom';
  name: string;
  enabled: boolean;
  mode: FuelMode;
  /** 能源載體（自訂燃料可選） */
  carrier: CarrierKey;
  /** 燃料計量單位，例如 m³、kg、L */
  unit: string;
  /** 單位熱值（MJ / 單位） */
  heatValueMJ: number;
  /** 每日實際用量（單位） */
  dailyAmount: number;
  /** 每月用量：天然氣為「度（m³）」，LPG 為「桶」，自訂為「單位」 */
  monthlyAmount: number;
  /** 每桶 LPG 重量（kg） */
  cylinderKg: number;
  /** 設備熱輸入功率（kW） */
  equipmentKw: number;
  /** 設備每日使用時間（小時） */
  equipmentHours: number;
  /** 家庭分攤人數 */
  householdSize: number;
  /** 情境調整倍率（%），主要資料預設為 100 */
  adjustPercent: number;
}

export interface KnownEnergy {
  id: string;
  name: string;
  enabled: boolean;
  value: number;
  unit: 'kWh' | 'MJ';
  carrier: CarrierKey;
  adjustPercent: number;
}

export interface Inputs {
  appliances: Appliance[];
  phone: PhoneCharging;
  transport: TransportItem[];
  cooking: FuelItem[];
  otherAppliances: Appliance[];
  otherFuels: FuelItem[];
  knownEnergy: KnownEnergy[];
  /** 總量是否納入大眾運輸個人分攤能源 */
  includeShared: boolean;
}

export interface ActivityResult {
  id: string;
  name: string;
  category: Category;
  carrier: CarrierKey;
  /** 是否為大眾運輸「個人分攤」能源（非個人直接購買） */
  shared: boolean;
  inputSummary: string;
  /** 以原生單位表示的消耗量 */
  quantity: number;
  quantityUnit: string;
  energyMJ: number;
  formula: string;
  /** 用於前三名解釋的主要影響參數描述 */
  driver: string;
  /** 不計能源的項目（步行／自行車）註記 */
  note?: string;
}

export interface CarrierTotal {
  carrier: CarrierKey;
  mj: number;
  /** 以原生單位統計（電力 kWh、汽油／柴油 L、天然氣 m³、LPG kg） */
  quantity: number;
  unit: string;
}

export interface Results {
  activities: ActivityResult[];
  totalMJ: number;
  directMJ: number;
  sharedMJ: number;
  directKWh: number;
  sharedKWh: number;
  byCarrier: CarrierTotal[];
  weeklyMJ: number;
  monthlyMJ: number;
  includeShared: boolean;
}
