// ──────────────────────────────────────────────
// 能源載體、類別與交通方式的顯示資訊
// ──────────────────────────────────────────────
import type { CarrierKey, Category, TransportKind } from '../types';
import { P, type ParamKey } from './parameters';

export interface CarrierMeta {
  key: CarrierKey;
  label: string;
  color: string;
  /** 統計用原生單位 */
  unit: string;
  /** 熱值參數（電力為換算係數） */
  hvParam?: ParamKey;
}

export const CARRIERS: Record<CarrierKey, CarrierMeta> = {
  electricity: { key: 'electricity', label: '電力', color: '#1d6fb8', unit: 'kWh', hvParam: 'kwhToMJ' },
  gasoline: { key: 'gasoline', label: '汽油', color: '#ea7a1a', unit: 'L', hvParam: 'gasolineHV' },
  diesel: { key: 'diesel', label: '柴油', color: '#8b5e34', unit: 'L', hvParam: 'dieselHV' },
  naturalGas: { key: 'naturalGas', label: '天然氣', color: '#0f9488', unit: 'm³', hvParam: 'naturalGasHV' },
  lpg: { key: 'lpg', label: '液化石油氣', color: '#7c5cc4', unit: 'kg', hvParam: 'lpgHV' },
  otherFuel: { key: 'otherFuel', label: '其他燃料', color: '#64748b', unit: 'MJ' },
};

export const CARRIER_ORDER: CarrierKey[] = ['electricity', 'gasoline', 'diesel', 'naturalGas', 'lpg', 'otherFuel'];

export const CATEGORY_LABEL: Record<Category, string> = {
  electricity: '家庭用電',
  transport: '交通能源',
  cooking: '烹調與燃料',
  other: '其他生活能源',
};

export interface TransportMeta {
  kind: TransportKind;
  label: string;
  /** 計算方式 */
  method: 'fuel' | 'ev' | 'sharedMJ' | 'sharedKWh' | 'none';
  carrier: CarrierKey;
  effParam?: ParamKey;
  effUnit: string;
  effLabel: string;
  privateVehicle: boolean;
}

export const TRANSPORT_META: Record<TransportKind, TransportMeta> = {
  scooter: {
    kind: 'scooter', label: '機車（汽油）', method: 'fuel', carrier: 'gasoline',
    effParam: 'scooterKmL', effUnit: 'km/L', effLabel: '燃油效率', privateVehicle: true,
  },
  gasCar: {
    kind: 'gasCar', label: '汽油汽車', method: 'fuel', carrier: 'gasoline',
    effParam: 'gasCarKmL', effUnit: 'km/L', effLabel: '燃油效率', privateVehicle: true,
  },
  dieselCar: {
    kind: 'dieselCar', label: '柴油汽車', method: 'fuel', carrier: 'diesel',
    effParam: 'dieselCarKmL', effUnit: 'km/L', effLabel: '燃油效率', privateVehicle: true,
  },
  eScooter: {
    kind: 'eScooter', label: '電動機車', method: 'ev', carrier: 'electricity',
    effParam: 'eScooterKwhKm', effUnit: 'kWh/km', effLabel: '每公里耗電量', privateVehicle: true,
  },
  eCar: {
    kind: 'eCar', label: '電動汽車', method: 'ev', carrier: 'electricity',
    effParam: 'eCarKwhKm', effUnit: 'kWh/km', effLabel: '每公里耗電量', privateVehicle: true,
  },
  bus: {
    kind: 'bus', label: '公車（個人分攤）', method: 'sharedMJ', carrier: 'diesel',
    effParam: 'busMJpkm', effUnit: 'MJ/人·km', effLabel: '每人每公里能源', privateVehicle: false,
  },
  metro: {
    kind: 'metro', label: '捷運或火車（個人分攤）', method: 'sharedKWh', carrier: 'electricity',
    effParam: 'metroKwhPkm', effUnit: 'kWh/人·km', effLabel: '每人每公里用電', privateVehicle: false,
  },
  active: {
    kind: 'active', label: '步行或自行車', method: 'none', carrier: 'otherFuel',
    effUnit: '', effLabel: '', privateVehicle: false,
  },
};

export const defaultEfficiency = (kind: TransportKind): number => {
  const p = TRANSPORT_META[kind].effParam;
  return p ? P(p) : 0;
};
