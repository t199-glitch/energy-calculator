// ──────────────────────────────────────────────
// 進階分析：前三大活動、一次能源來源歸屬
// ──────────────────────────────────────────────
import type { ActivityResult, CarrierKey, Results } from '../types';
import { countedActivities } from './calc';
import { CATEGORY_LABEL } from '../data/meta';
import { GENERATION_MIX, PRIMARY_LABEL, type PrimaryKey } from '../data/taiwanEnergy';
import { fmt, pct } from './format';

export interface TopActivity {
  activity: ActivityResult;
  share: string;
  explanation: string;
}

export function topThree(r: Results): TopActivity[] {
  const list = [...countedActivities(r)].sort((a, b) => b.energyMJ - a.energyMJ).slice(0, 3);
  return list.map((a) => {
    const share = pct(a.energyMJ, r.totalMJ);
    const cat = CATEGORY_LABEL[a.category];
    const sharedNote = a.shared ? '此項為搭乘大眾運輸的「個人分攤」估算，並非你直接購買的燃料或電力。' : '';
    return {
      activity: a,
      share,
      explanation: `此項屬於「${cat}」，每日約 ${fmt(a.energyMJ)} MJ，占總量 ${share}。估算主要取決於：${a.driver}。改變這些參數會直接影響結果。${sharedNote}`,
    };
  });
}

/** 非電力能源載體對應的一次能源 */
const FUEL_PRIMARY: Record<Exclude<CarrierKey, 'electricity'>, PrimaryKey> = {
  gasoline: 'oil',
  diesel: 'oil',
  lpg: 'oil',
  naturalGas: 'gas',
  otherFuel: 'other',
};

export interface PrimaryRow {
  key: PrimaryKey;
  label: string;
  /** 經由電力歸屬（依全國平均發電結構估算） */
  viaElectricity: number;
  /** 直接燃燒的燃料 */
  direct: number;
  total: number;
}

/**
 * 將「終端能源量」依來源歸屬到一次能源類別。
 * 注意：這不是一次能源消耗量；未納入發電效率、煉製與運輸損失。
 */
export function primaryAttribution(r: Results): PrimaryRow[] {
  const rows = new Map<PrimaryKey, PrimaryRow>();
  const get = (k: PrimaryKey) => {
    if (!rows.has(k)) rows.set(k, { key: k, label: PRIMARY_LABEL[k], viaElectricity: 0, direct: 0, total: 0 });
    return rows.get(k)!;
  };
  const elecMJ = r.byCarrier.find((c) => c.carrier === 'electricity')?.mj ?? 0;
  const mixTotal = GENERATION_MIX.reduce((s, g) => s + g.percent, 0);
  GENERATION_MIX.forEach((g) => {
    get(g.primary).viaElectricity += (elecMJ * g.percent) / mixTotal;
  });
  r.byCarrier.forEach((c) => {
    if (c.carrier === 'electricity') return;
    get(FUEL_PRIMARY[c.carrier]).direct += c.mj;
  });
  const out = [...rows.values()].map((x) => ({ ...x, total: x.viaElectricity + x.direct }));
  return out.filter((x) => x.total > 0.0001).sort((a, b) => b.total - a.total);
}

/** 個人用電依全國平均發電結構估算之各電源度數 */
export function electricityBySource(r: Results) {
  const kwh = r.directKWh + (r.includeShared ? r.sharedKWh : 0);
  const mixTotal = GENERATION_MIX.reduce((s, g) => s + g.percent, 0);
  return GENERATION_MIX.map((g) => ({ ...g, kwh: (kwh * g.percent) / mixTotal }));
}
