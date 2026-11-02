// Step 5：情境比較
import { useCallback, useMemo, useReducer } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, RotateCcw, Download, ArrowRight, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import type { Inputs, Results } from '../types';
import { calculate } from '../lib/calc';
import { CARRIERS, CARRIER_ORDER } from '../data/meta';
import { downloadCsv } from '../lib/io';
import { fmt, signed } from '../lib/format';
import { Note, Toggle } from './ui';
import { ApplianceCard, FuelCard, TransportCard } from './InputCards';
import { patchList } from './InputStep';
import type { Appliance, FuelItem, TransportItem } from '../types';

// ── diff 顯示 ──
function DiffBadge({ diff, unit }: { diff: number; unit: string }) {
  const same = Math.abs(diff) < 1e-9;
  const cls = diff < 0 ? 'text-teal-700 bg-teal-50' : diff > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100';
  const Icon = diff < 0 ? ArrowDown : diff > 0 ? ArrowUp : Minus;
  return (
    <span className={`chip gap-1 ${cls}`}>
      <Icon size={11} aria-hidden />
      {same ? '不變' : `${signed(diff)} ${unit}`}
    </span>
  );
}

// ── 並排統計 ──
function CompareStat({ label, baseline, scenario, unit }: { label: string; baseline: number; scenario: number; unit: string }) {
  const diff = scenario - baseline;
  const pctChange = baseline > 0 ? ((diff / baseline) * 100) : 0;
  return (
    <div className="card p-4 space-y-2">
      <div className="text-sm font-semibold text-slate-600">{label}</div>
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <div className="text-xs text-slate-400 mb-0.5">原始情境</div>
          <div className="num text-2xl font-extrabold text-slate-700">{fmt(baseline)}<span className="ml-1 text-sm text-slate-400">{unit}</span></div>
        </div>
        <div className="text-slate-300 text-2xl" aria-hidden>→</div>
        <div>
          <div className="text-xs text-slate-400 mb-0.5">調整後</div>
          <div className={`num text-2xl font-extrabold ${scenario < baseline ? 'text-teal-700' : scenario > baseline ? 'text-red-600' : 'text-slate-700'}`}>
            {fmt(scenario)}<span className="ml-1 text-sm text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <DiffBadge diff={diff} unit={unit} />
          {baseline > 0 && <span className={`chip ${pctChange < 0 ? 'text-teal-700 bg-teal-50' : pctChange > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'}`}>
            {pctChange === 0 ? '不變' : `${signed(pctChange, 1)}%`}
          </span>}
        </div>
      </div>
    </div>
  );
}

// ── 各活動差異橫條圖 ──
function ActivityDiffChart({ baseline, scenario }: { baseline: Results; scenario: Results }) {
  const data = useMemo(() => {
    const map = new Map<string, { name: string; base: number; adj: number; diff: number }>();
    baseline.activities.forEach((a) => map.set(a.id, { name: a.name, base: a.energyMJ, adj: 0, diff: 0 }));
    scenario.activities.forEach((a) => {
      const x = map.get(a.id);
      if (x) { x.adj = a.energyMJ; x.diff = a.energyMJ - x.base; }
      else map.set(a.id, { name: a.name, base: 0, adj: a.energyMJ, diff: a.energyMJ });
    });
    return [...map.values()].filter((d) => Math.abs(d.diff) > 0.001).sort((a, b) => b.diff - a.diff);
  }, [baseline, scenario]);

  if (!data.length) return <p className="text-sm text-slate-500">兩個情境的所有項目完全相同，請調整任一參數後再查看。</p>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} unit=" MJ" />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v: number, name: string) => [
            `${fmt(v)} MJ`, name === 'base' ? '原始情境' : '調整後',
          ]}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Legend formatter={(v) => v === 'base' ? '原始情境' : '調整後'} wrapperStyle={{ fontSize: 13 }} />
        <ReferenceLine x={0} stroke="#94a3b8" />
        <Bar dataKey="base" name="base" fill="#a8c4e0" radius={[0, 4, 4, 0]} />
        <Bar dataKey="adj" name="adj" fill="#0f9488" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 各能源載體差異 ──
function CarrierDiff({ baseline, scenario }: { baseline: Results; scenario: Results }) {
  const data = CARRIER_ORDER
    .map((c) => {
      const b = baseline.byCarrier.find((x) => x.carrier === c)?.mj ?? 0;
      const s = scenario.byCarrier.find((x) => x.carrier === c)?.mj ?? 0;
      return { carrier: c, label: CARRIERS[c].label, color: CARRIERS[c].color, base: b, adj: s, diff: s - b };
    })
    .filter((d) => d.base > 0 || d.adj > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold text-slate-500 bg-slate-50">
            <th className="px-3 py-2">能源載體</th>
            <th className="px-3 py-2 text-right">原始</th>
            <th className="px-3 py-2 text-right">調整後</th>
            <th className="px-3 py-2 text-right">差異</th>
            <th className="px-3 py-2 text-right">增減率</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((d) => (
            <tr key={d.carrier} className="hover:bg-slate-50">
              <td className="px-3 py-2">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="font-semibold">{d.label}</span>
                </span>
              </td>
              <td className="px-3 py-2 num text-right text-slate-600">{fmt(d.base)} MJ</td>
              <td className="px-3 py-2 num text-right font-semibold" style={{ color: d.adj < d.base ? '#0f9488' : d.adj > d.base ? '#dc2626' : '#475569' }}>
                {fmt(d.adj)} MJ
              </td>
              <td className="px-3 py-2 text-right">
                <DiffBadge diff={d.diff} unit="MJ" />
              </td>
              <td className="px-3 py-2 num text-right text-slate-600">
                {d.base > 0 ? `${signed((d.diff / d.base) * 100, 1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 主元件 ──
type ScenarioAction =
  | { type: 'setAppliance'; id: string; patch: Partial<Appliance> }
  | { type: 'setTransport'; id: string; patch: Partial<TransportItem> }
  | { type: 'setFuel'; id: string; patch: Partial<FuelItem> }
  | { type: 'setIncludeShared'; value: boolean }
  | { type: 'reset'; inputs: Inputs };

function scenarioReducer(state: Inputs, action: ScenarioAction): Inputs {
  switch (action.type) {
    case 'setAppliance': return { ...state, appliances: patchList(state.appliances, action.id, action.patch) };
    case 'setTransport': return { ...state, transport: patchList(state.transport, action.id, action.patch) };
    case 'setFuel': return { ...state, cooking: patchList(state.cooking, action.id, action.patch) };
    case 'setIncludeShared': return { ...state, includeShared: action.value };
    case 'reset': return { ...action.inputs };
  }
}

export function ScenarioStep({
  baselineInputs,
  baselineResults,
  onBack,
  onResults,
}: {
  baselineInputs: Inputs;
  baselineResults: Results;
  onBack: () => void;
  onResults: () => void;
}) {
  const [scenInputs, dispatch] = useReducer(scenarioReducer, baselineInputs);
  const scenResults = useMemo(() => calculate(scenInputs), [scenInputs]);

  const setApp = useCallback((id: string, patch: Partial<Appliance>) => dispatch({ type: 'setAppliance', id, patch }), []);
  const setTr = useCallback((id: string, patch: Partial<TransportItem>) => dispatch({ type: 'setTransport', id, patch }), []);
  const setFuel = useCallback((id: string, patch: Partial<FuelItem>) => dispatch({ type: 'setFuel', id, patch }), []);

  const totalDiff = scenResults.totalMJ - baselineResults.totalMJ;

  const hasCooking = baselineInputs.cooking.some((f) => f.enabled);
  const hasTransport = baselineInputs.transport.some((t) => t.enabled);
  const hasElec = baselineInputs.appliances.some((a) => a.enabled);

  return (
    <section aria-labelledby="scenario-title" className="animate-rise space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-teal-700">STEP 5</p>
          <h2 id="scenario-title" className="section-title">能源情境比較</h2>
          <p className="mt-1 max-w-3xl text-slate-600">
            調整下方的參數，系統會即時計算「調整後情境」，與你的原始情境並排比較。
            原始情境的資料已被保留，可隨時還原。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={onBack}>
            <ArrowLeft size={18} aria-hidden /> 返回結果
          </button>
          <button type="button" className="btn-warn" onClick={() => dispatch({ type: 'reset', inputs: baselineInputs })}>
            <RotateCcw size={18} aria-hidden /> 還原原始情境
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadCsv(baselineResults, scenResults)}>
            <Download size={18} aria-hidden /> 下載 CSV
          </button>
        </div>
      </header>

      <Note tone="warn">
        <b>注意：</b>這裡的情境調整<b>不計算碳排放減量</b>。能源消耗減少不等於碳排放等比例減少（電力的排放係數與發電結構有關，燃料種類也影響碳排放強度）。若需要碳排放分析，需引入個別燃料與電力的排放係數，這超出本工具的設計範圍。
      </Note>

      {/* 摘要比較 */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-navy-900">並排摘要比較</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CompareStat label="每日能源總量" baseline={baselineResults.totalMJ} scenario={scenResults.totalMJ} unit="MJ" />
          <CompareStat label="每日直接用電量" baseline={baselineResults.directKWh} scenario={scenResults.directKWh} unit="kWh" />
          <CompareStat label="每週情境估算" baseline={baselineResults.weeklyMJ} scenario={scenResults.weeklyMJ} unit="MJ" />
          <CompareStat label="每月情境估算" baseline={baselineResults.monthlyMJ} scenario={scenResults.monthlyMJ} unit="MJ" />
        </div>

        {Math.abs(totalDiff) > 0.01 && (
          <div className={`mt-4 rounded-2xl border p-4 flex items-center gap-4 ${totalDiff < 0 ? 'border-teal-200 bg-teal-50' : 'border-amber-200 bg-amber-50'}`}>
            <span className="text-3xl" aria-hidden>{totalDiff < 0 ? '📉' : '📈'}</span>
            <div>
              <p className={`font-extrabold text-xl num ${totalDiff < 0 ? 'text-teal-700' : 'text-amber-700'}`}>
                {totalDiff < 0 ? '減少' : '增加'} {fmt(Math.abs(totalDiff))} MJ／日
              </p>
              <p className={`text-sm ${totalDiff < 0 ? 'text-teal-700' : 'text-amber-700'}`}>
                相較原始情境{totalDiff < 0 ? '下降' : '上升'} {fmt(Math.abs(baselineResults.totalMJ > 0 ? (totalDiff / baselineResults.totalMJ) * 100 : 0), 1)}%
                ・每月估算{totalDiff < 0 ? '減少' : '增加'} {fmt(Math.abs(totalDiff * 30))} MJ
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 各活動比較圖 */}
      <div className="card p-4 md:p-6 space-y-6">
        <div>
          <h3 className="mb-1 text-lg font-bold text-navy-900">各活動能源消耗比較</h3>
          <ActivityDiffChart baseline={baselineResults} scenario={scenResults} />
        </div>
        <div>
          <h3 className="mb-1 text-lg font-bold text-navy-900">各能源載體變化</h3>
          <CarrierDiff baseline={baselineResults} scenario={scenResults} />
        </div>
      </div>

      {/* 調整面板 */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-navy-900">調整情境參數</h3>
        <p className="text-sm text-slate-500 -mt-4">
          以下只顯示「原始情境」中已啟用的項目。調整任一數值後，上方比較圖表會即時更新。
        </p>

        <div className="flex items-center gap-3 card p-4">
          <Toggle
            checked={scenInputs.includeShared}
            onChange={(v) => dispatch({ type: 'setIncludeShared', value: v })}
            label="將大眾運輸個人分攤能源計入總量"
          />
          <span className="text-sm text-slate-500">（不計入時，公車與捷運的能源不加入個人總量，方便與只用私人交通工具的情境比較）</span>
        </div>

        {hasElec && (
          <div className="space-y-3">
            <h4 className="font-bold text-navy-800 flex items-center gap-2">
              <span className="chip bg-navy-50 text-navy-700">A</span> 家庭用電
            </h4>
            {scenInputs.appliances.filter((a) => baselineInputs.appliances.find((b) => b.id === a.id)?.enabled).map((a) => (
              <ApplianceCard key={a.id} a={a} idPrefix={`sc-app-${a.id}`} onChange={(p) => setApp(a.id, p)} />
            ))}
          </div>
        )}

        {hasTransport && (
          <div className="space-y-3">
            <h4 className="font-bold text-navy-800 flex items-center gap-2">
              <span className="chip bg-navy-50 text-navy-700">B</span> 交通能源
            </h4>
            {scenInputs.transport.filter((t) => baselineInputs.transport.find((b) => b.id === t.id)?.enabled).map((t) => (
              <TransportCard key={t.id} t={t} idPrefix={`sc-tr-${t.id}`} onChange={(p) => setTr(t.id, p)} />
            ))}
          </div>
        )}

        {hasCooking && (
          <div className="space-y-3">
            <h4 className="font-bold text-navy-800 flex items-center gap-2">
              <span className="chip bg-navy-50 text-navy-700">C</span> 烹調與燃料
            </h4>
            {scenInputs.cooking.filter((f) => baselineInputs.cooking.find((b) => b.id === f.id)?.enabled).map((f) => (
              <FuelCard key={f.id} f={f} idPrefix={`sc-fuel-${f.id}`} onChange={(p) => setFuel(f.id, p)} />
            ))}
          </div>
        )}

        {!hasElec && !hasTransport && !hasCooking && (
          <Note>原始情境中尚無啟用的項目，請先回到「輸入資料」啟用項目，再進行情境比較。</Note>
        )}
      </div>

      <Note tone="warn">
        <b>情境估算說明：</b>每週（×7）和每月（×30）的估算假設每天的生活模式完全相同，實際消耗會因週末、季節及特殊情況而不同，僅供參考。
      </Note>

      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" className="btn-ghost" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden /> 返回結果頁
        </button>
        <button type="button" className="btn-primary" onClick={onResults}>
          查看完整結果 <ArrowRight size={18} aria-hidden />
        </button>
      </div>
    </section>
  );
}
