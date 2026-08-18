/**
 * value-engine.js - 鸣潮账号估值引擎
 * 从油猴脚本（螃蟹网鸣潮监控助手.user.js）完整移植估值逻辑，
 * 确保两端估值结果完全一致。
 *
 * 对外接口（保持不变）：
 *   - evaluateWithPrice(showTitle, priceInCents)
 *   - generateShortDescription(evaluation)
 */

'use strict';

// 配置版本号（递增后强制覆盖用户旧配置）
const CONFIG_VERSION = 19;

// ============================================================
// 角色定价配置（对应油猴脚本 CHAR_TIERS）
// ============================================================
const CHAR_TIERS = {
  S: { price: 50, isHot: true, chars: ['爱弥斯', '绯雪', '秧秧玄翎', '卡提希娅'] },
  A: { price: 35, isHot: true, chars: ['琳奈', '千咲', '穗穗', '莫宁', '弗洛洛', '洛瑟菈'] },
  B: { price: 25, isHot: true, chars: ['达妮娅', '夏空', '露西', '嘉贝莉娜', '奥古斯塔', '仇远', '尤诺', '陆赫斯', '赞妮', '布兰特', '守岸人', '西格莉卡'] },
  C: { price: 5, isHot: false, chars: ['露帕', '珂莱塔', '菲比', '坎特蕾拉', '椿'] },
  D: { price: 3, isHot: false, chars: ['忌炎', '吟霖', '相里要', '今汐', '长离', '折枝', '洛可可', '丽贝卡'] },
  E: { price: 2, isHot: false, chars: ['维里奈', '卡卡罗', '安可', '凌阳', '鉴心', '秧秧'] },
};

// ============================================================
// 专武映射（角色名 -> 专武名，对应油猴脚本 SIG_WEAPONS）
// ============================================================
const SIG_WEAPONS = {
  '忌炎': '苍鳞千嶂', '吟霖': '掣傀之手', '今汐': '时和岁稔', '长离': '赫奕流明',
  '相里要': '诸方玄枢', '椿': '裁春', '珂莱塔': '死与舞', '折枝': '琼枝冰绡',
  '守岸人': '星序协响', '洛瑟菈': '存帧', '莫宁': '宙算仪轨', '千咲': '昙切',
  '爱弥斯': '永远的启明星', '弗洛洛': '幽冥的忘忧章', '卡提希娅': '不屈命定之冠',
  '尤诺': '万物持存的注释', '夏空': '林间的咏叹调', '赞妮': '焰光裁定',
  '坎特蕾拉': '海的呢喃', '仇远': '裁竹', '布兰特': '不灭航路', '露帕': '焰痕',
  '奥古斯塔': '驭冕铸雷之权', '嘉贝莉娜': '光影双生', '西格莉卡': '昭日译注',
  '达妮娅': '赝作的矮星', '菲比': '和光回唱', '绯雪': '灼霜', '琳奈': '溢彩荧辉',
  '丽贝卡': '碎骨', '陆赫斯': '白昼之脊', '秧秧玄翎': '天之苍苍', '穗穗': '栖霞饮露',
  '露西': '蜃影', '洛可可': '悲喜剧',
};

// 满命权重（对应油猴脚本 FULL_CONST_WEIGHT）
const FULL_CONST_WEIGHT = { S: 1.0, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 };

// ============================================================
// 估值权重默认值（对应油猴脚本 DEFAULT_WEIGHTS）
// ============================================================
const DEFAULT_WEIGHTS = {
  // 满命溢价（加权满命数档位）
  c6TierWeights: { S: 1, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },
  c6MultiBonus: [{"count":1.5,"bonus":0.25},{"count":2,"bonus":0.5},{"count":2.5,"bonus":0.75},{"count":3,"bonus":1},{"count":3.5,"bonus":1.25},{"count":4,"bonus":1.5},{"count":4.5,"bonus":1.75},{"count":5,"bonus":2},{"count":5.5,"bonus":2.25},{"count":6,"bonus":2.5},{"count":6.5,"bonus":2.75},{"count":7,"bonus":3},{"count":7.5,"bonus":3.25},{"count":8,"bonus":3.5},{"count":8.5,"bonus":3.75},{"count":9,"bonus":4},{"count":9.5,"bonus":4.25},{"count":10,"bonus":4.5}],
  // 满命溢价公式参数（加权满命数 → 角色价值溢价系数）
  c6Base: 3,          // 基准加权满命数
  c6BaseBonus: 1.0,   // 基准溢价（100%）
  c6Step: 0.1,        // 每档满命数
  c6StepBonus: 0.05,  // 每档浮动（5%）
  // 资源定价
  outfit: 0,             // 服饰/皮肤单价
  motoFrame: 0,          // 车架模组单价
  // 满命抽数加成公式参数（加权满命数 → 抽数价值加成系数）
  pullC6Base: 5,          // 基准加权满命数
  pullC6BaseBonus: 0.5,   // 基准加成（50%）
  pullC6Step: 0.1,        // 每档满命数
  pullC6StepBonus: 0.005, // 每档浮动（0.5%）
  // 多配队额外系数
  teamMultiBonus: [
    { count: 2, coef: 1.05 },
    { count: 3, coef: 1.1 },
    { count: 4, coef: 1.15 },
    { count: 5, coef: 1.2 },
    { count: 6, coef: 1.25 },
    { count: 7, coef: 1.3 },
    { count: 8, coef: 1.35 },
    { count: 9, coef: 1.4 },
    { count: 10, coef: 1.45 },
  ],
  // 低命折扣系数规则（指定级别角色均不超过N命时，总价值打折）
  flatDiscountRules: [
    { tiers: ['S', 'A'], maxConst: 2, discount: 0.8 },
  ],
  // C6配队依赖（向后兼容配置，仅提取 teammate 字段用于 teamMates 迁移；不影响角色等级）
  c6TeamDependency: {
    '卡提希娅': { teammate: '夏空' },
    '弗洛洛': { teammate: '坎特蕾拉' },
    '露西': { teammate: '丽贝卡' },
    '绯雪': { teammate: '洛瑟菈' },
    '秧秧玄翎': { teammate: '穗穗' },
  },
  // 无专武折扣（需要专武的角色，无专武时价值 × 此值）
  needSigDiscount: 0.3,
  // 强绑角色折扣（强绑队友全不在场时，角色价值 × 此值）
  teamDepDiscount: 0.7,
  // 限定金系数上限
  yellowMaxCoeff: 3.0,
  // 限定金分段系数（null=使用单公式模式；数组=分段模式，每段独立配置基准/浮动）
  // 格式: [{ minYellow: 0, baseYellow: 0, baseCoeff: 0.30, step: 1, stepCoeff: 0.015 }, ...]
  yellowSegments: null,
  // 有效金系数（基于有效金数分段，每段独立基准系数，互不影响）
  effYellowSeg1BaseCoeff: 0.3,   // 第1段基准系数（有效金=0时的系数）
  effYellowSeg1Threshold: 10,    // 第1段边界（0~10有效金）
  effYellowSeg1Step: 0.03,       // 第1段每金浮动
  effYellowSeg2BaseCoeff: 0.4,   // 第2段基准系数（绝对，gold=0时的虚拟截距）
  effYellowSeg2Threshold: 40,    // 第2段边界（10~40有效金）
  effYellowSeg2Step: 0.02,       // 第2段每金浮动
  effYellowSeg3BaseCoeff: 0.88,  // 第3段基准系数（绝对，gold=0时的虚拟截距）
  effYellowSeg3Step: 0.008,      // 第3段（40+有效金）每金浮动
  effYellowMaxCoeff: 2.5,        // 系数上限
};

// 默认抽数阶梯定价公式参数（对应油猴脚本 DEFAULT_PULL_FORMULA）
const DEFAULT_PULL_FORMULA = {
  pullBase: 200,        // 基准抽数
  pullBasePrice: 1.0,   // 基准每抽价格（元）
  pullStepPrice: 0.002, // 每多一抽的浮动价格
};

// 默认强绑队友配置（对应油猴脚本 DEFAULT_TEAM_MATES）
const DEFAULT_TEAM_MATES = {
  '爱弥斯': ['千咲', '琳奈', '莫宁', '达妮娅'],
  '绯雪': ['洛瑟菈'],
  '秧秧玄翎': ['穗穗'],
  '卡提希娅': ['夏空'],
  '弗洛洛': ['仇远', '坎特蕾拉'],
  '洛瑟菈': ['绯雪'],
  '露西': ['丽贝卡'],
  '嘉贝莉娜': ['仇远'],
  '奥古斯塔': ['尤诺'],
  '仇远': ['嘉贝莉娜', '弗洛洛'],
  '尤诺': ['奥古斯塔', '忌炎'],
  '陆赫斯': ['琳奈'],
  '赞妮': ['菲比'],
  '布兰特': ['露帕'],
  '西格莉卡': ['仇远'],
  '露帕': ['布兰特'],
  '珂莱塔': ['折枝'],
  '菲比': ['赞妮'],
  '坎特蕾拉': ['弗洛洛', '西格莉卡'],
  '椿': ['守岸人'],
  '吟霖': ['今汐', '相里要'],
  '相里要': ['吟霖'],
};

// ============================================================
// 默认配队列表（对应油猴脚本 DEFAULT_TEAMS）
// ============================================================
const DEFAULT_TEAMS = [
  { name: '日月守', members: ['奥古斯塔', '尤诺', '守岸人'], multiplier: 1.1 },
  { name: '弗坎守', members: ['弗洛洛', '坎特蕾拉', '守岸人'], multiplier: 1.2 },
  { name: '爱达千', members: ['爱弥斯', '达妮娅', '千咲'], multiplier: 1.2 },
  { name: '卡夏千', members: ['卡提希娅', '夏空', '千咲'], multiplier: 1.2 },
  { name: '露丽守', members: ['露西', '丽贝卡', '守岸人'], multiplier: 1.1 },
  { name: '西仇守', members: ['西格莉卡', '仇远', '守岸人'], multiplier: 1.2 },
  { name: '嘉仇守', members: ['嘉贝莉娜', '仇远', '守岸人'], multiplier: 1.1 },
  { name: '爱琳莫', members: ['爱弥斯', '莫宁', '琳奈'], multiplier: 1.3 },
  { name: '三火队', members: ['布兰特', '露帕', '长离'], multiplier: 1.1 },
  { name: '赞菲守', members: ['赞妮', '菲比', '守岸人'], multiplier: 1.1 },
  { name: '绯洛穗', members: ['绯雪', '洛瑟菈', '穗穗'], multiplier: 1.4 },
  { name: '秧千穗', members: ['秧秧玄翎', '千咲', '穗穗'], multiplier: 1.4 },
];

// ============================================================
// 默认抽数阶梯定价（对应油猴脚本 DEFAULT_PULL_TIERS）
// ============================================================
const DEFAULT_PULL_TIERS = [
  { minPull: 0, maxPull: 50, perPullPrice: 0.6 },
  { minPull: 50, maxPull: 100, perPullPrice: 0.7 },
  { minPull: 100, maxPull: 150, perPullPrice: 0.8 },
  { minPull: 150, maxPull: 200, perPullPrice: 0.9 },
  { minPull: 200, maxPull: 250, perPullPrice: 1 },
  { minPull: 250, maxPull: 300, perPullPrice: 1.1 },
  { minPull: 300, maxPull: 350, perPullPrice: 1.2 },
  { minPull: 350, maxPull: 400, perPullPrice: 1.3 },
  { minPull: 400, maxPull: 450, perPullPrice: 1.4 },
  { minPull: 450, maxPull: 500, perPullPrice: 1.5 },
  { minPull: 500, maxPull: 550, perPullPrice: 1.6 },
  { minPull: 550, maxPull: 600, perPullPrice: 1.7 },
  { minPull: 600, maxPull: 650, perPullPrice: 1.8 },
  { minPull: 650, maxPull: 700, perPullPrice: 1.9 },
  { minPull: 700, maxPull: 750, perPullPrice: 2 },
  { minPull: 750, maxPull: 800, perPullPrice: 2.1 },
  { minPull: 800, maxPull: 850, perPullPrice: 2.2 },
  { minPull: 850, maxPull: 900, perPullPrice: 2.3 },
  { minPull: 900, maxPull: 950, perPullPrice: 2.4 },
  { minPull: 950, maxPull: 1000, perPullPrice: 2.5 },
  { minPull: 1000, maxPull: 1050, perPullPrice: 2.6 },
  { minPull: 1050, maxPull: 1100, perPullPrice: 2.7 },
  { minPull: 1100, maxPull: 1150, perPullPrice: 2.8 },
  { minPull: 1150, maxPull: 1200, perPullPrice: 2.9 },
  { minPull: 1200, maxPull: 1250, perPullPrice: 3.1 },
  { minPull: 1250, maxPull: 1300, perPullPrice: 3.2 },
  { minPull: 1300, maxPull: 1350, perPullPrice: 3.3 },
  { minPull: 1350, maxPull: 1400, perPullPrice: 3.4 },
  { minPull: 1400, maxPull: 1450, perPullPrice: 3.6 },
  { minPull: 1450, maxPull: 1500, perPullPrice: 3.7 },
  { minPull: 1500, maxPull: 1550, perPullPrice: 3.8 },
  { minPull: 1550, maxPull: 1600, perPullPrice: 3.9 },
  { minPull: 1600, maxPull: 9999, perPullPrice: 4.2 },
];

// ============================================================
// 默认黄数阶梯系数（对应油猴脚本 DEFAULT_YELLOW_TIERS）
// ============================================================
const DEFAULT_YELLOW_TIERS = [
  { minYellow: 0, maxYellow: 5, coefficient: 0.45 },
  { minYellow: 5, maxYellow: 10, coefficient: 0.5 },
  { minYellow: 10, maxYellow: 20, coefficient: 0.55 },
  { minYellow: 20, maxYellow: 30, coefficient: 0.65 },
  { minYellow: 30, maxYellow: 40, coefficient: 0.75 },
  { minYellow: 40, maxYellow: 50, coefficient: 0.85 },
  { minYellow: 50, maxYellow: 60, coefficient: 0.95 },
  { minYellow: 60, maxYellow: 70, coefficient: 1 },
  { minYellow: 70, maxYellow: 80, coefficient: 1.05 },
  { minYellow: 80, maxYellow: 90, coefficient: 1.1 },
  { minYellow: 90, maxYellow: 100, coefficient: 1.15 },
  { minYellow: 100, maxYellow: 110, coefficient: 1.2 },
  { minYellow: 110, maxYellow: 120, coefficient: 1.25 },
  { minYellow: 120, maxYellow: 130, coefficient: 1.3 },
  { minYellow: 130, maxYellow: 140, coefficient: 1.35 },
  { minYellow: 140, maxYellow: 150, coefficient: 1.4 },
  { minYellow: 150, maxYellow: 160, coefficient: 1.45 },
  { minYellow: 160, maxYellow: 170, coefficient: 1.5 },
  { minYellow: 170, maxYellow: 180, coefficient: 1.55 },
  { minYellow: 180, maxYellow: 190, coefficient: 1.6 },
  { minYellow: 190, maxYellow: 200, coefficient: 1.65 },
  { minYellow: 200, maxYellow: 210, coefficient: 1.69 },
  { minYellow: 210, maxYellow: 220, coefficient: 1.73 },
  { minYellow: 220, maxYellow: 230, coefficient: 1.77 },
  { minYellow: 230, maxYellow: 240, coefficient: 1.8 },
  { minYellow: 240, maxYellow: 250, coefficient: 1.83 },
  { minYellow: 250, maxYellow: 260, coefficient: 1.86 },
  { minYellow: 260, maxYellow: 270, coefficient: 1.89 },
  { minYellow: 270, maxYellow: 280, coefficient: 1.92 },
  { minYellow: 280, maxYellow: 290, coefficient: 1.95 },
  { minYellow: 290, maxYellow: 300, coefficient: 1.98 },
  { minYellow: 300, maxYellow: 999, coefficient: 2 },
];

// ============================================================
// 默认角色价格表（对应油猴脚本 DEFAULT_CHAR_PRICES，按角色名）
// ============================================================
const DEFAULT_CHAR_PRICES = {
  '爱弥斯': 45, '绯雪': 60, '卡提希娅': 35, '弗洛洛': 35,
  '琳奈': 25, '守岸人': 15, '千咲': 25, '穗穗': 35, '莫宁': 25, '秧秧玄翎': 40,
  '洛瑟菈': 25,
  '达妮娅': 15, '夏空': 15,
  '露西': 20, '嘉贝莉娜': 18, '奥古斯塔': 18, '仇远': 15, '尤诺': 15,
  '陆赫斯': 20, '赞妮': 18, '布兰特': 15, '西格莉卡': 20,
  '露帕': 10, '珂莱塔': 10, '菲比': 10, '坎特蕾拉': 10, '椿': 10,
  '忌炎': 2, '吟霖': 2, '相里要': 2, '今汐': 2, '长离': 2, '折枝': 2, '洛可可': 2,
  '丽贝卡': 2, '维里奈': 0, '卡卡罗': 0, '安可': 0, '凌阳': 0, '鉴心': 0, '秧秧': 0,
};

// ============================================================
// 默认命座溢价（对应油猴脚本 DEFAULT_CONST_PREMIUMS，按角色名）
// ============================================================
const DEFAULT_CONST_PREMIUMS = {
  '爱弥斯': { '1': 45, '2': 90, '3': 135, '4': 140, '5': 155, '6': 270 },
  '绯雪': { '1': 60, '2': 80, '3': 120, '4': 150, '5': 180, '6': 320 },
  '卡提希娅': { '1': 35, '2': 70, '3': 105, '4': 110, '5': 125, '6': 210 },
  '弗洛洛': { '1': 35, '2': 70, '3': 105, '4': 115, '5': 125, '6': 210 },
  '奥古斯塔': { '2': 20, '6': 80 },
  '尤诺': { '2': 20, '6': 60 },
  '露西': { '3': 30, '6': 80 },
  '忌炎': { '6': 30 },
  '守岸人': { '2': 20, '6': 50 },
  '赞妮': { '2': 20, '6': 60 },
  '椿': { '6': 50 },
  '莫宁': { '1': 20, '6': 80 },
  '珂莱塔': { '6': 50 },
  '秧秧玄翎': { '1': 40, '2': 80, '3': 120, '4': 130, '5': 140, '6': 240 },
  '千咲': { '2': 20, '3': 30, '6': 60 },
  '嘉贝莉娜': { '3': 30, '6': 80 },
  '陆赫斯': { '6': 100 },
  '西格莉卡': { '6': 100 },
  '丽贝卡': { '3': 20, '6': 50 },
  '仇远': { '3': 30, '6': 50 },
  '今汐': { '6': 30 },
  '吟霖': { '6': 30 },
  '坎特蕾拉': { '2': 30, '6': 50 },
  '夏空': { '2': 20, '3': 30, '6': 50 },
  '布兰特': { '6': 80 },
  '长离': { '6': 30 },
  '相里要': { '6': 30 },
  '洛可可': { '6': 30 },
  '琳奈': { '6': 80 },
  '洛瑟菈': { '6': 80 },
  '折枝': { '6': 20 },
  '菲比': { '2': 30, '6': 80 },
  '露帕': { '6': 80 },
  '达妮娅': { '2': 30, '6': 80 },
  '穗穗': { '2': 50, '6': 120 },
};

// 需要专武的角色列表（无专武时按 needSigDiscount 折扣，折扣值在权重中配置）
const DEFAULT_NEED_SIG_WEAPONS = [
  '爱弥斯', '绯雪', '秧秧玄翎', '卡提希娅', '弗洛洛', '嘉贝莉娜',
  '陆赫斯', '赞妮', '西格莉卡', '珂莱塔', '椿', '忌炎', '今汐',
];

// ============================================================
// 角色名别名（兼容卖家常见错字/异体字）
// ============================================================
const CHAR_ALIASES = {
  '爱弥丝': '爱弥斯',
};

// ============================================================
// 角色名查找表（对应油猴脚本 CHAR_LOOKUP）
// ============================================================
const CHAR_LOOKUP = {};
for (const [tier, info] of Object.entries(CHAR_TIERS)) {
  for (const name of info.chars) {
    CHAR_LOOKUP[name] = { tier, price: info.price, isHot: info.isHot };
  }
}
// 注册别名到查找表
for (const [alias, canonical] of Object.entries(CHAR_ALIASES)) {
  if (CHAR_LOOKUP[canonical]) {
    CHAR_LOOKUP[alias] = CHAR_LOOKUP[canonical];
  }
}

// ============================================================
// 已知段落关键词（对应油猴脚本 SECTION_KEYWORDS）
// ============================================================
const SECTION_KEYWORDS = [
  '五星角色', '四星角色', '五星武器', '金色武器', '地图探索度',
  '余波珊瑚', '残振珊瑚', '浮金波纹', '铸潮波纹', '唤声涡纹',
  '摩托饰品', '车架模组', '星声', '月相', '服饰', '皮肤', '摩托', '车架', '涂装',
  '数据坞等级', '联觉等级',
];

// ============================================================
// 构建默认权重对象（对应油猴脚本 loadWeights，saved 为空）
// ============================================================

// 生成默认角色价格表（从 DEFAULT_CHAR_PRICES，回退到 CHAR_TIERS）
function buildDefaultCharPrices() {
  const prices = {};
  for (const tierKey of Object.keys(CHAR_TIERS)) {
    for (const name of CHAR_TIERS[tierKey].chars) {
      prices[name] = DEFAULT_CHAR_PRICES[name] != null ? DEFAULT_CHAR_PRICES[name] : CHAR_TIERS[tierKey].price;
    }
  }
  return prices;
}

// 生成默认命座绝对定价表（从 DEFAULT_CONST_PREMIUMS + DEFAULT_CHAR_PRICES 转换）
// 格式: { 角色名: { '1': c1绝对价, '2': c2绝对价, ..., '6': c6绝对价 } }
// C0价格 = charPrices[角色名]，不在constPrices中存储
function buildDefaultConstPrices() {
  var result = {};
  var basePrices = buildDefaultCharPrices();
  for (var charName in DEFAULT_CONST_PREMIUMS) {
    if (!DEFAULT_CONST_PREMIUMS.hasOwnProperty(charName)) continue;
    var base = basePrices[charName] != null ? basePrices[charName] : 0;
    var premiums = DEFAULT_CONST_PREMIUMS[charName];
    var prices = {};
    for (var c = 1; c <= 6; c++) {
      var maxPrem = 0;
      for (var bp in premiums) {
        if (!premiums.hasOwnProperty(bp)) continue;
        var breakpoint = parseInt(bp);
        if (!isNaN(breakpoint) && breakpoint <= c) {
          var prem = premiums[bp] || 0;
          if (prem > maxPrem) maxPrem = prem;
        }
      }
      prices[c] = base + maxPrem;
    }
    result[charName] = prices;
  }
  return result;
}

// 从旧的constPremiums格式转换为constPrices格式
function convertPremiumsToConstPrices(charName, basePrice, premiums) {
  var prices = {};
  for (var c = 1; c <= 6; c++) {
    var maxPrem = 0;
    for (var bp in premiums) {
      if (!premiums.hasOwnProperty(bp)) continue;
      var breakpoint = parseInt(bp);
      if (!isNaN(breakpoint) && breakpoint <= c) {
        var prem = premiums[bp] || 0;
        if (prem > maxPrem) maxPrem = prem;
      }
    }
    prices[c] = basePrice + maxPrem;
  }
  return prices;
}

// 生成默认配队溢价表（对象格式，从 DEFAULT_TEAMS 转换）
function buildDefaultTeamPremiums() {
  const result = {};
  for (const team of DEFAULT_TEAMS) {
    result[team.name] = {
      chars: [...(team.members || [])],
      multiplier: team.multiplier || 1.0,
      enabled: true,
    };
  }
  return result;
}

// 构建默认权重（合并所有默认配置，等价于油猴脚本 loadWeights() 无用户配置时的结果）
function buildDefaultWeights(customWeights) {
  const saved = customWeights || {};
  const w = Object.assign({}, DEFAULT_WEIGHTS, saved);
  w.c6TierWeights = Object.assign({}, DEFAULT_WEIGHTS.c6TierWeights, saved.c6TierWeights || {});
  w.c6MultiBonus = (saved.c6MultiBonus && saved.c6MultiBonus.length) ? saved.c6MultiBonus : DEFAULT_WEIGHTS.c6MultiBonus;
  // 满命溢价公式参数
  w.c6Base = (saved.c6Base != null) ? saved.c6Base : DEFAULT_WEIGHTS.c6Base;
  w.c6BaseBonus = (saved.c6BaseBonus != null) ? saved.c6BaseBonus : DEFAULT_WEIGHTS.c6BaseBonus;
  w.c6Step = (saved.c6Step != null) ? saved.c6Step : DEFAULT_WEIGHTS.c6Step;
  w.c6StepBonus = (saved.c6StepBonus != null) ? saved.c6StepBonus : DEFAULT_WEIGHTS.c6StepBonus;
  // 满命抽数加成公式参数
  w.pullC6Base = (saved.pullC6Base != null) ? saved.pullC6Base : DEFAULT_WEIGHTS.pullC6Base;
  w.pullC6BaseBonus = (saved.pullC6BaseBonus != null) ? saved.pullC6BaseBonus : DEFAULT_WEIGHTS.pullC6BaseBonus;
  w.pullC6Step = (saved.pullC6Step != null) ? saved.pullC6Step : DEFAULT_WEIGHTS.pullC6Step;
  w.pullC6StepBonus = (saved.pullC6StepBonus != null) ? saved.pullC6StepBonus : DEFAULT_WEIGHTS.pullC6StepBonus;
  w.teamMultiBonus = (saved.teamMultiBonus && saved.teamMultiBonus.length) ? saved.teamMultiBonus : DEFAULT_WEIGHTS.teamMultiBonus;
  w.flatDiscountRules = (saved.flatDiscountRules && saved.flatDiscountRules.length) ? saved.flatDiscountRules : DEFAULT_WEIGHTS.flatDiscountRules;
  w.c6TeamDependency = saved.c6TeamDependency || DEFAULT_WEIGHTS.c6TeamDependency;
  // 抽数阶梯定价公式参数
  w.pullBase = (saved.pullBase != null) ? saved.pullBase : DEFAULT_PULL_FORMULA.pullBase;
  w.pullBasePrice = (saved.pullBasePrice != null) ? saved.pullBasePrice : DEFAULT_PULL_FORMULA.pullBasePrice;
  w.pullStepPrice = (saved.pullStepPrice != null) ? saved.pullStepPrice : DEFAULT_PULL_FORMULA.pullStepPrice;
  // 限定金系数公式参数
  w.yellowBase = (saved.yellowBase != null) ? saved.yellowBase : 40;
  w.yellowStep = (saved.yellowStep != null) ? saved.yellowStep : 1;
  w.yellowBaseCoeff = (saved.yellowBaseCoeff != null) ? saved.yellowBaseCoeff : 1.0;
  w.yellowStepCoeff = (saved.yellowStepCoeff != null) ? saved.yellowStepCoeff : 0.01;
  w.yellowMaxCoeff = (saved.yellowMaxCoeff != null) ? saved.yellowMaxCoeff : DEFAULT_WEIGHTS.yellowMaxCoeff;
  // 有效金系数参数（每段独立基准系数，互不影响）
  w.effYellowSeg1Threshold = (saved.effYellowSeg1Threshold != null) ? saved.effYellowSeg1Threshold : DEFAULT_WEIGHTS.effYellowSeg1Threshold;
  w.effYellowSeg1Step = (saved.effYellowSeg1Step != null) ? saved.effYellowSeg1Step : DEFAULT_WEIGHTS.effYellowSeg1Step;
  w.effYellowSeg2Threshold = (saved.effYellowSeg2Threshold != null) ? saved.effYellowSeg2Threshold : DEFAULT_WEIGHTS.effYellowSeg2Threshold;
  w.effYellowSeg2Step = (saved.effYellowSeg2Step != null) ? saved.effYellowSeg2Step : DEFAULT_WEIGHTS.effYellowSeg2Step;
  w.effYellowSeg3Step = (saved.effYellowSeg3Step != null) ? saved.effYellowSeg3Step : DEFAULT_WEIGHTS.effYellowSeg3Step;
  w.effYellowMaxCoeff = (saved.effYellowMaxCoeff != null) ? saved.effYellowMaxCoeff : DEFAULT_WEIGHTS.effYellowMaxCoeff;
  // 向后兼容：旧配置只有effYellowBaseCoeff，自动计算各段基准系数
  if (saved.effYellowSeg1BaseCoeff != null) {
    w.effYellowSeg1BaseCoeff = saved.effYellowSeg1BaseCoeff;
  } else if (saved.effYellowBaseCoeff != null) {
    w.effYellowSeg1BaseCoeff = saved.effYellowBaseCoeff;
  } else {
    w.effYellowSeg1BaseCoeff = DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff;
  }
  if (saved.effYellowSeg2BaseCoeff != null) {
    w.effYellowSeg2BaseCoeff = saved.effYellowSeg2BaseCoeff;
  } else {
    // 旧累积式→新绝对式：seg2Base(新) = oldBase + T1*(step1-step2)
    var _oldBase = (saved.effYellowBaseCoeff != null) ? saved.effYellowBaseCoeff : DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff;
    w.effYellowSeg2BaseCoeff = _oldBase + w.effYellowSeg1Threshold * (w.effYellowSeg1Step - w.effYellowSeg2Step);
  }
  if (saved.effYellowSeg3BaseCoeff != null) {
    w.effYellowSeg3BaseCoeff = saved.effYellowSeg3BaseCoeff;
  } else {
    // 旧累积式→新绝对式：seg3Base(新) = (oldBase + T1*step1 + (T2-T1)*step2) - T2*step3
    var _oldBase = (saved.effYellowBaseCoeff != null) ? saved.effYellowBaseCoeff : DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff;
    var _seg2Val = _oldBase + w.effYellowSeg1Threshold * w.effYellowSeg1Step;
    var _seg3Val = _seg2Val + (w.effYellowSeg2Threshold - w.effYellowSeg1Threshold) * w.effYellowSeg2Step;
    w.effYellowSeg3BaseCoeff = _seg3Val - w.effYellowSeg2Threshold * w.effYellowSeg3Step;
  }
  w.charPrices = Object.assign({}, buildDefaultCharPrices(), saved.charPrices || {});
  // 数据迁移：旧的'秧秧'是五星角色，现已改名为'秧秧玄翎'，四星'秧秧'价格应为0
  if (saved.charPrices && saved.charPrices['秧秧'] != null && saved.charPrices['秧秧'] > 0) {
    w.charPrices['秧秧'] = 0;
  }
  w.constPremiums = Object.assign({}, DEFAULT_CONST_PREMIUMS, saved.constPremiums || {});
  // 命座绝对定价表：优先使用用户保存的constPrices，否则从constPremiums转换
  var _defaultConstPrices = buildDefaultConstPrices();
  if (saved.constPrices) {
    w.constPrices = Object.assign({}, _defaultConstPrices, saved.constPrices);
  } else {
    // 从旧constPremiums格式转换
    w.constPrices = Object.assign({}, _defaultConstPrices);
    var _oldPremiums = Object.assign({}, DEFAULT_CONST_PREMIUMS, saved.constPremiums || {});
    for (var _cpName in _oldPremiums) {
      if (!_oldPremiums.hasOwnProperty(_cpName)) continue;
      var _cpBase = w.charPrices[_cpName] != null ? w.charPrices[_cpName] : (DEFAULT_CHAR_PRICES[_cpName] || 0);
      w.constPrices[_cpName] = convertPremiumsToConstPrices(_cpName, _cpBase, _oldPremiums[_cpName]);
    }
  }
  w.teamPremiums = (saved.teamPremiums && Object.keys(saved.teamPremiums).length > 0) ? saved.teamPremiums : buildDefaultTeamPremiums();
  w.teams = [];
  for (const teamName of Object.keys(w.teamPremiums)) {
    const t = w.teamPremiums[teamName];
    if (t && t.enabled !== false) {
      w.teams.push({ name: teamName, members: t.chars || [], multiplier: t.multiplier || 1.0 });
    }
  }
  // 需要专武的角色列表（兼容旧格式，统一为名字数组）
  var rawNeedSig = (saved.needSigWeapons && saved.needSigWeapons.length > 0) ? saved.needSigWeapons : DEFAULT_NEED_SIG_WEAPONS;
  w.needSigWeapons = rawNeedSig.map(function(n) { return typeof n === 'string' ? n : n.name; });
  // 无专武折扣（可配置）
  w.needSigDiscount = (saved.needSigDiscount != null) ? saved.needSigDiscount : DEFAULT_WEIGHTS.needSigDiscount;
  // 强绑队友配置
  w.teamMates = (saved.teamMates && Object.keys(saved.teamMates).length > 0) ? saved.teamMates : DEFAULT_TEAM_MATES;
  // 强绑折扣（可配置）
  w.teamDepDiscount = (saved.teamDepDiscount != null) ? saved.teamDepDiscount : DEFAULT_WEIGHTS.teamDepDiscount;
  // 用户自定义专武映射覆盖
  if (saved.sigWeaponsOverride) {
    w.sigWeaponsOverride = saved.sigWeaponsOverride;
  }
  // 用户已删除的角色列表
  w.deletedChars = saved.deletedChars || [];
  // 用户自定义角色级别覆盖
  w.charTierOverride = saved.charTierOverride || {};
  for (const ctoName in w.charTierOverride) {
    if (CHAR_LOOKUP[ctoName]) {
      const ctoTier = w.charTierOverride[ctoName];
      CHAR_LOOKUP[ctoName].tier = ctoTier;
      CHAR_LOOKUP[ctoName].isHot = ctoTier === 'S' || ctoTier === 'A' || ctoTier === 'B';
    }
  }
  return w;
}

// 权重标签定义（供设置面板显示用，对应油猴脚本 WEIGHT_LABELS）
const WEIGHT_LABELS = {
  outfit: { label: '服饰/皮肤', desc: '每个服饰/皮肤（元）' },
  motoFrame: { label: '车架模组', desc: '每个车架模组（元）' },
  needSigDiscount: { label: '无专武折扣', desc: '需要专武的角色无专武时，价值×此值（0.3=30%）' },
  teamDepDiscount: { label: '强绑折扣', desc: '强绑队友全不在场时，角色价值×此值（0.7=70%）' },
};

/**
 * 获取默认权重配置（供前端 /api/defaults 接口使用）
 * 返回完整默认权重 + 角色级别表 + 命座溢价 + 配队列表
 */
function getDefaults() {
  return {
    configVersion: CONFIG_VERSION,
    weights: buildDefaultWeights(),
    charTiers: CHAR_TIERS,
    sigWeapons: SIG_WEAPONS,
    constPremiums: DEFAULT_CONST_PREMIUMS,
    constPrices: buildDefaultConstPrices(),
    teams: DEFAULT_TEAMS,
    pullFormula: DEFAULT_PULL_FORMULA,
    teamMates: DEFAULT_TEAM_MATES,
    charPrices: buildDefaultCharPrices(),
    needSigWeapons: DEFAULT_NEED_SIG_WEAPONS,
    weightLabels: WEIGHT_LABELS,
  };
}

// 全局权重（等价于油猴脚本中的 weights 全局变量）
let weights = buildDefaultWeights();
// 用户自定义专武映射覆盖（运行时由 evaluateWithPrice 设置）
let _sigWeaponsOverride = null;

// ============================================================
// 文本解析辅助函数（对应油猴脚本 extractSection 等）
// ============================================================

/**
 * 提取文本中某个关键词后的段落内容
 */
function extractSection(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const others = SECTION_KEYWORDS.filter(k => k !== keyword)
    .map(k => '【?' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[（(]\\d+[）)])?(?:[：:]|\\s*\\n|】)');

  // 格式1: keyword：content（原格式，冒号后同行内容）
  const pattern1 = escaped + '[：:]\\s*([\\s\\S]*?)(?=' + others.join('|') + '|$)';
  const match1 = text.match(new RegExp(pattern1));
  if (match1) return match1[1].trim();

  // 格式2: keyword（N）[：:][\n] content（螃蟹网手机端格式，带数量括号）
  const pattern2 = escaped + '[（(]\\d+[）)]\\s*[：:]?\\s*\\n?\\s*([\\s\\S]*?)(?=' + others.join('|') + '|$)';
  const match2 = text.match(new RegExp(pattern2));
  if (match2) return match2[1].trim();

  // 格式3: 【keyword】[：:]content（盼之手机端格式，方括号包裹关键词）
  const pattern3 = '【' + escaped + '】\\s*[：:]?\\s*([\\s\\S]*?)(?=' + others.join('|') + '|$)';
  const match3 = text.match(new RegExp(pattern3));
  if (match3) return match3[1].trim();

  return '';
}

/**
 * 从文本中提取数字（关键词: 数字）
 */
function extractNumber(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 格式1: keyword：数字
  const match1 = text.match(new RegExp(escaped + '[：:]\\s*(\\d[\\d,]*)', 'i'));
  if (match1) return parseInt(match1[1].replace(/,/g, ''));
  // 格式2: 【keyword】：数字（盼之格式）
  const match2 = text.match(new RegExp('【' + escaped + '】\\s*[：:]?\\s*(\\d[\\d,]*)', 'i'));
  if (match2) return parseInt(match2[1].replace(/,/g, ''));
  // 格式3: keyword数量：数字（7881格式，如"星声数量:15533"）
  const match3 = text.match(new RegExp(escaped + '数量[：:]\\s*(\\d[\\d,]*)', 'i'));
  if (match3) return parseInt(match3[1].replace(/,/g, ''));
  return 0;
}

/**
 * 解析五星角色段落
 */
function parseCharacters(section) {
  const chars = [];
  if (!section) return chars;

  const items = section.split(/[,，、\s;；]+/).map(s => s.replace(/[】\s]+$/, '').trim()).filter(s => s.length > 0 && !/^\d+个$/.test(s));

  for (const item of items) {
    let constNum = 0;
    let name = '';

    // 尝试 "满命XXX"
    let m = item.match(/^满命(.+)$/);
    if (m) {
      constNum = 6;
      name = m[1];
    } else {
      // 尝试 "N命XXX"
      m = item.match(/^(\d+)命(.+)$/);
      if (m) {
        constNum = parseInt(m[1]);
        name = m[2];
      } else {
        // 尝试 "XXX(满命)"
        m = item.match(/^(.+?)\(满命\)$/);
        if (m) {
          name = m[1];
          constNum = 6;
        } else {
          // 尝试 "XXX(N命)"
          m = item.match(/^(.+?)\((\d+)命\)$/);
          if (m) {
            name = m[1];
            constNum = parseInt(m[2]);
          } else {
            // 仅名称
            name = item;
            constNum = 0;
          }
        }
      }
    }

    // 验证是否为已知角色（别名归一化）
    const canonicalName = CHAR_ALIASES[name] || name;
    const info = CHAR_LOOKUP[canonicalName];
    if (info) {
      chars.push({
        name: canonicalName,
        const: constNum,
        tier: info.tier,
        price: info.price,
        isHot: info.isHot,
      });
    }
  }

  // 同名角色去重：保留命座最高的
  const charMap = {};
  for (const c of chars) {
    if (!charMap[c.name] || c.const > charMap[c.name].const) {
      charMap[c.name] = c;
    }
  }
  return Object.values(charMap);
}

/**
 * 从完整文本中查找角色（无明确段落时的回退方案）
 */
function findCharsInText(text) {
  const chars = [];
  for (const [tier, info] of Object.entries(CHAR_TIERS)) {
    for (const name of info.chars) {
      // 检查正名和所有别名
      const namesToCheck = [name];
      for (const [alias, canonical] of Object.entries(CHAR_ALIASES)) {
        if (canonical === name) namesToCheck.push(alias);
      }
      let found = false;
      for (const checkName of namesToCheck) {
        // "满命" + name
        if (text.includes('满命' + checkName)) {
          chars.push({ name, const: 6, tier, price: info.price, isHot: info.isHot });
          found = true; break;
        }
        // "N命" + name
        const m = text.match(new RegExp('(\\d+)命' + checkName));
        if (m) {
          chars.push({ name, const: parseInt(m[1]), tier, price: info.price, isHot: info.isHot });
          found = true; break;
        }
        // name + "(满命)"
        if (text.includes(checkName + '(满命)')) {
          chars.push({ name, const: 6, tier, price: info.price, isHot: info.isHot });
          found = true; break;
        }
        // name + "(N命)"
        const m2 = text.match(new RegExp(checkName + '\\((\\d+)命\\)'));
        if (m2) {
          chars.push({ name, const: parseInt(m2[1]), tier, price: info.price, isHot: info.isHot });
          found = true; break;
        }
        // 仅出现名字
        if (text.includes(checkName)) {
          chars.push({ name, const: 0, tier, price: info.price, isHot: info.isHot });
          found = true; break;
        }
      }
    }
  }
  // 去重
  const charMap = {};
  for (const c of chars) {
    if (!charMap[c.name] || c.const > charMap[c.name].const) {
      charMap[c.name] = c;
    }
  }
  return Object.values(charMap);
}

/**
 * 解析五星武器段落
 */
function parseWeapons(section) {
  const weapons = [];
  if (!section) return weapons;
  const items = section.split(/[,，、\s;；]+/).filter(s => s.length > 0);
  for (const item of items) {
    let refine = 1;
    let name = '';
    const m = item.match(/^精(\d+)(.+)$/);
    if (m) {
      refine = parseInt(m[1]);
      name = m[2];
    } else {
      name = item;
      refine = 1;
    }
    if (name) weapons.push({ name, refine });
  }
  return weapons;
}

/**
 * 提取黄数
 */
function extractYellowCount(text) {
  // "黄数：N" 或 "黄：N"（优先匹配，避免"等级:80 黄数:40"中80被误匹配）
  let m = text.match(/黄[数]?[：:]\s*(\d+)/);
  if (m) return parseInt(m[1]);
  // "【黄数】:N" 或 "【黄数】：N"（盼之格式）
  m = text.match(/【黄[数]?】\s*[：:]?\s*(\d+)/);
  if (m) return parseInt(m[1]);
  // "N黄" 或 "N黄数"（放最后，避免误匹配前一个字段的数字）
  m = text.match(/(\d+)\s*黄/);
  if (m) return parseInt(m[1]);
  return 0;
}

/**
 * 提取列表段落的条目数量
 */
function extractListCount(text, keyword) {
  const section = extractSection(text, keyword);
  if (!section) return 0;
  const items = section.split(/[,，、\s]+/).filter(s => s.length > 0);
  return items.length;
}

/**
 * 判断条目是否为账号描述里的无关文字（非真实物品名）
 * 用于过滤服饰/摩托/车架/涂装段落里混入的交易描述、联系方式等
 */
function isDescriptiveJunk(s) {
  if (!s) return true;
  // 含【】括号描述（如"详情看图【官服】【官方截图】"）
  if (/【.+?】/.test(s)) return true;
  // 含账号交易常见描述词
  if (/(详情|看图|官服|截图|私聊|联系|微信|加微|加v|\+v|qq|议价|包赔|回收|代售|租号|出售|买号|诚收|甩卖|清仓|特价|秒杀|送号|免费|包邮|担保|验号|包过)/i.test(s)) return true;
  return false;
}

/**
 * 从文本中提取某个关键词段落的条目列表（用于服饰/摩托/车架/涂装明细）
 */
function extractListItems(text, keyword) {
  const section = extractSection(text, keyword);
  if (!section) return [];
  return section.split(/[,，、\s]+/).filter(s => s.length > 0).filter(s => !isDescriptiveJunk(s));
}

// ============================================================
// 解析账号描述信息（对应油猴脚本 parseAccountInfo）
// ============================================================
function parseAccountInfo(text) {
  const result = {
    characters: [],
    weapons: [],
    starSound: 0,
    moonPhase: 0,
    aftermathCoral: 0,
    floatGoldRipple: 0,
    castTideRipple: 0,
    yellowCount: 0,
    outfitCount: 0,
    motoCount: 0,
    vehicleFrameCount: 0,
    paintCount: 0,
    pulls: 0,
    rawText: text || '',
  };

  if (!text) return result;

  // 提取五星角色
  const charSection = extractSection(text, '五星角色');
  if (charSection) {
    result.characters = parseCharacters(charSection);
  }
  // 回退：直接在全文中查找角色
  if (result.characters.length === 0) {
    result.characters = findCharsInText(text);
  }

  // 提取五星武器
  let weaponSection = extractSection(text, '五星武器');
  if (weaponSection) {
    result.weapons = parseWeapons(weaponSection);
  }
  // 回退1：螃蟹网手机端格式只有"武器（N）"标题
  if (result.weapons.length === 0) {
    weaponSection = extractSection(text, '武器');
    if (weaponSection) {
      result.weapons = parseWeapons(weaponSection);
    }
  }
  // 回退2：盼之手机端格式用"金色武器"
  if (result.weapons.length === 0) {
    weaponSection = extractSection(text, '金色武器');
    if (weaponSection) {
      result.weapons = parseWeapons(weaponSection);
    }
  }

  // 提取资源数量
  result.starSound = extractNumber(text, '星声');
  result.moonPhase = extractNumber(text, '月相');
  result.aftermathCoral = extractNumber(text, '余波珊瑚');
  result.floatGoldRipple = extractNumber(text, '浮金波纹');
  result.castTideRipple = extractNumber(text, '铸潮波纹');

  // 提取黄数
  result.yellowCount = extractYellowCount(text);

  // 提取服饰、摩托、车架、涂装数量
  result.outfitCount = extractListCount(text, '服饰');
  // 回退：盼之格式用"皮肤"
  if (result.outfitCount === 0) {
    const skinSection = extractSection(text, '皮肤');
    if (skinSection) {
      const skinNum = parseInt(skinSection);
      result.outfitCount = isNaN(skinNum) ? extractListCount(text, '皮肤') : skinNum;
    }
  }
  // 摩托只算车架模组（摩托饰品不算摩托），检查所有可能的段落标题
  result.motoCount = extractListCount(text, '车架模组') + extractListCount(text, '车架') + extractListCount(text, '摩托');
  // 摩托饰品单独计数（不算摩托）
  result.motoAccessoryCount = extractListCount(text, '摩托饰品');
  result.vehicleFrameCount = extractListCount(text, '车架模组') + extractListCount(text, '车架');
  result.paintCount = extractListCount(text, '涂装');

  // 计算总抽数
  result.pulls = result.starSound / 160 + result.moonPhase / 160 +
    result.aftermathCoral / 8 + result.floatGoldRipple + result.castTideRipple;

  return result;
}

// ============================================================
// 估值计算辅助函数（对应油猴脚本 checkHasSigWeapon 等）
// ============================================================

/**
 * 检查角色是否有专武
 */
function checkHasSigWeapon(charName, weaponNames, weaponSectionText) {
  const sigName = _sigWeaponsOverride ? (_sigWeaponsOverride[charName] || SIG_WEAPONS[charName]) : SIG_WEAPONS[charName];
  if (!sigName) return false;
  // 先检查武器列表
  if (weaponNames && weaponNames.some(w => w === sigName || w.includes(sigName) || sigName.includes(w))) {
    return true;
  }
  // 再检查武器段落文本
  if (weaponSectionText && weaponSectionText.includes(sigName)) {
    return true;
  }
  // 最后检查全文
  return false;
}

/**
 * 计算角色命座溢价（绝对定价模式：从constPrices查找对应命座的绝对价格，减去基础价得到溢价）
 * 优先使用constPrices（绝对定价），无则回退到旧constPremiums格式
 */
function calcConstPremium(charName, constCount, w) {
  w = w || weights || DEFAULT_WEIGHTS;
  
  // 新模式：使用constPrices（绝对定价）
  var constPrices = w.constPrices;
  if (constPrices && constPrices[charName] && constCount > 0) {
    var charPrices = w.charPrices || {};
    var base = charPrices[charName] != null ? charPrices[charName] : 0;
    var charCP = constPrices[charName];
    var maxLevel = 0;
    for (var bp in charCP) {
      if (!charCP.hasOwnProperty(bp)) continue;
      var level = parseInt(bp);
      if (!isNaN(level) && level <= constCount && level > maxLevel) {
        maxLevel = level;
      }
    }
    if (maxLevel > 0) {
      var constPrice = charCP[maxLevel] != null ? charCP[maxLevel] : base;
      return constPrice - base;
    }
    return 0;
  }
  
  // 兼容旧模式：constPremiums
  var premiums = w.constPremiums || {};
  var charPrem = premiums[charName];
  if (!charPrem || constCount <= 0) return 0;
  var maxPrem = 0;
  for (var bp2 in charPrem) {
    if (!charPrem.hasOwnProperty(bp2)) continue;
    var breakpoint2 = parseInt(bp2);
    if (!isNaN(breakpoint2) && constCount >= breakpoint2) {
      var prem = charPrem[bp2] || 0;
      if (prem > maxPrem) maxPrem = prem;
    }
  }
  return maxPrem;
}

/**
 * 计算单个角色价值（从 weights 读取参数）
 * 纯基础价模式：命座价值由 constPremiums 字段控制
 */
function getCharValue(char, hasSigWeapon, w) {
  w = w || weights || DEFAULT_WEIGHTS;
  // 基础价优先用按角色名的价格表，否则用级别默认价
  const charPrices = w.charPrices || {};
  const base = charPrices[char.name] != null ? charPrices[char.name] : char.price;

  // 检查是否在"需要专武"列表中（可配置折扣 needSigDiscount）
  var needSigList = w.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
  var _nsDiscount = w.needSigDiscount != null ? w.needSigDiscount : DEFAULT_WEIGHTS.needSigDiscount;
  for (var ni = 0; ni < needSigList.length; ni++) {
    var entry = needSigList[ni];
    var entryName = typeof entry === 'string' ? entry : entry.name;
    if (entryName === char.name) {
      if (!hasSigWeapon) {
        return base * _nsDiscount;
      }
      break;
    }
  }

  // 纯基础价，命座价值由 per-character 溢价控制
  return base;
}

/**
 * 计算抽数价值（公式：每抽价格 = 基准价格 + (抽数 - 基准抽数) × 每抽浮动）
 */
function calculatePullValue(pulls) {
  var base = (weights && weights.pullBase != null) ? weights.pullBase : DEFAULT_PULL_FORMULA.pullBase;
  var basePrice = (weights && weights.pullBasePrice != null) ? weights.pullBasePrice : DEFAULT_PULL_FORMULA.pullBasePrice;
  var stepPrice = (weights && weights.pullStepPrice != null) ? weights.pullStepPrice : DEFAULT_PULL_FORMULA.pullStepPrice;

  var perPull = basePrice + (pulls - base) * stepPrice;
  if (perPull < 0) perPull = 0;

  var value = pulls * perPull;
  var tierLabel = pulls + '抽';

  return {
    pulls: Math.round(pulls),
    perPull: Math.round(perPull * 1000) / 1000,
    tierLabel: tierLabel,
    total: Math.round(value),
  };
}

/**
 * 计算限定金系数（公式：baseCoeff + floor((yellowCount - base) / step) * stepCoeff）
 */
function getYellowCoeff(yellowCount) {
  var maxCoeff = (weights && weights.yellowMaxCoeff != null) ? weights.yellowMaxCoeff : DEFAULT_WEIGHTS.yellowMaxCoeff;

  // ===== 分段模式 =====
  var segments = (weights && weights.yellowSegments && weights.yellowSegments.length > 0) ? weights.yellowSegments : null;
  if (segments && segments.length > 0) {
    // 找到 yellowCount 所属的分段（segments 按 minYellow 升序排列）
    var seg = segments[0];
    for (var si = 0; si < segments.length; si++) {
      if (yellowCount >= segments[si].minYellow) {
        seg = segments[si];
      } else {
        break;
      }
    }
    var segBase = (seg.baseYellow != null) ? seg.baseYellow : seg.minYellow;
    var segStep = (seg.step != null) ? seg.step : 1;
    var segBaseCoeff = (seg.baseCoeff != null) ? seg.baseCoeff : 1.0;
    var segStepCoeff = (seg.stepCoeff != null) ? seg.stepCoeff : 0.01;

    var segTierIndex = Math.floor((yellowCount - segBase) / segStep);
    var segCoeff = segBaseCoeff + segTierIndex * segStepCoeff;
    if (segCoeff < 0.1) segCoeff = 0.1;
    if (maxCoeff > 0 && segCoeff > maxCoeff) segCoeff = maxCoeff;

    var segTierStart = segBase + segTierIndex * segStep;
    var segTierEnd = segTierStart + segStep;
    var segTierLabel = segTierStart + '~' + segTierEnd + '限定';

    return {
      yellowCount: yellowCount,
      coefficient: Math.round(segCoeff * 1000) / 1000,
      tierLabel: segTierLabel,
    };
  }

  // ===== 单公式模式（向后兼容） =====
  var base = (weights && weights.yellowBase != null) ? weights.yellowBase : 40;
  var step = (weights && weights.yellowStep != null) ? weights.yellowStep : 1;
  var baseCoeff = (weights && weights.yellowBaseCoeff != null) ? weights.yellowBaseCoeff : 1.0;
  var stepCoeff = (weights && weights.yellowStepCoeff != null) ? weights.yellowStepCoeff : 0.01;

  var tierIndex = Math.floor((yellowCount - base) / step);
  var coefficient = baseCoeff + tierIndex * stepCoeff;
  if (coefficient < 0.1) coefficient = 0.1;
  if (maxCoeff > 0 && coefficient > maxCoeff) coefficient = maxCoeff;

  var tierStart = base + tierIndex * step;
  var tierEnd = tierStart + step;
  var tierLabel = tierStart + '~' + tierEnd + '限定';

  return {
    yellowCount: yellowCount,
    coefficient: Math.round(coefficient * 1000) / 1000,
    tierLabel: tierLabel,
  };
}

/**
 * 计算有效金系数（基于有效金数分段，每段完全独立）
 * 每段用绝对gold线性公式：coeff = segBase + gold × segStep
 * threshold仅用于判断分段归属，不参与计算
 * 调整任意段的base/step/threshold不影响其他段的计算结果
 */
function getEffectiveYellowCoeff(effectiveYellow) {
  var w = weights || DEFAULT_WEIGHTS;
  var seg1Base = (w.effYellowSeg1BaseCoeff != null) ? w.effYellowSeg1BaseCoeff : 0.3;
  var seg1Threshold = (w.effYellowSeg1Threshold != null) ? w.effYellowSeg1Threshold : 10;
  var seg1Step = (w.effYellowSeg1Step != null) ? w.effYellowSeg1Step : 0.03;
  var seg2Base = (w.effYellowSeg2BaseCoeff != null) ? w.effYellowSeg2BaseCoeff : 0.4;
  var seg2Threshold = (w.effYellowSeg2Threshold != null) ? w.effYellowSeg2Threshold : 40;
  var seg2Step = (w.effYellowSeg2Step != null) ? w.effYellowSeg2Step : 0.02;
  var seg3Base = (w.effYellowSeg3BaseCoeff != null) ? w.effYellowSeg3BaseCoeff : 0.88;
  var seg3Step = (w.effYellowSeg3Step != null) ? w.effYellowSeg3Step : 0.008;
  var maxCoeff = (w.effYellowMaxCoeff != null) ? w.effYellowMaxCoeff : 2.5;

  var coeff;
  var segIdx;
  var segLabel;

  if (effectiveYellow <= seg1Threshold) {
    coeff = seg1Base + effectiveYellow * seg1Step;
    segIdx = 0;
    segLabel = '0~' + seg1Threshold + '有效金';
  } else if (effectiveYellow <= seg2Threshold) {
    coeff = seg2Base + effectiveYellow * seg2Step;
    segIdx = 1;
    segLabel = seg1Threshold + '~' + seg2Threshold + '有效金';
  } else {
    coeff = seg3Base + effectiveYellow * seg3Step;
    segIdx = 2;
    segLabel = seg2Threshold + '+有效金';
  }

  if (maxCoeff > 0 && coeff > maxCoeff) coeff = maxCoeff;
  if (coeff < 0.1) coeff = 0.1;

  return {
    yellowCount: effectiveYellow,
    coefficient: Math.round(coeff * 1000) / 1000,
    tierLabel: segLabel,
    segIdx: segIdx,
  };
}

// ============================================================
// 完整估值计算（对应油猴脚本 calculateValue）
// ============================================================
function calculateValue(parsed, price) {
  const w = weights || DEFAULT_WEIGHTS;
  const weaponNames = parsed.weapons.map(wp => wp.name);
  const weaponSectionText = parsed.rawText || '';

  // 满命权重（提前定义，供角色循环中使用）
  const c6Weights = w.c6TierWeights || FULL_CONST_WEIGHT;

  // 1. 角色价值（构建 charBreakdown / charDetails / hasSignatureWeapons）
  let charValue = 0;
  let weightedFullConst = 0;
  const charBreakdown = [];
  const charDetails = [];
  const hasSignatureWeapons = [];
  const sigDiscountNotes = [];
  var _needSigList = w.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
  var _nsDiscount = w.needSigDiscount != null ? w.needSigDiscount : DEFAULT_WEIGHTS.needSigDiscount;

  for (const char of parsed.characters) {
    const hasSig = checkHasSigWeapon(char.name, weaponNames, weaponSectionText);
    const val = getCharValue(char, hasSig, w);
    const premium = calcConstPremium(char.name, char.const, w);
    charValue += val + premium;
    if (hasSig && !hasSignatureWeapons.includes(char.name)) hasSignatureWeapons.push(char.name);

    // 检查是否触发了无专武折扣
    if (!hasSig) {
      var _isNeedSig = false;
      for (var nsi = 0; nsi < _needSigList.length; nsi++) {
        var _nsName = typeof _needSigList[nsi] === 'string' ? _needSigList[nsi] : _needSigList[nsi].name;
        if (_nsName === char.name) { _isNeedSig = true; break; }
      }
      if (_isNeedSig) {
        var _origVal = Math.round((val + premium) / _nsDiscount);
        var _discountAmount = _origVal - Math.round(val + premium);
        sigDiscountNotes.push(char.name + '无专武(×' + _nsDiscount + ', -' + _discountAmount + '元)');
      }
    }

    let fullConstWeightVal = 0;
    if (char.const >= 6) {
      fullConstWeightVal = c6Weights[char.tier] != null ? c6Weights[char.tier] : (FULL_CONST_WEIGHT[char.tier] || 0);
      weightedFullConst += fullConstWeightVal;
    }

    let sigRefine = 0;
    if (hasSig) {
      const sigName = _sigWeaponsOverride ? (_sigWeaponsOverride[char.name] || SIG_WEAPONS[char.name]) : SIG_WEAPONS[char.name];
      if (sigName) {
        const sigWeapon = parsed.weapons.find(function (wp) {
          return wp.name === sigName || wp.name.includes(sigName) || sigName.includes(wp.name);
        });
        if (sigWeapon) sigRefine = sigWeapon.refine || 1;
      }
    }

    charBreakdown.push({
      name: char.name,
      const: char.const,
      tier: char.tier,
      isHot: !!char.isHot,
      hasSig: hasSig,
      sigRefine: sigRefine,
      premium: premium,
      value: Math.round(val + premium),
    });
    charDetails.push({
      name: char.name,
      const: char.const,
      tier: char.tier,
      hasSig: hasSig,
      value: Math.round(val + premium),
    });
  }

  // 1.5 强绑队友检查：角色缺少强绑队友时，价值打折（适用于所有命座，不限C6）
  var _teamMatesConfig = w.teamMates || {};
  // 向后兼容：从旧 c6TeamDependency 迁移
  var _oldC6DepConfig = w.c6TeamDependency || {};
  for (var _ocd in _oldC6DepConfig) {
    if (!_oldC6DepConfig.hasOwnProperty(_ocd)) continue;
    if (_teamMatesConfig[_ocd]) continue;
    var _ocdInfo = _oldC6DepConfig[_ocd];
    var _ocdMates = Array.isArray(_ocdInfo.teammate) ? _ocdInfo.teammate : [_ocdInfo.teammate];
    if (_ocdMates.length > 0 && _ocdMates[0]) _teamMatesConfig[_ocd] = [].concat(_ocdMates);
  }
  var _teamDepDiscount = w.teamDepDiscount != null ? w.teamDepDiscount : DEFAULT_WEIGHTS.teamDepDiscount;
  const teamDepNotes = [];
  const charNamesSet = new Set(parsed.characters.map(c => c.name));
  for (const cb of charBreakdown) {
    const mates = _teamMatesConfig[cb.name];
    if (!mates || !Array.isArray(mates) || mates.length === 0) continue;
    const hasTeammate = mates.some(t => charNamesSet.has(t));
    if (!hasTeammate) {
      const originalVal = cb.value;
      const discountedVal = Math.round(originalVal * _teamDepDiscount);
      charValue -= originalVal - discountedVal;
      cb.value = discountedVal;
      const cd = charDetails.find(c => c.name === cb.name);
      if (cd) cd.value = discountedVal;
      teamDepNotes.push(cb.name + '缺' + mates.join('/') + ' x' + Math.round(_teamDepDiscount * 100) + '%');
    }
  }

  // 2. 满命溢价（公式：基准溢价 + (加权满命 - 基准) / 每档 × 每档浮动）
  let fullConstPremium = 0;
  const c6BonusNotes = [];
  const allC6Chars = charBreakdown.filter(cb => cb.const >= 6 && cb.tier && cb.tier !== 'E');
  const tierCounts = {};
  for (const cb of allC6Chars) {
    tierCounts[cb.tier] = (tierCounts[cb.tier] || 0) + 1;
  }
  var c6Base = (w.c6Base != null) ? w.c6Base : DEFAULT_WEIGHTS.c6Base;
  var c6BaseBonus = (w.c6BaseBonus != null) ? w.c6BaseBonus : DEFAULT_WEIGHTS.c6BaseBonus;
  var c6Step = (w.c6Step != null) ? w.c6Step : DEFAULT_WEIGHTS.c6Step;
  var c6StepBonus = (w.c6StepBonus != null) ? w.c6StepBonus : DEFAULT_WEIGHTS.c6StepBonus;

  let c6BonusMultiplier = weightedFullConst > 0
    ? c6BaseBonus + (weightedFullConst - c6Base) / c6Step * c6StepBonus
    : 0;
  if (c6BonusMultiplier < 0) c6BonusMultiplier = 0;
  if (c6BonusMultiplier > 0) {
    fullConstPremium = charValue * c6BonusMultiplier;
    const tierSummary = Object.entries(tierCounts)
      .sort((a, b) => (c6Weights[a[0]] || 0) < (c6Weights[b[0]] || 0) ? 1 : -1)
      .map(([t, c]) => c + '个' + t + '级').join('+');
    c6BonusNotes.push('满命(' + tierSummary + ') 加权' + weightedFullConst.toFixed(1) + ' +' + Math.round(c6BonusMultiplier * 100) + '%');
  }

  // 计算抽数满命加成系数（公式：基准加成 + (加权满命 - 基准) / 每档 × 每档浮动）
  var pc6Base = (w.pullC6Base != null) ? w.pullC6Base : DEFAULT_WEIGHTS.pullC6Base;
  var pc6BaseBonus = (w.pullC6BaseBonus != null) ? w.pullC6BaseBonus : DEFAULT_WEIGHTS.pullC6BaseBonus;
  var pc6Step = (w.pullC6Step != null) ? w.pullC6Step : DEFAULT_WEIGHTS.pullC6Step;
  var pc6StepBonus = (w.pullC6StepBonus != null) ? w.pullC6StepBonus : DEFAULT_WEIGHTS.pullC6StepBonus;

  var pullC6Multiplier = weightedFullConst > 0
    ? pc6BaseBonus + (weightedFullConst - pc6Base) / pc6Step * pc6StepBonus
    : 0;
  if (pullC6Multiplier < 0) pullC6Multiplier = 0;

  // 3. 配队溢价（使用 weights.teams 和 teamMultiBonus）
  let teamPremium = 0;
  const teamBonusNotes = [];
  const charNames = new Set(parsed.characters.map(c => c.name));
  const teams = (weights && weights.teams) || DEFAULT_TEAMS;
  const satisfiedTeams = [];

  for (const team of teams) {
    const allPresent = team.members.every(m => charNames.has(m));
    if (allPresent) satisfiedTeams.push(team);
  }

  const rawMultiRules = w.teamMultiBonus || [];
  const tmDedup = {};
  for (const r of rawMultiRules) { tmDedup[r.count] = r; }
  const multiRules = Object.values(tmDedup);
  let multiTeamCoeff = 1.0;
  for (const rule of multiRules) {
    if (satisfiedTeams.length >= rule.count) {
      multiTeamCoeff = Math.max(multiTeamCoeff, rule.coef);
    }
  }

  // 去重：每个角色只取参与配队中的最高溢价系数，不重复累加
  for (const char of parsed.characters) {
    let bestCoeff = 0;
    for (const team of satisfiedTeams) {
      if (team.members.indexOf(char.name) >= 0) {
        const coeff = team.multiplier - 1;
        if (coeff > bestCoeff) bestCoeff = coeff;
      }
    }
    if (bestCoeff > 0) {
      const hasSig = checkHasSigWeapon(char.name, weaponNames, weaponSectionText);
      const memberVal = getCharValue(char, hasSig, w);
      teamPremium += memberVal * bestCoeff;
    }
  }
  teamPremium *= multiTeamCoeff;
  if (satisfiedTeams.length > 0) {
    const teamNames = satisfiedTeams.map(t => t.name).join('/');
    teamBonusNotes.push(satisfiedTeams.length + '配队(' + teamNames + ') ×' + multiTeamCoeff);
  }

  // 4. 抽数价值（基础抽数价值 × (1 + 满命抽数加成系数)）
  const pullInfo = calculatePullValue(parsed.pulls);
  const basePullValue = pullInfo.total;
  const pullC6Bonus = Math.round(basePullValue * pullC6Multiplier);
  const pullValue = basePullValue + pullC6Bonus;

  // 5. 其他资源
  const outfits = extractListItems(parsed.rawText, '服饰');
  const motoFrames = extractListItems(parsed.rawText, '车架模组').concat(extractListItems(parsed.rawText, '车架'));

  const outfitValue = outfits.length * (w.outfit || 0);
  const motoFrameValue = motoFrames.length * (w.motoFrame || 0);
  const otherResources = outfitValue + motoFrameValue;

  // 武器明细
  const weaponDetails = parsed.weapons.map(weapon => {
    const isSig = parsed.characters.some(char => {
      const charSigName = _sigWeaponsOverride ? (_sigWeaponsOverride[char.name] || SIG_WEAPONS[char.name]) : SIG_WEAPONS[char.name];
      return charSigName === weapon.name && hasSignatureWeapons.includes(char.name);
    });
    return { name: weapon.name, refine: weapon.refine, isSig: isSig };
  });

  // 限定金数：S/A/B/C/D级角色(1+命座) + 其专武(精炼数)
  const LIMITED_TIERS = ['S', 'A', 'B', 'C', 'D'];
  var limitedYellow = 0;
  var countedWeapons = {};
  for (var ci = 0; ci < parsed.characters.length; ci++) {
    var char = parsed.characters[ci];
    if (LIMITED_TIERS.indexOf(char.tier) < 0) continue;
    limitedYellow += 1 + (char.const || 0);
    var sigName = _sigWeaponsOverride ? (_sigWeaponsOverride[char.name] || SIG_WEAPONS[char.name]) : SIG_WEAPONS[char.name];
    if (sigName && hasSignatureWeapons.indexOf(char.name) >= 0 && !countedWeapons[sigName]) {
      var sigWeapon = parsed.weapons.find(function(wp) { return wp.name === sigName; });
      if (sigWeapon) {
        limitedYellow += sigWeapon.refine || 1;
        countedWeapons[sigName] = true;
      }
    }
  }

  // 有效金数：S/A级角色(1+命座) + 其专武 + 完整配队角色(1+命座) + 其专武（不重复计算）
  const EFFECTIVE_TIERS = ['S', 'A'];
  var effectiveYellow = 0;
  var effectiveCountedWeapons = {};
  var effectiveCountedChars = {};
  // S/A级角色
  for (var eci = 0; eci < parsed.characters.length; eci++) {
    var eChar = parsed.characters[eci];
    if (EFFECTIVE_TIERS.indexOf(eChar.tier) < 0) continue;
    effectiveYellow += 1 + (eChar.const || 0);
    effectiveCountedChars[eChar.name] = true;
    var eSigName = _sigWeaponsOverride ? (_sigWeaponsOverride[eChar.name] || SIG_WEAPONS[eChar.name]) : SIG_WEAPONS[eChar.name];
    if (eSigName && hasSignatureWeapons.indexOf(eChar.name) >= 0 && !effectiveCountedWeapons[eSigName]) {
      var eSigWeapon = parsed.weapons.find(function(wp) { return wp.name === eSigName; });
      if (eSigWeapon) {
        effectiveYellow += eSigWeapon.refine || 1;
        effectiveCountedWeapons[eSigName] = true;
      }
    }
  }
  // 完整配队角色（排除已计入的S/A级角色）
  var teamCharNames = {};
  for (var ti = 0; ti < satisfiedTeams.length; ti++) {
    var team = satisfiedTeams[ti];
    for (var mi = 0; mi < team.members.length; mi++) {
      teamCharNames[team.members[mi]] = true;
    }
  }
  for (var tci = 0; tci < parsed.characters.length; tci++) {
    var tChar = parsed.characters[tci];
    if (!teamCharNames[tChar.name]) continue;
    if (effectiveCountedChars[tChar.name]) continue; // 已计入
    effectiveYellow += 1 + (tChar.const || 0);
    effectiveCountedChars[tChar.name] = true;
    var tSigName = _sigWeaponsOverride ? (_sigWeaponsOverride[tChar.name] || SIG_WEAPONS[tChar.name]) : SIG_WEAPONS[tChar.name];
    if (tSigName && hasSignatureWeapons.indexOf(tChar.name) >= 0 && !effectiveCountedWeapons[tSigName]) {
      var tSigWeapon = parsed.weapons.find(function(wp) { return wp.name === tSigName; });
      if (tSigWeapon) {
        effectiveYellow += tSigWeapon.refine || 1;
        effectiveCountedWeapons[tSigName] = true;
      }
    }
  }

  // 6. 有效金系数（基于有效金数分段计算，不同段使用不同步长）
  const totalBeforeYellow = charValue + fullConstPremium + teamPremium + pullValue + otherResources;
  const yellowInfo = getEffectiveYellowCoeff(effectiveYellow);
  yellowInfo.rawYellowCount = parsed.yellowCount;
  yellowInfo.effectiveYellow = effectiveYellow;
  yellowInfo.limitedYellow = limitedYellow;
  yellowInfo.totalYellow = parsed.yellowCount;
  const yellowCoeff = yellowInfo.coefficient;

  // 账号等级、四星角色数
  const levelMatch = (parsed.rawText || '').match(/联觉等级[】：:\s]*(\d+)/) || (parsed.rawText || '').match(/等级[：:]\s*(\d+)/) || (parsed.rawText || '').match(/(\d+)级/);
  const level = levelMatch ? parseInt(levelMatch[1]) : 1;
  const fourStarMatch = (parsed.rawText || '').match(/(\d+)个四星角色/);
  const fourStarChars = fourStarMatch ? parseInt(fourStarMatch[1]) : 0;
  const fiveStarChars = parsed.characters.length;
  const maxConstChars = parsed.characters.filter(c => c.const >= 6).length;

  // 低命折扣系数
  let flatDiscount = 1;
  const flatDiscountNotes = [];
  const flatRules = w.flatDiscountRules || [];
  if (flatRules.length > 0) {
    for (const rule of flatRules) {
      if (!rule.tiers || rule.tiers.length === 0) continue;
      const tierChars = parsed.characters.filter(c => rule.tiers.includes(c.tier));
      if (tierChars.length === 0) continue;
      const allWithinLimit = tierChars.every(c => c.const <= rule.maxConst);
      if (allWithinLimit) {
        flatDiscount = Math.min(flatDiscount, rule.discount);
        const charSummary = tierChars.map(c => c.name + c.const + '命').join('/');
        flatDiscountNotes.push('低命折扣系数(' + rule.tiers.join('+') + '级全≤' + rule.maxConst + '命: ' + charSummary + ') ×' + rule.discount);
      }
    }
  }

  const finalCoeff = flatDiscount < 1 ? Math.min(yellowCoeff, flatDiscount) : yellowCoeff;
  const totalValue = totalBeforeYellow * finalCoeff;

  const ratio = price > 0 ? (totalValue - price) / price * 100 : 0;
  const diff = Math.round((totalValue - price) * 100) / 100;

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    diff: diff,
    charValue: Math.round(charValue * 100) / 100,
    fullConstPremium: Math.round(fullConstPremium * 100) / 100,
    teamPremium: Math.round(teamPremium * 100) / 100,
    pullValue: Math.round(pullValue * 100) / 100,
    otherResources: otherResources,
    yellowCoeff: yellowCoeff,
    weightedFullConst,
    satisfiedTeams: satisfiedTeams.map(t => t.name),
    ratio: Math.round(ratio * 10) / 10,
    charBreakdown: charBreakdown,
    charDetails: charDetails,
    hasSignatureWeapons: hasSignatureWeapons,
    weaponDetails: weaponDetails,
    matchedTeams: satisfiedTeams,
    c6DepNotes: teamDepNotes,
    sigDiscountNotes: sigDiscountNotes,
    c6Bonus: { value: Math.round(fullConstPremium), notes: c6BonusNotes },
    teamBonus: { value: Math.round(teamPremium), notes: teamBonusNotes },
    flatDiscount: { value: flatDiscount, notes: flatDiscountNotes },
    pullInfo: {
      pulls: pullInfo.pulls,
      perPull: pullInfo.perPull,
      tierLabel: pullInfo.tierLabel,
      baseTotal: Math.round(basePullValue * 100) / 100,
      c6Bonus: pullC6Bonus,
      c6Multiplier: pullC6Multiplier,
      total: pullValue,
    },
    yellowInfo: yellowInfo,
    outfits: outfits,
    motoFrames: motoFrames,
    level: level,
    fourStarChars: fourStarChars,
    fiveStarChars: fiveStarChars,
    maxConstChars: maxConstChars,
  };
}

// ============================================================
// 对外接口
// ============================================================

/**
 * 计算账号估值并给出性价比
 * @param {string} showTitle - 账号描述文本
 * @param {number} priceInCents - 标价（分）
 * @returns {object} 估值结果（含 info / details / priceInYuan / costPerformance）
 */
function evaluateWithPrice(showTitle, priceInCents, customWeights) {
  // 临时设置自定义权重
  const savedWeights = weights;
  const savedSigOverride = _sigWeaponsOverride;
  if (customWeights) {
    weights = buildDefaultWeights(customWeights);
    // 应用用户自定义专武映射
    _sigWeaponsOverride = weights.sigWeaponsOverride || null;
  }
  try {
    const parsed = parseAccountInfo(showTitle);
    const priceInYuan = priceInCents / 100;
    const cv = calculateValue(parsed, priceInYuan);

  // 性价比
  let costPerformance = 0;
  if (priceInYuan > 0) {
    costPerformance = ((cv.totalValue - priceInYuan) / priceInYuan) * 100;
  }
  costPerformance = Math.round(costPerformance * 100) / 100;

  // info：兼容 server.js / monitor.js 的字段名
  const info = {
    characters: parsed.characters,
    weapons: parsed.weapons,
    starSounds: parsed.starSound,
    moonPhases: parsed.moonPhase,
    coral: parsed.aftermathCoral,
    goldenRipples: parsed.floatGoldRipple,
    tideRipples: parsed.castTideRipple,
    yellowCount: parsed.yellowCount,
    outfits: parsed.outfitCount,
    motorcycles: parsed.motoCount,
    pulls: parsed.pulls,
    rawText: parsed.rawText,
  };

  // details：兼容 server.js / monitor.js 的字段名，同时保留油猴脚本原始字段
  const details = {
    ...cv,
    finalValue: cv.totalValue,
    characterValue: cv.charValue,
    c6Premium: cv.fullConstPremium,
    teamPremium: cv.teamPremium,
    pullValue: cv.pullValue,
    resourceValue: cv.otherResources,
    yellowMultiplier: cv.yellowCoeff,
    characters: cv.charBreakdown,
  };

  return {
    info,
    details,
    priceInYuan,
    costPerformance,
  };
  } finally {
    // 恢复原始权重
    weights = savedWeights;
    _sigWeaponsOverride = savedSigOverride;
  }
}

/**
 * 生成账号简短描述（用于通知）
 * @param {object} evaluation - evaluateWithPrice 的结果
 * @returns {string} 简短描述
 */
function generateShortDescription(evaluation) {
  const chars = (evaluation.details && evaluation.details.characters) || [];
  if (chars.length === 0) return '无已知角色';

  // 取价值最高的前5个角色
  const topChars = [...chars].sort((a, b) => b.value - a.value).slice(0, 5);
  const parts = topChars.map(c => {
    const constStr = c.const >= 6 ? '满命' : `${c.const}命`;
    const weaponStr = c.hasSig ? '+专武' : '';
    return `${constStr}${c.name}${weaponStr}`;
  });

  let desc = parts.join(', ');
  const yellowCount = evaluation.info && evaluation.info.yellowCount;
  if (yellowCount > 0) {
    desc += ` | ${yellowCount}黄`;
  }
  return desc;
}

// ============================================================
// 导出
// ============================================================
module.exports = {
  // 常量
  CONFIG_VERSION,
  CHAR_TIERS,
  SIG_WEAPONS,
  FULL_CONST_WEIGHT,
  CHAR_LOOKUP,
  CHAR_ALIASES,
  SECTION_KEYWORDS,
  DEFAULT_WEIGHTS,
  DEFAULT_TEAMS,
  DEFAULT_PULL_FORMULA,
  DEFAULT_TEAM_MATES,
  DEFAULT_CHAR_PRICES,
  DEFAULT_CONST_PREMIUMS,
  DEFAULT_NEED_SIG_WEAPONS,
  // 构建函数
  buildDefaultCharPrices,
  buildDefaultConstPrices,
  convertPremiumsToConstPrices,
  buildDefaultTeamPremiums,
  buildDefaultWeights,
  getDefaults,
  // 解析函数
  parseAccountInfo,
  extractSection,
  extractNumber,
  parseCharacters,
  findCharsInText,
  parseWeapons,
  extractYellowCount,
  extractListCount,
  extractListItems,
  // 计算函数
  checkHasSigWeapon,
  calcConstPremium,
  getCharValue,
  calculatePullValue,
  getYellowCoeff,
  getEffectiveYellowCoeff,
  calculateValue,
  // 对外接口
  evaluateWithPrice,
  generateShortDescription,
};
