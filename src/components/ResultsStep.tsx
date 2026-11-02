// Step 4：計算結果與互動圖表
import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Zap, Fuel, Award, Globe, BookOpen, ChevronDown, Download, Printer,
  Info, AlertTriangle, ArrowLeft, GitCompare,
} from 'lucide-react';
import type { Results } from '../types';
import { CARRIERS, CARRIER_ORDER, CATEGORY_LABEL } from '../data/meta';
import {
  GENERATION_MIX, GENERATION_META, IMPORT_DEPENDENCY, SUPPLY_CHAINS,
} from '../data/taiwanEnergy';
import { topThree, electricityBySource } from '../lib/analysis';
import { fmt, pct } from '../lib/format';
import { downloadCsv } from '../lib/io';
import { countedActivities } from '../lib/calc';
import { EmptyChart, Expand, Note, Stat } from './ui';

// ── 工具 ──────────────────────────────────────
const RADIAN = Math.PI / 180;
const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
}) => {
  if (percent < 0.04) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── 自訂 Tooltip ──────────────────────────────
function ChartTip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; unit?: string }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-lg text-sm">
      {payload.map((p, i) => (
        <div key={i} className="font-semibold text-slate-800">
          {p.name}：<span className="num text-navy-700">{fmt(p.value)}</span> MJ
        </div>
      ))}
    </div>
  );
}

// ── 甜甜圈圖 ──────────────────────────────────
function CarrierDonut({ results }: { results: Results }) {
  const data = CARRIER_ORDER
    .map((c) => {
      const mj = results.byCarrier.find((x) => x.carrier === c)?.mj ?? 0;
      return { key: c, label: CARRIERS[c].label, color: CARRIERS[c].color, mj };
    })
    .filter((d) => d.mj > 0.0001);
  if (!data.length) return <EmptyChart />;
  const mjByLabel = new Map(data.map((d) => [d.label, d.mj]));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="48%"
          outerRadius="72%"
          dataKey="mj"
          nameKey="label"
          labelLine={false}
          label={renderCustomLabel}
          isAnimationActive
        >
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => `${fmt(Number(v))} MJ（${pct(Number(v), results.totalMJ)}）`}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Legend
          formatter={(value: string) => `${value}（${fmt(mjByLabel.get(value) ?? 0)} MJ）`}
          wrapperStyle={{ fontSize: 13 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── 活動橫條圖 ────────────────────────────────
function ActivityBar({ results }: { results: Results }) {
  const acts = [...countedActivities(results)]
    .sort((a, b) => b.energyMJ - a.energyMJ)
    .slice(0, 12)
    .map((a) => ({
      name: a.name.length > 10 ? a.name.slice(0, 9) + '…' : a.name,
      fullName: a.name,
      energyMJ: a.energyMJ,
      fill: CARRIERS[a.carrier].color,
    }));
  if (!acts.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, acts.length * 42)}>
      <BarChart data={acts} layout="vertical" margin={{ left: 8, right: 40, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} unit=" MJ" />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
        <Tooltip content={<ChartTip />} />
        <Bar dataKey="energyMJ" name="能源量">
          {acts.map((a, i) => (
            <Cell key={i} fill={a.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── 台灣發電結構圖 ────────────────────────────
function GenerationPieChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={GENERATION_MIX}
          cx="50%"
          cy="50%"
          innerRadius="40%"
          outerRadius="68%"
          dataKey="percent"
          nameKey="label"
          labelLine={false}
          label={renderCustomLabel}
        >
          {GENERATION_MIX.map((g) => (
            <Cell key={g.key} fill={g.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => `${fmt(Number(v), 2)}%`}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── 個人用電來源估算 ──────────────────────────
function ElecBySource({ results }: { results: Results }) {
  const data = electricityBySource(results).filter((d) => d.kwh > 0.0001);
  const totalKwh = data.reduce((s, d) => s + d.kwh, 0);
  if (!totalKwh || totalKwh < 0.001) {
    return <p className="text-sm text-slate-500">你目前沒有輸入電力使用，以下估算將在輸入後顯示。</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.key}>
          <div className="flex justify-between text-sm">
            <span className="font-semibold" style={{ color: d.color }}>{d.label}</span>
            <span className="num text-slate-700">{fmt(d.kwh, 3)} kWh・{fmt(d.percent, 1)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${d.percent}%`, background: d.color }} />
          </div>
        </div>
      ))}
      <p className="mt-2 text-xs text-slate-500">
        ⓘ 以上依全國平均電力結構（{GENERATION_META.dataYear}）估算，並非個人的實際發電來源。
        電網中所有電廠的電力匯流在一起，個別插座端無法辨識電力來自哪一座電廠或哪一種機組。
      </p>
    </div>
  );
}

// ── 詳細計算表格 ──────────────────────────────
function DetailTable({ results }: { results: Results }) {
  const [expanded, setExpanded] = useState(false);
  const acts = results.activities;
  if (!acts.length) return <p className="text-sm text-slate-500">尚無計算資料。</p>;
  const shown = expanded ? acts : acts.slice(0, 8);
  return (
    <div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3">活動</th>
              <th className="px-4 py-3">類別</th>
              <th className="px-4 py-3">載體</th>
              <th className="px-4 py-3 text-right">用量</th>
              <th className="px-4 py-3 text-right">能源量</th>
              <th className="px-4 py-3 text-right">佔比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((a) => (
              <tr key={a.id} className={`transition-colors hover:bg-slate-50 ${a.shared ? 'opacity-75 italic' : ''}`}>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {a.name}
                  {a.shared && <span className="ml-1 text-xs text-navy-600 not-italic">（分攤）</span>}
                  {a.note && (
                    <span title={a.note} className="ml-1 cursor-help text-xs text-slate-400">ⓘ</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[a.category]}</td>
                <td className="px-4 py-3">
                  <span className="chip" style={{ background: CARRIERS[a.carrier].color + '22', color: CARRIERS[a.carrier].color }}>
                    {CARRIERS[a.carrier].label}
                  </span>
                </td>
                <td className="px-4 py-3 num text-right text-slate-700">
                  {fmt(a.quantity, 3)} {a.quantityUnit}
                </td>
                <td className="px-4 py-3 num text-right font-bold text-navy-800">{fmt(a.energyMJ)} MJ</td>
                <td className="px-4 py-3 num text-right text-slate-600">{pct(a.energyMJ, results.totalMJ)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {acts.length > 8 && (
        <button type="button" className="mt-2 w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
          onClick={() => setExpanded((x) => !x)}>
          {expanded ? '收合' : `展開全部 ${acts.length} 項`}
        </button>
      )}
      <details className="group mt-4 rounded-xl border border-navy-100 bg-navy-50/60">
        <summary className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-navy-800 cursor-pointer">
          <BookOpen size={16} aria-hidden /> 查看各項目的詳細計算公式
          <ChevronDown size={16} className="ml-auto transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="divide-y divide-navy-100/50">
          {acts.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="font-semibold text-slate-800">{a.name}</div>
              <div className="mt-1 font-mono text-xs text-slate-600 leading-relaxed">{a.formula}</div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ── 前三大活動 ────────────────────────────────
function TopThree({ results }: { results: Results }) {
  const top = topThree(results);
  if (!top.length) return <p className="text-sm text-slate-500">尚無資料，請先啟用至少一個項目。</p>;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="space-y-4">
      {top.map((t, i) => (
        <div key={t.activity.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start gap-3">
            <span className="text-3xl" aria-label={`第 ${i + 1} 名`}>{medals[i]}</span>
            <div className="flex-1">
              <div className="font-bold text-lg text-slate-800">{t.activity.name}</div>
              <div className="flex flex-wrap gap-3 mt-1">
                <span className="num font-extrabold text-navy-700 text-xl">{fmt(t.activity.energyMJ)} MJ／日</span>
                <span className="chip bg-navy-50 text-navy-700 self-center">占總量 {t.share}</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{t.explanation}</p>
        </div>
      ))}
    </div>
  );
}

// ── 供應鏈說明 ────────────────────────────────
function SupplyChainCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {SUPPLY_CHAINS.map((sc) => (
        <div key={sc.key} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-bold text-navy-800 mb-3">{sc.title}</div>
          <ol className="space-y-1">
            {sc.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">{sc.note}</p>
        </div>
      ))}
    </div>
  );
}

// ── 主元件 ────────────────────────────────────
export function ResultsStep({
  results,
  onBack,
  onScenario,
}: {
  results: Results;
  onBack: () => void;
  onScenario: () => void;
}) {
  const hasData = results.totalMJ > 0;
  const kwh = results.directKWh + (results.includeShared ? results.sharedKWh : 0);

  return (
    <section aria-labelledby="results-title" className="animate-rise space-y-8">
      {/* 頁首 */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-teal-700">STEP 4</p>
          <h2 id="results-title" className="section-title">每日能源消耗結果</h2>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          <button type="button" className="btn-ghost" onClick={onBack}>
            <ArrowLeft size={18} aria-hidden /> 返回修改
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadCsv(results)} disabled={!hasData}>
            <Download size={18} aria-hidden /> 下載 CSV
          </button>
          <button type="button" className="btn-ghost" onClick={() => window.print()} disabled={!hasData}>
            <Printer size={18} aria-hidden /> 列印
          </button>
          <button type="button" className="btn-teal" onClick={onScenario} disabled={!hasData}>
            <GitCompare size={18} aria-hidden /> 情境比較
          </button>
        </div>
      </header>

      {!hasData && (
        <Note tone="warn">
          目前尚無任何啟用的項目。請回到「輸入資料」，啟用至少一個電器、交通或燃料項目，再查看計算結果。
        </Note>
      )}

      {/* A. 摘要統計卡 */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-navy-900">A. 每日能源消耗總量</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="每日能源消耗總量"
            value={fmt(results.totalMJ)}
            unit="MJ／日"
            icon={<Zap size={20} />}
            accent="navy"
            sub={
              results.includeShared
                ? `含大眾運輸個人分攤 ${fmt(results.sharedMJ)} MJ`
                : '不含大眾運輸個人分攤'
            }
          />
          <Stat
            label="每日直接用電量"
            value={fmt(kwh, 2)}
            unit="kWh／日"
            icon={<Zap size={20} />}
            accent="teal"
            sub="1 kWh = 3.6 MJ"
          />
          <Stat
            label="每週情境估算"
            value={fmt(results.weeklyMJ)}
            unit="MJ／週"
            icon={<Fuel size={20} />}
            accent="amber"
            sub="= 每日 × 7，情境估算值"
          />
          <Stat
            label="每月情境估算"
            value={fmt(results.monthlyMJ)}
            unit="MJ／月"
            icon={<Fuel size={20} />}
            accent="slate"
            sub="= 每日 × 30，情境估算值"
          />
        </div>
        <Note>
          主要結果口徑為<b>終端能源</b>（你實際消耗的電力或燃料），讓電力與燃料可在相同的 MJ 單位下比較。
          電力的發電端一次能源消耗（含發電效率損耗）請見下方「臺灣能源結構」區塊。本工具不計算碳排放量。
        </Note>
      </div>

      {/* B. 圖表 */}
      <div className="card p-4 md:p-6 space-y-8">
        <div>
          <h3 className="mb-1 text-lg font-bold text-navy-900">B1. 能源載體分布（甜甜圈圖）</h3>
          <p className="mb-4 text-sm text-slate-500">顯示你使用的各類能源載體（電力、汽油、天然氣等）佔每日總能源消耗的比例。</p>
          <CarrierDonut results={results} />
        </div>

        <div>
          <h3 className="mb-1 text-lg font-bold text-navy-900">B2. 各活動能源消耗（長條圖）</h3>
          <p className="mb-4 text-sm text-slate-500">顯示前 12 項活動的能源消耗量（MJ），依高至低排列。顏色代表能源載體類別。</p>
          <ActivityBar results={results} />
          <div className="mt-2 flex flex-wrap gap-2">
            {CARRIER_ORDER.map((c) => (
              <span key={c} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: CARRIERS[c].color }} />
                {CARRIERS[c].label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-1 text-lg font-bold text-navy-900">B3. 詳細計算明細表</h3>
          <DetailTable results={results} />
        </div>
      </div>

      {/* C. 前三大 */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <Award size={24} className="text-amber-500" aria-hidden />
          <h3 className="text-lg font-bold text-navy-900">C. 主要能源消耗來源（前三名）</h3>
        </div>
        <TopThree results={results} />
      </div>

      {/* D. 臺灣能源結構 */}
      <div className="card p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Globe size={24} className="text-navy-700" aria-hidden />
          <div>
            <h3 className="text-lg font-bold text-navy-900">D. 能源來源與臺灣能源結構</h3>
            <p className="text-sm text-slate-500">進階分析：電力來自哪裡？燃料從哪裡來？</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <b>閱讀此區塊前的重要說明：</b>本區塊的「電力」分析顯示的是<b>第一層（終端能源）</b>與<b>第二層（一次能源來源）</b>的不同視角。
            電網中所有電廠的電力匯流後無法辨識來源，「個人用電依電力結構估算」是以全國平均比例推算，<b>不代表你個人的實際發電來源</b>。
            兩個層次的圖表<b>不可相加</b>，否則會重複計算同一能源鏈。
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 font-bold text-navy-800">臺灣電力發電結構</h4>
            <p className="mb-3 text-xs text-slate-500">資料年度：{GENERATION_META.dataYear}・統計口徑：{GENERATION_META.scope}</p>
            <GenerationPieChart />
            <div className="mt-2 space-y-2">
              {GENERATION_MIX.map((g) => (
                <Expand key={g.key} title={`${g.label}（${fmt(g.percent, 2)}%）`} tone="navy">
                  <p className="mb-1">{g.description}</p>
                  <p className="text-slate-500"><b>燃料來源：</b>{g.supply}</p>
                </Expand>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              來源：{GENERATION_META.source} | 資料整理：{GENERATION_META.compiledDate}
              <br />{GENERATION_META.disclaimer}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-bold text-navy-800">你的用電依全國平均結構估算</h4>
              <ElecBySource results={results} />
            </div>

            <div>
              <h4 className="mb-2 font-bold text-navy-800">臺灣能源進口依賴</h4>
              <div className="rounded-2xl border border-navy-100 bg-navy-50/60 p-4">
                <div className="num text-4xl font-extrabold text-navy-800">{IMPORT_DEPENDENCY.valueText}</div>
                <div className="mt-1 text-sm font-semibold text-navy-600">{IMPORT_DEPENDENCY.label}</div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{IMPORT_DEPENDENCY.note}</p>
                <p className="mt-2 text-xs text-slate-500">來源：{IMPORT_DEPENDENCY.source}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-bold text-navy-800">能源的供應路徑</h4>
              <SupplyChainCards />
            </div>
          </div>
        </div>
      </div>

      {/* 地理課堂探究問題 */}
      <div className="card border-teal-200 bg-teal-50/60 p-4 md:p-6 space-y-5 print-break">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-teal-700" aria-hidden />
          <h3 className="text-lg font-bold text-teal-800">地理課堂探究問題</h3>
        </div>
        <div className="space-y-4">
          {[
            {
              q: '1. 你每日能源消耗量最高的活動是什麼？可能與哪些生活條件有關？',
              hint: '例如：居住地點（市中心或郊區）、家庭條件（有無冷氣、電熱水器）、交通可選擇性（是否有大眾運輸）等。',
            },
            {
              q: '2. 你使用的電力、汽油或天然氣，其能源來源與供應路徑有什麼差異？',
              hint: '電力由各類電廠匯流至電網、再透過電線送到插座；汽油是原油煉製後以油罐車配送；天然氣以液態船運、在接收站氣化後以管線輸送。三者的上游能源地理位置、運輸風險與國內儲存能力各有不同。',
            },
            {
              q: '3. 如果臺灣面臨國際能源價格上漲、燃料供應中斷或電力需求增加，你的生活可能受到什麼影響？',
              hint: '想想哪些用電或用燃料的活動是生活必需、哪些有替代方案、哪些可以透過提升效率減少消耗。',
            },
          ].map(({ q, hint }) => (
            <div key={q} className="rounded-xl bg-white/80 p-4 ring-1 ring-teal-200/60">
              <p className="font-bold text-teal-800">{q}</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed"><b>提示：</b>{hint}</p>
            </div>
          ))}
        </div>

        <details className="rounded-xl border border-teal-200 bg-white/70">
          <summary className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-teal-800 cursor-pointer">
            <Info size={16} aria-hidden /> 進階思考：減少能源消耗、降低碳排放與提升能源安全，是否一定能同時達成？
            <ChevronDown size={16} className="ml-auto" aria-hidden />
          </summary>
          <div className="px-4 pb-4 space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>這三個目標有時互相支持，有時也會出現取捨，以下是幾個值得思考的角度：</p>
            <ul className="space-y-2 list-none">
              {[
                ['能源消耗量 ≠ 碳排放量', '減少電力消耗可以降低碳排放，但如果用的是再生能源，同樣的用電量碳排放卻會更低。反之，改用天然氣取代煤炭，能源消耗量可能差不多，但碳排放會下降。'],
                ['能源效率 ≠ 能源節約', '換一台更省電的冷氣（提升效率）不見得會減少總用電量，如果因為省了電費而使用更長時間（回彈效應），節能效果可能會被抵消。'],
                ['再生能源的系統限制', '太陽能和風能受天氣和時間限制，需要儲能或備載容量。提高再生能源占比不一定會降低對某些化石燃料的需求，因為備載仍需要快速啟動的電廠。'],
                ['個人選擇受結構條件影響', '是否有捷運可搭、住宅是否可裝太陽能板、家庭收入能否支付電動車或高效能電器的費用，都是影響個人能源使用的結構性因素，不應只從個人習慣角度思考能源問題。'],
              ].map(([title, body]) => (
                <li key={title as string} className="rounded-lg bg-slate-50 p-3">
                  <span className="font-bold text-navy-800">{title as string}：</span>{body as string}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      <div className="flex flex-wrap justify-between gap-3 no-print">
        <button type="button" className="btn-ghost" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden /> 返回修改輸入
        </button>
        <button type="button" className="btn-primary" onClick={onScenario} disabled={!hasData}>
          <GitCompare size={18} aria-hidden /> 進行情境比較
        </button>
      </div>
    </section>
  );
}
