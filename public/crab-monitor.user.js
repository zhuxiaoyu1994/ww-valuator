// ==UserScript==
// @name         游戏账号监控助手（鸣潮+绝区零）
// @namespace    pxb7-monitor
// @version      3.6.0
// @description  监控螃蟹网+盼之+氪金兽+7881+易手游鸣潮/绝区零账号列表，支持游戏切换，自动发现高性价比账号
// @match        https://www.pxb7.com/buy/10302/*
// @match        https://www.pxb7.com/buy/10302
// @match        https://www.pxb7.com/buy/10312/*
// @match        https://www.pxb7.com/buy/10312
// @match        https://www.pxb7.com/product/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @connect      api.day.app
// @connect      sctapi.ftqq.com
// @connect      www.pushplus.plus
// @connect      www.pzds.com
// @connect      api.kejinshou.com
// @connect      www.kejinshou.com
// @connect      search.7881.com
// @connect      gw.7881.com
// @connect      www.youxigujia.cn
// @connect      www.swcbg.com
// @connect      api-pc.pxb7.com
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // 螃蟹网改版后URL结构变更：旧 /buy/{gameId} → 新 /buy/{gameId}/1（1=账号商品类型）
  // 访问旧URL会显示404页面，自动重定向到新URL
  var _oldPath = window.location.pathname;
  var _urlMatch = _oldPath.match(/^\/buy\/(\d+)$/);
  if (_urlMatch) {
    window.location.replace(window.location.origin + '/buy/' + _urlMatch[1] + '/1');
    return;
  }

  // 配置版本号（递增后强制覆盖用户旧配置）
  const CONFIG_VERSION = 24;

  // ============================================================
  // 多游戏配置（角色定价、资源关键词、平台ID均按游戏隔离）
  // ============================================================
  const GAME_CONFIGS = {
    wuwa: {
      key: 'wuwa',
      name: '鸣潮',
      storagePrefix: 'mw',
      minLevel: 70,                                  // 收录/通知的最低账号等级
      levelKeywords: ['联觉等级', '冒险等级', '等级'],          // 等级关键词（按优先级）
      yellowUnits: ['黄'],                            // 限定金数量单位（"N黄"/"黄数:N"）
      constUnits: ['命'],                             // 命座单位（"N命X"/"满命X"）
      constUnitDisplay: '命',                          // 命座显示单位（表格/通知/CSV）
      platformIds: {
        pxb7: '10302',
        pzds: '303',
        kjs: '7265',
        kjsCateId: 7996,
        qy: 'A5752',
        qyGtid: '100003',
        ysy: 152,
      },
      keywords: {
        charSections: ['五星角色', '按角色', '满命角色', '三命角色', '二命角色', '一命角色'],                     // 角色段落关键词（多段落合并解析）
        weaponSections: ['五星武器', '武器', '金色武器', '精一武器'], // 武器段落关键词（按顺序回退）
        removeSections: ['四星角色'],                   // kjs归一化时移除的低价值段落
        resources: [
          { key: 'starSound', name: '星声', div: 160 },
          { key: 'moonPhase', name: '月相', div: 160 },
          { key: 'aftermathCoral', name: '余波珊瑚', div: 8 },
          { key: 'floatGoldRipple', name: '浮金波纹', div: 1 },
          { key: 'castTideRipple', name: '铸潮波纹', div: 1 },
        ],
      },
      motoSectionKeywords: ['车架模组', '车架', '摩托'],
      motoValueKeywords: ['车架模组', '车架'],   // 估值计价的车架段（摩托段仅计数显示）
      motoAccessoryKeywords: ['摩托饰品'],
      outfitSectionKeywords: ['服饰', '皮肤'],
      labels: {
        charColumn: '五星角色',
        charSettingTitle: '五星角色定价（角色名 + 专武 + 估值 + 命座溢价）',
        motoColumn: '摩托',
      },
      defaultCharNotifyRules: [
        { chars: [{ name: '爱弥斯', minConst: 3 }, { name: '绯雪', minConst: 3 }, { name: '卡提希娅', minConst: 3 }, { name: '弗洛洛', minConst: 2 }, { name: '琳奈', minConst: 0 }, { name: '莫宁', minConst: 0 }, { name: '洛瑟菈', minConst: 0 }, { name: '夏空', minConst: 0 }], minDiff: -200 },
      ],
      charTiers: {
        S: { price: 50, isHot: true, chars: ['爱弥斯', '绯雪', '秧秧玄翎', '清宵'] },
        A: { price: 35, isHot: true, chars: ['琳奈', '千咲', '穗穗', '莫宁', '弗洛洛', '卡提希娅', '西格莉卡'] },
        B: { price: 25, isHot: true, chars: ['达妮娅', '夏空', '嘉贝莉娜', '奥古斯塔', '仇远', '尤诺', '陆赫斯', '洛瑟菈'] },
        C: { price: 5, isHot: false, chars: ['露帕', '珂莱塔', '菲比', '坎特蕾拉', '椿', '露西', '赞妮', '布兰特', '守岸人'] },
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
        '露西': '蜃影', '洛可可': '悲喜剧', '清宵': '云琅',
      },
      charAbbr: {
        '爱弥斯': '爱', '绯雪': '绯', '卡提希娅': '卡', '弗洛洛': '弗',
        '琳奈': '琳', '守岸人': '守', '千咲': '千', '穗穗': '穗', '莫宁': '莫',
        '达妮娅': '达', '洛瑟菈': '瑟', '夏空': '夏', '清宵': '清',
        '布兰特': '布', '露帕': '帕', '珂莱塔': '珂', '菲比': '菲', '赞妮': '赞',
        '尤诺': '尤', '陆赫斯': '陆', '坎特蕾拉': '坎', '仇远': '仇', '奥古斯塔': '奥',
        '嘉贝莉娜': '嘉', '西格莉卡': '西', '丽贝卡': '丽', '露西': '露', '椿': '椿',
        '忌炎': '忌', '吟霖': '吟', '相里要': '相', '今汐': '今', '长离': '长', '折枝': '折', '洛可可': '可',
        '维里奈': '维', '卡卡罗': '罗', '安可': '安', '凌阳': '凌', '鉴心': '鉴',
      },
      charAliases: { '爱弥丝': '爱弥斯' },
      fullConstWeight: { S: 1.0, A: 0.5, B: 0.15, C: 0.1, D: 0.05, E: 0 },
      defaultCharPrices: {
        '爱弥斯': 35, '绯雪': 40, '秧秧玄翎': 35,
        '琳奈': 15, '千咲': 15, '穗穗': 20, '莫宁': 15,
        '弗洛洛': 25, '达妮娅': 15, '夏空': 15,
        '嘉贝莉娜': 16, '奥古斯塔': 17, '仇远': 15, '尤诺': 14,
        '陆赫斯': 25, '露帕': 10, '珂莱塔': 8, '菲比': 11,
        '坎特蕾拉': 11, '椿': 9,
        '忌炎': 2, '吟霖': 2, '相里要': 2, '今汐': 2, '长离': 2, '折枝': 2, '洛可可': 2,
        '丽贝卡': 1, '维里奈': 0, '卡卡罗': 0, '安可': 0, '凌阳': 0, '鉴心': 0, '秧秧': 0,
        '露西': 15, '赞妮': 15, '布兰特': 13, '守岸人': 12,
        '洛瑟菈': 15, '西格莉卡': 20, '卡提希娅': 25, '清宵': 35,
      },
      defaultConstPremiums: {
        '爱弥斯': { '1': 25, '2': 45, '3': 115, '4': 120, '5': 125, '6': 245 },
        '绯雪': { '1': 20, '2': 50, '3': 110, '4': 115, '5': 120, '6': 290 },
        '秧秧玄翎': { '1': 20, '2': 45, '3': 85, '4': 105, '5': 125, '6': 255 },
        '琳奈': { '1': 15, '2': 30, '3': 40, '4': 45, '5': 50, '6': 80 },
        '千咲': { '1': 15, '2': 30, '3': 40, '4': 45, '5': 50, '6': 80 },
        '穗穗': { '1': 15, '2': 35, '3': 55, '4': 60, '5': 65, '6': 85 },
        '莫宁': { '1': 20, '2': 40, '3': 45, '4': 50, '5': 55, '6': 80 },
        '弗洛洛': { '1': 15, '2': 45, '3': 55, '4': 85, '5': 95, '6': 135 },
        '达妮娅': { '1': 15, '2': 25, '3': 30, '4': 35, '5': 40, '6': 65 },
        '夏空': { '1': 10, '2': 20, '3': 30, '4': 40, '5': 50, '6': 60 },
        '嘉贝莉娜': { '1': 6, '2': 29, '3': 44, '4': 49, '5': 54, '6': 84 },
        '奥古斯塔': { '1': 9, '2': 19, '3': 31, '4': 41, '5': 51, '6': 83 },
        '仇远': { '1': 10, '2': 20, '3': 25, '4': 30, '5': 35, '6': 65 },
        '尤诺': { '1': 11, '2': 19, '3': 24, '4': 26, '5': 31, '6': 66 },
        '陆赫斯': { '1': 15, '2': 30, '3': 35, '4': 40, '5': 45, '6': 95 },
        '露帕': { '1': 5, '2': 20, '3': 25, '4': 28, '5': 30, '6': 50 },
        '珂莱塔': { '1': 15, '2': 29, '3': 44, '4': 47, '5': 52, '6': 71 },
        '菲比': { '1': 3, '2': 22, '3': 29, '4': 34, '5': 39, '6': 67 },
        '坎特蕾拉': { '1': 18, '2': 39, '3': 49, '4': 54, '5': 59, '6': 66 },
        '椿': { '1': 3, '2': 21, '3': 41, '4': 46, '5': 51, '6': 71 },
        '忌炎': { '1': 5, '2': 10, '3': 15, '4': 20, '5': 25, '6': 30 },
        '吟霖': { '1': 3, '2': 6, '3': 10, '4': 14, '5': 17, '6': 20 },
        '相里要': { '1': 5, '2': 10, '3': 15, '4': 20, '5': 25, '6': 30 },
        '今汐': { '1': 6, '2': 15, '3': 18, '4': 20, '5': 23, '6': 38 },
        '长离': { '1': 3, '2': 7, '3': 13, '4': 16, '5': 18, '6': 28 },
        '折枝': { '1': 3, '2': 6, '3': 10, '4': 12, '5': 15, '6': 20 },
        '洛可可': { '1': 3, '2': 6, '3': 10, '4': 12, '5': 15, '6': 20 },
        '丽贝卡': { '1': 4, '2': 7, '3': 11, '4': 13, '5': 16, '6': 21 },
        '露西': { '1': 7, '2': 15, '3': 35, '4': 40, '5': 45, '6': 65 },
        '赞妮': { '1': 5, '2': 15, '3': 25, '4': 30, '5': 35, '6': 65 },
        '布兰特': { '1': 17, '2': 37, '3': 59, '4': 62, '5': 67, '6': 87 },
        '守岸人': { '1': 13, '2': 28, '3': 33, '4': 36, '5': 38, '6': 58 },
        '洛瑟菈': { '1': 15, '2': 30, '3': 40, '4': 45, '5': 55, '6': 80 },
        '西格莉卡': { '1': 10, '2': 20, '3': 60, '4': 70, '5': 80, '6': 160 },
        '卡提希娅': { '1': 15, '2': 35, '3': 85, '4': 90, '5': 95, '6': 175 },
        '清宵': { '1': 25, '2': 55, '3': 115, '4': 120, '5': 125, '6': 265 },
      },
      defaultNeedSigWeapons: [
        '爱弥斯', '绯雪', '秧秧玄翎', '弗洛洛', '嘉贝莉娜', '奥古斯塔',
        '陆赫斯', '露帕', '珂莱塔', '椿', '忌炎', '今汐',
        '露西', '赞妮', '布兰特', '西格莉卡', '卡提希娅', '清宵',
      ],
      defaultTeamMates: {
        '爱弥斯': ['莫宁', '达妮娅'],
        '绯雪': ['洛瑟菈', '琳奈'],
        '秧秧玄翎': ['穗穗'],
        '弗洛洛': ['仇远', '坎特蕾拉'],
        '达妮娅': ['爱弥斯'],
        '夏空': ['卡提希娅'],
        '嘉贝莉娜': ['仇远'],
        '奥古斯塔': ['尤诺'],
        '仇远': ['嘉贝莉娜', '弗洛洛'],
        '尤诺': ['奥古斯塔', '忌炎'],
        '陆赫斯': ['莫宁', '达妮娅'],
        '露帕': ['布兰特'],
        '珂莱塔': ['折枝'],
        '菲比': ['赞妮'],
        '坎特蕾拉': ['弗洛洛', '西格莉卡'],
        '椿': ['守岸人'],
        '吟霖': ['今汐', '相里要'],
        '相里要': ['吟霖'],
        '折枝': ['珂莱塔'],
        '洛可可': ['椿'],
        '露西': ['丽贝卡'],
        '赞妮': ['菲比'],
        '布兰特': ['露帕'],
        '洛瑟菈': ['绯雪'],
        '西格莉卡': ['仇远'],
        '卡提希娅': ['夏空'],
        '清宵': ['达妮娅'],
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
      ],
      c6TeamDependency: {
        '卡提希娅': { teammate: '夏空', weightTier: 'A', valueDiscount: 0.7 },
        '弗洛洛': { teammate: '坎特蕾拉', weightTier: 'A', valueDiscount: 0.7 },
        '露西': { teammate: '丽贝卡', weightTier: 'B', valueDiscount: 0.7 },
        '绯雪': { teammate: '洛瑟菈', weightTier: 'A', valueDiscount: 0.7 },
        '秧秧玄翎': { teammate: '穗穗', weightTier: 'A', valueDiscount: 0.7 },
      },
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
    },

    zzz: {
      key: 'zzz',
      name: '绝区零',
      storagePrefix: 'zzz',
      minLevel: 40,                                  // 绳网等级上限60，40≈鸣潮的70
      levelKeywords: ['绳网等级', '联觉等级', '冒险等级'],
      yellowUnits: ['黄', '金'],
      constUnits: ['命', '影'],                       // 影画=N命（"N影X"/"满影X"）
      constUnitDisplay: '影',                          // 命座显示单位（表格/通知/CSV）
      platformIds: {
        pxb7: '10312',
        pzds: '275',
        kjs: '2530',
        kjsCateId: 2299,
        qy: 'A5754',
        qyGtid: '100003',
        ysy: 0,
      },
      keywords: {
        charSections: ['S级代理人', 'A级代理人', '限定代理人', '代理人', '五星角色'],
        weaponSections: ['S级音擎', '金色音擎', '音擎', '五星武器'],
        removeSections: [],
        resources: [
          { key: 'starSound', name: '菲林', div: 160 },
          { key: 'moonPhase', name: '母带', div: 1 },
          { key: 'aftermathCoral', name: '丁尼', div: 0 },
          { key: 'floatGoldRipple', name: '调查记录', div: 0 },
          { key: 'castTideRipple', name: '活跃天数', div: 0 },
        ],
      },
      motoSectionKeywords: ['邦布'],
      motoValueKeywords: ['邦布'],
      motoAccessoryKeywords: [],
      outfitSectionKeywords: ['服饰', '皮肤'],
      labels: {
        charColumn: '代理人',
        charSettingTitle: '代理人定价（角色名 + 专武 + 估值 + 影画溢价）',
        motoColumn: '邦布',
      },
      defaultCharNotifyRules: [],
      charTiers: {
        // 绝区零代理人分级（初版草稿定价，请在「估值设置」中按行情调整；
        // 未在defaultCharPrices中单独定价的角色按级别默认价计算）
        S: { price: 50, isHot: true, chars: ['艾莲', '朱鸢', '青衣', '简', '凯撒', '伯尼斯', '星见雅', '薇薇安', '雨果', '仪玄'] },
        A: { price: 35, isHot: true, chars: ['潘引壶', '浮波柚叶'] },
        B: { price: 25, isHot: true, chars: [] },
        C: { price: 5, isHot: false, chars: [] },
        D: { price: 3, isHot: false, chars: [] },
        E: { price: 2, isHot: false, chars: [] },
      },
      sigWeapons: {},
      charAbbr: {},
      charAliases: { '雅': '星见雅' },   // 平台卖家常用"雅"指星见雅
      fullConstWeight: { S: 1.0, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0 },
      defaultCharPrices: {},
      defaultConstPremiums: {},
      defaultNeedSigWeapons: [],
      defaultTeamMates: {},
      defaultTeams: [],
      c6TeamDependency: {},
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
    },
  };

  // 当前游戏（init时根据URL/上次选择确定，可通过面板下拉框切换）
  let currentGame = 'wuwa';
  function G() { return GAME_CONFIGS[currentGame]; }

  // 当前游戏的全局存储键（跨游戏共享）
  const GLOBAL_STORAGE_KEYS = {
    game: 'pxb7_monitor_current_game',
  };

  // 游戏相关常量（applyGameConfig时按当前游戏重新赋值）
  let CHAR_TIERS = {};
  let SIG_WEAPONS = {};
  let CHAR_ABBR = {};
  let CHAR_ALIASES = {};
  let FULL_CONST_WEIGHT = {};
  let DEFAULT_WEIGHTS = {};
  let DEFAULT_TEAMS = [];
  let DEFAULT_CHAR_PRICES = {};
  let DEFAULT_CONST_PREMIUMS = {};
  let DEFAULT_NEED_SIG_WEAPONS = [];
  let DEFAULT_TEAM_MATES = {};
  let WEIGHT_LABELS = {};
  let SECTION_KEYWORDS = [];
  let STORAGE_KEYS = {};
  let CHAR_LOOKUP = {};

  function buildStorageKeys(prefix) {
    return {
      table: prefix + '_monitor_table',
      seen: prefix + '_monitor_seen',
      notified: prefix + '_monitor_notified',
      state: prefix + '_monitor_state',
      weights: prefix + '_monitor_config',
      configVersion: prefix + '_monitor_config_version',
    };
  }

  // 按当前游戏应用配置（游戏切换时重新调用）
  function applyGameConfig() {
    const g = G();
    CHAR_TIERS = g.charTiers;
    SIG_WEAPONS = g.sigWeapons;
    CHAR_ABBR = g.charAbbr;
    CHAR_ALIASES = g.charAliases;
    FULL_CONST_WEIGHT = g.fullConstWeight;
    DEFAULT_TEAMS = g.defaultTeams;
    DEFAULT_CHAR_PRICES = g.defaultCharPrices;
    DEFAULT_CONST_PREMIUMS = g.defaultConstPremiums;
    DEFAULT_NEED_SIG_WEAPONS = g.defaultNeedSigWeapons;
    DEFAULT_TEAM_MATES = g.defaultTeamMates;
    WEIGHT_LABELS = g.weightLabels;
    SECTION_KEYWORDS = g.sectionKeywords;
    STORAGE_KEYS = buildStorageKeys(g.storagePrefix);
    DEFAULT_WEIGHTS = buildGameDefaultWeights(g);
    // 构建角色名查找表
    CHAR_LOOKUP = {};
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
  }

  // 判断标题是否已含武器段（任一武器段关键词命中即算）
  function hasWeaponSection(title) {
    return G().keywords.weaponSections.some(kw => (title || '').indexOf(kw) >= 0);
  }

  // 更新面板中依赖游戏配置的动态文本（表头等）
  function updateGameLabels() {
    const thMoto = document.getElementById('mwThMoto');
    const thChars = document.getElementById('mwThChars');
    if (thMoto) thMoto.textContent = G().labels.motoColumn;
    if (thChars) thChars.textContent = G().labels.charColumn;
    if (dom.gameSelector) dom.gameSelector.value = currentGame;
  }

  // 切换监控游戏：记录选择，保存当前游戏状态，跳转到新游戏列表页
  // （各游戏的数据/配置/状态通过存储键前缀完全隔离，新页面按URL自动识别游戏）
  function switchGame(newGame) {
    if (!GAME_CONFIGS[newGame] || newGame === currentGame) return;
    localStorage.setItem(GLOBAL_STORAGE_KEYS.game, newGame);
    saveState();
    window.location.href = 'https://www.pxb7.com/buy/' + GAME_CONFIGS[newGame].platformIds.pxb7 + '/1';
  }

  // 资源名称列表（用于kjs归一化等正则构建）
  function resourceNames() {
    return G().keywords.resources.map(r => r.name);
  }
  // 资源摘要文本（调试日志用，如"星声1234 月相56 黄12"）
  function resourceSummaryText(parsed) {
    return G().keywords.resources.map(r => r.name + (parsed[r.key] || 0)).join(' ');
  }
  // 游戏文本特征正则（判断文本是否为当前游戏的商品描述：等级/黄数单位/命座单位/资源名/精炼）
  function gameTextPattern() {
    const g = G();
    return new RegExp('(?:级[，,]|' + g.yellowUnits.join('|') + '|金角色|' +
      g.constUnits.join('|') + '|' + resourceNames().join('|') + '|精\\d)');
  }
  // 抽数计算公式文本（如"星声/160+月相/160+余波珊瑚/8+浮金波纹+铸潮波纹"）
  function pullFormulaText() {
    return G().keywords.resources.filter(r => r.div > 0)
      .map(r => r.name + (r.div > 1 ? '/' + r.div : '')).join('+');
  }
  // 收录/通知最低等级
  function minLevel() {
    return G().minLevel;
  }

  // ============================================================
  // 估值权重默认值（可被用户在设置面板中覆盖；数值参数两游戏相同）
  // ============================================================
  function buildGameDefaultWeights(g) {
    return {
      // 满命溢价（加权满命数档位）
      c6TierWeights: g.fullConstWeight,
      c6MultiBonus: [{"count":1.5,"bonus":0.25},{"count":2,"bonus":0.5},{"count":2.5,"bonus":0.75},{"count":3,"bonus":1},{"count":3.5,"bonus":1.25},{"count":4,"bonus":1.5},{"count":4.5,"bonus":1.75},{"count":5,"bonus":2},{"count":5.5,"bonus":2.25},{"count":6,"bonus":2.5},{"count":6.5,"bonus":2.75},{"count":7,"bonus":3},{"count":7.5,"bonus":3.25},{"count":8,"bonus":3.5},{"count":8.5,"bonus":3.75},{"count":9,"bonus":4},{"count":9.5,"bonus":4.25},{"count":10,"bonus":4.5}],
      // 满命溢价公式参数（加权满命数 → 角色价值溢价系数）
      c6Base: 0,           // 基准加权满命数
      c6BaseBonus: 0,      // 基准溢价（0%）
      c6Step: 0.1,         // 每档满命数
      c6StepBonus: 0.025,  // 每档浮动（2.5%）
      // 资源定价
      outfit: 0,             // 服饰/皮肤单价
      motoFrame: 0,          // 车架模组/邦布单价
      // 满命抽数加成公式参数（加权满命数 → 抽数价值加成系数）
      pullC6Base: 0,          // 基准加权满命数
      pullC6BaseBonus: 0,     // 基准加成（0%）
      pullC6Step: 1,          // 每档满命数
      pullC6StepBonus: 0.4,   // 每档浮动（40%）
      pullC6Threshold: 100,   // 抽数阈值，低于此值不加成
      pullC6MaxWeightedConst: 5, // 加权满命数上限，超过此值不再增加加成
      pullPerWeightedConst: 450,  // 每N抽折算一次加权满命（0=不折算）
      pullPerWeightedConstCount: 0.5,  // 每次折算多少个加权满命
      // 多配队额外系数
      teamMultiBonus: [
        { count: 2, coef: 1 },
        { count: 3, coef: 1.05 },
        { count: 4, coef: 1.1 },
        { count: 5, coef: 1.15 },
        { count: 6, coef: 1.2 },
        { count: 7, coef: 1.25 },
        { count: 8, coef: 1.3 },
        { count: 9, coef: 1.35 },
        { count: 10, coef: 1.4 },
        { count: 11, coef: 1.45 },
        { count: 12, coef: 1.5 },
        { count: 13, coef: 1.55 },
        { count: 14, coef: 1.6 },
      ],
      // 低命折扣系数规则（指定级别角色均不超过N命时，总价值打折）
      flatDiscountRules: [
        { tiers: ['S', 'A'], maxConst: 2, discount: 0.8 },
      ],
      // C6配队依赖（向后兼容配置，仅提取 teammate 字段用于 teamMates 迁移；不影响角色等级）
      c6TeamDependency: g.c6TeamDependency,
      // 无专武折扣（需要专武的角色，无专武时价值 × 此值）
      needSigDiscount: 0.3,
      // 强绑角色折扣（强绑队友全不在场时，角色价值 × 此值）
      teamDepDiscount: 0.4,
      // 限定金系数上限
      yellowMaxCoeff: 2.5,
      // 限定金分段系数（null=单公式模式；数组=分段模式）
      yellowSegments: null,
      // 有效金系数（基于有效金数分段，每段独立基准系数，互不影响）
      effYellowSeg1BaseCoeff: 0.15,  // 第1段基准系数（有效金=0时的系数）
      effYellowSeg1Threshold: 15,    // 第1段边界（0~15有效金）
      effYellowSeg1Step: 0.03,       // 第1段每金浮动
      effYellowSeg2BaseCoeff: 0.6,   // 第2段基准系数（绝对，gold=0时的虚拟截距）
      effYellowSeg2Threshold: 50,    // 第2段边界（15~50有效金）
      effYellowSeg2Step: 0.02,       // 第2段每金浮动
      effYellowSeg3BaseCoeff: 1.3,   // 第3段基准系数（绝对，gold=0时的虚拟截距）
      effYellowSeg3Step: 0.014,      // 第3段（50~100有效金）每金浮动
      effYellowMaxCoeff: 2,          // 系数上限
      effYellowSegments: [           // 3段递推式分段
        { baseCoeff: 0.3, threshold: 10, step: 0.03 },
        { baseCoeff: 0.4, threshold: 40, step: 0.02 },
        { baseCoeff: 0.88, threshold: null, step: 0.008 }
      ],
      // 有效金级别系数（该级别角色的命座与专武折算计入有效金的比例）
      effTierWeights: { S: 1, A: 1, B: 1, C: 0.5, D: 0.5, E: 0 },
    };
  }

  // 默认抽数阶梯定价公式参数
  const DEFAULT_PULL_FORMULA = {
    pullBase: 200,        // 基准抽数
    pullBasePrice: 1.0,   // 基准每抽价格（元）
    pullStepPrice: 0.002, // 每多一抽的浮动价格
    pullMaxPrice: 5,      // 每抽价格上限（元，0=不限制）
  };

  // 默认限定金阶梯系数
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

  // 生成默认命座绝对定价表（从DEFAULT_CONST_PREMIUMS + DEFAULT_CHAR_PRICES转换）
  // 格式: { 角色名: { '1': c1绝对价, ..., '6': c6绝对价 } }，C0 = charPrices[角色名]
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

  // 生成默认配队溢价表（对象格式，从DEFAULT_TEAMS转换）
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

  // API地址（从螃蟹网页面JS源码中逆向获取）
  // V.SEARCH = "/search", V.PRODUCT = "/product/web"
  // zt(url, body) = POST, Dt(url, body, {query}) = GET
  // 所有路径前自动加 /api 前缀
  const API_URLS = {
    list: 'https://api-pc.pxb7.com/api/search/product/v2/selectSearchPageList',
    detail: 'https://api-pc.pxb7.com/api/product/web/product/detailPost',
    options: 'https://api-pc.pxb7.com/api/product/web/gameBizProd/selectSearchOption',
    soldList: 'https://api-pc.pxb7.com/api/search/product/selectSelledList',
  };

  /**
   * 使用 XMLHttpRequest 发起请求（与网站自身请求方式一致，避免WAF差异对待fetch）
   */
  function xhrPost(url, body, timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
      xhr.withCredentials = true;
      xhr.timeout = timeoutMs;

      xhr.onload = function() {
        var ct = xhr.getResponseHeader('content-type') || '';
        if (ct.indexOf('json') >= 0) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('XHR JSON解析失败'));
          }
        } else {
          var preview = xhr.responseText ? xhr.responseText.substring(0, 300) : '(empty)';
          console.warn('[鸣潮监控] XHR返回非JSON, ct:', ct, 'status:', xhr.status, '前300字:', preview);
          // 检测WAF
          if (xhr.responseText && (xhr.responseText.indexOf('aliyun_waf') >= 0 || xhr.responseText.indexOf('_waf_') >= 0)) {
            reject(new Error('WAF_CHALLENGE'));
          } else {
            reject(new Error('XHR返回非JSON(ct:' + ct + ')'));
          }
        }
      };

      xhr.onerror = function() {
        reject(new Error('XHR网络错误'));
      };

      xhr.ontimeout = function() {
        reject(new Error('XHR超时'));
      };

      xhr.send(JSON.stringify(body));
    });
  }

  /**
   * 使用 GM_xmlhttpRequest 发起请求（绕过CORS，携带浏览器cookie）
   * 当普通 fetch 返回非JSON时作为备选方案
   */
  function gmFetch(url, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'Referer': window.location.href,
          'Origin': window.location.origin,
        },
        data: JSON.stringify(body),
        anonymous: false,
        onload: function(resp) {
          try {
            var data = JSON.parse(resp.responseText);
            resolve(data);
          } catch (e) {
            // 记录响应前500字符用于诊断
            var preview = resp.responseText ? resp.responseText.substring(0, 500) : '(empty)';
            console.error('[鸣潮监控] GM_xmlhttpRequest响应非JSON:', resp.status, preview);
            reject(new Error('GM请求返回非JSON (HTTP ' + resp.status + '): ' + preview.substring(0, 200)));
          }
        },
        onerror: function(err) {
          console.error('[鸣潮监控] GM_xmlhttpRequest网络错误:', err);
          reject(new Error('GM请求网络错误'));
        },
        ontimeout: function() {
          reject(new Error('GM请求超时'));
        },
        timeout: 15000,
      });
    });
  }

  /**
   * 通过window.open解决阿里云WAF验证
   * popup加载API域名 → WAF返回含JS的挑战页 → 浏览器在popup中执行JS → 设置cookie → 重载通过
   * 与iframe不同，window.open不受X-Frame-Options限制
   */
  var _wafSolving = false;

  async function solveWAFChallenge() {
    if (_wafSolving) {
      console.log('[鸣潮监控] WAF解决中，等待完成...');
      var waited = 0;
      while (_wafSolving && waited < 20000) {
        await new Promise(r => setTimeout(r, 500));
        waited += 500;
      }
      return;
    }

    _wafSolving = true;
    console.log('[鸣潮监控] 启动WAF验证解决器（popup方式）...');

    var wafUrl = 'https://api-pc.pxb7.com/api/product/web/gameBizProd/selectSearchOption';

    try {
      // 方案1: GM_openInTab（不受popup blocker限制，cookie在同浏览器中共享）
      if (typeof GM_openInTab !== 'undefined') {
        console.log('[鸣潮监控] 使用GM_openInTab打开WAF页面...');
        var tab = GM_openInTab(wafUrl, { active: false, insert: true, setParent: true });
        if (tab) {
          // 等待WAF JS执行并设置cookie
          await new Promise(r => setTimeout(r, 6000));
          try { tab.close(); } catch(e) {}
          console.log('[鸣潮监控] GM_openInTab已关闭，WAF cookie应已设置');
        } else {
          console.warn('[鸣潮监控] GM_openInTab失败，尝试window.open...');
          var popup = window.open(wafUrl, '_blank', 'width=100,height=100');
          if (popup) {
            await new Promise(r => setTimeout(r, 6000));
            try { popup.close(); } catch(e) {}
            console.log('[鸣潮监控] popup已关闭，WAF cookie应已设置');
          } else {
            console.warn('[鸣潮监控] popup也被拦截，尝试iframe...');
            await solveWAFViaIframe(wafUrl);
          }
        }
      } else {
        // 方案2: window.open
        var popup2 = window.open(wafUrl, '_blank', 'width=100,height=100');
        if (popup2) {
          await new Promise(r => setTimeout(r, 6000));
          try { popup2.close(); } catch(e) {}
          console.log('[鸣潮监控] popup已关闭，WAF cookie应已设置');
        } else {
          // 方案3: iframe
          console.warn('[鸣潮监控] popup被拦截，尝试iframe...');
          await solveWAFViaIframe(wafUrl);
        }
      }
    } finally {
      _wafSolving = false;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  async function solveWAFViaIframe(wafUrl) {
    await new Promise((resolve) => {
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;width:300px;height:200px;left:10px;top:10px;border:1px solid red;z-index:99999;';
      iframe.src = wafUrl;

      var loadCount = 0;
      var done = false;

      var timeout = setTimeout(() => {
        if (!done) {
          done = true;
          try { document.body.removeChild(iframe); } catch(e) {}
          console.warn('[鸣潮监控] WAF iframe超时(' + loadCount + '次加载)');
          resolve();
        }
      }, 12000);

      iframe.onload = function() {
        loadCount++;
        console.log('[鸣潮监控] WAF iframe 第' + loadCount + '次加载');
        if (loadCount >= 2) {
          if (!done) {
            done = true;
            clearTimeout(timeout);
            console.log('[鸣潮监控] WAF验证已解决(iframe)');
            setTimeout(() => {
              try { document.body.removeChild(iframe); } catch(e) {}
              resolve();
            }, 1000);
          }
        }
      };

      document.body.appendChild(iframe);
    });
  }

  // 盼之平台URL（SSR HTML抓取，无需API token；gameId按当前游戏动态生成）
  function pzdsUrls() {
    const gameId = G().platformIds.pzds;
    return {
      list: 'https://www.pzds.com/goodsList/' + gameId,
      detail: 'https://www.pzds.com/goodsDetails',
      pay: 'https://www.pzds.com/confirmOrder/fullPayment?status=null&orderNo&gameId=' + gameId + '&goodsNo=',
    };
  }

  // 氪金兽平台URL（MWP API，MD5签名+token自动续期）
  const KJS_URLS = {
    api: 'https://api.kejinshou.com/h5/mwp.kjs_search.product.search/1.0',
    detail: 'https://www.kejinshou.com/goods/details/',
  };

  // 7881平台URL（API抓取，需MD5签名；list URL按当前游戏动态生成）
  function qyUrls() {
    const g = G().platformIds;
    return {
      list: 'https://search.7881.com/' + g.qy + '-' + g.qyGtid + '-0-0-0.html',
      detail: 'https://search.7881.com/',
      api: 'https://gw.7881.com/goods-service-api/api/goods/list',
    };
  }

  // 易手游平台URL（结构化API，返回faction/baoshi字段）
  function ysyUrls() {
    return {
      api: 'https://www.swcbg.com/api/Index/shopList',
      detailApi: 'https://www.swcbg.com/api/Index/shopDetail',
      detail: 'https://pc.swcbg.com/pages/index/newShopDetail?shop_id=',
    };
  }

  // 服务器同步URL（推送配置云端同步）
  const SYNC_URLS = {
    sync: 'https://www.youxigujia.cn/api/push-config/sync',
    get: 'https://www.youxigujia.cn/api/push-config/get',
  };

  // 配置常量
  const CONFIG = {
    refreshInterval: 60000,      // 列表刷新间隔 60秒
    detailInterval: 4000,        // 详情API调用间隔 4秒
    detailRateLimit: 15,         // 详情API每分钟限制
    maxTableRows: 1200,           // 表格最大行数
    maxSeenIds: 2000,              // 已见ID最大数量
    maxNotifiedIds: 500,         // 已通知ID最大数量
    scanPages: 1,                // 默认扫描页数（每页20条，15秒刷新间隔下1页足够覆盖新增）
  };

  // ============================================================
  // 内存状态
  // ============================================================
  let tableData = [];            // 表格数据
  let seenIds = [];              // 已扫描productId
  let notifiedIds = [];          // 已通知productId
  let batchMode = false;          // 批量处理模式：跳过逐条保存和刷新
  let monitorRunning = false;    // 监控开关
  let notifyEnabled = false;     // 通知开关
  let threshold = 20;            // 估值阈值(%)
  let notifyRatioThreshold = 40; // 通知性价比阈值(%)
  let notifyDiffThreshold = 150; // 通知差价阈值(元)，作为阶梯外的默认值
  // 估价阶梯差价阈值：按估值范围设置不同差价阈值，未命中任何阶梯时回退到 notifyDiffThreshold
  let notifyDiffTiers = [
    { minValue: 500, maxValue: 1000, minDiff: 100 },
    { minValue: 1000, maxValue: 3000, minDiff: 0 },
    { minValue: 3000, maxValue: 6000, minDiff: 200 },
  ];
  let autoBuyEnabled = true;   // 自动购买开关
  let autoBuyDiff = 380;        // 自动购买差价阈值(元)
  let notifyMinValue = 400;      // 通知估值下限(元)，低于此值不通知
  let notifyMinPrice = 0;        // 通知标价下限(元)，低于此值不通知
  let notifyMaxPrice = 20000;    // 通知标价上限(元)，高于此值不通知（0=不限制）
  let autoBuyMaxPrice = 6000;    // 自动抢购标价上限(元)，高于此值不抢购（0=不限制）
  let refreshIntervalSec = 15;   // 刷新间隔（秒），可设置
  let flashSaleEnabled = true;   // 秒杀库池监控开关
  let pzdsEnabled = false;      // 盼之平台监控开关
  let kjsEnabled = false;       // 氪金兽平台监控开关
  let qyEnabled = false;        // 7881平台监控开关
  let ysyEnabled = false;       // 易手游平台监控开关
  // 指定账号通知规则
  let charNotifyRules = [];   // 指定账号通知规则（游戏切换时从 G().defaultCharNotifyRules 重置）
  // 推送通知配置
  let pushConfig = {
    serverChanKey: 'SCT383470T7x9zy1jphllnHLuo7vpw0WA4\nSCT378977TClEq1lr2mRcBmHgadFxK6CVr\nSCT383733TlGLAHCEQaaGqSxiCi0FHEDMU', // Server酱SendKey（微信）
    pushPlusToken: '',     // 旧格式：PushPlus Token字符串（兼容）
    pushPlusSubscribers: [], // PushPlus订阅者列表 [{name, token, validDays, createdAt, priority}]
    syncPassword: '',    // 云端同步密码（管理后台密码）
    secondaryDelay: 10,    // 从通知延迟秒数
    skipHighDiffSecondary: false, // 从通知过滤高差价（开启后差价>阈值的账号不推送给从通知用户）
    highDiffThreshold: 400,      // 从通知差价过滤阈值(元)
    highDiffFilterPlatforms: [], // 从通知高差价过滤的平台列表（空=全部平台）
    soundAlert: true,      // 声音提醒
    visualAlert: true,     // 视觉提醒（页面闪烁+标题闪烁）
    repeatAlert: false,    // 重复提醒（每30秒直到确认）
  };
  let alertBannerEl = null;     // 页面内大横幅提醒
  let titleBlinkTimer = null;   // 标题闪烁定时器
  let repeatAlertTimer = null;  // 重复提醒定时器
  let interceptCount = 0;        // 拦截计数
  let lastInterceptTime = null;  // 最后拦截时间
  let lastRefreshTime = 0;       // 最后刷新时间
  let nextRefreshTime = 0;       // 下次刷新时间
  let lastRefreshError = '';     // 最后刷新错误信息（空=成功）
  let detailQueue = [];          // 详情API队列
  let detailTimer = null;        // 详情队列定时器
  let detailCallsThisMinute = 0; // 本分钟详情API调用数
  let detailMinuteStart = Date.now();
  let charFilter = [];         // 角色筛选（多角色+命座条件）[{name, minConst}]
  let priceFilter = { min: null, max: null };       // 标价筛选
  let valueFilter = { min: null, max: null };       // 估值筛选
  let diffFilter = { min: null, max: null };        // 差价筛选
  let ratioFilter = { min: null, max: null };       // 性价比筛选
  let searchKeyword = '';                           // 商品编号/文字搜索
  let showOnlySold = false;                         // 是否只显示已售账号
  let showOnlyFlashSale = false;                    // 是否只显示秒杀账号
  const PAGE_SIZE = 100;                            // 表格分页每页行数
  let currentPage = 1;                              // 当前页码（1-based）
  let monitorTimeout = null;     // 监控定时器
  let countdownTimer = null;     // 倒计时定时器
  let weights = null;            // 估值权重（init时从localStorage加载）
  let hoverDetailEl = null;      // 悬停详情面板元素
  let pinnedRow = null;          // 被钉住的行元素
  let pinnedProductId = null;    // 被钉住的商品ID
  let hoverHideTimer = null;     // 悬停面板隐藏延时器

  // DOM元素引用
  let dom = {};

  // ============================================================
  // 存储工具（优先使用 Tampermonkey GM 存储，无 5MB 限制；localStorage 作为回退和迁移源）
  // ============================================================
  var _gmReady = (typeof GM_setValue !== 'undefined' && typeof GM_getValue !== 'undefined');

  function loadStorage(key, defaultVal) {
    // 优先从 GM 存储读取
    if (_gmReady) {
      try {
        var raw = GM_getValue(key);
        if (raw !== undefined && raw !== null) {
          return JSON.parse(raw);
        }
      } catch (e) {
        console.warn('[鸣潮监控] GM读取失败，回退localStorage:', key, e);
      }
    }
    // 回退到 localStorage（同时作为旧数据迁移源）
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultVal;
      var parsed = JSON.parse(raw);
      // 自动迁移：找到 localStorage 旧数据，写入 GM 存储并清除 localStorage
      if (_gmReady) {
        try {
          GM_setValue(key, raw);
          localStorage.removeItem(key);
          console.log('[鸣潮监控] 自动迁移存储到GM:', key, '(' + (raw.length / 1024).toFixed(1) + 'KB)');
        } catch (e) {}
      }
      return parsed;
    } catch (e) {
      console.error('[鸣潮监控] 读取存储失败:', key, e);
      return defaultVal;
    }
  }

  function saveStorage(key, val, silent) {
    // 优先写入 GM 存储
    if (_gmReady) {
      try {
        GM_setValue(key, JSON.stringify(val));
        return true;
      } catch (e) {
        console.warn('[鸣潮监控] GM写入失败，回退localStorage:', key, e);
      }
    }
    // 回退到 localStorage
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      if (!silent) {
        console.error('[鸣潮监控] 写入存储失败:', key, e);
      }
      return false;
    }
  }

  /**
   * 诊断各存储键的体积（KB），返回总和
   */
  function diagnoseStorage() {
    let total = 0;
    Object.keys(STORAGE_KEYS).forEach(k => {
      var size = 0;
      var loc = 'N/A';
      if (_gmReady) {
        try {
          var raw = GM_getValue(STORAGE_KEYS[k]);
          if (raw !== undefined && raw !== null) {
            size = raw.length;
            loc = 'GM';
          }
        } catch(e) {}
      }
      if (size === 0) {
        var lsRaw = localStorage.getItem(STORAGE_KEYS[k]);
        if (lsRaw) { size = lsRaw.length; loc = 'LS'; }
      }
      total += size;
      console.log('[鸣潮监控] 存储[' + k + '] ' + (size / 1024).toFixed(1) + 'KB (' + loc + ')');
    });
    console.log('[鸣潮监控] 脚本存储总计: ' + (total / 1024).toFixed(1) + 'KB' + (_gmReady ? ' (GM存储，无5MB限制)' : ' / 5120KB (localStorage)'));
    return total;
  }

  /**
   * 清理冗余存储：精简 seenIds 和 notifiedIds 以释放空间
   * seenIds 只保留 tableData 中存在的 ID + 最近 500 条
   */
  function cleanupSeenIds() {
    if (!seenIds || seenIds.length === 0) return 0;
    const tableIds = new Set(tableData.map(r => r.productId));
    const before = seenIds.length;
    // 保留：在表格中的 ID + 最近 500 条
    const recent = seenIds.slice(-500);
    const recentSet = new Set(recent);
    seenIds = seenIds.filter(id => tableIds.has(id) || recentSet.has(id));
    const freed = before - seenIds.length;
    if (freed > 0) {
      console.log('[鸣潮监控] 清理 seenIds: ' + before + ' → ' + seenIds.length + ' (释放' + freed + '条)');
      saveStorage(STORAGE_KEYS.seen, seenIds, true);
    }
    return freed;
  }

  /**
   * 清理 notifiedIds：移除与表格无关的旧通知记录
   */
  function cleanupNotifiedIds() {
    if (!notifiedIds || notifiedIds.length === 0) return 0;
    const before = notifiedIds.length;
    // 只保留最近的通知记录
    if (notifiedIds.length > 200) {
      notifiedIds = notifiedIds.slice(-200);
      const freed = before - notifiedIds.length;
      console.log('[鸣潮监控] 清理 notifiedIds: ' + before + ' → ' + notifiedIds.length + ' (释放' + freed + '条)');
      saveStorage(STORAGE_KEYS.notified, notifiedIds, true);
      return freed;
    }
    return 0;
  }

  /**
   * 精简表格行数据（去除大字段，减小存储体积）
   * parsed 和 valuation 均可通过 showTitle 重新计算，存储时移除以节省空间
   */
  function slimRow(row) {
    const slim = Object.assign({}, row);
    delete slim.valuation;
    delete slim._cachedValuation;
    delete slim.parsed;           // 可从 showTitle 重新解析
    delete slim.searchResult;     // 搜索结果缓存
    delete slim.detailResult;     // 详情结果缓存
    if (slim.showTitle && slim.showTitle.length > 1500) {
      slim.showTitle = slim.showTitle.substring(0, 1500);
    }
    return slim;
  }

  /**
   * 超精简行：在 slimRow 基础上进一步截断 showTitle，用于极端空间不足时的降级
   */
  function ultraSlimRow(row) {
    const slim = Object.assign({}, row);
    delete slim.valuation;
    delete slim._cachedValuation;
    delete slim.parsed;
    delete slim.fingerprint;
    delete slim.searchResult;     // 搜索结果缓存
    delete slim.detailResult;     // 详情结果缓存
    delete slim.c6Chars;
    delete slim.teamNames;
    if (slim.showTitle && slim.showTitle.length > 1500) {
      slim.showTitle = slim.showTitle.substring(0, 1500);
    }
    return slim;
  }

  /**
   * 安全保存表格数据：如果写入失败，逐步精简数据后重试
   */
  function saveTableData() {
    // 第一次：尝试完整写入
    if (saveStorage(STORAGE_KEYS.table, tableData, true)) return true;

    // 第一次失败：先清理其他存储释放空间，不删表格数据
    console.warn('[鸣潮监控] 表格数据写入失败，清理冗余存储后重试...');
    cleanupSeenIds();
    cleanupNotifiedIds();
    if (saveStorage(STORAGE_KEYS.table, tableData, true)) {
      console.log('[鸣潮监控] 清理存储后写入成功');
      return true;
    }

    // 第二次失败：精简每行数据（移除 valuation / parsed 等大字段），不删行
    console.warn('[鸣潮监控] 仍失败，尝试精简数据（不删行）...');
    const slimmed = tableData.map(slimRow);
    if (saveStorage(STORAGE_KEYS.table, slimmed, true)) {
      tableData = slimmed;
      console.log('[鸣潮监控] 精简数据后写入成功，保留' + tableData.length + '条');
      return true;
    }

    // 第三次失败：超精简（截断 showTitle + 移除更多字段），仍不删行
    console.warn('[鸣潮监控] 仍失败，尝试超精简模式（不删行）...');
    const ultraed = tableData.map(ultraSlimRow);
    if (saveStorage(STORAGE_KEYS.table, ultraed, true)) {
      tableData = ultraed;
      console.log('[鸣潮监控] 超精简后写入成功，保留' + tableData.length + '条');
      return true;
    }

    // 第四次失败：按重要性排序后渐进式减少行数（每次删50条）
    const importanceSorted = tableData.slice().sort((a, b) => {
      const timeA = a.firstSeen || a.listTime || 0;
      const timeB = b.firstSeen || b.listTime || 0;
      const unknownA = timeA === 0 ? 1 : 0;
      const unknownB = timeB === 0 ? 1 : 0;
      if (unknownA !== unknownB) return unknownA - unknownB;
      const valA = a.value || 0;
      const valB = b.value || 0;
      if (valA !== valB) return valB - valA;
      return timeB - timeA;
    });
    for (let limit = tableData.length - 50; limit >= 100; limit -= 50) {
      const trimmed = importanceSorted.slice(0, limit).map(ultraSlimRow);
      if (saveStorage(STORAGE_KEYS.table, trimmed, true)) {
        console.warn('[鸣潮监控] 表格数据缩减至' + limit + '条写入成功');
        tableData = trimmed;
        const keptIds = new Set(trimmed.map(r => r.productId));
        seenIds = seenIds.filter(id => keptIds.has(id));
        saveStorage(STORAGE_KEYS.seen, seenIds, true);
        return true;
      }
    }

    // 最终诊断
    console.error('[鸣潮监控] 表格数据即使超精简后仍无法写入，localStorage 可能已满');
    diagnoseStorage();
    return false;
  }

  /**
   * 加载估值权重（合并默认值与localStorage中的用户设置）
   * @returns {object} 权重对象（含 charPrices / constPremiums / teamPremiums / pullBase / yellowBase）
   */
  function loadWeights() {
    // 配置版本检查：版本号不匹配时强制更新分段配置
    const savedVersion = loadStorage(STORAGE_KEYS.configVersion, 0);
    if (savedVersion < CONFIG_VERSION) {
      console.log('[鸣潮监控] 配置版本升级(' + savedVersion + '→' + CONFIG_VERSION + ')，更新有效金分段配置');
      // 强制清除旧的分段配置，让新默认值生效
      const oldSaved = loadStorage(STORAGE_KEYS.weights, null) || {};
      delete oldSaved.effYellowSegments;
      delete oldSaved.effYellowMaxCoeff;
      delete oldSaved.effYellowSeg1BaseCoeff;
      delete oldSaved.effYellowSeg1Threshold;
      delete oldSaved.effYellowSeg1Step;
      delete oldSaved.effYellowSeg2BaseCoeff;
      delete oldSaved.effYellowSeg2Threshold;
      delete oldSaved.effYellowSeg2Step;
      delete oldSaved.effYellowSeg3BaseCoeff;
      delete oldSaved.effYellowSeg3Step;
      // 级别系数若仍为旧默认值（全1），清除以应用新默认值（C/D=0.5, E=0）
      const savedEffTier = oldSaved.effTierWeights;
      if (savedEffTier) {
        const isOldDefault = ['S', 'A', 'B', 'C', 'D', 'E'].every(k => {
          const v = savedEffTier[k];
          return v == null || v === 1;
        });
        if (isOldDefault) delete oldSaved.effTierWeights;
      }
      saveStorage(STORAGE_KEYS.weights, oldSaved);
      saveStorage(STORAGE_KEYS.configVersion, CONFIG_VERSION);
    }

    const saved = loadStorage(STORAGE_KEYS.weights, null) || {};
    // 基础权重参数
    const w = Object.assign({}, DEFAULT_WEIGHTS, saved);
    // 嵌套对象单独合并
    w.c6TierWeights = Object.assign({}, DEFAULT_WEIGHTS.c6TierWeights, saved.c6TierWeights || {});
    // 有效金级别系数（该级别角色的命座与专武折算计入有效金的比例）
    w.effTierWeights = Object.assign({}, DEFAULT_WEIGHTS.effTierWeights, saved.effTierWeights || {});
    // 列表类配置：优先用用户保存的，否则用默认
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
    w.pullC6Threshold = (saved.pullC6Threshold != null) ? saved.pullC6Threshold : (DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400);
    w.pullC6MaxWeightedConst = (saved.pullC6MaxWeightedConst != null) ? saved.pullC6MaxWeightedConst : (DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20);
    w.pullPerWeightedConst = (saved.pullPerWeightedConst != null) ? saved.pullPerWeightedConst : (DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450);
    w.pullPerWeightedConstCount = (saved.pullPerWeightedConstCount != null) ? saved.pullPerWeightedConstCount : (DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1);
    w.teamMultiBonus = (saved.teamMultiBonus && saved.teamMultiBonus.length) ? saved.teamMultiBonus : DEFAULT_WEIGHTS.teamMultiBonus;
    w.flatDiscountRules = (saved.flatDiscountRules && saved.flatDiscountRules.length) ? saved.flatDiscountRules : DEFAULT_WEIGHTS.flatDiscountRules;
    w.c6TeamDependency = saved.c6TeamDependency || DEFAULT_WEIGHTS.c6TeamDependency;
    // 抽数阶梯定价公式参数
    w.pullBase = (saved.pullBase != null) ? saved.pullBase : DEFAULT_PULL_FORMULA.pullBase;
    w.pullBasePrice = (saved.pullBasePrice != null) ? saved.pullBasePrice : DEFAULT_PULL_FORMULA.pullBasePrice;
    w.pullStepPrice = (saved.pullStepPrice != null) ? saved.pullStepPrice : DEFAULT_PULL_FORMULA.pullStepPrice;
    w.pullMaxPrice = (saved.pullMaxPrice != null) ? saved.pullMaxPrice : (DEFAULT_PULL_FORMULA.pullMaxPrice != null ? DEFAULT_PULL_FORMULA.pullMaxPrice : 0);
    // 限定金系数公式参数
    w.yellowBase = (saved.yellowBase != null) ? saved.yellowBase : 40;
    w.yellowStep = (saved.yellowStep != null) ? saved.yellowStep : 1;
    w.yellowBaseCoeff = (saved.yellowBaseCoeff != null) ? saved.yellowBaseCoeff : 1.0;
    w.yellowStepCoeff = (saved.yellowStepCoeff != null) ? saved.yellowStepCoeff : 0.01;
    w.yellowMaxCoeff = (saved.yellowMaxCoeff != null) ? saved.yellowMaxCoeff : DEFAULT_WEIGHTS.yellowMaxCoeff;
    w.yellowSegments = (saved.yellowSegments && saved.yellowSegments.length > 0) ? saved.yellowSegments : (DEFAULT_WEIGHTS.yellowSegments || null);
    // 有效金系数参数（动态分段数组，每段独立基准系数，互不影响）
    w.effYellowMaxCoeff = (saved.effYellowMaxCoeff != null) ? saved.effYellowMaxCoeff : DEFAULT_WEIGHTS.effYellowMaxCoeff;
    if (saved.effYellowSegments && Array.isArray(saved.effYellowSegments) && saved.effYellowSegments.length > 0) {
      w.effYellowSegments = saved.effYellowSegments.map(function(s) {
        return { baseCoeff: s.baseCoeff, threshold: s.threshold != null ? s.threshold : null, step: s.step };
      });
    } else if (DEFAULT_WEIGHTS.effYellowSegments && Array.isArray(DEFAULT_WEIGHTS.effYellowSegments) && DEFAULT_WEIGHTS.effYellowSegments.length > 0) {
      w.effYellowSegments = DEFAULT_WEIGHTS.effYellowSegments.map(function(s) {
        return { baseCoeff: s.baseCoeff, threshold: s.threshold != null ? s.threshold : null, step: s.step };
      });
    } else {
      // 向后兼容：从旧的固定3段字段构建数组
      var _s1T = (saved.effYellowSeg1Threshold != null) ? saved.effYellowSeg1Threshold : DEFAULT_WEIGHTS.effYellowSeg1Threshold;
      var _s1S = (saved.effYellowSeg1Step != null) ? saved.effYellowSeg1Step : DEFAULT_WEIGHTS.effYellowSeg1Step;
      var _s2T = (saved.effYellowSeg2Threshold != null) ? saved.effYellowSeg2Threshold : DEFAULT_WEIGHTS.effYellowSeg2Threshold;
      var _s2S = (saved.effYellowSeg2Step != null) ? saved.effYellowSeg2Step : DEFAULT_WEIGHTS.effYellowSeg2Step;
      var _s3S = (saved.effYellowSeg3Step != null) ? saved.effYellowSeg3Step : DEFAULT_WEIGHTS.effYellowSeg3Step;
      var _s1B, _s2B, _s3B;
      if (saved.effYellowSeg1BaseCoeff != null) {
        _s1B = saved.effYellowSeg1BaseCoeff;
      } else if (saved.effYellowBaseCoeff != null) {
        _s1B = saved.effYellowBaseCoeff;
      } else {
        _s1B = DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff;
      }
      if (saved.effYellowSeg2BaseCoeff != null) {
        _s2B = saved.effYellowSeg2BaseCoeff;
      } else {
        var _oldBase = (saved.effYellowBaseCoeff != null) ? saved.effYellowBaseCoeff : DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff;
        _s2B = _oldBase + _s1T * (_s1S - _s2S);
      }
      if (saved.effYellowSeg3BaseCoeff != null) {
        _s3B = saved.effYellowSeg3BaseCoeff;
      } else {
        var _oldBase2 = (saved.effYellowBaseCoeff != null) ? saved.effYellowBaseCoeff : DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff;
        var _seg2Val = _oldBase2 + _s1T * _s1S;
        var _seg3Val = _seg2Val + (_s2T - _s1T) * _s2S;
        _s3B = _seg3Val - _s2T * _s3S;
      }
      w.effYellowSegments = [
        { baseCoeff: _s1B, threshold: _s1T, step: _s1S },
        { baseCoeff: _s2B, threshold: _s2T, step: _s2S },
        { baseCoeff: _s3B, threshold: null, step: _s3S }
      ];
    }

    // 改进5：角色价格表（按角色名，合并默认值与用户自定义）
    w.charPrices = Object.assign({}, buildDefaultCharPrices(), saved.charPrices || {});
    // 数据迁移：旧的'秧秧'是五星角色(价格35)，现已改名为'秧秧玄翎'
    // 四星'秧秧'价格应为0，如果旧配置中'秧秧'价格>0说明是旧数据，重置为0
    if (saved.charPrices && saved.charPrices['秧秧'] != null && saved.charPrices['秧秧'] > 0) {
      w.charPrices['秧秧'] = 0;
    }
    // 命座溢价表（使用默认值合并用户自定义，向后兼容）
    w.constPremiums = Object.assign({}, DEFAULT_CONST_PREMIUMS, saved.constPremiums || {});
    // 命座绝对定价表：优先使用用户保存的constPrices，否则从constPremiums转换
    var _defaultConstPrices = buildDefaultConstPrices();
    if (saved.constPrices) {
      w.constPrices = Object.assign({}, _defaultConstPrices, saved.constPrices);
    } else {
      w.constPrices = Object.assign({}, _defaultConstPrices);
      var _oldPremiums = Object.assign({}, DEFAULT_CONST_PREMIUMS, saved.constPremiums || {});
      for (var _cpName in _oldPremiums) {
        if (!_oldPremiums.hasOwnProperty(_cpName)) continue;
        var _cpBase = w.charPrices[_cpName] != null ? w.charPrices[_cpName] : (DEFAULT_CHAR_PRICES[_cpName] || 0);
        var _cpPrem = _oldPremiums[_cpName];
        var _cpPrices = {};
        for (var _c = 1; _c <= 6; _c++) {
          var _maxPrem = 0;
          for (var _bp in _cpPrem) {
            if (!_cpPrem.hasOwnProperty(_bp)) continue;
            var _bk = parseInt(_bp);
            if (!isNaN(_bk) && _bk <= _c) {
              var _pm = _cpPrem[_bp] || 0;
              if (_pm > _maxPrem) _maxPrem = _pm;
            }
          }
          _cpPrices[_c] = _cpBase + _maxPrem;
        }
        w.constPrices[_cpName] = _cpPrices;
      }
    }
    // 改进5：配队溢价表（对象格式）
    w.teamPremiums = saved.teamPremiums || buildDefaultTeamPremiums();
    // 从 teamPremiums 生成 teams 数组（供 calculateValue 和 buildCharTagsHTML 使用）
    w.teams = [];
    for (const teamName of Object.keys(w.teamPremiums)) {
      const t = w.teamPremiums[teamName];
      if (t && t.enabled !== false) {
        w.teams.push({ name: teamName, members: t.chars || [], multiplier: t.multiplier || 1.0 });
      }
    }
    // 需要专武的角色列表（兼容旧格式，统一为名字数组）
    var rawNeedSig = saved.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
    w.needSigWeapons = rawNeedSig.map(function(n) { return typeof n === 'string' ? n : n.name; });
    // 无专武折扣（可配置）
    w.needSigDiscount = (saved.needSigDiscount != null) ? saved.needSigDiscount : DEFAULT_WEIGHTS.needSigDiscount;
    // 强绑队友配置
    w.teamMates = saved.teamMates || DEFAULT_TEAM_MATES;
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
    for (var ctoName in w.charTierOverride) {
      if (!w.charTierOverride.hasOwnProperty(ctoName)) continue;
      var ctoTier = w.charTierOverride[ctoName];
      if (CHAR_LOOKUP[ctoName]) {
        CHAR_LOOKUP[ctoName].tier = ctoTier;
        CHAR_LOOKUP[ctoName].isHot = ctoTier === 'S' || ctoTier === 'A' || ctoTier === 'B';
      } else {
        // 管理后台新增的角色不在charTiers中，需要动态添加到CHAR_LOOKUP
        var tierPrice = 0;
        if (CHAR_TIERS[ctoTier]) tierPrice = CHAR_TIERS[ctoTier].price;
        CHAR_LOOKUP[ctoName] = {
          tier: ctoTier,
          price: tierPrice,
          isHot: ctoTier === 'S' || ctoTier === 'A' || ctoTier === 'B'
        };
      }
    }
    // 补充：charPrices中的自定义角色也加入CHAR_LOOKUP（兼容旧导出未包含charTierOverride的情况）
    if (saved.charPrices) {
      for (var cpName in saved.charPrices) {
        if (!saved.charPrices.hasOwnProperty(cpName)) continue;
        if (!CHAR_LOOKUP[cpName]) {
          var cpTier = (w.charTierOverride && w.charTierOverride[cpName]) || 'C';
          var cpTierPrice = CHAR_TIERS[cpTier] ? CHAR_TIERS[cpTier].price : 0;
          CHAR_LOOKUP[cpName] = {
            tier: cpTier,
            price: cpTierPrice,
            isHot: cpTier === 'S' || cpTier === 'A' || cpTier === 'B'
          };
        }
      }
    }
    return w;
  }

  /**
   * 保存估值权重到localStorage
   * 如果空间不足，先清理表格数据释放空间再重试
   */
  function saveWeights(w) {
    if (saveStorage(STORAGE_KEYS.weights, w)) return true;
    // 权重保存失败，可能是 localStorage 空间被表格数据占满
    console.warn('[鸣潮监控] 权重保存失败，尝试清理表格数据释放空间...');
    saveTableData();
    return saveStorage(STORAGE_KEYS.weights, w);
  }

  // ============================================================
  // 估值引擎
  // ============================================================

  /**
   * 提取文本中某个关键词后的段落内容
   * @param {string} text - 完整描述文本
   * @param {string} keyword - 关键词
   * @returns {string} 段落内容
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
   * 从文本中提取数字
   */
  function extractNumber(text, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 格式1: keyword：数字
    const match1 = text.match(new RegExp(escaped + '[：:]\\s*(\\d[\\d,]*)', 'i'));
    if (match1) return parseInt(match1[1].replace(/,/g, ''));
    // 格式2: 【keyword】：数字（盼之详情页格式）
    const match2 = text.match(new RegExp('【' + escaped + '】\\s*[：:]?\\s*(\\d[\\d,]*)', 'i'));
    if (match2) return parseInt(match2[1].replace(/,/g, ''));
    // 格式3: keyword数量：数字（7881格式，如"星声数量:15533"）
    const match3 = text.match(new RegExp(escaped + '数量[：:]\\s*(\\d[\\d,]*)', 'i'));
    if (match3) return parseInt(match3[1].replace(/,/g, ''));
    // 格式4: keyword\n数字（螃蟹网移动端格式，换行分隔）
    const match4 = text.match(new RegExp(escaped + '\\n\\s*(\\d[\\d,]*)', 'i'));
    if (match4) return parseInt(match4[1].replace(/,/g, ''));
    // 格式5: 数字+keyword（盼之列表页内联格式，如"1088星声"）
    const match5 = text.match(new RegExp('(\\d[\\d,]*)\\s*' + escaped, 'i'));
    if (match5) return parseInt(match5[1].replace(/,/g, ''));
    return 0;
  }

  /**
   * 解析五星角色段落
   * @param {string} section - 角色段落文本
   * @returns {Array} 角色列表 [{name, const, tier, price, isHot}]
   */
  function parseCharacters(section) {
    const chars = [];
    if (!section) return chars;

    // 按逗号、顿号、空格分割，清理末尾】和过滤"N个"计数前缀
    const items = section.split(/[,，、\s;；]+/).map(s => s.replace(/[】\s]+$/, '').trim()).filter(s => s.length > 0 && !/^\d+个$/.test(s));

    for (const item of items) {
      let constNum = -1;
      let name = '';

      // 命座单位按当前游戏配置（鸣潮"命"、绝区零"命/影"）
      for (const unit of G().constUnits) {
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
        // 尝试 "X+Y角色名"（盼之标题格式，如 "0+1爱弥斯"、"3+0维里奈"）
        const m = item.match(/^(\d+)\+(\d+)(.+)$/);
        if (m) {
          constNum = parseInt(m[1]);
          name = m[3].replace(/^常驻武器/, '');
        } else {
          // 仅名称
          name = item;
          constNum = 0;
        }
      }

      // 验证是否为已知角色（别名归一化，去除间隔号·・）
      name = name.replace(/[·・]/g, '');
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
    text = text.replace(/[·・]/g, '');
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
          for (const unit of G().constUnits) {
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
        // "N命武器名"（氪金兽结构化格式，如 "5命千古洑流" 表示精5）
        const m2 = item.match(/^(\d+)命(.+)$/);
        if (m2) {
          refine = parseInt(m2[1]);
          name = m2[2];
        } else {
          name = item;
          refine = 1;
        }
      }
      if (name && !/^\d+$/.test(name)) weapons.push({ name, refine });
    }
    return weapons;
  }

  /**
   * 提取黄数（限定金数量，单位按当前游戏配置：鸣潮"黄"、绝区零"黄/金"）
   */
  function extractYellowCount(text) {
    for (const unit of G().yellowUnits) {
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
    for (const unit of G().yellowUnits) {
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
    const items = section.split(/[,，、\s;；]+/).filter(s => s.length > 0);
    return items.length;
  }

  /**
   * 解析账号描述信息
   * @param {string} text - showTitle 完整描述
   * @returns {object} 解析结果
   */
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
    for (const kw of G().keywords.charSections) {
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
    for (const kw of G().keywords.weaponSections) {
      const weaponSection = extractSection(text, kw);
      if (weaponSection) {
        result.weapons = parseWeapons(weaponSection);
        if (result.weapons.length > 0) break;
      }
    }

    // 提取资源数量（按当前游戏的资源关键词，key跨游戏一致）
    for (const r of G().keywords.resources) {
      result[r.key] = extractNumber(text, r.name);
    }

    // 提取黄数
    result.yellowCount = extractYellowCount(text);

    // 提取服饰/皮肤数量（按当前游戏关键词；盼之格式段落可能是纯数字）
    for (const kw of G().outfitSectionKeywords) {
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
    result.motoCount = G().motoSectionKeywords.reduce((sum, kw) => sum + extractListCount(text, kw), 0);
    result.motoAccessoryCount = G().motoAccessoryKeywords.reduce((sum, kw) => sum + extractListCount(text, kw), 0);
    result.vehicleFrameCount = extractListCount(text, '车架模组') + extractListCount(text, '车架');
    result.paintCount = extractListCount(text, '涂装');

    // 计算总抽数（按当前游戏资源关键词的换算除数，div=0的资源不计入）
    result.pulls = 0;
    for (const r of G().keywords.resources) {
      if (r.div > 1) result.pulls += (result[r.key] || 0) / r.div;
      else if (r.div === 1) result.pulls += (result[r.key] || 0);
    }

    return result;
  }

  /**
   * 生成内容指纹：基于账号内容特征（不含productId和price）
   * 同一账号重复上架（新productId）时指纹相同，用于去重合并
   */
  function generateFingerprint(parsed) {
    const parts = [];
    // 角色：名称+命座（按名称排序确保一致性）
    const chars = [...parsed.characters]
      .map(c => c.name + 'c' + c.const)
      .sort();
    parts.push('ch:' + chars.join(','));
    // 武器：名称+精炼（按名称排序）
    const weapons = [...parsed.weapons]
      .map(w => w.name + 'r' + (w.refine || 0))
      .sort();
    parts.push('wp:' + weapons.join(','));
    // 资源数量（精确数值，唯一性强）
    parts.push('ss:' + parsed.starSound);
    parts.push('mp:' + parsed.moonPhase);
    parts.push('ac:' + parsed.aftermathCoral);
    parts.push('fg:' + parsed.floatGoldRipple);
    parts.push('ct:' + parsed.castTideRipple);
    // 黄数、服饰、摩托、涂装
    parts.push('yc:' + parsed.yellowCount);
    parts.push('of:' + parsed.outfitCount);
    parts.push('mo:' + parsed.motoCount);
    parts.push('pa:' + parsed.paintCount);
    return parts.join('|');
  }

  /**
   * 检查角色是否有专武
   */
  function checkHasSigWeapon(charName, weaponNames, weaponSectionText) {
    const sigOverride = weights ? weights.sigWeaponsOverride : null;
    const sigName = (sigOverride && sigOverride[charName]) || SIG_WEAPONS[charName];
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
   * @param {string} charName - 角色名
   * @param {number} constCount - 命座数
   * @param {object} w - 权重对象（可选）
   * @returns {number} 溢价金额
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
   * 计算单个角色价值（从全局 weights 读取参数）
   * @param {object} char - 角色对象 {name, const, tier, price, isHot}
   * @param {boolean} hasSigWeapon - 是否有专武
   * @param {object} w - 权重对象（可选，默认用全局 weights）
   * @returns {number} 角色价值
   */
  function getCharValue(char, hasSigWeapon, w) {
    w = w || weights || DEFAULT_WEIGHTS;
    // 改进5：基础价优先用按角色名的价格表，否则用级别默认价
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
   * 计算抽数价值（公式：每抽价格 = 基准价格 + (抽数 - 基准抽数) × 每抽浮动，上限封顶）
   * @param {number} pulls - 总抽数
   * @returns {object} { pulls, perPull, tierLabel, total }
   */
  function calculatePullValue(pulls) {
    var base = (weights && weights.pullBase != null) ? weights.pullBase : DEFAULT_PULL_FORMULA.pullBase;
    var basePrice = (weights && weights.pullBasePrice != null) ? weights.pullBasePrice : DEFAULT_PULL_FORMULA.pullBasePrice;
    var stepPrice = (weights && weights.pullStepPrice != null) ? weights.pullStepPrice : DEFAULT_PULL_FORMULA.pullStepPrice;
    var maxPrice = (weights && weights.pullMaxPrice != null) ? weights.pullMaxPrice : (DEFAULT_PULL_FORMULA.pullMaxPrice != null ? DEFAULT_PULL_FORMULA.pullMaxPrice : 0);

    var perPull = basePrice + (pulls - base) * stepPrice;
    if (perPull < 0) perPull = 0;
    if (maxPrice > 0 && perPull > maxPrice) perPull = maxPrice;

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
   * @param {number} yellowCount - 限定金数
   * @returns {object} { yellowCount, coefficient, tierLabel }
   */
  function getYellowCoeff(yellowCount) {
    var maxCoeff = (weights && weights.yellowMaxCoeff != null) ? weights.yellowMaxCoeff : DEFAULT_WEIGHTS.yellowMaxCoeff;

    // ===== 分段模式 =====
    var segments = (weights && weights.yellowSegments && weights.yellowSegments.length > 0) ? weights.yellowSegments : null;
    if (segments && segments.length > 0) {
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
      var segTierLabel = segTierStart + '~' + segTierEnd + '有效';

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
    var tierLabel = tierStart + '~' + tierEnd + '有效';

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
    var segs = w.effYellowSegments || [
      { baseCoeff: 0.3, threshold: 10, step: 0.03 },
      { baseCoeff: 0.4, threshold: 40, step: 0.02 },
      { baseCoeff: 0.88, threshold: null, step: 0.008 }
    ];
    var maxCoeff = (w.effYellowMaxCoeff != null) ? w.effYellowMaxCoeff : 2.5;

    var coeff;
    var segIdx = 0;
    var segLabel;

    // 递推计算各分段起点的系数值，确保分段之间始终连贯
    var segStartCoeff = [];
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var segBase = (seg.baseCoeff != null) ? seg.baseCoeff : 0.3;
      var segStep = (seg.step != null && seg.step !== 0) ? seg.step : (seg.step === 0 ? 0 : 0.01);

      if (i === 0) {
        segStartCoeff[i] = segBase;
      } else {
        var prevT = segs[i - 1].threshold;
        var prevPrevT = (i >= 2) ? segs[i - 2].threshold : 0;
        var prevStep = (segs[i - 1].step != null && segs[i - 1].step !== 0) ? segs[i - 1].step : (segs[i - 1].step === 0 ? 0 : 0.01);
        segStartCoeff[i] = segStartCoeff[i - 1] + (prevT - prevPrevT) * prevStep;
      }
    }

    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var segStep = (seg.step != null && seg.step !== 0) ? seg.step : (seg.step === 0 ? 0 : 0.01);
      var segThreshold = seg.threshold;

      if (segThreshold == null || effectiveYellow <= segThreshold) {
        if (i === 0) {
          coeff = segStartCoeff[0] + effectiveYellow * segStep;
        } else {
          var prevT = segs[i - 1].threshold;
          coeff = segStartCoeff[i] + (effectiveYellow - prevT) * segStep;
        }
        segIdx = i;
        if (i === 0) {
          segLabel = (segThreshold != null ? '0~' + segThreshold : '0+') + '有效金';
        } else {
          segLabel = prevT + (segThreshold != null ? '~' + segThreshold : '+') + '有效金';
        }
        break;
      }
    }

    if (coeff == null) {
      var lastIdx = segs.length - 1;
      var lastSeg = segs[lastIdx];
      var lastStep = (lastSeg.step != null && lastSeg.step !== 0) ? lastSeg.step : (lastSeg.step === 0 ? 0 : 0.001);
      var prevT = lastIdx > 0 ? segs[lastIdx - 1].threshold : 0;
      coeff = segStartCoeff[lastIdx] + (effectiveYellow - prevT) * lastStep;
      segIdx = lastIdx;
      segLabel = prevT + '+有效金';
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

  /**
   * 从文本中提取某个关键词段落的条目列表（用于服饰/摩托/车架/涂装明细）
   * @param {string} text - 完整描述文本
   * @param {string} keyword - 关键词
   * @returns {Array} 条目列表
   */
  function isDescriptiveJunk(s) {
    if (!s) return true;
    // 含【】括号描述（如"详情看图【官服】【官方截图】"）
    if (/【.+?】/.test(s)) return true;
    // 含账号交易常见描述词
    if (/(详情|看图|官服|截图|私聊|联系|微信|加微|加v|\+v|qq|议价|包赔|回收|代售|租号|出售|买号|诚收|甩卖|清仓|特价|秒杀|送号|免费|包邮|担保|验号|包过)/i.test(s)) return true;
    return false;
  }

  function extractListItems(text, keyword) {
    const section = extractSection(text, keyword);
    if (!section) return [];
    return section.split(/[,，、\s;；]+/).filter(s => s.length > 0).filter(s => !isDescriptiveJunk(s));
  }

  /**
   * 完整估值计算
   * @param {object} parsed - parseAccountInfo 的结果
   * @param {number} price - 标价（元）
   * @returns {object} 估值结果
   */
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
    const sigDiscountNotes = [];  // 无专武折扣记录

    for (const char of parsed.characters) {
      const hasSig = checkHasSigWeapon(char.name, weaponNames, weaponSectionText);
      const val = getCharValue(char, hasSig, w);
      // 改进5：命座溢价（用户自定义的额外加价）
      const premium = calcConstPremium(char.name, char.const, w);
      charValue += val + premium;
      if (hasSig && !hasSignatureWeapons.includes(char.name)) hasSignatureWeapons.push(char.name);

      // 检测无专武折扣是否生效
      if (!hasSig) {
        var needSigList = w.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
        for (var nsi = 0; nsi < needSigList.length; nsi++) {
          var sigEntry = needSigList[nsi];
          var sigEntryName = typeof sigEntry === 'string' ? sigEntry : sigEntry.name;
          if (sigEntryName === char.name) {
            var _nsDiscountRate = w.needSigDiscount != null ? w.needSigDiscount : DEFAULT_WEIGHTS.needSigDiscount;
            var _origVal = Math.round((val + premium) / _nsDiscountRate);
            var _discountAmount = _origVal - Math.round(val + premium);
            sigDiscountNotes.push(char.name + '无专武×' + Math.round(_nsDiscountRate * 100) + '%');
            break;
          }
        }
      }

      // 统计加权满命数
      let fullConstWeightVal = 0;
      if (char.const >= 6) {
        fullConstWeightVal = c6Weights[char.tier] != null ? c6Weights[char.tier] : (FULL_CONST_WEIGHT[char.tier] || 0);
        weightedFullConst += fullConstWeightVal;
      }

      // 改进3：获取专武精炼数（0表示无专武，1-5表示精1-5）
      let sigRefine = 0;
      if (hasSig) {
        const sigName = (w.sigWeaponsOverride && w.sigWeaponsOverride[char.name]) || SIG_WEAPONS[char.name];
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
    // 注意：保持与原版一致，溢价以全部角色价值 charValue 为基数
    let fullConstPremium = 0;
    const c6BonusNotes = [];
    const allC6Chars = charBreakdown.filter(cb => cb.const >= 6 && cb.tier && cb.tier !== 'E');
    const tierCounts = {};
    for (const cb of allC6Chars) {
      tierCounts[cb.tier] = (tierCounts[cb.tier] || 0) + 1;
    }
    // 计算满命加成系数（公式）
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
    var pc6Threshold = (w.pullC6Threshold != null) ? w.pullC6Threshold : (DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400);
    var pc6MaxWC = (w.pullC6MaxWeightedConst != null) ? w.pullC6MaxWeightedConst : (DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20);
    var pc6PullPerWC = (w.pullPerWeightedConst != null && w.pullPerWeightedConst > 0) ? w.pullPerWeightedConst : (DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450);
    var pc6PullPerWCCount = (w.pullPerWeightedConstCount != null) ? w.pullPerWeightedConstCount : (DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1);

    // 加权满命数 = 实际加权满命数 + 抽数折算的额外加权满命数（每N抽+M命）
    var pullBonusWeightedConst = Math.floor((parsed.pulls || 0) / pc6PullPerWC) * pc6PullPerWCCount;
    var adjustedWeightedConst = weightedFullConst + pullBonusWeightedConst;

    var effWeightedConst = (pc6MaxWC > 0 && adjustedWeightedConst > pc6MaxWC) ? pc6MaxWC : adjustedWeightedConst;
    var pullC6Multiplier = (parsed.pulls >= pc6Threshold && adjustedWeightedConst > 0)
      ? pc6BaseBonus + (effWeightedConst - pc6Base) / pc6Step * pc6StepBonus
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

    // 多配队额外系数（从 teamMultiBonus 读取）
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
    // 满命角色多则抽数价值更高：用独立的抽数满命加成系数
    const pullC6Bonus = Math.round(basePullValue * pullC6Multiplier);
    const pullValue = basePullValue + pullC6Bonus;

    // 5. 其他资源（提取明细列表，按 weights 单价计价；关键词按当前游戏）
    const outfits = G().outfitSectionKeywords.reduce((arr, kw) => arr.concat(extractListItems(parsed.rawText, kw)), []);
    const motoAccessories = G().motoAccessoryKeywords.reduce((arr, kw) => arr.concat(extractListItems(parsed.rawText, kw)), []);
    const motoFrames = G().motoValueKeywords.reduce((arr, kw) => arr.concat(extractListItems(parsed.rawText, kw)), []);
    const paints = extractListItems(parsed.rawText, '涂装');

    const outfitValue = outfits.length * (w.outfit || 0);
    const motoFrameValue = motoFrames.length * (w.motoFrame || 0);
    const otherResources = outfitValue + motoFrameValue;

    // 武器明细
    const weaponDetails = parsed.weapons.map(weapon => {
      const isSig = parsed.characters.some(char => {
        const charSigName = (w.sigWeaponsOverride && w.sigWeaponsOverride[char.name]) || SIG_WEAPONS[char.name];
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
      var sigName = (w.sigWeaponsOverride && w.sigWeaponsOverride[char.name]) || SIG_WEAPONS[char.name];
      if (sigName && hasSignatureWeapons.indexOf(char.name) >= 0 && !countedWeapons[sigName]) {
        var sigWeapon = parsed.weapons.find(function(wp) { return wp.name === sigName; });
        if (sigWeapon) {
          limitedYellow += sigWeapon.refine || 1;
          countedWeapons[sigName] = true;
        }
      }
    }

    // 有效金数：S级角色(1+命座) + 其专武 + 完整配队角色(1+命座) + 其专武（不重复计算）
    // 专武有效金：精1=1, 精N=1+(N-1)×0.5（精2=1.5, 精3=2, 精5=3）
    // 级别系数：该级别角色及其专武的贡献 × effTierWeights[tier]（默认1）
    var effTierWeights = w.effTierWeights || {};
    function effTierCoeffOf(tier) {
      var v = effTierWeights[tier];
      return (v != null && !isNaN(v)) ? v : 1;
    }
    const EFFECTIVE_TIERS = ['S'];
    var effectiveYellow = 0;
    var effectiveCountedWeapons = {};
    var effectiveCountedChars = {};
    var effectiveYellowBreakdown = [];
    for (var eci = 0; eci < parsed.characters.length; eci++) {
      var eChar = parsed.characters[eci];
      if (EFFECTIVE_TIERS.indexOf(eChar.tier) < 0) continue;
      var eCoeff = effTierCoeffOf(eChar.tier);
      var eContrib = (1 + (eChar.const || 0)) * eCoeff;
      effectiveYellow += eContrib;
      effectiveCountedChars[eChar.name] = true;
      var eSigName = (w.sigWeaponsOverride && w.sigWeaponsOverride[eChar.name]) || SIG_WEAPONS[eChar.name];
      var eSigRefine = 0;
      var eSigContrib = 0;
      if (eSigName && hasSignatureWeapons.indexOf(eChar.name) >= 0 && !effectiveCountedWeapons[eSigName]) {
        var eSigWeapon = parsed.weapons.find(function(wp) { return wp.name === eSigName; });
        if (eSigWeapon) {
          eSigRefine = eSigWeapon.refine || 1;
          eSigContrib = (1 + (eSigRefine - 1) * 0.5) * eCoeff;
          effectiveYellow += eSigContrib;
          effectiveCountedWeapons[eSigName] = true;
        }
      }
      effectiveYellowBreakdown.push({ name: eChar.name, tier: eChar.tier, const: eChar.const || 0, contrib: eContrib, coeff: eCoeff, sigName: eSigRefine > 0 ? eSigName : null, sigRefine: eSigRefine, sigContrib: eSigContrib, source: 'S级' });
    }
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
      if (effectiveCountedChars[tChar.name]) continue;
      var tCoeff = effTierCoeffOf(tChar.tier);
      var tContrib = (1 + (tChar.const || 0)) * tCoeff;
      effectiveYellow += tContrib;
      effectiveCountedChars[tChar.name] = true;
      var tSigName = (w.sigWeaponsOverride && w.sigWeaponsOverride[tChar.name]) || SIG_WEAPONS[tChar.name];
      var tSigRefine = 0;
      var tSigContrib = 0;
      if (tSigName && hasSignatureWeapons.indexOf(tChar.name) >= 0 && !effectiveCountedWeapons[tSigName]) {
        var tSigWeapon = parsed.weapons.find(function(wp) { return wp.name === tSigName; });
        if (tSigWeapon) {
          tSigRefine = tSigWeapon.refine || 1;
          tSigContrib = (1 + (tSigRefine - 1) * 0.5) * tCoeff;
          effectiveYellow += tSigContrib;
          effectiveCountedWeapons[tSigName] = true;
        }
      }
      effectiveYellowBreakdown.push({ name: tChar.name, tier: tChar.tier, const: tChar.const || 0, contrib: tContrib, coeff: tCoeff, sigName: tSigRefine > 0 ? tSigName : null, sigRefine: tSigRefine, sigContrib: tSigContrib, source: '配队' });
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
    // 优先按当前游戏的等级关键词提取（如鸣潮"联觉等级"、绝区零"绳网等级"），避免误匹配其他含"级"的字段；7881格式用"等级:N"
    let levelMatch = null;
    for (const kw of G().levelKeywords) {
      levelMatch = (parsed.rawText || '').match(new RegExp(kw + '[】：:\\s]*(\\d+)'));
      if (levelMatch) break;
    }
    if (!levelMatch) levelMatch = (parsed.rawText || '').match(/等级[：:]\s*(\d+)/) || (parsed.rawText || '').match(/(\d+)级/);
    const level = levelMatch ? parseInt(levelMatch[1]) : 1;
    const fourStarMatch = (parsed.rawText || '').match(/(\d+)个四星角色/);
    const fourStarChars = fourStarMatch ? parseInt(fourStarMatch[1]) : 0;
    const fiveStarChars = parsed.characters.length;
    const maxConstChars = parsed.characters.filter(c => c.const >= 6).length;

    // 低命折扣系数（指定级别角色均不超过maxConst命时，与有效金系数取较低值）
    let flatDiscount = 1;
    const flatDiscountNotes = [];
    const flatRules = w.flatDiscountRules || [];
    if (flatRules.length > 0) {
      for (const rule of flatRules) {
        if (!rule.tiers || rule.tiers.length === 0) continue;
        // 获取账号中属于指定级别的所有角色
        const tierChars = parsed.characters.filter(c => rule.tiers.includes(c.tier));
        if (tierChars.length === 0) continue;
        // 检查这些角色是否都没有超过maxConst
        const allWithinLimit = tierChars.every(c => c.const <= rule.maxConst);
        if (allWithinLimit) {
          flatDiscount = Math.min(flatDiscount, rule.discount);
          const charSummary = tierChars.map(c => c.name + c.const + G().constUnitDisplay).join('/');
          flatDiscountNotes.push('低命折扣系数(' + rule.tiers.join('+') + '级全≤' + rule.maxConst + '命: ' + charSummary + ') ×' + rule.discount);
        }
      }
    }

    // 低命折扣系数与有效金系数取较低值（不重复计算）
    // 仅当低命折扣规则匹配（flatDiscount < 1）时才取较低值，否则直接用有效金系数
    const finalCoeff = flatDiscount < 1 ? Math.min(yellowCoeff, flatDiscount) : yellowCoeff;
    const totalValue = totalBeforeYellow * finalCoeff;

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
      otherResources,
      yellowCoeff,
      weightedFullConst,
      satisfiedTeams: satisfiedTeams.map(t => t.name),
      ratio: Math.round(ratio * 10) / 10,
      // ===== 新增明细字段（供悬停详情面板使用） =====
      charBreakdown: charBreakdown,        // 每个角色的估值明细
      charDetails: charDetails,            // 角色详情列表
      hasSignatureWeapons: hasSignatureWeapons, // 有专武的角色名列表
      weaponDetails: weaponDetails,        // 武器详情列表
      matchedTeams: satisfiedTeams,        // 匹配的配队列表
      c6DepNotes: teamDepNotes,                 // 强绑队友降级信息（保留旧字段名兼容）
      sigDiscountNotes: sigDiscountNotes,       // 无专武折扣信息
      c6Bonus: { value: Math.round(fullConstPremium), notes: c6BonusNotes }, // 满命溢价信息
      teamBonus: { value: Math.round(teamPremium), notes: teamBonusNotes },  // 配队溢价信息
      flatDiscount: { value: flatDiscount, notes: flatDiscountNotes },       // 低命折扣系数信息
      pullInfo: {                         // 抽数信息
        pulls: pullInfo.pulls,
        perPull: pullInfo.perPull,
        tierLabel: pullInfo.tierLabel,
        baseTotal: basePullValue,
        c6Bonus: pullC6Bonus,
        c6Multiplier: pullC6Multiplier,
        total: pullValue,
      },
      yellowInfo: yellowInfo,              // 黄数信息
      effectiveYellow: effectiveYellow,    // 有效金数(S级+配队角色+专武)
      effectiveYellowBreakdown: effectiveYellowBreakdown, // 有效金贡献角色列表
      outfits: outfits,                    // 服饰列表
      motoAccessories: motoAccessories,    // 摩托饰品列表
      motoFrames: motoFrames,              // 车架列表
      paints: paints,                      // 涂装列表
      level: level,                        // 账号等级
      levelFound: !!levelMatch,            // 等级是否从描述中解析到
      fourStarChars: fourStarChars,        // 四星角色数
      fiveStarChars: fiveStarChars,        // 五星角色数
      maxConstChars: maxConstChars,        // 满命角色数
    };
  }

  /**
   * 格式化角色列表为简写（用于表格显示）
   */
  function formatCharsShort(characters) {
    if (!characters || characters.length === 0) return '-';
    return characters.map(c => {
      const abbr = CHAR_ABBR[c.name] || c.name.substring(0, 1);
      return abbr + c.const;
    }).join(' ');
  }

  // ============================================================
  // API调用
  // ============================================================

  /**
   * 调用列表API
   * 接口: POST /api/search/product/v2/selectSearchPageList
   * 参数（从螃蟹网页面JS源码逆向获取）:
   *   query: 搜索关键词（空字符串=不搜索）
   *   gameId: 游戏ID
   *   pageIndex: 页码（从1开始）
   *   pageSize: 每页数量
   *   bizProd: 业务类型（1=成品账号 FINISHED_ACCOUNT）
   *   type: 查询类型（"4"=过滤商品列表）
   *   posType: 位置类型（1=FILTER_PRODUCT_LIST）
   */
  async function fetchList(page) {
    var listBody = {
      query: '',
      gameId: G().platformIds.pxb7,
      pageIndex: page,
      pageSize: 20,
      bizProd: 1,
      type: '1',
      posType: 1,
      sortType: 2,
      filterDTOList: [],
      combineFilterList: [],
    };

    // 优先使用XMLHttpRequest（与网站自身请求方式一致）
    try {
      var data = await xhrPost(API_URLS.list, listBody);
      if (data) return data;
    } catch (e) {
      if (e.message === 'WAF_CHALLENGE') {
        console.warn('[鸣潮监控] XHR检测到WAF验证');
      } else {
        console.warn('[鸣潮监控] XHR请求失败:', e.message);
      }
    }

    // XHR失败，尝试fetch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(API_URLS.list, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
        body: JSON.stringify(listBody),
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        var ct = response.headers.get('content-type') || '';
        if (ct.indexOf('json') >= 0) return await response.json();
      }
    } catch (e) {
      console.warn('[鸣潮监控] fetch请求失败:', e.message);
    }

    // 所有方式都失败，检测是否WAF并尝试解决
    var wafDetected = false;
    try {
      var gmData = await gmFetch(API_URLS.list, listBody);
      if (gmData) return gmData;
    } catch (gmErr) {
      if (gmErr.message.indexOf('aliyun_waf') >= 0 || gmErr.message.indexOf('_waf_') >= 0) {
        wafDetected = true;
      }
      console.error('[鸣潮监控] GM请求也失败:', gmErr.message);
    }

    if (wafDetected) {
      console.warn('[鸣潮监控] 检测到WAF验证，启动popup解决器...');
      await solveWAFChallenge();

      // WAF解决后重试XHR
      try {
        var retryData = await xhrPost(API_URLS.list, listBody);
        if (retryData) {
          console.log('[鸣潮监控] WAF解决后XHR重试成功');
          return retryData;
        }
      } catch (e) {
        console.warn('[鸣潮监控] WAF解决后XHR重试失败:', e.message);
      }

      // WAF解决后重试fetch
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 15000);
        const response2 = await fetch(API_URLS.list, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
          body: JSON.stringify(listBody),
          credentials: 'include',
          signal: controller2.signal,
        });
        clearTimeout(timeoutId2);
        if (response2.ok) {
          var ct2 = response2.headers.get('content-type') || '';
          if (ct2.indexOf('json') >= 0) {
            console.log('[鸣潮监控] WAF解决后fetch重试成功');
            return await response2.json();
          }
        }
      } catch (e) {
        console.warn('[鸣潮监控] WAF解决后fetch重试失败:', e.message);
      }
    }

    console.error('[鸣潮监控] 所有请求方式均失败(列表API)，可能被WAF/反爬拦截');
    return null;
  }

  /**
   * 获取秒杀库池列表（还价后卖家同意的低价商品）
   * 与普通列表的区别：type=4，filterDTOList带限时秒杀筛选条件
   */
  async function fetchFlashSaleList(page) {
    var fsBody = {
      query: '', gameId: G().platformIds.pxb7, pageIndex: page, pageSize: 16,
      bizProd: 1, type: '1', sortType: 2, posType: 1,
      filterDTOList: [{ attrId: '128593869357091', attrType: 2, attrValList: [-1, ''] }],
      sortAttrId: '', mineFav: false, zoneJumpType: 2, bargainZoneJump: false, combineFilterList: [],
    };

    // XHR优先
    try {
      var data = await xhrPost(API_URLS.list, fsBody);
      if (data) return data;
    } catch (e) {
      console.warn('[鸣潮监控] 秒杀库XHR失败:', e.message);
    }

    // fetch备选
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(API_URLS.list, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
        body: JSON.stringify(fsBody),
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        var ct = response.headers.get('content-type') || '';
        if (ct.indexOf('json') >= 0) return await response.json();
      }
    } catch (e) {
      console.warn('[鸣潮监控] 秒杀库fetch失败:', e.message);
    }

    // GM备选
    try {
      var gmFsData = await gmFetch(API_URLS.list, fsBody);
      if (gmFsData) return gmFsData;
    } catch (e) {
      console.error('[鸣潮监控] 秒杀库GM也失败:', e.message);
    }

    // WAF解决后重试
    console.warn('[鸣潮监控] 秒杀库启动WAF解决器...');
    await solveWAFChallenge();
    try {
      var fsRetry = await xhrPost(API_URLS.list, fsBody);
      if (fsRetry) return fsRetry;
    } catch (e) {}

    console.error('[鸣潮监控] 所有请求方式均失败(秒杀库API)，可能被WAF/反爬拦截');
    return null;
  }

  /**
   * 带重试的秒杀库池API调用
   */
  async function fetchFlashSaleWithRetry(page, retries = 1) {
    for (let i = 0; i <= retries; i++) {
      try {
        const data = await fetchFlashSaleList(page);
        if (data && data.success) return data;
        if (!data) return null;
        if (i < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return data;
      } catch (e) {
        console.error('[鸣潮监控] 秒杀库API调用失败(第' + (i + 1) + '次):', e);
        if (i < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * 带重试的列表API调用
   */
  async function fetchListWithRetry(page, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const data = await fetchList(page);
        if (data && data.success) return data;
        // fetchList返回null表示WAF拦截，重试无意义
        if (!data) return null;
        if (i < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return data;
      } catch (e) {
        console.error('[鸣潮监控] 列表API调用失败(第' + (i + 1) + '次):', e);
        if (i < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw e;
      }
    }
  }

  // ============================================================
  // 盼之平台 SSR HTML 抓取
  // ============================================================

  /**
   * 获取商品链接URL（根据平台来源）
   */
  function getProductUrl(row) {
    if (row.platform === 'pzds') {
      return pzdsUrls().detail + '/' + row.productId.replace(/^pz_/, '') + '/6';
    }
    if (row.platform === 'kjs') {
      return KJS_URLS.detail + row.productId.replace(/^kjs_/, '');
    }
    if (row.platform === 'qy') {
      return qyUrls().detail + row.productId.replace(/^qy_/, '') + '.html';
    }
    if (row.platform === 'ysy') {
      return ysyUrls().detail + row.productId.replace(/^ysy_/, '') + '&shop_source=2';
    }
    return 'https://www.pxb7.com/product/' + row.productId + '/1';
  }

  /**
   * 抓取盼之商品列表页SSR HTML
   * 盼之使用Vite SSR，商品数据直接渲染在HTML中，无需API token
   * @param {number} page - 页码（从1开始）
   * @returns {Promise<Array>} 商品数组
   */
  function fetchListPZ(page) {
    return new Promise((resolve, reject) => {
      const url = pzdsUrls().list + '?page=' + page;
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        headers: {
          'User-Agent': navigator.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
        onload(res) {
          try {
            const products = parsePZListHTML(res.responseText);
            resolve(products);
          } catch (e) {
            console.error('[鸣潮监控] 盼之HTML解析失败:', e);
            resolve([]);
          }
        },
        onerror(err) {
          console.error('[鸣潮监控] 盼之请求失败:', err);
          resolve([]);
        },
        ontimeout() {
          console.error('[鸣潮监控] 盼之请求超时');
          resolve([]);
        },
      });
    });
  }

  /**
   * 抓取盼之商品详情页SSR HTML，提取完整描述
   * 列表页标题被截断（角色列表以...结尾），详情页有完整角色/武器列表
   * 详情页格式: 【五星角色】:6命弗洛洛,3命维里奈,... 【金色武器】:精1焰光裁定,...
   * @param {string} productUniqueNo - 商品编号（如MC9S1Y）
   * @returns {Promise<string>} 完整描述文本，失败时返回空字符串
   */
  function fetchPZDetail(productUniqueNo) {
    return new Promise((resolve) => {
      const url = pzdsUrls().detail + '/' + productUniqueNo + '/6';
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        headers: {
          'User-Agent': navigator.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
        onload(res) {
          try {
            const html = res.responseText || '';
            // WAF拦截检测：阿里云WAF页面特征
            if (html.includes('errors.aliyun.com') || html.includes('acsAlidwError') || html.includes('window.ACS')) {
              console.warn('[鸣潮监控-盼之] 详情页被WAF拦截: ' + productUniqueNo);
              resolve('');
              return;
            }
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const span = doc.querySelector('div.text-overflow span');
            if (span) {
              const text = (span.textContent || '').trim();
              // 验证提取的文本是否为有效商品描述（关键词按当前游戏）
              if (text.length > 20 && gameTextPattern().test(text)) {
                resolve(text);
                return;
              }
            }
            let match = null;
            for (const kw of G().levelKeywords) {
              match = html.match(new RegExp('【' + kw + '】[\\s\\S]*?(?=<\\/)'));
              if (match) break;
            }
            if (match) { resolve(match[0].trim()); return; }
            resolve('');
          } catch (e) {
            console.error('[鸣潮监控-盼之] 详情页解析失败:', e);
            resolve('');
          }
        },
        onerror() {
          console.error('[鸣潮监控-盼之] 详情页请求失败: ' + productUniqueNo);
          resolve('');
        },
        ontimeout() {
          console.error('[鸣潮监控-盼之] 详情页请求超时: ' + productUniqueNo);
          resolve('');
        },
      });
    });
  }

  /**
   * 解析盼之列表页SSR HTML，提取商品数据
   * 商品链接格式: /goodsDetails/MCCRX0/6?from=商品列表
   * 商品文本: "80级，65黄，25金角色，19金武器，1皮肤，1088星声，2月相... ¥400 1小时前发布 9人想要"
   * SSR数据中含 onStandTime 字段，用于过滤旧商品
   * @param {string} htmlText - SSR HTML原文
   * @returns {Array} 商品数组 [{productId, showTitle, price, discount, productUniqueNo, onStandTime}]
   */
  function parsePZListHTML(htmlText) {
    if (!htmlText) return [];
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const links = doc.querySelectorAll('a[href*="goodsDetails"]');
    const products = [];
    const seenNos = new Set();

    // 从SSR数据中提取 goodsNo → onStandTime 映射
    const timeMap = {};
    const timeRegex = /goodsNo:"([A-Za-z0-9]+)"[\s\S]*?onStandTime:"([^"]+)"/g;
    let tm;
    while ((tm = timeRegex.exec(htmlText)) !== null) {
      timeMap[tm[1]] = tm[2];
    }

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/goodsDetails\/([A-Za-z0-9]+)\//);
      if (!match) continue;
      const goodsNo = match[1];
      if (seenNos.has(goodsNo)) continue;
      seenNos.add(goodsNo);

      const text = (link.textContent || '').trim();
      if (text.length < 10) continue;

      // 解析价格: "¥ 400" 或 "￥700"
      const priceMatch = text.match(/[¥￥]\s*(\d+)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
      if (price <= 0) continue;

      // 解析折扣: "已减55"
      const discountMatch = text.match(/已减(\d+)/);
      const discount = discountMatch ? parseFloat(discountMatch[1]) : 0;

      // 提取描述文本：优先使用 title 属性（纯净描述），回退到 textContent 处理
      const titleAttr = link.getAttribute('title') || '';
      let descText;
      if (titleAttr && titleAttr.length > 10) {
        descText = titleAttr.trim();
      } else {
        descText = text.split(/[¥￥]/)[0].trim();
        descText = descText.replace(/\s+官服.*$/, '').replace(/\s+能解绑.*$/, '').trim();
      }

      // 解析上架时间
      const onStandTimeStr = timeMap[goodsNo] || '';
      let onStandTime = 0;
      if (onStandTimeStr) {
        onStandTime = new Date(onStandTimeStr.replace(/-/g, '/')).getTime() || 0;
      }

      products.push({
        productId: 'pz_' + goodsNo,
        productUniqueNo: goodsNo,
        showTitle: descText,
        price: price,
        discount: discount,
        platform: 'pzds',
        listTime: onStandTime || Date.now(),
        onStandTime: onStandTime,
        onStandTimeStr: onStandTimeStr,
      });
    }

    // 从NUXT SSR数据中提取 sellingPointLabels，补充角色和专武信息
    // SSR HTML中 sellingPointLabels 部分标签是Vue模板变量（如bp/bq/aR），需解析NUXT函数获取完整字符串
    // 标签格式1: "角色名X+Y"（Y>=1表示有专武，如 "赞妮0+1"、"卡提希娅6+2"）
    // 标签格式2: "X命角色名"（无专武，如 "0命今汐"）
    let nuxtLabelMap = {};
    try {
      const nuxtStart = htmlText.indexOf('window.__NUXT__=');
      if (nuxtStart >= 0) {
        const nuxtEnd = htmlText.indexOf('</script>', nuxtStart);
        if (nuxtEnd > nuxtStart) {
          const nuxtCode = htmlText.substring(nuxtStart + 'window.__NUXT__='.length, nuxtEnd);
          const getNuxt = new Function('return ' + nuxtCode);
          const nuxt = getNuxt();
          const nuxtGoods = nuxt && nuxt.data && nuxt.data[0] && nuxt.data[0].goodsList;
          if (Array.isArray(nuxtGoods)) {
            for (const ng of nuxtGoods) {
              if (ng.goodsNo && Array.isArray(ng.sellingPointLabels)) {
                nuxtLabelMap[ng.goodsNo] = ng.sellingPointLabels.filter(l => typeof l === 'string');
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[鸣潮监控-盼之] NUXT解析失败，回退到正则提取:', e.message);
    }

    // 对每个商品，用 sellingPointLabels 补全角色和专武信息
    for (const product of products) {
      let labels = nuxtLabelMap[product.productUniqueNo];
      if (!labels) {
        const ssrMatch = htmlText.match(new RegExp('goodsNo:"' + product.productUniqueNo + '"[\\s\\S]*?sellingPointLabels:\\[([^\\]]*)\\]'));
        if (!ssrMatch) continue;
        labels = [];
        const strRegex = /"([^"]+)"/g;
        let sm;
        while ((sm = strRegex.exec(ssrMatch[1])) !== null) labels.push(sm[1]);
      }

      const weapons = new Set();
      const labelChars = [];
      const seenLabelChars = new Set();
      for (const rawLabel of labels) {
        const label = rawLabel.trim();
        const m1 = label.match(/^(.+?)(\d+)\+(\d+)$/);
        if (m1) {
          let rawName = m1[1].replace(/[・·]/g, '');
          const canonicalName = CHAR_ALIASES[rawName] || rawName;
          if (CHAR_LOOKUP[canonicalName] && !seenLabelChars.has(canonicalName)) {
            seenLabelChars.add(canonicalName);
            labelChars.push({ name: canonicalName, const: parseInt(m1[2]) });
            if (parseInt(m1[3]) >= 1) {
              const sigName = SIG_WEAPONS[canonicalName];
              if (sigName) weapons.add('精1' + sigName);
            }
          }
          continue;
        }
        let m2 = null;
        for (const unit of G().constUnits) {
          m2 = label.match(new RegExp('^(\\d+)' + unit + '(.+)$'));
          if (m2) break;
        }
        if (m2) {
          let rawName = m2[2].replace(/[・·]/g, '');
          const canonicalName = CHAR_ALIASES[rawName] || rawName;
          if (CHAR_LOOKUP[canonicalName] && !seenLabelChars.has(canonicalName)) {
            seenLabelChars.add(canonicalName);
            labelChars.push({ name: canonicalName, const: parseInt(m2[1]) });
          }
        }
      }
      const missingChars = labelChars.filter(c => !product.showTitle.includes(c.name));
      if (missingChars.length > 0) {
        product.showTitle += ' ' + missingChars.map(c => c.const + G().constUnits[0] + c.name).join('，');
      }
      if (weapons.size > 0) {
        product.showTitle += ' 【' + G().keywords.weaponSections[0] + '】:' + Array.from(weapons).join(',');
      }
    }

    // 按上架时间降序排序（SSR默认排序非按时间，需手动排序确保最新商品优先）
    products.sort((a, b) => (b.onStandTime || 0) - (a.onStandTime || 0));

    // 打印盼之商品信息
    if (products.length > 0) {
      console.log('%c[鸣潮监控-盼之] 解析到 ' + products.length + ' 条商品（已按上架时间排序）：', 'color:#38bdf8;font-weight:bold');
      products.forEach((p, i) => {
        console.log(
          '%c  [' + (i + 1) + '] ' + p.productUniqueNo +
          ' | ¥' + p.price +
          (p.discount > 0 ? ' (已减¥' + p.discount + ')' : '') +
          (p.onStandTimeStr ? ' | 上架:' + p.onStandTimeStr : '') +
          ' | ' + p.showTitle,
          'color:#94a3b8'
        );
      });
    }

    return products;
  }

  /**
   * 处理盼之平台商品（类似processProduct，但适配盼之数据格式）
   * 盼之价格单位为元（螃蟹网为分），商品ID为字母编号
   * @param {object} product - parsePZListHTML返回的商品对象
   * @param {string} detailText - 从详情页获取的完整描述（可选，列表页标题被截断）
   */
  function processPZProduct(product, detailText) {
    const productId = product.productId;
    if (!productId) return;
    console.log('[鸣潮监控-盼之] processPZProduct开始: ' + product.productUniqueNo + ' ¥' + (product.price || 0) + ' showTitle长度:' + (product.showTitle || '').length + ' detailText长度:' + (detailText || '').length);

    const showTitle = product.showTitle || '';
    const price = product.price || 0;

    // 验证detailText是否为有效商品描述（防止WAF拦截页面覆盖好的showTitle）
    let parseText = showTitle;
    if (detailText && detailText.length > 20) {
      // 检查是否包含商品特征关键词（按当前游戏）
      const hasProductPattern = gameTextPattern().test(detailText);
      if (hasProductPattern) {
        parseText = detailText;
      } else {
        console.warn('[鸣潮监控-盼之] detailText无效(WAF?)，回退到showTitle: ' + product.productUniqueNo + ' detailText前50字: ' + detailText.substring(0, 50));
      }
    }

    if (/自主截图/.test(parseText)) {
      console.log('[鸣潮监控-盼之] 跳过自主截图商品: ' + product.productUniqueNo);
      return;
    }

    // 过滤旧商品：跳过超过48小时的上架商品
    if (product.onStandTime > 0) {
      const ageHours = (Date.now() - product.onStandTime) / 3600000;
      if (ageHours > 48) {
        console.log('[鸣潮监控-盼之] 跳过旧商品: ' + product.productUniqueNo + ' 上架于' + product.onStandTimeStr + ' (' + Math.round(ageHours) + '小时前)');
        return;
      }
    }

    // 去重：已见商品检查价格变化
    if (seenIds.includes(productId)) {
      const existRow = tableData.find(r => r.productId === productId);
      if (!existRow) {
        // 已见过但不在表格中（之前被估值过滤），移除后重新评估
        const idx = seenIds.indexOf(productId);
        if (idx > -1) seenIds.splice(idx, 1);
        console.log('[鸣潮监控-盼之] 重新评估: ' + product.productUniqueNo + ' ¥' + price);
      } else {
        // 补充武器信息：已有行但 showTitle 缺少武器段时，用详情页文本更新
        if (detailText && !hasWeaponSection(existRow.showTitle)) {
          existRow.showTitle = detailText;
          var newParsed = parseAccountInfo(detailText);
          var newValuation = calculateValue(newParsed, price);
          existRow.parsed = {
            yellowCount: newParsed.yellowCount,
            pulls: Math.round(newParsed.pulls * 10) / 10,
            motoCount: newParsed.motoCount,
            characters: newParsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
            weapons: newParsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
          };
          existRow.valuation = newValuation;
          existRow._cachedValuation = newValuation;
          existRow.value = newValuation.totalValue;
          existRow.ratio = newValuation.ratio;
          existRow.effectiveYellow = newValuation.effectiveYellow || 0;
          console.log('[鸣潮监控-盼之] 补充武器信息: ' + product.productUniqueNo + ' 武器' + newParsed.weapons.length + '个 估值¥' + newValuation.totalValue.toFixed(0));
          if (!batchMode) { saveTableData(); refreshTableDisplay(); }
        }
        if (price < existRow.price) {
          if (!existRow.priceHistory) existRow.priceHistory = [];
          existRow.priceHistory.push({ price: existRow.price, time: Date.now() });
          const oldPrice = existRow.price;
          existRow.price = price;
          if (existRow.value && existRow.value > 0) {
            existRow.ratio = ((existRow.value - price) / price) * 100;
          }
          existRow.priceDrop = (existRow.priceDrop || 0) + (oldPrice - price);
          existRow.status = '降价';
          if (!batchMode) {
            sortTableData();
            saveTableData();
            refreshTableDisplay();
          }
          console.log('[鸣潮监控-盼之] 降价: ' + product.productUniqueNo + ' ¥' + oldPrice + ' → ¥' + price);
          // 降价通知
          if (notifyEnabled && (getRowValuation(existRow).level || 0) >= G().minLevel && existRow.value >= notifyMinValue && price >= notifyMinPrice &&
              (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
              (existRow.value - price) > getNotifyDiffThreshold(existRow.value) && !notifiedIds.includes(productId + '_drop')) {
            const { title, body, mdBody } = buildNotifyContent('降价', existRow, oldPrice, price);
            notify(productId + '_drop', title, body, mdBody);
            notifiedIds.push(productId + '_drop');
            if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
            saveStorage(STORAGE_KEYS.notified, notifiedIds);
          }
        }
        return;
      }
    }
    seenIds.push(productId);
    if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();

    // 解析和估值（优先使用详情页完整文本）
    const parsed = parseAccountInfo(parseText);
    const valuation = calculateValue(parsed, price);

    console.log('[鸣潮监控-盼之] 解析结果: ' + product.productUniqueNo +
      ' | 角色' + parsed.characters.length + '个:' + parsed.characters.map(c => c.const + G().constUnitDisplay + c.name).join(',') +
      ' | 武器' + parsed.weapons.length + '个' +
      ' | ' + resourceSummaryText(parsed) + ' 黄' + parsed.yellowCount +
      ' | Lv.' + valuation.level +
      ' | 估值¥' + valuation.totalValue.toFixed(0) +
      (valuation.totalValue < 300 ? ' [低于300，不收录]' : '') +
      (valuation.levelFound && valuation.level < G().minLevel ? ' [等级低于' + G().minLevel + '，不收录]' : ''));

    // 估值低于300的垃圾数据不收录
    if (valuation.totalValue < 300) {
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 等级低于70的账号不收录（仅在等级明确解析到时过滤）
    if (valuation.levelFound && valuation.level < G().minLevel) {
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      console.log('[鸣潮监控-盼之] 等级低于70，不收录: ' + product.productUniqueNo + ' Lv.' + valuation.level);
      return;
    }

    // 内容指纹去重（跨平台）
    const fingerprint = generateFingerprint(parsed);
    const dupRow = tableData.find(r => r.fingerprint === fingerprint && r.productId !== productId);
    if (dupRow) {
      console.log('[鸣潮监控-盼之] 跨平台重复(指纹匹配): ' + product.productUniqueNo + ' ¥' + price + ' → 已有:' + dupRow.productId + ' ¥' + dupRow.price);
      seenIds.push(productId);
      if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();
      if (price < dupRow.price) {
        if (!dupRow.priceHistory) dupRow.priceHistory = [];
        dupRow.priceHistory.push({ price: dupRow.price, time: Date.now() });
        const oldPrice = dupRow.price;
        dupRow.price = price;
        dupRow.productId = productId;
        if (product.productUniqueNo) dupRow.productUniqueNo = product.productUniqueNo;
        dupRow.platform = 'pzds';
        dupRow.ratio = ((dupRow.value - price) / price) * 100;
        dupRow.priceDrop = (dupRow.priceDrop || 0) + (oldPrice - price);
        dupRow.status = '降价';
        if (!batchMode) {
          sortTableData();
          saveTableData();
          refreshTableDisplay();
        }
        console.log('[鸣潮监控-盼之] 跨平台重复: ' + product.productUniqueNo + ' ¥' + oldPrice + ' → ¥' + price);
        if (notifyEnabled && (getRowValuation(dupRow).level || 0) >= G().minLevel && dupRow.value >= notifyMinValue && price >= notifyMinPrice &&
            (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
            (dupRow.value - price) > getNotifyDiffThreshold(dupRow.value) && !notifiedIds.includes(productId + '_drop')) {
          const { title, body, mdBody } = buildNotifyContent('降价', dupRow, oldPrice, price);
          notify(productId + '_drop', title, body, mdBody);
          notifiedIds.push(productId + '_drop');
          if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
          saveStorage(STORAGE_KEYS.notified, notifiedIds);
        }
      }
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 添加到表格（showTitle 用完整详情文本，确保存储后可重新解析武器信息）
    addTableRow({
      productId,
      productUniqueNo: product.productUniqueNo || '',
      fingerprint,
      showTitle: parseText,
      price,
      value: valuation.totalValue,
      ratio: valuation.ratio,
      status: '初估',
      platform: 'pzds',
      effectiveYellow: valuation.effectiveYellow || 0,
      parsed: {
        yellowCount: parsed.yellowCount,
        pulls: Math.round(parsed.pulls * 10) / 10,
        motoCount: parsed.motoCount,
        characters: parsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
        weapons: parsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
      },
      valuation: valuation,
      listTime: product.listTime || Date.now(),
      firstSeen: Date.now(),
    });

    console.log('[鸣潮监控-盼之] 新商品入表: ' + product.productUniqueNo + ' ¥' + price + ' 估值¥' + valuation.totalValue.toFixed(0) + ' (表格共' + tableData.length + '行)');

    // 入详情队列条件（与螃蟹网一致）
    const hasSC6 = parsed.characters.some(c => c.tier === 'S' && c.const === 6);
    const matchesCharRule = charNotifyRules.length > 0 && charNotifyRules.some(rule =>
      rule.chars.every(rc => parsed.characters.some(c => c.name === rc.name && c.const >= rc.minConst))
    );
    const meetsBasicThreshold = valuation.totalValue > 500 && valuation.diff != null && valuation.diff > 100;
    if (meetsBasicThreshold || hasSC6 || matchesCharRule) {
      enqueueDetail(productId, valuation.diff || 0);
    }

    // 初估即推送通知（盼之商品跳过详情队列，必须在初估阶段推送）
    tryNotifyNewProduct(productId, parsed, valuation, price, parseText, product.productUniqueNo || '', null);
  }

  /**
   * 处理盼之商品列表（批量模式）
   * 列表页标题被截断，需先抓取详情页获取完整角色/武器数据
   */
  async function handlePZListResponse(list) {
    if (!Array.isArray(list)) return;
    console.log('[鸣潮监控-盼之] handlePZListResponse: 收到' + list.length + '条商品，当前表格' + tableData.length + '行');
    list.forEach(function(p) {
      var title = (p.showTitle || '').substring(0, 60);
      var price = (p.price || 0).toFixed(0);
      var uniqueNo = p.productUniqueNo || '';
      console.log('  - ' + uniqueNo + ' ¥' + price + ' ' + title);
    });

    // 为新商品预取详情页（跳过超过48小时的旧商品；已在表格中的也检查是否缺少武器信息）
    const PZ_MAX_AGE_HOURS = 48;
    const detailMap = {};
    const needDetail = list.filter(p => {
      if (p.onStandTime > 0 && (Date.now() - p.onStandTime) / 3600000 > PZ_MAX_AGE_HOURS) return false;
      if (!seenIds.includes(p.productId)) return true;
      const existRow = tableData.find(r => r.productId === p.productId);
      if (!existRow) return true;
      // 已在表格中但 showTitle 缺少武器段（旧数据），需要补充详情
      if (existRow.platform === 'pzds' && !hasWeaponSection(existRow.showTitle)) return true;
      return false;
    });
    if (needDetail.length > 0) {
      console.log('[鸣潮监控-盼之] 预取' + needDetail.length + '个新商品详情页');
      const details = await Promise.all(needDetail.map(p => fetchPZDetail(p.productUniqueNo)));
      needDetail.forEach((p, i) => { detailMap[p.productId] = details[i]; });
    }

    batchMode = true;
    try {
      for (const product of list) {
        try {
          processPZProduct(product, detailMap[product.productId] || '');
        } catch (e) {
          console.error('[鸣潮监控-盼之] 处理商品失败: ' + (product.productUniqueNo || product.productId), e);
        }
      }
    } finally {
      batchMode = false;
    }
    trimTableData();
    sortTableData();
    saveTableData();
    saveStorage(STORAGE_KEYS.seen, seenIds);
    refreshTableDisplay();
    updateStatusText();
    console.log('[鸣潮监控-盼之] 批量处理完成，表格共' + tableData.length + '行');
  }

  // ============================================================
  // 氪金兽平台 MWP API 抓取（MD5签名 + token自动续期）
  // ============================================================

  /**
   * MD5哈希（纯JS实现，UTF-8编码）
   * 氪金兽MWP协议签名依赖MD5，Tampermonkey无内置实现
   */
  function kjsMd5(str) {
    function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cmn(q, a, b, x, s, t) {
      a = (((a + q) | 0) + ((x + t) | 0)) | 0;
      return ((rl(a, s) + b) | 0);
    }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function binl2hex(buf) {
      const hexTab = '0123456789abcdef';
      let str = '';
      for (let i = 0; i < buf.length * 4; i++) {
        str += hexTab.charAt((buf[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) + hexTab.charAt((buf[i >> 2] >> ((i % 4) * 8)) & 0xf);
      }
      return str;
    }
    function utf8Encode(str) {
      return unescape(encodeURIComponent(str));
    }
    function md51(s) {
      const n = s.length;
      const state = [1732584193, -271733879, -1732584194, 271733878];
      let i;
      for (i = 64; i <= s.length; i += 64) {
        md5cycle(state, utf8md52blk(s.substring(i - 64, i)));
      }
      s = s.substring(i - 64);
      const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }
    function md5cycle(x, k) {
      let a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = (x[0] + a) | 0;
      x[1] = (x[1] + b) | 0;
      x[2] = (x[2] + c) | 0;
      x[3] = (x[3] + d) | 0;
    }
    function utf8md52blk(s) {
      const md5blks = [];
      for (let i = 0; i < 64; i++) {
        md5blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      }
      return md5blks;
    }
    return binl2hex(md51(utf8Encode(str)));
  }

  // 氪金兽token状态（内存缓存，页面加载后首次请求自动续期）
  const kjsTokenState = { token: '', encToken: '' };

  /**
   * 构建MWP签名
   * 规则（逆向自氪金兽前端 kjs-app.js）：
   * 1. 取所有mw-*参数（排除mw-sign/mw-did/mw-sid/mw-pv），按key排序
   * 2. 依次拼接参数值 + API方法名 + 版本号 + md5(data JSON字符串)
   * 3. 有token时再拼接token，整体md5
   */
  function kjsBuildSign(params, dataStr, token) {
    const keys = Object.keys(params)
      .filter(k => k.indexOf('mw-') === 0 && ['mw-sign', 'mw-did', 'mw-sid', 'mw-pv'].indexOf(k) === -1)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const parts = keys.map(k => params[k]);
    parts.push('mwp.kjs_search.product.search');
    parts.push('1.0');
    parts.push(kjsMd5(dataStr));
    if (token) parts.push(token);
    return kjsMd5(parts.join('&'));
  }

  /**
   * 调用氪金兽商品搜索API（按最新发布排序）
   * 首次请求无token会返回FAIL_SYS_TOKEN_NEED_RENEW，携带新token自动重试
   * @param {number} page - 页码（从1开始，每页最多60条）
   * @returns {Promise<Array>} 商品数组
   */
  function kjsSearch(page) {
    return new Promise((resolve) => {
      const dataStr = JSON.stringify({
        gameId: String(G().platformIds.kjs),
        cateId: G().platformIds.kjsCateId,
        type: 'goods',
        originOrder: 'upper_at_desc',   // 最新发布优先
        priceStart: 300,                 // 最低价格300元，过滤低价账号
        size: 60,
        page: page,
      });
      attempt(0);
      function attempt(n) {
        const params = {
          'mw-appkey': '100222',
          'mw-pv': 'H5',
          'mw-k7': 'h5',
          'mw-smid': '',
          'mw-sid': '',
          'mw-t': String(Date.now()),
          'mw-h5-token': kjsTokenState.token,
          'mw-h5-token-enc': kjsTokenState.encToken,
          data: dataStr,
        };
        params['mw-sign'] = kjsBuildSign(params, dataStr, kjsTokenState.token);
        // 手动构建URL，避免 URLSearchParams 可能的编码差异
        let url = KJS_URLS.api + '?';
        for (const k in params) {
          url += (url.endsWith('?') ? '' : '&') + k + '=' + encodeURIComponent(params[k]);
        }
        if (n === 0) console.log('[鸣潮监控-氪金兽] 签名参数:', { token: kjsTokenState.token ? kjsTokenState.token.slice(0, 12) + '...' : '(空)', sign: params['mw-sign'] });
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          anonymous: true,
          headers: {
            'Accept': 'application/json',
            'Referer': 'https://www.kejinshou.com/goods/' + G().platformIds.kjs,
            'Origin': 'https://www.kejinshou.com',
          },
          timeout: 15000,
          onload(res) {
            try {
              const json = JSON.parse(res.responseText);
              if (json.ret === 'FAIL_SYS_TOKEN_NEED_RENEW' && n < 2) {
                kjsTokenState.token = json.token || '';
                kjsTokenState.encToken = json.encToken || '';
                attempt(n + 1);
                return;
              }
              if (json.ret === 'FAIL_SYS_SIGN_ERROR') {
                console.warn('[鸣潮监控-氪金兽] 签名错误 | token=' + (kjsTokenState.token || '(空)') + ' sign=' + (params['mw-sign'] || '') + ' attempt=' + n);
                kjsTokenState.token = '';
                kjsTokenState.encToken = '';
              }
              if (json.ret !== 'SUCCESS' || !json.data || !json.data.data) {
                console.warn('[鸣潮监控-氪金兽] API返回异常: ' + json.ret);
                resolve([]);
                return;
              }
              resolve(parseKJSList(json.data.data));
            } catch (e) {
              console.error('[鸣潮监控-氪金兽] 响应解析失败:', e);
              resolve([]);
            }
          },
          onerror(err) {
            console.error('[鸣潮监控-氪金兽] 请求失败:', err);
            resolve([]);
          },
          ontimeout() {
            console.error('[鸣潮监控-氪金兽] 请求超时');
            resolve([]);
          },
        });
      }
    });
  }

  /**
   * 解析氪金兽API商品列表
   * API返回的subTitle含完整角色/武器列表，无需再抓详情页
   * @param {object} data - API响应data.data
   * @returns {Array} 商品数组 [{productId, showTitle, price, platform, onStandTime}]
   */
  function parseKJSList(data) {
    const list = Array.isArray(data.list) ? data.list : [];
    const products = [];
    for (const it of list) {
      if (!it || !it.id) continue;
      const price = parseFloat(it.price);
      if (!(price > 0)) continue;
      // 调试：打印第一个商品的完整字段，帮助发现可用字段
      if (products.length === 0) {
        console.log('[鸣潮监控-氪金兽] 商品字段:', Object.keys(it).join(', '), '| roleLevel=' + (it.roleLevel || it.level || it.gameLevel || it.accountLevel || '(无)'));
      }
      let desc = kjsNormalizeText(String(it.subTitle || '').trim());
      // 从API字段补充等级（subTitle可能不含等级），使用当前游戏第一个等级关键词
      var roleLevel = it.roleLevel || it.level || it.gameLevel || it.accountLevel;
      if (roleLevel && !new RegExp(G().levelKeywords.join('|')).test(desc)) {
        desc = G().levelKeywords[0] + ':' + roleLevel + ' ' + desc;
      }
      if (desc.length < 10) continue;
      let onStandTime = 0;
      if (it.polishAt) {
        const parsed = new Date(String(it.polishAt).replace(/-/g, '/'));
        if (!isNaN(parsed.getTime())) {
          // polishAt只有日期无时间，用当前时分秒补充
          const now = new Date();
          parsed.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          onStandTime = parsed.getTime();
        }
      }
      products.push({
        productId: 'kjs_' + it.id,
        productUniqueNo: String(it.id),
        showTitle: desc,
        price: price,
        discount: 0,
        platform: 'kjs',
        listTime: onStandTime || Date.now(),
        onStandTime: onStandTime,
        onStandTimeStr: (it.polishTimeDesc ? it.polishTimeDesc + ' ' : '') + (it.polishAt || ''),
      });
    }
    return products;
  }

  /**
   * 氪金兽描述文本归一化（转成本脚本可解析的格式）
   * Format A: "联觉等级:80 总黄数:71 ... 五星角色数:18 6鸣露西，6鸣爱弥斯... 五星武器数:14 5鸣千古洑流..."
   * Format B: "【鸣潮】冒险等级：80，男主，五星数量：38，五星角色:维里奈 * 4命,...__五星武器:赫奕流明,..."
   * Format C: "月相5180，星声15722 皮肤：...【按角色】：爱弥斯，赞妮，...【按武器】：...【满命角色】：满命卡提希娅【四命角色】：4命鉴心...【精二武器】：精2死与舞...【精一武器】：精1永远的启明星..."
   */
  function kjsNormalizeText(text) {
    // Format C: 资源值无冒号 → 补冒号（"星声15722" → "星声:15722"，资源名按当前游戏）
    text = text.replace(new RegExp('(' + resourceNames().join('|') + ')(\\d+)', 'g'), '$1:$2');

    // Format C: 清理无用段落（必须在合并分段之前执行，否则【】边界丢失后皮肤正则会吞掉角色/武器列表）
    text = text.replace(/【绑定情况】[：:][\s\S]*?(?=【|$)/g, '');
    text = text.replace(/皮肤[：:][^【]*/g, '');

    // Format C: 合并命座分段到角色列表
    // 【满命角色】：满命卡提希娅【四命角色】：4命鉴心...【零命角色】：0命赞妮，...
    var constSections = ['满命', '六命', '五命', '四命', '三命', '二命', '一命', '零命'];
    var allCharsWithConst = [];
    for (var ci = 0; ci < constSections.length; ci++) {
      var csPat = '【' + constSections[ci] + '角色】[：:]\\s*([^【]*)';
      var csMatch = text.match(new RegExp(csPat));
      if (csMatch) {
        var csItems = csMatch[1].split(/[,，、\s]+/).filter(Boolean);
        for (var cj = 0; cj < csItems.length; cj++) {
          allCharsWithConst.push(csItems[cj]);
        }
      }
    }
    if (allCharsWithConst.length > 0) {
      // 用合并后的角色列表替换"【按角色】：..."段落
      text = text.replace(/【按角色】[：:][\s\S]*?(?=【|$)/g, '五星角色:' + allCharsWithConst.join(',') + ' ');
      // 删除独立的命座分段
      text = text.replace(/【[满六五四三二一零]命角色】[：:][\s\S]*?(?=【|$)/g, '');
    }

    // Format C: 合并精炼分段到武器列表
    // 【精二武器】：精2死与舞，精2漪澜浮录【精一武器】：精1永远的启明星，...
    var refineSections = ['精五', '精四', '精三', '精二', '精一', '精0'];
    var allWeaponsWithRefine = [];
    for (var ri = 0; ri < refineSections.length; ri++) {
      var rsPat = '【' + refineSections[ri] + '武器】[：:]\\s*([^【]*)';
      var rsMatch = text.match(new RegExp(rsPat));
      if (rsMatch) {
        var rsItems = rsMatch[1].split(/[,，、\s]+/).filter(Boolean);
        for (var rj = 0; rj < rsItems.length; rj++) {
          allWeaponsWithRefine.push(rsItems[rj]);
        }
      }
    }
    if (allWeaponsWithRefine.length > 0) {
      text = text.replace(/【按武器】[：:][\s\S]*?(?=【|$)/g, '五星武器:' + allWeaponsWithRefine.join(',') + ' ');
      text = text.replace(/【精[五四三二一0]武器】[：:][\s\S]*?(?=【|$)/g, '');
    }

    // 通用转换（Format A/B/C 共用）
    text = text
      // "秧秧·玄翎" → "秧秧玄翎"
      .replace(/[·・]/g, '')
      // "6鸣露西" → "6命露西"（氪金兽用"鸣"表示命座/精炼）
      .replace(/(\d+)鸣/g, '$1命')
      // "星声数量:1434" → "星声:1434"（资源名按当前游戏）
      .replace(new RegExp('(' + resourceNames().join('|') + ')数量', 'g'), '$1')
      // 卖家格式B: "五星数量：34" → "总黄数:34"
      .replace(/五星数量[：:]\s*(\d+)/g, '总黄数:$1')
      // 卖家格式B: "__" → "，"
      .replace(/__/g, '，')
      // 截掉卖家备注
      .replace(/卖家说[\s\S]*$/, '')
      // "五星角色数:18 6命露西，..." → 按数量截取前N项，剔除四星（关键词按当前游戏角色/武器段）
      .replace(new RegExp('(' + G().keywords.charSections.concat(G().keywords.weaponSections).join('|') + ')数\\s*[:：]\\s*(\\d+)\\s*([^五]*?)(?=五星|$)', 'g'), function(m, kw, cnt, rest) {
        const items = rest.split(/[,，、\s]+/).filter(Boolean);
        return kw + ':' + items.slice(0, parseInt(cnt, 10)).join('，');
      })
      // 四星角色段落丢弃（边界用当前游戏的等级关键词+角色/武器段关键词）
      .replace(new RegExp('四星角色数?\\s*[:：]\\s*(?:\\d+\\s*)?[\\s\\S]*?(?=' + G().keywords.charSections[0] + '|五星武器|' + G().levelKeywords.join('|') + '|$)', 'g'), '')
      // "维里奈 * 4命" → "维里奈(4命)"（命座单位按当前游戏）
      .replace(new RegExp('([^,，、\\s;；*]+)\\s*\\*\\s*(\\d+)(' + G().constUnits.join('|') + ')', 'g'), '$1($2$3)')
      // "相位涟漪 * 2精" → "精2相位涟漪"
      .replace(/([^,，、\s;；*]+)\s*\*\s*(\d+)精/g, '精$2$1');

    return text;
  }

  /**
   * 处理氪金兽平台商品（类似processPZProduct，subTitle已完整无需详情页）
   * 价格单位为元，商品ID为数字（kjs_前缀标识平台）
   * @param {object} product - parseKJSList返回的商品对象
   */
  function processKJSProduct(product) {
    const productId = product.productId;
    if (!productId) return;

    const showTitle = product.showTitle || '';
    const price = product.price || 0;

    if (/自主截图/.test(showTitle)) {
      console.log('[鸣潮监控-氪金兽] 跳过自主截图商品: ' + product.productUniqueNo);
      return;
    }

    // 过滤旧商品：跳过超过48小时的上架商品
    if (product.onStandTime > 0) {
      const ageHours = (Date.now() - product.onStandTime) / 3600000;
      if (ageHours > 48) {
        console.log('[鸣潮监控-氪金兽] 跳过旧商品: ' + product.productUniqueNo + ' 上架于' + product.onStandTimeStr + ' (' + Math.round(ageHours) + '小时前)');
        return;
      }
    }

    // 去重：已见商品检查价格变化
    if (seenIds.includes(productId)) {
      const existRow = tableData.find(r => r.productId === productId);
      if (!existRow) {
        const idx = seenIds.indexOf(productId);
        if (idx > -1) seenIds.splice(idx, 1);
      } else {
        if (price < existRow.price) {
          if (!existRow.priceHistory) existRow.priceHistory = [];
          existRow.priceHistory.push({ price: existRow.price, time: Date.now() });
          const oldPrice = existRow.price;
          existRow.price = price;
          if (existRow.value && existRow.value > 0) {
            existRow.ratio = ((existRow.value - price) / price) * 100;
          }
          existRow.priceDrop = (existRow.priceDrop || 0) + (oldPrice - price);
          existRow.status = '降价';
          if (!batchMode) {
            sortTableData();
            saveTableData();
            refreshTableDisplay();
          }
          console.log('[鸣潮监控-氪金兽] 降价: ' + product.productUniqueNo + ' ¥' + oldPrice + ' → ¥' + price);
          if (notifyEnabled && (getRowValuation(existRow).level || 0) >= G().minLevel && existRow.value >= notifyMinValue && price >= notifyMinPrice &&
              (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
              (existRow.value - price) > getNotifyDiffThreshold(existRow.value) && !notifiedIds.includes(productId + '_drop')) {
            const { title, body, mdBody } = buildNotifyContent('降价', existRow, oldPrice, price);
            notify(productId + '_drop', title, body, mdBody);
            notifiedIds.push(productId + '_drop');
            if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
            saveStorage(STORAGE_KEYS.notified, notifiedIds);
          }
        }
        return;
      }
    }
    seenIds.push(productId);
    if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();

    // 解析和估值
    const parsed = parseAccountInfo(showTitle);
    const valuation = calculateValue(parsed, price);

    console.log('[鸣潮监控-氪金兽] 解析结果: ' + product.productUniqueNo +
      ' | 角色' + parsed.characters.length + '个 | 武器' + parsed.weapons.length + '个' +
      ' | ' + resourceSummaryText(parsed) + ' 黄' + parsed.yellowCount +
      ' | Lv.' + valuation.level +
      ' | 估值¥' + valuation.totalValue.toFixed(0) +
      (valuation.totalValue < 300 ? ' [低于300，不收录]' : '') +
      (valuation.levelFound && valuation.level < G().minLevel ? ' [等级低于' + G().minLevel + '，不收录]' : ''));

    // 估值低于300的垃圾数据不收录
    if (valuation.totalValue < 300) {
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 等级低于70的账号不收录（仅在等级明确解析到时过滤）
    if (valuation.levelFound && valuation.level < G().minLevel) {
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 内容指纹去重（跨平台+同平台重复上架）
    const fingerprint = generateFingerprint(parsed);
    const dupRow = tableData.find(r => r.fingerprint === fingerprint && r.productId !== productId);
    if (dupRow) {
      console.log('[鸣潮监控-氪金兽] 重复(指纹匹配): ' + product.productUniqueNo + ' ¥' + price + ' → 已有:' + dupRow.productId + ' ¥' + dupRow.price);
      if (price < dupRow.price) {
        if (!dupRow.priceHistory) dupRow.priceHistory = [];
        dupRow.priceHistory.push({ price: dupRow.price, time: Date.now() });
        const oldPrice = dupRow.price;
        dupRow.price = price;
        dupRow.productId = productId;
        if (product.productUniqueNo) dupRow.productUniqueNo = product.productUniqueNo;
        dupRow.platform = 'kjs';
        dupRow.ratio = ((dupRow.value - price) / price) * 100;
        dupRow.priceDrop = (dupRow.priceDrop || 0) + (oldPrice - price);
        dupRow.status = '降价';
        if (!batchMode) {
          sortTableData();
          saveTableData();
          refreshTableDisplay();
        }
        console.log('[鸣潮监控-氪金兽] 指纹重复更新低价: ¥' + oldPrice + ' → ¥' + price);
        if (notifyEnabled && (getRowValuation(dupRow).level || 0) >= G().minLevel && dupRow.value >= notifyMinValue && price >= notifyMinPrice &&
            (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
            (dupRow.value - price) > getNotifyDiffThreshold(dupRow.value) && !notifiedIds.includes(productId + '_drop')) {
          const { title, body, mdBody } = buildNotifyContent('降价', dupRow, oldPrice, price);
          notify(productId + '_drop', title, body, mdBody);
          notifiedIds.push(productId + '_drop');
          if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
          saveStorage(STORAGE_KEYS.notified, notifiedIds);
        }
      }
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 添加到表格
    addTableRow({
      productId,
      productUniqueNo: product.productUniqueNo || '',
      fingerprint,
      showTitle: showTitle,
      price,
      value: valuation.totalValue,
      ratio: valuation.ratio,
      status: '初估',
      platform: 'kjs',
      effectiveYellow: valuation.effectiveYellow || 0,
      parsed: {
        yellowCount: parsed.yellowCount,
        pulls: Math.round(parsed.pulls * 10) / 10,
        motoCount: parsed.motoCount,
        characters: parsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
        weapons: parsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
      },
      valuation: valuation,
      listTime: product.listTime || Date.now(),
      firstSeen: Date.now(),
    });

    console.log('[鸣潮监控-氪金兽] 新商品入表: ' + product.productUniqueNo + ' ¥' + price + ' 估值¥' + valuation.totalValue.toFixed(0) + ' (表格共' + tableData.length + '行)');

    // 氪金兽商品跳过详情队列（列表数据已完整），直接推送通知
    tryNotifyNewProduct(productId, parsed, valuation, price, showTitle, product.productUniqueNo || '', 'kjs');
  }

  /**
   * 处理氪金兽商品列表（批量模式）
   */
  async function handleKJSListResponse(list) {
    if (!Array.isArray(list)) return;
    console.log('[鸣潮监控-氪金兽] handleKJSListResponse: 收到' + list.length + '条商品，当前表格' + tableData.length + '行');
    list.forEach(function(p) {
      console.log('  - ' + (p.productUniqueNo || '') + ' ¥' + (p.price || 0).toFixed(0) + ' [' + (p.onStandTimeStr || '') + '] ' + (p.showTitle || '').substring(0, 60));
    });

    batchMode = true;
    try {
      for (const product of list) {
        try {
          processKJSProduct(product);
        } catch (e) {
          console.error('[鸣潮监控-氪金兽] 处理商品失败: ' + (product.productUniqueNo || product.productId), e);
        }
      }
    } finally {
      batchMode = false;
    }
    trimTableData();
    sortTableData();
    saveTableData();
    saveStorage(STORAGE_KEYS.seen, seenIds);
    refreshTableDisplay();
    updateStatusText();
    console.log('[鸣潮监控-氪金兽] 批量处理完成，表格共' + tableData.length + '行');
  }

  // ============================================================
  // 7881平台监控（API抓取，MD5签名认证）
  // ============================================================

  /**
   * 生成7881 API签名头
   * 算法：pubKey = MD5(secretKey + timestamp)，lbsign = MD5(pubKey + JSON.stringify(paramObj))
   * @param {object} paramObj - 请求参数对象
   * @returns {{lbtimestamp: number, lbsign: string}} 签名头
   */
  function qyInitHeader(paramObj) {
    const secretKey = 'lb88ebb30d3ecb40d2bd6c7393a835c2c5';
    const timestamp = Date.now();
    const pubKey = kjsMd5(secretKey + timestamp);
    const lbsign = kjsMd5(pubKey + JSON.stringify(paramObj));
    return { lbtimestamp: timestamp, lbsign: lbsign };
  }

  /**
   * 通过7881内部API抓取商品列表（按最新发布排序）
   * 7881商品通过AJAX动态加载，SSR页面不含商品数据，需直接调用API
   * @param {number} page - 页码（从1开始）
   * @returns {Promise<Array>} 商品数组
   */
  function qySearch(page) {
    return new Promise((resolve, reject) => {
      const paramObj = {
        marketRequestSource: 'search',
        sellerType: 'C',
        gameId: G().platformIds.qy,
        gtid: G().platformIds.qyGtid,
        goodsSortType: '6',
        pageNum: page,
        pageSize: 30,
        extendAttrList: [],
      };
      const headerObj = qyInitHeader(paramObj);
      const url = qyUrls().api;
      console.log('[监控-7881] API请求: ' + url + ' (page=' + page + ')');
      GM_xmlhttpRequest({
        method: 'POST',
        url: url,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'lb-timestamp': String(headerObj.lbtimestamp),
          'lb-sign': headerObj.lbsign,
          'Origin': 'https://search.7881.com',
          'Referer': qyUrls().list,
        },
        data: JSON.stringify(paramObj),
        onload: function(response) {
          if (response.status !== 200) {
            console.warn('[鸣潮监控-7881] HTTP ' + response.status);
            resolve([]);
            return;
          }
          try {
            const json = JSON.parse(response.responseText);
            if (json.code !== 0 || !json.body || !json.body.results) {
              console.warn('[鸣潮监控-7881] API返回异常: code=' + json.code + ' msg=' + (json.msg || ''));
              resolve([]);
              return;
            }
            const products = extractQYProducts(json.body.results);
            resolve(products);
          } catch (e) {
            console.error('[鸣潮监控-7881] JSON解析失败:', e);
            resolve([]);
          }
        },
        onerror: function(err) {
          console.error('[鸣潮监控-7881] 请求失败:', err);
          resolve([]);
        },
        ontimeout: function() {
          console.error('[鸣潮监控-7881] 请求超时');
          resolve([]);
        }
      });
    });
  }

  /**
   * 抓取7881商品详情页，提取五星武器和资源数据
   * 7881列表标题可能缺少武器和资源数据，需从详情页meta description中提取
   * 格式：五星武器：武器名(精N武器名),... 星声数量：N 浮金波纹数量：N ...
   * @param {string} goodsId - 商品ID
   * @returns {Promise<{weapons: string, resources: string}>} weapons如"五星武器:精5血誓盟约", resources如"星声数量:630 浮金波纹数量:5"
   */
  function fetchQYDetail(goodsId) {
    return new Promise((resolve) => {
      const url = qyUrls().detail + goodsId + '.html';
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        timeout: 10000,
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0',
        },
        onload: function(response) {
          if (response.status !== 200) { resolve({ weapons: '', resources: '' }); return; }
          try {
            const html = response.responseText;
            const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
            if (!metaMatch) { resolve({ weapons: '', resources: '' }); return; }
            const desc = metaMatch[1];
            let weapons = '';
            let resources = '';

            // 提取武器（精N武器名格式，武器段关键词按当前游戏）
            let weaponSectionMatch = null;
            for (const kw of G().keywords.weaponSections) {
              weaponSectionMatch = desc.match(new RegExp(kw + '[：:]([^，]+)'));
              if (weaponSectionMatch) break;
            }
            if (weaponSectionMatch) {
              const weaponStr = weaponSectionMatch[1];
              const refineRegex = /精(\d+)([^()（）,，\s]+)/g;
              const weaponList = [];
              let m;
              while ((m = refineRegex.exec(weaponStr)) !== null) {
                weaponList.push('精' + m[1] + m[2]);
              }
              if (weaponList.length > 0) {
                weapons = '五星武器:' + weaponList.join(',');
              }
            }

            // 提取资源数据（资源名按当前游戏配置）
            const resourceTypes = resourceNames();
            const resourceParts = [];
            for (const res of resourceTypes) {
              const resMatch = desc.match(new RegExp(res + '数量[：:]\\s*(\\d+)', 'i'));
              if (resMatch) {
                resourceParts.push(res + '数量:' + resMatch[1]);
              }
            }
            resources = resourceParts.join(' ');

            resolve({ weapons, resources });
          } catch (e) {
            resolve({ weapons: '', resources: '' });
          }
        },
        onerror: function() { resolve({ weapons: '', resources: '' }); },
        ontimeout: function() { resolve({ weapons: '', resources: '' }); }
      });
    });
  }

  /**
   * 从7881 API响应中提取商品列表
   * API返回JSON，results数组中每个商品含goodsId、title、price等字段
   * 注意：7881标题只含角色信息，武器信息需后续从详情页获取
   * @param {Array} results - API返回的body.results数组
   * @returns {Array} 商品数组
   */
  function extractQYProducts(results) {
    const products = [];
    if (!results || !Array.isArray(results)) {
      console.log('[鸣潮监控-7881] 解析到0条商品');
      return products;
    }
    for (const item of results) {
      const goodsId = item.goodsId;
      const price = parseFloat(item.price) || 0;
      const title = item.title || '';
      if (!goodsId || price <= 0 || !title) continue;

      const serverStr = item.groupName ? item.groupName + (item.serverName ? '-' + item.serverName : '') : '';

      products.push({
        productId: 'qy_' + goodsId,
        productUniqueNo: goodsId,
        price: price,
        showTitle: title,
        onStandTimeStr: '',
        server: serverStr,
        platform: 'qy',
      });
    }
    console.log('[鸣潮监控-7881] 解析到' + products.length + '条商品');
    return products;
  }

  /**
   * 处理7881平台商品（API数据已含完整角色信息，无需详情页）
   * @param {object} product - extractQYProducts返回的商品对象
   */
  function processQYProduct(product) {
    const productId = product.productId;
    if (!productId) return;

    const showTitle = product.showTitle || '';
    const price = product.price || 0;

    // 去重：已见商品检查价格变化
    if (seenIds.includes(productId)) {
      const existRow = tableData.find(r => r.productId === productId);
      if (!existRow) {
        const idx = seenIds.indexOf(productId);
        if (idx > -1) seenIds.splice(idx, 1);
      } else {
        if (price < existRow.price) {
          if (!existRow.priceHistory) existRow.priceHistory = [];
          existRow.priceHistory.push({ price: existRow.price, time: Date.now() });
          const oldPrice = existRow.price;
          existRow.price = price;
          if (existRow.value && existRow.value > 0) {
            existRow.ratio = ((existRow.value - price) / price) * 100;
          }
          existRow.priceDrop = (existRow.priceDrop || 0) + (oldPrice - price);
          existRow.status = '降价';
          if (!batchMode) {
            sortTableData();
            saveTableData();
            refreshTableDisplay();
          }
          console.log('[鸣潮监控-7881] 降价: ' + product.productUniqueNo + ' ¥' + oldPrice + ' → ¥' + price);
          if (notifyEnabled && (getRowValuation(existRow).level || 0) >= G().minLevel && existRow.value >= notifyMinValue && price >= notifyMinPrice &&
              (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
              (existRow.value - price) > getNotifyDiffThreshold(existRow.value) && !notifiedIds.includes(productId + '_drop')) {
            const { title, body, mdBody } = buildNotifyContent('降价', existRow, oldPrice, price);
            notify(productId + '_drop', title, body, mdBody);
            notifiedIds.push(productId + '_drop');
            if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
            saveStorage(STORAGE_KEYS.notified, notifiedIds);
          }
        }
        return;
      }
    }
    seenIds.push(productId);
    if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();

    // 解析和估值
    const parsed = parseAccountInfo(showTitle);
    const valuation = calculateValue(parsed, price);

    console.log('[鸣潮监控-7881] 解析结果: ' + product.productUniqueNo +
      ' | 角色' + parsed.characters.length + '个 | 武器' + parsed.weapons.length + '个' +
      ' | ' + resourceSummaryText(parsed) + ' 黄' + parsed.yellowCount +
      ' | Lv.' + valuation.level +
      ' | 估值¥' + valuation.totalValue.toFixed(0) +
      (valuation.totalValue < 300 ? ' [低于300，不收录]' : '') +
      (valuation.levelFound && valuation.level < G().minLevel ? ' [等级低于' + G().minLevel + '，不收录]' : ''));

    // 估值低于300的垃圾数据不收录
    if (valuation.totalValue < 300) {
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 等级低于70的账号不收录
    if (valuation.levelFound && valuation.level < G().minLevel) {
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 内容指纹去重（跨平台+同平台重复上架）
    const fingerprint = generateFingerprint(parsed);
    const dupRow = tableData.find(r => r.fingerprint === fingerprint && r.productId !== productId);
    if (dupRow) {
      console.log('[鸣潮监控-7881] 重复(指纹匹配): ' + product.productUniqueNo + ' ¥' + price + ' → 已有:' + dupRow.productId + ' ¥' + dupRow.price);
      if (price < dupRow.price) {
        if (!dupRow.priceHistory) dupRow.priceHistory = [];
        dupRow.priceHistory.push({ price: dupRow.price, time: Date.now() });
        const oldPrice = dupRow.price;
        dupRow.price = price;
        dupRow.productId = productId;
        if (product.productUniqueNo) dupRow.productUniqueNo = product.productUniqueNo;
        dupRow.platform = 'qy';
        dupRow.ratio = ((dupRow.value - price) / price) * 100;
        dupRow.priceDrop = (dupRow.priceDrop || 0) + (oldPrice - price);
        dupRow.status = '降价';
        if (!batchMode) {
          sortTableData();
          saveTableData();
          refreshTableDisplay();
        }
        console.log('[鸣潮监控-7881] 指纹重复更新低价: ¥' + oldPrice + ' → ¥' + price);
        if (notifyEnabled && (getRowValuation(dupRow).level || 0) >= G().minLevel && dupRow.value >= notifyMinValue && price >= notifyMinPrice &&
            (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
            (dupRow.value - price) > getNotifyDiffThreshold(dupRow.value) && !notifiedIds.includes(productId + '_drop')) {
          const { title, body, mdBody } = buildNotifyContent('降价', dupRow, oldPrice, price);
          notify(productId + '_drop', title, body, mdBody);
          notifiedIds.push(productId + '_drop');
          if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
          saveStorage(STORAGE_KEYS.notified, notifiedIds);
        }
      }
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 添加到表格
    addTableRow({
      productId,
      productUniqueNo: product.productUniqueNo || '',
      fingerprint,
      showTitle: showTitle,
      price,
      value: valuation.totalValue,
      ratio: valuation.ratio,
      status: '初估',
      platform: 'qy',
      effectiveYellow: valuation.effectiveYellow || 0,
      parsed: {
        yellowCount: parsed.yellowCount,
        pulls: Math.round(parsed.pulls * 10) / 10,
        motoCount: parsed.motoCount,
        characters: parsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
        weapons: parsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
      },
      valuation: valuation,
      listTime: Date.now(),
      firstSeen: Date.now(),
    });

    console.log('[鸣潮监控-7881] 新商品入表: ' + product.productUniqueNo + ' ¥' + price + ' 估值¥' + valuation.totalValue.toFixed(0) + ' (表格共' + tableData.length + '行)');

    // 7881商品跳过详情队列（API数据已含角色信息），直接推送通知
    tryNotifyNewProduct(productId, parsed, valuation, price, showTitle, product.productUniqueNo || '', 'qy');
  }

  /**
   * 处理7881商品列表（批量模式）
   */
  async function handleQYListResponse(list) {
    if (!Array.isArray(list)) return;
    console.log('[鸣潮监控-7881] handleQYListResponse: 收到' + list.length + '条商品，当前表格' + tableData.length + '行');
    list.forEach(function(p) {
      console.log('  - ' + (p.productUniqueNo || '') + ' ¥' + (p.price || 0).toFixed(0) + ' [' + (p.onStandTimeStr || '') + '] ' + (p.showTitle || '').substring(0, 60));
    });

    // 为新商品批量获取详情数据（武器+资源，7881标题可能缺少这些信息）
    const newProducts = list.filter(p => !seenIds.includes(p.productId));
    if (newProducts.length > 0) {
      console.log('[鸣潮监控-7881] 为' + newProducts.length + '个新商品获取详情数据');
      const concurrency = 5;
      for (let i = 0; i < newProducts.length; i += concurrency) {
        const batch = newProducts.slice(i, i + concurrency);
        await Promise.all(batch.map(async p => {
          const detail = await fetchQYDetail(p.productUniqueNo);
          const parts = [];

          // 武器处理：标题有摘要格式（武器段:N个）时替换为详细数据，无武器时追加（关键词按当前游戏）
          if (detail.weapons) {
            const weaponKw = G().keywords.weaponSections.find(kw => p.showTitle.includes(kw));
            const weaponSummary = weaponKw ? p.showTitle.match(new RegExp(weaponKw + '[：:]\\s*\\d+\\s*个?')) : null;
            const hasDetailedWeapons = weaponKw ? new RegExp(weaponKw + '[：:][^]*精\\d').test(p.showTitle) : false;
            if (weaponSummary && !hasDetailedWeapons) {
              // 移除摘要格式"武器段:N个"，替换为详细武器列表
              p.showTitle = p.showTitle.replace(new RegExp(weaponKw + '[：:]\\s*\\d+\\s*个?', 'g'), '').replace(/\s+/g, ' ').trim();
              parts.push(detail.weapons);
            } else if (!weaponKw) {
              // 标题完全无武器段落，追加详细数据
              parts.push(detail.weapons);
            }
          }

          // 资源数据：始终追加（7881标题经常缺少星声/波纹等资源数据）
          if (detail.resources) {
            parts.push(detail.resources);
          }

          if (parts.length > 0) {
            const extraStr = parts.join(' ');
            if (p.showTitle.endsWith('】')) {
              p.showTitle = p.showTitle.slice(0, -1) + ' ' + extraStr + '】';
            } else {
              p.showTitle = p.showTitle + ' ' + extraStr;
            }
            console.log('[鸣潮监控-7881] 详情补充: ' + p.productUniqueNo + ' → ' + extraStr);
          }
        }));
      }
    }

    batchMode = true;
    try {
      for (const product of list) {
        try {
          processQYProduct(product);
        } catch (e) {
          console.error('[鸣潮监控-7881] 处理商品失败: ' + (product.productUniqueNo || product.productId), e);
        }
      }
    } finally {
      batchMode = false;
    }
    trimTableData();
    sortTableData();
    saveTableData();
    saveStorage(STORAGE_KEYS.seen, seenIds);
    refreshTableDisplay();
    updateStatusText();
    console.log('[鸣潮监控-7881] 批量处理完成，表格共' + tableData.length + '行');
  }

  // ============================================================
  // 易手游平台监控（结构化API，faction/baoshi字段 → 标准文本）
  // ============================================================

  /**
   * 归一化易手游角色/武器名（去除分隔符，修正错别字）
   * 易手游用"秧秧-玄翎"格式，需转为"秧秧玄翎"；"陆・赫斯"→"陆赫斯"；"掣愧之手"→"掣傀之手"
   */
  function ysyNormalizeName(name) {
    return name.replace(/[-·・]/g, '').replace(/愧/g, '傀');
  }

  /**
   * 从faction/baoshi字段值中提取命座/精炼数字
   * 支持 6(number) → 6; "0命"/"3"(string) → 3; {"value":"0","name":"0命"} → 0
   */
  function ysyExtractNum(val) {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      var m = val.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    }
    if (typeof val === 'object') {
      var s = val.name || val.value || '';
      var m = s.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    }
    return 0;
  }

  /**
   * 将易手游详情数据转换为标准文本（供parseAccountInfo解析）
   * faction: {"秧秧-玄翎":"0命","绯雪":"3命"} → "五星角色:0命秧秧玄翎,3命绯雪"
   * baoshi: {"天之苍苍":"精1","灼霜":"精5"} → "五星武器:精1天之苍苍,精5灼霜"
   */
  function ysyBuildTitle(detail) {
    var parts = [];

    // 等级
    if (detail.grade) parts.push(G().levelKeywords[0] + ':' + detail.grade);

    // 角色（faction字段）
    if (detail.faction) {
      var factionData = detail.faction;
      if (typeof factionData === 'string') { try { factionData = JSON.parse(factionData); } catch (e) { factionData = {}; } }
      var charParts = [];
      for (var name in factionData) {
        if (!factionData.hasOwnProperty(name)) continue;
        var normName = ysyNormalizeName(name);
        var constNum = ysyExtractNum(factionData[name]);
        var constStr = constNum > 0 ? constNum + G().constUnitDisplay : '0' + G().constUnitDisplay;
        charParts.push(constStr + normName);
      }
      if (charParts.length > 0) parts.push(G().keywords.charSections[0] + ':' + charParts.join(','));
    }

    // 武器（baoshi字段）
    if (detail.baoshi) {
      var baoshiData = detail.baoshi;
      if (typeof baoshiData === 'string') { try { baoshiData = JSON.parse(baoshiData); } catch (e) { baoshiData = {}; } }
      var weaponParts = [];
      for (var wname in baoshiData) {
        if (!baoshiData.hasOwnProperty(wname)) continue;
        var normWName = ysyNormalizeName(wname);
        var refineNum = ysyExtractNum(baoshiData[wname]);
        weaponParts.push('精' + (refineNum || 1) + normWName);
      }
      if (weaponParts.length > 0) parts.push(G().keywords.weaponSections[0] + ':' + weaponParts.join(','));
    }

    // 资源（content字段映射）
    var resMap = { content6: '星声', content8: '月相', content9: '余波珊瑚', content4: '浮金波纹', content5: '铸潮波纹' };
    var resNames = resourceNames();
    var resParts = [];
    for (var ck in resMap) {
      if (detail[ck] && resNames.indexOf(resMap[ck]) >= 0) resParts.push(resMap[ck] + '数量:' + detail[ck]);
    }
    // 绝区零资源映射
    if (G().key === 'zzz') {
      var zzzMap = { content6: '菲林', content8: '母带', content9: '丁尼', content4: '调查记录' };
      for (var zk in zzzMap) {
        if (detail[zk] && resNames.indexOf(zzzMap[zk]) >= 0) resParts.push(zzzMap[zk] + '数量:' + detail[zk]);
      }
    }
    if (resParts.length > 0) parts.push(resParts.join(' '));

    // 黄数
    if (detail.content7) parts.push('黄数:' + detail.content7);

    // 服饰
    if (detail.content10) {
      var outfitData = detail.content10;
      if (typeof outfitData === 'string') { try { outfitData = JSON.parse(outfitData); } catch (e) { outfitData = []; } }
      if (Array.isArray(outfitData) && outfitData.length > 0) parts.push('服饰:' + outfitData.join(','));
    }

    return parts.join(' ');
  }

  /**
   * 通过易手游API抓取商品列表（按最新发布排序）
   * @param {number} page - 页码（从1开始）
   * @returns {Promise<Array>} 商品数组
   */
  function fetchYSYList(page) {
    return new Promise(function(resolve) {
      var body = {
        oaid: 0, token: '', game_id: G().platformIds.ysy, page: page,
        search_order: '4', serach_title: '', search_price_min: '', search_price_max: '',
        search_client: '', search_server: '', drawer_more: [],
        version: '3.0.1', serach_gd_screen: [], serach_hot_screen: [],
        channel: '', shop_type: -1, shop_type_2: '', prop_type: 1,
      };
      console.log('[监控-易手游] API请求: ' + ysyUrls().api + ' (page=' + page + ')');
      GM_xmlhttpRequest({
        method: 'POST', url: ysyUrls().api, timeout: 15000,
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://pc.swcbg.com', 'Referer': 'https://pc.swcbg.com/' },
        data: JSON.stringify(body),
        onload: function(response) {
          if (response.status !== 200) { console.warn('[监控-易手游] HTTP ' + response.status); resolve([]); return; }
          try {
            var json = JSON.parse(response.responseText);
            if (json.status !== 1) { console.warn('[监控-易手游] API返回异常: status=' + json.status + ' info=' + (json.info || '')); resolve([]); return; }
            var list = Array.isArray(json.data) ? json.data : [];
            resolve(extractYSYProducts(list));
          } catch (e) { console.error('[监控-易手游] JSON解析失败:', e); resolve([]); }
        },
        onerror: function(err) { console.error('[监控-易手游] 请求失败:', err); resolve([]); },
        ontimeout: function() { console.error('[监控-易手游] 请求超时'); resolve([]); }
      });
    });
  }

  /**
   * 抓取易手游商品详情（获取faction/baoshi结构化数据）
   * @param {string} id - 商品ID
   * @returns {Promise<object|null>} 详情数据
   */
  function fetchYSYDetail(id) {
    return new Promise(function(resolve) {
      var body = { oaid: 0, token: '', id: String(id), is_search: '', statistics_id: 0,
        is_off_list: 0, o_type: 3, is_blind_box: 0, shop_source: '2', cut_id: 0, order_id: '' };
      GM_xmlhttpRequest({
        method: 'POST', url: ysyUrls().detailApi, timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://pc.swcbg.com', 'Referer': 'https://pc.swcbg.com/' },
        data: JSON.stringify(body),
        onload: function(response) {
          if (response.status !== 200) { resolve(null); return; }
          try { var json = JSON.parse(response.responseText); resolve(json.data || json); } catch (e) { resolve(null); }
        },
        onerror: function() { resolve(null); },
        ontimeout: function() { resolve(null); }
      });
    });
  }

  /**
   * 从易手游API响应中提取商品列表
   * @param {Array} list - API返回的商品数组
   * @returns {Array} 商品数组
   */
  function extractYSYProducts(list) {
    var products = [];
    if (!list || !Array.isArray(list)) { console.log('[监控-易手游] 解析到0条商品'); return products; }
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var id = item.id || item.shop_id || item.shopId;
      var price = parseFloat(item.price || item.shop_price || item.shopPrice) || 0;
      if (!id || price <= 0) continue;

      var title = item.title || item.shop_title || item.shopTitle || '';
      var serverStr = item.server || item.server_name || item.serverName || item.game_name || item.gameName || '';
      var timeStr = '';
      var ct = item.publist_time || item.create_time;
      if (ct) {
        var ts = parseInt(ct, 10);
        if (!isNaN(ts)) {
          var d = new Date(ts * 1000);
          if (!isNaN(d)) timeStr = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        }
      }

      // 列表API已包含faction/baoshi结构化数据，直接构建标准文本
      var builtTitle = ysyBuildTitle(item);

      products.push({
        productId: 'ysy_' + id,
        productUniqueNo: String(id),
        price: price,
        showTitle: builtTitle || title,
        onStandTimeStr: timeStr,
        server: serverStr,
        platform: 'ysy',
        rawItem: item,
      });
    }
    console.log('[监控-易手游] 解析到' + products.length + '条商品');
    return products;
  }

  /**
   * 处理易手游平台单个商品
   */
  function processYSYProduct(product) {
    var productId = product.productId;
    if (!productId) return;

    var showTitle = product.showTitle || '';
    var price = product.price || 0;

    // 去重：已见商品检查价格变化
    if (seenIds.indexOf(productId) >= 0) {
      var existRow = tableData.find(function(r) { return r.productId === productId; });
      if (!existRow) {
        var idx = seenIds.indexOf(productId);
        if (idx > -1) seenIds.splice(idx, 1);
      } else {
        if (price < existRow.price) {
          if (!existRow.priceHistory) existRow.priceHistory = [];
          existRow.priceHistory.push({ price: existRow.price, time: Date.now() });
          var oldPrice = existRow.price;
          existRow.price = price;
          if (existRow.value && existRow.value > 0) existRow.ratio = ((existRow.value - price) / price) * 100;
          existRow.priceDrop = (existRow.priceDrop || 0) + (oldPrice - price);
          existRow.status = '降价';
          if (!batchMode) { sortTableData(); saveTableData(); refreshTableDisplay(); }
          console.log('[监控-易手游] 降价: ' + product.productUniqueNo + ' ¥' + oldPrice + ' → ¥' + price);
          if (notifyEnabled && (getRowValuation(existRow).level || 0) >= G().minLevel && existRow.value >= notifyMinValue && price >= notifyMinPrice &&
              (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
              (existRow.value - price) > getNotifyDiffThreshold(existRow.value) && !notifiedIds.includes(productId + '_drop')) {
            var dropResult = buildNotifyContent('降价', existRow, oldPrice, price);
            notify(productId + '_drop', dropResult.title, dropResult.body, dropResult.mdBody);
            notifiedIds.push(productId + '_drop');
            if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
            saveStorage(STORAGE_KEYS.notified, notifiedIds);
          }
        }
        return;
      }
    }
    seenIds.push(productId);
    if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();

    // 解析和估值
    var parsed = parseAccountInfo(showTitle);
    var valuation = calculateValue(parsed, price);

    console.log('[监控-易手游] 解析结果: ' + product.productUniqueNo +
      ' | 角色' + parsed.characters.length + '个 | 武器' + parsed.weapons.length + '个' +
      ' | ' + resourceSummaryText(parsed) + ' 黄' + parsed.yellowCount +
      ' | Lv.' + valuation.level +
      ' | 估值¥' + valuation.totalValue.toFixed(0) +
      (valuation.totalValue < 300 ? ' [低于300，不收录]' : '') +
      (valuation.levelFound && valuation.level < G().minLevel ? ' [等级低于' + G().minLevel + '，不收录]' : ''));

    if (valuation.totalValue < 300) { if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds); return; }
    if (valuation.levelFound && valuation.level < G().minLevel) { if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds); return; }

    // 内容指纹去重
    var fingerprint = generateFingerprint(parsed);
    var dupRow = tableData.find(function(r) { return r.fingerprint === fingerprint && r.productId !== productId; });
    if (dupRow) {
      console.log('[监控-易手游] 重复(指纹匹配): ' + product.productUniqueNo + ' ¥' + price + ' → 已有:' + dupRow.productId + ' ¥' + dupRow.price);
      if (price < dupRow.price) {
        if (!dupRow.priceHistory) dupRow.priceHistory = [];
        dupRow.priceHistory.push({ price: dupRow.price, time: Date.now() });
        var dupOldPrice = dupRow.price;
        dupRow.price = price;
        dupRow.productId = productId;
        if (product.productUniqueNo) dupRow.productUniqueNo = product.productUniqueNo;
        dupRow.platform = 'ysy';
        dupRow.ratio = ((dupRow.value - price) / price) * 100;
        dupRow.priceDrop = (dupRow.priceDrop || 0) + (dupOldPrice - price);
        dupRow.status = '降价';
        if (!batchMode) { sortTableData(); saveTableData(); refreshTableDisplay(); }
        console.log('[监控-易手游] 指纹重复更新低价: ¥' + dupOldPrice + ' → ¥' + price);
        if (notifyEnabled && (getRowValuation(dupRow).level || 0) >= G().minLevel && dupRow.value >= notifyMinValue && price >= notifyMinPrice &&
            (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
            (dupRow.value - price) > getNotifyDiffThreshold(dupRow.value) && !notifiedIds.includes(productId + '_drop')) {
          var dupDropResult = buildNotifyContent('降价', dupRow, dupOldPrice, price);
          notify(productId + '_drop', dupDropResult.title, dupDropResult.body, dupDropResult.mdBody);
          notifiedIds.push(productId + '_drop');
          if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
          saveStorage(STORAGE_KEYS.notified, notifiedIds);
        }
      }
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    addTableRow({
      productId: productId,
      productUniqueNo: product.productUniqueNo || '',
      fingerprint: fingerprint,
      showTitle: showTitle,
      price: price,
      value: valuation.totalValue,
      ratio: valuation.ratio,
      status: '初估',
      platform: 'ysy',
      effectiveYellow: valuation.effectiveYellow || 0,
      parsed: {
        yellowCount: parsed.yellowCount,
        pulls: Math.round(parsed.pulls * 10) / 10,
        motoCount: parsed.motoCount,
        characters: parsed.characters.map(function(c) { return { name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price }; }),
        weapons: parsed.weapons.map(function(w) { return { name: w.name, refine: w.refine }; }),
      },
      valuation: valuation,
      listTime: Date.now(),
      firstSeen: Date.now(),
    });

    console.log('[监控-易手游] 新商品入表: ' + product.productUniqueNo + ' ¥' + price + ' 估值¥' + valuation.totalValue.toFixed(0) + ' (表格共' + tableData.length + '行)');
    tryNotifyNewProduct(productId, parsed, valuation, price, showTitle, product.productUniqueNo || '', 'ysy');
  }

  /**
   * 处理易手游商品列表（批量模式）
   */
  async function handleYSYListResponse(list) {
    if (!Array.isArray(list)) return;
    console.log('[监控-易手游] handleYSYListResponse: 收到' + list.length + '条商品，当前表格' + tableData.length + '行');
    list.forEach(function(p) {
      console.log('  - ' + (p.productUniqueNo || '') + ' ¥' + (p.price || 0).toFixed(0) + ' [' + (p.onStandTimeStr || '') + '] ' + (p.showTitle || '').substring(0, 60));
    });

    // 列表API已含faction/baoshi结构化数据（extractYSYProducts中已构建showTitle），无需调用详情API

    batchMode = true;
    try {
      for (var j = 0; j < list.length; j++) {
        try { processYSYProduct(list[j]); } catch (e) {
          console.error('[监控-易手游] 处理商品失败: ' + (list[j].productUniqueNo || list[j].productId), e);
        }
      }
    } finally { batchMode = false; }
    trimTableData();
    sortTableData();
    saveTableData();
    saveStorage(STORAGE_KEYS.seen, seenIds);
    refreshTableDisplay();
    updateStatusText();
    console.log('[监控-易手游] 批量处理完成，表格共' + tableData.length + '行');
  }

  /**
   * 调用详情API
   */
  async function fetchDetail(productId) {
    var detBody = { productId: productId };

    // XHR优先
    try {
      var data = await xhrPost(API_URLS.detail, detBody);
      if (data) return data;
    } catch (e) {
      console.warn('[鸣潮监控] 详情XHR失败:', e.message);
    }

    // fetch备选
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(API_URLS.detail, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
        body: JSON.stringify(detBody),
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        var ct = response.headers.get('content-type') || '';
        if (ct.indexOf('json') >= 0) return await response.json();
      }
    } catch (e) {
      console.warn('[鸣潮监控] 详情fetch失败:', e.message);
    }

    // GM备选
    try {
      var gmDetData = await gmFetch(API_URLS.detail, detBody);
      if (gmDetData) return gmDetData;
    } catch (e) {
      console.error('[鸣潮监控] 详情GM也失败:', e.message);
    }

    // WAF解决后重试
    console.warn('[鸣潮监控] 详情启动WAF解决器...');
    await solveWAFChallenge();
    try {
      var detRetry = await xhrPost(API_URLS.detail, detBody);
      if (detRetry) return detRetry;
    } catch (e) {}

    throw new Error('所有请求方式均失败(详情API)');
  }

  /**
   * 拉取螃蟹网昨日成交清单（POST /api/search/product/selectSelledList）
   * 响应字段与表格数据兼容：productId/showTitle/price(分)/payTime，全部status=2(已成交)
   * API无需登录、与列表接口同域名；pageSize上限100，分页拉全量（上限500条防死循环）
   */
  async function fetchSoldList() {
    const all = [];
    const pageSize = 100;
    const maxPages = 5;
    for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
      const body = { pageIndex, pageSize, gameId: G().platformIds.pxb7 };
      let data = null;
      try {
        data = await xhrPost(API_URLS.soldList, body);
      } catch (e) {
        console.warn('[鸣潮监控] 已售清单XHR失败(第' + pageIndex + '页):', e.message);
        // XHR失败尝试fetch备选
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const response = await fetch(API_URLS.soldList, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
            body: JSON.stringify(body),
            credentials: 'include',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const ct = response.headers.get('content-type') || '';
            if (ct.indexOf('json') >= 0) data = await response.json();
          }
        } catch (e2) { /* 两种方式都失败，跳出 */ }
      }
      if (!data || !data.success || !Array.isArray(data.data)) break;
      all.push(...data.data);
      if (data.data.length < pageSize) break;
    }
    return all;
  }

  // ============================================================
  // 请求拦截
  // ============================================================

  /**
   * 设置fetch和XHR拦截
   */
  function setupInterception() {
    // 拦截 fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = (typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url) || '';
        if (url.includes('selectSearchPageList')) {
          const cloned = response.clone();
          const data = await cloned.json();
          if (data && data.success && data.data) {
            const list = Array.isArray(data.data) ? data.data : (data.data.list || null);
            if (list) handleListResponse(list, true);
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
      return response;
    };

    // 拦截 XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this._mwUrl = url;
      return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener('load', function () {
        try {
          if (this._mwUrl && this._mwUrl.includes('selectSearchPageList')) {
            const data = JSON.parse(this.responseText);
            if (data && data.success && data.data) {
              const list = Array.isArray(data.data) ? data.data : (data.data.list || null);
              if (list) handleListResponse(list, true);
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      });
      return originalSend.apply(this, args);
    };
  }

  /**
   * 处理列表API响应
   * @param {Array} list - 商品列表
   * @param {boolean} fromIntercept - 是否来自拦截
   */
  function handleListResponse(list, fromIntercept, fromFlashSale) {
    if (!Array.isArray(list)) return;
    console.log('[鸣潮监控] 获取到' + list.length + '条商品' + (fromFlashSale ? '(秒杀池)' : '') + (fromIntercept ? '(拦截)' : ''));
    list.forEach(function(item) {
      var pid = item.productId || item.id || '';
      var title = (item.showTitle || item.title || '').substring(0, 60);
      var price = ((item.price || 0) / 100).toFixed(0);
      var uniqueNo = item.productUniqueNo || '';
      console.log('  - ' + uniqueNo + ' ¥' + price + ' ' + title);
    });

    if (fromIntercept) {
      interceptCount++;
      lastInterceptTime = new Date();
      updateStatusText();
    }

    // 批量处理：跳过逐条保存和刷新，处理完后统一执行一次
    batchMode = true;
    try {
      for (const item of list) {
        processProduct(item, fromFlashSale);
      }
    } finally {
      batchMode = false;
    }

    // 统一执行一次截断、排序、保存和刷新
    // 注意：先排序再保存，确保缩减时保留高价值+最新数据
    trimTableData();
    sortTableData();
    saveTableData();
    saveStorage(STORAGE_KEYS.seen, seenIds);
    refreshTableDisplay();
    updateStatusText();
  }

  /**
   * 处理单个商品
   */
  function processProduct(item, fromFlashSale) {
    const productId = item.productId || item.id;
    if (!productId) return;

    const showTitle = item.showTitle || item.title || '';
    const originalPrice = (item.price || 0) / 100; // 分转元（原价）
    let price = originalPrice;

    // 秒杀池商品：使用 discountInfo.discountPrice 作为实际秒杀价
    if (fromFlashSale && item.discountInfo && item.discountInfo.discountPrice) {
      const flashPrice = item.discountInfo.discountPrice / 100;
      if (flashPrice > 0 && flashPrice < originalPrice) {
        price = flashPrice;
        console.log('[鸣潮监控] 秒杀价: ' + (item.productUniqueNo || productId) + ' 原价¥' + originalPrice + ' 秒杀价¥' + flashPrice + ' 已降¥' + ((originalPrice - flashPrice).toFixed(0)));
      }
    }

    // 自主截图账号不记录
    if (/自主截图/.test(showTitle)) return;

    // 秒杀池商品：即使已见过也处理（价格更低）
    if (fromFlashSale) {
      const existRow = tableData.find(r => r.productId === productId);
      if (existRow) {
        // 秒杀池价格更低，更新为秒杀价
        if (price < existRow.price) {
          if (!existRow.priceHistory) existRow.priceHistory = [];
          existRow.priceHistory.push({ price: existRow.price, time: Date.now() });
          const oldPrice = existRow.price;
          existRow.price = price;
          if (existRow.value && existRow.value > 0) {
            existRow.ratio = ((existRow.value - price) / price) * 100;
          }
          existRow.priceDrop = (existRow.priceDrop || 0) + (oldPrice - price);
          existRow.status = '秒杀';
          if (!batchMode) {
            sortTableData();
            saveTableData();
            refreshTableDisplay();
          }
          console.log('[鸣潮监控] 秒杀: ' + (existRow.productUniqueNo || productId) + ' ¥' + oldPrice + ' → ¥' + price);

          // 秒杀通知（与降价通知相同逻辑，但标题不同）
          if (notifyEnabled && (getRowValuation(existRow).level || 0) >= G().minLevel && existRow.value >= notifyMinValue && price >= notifyMinPrice &&
              (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
              (existRow.value - price) > getNotifyDiffThreshold(existRow.value) && !notifiedIds.includes(productId + '_flash')) {
            const { title: flashTitle, body: flashMsg, mdBody: flashMd } = buildNotifyContent('秒杀', existRow, oldPrice, price);
            notify(productId + '_flash', flashTitle, flashMsg, flashMd);
            notifiedIds.push(productId + '_flash');
            if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
            saveStorage(STORAGE_KEYS.notified, notifiedIds);
          }
        } else {
          // 价格相同或更高，但仍标记为秒杀（在秒杀池中即代表还价成交）
          if (existRow.status !== '秒杀' && existRow.status !== '已售') {
            existRow.status = '秒杀';
            if (!batchMode) {
              saveTableData();
              refreshTableDisplay();
            }
            console.log('[鸣潮监控] 秒杀标记(价格未变): ' + (existRow.productUniqueNo || productId) + ' ¥' + price);
          }
        }
        return;
      }
      // 表格中不存在（可能已被截断）
      // 秒杀池商品不受 seenIds 去重限制，从 seenIds 中移除以允许重新处理
      const seenIdx = seenIds.indexOf(productId);
      if (seenIdx >= 0) seenIds.splice(seenIdx, 1);
      console.log('[鸣潮监控] 秒杀池新商品(表格中不存在): ' + productId + ' ¥' + price);
    }

    // 去重：已见商品检查价格是否变化（秒杀池商品已在上面清除 seenIds，不会被跳过）
    if (seenIds.includes(productId)) {
      // 查找表格中已有行，检测价格变化
      const existRow = tableData.find(r => r.productId === productId);
      if (existRow && price < existRow.price) {
        // 降价了！记录价格历史并更新
        if (!existRow.priceHistory) existRow.priceHistory = [];
        existRow.priceHistory.push({ price: existRow.price, time: Date.now() });
        const oldPrice = existRow.price;
        existRow.price = price;
        // 重算性价比（估值不变，只更新价格相关字段）
        if (existRow.value && existRow.value > 0) {
          existRow.ratio = ((existRow.value - price) / price) * 100;
        }
        existRow.priceDrop = (existRow.priceDrop || 0) + (oldPrice - price);
        existRow.status = '降价';
        if (!batchMode) {
          sortTableData();
          saveTableData();
          refreshTableDisplay();
        }
        console.log('[鸣潮监控] 降价: ' + (existRow.productUniqueNo || productId) + ' ¥' + oldPrice + ' → ¥' + price);

        // 降价通知（如果估值仍满足通知条件，且标价不高于上限）
        if ((getRowValuation(existRow).level || 0) >= G().minLevel && existRow.value >= notifyMinValue && price >= notifyMinPrice &&
            (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
            (existRow.value - price) > getNotifyDiffThreshold(existRow.value) && !notifiedIds.includes(productId + '_drop')) {
          const { title: dropTitle, body: dropMsg, mdBody: dropMd } = buildNotifyContent('降价', existRow, oldPrice, price);
          notify(productId + '_drop', dropTitle, dropMsg, dropMd);
          notifiedIds.push(productId + '_drop');
          if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
          saveStorage(STORAGE_KEYS.notified, notifiedIds);
        }
        return;
      } else if (!existRow) {
        // 已见过但不在表格中（之前被截断或估值过滤），移除后重新评估
        const idx = seenIds.indexOf(productId);
        if (idx > -1) seenIds.splice(idx, 1);
        console.log('[鸣潮监控] 重新评估(已见但表格中不存在): ' + (item.productUniqueNo || productId) + ' ¥' + price);
      } else {
        return;
      }
    }
    seenIds.push(productId);
    if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();
    // seenIds 的保存延迟到 addTableRow 之后，确保 tableData 写入成功才同步

    // 提取信息
    const listTime = item.createTime || item.publishTime || item.shelfTime || Date.now();
    // 改进2：提取字母编号 productUniqueNo
    const productUniqueNo = item.productUniqueNo || item.uniqueNo || '';

    // 初步估值
    const parsed = parseAccountInfo(showTitle);
    const valuation = calculateValue(parsed, price);

    console.log('[鸣潮监控] 解析结果: ' + (productUniqueNo || productId) +
      ' | 角色' + parsed.characters.length + '个 | 武器' + parsed.weapons.length + '个' +
      ' | ' + resourceSummaryText(parsed) + ' 黄' + parsed.yellowCount +
      ' | Lv.' + valuation.level +
      ' | 估值¥' + valuation.totalValue.toFixed(0) +
      (valuation.totalValue < 300 ? ' [低于300，不收录]' : '') +
      (valuation.levelFound && valuation.level < G().minLevel ? ' [等级低于' + G().minLevel + '，不收录]' : ''));

    // 估值低于300的垃圾数据不收录
    if (valuation.totalValue < 300) {
      seenIds.push(productId);
      if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      return;
    }

    // 等级低于70的账号不收录（仅在等级明确解析到时过滤，列表页无等级信息时留待详情页判断）
    if (valuation.levelFound && valuation.level < G().minLevel) {
      seenIds.push(productId);
      if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();
      if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      console.log('[鸣潮监控] 等级低于70，不收录: ' + (productUniqueNo || productId) + ' Lv.' + valuation.level);
      return;
    }

    // 内容指纹去重：同一账号重复上架（新productId）时合并到已有行
    const fingerprint = generateFingerprint(parsed);
    const dupRow = tableData.find(r => r.fingerprint === fingerprint && r.productId !== productId);
    if (dupRow) {
      // 标记新ID为已见，避免重复进详情队列
      seenIds.push(productId);
      if (seenIds.length > CONFIG.maxSeenIds) seenIds.shift();
      // 秒杀池商品标记为"秒杀"，普通池标记为"降价"
      const mergeStatus = fromFlashSale ? '秒杀' : '降价';
      // 如果新标价更低，更新价格
      if (price < dupRow.price) {
        if (!dupRow.priceHistory) dupRow.priceHistory = [];
        dupRow.priceHistory.push({ price: dupRow.price, time: Date.now() });
        const oldPrice = dupRow.price;
        dupRow.price = price;
        dupRow.productId = productId; // 切换到新链接
        if (dupRow.productUniqueNo) dupRow.productUniqueNo = productUniqueNo;
        dupRow.ratio = ((dupRow.value - price) / price) * 100;
        dupRow.priceDrop = (dupRow.priceDrop || 0) + (oldPrice - price);
        dupRow.status = mergeStatus;
        dupRow.listTime = typeof listTime === 'number' ? listTime : Date.now();
        if (!batchMode) {
          sortTableData();
          saveTableData();
          refreshTableDisplay();
        }
        console.log('[鸣潮监控] 重复上架合并(' + mergeStatus + '): ' + (productUniqueNo || productId) + ' ¥' + oldPrice + ' → ¥' + price);
        // 降价/秒杀通知
        if (notifyEnabled && (getRowValuation(dupRow).level || 0) >= G().minLevel && dupRow.value >= notifyMinValue && price >= notifyMinPrice &&
            (notifyMaxPrice <= 0 || price <= notifyMaxPrice) &&
            (dupRow.value - price) > getNotifyDiffThreshold(dupRow.value) && !notifiedIds.includes(productId + '_drop')) {
          const { title: mergeTitle, body: mergeMsg, mdBody: mergeMd } = buildNotifyContent(mergeStatus, dupRow, oldPrice, price);
          notify(productId + '_drop', mergeTitle, mergeMsg, mergeMd);
          notifiedIds.push(productId + '_drop');
          if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
          saveStorage(STORAGE_KEYS.notified, notifiedIds);
        }
      } else {
        // 价格未降但秒杀池商品仍标记为秒杀
        if (fromFlashSale && dupRow.status !== '秒杀' && dupRow.status !== '已售') {
          dupRow.status = '秒杀';
          if (!batchMode) { saveTableData(); refreshTableDisplay(); }
          console.log('[鸣潮监控] 秒杀标记(指纹合并,价格未变): ' + (productUniqueNo || productId) + ' ¥' + price);
        }
        if (!batchMode) saveStorage(STORAGE_KEYS.seen, seenIds);
      }
      return;
    }

    // 添加到表格
    addTableRow({
      productId,
      productUniqueNo,
      fingerprint,
      showTitle,
      price,
      value: valuation.totalValue,
      ratio: valuation.ratio,
      status: fromFlashSale ? '秒杀' : '初估',
      effectiveYellow: valuation.effectiveYellow || 0,
      parsed: {
        yellowCount: parsed.yellowCount,
        pulls: Math.round(parsed.pulls * 10) / 10,
        motoCount: parsed.motoCount,
        // 保留 tier/isHot/price，供表格角色标签排序与着色使用
        characters: parsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
        // 保留武器列表，供专武判断使用
        weapons: parsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
      },
      valuation: valuation,
      listTime: typeof listTime === 'number' ? listTime : Date.now(),
      firstSeen: Date.now(),
    });

    if (fromFlashSale) {
      console.log('[鸣潮监控] 秒杀池商品已入表: ' + (productUniqueNo || productId) + ' ¥' + price + ' 估值¥' + valuation.totalValue.toFixed(0));
    }

    // 加入详情队列：估值>500且差价>100，或有S级满命，或匹配指定账号规则
    const hasSC6 = parsed.characters.some(c => c.tier === 'S' && c.const === 6);
    // 检查是否匹配指定账号通知规则（须满足全部角色条件）
    const matchesCharRule = charNotifyRules.length > 0 && charNotifyRules.some(rule =>
      rule.chars.every(rc => parsed.characters.some(c => c.name === rc.name && c.const >= rc.minConst))
    );
    // 基本入队条件：估值>500且差价>100（过滤低价值账号，减少队列堆积）
    const meetsBasicThreshold = valuation.totalValue > 500 && valuation.diff != null && valuation.diff > 100;
    // 描述疑似被截断（长度恰为500）：强制入队，用详情API的完整描述覆盖
    const showTitleSuspectTruncated = showTitle.length === 500;
    if (meetsBasicThreshold || hasSC6 || matchesCharRule || showTitleSuspectTruncated) {
      enqueueDetail(productId, valuation.diff || 0);
    }

    // 初估即推送通知（不等详情API，减少通知延迟）
    tryNotifyNewProduct(productId, parsed, valuation, price, showTitle, productUniqueNo, fromFlashSale ? '秒杀' : null);
  }

  /**
   * 初估阶段通知检查：估值达标时立即推送，不等详情API
   * 避免详情队列堆积导致通知延迟（队列60+条时延迟可达5分钟）
   * @returns {boolean} 是否已发送通知
   */
  function tryNotifyNewProduct(productId, parsed, valuation, price, showTitle, productUniqueNo, platform) {
    if (!notifyEnabled) return false;
    if (notifiedIds.includes(productId)) return false;
    if (/自主截图/.test(showTitle)) return false;
    if ((valuation.level || 0) < 70) return false;

    const notifyDiff = valuation.totalValue - price;
    // 检查指定账号通知规则
    const matchedRules = charNotifyRules.filter(rule =>
      rule.chars.every(rc => parsed.characters.some(c => c.name === rc.name && c.const >= rc.minConst))
    );
    // 常规通知条件
    const shouldNotifyRegular = (notifyDiff > getNotifyDiffThreshold(valuation.totalValue))
      && valuation.totalValue >= notifyMinValue
      && price >= notifyMinPrice
      && (notifyMaxPrice <= 0 || price <= notifyMaxPrice);
    // 指定账号通知条件
    let charRuleTriggered = false;
    let triggeredRule = null;
    const priceWithinMax = (notifyMaxPrice <= 0 || price <= notifyMaxPrice);
    const meetsMinValue = valuation.totalValue >= notifyMinValue;
    const meetsMinPrice = price >= notifyMinPrice;
    if (matchedRules.length > 0 && priceWithinMax && meetsMinValue && meetsMinPrice) {
      for (const r of matchedRules) {
        if (r.minDiff === 0 || notifyDiff > r.minDiff) {
          charRuleTriggered = true;
          triggeredRule = r;
          break;
        }
      }
    }

    if (!charRuleTriggered && !shouldNotifyRegular) return false;

    const matchedCharNames = triggeredRule
      ? triggeredRule.chars.map(c => c.name + (c.minConst > 0 ? c.minConst + '命+' : '')).join('+')
      : '';
    const prefix = charRuleTriggered ? '指定账号' : '高差价';
    const notifyRow = {
      value: valuation.totalValue,
      ratio: valuation.ratio,
      parsed: { pulls: parsed.pulls },
      valuation: valuation,
      showTitle: showTitle,
      productUniqueNo: productUniqueNo,
      platform: platform === '秒杀' ? '' : (productId.indexOf('pz_') === 0 ? 'pzds' : (productId.indexOf('kjs_') === 0 ? 'kjs' : (productId.indexOf('qy_') === 0 ? 'qy' : (productId.indexOf('ysy_') === 0 ? 'ysy' : '')))),
    };
    const { title, body, mdBody } = buildNotifyContent(prefix, notifyRow, null, price, matchedCharNames || undefined);
    notify(productId, title, body, mdBody);
    notifiedIds.push(productId);
    if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
    saveStorage(STORAGE_KEYS.notified, notifiedIds);
    console.log('[鸣潮监控] 初估推送: ' + (productUniqueNo || productId) + ' ¥' + price + ' 估值¥' + valuation.totalValue.toFixed(0) + ' 差价¥' + notifyDiff.toFixed(0));

    // 自动抢购
    if (autoBuyEnabled && notifyDiff >= autoBuyDiff && (autoBuyMaxPrice <= 0 || price <= autoBuyMaxPrice)) {
      autoBuy(productId, notifyDiff, productUniqueNo);
    }
    return true;
  }
  // ============================================================

  /**
   * 加入详情队列（按差价降序优先处理，差价大的先出队）
   * @param {string} productId - 商品ID
   * @param {number} priority - 优先级（差价，默认0）
   */
  function enqueueDetail(productId, priority) {
    // 避免重复入队
    const existItem = detailQueue.find(item => item.productId === productId);
    if (existItem) {
      // 已在队列中，更新优先级（取较大值）
      if (priority != null && (existItem.priority == null || priority > existItem.priority)) {
        existItem.priority = priority;
      }
      return;
    }
    // 避免已处理的
    const row = tableData.find(r => r.productId === productId);
    if (row && row.status === '详估') return;

    detailQueue.push({ productId, time: Date.now(), priority: priority || 0 });
    // 按优先级（差价）降序排序，差价大的排前面优先处理
    detailQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    updateBottomBar();

    if (!detailTimer) {
      processNextDetail();
    }
  }

  /**
   * 处理队列中下一个详情
   */
  function processNextDetail() {
    if (detailQueue.length === 0) {
      detailTimer = null;
      updateBottomBar();
      return;
    }

    // 重置每分钟计数
    if (Date.now() - detailMinuteStart >= 60000) {
      detailCallsThisMinute = 0;
      detailMinuteStart = Date.now();
    }

    // 频率限制
    if (detailCallsThisMinute >= CONFIG.detailRateLimit) {
      const waitTime = 60000 - (Date.now() - detailMinuteStart) + 100;
      detailTimer = setTimeout(processNextDetail, waitTime);
      updateBottomBar();
      return;
    }

    const item = detailQueue.shift();
    detailCallsThisMinute++;
    updateBottomBar();

    // 盼之/氪金兽平台商品跳过详情API（使用列表页数据的初估结果）
    if (item.productId && (item.productId.indexOf('pz_') === 0 || item.productId.indexOf('kjs_') === 0 || item.productId.indexOf('qy_') === 0 || item.productId.indexOf('ysy_') === 0)) {
      processNextDetail();
      return;
    }

    fetchDetail(item.productId).then(data => {
      if (data && data.success && data.data) {
        const showTitle = data.data.showTitle || data.data.title || '';
        const detailPrice = (data.data.price || 0) / 100;
        // 改进2：从详情API提取字母编号 productUniqueNo
        const productUniqueNo = data.data.productUniqueNo || data.data.uniqueNo || '';

        // 重新解析和估值
        const parsed = parseAccountInfo(showTitle);
        const valuation = calculateValue(parsed, detailPrice);

        // 详估后估值低于300，从表格移除
        if (valuation.totalValue < 300) {
          const idx = tableData.findIndex(r => r.productId === item.productId);
          if (idx >= 0) {
            tableData.splice(idx, 1);
            saveTableData();
            sortTableData();
            refreshTableDisplay();
            updateStatusText();
          }
          return;
        }

        // 详估后等级低于70，从表格移除（详情页有完整等级信息，直接判断）
        if (valuation.levelFound && valuation.level < G().minLevel) {
          const idx = tableData.findIndex(r => r.productId === item.productId);
          if (idx >= 0) {
            tableData.splice(idx, 1);
            saveTableData();
            sortTableData();
            refreshTableDisplay();
            updateStatusText();
            console.log('[鸣潮监控] 详估后等级低于70，移除: ' + (productUniqueNo || item.productId) + ' Lv.' + valuation.level);
          }
          return;
        }

        // 更新表格行（保留"秒杀"状态和秒杀价，不被"详估"覆盖）
        const existingRow = tableData.find(r => r.productId === item.productId);
        const isFlashSale = existingRow && existingRow.status === '秒杀';
        const preserveStatus = isFlashSale ? '秒杀' : '详估';
        // 秒杀商品的秒杀价低于详情API返回的标价，保留秒杀价
        const finalPrice = isFlashSale ? Math.min(existingRow.price, detailPrice) : detailPrice;
        // 用保留的价格重算性价比
        const finalRatio = finalPrice > 0 ? ((valuation.totalValue - finalPrice) / finalPrice) * 100 : valuation.ratio;
        updateTableRow(item.productId, {
          showTitle,
          price: finalPrice,
          productUniqueNo,
          value: valuation.totalValue,
          ratio: finalRatio,
          status: preserveStatus,
          effectiveYellow: valuation.effectiveYellow || 0,
          parsed: {
            yellowCount: parsed.yellowCount,
            pulls: Math.round(parsed.pulls * 10) / 10,
            motoCount: parsed.motoCount,
            // 保留 tier/isHot/price，供表格角色标签排序与着色使用
            characters: parsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
            // 保留武器列表，供专武判断使用
            weapons: parsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
          },
          valuation: valuation,
        });

        // ===== 通知逻辑 =====
        // 自主截图账号不通知（信息不可靠），等级低于当前游戏阈值不通知
        const isSelfScreenshot = /自主截图/.test(showTitle);
        if (notifyEnabled && !isSelfScreenshot && !notifiedIds.includes(item.productId) && (valuation.level || 0) >= G().minLevel) {
          // 秒杀商品使用秒杀价计算差价和通知条件
          const notifyPrice = finalPrice;
          const notifyDiff = valuation.totalValue - notifyPrice;
          // 1. 优先检查指定账号通知规则（须满足全部角色条件 + 差价）
          const matchedRules = charNotifyRules.filter(rule =>
            rule.chars.every(rc => parsed.characters.some(c => c.name === rc.name && c.const >= rc.minConst))
          );
          // 常规通知条件：差价超过阈值，且估值/标价不低于各自下限，且标价不高于上限
          const shouldNotifyRegular = (notifyDiff > getNotifyDiffThreshold(valuation.totalValue))
            && valuation.totalValue >= notifyMinValue
            && notifyPrice >= notifyMinPrice
            && (notifyMaxPrice <= 0 || notifyPrice <= notifyMaxPrice);

          // 指定账号通知条件：匹配规则 + 差价满足该规则的 minDiff + 最低限制 + 标价不高于上限
          let charRuleTriggered = false;
          let triggeredRule = null;
          const priceWithinMax = (notifyMaxPrice <= 0 || notifyPrice <= notifyMaxPrice);
          const meetsMinValue = valuation.totalValue >= notifyMinValue;
          const meetsMinPrice = notifyPrice >= notifyMinPrice;
          if (matchedRules.length > 0 && priceWithinMax && meetsMinValue && meetsMinPrice) {
            for (const r of matchedRules) {
              // minDiff=0 表示不限差价（始终通过），否则检查差价是否超过 minDiff
              if (r.minDiff === 0 || notifyDiff > r.minDiff) {
                charRuleTriggered = true;
                triggeredRule = r;
                break;
              }
            }
          }

          if (charRuleTriggered || shouldNotifyRegular) {
            // 构建通知内容
            const matchedCharNames = triggeredRule
              ? triggeredRule.chars.map(c => c.name + (c.minConst > 0 ? c.minConst + '命+' : '')).join('+')
              : '';
            const prefix = charRuleTriggered ? '指定账号' : '高差价';
            const notifyRow = {
              value: valuation.totalValue,
              ratio: finalRatio,
              parsed: { pulls: parsed.pulls },
              valuation: valuation,
              showTitle: showTitle,
              productUniqueNo: productUniqueNo,
              platform: item.productId.indexOf('pz_') === 0 ? 'pzds' : (item.productId.indexOf('kjs_') === 0 ? 'kjs' : (item.productId.indexOf('qy_') === 0 ? 'qy' : (item.productId.indexOf('ysy_') === 0 ? 'ysy' : ''))),
            };
            const { title: notifyTitle, body: notifyBody, mdBody: notifyMd } = buildNotifyContent(prefix, notifyRow, null, notifyPrice, matchedCharNames || undefined);
            notify(item.productId, notifyTitle, notifyBody, notifyMd);
            notifiedIds.push(item.productId);
            if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
            saveStorage(STORAGE_KEYS.notified, notifiedIds);

            // 自动抢购：差价超过阈值且标价不超过上限时自动打开商品页
            if (autoBuyEnabled && notifyDiff >= autoBuyDiff && (autoBuyMaxPrice <= 0 || notifyPrice <= autoBuyMaxPrice)) {
              autoBuy(item.productId, notifyDiff, productUniqueNo);
            }
          }
        }
      }
    }).catch(e => {
      console.error('[鸣潮监控] 详情API调用失败:', item.productId, e);
    }).finally(() => {
      detailTimer = setTimeout(processNextDetail, CONFIG.detailInterval);
      updateBottomBar();
    });
  }

  // ============================================================
  // 表格数据管理
  // ============================================================

  /**
   * 根据估值获取通知差价阈值（命中阶梯返回对应值，否则回退到 notifyDiffThreshold）
   */
  function getNotifyDiffThreshold(value) {
    for (var i = 0; i < notifyDiffTiers.length; i++) {
      var t = notifyDiffTiers[i];
      if (value >= t.minValue && value < t.maxValue) return t.minDiff;
    }
    return notifyDiffThreshold;
  }

  /**
   * 添加表格行
   */
  function addTableRow(row) {
    // 入表时立即精简：移除 valuation/parsed 等可从 showTitle 重建的大字段，避免 localStorage 配额浪费
    const slim = slimRow(row);
    // 检查是否已存在
    const existIdx = tableData.findIndex(r => r.productId === slim.productId);
    if (existIdx >= 0) {
      tableData[existIdx] = Object.assign(tableData[existIdx], slim);
    } else {
      tableData.push(slim);
    }

    // 批量模式下跳过截断、保存和刷新，由调用方统一处理
    if (batchMode) return;

    // 限制最大行数：始终按差价降序截断，确保高价值数据不被误删
    trimTableData();

    // 先排序再保存：确保新数据处于正确位置，缩减时不会被误删
    sortTableData();
    const saved = saveTableData();
    // 只有表格数据成功保存（或精简后保存），才同步 seenIds
    // 这确保刷新后 seenIds 与 tableData 始终一致，不会出现"ID已见但表格缺失"的情况
    if (saved) {
      saveStorage(STORAGE_KEYS.seen, seenIds);
    }
    refreshTableDisplay();
    updateStatusText();
  }

  /**
   * 更新表格行
   */
  function updateTableRow(productId, updates) {
    const row = tableData.find(r => r.productId === productId);
    if (row) {
      // 描述变化时需清除旧解析/估值缓存（slimRow 只剥掉 updates 里的字段，不会清掉行上已有的旧缓存）
      const titleChanged = updates.showTitle && updates.showTitle !== row.showTitle;
      Object.assign(row, slimRow(updates));
      if (titleChanged) {
        delete row.valuation;
        delete row._cachedValuation;
        delete row.parsed;
      }
      sortTableData();
      saveTableData();
      refreshTableDisplay();
    } else {
      // 行不存在（可能被挤出），重新创建
      console.log('[鸣潮监控] 行不存在，重新创建:', productId);
      tableData.push(slimRow(Object.assign({
        productId: productId,
        listTime: Date.now(),
        firstSeen: Date.now(),
      }, updates)));
      trimTableData();
      sortTableData();
      saveTableData();
      refreshTableDisplay();
    }
  }

  const TRIM_BATCH = 50; // 达到上限时一次清理的行数（小批量渐进式，避免数据骤减）

  /**
   * 综合排序移除 TRIM_BATCH 条数据（差价低 + 时间旧优先删除，近30分钟新增保护）
   * 不修改原数组顺序，通过索引过滤移除
   */
  function removeLowDiffRows() {
    if (tableData.length === 0) return 0;
    var now = Date.now();
    var PROTECT_MS = 30 * 60 * 1000; // 30分钟保护期
    var targetCount = Math.min(TRIM_BATCH, tableData.length);

    // 计算每行的差价和年龄，标记保护状态
    var scored = tableData.map(function (row, i) {
      var diff = (row.value || 0) - (row.price || 0);
      var time = row.firstSeen || row.listTime || 0;
      var ageMs = now - time;
      if (ageMs < PROTECT_MS) return { idx: i, protected: true };
      return { idx: i, protected: false, diff: diff, ageMs: ageMs };
    });

    // 筛选未被保护的候选行
    var candidates = scored.filter(function (s) { return !s.protected; });
    if (candidates.length === 0) {
      console.log('[鸣潮监控] 所有数据均在30分钟保护期内，跳过清理');
      return 0;
    }

    // 归一化差价和年龄到 0~1 范围（基于当前数据集）
    var diffs = candidates.map(function (c) { return c.diff; });
    var ages = candidates.map(function (c) { return c.ageMs; });
    var minDiff = Math.min.apply(null, diffs);
    var maxDiff = Math.max.apply(null, diffs);
    var minAge = Math.min.apply(null, ages);
    var maxAge = Math.max.apply(null, ages);
    var diffRange = maxDiff - minDiff || 1;
    var ageRange = maxAge - minAge || 1;

    // 综合分数：差价低(→1) + 时间旧(→1)，权重各50%，越高越优先删除
    candidates.forEach(function (c) {
      var diffNorm = 1 - (c.diff - minDiff) / diffRange; // 差价越低 → 越接近1
      var ageNorm = (c.ageMs - minAge) / ageRange;        // 时间越旧 → 越接近1
      c.score = diffNorm * 0.5 + ageNorm * 0.5;
    });

    // 按分数降序，取前 targetCount 个
    candidates.sort(function (a, b) { return b.score - a.score; });
    var actualRemove = Math.min(targetCount, candidates.length);
    var toRemove = new Set();
    for (var si = 0; si < actualRemove; si++) {
      toRemove.add(candidates[si].idx);
    }

    // 通过索引过滤移除，不改变原数组顺序
    tableData = tableData.filter(function (_, i) { return !toRemove.has(i); });

    console.log('[鸣潮监控] 综合清理' + actualRemove + '条数据（差价低+时间旧优先，30分钟内保护），剩余' + tableData.length + '条');
    return actualRemove;
  }

  /**
   * 截断表格数据：达到上限时综合排序移除 TRIM_BATCH 条（差价低+时间旧优先，30分钟内保护）
   */
  function trimTableData() {
    // 无上限模式：不再主动删除数据，仅在 saveTableData 写入失败时由降级链处理
    return;
  }

  // 排序状态：默认按差价降序
  let sortColumn = 'diff';   // 'time' | 'value' | 'ratio' | 'diff' | 'price' | 'yellow' | 'pulls'
  let sortDirection = 'desc'; // 'asc' | 'desc'

  /**
   * 排序表格数据
   */
  function sortTableData() {
    tableData.sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case 'time':
          valA = a.listTime ? new Date(a.listTime).getTime() : 0;
          valB = b.listTime ? new Date(b.listTime).getTime() : 0;
          break;
        case 'value':
          valA = a.value || 0;
          valB = b.value || 0;
          break;
        case 'ratio':
          valA = a.price > 0 ? (a.value - a.price) / a.price : 0;
          valB = b.price > 0 ? (b.value - b.price) / b.price : 0;
          break;
        case 'price':
          valA = a.price || 0;
          valB = b.price || 0;
          break;
        case 'yellow':
          valA = a.effectiveYellow || 0;
          valB = b.effectiveYellow || 0;
          break;
        case 'pulls':
          valA = (a.parsed && a.parsed.pulls) ? a.parsed.pulls : 0;
          valB = (b.parsed && b.parsed.pulls) ? b.parsed.pulls : 0;
          break;
        case 'diff':
        default:
          valA = (a.value || 0) - (a.price || 0);
          valB = (b.value || 0) - (b.price || 0);
          break;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }

  /**
   * 切换排序列
   */
  function toggleSort(column) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'desc';
    }
    sortTableData();
    refreshTableDisplay();
    updateSortIndicators();
  }

  /**
   * 更新表头排序指示器
   */
  function updateSortIndicators() {
    const ths = document.querySelectorAll('#mwTable th.mw-sortable');
    ths.forEach(th => {
      th.classList.remove('mw-sort-active');
      th.removeAttribute('data-sort-arrow');
    });
    ths.forEach(th => {
      const col = th.getAttribute('data-col');
      if (col === sortColumn) {
        th.classList.add('mw-sort-active');
        th.setAttribute('data-sort-arrow', sortDirection === 'asc' ? '↑' : '↓');
      }
    });
  }

  // ============================================================
  // UI创建
  // ============================================================

  /**
   * 创建全屏仪表板
   */
  function createDashboard() {
    // 不隐藏原始页面，改为浮动窗口

    // 创建主容器
    const dashboard = document.createElement('div');
    dashboard.id = 'mw-dashboard';
    dashboard.innerHTML = `
      <style>
        #mw-dashboard {
          position: fixed;
          top: 80px; right: 16px;
          width: 760px;
          height: calc(100vh - 100px);
          min-width: 480px;
          min-height: 300px;
          background: #0a0a1a;
          color: #e0e0e0;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, 'Microsoft YaHei', sans-serif;
          font-size: 13px;
          border: 1px solid #2a2a4a;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        #mw-dashboard * { box-sizing: border-box; }
        #mw-dashboard.mw-collapsed {
          height: 36px !important;
          min-height: 36px !important;
        }
        #mw-dashboard.mw-collapsed .mw-table-container,
        #mw-dashboard.mw-collapsed .mw-bottom-bar,
        #mw-dashboard.mw-collapsed .mw-filter-bar,
        #mw-dashboard.mw-collapsed .mw-resize-handle {
          display: none !important;
        }
        /* 折叠时显示状态文字和折叠按钮 */
        #mw-dashboard.mw-collapsed .mw-top-bar {
          justify-content: space-between;
        }
        #mw-dashboard.mw-collapsed .mw-buttons > *:not(.mw-collapse-btn) {
          display: none !important;
        }
        #mw-dashboard.mw-collapsed .mw-status-text {
          display: block !important;
          font-size: 11px;
        }
        .mw-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: #12122a;
          border-bottom: 1px solid #2a2a4a;
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 6px;
          cursor: move;
          user-select: none;
        }
        .mw-status-text {
          color: #8888aa;
          font-size: 11px;
          flex-grow: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mw-buttons {
          display: flex;
          gap: 4px;
          align-items: center;
          flex-wrap: wrap;
        }
        .mw-btn {
          padding: 3px 8px;
          border: 1px solid #2a2a4a;
          background: #1a1a2e;
          color: #e0e0e0;
          cursor: pointer;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .mw-btn:hover {
          background: #2a2a4e;
          border-color: #e94560;
        }
        .mw-btn-active {
          background: #e94560;
          border-color: #e94560;
          color: white;
        }
        .mw-btn-green {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        .mw-input {
          width: 40px;
          padding: 2px 4px;
          background: #1a1a2e;
          border: 1px solid #2a2a4a;
          color: #e0e0e0;
          border-radius: 4px;
          font-size: 11px;
          text-align: center;
        }
        .mw-input-label {
          font-size: 11px;
          color: #8888aa;
        }
        .mw-select {
          padding: 2px 4px;
          background: #1a1a2e;
          border: 1px solid #2a2a4a;
          color: #e9d5ff;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        }
        .mw-select:focus { outline: none; border-color: #e94560; }
        .mw-collapse-btn {
          padding: 3px 8px;
          cursor: pointer;
          font-size: 14px;
          color: #8888aa;
          border: none;
          background: none;
        }
        .mw-collapse-btn:hover { color: #e94560; }
        .mw-resize-handle {
          position: absolute;
          bottom: 0; right: 0;
          width: 16px; height: 16px;
          cursor: nwse-resize;
          background: linear-gradient(135deg, transparent 50%, #2a2a4a 50%);
          z-index: 100;
        }
        .mw-table-container {
          flex-grow: 1;
          overflow: auto;
          position: relative;
        }
        .mw-table {
          width: 100%;
          border-collapse: collapse;
        }
        .mw-table th {
          position: sticky;
          top: 0;
          background: #12122a;
          padding: 6px 6px;
          text-align: left;
          border-bottom: 2px solid #2a2a4a;
          font-weight: bold;
          color: #8888aa;
          font-size: 11px;
          white-space: nowrap;
          z-index: 10;
        }
        .mw-table th.mw-sortable {
          cursor: pointer;
          user-select: none;
        }
        .mw-table th.mw-sortable:hover {
          color: #e94560;
        }
        .mw-table th.mw-sort-active {
          color: #e94560;
        }
        .mw-table th.mw-sort-active::after {
          content: attr(data-sort-arrow);
          margin-left: 3px;
          font-size: 9px;
        }
        .mw-table td {
          padding: 4px 6px;
          border-bottom: 1px solid #1a1a2a;
          font-size: 11px;
          white-space: nowrap;
        }
        /* 五星角色列允许换行，限制最大宽度 */
        .mw-table td.mw-chars-cell {
          white-space: normal !important;
          max-width: 200px;
          line-height: 1.6;
        }
        .mw-table tr:hover td {
          background: #1a1a3e !important;
        }
        .mw-row-positive td {
          background: rgba(16, 185, 129, 0.06);
        }
        .mw-row-gold td {
          background: rgba(245, 158, 11, 0.10);
        }
        /* 颜色规则：差价>200绿色, 0~200黄色, -200~0灰色, <-200红色 */
        .mw-color-red { color: #ef4444; }
        .mw-color-gray { color: #8888aa; }
        .mw-color-yellow { color: #fbbf24; font-weight: bold; }
        .mw-color-green { color: #10b981; font-weight: bold; }
        .mw-char-tag {
          display: inline-block;
          margin-right: 1px;
          margin-bottom: 1px;
          padding: 0px 3px;
          background: #1a1a2e;
          border: 1px solid #2a2a3a;
          border-radius: 3px;
          cursor: pointer;
          font-size: 10px;
        }
        .mw-char-tag:hover {
          background: #2a2a4e;
          border-color: #e94560;
          color: #e94560;
        }
        .mw-char-tag-active {
          background: #e94560 !important;
          border-color: #e94560 !important;
          color: white !important;
        }
        .mw-bottom-bar {
          padding: 4px 12px;
          background: #12122a;
          border-top: 1px solid #2a2a4a;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #8888aa;
          font-size: 10px;
          flex-shrink: 0;
          gap: 12px;
          flex-wrap: wrap;
        }
        .mw-product-link {
          color: #6a9fff;
          text-decoration: none;
          cursor: pointer;
        }
        .mw-product-link:hover {
          text-decoration: underline;
        }
        /* 悬停详情面板与设置面板的深色滚动条 */
        #mw-hover-detail::-webkit-scrollbar,
        #mw-settings-modal > div::-webkit-scrollbar {
          width: 8px;
        }
        #mw-hover-detail::-webkit-scrollbar-track,
        #mw-settings-modal > div::-webkit-scrollbar-track {
          background: #16213e;
          border-radius: 4px;
        }
        #mw-hover-detail::-webkit-scrollbar-thumb,
        #mw-settings-modal > div::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 4px;
        }
        #mw-hover-detail::-webkit-scrollbar-thumb:hover,
        #mw-settings-modal > div::-webkit-scrollbar-thumb:hover {
          background: #1a4a80;
        }
        .mw-status-badge {
          display: inline-block;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
        }
        .mw-badge-init { background: #1a3a5a; color: #6a9fff; }
        .mw-badge-detail { background: #1a3a1a; color: #10b981; }
        .mw-badge-sold { background: #3a1a1a; color: #e94560; }
        .mw-badge-drop { background: #3a2a1a; color: #f59e0b; }
        .mw-badge-flash { background: #3a1a2a; color: #e94560; }
        .mw-empty {
          text-align: center;
          padding: 40px 20px;
          color: #555577;
          font-size: 13px;
        }
        .mw-filter-bar {
          padding: 3px 12px;
          background: #0d0d1f;
          border-bottom: 1px solid #1a1a2a;
          font-size: 10px;
          color: #8888aa;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .mw-filter-clear {
          color: #e94560;
          cursor: pointer;
          text-decoration: underline;
        }
      </style>
      <div class="mw-top-bar" id="mwTopBar">
        <span class="mw-status-text" id="mwStatusText">初始化中...</span>
        <div class="mw-buttons" id="mwButtons">
          <select class="mw-select" id="mwGameSelector" title="切换监控游戏（配置、表格数据按游戏隔离）"></select>
          <button class="mw-btn" id="mwBtnMonitor">开始监控</button>
          <button class="mw-btn" id="mwBtnNotify">开启通知</button>
          <button class="mw-btn" id="mwBtnNotifySettings">通知设置</button>
          <button class="mw-btn" id="mwBtnRefresh">立即刷新</button>
          <button class="mw-btn" id="mwBtnSettings">估值设置</button>
          <button class="mw-btn" id="mwBtnClearTable">清空表格</button>
          <button class="mw-btn" id="mwBtnCleanData">清理数据</button>
          <button class="mw-btn" id="mwBtnCheckSold">检查已售</button>
          <span class="mw-input-label">≥</span>
          <input type="number" class="mw-input" id="mwInputThreshold" value="20" min="0" max="999">%
          <button class="mw-collapse-btn" id="mwBtnCollapse" title="折叠/展开">—</button>
        </div>
      </div>
      <div class="mw-filter-bar" id="mwFilterBar" style="display:flex;">
        <span>筛选角色: </span><span id="mwFilterCharTags" style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;"></span>
        <span class="mw-filter-clear" id="mwFilterAddChar" style="color:#10b981;" title="添加角色筛选（可搜索全部角色，含未显示的低级别角色）">＋角色</span>
        <span class="mw-filter-clear" id="mwFilterClear">重置</span>
      </div>
      <div class="mw-filter-bar" id="mwNumFilterBar" style="display:flex;">
        <span style="color:#8888aa;">筛选:</span>
        <input type="text" id="mwSearchInput" placeholder="搜编号/角色" style="width:90px;padding:2px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;">
        <span class="mw-input-label">标价</span>
        <input type="number" class="mw-input" id="mwFilterPriceMin" placeholder="最小" style="width:50px;">
        <span style="color:#555;">~</span>
        <input type="number" class="mw-input" id="mwFilterPriceMax" placeholder="最大" style="width:50px;">
        <span class="mw-input-label">估值</span>
        <input type="number" class="mw-input" id="mwFilterValueMin" placeholder="最小" style="width:50px;">
        <span style="color:#555;">~</span>
        <input type="number" class="mw-input" id="mwFilterValueMax" placeholder="最大" style="width:50px;">
        <span class="mw-input-label">差价</span>
        <input type="number" class="mw-input" id="mwFilterDiffMin" placeholder="最小" style="width:50px;">
        <span style="color:#555;">~</span>
        <input type="number" class="mw-input" id="mwFilterDiffMax" placeholder="最大" style="width:50px;">
        <span class="mw-input-label">性价比%</span>
        <input type="number" class="mw-input" id="mwFilterRatioMin" placeholder="最小" style="width:50px;">
        <span style="color:#555;">~</span>
        <input type="number" class="mw-input" id="mwFilterRatioMax" placeholder="最大" style="width:50px;">
        <span class="mw-filter-clear" id="mwNumFilterClear">重置</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;padding:0 4px;">
        <label style="color:#8888aa;font-size:12px;cursor:pointer;white-space:nowrap;"><input type="checkbox" id="mwShowOnlySold" style="vertical-align:middle;">只显示已售</label>
        <label style="color:#e94560;font-size:12px;cursor:pointer;white-space:nowrap;"><input type="checkbox" id="mwShowOnlyFlashSale" style="vertical-align:middle;">只显示秒杀</label>
      </div>
      <div class="mw-table-container">
        <table class="mw-table" id="mwTable">
          <thead>
            <tr>
              <th class="mw-sortable" data-col="time">上架</th>
              <th class="mw-sortable" data-col="value">估值</th>
              <th class="mw-sortable" data-col="diff">差价</th>
              <th class="mw-sortable" data-col="ratio">性价比</th>
              <th class="mw-sortable" data-col="price">标价</th>
              <th class="mw-sortable" data-col="yellow">有效/限定/总</th>
              <th class="mw-sortable" data-col="pulls">抽数</th>
              <th id="mwThMoto">摩托</th>
              <th id="mwThChars">五星角色</th>
              <th>状态</th>
              <th style="width:30px;">删</th>
            </tr>
          </thead>
          <tbody id="mwTableBody">
            <tr><td colspan="11" class="mw-empty">等待数据加载...</td></tr>
          </tbody>
        </table>
        <div id="mwPaginationBar" style="display:none;position:sticky;bottom:0;left:0;z-index:6;background:#0a0a1a;border-top:1px solid #2a2a4a;align-items:center;justify-content:center;padding:5px 0;flex-wrap:wrap;user-select:none;"></div>
      </div>
      <div class="mw-bottom-bar" id="mwBottomBar">
        <span id="mwBottomLeft">最后刷新: - | 下次刷新: -</span>
        <span id="mwBottomRight">详情API: 0/分钟 | 队列: 0</span>
      </div>
      <div class="mw-resize-handle" id="mwResizeHandle"></div>
    `;

    document.body.appendChild(dashboard);

    // 缓存DOM引用
    dom.statusText = document.getElementById('mwStatusText');
    dom.btnMonitor = document.getElementById('mwBtnMonitor');
    dom.btnNotify = document.getElementById('mwBtnNotify');
    dom.btnNotifySettings = document.getElementById('mwBtnNotifySettings');
    dom.btnRefresh = document.getElementById('mwBtnRefresh');
    dom.btnSettings = document.getElementById('mwBtnSettings');
    dom.btnClearTable = document.getElementById('mwBtnClearTable');
    dom.btnCleanData = document.getElementById('mwBtnCleanData');
    dom.btnCheckSold = document.getElementById('mwBtnCheckSold');
    dom.inputThreshold = document.getElementById('mwInputThreshold');
    dom.tableBody = document.getElementById('mwTableBody');
    dom.filterBar = document.getElementById('mwFilterBar');
    dom.filterCharTags = document.getElementById('mwFilterCharTags');
    dom.filterClear = document.getElementById('mwFilterClear');
    dom.bottomLeft = document.getElementById('mwBottomLeft');
    dom.bottomRight = document.getElementById('mwBottomRight');

    // 表头排序点击事件
    document.querySelectorAll('#mwTable th.mw-sortable').forEach(th => {
      th.addEventListener('click', function () {
        const col = this.getAttribute('data-col');
        toggleSort(col);
      });
    });
    // 初始化排序指示器
    updateSortIndicators();

    // 游戏切换下拉框：填充选项并绑定切换事件
    dom.gameSelector = document.getElementById('mwGameSelector');
    for (const [key, g] of Object.entries(GAME_CONFIGS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = g.name;
      dom.gameSelector.appendChild(opt);
    }
    dom.gameSelector.value = currentGame;
    updateGameLabels();

    // 切换游戏：保存当前状态并跳转到新游戏列表页（数据/配置按游戏前缀隔离存储）
    dom.gameSelector.addEventListener('change', function () {
      if (this.value === currentGame) return;
      switchGame(this.value);
    });

    // 拖拽、缩放、折叠功能
    const topBar = document.getElementById('mwTopBar');
    const resizeHandle = document.getElementById('mwResizeHandle');
    const collapseBtn = document.getElementById('mwBtnCollapse');

    // 折叠/展开
    collapseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dashboard.classList.toggle('mw-collapsed');
      collapseBtn.textContent = dashboard.classList.contains('mw-collapsed') ? '+' : '—';
    });

    // 拖拽移动
    let isDragging = false, dragStartX = 0, dragStartY = 0, dragStartLeft = 0, dragStartTop = 0;
    topBar.addEventListener('mousedown', function (e) {
      // 不在按钮、输入框和下拉框上触发拖拽
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = dashboard.getBoundingClientRect();
      dragStartLeft = rect.left;
      dragStartTop = rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      let newLeft = dragStartLeft + (e.clientX - dragStartX);
      let newTop = dragStartTop + (e.clientY - dragStartY);
      // 限制在视口内
      newLeft = Math.max(0, Math.min(window.innerWidth - 100, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - 36, newTop));
      dashboard.style.left = newLeft + 'px';
      dashboard.style.top = newTop + 'px';
      dashboard.style.right = 'auto';
    });
    document.addEventListener('mouseup', function () { isDragging = false; });

    // 缩放
    let isResizing = false, resizeStartX = 0, resizeStartY = 0, resizeStartW = 0, resizeStartH = 0;
    resizeHandle.addEventListener('mousedown', function (e) {
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      const rect = dashboard.getBoundingClientRect();
      resizeStartW = rect.width;
      resizeStartH = rect.height;
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousemove', function (e) {
      if (!isResizing) return;
      let newW = resizeStartW + (e.clientX - resizeStartX);
      let newH = resizeStartH + (e.clientY - resizeStartY);
      newW = Math.max(480, Math.min(window.innerWidth - 20, newW));
      newH = Math.max(300, Math.min(window.innerHeight - 20, newH));
      dashboard.style.width = newW + 'px';
      dashboard.style.height = newH + 'px';
    });
    document.addEventListener('mouseup', function () { isResizing = false; });

    // 绑定事件
    bindEvents();
  }

  /**
   * 绑定UI事件
   */
  function bindEvents() {
    dom.btnMonitor.addEventListener('click', function () {
      if (monitorRunning) {
        stopMonitor();
      } else {
        startMonitor();
      }
    });

    dom.btnNotify.addEventListener('click', function () {
      if (notifyEnabled) {
        notifyEnabled = false;
        dom.btnNotify.textContent = '开启通知';
        dom.btnNotify.classList.remove('mw-btn-green');
        saveState();
      } else {
        // 请求通知权限
        if (Notification && Notification.permission === 'granted') {
          notifyEnabled = true;
          dom.btnNotify.textContent = '停止通知';
          dom.btnNotify.classList.add('mw-btn-green');
          saveState();
        } else if (Notification && Notification.permission !== 'denied') {
          Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') {
              notifyEnabled = true;
              dom.btnNotify.textContent = '停止通知';
              dom.btnNotify.classList.add('mw-btn-green');
              saveState();
            } else {
              alert('通知权限被拒绝，无法开启通知功能');
            }
          });
        } else {
          alert('浏览器不支持通知或权限被拒绝');
        }
      }
    });

    // 通知设置按钮
    dom.btnNotifySettings.addEventListener('click', function () {
      // 防止重复点击：如果已有通知设置弹窗，先移除
      const existingOverlay = document.getElementById('mw-notify-settings-overlay');
      if (existingOverlay) { existingOverlay.remove(); return; }

      // 折叠监控窗口
      const dash = document.getElementById('mw-dashboard');
      if (dash && !dash.classList.contains('mw-collapsed')) {
        dash.classList.add('mw-collapsed');
        const btn = document.getElementById('mwBtnCollapse');
        if (btn) btn.textContent = '+';
      }

      const overlay = document.createElement('div');
      overlay.id = 'mw-notify-settings-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100005;display:flex;align-items:center;justify-content:center;';
      const box = document.createElement('div');
      box.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:24px 24px 0;width:480px;max-height:85vh;overflow-y:auto;color:#e0e0e0;';
      box.innerHTML =
        '<div style="font-size:16px;font-weight:600;margin-bottom:16px;color:#e94560;">通知设置</div>' +
        // 刷新间隔
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">刷新设置</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">刷新间隔（秒）</label>' +
        '<input type="number" id="mwRefreshInterval" value="' + refreshIntervalSec + '" min="5" max="3600" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">自动刷新列表的时间间隔，建议10~60秒</div>' +
        // 秒杀库池监控
        '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">' +
        '<label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
        '<input type="checkbox" id="mwFlashSaleEnabled" ' + (flashSaleEnabled ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;" /> 同时监控秒杀库池（还价成交的低价账号）</label>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">扫描秒杀库池前2页，捕获还价后卖家同意的降价商品</div>' +
        // 盼之平台监控
        '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">' +
        '<label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
        '<input type="checkbox" id="mwPzdsEnabled" ' + (pzdsEnabled ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;" /> 同时监控盼之平台（pzds.com' + G().name + '商品池）</label>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">通过SSR HTML抓取盼之平台商品列表，无需API token，扫描前2页</div>' +
        // 氪金兽平台监控
        '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">' +
        '<label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
        '<input type="checkbox" id="mwKjsEnabled" ' + (kjsEnabled ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;" /> 同时监控氪金兽平台（kejinshou.com' + G().name + '成品号）</label>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">通过MWP API按最新发布顺序获取氪金兽商品列表（含完整角色武器数据），扫描第1页</div>' +
        // 7881平台监控
        '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">' +
        '<label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
        '<input type="checkbox" id="mwQyEnabled" ' + (qyEnabled ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;" /> 同时监控7881平台（search.7881.com' + G().name + '成品号）</label>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">通过API抓取7881商品列表（MD5签名认证），按最新发布排序</div>' +
        // 易手游平台监控
        '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">' +
        '<label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
        '<input type="checkbox" id="mwYsyEnabled" ' + (ysyEnabled ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;" /> 同时监控易手游平台（swcbg.com' + G().name + '成品号）</label>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">通过API抓取易手游商品列表（结构化角色武器数据），按最新发布排序</div>' +
        // 通知阈值
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">通知阈值</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">差价阈值（元）</label>' +
        '<input type="number" id="mwNotifyDiff" value="' + notifyDiffThreshold + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:8px;">差价超过阈值时发送通知（阶梯外估值使用此默认值）</div>' +
        // 估价阶梯差价阈值
        '<div style="font-size:12px;font-weight:600;color:#f59e0b;margin-bottom:6px;">估价阶梯差价阈值</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:8px;">按估值范围设置不同差价阈值，命中阶梯优先于上方默认值。范围左闭右开（如500~1000表示500≤估值&lt;1000）</div>' +
        '<div id="mwDiffTiersList" style="margin-bottom:8px;"></div>' +
        '<div style="display:flex;gap:6px;margin-bottom:16px;">' +
        '<button id="mwDiffTierAdd" type="button" style="padding:5px 12px;border:none;border-radius:4px;background:#0f3460;color:#6a9fff;font-size:12px;cursor:pointer;">+ 添加阶梯</button>' +
        '</div>' +
        // 自动购买
        '<div style="font-size:13px;font-weight:600;color:#e94560;margin-bottom:8px;">自动抢购</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:12px;align-items:center;">' +
        '<label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:6px;cursor:pointer;">' +
        '<input type="checkbox" id="mwAutoBuyEnabled" ' + (autoBuyEnabled ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;" /> 开启自动抢购</label>' +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">自动抢购差价阈值（元）</label>' +
        '<input type="number" id="mwAutoBuyDiff" value="' + autoBuyDiff + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">标价上限（元）</label>' +
        '<input type="number" id="mwAutoBuyMaxPrice" value="' + autoBuyMaxPrice + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#f59e0b;margin-bottom:16px;padding:8px 10px;background:rgba(245,158,11,0.1);border-radius:6px;border-left:3px solid #f59e0b;">差价超过阈值且标价不超过上限时自动打开商品页并点击"立即购买"跳转到确认页，你只需手动扫码支付。需保持螃蟹网登录状态。标价上限填0表示不限制。</div>' +
        // 指定账号通知
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">指定账号通知（须满足全部角色条件）</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:8px;">添加角色条件，账号须同时拥有所有指定角色及命座，且差价超过阈值才通知</div>' +
        '<div id="mwCharNotifyList" style="margin-bottom:8px;"></div>' +
        '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;">' +
        '<select id="mwCharNotifyName" style="flex:1;min-width:100px;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;">' +
        (function() {
          var opts = '<option value="">选择角色</option>';
          var tiers = ['S','A','B','C','D','E'];
          for (var ti = 0; ti < tiers.length; ti++) {
            var t = CHAR_TIERS[tiers[ti]];
            for (var ci = 0; ci < t.chars.length; ci++) {
              opts += '<option value="' + t.chars[ci] + '">[' + tiers[ti] + '] ' + t.chars[ci] + '</option>';
            }
          }
          return opts;
        })() +
        '</select>' +
        '<select id="mwCharNotifyConst" style="width:80px;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:center;">' +
        '<option value="0">0命+</option><option value="1">1命+</option><option value="2">2命+</option><option value="3">3命+</option><option value="4">4命+</option><option value="5">5命+</option><option value="6">满命</option>' +
        '</select>' +
        '<button id="mwCharNotifyAddChar" style="padding:6px 12px;border:none;border-radius:4px;background:#0f3460;color:#6a9fff;font-size:12px;cursor:pointer;">添加角色</button>' +
        '</div>' +
        '<div id="mwCharNotifyPending" style="margin-bottom:8px;"></div>' +
        '<div style="display:flex;gap:6px;margin-bottom:16px;align-items:center;">' +
        '<label style="font-size:12px;color:#888;">最低差价(元)</label>' +
        '<input type="number" id="mwCharNotifyDiff" value="0" min="0" style="width:80px;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:center;" />' +
        '<button id="mwCharNotifyAddRule" style="padding:6px 12px;border:none;border-radius:4px;background:#f59e0b;color:#1a1a2e;font-size:12px;font-weight:600;cursor:pointer;">保存规则</button>' +
        '</div>' +
        // 最低限制
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">最低限制</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">估值下限（元）</label>' +
        '<input type="number" id="mwNotifyMinValue" value="' + notifyMinValue + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">标价下限（元）</label>' +
        '<input type="number" id="mwNotifyMinPrice" value="' + notifyMinPrice + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">标价上限（元）</label>' +
        '<input type="number" id="mwNotifyMaxPrice" value="' + notifyMaxPrice + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">估值或标价低于各自下限时不会发送通知，标价高于上限时也不通知（填0表示不限制）</div>' +
        // 提醒方式
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">提醒方式</div>' +
        '<div style="margin-bottom:8px;"><label style="font-size:13px;color:#ccc;cursor:pointer;"><input type="checkbox" id="mwSoundAlert" ' + (pushConfig.soundAlert ? 'checked' : '') + ' style="margin-right:6px;">声音提醒（连续蜂鸣3次）</label></div>' +
        '<div style="margin-bottom:8px;"><label style="font-size:13px;color:#ccc;cursor:pointer;"><input type="checkbox" id="mwVisualAlert" ' + (pushConfig.visualAlert ? 'checked' : '') + ' style="margin-right:6px;">视觉提醒（标题闪烁+大横幅）</label></div>' +
        '<div style="margin-bottom:16px;"><label style="font-size:13px;color:#ccc;cursor:pointer;"><input type="checkbox" id="mwRepeatAlert" ' + (pushConfig.repeatAlert ? 'checked' : '') + ' style="margin-right:6px;">重复提醒（每30秒直到确认）</label></div>' +
        // 手机推送
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">手机推送</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:12px;">配置后可发送推送到手机，即使浏览器关闭也能收到</div>' +
        // Server酱
        '<div style="margin-bottom:12px;padding:10px;background:#16213e;border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;color:#10b981;margin-bottom:4px;">Server酱（微信推送）</div>' +
          '<div style="font-size:10px;color:#666;margin-bottom:6px;">访问 sct.ftqq.com 登录后获取 SendKey，多个Key用逗号或换行分隔</div>' +
          '<textarea id="mwServerChanKey" placeholder="SendKey1,SendKey2 或每行一个" style="width:100%;height:60px;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;resize:vertical;">' + (pushConfig.serverChanKey || '') + '</textarea>' +
        '</div>' +
        // PushPlus
        '<div style="margin-bottom:16px;padding:10px;background:#16213e;border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;color:#10b981;margin-bottom:4px;">PushPlus（微信推送）</div>' +
          '<div style="font-size:10px;color:#666;margin-bottom:6px;">主通知立即推送，从通知延后推送（确保你优先获取信息）</div>' +
          '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">' +
          '<label style="font-size:10px;color:#888;">从通知延迟（秒）</label>' +
          '<input type="number" id="mwSecondaryDelay" value="' + (pushConfig.secondaryDelay != null ? pushConfig.secondaryDelay : 20) + '" min="0" max="300" style="width:60px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" />' +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">' +
          '<label style="font-size:10px;color:#888;cursor:pointer;">从通知过滤高差价（差价＞</label>' +
          '<input type="number" id="mwHighDiffThreshold" value="' + (pushConfig.highDiffThreshold != null ? pushConfig.highDiffThreshold : 400) + '" min="0" max="99999" style="width:55px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" />' +
          '<label style="font-size:10px;color:#888;">元不推送）</label>' +
          '<input type="checkbox" id="mwSkipHighDiffSecondary" ' + (pushConfig.skipHighDiffSecondary ? 'checked' : '') + ' style="cursor:pointer;" />' +
          '</div>' +
          '<div id="mwHighDiffPlatformFilter" style="margin-bottom:8px;' + (pushConfig.skipHighDiffSecondary ? '' : 'display:none;') + ' padding-left:20px; font-size:10px; color:#888;">' +
          '<span style="margin-right:6px;">仅过滤以下平台：</span>' +
          '<label style="margin-right:8px;cursor:pointer;"><input type="checkbox" class="mwHighDiffPlatform" value="pxb7" ' + ((pushConfig.highDiffFilterPlatforms || []).includes('pxb7') ? 'checked' : '') + ' style="cursor:pointer;" />螃蟹网</label>' +
          '<label style="margin-right:8px;cursor:pointer;"><input type="checkbox" class="mwHighDiffPlatform" value="pz" ' + ((pushConfig.highDiffFilterPlatforms || []).includes('pz') ? 'checked' : '') + ' style="cursor:pointer;" />盼之</label>' +
          '<label style="margin-right:8px;cursor:pointer;"><input type="checkbox" class="mwHighDiffPlatform" value="kjs" ' + ((pushConfig.highDiffFilterPlatforms || []).includes('kjs') ? 'checked' : '') + ' style="cursor:pointer;" />氪金兽</label>' +
          '<label style="margin-right:8px;cursor:pointer;"><input type="checkbox" class="mwHighDiffPlatform" value="qy" ' + ((pushConfig.highDiffFilterPlatforms || []).includes('qy') ? 'checked' : '') + ' style="cursor:pointer;" />7881</label>' +
          '<label style="margin-right:8px;cursor:pointer;"><input type="checkbox" class="mwHighDiffPlatform" value="ysy" ' + ((pushConfig.highDiffFilterPlatforms || []).includes('ysy') ? 'checked' : '') + ' style="cursor:pointer;" />易手游</label>' +
          '<span style="color:#555;font-size:9px;">（不勾选则过滤全部平台）</span>' +
          '</div>' +
          '<div id="mwPushPlusList" style="margin-bottom:8px;"></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;">' +
          '<div style="flex:1;min-width:60px;"><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">备注</label>' +
          '<input type="text" id="mwPpName" placeholder="如：张三" style="width:100%;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" /></div>' +
          '<div style="flex:2;min-width:100px;"><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">Token</label>' +
          '<input type="text" id="mwPpToken" placeholder="PushPlus Token" style="width:100%;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" /></div>' +
          '<div style="flex:1;min-width:50px;max-width:70px;"><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">有效天数</label>' +
          '<input type="number" id="mwPpDays" value="30" min="1" max="3650" style="width:100%;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" /></div>' +
          '<div style="min-width:70px;"><label style="font-size:10px;color:#888;display:block;margin-bottom:2px;">通知级别</label>' +
          '<select id="mwPpPriority" style="width:100%;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;"><option value="primary">主通知</option><option value="secondary" selected>从通知</option></select></div>' +
          '<button id="mwPpAddBtn" style="padding:5px 10px;border:none;border-radius:4px;background:#10b981;color:#fff;font-size:12px;cursor:pointer;white-space:nowrap;">添加</button>' +
          '</div>' +
        '</div>' +
        // 测试按钮
        '<div style="margin-bottom:12px;text-align:center;">' +
          '<button id="mwTestPush" style="padding:8px 24px;border:1px solid #0f3460;border-radius:6px;background:#16213e;color:#10b981;font-size:13px;cursor:pointer;">发送测试通知</button>' +
        '</div>' +
        // 云端同步
        '<div style="margin-bottom:16px;padding:10px;background:#16213e;border-radius:8px;border:1px solid #1e3a5f;">' +
          '<div style="font-size:12px;font-weight:600;color:#6a9fff;margin-bottom:4px;">推送配置云端同步</div>' +
          '<div style="font-size:10px;color:#666;margin-bottom:6px;">同步PushPlus订阅者和Server酱Key到服务器，换电脑不丢失</div>' +
          '<div style="display:flex;gap:6px;align-items:center;">' +
          '<input type="password" id="mwSyncPassword" placeholder="管理后台密码" value="' + (pushConfig.syncPassword || '') + '" style="flex:1;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" />' +
          '<button id="mwSyncUpload" style="padding:5px 10px;border:none;border-radius:4px;background:#3b82f6;color:#fff;font-size:12px;cursor:pointer;white-space:nowrap;">上传</button>' +
          '<button id="mwSyncDownload" style="padding:5px 10px;border:none;border-radius:4px;background:#6366f1;color:#fff;font-size:12px;cursor:pointer;white-space:nowrap;">恢复</button>' +
          '</div>' +
        '</div>' +
        // 操作按钮（固定底部）
        '<div style="display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0;background:#1a1a2e;padding:12px 24px 16px;margin:8px -24px 0;border-top:1px solid #0f3460;z-index:5;border-radius:0 0 12px 12px;">' +
        '<button id="mwNotifyCancel" style="padding:8px 20px;border:none;border-radius:6px;background:#333;color:#888;font-size:13px;cursor:pointer;">取消</button>' +
        '<button id="mwNotifySave" style="padding:8px 20px;border:none;border-radius:6px;background:#e94560;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">保存</button></div>';
      overlay.appendChild(box);

      // 渲染指定账号通知列表
      var charNotifyListEl = box.querySelector('#mwCharNotifyList');
      var charNotifyPendingEl = box.querySelector('#mwCharNotifyPending');
      var pendingChars = []; // 当前正在编辑的角色条件

      function renderPendingChars() {
        charNotifyPendingEl.innerHTML = '';
        if (pendingChars.length === 0) {
          charNotifyPendingEl.innerHTML = '<div style="font-size:11px;color:#555;padding:2px 0;">未添加角色</div>';
          return;
        }
        var html = '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px 0;">';
        for (var i = 0; i < pendingChars.length; i++) {
          var pc = pendingChars[i];
          html += '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:#0f3460;color:#6a9fff;">' +
            pc.name + (pc.minConst > 0 ? ' ' + pc.minConst + '命+' : '') +
            ' <span class="del-pending" data-idx="' + i + '" style="color:#e94560;cursor:pointer;margin-left:4px;">✕</span></span>';
        }
        html += '</div>';
        charNotifyPendingEl.innerHTML = html;
        var dels = charNotifyPendingEl.querySelectorAll('.del-pending');
        for (var di = 0; di < dels.length; di++) {
          dels[di].onclick = function () {
            pendingChars.splice(parseInt(this.dataset.idx), 1);
            renderPendingChars();
          };
        }
      }

      function renderCharNotifyList() {
        charNotifyListEl.innerHTML = '';
        if (charNotifyRules.length === 0) {
          charNotifyListEl.innerHTML = '<div style="font-size:11px;color:#555;padding:4px 0;">暂无规则</div>';
          return;
        }
        for (var i = 0; i < charNotifyRules.length; i++) {
          (function (idx) {
            var r = charNotifyRules[idx];
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;font-size:12px;background:#16213e;border-radius:6px;margin-bottom:4px;flex-wrap:wrap;';
            var charStr = r.chars.map(function (c) { return c.name + (c.minConst > 0 ? c.minConst + '命+' : ''); }).join(' + ');
            var diffStr = r.minDiff !== 0 ? ('差价>' + r.minDiff + '元') : '不限差价';
            row.innerHTML = '<span style="color:#e94560;font-weight:600;">规则' + (idx + 1) + ':</span>' +
              '<span style="color:#6a9fff;">' + charStr + '</span>' +
              '<span style="color:#888;">' + diffStr + '</span>' +
              '<button class="del-rule" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
            row.querySelector('.del-rule').onclick = function () { charNotifyRules.splice(idx, 1); renderCharNotifyList(); };
            charNotifyListEl.appendChild(row);
          })(i);
        }
      }
      renderPendingChars();
      renderCharNotifyList();

      box.querySelector('#mwCharNotifyAddChar').onclick = function () {
        var name = box.querySelector('#mwCharNotifyName').value;
        var minConst = parseInt(box.querySelector('#mwCharNotifyConst').value) || 0;
        if (!name) { alert('请选择角色'); return; }
        if (pendingChars.some(function (c) { return c.name === name; })) { alert('已添加过该角色'); return; }
        pendingChars.push({ name: name, minConst: minConst });
        renderPendingChars();
        box.querySelector('#mwCharNotifyName').value = '';
        box.querySelector('#mwCharNotifyConst').value = '0';
      };

      box.querySelector('#mwCharNotifyAddRule').onclick = function () {
        if (pendingChars.length === 0) { alert('请至少添加一个角色'); return; }
        var minDiff = parseFloat(box.querySelector('#mwCharNotifyDiff').value) || 0;
        charNotifyRules.push({ chars: pendingChars.slice(), minDiff: minDiff });
        pendingChars = [];
        renderPendingChars();
        renderCharNotifyList();
        box.querySelector('#mwCharNotifyDiff').value = '0';
      };

      // ===== 估价阶梯差价阈值管理 =====
      var diffTiersListEl = box.querySelector('#mwDiffTiersList');

      function renderDiffTiersList() {
        diffTiersListEl.innerHTML = '';
        if (notifyDiffTiers.length === 0) {
          diffTiersListEl.innerHTML = '<div style="font-size:11px;color:#555;padding:4px 0;">暂无阶梯，所有估值使用上方默认差价阈值</div>';
          return;
        }
        for (var i = 0; i < notifyDiffTiers.length; i++) {
          (function (idx) {
            var t = notifyDiffTiers[idx];
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;margin-bottom:4px;background:#16213e;border-radius:6px;flex-wrap:wrap;';
            row.innerHTML =
              '<span style="font-size:11px;color:#888;white-space:nowrap;">估值</span>' +
              '<input type="number" class="dt-min" value="' + t.minValue + '" min="0" max="999999" style="width:70px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:11px;" />' +
              '<span style="font-size:11px;color:#888;">~</span>' +
              '<input type="number" class="dt-max" value="' + t.maxValue + '" min="0" max="999999" style="width:70px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:11px;" />' +
              '<span style="font-size:11px;color:#888;white-space:nowrap;">差价≥</span>' +
              '<input type="number" class="dt-diff" value="' + t.minDiff + '" min="0" max="999999" style="width:60px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:11px;" />' +
              '<button class="dt-del" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
            row.querySelector('.dt-min').oninput = function () { t.minValue = parseFloat(this.value) || 0; };
            row.querySelector('.dt-max').oninput = function () { t.maxValue = parseFloat(this.value) || 0; };
            row.querySelector('.dt-diff').oninput = function () { t.minDiff = parseFloat(this.value) || 0; };
            row.querySelector('.dt-del').onclick = function () { notifyDiffTiers.splice(idx, 1); renderDiffTiersList(); };
            diffTiersListEl.appendChild(row);
          })(i);
        }
      }
      renderDiffTiersList();

      box.querySelector('#mwDiffTierAdd').onclick = function () {
        notifyDiffTiers.push({ minValue: 0, maxValue: 0, minDiff: 0 });
        renderDiffTiersList();
      };

      // ===== PushPlus 订阅者管理 =====
      var ppListEl = box.querySelector('#mwPushPlusList');
      var ppEditingIdx = -1; // 正在编辑的订阅者索引，-1=新增模式

      function renderPpList() {
        ppListEl.innerHTML = '';
        if (pushConfig.pushPlusSubscribers.length === 0) {
          ppListEl.innerHTML = '<div style="font-size:11px;color:#555;padding:4px 0;">暂无订阅者，在下方添加</div>';
          return;
        }
        pushConfig.pushPlusSubscribers.forEach(function (sub, idx) {
          var remaining = sub.validDays - Math.floor((Date.now() - sub.createdAt) / 86400000);
          var remainColor = remaining <= 3 ? '#ef4444' : (remaining <= 7 ? '#f59e0b' : '#10b981');
          var maskedToken = sub.token.substring(0, 8) + '...' + sub.token.substring(sub.token.length - 4);
          var isPrimary = (sub.priority || 'secondary') === 'primary';
          var priorityLabel = isPrimary
            ? '<span style="color:#f59e0b;font-weight:600;font-size:10px;">主</span>'
            : '<span style="color:#6b7280;font-size:10px;">从</span>';
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 6px;margin-bottom:4px;background:#0d1a3a;border-radius:4px;font-size:11px;';
          row.innerHTML =
            priorityLabel +
            '<span style="color:#e0e0e0;min-width:45px;">' + (sub.name || '未命名') + '</span>' +
            '<span style="color:#888;flex:1;word-break:break-all;">' + maskedToken + '</span>' +
            '<span style="color:' + remainColor + ';white-space:nowrap;">剩余' + remaining + '天</span>' +
            '<button data-pp-idx="' + idx + '" data-pp-act="edit" style="padding:2px 6px;border:1px solid #0f3460;border-radius:3px;background:#16213e;color:#6a9fff;font-size:10px;cursor:pointer;">编辑</button>' +
            '<button data-pp-idx="' + idx + '" data-pp-act="del" style="padding:2px 6px;border:1px solid #0f3460;border-radius:3px;background:#16213e;color:#ef4444;font-size:10px;cursor:pointer;">删除</button>';
          ppListEl.appendChild(row);
        });
      }

      // 绑定编辑/删除按钮事件（事件委托）
      ppListEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-pp-act]');
        if (!btn) return;
        var idx = parseInt(btn.getAttribute('data-pp-idx'));
        var act = btn.getAttribute('data-pp-act');
        if (act === 'edit') {
          var sub = pushConfig.pushPlusSubscribers[idx];
          if (!sub) return;
          box.querySelector('#mwPpName').value = sub.name || '';
          box.querySelector('#mwPpToken').value = sub.token || '';
          var remaining = sub.validDays - Math.floor((Date.now() - sub.createdAt) / 86400000);
          box.querySelector('#mwPpDays').value = Math.max(1, remaining);
          box.querySelector('#mwPpPriority').value = sub.priority || 'secondary';
          ppEditingIdx = idx;
          box.querySelector('#mwPpAddBtn').textContent = '更新';
        } else if (act === 'del') {
          pushConfig.pushPlusSubscribers.splice(idx, 1);
          ppEditingIdx = -1;
          box.querySelector('#mwPpAddBtn').textContent = '添加';
          box.querySelector('#mwPpName').value = '';
          box.querySelector('#mwPpToken').value = '';
          box.querySelector('#mwPpDays').value = '30';
          box.querySelector('#mwPpPriority').value = 'secondary';
          renderPpList();
        }
      });

      // 添加/更新按钮
      box.querySelector('#mwPpAddBtn').onclick = function () {
        var name = box.querySelector('#mwPpName').value.trim();
        var token = box.querySelector('#mwPpToken').value.trim();
        var days = parseInt(box.querySelector('#mwPpDays').value) || 30;
        var priority = box.querySelector('#mwPpPriority').value;
        if (!token) { alert('请填写Token'); return; }
        if (ppEditingIdx >= 0) {
          // 更新模式：保留原 createdAt，用新天数重新计算
          pushConfig.pushPlusSubscribers[ppEditingIdx] = {
            name: name, token: token, validDays: days, priority: priority,
            createdAt: Date.now() // 编辑时重新开始倒计时
          };
          ppEditingIdx = -1;
          box.querySelector('#mwPpAddBtn').textContent = '添加';
        } else {
          // 检查Token是否重复
          var exists = pushConfig.pushPlusSubscribers.some(function (s) { return s.token === token; });
          if (exists) { alert('该Token已存在'); return; }
          pushConfig.pushPlusSubscribers.push({
            name: name, token: token, validDays: days, priority: priority, createdAt: Date.now()
          });
        }
        box.querySelector('#mwPpName').value = '';
        box.querySelector('#mwPpToken').value = '';
        box.querySelector('#mwPpDays').value = '30';
        box.querySelector('#mwPpPriority').value = 'secondary';
        renderPpList();
      };

      renderPpList();

      // 从通知过滤高差价开关 → 显示/隐藏平台选择
      box.querySelector('#mwSkipHighDiffSecondary').onchange = function () {
        var pf = box.querySelector('#mwHighDiffPlatformFilter');
        if (pf) pf.style.display = this.checked ? '' : 'none';
      };

      // 测试推送
      box.querySelector('#mwTestPush').onclick = function () {
        notify('test', '测试通知 - 鸣潮监控助手', '如果您收到了这条通知，说明推送配置正确！\n标价100元 估值200元\n差价+100元 性价比+100%');
      };

      // 云端同步
      box.querySelector('#mwSyncUpload').onclick = function () {
        var pw = box.querySelector('#mwSyncPassword').value.trim();
        if (!pw) { alert('请输入管理后台密码'); return; }
        pushConfig.syncPassword = pw;
        syncPushConfigToServer(pw, false);
      };
      box.querySelector('#mwSyncDownload').onclick = function () {
        var pw = box.querySelector('#mwSyncPassword').value.trim();
        if (!pw) { alert('请输入管理后台密码'); return; }
        pushConfig.syncPassword = pw;
        loadPushConfigFromServer(pw, function (ok) {
          if (ok) {
            alert('推送配置已从服务器恢复，正在刷新面板...');
            renderPpList();
            box.querySelector('#mwServerChanKey').value = pushConfig.serverChanKey || '';
            box.querySelector('#mwSecondaryDelay').value = pushConfig.secondaryDelay != null ? pushConfig.secondaryDelay : 20;
            box.querySelector('#mwSkipHighDiffSecondary').checked = !!pushConfig.skipHighDiffSecondary;
            box.querySelector('#mwHighDiffThreshold').value = pushConfig.highDiffThreshold != null ? pushConfig.highDiffThreshold : 400;
            var pf = box.querySelector('#mwHighDiffPlatformFilter');
            if (pf) pf.style.display = pushConfig.skipHighDiffSecondary ? '' : 'none';
            var savedPlatforms = pushConfig.highDiffFilterPlatforms || [];
            box.querySelectorAll('.mwHighDiffPlatform').forEach(function (cb) { cb.checked = savedPlatforms.indexOf(cb.value) >= 0; });
          } else {
            alert('服务器暂无推送配置或恢复失败');
          }
        });
      };

      box.querySelector('#mwNotifyCancel').onclick = function () { overlay.remove(); };
      box.querySelector('#mwNotifySave').onclick = function () {
        notifyDiffThreshold = parseFloat(box.querySelector('#mwNotifyDiff').value) || 0;
        autoBuyEnabled = box.querySelector('#mwAutoBuyEnabled').checked;
        autoBuyDiff = parseFloat(box.querySelector('#mwAutoBuyDiff').value) || 0;
        autoBuyMaxPrice = parseFloat(box.querySelector('#mwAutoBuyMaxPrice').value) || 0;
        notifyMinValue = parseFloat(box.querySelector('#mwNotifyMinValue').value) || 0;
        notifyMinPrice = parseFloat(box.querySelector('#mwNotifyMinPrice').value) || 0;
        notifyMaxPrice = parseFloat(box.querySelector('#mwNotifyMaxPrice').value) || 0;
        var newInterval = parseInt(box.querySelector('#mwRefreshInterval').value) || 60;
        if (newInterval < 5) newInterval = 5;
        if (newInterval > 3600) newInterval = 3600;
        var intervalChanged = newInterval !== refreshIntervalSec;
        refreshIntervalSec = newInterval;
        flashSaleEnabled = box.querySelector('#mwFlashSaleEnabled').checked;
        pzdsEnabled = box.querySelector('#mwPzdsEnabled').checked;
        kjsEnabled = box.querySelector('#mwKjsEnabled').checked;
        qyEnabled = box.querySelector('#mwQyEnabled').checked;
        ysyEnabled = box.querySelector('#mwYsyEnabled').checked;
        // charNotifyRules 已在添加/删除时实时修改，无需额外读取
        pushConfig.soundAlert = box.querySelector('#mwSoundAlert').checked;
        pushConfig.visualAlert = box.querySelector('#mwVisualAlert').checked;
        pushConfig.repeatAlert = box.querySelector('#mwRepeatAlert').checked;
        pushConfig.serverChanKey = box.querySelector('#mwServerChanKey').value.trim();
        pushConfig.secondaryDelay = parseInt(box.querySelector('#mwSecondaryDelay').value) || 0;
        pushConfig.skipHighDiffSecondary = box.querySelector('#mwSkipHighDiffSecondary').checked;
        pushConfig.highDiffThreshold = parseFloat(box.querySelector('#mwHighDiffThreshold').value) || 0;
        pushConfig.highDiffFilterPlatforms = Array.from(box.querySelectorAll('.mwHighDiffPlatform:checked')).map(function (cb) { return cb.value; });
        pushConfig.syncPassword = box.querySelector('#mwSyncPassword').value.trim();
        // pushPlusSubscribers 已在添加/编辑/删除时实时修改，无需额外读取
        saveState();
        // 如果设置了同步密码，自动上传到服务器
        if (pushConfig.syncPassword) {
          syncPushConfigToServer(pushConfig.syncPassword, true);
        }
        // 如果刷新间隔变了且正在监控，重启定时器
        if (intervalChanged && monitorRunning) {
          if (monitorTimeout) { clearTimeout(monitorTimeout); monitorTimeout = null; }
          monitorTimeout = setTimeout(monitorTick, refreshIntervalSec * 1000);
          nextRefreshTime = Date.now() + refreshIntervalSec * 1000;
        }
        overlay.remove();
      };
      overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
      document.body.appendChild(overlay);
    });

    dom.btnRefresh.addEventListener('click', function () {
      doRefresh();
    });


    dom.btnSettings.addEventListener('click', function () {
      // 隐藏详情面板
      unpinRow();
      hideHoverDetail(true);
      // 自动折叠监控窗口
      const dash = document.getElementById('mw-dashboard');
      if (dash && !dash.classList.contains('mw-collapsed')) {
        dash.classList.add('mw-collapsed');
        const btn = document.getElementById('mwBtnCollapse');
        if (btn) btn.textContent = '+';
      }
      openSettings();
    });

    dom.btnClearTable.addEventListener('click', function () {
      if (confirm('确定清空表格记录？')) {
        tableData = [];
        seenIds = [];  // 同时清空已见ID，否则清空后旧商品无法重新加入
        notifiedIds = [];
        saveTableData();
        saveStorage(STORAGE_KEYS.seen, seenIds);
        saveStorage(STORAGE_KEYS.notified, notifiedIds);
        refreshTableDisplay();
        updateStatusText();
      }
    });

    dom.btnCleanData.addEventListener('click', openCleanDataDialog);

    // 检查已售
    dom.btnCheckSold.addEventListener('click', checkSoldAccounts);

    dom.inputThreshold.addEventListener('change', function () {
      threshold = parseInt(dom.inputThreshold.value) || 20;
      saveState();
      updateStatusText();
      refreshTableDisplay();
    });

    dom.filterClear.addEventListener('click', function () {
      charFilter = [];
      currentPage = 1;
      updateFilterBar();
      refreshTableDisplay();
    });

    var filterAddBtn = document.getElementById('mwFilterAddChar');
    if (filterAddBtn) {
      filterAddBtn.addEventListener('click', function () {
        openCharPicker(filterAddBtn);
      });
    }

    // 数值筛选输入框事件（输入时实时筛选）
    function bindNumFilter(inputId, filterObj, key) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.addEventListener('input', function () {
        const v = this.value.trim();
        filterObj[key] = (v === '' || isNaN(parseFloat(v))) ? null : parseFloat(v);
        currentPage = 1;
        refreshTableDisplay();
      });
    }
    // 搜索框事件
    const searchInput = document.getElementById('mwSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchKeyword = this.value.trim().toLowerCase();
        currentPage = 1;
        refreshTableDisplay();
      });
    }
    bindNumFilter('mwFilterPriceMin', priceFilter, 'min');
    bindNumFilter('mwFilterPriceMax', priceFilter, 'max');
    bindNumFilter('mwFilterValueMin', valueFilter, 'min');
    bindNumFilter('mwFilterValueMax', valueFilter, 'max');
    bindNumFilter('mwFilterDiffMin', diffFilter, 'min');
    bindNumFilter('mwFilterDiffMax', diffFilter, 'max');
    bindNumFilter('mwFilterRatioMin', ratioFilter, 'min');
    bindNumFilter('mwFilterRatioMax', ratioFilter, 'max');

    // 清除数值筛选
    const numFilterClear = document.getElementById('mwNumFilterClear');
    if (numFilterClear) {
      numFilterClear.addEventListener('click', function () {
        // 直接修改原对象属性，而非重新赋值新对象（避免 bindNumFilter 闭包引用失效）
        priceFilter.min = null;
        priceFilter.max = null;
        valueFilter.min = null;
        valueFilter.max = null;
        diffFilter.min = null;
        diffFilter.max = null;
        ratioFilter.min = null;
        ratioFilter.max = null;
        searchKeyword = '';
        currentPage = 1;
        ['mwFilterPriceMin', 'mwFilterPriceMax', 'mwFilterValueMin', 'mwFilterValueMax',
         'mwFilterDiffMin', 'mwFilterDiffMax', 'mwFilterRatioMin', 'mwFilterRatioMax'].forEach(function (id) {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        const sEl = document.getElementById('mwSearchInput');
        if (sEl) sEl.value = '';
        refreshTableDisplay();
      });
    }

    // 只显示已售复选框事件
    const showOnlySoldEl = document.getElementById('mwShowOnlySold');
    if (showOnlySoldEl) {
      showOnlySoldEl.addEventListener('change', function () {
        showOnlySold = this.checked;
        currentPage = 1;
        refreshTableDisplay();
      });
    }

    // 只显示秒杀复选框事件
    const showOnlyFlashSaleEl = document.getElementById('mwShowOnlyFlashSale');
    if (showOnlyFlashSaleEl) {
      showOnlyFlashSaleEl.addEventListener('change', function () {
        showOnlyFlashSale = this.checked;
        currentPage = 1;
        refreshTableDisplay();
      });
    }
  }

  // 角色级别排序优先级（S最前，A、B次之，C/D/E最后）
  const TIER_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5 };

  /**
   * 构建五星角色标签 HTML（改进2）
   * - 按级别排序：S>A>B>C>D>E，同级别按估值降序
   * - 标签显示：缩写+命座数，有专武则追加绿色"武"字
   * - S级红色、A级金色，其他默认色
   * - 最多显示前6个，超出显示"+N"
   * - title 显示完整信息（角色名+命座+专武+级别+估值）
   * @param {object} row - 表格行数据
   * @returns {string} 标签 HTML
   */
  function buildCharTagsHTML(row) {
    ensureRowData(row);
    if (!row.parsed || !row.parsed.characters || row.parsed.characters.length === 0) return '-';

    const breakdown = (row.valuation && row.valuation.charBreakdown) || [];
    const weaponNames = (row.parsed.weapons || []).map(function (w) { return w.name; });
    const weaponText = row.showTitle || '';

    // 构建每个角色的显示信息
    const items = row.parsed.characters.map(function (c) {
      // 级别（缺省时从查找表补全）
      let tier = c.tier;
      if (!tier) {
        const info = CHAR_LOOKUP[c.name];
        tier = info ? info.tier : 'E';
      }
      // 专武与估值：优先用 charBreakdown，否则用 checkHasSigWeapon
      let hasSig = false;
      let value = 0;
      let sigRefine = 0;
      const cb = breakdown.find(function (b) { return b.name === c.name; });
      if (cb) {
        hasSig = cb.hasSig;
        value = cb.value;
        sigRefine = cb.sigRefine || 0;
      } else {
        hasSig = checkHasSigWeapon(c.name, weaponNames, weaponText);
        // 改进3：fallback 时从武器列表获取精炼数
        if (hasSig) {
          const sigOverride = weights ? weights.sigWeaponsOverride : null;
          const sigName = (sigOverride && sigOverride[c.name]) || SIG_WEAPONS[c.name];
          if (sigName) {
            const sigW = (row.parsed.weapons || []).find(function (w) {
              return w.name === sigName || w.name.includes(sigName) || sigName.includes(w.name);
            });
            if (sigW) sigRefine = sigW.refine || 1;
          }
        }
      }
      let isHot = c.isHot != null ? c.isHot : (CHAR_LOOKUP[c.name] && CHAR_LOOKUP[c.name].isHot);
      return { name: c.name, const: c.const, tier: tier, hasSig: hasSig, sigRefine: sigRefine, value: value, isHot: !!isHot };
    });

    // 排序逻辑：先按级别 S->A->B->C->D->E，同级别按命座降序
    items.sort(function (a, b) {
      const ta = TIER_ORDER[a.tier] != null ? TIER_ORDER[a.tier] : 99;
      const tb = TIER_ORDER[b.tier] != null ? TIER_ORDER[b.tier] : 99;
      if (ta !== tb) return ta - tb;
      return b.const - a.const;
    });

    const maxShow = 5;
    const shown = items.slice(0, maxShow);
    const rest = items.length - shown.length;

    let tagsHtml = shown.map(function (c) {
      const abbr = CHAR_ABBR[c.name] || c.name.substring(0, 1);
      const active = charFilter.some(function (cf) { return cf.name === c.name; }) ? 'mw-char-tag-active' : '';
      // 颜色：S红 A金 其他默认
      let colorStyle = '';
      if (c.tier === 'S') colorStyle = 'color:#e94560;border-color:#e94560;';
      else if (c.tier === 'A') colorStyle = 'color:#f59e0b;border-color:#f59e0b;';
      // 改进3：专武标记改为 +精炼数 格式（如 +1 表示精1专武）
      const sigMark = c.hasSig ? '<span style="color:#10b981;font-weight:bold;">+' + (c.sigRefine || 1) + '</span>' : '';
      // title 完整信息
      const tierLabel = c.tier + '级';
      const constLabel = c.const + G().constUnitDisplay;
      const sigLabel = c.hasSig ? '有专武(精' + (c.sigRefine || 1) + ')' : '无专武';
      const valLabel = c.value > 0 ? '估值' + c.value + '元' : '';
      const titleText = c.name + ' ' + constLabel + ' ' + sigLabel + ' ' + tierLabel + (valLabel ? ' ' + valLabel : '') + '（单击筛选/取消，右键切换命座条件）';
      return '<span class="mw-char-tag ' + active + '" data-char="' + c.name + '" style="' + colorStyle +
        '" title="' + titleText.replace(/"/g, '&quot;') + '">' + abbr + c.const + sigMark + '</span>';
    }).join('');

    if (rest > 0) {
      tagsHtml += '<span class="mw-char-tag" style="color:#8888aa;cursor:default;" title="还有' + rest + '个角色">+' + rest + '</span>';
    }
    return tagsHtml;
  }

  /**
   * 更新角色筛选栏显示
   */
  function updateFilterBar() {
    if (!dom.filterBar || !dom.filterCharTags) return;
    dom.filterBar.style.display = 'flex';
    const constUnit = G().constUnitDisplay;
    dom.filterCharTags.innerHTML = charFilter.map(function (cond) {
      const label = cond.name + (cond.minConst > 0 ? cond.minConst + constUnit + '+' : '');
      return '<span class="mw-char-filter-tag" data-char="' + cond.name + '" style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border:1px solid #e94560;border-radius:999px;background:rgba(233,69,96,0.15);color:#e94560;font-size:11px;cursor:pointer;" title="' + cond.name + '：点击移除，右键调整命座条件（当前' + (cond.minConst > 0 ? '≥' + cond.minConst + constUnit : '不限命座') + '）">' + label + ' ×</span>';
    }).join('');
    var filterTags = dom.filterCharTags.querySelectorAll('.mw-char-filter-tag');
    filterTags.forEach(function (t) {
      t.addEventListener('click', function () {
        var name = t.getAttribute('data-char');
        var idx = charFilter.findIndex(function (c) { return c.name === name; });
        if (idx >= 0) charFilter.splice(idx, 1);
        currentPage = 1;
        updateFilterBar();
        refreshTableDisplay();
      });
      t.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var name = t.getAttribute('data-char');
        var cond = charFilter.find(function (c) { return c.name === name; });
        if (cond) {
          cond.minConst = (cond.minConst || 0) >= 6 ? 0 : (cond.minConst || 0) + 1;
          currentPage = 1;
          updateFilterBar();
          refreshTableDisplay();
        }
      });
    });
  }

  /**
   * 角色选择器弹层：搜索并添加任意角色到筛选（含表格中未显示的低级别角色）
   */
  function openCharPicker(anchorEl) {
    var existing = document.getElementById('mwCharPicker');
    if (existing) { existing.remove(); return; }

    var picker = document.createElement('div');
    picker.id = 'mwCharPicker';
    picker.style.cssText = 'position:fixed;z-index:1000001;background:#16213e;border:1px solid #e94560;border-radius:8px;padding:10px;width:300px;box-shadow:0 4px 24px rgba(0,0,0,.6);';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '搜索角色名（如：达妮娅）...';
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:6px 10px;border:1px solid #0f3460;border-radius:4px;background:#0f3460;color:#e0e0e0;font-size:13px;margin-bottom:8px;outline:none;';

    var list = document.createElement('div');
    list.style.cssText = 'max-height:280px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:4px;align-content:flex-start;';

    var hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#666;margin-top:8px;';
    hint.textContent = '点击添加/移除筛选；标签右键调整命座条件';

    picker.appendChild(input);
    picker.appendChild(list);
    picker.appendChild(hint);
    document.body.appendChild(picker);

    // 定位到按钮下方
    try {
      var rect = anchorEl.getBoundingClientRect();
      picker.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 316)) + 'px';
      picker.style.top = Math.min(rect.bottom + 6, window.innerHeight - 360) + 'px';
    } catch (e) {
      picker.style.left = '40px';
      picker.style.top = '120px';
    }

    function renderList(kw) {
      var items = [];
      var tiers = CHAR_TIERS || {};
      Object.keys(tiers).forEach(function (tier) {
        var info = tiers[tier] || {};
        (info.chars || []).forEach(function (name) {
          if (kw && name.toLowerCase().indexOf(kw) < 0) return;
          items.push({ name: name, tier: tier, price: info.price });
        });
      });
      items.sort(function (a, b) {
        var ta = TIER_ORDER[a.tier] != null ? TIER_ORDER[a.tier] : 99;
        var tb = TIER_ORDER[b.tier] != null ? TIER_ORDER[b.tier] : 99;
        if (ta !== tb) return ta - tb;
        return a.name.localeCompare(b.name, 'zh');
      });
      if (items.length === 0) {
        list.innerHTML = '<span style="color:#666;font-size:12px;padding:4px;">无匹配角色</span>';
        return;
      }
      list.innerHTML = items.map(function (it) {
        var active = charFilter.some(function (c) { return c.name === it.name; });
        var color = it.tier === 'S' ? '#e94560' : (it.tier === 'A' ? '#f59e0b' : '#8a8fb5');
        var bg = active ? 'background:rgba(233,69,96,.25);border-color:#e94560;' : 'border-color:#0f3460;';
        return '<span class="mw-picker-char" data-name="' + it.name + '" title="' + it.tier + '级，默认估值' + it.price + '元" style="display:inline-block;padding:3px 8px;border:1px solid;border-radius:4px;font-size:12px;cursor:pointer;color:' + color + ';' + bg + '">' + it.name + '</span>';
      }).join('');
      list.querySelectorAll('.mw-picker-char').forEach(function (el) {
        el.addEventListener('click', function () {
          var name = el.getAttribute('data-name');
          var idx = charFilter.findIndex(function (c) { return c.name === name; });
          if (idx >= 0) {
            charFilter.splice(idx, 1);
          } else {
            charFilter.push({ name: name, minConst: 0 });
          }
          currentPage = 1;
          updateFilterBar();
          refreshTableDisplay();
          renderList(input.value.trim().toLowerCase());
        });
      });
    }

    renderList('');
    input.addEventListener('input', function () {
      renderList(this.value.trim().toLowerCase());
    });
    input.focus();

    // 点击外部关闭
    setTimeout(function () {
      var closeHandler = function (e) {
        if (picker.contains(e.target) || (anchorEl && anchorEl.contains(e.target))) return;
        picker.remove();
        document.removeEventListener('mousedown', closeHandler);
      };
      document.addEventListener('mousedown', closeHandler);
    }, 0);
  }

  /**
   * 表格事件委托：在 tbody 上统一监听，避免每次重渲染对数千个标签逐个绑定
   * （角色标签点击/右键、状态标签查已售、删除按钮、行悬停/点击钉住）
   */
  let tableEventsBound = false;
  function bindTableDelegatedEvents() {
    if (tableEventsBound || !dom.tableBody) return;
    tableEventsBound = true;
    const tbody = dom.tableBody;

    tbody.addEventListener('click', function (e) {
      const charTag = e.target.closest('.mw-char-tag');
      if (charTag) {
        e.stopPropagation();
        const charName = charTag.getAttribute('data-char');
        if (!charName) return;
        const idx = charFilter.findIndex(c => c.name === charName);
        if (idx >= 0) charFilter.splice(idx, 1);
        else charFilter.push({ name: charName, minConst: 0 });
        currentPage = 1;
        updateFilterBar();
        refreshTableDisplay();
        return;
      }
      const soldBadge = e.target.closest('[data-check-sold]');
      if (soldBadge) {
        e.stopPropagation();
        checkSingleSold(soldBadge.getAttribute('data-check-sold'), soldBadge);
        return;
      }
      const delBtn = e.target.closest('.mw-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        deleteRowByProductId(delBtn.getAttribute('data-delete-id'));
        return;
      }
      // 行点击：钉住详情（点空白/非交互元素）
      const tr = e.target.closest('tr[data-product-id]');
      if (tr) {
        e.stopPropagation();
        togglePinRow(tr.getAttribute('data-product-id'), tr);
      }
    });

    tbody.addEventListener('contextmenu', function (e) {
      const charTag = e.target.closest('.mw-char-tag');
      if (!charTag) return;
      e.preventDefault();
      e.stopPropagation();
      const charName = charTag.getAttribute('data-char');
      if (!charName) return;
      const cond = charFilter.find(c => c.name === charName);
      if (cond) {
        cond.minConst = (cond.minConst || 0) >= 6 ? 0 : (cond.minConst || 0) + 1;
      } else {
        charFilter.push({ name: charName, minConst: 1 });
      }
      currentPage = 1;
      updateFilterBar();
      refreshTableDisplay();
    });

    // 悬停详情面板（mouseover 冒泡捕获进出行的时机）
    tbody.addEventListener('mouseover', function (e) {
      const tr = e.target.closest('tr[data-product-id]');
      if (tr) {
        if (hoverHideTimer) { clearTimeout(hoverHideTimer); hoverHideTimer = null; }
        showHoverDetail(tr.getAttribute('data-product-id'), tr);
      }
    });
    tbody.addEventListener('mouseout', function (e) {
      const tr = e.target.closest('tr[data-product-id]');
      if (tr && !tr.contains(e.relatedTarget)) {
        hoverHideTimer = setTimeout(function () { hideHoverDetail(); }, 200);
      }
    });
  }

  /**
   * 删除表格行（事件委托共用）
   */
  function deleteRowByProductId(pid) {
    var idx = tableData.findIndex(function (r) { return r.productId === pid; });
    if (idx < 0) return;
    var delRow = tableData[idx];
    tableData.splice(idx, 1);
    // 同步从 seenIds 移除，允许未来重新发现
    var seenIdx = seenIds.indexOf(pid);
    if (seenIdx >= 0) seenIds.splice(seenIdx, 1);
    // 同步从 notifiedIds 移除
    ['_drop', '_flash'].forEach(function (suf) {
      var nIdx = notifiedIds.indexOf(pid + suf);
      if (nIdx >= 0) notifiedIds.splice(nIdx, 1);
    });
    saveTableData();
    saveStorage(STORAGE_KEYS.seen, seenIds);
    saveStorage(STORAGE_KEYS.notified, notifiedIds);
    sortTableData();
    refreshTableDisplay();
    updateStatusText();
    console.log('[鸣潮监控] 手动删除: ' + (delRow.productUniqueNo || pid));
  }

  /**
   * 渲染表格底部分页栏
   */
  function renderPaginationBar(totalCount, totalPages) {
    var bar = document.getElementById('mwPaginationBar');
    if (!bar) return;
    totalPages = totalPages || Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (totalCount <= PAGE_SIZE) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    var btnStyle = function (disabled, active) {
      return 'padding:2px 9px;border:1px solid ' + (active ? '#e94560' : '#0f3460') + ';border-radius:4px;background:' +
        (active ? 'rgba(233,69,96,.2)' : '#16213e') + ';color:' + (disabled ? '#555' : (active ? '#e94560' : '#8a8fb5')) +
        ';font-size:11px;cursor:' + (disabled ? 'default' : 'pointer') + ';margin:0 2px;';
    };
    // 页码窗口：当前页前后各2页 + 首尾页，最多9个按钮
    var pages = [];
    var winStart = Math.max(1, currentPage - 2);
    var winEnd = Math.min(totalPages, winStart + 4);
    winStart = Math.max(1, Math.min(winStart, winEnd - 4));
    for (var p = winStart; p <= winEnd; p++) pages.push(p);
    if (pages[0] > 1) {
      pages.unshift(totalPages > 6 ? '...' : 2);
      pages.unshift(1);
    }
    if (pages[pages.length - 1] < totalPages) {
      pages.push(totalPages - 1 > pages[pages.length - 1] + 1 ? '...' : totalPages - 1);
      pages.push(totalPages);
    }
    var html = '<span style="color:#666;font-size:11px;margin-right:6px;">共' + totalCount + '条</span>';
    html += '<span data-page="' + (currentPage - 1) + '" style="' + btnStyle(currentPage <= 1) + '">‹</span>';
    pages.forEach(function (p) {
      if (p === '...') {
        html += '<span style="color:#555;font-size:11px;margin:0 2px;">…</span>';
      } else {
        html += '<span data-page="' + p + '" style="' + btnStyle(false, p === currentPage) + '">' + p + '</span>';
      }
    });
    html += '<span data-page="' + (currentPage + 1) + '" style="' + btnStyle(currentPage >= totalPages) + '">›</span>';
    html += '<span style="color:#666;font-size:11px;margin-left:4px;">' + currentPage + '/' + totalPages + '页</span>';
    bar.innerHTML = html;

    bar.querySelectorAll('[data-page]').forEach(function (el) {
      el.addEventListener('click', function () {
        var p = parseInt(el.getAttribute('data-page'), 10);
        if (isNaN(p) || p < 1 || p > totalPages || p === currentPage) return;
        currentPage = p;
        refreshTableDisplay();
        // 翻页后滚到表格顶部
        try {
          var table = document.getElementById('mwTable');
          if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) { /* ignore */ }
      });
    });
  }

  /**
   * 刷新表格显示
   */
  function refreshTableDisplay() {
    if (!dom.tableBody) return;

    // 确保 tableData 中每行都有 parsed 数据（slimRow 存储后可能被移除）
    for (const row of tableData) {
      ensureRowData(row);
    }

    // 筛选
    let displayData = tableData;
    // 搜索筛选（商品编号、角色名）
    if (searchKeyword) {
      displayData = displayData.filter(row => {
        const uniqueNo = (row.productUniqueNo || '').toLowerCase();
        const productId = String(row.productId || '');
        // 搜索商品编号、数字ID、角色名
        if (uniqueNo.includes(searchKeyword) || productId.includes(searchKeyword)) return true;
        if (row.parsed && row.parsed.characters) {
          return row.parsed.characters.some(c => c.name.toLowerCase().includes(searchKeyword));
        }
        return false;
      });
    }
    // 角色筛选（多角色+命座条件，全部满足才显示）
    if (charFilter && charFilter.length > 0) {
      displayData = displayData.filter(row => {
        if (!row.parsed || !row.parsed.characters) return false;
        return charFilter.every(cond => {
          const char = row.parsed.characters.find(c => c.name === cond.name);
          return char && char.const >= (cond.minConst || 0);
        });
      });
    }
    // 隐藏已售
    // 只显示已售
    if (showOnlySold) {
      displayData = displayData.filter(row => row.status === '已售');
    }
    // 只显示秒杀
    if (showOnlyFlashSale) {
      displayData = displayData.filter(row => row.status === '秒杀');
    }
    // 数值筛选
    displayData = displayData.filter(row => {
      const price = row.price || 0;
      const value = row.value || 0;
      const diff = value - price;
      const ratio = row.ratio || 0;
      if (priceFilter.min != null && price < priceFilter.min) return false;
      if (priceFilter.max != null && price > priceFilter.max) return false;
      if (valueFilter.min != null && value < valueFilter.min) return false;
      if (valueFilter.max != null && value > valueFilter.max) return false;
      if (diffFilter.min != null && diff < diffFilter.min) return false;
      if (diffFilter.max != null && diff > diffFilter.max) return false;
      if (ratioFilter.min != null && ratio < ratioFilter.min) return false;
      if (ratioFilter.max != null && ratio > ratioFilter.max) return false;
      return true;
    });

    if (displayData.length === 0) {
      dom.tableBody.innerHTML = '<tr><td colspan="11" class="mw-empty">' +
        (charFilter && charFilter.length > 0 ? '当前筛选无数据' : '暂无数据，等待监控...') + '</td></tr>';
      renderPaginationBar(0);
      return;
    }

    // 分页截取（监控扫描高频刷新时只渲染当前页，避免2000+行全量渲染卡顿）
    const totalPages = Math.ceil(displayData.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages; // 数据减少时收敛页码
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageData = displayData.slice(pageStart, pageStart + PAGE_SIZE);

    // 构建表格行（仅当前页）
    let html = '';
    for (const row of pageData) {
      const diff = row.value - row.price;
      const ratio = row.ratio || 0;
      const isPositive = diff > 0;
      const isGold = ratio > threshold;

      // 颜色规则：差价>200绿色, 0~200黄色, -200~0灰色, <-200红色
      function getColorClass(diff) {
        if (diff < -200) return 'mw-color-red';
        if (diff < 0) return 'mw-color-gray';
        if (diff < 200) return 'mw-color-yellow';
        return 'mw-color-green';
      }

      // 行样式
      let rowClass = '';
      if (ratio > threshold) rowClass = 'mw-row-gold';
      else if (isPositive) rowClass = 'mw-row-positive';

      // 差价和性价比使用基于差价的统一颜色规则
      const diffColorClass = getColorClass(diff);
      const ratioColorClass = getColorClass(diff);

      // 上架时间（回退到 firstSeen，均无效则显示"未知"）
      const rawTime = row.listTime || row.firstSeen;
      let listStr;
      if (rawTime && !isNaN(new Date(rawTime).getTime())) {
        const listDate = new Date(rawTime);
        listStr = listDate.getMonth() + 1 + '/' + listDate.getDate() + ' ' +
          String(listDate.getHours()).padStart(2, '0') + ':' + String(listDate.getMinutes()).padStart(2, '0');
      } else {
        listStr = '未知';
      }

      // 角色标签（改进2：按级别排序显示）
      const charsHtml = buildCharTagsHTML(row);

      // 状态标签（可点击检查已售）
      let statusBadge = '<span class="mw-status-badge mw-badge-init" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击检查是否已售">初估</span>';
      if (row.status === '详估') {
        statusBadge = '<span class="mw-status-badge mw-badge-detail" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击检查是否已售">详估</span>';
      } else if (row.status === '已售') {
        var soldTip = row.soldPrice ? '成交价¥' + row.soldPrice.toFixed(0) + (row.soldTime ? '（' + row.soldTime + '）' : '') + '，点击重新检查' : '点击重新检查';
        statusBadge = '<span class="mw-status-badge mw-badge-sold" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="' + soldTip + '">已售</span>';
      } else if (row.status === '降价') {
        statusBadge = '<span class="mw-status-badge mw-badge-drop" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击检查是否已售">降价</span>';
      } else if (row.status === '秒杀') {
        statusBadge = '<span class="mw-status-badge mw-badge-flash" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击检查是否已售">秒杀</span>';
      }

      // 悬浮提示
      const tooltip = (row.showTitle || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').substring(0, 500);

      // 平台标识
      const platformBadge = row.platform === 'pzds'
        ? '<span style="display:inline-block;font-size:10px;font-weight:600;color:#38bdf8;background:rgba(56,189,248,0.15);padding:1px 4px;border-radius:3px;margin-right:4px;vertical-align:middle;" title="盼之平台">盼</span>'
        : row.platform === 'kjs'
        ? '<span style="display:inline-block;font-size:10px;font-weight:600;color:#a855f7;background:rgba(168,85,247,0.15);padding:1px 4px;border-radius:3px;margin-right:4px;vertical-align:middle;" title="氪金兽">兽</span>'
        : row.platform === 'qy'
        ? '<span style="display:inline-block;font-size:10px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,0.15);padding:1px 4px;border-radius:3px;margin-right:4px;vertical-align:middle;" title="7881">78</span>'
        : row.platform === 'ysy'
        ? '<span style="display:inline-block;font-size:10px;font-weight:600;color:#14b8a6;background:rgba(20,184,166,0.15);padding:1px 4px;border-radius:3px;margin-right:4px;vertical-align:middle;" title="易手游">易</span>'
        : '<span style="display:inline-block;font-size:10px;font-weight:600;color:#f59e0b;background:rgba(245,158,11,0.15);padding:1px 4px;border-radius:3px;margin-right:4px;vertical-align:middle;" title="螃蟹网">蟹</span>';

      html += '<tr class="' + rowClass + '" data-product-id="' + row.productId + '" title="' + tooltip + '">' +
        '<td>' + platformBadge + listStr + '</td>' +
        '<td>' + row.value.toFixed(0) + '</td>' +
        '<td class="' + diffColorClass + '">' + (diff >= 0 ? '+' : '') + diff.toFixed(0) + '</td>' +
        '<td class="' + ratioColorClass + '">' + ratio.toFixed(1) + '%</td>' +
        '<td>' + (row.status === '已售' && row.soldPrice
          ? '<span style="color:#666;text-decoration:line-through;font-size:11px;">¥' + row.price.toFixed(0) + '</span> <span style="color:#e94560;font-weight:600;">成交¥' + row.soldPrice.toFixed(0) + '</span>'
          : row.priceHistory && row.priceHistory.length > 0
          ? '<span style="color:#666;text-decoration:line-through;font-size:11px;">¥' + row.priceHistory[0].price.toFixed(0) + '</span> <span style="color:' + (row.status === '秒杀' ? '#e94560' : '#f59e0b') + ';font-weight:600;">¥' + row.price.toFixed(0) + '</span>'
          : row.status === '秒杀'
            ? '<span style="color:#e94560;font-weight:600;">秒杀 ¥' + row.price.toFixed(0) + '</span>'
            : row.price.toFixed(0)) + '</td>' +
        '<td>' + (row.effectiveYellow || 0) + '/' + ((row.valuation && row.valuation.yellowInfo ? row.valuation.yellowInfo.limitedYellow : 0) || 0) + '/' + (row.parsed ? row.parsed.yellowCount : 0) + '</td>' +
        '<td>' + (row.parsed ? row.parsed.pulls : 0) + '</td>' +
        '<td>' + (row.parsed ? row.parsed.motoCount : 0) + '</td>' +
        '<td class="mw-chars-cell">' + charsHtml + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td><span class="mw-delete-btn" data-delete-id="' + row.productId + '" style="cursor:pointer;color:#666;font-size:16px;" title="删除此行">&times;</span></td>' +
        '</tr>';
    }

    dom.tableBody.innerHTML = html;
    bindTableDelegatedEvents();
    renderPaginationBar(displayData.length, totalPages);

    // 表格重渲染后，恢复钉住行的高亮（pinnedRow 元素已被替换）
    if (pinnedProductId) {
      const pinnedTr = dom.tableBody.querySelector('tr[data-product-id="' + pinnedProductId + '"]');
      if (pinnedTr) {
        pinnedRow = pinnedTr;
        pinnedTr.style.background = 'rgba(233,69,96,0.18)';
        pinnedTr.style.borderLeft = '3px solid #e94560';
      } else {
        // 钉住的行已不在当前视图中（被筛选/清除），取消钉住
        unpinRow();
        hideHoverDetail(true);
      }
    }
  }

  // ============================================================
  // 悬停详情面板（改进3，参考性价比脚本实现）
  // ============================================================

  /**
   * 全量重算表格中所有行的估值（设置变更后调用）
   */
  function recalcAllRows() {
    let updated = 0;
    let skipped = 0;
    for (const row of tableData) {
      // 清除旧缓存，强制下次 getRowValuation 重新计算
      row._cachedValuation = null;
      if (!row.showTitle) {
        // showTitle 被精简删除的行，清除旧估值明细，保留 row.value 避免显示 0
        row.valuation = null;
        skipped++;
        continue;
      }
      try {
        const parsed = parseAccountInfo(row.showTitle);
        const valuation = calculateValue(parsed, row.price);
        row.valuation = valuation;
        row.value = valuation.totalValue;
        row.ratio = valuation.ratio;
        row.effectiveYellow = valuation.effectiveYellow || 0;
        // 同步 parsed 摘要
        row.parsed = {
          yellowCount: parsed.yellowCount,
          pulls: Math.round(parsed.pulls * 10) / 10,
          motoCount: parsed.motoCount,
          characters: parsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
          weapons: parsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
        };
        updated++;
      } catch (e) {
        skipped++;
      }
    }
    // 重新排序并保存
    sortTableData();
    saveTableData();
    console.log('[鸣潮监控] 估值设置已更新，重算 ' + updated + ' 条记录，跳过 ' + skipped + ' 条');
  }

  /**
   * 确保行数据已解析（parsed / valuation）
   * slimRow 存储后 parsed 和 valuation 被移除，显示时按需从 showTitle 重新解析
   */
  function ensureRowData(row) {
    if (row.parsed && row.valuation) return;
    if (!row.showTitle) return;
    try {
      const parsed = parseAccountInfo(row.showTitle);
      if (!row.parsed) {
        row.parsed = {
          yellowCount: parsed.yellowCount,
          pulls: Math.round(parsed.pulls * 10) / 10,
          motoCount: parsed.motoCount,
          characters: parsed.characters.map(c => ({ name: c.name, const: c.const, tier: c.tier, isHot: c.isHot, price: c.price })),
          weapons: parsed.weapons.map(w => ({ name: w.name, refine: w.refine })),
        };
      }
      if (!row.valuation) {
        row.valuation = calculateValue(parsed, row.price);
        row.value = row.valuation.totalValue;
        row.ratio = row.valuation.ratio;
        row.effectiveYellow = row.valuation.effectiveYellow || 0;
      }
    } catch (e) {
      // 解析失败，保持原样
    }
  }

  /**
   * 获取行估值信息（若旧数据缺少明细字段则从 showTitle 重新计算并缓存）
   * @param {object} row - 表格行数据
   * @returns {object} 估值结果
   */
  function getRowValuation(row) {
    ensureRowData(row);
    if (row.valuation && row.valuation.charBreakdown) return row.valuation;
    // 旧数据或 slimRow 精简后：重新解析计算
    if (!row._cachedValuation && row.showTitle) {
      try {
        const parsed = parseAccountInfo(row.showTitle);
        row._cachedValuation = calculateValue(parsed, row.price);
        // 同步 row.value 和 row.ratio，避免旧值（可能来自完整 showTitle）与重算值不一致
        row.value = row._cachedValuation.totalValue;
        row.ratio = row._cachedValuation.ratio;
        row.effectiveYellow = row._cachedValuation.effectiveYellow || 0;
      } catch (e) {
        row._cachedValuation = row.valuation || {};
      }
    }
    return row._cachedValuation || row.valuation || {};
  }

  /**
   * 性价比颜色
   */
  function getRatioColor(ratio) {
    if (ratio > threshold) return '#f59e0b'; // 高于阈值：金色
    if (ratio > 0) return '#10b981';         // 正收益：绿色
    return '#ef4444';                         // 负收益：红色
  }

  /**
   * 性价比标签
   */
  function getRatioLabel(ratio) {
    if (ratio > threshold) return '高性价';
    if (ratio > 0) return '可入';
    return '普通';
  }

  /**
   * 构建悬停详情面板 HTML
   * @param {object} row - 表格行数据
   * @returns {string} 面板 HTML
   */
  function buildHoverDetailHTML(row) {
    const v = getRowValuation(row);
    const ratio = row.ratio || 0;
    const color = getRatioColor(ratio);
    const price = row.price || 0;
    const estValue = v.totalValue || row.value || 0;
    const diff = estValue - price;
    const productLink = getProductUrl(row);

    // 转义辅助
    const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

    // 角色明细表（先按级别排序，再按命座降序）
    let charRowsHTML = '';
    let charTotal = 0;
    const breakdown = (v.charBreakdown || []).slice().sort(function (a, b) {
      const ta = TIER_ORDER[a.tier] != null ? TIER_ORDER[a.tier] : 99;
      const tb = TIER_ORDER[b.tier] != null ? TIER_ORDER[b.tier] : 99;
      if (ta !== tb) return ta - tb;
      return b.const - a.const;
    });
    if (breakdown.length > 0) {
      charRowsHTML = breakdown.map(function (cb) {
        charTotal += cb.value;
        const constText = cb.const > 0
          ? '<span style="color:#f59e0b">' + (cb.const === 6 ? '满' + G().constUnitDisplay : cb.const + G().constUnitDisplay) + '</span>'
          : '<span style="color:#555">0命</span>';
        const tierTag = cb.isHot
          ? '<span style="color:#e94560;font-size:10px;font-weight:600">[' + cb.tier + ']</span>'
          : '<span style="color:#666;font-size:10px">[' + cb.tier + ']</span>';
        const sigTag = cb.hasSig
          ? ' <span style="color:#10b981;font-weight:600">[专武精' + (cb.sigRefine || 1) + ']</span>'
          : (cb.isHot ? ' <span style="color:#ef4444;font-weight:600">[无专武]</span>' : '');
        // 改进5：显示命座溢价（如有）
        const premTag = cb.premium > 0
          ? ' <span style="color:#8ecdf5;font-size:10px">[溢' + cb.premium + ']</span>'
          : '';
        return '<tr>' +
          '<td style="padding:3px 8px 3px 0;color:' + (cb.isHot ? '#ddd' : '#888') + ';font-weight:' + (cb.isHot ? '600' : '400') + ';">' + esc(cb.name) + ' ' + tierTag + '</td>' +
          '<td style="padding:3px 8px;text-align:center;font-size:11px;">' + constText + sigTag + premTag + '</td>' +
          '<td style="padding:3px 0;text-align:right;color:' + (cb.isHot ? color : '#888') + ';font-weight:' + (cb.isHot ? '600' : '400') + ';">' + cb.value + '元</td>' +
          '</tr>';
      }).join('');
    }

    // 资源明细
    const w = weights || DEFAULT_WEIGHTS;
    const outfits = v.outfits || [];
    const motoAccessories = v.motoAccessories || [];
    const motoFrames = v.motoFrames || [];
    const paints = v.paints || [];
    const pullInfo = v.pullInfo || { pulls: 0, perPull: 0, baseTotal: 0, c6Bonus: 0, c6Multiplier: 0, total: 0, tierLabel: '' };
    const yellowInfo = v.yellowInfo || { yellowCount: 0, coefficient: 1, tierLabel: '' };
    const teamBonus = v.teamBonus || { value: 0, notes: [] };
    const flatDiscount = v.flatDiscount || { value: 1, notes: [] };
    const matchedTeams = v.matchedTeams || [];

    const outfitVal = outfits.length * (w.outfit || 0);
    const motoFrameVal = motoFrames.length * (w.motoFrame || 0);

    const resItems = [
      { label: '抽数(' + pullFormulaText() + ')', val: pullInfo.pulls, unit: '抽', weight: pullInfo.perPull, total: pullInfo.baseTotal || pullInfo.total, tierLabel: pullInfo.tierLabel },
    ];
    // 满命抽数加成明细
    if (pullInfo.c6Bonus > 0) {
      var pullC6Label = '抽数满命加成(加权满命 +' + Math.round((pullInfo.c6Multiplier || 0) * 100) + '%)';
      resItems.push({ label: pullC6Label, val: '-', unit: '', weight: '-', total: pullInfo.c6Bonus });
    }
    resItems.push(
      { label: WEIGHT_LABELS.outfit ? WEIGHT_LABELS.outfit.label : '服饰/皮肤', val: outfits.length, unit: '个', weight: w.outfit, total: outfitVal },
      { label: WEIGHT_LABELS.motoFrame ? WEIGHT_LABELS.motoFrame.label : '车架模组', val: motoFrames.length, unit: '个', weight: w.motoFrame, total: motoFrameVal },
    );
    if (teamBonus.value > 0) {
      const noteStr = teamBonus.notes.join('，');
      resItems.push({ label: '配队溢价(' + noteStr + ')', val: matchedTeams.length, unit: '队', weight: '-', total: teamBonus.value });
    }
    let resRowsHTML = '';
    let resTotal = 0;
    for (const r of resItems) {
      if (r.val <= 0) continue;
      resTotal += r.total;
      const weightStr = r.weight === '-' ? '-' : (r.weight < 1 ? r.weight : r.weight.toString());
      const tierTag = r.tierLabel ? '<span style="color:#8ecdf5;font-size:10px;margin-left:4px">[' + r.tierLabel + ']</span>' : '';
      resRowsHTML += '<tr style="border-bottom:1px solid rgba(255,255,255,0.03);">' +
        '<td style="padding:4px 8px 4px 0;color:#aaa;font-size:12px;">' + r.label + tierTag + '</td>' +
        '<td style="padding:4px 4px;text-align:right;color:#ccc;font-size:12px;white-space:nowrap;">' + r.val + r.unit + '</td>' +
        '<td style="padding:4px 4px;text-align:right;color:#888;font-size:11px;white-space:nowrap;">×' + weightStr + '</td>' +
        '<td style="padding:4px 0 4px 8px;text-align:right;color:#ddd;font-size:12px;font-weight:600;white-space:nowrap;">' + Math.round(r.total) + '元</td>' +
        '</tr>';
    }

    // 账号概览标签
    const fiveStarChars = v.fiveStarChars != null ? v.fiveStarChars : (row.parsed && row.parsed.characters ? row.parsed.characters.length : 0);
    const maxConstChars = v.maxConstChars != null ? v.maxConstChars : 0;
    const fourStarChars = v.fourStarChars || 0;
    const level = v.level || 1;
    const hasSigWeapons = v.hasSignatureWeapons || [];
    const weaponDetails = v.weaponDetails || [];

    const overviewTags =
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#0f3460;color:#8ecdf5;">Lv.' + level + '</span>' +
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#0f3460;color:#8ecdf5;">' + pullInfo.pulls + '抽</span>' +
      '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#0f3460;color:#8ecdf5;">' + fiveStarChars + '五星</span>' +
      (maxConstChars > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#3b1d1d;color:#e94560;">' + maxConstChars + '满命</span>' : '') +
      (fourStarChars > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#0f3460;color:#8ecdf5;">' + fourStarChars + '四星</span>' : '') +
      (weaponDetails.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#0f3460;color:#8ecdf5;">' + weaponDetails.length + '五星武器</span>' : '') +
      (hasSigWeapons.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#1a3b1d;color:#10b981;">' + hasSigWeapons.length + '专武</span>' : '') +
      (outfits.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#3b2d1a;color:#f59e0b;">' + outfits.length + '服饰</span>' : '') +
      (motoAccessories.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#2d1a3b;color:#a78bfa;">' + motoAccessories.length + (G().motoAccessoryKeywords.length > 0 ? G().motoAccessoryKeywords[0] : '') + '</span>' : '') +
      (motoFrames.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#2d1a3b;color:#a78bfa;">' + motoFrames.length + G().labels.motoColumn + '</span>' : '') +
      (paints.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#2d1a3b;color:#a78bfa;">' + paints.length + '涂装</span>' : '') +
      (matchedTeams.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#3b2d1a;color:#f59e0b;">' + matchedTeams.length + '配队</span>' : '');

    // 满命溢价
    const c6Bonus = v.c6Bonus || { value: 0, notes: [] };
    const c6HTML = (c6Bonus.value > 0) ?
      '<div style="margin-bottom:10px;padding:8px 10px;background:rgba(233,69,96,0.1);border-radius:6px;border-left:3px solid #e94560;">' +
      '<div style="font-size:12px;color:#e94560;font-weight:600;">' + c6Bonus.notes.join('，') + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:2px;">满命角色难度递增，额外加成 ' + c6Bonus.value + '元</div></div>' : '';

    // 生效系数：低命折扣与有效金系数取较低值，只显示生效的那个
    const flatActive = (flatDiscount.value < 1 && flatDiscount.notes.length > 0 && flatDiscount.value < yellowInfo.coefficient);
    const yellowHTML = (!flatActive && yellowInfo.yellowCount > 0) ?
      '<div style="margin-bottom:10px;padding:8px 10px;background:rgba(245,158,11,0.1);border-radius:6px;border-left:3px solid #f59e0b;">' +
      '<div style="font-size:12px;color:#f59e0b;font-weight:600;">有效金系数：' + (yellowInfo.effectiveYellow != null ? yellowInfo.effectiveYellow : yellowInfo.yellowCount) + '有效金 [' + yellowInfo.tierLabel + '] × ' + yellowInfo.coefficient + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:2px;">有效金/限定金/总金: ' + (yellowInfo.effectiveYellow != null ? yellowInfo.effectiveYellow : '-') + '/' + (yellowInfo.limitedYellow != null ? yellowInfo.limitedYellow : yellowInfo.yellowCount) + '/' + (yellowInfo.totalYellow != null ? yellowInfo.totalYellow : (yellowInfo.rawYellowCount || 0)) + '</div>' +
      (function() {
        var bd = v.effectiveYellowBreakdown || [];
        if (bd.length === 0) return '';
        var items = bd.map(function(b) {
          var constText = b.const > 0 ? (b.const === 6 ? '满' + G().constUnitDisplay : b.const + G().constUnitDisplay) : '0命';
          var sigText = b.sigName ? ' +精' + b.sigRefine + ' ' + esc(b.sigName) : '';
          var totalContrib = b.contrib + (b.sigContrib || 0);
          var contribStr = totalContrib % 1 === 0 ? totalContrib : Math.round(totalContrib * 10) / 10;
          var coeffText = (b.coeff != null && b.coeff !== 1) ? '×' + b.coeff + ' ' : '';
          return '<span style="display:inline-block;font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.12);padding:2px 6px;border-radius:3px;margin:2px 3px 2px 0;">' + esc(b.name) + ' ' + constText + sigText + ' (' + coeffText + '+' + contribStr + ')</span>';
        });
        return '<div style="margin-top:4px;">' + items.join('') + '</div>';
      })() +
      '</div>' : '';

    const flatDiscountHTML = (flatActive) ?
      '<div style="margin-bottom:10px;padding:8px 10px;background:rgba(167,139,250,0.1);border-radius:6px;border-left:3px solid #a78bfa;">' +
      '<div style="font-size:12px;color:#a78bfa;font-weight:600;">低命折扣系数：× ' + flatDiscount.value + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:2px;">' + flatDiscount.notes.join('，') + '，最终估值乘以此系数</div></div>' : '';

    return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Noto Sans CJK SC\',sans-serif;">' +
      // 标题栏
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #0f3460;">' +
        '<div><span style="font-size:16px;font-weight:700;color:' + color + ';">' + (ratio >= 0 ? '+' : '') + ratio.toFixed(2) + '%</span>' +
        '<span style="margin-left:8px;font-size:12px;padding:2px 8px;border-radius:4px;background:' + color + ';color:#fff;font-weight:600;">' + getRatioLabel(ratio) + '</span></div>' +
        '<div>' + (row.platform === 'pzds'
          ? '<span style="font-size:10px;font-weight:600;color:#38bdf8;background:rgba(56,189,248,0.15);padding:1px 5px;border-radius:3px;margin-right:6px;">盼之</span>'
          : row.platform === 'kjs'
          ? '<span style="font-size:10px;font-weight:600;color:#a855f7;background:rgba(168,85,247,0.15);padding:1px 5px;border-radius:3px;margin-right:6px;">氪金兽</span>'
          : row.platform === 'qy'
          ? '<span style="font-size:10px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,0.15);padding:1px 5px;border-radius:3px;margin-right:6px;">7881</span>'
          : row.platform === 'ysy'
          ? '<span style="font-size:10px;font-weight:600;color:#14b8a6;background:rgba(20,184,166,0.15);padding:1px 5px;border-radius:3px;margin-right:6px;">易手游</span>'
          : '<span style="font-size:10px;font-weight:600;color:#f59e0b;background:rgba(245,158,11,0.15);padding:1px 5px;border-radius:3px;margin-right:6px;">螃蟹</span>')
        + '<a href="' + productLink + '" target="_blank" style="font-size:11px;color:#6a9fff;text-decoration:none;cursor:pointer;" title="点击查看账号详情">' + (row.productUniqueNo || String(row.productId).slice(-6)) + ' 🔗</a>' +
        '<span id="mw-hover-close" style="font-size:18px;color:#666;cursor:pointer;line-height:1;padding:2px 6px;margin-left:8px;border-radius:4px;">✕</span></div>' +
      '</div>' +
      // 价格对比
      '<div style="display:flex;gap:8px;margin-bottom:14px;">' +
        '<div style="flex:1;background:#16213e;border-radius:8px;padding:8px 6px;text-align:center;"><div style="font-size:11px;color:#666;margin-bottom:2px;">标价</div><div style="font-size:16px;font-weight:700;color:#e94560;">¥' + price.toFixed(0) + '</div></div>' +
        '<div style="display:flex;align-items:center;font-size:16px;color:#444;">→</div>' +
        '<div style="flex:1;background:#16213e;border-radius:8px;padding:8px 6px;text-align:center;"><div style="font-size:11px;color:#666;margin-bottom:2px;">估值</div><div style="font-size:16px;font-weight:700;color:' + color + ';">¥' + estValue.toFixed(0) + '</div></div>' +
        '<div style="display:flex;align-items:center;font-size:16px;color:#444;">=</div>' +
        '<div style="flex:1;background:#16213e;border-radius:8px;padding:8px 6px;text-align:center;"><div style="font-size:11px;color:#666;margin-bottom:2px;">差价</div><div style="font-size:16px;font-weight:700;color:' + (diff >= 0 ? '#10b981' : '#ef4444') + ';">' + (diff >= 0 ? '+' : '') + '¥' + diff.toFixed(0) + '</div></div>' +
      '</div>' +
      // 降价历史
      (row.priceHistory && row.priceHistory.length > 0
        ? '<div style="background:#1a1a2e;border:1px solid #3a2a1a;border-radius:8px;padding:10px;margin-bottom:14px;">' +
          '<div style="font-size:12px;font-weight:600;color:#f59e0b;margin-bottom:6px;">降价记录 (累计降¥' + (row.priceDrop || 0).toFixed(0) + ')</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
          row.priceHistory.map(function(h, i) {
            var next = i < row.priceHistory.length ? row.priceHistory[i + 1] : null;
            var dropAmt = h.price - (next ? next.price : row.price);
            return '<span style="font-size:11px;color:#888;">¥' + h.price.toFixed(0) + '</span>' +
              (i < row.priceHistory.length ? '<span style="font-size:11px;color:#f59e0b;">→</span>' : '');
          }).join('') +
          '<span style="font-size:11px;color:#f59e0b;font-weight:600;">¥' + row.price.toFixed(0) + '</span>' +
          '</div></div>'
        : '') +
      // 账号概览
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">' + overviewTags + '</div>' +
      // 角色明细
      (breakdown.length > 0 ?
        '<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:600;color:#e94560;margin-bottom:6px;">⭐ 五星角色明细 <span style="color:#666;font-weight:400">(' + breakdown.length + '个，' + hasSigWeapons.length + '专武，合计 ' + Math.round(charTotal) + '元)</span></div>' +
        '<div style="max-height:280px;overflow-y:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="border-bottom:1px solid #1a1a3a;">' +
        '<th style="padding:3px 8px 3px 0;text-align:left;color:#666;font-weight:400;font-size:11px;">角色</th>' +
        '<th style="padding:3px 8px;text-align:center;color:#666;font-weight:400;font-size:11px;">命座</th>' +
        '<th style="padding:3px 0;text-align:right;color:#666;font-weight:400;font-size:11px;">价值</th>' +
        '</tr></thead><tbody>' + charRowsHTML + '</tbody></table></div></div>' : '') +
      c6HTML +
      // 资源明细
      (resRowsHTML ?
        '<div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:600;color:#e94560;margin-bottom:6px;">💎 资源明细 <span style="color:#666;font-weight:400">(合计 ' + Math.round(resTotal) + '元)</span></div>' +
        '<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><thead><tr style="border-bottom:1px solid #1a1a3a;">' +
        '<th style="padding:3px 8px 3px 0;text-align:left;color:#555;font-weight:400;font-size:10px;">项目</th>' +
        '<th style="padding:3px 4px;text-align:right;color:#555;font-weight:400;font-size:10px;">数量</th>' +
        '<th style="padding:3px 4px;text-align:right;color:#555;font-weight:400;font-size:10px;">系数</th>' +
        '<th style="padding:3px 0 3px 8px;text-align:right;color:#555;font-weight:400;font-size:10px;">价值</th>' +
        '</tr></thead><tbody>' + resRowsHTML + '</tbody></table></div>' : '') +
      yellowHTML +
      flatDiscountHTML +
      '</div>';
  }

  /**
   * 显示悬停详情面板
   * @param {string} productId - 商品ID
   * @param {HTMLElement} anchorRow - 触发行元素
   */
  function showHoverDetail(productId, anchorRow) {
    // 钉住状态下，悬停其他行不替换详情
    if (pinnedProductId && pinnedProductId !== productId) return;
    if (pinnedProductId === productId && hoverDetailEl) return;

    const row = tableData.find(function (r) { return r.productId == productId; });
    if (!row) return;

    if (hoverDetailEl) hoverDetailEl.remove();

    hoverDetailEl = document.createElement('div');
    hoverDetailEl.id = 'mw-hover-detail';
    hoverDetailEl.style.cssText =
      'position:fixed;z-index:100001;' +
      'width:360px;max-height:calc(100vh - 40px);overflow-y:auto;' +
      'background:#1a1a2e;color:#e0e0e0;' +
      'border-radius:12px;box-shadow:0 12px 48px rgba(0,0,0,0.6);' +
      'border:1px solid #0f3460;padding:16px;' +
      'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Noto Sans CJK SC\',sans-serif;';
    hoverDetailEl.innerHTML = buildHoverDetailHTML(row);
    document.body.appendChild(hoverDetailEl);

    // 绑定关闭按钮
    const closeBtn = hoverDetailEl.querySelector('#mw-hover-close');
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.stopPropagation();
        unpinRow();
        hideHoverDetail(true);
      };
    }

    // 鼠标移入面板时取消隐藏，移出时延迟隐藏（避免移动鼠标到面板时消失）
    hoverDetailEl.addEventListener('mouseenter', function () {
      if (hoverHideTimer) { clearTimeout(hoverHideTimer); hoverHideTimer = null; }
    });
    hoverDetailEl.addEventListener('mouseleave', function () {
      hoverHideTimer = setTimeout(function () { hideHoverDetail(); }, 200);
    });

    // 智能定位：优先监控窗口左侧，不够则右侧，再不够则覆盖上方
    const dashboard = document.getElementById('mw-dashboard');
    const panelRect = dashboard ? dashboard.getBoundingClientRect()
      : { left: window.innerWidth - 380, right: window.innerWidth, top: 0, bottom: 0 };
    const detailWidth = 360;
    const detailHeight = hoverDetailEl.offsetHeight;
    const gap = 12;

    // 水平定位
    let left = panelRect.left - detailWidth - gap;
    if (left < 10) {
      // 左侧不够，尝试右侧
      left = panelRect.right + gap;
      if (left + detailWidth > window.innerWidth - 10) {
        // 右侧也不够，覆盖监控窗口位置
        left = Math.max(10, Math.min(panelRect.left, window.innerWidth - detailWidth - 10));
      }
    }
    hoverDetailEl.style.left = left + 'px';

    // 垂直定位：与监控窗口顶部对齐，不超出屏幕
    let top = panelRect.top;
    const maxTop = window.innerHeight - detailHeight - 10;
    if (top > maxTop) top = Math.max(10, maxTop);
    if (top < 10) top = 10;
    hoverDetailEl.style.top = top + 'px';

    // 淡入效果
    hoverDetailEl.style.opacity = '0';
    hoverDetailEl.style.transform = 'translateX(8px)';
    hoverDetailEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    requestAnimationFrame(function () {
      if (hoverDetailEl) {
        hoverDetailEl.style.opacity = '1';
        hoverDetailEl.style.transform = 'translateX(0)';
      }
    });
  }

  /**
   * 隐藏悬停详情面板（有钉住行时不隐藏）
   * @param {boolean} force - 强制隐藏
   */
  function hideHoverDetail(force) {
    if (pinnedProductId && !force) return; // 有钉住的行时不隐藏
    if (hoverDetailEl) {
      const el = hoverDetailEl;
      el.style.opacity = '0';
      el.style.transform = 'translateX(8px)';
      setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 200);
      hoverDetailEl = null;
    }
  }

  /**
   * 切换钉住行（点击行时调用）
   */
  function togglePinRow(productId, rowEl) {
    if (pinnedProductId === productId) {
      // 再次点击同一行：取消钉住
      unpinRow();
      hideHoverDetail(true);
      return;
    }
    // 取消之前钉住的高亮
    unpinRow();
    // 强制移除旧面板
    if (hoverDetailEl) { hoverDetailEl.remove(); hoverDetailEl = null; }
    pinnedProductId = productId;
    pinnedRow = rowEl;
    rowEl.style.background = 'rgba(233,69,96,0.18)';
    rowEl.style.borderLeft = '3px solid #e94560';
    showHoverDetail(productId, rowEl);
  }

  /**
   * 取消钉住
   */
  function unpinRow() {
    if (pinnedRow) {
      pinnedRow.style.background = '';
      pinnedRow.style.borderLeft = '';
    }
    pinnedProductId = null;
    pinnedRow = null;
  }

  // ============================================================
  // 清理数据对话框（差价/日期/估值组合条件）
  // ============================================================

  /**
   * 打开清理数据对话框：满足任一启用条件的账号将被清理，留空表示不启用该条件
   */
  function openCleanDataDialog() {
    const existing = document.getElementById('mw-clean-modal');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.id = 'mw-clean-modal';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.7);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Noto Sans CJK SC\',sans-serif;';

    const dialog = document.createElement('div');
    dialog.style.cssText =
      'position:relative;width:420px;max-width:92vw;' +
      'background:#1a1a2e;color:#e0e0e0;border-radius:12px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid #0f3460;padding:20px;';

    const closeBtn = document.createElement('div');
    closeBtn.style.cssText =
      'position:absolute;top:10px;right:14px;width:26px;height:26px;' +
      'line-height:26px;text-align:center;font-size:18px;color:#666;cursor:pointer;' +
      'border-radius:6px;transition:all 0.2s;';
    closeBtn.textContent = '\u00d7';
    closeBtn.title = '关闭';
    closeBtn.onmouseenter = function () { this.style.color = '#e94560'; this.style.background = 'rgba(233,69,96,0.1)'; };
    closeBtn.onmouseleave = function () { this.style.color = '#666'; this.style.background = 'transparent'; };
    closeBtn.onclick = function () { overlay.remove(); };
    dialog.appendChild(closeBtn);

    const title = document.createElement('h2');
    title.style.cssText = 'font-size:17px;color:#e94560;margin-bottom:4px;';
    title.textContent = '清理数据';
    dialog.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'font-size:12px;color:#888;margin-bottom:16px;line-height:1.5;';
    subtitle.textContent = '满足任一启用条件的账号将被清理（条件留空表示不启用）。';
    dialog.appendChild(subtitle);

    const inputStyle =
      'width:130px;padding:5px 8px;border:1px solid #0f3460;border-radius:6px;' +
      'background:#16213e;color:#e0e0e0;font-size:13px;outline:none;';
    const labelStyle = 'font-size:13px;color:#c8c8d8;';

    function addRow(labelText, input, suffixText) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;';
      const label = document.createElement('span');
      label.style.cssText = labelStyle + 'flex-shrink:0;';
      label.textContent = labelText;
      row.appendChild(label);
      row.appendChild(input);
      if (suffixText) {
        const suffix = document.createElement('span');
        suffix.style.cssText = 'font-size:12px;color:#888;';
        suffix.textContent = suffixText;
        row.appendChild(suffix);
      }
      dialog.appendChild(row);
      return row;
    }

    const diffInput = document.createElement('input');
    diffInput.type = 'number';
    diffInput.value = '0';
    diffInput.style.cssText = inputStyle;
    addRow('差价 <', diffInput, '元（差价 = 估值 - 标价）');

    const defaultDate = new Date(Date.now() - 2 * 86400000);
    const defaultDateStr = defaultDate.getFullYear() + '-' + String(defaultDate.getMonth() + 1).padStart(2, '0') + '-' + String(defaultDate.getDate()).padStart(2, '0');
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = defaultDateStr;
    dateInput.style.cssText = inputStyle;
    addRow('上架早于', dateInput, '（不含当天）');

    const valInput = document.createElement('input');
    valInput.type = 'number';
    valInput.value = '500';
    valInput.style.cssText = inputStyle;
    addRow('估值 <', valInput, '元');

    // 根据输入构建过滤条件，未启用任何条件时返回 null
    function buildPredicate() {
      var diffTh = parseFloat(diffInput.value);
      var valTh = parseFloat(valInput.value);
      var cutoff = null;
      var dateStr = dateInput.value;
      if (dateStr) {
        var dm = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (dm) cutoff = new Date(parseInt(dm[1], 10), parseInt(dm[2], 10) - 1, parseInt(dm[3], 10)).getTime();
      }
      if (isNaN(diffTh) && cutoff == null && isNaN(valTh)) return null;
      return function (row) {
        if (!isNaN(diffTh)) {
          var diff = (row.value || 0) - (row.price || 0);
          if (diff < diffTh) return true;
        }
        if (cutoff != null) {
          var time = row.listTime || row.firstSeen || 0;
          if (time < cutoff) return true;
        }
        if (!isNaN(valTh)) {
          if ((row.value || 0) < valTh) return true;
        }
        return false;
      };
    }

    const preview = document.createElement('div');
    preview.style.cssText = 'font-size:12px;color:#f59e0b;margin:4px 0 16px;min-height:16px;';
    dialog.appendChild(preview);

    function updatePreview() {
      var pred = buildPredicate();
      if (pred == null) {
        preview.textContent = '未启用任何条件，请至少填写一项';
        preview.style.color = '#e94560';
        return;
      }
      var cnt = 0;
      for (var i = 0; i < tableData.length; i++) {
        if (pred(tableData[i])) cnt++;
      }
      preview.textContent = '将删除 ' + cnt + ' 条，剩余 ' + (tableData.length - cnt) + ' 条';
      preview.style.color = '#f59e0b';
    }

    diffInput.addEventListener('input', updatePreview);
    dateInput.addEventListener('input', updatePreview);
    valInput.addEventListener('input', updatePreview);
    updatePreview();

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText =
      'padding:7px 18px;border:none;border-radius:6px;background:#16213e;color:#888;' +
      'font-size:13px;cursor:pointer;';
    cancelBtn.onmouseenter = function () { this.style.background = '#0f3460'; };
    cancelBtn.onmouseleave = function () { this.style.background = '#16213e'; };
    cancelBtn.onclick = function () { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    const cleanBtn = document.createElement('button');
    cleanBtn.textContent = '清理';
    cleanBtn.style.cssText =
      'padding:7px 18px;border:none;border-radius:6px;background:#e94560;color:#fff;' +
      'font-size:13px;font-weight:600;cursor:pointer;';
    cleanBtn.onmouseenter = function () { this.style.background = '#c73e54'; };
    cleanBtn.onmouseleave = function () { this.style.background = '#e94560'; };
    cleanBtn.onclick = function () {
      var pred = buildPredicate();
      if (pred == null) { alert('请至少填写一个清理条件'); return; }
      var before = tableData.length;
      tableData = tableData.filter(function (row) { return !pred(row); });
      var removed = before - tableData.length;
      overlay.remove();
      if (removed > 0) {
        saveTableData();
        refreshTableDisplay();
        updateStatusText();
      }
      alert('已清理 ' + removed + ' 条，剩余 ' + tableData.length + ' 条');
    };
    btnRow.appendChild(cleanBtn);

    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
    diffInput.focus();
  }

  // ============================================================
  // 估值设置面板（改进4）
  // ============================================================

  /**
   * 打开估值设置对话框
   * 估值设置面板：角色定价/命座溢价/抽数定价/限定金系数/满命溢价/配队
   */
function openSettings() {
    // 移除已有对话框
    const existing = document.getElementById('mw-settings-modal');
    if (existing) { existing.remove(); return; }

    const w = loadWeights();

    // 创建遮罩与对话框
    const overlay = document.createElement('div');
    overlay.id = 'mw-settings-modal';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.7);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Noto Sans CJK SC\',sans-serif;';

    const dialog = document.createElement('div');
    dialog.style.cssText =
      'position:relative;' +
      'width:560px;max-width:92vw;max-height:88vh;overflow-y:auto;' +
      'background:#1a1a2e;color:#e0e0e0;border-radius:12px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid #0f3460;padding:24px 24px 0;';

    // 关闭按钮（右上角）
    const closeBtn = document.createElement('div');
    closeBtn.style.cssText =
      'position:absolute;top:12px;right:16px;width:28px;height:28px;' +
      'line-height:28px;text-align:center;font-size:18px;color:#666;cursor:pointer;' +
      'border-radius:6px;transition:all 0.2s;z-index:10;';
    closeBtn.textContent = '\u00d7';
    closeBtn.title = '关闭';
    closeBtn.onmouseenter = function () { this.style.color = '#e94560'; this.style.background = 'rgba(233,69,96,0.1)'; };
    closeBtn.onmouseleave = function () { this.style.color = '#666'; this.style.background = 'transparent'; };
    closeBtn.onclick = function () { overlay.remove(); };
    dialog.appendChild(closeBtn);

    // 标题
    const title = document.createElement('h2');
    title.style.cssText = 'font-size:18px;color:#e94560;margin-bottom:6px;';
    title.textContent = '估值规则设置';
    dialog.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'font-size:12px;color:#888;margin-bottom:20px;line-height:1.5;';
    subtitle.textContent = '所有角色统一按基础价估值，命座价值通过每行"溢价"按钮单独配置。保存后立即生效。';
    dialog.appendChild(subtitle);

    // 收集所有角色名（按级别排序）
    const allCharNames = [];
    const _addedNameSet = {};
    for (const tierKey of Object.keys(CHAR_TIERS)) {
      for (const name of CHAR_TIERS[tierKey].chars) {
        if (!_addedNameSet[name]) { allCharNames.push(name); _addedNameSet[name] = true; }
      }
    }
    // 用户自定义角色级别覆盖中的新角色
    if (weights && weights.charTierOverride) {
      for (const ovrName of Object.keys(weights.charTierOverride)) {
        if (!_addedNameSet[ovrName]) { allCharNames.push(ovrName); _addedNameSet[ovrName] = true; }
      }
    }
    // charPrices中的自定义角色
    if (weights && weights.charPrices) {
      for (const cpName of Object.keys(weights.charPrices)) {
        if (!_addedNameSet[cpName]) { allCharNames.push(cpName); _addedNameSet[cpName] = true; }
      }
    }
    allCharNames.sort();

    // ===== 1. 五星角色定价 =====
    const charSection = document.createElement('div');
    charSection.style.cssText = 'margin-bottom:20px;';
    const charTitle = document.createElement('div');
    charTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    charTitle.textContent = G().labels.charSettingTitle;
    charSection.appendChild(charTitle);

    const charDesc = document.createElement('p');
    charDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    charDesc.innerHTML = '可自由添加、修改、删除角色定价及命座溢价。武器名自动匹配，也可手动修改。<br>所有角色统一按基础价估值，命座价值通过"溢价"按钮单独配置（如C3→+50元，C6→+180元，只取最高不叠加）。<br>勾选"专武"=需要专武（无专武时价值×折扣，折扣值在下方"其他权重"中配置）。<br>点击"强绑"按钮可设置强绑队友（队友全不在场时角色价值×折扣，可与无专武折扣叠加）。';
    charSection.appendChild(charDesc);

    // 角色定价数据（可增删改）
    var charEntries = [];
    var deletedChars = w.deletedChars || [];
    const tierLabels = { S: 'S级 热门人权', A: 'A级 热门限定', B: 'B级 温门核心', C: 'C级 冷门限定', D: 'D级 退环境', E: 'E级 常驻五星' };
    const tierColors = { S: '#10b981', A: '#e94560', B: '#f59e0b', C: '#6b7280', D: '#4b5563', E: '#374151' };
    var tierOrder = ['S', 'A', 'B', 'C', 'D', 'E'];

    // 有效金级别系数（该级别角色的命座与专武折算计入有效金的比例）
    var effTierWeights = Object.assign({}, w.effTierWeights || DEFAULT_WEIGHTS.effTierWeights || {});
    var effTierWeightInputs = {};
    var effTierRow = document.createElement('div');
    effTierRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-wrap:wrap;';
    var effTierLabel = document.createElement('span');
    effTierLabel.textContent = '有效金系数';
    effTierLabel.style.cssText = 'color:#aaa;font-size:11px;';
    effTierLabel.title = '该级别角色的命座与专武折算计入有效金的比例（如D级0.5=D级角色只算半金）';
    effTierRow.appendChild(effTierLabel);
    var effTierList = ['S', 'A', 'B', 'C', 'D', 'E'];
    for (var etw = 0; etw < effTierList.length; etw++) {
      (function (t) {
        var wrapper = document.createElement('span');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:2px;';
        var tLabel = document.createElement('span');
        tLabel.textContent = t + '级';
        tLabel.style.cssText = 'color:' + tierColors[t] + ';font-size:11px;font-weight:600;';
        wrapper.appendChild(tLabel);
        var tInput = document.createElement('input');
        tInput.type = 'number'; tInput.value = effTierWeights[t] != null ? effTierWeights[t] : 1; tInput.step = '0.05'; tInput.min = '0';
        tInput.title = '该级别角色计入有效金的比例';
        tInput.style.cssText = 'width:44px;padding:3px 3px;border:1px solid #0f3460;border-radius:3px;background:#16213e;color:#38bdf8;font-size:11px;text-align:right;font-weight:600;';
        effTierWeightInputs[t] = tInput;
        wrapper.appendChild(tInput);
        effTierRow.appendChild(wrapper);
      })(effTierList[etw]);
    }
    charSection.appendChild(effTierRow);

    // 获取角色的默认级别（在CHAR_TIERS中的原始级别）
    function getDefaultTier(name) {
      for (var dti = 0; dti < tierOrder.length; dti++) {
        var dtk = tierOrder[dti];
        if (CHAR_TIERS[dtk] && CHAR_TIERS[dtk].chars.indexOf(name) >= 0) return dtk;
      }
      return null; // 不在CHAR_TIERS中的自定义角色
    }

    // 检查角色是否在需要专武列表中
    var _needSigSet = {};
    var _needSigList = w.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
    for (var nsi = 0; nsi < _needSigList.length; nsi++) {
      var _nsName = typeof _needSigList[nsi] === 'string' ? _needSigList[nsi] : _needSigList[nsi].name;
      _needSigSet[_nsName] = true;
    }
    function isNeedSig(name) { return !!_needSigSet[name]; }

    // 构建强绑队友映射（从旧的 c6TeamDependency 或新的 teamMates 配置加载）
    var _teamMatesMap = {};
    var _rawTeamMates = w.teamMates || {};
    for (var tmn in _rawTeamMates) {
      if (!_rawTeamMates.hasOwnProperty(tmn)) continue;
      var mates = _rawTeamMates[tmn];
      if (Array.isArray(mates) && mates.length > 0) _teamMatesMap[tmn] = [].concat(mates);
    }
    // 向后兼容：从旧 c6TeamDependency 迁移
    var _oldC6Dep = w.c6TeamDependency || {};
    for (var ocdn in _oldC6Dep) {
      if (!_oldC6Dep.hasOwnProperty(ocdn)) continue;
      if (_teamMatesMap[ocdn]) continue;
      var ocdInfo = _oldC6Dep[ocdn];
      var ocdMates = Array.isArray(ocdInfo.teammate) ? ocdInfo.teammate : [ocdInfo.teammate];
      if (ocdMates.length > 0 && ocdMates[0]) _teamMatesMap[ocdn] = [].concat(ocdMates);
    }
    function getTeamMates(name) { return _teamMatesMap[name] ? [].concat(_teamMatesMap[name]) : []; }

    // 初始化角色列表（跳过已删除的角色）
    var defPrices = buildDefaultCharPrices();
    var _addedNames = {};
    for (var ti = 0; ti < tierOrder.length; ti++) {
      var tk = tierOrder[ti];
      if (!CHAR_TIERS[tk]) continue;
      var tier = CHAR_TIERS[tk];
      for (var ci = 0; ci < tier.chars.length; ci++) {
        var cname = tier.chars[ci];
        if (deletedChars.indexOf(cname) >= 0) continue;
        // 级别被覆盖的角色跳过原始级别（在下方按覆盖级别添加）
        if (w.charTierOverride && w.charTierOverride[cname] && w.charTierOverride[cname] !== tk) continue;
        var defaultPrice = defPrices[cname] != null ? defPrices[cname] : tier.price;
        var userPrice = w.charPrices[cname] != null ? w.charPrices[cname] : defaultPrice;
        var weapon = (w.sigWeaponsOverride && w.sigWeaponsOverride[cname]) || SIG_WEAPONS[cname] || '';
        charEntries.push({ name: cname, weapon: weapon, price: userPrice, tier: tk, constPrices: w.constPrices && w.constPrices[cname] ? Object.assign({}, w.constPrices[cname]) : {}, needSig: isNeedSig(cname), teamMates: getTeamMates(cname) });
        _addedNames[cname] = true;
      }
    }
    // 加载级别被覆盖的角色（在 CHAR_TIERS 中但级别被用户修改）
    if (w.charTierOverride) {
      for (var ovrName in w.charTierOverride) {
        if (!w.charTierOverride.hasOwnProperty(ovrName)) continue;
        if (_addedNames[ovrName]) continue;
        if (deletedChars.indexOf(ovrName) >= 0) continue;
        var ovrTier = w.charTierOverride[ovrName];
        var ovrTierInfo = CHAR_TIERS[ovrTier];
        var ovrDefaultPrice = defPrices[ovrName] != null ? defPrices[ovrName] : (ovrTierInfo ? ovrTierInfo.price : 0);
        var ovrUserPrice = w.charPrices[ovrName] != null ? w.charPrices[ovrName] : ovrDefaultPrice;
        var ovrWeapon = (w.sigWeaponsOverride && w.sigWeaponsOverride[ovrName]) || SIG_WEAPONS[ovrName] || '';
        charEntries.push({ name: ovrName, weapon: ovrWeapon, price: ovrUserPrice, tier: ovrTier, constPrices: w.constPrices && w.constPrices[ovrName] ? Object.assign({}, w.constPrices[ovrName]) : {}, needSig: isNeedSig(ovrName), teamMates: getTeamMates(ovrName) });
        _addedNames[ovrName] = true;
      }
    }
    // 加载用户自定义添加的角色（不在 CHAR_TIERS 中的角色）
    if (w.charPrices) {
      for (var customName in w.charPrices) {
        if (!w.charPrices.hasOwnProperty(customName)) continue;
        if (_addedNames[customName]) continue;
        if (deletedChars.indexOf(customName) >= 0) continue;
        var customTier = (w.charTierOverride && w.charTierOverride[customName]) || 'C';
        var customWeapon = (w.sigWeaponsOverride && w.sigWeaponsOverride[customName]) || SIG_WEAPONS[customName] || '';
        charEntries.push({ name: customName, weapon: customWeapon, price: w.charPrices[customName], tier: customTier, constPrices: w.constPrices && w.constPrices[customName] ? Object.assign({}, w.constPrices[customName]) : {}, needSig: isNeedSig(customName), teamMates: getTeamMates(customName) });
      }
    }

    var charList = document.createElement('div');
    charList.style.cssText = 'margin-bottom:12px;max-height:400px;overflow-y:auto;border:1px solid #0f3460;border-radius:8px;padding:8px;';

    function renderCharList() {
      charList.innerHTML = '';
      for (var gi = 0; gi < tierOrder.length; gi++) {
        var gk = tierOrder[gi];
        var groupEntries = charEntries.filter(function(e) { return e.tier === gk; });
        if (groupEntries.length === 0) continue;

        var groupHeader = document.createElement('div');
        groupHeader.style.cssText = 'font-size:12px;font-weight:600;color:' + tierColors[gk] + ';margin:8px 0 4px;padding:2px 4px;';
        groupHeader.textContent = tierLabels[gk] + '（默认 ' + (CHAR_TIERS[gk] ? CHAR_TIERS[gk].price : 0) + '元）';
        charList.appendChild(groupHeader);

        for (var ei = 0; ei < groupEntries.length; ei++) {
          (function(entry) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;font-size:12px;border-bottom:1px solid #0a1a3a;';

            var nameInput = document.createElement('input');
            nameInput.type = 'text'; nameInput.value = entry.name;
            nameInput.style.cssText = 'flex:1;min-width:60px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
            nameInput.onchange = function() {
              entry.name = nameInput.value.trim() || entry.name;
              if (SIG_WEAPONS[entry.name] && !entry.weapon) {
                entry.weapon = SIG_WEAPONS[entry.name];
                weaponInput.value = entry.weapon;
              }
            };
            row.appendChild(nameInput);

            var weaponInput = document.createElement('input');
            weaponInput.type = 'text'; weaponInput.value = entry.weapon;
            weaponInput.placeholder = '专武名';
            weaponInput.style.cssText = 'flex:1;min-width:60px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
            weaponInput.onchange = function() { entry.weapon = weaponInput.value.trim(); };
            row.appendChild(weaponInput);

            var priceInput = document.createElement('input');
            priceInput.type = 'number'; priceInput.value = entry.price;
            priceInput.style.cssText = 'width:50px;padding:4px 4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:right;';
            priceInput.onchange = function() { var v = parseFloat(priceInput.value); entry.price = isNaN(v) ? 0 : v; };
            row.appendChild(priceInput);

            var yuanLabel = document.createElement('span');
            yuanLabel.textContent = '元'; yuanLabel.style.cssText = 'color:#555;font-size:11px;';
            row.appendChild(yuanLabel);

            var tierSelect = document.createElement('select');
            tierSelect.style.cssText = 'width:42px;padding:3px 2px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:' + tierColors[entry.tier] + ';font-size:11px;text-align:center;cursor:pointer;';
            tierSelect.title = '修改级别';
            for (var tsi = 0; tsi < tierOrder.length; tsi++) {
              var opt = document.createElement('option');
              opt.value = tierOrder[tsi]; opt.textContent = tierOrder[tsi];
              if (tierOrder[tsi] === entry.tier) opt.selected = true;
              tierSelect.appendChild(opt);
            }
            tierSelect.onchange = function() {
              entry.tier = tierSelect.value;
              renderCharList();
            };
            row.appendChild(tierSelect);

            var sigCheck = document.createElement('input');
            sigCheck.type = 'checkbox'; sigCheck.checked = !!entry.needSig;
            sigCheck.title = '勾选=需要专武（无专武时价值×' + Math.round((w.needSigDiscount != null ? w.needSigDiscount : DEFAULT_WEIGHTS.needSigDiscount) * 100) + '%）';
            sigCheck.style.cssText = 'margin:0;cursor:pointer;accent-color:#ef4444;';
            sigCheck.onchange = function() { entry.needSig = sigCheck.checked; };
            row.appendChild(sigCheck);

            var sigLabel = document.createElement('span');
            sigLabel.textContent = '专武'; sigLabel.style.cssText = 'color:' + (entry.needSig ? '#ef4444' : '#555') + ';font-size:10px;cursor:pointer;';
            sigLabel.onclick = function() { sigCheck.checked = !sigCheck.checked; entry.needSig = sigCheck.checked; sigLabel.style.color = entry.needSig ? '#ef4444' : '#555'; };
            row.appendChild(sigLabel);

            var premBtn = document.createElement('button');
            var premCount = entry.constPrices ? Object.keys(entry.constPrices).length : 0;
            premBtn.textContent = '定价' + (premCount > 0 ? '(' + premCount + ')' : '');
            premBtn.title = '编辑命座定价（C0-C6绝对价格）';
            premBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#1a1a2e;color:' + (premCount > 0 ? '#10b981' : '#555') + ';font-size:11px;cursor:pointer;line-height:1.4;';
            premBtn.onclick = function() {
              var premOverlay = document.createElement('div');
              premOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
              var premBox = document.createElement('div');
              premBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:320px;color:#e0e0e0;';
              var premHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#10b981;">编辑命座定价 - ' + entry.name + '</div>';
              premHTML += '<div style="font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;">设置每个命座的绝对价格。角色几命就取对应命座的价格，未设置的命座取低于它的最近价格。</div>';
              // C0 定价（与基础价同步）
              premHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                '<span style="font-size:12px;color:#8ecdf5;font-weight:600;min-width:30px;">C0</span>' +
                '<span style="color:#555;font-size:11px;">→</span>' +
                '<input type="number" class="prem-c0" value="' + entry.price + '" placeholder="0" min="0" style="width:80px;padding:4px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:right;" />' +
                '<span style="color:#555;font-size:11px;">元</span>' +
                '<span style="color:#555;font-size:10px;">（基础价）</span>' +
                '</div>';
              for (var pci = 1; pci <= 6; pci++) {
                var curPremVal = entry.constPrices && entry.constPrices[pci] != null ? entry.constPrices[pci] : '';
                premHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                  '<span style="font-size:12px;color:#e94560;font-weight:600;min-width:30px;">C' + pci + '</span>' +
                  '<span style="color:#555;font-size:11px;">→</span>' +
                  '<input type="number" class="prem-c' + pci + '" value="' + curPremVal + '" placeholder="" min="0" style="width:80px;padding:4px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:right;" />' +
                  '<span style="color:#555;font-size:11px;">元</span>' +
                  '</div>';
              }
              premHTML += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
                '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
                '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#10b981;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
              premBox.innerHTML = premHTML;
              premBox.querySelector('.cancel-btn').onclick = function() { premOverlay.remove(); };
              premBox.querySelector('.save-btn').onclick = function() {
                // C0 价格同步到基础价
                var c0Val = parseFloat(premBox.querySelector('.prem-c0').value);
                if (!isNaN(c0Val) && c0Val >= 0) {
                  entry.price = c0Val;
                }
                // C1-C6 绝对定价
                entry.constPrices = {};
                for (var sci = 1; sci <= 6; sci++) {
                  var pv = parseFloat(premBox.querySelector('.prem-c' + sci).value);
                  if (!isNaN(pv) && pv >= 0) {
                    entry.constPrices[sci] = pv;
                  }
                }
                premOverlay.remove();
                renderCharList();
              };
              premOverlay.appendChild(premBox);
              premOverlay.onclick = function(ev) { if (ev.target === premOverlay) premOverlay.remove(); };
              document.body.appendChild(premOverlay);
            };
            row.appendChild(premBtn);

            var mateBtn = document.createElement('button');
            var mateCount = entry.teamMates ? entry.teamMates.length : 0;
            mateBtn.textContent = '强绑' + (mateCount > 0 ? '(' + mateCount + ')' : '');
            mateBtn.title = '编辑强绑队友（全不在场时价值×' + (w.teamDepDiscount != null ? w.teamDepDiscount : DEFAULT_WEIGHTS.teamDepDiscount) + '）';
            mateBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#1a1a2e;color:' + (mateCount > 0 ? '#fbbf24' : '#555') + ';font-size:11px;cursor:pointer;line-height:1.4;';
            mateBtn.onclick = function() {
              var mateOverlay = document.createElement('div');
              mateOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
              var mateBox = document.createElement('div');
              mateBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:340px;max-height:500px;overflow-y:auto;color:#e0e0e0;';
              var mateHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:8px;color:#fbbf24;">编辑强绑队友 - ' + entry.name + '</div>';
              mateHTML += '<div style="font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;">勾选强绑队友，当这些队友全不在账号中时，角色价值×' + (w.teamDepDiscount != null ? w.teamDepDiscount : DEFAULT_WEIGHTS.teamDepDiscount) + '。可与无专武折扣叠加。</div>';
              var _curMates = entry.teamMates || [];
              for (var mi = 0; mi < allCharNames.length; mi++) {
                var mname = allCharNames[mi];
                if (mname === entry.name) continue;
                var checked = _curMates.indexOf(mname) >= 0 ? ' checked' : '';
                mateHTML += '<label style="display:inline-flex;align-items:center;gap:4px;margin:3px 6px;font-size:12px;color:#e0e0e0;cursor:pointer;">' +
                  '<input type="checkbox" class="mate-cb" value="' + mname + '"' + checked + ' style="margin:0;accent-color:#fbbf24;" />' + mname + '</label>';
              }
              mateHTML += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
                '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
                '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#fbbf24;color:#12122a;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
              mateBox.innerHTML = mateHTML;
              mateBox.querySelector('.cancel-btn').onclick = function() { mateOverlay.remove(); };
              mateBox.querySelector('.save-btn').onclick = function() {
                var cbs = mateBox.querySelectorAll('.mate-cb:checked');
                var newMates = [];
                for (var cbi = 0; cbi < cbs.length; cbi++) newMates.push(cbs[cbi].value);
                entry.teamMates = newMates;
                mateOverlay.remove();
                renderCharList();
              };
              mateOverlay.appendChild(mateBox);
              mateOverlay.onclick = function(ev) { if (ev.target === mateOverlay) mateOverlay.remove(); };
              document.body.appendChild(mateOverlay);
            };
            row.appendChild(mateBtn);

            var delBtn = document.createElement('button');
            delBtn.textContent = '×'; delBtn.title = '删除';
            delBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#1a1a2e;color:#e94560;font-size:14px;cursor:pointer;line-height:1;';
            delBtn.onclick = function() {
              var idx = charEntries.indexOf(entry);
              if (idx >= 0) {
                charEntries.splice(idx, 1);
                if (deletedChars.indexOf(entry.name) < 0) deletedChars.push(entry.name);
                renderCharList();
              }
            };
            row.appendChild(delBtn);

            charList.appendChild(row);
          })(groupEntries[ei]);
        }
      }
      if (charEntries.length === 0) {
        charList.innerHTML = '<div style="font-size:12px;color:#555;padding:12px;text-align:center;">暂无角色，点击下方"添加角色"按钮</div>';
      }
    }

    renderCharList();
    charSection.appendChild(charList);

    // 添加角色行
    var addCharRow = document.createElement('div');
    addCharRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
    var addNameInput = document.createElement('input');
    addNameInput.type = 'text'; addNameInput.placeholder = '角色名';
    addNameInput.style.cssText = 'flex:1;min-width:80px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
    addCharRow.appendChild(addNameInput);

    var addWeaponInput = document.createElement('input');
    addWeaponInput.type = 'text'; addWeaponInput.placeholder = '专武名（可留空自动匹配）';
    addWeaponInput.style.cssText = 'flex:1;min-width:80px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
    addCharRow.appendChild(addWeaponInput);

    var addPriceInput = document.createElement('input');
    addPriceInput.type = 'number'; addPriceInput.placeholder = '价格'; addPriceInput.value = '15';
    addPriceInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:right;';
    addCharRow.appendChild(addPriceInput);

    var addTierSelect = document.createElement('select');
    addTierSelect.style.cssText = 'padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
    for (var ati = 0; ati < tierOrder.length; ati++) {
      var opt = document.createElement('option');
      opt.value = tierOrder[ati]; opt.textContent = tierOrder[ati] + '级';
      addTierSelect.appendChild(opt);
    }
    addCharRow.appendChild(addTierSelect);

    var addCharBtn = document.createElement('button');
    addCharBtn.textContent = '添加角色';
    addCharBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#e94560;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    addCharBtn.onclick = function() {
      var nm = addNameInput.value.trim();
      if (!nm) { alert('请输入角色名'); return; }
      if (charEntries.some(function(e) { return e.name === nm; })) {
        alert('角色"' + nm + '"已存在'); return;
      }
      var wpn = addWeaponInput.value.trim();
      if (!wpn && SIG_WEAPONS[nm]) wpn = SIG_WEAPONS[nm];
      var pr = parseFloat(addPriceInput.value);
      if (isNaN(pr)) pr = 15;
      charEntries.push({ name: nm, weapon: wpn, price: pr, tier: addTierSelect.value, constPrices: {} });
      // 如果角色之前被删除过，从 deletedChars 中移除，否则重新打开设置时会跳过
      var dcIdx = deletedChars.indexOf(nm);
      if (dcIdx >= 0) deletedChars.splice(dcIdx, 1);
      renderCharList();
      addNameInput.value = ''; addWeaponInput.value = '';
    };
    addCharRow.appendChild(addCharBtn);
    charSection.appendChild(addCharRow);

    dialog.appendChild(charSection);

    // ===== 2. 抽数阶梯定价（公式） =====
    var pullSection = document.createElement('div');
    pullSection.style.cssText = 'margin-bottom:20px;';
    var pullTitle = document.createElement('div');
    pullTitle.style.cssText = 'font-size:14px;font-weight:600;color:#8ecdf5;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    pullTitle.textContent = '抽数定价（资源越多每抽越值钱）';
    pullSection.appendChild(pullTitle);
    var pullDesc = document.createElement('p');
    pullDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    pullDesc.innerHTML = '抽数 = ' + pullFormulaText().replace(/\+/g, ' + ').replace(/\//g, '/') + '。每抽价格 = 基准价格 + (抽数 - 基准抽数) × 每抽浮动。';
    pullSection.appendChild(pullDesc);

    var pullFormulaRow = document.createElement('div');
    pullFormulaRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-bottom:10px;';

    function pfLabel(text) {
      var s = document.createElement('span');
      s.textContent = text; s.style.cssText = 'color:#aaa;font-size:11px;';
      return s;
    }
    function pfInput(val, step, color, title) {
      var i = document.createElement('input');
      i.type = 'number'; i.value = val; i.step = step; i.min = '0';
      i.title = title;
      i.style.cssText = 'width:70px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:' + color + ';font-size:12px;text-align:center;font-weight:600;';
      return i;
    }

    pullFormulaRow.appendChild(pfLabel('基准抽数'));
    var pfBaseInp = pfInput(weights.pullBase != null ? weights.pullBase : DEFAULT_PULL_FORMULA.pullBase, '1', '#8ecdf5', '此抽数对应的每抽价格为基准价格');
    pullFormulaRow.appendChild(pfBaseInp);
    pullFormulaRow.appendChild(pfLabel('基准每抽'));
    var pfBasePriceInp = pfInput(weights.pullBasePrice != null ? weights.pullBasePrice : DEFAULT_PULL_FORMULA.pullBasePrice, '0.1', '#10b981', '基准抽数对应的每抽价格（元）');
    pullFormulaRow.appendChild(pfBasePriceInp);
    pullFormulaRow.appendChild(pfLabel('元，每多1抽浮动'));
    var pfStepPriceInp = pfInput(weights.pullStepPrice != null ? weights.pullStepPrice : DEFAULT_PULL_FORMULA.pullStepPrice, '0.001', '#10b981', '每多1抽增加的价格（元）');
    pullFormulaRow.appendChild(pfStepPriceInp);
    pullFormulaRow.appendChild(pfLabel('元，每抽上限'));
    var pfMaxPriceInp = pfInput(weights.pullMaxPrice != null ? weights.pullMaxPrice : (DEFAULT_PULL_FORMULA.pullMaxPrice != null ? DEFAULT_PULL_FORMULA.pullMaxPrice : 0), '0.1', '#e94560', '每抽价格封顶（元，0=不限制）');
    pullFormulaRow.appendChild(pfMaxPriceInp);
    pullFormulaRow.appendChild(pfLabel('元(0不限)'));
    pullSection.appendChild(pullFormulaRow);

    // 预览
    var pullPreview = document.createElement('div');
    pullPreview.style.cssText = 'font-size:11px;color:#888;line-height:1.8;padding:8px 10px;background:rgba(142,205,245,0.05);border-radius:6px;border:1px solid rgba(142,205,245,0.15);';
    function updatePullPreview() {
      var base = parseFloat(pfBaseInp.value) || 0;
      var basePrice = parseFloat(pfBasePriceInp.value) || 0;
      var stepPrice = parseFloat(pfStepPriceInp.value) || 0;
      var maxPrice = parseFloat(pfMaxPriceInp.value) || 0;
      var samples = [0, 50, 100, 150, base, base + 50, base + 100, base + 200, base + 400, base + 800];
      samples = samples.filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort(function(a, b) { return a - b; });
      var html = '';
      for (var si = 0; si < samples.length; si++) {
        var p = samples[si];
        var perPull = basePrice + (p - base) * stepPrice;
        if (perPull < 0) perPull = 0;
        if (maxPrice > 0 && perPull > maxPrice) perPull = maxPrice;
        html += p + '抽 → ' + (Math.round(perPull * 1000) / 1000) + '元/抽　';
      }
      pullPreview.innerHTML = html;
    }
    [pfBaseInp, pfBasePriceInp, pfStepPriceInp, pfMaxPriceInp].forEach(function(inp) {
      inp.oninput = updatePullPreview;
    });
    updatePullPreview();
    pullSection.appendChild(pullPreview);

    // 载入默认按钮
    var pullDefaultRow = document.createElement('div');
    pullDefaultRow.style.cssText = 'margin-top:8px;';
    var loadPullDefaultBtn = document.createElement('button');
    loadPullDefaultBtn.textContent = '载入默认（200抽基准1.0元，每抽浮动0.002元，上限5元）';
    loadPullDefaultBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#333;color:#8ecdf5;font-size:11px;cursor:pointer;';
    loadPullDefaultBtn.onclick = function () {
      pfBaseInp.value = DEFAULT_PULL_FORMULA.pullBase;
      pfBasePriceInp.value = DEFAULT_PULL_FORMULA.pullBasePrice;
      pfStepPriceInp.value = DEFAULT_PULL_FORMULA.pullStepPrice;
      pfMaxPriceInp.value = DEFAULT_PULL_FORMULA.pullMaxPrice != null ? DEFAULT_PULL_FORMULA.pullMaxPrice : 0;
      updatePullPreview();
    };
    pullDefaultRow.appendChild(loadPullDefaultBtn);
    pullSection.appendChild(pullDefaultRow);

    // 满命抽数加成（公式）
    var pullC6Divider = document.createElement('div');
    pullC6Divider.style.cssText = 'border-top:1px dashed #0f3460;margin:16px 0 12px 0;';
    pullSection.appendChild(pullC6Divider);

    var pullC6Title = document.createElement('div');
    pullC6Title.style.cssText = 'font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:4px;';
    pullC6Title.textContent = '满命抽数加成（加权满命数 → 抽数价值加成）';
    pullSection.appendChild(pullC6Title);

    var pullC6Desc = document.createElement('p');
    pullC6Desc.style.cssText = 'font-size:11px;color:#888;margin-bottom:10px;line-height:1.5;';
    pullC6Desc.innerHTML = '根据加权满命数（与满命溢价共用），对抽数价值额外加成。加成 = 基准加成 + (加权满命 - 基准) / 每档 × 每档浮动。';
    pullSection.appendChild(pullC6Desc);

    var pullC6FormulaRow = document.createElement('div');
    pullC6FormulaRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-bottom:10px;';

    function pc6Label(text) {
      var s = document.createElement('span');
      s.textContent = text; s.style.cssText = 'color:#aaa;font-size:11px;';
      return s;
    }
    function pc6Input(val, step, color, title) {
      var i = document.createElement('input');
      i.type = 'number'; i.value = val; i.step = step; i.min = '0';
      i.title = title;
      i.style.cssText = 'width:60px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:' + color + ';font-size:12px;text-align:center;font-weight:600;';
      return i;
    }

    pullC6FormulaRow.appendChild(pc6Label('基准满命'));
    var pc6BaseInp = pc6Input(weights.pullC6Base != null ? weights.pullC6Base : DEFAULT_WEIGHTS.pullC6Base, '0.5', '#f59e0b', '此加权满命数对应的加成为基准加成');
    pullC6FormulaRow.appendChild(pc6BaseInp);
    pullC6FormulaRow.appendChild(pc6Label('基准加成'));
    var pc6BaseBonusInp = pc6Input((weights.pullC6BaseBonus != null ? weights.pullC6BaseBonus : DEFAULT_WEIGHTS.pullC6BaseBonus) * 100, '1', '#10b981', '基准满命数对应的加成百分比');
    pullC6FormulaRow.appendChild(pc6BaseBonusInp);
    pullC6FormulaRow.appendChild(pc6Label('%，每'));
    var pc6StepInp = pc6Input(weights.pullC6Step != null ? weights.pullC6Step : DEFAULT_WEIGHTS.pullC6Step, '0.1', '#f59e0b', '每N命浮动一档');
    pullC6FormulaRow.appendChild(pc6StepInp);
    pullC6FormulaRow.appendChild(pc6Label('命浮动'));
    var pc6StepBonusInp = pc6Input((weights.pullC6StepBonus != null ? weights.pullC6StepBonus : DEFAULT_WEIGHTS.pullC6StepBonus) * 100, '0.1', '#10b981', '每档浮动百分比');
    pullC6FormulaRow.appendChild(pc6StepBonusInp);
    pullC6FormulaRow.appendChild(pc6Label('%'));
    pullC6FormulaRow.appendChild(pc6Label('阈值'));
    var pc6ThresholdInp = pc6Input(weights.pullC6Threshold != null ? weights.pullC6Threshold : (DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400), '1', '#f59e0b', '抽数低于此值时不加成');
    pullC6FormulaRow.appendChild(pc6ThresholdInp);
    pullC6FormulaRow.appendChild(pc6Label('抽'));
    pullC6FormulaRow.appendChild(pc6Label('加权上限'));
    var pc6MaxWCInp = pc6Input(weights.pullC6MaxWeightedConst != null ? weights.pullC6MaxWeightedConst : (DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20), '1', '#f59e0b', '加权满命数超过此值后加成不再增加');
    pullC6FormulaRow.appendChild(pc6MaxWCInp);
    pullC6FormulaRow.appendChild(pc6Label('每'));
    var pc6PullPerWCInp = pc6Input(weights.pullPerWeightedConst != null ? weights.pullPerWeightedConst : (DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450), '1', '#f59e0b', '每N抽折算一次加权满命（0=不折算）');
    pullC6FormulaRow.appendChild(pc6PullPerWCInp);
    pullC6FormulaRow.appendChild(pc6Label('抽+'));
    var pc6PullPerWCCountInp = pc6Input(weights.pullPerWeightedConstCount != null ? weights.pullPerWeightedConstCount : (DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1), '1', '#4ade80', '每次折算多少个加权满命');
    pullC6FormulaRow.appendChild(pc6PullPerWCCountInp);
    pullC6FormulaRow.appendChild(pc6Label('命'));
    pullSection.appendChild(pullC6FormulaRow);

    // 预览
    var pullC6Preview = document.createElement('div');
    pullC6Preview.style.cssText = 'font-size:11px;color:#888;line-height:1.8;padding:8px 10px;background:rgba(245,158,11,0.05);border-radius:6px;border:1px solid rgba(245,158,11,0.15);';
    function updatePullC6Preview() {
      var base = parseFloat(pc6BaseInp.value) || 0;
      var baseBonus = (parseFloat(pc6BaseBonusInp.value) || 0) / 100;
      var step = parseFloat(pc6StepInp.value) || 1;
      var stepBonus = (parseFloat(pc6StepBonusInp.value) || 0) / 100;
      var threshold = parseFloat(pc6ThresholdInp.value);
      if (isNaN(threshold)) threshold = 400;
      var maxWC = parseFloat(pc6MaxWCInp.value);
      if (isNaN(maxWC) || maxWC <= 0) maxWC = 0;
      var samples = [0, 1, 2, 3, 4, base, base + step, base + step * 2, base + step * 5, base + step * 10, base + step * 20];
      if (maxWC > 0) samples.push(maxWC, maxWC + 5);
      samples = samples.filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort(function(a, b) { return a - b; });
      var html = '';
      for (var si = 0; si < samples.length; si++) {
        var c = samples[si];
        var effC = (maxWC > 0 && c > maxWC) ? maxWC : c;
        var bonus = baseBonus + (effC - base) / step * stepBonus;
        if (bonus < 0) bonus = 0;
        var capped = (maxWC > 0 && c > maxWC);
        html += c + '命 → +' + (Math.round(bonus * 1000) / 10) + '%' + (capped ? ' (封顶)' : '') + '　';
      }
      html += '<br><span style="color:#f59e0b">注：抽数 ≥ ' + threshold + '时才生效，低于此值无加成' + (maxWC > 0 ? '；加权满命数超过' + maxWC + '后加成封顶' : '');
      var pullPerWC = parseFloat(pc6PullPerWCInp.value);
      var pullPerWCCount = parseFloat(pc6PullPerWCCountInp.value);
      if (!isNaN(pullPerWC) && pullPerWC > 0 && !isNaN(pullPerWCCount)) {
        html += '；每' + pullPerWC + '抽+' + pullPerWCCount + '加权满命';
      }
      html += '</span>';
      pullC6Preview.innerHTML = html;
    }
    [pc6BaseInp, pc6BaseBonusInp, pc6StepInp, pc6StepBonusInp, pc6ThresholdInp, pc6MaxWCInp, pc6PullPerWCInp, pc6PullPerWCCountInp].forEach(function(inp) {
      inp.oninput = updatePullC6Preview;
    });
    updatePullC6Preview();
    pullSection.appendChild(pullC6Preview);

    // 载入默认按钮
    var pullC6DefaultRow = document.createElement('div');
    pullC6DefaultRow.style.cssText = 'margin-top:8px;';
    var loadPullC6DefaultBtn = document.createElement('button');
    loadPullC6DefaultBtn.textContent = '载入默认（5命基准50%，每0.1命浮动0.5%）';
    loadPullC6DefaultBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;';
    loadPullC6DefaultBtn.onclick = function () {
      pc6BaseInp.value = DEFAULT_WEIGHTS.pullC6Base;
      pc6BaseBonusInp.value = DEFAULT_WEIGHTS.pullC6BaseBonus * 100;
      pc6StepInp.value = DEFAULT_WEIGHTS.pullC6Step;
      pc6StepBonusInp.value = DEFAULT_WEIGHTS.pullC6StepBonus * 100;
      pc6ThresholdInp.value = DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400;
      pc6MaxWCInp.value = DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20;
      pc6PullPerWCInp.value = DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450;
      pc6PullPerWCCountInp.value = DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1;
      updatePullC6Preview();
    };
    pullC6DefaultRow.appendChild(loadPullC6DefaultBtn);
    pullSection.appendChild(pullC6DefaultRow);
    dialog.appendChild(pullSection);

    // ===== 4. 满命多角色溢价 =====
    var c6Section = document.createElement('div');
    c6Section.style.cssText = 'margin-bottom:20px;';
    var c6Title = document.createElement('div');
    c6Title.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    c6Title.textContent = '满命多角色溢价（加权满命计数）';
    c6Section.appendChild(c6Title);
    var c6Desc = document.createElement('p');
    c6Desc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    c6Desc.innerHTML = '各级别权重可在下方编辑。加权满命数=Σ(满命角色×权重)，直接用小数匹配档位（加权数≥档位数即触发）。';
    c6Section.appendChild(c6Desc);

    // 权重编辑区
    var c6WeightInfo = document.createElement('div');
    c6WeightInfo.style.cssText = 'font-size:11px;color:#8ecdf5;margin-bottom:10px;padding:8px;background:rgba(142,205,245,0.08);border-radius:4px;';
    var c6Weights = Object.assign({}, w.c6TierWeights || DEFAULT_WEIGHTS.c6TierWeights);
    var c6WeightInputs = {};
    c6WeightInfo.innerHTML = '<div style="margin-bottom:6px;color:#aaa;">各级别满命权重（可编辑）：</div>';
    var c6WeightRow = document.createElement('div');
    c6WeightRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    var c6TierList = ['S', 'A', 'B', 'C', 'D', 'E'];
    for (var ci = 0; ci < c6TierList.length; ci++) {
      (function (t) {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:3px;';
        var label = document.createElement('span');
        label.textContent = t + '级';
        label.style.cssText = 'font-size:11px;color:#e0e0e0;font-weight:600;min-width:24px;';
        wrapper.appendChild(label);
        var input = document.createElement('input');
        input.type = 'number'; input.min = '0'; input.max = '2'; input.step = '0.1';
        input.value = c6Weights[t] != null ? c6Weights[t] : 0;
        input.style.cssText = 'width:45px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
        c6WeightInputs[t] = input;
        wrapper.appendChild(input);
        c6WeightRow.appendChild(wrapper);
      })(c6TierList[ci]);
    }
    c6WeightInfo.appendChild(c6WeightRow);
    c6Section.appendChild(c6WeightInfo);

    // 满命溢价公式配置
    var c6FormulaRow = document.createElement('div');
    c6FormulaRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-bottom:10px;';

    function c6fLabel(text) {
      var s = document.createElement('span');
      s.textContent = text; s.style.cssText = 'color:#aaa;font-size:11px;';
      return s;
    }
    function c6fInput(val, step, color, title) {
      var i = document.createElement('input');
      i.type = 'number'; i.value = val; i.step = step; i.min = '0';
      i.title = title;
      i.style.cssText = 'width:60px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:' + color + ';font-size:12px;text-align:center;font-weight:600;';
      return i;
    }

    c6FormulaRow.appendChild(c6fLabel('基准满命'));
    var c6BaseInp = c6fInput(weights.c6Base != null ? weights.c6Base : DEFAULT_WEIGHTS.c6Base, '0.5', '#e94560', '此加权满命数对应的溢价为基准溢价');
    c6FormulaRow.appendChild(c6BaseInp);
    c6FormulaRow.appendChild(c6fLabel('基准溢价'));
    var c6BaseBonusInp = c6fInput((weights.c6BaseBonus != null ? weights.c6BaseBonus : DEFAULT_WEIGHTS.c6BaseBonus) * 100, '5', '#10b981', '基准满命数对应的溢价百分比');
    c6FormulaRow.appendChild(c6BaseBonusInp);
    c6FormulaRow.appendChild(c6fLabel('%，每'));
    var c6StepInp = c6fInput(weights.c6Step != null ? weights.c6Step : DEFAULT_WEIGHTS.c6Step, '0.1', '#e94560', '每N命浮动一档');
    c6FormulaRow.appendChild(c6StepInp);
    c6FormulaRow.appendChild(c6fLabel('命浮动'));
    var c6StepBonusInp = c6fInput((weights.c6StepBonus != null ? weights.c6StepBonus : DEFAULT_WEIGHTS.c6StepBonus) * 100, '0.5', '#10b981', '每档浮动百分比');
    c6FormulaRow.appendChild(c6StepBonusInp);
    c6FormulaRow.appendChild(c6fLabel('%'));
    c6Section.appendChild(c6FormulaRow);

    // 预览
    var c6Preview = document.createElement('div');
    c6Preview.style.cssText = 'font-size:11px;color:#888;line-height:1.8;padding:8px 10px;background:rgba(233,69,96,0.05);border-radius:6px;border:1px solid rgba(233,69,96,0.15);';
    function updateC6Preview() {
      var base = parseFloat(c6BaseInp.value) || 0;
      var baseBonus = (parseFloat(c6BaseBonusInp.value) || 0) / 100;
      var step = parseFloat(c6StepInp.value) || 1;
      var stepBonus = (parseFloat(c6StepBonusInp.value) || 0) / 100;
      var samples = [0, 1, 2, base, base + step, base + step * 5, base + step * 10, base + step * 20, base + step * 50];
      samples = samples.filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort(function(a, b) { return a - b; });
      var html = '';
      for (var si = 0; si < samples.length; si++) {
        var c = samples[si];
        var bonus = baseBonus + (c - base) / step * stepBonus;
        if (bonus < 0) bonus = 0;
        html += c + '命 → +' + (Math.round(bonus * 1000) / 10) + '%　';
      }
      c6Preview.innerHTML = html;
    }
    [c6BaseInp, c6BaseBonusInp, c6StepInp, c6StepBonusInp].forEach(function(inp) {
      inp.oninput = updateC6Preview;
    });
    updateC6Preview();
    c6Section.appendChild(c6Preview);

    // 载入默认按钮
    var c6DefaultRow = document.createElement('div');
    c6DefaultRow.style.cssText = 'margin-top:8px;';
    var loadC6DefaultBtn = document.createElement('button');
    loadC6DefaultBtn.textContent = '载入默认（3命基准100%，每0.1命浮动5%）';
    loadC6DefaultBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;';
    loadC6DefaultBtn.onclick = function () {
      c6BaseInp.value = DEFAULT_WEIGHTS.c6Base;
      c6BaseBonusInp.value = DEFAULT_WEIGHTS.c6BaseBonus * 100;
      c6StepInp.value = DEFAULT_WEIGHTS.c6Step;
      c6StepBonusInp.value = DEFAULT_WEIGHTS.c6StepBonus * 100;
      updateC6Preview();
    };
    c6DefaultRow.appendChild(loadC6DefaultBtn);
    c6Section.appendChild(c6DefaultRow);
    dialog.appendChild(c6Section);

    // ===== 5. 有效金系数（按有效金数分段，动态分段） =====
    var yellowSection = document.createElement('div');
    yellowSection.style.cssText = 'margin-bottom:20px;';
    var yellowTitle = document.createElement('div');
    yellowTitle.style.cssText = 'font-size:14px;font-weight:600;color:#f59e0b;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    yellowTitle.textContent = '有效金系数（按有效金数分段）';
    yellowSection.appendChild(yellowTitle);
    var yellowDesc = document.createElement('p');
    yellowDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    yellowDesc.innerHTML = '有效金 = S级角色(含命座) + 其专武(含精炼) + 完整配队角色(含命座) + 其专武。按有效金数量分段，每段独立基准系数，调整一段不影响其他段。可自由添加/删除分段。';
    yellowSection.appendChild(yellowDesc);

    function yfLabel(text) {
      var s = document.createElement('span');
      s.textContent = text; s.style.cssText = 'color:#aaa;font-size:10px;';
      return s;
    }
    function yfInput(val, step, color, title, inpW) {
      var i = document.createElement('input');
      i.type = 'number'; i.value = val; i.step = step; i.min = '0';
      i.title = title;
      i.style.cssText = 'width:' + (inpW||48) + 'px;padding:2px 3px;border:1px solid #0f3460;border-radius:3px;background:#16213e;color:' + color + ';font-size:11px;text-align:center;font-weight:600;';
      return i;
    }

    var segColors = ['#22c55e', '#f59e0b', '#e94560', '#3b82f6', '#a855f7', '#ec4899'];
    var effSegInputs = [];
    var effSegRows = [];

    // 系数上限
    var maxRow = document.createElement('div');
    maxRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;';
    maxRow.appendChild(yfLabel('系数上限'));
    var effMaxCoeffInp = yfInput(weights.effYellowMaxCoeff != null ? weights.effYellowMaxCoeff : 2.5, '0.1', '#e94560', '系数最大值', 48);
    effMaxCoeffInp.style.textAlign = 'right';
    maxRow.appendChild(effMaxCoeffInp);
    yellowSection.appendChild(maxRow);

    var segsContainer = document.createElement('div');
    yellowSection.appendChild(segsContainer);

    function renderSegRows() {
      segsContainer.innerHTML = '';
      effSegInputs.length = 0;
      effSegRows.length = 0;
      var segs = weights.effYellowSegments || [];
      for (var si = 0; si < segs.length; si++) {
        (function(si) {
          var seg = segs[si];
          var color = segColors[si % segColors.length];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:6px;flex-wrap:wrap;padding:6px 8px;background:' + color + '11;border-radius:6px;border:1px solid ' + color + '33;';
          var title = document.createElement('span');
          var isLast = (si === segs.length - 1);
          var prevT = si > 0 ? segs[si-1].threshold : 0;
          var label = isLast ? '第' + (si+1) + '段(' + prevT + '+)' : '第' + (si+1) + '段(' + prevT + '~T' + (si+1) + ')';
          title.textContent = label;
          title.style.cssText = 'color:' + color + ';font-size:11px;font-weight:600;margin-right:6px;min-width:90px;';
          row.appendChild(title);

          row.appendChild(yfLabel('基准'));
          var baseInp = yfInput(seg.baseCoeff != null ? seg.baseCoeff : 0.3, '0.01', '#f59e0b', '基准系数', 44);
          baseInp.style.textAlign = 'right';
          row.appendChild(baseInp);

          var thresholdInp = null;
          if (!isLast) {
            row.appendChild(yfLabel('|边界'));
            thresholdInp = yfInput(seg.threshold != null ? seg.threshold : 10, '1', color, '有效金上界', 42);
            thresholdInp.style.textAlign = 'right';
            row.appendChild(thresholdInp);
          }

          row.appendChild(yfLabel('|每金浮动'));
          var stepInp = yfInput(seg.step != null ? seg.step : 0.01, '0.001', '#10b981', '每金浮动系数', 52);
          stepInp.style.textAlign = 'right';
          row.appendChild(stepInp);

          if (segs.length > 1) {
            var delBtn = document.createElement('button');
            delBtn.textContent = '✕';
            delBtn.style.cssText = 'margin-left:4px;padding:1px 6px;border:1px solid #444;border-radius:3px;background:#1a1a2e;color:#f87171;font-size:10px;cursor:pointer;line-height:1.4;';
            delBtn.title = '删除此段';
            delBtn.onclick = function() {
              weights.effYellowSegments.splice(si, 1);
              renderSegRows();
              updateYellowPreview();
            };
            row.appendChild(delBtn);
          }

          baseInp.onchange = updateYellowPreview;
          if (thresholdInp) thresholdInp.onchange = updateYellowPreview;
          stepInp.onchange = updateYellowPreview;

          effSegInputs.push({ baseInp: baseInp, thresholdInp: thresholdInp, stepInp: stepInp });
          effSegRows.push(row);
          segsContainer.appendChild(row);
        })(si);
      }
    }
    renderSegRows();

    var yellowBtnRow = document.createElement('div');
    yellowBtnRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;';
    var addSegBtn = document.createElement('button');
    addSegBtn.textContent = '+ 添加分段';
    addSegBtn.style.cssText = 'padding:4px 10px;border:1px solid #0f3460;border-radius:4px;background:#1a1a2e;color:#22c55e;font-size:11px;cursor:pointer;';
    addSegBtn.onclick = function() {
      var segs = weights.effYellowSegments || [];
      var prevT = segs.length > 0 ? (segs[segs.length-1].threshold || 50) : 50;
      if (segs.length > 0 && segs[segs.length-1].threshold == null) {
        segs[segs.length-1].threshold = prevT;
      }
      segs.push({ baseCoeff: 1.0, threshold: null, step: 0.005 });
      weights.effYellowSegments = segs;
      renderSegRows();
      updateYellowPreview();
    };
    yellowBtnRow.appendChild(addSegBtn);
    var loadYellowDefaultBtn = document.createElement('button');
    loadYellowDefaultBtn.textContent = '载入默认';
    loadYellowDefaultBtn.style.cssText = 'padding:4px 10px;border:1px solid #0f3460;border-radius:4px;background:#1a1a2e;color:#f59e0b;font-size:11px;cursor:pointer;';
    loadYellowDefaultBtn.onclick = function() {
      weights.effYellowSegments = [
        { baseCoeff: 0.3, threshold: 10, step: 0.03 },
        { baseCoeff: 0.4, threshold: 40, step: 0.02 },
        { baseCoeff: 0.88, threshold: null, step: 0.008 }
      ];
      effMaxCoeffInp.value = 2.5;
      renderSegRows();
      updateYellowPreview();
    };
    yellowBtnRow.appendChild(loadYellowDefaultBtn);
    yellowSection.appendChild(yellowBtnRow);

    // 预览
    var yellowPreview = document.createElement('div');
    yellowPreview.style.cssText = 'font-size:11px;color:#888;line-height:1.8;padding:8px 10px;background:rgba(245,158,11,0.05);border-radius:6px;border:1px solid rgba(245,158,11,0.15);margin-top:8px;';
    yellowSection.appendChild(yellowPreview);

    function updateYellowPreview() {
      var mc = parseFloat(effMaxCoeffInp.value) || 2.5;
      var segs = [];
      for (var si = 0; si < effSegInputs.length; si++) {
        var inp = effSegInputs[si];
        segs.push({
          baseCoeff: parseFloat(inp.baseInp.value) || 0,
          threshold: inp.thresholdInp ? (parseFloat(inp.thresholdInp.value) || 0) : null,
          step: parseFloat(inp.stepInp.value) || 0
        });
      }
      var samples = [0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100];
      var html = '';
      for (var si2 = 0; si2 < samples.length; si2++) {
        var y = samples[si2];
        var coeff;
        var segColor = '#888';
        for (var sj = 0; sj < segs.length; sj++) {
          if (segs[sj].threshold == null || y <= segs[sj].threshold) {
            coeff = segs[sj].baseCoeff + y * segs[sj].step;
            segColor = segColors[sj % segColors.length];
            break;
          }
        }
        if (coeff == null && segs.length > 0) {
          var last = segs[segs.length - 1];
          coeff = (last.baseCoeff || 0) + y * (last.step || 0);
          segColor = segColors[(segs.length-1) % segColors.length];
        }
        if (mc > 0 && coeff > mc) coeff = mc;
        if (coeff < 0.1) coeff = 0.1;
        html += '<span style="color:' + segColor + ';">' + y + '金→×' + (Math.round(coeff * 1000) / 1000) + '</span>　';
      }
      yellowPreview.innerHTML = html;
    }
    effMaxCoeffInp.onchange = updateYellowPreview;
    updateYellowPreview();

    dialog.appendChild(yellowSection);

    // ===== 6. 配队溢价 =====
    var teamSection = document.createElement('div');
    teamSection.style.cssText = 'margin-bottom:20px;';
    var teamTitle = document.createElement('div');
    teamTitle.style.cssText = 'font-size:14px;font-weight:600;color:#f59e0b;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    teamTitle.textContent = '配队溢价（队员价值倍数 + 多配队额外系数）';
    teamSection.appendChild(teamTitle);
    var teamDesc = document.createElement('p');
    teamDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    teamDesc.innerHTML = '满足配队后，队员价值 × 倍数（如1.2=溢价20%）。多配队再额外乘以系数。';
    teamSection.appendChild(teamDesc);

    var teamList = document.createElement('div');
    teamList.style.cssText = 'margin-bottom:12px;';
    var teamEntries = [];
    var teamSeenNames = {}; // 去重：同名配队只保留一条
    if (weights.teamPremiums) {
      for (var tName of Object.keys(weights.teamPremiums)) {
        if (teamSeenNames[tName]) continue;
        teamSeenNames[tName] = true;
        var tInfo = weights.teamPremiums[tName];
        teamEntries.push({ name: tName, chars: [].concat(tInfo.chars || []), multiplier: tInfo.multiplier || 1.0, enabled: tInfo.enabled !== false });
      }
    } else {
      for (var td = 0; td < DEFAULT_TEAMS.length; td++) {
        teamEntries.push({ name: DEFAULT_TEAMS[td].name, chars: [].concat(DEFAULT_TEAMS[td].members || []), multiplier: DEFAULT_TEAMS[td].multiplier, enabled: true });
      }
    }

    function renderTeamList() {
      teamList.innerHTML = '';
      if (teamEntries.length === 0) { teamList.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无配队规则，可点击下方"载入默认"快速添加</div>'; return; }
      for (var i = 0; i < teamEntries.length; i++) {
        (function (idx) {
          var e = teamEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;flex-wrap:wrap;';
          row.innerHTML =
            '<input type="checkbox" class="enable-cb" ' + (e.enabled ? 'checked' : '') + ' style="margin:0;cursor:pointer;" />' +
            '<span style="color:#f59e0b;font-weight:600;min-width:60px;">' + e.name + '</span>' +
            '<span style="color:#e94560;">' + e.chars.join(' + ') + '</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#10b981;font-weight:600;">×' + e.multiplier + '</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.enable-cb').onchange = function (ev) { e.enabled = ev.target.checked; };
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:320px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#f59e0b;">编辑配队</div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">配队名称</label>' +
              '<input type="text" class="edit-name" value="' + e.name + '" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">角色（3名）</label>' +
              '<div style="display:flex;gap:6px;margin-top:4px;" class="char-selects"></div></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">价值倍数（如1.2=溢价20%）</label>' +
              '<input type="number" class="edit-mult" value="' + e.multiplier + '" min="1" max="3" step="0.05" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
              '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#f59e0b;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
            var charSelectsDiv = editBox.querySelector('.char-selects');
            var selects = [];
            for (var s = 0; s < 3; s++) {
              (function (selIdx) {
                var sel = document.createElement('select');
                sel.style.cssText = 'flex:1;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
                var emptyOpt = document.createElement('option');
                emptyOpt.value = ''; emptyOpt.textContent = '角色' + (selIdx + 1);
                sel.appendChild(emptyOpt);
                for (var cn = 0; cn < allCharNames.length; cn++) {
                  var o = document.createElement('option');
                  o.value = allCharNames[cn]; o.textContent = allCharNames[cn];
                  if (e.chars[selIdx] === allCharNames[cn]) o.selected = true;
                  sel.appendChild(o);
                }
                selects.push(sel);
                charSelectsDiv.appendChild(sel);
              })(s);
            }
            editBox.querySelector('.cancel-btn').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-btn').onclick = function () {
              var newName = editBox.querySelector('.edit-name').value.trim();
              var newChars = selects.map(function (s) { return s.value; }).filter(Boolean);
              var newMult = parseFloat(editBox.querySelector('.edit-mult').value);
              if (!newName) { alert('请输入配队名称'); return; }
              if (newChars.length < 2) { alert('请至少选择2名角色'); return; }
              if (isNaN(newMult) || newMult < 1) { alert('倍数不能小于1'); return; }
              e.name = newName; e.chars = newChars; e.multiplier = newMult;
              renderTeamList(); editOverlay.remove();
            };
            editOverlay.appendChild(editBox);
            editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
            document.body.appendChild(editOverlay);
          };
          row.querySelector('.del-btn').onclick = function () { teamEntries.splice(idx, 1); renderTeamList(); };
          teamList.appendChild(row);
        })(i);
      }
    }

    renderTeamList();
    teamSection.appendChild(teamList);

    // 添加新配队
    var teamAddRow = document.createElement('div');
    teamAddRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
    var teamNameInput = document.createElement('input');
    teamNameInput.type = 'text'; teamNameInput.placeholder = '配队名称';
    teamNameInput.style.cssText = 'width:90px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
    teamAddRow.appendChild(teamNameInput);
    var teamCharSelects = [];
    for (var ts = 0; ts < 3; ts++) {
      (function (selIdx) {
        var sel = document.createElement('select');
        sel.style.cssText = 'flex:1;min-width:80px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
        var emptyOpt = document.createElement('option');
        emptyOpt.value = ''; emptyOpt.textContent = '角色' + (selIdx + 1);
        sel.appendChild(emptyOpt);
        for (var cn = 0; cn < allCharNames.length; cn++) {
          var o = document.createElement('option');
          o.value = allCharNames[cn]; o.textContent = allCharNames[cn];
          sel.appendChild(o);
        }
        teamCharSelects.push(sel); teamAddRow.appendChild(sel);
        if (selIdx < 2) { var plus = document.createElement('span'); plus.textContent = '+'; plus.style.cssText = 'color:#555;font-size:12px;'; teamAddRow.appendChild(plus); }
      })(ts);
    }
    var teamMultInput = document.createElement('input');
    teamMultInput.type = 'number'; teamMultInput.min = '1'; teamMultInput.max = '3'; teamMultInput.step = '0.05'; teamMultInput.placeholder = '倍数';
    teamMultInput.style.cssText = 'width:55px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:center;';
    teamAddRow.appendChild(teamMultInput);
    var teamAddBtn = document.createElement('button');
    teamAddBtn.textContent = '添加';
    teamAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#f59e0b;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    teamAddBtn.onclick = function () {
      var nm = teamNameInput.value.trim();
      var chars = teamCharSelects.map(function (s) { return s.value; }).filter(Boolean);
      var mult = parseFloat(teamMultInput.value);
      if (!nm) { alert('请输入配队名称'); return; }
      if (chars.length < 2) { alert('请至少选择2名角色'); return; }
      if (isNaN(mult) || mult < 1) { alert('倍数不能小于1'); return; }
      teamEntries.push({ name: nm, chars: chars, multiplier: mult, enabled: true });
      renderTeamList(); teamNameInput.value = ''; teamCharSelects.forEach(function (s) { s.value = ''; }); teamMultInput.value = '';
    };
    teamAddRow.appendChild(teamAddBtn);
    teamSection.appendChild(teamAddRow);

    // 载入默认配队按钮
    var loadDefaultBtn = document.createElement('button');
    loadDefaultBtn.textContent = '载入默认配队';
    loadDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #f59e0b;border-radius:4px;background:transparent;color:#f59e0b;font-size:11px;cursor:pointer;';
    loadDefaultBtn.onclick = function () {
      for (var di = 0; di < DEFAULT_TEAMS.length; di++) {
        var dt = DEFAULT_TEAMS[di];
        if (teamEntries.some(function (e) { return e.name === dt.name; })) continue;
        teamEntries.push({ name: dt.name, chars: [].concat(dt.members || []), multiplier: dt.multiplier, enabled: true });
      }
      renderTeamList();
    };
    teamSection.appendChild(loadDefaultBtn);

    // ===== 7. 多配队额外系数 =====
    var teamMultiSection = document.createElement('div');
    teamMultiSection.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px dashed #1a1a3a;';
    var tmTitle = document.createElement('div');
    tmTitle.style.cssText = 'font-size:12px;font-weight:600;color:#8ecdf5;margin-bottom:6px;';
    tmTitle.textContent = '多配队额外系数';
    teamMultiSection.appendChild(tmTitle);
    var tmDesc = document.createElement('p');
    tmDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:8px;line-height:1.4;';
    tmDesc.innerHTML = '凑满N个配队时，配队溢价额外乘以系数。如2配队×1.1，3配队×1.2。';
    teamMultiSection.appendChild(tmDesc);
    var teamMultiList = document.createElement('div');
    teamMultiList.style.cssText = 'margin-bottom:8px;';
    var teamMultiEntries = (weights.teamMultiBonus || DEFAULT_WEIGHTS.teamMultiBonus).map(function (e) { return { count: e.count, coef: e.coef }; });
    function renderTeamMultiList() {
      teamMultiList.innerHTML = '';
      if (teamMultiEntries.length === 0) { teamMultiList.innerHTML = '<div style="font-size:11px;color:#555;padding:4px 0;">暂无多配队系数</div>'; return; }
      teamMultiEntries.sort(function (a, b) { return a.count - b.count; });
      for (var i = 0; i < teamMultiEntries.length; i++) {
        (function (idx) {
          var e = teamMultiEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;';
          row.innerHTML = '<span style="color:#8ecdf5;font-weight:600;min-width:60px;">' + e.count + '配队</span><span style="color:#555;">→</span><span style="color:#10b981;font-weight:600;">×' + e.coef + '</span><button class="edit-btn" style="margin-left:auto;padding:2px 6px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:10px;cursor:pointer;">编辑</button><button class="del-btn" style="padding:2px 6px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:10px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:280px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#8ecdf5;">编辑多配队系数</div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">配队数量</label>' +
              '<input type="number" class="edit-count" value="' + e.count + '" min="2" max="10" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">额外系数</label>' +
              '<input type="number" class="edit-coef" value="' + e.coef + '" min="1" max="5" step="0.05" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:10px;margin-top:12px;">' +
              '<button class="cancel-edit" style="padding:8px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-edit" style="padding:8px 16px;border:none;border-radius:4px;background:#8ecdf5;color:#1a1a2e;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
            editOverlay.appendChild(editBox);
            document.body.appendChild(editOverlay);
            editBox.querySelector('.cancel-edit').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-edit').onclick = function () {
              var newCount = parseInt(editBox.querySelector('.edit-count').value);
              var newCoef = parseFloat(editBox.querySelector('.edit-coef').value);
              if (isNaN(newCount) || newCount < 2) { alert('配队数至少为2'); return; }
              if (isNaN(newCoef) || newCoef < 1) { alert('系数不能小于1'); return; }
              // 检查与其他条目冲突（除了自己）
              var conflict = teamMultiEntries.find(function (x) { return x !== e && x.count === newCount; });
              if (conflict) { alert('已有' + newCount + '配队的系数，请直接编辑那条'); return; }
              e.count = newCount;
              e.coef = newCoef;
              renderTeamMultiList();
              editOverlay.remove();
            };
            editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
          };
          row.querySelector('.del-btn').onclick = function () { var di = teamMultiEntries.indexOf(e); if (di >= 0) teamMultiEntries.splice(di, 1); renderTeamMultiList(); };
          teamMultiList.appendChild(row);
        })(i);
      }
    }
    renderTeamMultiList();
    teamMultiSection.appendChild(teamMultiList);
    var tmAddRow = document.createElement('div');
    tmAddRow.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;';
    var tmCountInput = document.createElement('input');
    tmCountInput.type = 'number'; tmCountInput.min = '2'; tmCountInput.max = '10'; tmCountInput.placeholder = '配队数';
    tmCountInput.style.cssText = 'width:50px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    tmAddRow.appendChild(tmCountInput);
    var tmUnit = document.createElement('span'); tmUnit.textContent = '配队 →'; tmUnit.style.cssText = 'color:#888;font-size:11px;'; tmAddRow.appendChild(tmUnit);
    var tmCoefInput = document.createElement('input');
    tmCoefInput.type = 'number'; tmCoefInput.min = '1'; tmCoefInput.max = '5'; tmCoefInput.step = '0.05'; tmCoefInput.placeholder = '系数';
    tmCoefInput.style.cssText = 'width:50px;padding:4px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    tmAddRow.appendChild(tmCoefInput);
    var tmAddBtn = document.createElement('button');
    tmAddBtn.textContent = '添加'; tmAddBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#8ecdf5;color:#1a1a2e;font-size:11px;font-weight:600;cursor:pointer;';
    tmAddBtn.onclick = function () {
      var c = parseInt(tmCountInput.value), co = parseFloat(tmCoefInput.value);
      if (isNaN(c) || c < 2) { alert('配队数至少为2'); return; }
      if (isNaN(co) || co < 1) { alert('系数不能小于1'); return; }
      var ex = teamMultiEntries.find(function (e) { return e.count === c; });
      if (ex) ex.coef = co; else teamMultiEntries.push({ count: c, coef: co });
      renderTeamMultiList(); tmCountInput.value = ''; tmCoefInput.value = '';
    };
    tmAddRow.appendChild(tmAddBtn);
    teamMultiSection.appendChild(tmAddRow);
    teamSection.appendChild(teamMultiSection);
    dialog.appendChild(teamSection);

    // ===== 8.5 低命折扣系数 =====
    var flatDiscountSection = document.createElement('div');
    flatDiscountSection.style.cssText = 'margin-bottom:20px;';
    var fdTitle = document.createElement('div');
    fdTitle.style.cssText = 'font-size:14px;font-weight:600;color:#a78bfa;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    fdTitle.textContent = '低命折扣系数（指定级别角色均不超过N命时打折）';
    flatDiscountSection.appendChild(fdTitle);
    var fdDesc = document.createElement('p');
    fdDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    fdDesc.innerHTML = '当账号中指定级别(S/A/B/C/D/E)的所有角色命座均不超过设定值时，折扣系数与限定金阶梯系数取较低值。如指定S+A级且全≤2命，折扣系数0.9。';
    flatDiscountSection.appendChild(fdDesc);

    var flatDiscountEntries = (w.flatDiscountRules || DEFAULT_WEIGHTS.flatDiscountRules).map(function (e) { return { tiers: [].concat(e.tiers || []), maxConst: e.maxConst, discount: e.discount }; });
    var flatDiscountList = document.createElement('div');
    flatDiscountList.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:12px;min-height:30px;';
    var fdAllTiers = ['S', 'A', 'B', 'C', 'D', 'E'];
    function renderFlatDiscountList() {
      flatDiscountList.innerHTML = '';
      if (flatDiscountEntries.length === 0) { flatDiscountList.innerHTML = '<div style="font-size:12px;color:#555;padding:4px 0;">暂无规则，可在下方添加</div>'; return; }
      for (var i = 0; i < flatDiscountEntries.length; i++) {
        (function (idx) {
          var e = flatDiscountEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;flex-wrap:wrap;';
          var tierTagsHtml = '';
          for (var ci = 0; ci < e.tiers.length; ci++) {
            if (ci > 0) tierTagsHtml += '<span style="color:#555;font-size:12px;">+</span>';
            tierTagsHtml += '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(167,139,250,0.15);color:#a78bfa;">' + e.tiers[ci] + '级</span>';
          }
          row.innerHTML =
            '<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">' + tierTagsHtml + '</div>' +
            '<span style="color:#e0e0e0;font-size:12px;">≤ ' + e.maxConst + '命</span>' +
            '<span style="color:#4ade80;font-weight:600;font-size:12px;">× ' + e.discount + '</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#fbbf24;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:340px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#a78bfa;">编辑低命折扣系数规则</div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">级别</label>' +
              '<div class="fd-edit-tier-btns" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">命座上限</label>' +
              '<input type="number" class="fd-edit-maxconst" value="' + e.maxConst + '" min="0" max="6" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">折扣系数（0.1~1）</label>' +
              '<input type="number" class="fd-edit-discount" value="' + e.discount + '" min="0.1" max="1" step="0.05" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
              '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#a78bfa;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
            var editTiers = [].concat(e.tiers);
            var editTierBtnsDiv = editBox.querySelector('.fd-edit-tier-btns');
            function renderEditTierBtns() {
              editTierBtnsDiv.innerHTML = '';
              for (var ti = 0; ti < fdAllTiers.length; ti++) {
                (function (tier) {
                  var btn = document.createElement('button');
                  var selected = editTiers.indexOf(tier) !== -1;
                  btn.textContent = tier + '级';
                  btn.style.cssText = 'padding:4px 12px;border:none;border-radius:4px;font-size:12px;cursor:pointer;' + (selected ? 'background:#a78bfa;color:#fff;' : 'background:#333;color:#888;');
                  btn.onclick = function () {
                    var di = editTiers.indexOf(tier);
                    if (di !== -1) { editTiers.splice(di, 1); } else { editTiers.push(tier); }
                    renderEditTierBtns();
                  };
                  editTierBtnsDiv.appendChild(btn);
                })(fdAllTiers[ti]);
              }
            }
            renderEditTierBtns();
            editBox.querySelector('.cancel-btn').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-btn').onclick = function () {
              var newMaxConst = parseInt(editBox.querySelector('.fd-edit-maxconst').value, 10);
              var newDiscount = parseFloat(editBox.querySelector('.fd-edit-discount').value);
              if (editTiers.length === 0) { alert('请至少选择1个级别'); return; }
              if (isNaN(newMaxConst) || newMaxConst < 0 || newMaxConst > 6) { alert('命座上限应在0~6之间'); return; }
              if (isNaN(newDiscount) || newDiscount < 0.1 || newDiscount > 1) { alert('折扣系数应在0.1~1之间'); return; }
              e.tiers = editTiers; e.maxConst = newMaxConst; e.discount = newDiscount;
              renderFlatDiscountList(); editOverlay.remove();
            };
            editOverlay.appendChild(editBox);
            editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
            document.body.appendChild(editOverlay);
          };
          row.querySelector('.del-btn').onclick = function () { flatDiscountEntries.splice(idx, 1); renderFlatDiscountList(); };
          flatDiscountList.appendChild(row);
        })(i);
      }
    }
    renderFlatDiscountList();
    flatDiscountSection.appendChild(flatDiscountList);

    // 添加新规则
    var fdAddTiers = [];
    var fdAddTierBtnsDiv = document.createElement('div');
    fdAddTierBtnsDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;';
    function renderFdAddTierBtns() {
      fdAddTierBtnsDiv.innerHTML = '';
      for (var ti = 0; ti < fdAllTiers.length; ti++) {
        (function (tier) {
          var btn = document.createElement('button');
          var selected = fdAddTiers.indexOf(tier) !== -1;
          btn.textContent = tier + '级';
          btn.style.cssText = 'padding:4px 12px;border:none;border-radius:4px;font-size:12px;cursor:pointer;' + (selected ? 'background:#a78bfa;color:#fff;' : 'background:#333;color:#888;');
          btn.onclick = function () {
            var di = fdAddTiers.indexOf(tier);
            if (di !== -1) { fdAddTiers.splice(di, 1); } else { fdAddTiers.push(tier); }
            renderFdAddTierBtns();
          };
          fdAddTierBtnsDiv.appendChild(btn);
        })(fdAllTiers[ti]);
      }
    }
    renderFdAddTierBtns();
    flatDiscountSection.appendChild(fdAddTierBtnsDiv);
    var fdInputRow = document.createElement('div');
    fdInputRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
    var fdMaxConstInput = document.createElement('input');
    fdMaxConstInput.type = 'number'; fdMaxConstInput.min = '0'; fdMaxConstInput.max = '6'; fdMaxConstInput.placeholder = '命座上限';
    fdMaxConstInput.style.cssText = 'width:90px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:center;';
    fdInputRow.appendChild(fdMaxConstInput);
    var fdDiscountInput = document.createElement('input');
    fdDiscountInput.type = 'number'; fdDiscountInput.min = '0.1'; fdDiscountInput.max = '1'; fdDiscountInput.step = '0.05'; fdDiscountInput.placeholder = '折扣';
    fdDiscountInput.style.cssText = 'width:90px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:center;';
    fdInputRow.appendChild(fdDiscountInput);
    var fdAddBtn = document.createElement('button');
    fdAddBtn.textContent = '添加规则';
    fdAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#a78bfa;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    fdAddBtn.onclick = function () {
      if (fdAddTiers.length === 0) { alert('请至少选择1个级别'); return; }
      var mc = parseInt(fdMaxConstInput.value, 10);
      var dc = parseFloat(fdDiscountInput.value);
      if (isNaN(mc) || mc < 0 || mc > 6) { alert('命座上限应在0~6之间'); return; }
      if (isNaN(dc) || dc < 0.1 || dc > 1) { alert('折扣系数应在0.1~1之间'); return; }
      flatDiscountEntries.push({ tiers: [].concat(fdAddTiers), maxConst: mc, discount: dc });
      renderFlatDiscountList();
      fdAddTiers.length = 0; renderFdAddTierBtns();
      fdMaxConstInput.value = ''; fdDiscountInput.value = '';
    };
    fdInputRow.appendChild(fdAddBtn);
    flatDiscountSection.appendChild(fdInputRow);

    // 载入默认低命折扣系数
    var fdDefaultBtn = document.createElement('button');
    fdDefaultBtn.textContent = '载入默认低命折扣系数';
    fdDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #a78bfa;border-radius:4px;background:transparent;color:#a78bfa;font-size:11px;cursor:pointer;';
    fdDefaultBtn.onclick = function () {
      for (var di = 0; di < DEFAULT_WEIGHTS.flatDiscountRules.length; di++) {
        var dr = DEFAULT_WEIGHTS.flatDiscountRules[di];
        flatDiscountEntries.push({ tiers: [].concat(dr.tiers), maxConst: dr.maxConst, discount: dr.discount });
      }
      renderFlatDiscountList();
    };
    flatDiscountSection.appendChild(fdDefaultBtn);
    dialog.appendChild(flatDiscountSection);

    // ===== 8.6 C6配队依赖（已合并到五星角色定价的「强绑」功能） =====


    // ===== 9. 其他权重 =====
    var weightsSection = document.createElement('div');
    weightsSection.style.cssText = 'margin-bottom:20px;';
    var wsTitle = document.createElement('div');
    wsTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:12px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    wsTitle.textContent = '其他权重（资源定价 + 折扣参数）';
    weightsSection.appendChild(wsTitle);

    var weightInputs = {};
    var skipKeys = { c6TierWeights: true, effTierWeights: true, c6MultiBonus: true, pullC6Bonus: true, teamMultiBonus: true, flatDiscountRules: true, c6TeamDependency: true, charPrices: true, constPremiums: true, teamPremiums: true, teams: true, pullTiers: true, yellowTiers: true, needSigWeapons: true, pullBase: true, pullBasePrice: true, pullStepPrice: true, pullMaxPrice: true, yellowBase: true, yellowStep: true, yellowBaseCoeff: true, yellowStepCoeff: true, yellowMaxCoeff: true, yellowSegments: true, effYellowSegments: true, effYellowMaxCoeff: true, effYellowSeg1BaseCoeff: true, effYellowSeg1Threshold: true, effYellowSeg1Step: true, effYellowSeg2BaseCoeff: true, effYellowSeg2Threshold: true, effYellowSeg2Step: true, effYellowSeg3BaseCoeff: true, effYellowSeg3Step: true, pullC6Base: true, pullC6BaseBonus: true, pullC6Step: true, pullC6StepBonus: true, pullC6Threshold: true, pullC6MaxWeightedConst: true, pullPerWeightedConst: true, pullPerWeightedConstCount: true, c6Base: true, c6BaseBonus: true, c6Step: true, c6StepBonus: true, teamMates: true, constPrices: true, deletedChars: true, charTierOverride: true, sigWeaponsOverride: true };
    for (var wk of Object.keys(DEFAULT_WEIGHTS)) {
      if (skipKeys[wk]) continue;
      var meta = WEIGHT_LABELS[wk] || { label: wk, desc: '' };
      var wRow = document.createElement('div');
      wRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';
      var wLabelEl = document.createElement('div');
      wLabelEl.style.cssText = 'flex:1;';
      wLabelEl.innerHTML = '<div style="font-size:14px;color:#e0e0e0;">' + meta.label + '</div><div style="font-size:11px;color:#666;">' + meta.desc + '</div>';
      var wInput = document.createElement('input');
      wInput.type = 'number'; wInput.step = '0.01';
      wInput.value = w[wk] != null ? w[wk] : DEFAULT_WEIGHTS[wk];
      wInput.style.cssText = 'width:80px;padding:6px 8px;border:1px solid #0f3460;border-radius:6px;background:#16213e;color:#e0e0e0;font-size:14px;text-align:right;';
      weightInputs[wk] = wInput;
      wRow.appendChild(wLabelEl);
      wRow.appendChild(wInput);
      weightsSection.appendChild(wRow);
    }
    dialog.appendChild(weightsSection);

    // ===== 按钮区 =====
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;position:sticky;bottom:0;background:#1a1a2e;padding:12px 24px 16px;margin:8px -24px 0;border-top:1px solid #0f3460;z-index:5;border-radius:0 0 12px 12px;';

    var resetBtn = document.createElement('button');
    resetBtn.textContent = '加载最新规则';
    resetBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#333;color:#ccc;font-size:14px;font-weight:600;cursor:pointer;';
    resetBtn.onclick = function () {
      // 检查用户是否有自定义配置
      var hasCustom = loadStorage(STORAGE_KEYS.weights, null) != null;
      if (hasCustom && !confirm('检测到您有自定义配置，加载最新规则将覆盖当前设置（保存后生效）。是否继续？')) {
        return;
      }
      // 重置其他权重
      for (var key of Object.keys(DEFAULT_WEIGHTS)) {
        if (skipKeys[key] || !weightInputs[key]) continue;
        weightInputs[key].value = DEFAULT_WEIGHTS[key];
      }
      // 重置角色价格
      charEntries.length = 0;
      deletedChars.length = 0;
      // 重置角色级别覆盖（恢复所有角色到默认级别）
      if (w.charTierOverride) {
        for (var rctName in w.charTierOverride) {
          if (CHAR_LOOKUP[rctName]) {
            var rdefTier = getDefaultTier(rctName);
            if (rdefTier) {
              CHAR_LOOKUP[rctName].tier = rdefTier;
              CHAR_LOOKUP[rctName].isHot = rdefTier === 'S' || rdefTier === 'A' || rdefTier === 'B';
            }
          }
        }
        w.charTierOverride = {};
      }
      var rstDefPrices = buildDefaultCharPrices();
      var rstDefConstPrices = buildDefaultConstPrices();
      for (var rt = 0; rt < tierOrder.length; rt++) {
        var rtk = tierOrder[rt];
        if (!CHAR_TIERS[rtk]) continue;
        var rTier = CHAR_TIERS[rtk];
        for (var rc = 0; rc < rTier.chars.length; rc++) {
          var rName = rTier.chars[rc];
          charEntries.push({
            name: rName,
            weapon: SIG_WEAPONS[rName] || '',
            price: rstDefPrices[rName] != null ? rstDefPrices[rName] : rTier.price,
            tier: rtk,
            constPrices: rstDefConstPrices[rName] ? Object.assign({}, rstDefConstPrices[rName]) : {},
          });
        }
      }
      renderCharList();
      // 重置抽数阶梯公式参数
      pfBaseInp.value = DEFAULT_PULL_FORMULA.pullBase;
      pfBasePriceInp.value = DEFAULT_PULL_FORMULA.pullBasePrice;
      pfStepPriceInp.value = DEFAULT_PULL_FORMULA.pullStepPrice;
      pfMaxPriceInp.value = DEFAULT_PULL_FORMULA.pullMaxPrice != null ? DEFAULT_PULL_FORMULA.pullMaxPrice : 0;
      updatePullPreview();
      // 重置满命溢价公式参数
      c6BaseInp.value = DEFAULT_WEIGHTS.c6Base;
      c6BaseBonusInp.value = DEFAULT_WEIGHTS.c6BaseBonus * 100;
      c6StepInp.value = DEFAULT_WEIGHTS.c6Step;
      c6StepBonusInp.value = DEFAULT_WEIGHTS.c6StepBonus * 100;
      updateC6Preview();
      // 重置满命抽数加成公式参数
      pc6BaseInp.value = DEFAULT_WEIGHTS.pullC6Base;
      pc6BaseBonusInp.value = DEFAULT_WEIGHTS.pullC6BaseBonus * 100;
      pc6StepInp.value = DEFAULT_WEIGHTS.pullC6Step;
      pc6StepBonusInp.value = DEFAULT_WEIGHTS.pullC6StepBonus * 100;
      pc6ThresholdInp.value = DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400;
      pc6MaxWCInp.value = DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20;
      pc6PullPerWCInp.value = DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450;
      pc6PullPerWCCountInp.value = DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1;
      updatePullC6Preview();
      // 重置满命权重
      for (var tw = 0; tw < c6TierList.length; tw++) {
        if (c6WeightInputs[c6TierList[tw]]) c6WeightInputs[c6TierList[tw]].value = DEFAULT_WEIGHTS.c6TierWeights[c6TierList[tw]] || 0;
      }
      // 重置有效金级别系数
      for (var tw2 = 0; tw2 < effTierList.length; tw2++) {
        if (effTierWeightInputs[effTierList[tw2]]) effTierWeightInputs[effTierList[tw2]].value = (DEFAULT_WEIGHTS.effTierWeights || {})[effTierList[tw2]] != null ? DEFAULT_WEIGHTS.effTierWeights[effTierList[tw2]] : 1;
      }
      // 重置有效金系数
      effSeg1BaseInp.value = (DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff != null) ? DEFAULT_WEIGHTS.effYellowSeg1BaseCoeff : 0.3;
      effSeg1TInp.value = (DEFAULT_WEIGHTS.effYellowSeg1Threshold != null) ? DEFAULT_WEIGHTS.effYellowSeg1Threshold : 10;
      effSeg1StepInp.value = (DEFAULT_WEIGHTS.effYellowSeg1Step != null) ? DEFAULT_WEIGHTS.effYellowSeg1Step : 0.03;
      effSeg2BaseInp.value = (DEFAULT_WEIGHTS.effYellowSeg2BaseCoeff != null) ? DEFAULT_WEIGHTS.effYellowSeg2BaseCoeff : 0.4;
      effSeg2TInp.value = (DEFAULT_WEIGHTS.effYellowSeg2Threshold != null) ? DEFAULT_WEIGHTS.effYellowSeg2Threshold : 40;
      effSeg2StepInp.value = (DEFAULT_WEIGHTS.effYellowSeg2Step != null) ? DEFAULT_WEIGHTS.effYellowSeg2Step : 0.02;
      effSeg3BaseInp.value = (DEFAULT_WEIGHTS.effYellowSeg3BaseCoeff != null) ? DEFAULT_WEIGHTS.effYellowSeg3BaseCoeff : 0.88;
      effSeg3StepInp.value = (DEFAULT_WEIGHTS.effYellowSeg3Step != null) ? DEFAULT_WEIGHTS.effYellowSeg3Step : 0.008;
      effMaxCoeffInp.value = (DEFAULT_WEIGHTS.effYellowMaxCoeff != null) ? DEFAULT_WEIGHTS.effYellowMaxCoeff : 2.5;
      updateYellowPreview();
      // 重置配队
      teamEntries.length = 0;
      for (var td = 0; td < DEFAULT_TEAMS.length; td++) {
        teamEntries.push({ name: DEFAULT_TEAMS[td].name, chars: [].concat(DEFAULT_TEAMS[td].members || []), multiplier: DEFAULT_TEAMS[td].multiplier, enabled: true });
      }
      renderTeamList();
      // 重置多配队系数
      teamMultiEntries.length = 0;
      for (var tm = 0; tm < DEFAULT_WEIGHTS.teamMultiBonus.length; tm++) {
        teamMultiEntries.push({ count: DEFAULT_WEIGHTS.teamMultiBonus[tm].count, coef: DEFAULT_WEIGHTS.teamMultiBonus[tm].coef });
      }
      renderTeamMultiList();
      // 重置需要专武（从默认列表恢复勾选状态）
      var _defSigSet = {};
      for (var dsi = 0; dsi < DEFAULT_NEED_SIG_WEAPONS.length; dsi++) {
        var dsn = typeof DEFAULT_NEED_SIG_WEAPONS[dsi] === 'string' ? DEFAULT_NEED_SIG_WEAPONS[dsi] : DEFAULT_NEED_SIG_WEAPONS[dsi].name;
        _defSigSet[dsn] = true;
      }
      for (var ci2 = 0; ci2 < charEntries.length; ci2++) {
        charEntries[ci2].needSig = !!_defSigSet[charEntries[ci2].name];
      }
      renderCharList();
      // 重置低命折扣系数
      flatDiscountEntries.length = 0;
      for (var fdi = 0; fdi < DEFAULT_WEIGHTS.flatDiscountRules.length; fdi++) {
        flatDiscountEntries.push({ tiers: [].concat(DEFAULT_WEIGHTS.flatDiscountRules[fdi].tiers), maxConst: DEFAULT_WEIGHTS.flatDiscountRules[fdi].maxConst, discount: DEFAULT_WEIGHTS.flatDiscountRules[fdi].discount });
      }
      renderFlatDiscountList();
      // 重置强绑队友（从默认 c6TeamDependency 迁移恢复勾选状态）
      var _defMatesMap = {};
      var _defDep = DEFAULT_WEIGHTS.c6TeamDependency || {};
      for (var ddn in _defDep) {
        if (!_defDep.hasOwnProperty(ddn)) continue;
        var ddInfo = _defDep[ddn];
        var ddMates = Array.isArray(ddInfo.teammate) ? ddInfo.teammate : [ddInfo.teammate];
        if (ddMates.length > 0 && ddMates[0]) _defMatesMap[ddn] = [].concat(ddMates);
      }
      for (var ci3 = 0; ci3 < charEntries.length; ci3++) {
        charEntries[ci3].teamMates = _defMatesMap[charEntries[ci3].name] ? [].concat(_defMatesMap[charEntries[ci3].name]) : [];
      }
      renderCharList();
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#333;color:#ccc;font-size:14px;font-weight:600;cursor:pointer;';
    cancelBtn.onclick = function () { overlay.remove(); };

    var saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#e94560;color:#fff;font-size:14px;font-weight:600;cursor:pointer;';
    saveBtn.onclick = function () {
      // 收集其他权重
      var newW = {};
      for (var key of Object.keys(DEFAULT_WEIGHTS)) {
        if (skipKeys[key] || !weightInputs[key]) {
          newW[key] = w[key] != null ? w[key] : DEFAULT_WEIGHTS[key];
        } else {
          var val = parseFloat(weightInputs[key].value);
          newW[key] = isNaN(val) ? DEFAULT_WEIGHTS[key] : val;
        }
      }

      // 收集角色价格
      var newCharPrices = {};
      var newSigWeapons = {};
      for (var cei = 0; cei < charEntries.length; cei++) {
        newCharPrices[charEntries[cei].name] = charEntries[cei].price;
        if (charEntries[cei].weapon) {
          newSigWeapons[charEntries[cei].name] = charEntries[cei].weapon;
        }
      }
      newW.charPrices = newCharPrices;
      newW.deletedChars = deletedChars;
      if (Object.keys(newSigWeapons).length > 0) {
        newW.sigWeaponsOverride = newSigWeapons;
      }

      // 收集角色级别覆盖（只保存与默认级别不同的角色）
      var newCharTierOverride = {};
      for (var cei2 = 0; cei2 < charEntries.length; cei2++) {
        var entName = charEntries[cei2].name;
        var entTier = charEntries[cei2].tier;
        var defTier = getDefaultTier(entName);
        if (defTier !== null) {
          // 内置角色：只在级别与默认不同时保存
          if (entTier !== defTier) {
            newCharTierOverride[entName] = entTier;
          }
        } else {
          // 自定义角色：级别不是默认C时保存
          if (entTier !== 'C') {
            newCharTierOverride[entName] = entTier;
          }
        }
      }
      newW.charTierOverride = newCharTierOverride;

      // 收集命座定价（绝对价格）和向后兼容的命座溢价
      var newConstPrices = {};
      var newConstPremiums = {};
      for (var ei = 0; ei < charEntries.length; ei++) {
        if (charEntries[ei].constPrices && Object.keys(charEntries[ei].constPrices).length > 0) {
          var _cpName = charEntries[ei].name;
          var _cpBase = charEntries[ei].price;
          newConstPrices[_cpName] = {};
          newConstPremiums[_cpName] = {};
          for (var cpl in charEntries[ei].constPrices) {
            if (!charEntries[ei].constPrices.hasOwnProperty(cpl)) continue;
            var cpVal = charEntries[ei].constPrices[cpl];
            newConstPrices[_cpName][cpl] = cpVal;
            // 转换为旧格式溢价（绝对价 - 基础价）
            var cpPrem = cpVal - _cpBase;
            if (cpPrem > 0) {
              newConstPremiums[_cpName][cpl] = cpPrem;
            }
          }
        }
      }
      // 保留不在charEntries中的角色命座定价（如已删除角色），避免数据丢失
      var _existingCP = w.constPrices || {};
      var _charEntryNames = {};
      for (var _cei3 = 0; _cei3 < charEntries.length; _cei3++) _charEntryNames[charEntries[_cei3].name] = true;
      for (var _epName in _existingCP) {
        if (!_existingCP.hasOwnProperty(_epName)) continue;
        if (!_charEntryNames[_epName]) {
          newConstPrices[_epName] = _existingCP[_epName];
        }
      }
      // 保留旧格式溢价中不在charEntries中的角色
      var _existingPrems = w.constPremiums || {};
      for (var _epName2 in _existingPrems) {
        if (!_existingPrems.hasOwnProperty(_epName2)) continue;
        if (!_charEntryNames[_epName2]) {
          newConstPremiums[_epName2] = _existingPrems[_epName2];
        }
      }
      newW.constPrices = newConstPrices;
      newW.constPremiums = newConstPremiums;

      // 收集配队溢价
      var newTeamPremiums = {};
      for (var ti = 0; ti < teamEntries.length; ti++) {
        newTeamPremiums[teamEntries[ti].name] = { chars: teamEntries[ti].chars, multiplier: teamEntries[ti].multiplier, enabled: teamEntries[ti].enabled };
      }
      newW.teamPremiums = newTeamPremiums;

      // 收集多配队系数（去重：相同 count 只保留最后一条）
      var newTeamMultiBonus = [];
      var tmSeen = {};
      for (var tmi = 0; tmi < teamMultiEntries.length; tmi++) {
        tmSeen[teamMultiEntries[tmi].count] = { count: teamMultiEntries[tmi].count, coef: teamMultiEntries[tmi].coef };
      }
      for (var tmk in tmSeen) { newTeamMultiBonus.push(tmSeen[tmk]); }
      newTeamMultiBonus.sort(function (a, b) { return a.count - b.count; });
      newW.teamMultiBonus = newTeamMultiBonus;

      // 收集抽数阶梯公式参数
      var _pb = parseFloat(pfBaseInp.value); newW.pullBase = !isNaN(_pb) ? _pb : DEFAULT_PULL_FORMULA.pullBase;
      var _pbp = parseFloat(pfBasePriceInp.value); newW.pullBasePrice = !isNaN(_pbp) ? _pbp : DEFAULT_PULL_FORMULA.pullBasePrice;
      var _psp = parseFloat(pfStepPriceInp.value); newW.pullStepPrice = !isNaN(_psp) ? _psp : DEFAULT_PULL_FORMULA.pullStepPrice;
      var _pmp = parseFloat(pfMaxPriceInp.value); newW.pullMaxPrice = !isNaN(_pmp) ? _pmp : (DEFAULT_PULL_FORMULA.pullMaxPrice != null ? DEFAULT_PULL_FORMULA.pullMaxPrice : 0);

      // 收集满命抽数加成公式参数
      var _pc6b = parseFloat(pc6BaseInp.value); newW.pullC6Base = !isNaN(_pc6b) ? _pc6b : DEFAULT_WEIGHTS.pullC6Base;
      newW.pullC6BaseBonus = (parseFloat(pc6BaseBonusInp.value) || 0) / 100;
      var _pc6s = parseFloat(pc6StepInp.value); newW.pullC6Step = (!isNaN(_pc6s) && _pc6s > 0) ? _pc6s : DEFAULT_WEIGHTS.pullC6Step;
      newW.pullC6StepBonus = (parseFloat(pc6StepBonusInp.value) || 0) / 100;
      var _pc6t = parseFloat(pc6ThresholdInp.value); newW.pullC6Threshold = !isNaN(_pc6t) ? _pc6t : (DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400);
      var _pc6mwc = parseFloat(pc6MaxWCInp.value); newW.pullC6MaxWeightedConst = !isNaN(_pc6mwc) ? _pc6mwc : (DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20);
      var _pc6ppwc = parseFloat(pc6PullPerWCInp.value); newW.pullPerWeightedConst = !isNaN(_pc6ppwc) ? _pc6ppwc : (DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450);
      var _pc6ppwcc = parseFloat(pc6PullPerWCCountInp.value); newW.pullPerWeightedConstCount = !isNaN(_pc6ppwcc) ? _pc6ppwcc : (DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1);

      // 收集满命溢价公式参数
      var _c6b = parseFloat(c6BaseInp.value); newW.c6Base = !isNaN(_c6b) ? _c6b : DEFAULT_WEIGHTS.c6Base;
      newW.c6BaseBonus = (parseFloat(c6BaseBonusInp.value) || 0) / 100;
      var _c6s = parseFloat(c6StepInp.value); newW.c6Step = (!isNaN(_c6s) && _c6s > 0) ? _c6s : DEFAULT_WEIGHTS.c6Step;
      newW.c6StepBonus = (parseFloat(c6StepBonusInp.value) || 0) / 100;

      // 收集满命权重
      var newC6Weights = {};
      for (var cw = 0; cw < c6TierList.length; cw++) {
        var cwVal = parseFloat(c6WeightInputs[c6TierList[cw]].value);
        newC6Weights[c6TierList[cw]] = isNaN(cwVal) ? 0 : cwVal;
      }
      newW.c6TierWeights = newC6Weights;

      // 收集有效金级别系数
      var newEffTierWeights = {};
      for (var etw2 = 0; etw2 < effTierList.length; etw2++) {
        var etwVal = parseFloat(effTierWeightInputs[effTierList[etw2]].value);
        newEffTierWeights[effTierList[etw2]] = isNaN(etwVal) ? 1 : etwVal;
      }
      newW.effTierWeights = newEffTierWeights;

      // 收集有效金系数参数（动态分段数组）
      var _emc = parseFloat(effMaxCoeffInp.value); newW.effYellowMaxCoeff = !isNaN(_emc) ? _emc : 2.5;
      var newSegs = [];
      for (var si3 = 0; si3 < effSegInputs.length; si3++) {
        var inp3 = effSegInputs[si3];
        var _b = parseFloat(inp3.baseInp.value);
        var _t = inp3.thresholdInp ? parseFloat(inp3.thresholdInp.value) : null;
        var _s = parseFloat(inp3.stepInp.value);
        newSegs.push({
          baseCoeff: isNaN(_b) ? 0 : _b,
          threshold: isNaN(_t) ? null : _t,
          step: isNaN(_s) ? 0.001 : _s
        });
      }
      newW.effYellowSegments = newSegs;

      // 收集低命折扣系数规则
      var newFlatDiscountRules = [];
      for (var fdi2 = 0; fdi2 < flatDiscountEntries.length; fdi2++) {
        if (flatDiscountEntries[fdi2].tiers.length > 0) {
          newFlatDiscountRules.push({ tiers: flatDiscountEntries[fdi2].tiers, maxConst: flatDiscountEntries[fdi2].maxConst, discount: flatDiscountEntries[fdi2].discount });
        }
      }
      newW.flatDiscountRules = newFlatDiscountRules;

      // 收集强绑队友（从角色定价行的 teamMates 生成）
      var newTeamMates = {};
      for (var tmi = 0; tmi < charEntries.length; tmi++) {
        var te = charEntries[tmi];
        if (te.teamMates && te.teamMates.length > 0) {
          newTeamMates[te.name] = [].concat(te.teamMates);
        }
      }
      newW.teamMates = newTeamMates;

      // 收集需要专武的角色（从角色定价行的勾选状态生成）
      newW.needSigWeapons = charEntries.filter(function(e) { return e.needSig; }).map(function(e) { return e.name; });

      // 从 teamPremiums 生成 teams 数组
      newW.teams = [];
      for (var tn of Object.keys(newTeamPremiums)) {
        var td2 = newTeamPremiums[tn];
        if (td2 && td2.enabled !== false) {
          newW.teams.push({ name: tn, members: td2.chars || [], multiplier: td2.multiplier || 1.0 });
        }
      }

      // 保存并刷新
      if (!saveWeights(newW)) {
        alert('保存失败：localStorage 空间不足。请先清理部分监控数据后重试。');
        return;
      }
      weights = newW;
      overlay.remove();
      // 全量重算表格中已有行的估值
      recalcAllRows();
      refreshTableDisplay();
    };

    btnArea.appendChild(resetBtn);
    btnArea.appendChild(cancelBtn);
    btnArea.appendChild(saveBtn);

    // 导出配置按钮
    var exportBtn = document.createElement('button');
    exportBtn.textContent = '导出配置';
    exportBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#0f3460;color:#8ecdf5;font-size:14px;font-weight:600;cursor:pointer;';
    exportBtn.onclick = function () {
      var config = loadStorage(STORAGE_KEYS.weights, {}) || {};
      var exportData = JSON.parse(JSON.stringify(config));
      delete exportData.constPrices;
      delete exportData.deletedChars;
      delete exportData.sigWeaponsOverride;
      var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mw_monitor_config_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    };
    btnArea.appendChild(exportBtn);

    // 导入配置按钮
    var importBtn = document.createElement('button');
    importBtn.textContent = '导入配置';
    importBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#1a3a1a;color:#4ade80;font-size:14px;font-weight:600;cursor:pointer;';
    importBtn.onclick = function () {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      fileInput.style.display = 'none';
      fileInput.onchange = function (ev) {
        var file = ev.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          try {
            var imported = JSON.parse(e.target.result);
            if (typeof imported !== 'object' || imported === null) {
              alert('导入失败：文件内容不是有效的配置对象');
              return;
            }
            // 获取当前已保存的配置（保留监控助手特有字段）
            var current = loadStorage(STORAGE_KEYS.weights, {}) || {};
            // 合并导入的配置（导入的覆盖当前的，但保留导入文件中不存在的字段）
            var merged = Object.assign({}, current, imported);
            // 嵌套对象单独合并
            if (imported.charPrices) {
              merged.charPrices = Object.assign({}, current.charPrices || {}, imported.charPrices);
            }
            // 导出的配置会去除 constPrices（内部派生字段），只保留 constPremiums。
            // 如果导入文件没有 constPrices 但有 constPremiums，必须清除旧的 constPrices，
            // 否则 loadWeights() 会优先使用过时的 constPrices 而忽略新导入的 constPremiums。
            if (imported.constPrices) {
              merged.constPrices = Object.assign({}, current.constPrices || {}, imported.constPrices);
            } else if (imported.constPremiums) {
              delete merged.constPrices;
            }
            if (imported.constPremiums) {
              merged.constPremiums = Object.assign({}, current.constPremiums || {}, imported.constPremiums);
            }
            if (imported.c6TierWeights) {
              merged.c6TierWeights = Object.assign({}, current.c6TierWeights || {}, imported.c6TierWeights);
            }
            if (imported.effTierWeights) {
              merged.effTierWeights = Object.assign({}, current.effTierWeights || {}, imported.effTierWeights);
            }
            if (imported.teamMates) {
              merged.teamMates = Object.assign({}, current.teamMates || {}, imported.teamMates);
            }
            // 列表类：优先使用导入的
            if (imported.teamMultiBonus) merged.teamMultiBonus = imported.teamMultiBonus;
            if (imported.flatDiscountRules) merged.flatDiscountRules = imported.flatDiscountRules;
            if (imported.c6MultiBonus) merged.c6MultiBonus = imported.c6MultiBonus;
            if (imported.yellowSegments) merged.yellowSegments = imported.yellowSegments;
            // 角色级别覆盖、已删除角色、专武映射：合并导入（导入的覆盖当前的）
            if (imported.charTierOverride) {
              merged.charTierOverride = Object.assign({}, current.charTierOverride || {}, imported.charTierOverride);
            }
            if (imported.deletedChars) {
              merged.deletedChars = imported.deletedChars;
            }
            if (imported.sigWeaponsOverride) {
              merged.sigWeaponsOverride = Object.assign({}, current.sigWeaponsOverride || {}, imported.sigWeaponsOverride);
            }

            // 保存合并后的配置
            if (saveWeights(merged)) {
              // 更新配置版本号
              saveStorage(STORAGE_KEYS.configVersion, CONFIG_VERSION);
              // 更新运行时weights变量并重算表格估值
              weights = loadWeights();
              recalcAllRows();
              refreshTableDisplay();
              alert('导入成功！已合并 ' + Object.keys(imported).length + ' 个配置项，估值已刷新。');
              // 关闭当前弹窗并重新打开以刷新界面
              overlay.remove();
              openSettings();
            } else {
              alert('导入失败：保存配置时出错，可能是存储空间不足');
            }
          } catch (err) {
            alert('导入失败：' + err.message);
          }
        };
        reader.readAsText(file);
      };
      fileInput.click();
    };
    btnArea.appendChild(importBtn);

    dialog.appendChild(btnArea);

    overlay.appendChild(dialog);
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  /**
   * 更新顶部状态文字
   */
  function updateStatusText() {
    if (!dom.statusText) return;

    const monitorStr = monitorRunning ? '监控开' : '监控关';
    const notifyStr = notifyEnabled ? '通知开' : '通知关';
    const interceptStr = lastInterceptTime ?
      '列表接口已拦截: ' + formatDateTime(lastInterceptTime) : '列表接口未拦截';

    const dropCount = tableData.filter(r => r.status === '降价').length;

    dom.statusText.textContent =
      'pxb7 监控 | ' + interceptStr +
      ' | 表格' + tableData.length + '条 (上限' + CONFIG.maxTableRows + ')' +
      (dropCount > 0 ? ' | 降价' + dropCount + '条' : '') +
      ' | 估值≥' + threshold + '%' +
      ' | ' + monitorStr + '·' + notifyStr;

    // 更新按钮状态
    if (dom.btnMonitor) {
      if (monitorRunning) {
        dom.btnMonitor.textContent = '停止监控';
        dom.btnMonitor.classList.add('mw-btn-active');
      } else {
        dom.btnMonitor.textContent = '开始监控';
        dom.btnMonitor.classList.remove('mw-btn-active');
      }
    }

    if (dom.btnNotify) {
      if (notifyEnabled) {
        dom.btnNotify.textContent = '停止通知';
        dom.btnNotify.classList.add('mw-btn-green');
      } else {
        dom.btnNotify.textContent = '开启通知';
        dom.btnNotify.classList.remove('mw-btn-green');
      }
    }

    if (dom.inputThreshold) {
      dom.inputThreshold.value = threshold;
    }
  }

  /**
   * 更新底部状态栏
   */
  function updateBottomBar() {
    if (!dom.bottomLeft) return;

    const lastStr = lastRefreshTime > 0 ? formatDateTime(new Date(lastRefreshTime)) : '-';
    let countdownStr = '-';

    if (monitorRunning && nextRefreshTime > 0) {
      const remaining = Math.max(0, Math.ceil((nextRefreshTime - Date.now()) / 1000));
      countdownStr = remaining + '秒';
    }

    dom.bottomLeft.textContent = '最后刷新: ' + lastStr + ' | 下次刷新: ' + countdownStr +
      (lastRefreshError ? ' | ❌ ' + lastRefreshError : '');

    // 重置每分钟计数
    if (Date.now() - detailMinuteStart >= 60000) {
      detailCallsThisMinute = 0;
      detailMinuteStart = Date.now();
    }

    dom.bottomRight.textContent =
      '详情API: ' + detailCallsThisMinute + '/' + CONFIG.detailRateLimit + ' (本分钟)' +
      ' | 队列: ' + detailQueue.length +
      ' | 已见ID: ' + seenIds.length;
  }

  /**
   * 格式化日期时间
   */
  function formatDateTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' +
      String(date.getHours()).padStart(2, '0') + ':' +
      String(date.getMinutes()).padStart(2, '0') + ':' +
      String(date.getSeconds()).padStart(2, '0');
  }

  // ============================================================
  // 自动抢购
  // ============================================================

  /**
   * 自动抢购：打开商品页并自动点击"立即购买"
   * 通过URL参数传递指令，商品页脚本检测到后自动执行
   */
  function autoBuy(productId, diff, productUniqueNo) {
    console.log('[鸣潮监控] 自动抢购触发: ' + productId + ' 差价' + diff.toFixed(0) + '元');
    var buyUrl;
    if (productId.indexOf('pz_') === 0) {
      buyUrl = pzdsUrls().pay + (productUniqueNo || productId.replace(/^pz_/, ''));
    } else if (productId.indexOf('kjs_') === 0) {
      // 氪金兽无自动付款链接，跳转商品详情页
      buyUrl = KJS_URLS.detail + (productUniqueNo || productId.replace(/^kjs_/, ''));
    } else if (productId.indexOf('ysy_') === 0) {
      // 易手游无自动付款链接，跳转商品详情页
      buyUrl = ysyUrls().detail + (productUniqueNo || productId.replace(/^ysy_/, '')) + '&shop_source=2';
    } else if (productId.indexOf('qy_') === 0) {
      // 7881无自动付款链接，跳转商品详情页（https://search.7881.com/{goodsId}.html）
      buyUrl = qyUrls().detail + (productUniqueNo || productId.replace(/^qy_/, '')) + '.html';
    } else {
      buyUrl = 'https://www.pxb7.com/product/' + productId + '/1?autobuy=1';
    }
    // 尝试打开新标签页（可能被浏览器拦截，用户需允许弹窗）
    var win = window.open(buyUrl, '_blank');
    if (!win) {
      console.warn('[鸣潮监控] 弹窗被拦截，请允许本站弹窗以使用自动抢购');
      // 降级：在当前页跳转（会离开监控列表页）
      // 不自动跳转，仅提示
      showAlertBanner('自动抢购-弹窗被拦截', '请允许弹窗后重试，或手动点击查看\n差价' + diff.toFixed(0) + '元', productId);
    } else {
      showAlertBanner('自动抢购已触发', '已打开商品页并自动点击购买\n差价' + diff.toFixed(0) + '元，请尽快扫码支付', productId);
      // 急促报警声
      if (pushConfig.soundAlert) {
        beepMultiple(8);
      }
    }
  }

  /**
   * 商品页自动购买逻辑（在商品详情页执行）
   * 检测URL中的 autobuy=1 参数，自动点击"立即购买"按钮
   */
  function initAutoBuyOnProductPage() {
    var url = window.location.href;
    if (url.indexOf('autobuy=1') === -1) return;

    console.log('[鸣潮监控] 自动购买模式已激活，等待页面加载完成...');

    // 等待页面加载完成后查找"立即购买"按钮
    function tryClickBuyButton(attempt) {
      attempt = attempt || 0;
      if (attempt > 30) {
        console.warn('[鸣潮监控] 自动购买：未找到购买按钮（可能已售或页面异常）');
        return;
      }

      // 查找"立即购买"按钮（螃蟹网的按钮文字可能是"立即购买"）
      var buyBtn = null;

      // 方式1：查找包含"立即购买"文字的按钮
      var allBtns = document.querySelectorAll('button, a, div, span');
      for (var i = 0; i < allBtns.length; i++) {
        var el = allBtns[i];
        var text = (el.textContent || '').trim();
        if (text === '立即购买' || text === '立即抢购') {
          buyBtn = el;
          break;
        }
      }

      // 方式2：查找class或id中包含buy/purchase的元素
      if (!buyBtn) {
        buyBtn = document.querySelector('[class*="buy-btn"], [class*="purchase"], [class*="submit-order"], [id*="buyBtn"]');
      }

      if (buyBtn) {
        console.log('[鸣潮监控] 自动购买：找到购买按钮，1秒后自动点击');
        setTimeout(function() {
          buyBtn.click();
          console.log('[鸣潮监控] 自动购买：已点击购买按钮');
          // 等待跳转到确认页
          setTimeout(function() {
            // 如果还在商品页（没跳转），尝试再次点击
            if (window.location.href.indexOf('autobuy=1') !== -1) {
              console.log('[鸣潮监控] 自动购买：页面未跳转，再次尝试');
              buyBtn.click();
            }
          }, 2000);
        }, 1000);
      } else {
        // 未找到按钮，1秒后重试
        setTimeout(function() { tryClickBuyButton(attempt + 1); }, 1000);
      }
    }

    // 页面加载后开始尝试
    if (document.readyState === 'complete') {
      setTimeout(function() { tryClickBuyButton(); }, 1500);
    } else {
      window.addEventListener('load', function() {
        setTimeout(function() { tryClickBuyButton(); }, 1500);
      });
    }
  }

  // ============================================================
  // 通知
  // ============================================================

  /**
   * 构建通知标题和内容（统一格式，含角色明细、资源明细等）
   * @param {string} prefix - 通知前缀（秒杀/降价/高差价/重架/指定账号）
   * @param {object} row - 表格行数据（含 valuation, parsed, showTitle, productUniqueNo, value, price, ratio）
   * @param {number|null} oldPrice - 原价（新发现账号传null）
   * @param {number} newPrice - 现价/标价
   * @param {string} [suffix] - 标题额外后缀（如指定账号的角色匹配信息）
   * @returns {object} { title, body }
   */
  function buildNotifyContent(prefix, row, oldPrice, newPrice, suffix) {
    const value = row.value || (row.valuation && row.valuation.totalValue) || 0;
    const ratio = row.ratio || (row.valuation && row.valuation.ratio) || 0;
    const diff = value - newPrice;
    const pullCount = row.parsed && row.parsed.pulls ? Math.round(row.parsed.pulls) : 0;
    const uniqueNo = row.productUniqueNo || '';
    const valuation = row.valuation;

    // ===== 提取核心卖点数据 =====
    var fullConstChars = [];
    var yellowCount = 0;
    var effectiveYellow = 0;
    var limitedYellow = 0;
    var teamCount = 0;
    var level = 0;
    var fiveStarCount = 0;
    var fourStarCount = 0;
    if (valuation) {
      if (valuation.charBreakdown) {
        fullConstChars = valuation.charBreakdown.filter(function(cb) { return cb.const >= 6 && cb.tier && cb.tier !== 'E'; });
      }
      if (valuation.yellowInfo) yellowCount = valuation.yellowInfo.rawYellowCount || valuation.yellowInfo.yellowCount || 0;
      effectiveYellow = valuation.effectiveYellow || 0;
      if (valuation.yellowInfo) limitedYellow = valuation.yellowInfo.limitedYellow || 0;
      if (valuation.satisfiedTeams) teamCount = valuation.satisfiedTeams.length;
      level = valuation.level || 0;
      fiveStarCount = valuation.fiveStarChars || 0;
      fourStarCount = valuation.fourStarChars || 0;
    }

    // ===== 标题：差价 + 现价 + 估价 + 类型 + 平台 =====
    var platformName = row.platform === 'pzds' ? '盼之' : (row.platform === 'kjs' ? '氪金兽' : (row.platform === 'qy' ? '7881' : (row.platform === 'ysy' ? '易手游' : '螃蟹网')));
    var title = '差价¥' + diff.toFixed(0) + ' 现价¥' + newPrice.toFixed(0) + ' 估价¥' + value.toFixed(0) + ' ' + prefix + ' ' + platformName + '·' + G().name;
    if (suffix) title += ' ' + suffix;

    // ===== 角色明细（按价值降序取前10）=====
    var charDetailLines = [];
    if (valuation && valuation.charBreakdown && valuation.charBreakdown.length > 0) {
      var topChars = valuation.charBreakdown
        .slice()
        .sort(function(a, b) { return b.value - a.value; })
        .slice(0, 10);
      charDetailLines = topChars.map(function(cb) {
        var constStr = cb.const > 0 ? (cb.const === 6 ? '满' : cb.const + G().constUnitDisplay) : '';
        var tier = cb.tier || '';
        return cb.name + constStr + ' ' + cb.value + '元' + (tier ? ' [' + tier + ']' : '');
      });
    }

    // ===== 资源明细 =====
    var resourceLines = [];
    if (valuation) {
      if (valuation.pullValue > 0 && valuation.pullInfo) {
        var pinfo = valuation.pullInfo;
        var pullStr = pinfo.pulls + '抽 ' + Math.round(pinfo.baseTotal) + '元';
        if (pinfo.c6Bonus > 0) {
          pullStr += '(+满命' + Math.round((pinfo.c6Multiplier || 0) * 100) + '%:' + Math.round(pinfo.c6Bonus) + '元)';
        }
        resourceLines.push(pullStr);
      }
      if (valuation.fullConstPremium > 0) resourceLines.push('满命溢价:+' + Math.round(valuation.fullConstPremium) + '元');
      if (valuation.teamPremium > 0) resourceLines.push('配队溢价:+' + Math.round(valuation.teamPremium) + '元');
      if (valuation.otherResources > 0) resourceLines.push('其他:' + Math.round(valuation.otherResources) + '元');
    }

    // ===== 估价计算明细 =====
    var calcLines = [];
    if (valuation) {
      var cv = valuation.charValue || 0;
      var fcp = valuation.fullConstPremium || 0;
      var tp = valuation.teamPremium || 0;
      var pv = valuation.pullValue || 0;
      var or = valuation.otherResources || 0;
      var subtotal = cv + fcp + tp + pv + or;

      calcLines.push('角色价值: ¥' + Math.round(cv));
      // 无专武折扣
      if (valuation.sigDiscountNotes && valuation.sigDiscountNotes.length > 0) {
        calcLines.push('无专武折扣: ' + valuation.sigDiscountNotes.join('; '));
      }
      // 强绑折扣
      if (valuation.c6DepNotes && valuation.c6DepNotes.length > 0) {
        calcLines.push('强绑折扣: ' + valuation.c6DepNotes.join('; '));
      }
      if (fcp > 0) {
        var c6Note = (valuation.c6Bonus && valuation.c6Bonus.notes && valuation.c6Bonus.notes.length > 0)
          ? ' (' + valuation.c6Bonus.notes.join('; ') + ')' : '';
        calcLines.push('+满命溢价: +¥' + Math.round(fcp) + c6Note);
      }
      if (tp > 0) {
        var teamNote = (valuation.teamBonus && valuation.teamBonus.notes && valuation.teamBonus.notes.length > 0)
          ? ' (' + valuation.teamBonus.notes.join('; ') + ')' : '';
        calcLines.push('+配队溢价: +¥' + Math.round(tp) + teamNote);
      }
      if (pv > 0) {
        var pi = valuation.pullInfo;
        var pullNote = pi ? ' (' + pi.pulls + '抽×' + pi.perPull + '/抽)' : '';
        if (pi && pi.c6Bonus > 0) {
          pullNote += ' (+满命加成' + Math.round(pi.c6Bonus) + ')';
        }
        calcLines.push('+抽数价值: +¥' + Math.round(pv) + pullNote);
      }
      if (or > 0) {
        calcLines.push('+其他资源: +¥' + Math.round(or));
      }
      calcLines.push('=小计: ¥' + Math.round(subtotal));

      // 系数
      var yc = valuation.yellowCoeff || 1;
      var yellowLabel = '';
      if (valuation.yellowInfo && valuation.yellowInfo.tierLabel) {
        var effYellow = valuation.yellowInfo.effectiveYellow != null ? valuation.yellowInfo.effectiveYellow : '?';
        yellowLabel = ' (' + effYellow + '有效金,' + valuation.yellowInfo.tierLabel + ')';
      }
      var fd = (valuation.flatDiscount && valuation.flatDiscount.value < 1) ? valuation.flatDiscount.value : 1;
      var fdNotes = (valuation.flatDiscount && valuation.flatDiscount.notes && valuation.flatDiscount.notes.length > 0)
        ? valuation.flatDiscount.notes.join('; ') : '';
      var finalCoeff = fd < 1 ? Math.min(yc, fd) : yc;

      if (fd < 1) {
        calcLines.push('有效金系数: ×' + yc.toFixed(3) + yellowLabel);
        calcLines.push('低命折扣: ×' + fd.toFixed(2) + (fdNotes ? ' (' + fdNotes + ')' : ''));
        calcLines.push('取较低值: ×' + finalCoeff.toFixed(3));
      } else {
        calcLines.push('×有效金系数: ×' + yc.toFixed(3) + yellowLabel);
      }
      calcLines.push('=最终估值: ¥' + Math.round(valuation.totalValue || 0));
    }

    // ===== 卖点摘要 =====
    var fullConstStr = '';
    if (fullConstChars.length > 0) {
      fullConstStr = fullConstChars.map(function(cb) { return cb.name + '·满'; }).join(' ');
    }

    // ===== 降价金额 =====
    var dropAmtStr = '';
    if (oldPrice != null && oldPrice !== newPrice) {
      var dropAmt = oldPrice - newPrice;
      dropAmtStr = '降¥' + dropAmt.toFixed(0);
    }

    // ===== 价格信息 =====
    var priceInfo = oldPrice != null && oldPrice !== newPrice
      ? '原价 ¥' + oldPrice.toFixed(0) + ' → 现价 ¥' + newPrice.toFixed(0) + (dropAmtStr ? ' 🔥' + dropAmtStr : '')
      : '标价 ¥' + newPrice.toFixed(0);

    // ===== 纯文本版（桌面通知用）=====
    var lines = [];
    lines.push('💰 价格信息');
    if (uniqueNo) lines.push('编号:' + uniqueNo + ' (' + (row.platform === 'pzds' ? '盼之' : row.platform === 'kjs' ? '氪金兽' : row.platform === 'qy' ? '7881' : row.platform === 'ysy' ? '易手游' : '螃蟹网') + ')');
    lines.push(priceInfo);
    lines.push('估值¥' + value.toFixed(0) + ' 差价¥' + diff.toFixed(0) + ' 性价比' + ratio.toFixed(1) + '%');
    lines.push('');
    // 卖点前置
    var outfitList = (valuation && valuation.outfits) ? valuation.outfits : [];
    var motoFrameList = (valuation && valuation.motoFrames) ? valuation.motoFrames : [];
    var outfitCount = outfitList.length;
    var motoFrameCount = motoFrameList.length;
    if (fullConstStr || yellowCount > 0 || teamCount > 0 || pullCount > 0 || outfitCount > 0 || motoFrameCount > 0) {
      lines.push('⭐ 核心亮点');
      if (fullConstStr) lines.push('满命:' + fullConstStr);
      var hlParts = [];
      if (yellowCount > 0) hlParts.push('有效' + effectiveYellow + '/限定' + limitedYellow + '/总' + yellowCount + '黄');
      if (teamCount > 0) hlParts.push(teamCount + '配队');
      if (pullCount > 0) hlParts.push(pullCount + '抽');
      if (hlParts.length > 0) lines.push(hlParts.join(' | '));
      if (outfitCount > 0) lines.push('皮肤: ' + outfitList.join('、'));
      if (motoFrameCount > 0) lines.push(G().labels.motoColumn + ': ' + motoFrameList.join('、'));
      lines.push('');
    }
    // 角色模块
    if (charDetailLines.length > 0) {
      lines.push('━━ 🎭 角色明细 ━━');
      lines.push(charDetailLines.join(' | '));
      lines.push('');
    }
    // 资源模块
    if (resourceLines.length > 0) {
      lines.push('━━ 📦 资源明细 ━━');
      for (var ri = 0; ri < resourceLines.length; ri++) lines.push(resourceLines[ri]);
    }
    // 估价计算模块
    if (calcLines.length > 0) {
      if (resourceLines.length > 0) lines.push('');
      lines.push('━━ 📊 估价计算 ━━');
      for (var ci = 0; ci < calcLines.length; ci++) {
        if (calcLines[ci].indexOf('=最终估值') >= 0) lines.push('────────');
        lines.push(calcLines[ci]);
      }
    }
    // 商品标题
    if (row.showTitle) lines.push('\n' + (row.showTitle || '').substring(0, 80));

    // ===== Markdown版（手机推送用，带颜色和图标）=====
    var mdLines = [];
    // 价格模块
    mdLines.push('**💰 价格信息**');
    mdLines.push('');
    if (uniqueNo) mdLines.push('编号: ' + uniqueNo + ' (' + (row.platform === 'pzds' ? '盼之' : row.platform === 'kjs' ? '氪金兽' : row.platform === 'qy' ? '7881' : row.platform === 'ysy' ? '易手游' : '螃蟹网') + ')');
    if (oldPrice != null && oldPrice !== newPrice) {
      mdLines.push('原价 ~~¥' + oldPrice.toFixed(0) + '~~ → <font color="#e94560">**现价 ¥' + newPrice.toFixed(0) + '**</font>' + (dropAmtStr ? ' 🔥**' + dropAmtStr + '**' : ''));
    } else {
      mdLines.push('<font color="#e94560">**标价 ¥' + newPrice.toFixed(0) + '**</font>');
    }
    mdLines.push('<font color="#fbbf24">**估值 ¥' + value.toFixed(0) + '**</font> · <font color="#4ade80">**差价 ¥' + diff.toFixed(0) + '**</font> · 性价比 ' + ratio.toFixed(1) + '%');
    mdLines.push('');
    // 卖点前置
    if (fullConstStr || yellowCount > 0 || teamCount > 0 || pullCount > 0 || outfitCount > 0 || motoFrameCount > 0) {
      mdLines.push('**⭐ 核心亮点**');
      mdLines.push('');
      if (fullConstStr) mdLines.push('**满命**: ' + fullConstStr.split(' ').join(' + '));
      var mdHlParts = [];
      if (yellowCount > 0) mdHlParts.push('有效' + effectiveYellow + '/限定' + limitedYellow + '/总' + yellowCount + '黄');
      if (teamCount > 0) mdHlParts.push(teamCount + '配队');
      if (pullCount > 0) mdHlParts.push(pullCount + '抽');
      if (mdHlParts.length > 0) mdLines.push(mdHlParts.join(' | '));
      if (outfitCount > 0) mdLines.push('👗 **皮肤**: ' + outfitList.join('、'));
      if (motoFrameCount > 0) mdLines.push('🏍️ **' + G().labels.motoColumn + '**: ' + motoFrameList.join('、'));
      mdLines.push('');
    }
    mdLines.push('---');
    mdLines.push('');
    // 角色模块
    if (charDetailLines.length > 0) {
      mdLines.push('**🎭 角色明细**');
      mdLines.push('');
      mdLines.push(charDetailLines.join(' | '));
      mdLines.push('');
    }
    // 资源模块
    if (resourceLines.length > 0) {
      mdLines.push('**📦 资源明细**');
      mdLines.push('');
      for (var rmi = 0; rmi < resourceLines.length; rmi++) {
        mdLines.push('• ' + resourceLines[rmi]);
        mdLines.push('');
      }
    }
    // 估价计算模块
    if (calcLines.length > 0) {
      mdLines.push('**📊 估价计算**');
      mdLines.push('');
      for (var mci = 0; mci < calcLines.length; mci++) {
        var calcLine = calcLines[mci];
        if (calcLine.indexOf('=最终估值') >= 0) {
          mdLines.push('<font color="#fbbf24">' + calcLine + '</font>');
        } else {
          mdLines.push(calcLine);
        }
        mdLines.push('');
      }
    }
    // 商品标题
    if (row.showTitle) mdLines.push('> ' + (row.showTitle || '').substring(0, 80));

    return { title: title, body: lines.join('\n'), mdBody: mdLines.join('\n') };
  }

  /**
   * 发送通知
   */
  /**
   * 多层通知系统
   * 1. 桌面通知 + GM通知
   * 2. 声音提醒（连续蜂鸣）
   * 3. 视觉提醒（页面标题闪烁 + 页面内大横幅）
   * 4. 手机推送（Server酱/PushPlus）
   * 5. 重复提醒（可选）
   */
  function notify(productId, title, body, mdBody) {
    // 1. 桌面通知（需要浏览器授权）
    try {
      if (Notification && Notification.permission === 'granted') {
        const n = new Notification(title, { body: body, icon: '', tag: productId });
        n.onclick = function () { window.focus(); n.close(); };
        // 5秒后自动关闭，避免堆积
        setTimeout(function () { n.close(); }, 5000);
      } else {
        console.log('[鸣潮监控] 桌面通知未授权，仅使用页面内提醒和手机推送。通知内容:', title);
      }
    } catch (e) {
      console.error('[鸣潮监控] 桌面通知发送失败:', e);
    }

    // 2. GM通知（不使用highlight，避免强制弹出标签页打断用户工作）
    try {
      if (typeof GM_notification !== 'undefined') {
        GM_notification({ title: title, text: body });
      }
    } catch (e) { }

    // 3. 声音提醒（连续蜂鸣3次）— 不依赖桌面通知权限
    if (pushConfig.soundAlert) {
      beepMultiple(3);
    }

    // 4. 视觉提醒（标题闪烁 + 大横幅）— 不依赖桌面通知权限
    if (pushConfig.visualAlert) {
      startTitleBlink(title);
      showAlertBanner(title, body, productId);
    }

    // 5. 监控面板状态栏高亮提醒（即使面板折叠也能看到）
    if (dom.statusText) {
      const originalColor = dom.statusText.style.color;
      dom.statusText.style.color = '#e94560';
      dom.statusText.style.fontWeight = 'bold';
      setTimeout(function () {
        dom.statusText.style.color = originalColor;
        dom.statusText.style.fontWeight = '';
      }, 10000);
    }

    // 6. 手机推送
    sendPhonePush(title, mdBody || body, productId);

    // 7. 重复提醒
    if (pushConfig.repeatAlert) {
      stopRepeatAlert();
      repeatAlertTimer = setInterval(function () {
        beepMultiple(2);
        startTitleBlink(title);
      }, 30000); // 每30秒重复
    }
  }

  /**
   * 播放连续提示音
   */
  function beepMultiple(times) {
    for (let i = 0; i < times; i++) {
      setTimeout(function () { beep(); }, i * 600);
    }
  }

  /**
   * 播放提示音
   */
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { }
  }

  /**
   * 标题闪烁提醒
   */
  function startTitleBlink(alertText) {
    stopTitleBlink();
    const originalTitle = document.title;
    let isAlert = true;
    titleBlinkTimer = setInterval(function () {
      document.title = isAlert ? '🔔 ' + alertText : originalTitle;
      isAlert = !isAlert;
    }, 800);
    // 用户切回页面时停止闪烁
    const stopHandler = function () {
      if (document.visibilityState === 'visible') {
        stopTitleBlink();
        document.removeEventListener('visibilitychange', stopHandler);
      }
    };
    document.addEventListener('visibilitychange', stopHandler);
  }

  function stopTitleBlink() {
    if (titleBlinkTimer) {
      clearInterval(titleBlinkTimer);
      titleBlinkTimer = null;
    }
    // 恢复标题（移除🔔前缀）
    if (document.title.startsWith('🔔 ')) {
      document.title = document.title.substring(2);
    }
  }

  /**
   * 页面内大横幅提醒
   */
  function showAlertBanner(title, body, productId) {
    // 清理productId后缀（如降价的 _drop、秒杀的 _flash），确保链接正确
    const cleanId = String(productId).replace(/_(drop|flash)$/, '');
    const bannerLink = cleanId.indexOf('pz_') === 0
      ? pzdsUrls().detail + '/' + cleanId.replace(/^pz_/, '') + '/6'
      : (cleanId.indexOf('kjs_') === 0 ? KJS_URLS.detail + cleanId.replace(/^kjs_/, '')
        : (cleanId.indexOf('qy_') === 0 ? qyUrls().detail + cleanId.replace(/^qy_/, '') + '.html'
        : (cleanId.indexOf('ysy_') === 0 ? ysyUrls().detail + cleanId.replace(/^ysy_/, '') + '&shop_source=2'
        : 'https://www.pxb7.com/product/' + cleanId + '/1')));
    // 移除旧横幅
    if (alertBannerEl) alertBannerEl.remove();

    const banner = document.createElement('div');
    banner.id = 'mw-alert-banner';
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:100010;' +
      'background:linear-gradient(90deg,#e94560,#f59e0b,#10b981);' +
      'color:#fff;padding:16px 24px;display:flex;align-items:center;gap:16px;' +
      'box-shadow:0 4px 20px rgba(233,69,96,0.5);animation:mwSlideDown 0.3s ease-out;' +
      'font-family:-apple-system,\'Microsoft YaHei\',sans-serif;';
    banner.innerHTML =
      '<div style="font-size:28px;">🔔</div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:2px;">' + title + '</div>' +
        '<div style="font-size:13px;opacity:0.9;white-space:pre-line;">' + body + '</div>' +
      '</div>' +
      '<a href="' + bannerLink + '" target="_blank" ' +
        'style="padding:8px 24px;background:#fff;color:#e94560;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;white-space:nowrap;">立即查看</a>' +
      '<button id="mwAlertClose" style="padding:8px 12px;background:rgba(0,0,0,0.3);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:18px;">✕</button>';
    document.body.appendChild(banner);
    alertBannerEl = banner;

    // 添加动画样式
    if (!document.getElementById('mw-alert-style')) {
      const style = document.createElement('style');
      style.id = 'mw-alert-style';
      style.textContent = '@keyframes mwSlideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}' +
        '@keyframes mwPulse{0%,100%{box-shadow:0 4px 20px rgba(233,69,96,0.5)}50%{box-shadow:0 4px 40px rgba(233,69,96,0.8)}}' +
        '#mw-alert-banner{animation:mwSlideDown 0.3s ease-out,mwPulse 1.5s infinite}';
      document.head.appendChild(style);
    }

    // 关闭按钮
    banner.querySelector('#mwAlertClose').onclick = function () {
      stopRepeatAlert();
      stopTitleBlink();
      banner.remove();
      alertBannerEl = null;
    };

    // 30秒后自动消失（如果开启了重复提醒则不自动消失）
    if (!pushConfig.repeatAlert) {
      setTimeout(function () {
        if (alertBannerEl === banner) {
          banner.remove();
          alertBannerEl = null;
        }
      }, 30000);
    }
  }

  /**
   * 停止重复提醒
   */
  function stopRepeatAlert() {
    if (repeatAlertTimer) {
      clearInterval(repeatAlertTimer);
      repeatAlertTimer = null;
    }
  }

  /**
   * 发送手机推送通知
   * 支持：Server酱（微信）、PushPlus（微信）
   */
  function sendPhonePush(title, body, productId) {
    // 清理productId后缀（如降价的 _drop、秒杀的 _flash），确保链接正确
    const cleanId = String(productId).replace(/_(drop|flash)$/, '');
    const productUrl = cleanId.indexOf('pz_') === 0
      ? pzdsUrls().detail + '/' + cleanId.replace(/^pz_/, '') + '/6'
      : (cleanId.indexOf('kjs_') === 0 ? KJS_URLS.detail + cleanId.replace(/^kjs_/, '')
        : (cleanId.indexOf('qy_') === 0 ? qyUrls().detail + cleanId.replace(/^qy_/, '') + '.html'
        : (cleanId.indexOf('ysy_') === 0 ? ysyUrls().detail + cleanId.replace(/^ysy_/, '') + '&shop_source=2'
        : 'https://www.pxb7.com/product/' + cleanId + '/1')));
    const pushBody = body + '\n\n---\n[🔗 点击跳转](' + productUrl + ')\n\n> 微信内无法直接跳转，请复制以下链接到浏览器打开：\n`' + productUrl + '`';

    // Server酱推送（微信）- 支持多个SendKey
    if (pushConfig.serverChanKey) {
      var sckKeys = pushConfig.serverChanKey.split(/[,\n\s]+/).filter(function(k) { return k.trim().length > 0; });
      sckKeys.forEach(function(key) {
        key = key.trim();
        if (!key) return;
        try {
          GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://sctapi.ftqq.com/' + key + '.send',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: 'title=' + encodeURIComponent(title) + '&desp=' + encodeURIComponent(pushBody),
            onload: function () { console.log('[鸣潮监控] Server酱推送已发送: ' + key.substring(0, 8) + '...'); },
            onerror: function (e) { console.error('[鸣潮监控] Server酱推送失败:', key.substring(0, 8) + '...', e); }
          });
        } catch (e) { console.error('[鸣潮监控] Server酱推送异常:', key.substring(0, 8) + '...', e); }
      });
    }

    // PushPlus推送（微信）- 主从分级推送
    var ppSubscribers = pushConfig.pushPlusSubscribers || [];
    var now = Date.now();
    var activeSubs = ppSubscribers.filter(function (s) {
      var remaining = s.validDays - Math.floor((now - s.createdAt) / 86400000);
      return remaining > 0;
    });
    // 自动清理过期订阅者
    if (activeSubs.length < ppSubscribers.length) {
      var expiredNames = ppSubscribers.filter(function (s) {
        return s.validDays - Math.floor((now - s.createdAt) / 86400000) <= 0;
      }).map(function (s) { return s.name || s.token.substring(0, 8); });
      console.log('[鸣潮监控] PushPlus自动清理过期订阅者:', expiredNames.join(', '));
      pushConfig.pushPlusSubscribers = activeSubs;
      saveState();
    }
    // 发送 PushPlus 推送
    function sendPushPlus(sub, ttl, body) {
      var token = sub.token.trim();
      if (!token) return;
      try {
        GM_xmlhttpRequest({
          method: 'POST',
          url: 'https://www.pushplus.plus/send',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ token: token, title: ttl, content: body, template: 'markdown' }),
          onload: function () { console.log('[鸣潮监控] PushPlus推送已发送: ' + (sub.name || token.substring(0, 8)) + '...'); },
          onerror: function (e) { console.error('[鸣潮监控] PushPlus推送失败:', (sub.name || token.substring(0, 8)) + '...', e); }
        });
      } catch (e) { console.error('[鸣潮监控] PushPlus推送异常:', (sub.name || token.substring(0, 8)) + '...', e); }
    }
    // 分为主通知（立即）和从通知（延迟）
    var primarySubs = activeSubs.filter(function (s) { return (s.priority || 'secondary') === 'primary'; });
    var secondarySubs = activeSubs.filter(function (s) { return (s.priority || 'secondary') !== 'primary'; });

    // 从通知高差价过滤：开启后差价超过阈值的账号不推送给从通知用户
    if (pushConfig.skipHighDiffSecondary && secondarySubs.length > 0) {
      var diffMatch = title.match(/差价¥([\d.]+)/);
      var notifyDiffVal = diffMatch ? parseFloat(diffMatch[1]) : 0;
      var threshold = pushConfig.highDiffThreshold != null ? pushConfig.highDiffThreshold : 400;
      if (notifyDiffVal > threshold) {
        // 检查平台过滤：如果设置了平台列表，只过滤选中平台；未设置则过滤全部
        var filterPlatforms = pushConfig.highDiffFilterPlatforms || [];
        var productPlatform = '';
        if (cleanId.indexOf('pz_') === 0) productPlatform = 'pz';
        else if (cleanId.indexOf('kjs_') === 0) productPlatform = 'kjs';
        else if (cleanId.indexOf('qy_') === 0) productPlatform = 'qy';
        else if (cleanId.indexOf('ysy_') === 0) productPlatform = 'ysy';
        else productPlatform = 'pxb7';

        if (filterPlatforms.length === 0 || filterPlatforms.indexOf(productPlatform) >= 0) {
          console.log('[鸣潮监控] 从通知过滤：差价¥' + notifyDiffVal + ' > 阈值¥' + threshold + '，平台=' + productPlatform + '，跳过从通知推送');
          secondarySubs = [];
        }
      }
    }

    // 主通知立即发送
    primarySubs.forEach(function (sub) { sendPushPlus(sub, title, pushBody); });
    // 从通知延迟发送
    var delaySec = pushConfig.secondaryDelay != null ? pushConfig.secondaryDelay : 20;
    if (secondarySubs.length > 0 && delaySec > 0) {
      console.log('[鸣潮监控] 从通知' + secondarySubs.length + '人，延迟' + delaySec + '秒发送');
      setTimeout(function () {
        secondarySubs.forEach(function (sub) { sendPushPlus(sub, title, pushBody); });
      }, delaySec * 1000);
    } else if (secondarySubs.length > 0) {
      // 延迟为0时直接发送
      secondarySubs.forEach(function (sub) { sendPushPlus(sub, title, pushBody); });
    }
  }

  // ============================================================
  // 推送配置云端同步
  // ============================================================

  function syncPushConfigToServer(password, silent) {
    if (!password) { if (!silent) alert('请先输入同步密码'); return; }
    var payload = {
      serverChanKey: pushConfig.serverChanKey || '',
      pushPlusSubscribers: pushConfig.pushPlusSubscribers || [],
      secondaryDelay: pushConfig.secondaryDelay != null ? pushConfig.secondaryDelay : 20,
      skipHighDiffSecondary: pushConfig.skipHighDiffSecondary || false,
      highDiffThreshold: pushConfig.highDiffThreshold != null ? pushConfig.highDiffThreshold : 400,
      highDiffFilterPlatforms: pushConfig.highDiffFilterPlatforms || [],
    };
    GM_xmlhttpRequest({
      method: 'POST',
      url: SYNC_URLS.sync,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ password: password, pushConfig: payload }),
      onload: function (resp) {
        try {
          var json = JSON.parse(resp.responseText);
          if (json.success) {
            console.log('[鸣潮监控] 推送配置已同步到服务器');
            if (!silent) alert('推送配置已同步到服务器');
          } else {
            console.error('[鸣潮监控] 同步失败:', json.error);
            if (!silent) alert('同步失败: ' + (json.error || '未知错误'));
          }
        } catch (e) {
          console.error('[鸣潮监控] 同步响应解析失败');
          if (!silent) alert('同步失败: 服务器响应异常');
        }
      },
      onerror: function (e) {
        console.error('[鸣潮监控] 同步网络错误');
        if (!silent) alert('同步失败: 网络错误');
      },
    });
  }

  function loadPushConfigFromServer(password, onDone) {
    if (!password) { if (onDone) onDone(false); return; }
    GM_xmlhttpRequest({
      method: 'POST',
      url: SYNC_URLS.get,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ password: password }),
      onload: function (resp) {
        try {
          var json = JSON.parse(resp.responseText);
          if (json.success && json.pushConfig) {
            var remote = json.pushConfig;
            pushConfig.serverChanKey = remote.serverChanKey || pushConfig.serverChanKey || '';
            pushConfig.pushPlusSubscribers = Array.isArray(remote.pushPlusSubscribers) ? remote.pushPlusSubscribers : pushConfig.pushPlusSubscribers;
            pushConfig.secondaryDelay = remote.secondaryDelay != null ? remote.secondaryDelay : pushConfig.secondaryDelay;
            pushConfig.skipHighDiffSecondary = remote.skipHighDiffSecondary != null ? remote.skipHighDiffSecondary : pushConfig.skipHighDiffSecondary;
            pushConfig.highDiffThreshold = remote.highDiffThreshold != null ? remote.highDiffThreshold : pushConfig.highDiffThreshold;
            pushConfig.highDiffFilterPlatforms = Array.isArray(remote.highDiffFilterPlatforms) ? remote.highDiffFilterPlatforms : pushConfig.highDiffFilterPlatforms;
            saveState();
            console.log('[鸣潮监控] 推送配置已从服务器恢复 (' + (json.syncedAt || '未知时间') + ')');
            if (onDone) onDone(true);
          } else {
            console.log('[鸣潮监控] 服务器暂无推送配置');
            if (onDone) onDone(false);
          }
        } catch (e) {
          console.error('[鸣潮监控] 恢复响应解析失败');
          if (onDone) onDone(false);
        }
      },
      onerror: function (e) {
        console.error('[鸣潮监控] 恢复网络错误');
        if (onDone) onDone(false);
      },
    });
  }

  // ============================================================
  // 导出功能
  // ============================================================

  /**
   * 导出JSON
   */
  function exportJSON() {
    const data = tableData.map(function (row) {
      return {
        productId: row.productId,
        showTitle: row.showTitle,
        price: row.price,
        value: row.value,
        diff: row.value - row.price,
        ratio: row.ratio,
        status: row.status,
        yellowCount: row.parsed ? row.parsed.yellowCount : 0,
        pulls: row.parsed ? row.parsed.pulls : 0,
        motoCount: row.parsed ? row.parsed.motoCount : 0,
        characters: row.parsed ? row.parsed.characters : [],
        listTime: row.listTime,
      };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '鸣潮监控_' + new Date().toISOString().slice(0, 10) + '_' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 检查已售账号：拉取昨日成交清单批量匹配，命中即标记已售并记录成交价（秒级完成）
   */
  let soldCheckRunning = false;
  async function checkSoldAccounts() {
    if (soldCheckRunning) {
      alert('正在检查中，请稍候...');
      return;
    }
    if (tableData.length === 0) {
      alert('表格暂无数据，无需检查');
      return;
    }

    soldCheckRunning = true;
    dom.btnCheckSold.textContent = '拉取成交清单...';
    dom.btnCheckSold.style.opacity = '0.6';

    let soldCount = 0;

    // 拉取昨日成交清单，批量匹配全部表格记录（Map查找零成本，无需阈值筛选）
    let soldList = [];
    try {
      soldList = await fetchSoldList();
      console.log('[鸣潮监控] 昨日成交清单拉取成功: ' + soldList.length + ' 条');
    } catch (e) {
      console.warn('[鸣潮监控] 成交清单拉取失败:', e.message);
    }

    if (soldList.length > 0) {
      const soldMap = new Map();
      for (const item of soldList) {
        if (item && item.productId) soldMap.set(item.productId, item);
      }
      for (const row of tableData) {
        const soldItem = soldMap.get(row.productId);
        if (soldItem) {
          row.status = '已售';
          soldCount++;
          // 记录真实成交价（分转元）与成交日期
          const soldPrice = (soldItem.price || 0) / 100;
          if (soldPrice > 0) row.soldPrice = soldPrice;
          if (soldItem.payTime) row.soldTime = soldItem.payTime;
        }
      }
      console.log('[鸣潮监控] 清单批量匹配: 命中' + soldCount + '个');
      saveTableData();
    }

    refreshTableDisplay();

    soldCheckRunning = false;
    dom.btnCheckSold.textContent = '检查已售';
    dom.btnCheckSold.style.opacity = '1';

    if (soldList.length === 0) {
      alert('检查失败：昨日成交清单拉取失败，请稍后重试。');
      return;
    }
    alert('检查完成！表格 ' + tableData.length + ' 条记录全部匹配，其中 ' + soldCount + ' 个命中昨日成交清单（清单共 ' + soldList.length + ' 条，仅覆盖螃蟹网平台）。');
  }

  /**
   * 检查单个账号是否已售
   */
  async function checkSingleSold(productId, badge) {
    const row = tableData.find(r => r.productId === productId);
    if (!row) return;

    // 临时改变标签样式
    const origText = badge.textContent;
    const origClass = badge.className;
    badge.textContent = '检查中';
    badge.className = 'mw-status-badge';
    badge.style.background = '#3a3a1a';
    badge.style.color = '#fbbf24';
    badge.style.cursor = 'wait';
    badge.title = '正在检查...';

    try {
      const resp = await fetchDetail(productId);
      if (!resp || !resp.success || !resp.data) {
        row.status = '已售';
      } else if (resp.data.status === 2 || resp.data.tradeStatus === 2) {
        row.status = '已售';
        const soldPrice = (resp.data.price || 0) / 100;
        if (soldPrice > 0) row.soldPrice = soldPrice;
      } else {
        // 仍在售，恢复原状态（如果之前是已售则改为初估）
        if (row.status === '已售') {
          row.status = '初估';
          delete row.soldPrice;
          delete row.soldTime;
        }
        // 更新价格
        const newPrice = (resp.data.price || 0) / 100;
        if (newPrice > 0 && newPrice !== row.price) {
          if (!row.priceHistory) row.priceHistory = [];
          if (newPrice < row.price) {
            // 降价
            row.priceHistory.push({ price: row.price, time: Date.now() });
            row.priceDrop = (row.priceDrop || 0) + (row.price - newPrice);
            row.status = '降价';
          }
          row.price = newPrice;
          // 重算性价比
          if (row.value && row.value > 0) {
            row.ratio = ((row.value - newPrice) / newPrice) * 100;
          }
          console.log('[鸣潮监控] 单独检查价格更新: ' + productId + ' ¥' + newPrice);
        }
      }
    } catch (e) {
      console.log('[鸣潮监控] 单独检查已售失败: ' + productId + ' - ' + e.message);
      // 恢复原标签
      badge.textContent = origText;
      badge.className = origClass;
      badge.style.background = '';
      badge.style.color = '';
      badge.style.cursor = 'pointer';
      badge.title = '点击检查是否已售';
      return;
    }

    saveTableData();
    refreshTableDisplay();
  }

  // ============================================================
  // 监控循环
  // ============================================================

  /**
   * 保存状态到localStorage
   */
  function saveState() {
    saveStorage(STORAGE_KEYS.state, {
      monitorRunning: monitorRunning,
      notifyEnabled: notifyEnabled,
      threshold: threshold,
      notifyRatioThreshold: notifyRatioThreshold,
      notifyDiffThreshold: notifyDiffThreshold,
      notifyDiffTiers: notifyDiffTiers,
      autoBuyEnabled: autoBuyEnabled,
      autoBuyDiff: autoBuyDiff,
      autoBuyMaxPrice: autoBuyMaxPrice,
      notifyMinValue: notifyMinValue,
      notifyMinPrice: notifyMinPrice,
      notifyMaxPrice: notifyMaxPrice,
      refreshIntervalSec: refreshIntervalSec,
      flashSaleEnabled: flashSaleEnabled,
      pzdsEnabled: pzdsEnabled,
      kjsEnabled: kjsEnabled,
      qyEnabled: qyEnabled,
      ysyEnabled: ysyEnabled,
      charNotifyRules: charNotifyRules,
      pushConfig: pushConfig,
      _intervalMigrated: true,
    });
  }

  /**
   * 开始监控
   */
  function startMonitor() {
    if (monitorRunning) return;
    monitorRunning = true;
    saveState();
    updateStatusText();

    // 立即开始第一次刷新（通过monitorTick统一管理refreshInProgress）
    nextRefreshTime = Date.now() + refreshIntervalSec * 1000;
    monitorTick();

    // 启动倒计时
    startCountdown();
  }

  /**
   * 停止监控
   */
  function stopMonitor() {
    monitorRunning = false;
    if (monitorTimeout) {
      clearTimeout(monitorTimeout);
      monitorTimeout = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    nextRefreshTime = 0;
    saveState();
    updateStatusText();
    updateBottomBar();
  }

  let refreshInProgress = false;

  /**
   * 监控tick
   */
  function monitorTick() {
    if (!monitorRunning) return;
    if (!refreshInProgress) {
      refreshInProgress = true;
      doRefresh().finally(() => {
        refreshInProgress = false;
        // 刷新完成后才设置下次倒计时，避免API耗时导致倒计时卡在0
        nextRefreshTime = Date.now() + refreshIntervalSec * 1000;
        monitorTimeout = setTimeout(monitorTick, refreshIntervalSec * 1000);
      });
    } else {
      // 刷新仍在进行，2秒后重试
      monitorTimeout = setTimeout(monitorTick, 2000);
    }
  }

  /**
   * 执行刷新（调用列表API）
   */
  async function doRefresh() {
    lastRefreshTime = Date.now();

    // 螃蟹网API扫描（独立try-catch，失败不影响其他平台）
    var pxb7Error = null;
    try {
      // 扫描第1页
      const data = await fetchListWithRetry(1);
      // 兼容多种响应格式：data.data.list 或 data.data（数组）
      let list = null;
      if (data && data.success && data.data) {
        list = Array.isArray(data.data) ? data.data : (data.data.list || null);
      }
      if (list) {
        handleListResponse(list, false);
        lastRefreshError = '';  // 刷新成功，清除错误
      } else if (data && !data.success) {
        lastRefreshError = '螃蟹网API: ' + (data.message || data.msg || '未知错误');
      } else if (!data) {
        lastRefreshError = '螃蟹网API被WAF拦截（依赖拦截+其他平台正常）';
      }

      // 可选：扫描第2-3页
      for (let page = 2; page <= CONFIG.scanPages; page++) {
        try {
          const pageData = await fetchListWithRetry(page);
          if (pageData && pageData.success && pageData.data) {
            const pageList = Array.isArray(pageData.data) ? pageData.data : (pageData.data.list || null);
            if (pageList) handleListResponse(pageList, false);
          }
        } catch (e) {
          console.error('[鸣潮监控] 第' + page + '页获取失败:', e);
        }
      }

      // 秒杀库池扫描（还价后卖家同意的低价商品）
      if (flashSaleEnabled) {
        let flashTotal = 0;
        for (let page = 1; page <= 1; page++) {
          try {
            const flashData = await fetchFlashSaleWithRetry(page);
            if (flashData && flashData.success && flashData.data) {
              const flashList = Array.isArray(flashData.data) ? flashData.data : (flashData.data.list || null);
              if (flashList) {
                flashTotal += flashList.length;
                handleListResponse(flashList, false, true);
                console.log('[鸣潮监控] 秒杀库第' + page + '页扫描完成，获取' + flashList.length + '条');
              }
            }
          } catch (e) {
            console.error('[鸣潮监控] 秒杀库第' + page + '页获取失败:', e);
          }
        }
        if (flashTotal > 0) {
          console.log('[鸣潮监控] 秒杀库扫描完成，共获取' + flashTotal + '条');
        }
      }
    } catch (e) {
      pxb7Error = e;
      lastRefreshError = '螃蟹网: ' + (e.message || e);
      console.error('[鸣潮监控] 螃蟹网API失败(WAF/反爬):', e.message);
    }

    // 以下其他平台扫描不受螃蟹网API失败影响
    try {

      // 盼之平台扫描（SSR HTML抓取）
      if (pzdsEnabled) {
        let pzdsTotal = 0;
        for (let page = 1; page <= 1; page++) {
          try {
            const pzdsProducts = await fetchListPZ(page);
            if (pzdsProducts.length > 0) {
              pzdsTotal += pzdsProducts.length;
              await handlePZListResponse(pzdsProducts);
              console.log('[鸣潮监控-盼之] 第' + page + '页扫描完成，获取' + pzdsProducts.length + '条');
            }
          } catch (e) {
            console.error('[鸣潮监控-盼之] 第' + page + '页获取失败:', e);
          }
        }
        if (pzdsTotal > 0) {
          console.log('[鸣潮监控-盼之] 扫描完成，共获取' + pzdsTotal + '条');
        }
      }

      // 氪金兽平台扫描（MWP API，按最新发布排序）
      if (kjsEnabled) {
        try {
          const kjsProducts = await kjsSearch(1);
          if (kjsProducts.length > 0) {
            await handleKJSListResponse(kjsProducts);
            console.log('[鸣潮监控-氪金兽] 扫描完成，获取' + kjsProducts.length + '条');
          }
        } catch (e) {
          console.error('[鸣潮监控-氪金兽] 扫描失败:', e);
        }
      }

      // 7881平台扫描（API抓取，MD5签名认证，按最新发布排序）
      if (qyEnabled) {
        try {
          const qyProducts = await qySearch(1);
          if (qyProducts.length > 0) {
            await handleQYListResponse(qyProducts);
            console.log('[鸣潮监控-7881] 扫描完成，获取' + qyProducts.length + '条');
          }
        } catch (e) {
          console.error('[鸣潮监控-7881] 扫描失败:', e);
        }
      }

      // 易手游平台扫描（结构化API，按最新发布排序）
      if (ysyEnabled && G().platformIds.ysy > 0) {
        try {
          const ysyProducts = await fetchYSYList(1);
          if (ysyProducts.length > 0) {
            await handleYSYListResponse(ysyProducts);
            console.log('[鸣潮监控-易手游] 扫描完成，获取' + ysyProducts.length + '条');
          }
        } catch (e) {
          console.error('[鸣潮监控-易手游] 扫描失败:', e);
        }
      }
    } catch (e) {
      if (!pxb7Error) lastRefreshError = e.name === 'AbortError' ? '请求超时(15s)' : ('' + e.message || e);
      console.error('[鸣潮监控] 其他平台扫描失败:', e);
    }

    updateBottomBar();
  }

  /**
   * 启动倒计时
   */
  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(updateBottomBar, 1000);
  }

  // ============================================================
  // 初始化
  // ============================================================

  /**
   * 初始化
   */
  function init() {
    // 加载存储数据
    tableData = loadStorage(STORAGE_KEYS.table, []);
    // 为旧数据补充 fingerprint（去重功能升级前的数据没有此字段）
    let migrated = 0;
    for (const row of tableData) {
      if (!row.fingerprint && row.showTitle) {
        const parsed = parseAccountInfo(row.showTitle);
        row.fingerprint = generateFingerprint(parsed);
        migrated++;
      }
    }
    if (migrated > 0) {
      console.log('[鸣潮监控] 为' + migrated + '条旧数据补充了内容指纹');
      saveTableData();
    }
    seenIds = loadStorage(STORAGE_KEYS.seen, []);
    notifiedIds = loadStorage(STORAGE_KEYS.notified, []);

    // 迁移：修复旧版截断的 showTitle（旧版 slimRow/ultraSlimRow 在存储压力下截断为500字符，
    // 导致武器列表尾部丢失、专武识别不全）。特征：showTitle 长度恰好为500。
    // 仅处理 pxb7 行（其他平台的详情刷新走各自流程）。重新入详情队列，用完整描述覆盖。
    let truncatedCount = 0;
    for (const row of tableData) {
      if (!row.platform && row.showTitle && row.showTitle.length === 500) {
        truncatedCount++;
        // 重置状态避免 enqueueDetail 的 '详估' 跳过检查
        row.status = '刷新';
        enqueueDetail(row.productId, 0);
      }
    }
    if (truncatedCount > 0) {
      console.log('[鸣潮监控] 检测到' + truncatedCount + '条被旧版截断的描述，已加入详情刷新队列');
      saveTableData();
    }

    const savedState = loadStorage(STORAGE_KEYS.state, {});
    threshold = savedState.threshold || 20;
    notifyEnabled = savedState.notifyEnabled || false;
    notifyRatioThreshold = savedState.notifyRatioThreshold != null ? savedState.notifyRatioThreshold : 40;
    notifyDiffThreshold = savedState.notifyDiffThreshold != null ? savedState.notifyDiffThreshold : 150;
    notifyDiffTiers = Array.isArray(savedState.notifyDiffTiers) ? savedState.notifyDiffTiers : notifyDiffTiers;
    autoBuyEnabled = savedState.autoBuyEnabled != null ? savedState.autoBuyEnabled : true;
    autoBuyDiff = savedState.autoBuyDiff != null ? savedState.autoBuyDiff : 380;
    autoBuyMaxPrice = savedState.autoBuyMaxPrice != null ? savedState.autoBuyMaxPrice : 6000;
    notifyMinValue = savedState.notifyMinValue != null ? savedState.notifyMinValue : 400;
    notifyMinPrice = savedState.notifyMinPrice != null ? savedState.notifyMinPrice : 0;
    notifyMaxPrice = savedState.notifyMaxPrice != null ? savedState.notifyMaxPrice : 20000;
    refreshIntervalSec = savedState.refreshIntervalSec != null ? savedState.refreshIntervalSec : 15;
    // 迁移：旧默认值20秒 → 新默认值15秒（用户手动设过其他值则保留）
    if (refreshIntervalSec === 20 && savedState._intervalMigrated !== true) {
      refreshIntervalSec = 15;
    }
    flashSaleEnabled = savedState.flashSaleEnabled != null ? savedState.flashSaleEnabled : true;
    pzdsEnabled = savedState.pzdsEnabled != null ? savedState.pzdsEnabled : false;
    kjsEnabled = savedState.kjsEnabled != null ? savedState.kjsEnabled : false;
    qyEnabled = savedState.qyEnabled != null ? savedState.qyEnabled : false;
      ysyEnabled = savedState.ysyEnabled != null ? savedState.ysyEnabled : false;
    charNotifyRules = Array.isArray(savedState.charNotifyRules) ? savedState.charNotifyRules : charNotifyRules;
    // 加载推送配置
    if (savedState.pushConfig) {
      pushConfig = Object.assign(pushConfig, savedState.pushConfig);
    }
    // 迁移旧格式 pushPlusToken 字符串到 pushPlusSubscribers 数组
    if (pushConfig.pushPlusToken && (!pushConfig.pushPlusSubscribers || pushConfig.pushPlusSubscribers.length === 0)) {
      var oldTokens = pushConfig.pushPlusToken.split(/[,\n\s]+/).filter(function (t) { return t.trim().length > 0; });
      pushConfig.pushPlusSubscribers = oldTokens.map(function (token) {
        return { name: '迁移用户', token: token.trim(), validDays: 365, priority: 'secondary', createdAt: Date.now() };
      });
      pushConfig.pushPlusToken = ''; // 清除旧格式
      console.log('[鸣潮监控] PushPlus旧格式已迁移为订阅者列表，共' + oldTokens.length + '个');
    }
    // 确保数组存在
    if (!Array.isArray(pushConfig.pushPlusSubscribers)) {
      pushConfig.pushPlusSubscribers = [];
    }

    // 如果设置了同步密码，从服务器自动恢复推送配置（换电脑时自动恢复）
    if (pushConfig.syncPassword) {
      loadPushConfigFromServer(pushConfig.syncPassword, function (ok) {
        if (ok && typeof refreshTableDisplay === 'function') {
          refreshTableDisplay();
        }
      });
    }

    // 加载估值权重（改进4）
    weights = loadWeights();

    // 创建UI
    createDashboard();

    // 刷新表格显示
    refreshTableDisplay();
    updateStatusText();
    updateBottomBar();

    // 如果之前在监控，自动启动
    if (savedState.monitorRunning) {
      startMonitor();
    }

    // 如果通知已开启，检查权限
    if (notifyEnabled) {
      if (Notification && Notification.permission !== 'granted') {
        notifyEnabled = false;
        saveState();
      }
    }

    console.log('[鸣潮监控] 脚本初始化完成 | 表格' + tableData.length + '条 | 已见ID ' + seenIds.length + '个');
  }

  // ============================================================
  // 启动
  // ============================================================

  // 检测当前游戏：螃蟹网列表页URL优先（/buy/10302鸣潮、/buy/10312绝区零），否则用上次选择
  (function detectGame() {
    const m = window.location.pathname.match(/\/buy\/(\d+)/);
    if (m) {
      for (const [key, g] of Object.entries(GAME_CONFIGS)) {
        if (g.platformIds.pxb7 === m[1]) { currentGame = key; break; }
      }
    } else {
      const saved = localStorage.getItem(GLOBAL_STORAGE_KEYS.game);
      if (saved && GAME_CONFIGS[saved]) currentGame = saved;
    }
    applyGameConfig();
    console.log('[监控] 当前游戏: ' + G().name + ' (minLevel=' + G().minLevel + ')');
  })();

  // 商品详情页：仅执行自动购买逻辑，不启动监控面板
  if (window.location.pathname.indexOf('/product/') !== -1) {
    initAutoBuyOnProductPage();
    return;
  }

  // 列表页：设置请求拦截 + 初始化监控面板
  // 立即设置请求拦截（在页面发请求之前）
  setupInterception();

  // 等待DOM就绪后初始化UI
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else if (document.readyState === 'interactive') {
    init();
  } else {
    // complete 或其他情况
    init();
  }

})();
