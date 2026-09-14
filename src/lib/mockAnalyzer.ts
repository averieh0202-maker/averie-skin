import {
  AnalysisInput,
  AnalysisResult,
  Concern,
  ConcernId,
  FaceRegion,
  Gender,
  PerceptionDimension,
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
    notes: ['T 区毛孔在光线下更明显', '鼻翼两侧可见细小毛孔纹理'],
  },
  {
    id: 'dullness',
    label_zh: '暗沉',
    regions: ['cheeks', 'full_face'],
    notes: ['面中肤色略显疲惫感', '整体光泽感偏弱'],
  },
  {
    id: 'oiliness',
    label_zh: '出油',
    regions: ['t_zone', 'forehead'],
    notes: ['前额与鼻梁有轻微油光', 'T 区反光略多于两颊'],
  },
  {
    id: 'dryness_flakes',
    label_zh: '干燥起皮',
    regions: ['cheeks', 'chin'],
    notes: ['两颊纹理偏干', '下巴附近可见细微干纹'],
  },
  {
    id: 'pigmentation',
    label_zh: '色沉',
    regions: ['cheeks', 'perioral'],
    notes: ['面颊局部色调不均', '口周附近可见轻微色差'],
  },
  {
    id: 'texture',
    label_zh: '粗糙纹理',
    regions: ['cheeks', 'forehead'],
    notes: ['面颊细纹纹理略粗', '前额肤感不够细腻'],
  },
  {
    id: 'redness',
    label_zh: '发红',
    regions: ['cheeks', 'nose'],
    notes: ['两颊有轻微泛红观感', '鼻翼周围色调偏红'],
  },
  {
    id: 'acne',
    label_zh: '痘痘',
    regions: ['chin', 'forehead'],
    notes: ['下巴附近可见零星痘点', '前额局部有小范围凸起'],
  },
  {
    id: 'sensitivity_appearance',
    label_zh: '敏感外观',
    regions: ['cheeks', 'full_face'],
    notes: ['面颊呈现偏敏感的外观', '整体屏障观感偏脆弱'],
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
  moisturizer: '乳液面霜',
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
  /** Concern / dimension keys this product can address */
  fits: Array<ConcernId | SkinTypeLabel | 'glow' | 'evenness' | 'barrier'>;
  whyTemplate: (
    ctx: ProductWhyCtx,
  ) => string;
};

interface ProductWhyCtx {
  skinTypeZh: string;
  skinLabel: SkinTypeLabel;
  concerns: Concern[];
  perception: PerceptionDimension[];
  score: number;
  tierName: string;
}

function dim(perception: PerceptionDimension[], key: PerceptionDimension['key']): number {
  return perception.find((p) => p.key === key)?.value ?? 50;
}

const PRODUCT_CATALOG: CatalogEntry[] = [
  {
    slot: 'am_cleanser',
    category: 'cleanser',
    product_type: 'gentle_cleanser',
    name: '珂润',
    model: '润浸保湿洁颜泡沫 150ml',
    fits: ['oil_prone', 'combination_prone', 'sensitivity_appearance', 'oiliness'],
    whyTemplate: (ctx) => {
      const oil = dim(ctx.perception, 'oil_dry');
      const red = dim(ctx.perception, 'redness');
      return `本次分析倾向${ctx.skinTypeZh}，油度/干燥感观感约 ${oil}，晨间需要把隔夜皮脂清掉又不拉扯屏障。珂润润浸保湿洁颜泡沫质地细密，对应你 T 区油光与两颊可能并存的紧绷感，清洁后仍保留一层水润膜。若发红外观（约 ${red}）偏高，泡沫型也比皂基更不易加重泛红观感。`;
    },
  },
  {
    slot: 'am_toner',
    category: 'toner',
    product_type: 'hydrating_toner',
    name: '无印良品',
    model: '敏感肌用化妆水（滋润型）200ml',
    fits: ['dry_prone', 'sensitivity_appearance', 'redness', 'barrier'],
    whyTemplate: (ctx) => {
      const oil = dim(ctx.perception, 'oil_dry');
      const even = dim(ctx.perception, 'evenness_glow');
      return `分项里均匀度/光泽约 ${even}，油干观感约 ${oil}，说明面中需要先把水分垫起来再谈后续护理。无印良品敏感肌用化妆水（滋润型）步骤短、刺激感低，适合在洁面后立刻补一层水相。对本次${ctx.skinTypeZh}倾向，它能缓和晨间紧绷或泛红带来的干哑观感，让后续精华更好铺开。`;
    },
  },
  {
    slot: 'am_serum',
    category: 'serum',
    product_type: 'niacinamide_serum',
    name: 'The Ordinary',
    model: 'Niacinamide 10% + Zinc 1% 30ml',
    fits: ['oiliness', 'pores', 'acne', 'oil_prone', 'combination_prone'],
    whyTemplate: (ctx) => {
      const pores = dim(ctx.perception, 'pores');
      const acne = dim(ctx.perception, 'acne');
      const oil = dim(ctx.perception, 'oil_dry');
      return `毛孔观感约 ${pores}、痘痘相关约 ${acne}，同时油度观感约 ${oil}，说明 T 区油脂与纹理是本次优先观察点。The Ordinary Niacinamide 10% + Zinc 1% 对应的正是出油与毛孔外观这一组信号，而不是泛泛的「提亮」。结合你当前${ctx.skinTypeZh}倾向，晨间薄涂一层即可衔接防晒，避免厚重叠涂加重闷感。`;
    },
  },
  {
    slot: 'am_moisturizer',
    category: 'moisturizer',
    product_type: 'lightweight_moisturizer',
    name: '理肤泉',
    model: '特安舒缓修复霜 40ml',
    fits: ['redness', 'sensitivity_appearance', 'barrier', 'dry_prone'],
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const oil = dim(ctx.perception, 'oil_dry');
      return `炎症/发红外观约 ${red}，油干观感约 ${oil}，日间更需要「稳住外观」而不是厚涂。理肤泉特安舒缓修复霜质地偏轻，能在防晒前形成舒缓层，针对本次两颊或鼻翼的泛红观感做缓冲。对${ctx.skinTypeZh}肤况，它比高油面霜更不容易在 T 区留下油膜，同时照顾屏障外观。`;
    },
  },
  {
    slot: 'am_sunscreen',
    category: 'sunscreen',
    product_type: 'sunscreen',
    name: '安热沙',
    model: '金灿倍护防晒乳 SPF50+ 60ml',
    fits: ['pigmentation', 'evenness', 'glow', 'dullness'],
    whyTemplate: (ctx) => {
      const even = dim(ctx.perception, 'evenness_glow');
      return `均匀度/光泽约 ${even}，色沉与暗沉若出现在关注点里，日间防晒是保住现有观感的基础步骤。安热沙金灿倍护防晒乳 SPF50+ 覆盖日常通勤与短时户外，质地成膜后不易搓泥。本次评分 ${ctx.score}（${ctx.tierName}）下，防晒不承诺美白，只是避免紫外线进一步拉开分区色差。`;
    },
  },
  {
    slot: 'pm_cleanser',
    category: 'cleanser',
    product_type: 'gentle_cleanser',
    name: '芙丽芳丝',
    model: '净润洗面霜 100g',
    fits: ['sensitivity_appearance', 'redness', 'dry_prone', 'barrier'],
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const acne = dim(ctx.perception, 'acne');
      return `晚间需要卸掉防晒与日间灰尘，同时照顾发红外观（约 ${red}）与可能的痘点（约 ${acne}）。芙丽芳丝净润洗面霜氨基酸体系，清洁力适中，不会像强清洁那样把两颊洗到紧绷。对本次${ctx.skinTypeZh}分析，它适合作为晚间第一步，把残留清干净再上修护，减少闷痘风险。`;
    },
  },
  {
    slot: 'pm_treatment',
    category: 'treatment',
    product_type: 'barrier_cream',
    name: '薇诺娜',
    model: '舒敏保湿特护霜 50g',
    fits: ['sensitivity_appearance', 'redness', 'dryness_flakes', 'barrier'],
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const oil = dim(ctx.perception, 'oil_dry');
      const concernBits = ctx.concerns
        .slice(0, 2)
        .map((c) => c.label_zh)
        .join('、');
      return `关注点里出现了${concernBits || '屏障相关外观'}，炎症/发红外观约 ${red}、油干约 ${oil}，夜间适合把重心放在舒缓与保湿膜上。薇诺娜舒敏保湿特护霜对应的是「看起来偏敏感、易干红」这一组信号，而不是突击祛痘。结合${ctx.skinTypeZh}倾向，薄涂于两颊与口周，可与 T 区轻油护理区分开。`;
    },
  },
  {
    slot: 'pm_moisturizer',
    category: 'moisturizer',
    product_type: 'night_moisturizer',
    name: '雅诗兰黛',
    model: '特润修护肌透精华霜 50ml',
    fits: ['dry_prone', 'texture', 'dullness', 'barrier', 'glow'],
    whyTemplate: (ctx) => {
      const even = dim(ctx.perception, 'evenness_glow');
      const oil = dim(ctx.perception, 'oil_dry');
      return `均匀度/光泽约 ${even}，若油干观感（约 ${oil}）偏低，说明夜间需要更滋润的封层来改善干哑纹理。雅诗兰黛特润修护肌透精华霜作为夜间参考，针对本次可见的粗糙或暗沉观感做滋养铺垫。对偏油或混合倾向，建议避开 T 区厚涂，主要落在两颊，避免与日间出油信号互相打架。`;
    },
  },
  {
    slot: 'pm_serum',
    category: 'serum',
    product_type: 'soothing_serum',
    name: '修丽可',
    model: '色修精华（Phyto+）30ml',
    fits: ['redness', 'pigmentation', 'evenness', 'sensitivity_appearance'],
    whyTemplate: (ctx) => {
      const red = dim(ctx.perception, 'redness');
      const even = dim(ctx.perception, 'evenness_glow');
      return `发红外观约 ${red}、均匀度/光泽约 ${even}，面中色调不均与泛红往往叠在一起。修丽可色修精华（Phyto+）对应的是可见的红润与色差观感，帮助晚间把「看起来不匀」的信号压一压。结合本次${ctx.skinTypeZh}与评分 ${ctx.score}，它放在洁面与面霜之间，不替代防晒，也不承诺医疗级消退。`;
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

function buildPerception(
  seed: number,
  score: number,
  skinLabel: SkinTypeLabel,
  concerns: Concern[],
): PerceptionDimension[] {
  const has = (id: ConcernId) => concerns.some((c) => c.id === id);
  const oilBias =
    skinLabel === 'oil_prone' || skinLabel === 'combination_prone' ? 12 : skinLabel === 'dry_prone' ? -14 : 0;
  const oilDry = clampScore(
    score + oilBias + Math.floor((seeded(seed, 20) - 0.5) * 22) + (has('oiliness') ? 8 : 0) + (has('dryness_flakes') ? -10 : 0),
  );
  const redness = clampScore(
    score +
      Math.floor((seeded(seed, 21) - 0.5) * 20) +
      (has('redness') || has('inflammation') || has('sensitivity_appearance') ? -12 : 6),
  );
  const acne = clampScore(
    score + Math.floor((seeded(seed, 22) - 0.5) * 18) + (has('acne') ? -14 : 5),
  );
  const pores = clampScore(
    score + Math.floor((seeded(seed, 23) - 0.5) * 16) + (has('pores') || has('oiliness') ? -10 : 4),
  );
  const evennessGlow = clampScore(
    score +
      Math.floor((seeded(seed, 24) - 0.5) * 14) +
      (has('dullness') || has('pigmentation') || has('texture') ? -8 : 5),
  );

  // Oil/dry label: higher = more balanced/comfortable oil-moisture feel
  const oilDryLabel =
    skinLabel === 'dry_prone' || has('dryness_flakes')
      ? '干燥感'
      : skinLabel === 'oil_prone' || has('oiliness')
        ? '油度'
        : '油度 / 干燥感';

  return [
    { key: 'oil_dry', label_zh: oilDryLabel, value: oilDry },
    { key: 'redness', label_zh: '炎症/发红外观', value: redness },
    { key: 'acne', label_zh: '痘痘相关', value: acne },
    { key: 'pores', label_zh: '毛孔', value: pores },
    { key: 'evenness_glow', label_zh: '均匀度 / 光泽', value: evennessGlow },
  ];
}

function selectProducts(seed: number, ctx: ProductWhyCtx): ProductItem[] {
  const concernIds = new Set(ctx.concerns.map((c) => c.id));
  const ranked = PRODUCT_CATALOG.map((p, i) => {
    let fit = seeded(seed, i + 100) * 0.35;
    for (const f of p.fits) {
      if (f === ctx.skinLabel) fit += 1.2;
      if (concernIds.has(f as ConcernId)) fit += 1.0;
      if (f === 'glow' || f === 'evenness' || f === 'barrier') fit += 0.15;
    }
    if (['am_cleanser', 'am_sunscreen', 'pm_cleanser', 'am_moisturizer'].includes(p.slot)) {
      fit += 0.85;
    }
    return { p, fit };
  }).sort((a, b) => b.fit - a.fit);

  const count = 5 + Math.floor(seeded(seed, 13) * 2); // 5–6
  const picked: CatalogEntry[] = [];
  const usedCats = new Set<string>();
  for (const { p } of ranked) {
    if (picked.length >= count) break;
    // Prefer diversity of slots
    if (picked.some((x) => x.slot === p.slot)) continue;
    // Soft diversity on category but allow cleanser am/pm
    if (usedCats.has(p.slot)) continue;
    picked.push(p);
    usedCats.add(p.slot);
  }

  // Ensure at least one cleanser + one moisturizer-ish + sunscreen if day slots present
  const ensure = ['am_cleanser', 'am_sunscreen', 'pm_treatment'];
  for (const slot of ensure) {
    if (!picked.some((p) => p.slot === slot)) {
      const extra = PRODUCT_CATALOG.find((p) => p.slot === slot);
      if (extra && picked.length < 7) picked.push(extra);
    }
  }

  return picked.map((p) => ({
    slot: p.slot,
    category: p.category,
    category_zh: CATEGORY_ZH[p.category],
    product_type: p.product_type,
    name: p.name,
    model: p.model,
    why: p.whyTemplate(ctx),
  }));
}

/**
 * Mock analyzer — deterministic from gender + age + imageUri seed.
 * Returns demo-friendly varied scores across tiers.
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

  const headlines: Record<TierId, string[]> = {
    renew: [
      '当前观感偏需关注基础护理节奏',
      '可见肤况处于待整理阶段',
    ],
    repair: [
      '肤况处于修护观察期，节奏宜稳',
      '可见状态提示温和维稳为主',
    ],
    steady: [
      '整体观感相对稳定，光泽中等偏上',
      '可见肤况较为平稳',
    ],
    glow: [
      '可见透亮度不错，细节仍可观察',
      '整体光泽感清晰，局部可细看',
    ],
    porcelain: [
      '可见匀净与光泽表现突出',
      '整体观感细腻，接近高分区间',
    ],
  };
  const hl = headlines[tier.id];
  const headline = hl[Math.floor(seeded(seed, 12) * hl.length)];

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
    oil_prone: ['T 区可见油光', '面中反光略强'],
    dry_prone: ['两颊纹理偏干', '光泽感偏哑'],
    combination_prone: ['T 区与两颊观感差异明显', '中部偏油、外侧偏干'],
    balanced_prone: ['整体油水平衡观感较好', '分区差异不大'],
    unclear: ['当前光线下暂难判断'],
  };

  const oil = dim(perception, 'oil_dry');
  const red = dim(perception, 'redness');
  const acne = dim(perception, 'acne');
  const pores = dim(perception, 'pores');

  const amRoutine = [
    {
      step: 1,
      action: '温和洁面',
      purpose: `清除隔夜皮脂与灰尘；对应本次油度/干燥感约 ${oil}，避免过度清洁加重紧绷或泛红。`,
      product_type: 'gentle_cleanser',
    },
    {
      step: 2,
      action: '保湿水 / 精华',
      purpose: `垫水并针对毛孔（约 ${pores}）或出油观感做轻量护理，让后续面霜更好铺开。`,
      product_type: 'hydrating_toner',
    },
    {
      step: 3,
      action: '轻薄乳液或面霜',
      purpose: `维护日间屏障外观；若发红外观约 ${red}，选择舒缓向质地，减少闷厚感。`,
      product_type: 'lightweight_moisturizer',
    },
    {
      step: 4,
      action: '防晒',
      purpose: '日间基础防护，降低紫外线拉开分区色差与暗沉观感的风险。',
      product_type: 'sunscreen',
    },
  ];

  const pmRoutine = [
    {
      step: 1,
      action: '温和洁面',
      purpose: `卸除防晒与日间残留；为痘痘相关（约 ${acne}）与毛孔区域减少堵塞风险。`,
      product_type: 'gentle_cleanser',
    },
    {
      step: 2,
      action: '针对性护理',
      purpose: `对应本次关注点（${concerns.map((c) => c.label_zh).join('、')}），以舒缓或控油观感为主，不强刺激。`,
      product_type: 'treatment',
    },
    {
      step: 3,
      action: '夜间保湿',
      purpose: `封存水分、缓和干燥或泛红外观；分区涂抹，T 区薄、两颊可稍厚。`,
      product_type: 'night_moisturizer',
    },
  ];

  return {
    schema_version: '1.3',
    disclaimer: DISCLAIMER,
    meta: {
      engine: 'mock',
      model_id: 'mock-analyzer-v1',
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
      full_summary: `基于当前自拍的外观评估：肤质评分 ${score}（${tier.name}），倾向${skinType.label_zh}。分项观感中油干约 ${oil}、发红外观约 ${red}、毛孔约 ${pores}。关注点包括${concerns.map((c) => c.label_zh).join('、')}。以下分区说明与步骤仅供护肤参考，非医疗诊断，无效果承诺。`,
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
