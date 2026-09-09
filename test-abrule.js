'use strict';
// 有效金 A/B级高命规则（3.12.0）验证：
// 1) A级≥3命、强绑队友不在场 → 角色自身(含专武)计入有效金（旧版不计入）
// 2) B级≥3命、无强绑队友 → 角色自身计入有效金（旧版不计入）
// 3) A/B级<3命且强绑队友不在场 → 仍不计入（回归）
// 4) A级强绑行为不变：0命+队友在场双方计入；3命+队友在场全组计入
// 5) S级角色+专武行为不变（回归）
// 6) 源码引擎与混淆引擎端到端一致
const assert = require('assert');
const fs = require('fs');

function makeModule(p) {
  const src = fs.readFileSync(p, 'utf8');
  const m = { exports: {} };
  new Function('module', 'exports', 'require', src)(m, m.exports, require);
  return m.exports;
}

const WUWA = require('./configs/wuwa');
const engSrc = makeModule('./value-engine.src.js').createEngine(WUWA);
const engObf = makeModule('./value-engine.js').createEngine(WUWA);

function effOf(engine, text) {
  return engine.evaluateWithPrice(text, 100000).details.yellowInfo.effectiveYellow;
}

const HEAD = '【鸣潮】联觉等级：90\n';
// [说明, 角色文本, 期望有效金]
const cases = [
  ['A级3命无强绑队友 → 计入', '五星角色：3命弗洛洛\n', 4],
  ['A级3命无强绑+精1专武 → 角色与专武计入', '五星角色：3命弗洛洛\n五星武器：精1幽冥的忘忧章\n', 5],
  ['A级2命无强绑队友 → 不计入（回归）', '五星角色：2命弗洛洛\n', 0],
  ['A级0命无强绑队友 → 不计入（回归）', '五星角色：弗洛洛\n', 0],
  ['B级3命无强绑队友 → 计入', '五星角色：3命洛瑟菈\n', 4],
  ['B级2命无强绑队友 → 不计入（回归）', '五星角色：2命洛瑟菈\n', 0],
  ['B级3命强绑位（夏空无卡提希娅）→ 计入', '五星角色：3命夏空\n', 4],
  ['A级0命+强绑队友在场 → 双方计入（回归）', '五星角色：弗洛洛、坎特蕾拉\n', 1.5],
  ['A级3命+强绑队友在场 → 全组计入', '五星角色：3命弗洛洛、坎特蕾拉\n', 4.5],
  ['S级角色 → 计入（回归）', '五星角色：爱弥斯\n', 1],
];

let pass = 0;
for (const [desc, body, expected] of cases) {
  const text = HEAD + body;
  const a = effOf(engSrc, text);
  const b = effOf(engObf, text);
  assert.strictEqual(a, expected, `${desc}: 源码引擎期望 ${expected}，实际 ${a}`);
  assert.strictEqual(b, expected, `${desc}: 混淆引擎期望 ${expected}，实际 ${b}`);
  console.log(`✓ ${desc} → 有效金 ${a}`);
  pass++;
}

// 端到端：源码引擎与混淆引擎混合账号估值完全一致
const mixText = HEAD + '五星角色：满命爱弥斯、3命洛瑟菈、2命夏空\n五星武器：精2永远的启明星\n';
const v1 = engSrc.evaluateWithPrice(mixText, 100000).details;
const v2 = engObf.evaluateWithPrice(mixText, 100000).details;
assert.strictEqual(v2.finalValue, v1.finalValue, '混淆引擎与源码引擎估值应一致');
assert.strictEqual(v1.yellowInfo.effectiveYellow, 12.5, `混合账号有效金应为 7+1.5+4=12.5，实际 ${v1.yellowInfo.effectiveYellow}`);
console.log(`✓ 混合账号（S满命+专武/B级3命/B级2命）→ 有效金 ${v1.yellowInfo.effectiveYellow}，两端估值一致 finalValue=${v1.finalValue}`);

console.log(`\n${pass + 1} 项全部通过 ✓`);
