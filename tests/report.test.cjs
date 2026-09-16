const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEMO_PAYLOAD, analyzeSkin } = require('../.test-build/lib/mockAnalyzer');
const { mapLlmPayloadToResult } = require('../.test-build/lib/mapLlmToResult');
const { validatePayload } = require('../.test-build/lib/reportValidation');
const { CATEGORY_ORDER } = require('../.test-build/lib/carePlan');
const { PRODUCT_CATALOG } = require('../.test-build/lib/productCatalog');
const input = { age: 28, gender: 'female', imageUri: 'demo' };
const meta = { engine: 'llm', model_id: 'test', market: 'cn' };
const copy = () => structuredClone(DEMO_PAYLOAD);
const map = (p = copy(), i = input, m = meta) => mapLlmPayloadToResult(p, i, m);
test('seven scores derive from severity; overall mean and statuses agree', () => {
  const r = map();
  assert.equal(r.skin_score.value, 73);
  assert.equal(r.perception_scores.find((d) => d.key === 'pores').status, '优先关注');
  assert.equal(r.perception_scores.find((d) => d.key === 'redness').status, '可以留意');
});
test('all six product decisions present exactly once', () =>
  assert.deepEqual(
    map().products_paid.decisions.map((d) => d.category),
    CATEGORY_ORDER,
  ));
test('redness pauses new serum without a fabricated contraindication', () => {
  const d = map().products_paid.decisions.find((d) => d.category === 'serum');
  assert.equal(d.status, 'hold');
  assert.equal(d.candidates.length, 0);
  assert.match(d.reason, /不代表所有精华都不能用/);
});
test('reported tightness selects cream and does not stack two moisturizer steps', () => {
  const r = map(copy(), {
    ...input,
    preferences: { goals: ['dryness'], tightness: 'yes', discomfort: 'no' },
  });
  assert.equal(
    r.products_paid.decisions.find((d) => d.category === 'cream').status,
    'recommended',
  );
  for (const time of ['am', 'pm']) {
    assert.equal(
      r.routine_paid[time].filter((s) => ['lotion', 'cream'].includes(s.category)).length,
      1,
    );
    assert.equal(r.routine_paid[time].find((s) => s.action === '保湿').category, 'cream');
  }
});
test('no tightness -> no extra cream; unknown remains conditional', () => {
  const r = map(copy(), {
    ...input,
    preferences: { goals: [], tightness: 'no', discomfort: 'no' },
  });
  assert.equal(
    r.products_paid.decisions.find((d) => d.category === 'cream').status,
    'not_needed',
  );
  assert.equal(
    map().products_paid.decisions.find((d) => d.category === 'cream').status,
    'optional',
  );
});
test('partial does not invent total or product candidates', () => {
  const p = copy();
  p.quality = 'limited';
  p.quality_note = '眼周没有拍清楚，暂时无法判断细纹。';
  p.tendency = 'unclear';
  p.perception.fine_lines.severity = null;
  p.perception.fine_lines.observation = '眼周没有拍清楚，暂时无法判断细纹。';
  p.perception.fine_lines.regions = [];
  const r = map(p);
  assert.equal(r.skin_score.value, null);
  assert.equal(r.analysis_status, 'partial');
  assert.ok(r.products_paid.decisions.every((d) => d.candidates.length === 0));
});
test('missing dimension rejected instead of copying overall score', () => {
  const p = copy();
  delete p.perception.pores;
  assert.throws(() => map(p));
});
test('missing observation and unsupported fields rejected', () => {
  const p = copy();
  p.perception.pores.observation = '';
  p.products = [{ name: 'invented' }];
  assert.throws(() => map(p));
});
test('bad copy, percentages, and score contradictions rejected', () => {
  for (const text of [
    '两颊平滑偏哑，看起来很乖。',
    '毛孔状态很好，把握90%。',
    '鼻翼两侧毛孔未见突出。',
  ]) {
    const p = copy();
    p.perception.pores.observation = text;
    assert.throws(() => map(p));
  }
});
test('gender/age never change observed scores', () =>
  assert.deepEqual(
    map().perception_scores,
    map(copy(), { ...input, gender: 'male', age: 65 }).perception_scores,
  ));
test('all-good image does not manufacture concerns', () => {
  const p = copy();
  for (const d of Object.values(p.perception)) {
    d.severity = 0;
    d.observation = '当前照片中未见突出的相关表现。';
  }
  const r = map(p);
  assert.deepEqual(r.summary_free.priorities, []);
  assert.equal(r.skin_score.value, 100);
});
test('adult product catalog not used for a minor', () =>
  assert.ok(
    map(copy(), { ...input, age: 16 }).products_paid.decisions.every(
      (d) => d.candidates.length === 0,
    ),
  ));
test('unknown overseas catalog does not leak Chinese formula choices', () =>
  assert.ok(
    map(copy(), input, { ...meta, market: 'overseas' }).products_paid.decisions.every(
      (d) => d.candidates.length === 0,
    ),
  ));
test('catalog source, 2-4 ingredients, models, and 3-5 reasons present', () => {
  for (const p of PRODUCT_CATALOG) {
    assert.ok(p.ingredients.length >= 2 && p.ingredients.length <= 4);
    assert.ok(
      p.model && /^https:\/\/www\.(kao\.com\/cn|cetaphil\.com\.cn)\//.test(p.source_url),
    );
  }
  for (const d of map().products_paid.decisions)
    for (const p of d.candidates)
      assert.ok(p.reasons.length >= 3 && p.reasons.length <= 5);
});
test('demo is explicit and fixed across photo URI and demographic inputs', () => {
  const a = analyzeSkin(input),
    b = analyzeSkin({ ...input, age: 60, gender: 'male', imageUri: 'another' });
  assert.equal(a.meta.engine, 'mock');
  assert.deepEqual(a.perception_scores, b.perception_scores);
  assert.match(a.quality_note, /未分析你的照片/);
});

test('unusable photo never receives a score, tendency, or catalog match', () => {
  const p = copy();
  p.quality = 'unusable';
  p.quality_note = '照片过暗，无法观察脸部细节。';
  p.tendency = 'unclear';
  for (const d of Object.values(p.perception)) {
    d.severity = null;
    d.regions = [];
    d.observation = '这一项没有拍清楚，暂时无法判断。';
  }
  const r = map(p);
  assert.equal(r.analysis_status, 'insufficient');
  assert.equal(r.skin_score.value, null);
  assert.equal(r.skin_type.label, 'unclear');
  assert.ok(r.products_paid.decisions.every((d) => !d.candidates.length));
});
test('an unassessed observation cannot make a positive finding', () => {
  const p = copy();
  p.quality = 'limited';
  p.quality_note = '眼周没有拍清楚，暂时无法判断细纹。';
  p.tendency = 'unclear';
  p.perception.fine_lines.severity = null;
  p.perception.fine_lines.regions = [];
  assert.throws(() => map(p));
});
test('user goal changes ordering within urgency, never hides urgent concerns', () => {
  const r = map(copy(), {
    ...input,
    preferences: { goals: ['pores', 'dryness'], tightness: 'no', discomfort: 'no' },
  });
  assert.deepEqual(r.summary_free.priorities, ['pores', 'oiliness']);
});
test('optional hydration serum needs reported dryness and no simplification trigger', () => {
  const p = copy();
  p.perception.redness.severity = 0;
  p.perception.redness.observation = '鼻翼和两颊暂时没有明显泛红。';
  const r = map(p, {
    ...input,
    preferences: { goals: ['dryness'], tightness: 'yes', discomfort: 'no' },
  });
  assert.equal(
    r.products_paid.decisions.find((d) => d.category === 'serum').status,
    'optional',
  );
  assert.ok(
    r.products_paid.decisions.find((d) => d.category === 'serum').candidates.length,
  );
});
test('sunscreen step stays present when verified candidate data is missing', () => {
  const r = map();
  const d = r.products_paid.decisions.find((d) => d.category === 'sunscreen');
  assert.equal(d.status, 'recommended');
  assert.equal(d.candidates.length, 0);
  assert.match(d.selection_note, /核对配方与防护等级/);
  assert.ok(r.routine_paid.am.some((s) => s.category === 'sunscreen'));
});

test('both exported Draft 2020-12 schemas compile and validate their matching payloads', () => {
  const Ajv = require('ajv/dist/2020');
  const ajv = new Ajv({ strict: false, allErrors: true });
  const { LLM_OUTPUT_SCHEMA } = require('../.test-build/lib/llmSchema');
  const { REPORT_OUTPUT_SCHEMA } = require('../.test-build/lib/reportSchema');
  const observation = ajv.compile(LLM_OUTPUT_SCHEMA),
    report = ajv.compile(REPORT_OUTPUT_SCHEMA);
  assert.ok(observation(copy()), JSON.stringify(observation.errors));
  assert.ok(report(map()), JSON.stringify(report.errors));
  const missing = map();
  missing.products_paid.decisions.pop();
  assert.equal(report(missing), false);
  const inconsistent = map();
  inconsistent.skin_score.value = null;
  assert.equal(report(inconsistent), false);
});
