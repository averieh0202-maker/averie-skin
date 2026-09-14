import {
  AnalysisInput,
  AnalysisResult,
  Concern,
  ConcernId,
  DimStatus,
  FaceRegion,
  PerceptionDimension,
  PerceptionKey,
  ProductCategory,
  ProductItem,
  RoutineStep,
  SkinTypeLabel,
  ZoneNote,
} from '../types/analysis';
import { tierFromScore, DISCLAIMER } from '../theme/tiers';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  TendencyTag,
  buildSkinTendency,
  dimTierFromScore,
  pickDimDetail,
  pickDimSideNote,
} from './copyPack';
import { ZONE_DISPLAY_ORDER, ZONE_ZH, buildZoneNotes } from './zoneTips';
import { LlmAnalysisPayload } from './llmSchema';

const CONCERN_IDS: ConcernId[] = [
  'acne',
  'redness',
  'inflammation',
  'pores',
  'dryness_flakes',
  'oiliness',
  'dullness',
  'pigmentation',
  'texture',
  'sensitivity_appearance',
  'other',
];

const SKIN_LABELS: SkinTypeLabel[] = [
  'oil_prone',
  'dry_prone',
  'combination_prone',
  'balanced_prone',
  'unclear',
];

const TENDENCY_TAGS: TendencyTag[] = [
  '混油倾向',
  '干皮缺水感',
  '中性偏稳',
  '敏感波动感',
  '油皮活跃感',
  '干敏倾向',
];

const CATEGORY_ZH: Record<ProductCategory, string> = {
  cleanser: '洁面',
  toner: '爽肤水',
  serum: '精华',
  moisturizer: '保湿',
  sunscreen: '防晒',
  treatment: '修护护理',
  other: '其他',
};

function clamp(n: number, lo = 0, hi = 100): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function asStatus(v: unknown, score: number): DimStatus {
  if (v === '好' || v === '中' || v === '差') return v;
  return dimTierFromScore(score);
}

function asRegion(v: unknown): FaceRegion | null {
  const s = String(v ?? '');
  const allowed: FaceRegion[] = [
    'forehead',
    't_zone',
    'cheeks',
    'chin',
    'nose',
    'periocular',
    'perioral',
    'full_face',
  ];
  return (allowed as string[]).includes(s) ? (s as FaceRegion) : null;
}

function asConcernId(v: unknown): ConcernId {
  const s = String(v ?? '');
  return CONCERN_IDS.includes(s as ConcernId) ? (s as ConcernId) : 'other';
}

function asSkinLabel(v: unknown, tag: string): SkinTypeLabel {
  const s = String(v ?? '');
  if (SKIN_LABELS.includes(s as SkinTypeLabel)) return s as SkinTypeLabel;
  if (tag.includes('油') && tag.includes('混')) return 'combination_prone';
  if (tag.includes('油')) return 'oil_prone';
  if (tag.includes('干')) return 'dry_prone';
  return 'balanced_prone';
}

function asTendency(tag: string): TendencyTag {
  const hit = TENDENCY_TAGS.find((t) => tag.includes(t) || t.includes(tag));
  return hit ?? '中性偏稳';
}

function asCategory(v: unknown): ProductCategory {
  const s = String(v ?? 'other');
  const allowed: ProductCategory[] = [
    'cleanser',
    'toner',
    'serum',
    'moisturizer',
    'sunscreen',
    'treatment',
    'other',
  ];
  return allowed.includes(s as ProductCategory)
    ? (s as ProductCategory)
    : 'other';
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function mapLlmPayloadToResult(
  raw: LlmAnalysisPayload,
  input: AnalysisInput,
  meta: { engine: 'qwen' | 'llm'; model_id: string; market: 'cn' | 'overseas' },
): AnalysisResult {
  const score = clamp(Number(raw.skin_score) || 60);
  const tier = tierFromScore(score);
  const tag = asTendency(String(raw.tendency_tag || '中性偏稳'));
  const picture = (raw.tendency_picture || '').trim();
  const skin_tendency = picture
    ? `${tag} · ${picture}`
    : buildSkinTendency(tag, 0);
  const skinLabel = asSkinLabel(raw.skin_type_label, tag);

  const perception: PerceptionDimension[] = DIMENSION_ORDER.map((key, i) => {
    const d = raw.perception?.[key];
    const value = clamp(Number(d?.value ?? score));
    const status = asStatus(d?.status, value);
    return {
      key,
      label_zh: DIMENSION_META[key].labelZh,
      value,
      status,
      observation:
        (d?.observation && String(d.observation).slice(0, 40)) ||
        pickDimSideNote(key, status, i),
      detail:
        (d?.detail && String(d.detail)) || pickDimDetail(key, status),
    };
  });

  const concerns: Concern[] = (raw.concerns ?? [])
    .slice(0, 4)
    .map((c, i) => {
      const regions = (c.regions ?? [])
        .map(asRegion)
        .filter((r): r is FaceRegion => !!r);
      return {
        id: asConcernId(c.id) || (`other` as ConcernId),
        label_zh: c.label_zh || `关注点${i + 1}`,
        note: c.note || '',
        regions: regions.length ? regions : (['cheeks'] as FaceRegion[]),
      };
    });

  // Normalize zone tips — keep only allowed display zones, enforce multi-zone
  let zone_notes: ZoneNote[] = (raw.zone_tips ?? [])
    .map((z) => {
      const zone = asRegion(z.zone);
      if (!zone || !ZONE_DISPLAY_ORDER.includes(zone)) return null;
      return {
        zone,
        zone_zh: z.zone_zh || ZONE_ZH[zone],
        note: z.note || '',
      };
    })
    .filter((z): z is ZoneNote => !!z && z.note.length > 0);

  // Dedupe by zone
  const seen = new Set<string>();
  zone_notes = zone_notes.filter((z) => {
    if (seen.has(z.zone)) return false;
    seen.add(z.zone);
    return true;
  });

  if (zone_notes.length < 2) {
    const seed = hashSeed(`${input.gender}|${input.age}|llm-zones`);
    zone_notes = buildZoneNotes(seed, concerns, perception);
  }

  const mapSteps = (steps: typeof raw.am, fallbackAction: string): RoutineStep[] => {
    const list = steps ?? [];
    if (!list.length) {
      return [
        {
          step: 1,
          action: fallbackAction,
          purpose: '按今天的观感做温和护理，不适则减步骤。',
          product_type: 'other',
        },
      ];
    }
    return list.slice(0, 5).map((s, i) => ({
      step: s.step ?? i + 1,
      action: s.action || fallbackAction,
      purpose: s.purpose || '',
      product_type: s.product_type || 'other',
    }));
  };

  const items: ProductItem[] = (raw.products ?? []).slice(0, 8).map((p, i) => {
    const category = asCategory(p.category);
    return {
      slot: p.slot || `item_${i}`,
      category,
      category_zh: p.category_zh || CATEGORY_ZH[category],
      product_type: p.product_type || category,
      name: p.name || '未命名',
      model: p.model || '',
      mapped_concern: p.mapped_concern || concerns[0]?.label_zh || '综合护理',
      why: p.why || '',
    };
  });

  const headline =
    (raw.headline && String(raw.headline).slice(0, 60)) ||
    `今天主画面接近「${tag}」，先看分区与七维再决定步骤。`;

  return {
    schema_version: '1.4',
    disclaimer: DISCLAIMER,
    meta: {
      engine: meta.engine,
      model_id: meta.model_id,
      market: meta.market,
      analyzed_at: new Date().toISOString(),
      age_input: input.age,
      gender_input: input.gender,
      image_quality_score: 0.85,
      overall_confidence: 0.75,
    },
    skin_score: {
      value: score,
      tier_id: tier.id,
      tier_name: tier.name,
      tier_name_en: tier.nameEn,
    },
    skin_type: {
      label: skinLabel,
      label_zh: tag,
      evidence: picture ? [picture] : ['基于自拍外观的综合读法'],
    },
    skin_tendency,
    concerns: concerns.length
      ? concerns
      : [
          {
            id: 'texture',
            label_zh: '表面纹理',
            regions: ['cheeks', 'forehead'],
            note: '先观察纹理与光泽，再决定是否加减步骤。',
          },
        ],
    perception_scores: perception,
    score_breakdown_paid: {
      glow: perception.find((p) => p.key === 'radiance')?.value ?? score,
      evenness:
        perception.find((p) => p.key === 'tone_evenness')?.value ?? score,
      clarity: perception.find((p) => p.key === 'pores')?.value ?? score,
      barrier_appearance:
        perception.find((p) => p.key === 'redness')?.value ?? score,
    },
    summary_free: { headline },
    report_paid: {
      full_summary:
        raw.full_summary ||
        `今天主画面更接近「${tag}」。以下分区与步骤是可执行的节奏参考，按耐受微调；不构成医疗诊断或效果承诺。`,
      zone_notes,
      priority_order: concerns.map((c) => c.id),
    },
    routine_paid: {
      duration_days: 14,
      am: mapSteps(raw.am, '清洁'),
      pm: mapSteps(raw.pm, '清洁'),
      weekly: raw.weekly?.length ? raw.weekly : ['可每周 1 次温和护理（若不适则跳过）'],
      avoid: raw.avoid?.length
        ? raw.avoid
        : ['短期内叠加多种强刺激成分', '过度清洁导致紧绷或泛红观感'],
      lifestyle_tips: raw.lifestyle_tips?.length
        ? raw.lifestyle_tips
        : ['作息尽量规律', '室内干燥时可补水或使用加湿器'],
    },
    products_paid: {
      budget_tiers: ['drugstore', 'mid', 'premium'],
      items,
    },
  };
}

/** Extract JSON object from model text (strip fences if any). */
export function parseLlmJson(text: string): LlmAnalysisPayload {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  const parsed = JSON.parse(t) as LlmAnalysisPayload;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('模型返回不是有效 JSON 对象');
  }
  return parsed;
}
