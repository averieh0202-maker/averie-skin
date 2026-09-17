import { LlmAnalysisPayload, LLM_OUTPUT_SCHEMA } from './llmSchema';
import { DIMENSION_ORDER } from './copyPack';
/** A small strict validator for this schema's keywords; no coercion, defaults, or random repairs. */
export class ReportValidationError extends Error {
  constructor(public issues: string[]) {
    super('报告内容不完整，请重新分析。');
    this.name = 'ReportValidationError';
  }
}

export type ValidationErrorCode = 'fields' | 'copy' | 'consistency' | 'json';

/** Map validator issue strings to a user-facing reason code (no raw issues to the client). */
export function validationErrorCode(issues: string[]): ValidationErrorCode {
  const joined = issues.join(' | ');
  if (/invalid JSON/i.test(joined)) return 'json';
  // copy / consistency before fields so "missing region evidence" is not mis-tagged as fields
  if (/unreadable copy|unsupported claim|: length/i.test(joined)) return 'copy';
  if (/quality|tendency|region|severity|unassessed|inconsistent/i.test(joined))
    return 'consistency';
  if (/missing|unexpected|enum|const|: object|: string|: array|: items/i.test(joined))
    return 'fields';
  return 'consistency';
}

export function validatePayload(value: unknown): LlmAnalysisPayload {
  const issues: string[] = [];
  function walk(v: any, s: any, path: string) {
    if (s.const !== undefined && v !== s.const) issues.push(`${path}: const`);
    if (s.enum && !s.enum.includes(v)) issues.push(`${path}: enum`);
    if (s.type === 'object') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) {
        issues.push(`${path}: object`);
        return;
      }
      for (const k of s.required || [])
        if (!(k in v)) issues.push(`${path}.${k}: missing`);
      for (const k of Object.keys(v)) {
        if (!(k in s.properties)) issues.push(`${path}.${k}: unexpected`);
        else walk(v[k], s.properties[k], `${path}.${k}`);
      }
    }
    if (s.type === 'string') {
      if (typeof v !== 'string') {
        issues.push(`${path}: string`);
        return;
      }
      if (v.trim().length < s.minLength || v.length > s.maxLength)
        issues.push(`${path}: length`);
      // Marketing / jargon markers only — avoid matching ordinary Chinese phrasing.
      if (
        /[·•→➡]|https?:\/\/|主画面|平滑偏哑|微光泛油|微光|光膜|柔和光泽|油脂光泽密度|很乖|抢戏|玻璃肌|开趴|所见[：:]|护理方向[：:]/i.test(
          v,
        )
      )
        issues.push(`${path}: unreadable copy`);
      if (
        /置信度|准确率|把握|确诊|皮炎|酒糟鼻|湿疹|痤疮|激素脸|屏障受损|胶原流失|严重缺水|根治|逆龄|保证|\d+\s*[%％]|[七7十四14]+天.{0,5}(见效|改善)|不会过敏|不能用精华/.test(
          v,
        )
      )
        issues.push(`${path}: unsupported claim`);
    }
    if (s.type === 'array') {
      if (!Array.isArray(v)) {
        issues.push(`${path}: array`);
        return;
      }
      if (v.length > s.maxItems || (s.uniqueItems && new Set(v).size !== v.length))
        issues.push(`${path}: items`);
      v.forEach((x, i) => walk(x, s.items, `${path}[${i}]`));
    }
  }
  walk(value, LLM_OUTPUT_SCHEMA, 'report');
  if (issues.length) throw new ReportValidationError(issues);
  const p = value as LlmAnalysisPayload;
  const count = DIMENSION_ORDER.filter((k) => p.perception[k].severity !== null).length;
  if (p.quality !== (count === 7 ? 'usable' : count === 0 ? 'unusable' : 'limited'))
    issues.push('quality: inconsistent');
  if (count < 7 && p.tendency !== 'unclear') issues.push('tendency: incomplete image');
  if (count < 7 && p.quality_note.length < 8)
    issues.push('quality_note: required for limited image');
  for (const key of DIMENSION_ORDER) {
    const d = p.perception[key];
    if (
      d.severity === null &&
      !/无法|看不清|不清楚|未拍清|不能判断|不足/.test(d.observation)
    )
      issues.push(`${key}: unassessed observation must explain limitation`);
    if (d.severity === null && d.regions.length) issues.push(`${key}: unassessed region`);
    if (d.severity !== null && !d.regions.length)
      issues.push(`${key}: missing region evidence`);
    if (
      d.severity !== null &&
      d.severity >= 3 &&
      /未见|不明显|不突出|没有明显|无需关注/.test(d.observation)
    )
      issues.push(`${key}: severity contradicts observation`);
    if (
      d.severity !== null &&
      d.severity <= 1 &&
      /非常明显|大面积|十分明显|明显起皮/.test(d.observation)
    )
      issues.push(`${key}: severity contradicts observation`);
  }
  if (issues.length) throw new ReportValidationError(issues);
  return p;
}
export function parseLlmJson(text: string): LlmAnalysisPayload {
  const t = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return validatePayload(JSON.parse(t));
  } catch (e) {
    if (e instanceof ReportValidationError) throw e;
    throw new ReportValidationError(['invalid JSON']);
  }
}
