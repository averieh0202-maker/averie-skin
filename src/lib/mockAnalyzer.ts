import {
  AnalysisInput,
  AnalysisResult,
  Concern,
  ConcernId,
  DimStatus,
  FaceRegion,
  Gender,
  PerceptionDimension,
  PerceptionKey,
  ProductCategory,
  ProductItem,
  SkinTypeLabel,
  TierId,
} from '../types/analysis';
import { tierFromScore, DISCLAIMER } from '../theme/tiers';

/** Simple deterministic hash from string → 0..1 */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function seeded(seed: number, salt: number): number {
  const x = Math.sin(seed * 9999 + salt * 77.7) * 10000;
  return x - Math.floor(x);
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Exact free-result display names — do not rename */
const FREE_DIM_LABELS: Record<PerceptionKey, string> = {
  glow: '光泽',
  oil: '出油',
  pores: '毛孔',
  texture: '纹理',
  evenness: '色匀',
  fine_lines: '细纹',
  redness: '泛红',
};

const FREE_DIM_ORDER: PerceptionKey[] = [
  'glow',
  'oil',
  'pores',
  'texture',
  'evenness',
  'fine_lines',
  'redness',
];

function statusFromScore(value: number): DimStatus {
  if (value >= 78) return '稳定';
  if (value >= 62) return '尚可';
  if (value >= 45) return '可观察';
  return '需留意';
}

const SKIN_TYPES: Array<{ label: SkinTypeLabel; label_zh: string }> = [
  { label: 'oil_prone', label_zh: '偏油' },
  { label: 'dry_prone', label_zh: '偏干' },
  { label: 'combination_prone', label_zh: '混合倾向' },
  { label: 'balanced_prone', label_zh: '相对平衡' },
];

const CONCERN_POOL: Array<{
  id: ConcernId;
  label_zh: string;
  regions: FaceRegion[];
  notes: string[];
}> = [
  {
    id: 'pores',
    label_zh: '毛孔',
    regions: ['t_zone', 'nose'],
    notes: ['本次影像可见 T 区毛孔在光线下更清晰', '本次影像可见鼻翼两侧细小毛孔纹理'],
  },
  {
    id: 'dullness',
    label_zh: '暗沉',
    regions: ['cheeks', 'full_face'],
    notes: ['本次影像可见面中光泽偏弱', '本次影像可见整体反光略显疲惫'],
  },
  {
    id: 'oiliness',
    label_zh: '出油',
    regions: ['t_zone', 'forehead'],
    notes: ['本次影像可见前额与鼻梁有轻微油光', '本次影像可见 T 区反光略多于两颊'],
  },
  {
    id: 'dryness_flakes',
    label_zh: '干燥起皮',
    regions: ['cheeks', 'chin'],
    notes: ['本次影像可见两颊纹理偏干', '本次影像可见下巴附近细微干纹'],
  },
  {
    id: 'pigmentation',
    label_zh: '色沉',
    regions: ['cheeks', 'perioral'],
    notes: ['本次影像可见面颊局部色调不均', '本次影像可见口周附近轻微色差'],
  },
  {
    id: 'texture',
    label_zh: '粗糙纹理',
    regions: ['cheeks', 'forehead'],
    notes: ['本次影像可见面颊细纹纹理略粗', '本次影像可见前额肤感不够细腻'],
  },
  {
    id: 'redness',
    label_zh: '泛红',
    regions: ['cheeks', 'nose'],
    notes: ['本次影像可见两颊轻微泛红', '本次影像可见鼻翼周围色调偏红'],
  },
  {
    id: 'acne',
    label_zh: '痘点外观',
    regions: ['chin', 'forehead'],
    notes: ['本次影像可见下巴附近零星凸起', '本次影像可见前额局部小范围凸起'],
  },
  {
    id: 'sensitivity_appearance',
    label_zh: '敏感外观',
    regions: ['cheeks', 'full_face'],
    notes: ['本次影像可见面颊偏敏感的外观', '本次影像可见整体屏障观感偏脆弱'],
  },
];

const ZONE_ZH: Record<FaceRegion, string> = {
  forehead: '前额',
  t_zone: 'T 区',
  cheeks: '两颊',
  chin: '下巴',
  nose: '鼻部',
  perioral: '口周',
  full_face: '全脸',
};

const CATEGORY_ZH: Record<ProductCategory, string> = {
  cleanser: '洁面',
  toner: '爽肤水',
  serum: '精华',
  moisturizer: '保湿',
  sunscreen: '防晒',
  treatment: '修护护理',
  other: '其他',
};

type CatalogEntry = {
  slot: string;
  category: ProductCategory;
  product_type: string;
  name: string;
  model: string;
  fits: Array<ConcernId | SkinTypeLabel | PerceptionKey | 'barrier'>;
  mappedConcern: (ctx: ProductWhyCtx) => string;
  whyTemplate: (ctx: ProductWhyCtx) => string;
};

interface ProductWhyCtx {
  skinTypeZh: string;
  skinLabel: SkinTypeLabel;
  concerns: Concern[];
  perception: PerceptionDimension[];
  score: number;
  tierName: string;
}

function dim(
  perception: PerceptionDimension[],
  key: PerceptionKey,
): number {
  return perception.find((p) => p.key === key)?.value ?? 50;
}

function lowestDims(
  perception: PerceptionDimension[],
  n: number,
): PerceptionDimension[] {
  return [...perception].sort((a, b) => a.value - b.value).slice(0, n);
}

function highestDims(
  perception: PerceptionDimension[],
  n: number,
): PerceptionDimension[] {
  return [...perception].sort((a, b) => b.value - a.value).slice(0, n);
}

const PRODUCT_CATALOG: CatalogEntry[] = [
  {
    slot: 'am_cleanser',
    category: 'cleanser',
    product_type: 'gentle_cleanser',
    name: '珂润',
    model: '润浸保湿洁颜泡沫 150ml',
    fits: ['oil_prone', 'combination_prone', 'sensitivity_appearance', 'oiliness', 'oil'],
    mappedConcern: (ctx) => {
      const oil = dim(ctx.perception, 'oil');
      const red = dim(ctx.perception, 'redness');
      if (oil < 55) return '出油';
      if (red < 55) return '泛红';
      return ctx.concerns[0]?.label_zh ?? '出油';
    },
    whyTemplate: (ctx) => {
      const oil = dim(ctx.perception, 'oil');
      const red = dim(ctx.perception, 'redness');
      return `质地为细密泡沫，清洁力适中。氨基酸体系扮演温和去脂角色，对应本次出油观感（约 ${oil}）与可能并存的泛红（约 ${red}）。晨间使用一次即可，避免反复搓洗。边界：不替代卸妆，亦不做深层去角质。`;
    },
  },
  {
    slot: 'am_serum',
    category: 'serum',
    product_type: 'niacinamide_serum',
    name: 'The Ordinary',
    model: 'Niacinamide 10% + Zinc 1% 30ml',
    fits: ['oiliness', 'pores', 'acne', 'oil_prone', 'combination_prone', 'oil', 'pores'],
    mappedConcern: (ctx) => {
      const pores = dim(ctx.perception, 'pores');
      const oil = dim(ctx.perception, 'oil');
      if (pores <= oil) return '毛孔';
      return '出油';
    },
    whyTemplate: (ctx) => {
      const pores = dim(ctx.perception, 'pores');
      const oil = dim(ctx.perception, 'oil');
      return `质地清薄水感。烟酰胺与锌盐对应本次毛孔（约 ${pores}）与出油（约 ${oil}）观感，而非泛泛提亮。洁面后薄涂一层，再接保湿与防晒。边界：浓度偏高者可隔日起步；可见泛红明显时暂缓叠加其他刺激性成分。`;
    },
  },
  {
    slot: 'am_moisturizer',
    category: 'moisturizer',
    product_type: 'lightweight_moisturizer',
    name: '理肤泉',
    model: '特安舒缓修复霜 40ml',
    fits: ['redness', 'sensitivity_appearance', 'barrier', 'dry_prone', 'redness'],
    mappedConcern: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const tex = dim(ctx.perception, 'texture');
      if (red < 60) return '泛红';
      if (tex < 60) return '纹理';
      return '泛红';
    },
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const oil = dim(ctx.perception, 'oil');
      return `质地偏轻乳霜。舒缓修护角色用于稳住本次泛红外观（约 ${red}），同时兼顾出油观感（约 ${oil}）下的日间屏障层。防晒前涂于两颊与口周。边界：不承诺消退发红；T 区可更薄。`;
    },
  },
  {
    slot: 'am_sunscreen',
    category: 'sunscreen',
    product_type: 'sunscreen',
    name: '安热沙',
    model: '金灿倍护防晒乳 SPF50+ 60ml',
    fits: ['pigmentation', 'evenness', 'glow', 'dullness', 'fine_lines'],
    mappedConcern: (ctx) => {
      const even = dim(ctx.perception, 'evenness');
      const glow = dim(ctx.perception, 'glow');
      if (even <= glow) return '色匀';
      return '光泽';
    },
    whyTemplate: (ctx) => {
      const even = dim(ctx.perception, 'evenness');
      const glow = dim(ctx.perception, 'glow');
      return `质地成膜后偏干爽。防晒角色是保住本次色匀（约 ${even}）与光泽（约 ${glow}）观感，降低紫外线进一步拉开分区色差的风险。保湿后足量涂抹，户外需补涂。边界：不承诺美白或淡斑；仅作日间防护步骤。`;
    },
  },
  {
    slot: 'pm_cleanser',
    category: 'cleanser',
    product_type: 'gentle_cleanser',
    name: '芙丽芳丝',
    model: '净润洗面霜 100g',
    fits: ['sensitivity_appearance', 'redness', 'dry_prone', 'barrier', 'redness'],
    mappedConcern: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      if (red < 58) return '泛红';
      return ctx.concerns.find((c) => c.id === 'sensitivity_appearance')?.label_zh ?? '纹理';
    },
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const tex = dim(ctx.perception, 'texture');
      return `质地为霜状洁面。氨基酸体系卸除防晒与日间残留，对应本次泛红（约 ${red}）与纹理（约 ${tex}）观感，减少两颊被洗紧的风险。晚间第一步，温水洗净即可。边界：不与强清洁同晚叠加。`;
    },
  },
  {
    slot: 'pm_serum',
    category: 'serum',
    product_type: 'soothing_serum',
    name: '修丽可',
    model: '色修精华（Phyto+）30ml',
    fits: ['redness', 'pigmentation', 'evenness', 'sensitivity_appearance'],
    mappedConcern: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const even = dim(ctx.perception, 'evenness');
      if (red <= even) return '泛红';
      return '色匀';
    },
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const even = dim(ctx.perception, 'evenness');
      return `质地轻薄易推开。植物舒缓成分对应本次可见的泛红（约 ${red}）与色匀（约 ${even}）信号。洁面后、保湿前使用，晚间为宜。边界：不替代防晒，亦不承诺医疗级消退；若未看到改善空间可维持观察。`;
    },
  },
  {
    slot: 'pm_treatment',
    category: 'treatment',
    product_type: 'barrier_cream',
    name: '薇诺娜',
    model: '舒敏保湿特护霜 50g',
    fits: ['sensitivity_appearance', 'redness', 'dryness_flakes', 'barrier', 'texture'],
    mappedConcern: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const tex = dim(ctx.perception, 'texture');
      if (red < 55) return '泛红';
      if (tex < 55) return '纹理';
      return '细纹';
    },
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const lines = dim(ctx.perception, 'fine_lines');
      return `质地偏润但不厚重。舒缓保湿角色针对本次泛红（约 ${red}）与细纹观感（约 ${lines}），夜间在两颊与口周薄涂。节奏上可作晚间封层，T 区减量。边界：对应的是「看起来偏敏感、易干红」信号，非突击祛痘。`;
    },
  },
  {
    slot: 'pm_moisturizer',
    category: 'moisturizer',
    product_type: 'night_moisturizer',
    name: '雅诗兰黛',
    model: '特润修护肌透精华霜 50ml',
    fits: ['dry_prone', 'texture', 'dullness', 'barrier', 'glow', 'fine_lines'],
    mappedConcern: (ctx) => {
      const tex = dim(ctx.perception, 'texture');
      const lines = dim(ctx.perception, 'fine_lines');
      const glow = dim(ctx.perception, 'glow');
      if (tex <= lines && tex <= glow) return '纹理';
      if (lines <= glow) return '细纹';
      return '光泽';
    },
    whyTemplate: (ctx) => {
      const glow = dim(ctx.perception, 'glow');
      const tex = dim(ctx.perception, 'texture');
      return `质地滋润乳霜。夜间封层角色对应本次光泽（约 ${glow}）与纹理（约 ${tex}）观感，改善干哑铺垫。精华后使用，主要落在两颊。边界：偏油或混合倾向避开 T 区厚涂；不承诺淡纹时效。`;
    },
  },
];

function pickConcerns(seed: number, count: number): Concern[] {
  const indices = [...CONCERN_POOL.keys()].sort(
    (a, b) => seeded(seed, a + 10) - seeded(seed, b + 10),
  );
  return indices.slice(0, count).map((i) => {
    const c = CONCERN_POOL[i];
    const noteIdx = Math.floor(seeded(seed, i + 50) * c.notes.length);
    return {
      id: c.id,
      label_zh: c.label_zh,
      regions: c.regions,
      note: c.notes[noteIdx],
    };
  });
}

function observationFor(
  key: PerceptionKey,
  value: number,
  seed: number,
  skinLabel: SkinTypeLabel,
  concerns: Concern[],
): string {
  const has = (id: ConcernId) => concerns.some((c) => c.id === id);
  const variants: Record<PerceptionKey, string[]> = {
    glow:
      value >= 70
        ? ['本次影像可见面中反光较清晰，光泽分布相对均匀', '本次影像可见整体光泽感尚可']
        : ['本次影像可见面中光泽偏弱，反光略显哑', '本次影像可见光泽集中不足，观感偏平'],
    oil:
      skinLabel === 'oil_prone' || has('oiliness') || value < 55
        ? ['本次影像可见 T 区油光略多于两颊', '本次影像可见前额与鼻梁有轻微油光']
        : skinLabel === 'dry_prone' || has('dryness_flakes')
          ? ['本次影像可见出油信号不强，两颊偏干哑', '本次影像未看到明显油光，中部偏哑']
          : ['本次影像可见出油与干燥信号大致平衡', '本次影像可见分区油光差异不大'],
    pores:
      value < 60 || has('pores')
        ? ['本次影像可见鼻翼与 T 区毛孔更清晰', '本次影像可见局部毛孔纹理偏明显']
        : ['本次影像可见毛孔观感相对收敛', '本次影像未看到大面积毛孔放大'],
    texture:
      value < 60 || has('texture') || has('dryness_flakes')
        ? ['本次影像可见面颊纹理略粗', '本次影像可见局部肤感不够细腻']
        : ['本次影像可见纹理相对平整', '本次影像未看到明显粗糙起伏'],
    evenness:
      value < 60 || has('pigmentation') || has('dullness')
        ? ['本次影像可见面颊局部色调不均', '本次影像可见口周或面中轻微色差']
        : ['本次影像可见色调分布相对均匀', '本次影像未看到明显成片色差'],
    fine_lines:
      value < 58
        ? ['本次影像可见眼周或前额细纹略清晰', '本次影像可见局部细纹在侧光下更明显']
        : ['本次影像可见细纹观感较轻', '本次影像未看到明显深纹走向'],
    redness:
      value < 60 || has('redness') || has('sensitivity_appearance')
        ? ['本次影像可见两颊或鼻翼轻微泛红', '本次影像可见局部色调偏红']
        : ['本次影像可见泛红信号不强', '本次影像未看到成片发红'],
  };
  const list = variants[key];
  const idx = Math.floor(seeded(seed, value + key.length) * list.length);
  return list[idx];
}

function buildPerception(
  seed: number,
  score: number,
  skinLabel: SkinTypeLabel,
  concerns: Concern[],
): PerceptionDimension[] {
  const has = (id: ConcernId) => concerns.some((c) => c.id === id);

  const glow = clampScore(
    score +
      Math.floor((seeded(seed, 20) - 0.5) * 14) +
      (has('dullness') ? -10 : 4),
  );
  const oilBias =
    skinLabel === 'oil_prone' || skinLabel === 'combination_prone'
      ? -10
      : skinLabel === 'dry_prone'
        ? 8
        : 0;
  // Higher = more comfortable / less oily appearance for display score
  const oil = clampScore(
    score +
      oilBias +
      Math.floor((seeded(seed, 21) - 0.5) * 20) +
      (has('oiliness') ? -12 : 0) +
      (has('dryness_flakes') ? 6 : 0),
  );
  const pores = clampScore(
    score +
      Math.floor((seeded(seed, 22) - 0.5) * 16) +
      (has('pores') || has('oiliness') ? -12 : 4),
  );
  const texture = clampScore(
    score +
      Math.floor((seeded(seed, 23) - 0.5) * 16) +
      (has('texture') || has('dryness_flakes') ? -10 : 5),
  );
  const evenness = clampScore(
    score +
      Math.floor((seeded(seed, 24) - 0.5) * 14) +
      (has('pigmentation') || has('dullness') ? -10 : 5),
  );
  const fine_lines = clampScore(
    score +
      Math.floor((seeded(seed, 25) - 0.5) * 12) +
      (has('texture') ? -6 : 3),
  );
  const redness = clampScore(
    score +
      Math.floor((seeded(seed, 26) - 0.5) * 18) +
      (has('redness') || has('inflammation') || has('sensitivity_appearance')
        ? -14
        : 6),
  );

  const values: Record<PerceptionKey, number> = {
    glow,
    oil,
    pores,
    texture,
    evenness,
    fine_lines,
    redness,
  };

  return FREE_DIM_ORDER.map((key) => {
    const value = values[key];
    return {
      key,
      label_zh: FREE_DIM_LABELS[key],
      value,
      observation: observationFor(key, value, seed, skinLabel, concerns),
      status: statusFromScore(value),
    };
  });
}

function buildHeadline(
  perception: PerceptionDimension[],
  skinTypeZh: string,
): string {
  const highs = highestDims(perception, 1);
  const lows = lowestDims(perception, 2);
  const strength = highs[0]?.label_zh ?? '光泽';
  const focus = lows.map((d) => d.label_zh).join('、');
  return `可见${strength}相对占优，宜留意${focus}；倾向${skinTypeZh}。外观评估仅供护肤参考，非医疗诊断。`;
}

function selectProducts(seed: number, ctx: ProductWhyCtx): ProductItem[] {
  const concernIds = new Set(ctx.concerns.map((c) => c.id));
  const lowKeys = new Set(lowestDims(ctx.perception, 3).map((d) => d.key));

  const ranked = PRODUCT_CATALOG.map((p, i) => {
    let fit = seeded(seed, i + 100) * 0.35;
    for (const f of p.fits) {
      if (f === ctx.skinLabel) fit += 1.2;
      if (concernIds.has(f as ConcernId)) fit += 1.0;
      if (lowKeys.has(f as PerceptionKey)) fit += 0.9;
      if (f === 'barrier') fit += 0.15;
    }
    if (['am_cleanser', 'am_sunscreen', 'pm_cleanser', 'am_moisturizer'].includes(p.slot)) {
      fit += 0.85;
    }
    return { p, fit };
  }).sort((a, b) => b.fit - a.fit);

  const count = 5 + Math.floor(seeded(seed, 13) * 2); // 5–6
  const picked: CatalogEntry[] = [];
  for (const { p } of ranked) {
    if (picked.length >= count) break;
    if (picked.some((x) => x.slot === p.slot)) continue;
    picked.push(p);
  }

  const ensure = ['am_cleanser', 'am_sunscreen', 'pm_cleanser', 'am_moisturizer'];
  for (const slot of ensure) {
    if (!picked.some((p) => p.slot === slot)) {
      const extra = PRODUCT_CATALOG.find((p) => p.slot === slot);
      if (extra && picked.length < 7) picked.push(extra);
    }
  }

  // Prefer AM order: cleanser → serum → moisturizer → sunscreen in display
  const slotOrder = [
    'am_cleanser',
    'am_serum',
    'am_moisturizer',
    'am_sunscreen',
    'pm_cleanser',
    'pm_serum',
    'pm_treatment',
    'pm_moisturizer',
  ];
  picked.sort(
    (a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot),
  );

  return picked.map((p) => ({
    slot: p.slot,
    category: p.category,
    category_zh: CATEGORY_ZH[p.category],
    product_type: p.product_type,
    name: p.name,
    model: p.model,
    mapped_concern: p.mappedConcern(ctx),
    why: p.whyTemplate(ctx),
  }));
}

/**
 * Mock analyzer — deterministic from gender + age + imageUri seed.
 * Schema v1.4: 7 free dims, product mapped_concern, routine 清洁→精华→保湿→防晒.
 */
export function analyzeSkin(input: AnalysisInput): AnalysisResult {
  const seedStr = `${input.gender}|${input.age}|${input.imageUri}`;
  const seed = hashSeed(seedStr);

  let base = 28 + Math.floor(seeded(seed, 1) * 68); // 28–95
  if (input.age >= 22 && input.age <= 35) {
    base = Math.min(98, base + Math.floor(seeded(seed, 2) * 8));
  }
  if (input.gender === 'female') {
    base = Math.min(100, base + Math.floor(seeded(seed, 3) * 4));
  }
  const score = Math.max(0, Math.min(100, base));
  const tier = tierFromScore(score);

  const typeIdx = Math.floor(seeded(seed, 4) * SKIN_TYPES.length);
  const skinType = SKIN_TYPES[typeIdx];

  const concernCount = 2 + Math.floor(seeded(seed, 5) * 2); // 2–3
  const concerns = pickConcerns(seed, concernCount);

  const perception = buildPerception(seed, score, skinType.label, concerns);

  const breakdown = {
    glow: clampScore(score + Math.floor((seeded(seed, 6) - 0.5) * 16)),
    evenness: clampScore(score + Math.floor((seeded(seed, 7) - 0.5) * 18)),
    clarity: clampScore(score + Math.floor((seeded(seed, 8) - 0.5) * 14)),
    barrier_appearance: clampScore(
      score + Math.floor((seeded(seed, 9) - 0.5) * 20),
    ),
  };

  const confidence = 0.62 + seeded(seed, 10) * 0.28;
  const quality = 0.7 + seeded(seed, 11) * 0.25;

  const headline = buildHeadline(perception, skinType.label_zh);

  const zoneNotes = concerns.flatMap((c) =>
    c.regions.slice(0, 1).map((zone) => ({
      zone,
      zone_zh: ZONE_ZH[zone],
      note: c.note,
    })),
  );

  const seen = new Set<string>();
  const uniqueZones = zoneNotes.filter((z) => {
    if (seen.has(z.zone)) return false;
    seen.add(z.zone);
    return true;
  });

  const productCtx: ProductWhyCtx = {
    skinTypeZh: skinType.label_zh,
    skinLabel: skinType.label,
    concerns,
    perception,
    score,
    tierName: tier.name,
  };
  const items = selectProducts(seed, productCtx);

  const evidenceMap: Record<SkinTypeLabel, string[]> = {
    oil_prone: ['本次影像可见 T 区油光', '本次影像可见面中反光略强'],
    dry_prone: ['本次影像可见两颊纹理偏干', '本次影像可见光泽感偏哑'],
    combination_prone: [
      '本次影像可见 T 区与两颊观感差异',
      '本次影像可见中部偏油、外侧偏干',
    ],
    balanced_prone: [
      '本次影像可见整体油水平衡较好',
      '本次影像可见分区差异不大',
    ],
    unclear: ['当前光线下暂难判断'],
  };

  const oil = dim(perception, 'oil');
  const red = dim(perception, 'redness');
  const pores = dim(perception, 'pores');
  const tex = dim(perception, 'texture');
  const even = dim(perception, 'evenness');
  const glow = dim(perception, 'glow');
  const lines = dim(perception, 'fine_lines');

  // Routine order: 清洁 → (精华 optional) → 保湿 → 防晒
  const includeSerum = pores < 62 || oil < 58 || red < 58 || seeded(seed, 30) > 0.35;

  const amRoutine = [
    {
      step: 1,
      action: '清洁',
      purpose: `清除隔夜皮脂与灰尘。对应本次出油观感（约 ${oil}），温和洁面即可，避免过度清洁加重泛红。`,
      product_type: 'gentle_cleanser',
    },
    ...(includeSerum
      ? [
          {
            step: 2,
            action: '精华',
            purpose: `针对本次毛孔（约 ${pores}）或泛红（约 ${red}）做轻量护理。薄涂一层，为保湿铺垫。`,
            product_type: 'serum',
          },
        ]
      : []),
    {
      step: includeSerum ? 3 : 2,
      action: '保湿',
      purpose: `维护日间屏障外观。纹理观感约 ${tex}，选择轻薄质地，减少闷厚感。`,
      product_type: 'lightweight_moisturizer',
    },
    {
      step: includeSerum ? 4 : 3,
      action: '防晒',
      purpose: `日间基础防护。对应色匀（约 ${even}）与光泽（约 ${glow}），降低紫外线拉开分区色差的风险。`,
      product_type: 'sunscreen',
    },
  ];

  const pmRoutine = [
    {
      step: 1,
      action: '清洁',
      purpose: `卸除防晒与日间残留。为毛孔（约 ${pores}）区域减少堵塞风险，温水洗净即可。`,
      product_type: 'gentle_cleanser',
    },
    {
      step: 2,
      action: '精华',
      purpose: `对应本次关注点（${concerns.map((c) => c.label_zh).join('、')}）。以舒缓或控油观感为主，不强刺激。`,
      product_type: 'serum',
    },
    {
      step: 3,
      action: '保湿',
      purpose: `封存水分，缓和干燥或泛红外观（约 ${red}）。细纹观感约 ${lines}；分区涂抹，T 区薄、两颊可稍厚。`,
      product_type: 'night_moisturizer',
    },
  ];

  const lowLabels = lowestDims(perception, 2)
    .map((d) => d.label_zh)
    .join('、');

  return {
    schema_version: '1.4',
    disclaimer: DISCLAIMER,
    meta: {
      engine: 'mock',
      model_id: 'mock-analyzer-v1.4',
      market: 'cn',
      analyzed_at: new Date().toISOString(),
      age_input: input.age,
      gender_input: input.gender,
      image_quality_score: Math.round(quality * 100) / 100,
      overall_confidence: Math.round(confidence * 100) / 100,
    },
    skin_score: {
      value: score,
      tier_id: tier.id,
      tier_name: tier.name,
      tier_name_en: tier.nameEn,
    },
    skin_type: {
      label: skinType.label,
      label_zh: skinType.label_zh,
      evidence: evidenceMap[skinType.label],
    },
    concerns,
    perception_scores: perception,
    score_breakdown_paid: breakdown,
    summary_free: { headline },
    report_paid: {
      full_summary: `基于当前自拍的外观评估：肤质评分 ${score}（${tier.name}），倾向${skinType.label_zh}。七维观感中宜留意${lowLabels}。关注点包括${concerns.map((c) => c.label_zh).join('、')}。以下分区说明与步骤仅供护肤参考，非医疗诊断，无效果承诺。`,
      zone_notes: uniqueZones,
      priority_order: concerns.map((c) => c.id),
    },
    routine_paid: {
      duration_days: 14,
      am: amRoutine,
      pm: pmRoutine,
      weekly: ['可每周 1 次温和去角质（若皮肤外观不适则跳过）'],
      avoid: ['短期内叠加多种强酸/高浓度刺激性成分', '过度清洁导致紧绷观感'],
      lifestyle_tips: [
        '作息尽量规律，避免熬夜加重暗沉观感',
        '注意补水，室内干燥时可使用加湿器',
      ],
    },
    products_paid: {
      budget_tiers: ['drugstore', 'mid', 'premium'],
      items,
    },
  };
}

export function genderLabel(g: Gender): string {
  switch (g) {
    case 'female':
      return '女';
    case 'male':
      return '男';
    default:
      return '不愿说明';
  }
}
