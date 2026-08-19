'use strict';

const ZZZ_CONFIG = {
  configVersion: 1,
  gameName: '绝区零',
  gameSlug: 'zzz',

  charTiers: {
    S: { price: 50, isHot: true, chars: [] },
    A: { price: 35, isHot: true, chars: [] },
    B: { price: 25, isHot: true, chars: [] },
    C: { price: 5, isHot: false, chars: [] },
    D: { price: 3, isHot: false, chars: [] },
    E: { price: 2, isHot: false, chars: [] },
  },

  sigWeapons: {},

  fullConstWeight: { S: 1.0, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },

  defaultWeights: {
    c6TierWeights: { S: 1, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },
    c6MultiBonus: [{"count":1.5,"bonus":0.25},{"count":2,"bonus":0.5},{"count":2.5,"bonus":0.75},{"count":3,"bonus":1},{"count":3.5,"bonus":1.25},{"count":4,"bonus":1.5},{"count":4.5,"bonus":1.75},{"count":5,"bonus":2},{"count":5.5,"bonus":2.25},{"count":6,"bonus":2.5},{"count":6.5,"bonus":2.75},{"count":7,"bonus":3},{"count":7.5,"bonus":3.25},{"count":8,"bonus":3.5},{"count":8.5,"bonus":3.75},{"count":9,"bonus":4},{"count":9.5,"bonus":4.25},{"count":10,"bonus":4.5}],
    c6Base: 3, c6BaseBonus: 1.0, c6Step: 0.1, c6StepBonus: 0.05,
    outfit: 0, motoFrame: 0,
    pullC6Base: 5, pullC6BaseBonus: 0.5, pullC6Step: 0.1, pullC6StepBonus: 0.005,
    teamMultiBonus: [
      { count: 2, coef: 1.05 }, { count: 3, coef: 1.1 }, { count: 4, coef: 1.15 },
      { count: 5, coef: 1.2 }, { count: 6, coef: 1.25 }, { count: 7, coef: 1.3 },
      { count: 8, coef: 1.35 }, { count: 9, coef: 1.4 }, { count: 10, coef: 1.45 },
    ],
    flatDiscountRules: [{ tiers: ['S', 'A'], maxConst: 2, discount: 0.8 }],
    c6TeamDependency: {},
    needSigDiscount: 0.3, teamDepDiscount: 0.7, yellowMaxCoeff: 3.0,
    yellowSegments: null,
    effYellowSeg1BaseCoeff: 0.3, effYellowSeg1Threshold: 10, effYellowSeg1Step: 0.03,
    effYellowSeg2BaseCoeff: 0.4, effYellowSeg2Threshold: 40, effYellowSeg2Step: 0.02,
    effYellowSeg3BaseCoeff: 0.88, effYellowSeg3Step: 0.008, effYellowMaxCoeff: 2.5,
  },

  defaultPullFormula: { pullBase: 200, pullBasePrice: 1.0, pullStepPrice: 0.002 },

  defaultTeamMates: {},

  defaultTeams: [],

  defaultCharPrices: {},

  defaultConstPremiums: {},

  defaultNeedSigWeapons: [],

  charAliases: {},

  sectionKeywords: [
    'S级邦布', 'A级邦布', '音擎', '驱动盘',
    '菲林', '母带', '丁尼', '调查记录',
    '联络人等级', '活跃天数',
  ],

  weightLabels: {
    outfit: { label: '皮肤/外观', desc: '每个皮肤/外观（元）' },
    motoFrame: { label: '邦布', desc: '每个邦布（元）' },
    needSigDiscount: { label: '无专武折扣', desc: '需要专武的角色无专武时，价值×此值（0.3=30%）' },
    teamDepDiscount: { label: '强绑折扣', desc: '强绑队友全不在场时，角色价值×此值（0.7=70%）' },
  },

  platformIds: {
    pxb7: '',
    pzds: '',
    kejinshou: '',
    qy7881: '',
  },
};

module.exports = ZZZ_CONFIG;
