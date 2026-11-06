'use strict';
// 验证 QQ 机器人估值回复新增内容（对齐网站展示）：
// 1. 缺队友折扣（c6DepNotes）/ 专武折扣（sigDiscountNotes）/ 低命折扣
// 2. 角色数量加成 / 专武数量加成 / 皮肤加成（>0 时展示）
// 3. 与网站共用同一引擎+权重，数值口径一致
const { createEngine } = require('./value-engine');
const WUWA_CONFIG = require('./configs/wuwa');
const { formatReply } = require('./qq-bot');

const e = createEngine(WUWA_CONFIG);
const desc = '联觉等级70级 椿0命 守岸人0命 今汐0命 长离0命 折枝0命 维里奈0命 散华0命 椿0命 皮肤：今汐绯雪、长离霓裳、维里奈新星、椿夜白、守岸人月色、折枝霜华、散华赤霞、安可魔女 金18 标价3500';
const r = e.evaluateWithPrice(desc, 350000, null);
const reply = formatReply(r, 3500);
console.log('=== 估值回复 ===');
console.log(reply);
console.log('=== 断言 ===');
const d = r.details || {};
const checks = [
  ['估值行', reply.includes('预估价值'), true],
  ['合理区间', reply.includes('合理交易区间'), !!(d.priceRange && d.priceRange.low > 0)],
  ['缺队友折扣', reply.includes('缺队友折扣'), (d.c6DepNotes || []).length > 0],
  ['专武折扣', reply.includes('专武折扣'), (d.sigDiscountNotes || []).length > 0],
  ['低命折扣', reply.includes('低命折扣'), !!(d.flatDiscount && d.flatDiscount.value < 1)],
  ['皮肤加成', reply.includes('皮肤加成'), d.outfitCountBonus > 0],
  ['角色数量加成', reply.includes('角色数量加成'), d.charCountBonus > 0],
  ['专武数量加成', reply.includes('专武数量加成'), d.weaponCountBonus > 0],
];
let fail = 0;
for (const [name, shown, shouldShow] of checks) {
  const ok = shown === shouldShow;
  if (!ok) fail++;
  console.log((ok ? '✅ ' : '❌ ') + name + ' 展示=' + shown + ' 应展示=' + shouldShow);
}
console.log(fail === 0 ? 'ALL_PASS' : 'FAIL=' + fail);
process.exit(fail === 0 ? 0 : 1);
