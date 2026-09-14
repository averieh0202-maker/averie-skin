/** Averie Skin Analysis schema v1.4 (MVP subset)
 * Free 7 dims (exact display names): 光泽、出油、毛孔、纹理、色匀、细纹、泛红
 * Product card order: 品类 → 名称型号 → 对应关注点 → 理由
 * Routine order: 清洁 → (精华 optional) → 保湿 → 防晒
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

/** Optional four-level status words for free dimensions */
export type DimStatus = '稳定' | '尚可' | '可观察' | '需留意';

export type PerceptionKey =
  | 'glow'
  | 'oil'
  | 'pores'
  | 'texture'
  | 'evenness'
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
 * Display names must be exactly: 光泽、出油、毛孔、纹理、色匀、细纹、泛红
 */
export interface PerceptionDimension {
  key: PerceptionKey;
  /** Exact UI label — one of the seven fixed names */
  label_zh: string;
  value: number;
  /** One observation line, e.g. 「本次影像可见…」 */
  observation: string;
  /** Optional four-level status word */
  status?: DimStatus;
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
  concerns: Concern[];
  /** Free result 7 dimension scores (perception, not severity) */
  perception_scores: PerceptionDimension[];
  score_breakdown_paid: ScoreBreakdown;
  summary_free: {
    /** One sentence: 优势 + 1–2 个关注点；neutral, no confidence numbers */
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
