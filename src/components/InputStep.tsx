// Step 2：輸入每日生活資料
import { useState, type Dispatch, type SetStateAction } from 'react';
import { Plug, Car, Flame, Layers, Plus, Smartphone, ArrowRight, Calculator } from 'lucide-react';
import type { Appliance, FuelItem, Inputs, KnownEnergy, TransportItem, Results, Category } from '../types';
import { ApplianceCard, FuelCard, ItemShell, KnownEnergyCard, TransportCard } from './InputCards';
import { Expand, Note, NumberField, ParamInfo } from './ui';
import { newCustomAppliance, newCustomFuel, newKnownEnergy } from '../data/defaults';
import { CATEGORY_LABEL } from '../data/meta';
import { fmt } from '../lib/format';

type Setter = Dispatch<SetStateAction<Inputs>>;

/** 更新陣列中的某一項 */
export function patchList<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

const TABS: { key: Category; icon: typeof Plug; letter: string }[] = [
  { key: 'electricity', icon: Plug, letter: 'A' },
  { key: 'transport', icon: Car, letter: 'B' },
  { key: 'cooking', icon: Flame, letter: 'C' },
  { key: 'other', icon: Layers, letter: 'D' },
];

export function InputStep({ inputs, setInputs, results, onNext }: { inputs: Inputs; setInputs: Setter; results: Results; onNext: () => void }) {
  const [tab, setTab] = useState<Category>('electricity');

  const count = (c: Category) => {
    switch (c) {
      case 'electricity': return inputs.appliances.filter((a) => a.enabled).length + (inputs.phone.enabled ? 1 : 0);
      case 'transport': return inputs.transport.filter((t) => t.enabled).length;
      case 'cooking': return inputs.cooking.filter((f) => f.enabled).length;
      case 'other': return [...inputs.otherAppliances, ...inputs.otherFuels, ...inputs.knownEnergy].filter((x) => x.enabled).length;
    }
  };
  const subtotal = (c: Category) =>
    results.activities.filter((a) => a.category === c && (!a.shared || results.includeShared)).reduce((s, a) => s + a.energyMJ, 0);

  const setApp = (id: string, patch: Partial<Appliance>) => setInputs((s) => ({ ...s, appliances: patchList(s.appliances, id, patch) }));
  const setTr = (id: string, patch: Partial<TransportItem>) => setInputs((s) => ({ ...s, transport: patchList(s.transport, id, patch) }));
  const setCook = (id: string, patch: Partial<FuelItem>) => setInputs((s) => ({ ...s, cooking: patchList(s.cooking, id, patch) }));
  const setOA = (id: string, patch: Partial<Appliance>) => setInputs((s) => ({ ...s, otherAppliances: patchList(s.otherAppliances, id, patch) }));
  const setOF = (id: string, patch: Partial<FuelItem>) => setInputs((s) => ({ ...s, otherFuels: patchList(s.otherFuels, id, patch) }));
  const setKE = (id: string, patch: Partial<KnownEnergy>) => setInputs((s) => ({ ...s, knownEnergy: patchList(s.knownEnergy, id, patch) }));

  return (
    <section aria-labelledby="input-title" className="animate-rise space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-teal-700">STEP 2</p>
          <h2 id="input-title" className="section-title">輸入每日生活資料</h2>
          <p className="mt-1 max-w-3xl text-slate-600">
            打開你有使用的項目並調整數值，不必一次填完。每個欄位都已提供預設值，你填寫的數值會優先於預設值。
          </p>
        </div>
        <div className="card flex items-center gap-3 px-5 py-3">
          <span className="text-sm text-slate-500">目前即時估算</span>
          <span className="num text-2xl font-extrabold text-navy-800">{fmt(results.totalMJ)}</span>
          <span className="text-sm font-semibold text-slate-500">MJ／日</span>
        </div>
      </header>

      {/* 類別分頁 */}
      <div role="tablist" aria-label="輸入類別" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {TABS.map(({ key, icon: Icon, letter }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              aria-selected={active}
              aria-controls={`panel-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                active ? 'border-navy-700 bg-navy-800 text-white shadow-lg shadow-navy-900/20' : 'border-slate-200 bg-white text-slate-700 hover:border-navy-500'
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-white/15' : 'bg-navy-50 text-navy-700'}`}>
                <Icon size={20} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold opacity-70">{letter}</span>
                <span className="block font-bold">{CATEGORY_LABEL[key]}</span>
                <span className={`num block text-xs ${active ? 'text-teal-100' : 'text-slate-500'}`}>
                  {count(key)} 項啟用・{fmt(subtotal(key))} MJ
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="card space-y-4 p-4 md:p-6">
        {tab === 'electricity' && (
          <>
            <Note>
              一般電器：<b>耗電量（kWh）＝輸入功率（kW）× 每日使用時間（h）</b>；功率以 W 表示時先 ÷ 1000。冷氣壓縮機不會全程以額定功率運轉，所以另外乘上「平均負載比例」。
            </Note>
            <div className="space-y-3">
              {inputs.appliances.map((a) => (
                <ApplianceCard key={a.id} a={a} idPrefix={`app-${a.id}`} onChange={(p) => setApp(a.id, p)}
                  onRemove={a.kind === 'custom' ? () => setInputs((s) => ({ ...s, appliances: s.appliances.filter((x) => x.id !== a.id) })) : undefined}
                />
              ))}
              <ItemShell
                icon={<Smartphone size={22} />}
                title="手機充電"
                enabled={inputs.phone.enabled}
                onToggle={(v) => setInputs((s) => ({ ...s, phone: { ...s.phone, enabled: v } }))}
                badge={
                  inputs.phone.enabled ? (
                    <div className="num mt-0.5 text-sm font-semibold text-teal-700">
                      ≈ {fmt((inputs.phone.whPerCharge * inputs.phone.chargesPerDay) / 1000, 4)} kWh／日
                    </div>
                  ) : undefined
                }
              >
                <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberField id="phone-wh" label="每次充電耗電量" value={inputs.phone.whPerCharge} unit="Wh" limit="phoneWh" step={1}
                    hint="約 = 電池 mAh × 3.85 ÷ 1000，再加 10–20% 損失"
                    onChange={(v) => setInputs((s) => ({ ...s, phone: { ...s.phone, whPerCharge: v } }))} />
                  <NumberField id="phone-n" label="每日充電次數" value={inputs.phone.chargesPerDay} unit="次" limit="phoneCharges" step={0.5}
                    hint="兩天充一次可填 0.5"
                    onChange={(v) => setInputs((s) => ({ ...s, phone: { ...s.phone, chargesPerDay: v } }))} />
                </div>
              </ItemShell>
            </div>
            <button type="button" className="btn-ghost w-full border-dashed" onClick={() => setInputs((s) => ({ ...s, appliances: [...s.appliances, newCustomAppliance('其他家電')] }))}>
              <Plus size={18} aria-hidden /> 新增其他電器
            </button>
            <Expand title="電器預設參數與資料來源">
              <ParamInfo keys={['acPowerKw', 'acLoadPercent', 'fanW', 'computerW', 'tvW', 'phoneWh', 'waterHeaterKw', 'riceCookerW', 'microwaveW', 'kwhToMJ']} />
            </Expand>
          </>
        )}

        {tab === 'transport' && (
          <>
            <Note>
              燃油車：<b>燃料（L）＝距離（km）÷ 燃油效率（km/L）</b>；電動車：<b>用電（kWh）＝距離 × 每公里耗電</b>；大眾運輸：<b>個人分攤＝距離 × 每人每公里能源</b>。
              「使用頻率」會把結果換算為一週中的平均每日值。
            </Note>
            <div className="space-y-3">
              {inputs.transport.map((t) => (
                <TransportCard key={t.id} t={t} idPrefix={`tr-${t.id}`} onChange={(p) => setTr(t.id, p)} />
              ))}
            </div>
            <Expand title="交通能源參數與資料來源">
              <ParamInfo keys={['scooterKmL', 'gasCarKmL', 'dieselCarKmL', 'eScooterKwhKm', 'eCarKwhKm', 'busMJpkm', 'metroKwhPkm', 'gasolineHV', 'dieselHV']} />
            </Expand>
          </>
        )}

        {tab === 'cooking' && (
          <>
            <Note>
              <b>燃料能源量（MJ）＝燃料用量 × 該燃料熱值</b>。天然氣以「度（m³）」計量，桶裝瓦斯以「公斤」計量，兩者熱值不同，不能使用同一個換算係數。
            </Note>
            <div className="space-y-3">
              {inputs.cooking.map((f) => (
                <FuelCard key={f.id} f={f} idPrefix={`cook-${f.id}`} onChange={(p) => setCook(f.id, p)}
                  onRemove={f.kind === 'custom' ? () => setInputs((s) => ({ ...s, cooking: s.cooking.filter((x) => x.id !== f.id) })) : undefined}
                />
              ))}
            </div>
            <button type="button" className="btn-ghost w-full border-dashed" onClick={() => setInputs((s) => ({ ...s, cooking: [...s.cooking, newCustomFuel(0)] }))}>
              <Plus size={18} aria-hidden /> 新增其他烹調燃料
            </button>
            <Expand title="燃料熱值與不確定性說明">
              <ParamInfo keys={['naturalGasHV', 'lpgHV', 'lpgCylinderKg', 'stoveKw', 'butaneHV', 'charcoalHV', 'kcalToMJ']} />
            </Expand>
          </>
        )}

        {tab === 'other' && (
          <>
            <Note tone="warn">
              本版本<b>不納入</b>食物、衣物、商品製造等「隱含能源」，因為這些難以可靠估算，也容易和其他項目重複計算。這裡只填你確實知道的直接能源使用。
            </Note>
            <h3 className="pt-2 text-lg font-bold text-navy-900">其他電器</h3>
            <div className="space-y-3">
              {inputs.otherAppliances.map((a) => (
                <ApplianceCard key={a.id} a={a} idPrefix={`oa-${a.id}`} onChange={(p) => setOA(a.id, p)}
                  onRemove={() => setInputs((s) => ({ ...s, otherAppliances: s.otherAppliances.filter((x) => x.id !== a.id) }))} />
              ))}
            </div>
            <button type="button" className="btn-ghost w-full border-dashed" onClick={() => setInputs((s) => ({ ...s, otherAppliances: [...s.otherAppliances, newCustomAppliance()] }))}>
              <Plus size={18} aria-hidden /> 新增其他電器
            </button>

            <h3 className="pt-4 text-lg font-bold text-navy-900">其他燃料</h3>
            <div className="space-y-3">
              {inputs.otherFuels.map((f) => (
                <FuelCard key={f.id} f={f} idPrefix={`of-${f.id}`} onChange={(p) => setOF(f.id, p)}
                  onRemove={() => setInputs((s) => ({ ...s, otherFuels: s.otherFuels.filter((x) => x.id !== f.id) }))} />
              ))}
            </div>
            <button type="button" className="btn-ghost w-full border-dashed" onClick={() => setInputs((s) => ({ ...s, otherFuels: [...s.otherFuels, newCustomFuel(1)] }))}>
              <Plus size={18} aria-hidden /> 新增其他燃料
            </button>

            <h3 className="pt-4 text-lg font-bold text-navy-900">其他已知能源使用量</h3>
            <div className="space-y-3">
              {inputs.knownEnergy.map((k) => (
                <KnownEnergyCard key={k.id} k={k} idPrefix={`ke-${k.id}`} onChange={(p) => setKE(k.id, p)}
                  onRemove={() => setInputs((s) => ({ ...s, knownEnergy: s.knownEnergy.filter((x) => x.id !== k.id) }))} />
              ))}
            </div>
            <button type="button" className="btn-ghost w-full border-dashed" onClick={() => setInputs((s) => ({ ...s, knownEnergy: [...s.knownEnergy, newKnownEnergy()] }))}>
              <Plus size={18} aria-hidden /> 新增已知能源使用量
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map(({ key }) => (
            <span key={key} className={`h-2 w-8 rounded-full ${tab === key ? 'bg-navy-700' : 'bg-slate-300'}`} aria-hidden />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tab !== 'other' && (
            <button type="button" className="btn-ghost" onClick={() => setTab(TABS[TABS.findIndex((t) => t.key === tab) + 1].key)}>
              下一個類別 <ArrowRight size={18} aria-hidden />
            </button>
          )}
          <button type="button" className="btn-teal" onClick={onNext}>
            <Calculator size={18} aria-hidden /> 前往計算
          </button>
        </div>
      </div>
    </section>
  );
}
