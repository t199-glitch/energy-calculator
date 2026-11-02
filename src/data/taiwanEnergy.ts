// ──────────────────────────────────────────────
// 臺灣能源結構資料（非即時資料）
// 資料年度：2025 年（民國 114 年）
// 來源：環境部能源資訊平台、經濟部能源署 能源統計
// 若有新年度官方統計，請直接修改本檔案的數值與標示。
// ──────────────────────────────────────────────

export interface GenerationSource {
  key: string;
  label: string;
  /** 占全國發電量百分比 */
  percent: number;
  color: string;
  /** 對應的一次能源類別 */
  primary: PrimaryKey;
  description: string;
  /** 燃料主要來源 */
  supply: string;
}

export type PrimaryKey = 'coal' | 'gas' | 'oil' | 'nuclear' | 'renewable' | 'storage' | 'other';

export const PRIMARY_LABEL: Record<PrimaryKey, string> = {
  coal: '煤炭',
  gas: '天然氣',
  oil: '石油',
  nuclear: '核能',
  renewable: '再生能源',
  storage: '抽蓄水力（儲能）',
  other: '其他／未分類',
};

export const PRIMARY_COLOR: Record<PrimaryKey, string> = {
  coal: '#475569',
  gas: '#0f9488',
  oil: '#ea7a1a',
  nuclear: '#7c5cc4',
  renewable: '#22a35a',
  storage: '#38bdf8',
  other: '#94a3b8',
};

export const GENERATION_META = {
  dataYear: '2025 年（民國 114 年）',
  scope:
    '全國總發電量結構（含台電公司、民營電廠及自用發電設備），以發電量（度）計算之百分比；抽蓄水力為儲能，其電力來自其他電源',
  source: '環境部能源資訊平台・經濟部能源署 能源統計',
  sourceUrl: 'https://www.moeaea.gov.tw/',
  compiledDate: '2026-11-02',
  totalGeneration: '約 2,897 億度',
  disclaimer:
    '本網站資料為整理後的年度統計，非即時資料。2025 年核三廠二號機於年中依規停機，全年核能占比僅 1.1%；再生能源細項（太陽光電、風力、其他）依 2024 年結構比例推估分配，正式細項數字請查閱能源署最新統計年報。各類別加總因四捨五入可能不等於 100%。',
};

export const GENERATION_MIX: GenerationSource[] = [
  {
    key: 'gas', label: '燃氣發電', percent: 47.7, color: '#0f9488', primary: 'gas',
    description: '以天然氣燃燒推動燃氣渦輪機，常搭配複循環機組提高效率；2025 年占比上升至 47.7%，為首要電力來源，可快速升降載以調度尖峰負載。',
    supply: '天然氣幾乎全數以液化天然氣（LNG）船進口，在接收站氣化後經管線送至電廠。',
  },
  {
    key: 'coal', label: '燃煤發電', percent: 35.3, color: '#475569', primary: 'coal',
    description: '燃燒煤炭產生蒸汽推動汽輪機，傳統上承擔基載電力；2025 年占比降至 35.3%，燃燒過程排放空氣污染物與溫室氣體較多。',
    supply: '煤炭幾乎全數仰賴散裝船進口，臺灣本島已無商業性煤礦開採。',
  },
  {
    key: 'solar', label: '太陽光電', percent: 6.0, color: '#f5b301', primary: 'renewable',
    description: '利用太陽能電池將日照直接轉換為電力，白天發電，受天氣、季節與日照時數影響。2025 年持續快速成長，裝置容量已逾 30 GW。',
    supply: '本土自產能源；屋頂型與地面型光電分布受土地利用與日照條件影響。',
  },
  {
    key: 'wind', label: '風力發電', percent: 4.1, color: '#38a3d6', primary: 'renewable',
    description: '利用風推動葉片發電，包含陸域與離岸風電；臺灣海峽冬季東北季風強勁，離岸風場快速增加中。',
    supply: '本土自產能源；離岸風場集中於彰化、苗栗、雲林等西部海域。',
  },
  {
    key: 'otherRenewable', label: '其他再生能源（水力、生質及廢棄物、地熱）', percent: 3.2, color: '#22a35a', primary: 'renewable',
    description: '包含慣常水力、生質能與廢棄物發電、地熱等；水力受降雨與水庫蓄水量影響。',
    supply: '主要為本土自產能源。',
  },
  {
    key: 'nuclear', label: '核能發電', percent: 1.1, color: '#7c5cc4', primary: 'nuclear',
    description: '2025 年核三廠二號機依法於年中停機，全年平均核能占比降至 1.1%。臺灣三座核電廠（核一、核二、核三）已全數停止商業運轉。',
    supply: '核燃料需自國外採購；核廢料最終處置地點尚未確定，為重要政策議題。',
  },
  {
    key: 'oil', label: '燃油發電', percent: 1.6, color: '#ea7a1a', primary: 'oil',
    description: '燃燒重油或柴油發電，目前占比低，多作為備用或離島供電。',
    supply: '原油與油品主要自中東等地區以油輪進口。',
  },
  {
    key: 'pumped', label: '抽蓄水力', percent: 1.0, color: '#7dd3fc', primary: 'storage',
    description: '用電離峰時以電力抽水至上池，尖峰時放水發電，屬於儲能設施，不是新的一次能源。',
    supply: '其抽水電力來自電網中的其他電源。',
  },
];

/** 能源進口依賴（約略值，供教學討論） */
export const IMPORT_DEPENDENCY = {
  label: '能源進口依存度',
  valueText: '約 94.6%',
  note:
    '依環境部能源資訊平台統計，2025 年（民國 114 年）臺灣能源進口依存度約為 94.62%。相較過去高峰期（2015 年逾 97%），隨再生能源增加已呈微幅下降趨勢。確切年度數值請查閱能源署「能源統計年報」。',
  source: '環境部能源資訊平台・經濟部能源署 能源統計（2025 年）',
};

/** 一次能源供應鏈：用於教學說明（質性描述，不含即時數據） */
export const SUPPLY_CHAINS = [
  {
    key: 'oil',
    title: '石油：從油田到加油站',
    steps: ['海外油田（中東等地）', '油輪跨洋運輸', '煉油廠煉製', '油管／油罐車配送', '加油站'],
    note: '汽油、柴油與部分液化石油氣都是原油煉製的產品。海上運輸常經過荷莫茲海峽、麻六甲海峽等關鍵航道。',
  },
  {
    key: 'gas',
    title: '天然氣：從氣田到家中瓦斯爐',
    steps: ['海外氣田', '液化（−162°C）', 'LNG 船運輸', '接收站氣化', '管線輸送至電廠與家庭'],
    note: 'LNG 需要專用接收站與儲槽，儲存天數相對有限，因此船期穩定對供氣安全很重要。主要供應國包含澳洲、卡達、美國等。',
  },
  {
    key: 'electricity',
    title: '電力：從電廠到插座',
    steps: ['各類電廠發電', '升壓輸電', '變電所', '配電線路', '家中插座'],
    note: '電網中所有電廠的電力匯流在一起，插座端無法辨識某一度電來自哪一座電廠或哪一種機組。',
  },
];
