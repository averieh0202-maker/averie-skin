import { FaceRegion, PerceptionKey } from '../types/analysis';
import { DIMENSION_META, DIMENSION_ORDER, TENDENCY_LABELS } from './copyPack';
export interface LlmDim {
  severity: 0 | 1 | 2 | 3 | 4 | null;
  observation: string;
  detail: string;
  action: string;
  regions: FaceRegion[];
}
export interface LlmAnalysisPayload {
  version: '3.0';
  quality: 'usable' | 'limited' | 'unusable';
  quality_note: string;
  tendency: keyof typeof TENDENCY_LABELS;
  tendency_explanation: string;
  perception: Record<PerceptionKey, LlmDim>;
}
const str = (minLength: number, maxLength: number) => ({
  type: 'string',
  minLength,
  maxLength,
});
export const LLM_OUTPUT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: [
    'version',
    'quality',
    'quality_note',
    'tendency',
    'tendency_explanation',
    'perception',
  ],
  properties: {
    version: { const: '3.0' },
    quality: { enum: ['usable', 'limited', 'unusable'] },
    quality_note: str(0, 120),
    tendency: { enum: Object.keys(TENDENCY_LABELS) },
    tendency_explanation: str(12, 100),
    perception: {
      type: 'object',
      additionalProperties: false,
      required: DIMENSION_ORDER,
      properties: Object.fromEntries(
        DIMENSION_ORDER.map((k) => [
          k,
          {
            type: 'object',
            additionalProperties: false,
            required: ['severity', 'observation', 'detail', 'action', 'regions'],
            properties: {
              severity: { enum: [0, 1, 2, 3, 4, null] },
              observation: str(8, 60),
              detail: str(30, 180),
              action: str(8, 90),
              regions: {
                type: 'array',
                uniqueItems: true,
                maxItems: 6,
                items: {
                  enum: ['forehead', 'nose', 'cheeks', 'chin', 'periocular', 'perioral'],
                },
              },
            },
          },
        ]),
      ),
    },
  },
} as const;
export const QWEN_SYSTEM_PROMPT = `你为 Averie Skin 观察自拍中的皮肤外观。只返回符合约定的 JSON。
用普通用户能直接理解的中文。说“鼻子和额头油光比较明显”“鼻翼两侧毛孔较明显”“两颊有一点泛红”。
不写“主画面”“微光泛油”“平滑偏哑”“柔和光泽”“油脂光泽密度”“线→细纹”。不拟人、不堆标签、不用中点、箭头、斜杠串词。
每项 observation 是一句具体结果，detail 解释这张照片中的发现及护理取舍，action 是一个可执行动作。不是科普“测什么”，不使用“所见/可能相关/护理方向”标签。
仅观察可见特征。不诊断，不说皮炎、玫瑰痤疮、屏障受损、敏感肌确诊或严重缺水，不推断胶原、皮肤年龄、病因、生活习惯。不得承诺见效或输出把握百分比。
severity 是需要关注的可见程度：0=在清晰画面中不突出；1=轻微局部；2=局部清楚；3=一个主要区域明显；4=多个主要区域明显。不表示疾病严重性。好、中、需关注的描述必须匹配。
看不清填 severity=null，regions=[]，说明缺失原因，禁止猜数或编造位置。usable要求七项可判断；limited是一至六项；unusable是零项。
肤质标签只描述外观倾向；不能因不反光就认定干，不能因泛红就认定敏感。画面不完整时 tendency=unclear。
暗沉不评价肤色深浅；出油只看油光；毛孔不等于堵塞；粗糙起皮不重复计毛孔细纹；肤色不均不重复计泛红。
年龄性别只作上下文，不加减分。不得生成品牌、产品、成分或价格；应用会从已核对产品库匹配。
不强制凑齐关注点或区域数量，也不刻意把每项都写好。

硬性检查清单（输出前自检）：
1. 每个 severity≠null 的分项必须带至少 1 个 regions；severity=null 时 regions=[]，observation 须说明看不清/无法判断的原因。
2. quality 与可判断项数一致：7→usable，1–6→limited，0→unusable；非 usable 时 tendency=unclear，并写清 quality_note。
3. 禁止医疗诊断、准确率/百分比、网感词（主画面、微光、玻璃肌、很乖等）；observation/detail/action 字数落在 schema 区间。
4. 只输出符合 schema 的 JSON，勿多余字段、勿 markdown 代码围栏。`;
export function buildQwenUserPrompt(age: number, gender: string): string {
  return `用户自填年龄 ${age}，性别 ${gender}。按照片观察，不从年龄性别推断特征。
维度名：${DIMENSION_ORDER.map((k) => `${k}=${DIMENSION_META[k].labelZh}`).join('，')}。
observation 8–60字，detail 30–180字，action 8–90字，使用完整句子。无需重复免责声明。
输出结构：${JSON.stringify(LLM_OUTPUT_SCHEMA)}
自检：有 severity 必有 regions；null 须说明看不清；quality 与可判断项数一致；禁医疗/百分比/网感词。`;
}

/** Appended on automatic validation retry (system + user). */
export const QWEN_RETRY_CONSTRAINT =
  '严格输出符合 schema 的 JSON；禁止医疗诊断、准确率/百分比、网感词；每个有 severity 的分项必须带 regions；severity=null 时 observation 须说明看不清原因；quality 与可判断项数一致。';
