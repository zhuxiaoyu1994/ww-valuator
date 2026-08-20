/**
 * value-engine.js - 多游戏账号估值引擎（工厂模式）
 * 通过 createEngine(config) 传入游戏配置，创建对应游戏的估值引擎实例。
 * 估值逻辑（有效金系数、抽数定价、满命加成等）通用，仅配置数据按游戏区分。
 *
 * 对外接口：
 *   - createEngine(config) → engine instance
 *   - engine.evaluateWithPrice(showTitle, priceInCents, customWeights?)
 *   - engine.generateShortDescription(evaluation)
 *   - engine.getDefaults()
 */

'use strict';

const WUWA_CONFIG = require('./configs/wuwa');

function createEngine(config) {
  const CONFIG_VERSION = config.configVersion;
  const CHAR_TIERS = config.charTiers;
  const SIG_WEAPONS = config.sigWeapons;
  const FULL_CONST_WEIGHT = config.fullConstWeight;
  const DEFAULT_WEIGHTS = config.defaultWeights;
  const DEFAULT_PULL_FORMULA = config.defaultPullFormula;
  const DEFAULT_TEAM_MATES = config.defaultTeamMates;
  const DEFAULT_TEAMS = config.defaultTeams;
  const DEFAULT_CHAR_PRICES = config.defaultCharPrices;
  const DEFAULT_CONST_PREMIUMS = config.defaultConstPremiums;
  const DEFAULT_NEED_SIG_WEAPONS = config.defaultNeedSigWeapons;
  const CHAR_ALIASES = config.charAliases;
  const SECTION_KEYWORDS = config.sectionKeywords;
  const WEIGHT_LABELS = config.weightLabels;

  // 多游戏解析参数（缺省回退鸣潮值，保证旧配置兼容）
  const LEVEL_KEYWORDS = config.levelKeywords || ['联觉等级', '冒险等级'];
  const YELLOW_UNITS = config.yellowUnits || ['黄'];
  const CONST_UNITS = config.constUnits || ['命'];
  const CONST_UNIT_DISPLAY = config.constUnitDisplay || (config.constUnits ? config.constUnits[0] : '命');
  const CHAR_SECTION_KEYWORDS = config.charSectionKeywords || ['五星角色'];
  const WEAPON_SECTION_KEYWORDS = config.weaponSectionKeywords || ['五星武器', '武器', '金色武器'];
  const RESOURCES = config.resources || [
    { key: 'starSound', name: '星声', div: 160 },
    { key: 'moonPhase', name: '月相', div: 160 },
    { key: 'aftermathCoral', name: '余波珊瑚', div: 8 },
    { key: 'floatGoldRipple', name: '浮金波纹', div: 1 },
    { key: 'castTideRipple', name: '铸潮波纹', div: 1 },
  ];
  const OUTFIT_SECTION_KEYWORDS = config.outfitSectionKeywords || ['服饰', '皮肤'];
  const MOTO_SECTION_KEYWORDS = config.motoSectionKeywords || ['车架模组', '车架', '摩托'];
  const MOTO_ACCESSORY_KEYWORDS = config.motoAccessoryKeywords || ['摩托饰品'];

  const CHAR_LOOKUP = {};
  for (const [tier, info] of Object.entries(CHAR_TIERS)) {
    for (const name of info.chars) {
      CHAR_LOOKUP[name] = { tier, price: info.price, isHot: info.isHot };
    }
  }
  for (const [alias, canonical] of Object.entries(CHAR_ALIASES)) {
    if (CHAR_LOOKUP[canonical]) {
      CHAR_LOOKUP[alias] = CHAR_LOOKUP[canonical];
    }
  }

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
    const ctoTier = w.charTierOverride[ctoName];
    if (CHAR_LOOKUP[ctoName]) {
      CHAR_LOOKUP[ctoName].tier = ctoTier;
      CHAR_LOOKUP[ctoName].isHot = ctoTier === 'S' || ctoTier === 'A' || ctoTier === 'B';
    } else {
      const tierPrice = CHAR_TIERS[ctoTier] ? CHAR_TIERS[ctoTier].price : 0;
      CHAR_LOOKUP[ctoName] = {
        tier: ctoTier,
        price: tierPrice,
        isHot: ctoTier === 'S' || ctoTier === 'A' || ctoTier === 'B'
      };
    }
  }
  return w;
}


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
// 多平台文本归一化（对应油猴脚本 kjsNormalizeText）
// 支持氪金兽(Format A/B/C)和7881格式，统一转为螃蟹网标准格式
// ============================================================

function normalizePlatformText(text) {
  if (!text) return text;
  const resourceNames = RESOURCES.map(r => r.name);
  const allSectionKeywords = CHAR_SECTION_KEYWORDS.concat(WEAPON_SECTION_KEYWORDS);

  // Format C: 资源值无冒号 → 补冒号（"星声15722" → "星声:15722"）
  text = text.replace(new RegExp('(' + resourceNames.join('|') + ')(\\d+)', 'g'), '$1:$2');

  // Format C: 清理无用段落
  text = text.replace(/【绑定情况】[：:][\s\S]*?(?=【|$)/g, '');
  text = text.replace(/皮肤[：:][^【]*/g, '');

  // Format C: 合并命座分段到角色列表
  const constSections = ['满命', '六命', '五命', '四命', '三命', '二命', '一命', '零命'];
  let allCharsWithConst = [];
  for (const cs of constSections) {
    const csPat = '【' + cs + '角色】[：:]\\s*([^【]*)';
    const csMatch = text.match(new RegExp(csPat));
    if (csMatch) {
      const csItems = csMatch[1].split(/[,，、\s]+/).filter(Boolean);
      allCharsWithConst = allCharsWithConst.concat(csItems);
    }
  }
  if (allCharsWithConst.length > 0) {
    text = text.replace(/【按角色】[：:][\s\S]*?(?=【|$)/g, CHAR_SECTION_KEYWORDS[0] + ':' + allCharsWithConst.join(',') + ' ');
    text = text.replace(/【[满六五四三二一零]命角色】[：:][\s\S]*?(?=【|$)/g, '');
  }

  // Format C: 合并精炼分段到武器列表
  const refineSections = ['精五', '精四', '精三', '精二', '精一', '精0'];
  let allWeaponsWithRefine = [];
  for (const rs of refineSections) {
    const rsPat = '【' + rs + '武器】[：:]\\s*([^【]*)';
    const rsMatch = text.match(new RegExp(rsPat));
    if (rsMatch) {
      const rsItems = rsMatch[1].split(/[,，、\s]+/).filter(Boolean);
      allWeaponsWithRefine = allWeaponsWithRefine.concat(rsItems);
    }
  }
  if (allWeaponsWithRefine.length > 0) {
    text = text.replace(/【按武器】[：:][\s\S]*?(?=【|$)/g, WEAPON_SECTION_KEYWORDS[0] + ':' + allWeaponsWithRefine.join(',') + ' ');
    text = text.replace(/【精[五四三二一0]武器】[：:][\s\S]*?(?=【|$)/g, '');
  }

  // 通用转换
  text = text
    .replace(/[·・]/g, '')
    // "星声数量:1434" → "星声:1434"（资源名按当前游戏）
    .replace(new RegExp('(' + resourceNames.join('|') + ')数量', 'g'), '$1')
    // 卖家格式B: "五星数量：34" → "总黄数:34"
    .replace(/五星数量[：:]\s*(\d+)/g, '总黄数:$1')
    // 卖家格式B: "__" → "，"
    .replace(/__/g, '，')
    // 截掉卖家备注
    .replace(/卖家说[\s\S]*$/, '')
    // "五星角色数:18 6鸣露西，..." → 按数量截取前N项，剔除四星
    .replace(new RegExp('(' + allSectionKeywords.join('|') + ')数\\s*[:：]\\s*(\\d+)\\s*([^五]*?)(?=五星|$)', 'g'), function(m, kw, cnt, rest) {
      const items = rest.split(/[,，、\s]+/).filter(Boolean);
      return kw + ':' + items.slice(0, parseInt(cnt, 10)).join('，');
    })
    // 四星角色段落丢弃
    .replace(new RegExp('四星角色数?\\s*[:：]\\s*(?:\\d+\\s*)?[\\s\\S]*?(?=' + CHAR_SECTION_KEYWORDS[0] + '|五星武器|' + LEVEL_KEYWORDS.join('|') + '|$)', 'g'), '')
    // 氪金兽用"鸣"表示命座/精炼，先在武器段内把"N鸣武器名"→"精N武器名"
    .replace(new RegExp('(' + WEAPON_SECTION_KEYWORDS.join('|') + ')[：:]\\s*[\\s\\S]*'), function(m) {
      return m.replace(/(\d+)鸣([^,，、\s;；]+)/g, function(mm, num, name) { return '精' + num + name; });
    })
    // "N鸣角色名"→"N命角色名"（氪金兽用"鸣"表示命座）
    .replace(/(\d+)鸣/g, '$1命')
    // "维里奈 * 4命" → "维里奈(4命)"
    .replace(new RegExp('([^,，、\\s;；*]+)\\s*\\*\\s*(\\d+)(' + CONST_UNITS.join('|') + ')', 'g'), '$1($2$3)')
    // "相位涟漪 * 2精" → "精2相位涟漪"
    .replace(/([^,，、\s;；*]+)\s*\*\s*(\d+)精/g, '精$2$1');

  return text;
}

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

  // 格式4: keyword\ncontent（螃蟹网移动端格式，换行分隔关键词和内容）
  const pattern4 = escaped + '\\n\\s*([\\s\\S]*?)(?=' + others.join('|') + '|$)';
  const match4 = text.match(new RegExp(pattern4));
  if (match4) return match4[1].trim();

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
  // 格式4: keyword\n数字（螃蟹网移动端格式，换行分隔）
  const match4 = text.match(new RegExp(escaped + '\\n\\s*(\\d[\\d,]*)', 'i'));
  if (match4) return parseInt(match4[1].replace(/,/g, ''));
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
    let constNum = -1;
    let name = '';

    // 命座单位按当前游戏配置（鸣潮"命"、绝区零"命/影"）
    for (const unit of CONST_UNITS) {
      let m = item.match(new RegExp('^满' + unit + '(.+)$'));
      if (m) { constNum = 6; name = m[1]; break; }
      m = item.match(new RegExp('^(\\d+)' + unit + '(.+)$'));
      if (m) { constNum = parseInt(m[1]); name = m[2]; break; }
      m = item.match(new RegExp('^(.+?)\\(满' + unit + '\\)$'));
      if (m) { constNum = 6; name = m[1]; break; }
      m = item.match(new RegExp('^(.+?)\\((\\d+)' + unit + '\\)$'));
      if (m) { constNum = parseInt(m[2]); name = m[1]; break; }
    }
    if (constNum < 0) {
      name = item;
      constNum = 0;
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
        // 命座单位按当前游戏（"满命X"/"N命X"/"X(满命)"/"X(N命)"，绝区零还支持"影"）
        for (const unit of CONST_UNITS) {
          if (text.includes('满' + unit + checkName)) {
            chars.push({ name, const: 6, tier, price: info.price, isHot: info.isHot });
            found = true; break;
          }
          const m = text.match(new RegExp('(\\d+)' + unit + checkName));
          if (m) {
            chars.push({ name, const: parseInt(m[1]), tier, price: info.price, isHot: info.isHot });
            found = true; break;
          }
          if (text.includes(checkName + '(满' + unit + ')')) {
            chars.push({ name, const: 6, tier, price: info.price, isHot: info.isHot });
            found = true; break;
          }
          const m2 = text.match(new RegExp(checkName + '\\((\\d+)' + unit + '\\)'));
          if (m2) {
            chars.push({ name, const: parseInt(m2[1]), tier, price: info.price, isHot: info.isHot });
            found = true; break;
          }
        }
        if (found) break;
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
 * 提取黄数（限定金数量，单位按当前游戏配置：鸣潮"黄"、绝区零"黄/金"）
 */
function extractYellowCount(text) {
  for (const unit of YELLOW_UNITS) {
    // "黄数：N" 或 "黄：N"（优先匹配，避免"等级:80 黄数:40"中80被误匹配）
    let m = text.match(new RegExp(unit + '[数]?[：:]\\s*(\\d+)'));
    if (m) return parseInt(m[1]);
    // "【黄数】:N" 或 "【黄数】：N"（盼之格式）
    m = text.match(new RegExp('【' + unit + '[数]?】\\s*[：:]?\\s*(\\d+)'));
    if (m) return parseInt(m[1]);
    // "黄数\nN"（螃蟹网移动端格式，换行分隔）
    m = text.match(new RegExp(unit + '[数]?\\n\\s*(\\d+)'));
    if (m) return parseInt(m[1]);
  }
  // "N黄" 或 "N金"（放最后，避免误匹配前一个字段的数字）
  for (const unit of YELLOW_UNITS) {
    const m = text.match(new RegExp('(\\d+)\\s*' + unit));
    if (m) return parseInt(m[1]);
  }
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

  // 提取角色（按当前游戏的角色段落关键词，多段落合并、同名取高命）
  for (const kw of CHAR_SECTION_KEYWORDS) {
    const sec = extractSection(text, kw);
    if (!sec) continue;
    for (const c of parseCharacters(sec)) {
      const existing = result.characters.find(x => x.name === c.name);
      if (!existing) result.characters.push(c);
      else if (c.const > existing.const) existing.const = c.const;
    }
  }
  // 回退：直接在全文中查找角色
  if (result.characters.length === 0) {
    result.characters = findCharsInText(text);
  }

  // 提取武器（按当前游戏的武器段落关键词，按顺序回退）
  for (const kw of WEAPON_SECTION_KEYWORDS) {
    const weaponSection = extractSection(text, kw);
    if (weaponSection) {
      result.weapons = parseWeapons(weaponSection);
      if (result.weapons.length > 0) break;
    }
  }

  // 提取资源数量（按当前游戏的资源关键词，key跨游戏一致）
  for (const r of RESOURCES) {
    result[r.key] = extractNumber(text, r.name);
  }

  // 提取黄数
  result.yellowCount = extractYellowCount(text);

  // 提取服饰/皮肤数量（按当前游戏关键词；盼之格式段落可能是纯数字）
  for (const kw of OUTFIT_SECTION_KEYWORDS) {
    if (result.outfitCount > 0) break;
    result.outfitCount = extractListCount(text, kw);
    if (result.outfitCount === 0) {
      const sec = extractSection(text, kw);
      if (sec) {
        const num = parseInt(sec);
        result.outfitCount = isNaN(num) ? extractListCount(text, kw) : num;
      }
    }
  }
  // 摩托/邦布（按当前游戏段落关键词求和；鸣潮摩托饰品单独计数不算车架）
  result.motoCount = MOTO_SECTION_KEYWORDS.reduce((sum, kw) => sum + extractListCount(text, kw), 0);
  result.motoAccessoryCount = MOTO_ACCESSORY_KEYWORDS.reduce((sum, kw) => sum + extractListCount(text, kw), 0);
  result.vehicleFrameCount = extractListCount(text, '车架模组') + extractListCount(text, '车架');
  result.paintCount = extractListCount(text, '涂装');

  // 计算总抽数（按当前游戏资源关键词的换算除数，div=0的资源不计入）
  result.pulls = 0;
  for (const r of RESOURCES) {
    if (r.div > 1) result.pulls += (result[r.key] || 0) / r.div;
    else if (r.div === 1) result.pulls += (result[r.key] || 0);
  }

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
        sigDiscountNotes.push(char.name + '无专武×' + Math.round(_nsDiscount * 100) + '%');
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
  // 优先按当前游戏的等级关键词提取（如鸣潮"联觉等级"、绝区零"绳网等级"），避免误匹配其他含"级"的字段
  let levelMatch = null;
  for (const kw of LEVEL_KEYWORDS) {
    levelMatch = (parsed.rawText || '').match(new RegExp(kw + '[】：:\\s]*(\\d+)'));
    if (levelMatch) break;
  }
  if (!levelMatch) levelMatch = (parsed.rawText || '').match(/等级[：:]\s*(\d+)/) || (parsed.rawText || '').match(/(\d+)级/);
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
        const charSummary = tierChars.map(c => c.name + c.const + CONST_UNIT_DISPLAY).join('/');
        flatDiscountNotes.push('低命折扣系数(' + rule.tiers.join('+') + '级全≤' + rule.maxConst + CONST_UNIT_DISPLAY + ': ' + charSummary + ') ×' + rule.discount);
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
    const normalizedTitle = normalizePlatformText(showTitle);
    const parsed = parseAccountInfo(normalizedTitle);
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
    const constStr = c.const >= 6 ? '满' + CONST_UNIT_DISPLAY : `${c.const}${CONST_UNIT_DISPLAY}`;
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

  return {
    CONFIG_VERSION,
    CHAR_TIERS, SIG_WEAPONS, FULL_CONST_WEIGHT, CHAR_LOOKUP, CHAR_ALIASES,
    SECTION_KEYWORDS, DEFAULT_WEIGHTS, DEFAULT_TEAMS, DEFAULT_PULL_FORMULA,
    DEFAULT_TEAM_MATES, DEFAULT_CHAR_PRICES, DEFAULT_CONST_PREMIUMS,
    DEFAULT_NEED_SIG_WEAPONS,
    LEVEL_KEYWORDS, YELLOW_UNITS, CONST_UNITS, CONST_UNIT_DISPLAY, RESOURCES,
    buildDefaultCharPrices, buildDefaultConstPrices, convertPremiumsToConstPrices,
    buildDefaultTeamPremiums, buildDefaultWeights, getDefaults,
    parseAccountInfo, extractSection, extractNumber, parseCharacters,
    findCharsInText, parseWeapons, extractYellowCount, extractListCount,
    extractListItems, checkHasSigWeapon, calcConstPremium, getCharValue,
    calculatePullValue, getYellowCoeff, getEffectiveYellowCoeff, calculateValue,
    evaluateWithPrice, generateShortDescription, normalizePlatformText,
  };
}

const wuwaEngine = createEngine(WUWA_CONFIG);

module.exports = { createEngine, ...wuwaEngine };
