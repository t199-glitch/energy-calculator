// ──────────────────────────────────────────────
// 預設輸入資料與示範情境
// ──────────────────────────────────────────────
import type { Appliance, ApplianceKind, FuelItem, Inputs, KnownEnergy, TransportItem, TransportKind, CarrierKey } from '../types';
import { P } from './parameters';
import { TRANSPORT_META, defaultEfficiency } from './meta';

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const appliance = (
  kind: ApplianceKind,
  name: string,
  powerValue: number,
  powerUnit: 'W' | 'kW',
  hours: number,
  loadPercent = 100,
): Appliance => ({ id: kind, kind, name, enabled: false, powerValue, powerUnit, hours, loadPercent, share: 1 });

export const newCustomAppliance = (name = '其他電器'): Appliance => ({
  id: uid('app'),
  kind: 'custom',
  name,
  enabled: true,
  powerValue: P('customApplianceW'),
  powerUnit: 'W',
  hours: 1,
  loadPercent: 100,
  share: 1,
});

const transport = (kind: TransportKind): TransportItem => ({
  id: kind,
  kind,
  name: TRANSPORT_META[kind].label,
  enabled: false,
  distance: 10,
  distanceMode: 'round',
  daysPerWeek: 5,
  efficiency: defaultEfficiency(kind),
  occupants: 1,
});

export const fuelBase = (kind: FuelItem['kind'], carrier: CarrierKey, name: string, unit: string, hv: number): FuelItem => ({
  id: kind === 'custom' ? uid('fuel') : kind,
  kind,
  name,
  enabled: kind === 'custom',
  mode: kind === 'custom' ? 'daily' : 'monthly',
  carrier,
  unit,
  heatValueMJ: hv,
  dailyAmount: kind === 'naturalGas' ? 0.25 : kind === 'lpg' ? 0.12 : 0.1,
  monthlyAmount: kind === 'naturalGas' ? 30 : kind === 'lpg' ? 0.7 : 3,
  cylinderKg: P('lpgCylinderKg'),
  equipmentKw: P('stoveKw'),
  equipmentHours: 1,
  householdSize: kind === 'custom' ? 1 : 4,
  adjustPercent: 100,
});

/** 自訂燃料預設選項 */
export const CUSTOM_FUEL_PRESETS: { label: string; carrier: CarrierKey; unit: string; hv: number }[] = [
  { label: '卡式瓦斯罐（丁烷）', carrier: 'lpg', unit: 'kg', hv: P('butaneHV') },
  { label: '木炭', carrier: 'otherFuel', unit: 'kg', hv: P('charcoalHV') },
  { label: '汽油（發電機、割草機等）', carrier: 'gasoline', unit: 'L', hv: P('gasolineHV') },
  { label: '柴油', carrier: 'diesel', unit: 'L', hv: P('dieselHV') },
  { label: '天然氣', carrier: 'naturalGas', unit: 'm³', hv: P('naturalGasHV') },
];

export const newCustomFuel = (presetIndex = 0): FuelItem => {
  const p = CUSTOM_FUEL_PRESETS[presetIndex];
  return fuelBase('custom', p.carrier, p.label, p.unit, p.hv);
};

export const newKnownEnergy = (): KnownEnergy => ({
  id: uid('known'),
  name: '其他已知能源使用量',
  enabled: true,
  value: 1,
  unit: 'kWh',
  carrier: 'electricity',
  adjustPercent: 100,
});

export const createDefaultInputs = (): Inputs => ({
  appliances: [
    appliance('ac', '冷氣', P('acPowerKw'), 'kW', P('acHours'), P('acLoadPercent')),
    appliance('fan', '電風扇', P('fanW'), 'W', P('fanHours')),
    appliance('computer', '電腦或筆記型電腦', P('computerW'), 'W', P('computerHours')),
    appliance('tv', '電視', P('tvW'), 'W', P('tvHours')),
    appliance('waterHeater', '電熱水器', P('waterHeaterKw'), 'kW', P('waterHeaterHours')),
    appliance('riceCooker', '電鍋', P('riceCookerW'), 'W', P('riceCookerHours')),
    appliance('microwave', '微波爐', P('microwaveW'), 'W', P('microwaveHours')),
  ],
  phone: { enabled: false, whPerCharge: P('phoneWh'), chargesPerDay: P('phoneCharges') },
  transport: (['scooter', 'gasCar', 'dieselCar', 'eScooter', 'eCar', 'bus', 'metro', 'active'] as TransportKind[]).map(transport),
  cooking: [
    fuelBase('naturalGas', 'naturalGas', '天然氣（管線瓦斯）', 'm³', P('naturalGasHV')),
    fuelBase('lpg', 'lpg', '桶裝液化石油氣（LPG）', 'kg', P('lpgHV')),
  ],
  otherAppliances: [],
  otherFuels: [],
  knownEnergy: [],
  includeShared: true,
});

/** 示範情境：住在都市、搭捷運上學並有機車接送的高中生（夏季平日） */
export const createDemoInputs = (): Inputs => {
  const d = createDefaultInputs();
  const on = <T extends { enabled: boolean }>(x: T, patch: Partial<T> = {}): T => ({ ...x, ...patch, enabled: true });

  d.appliances = d.appliances.map((a) => {
    switch (a.kind) {
      case 'ac': return on(a, { hours: 7, loadPercent: 60, share: 1 });
      case 'fan': return on(a, { hours: 4 });
      case 'computer': return on(a, { hours: 3 });
      case 'tv': return on(a, { hours: 1.5, share: 2 });
      case 'riceCooker': return on(a, { hours: 0.5, share: 4 });
      default: return a;
    }
  });
  d.phone = { ...d.phone, enabled: true, chargesPerDay: 1 };
  d.transport = d.transport.map((t) => {
    switch (t.kind) {
      case 'scooter': return on(t, { distance: 4, distanceMode: 'oneway', daysPerWeek: 5, occupants: 2 });
      case 'metro': return on(t, { distance: 8, distanceMode: 'oneway', daysPerWeek: 5 });
      case 'active': return on(t, { distance: 1.5, distanceMode: 'round', daysPerWeek: 7 });
      default: return t;
    }
  });
  d.cooking = d.cooking.map((f) => (f.kind === 'naturalGas' ? on(f, { mode: 'monthly', monthlyAmount: 30, householdSize: 4 }) : f));
  return d;
};
