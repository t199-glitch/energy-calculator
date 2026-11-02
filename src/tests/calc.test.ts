// 單元測試：直接測試 src/lib/calc.ts 與 analysis.ts 的實際程式
// 執行：npm test
import { describe, expect, it } from 'vitest';
import { calculate, safe, dailyDistance, fuelDailyQuantity, countedActivities } from '../lib/calc';
import { topThree, electricityBySource, primaryAttribution } from '../lib/analysis';
import { buildCsv } from '../lib/io';
import { createDefaultInputs, createDemoInputs } from '../data/defaults';
import { P } from '../data/parameters';
import type { Appliance, FuelItem, Inputs, TransportItem } from '../types';

/** 全部關閉的空白輸入，方便單獨測試某一項 */
function emptyInputs(): Inputs {
  const d = createDefaultInputs();
  return {
    ...d,
    appliances: [],
    phone: { ...d.phone, enabled: false },
    transport: [],
    cooking: [],
    otherAppliances: [],
    otherFuels: [],
    knownEnergy: [],
    includeShared: true,
  };
}

const app = (p: Partial<Appliance>): Appliance => ({
  id: 'a', kind: 'custom', name: '測試電器', enabled: true,
  powerValue: 100, powerUnit: 'W', hours: 1, loadPercent: 100, share: 1, ...p,
});

const tr = (p: Partial<TransportItem>): TransportItem => ({
  id: 't', kind: 'scooter', name: '機車', enabled: true,
  distance: 10, distanceMode: 'round', daysPerWeek: 7, efficiency: 40, occupants: 1, ...p,
});

const fuel = (p: Partial<FuelItem>): FuelItem => ({
  id: 'f', kind: 'naturalGas', name: '天然氣', enabled: true, mode: 'daily',
  carrier: 'naturalGas', unit: 'm³', heatValueMJ: 37.68, dailyAmount: 1, monthlyAmount: 30,
  cylinderKg: 20, equipmentKw: 3, equipmentHours: 1, householdSize: 1, adjustPercent: 100, ...p,
});

describe('單位換算', () => {
  it('1 kWh = 3.6 MJ', () => {
    expect(P('kwhToMJ')).toBe(3.6);
  });
});

describe('輸入清理 safe()', () => {
  it('非數字回傳下限或 0', () => {
    expect(safe('abc', 'hours')).toBe(0);
    expect(safe(NaN, 'hours')).toBe(0);
  });
  it('負數被限制為下限', () => {
    expect(safe(-5, 'hours')).toBe(0);
  });
  it('超過上限被截斷', () => {
    expect(safe(999, 'hours')).toBe(24);
  });
});

describe('電器耗電', () => {
  it('W 先 ÷1000：100 W × 3 h = 0.3 kWh = 1.08 MJ', () => {
    const r = calculate({ ...emptyInputs(), appliances: [app({ powerValue: 100, hours: 3 })] });
    expect(r.directKWh).toBeCloseTo(0.3, 10);
    expect(r.totalMJ).toBeCloseTo(1.08, 10);
  });
  it('kW 輸入並乘負載比例：0.9 kW × 6 h × 60% = 3.24 kWh', () => {
    const r = calculate({ ...emptyInputs(), appliances: [app({ powerValue: 0.9, powerUnit: 'kW', hours: 6, loadPercent: 60 })] });
    expect(r.directKWh).toBeCloseTo(3.24, 10);
  });
  it('分攤人數：100 W × 2 h ÷ 4 人 = 0.05 kWh', () => {
    const r = calculate({ ...emptyInputs(), appliances: [app({ hours: 2, share: 4 })] });
    expect(r.directKWh).toBeCloseTo(0.05, 10);
  });
  it('未啟用的項目不計入', () => {
    const r = calculate({ ...emptyInputs(), appliances: [app({ enabled: false })] });
    expect(r.totalMJ).toBe(0);
    expect(r.activities).toHaveLength(0);
  });
});

describe('手機充電', () => {
  it('15 Wh × 2 次 = 0.03 kWh', () => {
    const r = calculate({ ...emptyInputs(), phone: { enabled: true, whPerCharge: 15, chargesPerDay: 2 } });
    expect(r.directKWh).toBeCloseTo(0.03, 10);
  });
});

describe('交通', () => {
  it('單程距離自動 ×2，並依每週天數換算平均每日', () => {
    expect(dailyDistance(tr({ distance: 5, distanceMode: 'oneway', daysPerWeek: 5 }))).toBeCloseTo((10 * 5) / 7, 10);
  });
  it('燃油機車：距離 ÷ 效率 × 汽油熱值', () => {
    const r = calculate({ ...emptyInputs(), transport: [tr({ distance: 20, efficiency: 40 })] });
    expect(r.activities[0].quantity).toBeCloseTo(0.5, 10);
    expect(r.totalMJ).toBeCloseTo(0.5 * P('gasolineHV'), 10);
    expect(r.byCarrier.find((c) => c.carrier === 'gasoline')!.mj).toBeCloseTo(r.totalMJ, 10);
  });
  it('私人車輛共乘人數平均分攤', () => {
    const solo = calculate({ ...emptyInputs(), transport: [tr({ kind: 'gasCar', efficiency: 14 })] });
    const two = calculate({ ...emptyInputs(), transport: [tr({ kind: 'gasCar', efficiency: 14, occupants: 2 })] });
    expect(two.totalMJ).toBeCloseTo(solo.totalMJ / 2, 10);
  });
  it('電動機車計入電力', () => {
    const r = calculate({ ...emptyInputs(), transport: [tr({ kind: 'eScooter', distance: 10, efficiency: 0.03 })] });
    expect(r.directKWh).toBeCloseTo(0.3, 10);
  });
  it('步行／自行車為 0 MJ', () => {
    const r = calculate({ ...emptyInputs(), transport: [tr({ kind: 'active' })] });
    expect(r.totalMJ).toBe(0);
  });
  it('大眾運輸為個人分攤，可選擇不計入總量', () => {
    const bus = tr({ kind: 'bus', efficiency: 0.5 });
    const on = calculate({ ...emptyInputs(), transport: [bus], includeShared: true });
    const off = calculate({ ...emptyInputs(), transport: [bus], includeShared: false });
    expect(on.activities[0].shared).toBe(true);
    expect(on.totalMJ).toBeCloseTo(5, 10);
    expect(off.totalMJ).toBe(0);
    expect(off.sharedMJ).toBeCloseTo(5, 10); // 仍保留分攤資訊
    expect(countedActivities(off)).toHaveLength(0);
  });
  it('捷運分攤電力不算進「直接用電」', () => {
    const r = calculate({ ...emptyInputs(), transport: [tr({ kind: 'metro', efficiency: 0.05 })] });
    expect(r.directKWh).toBe(0);
    expect(r.sharedKWh).toBeCloseTo(0.5, 10);
  });
});

describe('燃料', () => {
  it('天然氣每月帳單分攤：30 度 ÷ 30 天 ÷ 4 人', () => {
    expect(fuelDailyQuantity(fuel({ mode: 'monthly', monthlyAmount: 30, householdSize: 4 })).qty).toBeCloseTo(0.25, 10);
  });
  it('桶裝瓦斯以「桶 × 每桶公斤」計算', () => {
    const f = fuel({ kind: 'lpg', carrier: 'lpg', unit: 'kg', heatValueMJ: 50, mode: 'monthly', monthlyAmount: 0.75, cylinderKg: 20, householdSize: 1 });
    expect(fuelDailyQuantity(f).qty).toBeCloseTo(0.5, 10);
    const r = calculate({ ...emptyInputs(), cooking: [f] });
    expect(r.totalMJ).toBeCloseTo(25, 10);
  });
  it('依設備功率估算：3 kW × 1 h = 10.8 MJ', () => {
    const r = calculate({ ...emptyInputs(), cooking: [fuel({ mode: 'equipment', equipmentKw: 3, equipmentHours: 1 })] });
    expect(r.totalMJ).toBeCloseTo(10.8, 6);
  });
  it('燃料不會被算進 kWh', () => {
    const r = calculate({ ...emptyInputs(), cooking: [fuel({})] });
    expect(r.directKWh).toBe(0);
  });
});

describe('總量與加總一致性', () => {
  it('總量 = 各活動加總 = 各載體加總（終端能源口徑，不重複計算）', () => {
    const r = calculate(createDemoInputs());
    const byAct = countedActivities(r).reduce((s, a) => s + a.energyMJ, 0);
    const byCarrier = r.byCarrier.reduce((s, c) => s + c.mj, 0);
    expect(byAct).toBeCloseTo(r.totalMJ, 8);
    expect(byCarrier).toBeCloseTo(r.totalMJ, 8);
  });
  it('每週 = ×7、每月 = ×30', () => {
    const r = calculate(createDemoInputs());
    expect(r.weeklyMJ).toBeCloseTo(r.totalMJ * 7, 8);
    expect(r.monthlyMJ).toBeCloseTo(r.totalMJ * 30, 8);
  });
  it('預設輸入可計算出有限且非負的結果', () => {
    const r = calculate(createDefaultInputs());
    expect(Number.isFinite(r.totalMJ)).toBe(true);
    expect(r.totalMJ).toBeGreaterThanOrEqual(0);
  });
});

describe('情境比較', () => {
  it('減少冷氣時數 → 能源減少，差值等於該項變化', () => {
    const base = { ...emptyInputs(), appliances: [app({ powerValue: 0.9, powerUnit: 'kW', hours: 6, loadPercent: 60 })] };
    const scen = { ...base, appliances: [app({ powerValue: 0.9, powerUnit: 'kW', hours: 3, loadPercent: 60 })] };
    const diff = calculate(scen).totalMJ - calculate(base).totalMJ;
    expect(diff).toBeCloseTo(-0.9 * 3 * 0.6 * 3.6, 10);
  });
});

describe('進階分析', () => {
  it('前三名依能源量由高至低排序', () => {
    const t = topThree(calculate(createDemoInputs()));
    expect(t.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].activity.energyMJ).toBeGreaterThanOrEqual(t[i].activity.energyMJ);
  });
  it('依電力結構估算的各電源度數加總 = 個人用電', () => {
    const r = calculate({ ...emptyInputs(), appliances: [app({ hours: 10 })] });
    const sum = electricityBySource(r).reduce((s, x) => s + x.kwh, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
  it('一次能源歸屬加總 = 終端能源總量（僅重新分類，不新增能源）', () => {
    const r = calculate(createDemoInputs());
    const sum = primaryAttribution(r).reduce((s, x) => s + x.total, 0);
    expect(sum).toBeCloseTo(r.totalMJ, 6);
  });
});

describe('CSV 匯出', () => {
  it('包含 BOM 與主要欄位，且不含碳排放欄位', () => {
    const csv = buildCsv(calculate(createDemoInputs()));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('每日能源消耗總量');
    expect(csv).toContain('計算公式');
    expect(csv).not.toMatch(/CO2|CO₂|碳排放量（/);
  });
});
