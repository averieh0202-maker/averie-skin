import { DIMENSION_ORDER, CATEGORY_LABELS } from './copyPack';
import { CATEGORY_ORDER } from './carePlan';

// The model never emits this object. The application assembles it from validated observations.
const text = (maxLength = 500, minLength = 1) => ({
  type: 'string',
  minLength,
  maxLength,
});
const enumeration = (values: readonly unknown[]) => ({ enum: values });
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const array = (items: unknown, minItems = 0, maxItems = 20) => ({
  type: 'array',
  items,
  minItems,
  maxItems,
});
const keys = enumeration(DIMENSION_ORDER);
const regions = enumeration([
  'forehead',
  'nose',
  'cheeks',
  'chin',
  'periocular',
  'perioral',
]);
const categories = enumeration(CATEGORY_ORDER);
const integer = { type: 'integer', minimum: 0, maximum: 100 };
const nullableScore = { anyOf: [integer, { type: 'null' }] };
const ingredient = object({ name: text(80), role: text(200) });
const product = object({
  id: text(100),
  category: categories,
  name: text(120),
  model: text(120),
  region: enumeration(['CN', 'US']),
  ingredients: array(ingredient, 2, 4),
  texture: text(),
  usage: text(),
  caution: text(800),
  source_url: {
    ...text(1000),
    pattern: '^https://',
    readOnly: true,
    description: '内部核对来源，不在用户产品卡渲染为链接',
  },
  checked_on: { ...text(10), pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  mapped_concerns: { ...array(keys, 0, 7), uniqueItems: true },
  reasons: array(text(), 3, 5),
});
const step = object({
  step: { type: 'integer', minimum: 1, maximum: 10 },
  action: text(100),
  purpose: text(),
  category: { anyOf: [categories, { type: 'null' }] },
});
const metric = (key: string) =>
  object({
    key: { const: key },
    label_zh: text(20),
    value: nullableScore,
    status: enumeration(['表现不错', '可以留意', '优先关注', '暂无法判断']),
    observation: text(60, 8),
    detail: text(180, 30),
    action: text(90, 8),
    regions: { ...array(regions, 0, 6), uniqueItems: true },
  });
const decision = (category: keyof typeof CATEGORY_LABELS) => ({
  ...object({
    category: { const: category },
    title: { const: CATEGORY_LABELS[category] },
    status: enumeration(['recommended', 'optional', 'not_needed', 'hold']),
    reason: text(),
    related_dimensions: { ...array(keys, 0, 7), uniqueItems: true },
    candidates: array(
      {
        ...product,
        properties: { ...product.properties, category: { const: category } },
      },
      0,
      2,
    ),
    selection_note: text(),
  }),
  allOf: [
    {
      if: {
        properties: { status: { enum: ['hold', 'not_needed'] } },
        required: ['status'],
      },
      then: { properties: { candidates: { maxItems: 0 } } },
    },
  ],
});

export const REPORT_OUTPUT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Averie Skin 3.0 application report',
  ...object({
    schema_version: { const: '3.0' },
    disclaimer: text(),
    analysis_status: enumeration(['complete', 'partial', 'insufficient']),
    meta: object({
      engine: enumeration(['mock', 'qwen', 'llm']),
      model_id: text(120),
      market: enumeration(['cn', 'overseas']),
      analyzed_at: text(50),
      age_input: { type: 'integer', minimum: 13, maximum: 99 },
      gender_input: enumeration(['female', 'male', 'unspecified']),
    }),
    quality_note: text(120, 0),
    skin_score: object({
      value: nullableScore,
      tier_id: enumeration(['renew', 'repair', 'steady', 'glow', 'porcelain', null]),
      tier_name: text(30),
      tier_name_en: text(50),
    }),
    skin_type: object({
      label: enumeration([
        'oil_prone',
        'dry_prone',
        'combination_prone',
        'balanced_prone',
        'unclear',
      ]),
      label_zh: text(30),
      explanation: text(100, 12),
    }),
    skin_tendency: text(30),
    perception_scores: {
      type: 'array',
      minItems: 7,
      maxItems: 7,
      prefixItems: DIMENSION_ORDER.map(metric),
      items: false,
    },
    summary_free: object({
      headline: text(),
      priorities: { ...array(keys, 0, 2), uniqueItems: true },
    }),
    report_paid: object({
      full_summary: text(1000),
      zone_notes: array(object({ zone: regions, zone_zh: text(30), note: text() }), 0, 6),
    }),
    routine_paid: object({
      duration_days: { const: 14 },
      am: array(step, 1, 6),
      pm: array(step, 1, 6),
      phases: array(
        object({ days: text(40), title: text(100), instruction: text() }),
        3,
        3,
      ),
      avoid: array(text(), 1, 8),
    }),
    products_paid: object({
      decisions: {
        type: 'array',
        minItems: 6,
        maxItems: 6,
        prefixItems: CATEGORY_ORDER.map(decision),
        items: false,
      },
      note: text(),
    }),
    preferences: object({
      goals: {
        ...array(
          enumeration(['oiliness', 'pores', 'dryness', 'tone', 'fine_lines', 'simple']),
          0,
          2,
        ),
        uniqueItems: true,
      },
      tightness: enumeration(['yes', 'no', 'unknown']),
      discomfort: enumeration(['yes', 'no', 'unknown']),
    }),
  }),
  allOf: [
    {
      if: {
        properties: { analysis_status: { const: 'complete' } },
        required: ['analysis_status'],
      },
      then: {
        properties: {
          skin_score: { properties: { value: integer } },
          perception_scores: { items: { properties: { value: integer } } },
        },
      },
      else: {
        properties: {
          skin_score: { properties: { value: { type: 'null' } } },
          skin_type: { properties: { label: { const: 'unclear' } } },
          products_paid: {
            properties: {
              decisions: { items: { properties: { candidates: { maxItems: 0 } } } },
            },
          },
        },
      },
    },
  ],
};
