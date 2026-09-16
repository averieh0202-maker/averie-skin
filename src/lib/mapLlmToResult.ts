import {
  AnalysisInput,
  AnalysisResult,
  PerceptionDimension,
  SkinTypeLabel,
} from '../types/analysis';
import { tierFromScore, DISCLAIMER } from '../theme/tiers';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SCORE_ANCHORS,
  TENDENCY_LABELS,
  dimTierFromScore,
} from './copyPack';
import { ZONE_ZH } from './zoneTips';
import { LlmAnalysisPayload } from './llmSchema';
import { validatePayload } from './reportValidation';
import { buildCarePlan } from './carePlan';
import { DEFAULT_PREFERENCES } from '../types/analysis';
export { parseLlmJson } from './reportValidation';
export function mapLlmPayloadToResult(
  raw: LlmAnalysisPayload,
  input: AnalysisInput,
  meta: { engine: 'qwen' | 'llm' | 'mock'; model_id: string; market: 'cn' | 'overseas' },
): AnalysisResult {
  const p = validatePayload(raw);
  const perception: PerceptionDimension[] = DIMENSION_ORDER.map((key) => {
    const d = p.perception[key];
    const value = d.severity === null ? null : SCORE_ANCHORS[d.severity];
    return {
      key,
      label_zh: DIMENSION_META[key].labelZh,
      value,
      status: dimTierFromScore(value),
      observation: d.observation.trim(),
      detail: d.detail.trim(),
      action: d.action.trim(),
      regions: d.regions,
    };
  });
  const assessed = perception.filter((d) => d.value !== null);
  const complete = assessed.length === 7;
  const value = complete
    ? Math.round(assessed.reduce((n, d) => n + d.value!, 0) / 7)
    : null;
  const tier = tierFromScore(value ?? 0);
  const goals = input.preferences?.goals ?? [];
  const goalKeys: string[] = goals.map((g) =>
    g === 'dryness' ? 'texture' : g === 'tone' ? 'tone_evenness' : g,
  );
  const priorities = assessed
    .filter((d) => d.value! < 80)
    .sort(
      (a, b) =>
        Number(b.value! < 60) - Number(a.value! < 60) ||
        Number(goalKeys.includes(b.key)) - Number(goalKeys.includes(a.key)) ||
        a.value! - b.value!,
    )
    .slice(0, 2);
  const strength = assessed.find((d) => d.value! >= 80);
  const headline =
    assessed.length === 0
      ? '这张照片的细节不够清楚，暂时无法给出皮肤结果。'
      : priorities.length
        ? `${strength?.observation ?? ''}${priorities.map((d) => d.observation).join('')}`
        : '这张照片中没有特别突出的关注点，保持现有基础护理即可。';
  const label: SkinTypeLabel = p.tendency.startsWith('combination')
    ? 'combination_prone'
    : p.tendency === 'oily'
      ? 'oil_prone'
      : p.tendency === 'dry'
        ? 'dry_prone'
        : p.tendency === 'balanced'
          ? 'balanced_prone'
          : 'unclear';
  const plan = buildCarePlan(perception, input, meta.market);
  const zones = Array.from(new Set(assessed.flatMap((d) => d.regions))).map((zone) => ({
    zone,
    zone_zh: ZONE_ZH[zone],
    note: assessed
      .filter((d) => d.regions.includes(zone))
      .sort((a, b) => a.value! - b.value!)
      .slice(0, 2)
      .map((d) => d.observation + d.action)
      .join(''),
  }));
  return {
    schema_version: '3.0',
    disclaimer: DISCLAIMER,
    analysis_status: complete ? 'complete' : assessed.length ? 'partial' : 'insufficient',
    meta: {
      ...meta,
      analyzed_at: new Date().toISOString(),
      age_input: input.age,
      gender_input: input.gender,
    },
    quality_note: p.quality_note,
    skin_score: {
      value,
      tier_id: value === null ? null : tier.id,
      tier_name: value === null ? '暂不评分' : tier.name,
      tier_name_en: value === null ? 'Not scored' : tier.nameEn,
    },
    skin_type: {
      label,
      label_zh: TENDENCY_LABELS[p.tendency],
      explanation: p.tendency_explanation,
    },
    skin_tendency: TENDENCY_LABELS[p.tendency],
    perception_scores: perception,
    summary_free: { headline, priorities: priorities.map((d) => d.key) },
    report_paid: {
      full_summary: [
        strength?.observation,
        ...priorities.map((d) => d.observation),
        ...(!priorities.some((d) => d.key === 'redness') &&
        perception.find((d) => d.key === 'redness')!.value !== null &&
        perception.find((d) => d.key === 'redness')!.value! < 80
          ? [perception.find((d) => d.key === 'redness')!.observation]
          : []),
        '先把清洁、保湿和防晒安排好，其他步骤按需要选择。',
      ]
        .filter(Boolean)
        .join(''),
      zone_notes: zones,
    },
    routine_paid: plan.routine,
    products_paid: { decisions: plan.decisions, note: plan.note },
    preferences: input.preferences ?? { ...DEFAULT_PREFERENCES },
  };
}
