// 主應用程式：狀態管理、導航、localStorage
import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { Zap, RotateCcw, Save, X, BookOpen } from 'lucide-react';
import type { Inputs } from './types';
import { calculate } from './lib/calc';
import { createDefaultInputs, createDemoInputs } from './data/defaults';
import { loadSaved, save, clearSaved } from './lib/io';
import { LandingStep } from './components/LandingStep';
import { InputStep } from './components/InputStep';
import { ResultsStep } from './components/ResultsStep';
import { ScenarioStep } from './components/ScenarioStep';

type Step = 'landing' | 'input' | 'results' | 'scenario';


// 儲存提示橫幅
function SaveBanner({ onSave, onClear, dirty }: { onSave: () => void; onClear: () => void; dirty: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-white border border-slate-200 shadow-xl px-4 py-3 text-sm no-print animate-rise">
      <span className="text-slate-600">資料僅儲存在此瀏覽器（localStorage）</span>
      {dirty && (
        <button type="button" onClick={onSave} className="btn-teal text-xs px-3 py-1.5">
          <Save size={14} aria-hidden /> 儲存
        </button>
      )}
      <button type="button" onClick={onClear} className="btn-warn text-xs px-3 py-1.5">
        <RotateCcw size={14} aria-hidden /> 清除
      </button>
      <button type="button" onClick={() => setVisible(false)} aria-label="關閉提示" className="text-slate-400 hover:text-slate-700">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}

// 步驟進度條
const STEPS: { key: Step; label: string; short: string }[] = [
  { key: 'landing', label: '1 開始探索', short: '1' },
  { key: 'input', label: '2 輸入資料', short: '2' },
  { key: 'results', label: '3–4 計算結果', short: '3' },
  { key: 'scenario', label: '5 情境比較', short: '5' },
];

function StepNav({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <nav aria-label="步驟進度" className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <span
            aria-current={step === s.key ? 'step' : undefined}
            className={`hidden items-center gap-2 rounded-full px-3 py-1 text-xs font-bold transition-all sm:inline-flex ${
              i === idx
                ? 'bg-navy-800 text-white'
                : i < idx
                ? 'bg-teal-100 text-teal-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {s.label}
          </span>
          <span className={`inline-flex sm:hidden h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === idx ? 'bg-navy-800 text-white' : i < idx ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
            {s.short}
          </span>
          {i < STEPS.length - 1 && (
            <span className={`mx-1 h-0.5 w-4 rounded ${i < idx ? 'bg-teal-400' : 'bg-slate-200'}`} aria-hidden />
          )}
        </div>
      ))}
    </nav>
  );
}

export default function App() {
  const saved = useMemo(() => loadSaved(), []);
  const [inputs, setRawInputs] = useState<Inputs>(() => saved?.inputs ?? createDefaultInputs());
  const [step, setStep] = useState<Step>('landing');
  const [dirty, setDirty] = useState(false);
  const [bannerKey, setBannerKey] = useState(0);

  const results = useMemo(() => calculate(inputs), [inputs]);

  const setInputs = useCallback((action: SetStateAction<Inputs>) => {
    setRawInputs(action);
    setDirty(true);
  }, []);

  // 切換步驟時捲到頁首
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // 自動儲存（debounce 1.5s）
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      save({ inputs, notes: [] });
      setDirty(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [inputs, dirty]);

  const handleReset = () => {
    setRawInputs(createDefaultInputs());
    clearSaved();
    setDirty(false);
    setStep('landing');
    setBannerKey((k) => k + 1);
  };

  const handleDemo = () => {
    setRawInputs(createDemoInputs());
    setDirty(true);
    setStep('input');
  };

  return (
    <div className="min-h-screen">
      {/* 頂部導覽列 */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setStep('landing')}
            className="flex items-center gap-2 font-black text-navy-800 hover:text-teal-700 transition-colors"
            aria-label="回到首頁"
          >
            <Zap size={22} className="text-teal-600" aria-hidden />
            <span className="hidden sm:block">我的一天，消耗多少能源？</span>
            <span className="sm:hidden">能源計算器</span>
          </button>
          <div className="flex-1" />
          <StepNav step={step} />
          <div className="flex items-center gap-1 ml-2">
            <button type="button" className="btn-ghost px-2 py-1.5 text-xs" onClick={handleReset} title="清除所有資料並重設">
              <RotateCcw size={15} aria-hidden />
              <span className="hidden sm:block">重設</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主內容 */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {step === 'landing' && (
          <LandingStep onStart={() => setStep('input')} onDemo={handleDemo} />
        )}
        {step === 'input' && (
          <InputStep
            inputs={inputs}
            setInputs={setInputs}
            results={results}
            onNext={() => setStep('results')}
          />
        )}
        {step === 'results' && (
          <ResultsStep
            results={results}
            onBack={() => setStep('input')}
            onScenario={() => setStep('scenario')}
          />
        )}
        {step === 'scenario' && (
          <ScenarioStep
            baselineInputs={inputs}
            baselineResults={results}
            onBack={() => setStep('results')}
            onResults={() => setStep('results')}
          />
        )}
      </main>

      {/* 頁腳 */}
      <footer className="no-print border-t border-slate-200 bg-white mt-16 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl grid gap-6 sm:grid-cols-3 text-sm text-slate-600">
          <div>
            <div className="font-bold text-navy-800 mb-2 flex items-center gap-2"><BookOpen size={16} aria-hidden />工具說明</div>
            <p>本工具為高中地理 108 課綱「社會環境議題」能源單元教學輔助工具，計算結果為估算值，不代表實際能源帳單。</p>
          </div>
          <div>
            <div className="font-bold text-navy-800 mb-2">資料來源</div>
            <ul className="space-y-1">
              <li>• 電力結構：經濟部能源署能源統計（2024年）</li>
              <li>• 燃料熱值：能源署能源產品單位熱值表</li>
              <li>• 電器功率、車輛效率：教學示範值（詳見各參數說明）</li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-navy-800 mb-2">隱私說明</div>
            <p>你輸入的資料只儲存在此瀏覽器中，不會上傳至任何伺服器，也不收集任何個人識別資訊。</p>
            <button type="button" onClick={handleReset} className="mt-2 text-red-600 hover:underline text-xs">
              清除所有資料並重設
            </button>
          </div>
        </div>
      </footer>

      <SaveBanner key={bannerKey} onSave={() => { save({ inputs, notes: [] }); setDirty(false); }} onClear={handleReset} dirty={dirty} />

      {/* 列印用：隱藏至只顯示主內容 */}
      <div className="print-only hidden">
        <p className="text-xs text-slate-500 mb-2">列印自：我的一天，消耗多少能源？能源計算器 ・ 列印時間：{new Date().toLocaleString('zh-TW')}</p>
        <p className="text-xs text-slate-500">計算結果為依使用者輸入及預設參數之估算，不代表實際能源帳單，亦非碳排放計算。</p>
      </div>
    </div>
  );
}
