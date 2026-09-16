import { DimStatus, PerceptionKey } from '../types/analysis';
export const DIMENSION_ORDER: PerceptionKey[] = [
  'radiance',
  'oiliness',
  'pores',
  'texture',
  'tone_evenness',
  'fine_lines',
  'redness',
];
export const DIMENSION_META: Record<
  PerceptionKey,
  { labelZh: string; explanation: string }
> = {
  radiance: { labelZh: '暗沉', explanation: '看照片里是否有局部发暗，不评价肤色深浅。' },
  oiliness: { labelZh: '出油', explanation: '看照片里的油光，不代表实际出油量。' },
  pores: { labelZh: '毛孔', explanation: '看毛孔是否明显，不判断是否堵塞。' },
  texture: {
    labelZh: '粗糙起皮',
    explanation: '看表面是否平整、有无起皮，不推测摸起来的感觉。',
  },
  tone_evenness: {
    labelZh: '肤色不均',
    explanation: '比较面部不同位置的颜色，不以白为好。',
  },
  fine_lines: { labelZh: '细纹', explanation: '看当前照片里的细纹，不推算皮肤年龄。' },
  redness: { labelZh: '泛红', explanation: '看发红的位置和范围，不据此判断敏感肌。' },
};
export const SCORE_ANCHORS = [100, 85, 70, 50, 25] as const;
export function dimTierFromScore(value: number | null): DimStatus {
  if (value === null) return '暂无法判断';
  return value >= 80 ? '表现不错' : value >= 60 ? '可以留意' : '优先关注';
}
export const TENDENCY_LABELS = {
  combination_oily: '混合偏油',
  combination_dry: '混合偏干',
  oily: '偏油',
  dry: '偏干',
  balanced: '比较均衡',
  unclear: '暂不判断肤质',
} as const;
export const DECISION_LABELS = {
  recommended: '建议保留',
  optional: '按需选择',
  not_needed: '暂时不用加',
  hold: '先缓一缓',
} as const;
export const CATEGORY_LABELS = {
  cleanser: '洁面',
  toner: '爽肤水',
  serum: '精华',
  lotion: '保湿乳',
  cream: '面霜',
  sunscreen: '防晒',
} as const;
export const CTA_COPY = {
  primary: '查看我的护理方案',
  secondary: '早晚怎么用，每一类产品要不要加',
};
