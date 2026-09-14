/** Averie Skin Analysis schema v1.4 (MVP subset)
 * Free 7 dims (v2.2): 光泽表现、油光表现、毛孔可见度、表面纹理、肤色均匀度、细纹可见度、泛红表现
 * Product card order: 品类 → 名称型号 → 对应关注点 → 理由
 * Routine order: 清洁 → (精华 optional) → 保湿 → 防晒
 * Copy pack keys: skin_tendency / dim_* / report_* / dimensionMeta
 */

export type Gender = 'female' | 'male' | 'unspecified';

export type TierId = 'renew' | 'repair' | 'steady' | 'glow' | 'porcelain';

export type SkinTypeLabel =
  | 'oil_prone'
  | 'dry_prone'
  | 'combination_prone'
  | 'balanced_prone'
  | 'unclear';

export type ConcernId =
  | 'acne'
  | 'redness'
  | 'inflammation'
  | 'pores'
  | 'dryness_flakes'
  | 'oiliness'
  | 'dullness'
  | 'pigmentation'
  | 'texture'
  | 'sensitivity_appearance'
  | 'other';

export type FaceRegion =
  | 'forehead'
  | 't_zone'
  | 'cheeks'
  | 'chin'
  | 'nose'
  | 'perioral'
  | 'full_face';

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'treatment'
  | 'other';

/** 好/中/差 — advisor side-note tier (copy pack v1) */
export type DimStatus = '好' | '中' | '差';

export type PerceptionKey =
  | 'radiance'
  | 'oiliness'
  | 'pores'
  | 'texture'
  | 'tone_evenness'
  | 'fine_lines'
  | 'redness';

export interface AnalysisInput {
  gender: Gender;
  age: number;
  imageUri: string;
}

export interface SkinScore {
  value: number;
  tier_id: TierId;
  tier_name: string;
  tier_name_en: string;
}

export interface SkinType {
  label: SkinTypeLabel;
  /** Main tendency tag only, e.g. 混油倾向 */
  label_zh: string;
  evidence: string[];
}

export interface Concern {
  id: ConcernId;
  label_zh: string;
  regions: FaceRegion[];
  note: string;
}

/** Paid report numeric breakdown (legacy fields kept) */
export interface ScoreBreakdown {
  glow: number;
  evenness: number;
  clarity: number;
  barrier_appearance: number;
}

/**
 * Free-layer perception dimensions — shown on FreeResult.
 * Display names from dimensionMeta v2.2 (fixed helper lines do not vary by score).
 * Keys: radiance|oiliness|pores|texture|tone_evenness|fine_lines|redness
 * Legacy aliases: glow→radiance, oil→oiliness, evenness→tone_evenness
 */
export interface PerceptionDimension {
  key: PerceptionKey;
  /** Exact UI label — one of the seven fixed names */
  label_zh: string;
  value: number;
  /** Side note 12–28 chars, advisor tone (好/中/差 cycle) */
  observation: string;
  /** 好 / 中 / 差 mapped from mock score */
  status?: DimStatus;
  /** Paid 分项详解 60–120 chars: 所见→可能相关→护理方向 */
  detail?: string;
}

export interface ZoneNote {
  zone: FaceRegion;
  zone_zh: string;
  note: string;
}

export interface RoutineStep {
  step: number;
  action: string;
  /** What this step solves for THIS analysis */
  purpose: string;
  product_type: string;
}

export interface ProductItem {
  slot: string;
  /** Category label for UI, e.g. 洁面 / 精华 */
  category: ProductCategory;
  category_zh: string;
  product_type: string;
  name: string;
  model: string;
  /** Mapped concern shown as 对应关注点 */
  mapped_concern: string;
  /**
   * Reason covering texture / ingredient role / usage rhythm / boundaries,
   * tied to THIS analysis dimensions.
   */
  why: string;
}

export interface AnalysisResult {
  schema_version: '1.4';
  disclaimer: string;
  meta: {
    engine: 'mock';
    model_id: string;
    market: 'cn' | 'overseas';
    analyzed_at: string;
    age_input: number;
    gender_input: Gender;
    image_quality_score: number;
    /** Kept for schema; never display as percentage in UI */
    overall_confidence: number;
  };
  skin_score: SkinScore;
  skin_type: SkinType;
  /**
   * Free tendency display: 「主标签 · 画面句」
   * Prefer key: skin_tendency
   */
  skin_tendency: string;
  concerns: Concern[];
  /** Free result 7 dimension scores (perception, not severity) */
  perception_scores: PerceptionDimension[];
  score_breakdown_paid: ScoreBreakdown;
  summary_free: {
    /** 页头 ≤60字：优势 + 关注点 */
    headline: string;
  };
  report_paid: {
    full_summary: string;
    zone_notes: ZoneNote[];
    priority_order: ConcernId[];
  };
  routine_paid: {
    duration_days: 14;
    am: RoutineStep[];
    pm: RoutineStep[];
    weekly: string[];
    avoid: string[];
    lifestyle_tips: string[];
  };
  products_paid: {
    budget_tiers: Array<'drugstore' | 'mid' | 'premium'>;
    items: ProductItem[];
  };
}

export interface SessionState {
  gender: Gender | null;
  age: number | null;
  imageUri: string | null;
  result: AnalysisResult | null;
  unlocked: boolean;
}
