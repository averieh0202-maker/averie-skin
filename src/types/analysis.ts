/** Averie Skin Analysis schema v1.3 (MVP subset) */

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

/** Free-layer perception dimensions — shown on FreeResult */
export interface PerceptionDimension {
  key:
    | 'oil_dry'
    | 'redness'
    | 'acne'
    | 'pores'
    | 'evenness_glow';
  label_zh: string;
  value: number;
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
  /** Category label for UI, e.g. 洁面 / 爽肤水 / 精华 */
  category: ProductCategory;
  category_zh: string;
  product_type: string;
  name: string;
  model: string;
  /** 2–4 sentences with causal link to this analysis */
  why: string;
}

export interface AnalysisResult {
  schema_version: '1.3';
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
  /** Free result dimension scores (perception, not severity) */
  perception_scores: PerceptionDimension[];
  score_breakdown_paid: ScoreBreakdown;
  summary_free: {
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
