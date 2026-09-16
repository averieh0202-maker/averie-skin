/** Explicit fixed demo: never hashes the photo, gender, or age into invented findings. */
import { AnalysisInput, Gender } from '../types/analysis';
import { LlmAnalysisPayload } from './llmSchema';
import { mapLlmPayloadToResult } from './mapLlmToResult';
export const DEMO_PAYLOAD: LlmAnalysisPayload = {
  version: '3.0',
  quality: 'usable',
  quality_note: '这是固定示例，未分析你的照片。',
  tendency: 'combination_oily',
  tendency_explanation:
    '额头和鼻子的油光比两颊明显，护肤时可以分区调整。实际肤质还需结合平时的感受。',
  perception: {
    radiance: {
      severity: 1,
      observation: '两颊没有明显暗沉，整体气色比较均匀。',
      detail:
        '两颊没有明显发暗的区域，这一项暂时不需要增加提亮产品。先保持日常防晒和保湿，肤色深浅不影响这一项的评价。',
      action: '保持日常保湿和防晒即可。',
      regions: ['cheeks'],
    },
    oiliness: {
      severity: 3,
      observation: '鼻子和额头的油光比较明显。',
      detail:
        '油光主要集中在鼻子和额头，两颊相对少一些。先减少这两个位置的厚重叠涂，洗脸后不发紧比洗到完全没有油光更重要。',
      action: '减少额鼻的厚重叠涂，保持轻柔清洁。',
      regions: ['forehead', 'nose'],
    },
    pores: {
      severity: 3,
      observation: '鼻翼两侧的毛孔比较明显。',
      detail:
        '鼻翼两侧的毛孔轮廓比较清楚，是这次值得留意的部分。照片不能判断毛孔是否堵塞，不用因此增加磨砂、撕拉或反复刷洗。',
      action: '避免挤压毛孔和反复刷洗鼻翼。',
      regions: ['nose', 'cheeks'],
    },
    texture: {
      severity: 2,
      observation: '两颊局部不够平整，没有明显起皮。',
      detail:
        '两颊有少量不平整的地方，暂时没有看到大片起皮。先用好一款保湿产品，不要为了追求更光滑，马上叠加去角质步骤。',
      action: '先保留一款用着舒服的保湿产品。',
      regions: ['cheeks'],
    },
    tone_evenness: {
      severity: 1,
      observation: '额头和两颊的肤色差别不大。',
      detail:
        '额头和两颊的底色比较接近，局部发红会放在泛红项单独说明。当前以日间防护为主，不必仅凭这张照片增加美白精华。',
      action: '做好日间防晒，涂布时避免遗漏。',
      regions: ['forehead', 'cheeks'],
    },
    fine_lines: {
      severity: 0,
      observation: '眼周和额头的细纹暂时不明显。',
      detail:
        '当前照片中眼周和额头的细纹不突出，不需要因为年龄而额外增加抗老产品。日常保持保湿和防晒，也无需为提高分数继续叠加步骤。',
      action: '保持基础护理，暂不增加专门产品。',
      regions: ['periocular', 'forehead'],
    },
    redness: {
      severity: 2,
      observation: '鼻翼周围和两颊内侧有一点泛红。',
      detail:
        '泛红主要在鼻翼附近和两颊内侧，范围比较局部。先减少揉搓，新产品一款一款试；如果同时有持续刺痛或发痒，应先处理不适。',
      action: '减少摩擦，先不要同时换多款产品。',
      regions: ['nose', 'cheeks'],
    },
  },
};
export function analyzeSkin(input: AnalysisInput) {
  return mapLlmPayloadToResult(DEMO_PAYLOAD, input, {
    engine: 'mock',
    model_id: 'demo-fixture-v3',
    market: 'cn',
  });
}
export function genderLabel(g: Gender) {
  return g === 'female' ? '女' : g === 'male' ? '男' : '不愿说明';
}
