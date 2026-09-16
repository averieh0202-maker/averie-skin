const fs = require('node:fs');
const { DEMO_PAYLOAD, analyzeSkin } = require('../.test-build/lib/mockAnalyzer');
const { LLM_OUTPUT_SCHEMA, QWEN_SYSTEM_PROMPT } = require('../.test-build/lib/llmSchema');
const { REPORT_OUTPUT_SCHEMA } = require('../.test-build/lib/reportSchema');
const { PRODUCT_CATALOG } = require('../.test-build/lib/productCatalog');
const { DECISION_LABELS, DIMENSION_META } = require('../.test-build/lib/copyPack');
const report = analyzeSkin({ age: 28, gender: 'female', imageUri: 'fixed-demo' });
report.meta.analyzed_at = '2026-09-16T00:00:00.000Z';
fs.mkdirSync('docs', { recursive: true });
for (const [name, data] of Object.entries({
  'llm-output.schema.json': LLM_OUTPUT_SCHEMA,
  'report-output.schema.json': REPORT_OUTPUT_SCHEMA,
  'example-observations.json': DEMO_PAYLOAD,
  'example-report.json': report,
  'product-catalog.json': PRODUCT_CATALOG,
}))
  fs.writeFileSync(`docs/${name}`, JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync('docs/model-prompt.txt', QWEN_SYSTEM_PROMPT + '\n');
const out = [
  '# Averie Skin v3 完整示例报告',
  '\n固定虚构示例，用于审阅和测试，未分析真实照片。设定：28 岁女性，混合偏油，额鼻油光和毛孔明显，局部泛红。可选护理问题未回答；年龄与性别不参与评分。',
  '\n## 免费结果',
  `\n**${report.skin_type.label_zh}**\n\n${report.skin_type.explanation}`,
  `\n**外观评分 ${report.skin_score.value} / 100**\n\n${report.skin_score.tier_name}。分数越高，表示照片中这一项的表现越好；不是肤质健康测量，也不是模型置信度。`,
  '\n### 总览',
  report.summary_free.headline,
  '\n### 先留意这两件事',
  ...report.summary_free.priorities.map((k) => {
    const d = report.perception_scores.find((x) => x.key === k);
    return `\n**${d.observation}**\n\n${d.action}`;
  }),
  '\n### 逐项看看',
  '\n| 项目 | 表现分 | 状态 | 本次结果 |\n|---|---:|---|---|',
  ...report.perception_scores.map(
    (d) => `| ${d.label_zh} | ${d.value} | ${d.status} | ${d.observation} |`,
  ),
  '\n按钮：查看示例护理方案。正式报告文案为“查看完整护理方案”；当前代码没有真实扣款功能。',
  '\n' + report.disclaimer,
  '\n## 完整护理方案',
  '\n界面默认仅展开“这次先做什么”。以下为全部折叠区展开后的内容。',
  '\n### 这次先做什么',
  report.report_paid.full_summary,
  '\n### 7 项结果说明',
  ...report.perception_scores.map(
    (d) =>
      `\n#### ${d.label_zh} ${d.value}分\n\n${d.status}。${d.observation}\n\n${d.detail}\n\n${d.action}`,
  ),
  '\n### 不同部位怎么照顾',
  ...report.report_paid.zone_notes.map((z) => `\n**${z.zone_zh}**\n\n${z.note}`),
  '\n### 早晚怎么用',
  ...['am', 'pm'].flatMap((time) => [
    '\n#### ' + (time === 'am' ? '早晨' : '晚上'),
    ...report.routine_paid[time].map((s) => `\n${s.step}. **${s.action}**：${s.purpose}`),
  ]),
  '\n#### 未来 14 天',
  ...report.routine_paid.phases.map(
    (p) => `\n**${p.days} ${p.title}**\n\n${p.instruction}`,
  ),
  '\n### 每一类产品，要不要加',
  report.products_paid.note,
  '\n| 品类 | 本次取舍 | 理由 |\n|---|---|---|',
  ...report.products_paid.decisions.map(
    (d) => `| ${d.title} | ${DECISION_LABELS[d.status]} | ${d.reason} |`,
  ),
  ...report.products_paid.decisions.flatMap((d) => [
    `\n#### ${d.title}\n\n${d.selection_note}`,
    ...d.candidates.map(
      (p, i) =>
        `\n**${i + 1}. ${p.name}**\n\n品类：${d.title}\n\n型号：${p.model}\n\n对应本次观察：${p.mapped_concerns.map((k) => report.perception_scores.find((x) => x.key === k).observation).join('')}\n\n推荐理由：${p.reasons.join('')}\n\n主要成分及角色：\n\n${p.ingredients.map((v) => `- ${v.name}：${v.role}`).join('\n')}\n\n使用位置与方法：${p.usage}\n\n使用前留意：${p.caution}`,
    ),
  ]),
  '\n### 使用前留意',
  ...report.routine_paid.avoid.map((t) => '\n- ' + t),
  '\n未了解既往不耐受、孕哺状态及全部在用产品，不能据此确认某一配方适合所有情况。',
  '\n' + report.disclaimer,
  '\n---\n\n示例与应用由同一组观察数据和规则生成。产品来源与核对日期保存在 product-catalog.json；面向用户的报告不展示购买链接。',
];
fs.writeFileSync('docs/完整示例报告.md', out.join('\n') + '\n');
console.log('Exported two schemas, examples, catalog, prompt, and readable full report.');
