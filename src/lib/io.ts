// CSV 匯出與 localStorage 儲存
import type { Inputs, Results } from '../types';
import { CARRIERS, CATEGORY_LABEL } from '../data/meta';
import { fmt, pct } from './format';
import { createDefaultInputs } from '../data/defaults';

const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

export function buildCsv(r: Results, scenario?: Results): string {
  const lines: (string | number)[][] = [];
  lines.push(['我的一天，消耗多少能源？—每日能源消耗估算結果']);
  lines.push(['匯出時間', new Date().toLocaleString('zh-TW')]);
  lines.push(['說明', '本結果為依使用者輸入及預設參數之估算（終端能源口徑），不代表實際能源帳單，亦非碳排放計算']);
  lines.push([]);
  lines.push(['摘要項目', '數值', '單位']);
  lines.push(['每日能源消耗總量', round(r.totalMJ, 3), 'MJ/日']);
  lines.push(['其中：個人直接使用', round(r.directMJ, 3), 'MJ/日']);
  lines.push([`其中：大眾運輸個人分攤${r.includeShared ? '' : '（未計入總量）'}`, round(r.sharedMJ, 3), 'MJ/日']);
  lines.push(['每日直接用電量', round(r.directKWh, 4), 'kWh/日']);
  lines.push(['大眾運輸分攤用電量', round(r.sharedKWh, 4), 'kWh/日']);
  lines.push(['每週估算（×7，情境估算）', round(r.weeklyMJ, 2), 'MJ/週']);
  lines.push(['每月估算（×30，情境估算）', round(r.monthlyMJ, 2), 'MJ/月']);
  lines.push([]);
  lines.push(['能源載體', '能源量（MJ/日）', '比例', '原生單位用量', '單位']);
  r.byCarrier.forEach((c) =>
    lines.push([CARRIERS[c.carrier].label, round(c.mj, 3), pct(c.mj, r.totalMJ), round(c.quantity, 4), c.unit]),
  );
  lines.push([]);
  lines.push(['類別', '活動名稱', '輸入數值', '計算結果', '單位', '能源量（MJ/日）', '能源載體', '是否為個人分攤', '計算公式']);
  r.activities.forEach((a) =>
    lines.push([
      CATEGORY_LABEL[a.category], a.name, a.inputSummary, round(a.quantity, 4), a.quantityUnit,
      round(a.energyMJ, 3), CARRIERS[a.carrier].label, a.shared ? '是' : '否', a.formula,
    ]),
  );
  if (scenario) {
    lines.push([]);
    lines.push(['情境比較', '原始情境', '調整後情境', '差異', '單位']);
    lines.push(['每日能源總量', round(r.totalMJ, 3), round(scenario.totalMJ, 3), round(scenario.totalMJ - r.totalMJ, 3), 'MJ/日']);
    lines.push(['每日直接用電量', round(r.directKWh, 4), round(scenario.directKWh, 4), round(scenario.directKWh - r.directKWh, 4), 'kWh/日']);
  }
  // 加上 BOM，讓 Excel 正確顯示中文
  return '\uFEFF' + lines.map((l) => l.map(esc).join(',')).join('\r\n');
}

export function downloadCsv(r: Results, scenario?: Results) {
  const blob = new Blob([buildCsv(r, scenario)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `每日能源消耗_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── localStorage ──
const KEY = 'daily-energy-calculator:v1';

export interface SavedState {
  inputs: Inputs;
  notes: string[];
}

export function loadSaved(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SavedState>;
    if (!data.inputs || !Array.isArray(data.inputs.appliances)) return null;
    // 與預設結構合併，避免舊版資料缺欄位
    const def = createDefaultInputs();
    return {
      inputs: { ...def, ...data.inputs, phone: { ...def.phone, ...data.inputs.phone } },
      notes: Array.isArray(data.notes) ? data.notes : [],
    };
  } catch {
    return null;
  }
}

export function save(state: SavedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 隱私模式或空間不足時忽略 */
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const fmtForPrint = fmt;
