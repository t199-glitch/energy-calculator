// ──────────────────────────────────────────────
// 計算引擎：所有計算皆在瀏覽器端以明確公式完成
//
// 1. 電器耗電量（kWh）＝ 輸入功率（kW）× 每日使用時間（h）× 平均負載比例 ÷ 分攤人數
// 2. 功率以 W 表示時先 ÷ 1000 換算為 kW
// 3. 電能換算：1 kWh = 3.6 MJ
// 4. 燃料能源量（MJ）＝ 燃料消耗量 × 該燃料熱值
// 5. 每日能源總量（MJ）＝ 所有納入計算之「終端能源」加總（不與一次能源相加）
// ──────────────────────────────────────────────
import type {
  ActivityResult, Appliance, Category, CarrierKey, CarrierTotal, FuelItem, Inputs, KnownEnergy, Results, TransportItem,
} from '../types';
import { LIMITS, P, type LimitKey } from '../data/parameters';
import { CARRIERS, CARRIER_ORDER, TRANSPORT_META } from '../data/meta';
import { fmt } from './format';

/** 將任何輸入清理為有效數值：非數字→0，並限制在合理範圍內 */
export const safe = (v: unknown, limit: LimitKey): number => {
  const n = typeof v === 'number' ? v : Number(v);
  const { min, max } = LIMITS[limit];
  if (!Number.isFinite(n)) return min > 0 ? min : 0;
  return Math.min(max, Math.max(min, n));
};

const KWH = () => P('kwhToMJ');

function calcAppliance(a: Appliance, category: Category): ActivityResult {
  const isKw = a.powerUnit === 'kW';
  const power = safe(a.powerValue, isKw ? 'powerKw' : 'powerW');
  const kw = isKw ? power : power / 1000;
  const hours = safe(a.hours, 'hours');
  const load = safe(a.loadPercent, 'loadPercent') / 100;
  const share = safe(a.share, 'share');
  const kwh = (kw * hours * load) / share;
  const powerText = isKw ? `${fmt(power)} kW` : `${fmt(power)} W ÷ 1000 = ${fmt(kw, 3)} kW`;
  const loadText = load < 1 ? ` × ${fmt(load * 100)}%` : '';
  const shareText = share > 1 ? ` ÷ ${share} 人` : '';
  return {
    id: a.id,
    name: a.name || '未命名電器',
    category,
    carrier: 'electricity',
    shared: false,
    inputSummary: `${fmt(power)} ${a.powerUnit}・${fmt(hours)} 小時${load < 1 ? `・負載 ${fmt(load * 100)}%` : ''}${share > 1 ? `・${share} 人分攤` : ''}`,
    quantity: kwh,
    quantityUnit: 'kWh',
    energyMJ: kwh * KWH(),
    formula: `(${powerText}) × ${fmt(hours)} h${loadText}${shareText} = ${fmt(kwh, 3)} kWh；× 3.6 = ${fmt(kwh * KWH())} MJ`,
    driver: `功率 ${fmt(power)} ${a.powerUnit}、每日使用 ${fmt(hours)} 小時${load < 1 ? `、平均負載 ${fmt(load * 100)}%` : ''}`,
  };
}

function calcPhone(inputs: Inputs): ActivityResult | null {
  const p = inputs.phone;
  if (!p.enabled) return null;
  const wh = safe(p.whPerCharge, 'phoneWh');
  const n = safe(p.chargesPerDay, 'phoneCharges');
  const kwh = (wh * n) / 1000;
  return {
    id: 'phone',
    name: '手機充電',
    category: 'electricity',
    carrier: 'electricity',
    shared: false,
    inputSummary: `${fmt(wh)} Wh／次・每日 ${fmt(n)} 次`,
    quantity: kwh,
    quantityUnit: 'kWh',
    energyMJ: kwh * KWH(),
    formula: `${fmt(wh)} Wh × ${fmt(n)} 次 ÷ 1000 = ${fmt(kwh, 4)} kWh；× 3.6 = ${fmt(kwh * KWH(), 3)} MJ`,
    driver: `每次充電 ${fmt(wh)} Wh、每日 ${fmt(n)} 次`,
  };
}

/** 平均每日行駛距離（公里） */
export const dailyDistance = (t: TransportItem): number => {
  const d = safe(t.distance, 'distance');
  const days = safe(t.daysPerWeek, 'daysPerWeek');
  return d * (t.distanceMode === 'oneway' ? 2 : 1) * (days / 7);
};

function calcTransport(t: TransportItem): ActivityResult {
  const meta = TRANSPORT_META[t.kind];
  const rawD = safe(t.distance, 'distance');
  const days = safe(t.daysPerWeek, 'daysPerWeek');
  const km = dailyDistance(t);
  const distText = `${fmt(rawD)} km${t.distanceMode === 'oneway' ? ' × 2（單程→往返）' : '（往返）'} × ${days}/7 天 = ${fmt(km)} km/日`;
  const occ = meta.privateVehicle ? safe(t.occupants, 'occupants') : 1;
  const occText = occ > 1 ? ` ÷ ${occ} 人共乘` : '';
  const summary = `${t.distanceMode === 'oneway' ? '單程' : '往返'} ${fmt(rawD)} km・每週 ${days} 天${occ > 1 ? `・${occ} 人共乘` : ''}`;
  const base = { id: t.id, name: t.name || meta.label, category: 'transport' as Category, carrier: meta.carrier, inputSummary: summary };

  switch (meta.method) {
    case 'fuel': {
      const eff = safe(t.efficiency, 'kmPerL');
      const liters = km / eff / occ;
      const hv = meta.carrier === 'diesel' ? P('dieselHV') : P('gasolineHV');
      return {
        ...base, shared: false, quantity: liters, quantityUnit: 'L', energyMJ: liters * hv,
        inputSummary: `${summary}・${fmt(eff)} km/L`,
        formula: `${distText}；${fmt(km)} km ÷ ${fmt(eff)} km/L${occText} = ${fmt(liters, 3)} L；× ${fmt(hv)} MJ/L = ${fmt(liters * hv)} MJ`,
        driver: `平均每日行駛 ${fmt(km)} 公里、燃油效率 ${fmt(eff)} km/L`,
      };
    }
    case 'ev': {
      const eff = safe(t.efficiency, 'kwhPerKm');
      const kwh = (km * eff) / occ;
      return {
        ...base, shared: false, quantity: kwh, quantityUnit: 'kWh', energyMJ: kwh * KWH(),
        inputSummary: `${summary}・${fmt(eff, 3)} kWh/km`,
        formula: `${distText}；${fmt(km)} km × ${fmt(eff, 3)} kWh/km${occText} = ${fmt(kwh, 3)} kWh；× 3.6 = ${fmt(kwh * KWH())} MJ`,
        driver: `平均每日行駛 ${fmt(km)} 公里、每公里耗電 ${fmt(eff, 3)} kWh`,
      };
    }
    case 'sharedMJ': {
      const eff = safe(t.efficiency, 'mjPerPkm');
      const mj = km * eff;
      const liters = mj / P('dieselHV');
      return {
        ...base, shared: true, quantity: liters, quantityUnit: 'L', energyMJ: mj,
        inputSummary: `${summary}・${fmt(eff, 2)} MJ/人·km`,
        formula: `${distText}；${fmt(km)} 人·km × ${fmt(eff, 2)} MJ/人·km = ${fmt(mj)} MJ（約 ${fmt(liters, 3)} L 柴油，個人分攤）`,
        driver: `平均每日搭乘 ${fmt(km)} 公里、每人每公里分攤 ${fmt(eff, 2)} MJ`,
      };
    }
    case 'sharedKWh': {
      const eff = safe(t.efficiency, 'kwhPerPkm');
      const kwh = km * eff;
      return {
        ...base, shared: true, quantity: kwh, quantityUnit: 'kWh', energyMJ: kwh * KWH(),
        inputSummary: `${summary}・${fmt(eff, 3)} kWh/人·km`,
        formula: `${distText}；${fmt(km)} 人·km × ${fmt(eff, 3)} kWh/人·km = ${fmt(kwh, 3)} kWh；× 3.6 = ${fmt(kwh * KWH())} MJ（個人分攤）`,
        driver: `平均每日搭乘 ${fmt(km)} 公里、每人每公里分攤 ${fmt(eff, 3)} kWh`,
      };
    }
    default:
      return {
        ...base, carrier: 'otherFuel', shared: false, quantity: 0, quantityUnit: 'MJ', energyMJ: 0,
        formula: `${distText}；不使用外部燃料或電力，記為 0 MJ`,
        driver: '不使用外部燃料或電力',
        note: '本工具不計算人體代謝能耗（食物熱量）。',
      };
  }
}

/** 計算燃料每人每日用量（原生單位） */
export function fuelDailyQuantity(f: FuelItem): { qty: number; steps: string } {
  const hh = safe(f.householdSize, 'household');
  const hv = safe(f.heatValueMJ, 'heatValue');
  const hhText = hh > 1 ? ` ÷ ${hh} 人` : '';
  switch (f.mode) {
    case 'daily': {
      const a = safe(f.dailyAmount, 'fuelDaily');
      return { qty: a / hh, steps: `每日 ${fmt(a, 3)} ${f.unit}${hhText}` };
    }
    case 'monthly': {
      const m = safe(f.monthlyAmount, 'fuelMonthly');
      if (f.kind === 'lpg') {
        const kg = safe(f.cylinderKg, 'cylinderKg');
        return { qty: (m * kg) / 30 / hh, steps: `每月 ${fmt(m, 2)} 桶 × ${fmt(kg)} kg ÷ 30 天${hhText}` };
      }
      const unitName = f.kind === 'naturalGas' ? '度（m³）' : f.unit;
      return { qty: m / 30 / hh, steps: `每月 ${fmt(m, 2)} ${unitName} ÷ 30 天${hhText}` };
    }
    case 'equipment': {
      const kw = safe(f.equipmentKw, 'equipmentKw');
      const h = safe(f.equipmentHours, 'hours');
      const mj = kw * h * P('kwhToMJ');
      return {
        qty: mj / hv / hh,
        steps: `設備 ${fmt(kw)} kW × ${fmt(h)} h × 3.6 = ${fmt(mj)} MJ ÷ ${fmt(hv)} MJ/${f.unit}${hhText}`,
      };
    }
  }
}

function calcFuel(f: FuelItem, category: Category): ActivityResult {
  const hv = safe(f.heatValueMJ, 'heatValue');
  const adj = safe(f.adjustPercent, 'adjustPercent') / 100;
  const { qty: q0, steps } = fuelDailyQuantity(f);
  const qty = q0 * adj;
  const adjText = adj !== 1 ? ` × 情境調整 ${fmt(adj * 100)}%` : '';
  const modeText = f.mode === 'daily' ? '每日實際用量' : f.mode === 'monthly' ? '每月帳單分攤' : '依設備功率估算';
  return {
    id: f.id,
    name: f.name || '未命名燃料',
    category,
    carrier: f.carrier,
    shared: false,
    inputSummary: `${modeText}・${steps}`,
    quantity: qty,
    quantityUnit: f.unit,
    energyMJ: qty * hv,
    formula: `${steps}${adjText} = ${fmt(qty, 3)} ${f.unit}/日；× 熱值 ${fmt(hv)} MJ/${f.unit} = ${fmt(qty * hv)} MJ`,
    driver: `每人每日約 ${fmt(qty, 3)} ${f.unit}（${modeText}），熱值 ${fmt(hv)} MJ/${f.unit}`,
  };
}

function calcKnown(k: KnownEnergy): ActivityResult {
  const v = safe(k.value, 'knownEnergy');
  const adj = safe(k.adjustPercent, 'adjustPercent') / 100;
  const val = v * adj;
  const mj = k.unit === 'kWh' ? val * KWH() : val;
  const adjText = adj !== 1 ? ` × 情境調整 ${fmt(adj * 100)}%` : '';
  return {
    id: k.id,
    name: k.name || '其他已知能源',
    category: 'other',
    carrier: k.carrier,
    shared: false,
    inputSummary: `${fmt(v)} ${k.unit}／日・${CARRIERS[k.carrier].label}`,
    quantity: k.unit === 'kWh' ? val : mj,
    quantityUnit: k.unit === 'kWh' ? 'kWh' : 'MJ',
    energyMJ: mj,
    formula: k.unit === 'kWh' ? `${fmt(v)} kWh${adjText} × 3.6 = ${fmt(mj)} MJ` : `${fmt(v)} MJ${adjText}（直接輸入能源量）`,
    driver: `使用者直接輸入之已知能源量 ${fmt(v)} ${k.unit}`,
  };
}

export function calculate(inputs: Inputs): Results {
  const acts: ActivityResult[] = [];

  inputs.appliances.filter((a) => a.enabled).forEach((a) => acts.push(calcAppliance(a, 'electricity')));
  const phone = calcPhone(inputs);
  if (phone) acts.push(phone);
  inputs.transport.filter((t) => t.enabled).forEach((t) => acts.push(calcTransport(t)));
  inputs.cooking.filter((f) => f.enabled).forEach((f) => acts.push(calcFuel(f, 'cooking')));
  inputs.otherAppliances.filter((a) => a.enabled).forEach((a) => acts.push(calcAppliance(a, 'other')));
  inputs.otherFuels.filter((f) => f.enabled).forEach((f) => acts.push(calcFuel(f, 'other')));
  inputs.knownEnergy.filter((k) => k.enabled).forEach((k) => acts.push(calcKnown(k)));

  const included = (a: ActivityResult) => !a.shared || inputs.includeShared;

  const directMJ = acts.filter((a) => !a.shared).reduce((s, a) => s + a.energyMJ, 0);
  const sharedMJ = acts.filter((a) => a.shared).reduce((s, a) => s + a.energyMJ, 0);
  const directKWh = acts.filter((a) => !a.shared && a.quantityUnit === 'kWh').reduce((s, a) => s + a.quantity, 0);
  const sharedKWh = acts.filter((a) => a.shared && a.quantityUnit === 'kWh').reduce((s, a) => s + a.quantity, 0);
  const totalMJ = directMJ + (inputs.includeShared ? sharedMJ : 0);

  const byCarrier: CarrierTotal[] = CARRIER_ORDER.map((c: CarrierKey) => {
    const list = acts.filter((a) => a.carrier === c && included(a));
    const mj = list.reduce((s, a) => s + a.energyMJ, 0);
    const meta = CARRIERS[c];
    // 以原生單位統計（若使用者自訂單位不同，改以熱值反推標準單位）
    const quantity =
      c === 'otherFuel' ? mj : meta.hvParam ? mj / P(meta.hvParam) : mj;
    return { carrier: c, mj, quantity, unit: meta.unit };
  });

  return {
    activities: acts,
    totalMJ,
    directMJ,
    sharedMJ,
    directKWh,
    sharedKWh,
    byCarrier,
    weeklyMJ: totalMJ * 7,
    monthlyMJ: totalMJ * 30,
    includeShared: inputs.includeShared,
  };
}

/** 結果中計入總量的活動（排除未納入的大眾運輸分攤） */
export const countedActivities = (r: Results) => r.activities.filter((a) => a.energyMJ > 0 && (!a.shared || r.includeShared));
