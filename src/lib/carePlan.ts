import {
  AnalysisInput,
  AnalysisResult,
  PerceptionDimension,
  PerceptionKey,
  ProductCategory,
  ProductDecision,
  ProductDecisionStatus,
  DEFAULT_PREFERENCES,
  RoutineStep,
} from '../types/analysis';
import { PRODUCT_CATALOG } from './productCatalog';
import { CATEGORY_LABELS } from './copyPack';
export const CATEGORY_ORDER: ProductCategory[] = [
  'cleanser',
  'toner',
  'serum',
  'lotion',
  'cream',
  'sunscreen',
];
export function buildCarePlan(
  dims: PerceptionDimension[],
  input: AnalysisInput,
  market: 'cn' | 'overseas',
) {
  const prefs = input.preferences ?? DEFAULT_PREFERENCES;
  const score = (k: PerceptionKey) => dims.find((d) => d.key === k)?.value ?? null;
  const red = score('redness');
  const simplify =
    prefs.discomfort === 'yes' ||
    (red !== null && red <= 70) ||
    prefs.goals.includes('simple');
  const dry = prefs.tightness === 'yes';
  const unknown = prefs.tightness === 'unknown';
  const minor = input.age < 18;
  const complete = dims.every((d) => d.value !== null);
  const productReasons: Record<string, string[]> = {
    'cn-curel-foam': [
      '椰油酰谷氨酸钠和月桂酰天冬氨酸钠承担清洁作用，泡沫可减少来回揉搓。',
      '放在晚间清洁这一步，不用为了毛孔明显额外增加刷洗。',
    ],
    'cn-curel-milk': [
      '甘油、角鲨烷和脂质相关成分组合，可承担基础保湿。',
      '这款是乳液选择；如果用后舒适、保湿足够，就不需要再叠面霜。',
    ],
    'cn-curel-gel': [
      '这款用甘油和脂质相关成分提供保湿，凝露可作为不同肤感的备选。',
      '它和乳液是同一步的替代品，不当作精华叠加使用。',
    ],
    'cn-curel-cream': [
      '甘油和角鲨烷承担保湿润肤，乳霜形式可在需要更滋润时考虑。',
      '先用它替代乳液，是否适合以涂后舒适度为准，不要求厚涂全脸。',
    ],
    'cn-curel-essence': [
      '这款以甘油和脂质相关成分支持保湿，不因产品名称承诺淡纹。',
      '只有基础保湿仍不够且试用无不适时才考虑加入，不替代乳液或面霜。',
    ],
    'cn-cetaphil-foam': [
      '复配清洁成分承担去除表面油污的作用，甘油兼顾清洁过程的肤感。',
      '作为现有洁面的替代选择，不用因为毛孔明显而增加清洁次数。',
    ],
    'cn-cetaphil-cream': [
      '甘油与矿脂组合承担保湿，乳霜可用于乳液保湿不足时。',
      '它与另一款面霜是替代关系；没有干燥感时不需要为保湿继续加层。',
    ],
  };
  const decision = (
    category: ProductCategory,
    status: ProductDecisionStatus,
    reason: string,
    related: PerceptionKey[],
  ): ProductDecision => {
    const related_dimensions = related.filter((k) => score(k) !== null);
    const candidates =
      (status === 'recommended' || status === 'optional') && complete && !minor
        ? PRODUCT_CATALOG.filter(
            (p) =>
              p.category === category && p.region === (market === 'cn' ? 'CN' : 'US'),
          )
            .slice(0, 2)
            .map((p) => ({
              ...p,
              mapped_concerns: related_dimensions,
              reasons: [reason, ...(productReasons[p.id] ?? [p.texture, p.usage])],
            }))
        : [];
    return {
      category,
      title: CATEGORY_LABELS[category],
      status,
      reason,
      related_dimensions,
      candidates,
      selection_note:
        status === 'hold' || status === 'not_needed'
          ? '本次不安排新增这一类产品。'
          : minor
            ? '暂不套用成人产品清单，可与监护人确认适龄基础护理。'
            : !complete
              ? '照片信息不足，先不匹配具体产品。'
              : candidates.length > 1
                ? '这两款是替代选择，选一款即可。'
                : candidates.length === 1
                  ? '已有用着舒服的同类产品，可以继续使用。'
                  : category === 'sunscreen' && market === 'cn'
                    ? '防晒仍建议保留。目前目录还没有同时核对配方与防护等级的型号，暂不列具体产品；可继续使用已耐受、标有 UVA/UVB 防护和 SPF30 或以上的防晒。'
                    : '该地区的型号尚未核对，先保留品类建议，不用其他版本代替。',
    };
  };
  const decisions: ProductDecision[] = [
    decision(
      'cleanser',
      'recommended',
      score('oiliness') !== null && score('oiliness')! < 80
        ? '照片里有可见油光，清洁以带走表面油脂为主，不需要洗到发紧。'
        : '保留基础清洁即可，不因分数高低增加洗脸次数。',
      ['oiliness', 'pores'],
    ),
    decision(
      'toner',
      'not_needed',
      '已有保湿乳或面霜时，爽肤水不是必须步骤。本次没有需要额外增加它的依据。',
      ['texture'],
    ),
    decision(
      'serum',
      simplify || minor
        ? 'hold'
        : prefs.goals.includes('dryness') && dry
          ? 'optional'
          : 'not_needed',
      prefs.discomfort === 'yes'
        ? '你提到近期会刺痛或发痒，先暂停新增精华，保留已耐受的基础护理。'
        : red !== null && red <= 70
          ? '照片里有局部泛红，先减少新产品。暂缓新增功效精华，不代表所有精华都不能用。'
          : minor
            ? '暂不按成人方案安排功效精华，先保持简单的基础护理。'
            : prefs.goals.includes('simple')
              ? '你希望精简步骤，精华不是基础护理必需项，这次先不加。'
              : prefs.goals.includes('dryness') && dry
                ? '你更在意干燥，也提到洗后发紧。先做好乳液或面霜保湿，仍不够时才考虑保湿精华。'
                : '当前没有必须单独增加精华的依据，先完成清洁、保湿和防晒，避免为每个分项都加一瓶。',
      ['redness', 'texture'],
    ),
    decision(
      'lotion',
      dry ? 'optional' : 'recommended',
      dry
        ? '你提到洗后容易发紧，可以把面霜作为主要保湿，乳液留作更轻的替代。'
        : '保湿先从一款乳液或凝露开始。额鼻出油也不等于全脸都不需要保湿。',
      ['texture', 'oiliness'],
    ),
    decision(
      'cream',
      dry ? 'recommended' : unknown ? 'optional' : 'not_needed',
      dry
        ? '你提到洗后发紧，可以用面霜替代乳液，先看是否更舒服。'
        : unknown
          ? '照片看不出洗后是否发紧。如果乳液已够保湿，就不用额外加面霜；仍觉干时再考虑替代。'
          : '你没有洗后发紧的困扰，先用一款保湿乳即可，暂不额外叠面霜。',
      ['texture'],
    ),
    decision(
      'sunscreen',
      'recommended',
      '日间防护是基础步骤，用于日常维护；无需等肤色不均或细纹明显才开始。',
      ['tone_evenness', 'fine_lines'],
    ),
  ];
  const moisturize: ProductCategory = dry ? 'cream' : 'lotion';
  const step = (
    action: string,
    purpose: string,
    category: ProductCategory | null,
  ): RoutineStep => ({ step: 0, action, purpose, category });
  const am = [
    step(
      '按需清洁',
      '晨起没有明显油污时，可按舒适度清洁；不要为了控油反复洗脸。',
      'cleanser',
    ),
    step(
      '保湿',
      dry
        ? '用面霜作为保湿步骤，不要求再叠乳液。'
        : '选一款保湿乳或凝露，按面部舒适度涂布。',
      moisturize,
    ),
    step(
      '防晒',
      '按包装足量涂布。户外至少每两小时及出汗、游泳后按标签补涂，配合遮阳。',
      'sunscreen',
    ),
  ];
  const pm = [
    step('轻柔清洁', '按彩妆或耐水防晒说明卸除后再清洁，不反复刷洗鼻翼。', 'cleanser'),
    step(
      '保湿',
      dry
        ? '用面霜替代乳液；无需为凑步骤同时叠加。'
        : '用已有耐受的乳液或凝露，保持步骤简单。',
      moisturize,
    ),
  ];
  const routine: AnalysisResult['routine_paid'] = {
    duration_days: 14,
    am: am.map((s, i) => ({ ...s, step: i + 1 })),
    pm: pm.map((s, i) => ({ ...s, step: i + 1 })),
    phases: [
      {
        days: '第 1–3 天',
        title: '先保持基础护理',
        instruction: '沿用已耐受的洁面、保湿和防晒，留意洗后紧绷、涂后刺痛及泛红变化。',
      },
      {
        days: '第 4–10 天',
        title: '有需要才试一款新品',
        instruction:
          '只选择一个确需替换的品类，先在小范围按产品说明观察七至十天，其他步骤不变。无需换新时继续原护理。',
      },
      {
        days: '第 11–14 天',
        title: '无不适再逐步使用',
        instruction:
          '完成小范围观察且没有反应后再逐步用于面部。未观察完就延长；出现不适就停，不按日期强行推进。',
      },
    ],
    avoid: [
      ...(simplify
        ? ['本阶段暂不新增去角质或多款功效精华。']
        : ['一次只引入一款新产品，保湿足够时无需继续叠加。']),
      '持续刺痛、发痒或泛红加重时，停用新产品并寻求专业评估。',
      '十四天是护理安排，不是见效期限。小范围试用也不能保证面部一定耐受。',
    ],
  };
  return {
    decisions,
    routine,
    note: '每个品类都给出取舍。建议保留的是护理步骤，不是必须购买；乳液和面霜通常选一个。同类候选不用一起买。',
  };
}
