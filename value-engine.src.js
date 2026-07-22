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

// ============================================================
// 角色定价配置（对应油猴脚本 CHAR_TIERS）
// ============================================================
const CHAR_TIERS = {
  S: { price: 50, isHot: true, chars: ['爱弥斯', '绯雪', '卡提希娅'] },
  A: { price: 35, isHot: true, chars: ['琳奈', '千咲', '穗穗', '莫宁', '秧秧玄翎', '弗洛洛', '洛瑟菈'] },
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
  '露西': '蜃影',
};

// 满命权重（对应油猴脚本 FULL_CONST_WEIGHT）
const FULL_CONST_WEIGHT = { S: 1.0, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0.1 };

// ============================================================
// 估值权重默认值（对应油猴脚本 DEFAULT_WEIGHTS）
// ============================================================
const DEFAULT_WEIGHTS = {
  // 五星武器
  fiveStarWeapon: 0,       // 每个五星武器基础价（精1）
  weaponRefineBonus: 2,    // 每级精炼额外加价
  // 热门角色里程碑倍率
  hotC0Mult: 1,          // C0+专武 倍率
  hotC3Mult: 2,          // C3+专武 倍率
  hotC6Mult: 3,          // C6+专武 倍率
  hotStepMult: 0.08,     // 过渡命(C1/C2/C4/C5)每命加成倍率
  hotNoSigMult: 0.5,     // 无专武倍率
  hotNoSigC6Mult: 0.5,   // C6无专武倍率
  // 冷门角色加分参数
  coldStep: 0,           // 每命加价
  coldC3Bonus: 0,        // C3额外加价
  coldC6Bonus: 0,        // C6额外加价
  coldSigBonus: 0,       // 有专武额外加价
  // 满命溢价（加权满命数档位）
  c6TierWeights: { S: 1, A: 0.6, B: 0.3, C: 0.2, D: 0.1 },
  c6MultiBonus: [
    { count: 2, bonus: 0.5 },
    { count: 3, bonus: 1 },
    { count: 4, bonus: 1.5 },
    { count: 5, bonus: 2 },
    { count: 6, bonus: 2.5 },
    { count: 7, bonus: 3 },
    { count: 8, bonus: 3.5 },
    { count: 9, bonus: 4 },
    { count: 10, bonus: 4.5 },
  ],
  // 资源定价
  outfit: 2,             // 服饰/皮肤单价
  motoAccessory: 0,      // 摩托饰品单价
  motoFrame: 10,         // 车架模组单价
  paint: 0,              // 涂装单价
  // 满命抽数加成档位（加权满命数 → 抽数价值加成系数）
  pullC6Bonus: [
    { count: 1, bonus: 0.3 },
    { count: 2, bonus: 0.4 },
    { count: 3, bonus: 0.5 },
    { count: 4, bonus: 0.6 },
    { count: 5, bonus: 0.7 },
  ],
  // 多配队额外系数
  teamMultiBonus: [
    { count: 2, coef: 1.1 },
    { count: 3, coef: 1.15 },
    { count: 4, coef: 1.2 },
    { count: 5, coef: 1.25 },
    { count: 6, coef: 1.3 },
    { count: 7, coef: 1.35 },
    { count: 8, coef: 1.4 },
    { count: 9, coef: 1.45 },
    { count: 10, coef: 1.5 },
  ],
};

// ============================================================
// 默认配队列表（对应油猴脚本 DEFAULT_TEAMS）
// ============================================================
const DEFAULT_TEAMS = [
  { name: '绯洛千', members: ['绯雪', '洛瑟菈', '千咲'], multiplier: 1.5 },
  { name: '日月守', members: ['奥古斯塔', '尤诺', '守岸人'], multiplier: 1.2 },
  { name: '弗坎守', members: ['弗洛洛', '坎特蕾拉', '守岸人'], multiplier: 1.2 },
  { name: '爱达千', members: ['爱弥斯', '达妮娅', '千咲'], multiplier: 1.2 },
  { name: '卡夏千', members: ['卡提希娅', '夏空', '千咲'], multiplier: 1.2 },
  { name: '露丽守', members: ['露西', '丽贝卡', '守岸人'], multiplier: 1.2 },
  { name: '西仇守', members: ['西格莉卡', '仇远', '守岸人'], multiplier: 1.2 },
  { name: '嘉仇守', members: ['嘉贝莉娜', '仇远', '守岸人'], multiplier: 1.2 },
  { name: '爱琳莫', members: ['爱弥斯', '莫宁', '琳奈'], multiplier: 1.5 },
  { name: '三火队', members: ['布兰特', '露帕', '长离'], multiplier: 1.1 },
  { name: '赞菲守', members: ['赞妮', '菲比', '守岸人'], multiplier: 1.1 },
];

// ============================================================
// 默认抽数阶梯定价（对应油猴脚本 DEFAULT_PULL_TIERS）
// ============================================================
const DEFAULT_PULL_TIERS = [
  { minPull: 0, maxPull: 100, perPullPrice: 0.7 },
  { minPull: 100, maxPull: 200, perPullPrice: 0.9 },
  { minPull: 200, maxPull: 300, perPullPrice: 1.1 },
  { minPull: 300, maxPull: 400, perPullPrice: 1.3 },
  { minPull: 400, maxPull: 500, perPullPrice: 1.5 },
  { minPull: 500, maxPull: 600, perPullPrice: 1.9 },
  { minPull: 600, maxPull: 700, perPullPrice: 2.1 },
  { minPull: 700, maxPull: 800, perPullPrice: 2.3 },
  { minPull: 800, maxPull: 900, perPullPrice: 2.5 },
  { minPull: 900, maxPull: 1000, perPullPrice: 2.9 },
  { minPull: 1000, maxPull: 1100, perPullPrice: 3.1 },
  { minPull: 1100, maxPull: 1200, perPullPrice: 3.3 },
  { minPull: 1200, maxPull: 1300, perPullPrice: 3.5 },
  { minPull: 1300, maxPull: 1400, perPullPrice: 3.7 },
  { minPull: 1400, maxPull: Infinity, perPullPrice: 3.9 },
];

// ============================================================
// 默认黄数阶梯系数（对应油猴脚本 DEFAULT_YELLOW_TIERS）
// ============================================================
const DEFAULT_YELLOW_TIERS = [
  { minYellow: 0, maxYellow: 10, coefficient: 0.5 },
  { minYellow: 10, maxYellow: 20, coefficient: 0.6 },
  { minYellow: 20, maxYellow: 30, coefficient: 0.7 },
  { minYellow: 30, maxYellow: 40, coefficient: 0.8 },
  { minYellow: 40, maxYellow: 50, coefficient: 0.9 },
  { minYellow: 50, maxYellow: 60, coefficient: 1 },
  { minYellow: 60, maxYellow: 70, coefficient: 1.05 },
  { minYellow: 70, maxYellow: 80, coefficient: 1.1 },
  { minYellow: 80, maxYellow: 90, coefficient: 1.15 },
  { minYellow: 90, maxYellow: 100, coefficient: 1.2 },
  { minYellow: 100, maxYellow: 110, coefficient: 1.25 },
  { minYellow: 110, maxYellow: 120, coefficient: 1.3 },
  { minYellow: 120, maxYellow: Infinity, coefficient: 1.35 },
];

// ============================================================
// 默认角色价格表（对应油猴脚本 DEFAULT_CHAR_PRICES，按角色名）
// ============================================================
const DEFAULT_CHAR_PRICES = {
  '爱弥斯': 50, '绯雪': 60, '卡提希娅': 35, '弗洛洛': 35,
  '琳奈': 30, '守岸人': 30, '千咲': 30, '穗穗': 0, '莫宁': 30, '秧秧玄翎': 35,
  '洛瑟菈': 30,
  '达妮娅': 16, '夏空': 12,
  '露西': 30, '嘉贝莉娜': 20, '奥古斯塔': 15, '仇远': 10, '尤诺': 10,
  '陆赫斯': 15, '赞妮': 10, '布兰特': 10, '西格莉卡': 10,
  '露帕': 10, '珂莱塔': 10, '菲比': 10, '坎特蕾拉': 10, '椿': 10,
  '忌炎': 2, '吟霖': 2, '相里要': 2, '今汐': 2, '长离': 2, '折枝': 2, '洛可可': 2,
  '丽贝卡': 2, '维里奈': 0, '卡卡罗': 0, '安可': 0, '凌阳': 0, '鉴心': 0, '秧秧': 0,
};

// ============================================================
// 默认命座溢价（对应油猴脚本 DEFAULT_CONST_PREMIUMS，按角色名）
// ============================================================
const DEFAULT_CONST_PREMIUMS = {
  '爱弥斯': { '3': 50, '6': 180 },
  '绯雪': { '2': 50, '3': 80, '6': 200 },
  '卡提希娅': { '2': 20, '3': 30, '6': 100 },
  '弗洛洛': { '2': 20, '6': 100 },
  '奥古斯塔': { '2': 20, '6': 100 },
  '尤诺': { '6': 100 },
  '露西': { '3': 50, '6': 100 },
  '忌炎': { '6': 50 },
  '守岸人': { '2': 20, '6': 50 },
  '赞妮': { '2': 20, '6': 100 },
  '椿': { '6': 50 },
  '莫宁': { '1': 20 },
  '珂莱塔': { '6': 50 },
  '秧秧玄翎': { '3': 100, '6': 200 },
  '千咲': { '6': 50 },
  '嘉贝莉娜': { '3': 30 },
  '陆赫斯': { '6': 100 },
  '西格莉卡': { '6': 100 },
};

// 需要专武的角色列表（对应油猴脚本 DEFAULT_NEED_SIG_WEAPONS）
const DEFAULT_NEED_SIG_WEAPONS = [
  '爱弥斯', '绯雪', '卡提希娅', '千咲', '今汐', '椿', '忌炎',
  '嘉贝莉娜', '弗洛洛', '珂莱塔', '西格莉卡', '赞妮', '陆赫斯',
];

// ============================================================
// 角色名查找表（对应油猴脚本 CHAR_LOOKUP）
// ============================================================
const CHAR_LOOKUP = {};
for (const [tier, info] of Object.entries(CHAR_TIERS)) {
  for (const name of info.chars) {
    CHAR_LOOKUP[name] = { tier, price: info.price, isHot: info.isHot };
  }
}

// ============================================================
// 已知段落关键词（对应油猴脚本 SECTION_KEYWORDS）
// ============================================================
const SECTION_KEYWORDS = [
  '五星角色', '五星武器', '余波珊瑚', '浮金波纹', '铸潮波纹',
  '摩托饰品', '车架模组', '星声', '月相', '服饰', '摩托', '车架', '涂装',
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
  w.pullC6Bonus = (saved.pullC6Bonus && saved.pullC6Bonus.length) ? saved.pullC6Bonus : DEFAULT_WEIGHTS.pullC6Bonus;
  w.teamMultiBonus = (saved.teamMultiBonus && saved.teamMultiBonus.length) ? saved.teamMultiBonus : DEFAULT_WEIGHTS.teamMultiBonus;
  w.pullTiers = (saved.pullTiers && saved.pullTiers.length) ? saved.pullTiers : DEFAULT_PULL_TIERS;
  w.yellowTiers = (saved.yellowTiers && saved.yellowTiers.length) ? saved.yellowTiers : DEFAULT_YELLOW_TIERS;
  w.charPrices = Object.assign({}, buildDefaultCharPrices(), saved.charPrices || {});
  w.constPremiums = Object.assign({}, DEFAULT_CONST_PREMIUMS, saved.constPremiums || {});
  w.teamPremiums = saved.teamPremiums || buildDefaultTeamPremiums();
  w.teams = [];
  for (const teamName of Object.keys(w.teamPremiums)) {
    const t = w.teamPremiums[teamName];
    if (t && t.enabled !== false) {
      w.teams.push({ name: teamName, members: t.chars || [], multiplier: t.multiplier || 1.0 });
    }
  }
  w.needSigWeapons = saved.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
  // 用户自定义专武映射覆盖
  if (saved.sigWeaponsOverride) {
    w.sigWeaponsOverride = saved.sigWeaponsOverride;
  }
  return w;
}

// 权重标签定义（供设置面板显示用，对应油猴脚本 WEIGHT_LABELS）
const WEIGHT_LABELS = {
  fiveStarWeapon: { label: '五星武器(基础)', desc: '每个五星武器基础价（元，精1）' },
  weaponRefineBonus: { label: '武器精炼加成', desc: '每级精炼额外加价（元，精5=+4×此值）' },
  hotC0Mult: { label: '热门C0+专武倍率', desc: 'C0+专武 = 基础价 × 此倍率（1.0=100%）' },
  hotC3Mult: { label: '热门C3+专武倍率', desc: 'C3+专武 = 基础价 × 此倍率（2.0=200%，价值翻倍）' },
  hotC6Mult: { label: '热门C6+专武倍率', desc: 'C6+专武 = 基础价 × 此倍率（3.0=300%，满命三倍）' },
  hotStepMult: { label: '热门过渡命倍率', desc: 'C1/C2/C4/C5每命加成 = 基础价 × 此倍率（0.08=8%）' },
  hotNoSigMult: { label: '热门无专武倍率', desc: '热门角色无专武 = 基础价 × 此倍率（0.15=仅值15%）' },
  hotNoSigC6Mult: { label: '热门C6无专武倍率', desc: '满命但无专武 = 基础价 × 此倍率（0.25=25%）' },
  coldStep: { label: '冷门每命加分', desc: '冷门角色每命加此值（元）' },
  coldC3Bonus: { label: '冷门C3加分', desc: '冷门角色3命额外加此值（元）' },
  coldC6Bonus: { label: '冷门C6加分', desc: '冷门角色满命额外加此值（元）' },
  coldSigBonus: { label: '冷门专武加分', desc: '冷门角色有专武额外加此值（元）' },
  outfit: { label: '服饰/皮肤', desc: '每个服饰/皮肤（元）' },
  motoAccessory: { label: '摩托饰品', desc: '每个摩托饰品（元）' },
  motoFrame: { label: '车架模组', desc: '每个车架模组（元）' },
  paint: { label: '涂装', desc: '每个涂装（元）' },
};

/**
 * 获取默认权重配置（供前端 /api/defaults 接口使用）
 * 返回完整默认权重 + 角色级别表 + 命座溢价 + 配队列表
 */
function getDefaults() {
  return {
    weights: buildDefaultWeights(),
    charTiers: CHAR_TIERS,
    sigWeapons: SIG_WEAPONS,
    constPremiums: DEFAULT_CONST_PREMIUMS,
    teams: DEFAULT_TEAMS,
    pullTiers: DEFAULT_PULL_TIERS,
    yellowTiers: DEFAULT_YELLOW_TIERS,
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
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[：:]');
  const pattern = escaped + '[：:]\\s*([\\s\\S]*?)(?=' + others.join('|') + '|$)';
  const match = text.match(new RegExp(pattern));
  return match ? match[1].trim() : '';
}

/**
 * 从文本中提取数字（关键词: 数字）
 */
function extractNumber(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(escaped + '[：:]\\s*(\\d[\\d,]*)', 'i'));
  if (match) return parseInt(match[1].replace(/,/g, ''));
  return 0;
}

/**
 * 解析五星角色段落
 */
function parseCharacters(section) {
  const chars = [];
  if (!section) return chars;

  const items = section.split(/[,，、\s]+/).filter(s => s.length > 0);

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

    // 验证是否为已知角色
    const info = CHAR_LOOKUP[name];
    if (info) {
      chars.push({
        name,
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
      // "满命" + name
      if (text.includes('满命' + name)) {
        chars.push({ name, const: 6, tier, price: info.price, isHot: info.isHot });
        continue;
      }
      // "N命" + name
      let m = text.match(new RegExp('(\\d+)命' + name));
      if (m) {
        chars.push({ name, const: parseInt(m[1]), tier, price: info.price, isHot: info.isHot });
        continue;
      }
      // name + "(满命)"
      if (text.includes(name + '(满命)')) {
        chars.push({ name, const: 6, tier, price: info.price, isHot: info.isHot });
        continue;
      }
      // name + "(N命)"
      m = text.match(new RegExp(name + '\\((\\d+)命\\)'));
      if (m) {
        chars.push({ name, const: parseInt(m[1]), tier, price: info.price, isHot: info.isHot });
        continue;
      }
      // 仅出现名字
      if (text.includes(name)) {
        chars.push({ name, const: 0, tier, price: info.price, isHot: info.isHot });
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
  const items = section.split(/[,，、\s]+/).filter(s => s.length > 0);
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
  // "N黄" 或 "N黄数"
  let m = text.match(/(\d+)\s*黄/);
  if (m) return parseInt(m[1]);
  // "黄数：N" 或 "黄：N"
  m = text.match(/黄[数]?[：:]\s*(\d+)/);
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
 * 从文本中提取某个关键词段落的条目列表（用于服饰/摩托/车架/涂装明细）
 */
function extractListItems(text, keyword) {
  const section = extractSection(text, keyword);
  if (!section) return [];
  return section.split(/[,，、\s]+/).filter(s => s.length > 0);
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
  const weaponSection = extractSection(text, '五星武器');
  if (weaponSection) {
    result.weapons = parseWeapons(weaponSection);
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
 * 计算角色命座溢价（达到指定命座数时额外加价，只取最高溢价不叠加）
 */
function calcConstPremium(charName, constCount, w) {
  w = w || weights || DEFAULT_WEIGHTS;
  const premiums = w.constPremiums || {};
  const charPrem = premiums[charName];
  if (!charPrem || constCount <= 0) return 0;
  let maxPrem = 0;
  for (const bp of Object.keys(charPrem)) {
    const breakpoint = parseInt(bp);
    if (!isNaN(breakpoint) && constCount >= breakpoint) {
      const prem = charPrem[bp] || 0;
      if (prem > maxPrem) maxPrem = prem;
    }
  }
  return maxPrem;
}

/**
 * 计算单个角色价值（从 weights 读取参数，里程碑估值）
 */
function getCharValue(char, hasSigWeapon, w) {
  w = w || weights || DEFAULT_WEIGHTS;
  // 基础价优先用按角色名的价格表，否则用级别默认价
  const charPrices = w.charPrices || {};
  const base = charPrices[char.name] != null ? charPrices[char.name] : char.price;

  if (char.isHot) {
    // 热门角色：里程碑估值
    const c0Mult = w.hotC0Mult != null ? w.hotC0Mult : 1.0;
    const c3Mult = w.hotC3Mult != null ? w.hotC3Mult : 2.0;
    const c6Mult = w.hotC6Mult != null ? w.hotC6Mult : 3.0;
    const stepMult = w.hotStepMult != null ? w.hotStepMult : 0.08;
    const noSigMult = w.hotNoSigMult != null ? w.hotNoSigMult : 0.15;
    const noSigC6Mult = w.hotNoSigC6Mult != null ? w.hotNoSigC6Mult : 0.25;

    if (!hasSigWeapon) {
      // 热门角色无专武，大幅贬值
      if (char.const >= 6) return base * noSigC6Mult;
      return base * noSigMult;
    }
    // 有专武：按里程碑计算
    if (char.const >= 6) return base * c6Mult;
    if (char.const >= 3) return base * c3Mult;
    if (char.const >= 1) return base * (c0Mult + char.const * stepMult); // C1/C2/C4/C5 过渡命
    return base * c0Mult;
  } else {
    // 冷门角色：基础价 + 命数加分
    const coldStep = w.coldStep != null ? w.coldStep : 1;
    const coldC3Bonus = w.coldC3Bonus != null ? w.coldC3Bonus : 3;
    const coldC6Bonus = w.coldC6Bonus != null ? w.coldC6Bonus : 5;
    const coldSigBonus = w.coldSigBonus != null ? w.coldSigBonus : 2;

    let val = base + char.const * coldStep;
    if (char.const >= 3) val += coldC3Bonus;
    if (char.const >= 6) val += coldC6Bonus;
    if (hasSigWeapon) val += coldSigBonus;
    return val;
  }
}

/**
 * 计算抽数阶梯价值（从 weights.pullTiers 读取阶梯）
 * 按抽数所在阶梯的单价 × 总抽数计算（不分段累计）
 */
function calculatePullValue(pulls) {
  const tiers = (weights && weights.pullTiers) || DEFAULT_PULL_TIERS;
  // 去重：相同区间只保留一条（修复历史数据重复问题）
  const dedupMap = {};
  for (const t of tiers) {
    const key = (t.minPull || 0) + '-' + (t.maxPull == null ? 'inf' : t.maxPull);
    dedupMap[key] = t;
  }
  const deduped = Object.values(dedupMap);
  const sorted = [...deduped].sort((a, b) => (a.minPull || 0) - (b.minPull || 0));

  // 找到抽数所在的阶梯，按该阶梯单价 × 总抽数计算（不分段累计）
  let matchedTier = sorted[0] || { minPull: 0, maxPull: Infinity, perPullPrice: 0.8 };
  for (const tier of sorted) {
    const minPull = tier.minPull != null ? tier.minPull : 0;
    const maxPull = (tier.maxPull == null || tier.maxPull === Infinity) ? Infinity : tier.maxPull;
    if (pulls >= minPull && pulls < maxPull) {
      matchedTier = { ...tier, minPull, maxPull };
      break;
    }
  }

  const value = pulls * matchedTier.perPullPrice;
  const matchedMax = (matchedTier.maxPull == null || matchedTier.maxPull === Infinity) ? Infinity : matchedTier.maxPull;
  const tierLabel = matchedMax === Infinity
    ? matchedTier.minPull + '抽+'
    : matchedTier.minPull + '~' + matchedMax + '抽';

  return {
    pulls: Math.round(pulls),
    perPull: matchedTier.perPullPrice,
    tierLabel: tierLabel,
    total: Math.round(value),
  };
}

/**
 * 计算黄数系数（从 weights.yellowTiers 读取阶梯）
 */
function getYellowCoeff(yellowCount) {
  const rawTiers = (weights && weights.yellowTiers) || DEFAULT_YELLOW_TIERS;
  // 去重：相同区间只保留一条（修复历史数据重复问题）
  const dedupMap = {};
  for (const t of rawTiers) {
    const key = (t.minYellow || 0) + '-' + (t.maxYellow == null ? 'inf' : t.maxYellow);
    dedupMap[key] = t;
  }
  const tiers = Object.values(dedupMap);
  let matchedTier = tiers[0] || { minYellow: 0, maxYellow: Infinity, coefficient: 0.3 };
  for (const tier of tiers) {
    const maxYellow = (tier.maxYellow == null || tier.maxYellow === Infinity) ? Infinity : tier.maxYellow;
    if (yellowCount >= tier.minYellow && yellowCount < maxYellow) {
      matchedTier = { ...tier, maxYellow };
      break;
    }
  }
  const tierLabel = matchedTier.maxYellow === Infinity
    ? matchedTier.minYellow + '黄+'
    : matchedTier.minYellow + '~' + matchedTier.maxYellow + '黄';
  return {
    yellowCount: yellowCount,
    coefficient: matchedTier.coefficient,
    tierLabel: tierLabel,
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

  for (const char of parsed.characters) {
    const hasSig = checkHasSigWeapon(char.name, weaponNames, weaponSectionText);
    const val = getCharValue(char, hasSig, w);
    // 命座溢价（用户自定义的额外加价）
    const premium = calcConstPremium(char.name, char.const, w);
    charValue += val + premium;
    if (hasSig && !hasSignatureWeapons.includes(char.name)) hasSignatureWeapons.push(char.name);

    // 统计加权满命数
    let fullConstWeightVal = 0;
    if (char.const >= 6) {
      fullConstWeightVal = c6Weights[char.tier] != null ? c6Weights[char.tier] : (FULL_CONST_WEIGHT[char.tier] || 0);
      weightedFullConst += fullConstWeightVal;
    }

    // 获取专武精炼数（0表示无专武，1-5表示精1-5）
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

    // 角色估值明细
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

  // 2. 满命溢价（使用 weights.c6MultiBonus 档位）
  // 注意：保持与原版一致，溢价以全部角色价值 charValue 为基数
  let fullConstPremium = 0;
  const c6BonusNotes = [];
  const c6BonusRules = w.c6MultiBonus || [];
  const allC6Chars = charBreakdown.filter(cb => cb.const >= 6 && cb.tier && cb.tier !== 'E');
  const tierCounts = {};
  for (const cb of allC6Chars) {
    tierCounts[cb.tier] = (tierCounts[cb.tier] || 0) + 1;
  }
  // 计算满命加成系数（用于满命溢价）
  let c6BonusMultiplier = 0;
  if (weightedFullConst >= 2 && c6BonusRules.length > 0) {
    const sortedRules = [...c6BonusRules].sort((a, b) => a.count - b.count);
    let lower = null, upper = null;
    for (const rule of sortedRules) {
      if (weightedFullConst >= rule.count) lower = rule;
      else if (!upper) upper = rule;
    }
    if (lower && upper) {
      const ratio = (weightedFullConst - lower.count) / (upper.count - lower.count);
      c6BonusMultiplier = Math.max(upper.bonus * ratio, lower.bonus);
    } else if (lower) {
      c6BonusMultiplier = lower.bonus;
    }
  }
  if (c6BonusMultiplier > 0) {
    fullConstPremium = charValue * c6BonusMultiplier;
    const tierSummary = Object.entries(tierCounts)
      .sort((a, b) => (c6Weights[a[0]] || 0) < (c6Weights[b[0]] || 0) ? 1 : -1)
      .map(([t, c]) => c + '个' + t + '级').join('+');
    c6BonusNotes.push('满命(' + tierSummary + ') 加权' + weightedFullConst.toFixed(1) + ' +' + Math.round(c6BonusMultiplier * 100) + '%');
  }

  // 计算抽数满命加成系数（独立档位 pullC6Bonus）
  const pullC6Rules = w.pullC6Bonus || [];
  let pullC6Multiplier = 0;
  if (weightedFullConst >= 1 && pullC6Rules.length > 0) {
    const sortedPullRules = [...pullC6Rules].sort((a, b) => a.count - b.count);
    let plower = null, pupper = null;
    for (const rule of sortedPullRules) {
      if (weightedFullConst >= rule.count) plower = rule;
      else if (!pupper) pupper = rule;
    }
    if (plower && pupper) {
      const pratio = (weightedFullConst - plower.count) / (pupper.count - plower.count);
      pullC6Multiplier = Math.max(pupper.bonus * pratio, plower.bonus);
    } else if (plower) {
      pullC6Multiplier = plower.bonus;
    }
  }

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

  // 多配队额外系数（从 teamMultiBonus 读取，去重防止历史数据重复）
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

  for (const team of satisfiedTeams) {
    for (const member of team.members) {
      const char = parsed.characters.find(c => c.name === member);
      if (char) {
        const hasSig = checkHasSigWeapon(member, weaponNames, weaponSectionText);
        const memberVal = getCharValue(char, hasSig, w);
        teamPremium += memberVal * (team.multiplier - 1);
      }
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
  // 满命角色多则抽数价值更高：用独立的抽数满命加成系数
  const pullC6Bonus = Math.round(basePullValue * pullC6Multiplier);
  const pullValue = basePullValue + pullC6Bonus;

  // 5. 其他资源（提取明细列表，按 weights 单价计价）
  const outfits = extractListItems(parsed.rawText, '服饰');
  const motoAccessories = extractListItems(parsed.rawText, '摩托饰品').concat(extractListItems(parsed.rawText, '摩托'));
  const motoFrames = extractListItems(parsed.rawText, '车架模组').concat(extractListItems(parsed.rawText, '车架'));
  const paints = extractListItems(parsed.rawText, '涂装');

  const outfitValue = outfits.length * (w.outfit || 0);
  const motoAccValue = motoAccessories.length * (w.motoAccessory || 0);
  const motoFrameValue = motoFrames.length * (w.motoFrame || 0);
  const paintValue = paints.length * (w.paint || 0);
  const otherResources = outfitValue + motoAccValue + motoFrameValue + paintValue;

  // 武器明细
  const weaponDetails = parsed.weapons.map(weapon => {
    const isSig = parsed.characters.some(char => {
      const charSigName = _sigWeaponsOverride ? (_sigWeaponsOverride[char.name] || SIG_WEAPONS[char.name]) : SIG_WEAPONS[char.name];
      return charSigName === weapon.name && hasSignatureWeapons.includes(char.name);
    });
    return { name: weapon.name, refine: weapon.refine, isSig: isSig };
  });

  // 6. 黄数系数（getYellowCoeff 返回对象）
  const yellowInfo = getYellowCoeff(parsed.yellowCount);
  const yellowCoeff = yellowInfo.coefficient;

  // 账号等级、四星角色数
  const levelMatch = (parsed.rawText || '').match(/(\d+)级/);
  const level = levelMatch ? parseInt(levelMatch[1]) : 1;
  const fourStarMatch = (parsed.rawText || '').match(/(\d+)个四星角色/);
  const fourStarChars = fourStarMatch ? parseInt(fourStarMatch[1]) : 0;
  const fiveStarChars = parsed.characters.length;
  const maxConstChars = parsed.characters.filter(c => c.const >= 6).length;

  // 总价值（各项直接相加后乘以黄数系数，不再使用简单倍率调整）
  const totalBeforeYellow = charValue + fullConstPremium + teamPremium + pullValue + otherResources;
  const totalValue = totalBeforeYellow * yellowCoeff;

  // 性价比
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
    // ===== 明细字段 =====
    charBreakdown: charBreakdown,
    charDetails: charDetails,
    hasSignatureWeapons: hasSignatureWeapons,
    weaponDetails: weaponDetails,
    matchedTeams: satisfiedTeams,
    c6Bonus: { value: Math.round(fullConstPremium), notes: c6BonusNotes },
    teamBonus: { value: Math.round(teamPremium), notes: teamBonusNotes },
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
    motoAccessories: motoAccessories,
    motoFrames: motoFrames,
    paints: paints,
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
  CHAR_TIERS,
  SIG_WEAPONS,
  FULL_CONST_WEIGHT,
  CHAR_LOOKUP,
  SECTION_KEYWORDS,
  DEFAULT_WEIGHTS,
  DEFAULT_TEAMS,
  DEFAULT_PULL_TIERS,
  DEFAULT_YELLOW_TIERS,
  DEFAULT_CHAR_PRICES,
  DEFAULT_CONST_PREMIUMS,
  DEFAULT_NEED_SIG_WEAPONS,
  // 构建函数
  buildDefaultCharPrices,
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
  calculateValue,
  // 对外接口
  evaluateWithPrice,
  generateShortDescription,
};
