'use strict';

const WUWA_CONFIG = {
  configVersion: 21,
  gameName: '鸣潮',
  gameSlug: 'wuwa',

  // 多游戏解析参数（与油猴脚本 GAME_CONFIGS 保持一致）
  levelKeywords: ['联觉等级', '冒险等级', '等级'],
  yellowUnits: ['黄'],
  constUnits: ['命'],
  constUnitDisplay: '命',
  charSectionKeywords: ['五星角色', '按角色', '满命角色', '三命角色', '二命角色', '一命角色'],
  weaponSectionKeywords: ['五星武器', '武器', '金色武器', '精一武器'],
  resources: [
    { key: 'starSound', name: '星声', div: 160 },
    { key: 'moonPhase', name: '月相', div: 160 },
    { key: 'aftermathCoral', name: '余波珊瑚', div: 8 },
    { key: 'floatGoldRipple', name: '浮金波纹', div: 1 },
    { key: 'castTideRipple', name: '铸潮波纹', div: 1 },
  ],
  outfitSectionKeywords: ['服饰', '皮肤'],
  motoSectionKeywords: ['车架模组', '车架', '摩托'],
  motoAccessoryKeywords: ['摩托饰品'],

  charTiers: {
    S: { price: 50, isHot: true, chars: ['爱弥斯', '绯雪', '秧秧玄翎', '卡提希娅'] },
    A: { price: 35, isHot: true, chars: ['琳奈', '千咲', '穗穗', '莫宁', '弗洛洛', '洛瑟菈'] },
    B: { price: 25, isHot: true, chars: ['达妮娅', '夏空', '露西', '嘉贝莉娜', '奥古斯塔', '仇远', '尤诺', '陆赫斯', '赞妮', '布兰特', '守岸人', '西格莉卡'] },
    C: { price: 5, isHot: false, chars: ['露帕', '珂莱塔', '菲比', '坎特蕾拉', '椿'] },
    D: { price: 3, isHot: false, chars: ['忌炎', '吟霖', '相里要', '今汐', '长离', '折枝', '洛可可', '丽贝卡'] },
    E: { price: 2, isHot: false, chars: ['维里奈', '卡卡罗', '安可', '凌阳', '鉴心', '秧秧'] },
  },

  sigWeapons: {
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
  },

  fullConstWeight: { S: 1.0, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },

  defaultWeights: {
    c6TierWeights: { S: 1, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },
    c6MultiBonus: [{"count":1.5,"bonus":0.25},{"count":2,"bonus":0.5},{"count":2.5,"bonus":0.75},{"count":3,"bonus":1},{"count":3.5,"bonus":1.25},{"count":4,"bonus":1.5},{"count":4.5,"bonus":1.75},{"count":5,"bonus":2},{"count":5.5,"bonus":2.25},{"count":6,"bonus":2.5},{"count":6.5,"bonus":2.75},{"count":7,"bonus":3},{"count":7.5,"bonus":3.25},{"count":8,"bonus":3.5},{"count":8.5,"bonus":3.75},{"count":9,"bonus":4},{"count":9.5,"bonus":4.25},{"count":10,"bonus":4.5}],
    c6Base: 3, c6BaseBonus: 1.0, c6Step: 0.1, c6StepBonus: 0.05,
    outfit: 0, motoFrame: 0,
    pullC6Base: 5, pullC6BaseBonus: 0.5, pullC6Step: 0.1, pullC6StepBonus: 0.005, pullC6Threshold: 400,
    teamMultiBonus: [
      { count: 2, coef: 1.05 }, { count: 3, coef: 1.1 }, { count: 4, coef: 1.15 },
      { count: 5, coef: 1.2 }, { count: 6, coef: 1.25 }, { count: 7, coef: 1.3 },
      { count: 8, coef: 1.35 }, { count: 9, coef: 1.4 }, { count: 10, coef: 1.45 },
    ],
    flatDiscountRules: [{ tiers: ['S', 'A'], maxConst: 2, discount: 0.8 }],
    c6TeamDependency: {
      '卡提希娅': { teammate: '夏空' }, '弗洛洛': { teammate: '坎特蕾拉' },
      '露西': { teammate: '丽贝卡' }, '绯雪': { teammate: '洛瑟菈' },
      '秧秧玄翎': { teammate: '穗穗' },
    },
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

  defaultTeamMates: {
    '爱弥斯': ['千咲', '琳奈', '莫宁', '达妮娅'], '绯雪': ['洛瑟菈'],
    '秧秧玄翎': ['穗穗'], '卡提希娅': ['夏空'], '弗洛洛': ['仇远', '坎特蕾拉'],
    '洛瑟菈': ['绯雪'], '露西': ['丽贝卡'], '嘉贝莉娜': ['仇远'],
    '奥古斯塔': ['尤诺'], '仇远': ['嘉贝莉娜', '弗洛洛'], '尤诺': ['奥古斯塔', '忌炎'],
    '陆赫斯': ['琳奈'], '赞妮': ['菲比'], '布兰特': ['露帕'],
    '西格莉卡': ['仇远'], '露帕': ['布兰特'], '珂莱塔': ['折枝'],
    '菲比': ['赞妮'], '坎特蕾拉': ['弗洛洛', '西格莉卡'],
    '椿': ['守岸人'], '吟霖': ['今汐', '相里要'], '相里要': ['吟霖'],
  },

  defaultTeams: [
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
  ],

  defaultCharPrices: {
    '爱弥斯': 45, '绯雪': 60, '卡提希娅': 35, '弗洛洛': 35,
    '琳奈': 25, '守岸人': 15, '千咲': 25, '穗穗': 35, '莫宁': 25, '秧秧玄翎': 40,
    '洛瑟菈': 25, '达妮娅': 15, '夏空': 15, '露西': 20, '嘉贝莉娜': 18,
    '奥古斯塔': 18, '仇远': 15, '尤诺': 15, '陆赫斯': 20, '赞妮': 18,
    '布兰特': 15, '西格莉卡': 20, '露帕': 10, '珂莱塔': 10, '菲比': 10,
    '坎特蕾拉': 10, '椿': 10, '忌炎': 2, '吟霖': 2, '相里要': 2, '今汐': 2,
    '长离': 2, '折枝': 2, '洛可可': 2, '丽贝卡': 2, '维里奈': 0, '卡卡罗': 0,
    '安可': 0, '凌阳': 0, '鉴心': 0, '秧秧': 0,
  },

  defaultConstPremiums: {
    '爱弥斯': { '1': 45, '2': 90, '3': 135, '4': 140, '5': 155, '6': 270 },
    '绯雪': { '1': 60, '2': 80, '3': 120, '4': 150, '5': 180, '6': 320 },
    '卡提希娅': { '1': 35, '2': 70, '3': 105, '4': 110, '5': 125, '6': 210 },
    '弗洛洛': { '1': 35, '2': 70, '3': 105, '4': 115, '5': 125, '6': 210 },
    '奥古斯塔': { '2': 20, '6': 80 }, '尤诺': { '2': 20, '6': 60 },
    '露西': { '3': 30, '6': 80 }, '忌炎': { '6': 30 }, '守岸人': { '2': 20, '6': 50 },
    '赞妮': { '2': 20, '6': 60 }, '椿': { '6': 50 }, '莫宁': { '1': 20, '6': 80 },
    '珂莱塔': { '6': 50 },
    '秧秧玄翎': { '1': 40, '2': 80, '3': 120, '4': 130, '5': 140, '6': 240 },
    '千咲': { '2': 20, '3': 30, '6': 60 }, '嘉贝莉娜': { '3': 30, '6': 80 },
    '陆赫斯': { '6': 100 }, '西格莉卡': { '6': 100 }, '丽贝卡': { '3': 20, '6': 50 },
    '仇远': { '3': 30, '6': 50 }, '今汐': { '6': 30 }, '吟霖': { '6': 30 },
    '坎特蕾拉': { '2': 30, '6': 50 }, '夏空': { '2': 20, '3': 30, '6': 50 },
    '布兰特': { '6': 80 }, '长离': { '6': 30 }, '相里要': { '6': 30 },
    '洛可可': { '6': 30 }, '琳奈': { '6': 80 }, '洛瑟菈': { '6': 80 },
    '折枝': { '6': 20 }, '菲比': { '2': 30, '6': 80 }, '露帕': { '6': 80 },
    '达妮娅': { '2': 30, '6': 80 }, '穗穗': { '2': 50, '6': 120 },
  },

  defaultNeedSigWeapons: [
    '爱弥斯', '绯雪', '秧秧玄翎', '卡提希娅', '弗洛洛', '嘉贝莉娜',
    '陆赫斯', '赞妮', '西格莉卡', '珂莱塔', '椿', '忌炎', '今汐',
  ],

  charAliases: { '爱弥丝': '爱弥斯' },

  sectionKeywords: [
    '五星角色', '四星角色', '五星武器', '金色武器', '地图探索度',
    '余波珊瑚', '残振珊瑚', '浮金波纹', '铸潮波纹', '唤声涡纹',
    '摩托饰品', '车架模组', '星声', '月相', '服饰', '皮肤', '摩托', '车架', '涂装',
    '数据坞等级', '联觉等级',
    '按角色', '满命角色', '三命角色', '二命角色', '一命角色', '精一武器', '五星角色数量', '等级',
  ],

  weightLabels: {
    outfit: { label: '服饰/皮肤', desc: '每个服饰/皮肤（元）' },
    motoFrame: { label: '车架模组', desc: '每个车架模组（元）' },
    needSigDiscount: { label: '无专武折扣', desc: '需要专武的角色无专武时，价值×此值（0.3=30%）' },
    teamDepDiscount: { label: '强绑折扣', desc: '强绑队友全不在场时，角色价值×此值（0.7=70%）' },
  },

  platformIds: {
    pxb7: '10302',
    pzds: '303',
    kejinshou: '7265',
    qy7881: 'A5752',
  },
};

module.exports = WUWA_CONFIG;
