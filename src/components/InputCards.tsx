// ──────────────────────────────────────────────
// 輸入卡片：電器、交通、燃料、已知能源
// 主資料輸入與情境模擬共用
// ──────────────────────────────────────────────
import { useState, type ReactNode } from 'react';
import {
  AirVent, Fan, Laptop, Tv, ShowerHead, CookingPot, Microwave, Plug, Bike, Car, Bus, TrainFront,
  Footprints, Zap, Flame, Fuel, Trash2, Gauge, ChevronDown,
} from 'lucide-react';
import type { Appliance, ApplianceKind, CarrierKey, FuelItem, KnownEnergy, TransportItem, TransportKind } from '../types';
import { NumberField, Segmented, Toggle } from './ui';
import { CARRIERS, CARRIER_ORDER, TRANSPORT_META } from '../data/meta';
import { P, type LimitKey } from '../data/parameters';
import { dailyDistance, fuelDailyQuantity, safe } from '../lib/calc';
import { CUSTOM_FUEL_PRESETS } from '../data/defaults';
import { fmt } from '../lib/format';

export const APPLIANCE_ICON: Record<ApplianceKind, ReactNode> = {
  ac: <AirVent size={22} />,
  fan: <Fan size={22} />,
  computer: <Laptop size={22} />,
  tv: <Tv size={22} />,
  waterHeater: <ShowerHead size={22} />,
  riceCooker: <CookingPot size={22} />,
  microwave: <Microwave size={22} />,
  custom: <Plug size={22} />,
};

export const TRANSPORT_ICON: Record<TransportKind, ReactNode> = {
  scooter: <Bike size={22} />,
  gasCar: <Car size={22} />,
  dieselCar: <Car size={22} />,
  eScooter: <Zap size={22} />,
  eCar: <Car size={22} />,
  bus: <Bus size={22} />,
  metro: <TrainFront size={22} />,
  active: <Footprints size={22} />,
};

const APPLIANCE_HINT: Partial<Record<ApplianceKind, string>> = {
  ac: '請填「額定冷氣消耗電功率」（kW），不是冷氣能力。',
  fan: 'DC 直流扇約 15–30 W，傳統扇約 40–60 W。',
  computer: '筆電約 15–65 W；桌機含螢幕約 100–400 W。',
  tv: '可參考電視背面或能源效率標示。',
  waterHeater: '填加熱元件實際通電時間，不是插電時間。',
  riceCooker: '大同電鍋常見約 800 W。',
  microwave: '填「輸入功率」，通常高於微波輸出功率。',
  custom: '請參考電器銘牌標示的功率（W）。',
};

// ── 進階設定收折元件 ──
function AdvancedSection({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-slate-200 pt-2">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        進階設定
      </button>
      {open && (
        <div className="mt-3 animate-rise grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── 卡片外框 ──
export function ItemShell({
  icon,
  title,
  enabled,
  onToggle,
  children,
  right,
  badge,
}: {
  icon: ReactNode;
  title: ReactNode;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
  right?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 ${
        enabled ? 'border-teal-500/40 bg-white shadow-sm ring-1 ring-teal-500/10' : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl transition-colors ${
            enabled ? 'bg-teal-50 text-teal-700' : 'bg-slate-200/70 text-slate-500'
          }`}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-800">{title}</div>
          {badge}
        </div>
        {right}
        <Toggle checked={enabled} onChange={onToggle} label={enabled ? '已啟用' : '未啟用'} srLabel={`啟用 ${typeof title === 'string' ? title : '此項目'}`} />
      </div>
      {enabled && <div className="mt-4 animate-rise">{children}</div>}
    </div>
  );
}

function ResultBadge({ text }: { text: string }) {
  return <div className="num mt-0.5 text-sm font-semibold text-teal-700">{text}</div>;
}

// ── 電器卡片 ──
export function ApplianceCard({
  a,
  onChange,
  onRemove,
  idPrefix,
}: {
  a: Appliance;
  onChange: (patch: Partial<Appliance>) => void;
  onRemove?: () => void;
  idPrefix: string;
}) {
  // 統一以 W 輸入（介面更直觀），內部始終換算為 kW 計算
  const powerW = a.powerUnit === 'kW' ? a.powerValue * 1000 : a.powerValue;
  const kw = powerW / 1000;
  const kwh = (kw * safe(a.hours, 'hours') * safe(a.loadPercent, 'loadPercent')) / 100 / safe(a.share, 'share');

  // 共用 hint 文字——依分攤情境給不同提示
  const shareHint = safe(a.share, 'share') >= 10
    ? `目前設定 ${Math.round(safe(a.share, 'share'))} 人（班級共用情境）`
    : `與家人共用時平均分攤；若全家 4 人填 4，班級共用填 30–45`;

  return (
    <ItemShell
      icon={APPLIANCE_ICON[a.kind]}
      title={
        a.kind === 'custom' ? (
          <input
            aria-label="電器名稱"
            className="w-full max-w-xs rounded-md border border-transparent bg-transparent px-1 font-bold hover:border-slate-300 focus:border-navy-500 focus:bg-white"
            value={a.name}
            maxLength={30}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        ) : (
          a.name
        )
      }
      enabled={a.enabled}
      onToggle={(v) => onChange({ enabled: v })}
      badge={a.enabled ? <ResultBadge text={`≈ ${fmt(kwh, 3)} kWh／日（${fmt(kwh * 3.6)} MJ）`} /> : undefined}
      right={
        onRemove && (
          <button type="button" onClick={onRemove} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`刪除 ${a.name}`}>
            <Trash2 size={18} />
          </button>
        )
      }
    >
      {/* 基本欄位：功率（固定 W）、使用時間、分攤人數 */}
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          id={`${idPrefix}-power`}
          label="輸入功率"
          value={powerW}
          onChange={(v) => onChange({ powerValue: v, powerUnit: 'W' })}
          unit="W"
          limit="powerW"
          step={10}
          hint={APPLIANCE_HINT[a.kind]}
        />
        <NumberField
          id={`${idPrefix}-hours`}
          label={a.kind === 'waterHeater' ? '每日加熱時間' : '每日使用時間'}
          value={a.hours}
          onChange={(v) => onChange({ hours: v })}
          unit="小時"
          limit="hours"
          step={0.25}
          hint="0.5 小時 = 30 分鐘"
        />
        <NumberField
          id={`${idPrefix}-share`}
          label="共同使用人數"
          value={a.share}
          onChange={(v) => onChange({ share: Math.round(v) })}
          unit="人"
          limit="share"
          hint={shareHint}
        />
      </div>

      {/* 進階設定：負載比例（冷氣/自訂電器）、kW 單位切換 */}
      {(a.kind === 'ac' || a.kind === 'custom') && (
        <AdvancedSection>
          {a.kind === 'ac' && (
            <NumberField
              id={`${idPrefix}-load`}
              label="平均負載比例"
              value={a.loadPercent}
              onChange={(v) => onChange({ loadPercent: v })}
              unit="%"
              limit="loadPercent"
              step={5}
              hint="變頻冷氣常見 40–70%；不確定時維持預設 60%"
            />
          )}
          {a.kind === 'custom' && (
            <>
              <NumberField
                id={`${idPrefix}-load-custom`}
                label="平均負載比例"
                value={a.loadPercent}
                onChange={(v) => onChange({ loadPercent: v })}
                unit="%"
                limit="loadPercent"
                step={5}
                hint="一般電器維持 100%"
              />
              <div>
                <Segmented
                  label="功率輸入單位"
                  value={a.powerUnit}
                  onChange={(u) =>
                    onChange({
                      powerUnit: u,
                      powerValue: u === 'kW'
                        ? Math.round((powerW / 1000) * 1000) / 1000
                        : Math.round(powerW),
                    })
                  }
                  options={[
                    { value: 'W', label: 'W（瓦）' },
                    { value: 'kW', label: 'kW（千瓦）' },
                  ]}
                />
                <p className="mt-1 text-xs text-slate-500">電器銘牌以 kW 標示時可切換</p>
              </div>
            </>
          )}
        </AdvancedSection>
      )}
    </ItemShell>
  );
}

// ── 交通卡片 ──
const EFF_LIMIT: Record<TransportItem['kind'], LimitKey> = {
  scooter: 'kmPerL', gasCar: 'kmPerL', dieselCar: 'kmPerL', eScooter: 'kwhPerKm', eCar: 'kwhPerKm',
  bus: 'mjPerPkm', metro: 'kwhPerPkm', active: 'kmPerL',
};

export function TransportCard({
  t,
  onChange,
  idPrefix,
}: {
  t: TransportItem;
  onChange: (patch: Partial<TransportItem>) => void;
  idPrefix: string;
}) {
  const meta = TRANSPORT_META[t.kind];
  const km = dailyDistance(t);
  const occ = meta.privateVehicle ? safe(t.occupants, 'occupants') : 1;
  let resultText = '';
  if (meta.method === 'fuel') resultText = `≈ ${fmt(km / safe(t.efficiency, 'kmPerL') / occ, 3)} L ${CARRIERS[meta.carrier].label}／日`;
  else if (meta.method === 'ev') resultText = `≈ ${fmt((km * safe(t.efficiency, 'kwhPerKm')) / occ, 3)} kWh／日`;
  else if (meta.method === 'sharedMJ') resultText = `≈ ${fmt(km * safe(t.efficiency, 'mjPerPkm'))} MJ／日（個人分攤）`;
  else if (meta.method === 'sharedKWh') resultText = `≈ ${fmt(km * safe(t.efficiency, 'kwhPerPkm'), 3)} kWh／日（個人分攤）`;
  else resultText = '0 MJ（不計人體代謝能耗）';

  const effStep = meta.method === 'fuel' ? 1 : meta.method === 'sharedMJ' ? 0.05 : 0.005;

  return (
    <ItemShell
      icon={TRANSPORT_ICON[t.kind]}
      title={meta.label}
      enabled={t.enabled}
      onToggle={(v) => onChange({ enabled: v })}
      badge={
        t.enabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <ResultBadge text={`平均每日 ${fmt(km)} km・${resultText}`} />
          </div>
        ) : !meta.privateVehicle && meta.method !== 'none' ? (
          <span className="chip mt-1 bg-navy-50 text-navy-700">個人分攤估算</span>
        ) : undefined
      }
    >
      {/* 基本欄位：距離輸入方式 + 距離 + 頻率 */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-600">距離輸入方式</span>
        <Segmented
          label="距離輸入方式"
          value={t.distanceMode}
          onChange={(m) => onChange({ distanceMode: m })}
          options={[
            { value: 'round', label: '往返距離' },
            { value: 'oneway', label: '單程距離（自動 ×2）' },
          ]}
        />
      </div>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          id={`${idPrefix}-dist`}
          label={t.distanceMode === 'round' ? '每日往返距離' : '單程距離'}
          value={t.distance}
          onChange={(v) => onChange({ distance: v })}
          unit="km"
          limit="distance"
          step={0.5}
          hint={t.distanceMode === 'round' ? '已包含去程與回程' : '計算時會乘以 2'}
        />
        <NumberField
          id={`${idPrefix}-days`}
          label="使用頻率"
          value={t.daysPerWeek}
          onChange={(v) => onChange({ daysPerWeek: v })}
          unit="天／週"
          limit="daysPerWeek"
          step={1}
          hint="換算為一週的平均每日（× 天數 ÷ 7）"
        />
        {meta.privateVehicle && (
          <NumberField
            id={`${idPrefix}-occ`}
            label="共乘人數（含自己）"
            value={t.occupants}
            onChange={(v) => onChange({ occupants: Math.round(v) })}
            unit="人"
            limit="occupants"
            hint="家長接送時可填 2 人"
          />
        )}
      </div>

      {/* 進階設定：能源效率 */}
      {meta.method !== 'none' && (
        <AdvancedSection>
          <NumberField
            id={`${idPrefix}-eff`}
            label={meta.effLabel}
            value={t.efficiency}
            onChange={(v) => onChange({ efficiency: v })}
            unit={meta.effUnit}
            limit={EFF_LIMIT[t.kind]}
            step={effStep}
            hint={`預設 ${fmt(meta.effParam ? P(meta.effParam) : 0, 3)}（教學示範值，可依實際修改）`}
          />
        </AdvancedSection>
      )}

      {meta.method === 'none' && (
        <p className="mt-2 text-sm text-slate-600">步行與自行車不使用外部燃料或電力，記為 0 MJ。本工具不計算人體代謝能耗（食物熱量）。</p>
      )}
      {!meta.privateVehicle && meta.method !== 'none' && (
        <p className="mt-2 text-sm text-slate-600">
          大眾運輸的能源由所有乘客共同使用，這裡以「每人每公里」參數估算你的分攤量，結果會與你直接購買的燃料或電力分開呈現。
        </p>
      )}
    </ItemShell>
  );
}

// ── 燃料卡片 ──
export function FuelCard({
  f,
  onChange,
  onRemove,
  idPrefix,
}: {
  f: FuelItem;
  onChange: (patch: Partial<FuelItem>) => void;
  onRemove?: () => void;
  idPrefix: string;
}) {
  const { qty } = fuelDailyQuantity(f);
  const mj = qty * safe(f.heatValueMJ, 'heatValue');
  const isCustom = f.kind === 'custom';
  const monthlyLabel = f.kind === 'naturalGas' ? '每月帳單用量' : f.kind === 'lpg' ? '每月使用桶數' : '每月用量';
  const monthlyUnit = f.kind === 'naturalGas' ? '度（m³）' : f.kind === 'lpg' ? '桶' : f.unit;

  // 強制預設顯示月帳單模式（最貼近學生生活）
  const effectiveMode = f.mode ?? 'monthly';

  return (
    <ItemShell
      icon={f.carrier === 'naturalGas' ? <Flame size={22} /> : f.carrier === 'lpg' ? <Fuel size={22} /> : <Gauge size={22} />}
      title={
        isCustom ? (
          <input
            aria-label="燃料名稱"
            className="w-full max-w-xs rounded-md border border-transparent bg-transparent px-1 font-bold hover:border-slate-300 focus:border-navy-500 focus:bg-white"
            value={f.name}
            maxLength={30}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        ) : (
          f.name
        )
      }
      enabled={f.enabled}
      onToggle={(v) => onChange({ enabled: v })}
      badge={f.enabled ? <ResultBadge text={`每人每日 ≈ ${fmt(qty, 3)} ${f.unit}（${fmt(mj)} MJ）`} /> : undefined}
      right={
        onRemove && (
          <button type="button" onClick={onRemove} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`刪除 ${f.name}`}>
            <Trash2 size={18} />
          </button>
        )
      }
    >
      {isCustom && (
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            快速套用燃料
            <select
              className="field-input mt-1"
              defaultValue=""
              onChange={(e) => {
                const p = CUSTOM_FUEL_PRESETS[Number(e.target.value)];
                if (p) onChange({ name: p.label, carrier: p.carrier, unit: p.unit, heatValueMJ: p.hv });
              }}
            >
              <option value="" disabled>
                選擇常見燃料…
              </option>
              {CUSTOM_FUEL_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}（{fmt(p.hv)} MJ/{p.unit}）
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            能源載體分類
            <select className="field-input mt-1" value={f.carrier} onChange={(e) => onChange({ carrier: e.target.value as CarrierKey })}>
              {CARRIER_ORDER.filter((c) => c !== 'electricity').map((c) => (
                <option key={c} value={c}>
                  {CARRIERS[c].label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            計量單位
            <input className="field-input mt-1" value={f.unit} maxLength={8} onChange={(e) => onChange({ unit: e.target.value || '單位' })} />
          </label>
        </div>
      )}

      {/* 主要輸入：月帳單模式（預設顯示，最貼近生活） */}
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField
          id={`${idPrefix}-monthly`}
          label={monthlyLabel}
          value={f.monthlyAmount}
          onChange={(v) => onChange({ monthlyAmount: v, mode: 'monthly' })}
          unit={monthlyUnit}
          limit="fuelMonthly"
          step={f.kind === 'lpg' ? 0.1 : 1}
          hint={
            f.kind === 'naturalGas'
              ? '帳單上的「度數」即 m³；雙月帳單請除以 2'
              : f.kind === 'lpg'
              ? '依帳單平均分攤至每日（÷ 30）'
              : '請填每月平均用量'
          }
        />
        {f.kind === 'lpg' && effectiveMode === 'monthly' && (
          <NumberField
            id={`${idPrefix}-cyl`}
            label="每桶重量"
            value={f.cylinderKg}
            onChange={(v) => onChange({ cylinderKg: v })}
            unit="kg"
            limit="cylinderKg"
            hint="家用桶裝瓦斯常見 20 kg"
          />
        )}
        <NumberField
          id={`${idPrefix}-hh`}
          label="家庭分攤人數"
          value={f.householdSize}
          onChange={(v) => onChange({ householdSize: Math.round(v) })}
          unit="人"
          limit="household"
          hint="全家共用時平均分攤到每人（一般家庭填 3–5）"
        />
      </div>

      {/* 進階設定：其他估算模式、燃料熱值 */}
      <AdvancedSection>
        <div className="col-span-full mb-2">
          <span className="text-sm font-semibold text-slate-600">改用其他估算方式</span>
          <Segmented
            label="燃料估算方式"
            value={f.mode}
            onChange={(m) => onChange({ mode: m })}
            options={[
              { value: 'monthly', label: '月帳單分攤（建議）' },
              { value: 'daily', label: '每日實際用量' },
              { value: 'equipment', label: '依設備功率估算' },
            ]}
          />
        </div>

        {f.mode === 'daily' && (
          <NumberField
            id={`${idPrefix}-daily`}
            label="每日燃料用量（全家）"
            value={f.dailyAmount}
            onChange={(v) => onChange({ dailyAmount: v })}
            unit={f.unit}
            limit="fuelDaily"
            step={0.01}
            hint="若是個人用量，分攤人數請填 1"
          />
        )}
        {f.mode === 'equipment' && (
          <>
            <NumberField
              id={`${idPrefix}-kw`}
              label="設備熱輸入功率"
              value={f.equipmentKw}
              onChange={(v) => onChange({ equipmentKw: v })}
              unit="kW"
              limit="equipmentKw"
              step={0.1}
              hint="瓦斯爐單口約 2–4.7 kW（1 kW ≈ 860 kcal/h）"
            />
            <NumberField
              id={`${idPrefix}-eh`}
              label="每日使用時間"
              value={f.equipmentHours}
              onChange={(v) => onChange({ equipmentHours: v })}
              unit="小時"
              limit="hours"
              step={0.25}
              hint="實際開火時間"
            />
          </>
        )}
        <NumberField
          id={`${idPrefix}-hv`}
          label="燃料熱值"
          value={f.heatValueMJ}
          onChange={(v) => onChange({ heatValueMJ: v })}
          unit={`MJ/${f.unit}`}
          limit="heatValue"
          step={0.1}
          hint={isCustom ? '可依產品標示修改' : '預設依能源署熱值表；通常不需更改'}
        />
      </AdvancedSection>

      {f.mode === 'equipment' && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          不確定性提醒：「依設備功率估算」假設全程以設定功率燃燒，實際多為中小火，可能高估。若有帳單資料，建議改用「月帳單分攤」。
        </p>
      )}
    </ItemShell>
  );
}

// ── 已知能源卡片 ──
export function KnownEnergyCard({
  k,
  onChange,
  onRemove,
  idPrefix,
}: {
  k: KnownEnergy;
  onChange: (patch: Partial<KnownEnergy>) => void;
  onRemove: () => void;
  idPrefix: string;
}) {
  const mj = k.unit === 'kWh' ? safe(k.value, 'knownEnergy') * 3.6 : safe(k.value, 'knownEnergy');
  return (
    <ItemShell
      icon={<Gauge size={22} />}
      title={
        <input
          aria-label="能源項目名稱"
          className="w-full max-w-xs rounded-md border border-transparent bg-transparent px-1 font-bold hover:border-slate-300 focus:border-navy-500 focus:bg-white"
          value={k.name}
          maxLength={30}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      }
      enabled={k.enabled}
      onToggle={(v) => onChange({ enabled: v })}
      badge={k.enabled ? <ResultBadge text={`≈ ${fmt(mj)} MJ／日`} /> : undefined}
      right={
        <button type="button" onClick={onRemove} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`刪除 ${k.name}`}>
          <Trash2 size={18} />
        </button>
      }
    >
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-3">
        <NumberField
          id={`${idPrefix}-v`}
          label="每日能源使用量"
          value={k.value}
          onChange={(v) => onChange({ value: v })}
          unit={k.unit}
          limit="knownEnergy"
          step={0.1}
          hint="例如電費單換算、電表讀數"
        />
        <div>
          <span className="mb-1 block text-sm font-semibold text-slate-700">單位</span>
          <Segmented
            label="能源單位"
            value={k.unit}
            onChange={(u) => onChange({ unit: u, carrier: u === 'kWh' ? 'electricity' : k.carrier })}
            options={[
              { value: 'kWh', label: 'kWh（度）' },
              { value: 'MJ', label: 'MJ' },
            ]}
          />
        </div>
        <label className="text-sm font-semibold text-slate-700">
          能源載體分類
          <select
            className="field-input mt-1"
            value={k.carrier}
            onChange={(e) => onChange({ carrier: e.target.value as CarrierKey })}
            disabled={k.unit === 'kWh'}
          >
            {CARRIER_ORDER.map((c) => (
              <option key={c} value={c}>
                {CARRIERS[c].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-500">請勿與上方已填寫的項目重複計算（例如已逐項填寫電器，就不要再輸入整戶電費度數）。</p>
    </ItemShell>
  );
}
