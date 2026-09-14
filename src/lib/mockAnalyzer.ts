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
} from '../types/analysis';
import { tierFromScore, DISCLAIMER } from '../theme/tiers';
import {
  TendencyTag,
  buildSkinTendency,
  dimTierFromScore,
  pickDimDetail,
  pickDimSideNote,
} from './copyPack';

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

const SKIN_TYPES: Array<{
  label: SkinTypeLabel;
  label_zh: TendencyTag;
}> = [
  { label: 'oil_prone', label_zh: '油皮活跃感' },
  { label: 'dry_prone', label_zh: '干皮缺水感' },
  { label: 'combination_prone', label_zh: '混油倾向' },
  { label: 'balanced_prone', label_zh: '中性偏稳' },
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
    notes: [
      'T区与鼻翼毛孔在光线里更有存在感，和出油、光影常一起出现。',
      '鼻翼两侧细小毛孔纹理更清楚一点，仍属常见观感。',
    ],
  },
  {
    id: 'dullness',
    label_zh: '暗沉',
    regions: ['cheeks', 'full_face'],
    notes: [
      '面中光泽偏弱，亮感有点散，更像表层还渴着。',
      '整体反光略显疲惫，优先把水润做稳再谈光泽。',
    ],
  },
  {
    id: 'oiliness',
    label_zh: '出油',
    regions: ['t_zone', 'forehead'],
    notes: [
      '前额与鼻梁有轻微油光，中午前后更容易亮。',
      'T区反光略多于两颊，清洁温和见底即可。',
    ],
  },
  {
    id: 'dryness_flakes',
    label_zh: '干燥起皮',
    regions: ['cheeks', 'chin'],
    notes: [
      '两颊纹理偏干，笑的时候更像轻轻折过的纸。',
      '下巴附近有细微干纹感，保湿宜薄层叠润。',
    ],
  },
  {
    id: 'pigmentation',
    label_zh: '色沉',
    regions: ['cheeks', 'perioral'],
    notes: [
      '面颊局部有一点深浅差，不刺眼，防晒更值得坚持。',
      '口周附近轻微色差，美白概念不必急着叠很多。',
    ],
  },
  {
    id: 'texture',
    label_zh: '粗糙纹理',
    regions: ['cheeks', 'forehead'],
    notes: [
      '面颊细纹路略粗，近看才发现，常和缺水有关。',
      '前额肤感不够细腻，轻薄保湿往往更友好。',
    ],
  },
  {
    id: 'redness',
    label_zh: '泛红',
    regions: ['cheeks', 'nose'],
    notes: [
      '两颊有一点薄红，像刚吹过风或运动后。',
      '鼻翼周围色调偏红，步骤做少、做温和更合适。',
    ],
  },
  {
    id: 'acne',
    label_zh: '痘点外观',
    regions: ['chin', 'forehead'],
    notes: [
      '下巴附近有零星凸起观感，清洁与保湿别过度。',
      '前额局部小范围凸起，刺激性叠加先让位。',
    ],
  },
  {
    id: 'sensitivity_appearance',
    label_zh: '敏感外观',
    regions: ['cheeks', 'full_face'],
    notes: [
      '面颊偏敏感的外观，今天更适合少步骤、慢一点。',
      '整体屏障观感偏脆，经不起太热闹的护理。',
    ],
  },
];

const ZONE_ZH: Record<FaceRegion, string> = {
  forehead: '前额',
  t_zone: 'T区',
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
    whyTemplate: () =>
      '质地：细密泡沫，洗感不紧绷。成分角色：氨基酸体系温和带走表面油脂与污垢，不承担缩小毛孔承诺。用法：晨间一次即可，避免反复搓洗。边界：不替代卸妆，亦不做深层去角质；泛红明显时改选更温和洁面。',
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
    whyTemplate: () =>
      '质地：清薄水感，好推开。成分角色：烟酰胺与锌盐对应出油与毛孔观感的日常护理，而非泛泛提亮。用法：洁面后薄涂一层，再接保湿与防晒。边界：可隔日起步；可见泛红明显时暂缓叠加其他刺激性成分。',
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
    whyTemplate: () =>
      '质地：偏轻乳霜，不闷厚。成分角色：以舒缓、稳住泛红外观为主，兼顾日间屏障层。用法：防晒前涂于两颊与口周，T区可更薄。边界：不宣称消退发红；屏障不稳定时步骤做少更合适。',
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
    whyTemplate: () =>
      '质地：成膜后偏干爽，适合愿天天涂的节奏。成分角色：日间防护，降低光带来的加深与不均风险，非美白疗程。用法：保湿后足量涂抹，出汗后自行决定补涂。边界：不承诺变白或淡斑；敏感期先做肤感测试。',
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
    whyTemplate: () =>
      '质地：霜状洁面，洗完不发紧。成分角色：氨基酸体系卸除防晒与日间残留，减少两颊被洗紧的风险。用法：晚间第一步，温水洗净即可。边界：不与强清洁同晚叠加；红感高时只留温和洁面。',
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
    whyTemplate: () =>
      '质地：轻薄易推开。成分角色：植物舒缓对应泛红与色匀观感，不宣称医疗级消退。用法：洁面后、保湿前，晚间为宜。边界：不替代防晒；若不适或红感加重，停用并咨询专业人士。',
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
    whyTemplate: () =>
      '质地：偏润但不厚重，少香精感更佳。成分角色：舒缓保湿、减少外界摩擦感，不宣称治疗。用法：精简步骤的最后一步；刺激期可只留洁面+它，T区减量。边界：对应「看起来偏敏感、易干红」信号；持续加重请咨询专业人士。',
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
    whyTemplate: () =>
      '质地：滋润乳霜，好推开。成分角色：夜间把水分留在表层，让光泽与纹路观感更舒服。用法：精华后使用，主要落在两颊，可薄层叠涂。边界：偏油或混油倾向避开T区厚涂；它不替代防晒与休息。',
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

function resolveTendencyTag(
  skinLabel: SkinTypeLabel,
  concerns: Concern[],
): TendencyTag {
  const has = (id: ConcernId) => concerns.some((c) => c.id === id);
  const sensitive =
    has('redness') || has('sensitivity_appearance') || has('inflammation');
  const dry =
    skinLabel === 'dry_prone' || has('dryness_flakes') || has('texture');

  if (sensitive && dry) return '干敏倾向';
  if (sensitive) return '敏感波动感';

  switch (skinLabel) {
    case 'oil_prone':
      return '油皮活跃感';
    case 'dry_prone':
      return '干皮缺水感';
    case 'combination_prone':
      return '混油倾向';
    case 'balanced_prone':
      return '中性偏稳';
    default:
      return '中性偏稳';
  }
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

  return FREE_DIM_ORDER.map((key, i) => {
    const value = values[key];
    const status: DimStatus = dimTierFromScore(value);
    const variant = Math.floor(seeded(seed, 40 + i) * 2);
    return {
      key,
      label_zh: FREE_DIM_LABELS[key],
      value,
      observation: pickDimSideNote(key, status, variant),
      status,
      detail: pickDimDetail(key, status),
    };
  });
}

/** 页头 ≤60字：优势 + 关注点 */
function buildHeadline(
  perception: PerceptionDimension[],
  seed: number,
): string {
  const high = highestDims(perception, 1)[0];
  const low = lowestDims(perception, 1)[0];
  const strength = high?.label_zh ?? '光泽';
  const focus = low?.label_zh ?? '出油';
  const useAlt = seeded(seed, 60) > 0.5;

  if (useAlt) {
    // 一眼看去，{优势画面}。若只选一个关注点，我会先看{关注点}。
    // Only use side note as 优势画面 when that dim is 好
    const scene =
      high?.status === '好' && high.observation
        ? high.observation
        : `${strength}相对占优`;
    const line = `一眼看去，${scene}。若只选一个关注点，我会先看${focus}。`;
    return [...line].length <= 60
      ? line
      : `一眼看去，${strength}相对占优。若只选一个关注点，我会先看${focus}。`;
  }

  return `今天的优势在${strength}；更值得留意的是${focus}。`;
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
 * Schema v1.4 + copy pack v1: skin_tendency, 好/中/差旁注, paid detail bodies.
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
  const skinTypeBase = SKIN_TYPES[typeIdx];

  const concernCount = 2 + Math.floor(seeded(seed, 5) * 2); // 2–3
  const concerns = pickConcerns(seed, concernCount);

  const tendencyTag = resolveTendencyTag(skinTypeBase.label, concerns);
  const skin_tendency = buildSkinTendency(
    tendencyTag,
    Math.floor(seeded(seed, 14) * 3),
  );

  const perception = buildPerception(seed, score, skinTypeBase.label, concerns);

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

  const headline = buildHeadline(perception, seed);

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
    skinTypeZh: tendencyTag,
    skinLabel: skinTypeBase.label,
    concerns,
    perception,
    score,
    tierName: tier.name,
  };
  const items = selectProducts(seed, productCtx);

  const evidenceMap: Record<SkinTypeLabel, string[]> = {
    oil_prone: ['整张脸带着一层细细的光膜', '毛孔在光线里更明显一点'],
    dry_prone: ['两颊纹理偏干', '光泽偏哑，像还喝不够水'],
    combination_prone: [
      'T区与两颊观感有差异',
      '中间先亮、两侧还相对安静',
    ],
    balanced_prone: [
      '光比较均匀地铺着',
      '分区差异不大，状态偏干净',
    ],
    unclear: ['当前光线下暂难判断，先给保守读法'],
  };

  const oil = dim(perception, 'oil');
  const red = dim(perception, 'redness');
  const pores = dim(perception, 'pores');

  const includeSerum = pores < 62 || oil < 58 || red < 58 || seeded(seed, 30) > 0.35;

  const amRoutine = [
    {
      step: 1,
      action: '清洁',
      purpose:
        '清除隔夜皮脂与灰尘。对应今天的出油观感，温和洁面即可，避免过度清洁加重泛红。',
      product_type: 'gentle_cleanser',
    },
    ...(includeSerum
      ? [
          {
            step: 2,
            action: '精华',
            purpose:
              '针对毛孔或泛红做轻量护理。薄涂一层，为保湿铺垫；不适就先跳过。',
            product_type: 'serum',
          },
        ]
      : []),
    {
      step: includeSerum ? 3 : 2,
      action: '保湿',
      purpose:
        '维护日间屏障外观。纹理若偏干，选轻薄质地薄层叠润，减少闷厚感。',
      product_type: 'lightweight_moisturizer',
    },
    {
      step: includeSerum ? 4 : 3,
      action: '防晒',
      purpose:
        '日间基础防护。对应色匀与光泽观感，降低紫外线拉开分区色差的风险。',
      product_type: 'sunscreen',
    },
  ];

  const pmRoutine = [
    {
      step: 1,
      action: '清洁',
      purpose:
        '卸除防晒与日间残留。为毛孔区域减少堵塞风险，温水洗净即可。',
      product_type: 'gentle_cleanser',
    },
    {
      step: 2,
      action: '精华',
      purpose: `对应本次关注点（${concerns.map((c) => c.label_zh).join('、')}）。以舒缓或清透观感为主，不强刺激。`,
      product_type: 'serum',
    },
    {
      step: 3,
      action: '保湿',
      purpose:
        '封存水分，缓和干燥或泛红外观。分区涂抹：T区薄、两颊可稍厚；按耐受微调。',
      product_type: 'night_moisturizer',
    },
  ];

  const lowLabels = lowestDims(perception, 2)
    .map((d) => d.label_zh)
    .join('、');
  const highLabel = highestDims(perception, 1)[0]?.label_zh ?? '光泽';

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
      label: skinTypeBase.label,
      label_zh: tendencyTag,
      evidence: evidenceMap[skinTypeBase.label],
    },
    skin_tendency,
    concerns,
    perception_scores: perception,
    score_breakdown_paid: breakdown,
    summary_free: { headline },
    report_paid: {
      full_summary: `今天主画面更接近「${tendencyTag}」。优势侧在${highLabel}，更值得留意的是${lowLabels}。关注点包括${concerns.map((c) => c.label_zh).join('、')}。以下分区与步骤是可执行的节奏参考，按耐受微调；不构成医疗诊断或效果承诺。`,
      zone_notes: uniqueZones,
      priority_order: concerns.map((c) => c.id),
    },
    routine_paid: {
      duration_days: 14,
      am: amRoutine,
      pm: pmRoutine,
      weekly: ['可每周 1 次温和护理（若外观不适则跳过）'],
      avoid: [
        '短期内叠加多种强酸/高浓度刺激性成分',
        '过度清洁导致紧绷或泛红观感',
      ],
      lifestyle_tips: [
        '作息尽量规律，熬夜常让暗沉和细纹更有存在感',
        '室内干燥时可补水或使用加湿器，保湿更稳',
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
