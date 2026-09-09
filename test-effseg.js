'use strict';
// 有效金分段系数（首尾相连）验证：
// 1) 默认配置曲线与线上递推实现（3.10.0）一致（回归）
// 2) 后续段存储的 baseCoeff 不参与计算（由前面分段自动推算）
// 3) 修改第1段基准/边界会整体平移后续曲线（首尾相连）
// 4) 边界处曲线连续（左右无跳变）
// 5) 源码引擎与混淆引擎端到端一致
const assert = require('assert');
const fs = require('fs');

function extractFn(src, marker, paramNames, args) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('未找到: ' + marker);
  const braceStart = src.indexOf('{', start);
  let depth = 0, inStr = null, end = -1;
  for (let i = braceStart; i < src.length; i++) {
    const c = src[i], prev = src[i - 1];
    if (inStr) { if (c === inStr && prev !== '\\') inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  return new Function(...paramNames, src.slice(start, end + 1) + '\nreturn getEffectiveYellowCoeff;')(...args);
}

// 线上旧递推实现（复刻 3.10.0 部署版逻辑，作为回归基准）
function oldCoeff(segs, gold, maxCoeff) {
  const segStart = [];
  for (let i = 0; i < segs.length; i++) {
    if (i === 0) segStart[i] = segs[0].baseCoeff;
    else {
      const prevT = segs[i - 1].threshold;
      const prevPrevT = i >= 2 ? segs[i - 2].threshold : 0;
      segStart[i] = segStart[i - 1] + (prevT - prevPrevT) * segs[i - 1].step;
    }
  }
  let coeff;
  for (let i = 0; i < segs.length; i++) {
    const t = segs[i].threshold;
    if (t == null || gold <= t) {
      if (i === 0) coeff = segStart[0] + gold * segs[i].step;
      else coeff = segStart[i] + (gold - segs[i - 1].threshold) * segs[i].step;
      break;
    }
  }
  if (coeff == null) {
    const li = segs.length - 1;
    const prevT = li > 0 ? segs[li - 1].threshold : 0;
    coeff = segStart[li] + (gold - prevT) * segs[li].step;
  }
  if (maxCoeff > 0 && coeff > maxCoeff) coeff = maxCoeff;
  if (coeff < 0.1) coeff = 0.1;
  return Math.round(coeff * 1000) / 1000;
}

function makeModule(p) {
  const src = fs.readFileSync(p, 'utf8');
  const m = { exports: {} };
  new Function('module', 'exports', 'require', src)(m, m.exports, require);
  return m.exports;
}

const WUWA = require('./configs/wuwa');
const DW = WUWA.defaultWeights;
const SEGS = DW.effYellowSegments;
const MAXC = DW.effYellowMaxCoeff != null ? DW.effYellowMaxCoeff : 2.5;
console.log('wuwa 默认分段: ' + JSON.stringify(SEGS) + ' 上限: ' + MAXC + ' configVersion: ' + WUWA.configVersion);

const usSrc = fs.readFileSync('public/crab-monitor.user.js', 'utf8');
const engineSrc = fs.readFileSync('value-engine.src.js', 'utf8');
const usFn = extractFn(usSrc, 'function getEffectiveYellowCoeff', ['weights', 'DEFAULT_WEIGHTS'], [null, DW]);
const engineFn = extractFn(engineSrc, 'function getEffectiveYellowCoeff', ['weights', 'DEFAULT_WEIGHTS'], [null, DW]);

// [1] 回归：默认分段下，新实现 == 线上递推实现（默认曲线零变化）
console.log('\n[1] 默认配置回归（新实现 vs 线上递推基准）');
const golds = [0, 1, 5, 9, 10, 11, 20, 30, 39, 40, 41, 60, 80, 150, 300, 500];
for (const g of golds) {
  const oldC = oldCoeff(SEGS, g, MAXC);
  assert.strictEqual(usFn(g).coefficient, oldC, `脚本 gold=${g}: 新=${usFn(g).coefficient} 旧=${oldC}`);
  assert.strictEqual(engineFn(g).coefficient, oldC, `引擎 gold=${g}`);
}
console.log('  ' + golds.length + ' 个取值点全部一致 ✓（默认曲线零变化）');

// [2] 后续段存储的 baseCoeff 不参与计算（只读推算值，存什么都被忽略）
console.log('\n[2] 后续段存储 baseCoeff 不参与计算');
const junk = JSON.parse(JSON.stringify(SEGS));
junk[1].baseCoeff = 99;
junk[2].baseCoeff = -5;
const usJunk = extractFn(usSrc, 'function getEffectiveYellowCoeff', ['weights', 'DEFAULT_WEIGHTS'], [{ effYellowSegments: junk, effYellowMaxCoeff: MAXC }, DW]);
for (const g of [5, 20, 60, 200]) {
  assert.strictEqual(usJunk(g).coefficient, usFn(g).coefficient, `后续段baseCoeff应被忽略 gold=${g}`);
}
console.log('  第2/3段 baseCoeff 改成 99/-5 后曲线不变 ✓');

// [3] 修改第1段基准 → 整条曲线平移
console.log('\n[3] 修改第1段基准 0.3→0.5（整条曲线平移）');
const mod1 = JSON.parse(JSON.stringify(SEGS));
mod1[0].baseCoeff = 0.5;
const usMod1 = extractFn(usSrc, 'function getEffectiveYellowCoeff', ['weights', 'DEFAULT_WEIGHTS'], [{ effYellowSegments: mod1, effYellowMaxCoeff: MAXC }, DW]);
assert.strictEqual(usMod1(0).coefficient, 0.5, 'gold=0 → 新基准');
assert.strictEqual(usMod1(20).coefficient, Math.round((0.5 + 10 * 0.03 + 10 * 0.02) * 1000) / 1000, 'gold=20 → 第2段起点同步平移');
assert.strictEqual(usMod1(60).coefficient, Math.round((0.5 + 10 * 0.03 + 30 * 0.02 + 20 * 0.008) * 1000) / 1000, 'gold=60 → 第3段起点同步平移');
console.log('  全曲线同步平移 ✓');

// [3b] 修改第1段边界 → 后续段起点跟随新边界重算
console.log('[3b] 修改第1段边界 10→20');
const mod1t = JSON.parse(JSON.stringify(SEGS));
mod1t[0].threshold = 20;
const usMod1t = extractFn(usSrc, 'function getEffectiveYellowCoeff', ['weights', 'DEFAULT_WEIGHTS'], [{ effYellowSegments: mod1t, effYellowMaxCoeff: MAXC }, DW]);
assert.strictEqual(usMod1t(25).coefficient, 1.0, 'gold=25 → 第2段起点=0.3+20×0.03=0.9，再+5×0.02');
console.log('  第2段起点随边界重算 ✓');

// [4] 边界连续：边界处左右取值一致（首尾相连，无跳变）
console.log('\n[4] 边界连续性');
for (const t of [SEGS[0].threshold, SEGS[1].threshold]) {
  const at = usFn(t).coefficient;
  const left = usFn(t - 0.001).coefficient;
  const right = usFn(t + 0.001).coefficient;
  assert.ok(Math.abs(at - left) < 0.002, `边界 ${t} 左连续: ${left} vs ${at}`);
  assert.ok(Math.abs(at - right) < 0.002, `边界 ${t} 右连续: ${right} vs ${at}`);
}
console.log('  边界 ' + SEGS[0].threshold + '金/40金 处曲线连续 ✓');

// [5] 端到端：源码引擎 vs 混淆引擎，修改第1段基准生效、后续段存储基准无效
console.log('\n[5] 端到端估值');
const text = '【鸣潮】联觉等级：90\n五星角色：满命爱弥斯、满命绯雪、满命卡提希娅、满命夏空\n';
const engSrc = makeModule('./value-engine.src.js').createEngine(WUWA);
const engObf = makeModule('./value-engine.js').createEngine(WUWA);
const v1 = engSrc.evaluateWithPrice(text, 100000);
const v2 = engObf.evaluateWithPrice(text, 100000);
assert.strictEqual(v2.details.finalValue, v1.details.finalValue, '混淆引擎与源码引擎默认估值应一致');
console.log('  默认估值一致 ✓ finalValue=' + v1.details.finalValue);

const modW = JSON.parse(JSON.stringify(DW));
modW.effYellowSegments = JSON.parse(JSON.stringify(SEGS));
modW.effYellowSegments[0].baseCoeff = 0.9;
const v3 = engSrc.evaluateWithPrice(text, 100000, modW);
const v4 = engObf.evaluateWithPrice(text, 100000, modW);
assert.strictEqual(v4.details.finalValue, v3.details.finalValue, '混淆引擎与源码引擎自定义分段估值应一致');
assert.ok(v3.details.finalValue > v1.details.finalValue, '提高第1段基准后估值应上升');
console.log('  第1段基准 0.3→0.9 后估值 ' + v1.details.finalValue + ' → ' + v3.details.finalValue + '（生效 ✓）');

const modW2 = JSON.parse(JSON.stringify(DW));
modW2.effYellowSegments = JSON.parse(JSON.stringify(SEGS));
modW2.effYellowSegments[1].baseCoeff = 5;
const v5 = engSrc.evaluateWithPrice(text, 100000, modW2);
assert.strictEqual(v5.details.finalValue, v1.details.finalValue, '后续段存储基准不应影响估值');
console.log('  第2段存储基准改为 5 后估值不变 ✓');

console.log('\n全部通过 ✓');
