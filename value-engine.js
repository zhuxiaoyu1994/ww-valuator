/**
 * value-engine.js - 鸣潮账号估值引擎
 * 从油猴脚本移植估值算法，解析 showTitle 文本提取账号信息并计算估值
 */

'use strict';

// ============================================================
// 角色定价配置
// ============================================================
const CHARACTER_PRICES = {
  // S级(50元)
  '爱弥斯': { price: 50, tier: 'S' },
  '绯雪': { price: 60, tier: 'S' },
  '卡提希娅': { price: 35, tier: 'S' },
  // A级(35元)
  '琳奈': { price: 30, tier: 'A' },
  '千咲': { price: 30, tier: 'A' },
  '穗穗': { price: 0, tier: 'A' },
  '莫宁': { price: 30, tier: 'A' },
  '秧秧': { price: 35, tier: 'A' },
  '弗洛洛': { price: 35, tier: 'A' },
  '洛瑟菈': { price: 30, tier: 'A' },
  // B级(25元)
  '达妮娅': { price: 16, tier: 'B' },
  '夏空': { price: 12, tier: 'B' },
  '露西': { price: 30, tier: 'B' },
  '嘉贝莉娜': { price: 20, tier: 'B' },
  '奥古斯塔': { price: 15, tier: 'B' },
  '仇远': { price: 10, tier: 'B' },
  '尤诺': { price: 10, tier: 'B' },
  '陆赫斯': { price: 15, tier: 'B' },
  '赞妮': { price: 10, tier: 'B' },
  '布兰特': { price: 10, tier: 'B' },
  '守岸人': { price: 30, tier: 'B' },
  '西格莉卡': { price: 10, tier: 'B' },
  // C级(5元)
  '露帕': { price: 10, tier: 'C' },
  '珂莱塔': { price: 10, tier: 'C' },
  '菲比': { price: 10, tier: 'C' },
  '坎特蕾拉': { price: 10, tier: 'C' },
  '椿': { price: 10, tier: 'C' },
  // D级(3元)
  '忌炎': { price: 2, tier: 'D' },
  '吟霖': { price: 2, tier: 'D' },
  '相里要': { price: 2, tier: 'D' },
  '今汐': { price: 2, tier: 'D' },
  '长离': { price: 2, tier: 'D' },
  '折枝': { price: 2, tier: 'D' },
  '洛可可': { price: 2, tier: 'D' },
  '丽贝卡': { price: 2, tier: 'D' },
  // E级(2元)
  '维里奈': { price: 0, tier: 'E' },
  '卡卡罗': { price: 0, tier: 'E' },
  '安可': { price: 0, tier: 'E' },
  '凌阳': { price: 0, tier: 'E' },
  '鉴心': { price: 0, tier: 'E' },
};

// ============================================================
// 角色 -> 专武映射表
// ============================================================
const SIGNATURE_WEAPONS = {
  '爱弥斯': '千古洵流',
  '绯雪': '永远的启明星',
  '卡提希娅': '正义的裁决',
  '弗洛洛': '',
  '琳奈': '',
  '守岸人': '',
  '千咲': '',
  '穗穗': '',
  '莫宁': '',
  '达妮娅': '',
  '洛瑟菈': '',
  '夏空': '',
  '忌炎': '浩境长留',
  '吟霖': '穿击者-33',
  '相里要': '飞雷要',
  '今汐': '',
  '长离': '',
  '折枝': '',
  '露西': '蜃影',
  '秧秧': '天之苍苍',
};

// ============================================================
// 满命加权系数（按等级）
// ============================================================
const C6_WEIGHTS = {
  'S': 1.0,
  'A': 0.6,
  'B': 0.3,
  'C': 0.2,
  'D': 0.1,
  'E': 0.1,
};

// 满命溢价档位
const C6_PREMIUM_TIERS = [
  { threshold: 10, bonus: 4.5 }, // 10+ → +450%
  { threshold: 9, bonus: 4.0 },  // 9   → +400%
  { threshold: 8, bonus: 3.5 },  // 8   → +350%
  { threshold: 7, bonus: 3.0 },  // 7   → +300%
  { threshold: 6, bonus: 2.5 },  // 6   → +250%
  { threshold: 5, bonus: 2.0 },  // 5   → +200%
  { threshold: 4, bonus: 1.5 },  // 4   → +150%
  { threshold: 3, bonus: 1.0 },  // 3   → +100%
  { threshold: 2, bonus: 0.5 },  // 2   → +50%
];

// 配队定义（角色名数组）
const TEAM_COMPS = [
  ['绯雪', '洛瑟菈', '千咲'],
  ['奥古斯塔', '尤诺', '守岸人'],
  ['弗洛洛', '坎特蕾拉', '守岸人'],
  ['爱弥斯', '达妮娅', '千咲'],
  ['卡提希娅', '夏空', '千咲'],
  ['露西', '丽贝卡', '守岸人'],
  ['西格莉卡', '仇远', '守岸人'],
  ['嘉贝莉娜', '仇远', '守岸人'],
  ['爱弥斯', '莫宁', '琳奈'],
  ['布兰特', '露帕', '长离'],
  ['赞妮', '菲比', '守岸人'],
];

// 抽数阶梯单价（15档）
const PULL_TIERS = [
  { max: 100, price: 0.8 },
  { max: 200, price: 1.0 },
  { max: 300, price: 1.2 },
  { max: 400, price: 1.4 },
  { max: 500, price: 1.7 },
  { max: 600, price: 2.0 },
  { max: 700, price: 2.3 },
  { max: 800, price: 2.5 },
  { max: 900, price: 2.7 },
  { max: 1000, price: 3.0 },
  { max: 1100, price: 3.2 },
  { max: 1200, price: 3.4 },
  { max: 1300, price: 3.6 },
  { max: 1400, price: 3.8 },
  { max: Infinity, price: 4.0 },
];

// 其他资源定价
const RESOURCE_PRICES = {
  outfit: 2,        // 服饰 元/件
  motorcycle: 0,    // 摩托 元/辆
  carFrame: 10,     // 车架 元/个
  paint: 0,         // 涂装 元/个
};

// 抽数满命加成档位（根据加权满命数）
const PULL_C6_BONUS_TIERS = [
  { threshold: 1, bonus: 0.3 },
  { threshold: 2, bonus: 0.4 },
  { threshold: 3, bonus: 0.5 },
  { threshold: 4, bonus: 0.6 },
  { threshold: 5, bonus: 0.7 },
];

// 默认角色基础定价（按等级）- 用于角色未配置时的回退
const DEFAULT_CHAR_PRICES = {
  S: 50, A: 35, B: 25, C: 5, D: 3, E: 2,
};

// 默认命座溢价配置（按等级）- 直接在计算中使用
const DEFAULT_CONST_PREMIUMS = {
  S: { base: 1.0, perConst: 0.08, c3Extra: 0.1, c6: 3.0 },
  A: { base: 1.0, perConst: 0.08, c3Extra: 0.1, c6: 3.0 },
  B: { base: 1.0, perConst: 0.08, c3Extra: 0.1, c6: 3.0 },
  C: { base: 1.0, perConst: 0.15, c6: 5.0 },
  D: { base: 1.0, perConst: 0.15, c6: 5.0 },
  E: { base: 1.0, perConst: 0.15, c6: 5.0 },
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 获取所有角色名，按长度降序排列（避免短名误匹配）
 */
function getSortedCharacterNames() {
  return Object.keys(CHARACTER_PRICES).sort((a, b) => b.length - a.length);
}

/**
 * 获取所有专武名，按长度降序排列
 */
function getSortedWeaponNames() {
  const weapons = new Set();
  for (const w of Object.values(SIGNATURE_WEAPONS)) {
    if (w) weapons.add(w);
  }
  return Array.from(weapons).sort((a, b) => b.length - a.length);
}

/**
 * 从文本中提取数字
 */
function extractNumber(text) {
  if (!text || typeof text !== 'string') return 0;
  const match = text.match(/(\d[\d,]*)/);
  if (match && match[1]) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return 0;
}

// ============================================================
// 解析 showTitle 文本
// ============================================================

/**
 * 解析账号描述文本，提取角色、武器、资源等信息
 * @param {string} showTitle - 账号描述文本
 * @returns {object} 解析结果
 */
function parseAccountInfo(showTitle) {
  if (!showTitle || typeof showTitle !== 'string') {
    return createEmptyResult();
  }

  const text = showTitle.trim();
  const result = createEmptyResult();

  // 1. 提取资源信息
  extractResources(text, result);

  // 2. 提取角色及命座信息
  extractCharacters(text, result);

  // 3. 提取武器信息
  extractWeapons(text, result);

  return result;
}

/**
 * 创建空结果对象
 */
function createEmptyResult() {
  return {
    characters: [],      // { name, constellation, tier, price, hasSignatureWeapon, weaponName }
    weapons: [],         // { name, refinement }
    starSounds: 0,       // 星声
    moonPhases: 0,       // 月相
    coral: 0,            // 余波珊瑚
    goldenRipples: 0,    // 浮金波纹
    tideRipples: 0,      // 铸潮波纹
    outfits: 0,          // 服饰数量
    motorcycles: 0,      // 摩托数量
    carFrames: 0,        // 车架数量
    paints: 0,           // 涂装数量
    yellowCount: 0,      // 黄数
    rawText: '',
  };
}

/**
 * 从文本中提取资源数量
 * 匹配策略：优先匹配 "数字+资源名"（如"500星声"），其次匹配 "资源名:数字" 或 "资源名数字"
 * 避免匹配到下一个资源的数字
 */
function extractResources(text, result) {
  result.rawText = text;

  // 星声
  result.starSounds = extractResourceNumber(text, '星声');

  // 月相
  result.moonPhases = extractResourceNumber(text, '月相');

  // 余波珊瑚
  result.coral = extractResourceNumber(text, '余波珊瑚');

  // 浮金波纹
  result.goldenRipples = extractResourceNumber(text, '浮金波纹');

  // 铸潮波纹
  result.tideRipples = extractResourceNumber(text, '铸潮波纹');

  // 服饰
  result.outfits = extractResourceNumber(text, '服饰', '件');

  // 摩托 / 摩托车
  let motoVal = extractResourceNumber(text, '摩托车', '辆');
  if (motoVal === 0) motoVal = extractResourceNumber(text, '摩托', '辆');
  result.motorcycles = motoVal;

  // 车架
  result.carFrames = extractResourceNumber(text, '车架');

  // 涂装
  result.paints = extractResourceNumber(text, '涂装');

  // 黄数 - 支持 "黄数XXX", "XXX黄数", "XXX黄"
  let ym = text.match(/(\d[\d,]*)\s*黄数/);
  if (ym) {
    result.yellowCount = extractNumber(ym[1]);
  } else {
    ym = text.match(/黄数[：:](\d[\d,]*)/);
    if (ym) {
      result.yellowCount = extractNumber(ym[1]);
    } else {
      ym = text.match(/黄数(\d[\d,]*)/);
      if (ym) {
        result.yellowCount = extractNumber(ym[1]);
      } else {
        // "XXX黄" 后面需要跟空格/标点/结尾，避免误匹配"黄数"中的"黄"
        ym = text.match(/(\d[\d,]*)\s*黄(?:\s|$|，|,|。|\.|件|辆)/);
        if (ym) result.yellowCount = extractNumber(ym[1]);
      }
    }
  }
}

/**
 * 通用资源数字提取
 * 优先匹配 "数字+资源名"（如"500星声"），其次匹配 "资源名:数字" 或 "资源名数字"
 * @param {string} text - 全文
 * @param {string} resName - 资源名（如"星声"）
 * @param {string} suffix - 单位后缀（如"件"、"辆"），可选
 * @returns {number} 提取到的数字
 */
function extractResourceNumber(text, resName, suffix) {
  suffix = suffix || '';
  const escapedName = resName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 1. 优先匹配 "数字 资源名" 如 "500星声" 或 "500 星声"
  let m = text.match(new RegExp('(\\d[\\d,]*)\\s*' + escapedName + escSuffix + '?'));
  if (m) return extractNumber(m[1]);

  // 1b. 匹配 "数字 单位 资源名" 如 "3件服饰" 或 "2辆摩托"
  if (suffix) {
    m = text.match(new RegExp('(\\d[\\d,]*)\\s*' + escSuffix + '\\s*' + escapedName));
    if (m) return extractNumber(m[1]);
  }

  // 2. 匹配 "资源名:数字" 或 "资源名：数字"
  m = text.match(new RegExp(escapedName + '[：:](\\d[\\d,]*)'));
  if (m) return extractNumber(m[1]);

  // 3. 匹配 "资源名数字" (紧跟，无空格) 如 "服饰3件" 或 "星声500"
  m = text.match(new RegExp(escapedName + '(\\d[\\d,]*)' + escSuffix + '?'));
  if (m) return extractNumber(m[1]);

  // 3b. 匹配 "资源名 数字 单位" 如 "服饰 3件"
  if (suffix) {
    m = text.match(new RegExp(escapedName + '\\s*(\\d[\\d,]*)\\s*' + escSuffix));
    if (m) return extractNumber(m[1]);
  }

  return 0;
}

/**
 * 从文本中提取角色及命座信息
 * 支持格式:
 *   "满命椿", "0命忌炎", "6命卡提希娅"
 *   "椿(满命)", "忌炎(0命)", "卡提希娅(C6)"
 *   "满命椿+专武", "0命忌炎(浩境长留)"
 */
function extractCharacters(text, result) {
  const charNames = getSortedCharacterNames();
  const foundChars = [];
  const matchedPositions = [];

  // 查找所有角色名在文本中的位置
  for (const name of charNames) {
    let searchStart = 0;
    while (true) {
      const idx = text.indexOf(name, searchStart);
      if (idx === -1) break;

      // 检查是否与已匹配的角色重叠
      const end = idx + name.length;
      let overlaps = false;
      for (const pos of matchedPositions) {
        if (idx < pos.end && end > pos.start) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        matchedPositions.push({ start: idx, end, name });
      }
      searchStart = idx + 1;
    }
  }

  // 按位置排序
  matchedPositions.sort((a, b) => a.start - b.start);

  // 为每个角色提取命座和专武信息
  for (let i = 0; i < matchedPositions.length; i++) {
    const pos = matchedPositions[i];
    const charInfo = CHARACTER_PRICES[pos.name];
    const sigWeapon = SIGNATURE_WEAPONS[pos.name] || '';

    // 提取命座
    const constellation = extractConstellation(text, pos, i > 0 ? matchedPositions[i - 1] : null);

    // 提取专武信息
    let hasSignatureWeapon = false;
    let weaponName = '';

    // 查看角色名后面的文本（到下一个角色名之前）
    const nextStart = i + 1 < matchedPositions.length ? matchedPositions[i + 1].start : text.length;
    const afterText = text.substring(pos.end, nextStart);
    const beforeText = i > 0 ? text.substring(matchedPositions[i - 1].end, pos.start) : text.substring(0, pos.start);

    // 检查 "专武" 关键词
    if (afterText.includes('专武') || beforeText.includes('专武')) {
      hasSignatureWeapon = !!sigWeapon;
      weaponName = sigWeapon;
    }

    // 检查是否包含专武名称
    if (sigWeapon) {
      if (text.includes(sigWeapon)) {
        hasSignatureWeapon = true;
        weaponName = sigWeapon;
      }
    }

    foundChars.push({
      name: pos.name,
      constellation,
      tier: charInfo.tier,
      price: charInfo.price,
      hasSignatureWeapon,
      weaponName,
    });
  }

  result.characters = foundChars;
}

/**
 * 提取角色的命座数
 * 支持: 满命/C6/6命/0命/C0/1命 等
 */
function extractConstellation(text, currentPos, prevPos) {
  // 角色名前面的文本（从上一个角色名结束到当前角色名开始）
  const lookStart = prevPos ? prevPos.end : Math.max(0, currentPos.start - 10);
  const beforeText = text.substring(lookStart, currentPos.start);

  // 角色名后面的文本（检查括号内命座）
  const afterText = text.substring(currentPos.end, Math.min(text.length, currentPos.end + 10));

  // 检查括号内命座: "椿(满命)", "忌炎(0命)", "卡提希娅(C6)"
  const parenMatch = afterText.match(/^\s*[（(]\s*(满命|满|0|1|2|3|4|5|6|C0|C1|C2|C3|C4|C5|C6|c0|c1|c2|c3|c4|c5|c6)\s*命?\s*[）)]/);
  if (parenMatch) {
    return parseConstellationValue(parenMatch[1]);
  }

  // 检查前面的命座: "满命椿", "0命忌炎", "6命卡提希娅", "C6椿"
  const beforeMatch = beforeText.match(/(满命|满|0命|1命|2命|3命|4命|5命|6命|0|1|2|3|4|5|6|C0|C1|C2|C3|C4|C5|C6|c0|c1|c2|c3|c4|c5|c6)\s*$/);
  if (beforeMatch) {
    return parseConstellationValue(beforeMatch[1]);
  }

  // 默认 0 命
  return 0;
}

/**
 * 解析命座值
 */
function parseConstellationValue(str) {
  str = str.trim();
  if (str === '满命' || str === '满') return 6;
  // C0-C6 / c0-c6
  const cMatch = str.match(/^[Cc](\d)$/);
  if (cMatch) return parseInt(cMatch[1], 10);
  // 0命-6命 / 0-6
  const numMatch = str.match(/^(\d)/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return 0;
}

/**
 * 从文本中提取武器及精炼信息
 */
function extractWeapons(text, result) {
  const weaponNames = getSortedWeaponNames();
  const foundWeapons = [];

  for (const wName of weaponNames) {
    if (text.includes(wName)) {
      // 查找精炼等级
      let refinement = 1;
      const nearbyText = text.substring(
        Math.max(0, text.indexOf(wName) - 5),
        Math.min(text.length, text.indexOf(wName) + wName.length + 10)
      );
      const refineMatch = nearbyText.match(/精(\d|满)/);
      if (refineMatch) {
        refinement = refineMatch[1] === '满' ? 5 : parseInt(refineMatch[1], 10);
      }
      foundWeapons.push({ name: wName, refinement });
    }
  }

  result.weapons = foundWeapons;
}

// ============================================================
// 估值计算
// ============================================================

/**
 * 计算单个角色的价值
 * @param {object} char - 角色信息
 * @returns {number} 角色价值
 */
function calculateCharacterValue(char) {
  const { tier, constellation, hasSignatureWeapon } = char;
  const isHot = ['S', 'A', 'B'].includes(tier);
  const isCold = ['C', 'D', 'E'].includes(tier);

  // 角色基础价格：优先使用角色独立定价，否则回退到等级默认定价
  const price = (char.price !== undefined && char.price !== null)
    ? char.price
    : (DEFAULT_CHAR_PRICES[tier] || 0);

  // 命座溢价配置：使用默认配置
  const constConfig = DEFAULT_CONST_PREMIUMS[tier] || { base: 1.0, perConst: 0.1, c6: 3.0 };

  let constellationMultiplier;
  let weaponMultiplier;

  if (isHot) {
    // 热门角色 (S/A/B级)
    if (constellation === 0) {
      constellationMultiplier = constConfig.base;
    } else if (constellation <= 2) {
      constellationMultiplier = constConfig.base + (constConfig.perConst || 0.08) * constellation;
    } else if (constellation <= 5) {
      // C3-C5 额外加成
      constellationMultiplier = constConfig.base + (constConfig.perConst || 0.08) * constellation + (constConfig.c3Extra || 0.1) * (constellation - 2);
    } else {
      // C6 (满命)
      constellationMultiplier = constConfig.c6 || 3.0;
    }

    // 专武倍率：有专武=1.0, 无专武=0.5（从0.15改为0.5）
    weaponMultiplier = hasSignatureWeapon ? 1.0 : 0.5;

    // C6 有专武额外倍率
    if (constellation === 6 && hasSignatureWeapon) {
      weaponMultiplier = 1.3;
    }
    // C6 无专武倍率：0.5（从0.25改为0.5）
  } else if (isCold) {
    // 冷门角色 (C/D/E级) - 命座线性递增
    constellationMultiplier = constConfig.base + (constConfig.perConst || 0.15) * constellation;
    if (constellation === 6) {
      // C6: 5倍
      constellationMultiplier = constConfig.c6 || 5.0;
    }

    // 专武倍率（保持不变）
    weaponMultiplier = hasSignatureWeapon ? 1.0 : 0.5;
  } else {
    constellationMultiplier = constConfig.base;
    weaponMultiplier = hasSignatureWeapon ? 1.0 : 0.3;
  }

  return price * constellationMultiplier * weaponMultiplier;
}

/**
 * 计算满命多角色溢价
 * @param {array} characters - 角色列表
 * @param {number} baseValue - 基础角色总价值
 * @returns {number} 溢价金额
 */
function calculateC6Premium(characters, baseValue) {
  // 计算加权满命计数
  let weightedC6 = 0;
  for (const char of characters) {
    if (char.constellation === 6) {
      weightedC6 += C6_WEIGHTS[char.tier] || 0.1;
    }
  }

  // 查找适用的溢价档位
  for (const tier of C6_PREMIUM_TIERS) {
    if (weightedC6 >= tier.threshold) {
      return baseValue * tier.bonus;
    }
  }

  return 0;
}

/**
 * 计算配队溢价
 * @param {array} characters - 角色列表
 * @param {number} baseValue - 基础角色总价值
 * @returns {number} 溢价金额
 */
function calculateTeamCompPremium(characters, baseValue) {
  const charNames = new Set(characters.map(c => c.name));
  let teamsFormed = 0;

  for (const team of TEAM_COMPS) {
    const allPresent = team.every(name => charNames.has(name));
    if (allPresent) {
      teamsFormed++;
    }
  }

  if (teamsFormed === 0) return 0;

  // 第一个配队：队员价值 x 0.2
  // 多个配队：额外 x 1.1^(teamsFormed-1)
  let premium = baseValue * 0.2;
  if (teamsFormed > 1) {
    premium *= Math.pow(1.1, teamsFormed - 1);
  }

  return premium;
}

/**
 * 计算抽数价值（阶梯单价）
 * @param {number} pulls - 抽数
 * @returns {number} 抽数价值
 */
function calculatePullValue(pulls) {
  if (pulls <= 0) return 0;

  let value = 0;
  let remaining = pulls;
  let prevMax = 0;

  for (const tier of PULL_TIERS) {
    const tierRange = tier.max - prevMax;
    if (remaining <= 0) break;

    const tierPulls = Math.min(remaining, tierRange);
    value += tierPulls * tier.price;
    remaining -= tierPulls;
    prevMax = tier.max;
  }

  return value;
}

/**
 * 计算其他资源价值
 * @param {object} info - 解析结果
 * @returns {number} 资源价值
 */
function calculateResourceValue(info) {
  let value = 0;

  // 星声: 每1000星声约值2元
  value += (info.starSounds / 1000) * 2;

  // 月相: 每100月相约值5元
  value += (info.moonPhases / 100) * 5;

  // 余波珊瑚: 每个0.5元
  value += info.coral * 0.5;

  // 浮金波纹: 每个0.3元
  value += info.goldenRipples * 0.3;

  // 铸潮波纹: 每个0.3元
  value += info.tideRipples * 0.3;

  // 服饰
  value += info.outfits * RESOURCE_PRICES.outfit;

  // 摩托
  value += info.motorcycles * RESOURCE_PRICES.motorcycle;

  // 车架
  value += info.carFrames * RESOURCE_PRICES.carFrame;

  // 涂装
  value += info.paints * RESOURCE_PRICES.paint;

  return value;
}

/**
 * 计算黄数系数
 * @param {number} yellowCount - 黄数
 * @returns {number} 系数
 */
function calculateYellowMultiplier(yellowCount) {
  if (yellowCount <= 0) return 1.0;
  if (yellowCount <= 10) return 1.0 + yellowCount * 0.005;      // 0-10: 1.0~1.05
  if (yellowCount <= 50) return 1.05 + (yellowCount - 10) * 0.003; // 10-50: 1.05~1.17
  if (yellowCount <= 100) return 1.17 + (yellowCount - 50) * 0.004; // 50-100: 1.17~1.37
  if (yellowCount <= 200) return 1.37 + (yellowCount - 100) * 0.002; // 100-200: 1.37~1.57
  return 1.57 + (yellowCount - 200) * 0.001;                     // 200+: 缓慢增长
}

// ============================================================
// 主估值函数
// ============================================================

/**
 * 计算账号估值
 * @param {string} showTitle - 账号描述文本
 * @returns {object} 估值结果
 */
function evaluateAccount(showTitle) {
  const info = parseAccountInfo(showTitle);

  // 1. 角色基础价值
  let characterValue = 0;
  const charDetails = [];
  for (const char of info.characters) {
    const value = calculateCharacterValue(char);
    characterValue += value;
    charDetails.push({
      ...char,
      value: Math.round(value * 100) / 100,
    });
  }

  // 2. 满命多角色溢价
  const c6Premium = calculateC6Premium(info.characters, characterValue);

  // 3. 配队溢价
  const teamPremium = calculateTeamCompPremium(info.characters, characterValue);

  // 4. 抽数价值
  const basePullValue = calculatePullValue(info.yellowCount);

  // 4b. 抽数满命加成：根据加权满命数应用抽数加成系数
  let weightedC6ForPull = 0;
  for (const char of info.characters) {
    if (char.constellation === 6) {
      weightedC6ForPull += C6_WEIGHTS[char.tier] || 0.1;
    }
  }
  let pullC6Bonus = 0;
  for (let i = PULL_C6_BONUS_TIERS.length - 1; i >= 0; i--) {
    if (weightedC6ForPull >= PULL_C6_BONUS_TIERS[i].threshold) {
      pullC6Bonus = PULL_C6_BONUS_TIERS[i].bonus;
      break;
    }
  }
  // 抽数总价值 = 基础抽数价值 * (1 + 加成系数)
  const pullValue = basePullValue * (1 + pullC6Bonus);

  // 5. 其他资源价值
  const resourceValue = calculateResourceValue(info);

  // 汇总基础价值
  const baseTotal = characterValue + c6Premium + teamPremium + pullValue + resourceValue;

  // 6. 黄数系数
  const yellowMultiplier = calculateYellowMultiplier(info.yellowCount);

  // 最终估值
  const finalValue = baseTotal * yellowMultiplier;

  return {
    info,
    details: {
      characterValue: Math.round(characterValue * 100) / 100,
      c6Premium: Math.round(c6Premium * 100) / 100,
      teamPremium: Math.round(teamPremium * 100) / 100,
      pullValue: Math.round(pullValue * 100) / 100,
      pullC6Bonus: Math.round(pullC6Bonus * 100) / 100,
      weightedC6: Math.round(weightedC6ForPull * 100) / 100,
      resourceValue: Math.round(resourceValue * 100) / 100,
      baseTotal: Math.round(baseTotal * 100) / 100,
      yellowMultiplier: Math.round(yellowMultiplier * 1000) / 1000,
      finalValue: Math.round(finalValue * 100) / 100,
      characters: charDetails,
    },
  };
}

/**
 * 计算性价比
 * @param {string} showTitle - 账号描述文本
 * @param {number} priceInCents - 标价（分）
 * @returns {object} 包含估值和性价比的结果
 */
function evaluateWithPrice(showTitle, priceInCents) {
  const evaluation = evaluateAccount(showTitle);
  const priceInYuan = priceInCents / 100;

  let costPerformance = 0;
  if (priceInYuan > 0) {
    costPerformance = ((evaluation.details.finalValue - priceInYuan) / priceInYuan) * 100;
  }

  return {
    ...evaluation,
    priceInYuan,
    costPerformance: Math.round(costPerformance * 100) / 100,
  };
}

/**
 * 生成账号简短描述（用于通知）
 * @param {object} evaluation - 估值结果
 * @returns {string} 简短描述
 */
function generateShortDescription(evaluation) {
  const chars = evaluation.details.characters;
  if (chars.length === 0) return '无已知角色';

  // 取价值最高的前5个角色
  const topChars = [...chars].sort((a, b) => b.value - a.value).slice(0, 5);
  const parts = topChars.map(c => {
    const constStr = c.constellation === 6 ? '满命' : `${c.constellation}命`;
    const weaponStr = c.hasSignatureWeapon ? '+专武' : '';
    return `${constStr}${c.name}${weaponStr}`;
  });

  let desc = parts.join(', ');
  if (evaluation.info.yellowCount > 0) {
    desc += ` | ${evaluation.info.yellowCount}黄`;
  }
  return desc;
}

// ============================================================
// 导出
// ============================================================
module.exports = {
  CHARACTER_PRICES,
  SIGNATURE_WEAPONS,
  C6_WEIGHTS,
  C6_PREMIUM_TIERS,
  PULL_C6_BONUS_TIERS,
  PULL_TIERS,
  TEAM_COMPS,
  RESOURCE_PRICES,
  DEFAULT_CHAR_PRICES,
  DEFAULT_CONST_PREMIUMS,
  parseAccountInfo,
  evaluateAccount,
  evaluateWithPrice,
  generateShortDescription,
  calculateCharacterValue,
  calculateC6Premium,
  calculateTeamCompPremium,
  calculatePullValue,
  calculateResourceValue,
  calculateYellowMultiplier,
};
