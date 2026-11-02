// Step 1：首頁
import { Bolt, MapPin, Leaf, ChevronRight, FlaskConical } from 'lucide-react';

const HERO_IMG = `${import.meta.env.BASE_URL}hero.png`;

const FEATURES = [
  { icon: <Bolt size={22} className="text-amber-500" />, title: '能源消耗估算', desc: '輸入家電、交通、燃料用量，在瀏覽器端即時計算每日能源消耗量。' },
  { icon: <MapPin size={22} className="text-teal-600" />, title: '臺灣能源地理', desc: '了解臺灣的發電結構、進口依賴與國際能源供應路徑。' },
  { icon: <FlaskConical size={22} className="text-navy-700" />, title: '情境比較', desc: '調整生活模式參數，即時比較不同選擇對能源消耗的影響。' },
  { icon: <Leaf size={22} className="text-green-600" />, title: '地理課堂探究', desc: '內建探究問題與進階思考，適合課堂討論與作業引導。' },
];

export function LandingStep({
  onStart,
  onDemo,
}: {
  onStart: () => void;
  onDemo: () => void;
}) {
  return (
    <section aria-labelledby="landing-title" className="animate-rise">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-700 to-teal-700 px-6 py-12 md:px-12 md:py-16 text-white mb-10">
        {/* 背景裝飾 */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(20,163,148,0.25),transparent_55%)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-4/5 w-1/2 overflow-hidden opacity-15 select-none" aria-hidden>
          <img src={HERO_IMG} alt="" className="h-full w-full object-cover object-left" />
        </div>

        <div className="relative max-w-xl">
          <div className="chip mb-4 bg-teal-500/20 text-teal-200 text-sm">高中地理・能源議題・108課綱</div>
          <h1 id="landing-title" className="text-3xl font-black tracking-tight md:text-5xl leading-tight">
            我的一天，<br />消耗多少能源？
          </h1>
          <p className="mt-4 text-lg text-teal-100 leading-relaxed">
            從日常生活出發，探索能源如何驅動我們的世界。
          </p>
          <p className="mt-3 text-sm text-teal-200 leading-relaxed max-w-lg">
            輸入你的日常活動，估算個人每日能源消耗量、辨識使用的能源種類，並了解臺灣的發電結構與能源進口依賴。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              id="btn-start"
              className="btn-teal text-base px-6 py-3 pulse-ring"
              onClick={onStart}
            >
              開始計算 <ChevronRight size={20} aria-hidden />
            </button>
            <button
              type="button"
              id="btn-demo"
              className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20 text-base px-6 py-3"
              onClick={onDemo}
            >
              載入示範情境
            </button>
          </div>
        </div>
      </div>

      {/* 功能特色 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-10">
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} className="card flex gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50">{icon}</span>
            <div>
              <div className="font-bold text-slate-800">{title}</div>
              <div className="mt-1 text-sm text-slate-600 leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 重要說明 */}
      <div className="card p-5 md:p-8 space-y-5">
        <h2 className="text-xl font-bold text-navy-900">使用前請閱讀：本工具的定位與限制</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: '✅ 本工具計算什麼',
              items: [
                '電器、交通、烹調的「終端能源」消耗量（kWh 與 MJ）',
                '各能源載體（電力、汽油、天然氣等）的使用比例',
                '臺灣發電結構的教學說明（依官方公開統計）',
                '不同生活模式的能源消耗情境比較',
              ],
              bg: 'bg-teal-50 border-teal-200',
              textColor: 'text-teal-800',
            },
            {
              title: '⚠️ 本工具不計算什麼',
              items: [
                '碳排放量（不是碳足跡計算器）',
                '食物、衣物、商品製造的「隱含能源」',
                '精確的一次能源消耗（不納入發電效率損耗加總）',
                '個人實際的電力發電來源（電網無法辨識）',
              ],
              bg: 'bg-amber-50 border-amber-200',
              textColor: 'text-amber-800',
            },
          ].map(({ title, items, bg, textColor }) => (
            <div key={title} className={`rounded-xl border p-4 ${bg}`}>
              <div className={`font-bold mb-2 ${textColor}`}>{title}</div>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className={`flex items-start gap-2 text-sm ${textColor}`}>
                    <span className="mt-1 shrink-0">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
          <p><b>估算精度說明：</b>計算結果依照使用者輸入及預設參數估算，<b>不代表個人實際能源帳單或精確的生命週期能源消耗</b>。電器功率、車輛燃油效率等預設值為教學示範值，可依實際產品標示修改。</p>
          <p><b>資料儲存說明：</b>輸入的資料只儲存在你目前使用的瀏覽器中（localStorage），<b>不會上傳至任何伺服器</b>，關閉視窗或清除瀏覽器資料後即消失。本工具不收集任何個人識別資訊。</p>
          <p><b>版本資訊：</b>第一版（2026年）。臺灣能源統計資料使用 2024 年（民國 113 年）能源署統計，非即時資料，教師使用前建議核對最新年度數據。</p>
        </div>

        <div className="flex justify-center pt-2">
          <button type="button" className="btn-primary text-base px-8 py-3" onClick={onStart}>
            我已了解，開始計算 <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
