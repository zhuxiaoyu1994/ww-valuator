'use strict';

const WUWA_CONFIG = {
  configVersion: 33,
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
    S: { price: 50, isHot: true, chars: ['爱弥斯', '绯雪', '秧秧玄翎', '清宵', '心'] },
    A: { price: 35, isHot: true, chars: ['琳奈', '穗穗', '莫宁', '弗洛洛', '卡提希娅', '西格莉卡', '景燃'] },
    B: { price: 25, isHot: true, chars: ['达妮娅', '夏空', '陆赫斯', '洛瑟菈', '千咲', '露西'] },
    C: { price: 5, isHot: false, chars: ['露帕', '菲比', '坎特蕾拉', '赞妮', '布兰特', '守岸人', '奥古斯塔', '嘉贝莉娜', '仇远', '尤诺'] },
    D: { price: 3, isHot: false, chars: ['忌炎', '吟霖', '相里要', '今汐', '长离', '折枝', '洛可可', '丽贝卡', '珂莱塔', '椿'] },
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
    '露西': '蜃影', '洛可可': '悲喜剧', '清宵': '云琅', '景燃': '千般渡', '心': '玉阙玄华',
  },

  // 角色攻略外链（角色图鉴「攻略」入口，仅前端展示用，不影响估值，无需同步油猴脚本）
  // 链接默认拼接：guideBase + WIKI 词条名（词条名默认等于角色名）
  // charGuides 只登记「WIKI 词条名与角色名不一致」的例外，其余走默认拼接
  guideBase: 'https://wiki.biligame.com/wutheringwaves/共鸣者/',
  charGuides: {
    '秧秧玄翎': '秧秧·玄翎',
    '陆赫斯': '陆·赫斯',
  },

  fullConstWeight: { S: 1.5, A: 0.3, B: 0.2, C: 0.1, D: 0.05, E: 0 },

  defaultWeights: {
    c6TierWeights: { S: 1.5, A: 0.3, B: 0.2, C: 0.1, D: 0.05, E: 0 },
    c6MultiBonus: [{"count":1.5,"bonus":0.25},{"count":2,"bonus":0.5},{"count":2.5,"bonus":0.75},{"count":3,"bonus":1},{"count":3.5,"bonus":1.25},{"count":4,"bonus":1.5},{"count":4.5,"bonus":1.75},{"count":5,"bonus":2},{"count":5.5,"bonus":2.25},{"count":6,"bonus":2.5},{"count":6.5,"bonus":2.75},{"count":7,"bonus":3},{"count":7.5,"bonus":3.25},{"count":8,"bonus":3.5},{"count":8.5,"bonus":3.75},{"count":9,"bonus":4},{"count":9.5,"bonus":4.25},{"count":10,"bonus":4.5}],
    c6Base: 0, c6BaseBonus: 0, c6Step: 0.1, c6StepBonus: 0.01, c6MaxWeightedConst: 5.5,
    outfit: 0, motoFrame: 0,
    pullC6Base: 0, pullC6BaseBonus: 0, pullC6Step: 1, pullC6StepBonus: 0.2, pullC6Threshold: 400, pullC6MaxWeightedConst: 5, pullPerWeightedConst: 450, pullPerWeightedConstCount: 1,
    pullC6MaxBonus: 5,
    pullC6Segments: [
      { baseBonus: 0, threshold: 1, step: 0 },
      { baseBonus: 0, threshold: null, step: 0.1 }
    ],
    teamMultiBonus: [
      { count: 2, coef: 1 }, { count: 3, coef: 1.05 }, { count: 4, coef: 1.1 },
      { count: 5, coef: 1.15 }, { count: 6, coef: 1.2 }, { count: 7, coef: 1.25 },
      { count: 8, coef: 1.3 }, { count: 9, coef: 1.35 }, { count: 10, coef: 1.4 },
      { count: 11, coef: 1.45 }, { count: 12, coef: 1.5 }, { count: 13, coef: 1.5 },
      { count: 14, coef: 1.5 },
    ],
    flatDiscountRules: [{ tiers: ['S', 'A'], maxConst: 2, discount: 0.8 }],
    c6TeamDependency: {
      '卡提希娅': { teammate: '夏空', weightTier: 'A', valueDiscount: 0.7 },
      '弗洛洛': { teammate: '坎特蕾拉', weightTier: 'A', valueDiscount: 0.7 },
      '露西': { teammate: '丽贝卡', weightTier: 'B', valueDiscount: 0.7 },
      '绯雪': { teammate: '洛瑟菈', weightTier: 'A', valueDiscount: 0.7 },
      '秧秧玄翎': { teammate: '穗穗', weightTier: 'A', valueDiscount: 0.7 },
    },
    needSigDiscount: 0.4, teamDepDiscount: 0.5, yellowMaxCoeff: 2.5,
    yellowSegments: null,
    effYellowSeg1BaseCoeff: 0.15, effYellowSeg1Threshold: 15, effYellowSeg1Step: 0.03,
    effYellowSeg2BaseCoeff: 0.6, effYellowSeg2Threshold: 50, effYellowSeg2Step: 0.02,
    effYellowSeg3BaseCoeff: 1.3, effYellowSeg3Step: 0.014, effYellowMaxCoeff: 4.5,
    effYellowSegments: [
      { baseCoeff: 0.4, threshold: 10, step: 0.02 },
      { baseCoeff: 0.6, threshold: 40, step: 0.02 },
      { baseCoeff: 1.2, threshold: null, step: 0.02 }
    ],
    effTierWeights: { S: 1.2, A: 1, B: 0.8, C: 0.6, D: 0.4, E: 0 },
    // 角色数量加成：五星角色数 ≥ threshold 时，最终估值加 bonus 元（threshold/bonus 为 0 时不生效）
    charCountBonus: { threshold: 43, bonus: 1000 },
    // 武器数量加成：识别到的武器数 ≥ threshold 时，最终估值加 bonus 元（threshold/bonus 为 0 时不生效）
    weaponCountBonus: { threshold: 38, bonus: 1000 },
    // 皮肤数量加成：识别到的服饰/皮肤数 ≥ threshold 时，最终估值加 bonus 元（threshold/bonus 为 0 时不生效）
    outfitCountBonus: { threshold: 8, bonus: 200 },
    // 估值交易范围（按估值价位段的百分比计算区间半宽）
    priceRangeSegments: [
      { upTo: 500, percent: 0.20, minAmount: 30 },    // 0~500: ±20%，最低±30元
      { upTo: 2000, percent: 0.15, minAmount: 0 },    // 500~2000: ±15%
      { upTo: 5000, percent: 0.12, minAmount: 0 },    // 2000~5000: ±12%
      { upTo: null, percent: 0.10, minAmount: 0 },    // 5000+: ±10%
    ],
  },

  defaultPullFormula: { pullBase: 200, pullBasePrice: 1.0, pullStepPrice: 0.002, pullMaxPrice: 4,
    pullSegments: [
      { basePrice: 0.6, threshold: 200, stepPrice: 0.0012 },
      { basePrice: 0.84, threshold: 400, stepPrice: 0.0015 },
      { basePrice: 1.14, threshold: 600, stepPrice: 0.002 },
      { basePrice: 1.54, threshold: null, stepPrice: 0.0025 }
    ]
  },

  defaultTeamMates: {
    '爱弥斯': ['莫宁', '达妮娅'], '绯雪': ['洛瑟菈', '琳奈'],
    '秧秧玄翎': ['穗穗'], '清宵': ['达妮娅'],
    '弗洛洛': ['仇远', '坎特蕾拉'], '卡提希娅': ['夏空'],
    '西格莉卡': ['仇远'], '达妮娅': ['清宵', '爱弥斯'],
    '夏空': ['卡提希娅'], '陆赫斯': ['莫宁', '达妮娅'],
    '洛瑟菈': ['绯雪'], '露帕': ['布兰特'],
    '菲比': ['赞妮'], '坎特蕾拉': ['弗洛洛', '西格莉卡'],
    '赞妮': ['菲比'], '布兰特': ['露帕'],
    '吟霖': ['今汐', '相里要'], '相里要': ['吟霖'],
    '折枝': ['今汐', '珂莱塔'], '洛可可': ['椿'],
    '珂莱塔': ['折枝'], '奥古斯塔': ['尤诺'],
    '尤诺': ['奥古斯塔', '忌炎'], '椿': ['守岸人'],
    '嘉贝莉娜': ['仇远'], '仇远': ['嘉贝莉娜', '弗洛洛'],
    '景燃': ['尤诺'], '露西': ['丽贝卡'],
  },

  defaultTeams: [
    { name: '日月守', members: ['奥古斯塔', '尤诺', '守岸人'], multiplier: 1.1 },
    { name: '弗坎守', members: ['弗洛洛', '坎特蕾拉', '守岸人'], multiplier: 1.1 },
    { name: '爱达千', members: ['爱弥斯', '达妮娅', '千咲'], multiplier: 1.2 },
    { name: '卡夏千', members: ['卡提希娅', '夏空', '千咲'], multiplier: 1.2 },
    { name: '露丽守', members: ['露西', '丽贝卡', '守岸人'], multiplier: 1.2 },
    { name: '西仇守', members: ['西格莉卡', '仇远', '守岸人'], multiplier: 1.2 },
    { name: '嘉仇守', members: ['嘉贝莉娜', '仇远', '守岸人'], multiplier: 1.2 },
    { name: '爱琳莫', members: ['爱弥斯', '莫宁', '琳奈'], multiplier: 1.3 },
    { name: '三火队', members: ['布兰特', '露帕', '长离'], multiplier: 1.2 },
    { name: '赞菲守', members: ['赞妮', '菲比', '守岸人'], multiplier: 1.2 },
    { name: '绯洛穗', members: ['绯雪', '洛瑟菈', '穗穗'], multiplier: 1.4 },
    { name: '秧千穗', members: ['秧秧玄翎', '千咲', '穗穗'], multiplier: 1.4 },
    { name: '陆达莫', members: ['陆赫斯', '达妮娅', '莫宁'], multiplier: 1.2 },
    { name: '清达莫', members: ['清宵', '达妮娅', '莫宁'], multiplier: 1.4 },
    { name: '椿洛守', members: ['椿', '洛可可', '守岸人'], multiplier: 1.05 },
    { name: '柯折守', members: ['珂莱塔', '折枝', '守岸人'], multiplier: 1.05 },
    { name: '景尤守', members: ['景燃', '尤诺', '守岸人'], multiplier: 1.2 },
  ],

  defaultCharPrices: {
    '爱弥斯': 28, '绯雪': 33, '秧秧玄翎': 28, '清宵': 28, '心': 38,
    '琳奈': 15, '穗穗': 21, '莫宁': 13,
    '弗洛洛': 22, '卡提希娅': 23, '西格莉卡': 18, '景燃': 18,
    '达妮娅': 13, '夏空': 13, '陆赫斯': 23, '洛瑟菈': 15,
    '千咲': 13, '露西': 13,
    '露帕': 8, '菲比': 10, '坎特蕾拉': 8, '赞妮': 10,
    '布兰特': 10, '守岸人': 10, '珂莱塔': 8, '奥古斯塔': 13,
    '尤诺': 12, '椿': 9, '嘉贝莉娜': 13, '仇远': 10,
    '忌炎': 2, '吟霖': 2, '相里要': 2, '今汐': 2,
    '长离': 2, '折枝': 2, '洛可可': 2, '丽贝卡': 1,
    '维里奈': 0, '卡卡罗': 0, '安可': 0, '凌阳': 0, '鉴心': 0, '秧秧': 0,
  },

  defaultConstPremiums: {
    '爱弥斯': { '1': 22, '2': 42, '3': 92, '4': 97, '5': 102, '6': 232 },
    '绯雪': { '1': 17, '2': 47, '3': 107, '4': 117, '5': 127, '6': 287 },
    '秧秧玄翎': { '1': 22, '2': 47, '3': 87, '4': 107, '5': 127, '6': 257 },
    '清宵': { '1': 32, '2': 62, '3': 122, '4': 127, '5': 132, '6': 272 },
    '心': { '1': 42, '2': 82, '3': 122, '4': 142, '5': 162, '6': 362 },
    '琳奈': { '1': 15, '2': 30, '3': 40, '4': 45, '5': 50, '6': 80 },
    '穗穗': { '1': 14, '2': 34, '3': 54, '4': 59, '5': 64, '6': 84 },
    '莫宁': { '1': 17, '2': 22, '3': 27, '4': 32, '5': 37, '6': 67 },
    '弗洛洛': { '1': 13, '2': 43, '3': 53, '4': 83, '5': 93, '6': 128 },
    '卡提希娅': { '1': 12, '2': 27, '3': 57, '4': 87, '5': 92, '6': 177 },
    '西格莉卡': { '1': 12, '2': 22, '3': 62, '4': 72, '5': 82, '6': 162 },
    '景燃': { '1': 22, '2': 42, '3': 62, '4': 67, '5': 72, '6': 142 },
    '达妮娅': { '1': 17, '2': 27, '3': 32, '4': 37, '5': 42, '6': 67 },
    '夏空': { '1': 7, '2': 17, '3': 27, '4': 32, '5': 37, '6': 57 },
    '陆赫斯': { '1': 17, '2': 32, '3': 37, '4': 42, '5': 47, '6': 97 },
    '洛瑟菈': { '1': 15, '2': 30, '3': 40, '4': 45, '5': 55, '6': 80 },
    '千咲': { '1': 17, '2': 32, '3': 42, '4': 47, '5': 52, '6': 82 },
    '露西': { '1': 9, '2': 17, '3': 37, '4': 42, '5': 47, '6': 87 },
    '露帕': { '1': 7, '2': 22, '3': 27, '4': 30, '5': 32, '6': 52 },
    '菲比': { '1': 4, '2': 23, '3': 30, '4': 35, '5': 40, '6': 68 },
    '坎特蕾拉': { '1': 21, '2': 32, '3': 37, '4': 42, '5': 47, '6': 52 },
    '赞妮': { '1': 10, '2': 20, '3': 30, '4': 35, '5': 40, '6': 70 },
    '布兰特': { '1': 10, '2': 20, '3': 40, '4': 50, '5': 60, '6': 70 },
    '守岸人': { '1': 10, '2': 20, '3': 25, '4': 30, '5': 35, '6': 50 },
    '珂莱塔': { '1': 7, '2': 17, '3': 32, '4': 37, '5': 42, '6': 62 },
    '奥古斯塔': { '1': 13, '2': 23, '3': 35, '4': 45, '5': 55, '6': 87 },
    '尤诺': { '1': 13, '2': 21, '3': 26, '4': 28, '5': 33, '6': 68 },
    '椿': { '1': 3, '2': 11, '3': 21, '4': 26, '5': 31, '6': 51 },
    '嘉贝莉娜': { '1': 9, '2': 32, '3': 47, '4': 52, '5': 57, '6': 87 },
    '仇远': { '1': 15, '2': 25, '3': 30, '4': 35, '5': 40, '6': 70 },
    '忌炎': { '1': 5, '2': 10, '3': 15, '4': 20, '5': 25, '6': 30 },
    '吟霖': { '1': 3, '2': 6, '3': 10, '4': 14, '5': 17, '6': 20 },
    '相里要': { '1': 5, '2': 10, '3': 15, '4': 20, '5': 25, '6': 30 },
    '今汐': { '1': 6, '2': 15, '3': 18, '4': 20, '5': 23, '6': 38 },
    '长离': { '1': 3, '2': 7, '3': 13, '4': 16, '5': 18, '6': 28 },
    '折枝': { '1': 3, '2': 6, '3': 10, '4': 12, '5': 15, '6': 20 },
    '洛可可': { '1': 3, '2': 6, '3': 10, '4': 12, '5': 15, '6': 20 },
    '丽贝卡': { '1': 4, '2': 7, '3': 11, '4': 13, '5': 16, '6': 21 },
  },

  defaultNeedSigWeapons: [
    '爱弥斯', '绯雪', '秧秧玄翎', '清宵', '弗洛洛', '卡提希娅',
    '西格莉卡', '陆赫斯', '露帕', '赞妮', '布兰特', '忌炎',
    '今汐', '珂莱塔', '奥古斯塔', '椿', '嘉贝莉娜', '景燃',
    '露西', '心',
  ],

  charAliases: { '爱弥丝': '爱弥斯', '心月狐': '心' },

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
