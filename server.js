const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

/* ======================== 角色价格数据库 ======================== */
const CHAR_TIERS = {
  S: { label: 'S级 热门人权', price: 50, isHot: true,  chars: ['爱弥斯', '绯雪', '卡提希娅', '弗洛洛'] },
  A: { label: 'A级 热门限定', price: 35, isHot: true,  chars: ['琳奈', '守岸人', '千咲', '穗穗', '莫宁'] },
  B: { label: 'B级 温门核心', price: 25, isHot: true,  chars: ['达妮娅', '洛瑟菈', '夏空'] },
  C: { label: 'C级 冷门限定', price: 5,  isHot: false, chars: ['布兰特', '露帕', '珂莱塔', '菲比', '赞妮', '尤诺', '陆赫斯', '坎特蕾拉', '仇远', '奥古斯塔', '嘉贝莉娜', '西格莉卡', '丽贝卡', '露西', '椿'] },
  D: { label: 'D级 退环境', price: 3,   isHot: false, chars: ['忌炎', '吟霖', '相里要', '今汐', '长离', '折枝', '洛可可'] },
  E: { label: 'E级 常驻五星', price: 2, isHot: false, chars: ['维里奈', '卡卡罗', '安可', '凌阳', '鉴心'] },
};

function getCharTier(name) {
  for (const key of Object.keys(CHAR_TIERS)) {
    if (CHAR_TIERS[key].chars.includes(name)) return { key, ...CHAR_TIERS[key] };
  }
  return null;
}

function buildDefaultCharPrices() {
  const prices = {};
  for (const tier of Object.keys(CHAR_TIERS)) {
    for (const name of CHAR_TIERS[tier].chars) {
      prices[name] = CHAR_TIERS[tier].price;
    }
  }
  return prices;
}

/* ======================== 专武匹配表 ======================== */
const CHAR_SIGNATURE_WEAPONS = {
  '忌炎': '苍鳞千嶂',
  '吟霖': '掣傀之手',
  '卡卡罗': '无',
  '安可': '无',
  '维里奈': '无',
  '凌阳': '无',
  '今汐': '时和岁稔',
  '长离': '赫奕流明',
  '相里要': '诸方玄枢',
  '椿': '裁春',
  '珂莱塔': '死与舞',
  '折枝': '琼枝冰绡',
  '守岸人': '星序协响',
  '洛瑟菈': '存帧',
  '莫宁': '宙算仪轨',
  '千咲': '昙切',
  '爱弥斯': '永远的启明星',
  '弗洛洛': '幽冥的忘忧章',
  '卡提希娅': '不屈命定之冠',
  '尤诺': '万物持存的注释',
  '夏空': '林间的咏叹调',
  '赞妮': '焰光裁定',
  '坎特蕾拉': '海的呢喃',
  '仇远': '裁竹',
  '布兰特': '不灭航路',
  '露帕': '焰痕',
  '奥古斯塔': '驭冕铸雷之权',
  '嘉贝莉娜': '光影双生',
  '西格莉卡': '昭日译注',
  '灯灯': '存帧',
  '达妮娅': '赝作的矮星',
  '菲比': '和光回唱',
  '绯雪': '灼霜',
  '琳奈': '溢彩荧辉',
  '丽贝卡': '碎骨',
  '陆赫斯': '白昼之脊',
  '秧秧玄翎': '白昼之脊',
  '秧秧': '白昼之脊',
  '穗穗': '栖霞饮露',
};

/* ======================== 默认配置 ======================== */
const CONFIG = {
  weights: {
    fiveStarWeapon: 0,
    weaponRefineBonus: 2,
    outfit: 2,
    motoAccessory: 0,
    motoFrame: 10,
    paint: 0,
    hotC0Mult: 1,
    hotC3Mult: 2,
    hotC6Mult: 3,
    hotStepMult: 0.08,
    hotNoSigMult: 0.15,
    hotNoSigC6Mult: 0.25,
    c6TierWeights: { S: 1, A: 0.8, B: 0.6, C: 0.4, D: 0.2 },
    c6MultiBonus: [
      { count: 2, bonus: 0.5 },
      { count: 3, bonus: 1 },
      { count: 4, bonus: 1.5 },
      { count: 5, bonus: 2 },
    ],
    coldStep: 0,
    coldC3Bonus: 0,
    coldC6Bonus: 0,
    coldSigBonus: 0,
    teamMultiBonus: [
      { count: 2, coef: 1.1 },
      { count: 3, coef: 1.2 },
      { count: 4, coef: 1.3 },
      { count: 5, coef: 1.4 },
      { count: 6, coef: 1.5 },
    ],
  },
  thresholds: { great: 100, good: 30 },
  charPrices: {
    '爱弥斯': 50, '绯雪': 60, '卡提希娅': 30, '弗洛洛': 30, '琳奈': 30,
    '守岸人': 30, '千咲': 30, '穗穗': 0, '莫宁': 30, '秧秧玄翎': 50,
    '达妮娅': 16, '洛瑟菈': 16, '夏空': 12, '布兰特': 10, '露帕': 10,
    '珂莱塔': 10, '菲比': 10, '赞妮': 10, '尤诺': 10, '陆赫斯': 10,
    '坎特蕾拉': 10, '仇远': 10, '奥古斯塔': 10, '嘉贝莉娜': 10, '西格莉卡': 10,
    '丽贝卡': 2, '露西': 10, '椿': 10, '忌炎': 2, '吟霖': 2,
    '相里要': 2, '今汐': 2, '长离': 2, '折枝': 2, '洛可可': 2,
    '维里奈': 0, '卡卡罗': 0, '安可': 0, '凌阳': 0, '鉴心': 0,
  },
  constPremiums: {
    '爱弥斯': { '3': 40, '6': 200 },
    '绯雪': { '2': 50, '3': 100, '6': 200 },
    '卡提希娅': { '2': 20, '3': 30, '6': 100 },
    '弗洛洛': { '2': 20, '6': 100 },
    '奥古斯塔': { '6': 100 },
    '尤诺': { '6': 100 },
    '露西': { '6': 100 },
    '忌炎': { '6': 50 },
    '守岸人': { '6': 50 },
    '赞妮': { '6': 100 },
    '椿': { '6': 50 },
    '莫宁': { '1': 20 },
    '珂莱塔': { '6': 50 },
    '秧秧玄翎': { '3': 100, '6': 200 },
  },
  teamPremiums: {
    '绯雪队': { chars: ['绯雪', '洛瑟菈', '千咲'], multiplier: 1.5, enabled: true },
    '日月队': { chars: ['奥古斯塔', '尤诺', '守岸人'], multiplier: 1.5, enabled: true },
    '弗坎队': { chars: ['弗洛洛', '坎特蕾拉', '守岸人'], multiplier: 1.5, enabled: true },
    '小爱聚爆队': { chars: ['爱弥斯', '达妮娅', '千咲'], multiplier: 1.5, enabled: true },
    '卡夏千': { chars: ['卡提希娅', '夏空', '千咲'], multiplier: 1.5, enabled: true },
    '小爱震协队': { chars: ['爱弥斯', '莫宁', '琳奈'], multiplier: 1.5, enabled: true },
    '露西丽贝卡': { chars: ['露西', '丽贝卡', '守岸人'], multiplier: 1.5, enabled: true },
  },
  pullTiers: [
    { minPull: 0, maxPull: 100, perPullPrice: 0.8 },
    { minPull: 100, maxPull: 200, perPullPrice: 0.9 },
    { minPull: 200, maxPull: 400, perPullPrice: 1 },
    { minPull: 400, maxPull: 500, perPullPrice: 1.2 },
    { minPull: 500, maxPull: 700, perPullPrice: 1.5 },
    { minPull: 700, maxPull: 1000, perPullPrice: 2 },
    { minPull: 1000, maxPull: Infinity, perPullPrice: 3 },
  ],
  yellowTiers: [
    { minYellow: 0, maxYellow: 10, coefficient: 0.3 },
    { minYellow: 10, maxYellow: 20, coefficient: 0.6 },
    { minYellow: 20, maxYellow: 30, coefficient: 0.7 },
    { minYellow: 30, maxYellow: 40, coefficient: 0.8 },
    { minYellow: 40, maxYellow: 50, coefficient: 0.9 },
    { minYellow: 50, maxYellow: 60, coefficient: 1 },
    { minYellow: 60, maxYellow: 70, coefficient: 1.05 },
    { minYellow: 70, maxYellow: 80, coefficient: 1.1 },
    { minYellow: 80, maxYellow: 90, coefficient: 1.15 },
    { minYellow: 90, maxYellow: Infinity, coefficient: 1.2 },
  ],
};

/* ======================== 估值计算函数 ======================== */

function calcHotCharValue(basePrice, constCount, hasSig, w) {
  const c0Mult = w.hotC0Mult ?? 1.0;
  const c3Mult = w.hotC3Mult ?? 2.0;
  const c6Mult = w.hotC6Mult ?? 3.0;
  const stepMult = w.hotStepMult ?? 0.08;
  const noSigMult = w.hotNoSigMult ?? 0.15;
  const noSigC6Mult = w.hotNoSigC6Mult ?? 0.25;

  if (!hasSig) {
    if (constCount >= 6) {
      return { value: Math.round(basePrice * noSigC6Mult), mult: noSigC6Mult, note: 'C6无专武' };
    }
    return { value: Math.round(basePrice * noSigMult), mult: noSigMult, note: '无专武' };
  }

  let mult = c0Mult;
  let note = 'C0+专武';
  if (constCount >= 6) {
    mult = c6Mult; note = 'C6+专武';
  } else if (constCount >= 3) {
    mult = c3Mult; note = 'C3+专武';
  } else if (constCount >= 1) {
    mult = c0Mult + constCount * stepMult;
    note = `C${constCount}+专武`;
  }
  return { value: Math.round(basePrice * mult), mult, note };
}

function calcColdCharValue(basePrice, constCount, hasSig, w) {
  const coldStep = w.coldStep ?? 1;
  const coldC3Bonus = w.coldC3Bonus ?? 3;
  const coldC6Bonus = w.coldC6Bonus ?? 5;
  const coldSigBonus = w.coldSigBonus ?? 2;

  let value = basePrice + constCount * coldStep;
  let note = `基础${basePrice}`;
  if (constCount > 0) note += `+${constCount}命×${coldStep}`;
  if (constCount >= 3) { value += coldC3Bonus; note += `+C3加${coldC3Bonus}`; }
  if (constCount >= 6) { value += coldC6Bonus; note += `+C6加${coldC6Bonus}`; }
  if (hasSig) { value += coldSigBonus; note += `+专武${coldSigBonus}`; }
  return { value, mult: null, note };
}

function parseAccountInfo(desc) {
  const info = {
    level: 0, yellow: 0, astrite: 0, moonPhase: 0,
    coral: 0, goldRipple: 0, tideRipple: 0,
    fiveStarChars: 0, constellations: 0, maxConstChars: 0,
    fourStarChars: 0, fiveStarWeapons: 0,
    charDetails: [],
    weaponDetails: [],
    outfits: [],
    motoAccessories: [],
    motoFrames: [],
    paints: [],
    hasSignatureWeapons: [],
  };

  const m = (re) => { const r = desc.match(re); return r ? parseInt(r[1]) : 0; };

  info.level = m(/(\d+)级/);
  info.yellow = m(/(\d+)黄/);
  info.astrite = m(/星声[：:](\d+)/);
  info.moonPhase = m(/月相[：:](\d+)/);
  info.coral = m(/余波珊瑚[：:](\d+)/);
  info.goldRipple = m(/浮金波纹[：:](\d+)/);
  info.tideRipple = m(/铸潮波纹[：:](\d+)/);
  info.fourStarChars = m(/(\d+)个四星角色/);
  info.fiveStarWeapons = m(/(\d+)个五星武器/);

  const fsMatch = desc.match(/(?:(\d+)个)?五星角色[：:]\s*([^；;【]+)/);
  if (fsMatch) {
    info.fiveStarChars = parseInt(fsMatch[1]) || 0;
    const charList = fsMatch[2].split(/[,，]/).map(s => s.trim()).filter(Boolean);
    for (const item of charList) {
      if (item.includes('满命')) {
        info.maxConstChars++;
        info.constellations += 6;
        info.charDetails.push({ name: item.replace('满命', ''), const: 6 });
      } else {
        const cMatch = item.match(/(\d+)命(.+)/);
        if (cMatch) {
          info.constellations += parseInt(cMatch[1]);
          info.charDetails.push({ name: cMatch[2], const: parseInt(cMatch[1]) });
        } else {
          info.charDetails.push({ name: item, const: 0 });
        }
      }
    }
  }

  const weaponMatch = desc.match(/(?:\d+个)?五星武器[：:]\s*([^；;【]+)/);
  if (weaponMatch) {
    const weaponList = weaponMatch[1].split(/[,，]/).map(s => s.trim()).filter(Boolean);
    for (const w of weaponList) {
      const rMatch = w.match(/精(\d+)(.+)/);
      if (rMatch) {
        info.weaponDetails.push({ name: rMatch[2], refine: parseInt(rMatch[1]) });
      } else {
        info.weaponDetails.push({ name: w.replace(/^精\d*/, ''), refine: 1 });
      }
    }
  }

  const outfitMatch = desc.match(/服饰[：:]\s*([^；;【]+)/);
  if (outfitMatch) info.outfits = outfitMatch[1].split(/[,，]/).map(s => s.trim()).filter(Boolean);

  const motoMatch = desc.match(/摩托饰品[：:]\s*([^；;【]+)/);
  if (motoMatch) info.motoAccessories = motoMatch[1].split(/[,，]/).map(s => s.trim()).filter(Boolean);

  const frameMatch = desc.match(/车架模组[：:]\s*([^；;【]+)/);
  if (frameMatch) info.motoFrames = frameMatch[1].split(/[,，]/).map(s => s.trim()).filter(Boolean);

  const paintMatch = desc.match(/涂装[：:]\s*([^；;【]+)/);
  if (paintMatch) info.paints = paintMatch[1].split(/[,，]/).map(s => s.trim()).filter(Boolean);

  // 匹配专武
  const weaponNames = info.weaponDetails.map(w => w.name);
  for (const cd of info.charDetails) {
    const sigWeapon = CHAR_SIGNATURE_WEAPONS[cd.name];
    if (sigWeapon && sigWeapon !== '无' && weaponNames.includes(sigWeapon)) {
      info.hasSignatureWeapons.push(cd.name);
    }
  }

  // 去重：同名角色只保留命座最高的一个
  const deduped = [];
  for (const cd of info.charDetails) {
    const existing = deduped.find(d => d.name === cd.name);
    if (existing) {
      if (cd.const > existing.const) Object.assign(existing, cd);
    } else {
      deduped.push(cd);
    }
  }
  info.charDetails = deduped;
  info.fiveStarChars = deduped.length;
  info.maxConstChars = deduped.filter(d => d.const >= 6).length;
  info.hasSignatureWeapons = [...new Set(info.hasSignatureWeapons)];

  return info;
}

function calcConstPremium(charName, constCount) {
  const premiums = CONFIG.constPremiums || {};
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

function calcTeamPremiums(charNames) {
  const teamConfig = CONFIG.teamPremiums || {};
  const matchedTeams = [];
  for (const teamName of Object.keys(teamConfig)) {
    const team = teamConfig[teamName];
    if (!team || team.enabled === false) continue;
    const required = team.chars || [];
    if (required.length === 0) continue;
    const hasAll = required.every(c => charNames.includes(c));
    if (hasAll) {
      matchedTeams.push({ name: teamName, chars: required, multiplier: team.multiplier || 1.0 });
    }
  }
  return { matchedTeams };
}

function calcPullValue(info) {
  const pulls = info.astrite / 160 + info.moonPhase / 160 + info.coral / 8 + info.tideRipple;
  const tiers = CONFIG.pullTiers || [];
  let matchedTier = tiers[0] || { minPull: 0, maxPull: Infinity, perPullPrice: 0.8 };
  for (const tier of tiers) {
    const maxPull = (tier.maxPull == null || tier.maxPull === Infinity) ? Infinity : tier.maxPull;
    if (pulls >= tier.minPull && pulls < maxPull) {
      matchedTier = { ...tier, maxPull };
      break;
    }
  }
  const tierLabel = matchedTier.maxPull === Infinity
    ? `${matchedTier.minPull}抽+`
    : `${matchedTier.minPull}~${matchedTier.maxPull}抽`;
  return {
    pulls: Math.round(pulls),
    perPull: matchedTier.perPullPrice,
    tierLabel,
    total: Math.round(pulls * matchedTier.perPullPrice),
  };
}

function calcYellowMultiplier(info) {
  const yellowCount = info.yellow || (info.charDetails.length + info.weaponDetails.length);
  const tiers = CONFIG.yellowTiers || [];
  let matchedTier = tiers[0] || { minYellow: 0, maxYellow: Infinity, coefficient: 0.5 };
  for (const tier of tiers) {
    const maxYellow = (tier.maxYellow == null || tier.maxYellow === Infinity) ? Infinity : tier.maxYellow;
    if (yellowCount >= tier.minYellow && yellowCount < maxYellow) {
      matchedTier = { ...tier, maxYellow };
      break;
    }
  }
  const tierLabel = matchedTier.maxYellow === Infinity
    ? `${matchedTier.minYellow}黄+`
    : `${matchedTier.minYellow}~${matchedTier.maxYellow}黄`;
  return { yellowCount, coefficient: matchedTier.coefficient, tierLabel };
}

function calculateValue(info) {
  const w = CONFIG.weights;
  const charPrices = CONFIG.charPrices || {};

  let charValue = 0;
  info.charBreakdown = [];
  for (const cd of info.charDetails) {
    const basePrice = charPrices[cd.name] != null ? charPrices[cd.name] : 2;
    const tier = getCharTier(cd.name);
    const hasSig = info.hasSignatureWeapons.includes(cd.name);
    const premium = calcConstPremium(cd.name, cd.const);

    let charVal, note, isHot;
    if (tier && tier.isHot) {
      const result = calcHotCharValue(basePrice, cd.const, hasSig, w);
      charVal = result.value; note = result.note; isHot = true;
    } else if (tier) {
      const result = calcColdCharValue(basePrice, cd.const, hasSig, w);
      charVal = result.value; note = result.note; isHot = false;
    } else {
      const result = calcColdCharValue(basePrice, cd.const, hasSig, w);
      charVal = result.value; note = result.note; isHot = false;
    }
    charVal += premium;
    charValue += charVal;

    info.charBreakdown.push({
      name: cd.name, const: cd.const, basePrice,
      tier: tier ? tier.key : '?', isHot, hasSig,
      value: charVal, premium, note,
    });
  }

  // 满命多角色溢价
  const c6BonusRules = w.c6MultiBonus || [];
  const c6Weights = w.c6TierWeights || { S: 1.0, A: 0.8, B: 0.6, C: 0.4, D: 0.2 };
  const allC6Chars = info.charBreakdown.filter(cb => cb.const >= 6 && cb.tier && cb.tier !== '?' && cb.tier !== 'E');
  const c6TotalValue = allC6Chars.reduce((s, cb) => s + cb.value, 0);
  let weightedCount = 0;
  const tierCounts = {};
  for (const cb of allC6Chars) {
    const weight = c6Weights[cb.tier] || 0;
    weightedCount += weight;
    tierCounts[cb.tier] = (tierCounts[cb.tier] || 0) + 1;
  }
  let c6BonusValue = 0;
  let c6BonusNotes = [];
  if (weightedCount >= 2 && c6BonusRules.length > 0 && c6TotalValue > 0) {
    const sortedRules = [...c6BonusRules].sort((a, b) => a.count - b.count);
    let lower = null, upper = null;
    for (const rule of sortedRules) {
      if (weightedCount >= rule.count) lower = rule;
      else if (!upper) upper = rule;
    }
    let matchedBonus = 0, bonusDesc = '';
    if (lower && upper) {
      const ratio = (weightedCount - lower.count) / (upper.count - lower.count);
      const discounted = upper.bonus * ratio;
      matchedBonus = Math.max(discounted, lower.bonus);
      if (discounted >= lower.bonus) {
        bonusDesc = `加权${weightedCount.toFixed(1)} 折算${upper.count}档 +${Math.round(matchedBonus * 100)}%`;
      } else {
        bonusDesc = `加权${weightedCount.toFixed(1)} ${lower.count}档 +${Math.round(matchedBonus * 100)}%`;
      }
    } else if (lower) {
      matchedBonus = lower.bonus;
      bonusDesc = `加权${weightedCount.toFixed(1)} ${lower.count}档 +${Math.round(matchedBonus * 100)}%`;
    }
    if (matchedBonus > 0) {
      c6BonusValue = Math.round(c6TotalValue * matchedBonus);
      const tierSummary = Object.entries(tierCounts)
        .sort((a, b) => (c6Weights[a[0]] ?? 0) < (c6Weights[b[0]] ?? 0) ? 1 : -1)
        .map(([t, c]) => `${c}个${t}级`).join('+');
      c6BonusNotes.push(`满命(${tierSummary}) ${bonusDesc}`);
    }
  }
  info.c6Bonus = { value: c6BonusValue, notes: c6BonusNotes, weightedCount };
  charValue += c6BonusValue;

  const weaponValue = 0;
  const outfitValue = info.outfits.length * (w.outfit || 0);
  const motoAccValue = info.motoAccessories.length * (w.motoAccessory || 0);
  const motoFrameValue = info.motoFrames.length * (w.motoFrame || 0);
  const paintValue = info.paints.length * (w.paint || 0);

  // 配队溢价
  const charNames = info.charDetails.map(cd => cd.name);
  const teamResult = calcTeamPremiums(charNames);
  info.matchedTeams = teamResult.matchedTeams;
  let teamBonusValue = 0;
  let teamBonusNotes = [];
  if (teamResult.matchedTeams.length > 0) {
    const charMultipliers = {};
    for (const team of teamResult.matchedTeams) {
      for (const cn of team.chars) {
        const prev = charMultipliers[cn] || 1.0;
        charMultipliers[cn] = Math.max(prev, team.multiplier);
      }
    }
    let baseTeamBonus = 0;
    for (const [cn, mult] of Object.entries(charMultipliers)) {
      const cb = info.charBreakdown.find(c => c.name === cn);
      if (cb && mult > 1.0) baseTeamBonus += cb.value * (mult - 1);
    }
    const multiRules = w.teamMultiBonus || [];
    let multiCoef = 1.0;
    for (const rule of multiRules) {
      if (teamResult.matchedTeams.length >= rule.count) multiCoef = Math.max(multiCoef, rule.coef);
    }
    teamBonusValue = Math.round(baseTeamBonus * multiCoef);
    const teamNames = teamResult.matchedTeams.map(t => t.name).join('/');
    teamBonusNotes.push(`${teamResult.matchedTeams.length}配队(${teamNames}) ×${multiCoef}`);
  }
  info.teamBonus = { value: teamBonusValue, notes: teamBonusNotes };

  const pullInfo = calcPullValue(info);
  info.pullInfo = pullInfo;
  const yellowInfo = calcYellowMultiplier(info);
  info.yellowInfo = yellowInfo;

  // 将实际使用的权重值附加到 info，供前端显示
  info.activeWeights = {
    outfit: w.outfit || 0,
    motoAccessory: w.motoAccessory || 0,
    motoFrame: w.motoFrame || 0,
    paint: w.paint || 0,
  };

  const rawValue =
    charValue + weaponValue + outfitValue + motoAccValue +
    motoFrameValue + paintValue + teamBonusValue + pullInfo.total;

  return Math.round(rawValue * yellowInfo.coefficient);
}

function calcRatio(value, price) {
  if (price <= 0) return 0;
  return Math.round(((value - price) / price) * 100);
}

/* ======================== 自定义配置（可被覆盖） ======================== */
let customConfig = null;

// 导入油猴脚本配置后，用导入值替换全局 CONFIG
function applyCustomConfig() {
  if (!customConfig) return;
  if (customConfig.weights) CONFIG.weights = { ...CONFIG.weights, ...customConfig.weights };
  if (customConfig.thresholds) CONFIG.thresholds = { ...CONFIG.thresholds, ...customConfig.thresholds };
  if (customConfig.charPrices) CONFIG.charPrices = { ...CONFIG.charPrices, ...customConfig.charPrices };
  if (customConfig.constPremiums !== undefined) CONFIG.constPremiums = customConfig.constPremiums;
  // 配队、抽数阶梯、黄数阶梯：直接替换而非合并
  if (customConfig.teamPremiums) CONFIG.teamPremiums = customConfig.teamPremiums;
  if (customConfig.pullTiers && customConfig.pullTiers.length > 0) CONFIG.pullTiers = customConfig.pullTiers;
  if (customConfig.yellowTiers && customConfig.yellowTiers.length > 0) CONFIG.yellowTiers = customConfig.yellowTiers;
}

/* ======================== API 路由 ======================== */
// 导入油猴脚本配置
app.post('/api/import-config', (req, res) => {
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ error: '请提供配置 JSON' });
  }
  try {
    const parsed = typeof config === 'string' ? JSON.parse(config) : config;
    customConfig = parsed;
    applyCustomConfig();
    res.json({
      success: true,
      message: '配置导入成功',
      details: {
        weights: Object.keys(parsed.weights || {}).length + ' 个权重参数',
        charPrices: Object.keys(parsed.charPrices || {}).length + ' 个角色价格',
        constPremiums: Object.keys(parsed.constPremiums || {}).length + ' 个命座溢价',
        teamPremiums: Object.keys(parsed.teamPremiums || {}).length + ' 个配队溢价',
        pullTiers: (parsed.pullTiers || []).length + ' 个抽数阶梯',
        yellowTiers: (parsed.yellowTiers || []).length + ' 个黄数阶梯',
      },
    });
  } catch (err) {
    res.status(400).json({ error: `配置解析失败: ${err.message}` });
  }
});

// 获取当前配置状态
app.get('/api/config-status', (req, res) => {
  res.json({
    success: true,
    hasCustomConfig: !!customConfig,
    details: customConfig ? {
      weights: Object.keys(customConfig.weights || {}).length,
      charPrices: Object.keys(customConfig.charPrices || {}).length,
      constPremiums: Object.keys(customConfig.constPremiums || {}).length,
      teamPremiums: Object.keys(customConfig.teamPremiums || {}).length,
    } : null,
  });
});

// 清除自定义配置（恢复默认）
app.post('/api/reset-config', (req, res) => {
  customConfig = null;
  // 重建默认配置
  CONFIG.charPrices = buildDefaultCharPrices();
  CONFIG.constPremiums = {};
  res.json({ success: true, message: '已恢复默认配置' });
});

// 按商品编号查询（在线模式）— 两步流程：搜索API获取内部ID → detailPost获取详情
app.get('/api/valuate', async (req, res) => {
  const productCode = req.query.productId;
  if (!productCode) {
    return res.status(400).json({ error: '请提供商品编号' });
  }

  try {
    // Step 1: 通过搜索API将商品展示编号转换为内部数字productId
    const searchBody = {
      query: String(productCode),
      gameId: '10302',
      pageIndex: 1,
      pageSize: 5,
      bizProd: 1,
      type: '4',
      posType: 1,
      sortAttrId: '',
      sortType: 1,
      filterDTOList: [{ attrId: 'price', attrType: 3, attrValList: [0, -1] }],
      combineFilterList: [],
    };

    const searchResp = await fetch('https://api-pc.pxb7.com/api/search/product/v2/selectSearchPageList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchBody),
    });

    if (!searchResp.ok) {
      return res.status(502).json({ error: `搜索API请求失败: HTTP ${searchResp.status}` });
    }

    const searchData = await searchResp.json();
    if (!searchData.success || !searchData.data || !searchData.data.list || searchData.data.list.length === 0) {
      return res.status(404).json({ error: `未找到编号为 ${productCode} 的商品，请检查编号是否正确` });
    }

    // 在搜索结果中精确匹配 productUniqueNo
    const matched = searchData.data.list.find(item => item.productUniqueNo === String(productCode));
    const targetItem = matched || searchData.data.list[0];
    const internalProductId = targetItem.productId;

    // Step 2: 用内部productId调用detailPost获取完整商品详情
    const detailResp = await fetch('https://api-pc.pxb7.com/api/product/web/product/detailPost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: String(internalProductId) }),
    });

    if (!detailResp.ok) {
      return res.status(502).json({ error: `详情API请求失败: HTTP ${detailResp.status}` });
    }

    const data = await detailResp.json();
    if (!data.success || !data.data) {
      const errMsg = data.errMessage || '商品已下架或不可访问';
      return res.status(404).json({ error: errMsg, errCode: data.errCode });
    }

    const detail = data.data;
    const description = detail.showTitle || '';
    const price = detail.price ? Math.round(parseInt(detail.price) / 100) : 0;
    const productUniqueNo = detail.productUniqueNo || '';

    const info = parseAccountInfo(description);
    const estValue = calculateValue(info);
    const ratio = calcRatio(estValue, price);

    res.json({
      success: true,
      data: {
        productId: String(productCode),
        productUniqueNo,
        description,
        price,
        estValue,
        ratio,
        info,
      },
    });
  } catch (err) {
    console.error('估值请求出错:', err.message);
    res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
});

// 手动输入描述估价（离线模式）
app.post('/api/valuate-manual', (req, res) => {
  const { description, price } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ error: '请输入商品描述文本' });
  }

  try {
    const info = parseAccountInfo(description);
    const estValue = calculateValue(info);
    const inputPrice = price ? parseInt(price) : 0;
    const ratio = calcRatio(estValue, inputPrice);

    res.json({
      success: true,
      data: {
        description,
        price: inputPrice,
        estValue,
        ratio,
        info,
      },
    });
  } catch (err) {
    console.error('手动估值出错:', err.message);
    res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`鸣潮估价助手已启动: http://localhost:${PORT}`);
});
