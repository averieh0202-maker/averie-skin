/**
 * Compact JSON schema we ask vision LLMs to return.
 * Mapped into AnalysisResult (七维 + 倾向 + zone_tips + paid sections).
 */
import {
  ConcernId,
  DimStatus,
  FaceRegion,
  PerceptionKey,
  ProductCategory,
} from '../types/analysis';

export interface LlmZoneTip {
  zone: FaceRegion | string;
  zone_zh?: string;
  note: string;
}

export interface LlmDim {
  value: number;
  status?: DimStatus | string;
  observation?: string;
  detail?: string;
}

export interface LlmConcern {
  id?: ConcernId | string;
  label_zh: string;
  note: string;
  regions?: Array<FaceRegion | string>;
}

export interface LlmRoutineStep {
  step?: number;
  action: string;
  purpose: string;
  product_type?: string;
}

export interface LlmProduct {
  slot?: string;
  category?: ProductCategory | string;
  category_zh?: string;
  product_type?: string;
  name: string;
  model: string;
  mapped_concern?: string;
  why: string;
}

export interface LlmAnalysisPayload {
  skin_score: number;
  tendency_tag: string;
  tendency_picture?: string;
  skin_type_label?: string;
  headline: string;
  full_summary: string;
  perception: Partial<Record<PerceptionKey, LlmDim>>;
  concerns: LlmConcern[];
  zone_tips: LlmZoneTip[];
  am?: LlmRoutineStep[];
  pm?: LlmRoutineStep[];
  weekly?: string[];
  avoid?: string[];
  lifestyle_tips?: string[];
  products?: LlmProduct[];
}

export const QWEN_SYSTEM_PROMPT = `你是 Averie Skin 的护肤外观顾问（非医疗）。根据自拍 + 年龄 + 性别，只输出一个 JSON 对象，不要 markdown，不要解释。
规则：
- 外观观察，不诊断、不承诺疗效
- 七维分数 0–100（越高越好）：radiance, oiliness, pores, texture, tone_evenness, fine_lines, redness
- status 仅用 好/中/差
- zone_tips：按证据给出 3–5 个分区，zone 只能是 forehead|nose|periocular|cheeks|chin|perioral；禁止只给脸颊；无证据的分区不要写
- tendency_tag 例：混油倾向/干皮缺水感/中性偏稳/敏感波动感/油皮活跃感/干敏倾向
- 产品无 URL；理由含质地/成分角色/用法/边界`;

export function buildQwenUserPrompt(age: number, gender: string): string {
  return `被试：年龄 ${age}，性别 ${gender}。
请基于图像输出 JSON，字段如下：
{
  "skin_score": 0-100整数,
  "tendency_tag": "主标签",
  "tendency_picture": "画面句",
  "skin_type_label": "oil_prone|dry_prone|combination_prone|balanced_prone|unclear",
  "headline": "≤60字，优势+关注点",
  "full_summary": "付费总览段落",
  "perception": {
    "radiance": {"value":0-100,"status":"好|中|差","observation":"12-28字","detail":"所见→可能相关→护理方向"},
    "oiliness": {"value":0-100,"status":"好|中|差","observation":"...","detail":"..."},
    "pores": {"value":0-100,"status":"好|中|差","observation":"...","detail":"..."},
    "texture": {"value":0-100,"status":"好|中|差","observation":"...","detail":"..."},
    "tone_evenness": {"value":0-100,"status":"好|中|差","observation":"...","detail":"..."},
    "fine_lines": {"value":0-100,"status":"好|中|差","observation":"...","detail":"..."},
    "redness": {"value":0-100,"status":"好|中|差","observation":"...","detail":"..."}
  },
  "concerns": [{"id":"pores|dullness|oiliness|dryness_flakes|pigmentation|texture|redness|acne|sensitivity_appearance","label_zh":"...","note":"...","regions":["forehead","nose"]}],
  "zone_tips": [{"zone":"forehead","zone_zh":"前额","note":"短提示"},{"zone":"nose","zone_zh":"鼻子","note":"..."},{"zone":"periocular","zone_zh":"眼周","note":"..."},{"zone":"cheeks","zone_zh":"脸颊","note":"..."}],
  "am": [{"step":1,"action":"清洁","purpose":"...","product_type":"gentle_cleanser"}],
  "pm": [{"step":1,"action":"清洁","purpose":"...","product_type":"gentle_cleanser"}],
  "weekly": ["..."],
  "avoid": ["..."],
  "lifestyle_tips": ["..."],
  "products": [{"slot":"am_cleanser","category":"cleanser","category_zh":"洁面","name":"品牌","model":"型号","mapped_concern":"...","why":"..."}]
}`;
}
