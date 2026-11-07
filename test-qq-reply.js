'use strict';
// 验证 QQ 机器人估值回复（对齐网站"估价计算明细"）：
// 明细行：角色价值/配队溢价/抽数价值/资源价值/缺队友折扣/专武折扣/低命折扣/
//        有效金系数/满命溢价/满命抽数加成/角色数量加成/专武数量加成/皮肤加成
const { createEngine } = require('./value-engine');
const WUWA_CONFIG = require('./configs/wuwa');
const { formatReply } = require('./qq-bot');

const e = createEngine(WUWA_CONFIG);
// 场景1：低命+缺专武+皮肤（触发折扣与皮肤加成）
// 场景2：含满命（触发满命溢价/满命抽数加成，且不再触发低命折扣）
const cases = [
  {
    name: '低命缺专武+皮肤',
    desc: '联觉等级70级 椿0命 守岸人0命 今汐0命 长离0命 折枝0命 维里奈0命 散华0命 椿0命 皮肤：今汐绯雪、长离霓裳、维里奈新星、椿夜白、守岸人月色、折枝霜华、散华赤霞、安可魔女 金18 标价3500',
    price: 3500,
  },
  {
    name: '含满命',
    desc: '联觉等级70级 椿6命 今汐6命 守岸人1命 长离0命 折枝0命 维里奈0命 今汐专武 椿专武 金18 抽卡剩800发 标价9800',
    price: 9800,
  },
];

let fail = 0;
for (const c of cases) {
  const r = e.evaluateWithPrice(c.desc, c.price * 100, null);
  const reply = formatReply(r, c.price);
  const d = r.details || {};
  const mpi = d.pullInfo || {};
  console.log('\n=== 场景：' + c.name + ' ===');
  console.log(reply);
  const rows = [
    ['角色价值', reply.includes('· 角色价值：'), d.characterValue != null],
    ['配队溢价', reply.includes('· 配队溢价：'), d.teamPremium != null && d.teamPremium > 0],
    ['抽数价值', reply.includes('· 抽数价值：'), (mpi.baseTotal != null ? mpi.baseTotal : Math.max(0, (d.pullValue || 0) - (mpi.c6Bonus || 0))) > 0],
    ['资源价值', reply.includes('· 资源价值：'), d.resourceValue != null && d.resourceValue > 0],
    ['缺队友折扣', reply.includes('缺队友折扣'), (d.c6DepNotes || []).length > 0],
    ['专武折扣', reply.includes('· 专武折扣：'), (d.sigDiscountNotes || []).length > 0],
    ['低命折扣', reply.includes('低命折扣'), !!(d.flatDiscount && d.flatDiscount.value < 1)],
    ['有效金系数', reply.includes('有效金系数'), !!(d.yellowInfo && d.yellowInfo.coefficient != null && d.yellowInfo.coefficient !== 1)],
    ['满命溢价', reply.includes('· 满命溢价：'), d.c6Premium != null && d.c6Premium > 0],
    ['满命抽数加成', reply.includes('满命抽数加成'), mpi.c6Bonus != null && mpi.c6Bonus > 0],
    ['角色数量加成', reply.includes('角色数量加成'), d.charCountBonus > 0],
    ['专武数量加成', reply.includes('专武数量加成'), d.weaponCountBonus > 0],
    ['皮肤加成', reply.includes('皮肤加成'), d.outfitCountBonus > 0],
  ];
  for (const [name, shown, shouldShow] of rows) {
    const ok = shown === shouldShow;
    if (!ok) fail++;
    console.log((ok ? '✅ ' : '❌ ') + name + ' 展示=' + shown + ' 应展示=' + shouldShow);
  }
}
console.log(fail === 0 ? '\nALL_PASS' : '\nFAIL=' + fail);
process.exit(fail === 0 ? 0 : 1);
