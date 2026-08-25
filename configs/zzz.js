'use strict';

const ZZZ_CONFIG = {
  configVersion: 2,
  gameName: '绝区零',
  gameSlug: 'zzz',

  // 多游戏解析参数（与油猴脚本 GAME_CONFIGS 保持一致）
  levelKeywords: ['绳网等级', '联觉等级', '冒险等级'],
  yellowUnits: ['黄', '金'],
  constUnits: ['命', '影'],                       // 影画=N命（"N影X"/"满影X"）
  constUnitDisplay: '影',
  charSectionKeywords: ['S级代理人', 'A级代理人', '限定代理人', '代理人', '五星角色'],
  weaponSectionKeywords: ['S级音擎', 'A级音擎', '金色音擎', '音擎', '五星武器', '武器'],
  resources: [
    { key: 'starSound', name: '菲林', div: 160 },
    { key: 'moonPhase', name: '母带', div: 1 },
    { key: 'aftermathCoral', name: '丁尼', div: 0 },
    { key: 'floatGoldRipple', name: '调查记录', div: 0 },
    { key: 'castTideRipple', name: '活跃天数', div: 0 },
  ],
  outfitSectionKeywords: ['服饰', '皮肤'],
  motoSectionKeywords: ['S级邦布', 'A级邦布', '邦布'],
  motoAccessoryKeywords: [],

  // 代理人分级（初版草稿定价，可在管理后台/估值设置中按行情调整）
  charTiers: {
    S: { price: 50, isHot: true, chars: ['艾莲', '朱鸢', '青衣', '简', '凯撒', '伯尼斯', '星见雅', '薇薇安', '雨果', '仪玄'] },
    A: { price: 35, isHot: true, chars: ['潘引壶', '浮波柚叶'] },
    B: { price: 25, isHot: true, chars: [] },
    C: { price: 5, isHot: false, chars: [] },
    D: { price: 3, isHot: false, chars: [] },
    E: { price: 2, isHot: false, chars: [] },
  },

  sigWeapons: {},

  // 常用简称别名（平台卖家常用"雅"指星见雅）
  charAliases: { '雅': '星见雅' },

  fullConstWeight: { S: 1.0, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },

  defaultWeights: {
    c6TierWeights: { S: 1, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },
    c6MultiBonus: [{"count":1.5,"bonus":0.25},{"count":2,"bonus":0.5},{"count":2.5,"bonus":0.75},{"count":3,"bonus":1},{"count":3.5,"bonus":1.25},{"count":4,"bonus":1.5},{"count":4.5,"bonus":1.75},{"count":5,"bonus":2},{"count":5.5,"bonus":2.25},{"count":6,"bonus":2.5},{"count":6.5,"bonus":2.75},{"count":7,"bonus":3},{"count":7.5,"bonus":3.25},{"count":8,"bonus":3.5},{"count":8.5,"bonus":3.75},{"count":9,"bonus":4},{"count":9.5,"bonus":4.25},{"count":10,"bonus":4.5}],
    c6Base: 3, c6BaseBonus: 1.0, c6Step: 0.1, c6StepBonus: 0.05,
    outfit: 0, motoFrame: 0,
    pullC6Base: 5, pullC6BaseBonus: 0.5, pullC6Step: 0.1, pullC6StepBonus: 0.005, pullC6Threshold: 400, pullC6MaxWeightedConst: 20, pullPerWeightedConst: 450, pullPerWeightedConstCount: 1,
    teamMultiBonus: [
      { count: 2, coef: 1.05 }, { count: 3, coef: 1.1 }, { count: 4, coef: 1.15 },
      { count: 5, coef: 1.2 }, { count: 6, coef: 1.25 }, { count: 7, coef: 1.3 },
      { count: 8, coef: 1.35 }, { count: 9, coef: 1.4 }, { count: 10, coef: 1.45 },
    ],
    flatDiscountRules: [{ tiers: ['S', 'A'], maxConst: 2, discount: 0.8 }],
    c6TeamDependency: {},
    needSigDiscount: 0.3, teamDepDiscount: 0.7, yellowMaxCoeff: 3.0,
    yellowSegments: null,
    effYellowSeg1BaseCoeff: 0.15, effYellowSeg1Threshold: 15, effYellowSeg1Step: 0.03,
    effYellowSeg2BaseCoeff: 0.6, effYellowSeg2Threshold: 50, effYellowSeg2Step: 0.02,
    effYellowSeg3BaseCoeff: 1.3, effYellowSeg3Step: 0.014, effYellowMaxCoeff: 3.0,
    effYellowSegments: [
      { baseCoeff: 0.15, threshold: 15, step: 0.03 },
      { baseCoeff: 0.6, threshold: 50, step: 0.02 },
      { baseCoeff: 1.3, threshold: 100, step: 0.014 },
      { baseCoeff: 2.0, threshold: null, step: 0.008 }
    ],
  },

  defaultPullFormula: { pullBase: 200, pullBasePrice: 1.0, pullStepPrice: 0.002 },

  defaultTeamMates: {},

  defaultTeams: [],

  defaultCharPrices: {},

  defaultConstPremiums: {},

  defaultNeedSigWeapons: [],

  sectionKeywords: [
    'S级代理人', 'A级代理人', 'B级代理人', '限定代理人', '代理人',
    'S级音擎', 'A级音擎', '金色音擎', '音擎', '驱动盘',
    'S级邦布', 'A级邦布', '邦布',
    '菲林', '母带', '丁尼', '调查记录', '活跃天数',
    '绳网等级', '服饰', '皮肤',
  ],

  weightLabels: {
    outfit: { label: '皮肤/外观', desc: '每个皮肤/外观（元）' },
    motoFrame: { label: '邦布', desc: '每个邦布（元）' },
    needSigDiscount: { label: '无专武折扣', desc: '需要专武的角色无专武时，价值×此值（0.3=30%）' },
    teamDepDiscount: { label: '强绑折扣', desc: '强绑队友全不在场时，角色价值×此值（0.7=70%）' },
  },

  platformIds: {
    pxb7: '10312',
    pzds: '275',
    kejinshou: '2530',
    qy7881: 'A5754',
  },
};

module.exports = ZZZ_CONFIG;
