/** Averie Skin Analysis schema v1.2 (MVP subset) */

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

export interface ScoreBreakdown {
  glow: number;
  evenness: number;
  clarity: number;
  barrier_appearance: number;
}

export interface ZoneNote {
  zone: FaceRegion;
  zone_zh: string;
  note: string;
}

export interface RoutineStep {
  step: number;
  action: string;
  purpose: string;
  product_type: string;
}

export interface ProductItem {
  slot: string;
  product_type: string;
  name: string;
  model: string;
  why: string;
}

export interface AnalysisResult {
  schema_version: '1.2';
  disclaimer: string;
  meta: {
    engine: 'mock';
    model_id: string;
    market: 'cn' | 'overseas';
    analyzed_at: string;
    age_input: number;
    gender_input: Gender;
    image_quality_score: number;
    overall_confidence: number;
  };
  skin_score: SkinScore;
  skin_type: SkinType;
  concerns: Concern[];
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
