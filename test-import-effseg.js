'use strict';
// 复现用户报告：脚本导出配置 → 管理后台导入 → "没成功"
// 验证：1) 引擎是否正确使用导入的 effYellowSegments（功能链路）
//       2) 管理后台 renderConfigHumanReadable 是否显示该段（显示链路）
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// ============ 1. 构造油猴脚本 3.11.0 导出的配置（模拟用户修改了分段） ============
// 用户在脚本里把第1段基准改成 0.5、边界 10/40、步长 0.05/0.03/0.01（示例修改值）
const exportedConfig = {
  effYellowSegments: [
    { baseCoeff: 0.5, threshold: 10, step: 0.05 },
    { baseCoeff: 0.6, threshold: 40, step: 0.03 },
    { baseCoeff: 1.2, threshold: null, step: 0.01 },
  ],
  effYellowMaxCoeff: 2.5,
  charPrices: { '吟霖': 320 },
  pullBase: 120,
  // 注意：3.10.0+ 不再保存旧扁平字段
};

// ============ 2. 模拟 db.setConfig / getConfig 原样存取 ============
const stored = JSON.parse(JSON.stringify(exportedConfig));
assert.deepStrictEqual(stored.effYellowSegments, exportedConfig.effYellowSegments, 'db 层应原样保存 effYellowSegments');

// ============ 3. 引擎加载该配置并计算（模拟 testbank evaluate → evaluateWithPrice） ============
function loadEngine() {
  // 混淆版 value-engine.js 含反调试代码无法用 new Function 加载，用源码版（两者已验证一致）
  const src = fs.readFileSync(path.join(ROOT, 'value-engine.src.js'), 'utf8');
  const factory = new Function('require', 'module', src + '\nmodule.exports.createEngine = createEngine;');
  const mod = { exports: {} };
  factory(require, mod);
  return mod.exports.createEngine(require(path.join(ROOT, 'configs/wuwa.js')));
}
const engine = loadEngine();

// 独立按首尾相连公式计算绯雪（S级+专武→有效金1）的期望系数
// 有效金 = 1 → 第1段：0.5 + 1×0.05 = 0.55
const TITLE = '【联觉等级】50 【五星角色】绯雪 【五星武器】死舞宴 【抽数】300';
const expectedCoeff = Math.round((0.5 + 1 * 0.05) * 1000) / 1000;

// 用导入的配置作为 customWeights 估值
const evalResult = engine.evaluateWithPrice(TITLE, 50000, exportedConfig);
const ym = evalResult.details.yellowMultiplier;
assert.ok(Math.abs(ym - expectedCoeff) < 0.002,
  `引擎应使用导入的分段：期望系数≈${expectedCoeff}，实际=${ym}`);
console.log(`✓ [1] 引擎正确使用导入的 effYellowSegments（有效金1 → 系数 ${ym}，默认配置下应为 0.33）`);

// 对照：不传 customWeights（默认配置）时，有效金1 → 0.3+1×0.03=0.33
const evalDefault = engine.evaluateWithPrice(TITLE, 50000, null);
assert.ok(Math.abs(evalDefault.details.yellowMultiplier - 0.33) < 0.002, '默认配置有效金1应为0.33');
assert.ok(Math.abs(ym - evalDefault.details.yellowMultiplier) > 0.1, '导入配置应产生与默认不同的系数');
console.log(`✓ [2] 导入配置(${ym}) 与默认配置(${evalDefault.details.yellowMultiplier}) 系数不同 → 估值确实生效`);

// ============ 4. 复现管理后台预览渲染（renderConfigHumanReadable 的有效金段） ============
// 从 views/admin.js 提取该函数，用导出的配置渲染，检查有效金段是否出现
const adminSrc = fs.readFileSync(path.join(ROOT, 'views/admin.js'), 'utf8');
const fnStart = adminSrc.indexOf('function renderConfigHumanReadable');
const braceStart = adminSrc.indexOf('{', fnStart);
let depth = 0, end = -1;
for (let i = braceStart; i < adminSrc.length; i++) {
  if (adminSrc[i] === '{') depth++;
  else if (adminSrc[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
const renderFn = new Function('config', 'escapeHtml',
  adminSrc.slice(fnStart, end + 1) + '\nreturn renderConfigHumanReadable(config);');
// escapeHtml：提供与 admin.js 相同的简化版
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html = renderFn(exportedConfig, escapeHtml);

const hasOldField = exportedConfig.effYellowBaseCoeff != null;
console.log(`   导出配置含旧字段 effYellowBaseCoeff: ${hasOldField}`);
console.log(`   渲染结果含"有效金系数（按有效金数分段）"段落: ${html.includes('有效金系数（按有效金数分段）')}`);
console.log(`   渲染结果含 effYellowSegments 内容(0.5/步长0.05): ${html.includes('0.5') && html.includes('0.05')}`);

// 结论输出
if (!html.includes('有效金系数（按有效金数分段）')) {
  console.log('\n✗ [3] 复现问题：管理后台预览/检查服务器配置完全不显示有效金分段段 → 用户看到"导入没成功"');
  console.log('   根因：renderConfigHumanReadable 仅在 config.effYellowBaseCoeff != null（3.9.x 旧字段）时渲染，');
  console.log('   而 3.10.0+ 导出的配置只含 effYellowSegments 数组，该段整体消失。');
  console.log('   注意：数据实际已入库且估值生效（见 [1][2]），纯粹是后台显示问题。');
  process.exit(2);
} else {
  console.log('\n✓ [3] 预览正常显示有效金分段');
}
