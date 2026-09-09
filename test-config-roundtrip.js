'use strict';
// 有效金分段系数 导出/导入配置 全链路验证（3.12.1）：
// [1] 网站面板：自定义分段保存→导出→导入→loadWeights 回显一致
// [2] Bug1修复：无自定义配置时 loadWeights 使用服务器默认（zzz 为 4 段，而非硬编码 legacy 3 段）
// [3] Bug2修复：旧格式（3.9.x 扁平字段）配置文件在 3 处导入入口统一转换为分段数组
// [4] 油猴脚本导入合并语义：导入的分段覆盖当前；导入文件无分段时保留当前
// [5] 引擎端到端：旧格式经转换后估值生效；不转换则被内置默认覆盖（复现"导入没成功"根因）
// [6] 管理后台预览：旧格式转换后 renderConfigHumanReadable 正常显示分段
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function makeModule(p) {
  const src = fs.readFileSync(p, 'utf8');
  const m = { exports: {} };
  new Function('module', 'exports', 'require', src)(m, m.exports, require);
  return m.exports;
}

// 花括号配平提取函数源码（来自 test-effseg.js 的成熟做法）
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
  return new Function(...paramNames, src.slice(start, end + 1) + '\nreturn ' + marker.replace('function ', '') + ';')(...args);
}

// ============ 加载各模块 ============
const WUWA = require('./configs/wuwa');
const ZZZ = require('./configs/zzz');
const engWuwa = makeModule('./value-engine.src.js');
const wuwaDefaults = engWuwa.createEngine(WUWA).getDefaults();
const zzzDefaults = engWuwa.createEngine(ZZZ).getDefaults();

const vsSrc = fs.readFileSync(path.join(ROOT, 'public/value-settings.js'), 'utf8');
const usSrc = fs.readFileSync(path.join(ROOT, 'public/crab-monitor.user.js'), 'utf8');
const adminSrc = fs.readFileSync(path.join(ROOT, 'views/admin.js'), 'utf8');

const vsLoadWeights = extractFn(vsSrc, 'function loadWeights', ['defaults', 'saved', 'buildDefaultTeamPremiums'], [null, null, function(teams) {
  var r = {};
  for (var i = 0; i < teams.length; i++) r[teams[i].name] = { chars: [].concat(teams[i].members || []), multiplier: teams[i].multiplier || 1.0, enabled: true };
  return r;
}]);
const convVS = extractFn(vsSrc, 'function convertLegacyEffSegs', ['cfg'], []);
const convUS = extractFn(usSrc, 'function convertLegacyEffSegs', ['cfg'], []);
const convAdmin = extractFn(adminSrc, 'function convertLegacyEffSegs', ['cfg'], []);

// ============ [1] 网站面板：自定义分段 导出→导入 回显 ============
console.log('[1] 网站面板 新格式分段 导出→导入 回显');
// 模拟面板保存后的 localStorage（collect 逻辑产物）
const customSegments = [
  { baseCoeff: 0.45, threshold: 12, step: 0.04 },
  { baseCoeff: 0.93, threshold: 45, step: 0.025 },
  { baseCoeff: 1.605, threshold: null, step: 0.012 },
];
let stored = { effYellowSegments: customSegments, effYellowMaxCoeff: 2.2 };
// 导出：读 localStorage → 去派生字段 → JSON（文件内容）
let exported = JSON.parse(JSON.stringify(stored));
delete exported.constPrices; delete exported.deletedChars; delete exported.sigWeaponsOverride;
// 导入：JSON.parse → 旧格式转换（新格式应原样）→ 去派生字段 → saveWeights 替换存储
let imported = JSON.parse(JSON.stringify(exported));
const conv1 = convVS(imported);
assert.strictEqual(conv1, null, '新格式文件不应触发旧格式转换');
delete imported.constPrices; delete imported.deletedChars; delete imported.sigWeaponsOverride;
stored = imported;
// 重新打开面板：loadWeights(defaults, saved)
const w1 = vsLoadWeights(wuwaDefaults, stored, undefined);
assert.deepStrictEqual(w1.effYellowSegments, customSegments, '导入后 loadWeights 应回显导入的分段');
assert.strictEqual(w1.effYellowMaxCoeff, 2.2, '导入后系数上限应生效');
console.log('  ✓ 导入分段与导出分段完全一致（3段，基准0.45/上限2.2）');

// ============ [2] Bug1修复：无自定义时使用服务器默认 ============
console.log('\n[2] 无自定义配置时面板使用服务器默认分段');
const wWuwa = vsLoadWeights(wuwaDefaults, {}, undefined);
assert.deepStrictEqual(wWuwa.effYellowSegments, WUWA.defaultWeights.effYellowSegments,
  '鸣潮无自定义时应显示服务器默认3段（0.3/10/0.03...），而非硬编码legacy值');
const wZzz = vsLoadWeights(zzzDefaults, {}, undefined);
assert.strictEqual(wZzz.effYellowSegments.length, 4, '绝区零无自定义时应显示服务器默认4段');
assert.strictEqual(wZzz.effYellowSegments[0].baseCoeff, 0.15, '绝区零第1段基准应为0.15');
assert.strictEqual(wZzz.effYellowSegments[3].threshold, null, '绝区零第4段无边界');
console.log('  ✓ 鸣潮3段(0.3/10/0.03)、绝区零4段(0.15/15/0.03...)均正确加载服务器默认');

// loadWeights 返回的数组不得是服务器默认数组的引用（面板删段会 splice 原数组）
assert.notStrictEqual(wZzz.effYellowSegments, zzzDefaults.weights.effYellowSegments, '分段数组应为副本而非引用');
wZzz.effYellowSegments.splice(0, 1);
assert.strictEqual(zzzDefaults.weights.effYellowSegments.length, 4, '面板内删段不应污染服务器默认缓存');
console.log('  ✓ 分段为副本，面板内增删段不会污染默认配置缓存');

// ============ [3] Bug2修复：旧格式（3.9.x 扁平字段）导入转换 ============
console.log('\n[3] 旧格式（扁平字段）配置文件导入转换');
// 3.9.x 脚本导出的旧格式文件（含旧扁平字段，无 segments 数组）
const legacyFile = {
  effYellowBaseCoeff: 0.2,
  effYellowSeg1Threshold: 12, effYellowSeg1Step: 0.04,
  effYellowSeg2BaseCoeff: 0.68, effYellowSeg2Threshold: 45, effYellowSeg2Step: 0.03,
  effYellowSeg3Step: 0.01, effYellowMaxCoeff: 2.4,
  charPrices: { '忌炎': 300 },
};
const expectedConv = [
  { baseCoeff: 0.2, threshold: 12, step: 0.04 },
  { baseCoeff: 0.68, threshold: 45, step: 0.03 },
  { baseCoeff: 0.68 + (45 - 12) * 0.03, threshold: null, step: 0.01 },
];
for (const [name, fn] of [['value-settings', convVS], ['油猴脚本', convUS], ['管理后台', convAdmin]]) {
  assert.deepStrictEqual(fn(JSON.parse(JSON.stringify(legacyFile))), expectedConv, name + ' 转换结果应一致且正确');
}
console.log('  ✓ 3 处导入入口（网站面板/油猴脚本/管理后台）转换结果完全一致');
assert.strictEqual(convVS({}), null, '空对象不转换');
assert.strictEqual(convVS({ charPrices: { a: 1 } }), null, '无有效金字段的配置不转换');
assert.strictEqual(convVS({ effYellowSegments: [{ baseCoeff: 0.3, threshold: 10, step: 0.03 }] }), null, '新格式不转换');
console.log('  ✓ 新格式/无分段配置不误触发转换');

// 最老格式：只有 effYellowBaseCoeff（无 Seg 系列字段）
const oldestFile = { effYellowBaseCoeff: 0.25, effYellowSeg1Threshold: 20, effYellowSeg1Step: 0.05, effYellowSeg2Threshold: 50, effYellowSeg2Step: 0.02, effYellowSeg3Step: 0.006 };
const oldestConv = convUS(oldestFile);
assert.deepStrictEqual(oldestConv, [
  { baseCoeff: 0.25, threshold: 20, step: 0.05 },
  { baseCoeff: 0.25 + 20 * 0.05, threshold: 50, step: 0.02 },
  { baseCoeff: 0.25 + 20 * 0.05 + 30 * 0.02, threshold: null, step: 0.006 },
], '最老格式（仅 effYellowBaseCoeff）应按首尾相连推导后续段起点');
console.log('  ✓ 最老格式（仅基准系数）按首尾相连正确推导');

// ============ [4] 油猴脚本导入合并语义 ============
console.log('\n[4] 油猴脚本导入合并语义');
const currentSegs = [{ baseCoeff: 0.3, threshold: 10, step: 0.03 }];
const importNewSegs = [{ baseCoeff: 0.5, threshold: 8, step: 0.05 }, { baseCoeff: 0.9, threshold: null, step: 0.02 }];
// 导入新格式文件：merged = Object.assign({}, current, imported)
let merged = Object.assign({}, { effYellowSegments: currentSegs }, { effYellowSegments: importNewSegs, effYellowMaxCoeff: 2.6 });
assert.deepStrictEqual(merged.effYellowSegments, importNewSegs, '导入的分段应整体覆盖当前');
// 导入部分配置（无分段、无扁平字段）：保留当前分段
merged = Object.assign({}, { effYellowSegments: currentSegs }, { charPrices: { '吟霖': 320 } });
assert.deepStrictEqual(merged.effYellowSegments, currentSegs, '导入文件不含分段时应保留当前分段');
// 导入旧格式：入口先转换再合并
const legacyImported = JSON.parse(JSON.stringify(legacyFile));
const conv4 = convUS(legacyImported);
if (conv4) {
  legacyImported.effYellowSegments = conv4;
  ['effYellowBaseCoeff','effYellowSeg1BaseCoeff','effYellowSeg1Threshold','effYellowSeg1Step','effYellowSeg2BaseCoeff','effYellowSeg2Threshold','effYellowSeg2Step','effYellowSeg3BaseCoeff','effYellowSeg3Step'].forEach(k => delete legacyImported[k]);
}
merged = Object.assign({}, { effYellowSegments: currentSegs }, legacyImported);
assert.deepStrictEqual(merged.effYellowSegments, expectedConv, '旧格式导入转换后应覆盖当前分段');
console.log('  ✓ 导入覆盖/保留/旧格式转换三种合并语义均正确');

// ============ [5] 引擎端到端：旧格式管理后台导入估值生效 ============
console.log('\n[5] 引擎端到端估值');
const TITLE = '【联觉等级】50 【五星角色】绯雪 【五星武器】灼霜 【抽数】300';
const engine = engWuwa.createEngine(WUWA);
// 有效金=2（S级绯雪1金 + 专武灼霜1金）
// 转换后的分段：第1段 0.2 + 2×0.04 = 0.28
const convertedCfg = { effYellowSegments: expectedConv, effYellowMaxCoeff: 2.4, charPrices: { '忌炎': 300 } };
const r5 = engine.evaluateWithPrice(TITLE, 50000, convertedCfg);
assert.ok(Math.abs(r5.details.yellowMultiplier - 0.28) < 0.002,
  `转换后估值应使用导入分段(期望系数0.28)，实际 ${r5.details.yellowMultiplier}`);
console.log(`  ✓ 旧格式经转换后系数生效: ${r5.details.yellowMultiplier}`);
// 未转换（Bug复现对照）：扁平字段被内置默认覆盖
const r5b = engine.evaluateWithPrice(TITLE, 50000, legacyFile);
assert.ok(Math.abs(r5b.details.yellowMultiplier - 0.36) < 0.002,
  `未转换时扁平字段被忽略，走内置默认(0.3+2×0.03=0.36)，实际 ${r5b.details.yellowMultiplier}`);
console.log(`  ✓ 复现修复前根因: 未转换时系数=${r5b.details.yellowMultiplier}（内置默认，导入不生效）`);
// 新格式导入 → 生效
const r5c = engine.evaluateWithPrice(TITLE, 50000, { effYellowSegments: importNewSegs, effYellowMaxCoeff: 2.6 });
assert.ok(Math.abs(r5c.details.yellowMultiplier - 0.6) < 0.002,
  `新格式导入系数应为 0.5+2×0.05=0.6，实际 ${r5c.details.yellowMultiplier}`);
console.log(`  ✓ 新格式导入系数生效: ${r5c.details.yellowMultiplier}`);

// ============ [6] 管理后台预览：旧格式转换后正常显示 ============
console.log('\n[6] 管理后台预览渲染');
const fnStart = adminSrc.indexOf('function renderConfigHumanReadable');
const braceStart = adminSrc.indexOf('{', fnStart);
let depth2 = 0, end2 = -1;
for (let i = braceStart; i < adminSrc.length; i++) {
  if (adminSrc[i] === '{') depth2++;
  else if (adminSrc[i] === '}') { depth2--; if (depth2 === 0) { end2 = i; break; } }
}
const renderFn = new Function('config', 'escapeHtml', adminSrc.slice(fnStart, end2 + 1) + '\nreturn renderConfigHumanReadable(config);');
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const htmlLegacy = renderFn(convertedCfg, escapeHtml);
assert.ok(htmlLegacy.includes('有效金系数（按有效金数分段）') && htmlLegacy.includes('0.2'), '转换后的旧格式配置应显示有效金分段段');
const htmlNew = renderFn({ effYellowSegments: importNewSegs, effYellowMaxCoeff: 2.6 }, escapeHtml);
assert.ok(htmlNew.includes('有效金系数（按有效金数分段）') && htmlNew.includes('0.5'), '新格式配置正常显示有效金分段段');
console.log('  ✓ 旧格式转换后与新格式均在后台预览正常显示分段');

console.log('\n全部通过 ✓');
