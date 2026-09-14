import {
  AnalysisInput,
  AnalysisResult,
  Concern,
  ConcernId,
  FaceRegion,
  Gender,
  SkinTypeLabel,
  TierId,
} from '../types/analysis';
import { tierFromScore } from '../theme/tiers';
import { DISCLAIMER } from '../theme/tiers';

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

const PRODUCT_CATALOG = [
  {
    slot: 'am_cleanser',
    product_type: 'gentle_cleanser',
    name: '珂润',
    model: '润浸保湿洁颜泡沫 150ml',
    why: '温和清洁，适合日常晨间使用',
  },
  {
    slot: 'am_toner',
    product_type: 'hydrating_toner',
    name: '无印良品',
    model: '敏感肌用化妆水（滋润型）200ml',
    why: '补充基础水润，步骤简单',
  },
  {
    slot: 'am_serum',
    product_type: 'niacinamide_serum',
    name: 'The Ordinary',
    model: 'Niacinamide 10% + Zinc 1% 30ml',
    why: '对应可见的毛孔与出油观感',
  },
  {
    slot: 'am_moisturizer',
    product_type: 'lightweight_moisturizer',
    name: '理肤泉',
    model: '特安舒缓修复霜 40ml',
    why: '日间轻薄保湿与舒缓观感',
  },
  {
    slot: 'am_sunscreen',
    product_type: 'sunscreen',
    name: '安热沙',
    model: '金灿倍护防晒乳 SPF50+ 60ml',
    why: '日间防晒是基础步骤',
  },
  {
    slot: 'pm_cleanser',
    product_type: 'gentle_cleanser',
    name: '芙丽芳丝',
    model: '净润洗面霜 100g',
    why: '晚间温和卸除日间残留',
  },
  {
    slot: 'pm_treatment',
    product_type: 'barrier_cream',
    name: '薇诺娜',
    model: '舒敏保湿特护霜 50g',
    why: '对应屏障外观与干燥观感',
  },
  {
    slot: 'pm_moisturizer',
    product_type: 'night_moisturizer',
    name: '雅诗兰黛',
    model: '特润修护肌透精华霜 50ml',
    why: '夜间滋养与纹理护理参考',
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

/**
 * Mock analyzer — deterministic from gender + age + imageUri seed.
 * Returns demo-friendly varied scores across tiers.
 */
export function analyzeSkin(input: AnalysisInput): AnalysisResult {
  const seedStr = `${input.gender}|${input.age}|${input.imageUri}`;
  const seed = hashSeed(seedStr);

  // Spread scores across tiers for demos; age lightly biases upward for mid-20s–30s
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

  // Deduplicate zones
  const seen = new Set<string>();
  const uniqueZones = zoneNotes.filter((z) => {
    if (seen.has(z.zone)) return false;
    seen.add(z.zone);
    return true;
  });

  const productCount = 5 + Math.floor(seeded(seed, 13) * 3);
  const productOrder = [...PRODUCT_CATALOG.keys()].sort(
    (a, b) => seeded(seed, a + 100) - seeded(seed, b + 100),
  );
  // Prefer a sensible AM/PM mix: keep cleanser + sunscreen + moisturizer slots if present
  const items = PRODUCT_CATALOG.filter((_, i) =>
    productOrder.slice(0, productCount).includes(i),
  );

  const evidenceMap: Record<SkinTypeLabel, string[]> = {
    oil_prone: ['T 区可见油光', '面中反光略强'],
    dry_prone: ['两颊纹理偏干', '光泽感偏哑'],
    combination_prone: ['T 区与两颊观感差异明显', '中部偏油、外侧偏干'],
    balanced_prone: ['整体油水平衡观感较好', '分区差异不大'],
    unclear: ['当前光线下暂难判断'],
  };

  return {
    schema_version: '1.2',
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
    score_breakdown_paid: breakdown,
    summary_free: { headline },
    report_paid: {
      full_summary: `基于当前自拍的外观评估：肤质评分 ${score}（${tier.name}），倾向${skinType.label_zh}。关注点包括${concerns.map((c) => c.label_zh).join('、')}。以下分区说明与步骤仅供护肤参考，非医疗诊断，无效果承诺。`,
      zone_notes: uniqueZones,
      priority_order: concerns.map((c) => c.id),
    },
    routine_paid: {
      duration_days: 14,
      am: [
        {
          step: 1,
          action: '温和洁面',
          purpose: '清除隔夜与油脂残留观感',
          product_type: 'gentle_cleanser',
        },
        {
          step: 2,
          action: '保湿水 / 精华',
          purpose: '补充基础水润',
          product_type: 'hydrating_toner',
        },
        {
          step: 3,
          action: '轻薄乳液或面霜',
          purpose: '日间屏障观感维护',
          product_type: 'lightweight_moisturizer',
        },
        {
          step: 4,
          action: '防晒',
          purpose: '日间基础防护步骤',
          product_type: 'sunscreen',
        },
      ],
      pm: [
        {
          step: 1,
          action: '温和洁面',
          purpose: '卸除日间防晒与灰尘',
          product_type: 'gentle_cleanser',
        },
        {
          step: 2,
          action: '针对性护理',
          purpose: '对应可见关注点的基础步骤',
          product_type: 'treatment',
        },
        {
          step: 3,
          action: '夜间保湿',
          purpose: '晚间滋养与舒缓观感',
          product_type: 'night_moisturizer',
        },
      ],
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

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
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
