// ──────────────────────────────────────────────
// 共用介面元件
// ──────────────────────────────────────────────
import { useEffect, useId, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, Info, BookOpen } from 'lucide-react';
import { LIMITS, PARAMS, type LimitKey, type ParamKey } from '../data/parameters';
import { fmt } from '../lib/format';

// ── 數值輸入欄位（含即時驗證） ──
interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  limit: LimitKey;
  step?: number;
  hint?: string;
  disabled?: boolean;
  id?: string;
}

export function NumberField({ label, value, onChange, unit, limit, step = 1, hint, disabled, id }: NumberFieldProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  const { min, max, warn } = LIMITS[limit];
  const [text, setText] = useState<string>(String(value));
  const [error, setError] = useState<string | null>(null);

  // 外部值改變（載入示範、重設）時同步顯示
  useEffect(() => {
    const parsed = Number(text);
    if (text.trim() === '' || !Number.isFinite(parsed) || parsed !== value) {
      setText(String(value));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (raw: string) => {
    setText(raw);
    if (raw.trim() === '') {
      setError(`請輸入數值（計算暫時沿用 ${fmt(value)}）`);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setError('請輸入有效的數字');
      return;
    }
    if (n < 0) {
      setError('不可輸入負數');
      return;
    }
    if (n < min) {
      setError(`不可小於 ${min}`);
      return;
    }
    if (n > max) {
      setError(`超過合理上限 ${max} ${unit}，請重新確認`);
      return;
    }
    setError(null);
    onChange(n);
  };

  const warning = !error && value > warn && warn < max ? '數值偏高，請確認是否正確' : null;
  const descId = `${fid}-desc`;

  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <label htmlFor={fid} className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={fid}
          type="number"
          inputMode="decimal"
          className={`field-input num pr-20 ${error ? 'border-red-500 ring-2 ring-red-100' : warning ? 'border-amber-500' : ''}`}
          value={text}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={descId}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => {
            if (error) {
              setText(String(value));
              setError(null);
            }
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-500">
          {unit}
        </span>
      </div>
      <p id={descId} className="mt-1 min-h-[1.1rem] text-xs leading-snug" aria-live="polite">
        {error ? (
          <span className="font-semibold text-red-600">⚠ {error}</span>
        ) : warning ? (
          <span className="font-semibold text-amber-700">{warning}</span>
        ) : (
          <span className="text-slate-500">{hint}</span>
        )}
      </p>
    </div>
  );
}

// ── 開關 ──
export function Toggle({
  checked,
  onChange,
  label,
  srLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  srLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={srLabel ?? label}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 rounded-full"
    >
      <span
        className={`relative block h-7 w-12 shrink-0 overflow-hidden rounded-full transition-colors duration-200 ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </span>
      {label && <span className={`whitespace-nowrap text-sm font-semibold ${checked ? 'text-teal-700' : 'text-slate-500'}`}>{label}</span>}
    </button>
  );
}

// ── 分段選擇器 ──
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
            value === o.value ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-600 hover:text-navy-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── 可展開面板 ──
export function Expand({
  title,
  children,
  icon,
  defaultOpen = false,
  tone = 'navy',
}: {
  title: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  tone?: 'navy' | 'teal' | 'amber';
}) {
  const toneCls = {
    navy: 'border-navy-100 bg-navy-50/60 text-navy-800',
    teal: 'border-teal-100 bg-teal-50/70 text-teal-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];
  return (
    <details className={`group rounded-xl border ${toneCls}`} open={defaultOpen}>
      <summary className="flex items-center gap-2 px-4 py-3 text-sm font-bold">
        {icon ?? <BookOpen size={16} aria-hidden />}
        <span className="flex-1">{title}</span>
        <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-current/10 px-4 py-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </details>
  );
}

// ── 提醒框 ──
export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        tone === 'warn' ? 'border-amber-500/30 bg-amber-50 text-amber-800' : 'border-navy-100 bg-navy-50 text-navy-800'
      }`}
    >
      {tone === 'warn' ? <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /> : <Info size={18} className="mt-0.5 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

// ── 參數資料來源說明 ──
export function ParamInfo({ keys }: { keys: ParamKey[] }) {
  return (
    <ul className="space-y-2">
      {keys.map((k) => {
        const p = PARAMS[k] as (typeof PARAMS)[ParamKey] & { range?: [number, number]; note?: string };
        return (
          <li key={k} className="rounded-lg bg-white/80 p-3 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800">{p.name}</span>
              <span className="num font-semibold text-navy-700">
                {fmt(p.value, 4)} {p.unit}
              </span>
              {p.isDemo ? (
                <span className="chip bg-amber-100 text-amber-700">教學示範值</span>
              ) : (
                <span className="chip bg-teal-100 text-teal-700">{p.sourceType === 'definition' ? '單位定義' : '官方引用值'}</span>
              )}
              {p.range && (
                <span className="chip bg-slate-100 text-slate-600">
                  估算範圍 {fmt(p.range[0], 3)}–{fmt(p.range[1], 3)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600">用途：{p.purpose}</p>
            <p className="text-xs text-slate-500">
              依據：{p.source}（年度：{p.year}）
            </p>
            {p.note && <p className="mt-1 text-xs text-slate-600">說明：{p.note}</p>}
          </li>
        );
      })}
    </ul>
  );
}

// ── 小型統計卡 ──
export function Stat({
  label,
  value,
  unit,
  sub,
  accent = 'navy',
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  sub?: ReactNode;
  accent?: 'navy' | 'teal' | 'amber' | 'slate';
  icon?: ReactNode;
}) {
  const color = { navy: 'text-navy-800', teal: 'text-teal-700', amber: 'text-amber-600', slate: 'text-slate-700' }[accent];
  const bg = { navy: 'bg-navy-50 text-navy-700', teal: 'bg-teal-50 text-teal-700', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-100 text-slate-600' }[accent];
  return (
    <div className="card flex flex-col gap-2 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        {icon && <span className={`grid h-8 w-8 place-items-center rounded-lg ${bg}`}>{icon}</span>}
        {label}
      </div>
      <div className={`num text-3xl font-extrabold tracking-tight md:text-4xl ${color}`}>
        {value}
        <span className="ml-1.5 text-base font-semibold text-slate-500">{unit}</span>
      </div>
      {sub && <div className="text-xs leading-relaxed text-slate-500">{sub}</div>}
    </div>
  );
}

export function EmptyChart({ message = '尚無可顯示的資料，請先在「輸入資料」中啟用至少一個項目。' }: { message?: string }) {
  return (
    <div className="grid h-64 place-items-center rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
