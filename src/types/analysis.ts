/** v3: model observations, app decisions, and verified product facts are separate. */
export type Gender = 'female' | 'male' | 'unspecified';
export type AnalyzerEngine = 'mock' | 'qwen' | 'auto';
export type TierId = 'renew' | 'repair' | 'steady' | 'glow' | 'porcelain';
export type SkinTypeLabel =
  'oil_prone' | 'dry_prone' | 'combination_prone' | 'balanced_prone' | 'unclear';
export type PerceptionKey =
  | 'radiance'
  | 'oiliness'
  | 'pores'
  | 'texture'
  | 'tone_evenness'
  | 'fine_lines'
  | 'redness';
export type FaceRegion =
  'forehead' | 'nose' | 'cheeks' | 'chin' | 'periocular' | 'perioral';
export type DimStatus = '表现不错' | '可以留意' | '优先关注' | '暂无法判断';
export type ProductCategory =
  'cleanser' | 'lotion' | 'cream' | 'serum' | 'sunscreen' | 'toner';
export type CareGoal =
  'oiliness' | 'pores' | 'dryness' | 'tone' | 'fine_lines' | 'simple';
export interface CarePreferences {
  goals: CareGoal[];
  tightness: 'yes' | 'no' | 'unknown';
  discomfort: 'yes' | 'no' | 'unknown';
}
export const DEFAULT_PREFERENCES: CarePreferences = {
  goals: [],
  tightness: 'unknown',
  discomfort: 'unknown',
};
export interface AnalysisInput {
  gender: Gender;
  age: number;
  imageUri: string;
  preferences?: CarePreferences;
}
export interface PerceptionDimension {
  key: PerceptionKey;
  label_zh: string;
  value: number | null;
  status: DimStatus;
  observation: string;
  detail: string;
  action: string;
  regions: FaceRegion[];
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
  category: ProductCategory | null;
}
export interface Ingredient {
  name: string;
  role: string;
}
export interface CatalogProduct {
  id: string;
  category: ProductCategory;
  name: string;
  model: string;
  region: 'CN' | 'US';
  ingredients: Ingredient[];
  texture: string;
  usage: string;
  caution: string;
  source_url: string;
  checked_on: string;
}
export interface ProductItem extends CatalogProduct {
  mapped_concerns: PerceptionKey[];
  reasons: string[];
}
export type ProductDecisionStatus = 'recommended' | 'optional' | 'not_needed' | 'hold';
export interface ProductDecision {
  category: ProductCategory;
  title: string;
  status: ProductDecisionStatus;
  reason: string;
  related_dimensions: PerceptionKey[];
  candidates: ProductItem[];
  selection_note: string;
}
export interface AnalysisResult {
  schema_version: '3.0';
  disclaimer: string;
  analysis_status: 'complete' | 'partial' | 'insufficient';
  meta: {
    engine: 'mock' | 'qwen' | 'llm';
    model_id: string;
    market: 'cn' | 'overseas';
    analyzed_at: string;
    age_input: number;
    gender_input: Gender;
  };
  quality_note: string;
  skin_score: {
    value: number | null;
    tier_id: TierId | null;
    tier_name: string;
    tier_name_en: string;
  };
  skin_type: { label: SkinTypeLabel; label_zh: string; explanation: string };
  skin_tendency: string;
  perception_scores: PerceptionDimension[];
  summary_free: { headline: string; priorities: PerceptionKey[] };
  report_paid: { full_summary: string; zone_notes: ZoneNote[] };
  routine_paid: {
    duration_days: 14;
    am: RoutineStep[];
    pm: RoutineStep[];
    phases: { days: string; title: string; instruction: string }[];
    avoid: string[];
  };
  products_paid: { decisions: ProductDecision[]; note: string };
  preferences: CarePreferences;
}
export interface SessionState {
  gender: Gender | null;
  age: number | null;
  imageUri: string | null;
  result: AnalysisResult | null;
  unlocked: boolean;
  analyzerEngine: AnalyzerEngine;
  preferences: CarePreferences;
}
