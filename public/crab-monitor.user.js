// ==UserScript==
// @name         螃蟹网鸣潮监控助手
// @namespace    pxb7-monitor
// @version      1.14.0
// @description  监控螃蟹网鸣潮账号列表，自动发现高性价比账号
// @match        https://www.pxb7.com/buy/10302/*
// @match        https://www.pxb7.com/buy/10302
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @connect      api.day.app
// @connect      sctapi.ftqq.com
// @connect      www.pushplus.plus
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // 常量定义
  // ============================================================

  // 角色定价表
  const CHAR_TIERS = {
    S: { price: 50, isHot: true, chars: ['爱弥斯', '绯雪', '卡提希娅'] },
    A: { price: 35, isHot: true, chars: ['琳奈', '千咲', '穗穗', '莫宁', '秧秧玄翎', '弗洛洛', '洛瑟菈'] },
    B: { price: 25, isHot: true, chars: ['达妮娅', '夏空', '露西', '嘉贝莉娜', '奥古斯塔', '仇远', '尤诺', '陆赫斯', '赞妮', '布兰特', '守岸人', '西格莉卡'] },
    C: { price: 5, isHot: false, chars: ['露帕', '珂莱塔', '菲比', '坎特蕾拉', '椿'] },
    D: { price: 3, isHot: false, chars: ['忌炎', '吟霖', '相里要', '今汐', '长离', '折枝', '洛可可', '丽贝卡'] },
    E: { price: 2, isHot: false, chars: ['维里奈', '卡卡罗', '安可', '凌阳', '鉴心', '秧秧'] },
  };

  // 专武映射（角色名 -> 专武名）
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

  // 配队定义
  const TEAMS = [
    { name: '爱弥斯队', members: ['爱弥斯', '卡提希娅', '守岸人'], multiplier: 1.2 },
    { name: '绯雪队', members: ['绯雪', '卡提希娅', '守岸人'], multiplier: 1.2 },
    { name: '琳奈队', members: ['琳奈', '千咲', '守岸人'], multiplier: 1.2 },
    { name: '莫宁队', members: ['莫宁', '卡提希娅', '守岸人'], multiplier: 1.15 },
    { name: '达妮娅队', members: ['达妮娅', '洛瑟菈', '守岸人'], multiplier: 1.15 },
    { name: '夏空队', members: ['夏空', '洛瑟菈', '守岸人'], multiplier: 1.15 },
    { name: '穗穗队', members: ['穗穗', '卡提希娅', '守岸人'], multiplier: 1.15 },
  ];

  // 角色名缩写映射（用于表格显示）
  const CHAR_ABBR = {
    '爱弥斯': '爱', '绯雪': '绯', '卡提希娅': '卡', '弗洛洛': '弗',
    '琳奈': '琳', '守岸人': '守', '千咲': '千', '穗穗': '穗', '莫宁': '莫',
    '达妮娅': '达', '洛瑟菈': '瑟', '夏空': '夏',
    '布兰特': '布', '露帕': '帕', '珂莱塔': '珂', '菲比': '菲', '赞妮': '赞',
    '尤诺': '尤', '陆赫斯': '陆', '坎特蕾拉': '坎', '仇远': '仇', '奥古斯塔': '奥',
    '嘉贝莉娜': '嘉', '西格莉卡': '西', '丽贝卡': '丽', '露西': '露', '椿': '椿',
    '忌炎': '忌', '吟霖': '吟', '相里要': '相', '今汐': '今', '长离': '长', '折枝': '折', '洛可可': '可',
    '维里奈': '维', '卡卡罗': '罗', '安可': '安', '凌阳': '凌', '鉴心': '鉴',
  };

  // 满命权重
  const FULL_CONST_WEIGHT = { S: 1.0, A: 0.6, B: 0.3, C: 0.2, D: 0.1, E: 0.1 };

  // ============================================================
  // 估值权重默认值（可被用户在设置面板中覆盖）
  // ============================================================

  // 默认权重参数（参考性价比脚本 CONFIG.weights）
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
      { count: 3, coef: 1.2 },
      { count: 4, coef: 1.3 },
      { count: 5, coef: 1.4 },
      { count: 6, coef: 1.5 },
      { count: 7, coef: 1.6 },
      { count: 8, coef: 1.7 },
      { count: 9, coef: 1.8 },
      { count: 10, coef: 1.9 },
    ],
  };

  // 默认配队列表
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
    { name: '三火队', members: ['布兰特', '露帕', '长离'], multiplier: 1.2 },
    { name: '赞菲守', members: ['赞妮', '菲比', '守岸人'], multiplier: 1.1 },
  ];

  // 默认抽数阶梯定价
  const DEFAULT_PULL_TIERS = [
    { minPull: 0, maxPull: 100, perPullPrice: 0.8 },
    { minPull: 100, maxPull: 200, perPullPrice: 1 },
    { minPull: 200, maxPull: 300, perPullPrice: 1.2 },
    { minPull: 300, maxPull: 400, perPullPrice: 1.4 },
    { minPull: 400, maxPull: 500, perPullPrice: 1.7 },
    { minPull: 500, maxPull: 600, perPullPrice: 2 },
    { minPull: 600, maxPull: 700, perPullPrice: 2.3 },
    { minPull: 700, maxPull: 800, perPullPrice: 2.5 },
    { minPull: 800, maxPull: 900, perPullPrice: 2.7 },
    { minPull: 900, maxPull: 1000, perPullPrice: 3 },
    { minPull: 1000, maxPull: 1100, perPullPrice: 3.2 },
    { minPull: 1100, maxPull: 1200, perPullPrice: 3.4 },
    { minPull: 1200, maxPull: 1300, perPullPrice: 3.6 },
    { minPull: 1300, maxPull: 1400, perPullPrice: 3.8 },
    { minPull: 1400, maxPull: Infinity, perPullPrice: 4 },
  ];

  // 默认黄数阶梯系数
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

  // 默认角色价格表（用户自定义）
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

  // 默认命座溢价
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

  // 需要专武的角色列表
  const DEFAULT_NEED_SIG_WEAPONS = [
    '爱弥斯', '绯雪', '卡提希娅', '千咲', '今汐', '椿', '忌炎',
    '嘉贝莉娜', '弗洛洛', '珂莱塔', '西格莉卡', '赞妮', '陆赫斯',
  ];

  // 权重标签定义（供设置面板显示用）
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

  // 存储键
  const STORAGE_KEYS = {
    table: 'mw_monitor_table',
    seen: 'mw_monitor_seen',
    notified: 'mw_monitor_notified',
    state: 'mw_monitor_state',
    weights: 'mw_monitor_config',
  };

  // API地址（从螃蟹网页面JS源码中逆向获取）
  // V.SEARCH = "/search", V.PRODUCT = "/product/web"
  // zt(url, body) = POST, Dt(url, body, {query}) = GET
  // 所有路径前自动加 /api 前缀
  const API_URLS = {
    list: 'https://api-pc.pxb7.com/api/search/product/v2/selectSearchPageList',
    detail: 'https://api-pc.pxb7.com/api/product/web/product/detailPost',
    options: 'https://api-pc.pxb7.com/api/product/web/gameBizProd/selectSearchOption',
  };

  // 配置常量
  const CONFIG = {
    refreshInterval: 60000,      // 列表刷新间隔 60秒
    detailInterval: 4000,        // 详情API调用间隔 4秒
    detailRateLimit: 15,         // 详情API每分钟限制
    maxTableRows: 1000,           // 表格最大行数
    maxSeenIds: 5000,            // 已见ID最大数量
    maxNotifiedIds: 500,         // 已通知ID最大数量
    scanPages: 3,                // 默认扫描页数
  };

  // 构建角色名查找表
  const CHAR_LOOKUP = {};
  for (const [tier, info] of Object.entries(CHAR_TIERS)) {
    for (const name of info.chars) {
      CHAR_LOOKUP[name] = { tier, price: info.price, isHot: info.isHot };
    }
  }

  // 已知段落关键词（用于文本分段提取）
  const SECTION_KEYWORDS = [
    '五星角色', '五星武器', '余波珊瑚', '浮金波纹', '铸潮波纹',
    '摩托饰品', '车架模组', '星声', '月相', '服饰', '摩托', '车架', '涂装',
  ];

  // ============================================================
  // 内存状态
  // ============================================================
  let tableData = [];            // 表格数据
  let seenIds = [];              // 已扫描productId
  let notifiedIds = [];          // 已通知productId
  let monitorRunning = false;    // 监控开关
  let notifyEnabled = false;     // 通知开关
  let threshold = 20;            // 估值阈值(%)
  let notifyRatioThreshold = 40; // 通知性价比阈值(%)
  let notifyDiffThreshold = 200; // 通知差价阈值(元)
  let notifyMinValue = 498;      // 通知估值下限(元)，低于此值不通知
  let notifyMinPrice = 0;        // 通知标价下限(元)，低于此值不通知
  let refreshIntervalSec = 30;   // 刷新间隔（秒），可设置
  // 检查已售设置
  let soldCheckRatio = 40;       // 检查已售的性价比阈值(%)
  let soldCheckDiff = 0;         // 检查已售的差价阈值(元)
  let soldCheckMinValue = 0;     // 检查已售的估值下限(元)
  let soldCheckMaxValue = 0;     // 检查已售的估值上限(元，0=不限)
  // 指定账号通知规则
  let charNotifyRules = [{ chars: [{ name: '爱弥斯', minConst: 6 }, { name: '绯雪', minConst: 6 }], minDiff: 0 }];
  // 推送通知配置
  let pushConfig = {
    barkKey: 'SCT378977TClEq1lr2mRcBmHgadFxK6CVr', // Bark推送Key（iOS）
    serverChanKey: '',     // Server酱SendKey（微信）
    pushPlusToken: 'a5a5ac53ced14dbb82ac325bfcf3e4c6', // PushPlus Token（微信）
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
  let detailQueue = [];          // 详情API队列
  let detailTimer = null;        // 详情队列定时器
  let detailCallsThisMinute = 0; // 本分钟详情API调用数
  let detailMinuteStart = Date.now();
  let charFilter = null;         // 角色筛选
  let priceFilter = { min: null, max: null };       // 标价筛选
  let valueFilter = { min: null, max: null };       // 估值筛选
  let diffFilter = { min: null, max: null };        // 差价筛选
  let ratioFilter = { min: null, max: null };       // 性价比筛选
  let searchKeyword = '';                           // 商品编号/文字搜索
  let showOnlySold = false;                         // 是否只显示已售账号
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
  // 存储工具
  // ============================================================
  function loadStorage(key, defaultVal) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultVal;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[鸣潮监控] 读取存储失败:', key, e);
      return defaultVal;
    }
  }

  function saveStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.error('[鸣潮监控] 写入存储失败:', key, e);
      return false;
    }
  }

  /**
   * 精简表格行数据（去除大字段，减小存储体积）
   */
  function slimRow(row) {
    const slim = Object.assign({}, row);
    // 移除估值明细对象（可通过 showTitle 重新计算）
    delete slim.valuation;
    delete slim._cachedValuation;
    // 截断超长标题（保留足够长度以确保角色/武器数据不丢失）
    if (slim.showTitle && slim.showTitle.length > 2000) {
      slim.showTitle = slim.showTitle.substring(0, 2000);
    }
    return slim;
  }

  /**
   * 安全保存表格数据：如果写入失败，逐步精简数据后重试
   */
  function saveTableData() {
    if (saveStorage(STORAGE_KEYS.table, tableData)) return true;

    // 第一次失败：精简每行数据（移除 valuation 等大字段）
    console.warn('[鸣潮监控] 表格数据写入失败，尝试精简数据...');
    const slimmed = tableData.map(slimRow);
    if (saveStorage(STORAGE_KEYS.table, slimmed)) {
      // 精简成功，用精简数据替换内存数据
      tableData = slimmed;
      return true;
    }

    // 第二次失败：减少行数后重试
    for (let limit = 500; limit >= 100; limit -= 100) {
      const trimmed = tableData.slice(0, limit).map(slimRow);
      if (saveStorage(STORAGE_KEYS.table, trimmed)) {
        console.warn('[鸣潮监控] 表格数据缩减至' + limit + '条后写入成功');
        tableData = trimmed;
        // 同步裁剪 seenIds，保持一致
        const keptIds = new Set(trimmed.map(r => r.productId));
        seenIds = seenIds.filter(id => keptIds.has(id));
        saveStorage(STORAGE_KEYS.seen, seenIds);
        return true;
      }
    }

    console.error('[鸣潮监控] 表格数据即使精简后仍无法写入，localStorage 可能已满');
    return false;
  }

  /**
   * 加载估值权重（合并默认值与localStorage中的用户设置）
   * @returns {object} 权重对象（含 charPrices / constPremiums / teamPremiums / pullTiers / yellowTiers）
   */
  function loadWeights() {
    const saved = loadStorage(STORAGE_KEYS.weights, null) || {};
    // 基础权重参数
    const w = Object.assign({}, DEFAULT_WEIGHTS, saved);
    // 嵌套对象单独合并
    w.c6TierWeights = Object.assign({}, DEFAULT_WEIGHTS.c6TierWeights, saved.c6TierWeights || {});
    // 列表类配置：优先用用户保存的，否则用默认
    w.c6MultiBonus = (saved.c6MultiBonus && saved.c6MultiBonus.length) ? saved.c6MultiBonus : DEFAULT_WEIGHTS.c6MultiBonus;
    w.pullC6Bonus = (saved.pullC6Bonus && saved.pullC6Bonus.length) ? saved.pullC6Bonus : DEFAULT_WEIGHTS.pullC6Bonus;
    w.teamMultiBonus = (saved.teamMultiBonus && saved.teamMultiBonus.length) ? saved.teamMultiBonus : DEFAULT_WEIGHTS.teamMultiBonus;
    w.pullTiers = (saved.pullTiers && saved.pullTiers.length) ? saved.pullTiers : DEFAULT_PULL_TIERS;
    w.yellowTiers = (saved.yellowTiers && saved.yellowTiers.length) ? saved.yellowTiers : DEFAULT_YELLOW_TIERS;

    // 改进5：角色价格表（按角色名，合并默认值与用户自定义）
    w.charPrices = Object.assign({}, buildDefaultCharPrices(), saved.charPrices || {});
    // 数据迁移：旧的'秧秧'是五星角色(价格35)，现已改名为'秧秧玄翎'
    // 四星'秧秧'价格应为0，如果旧配置中'秧秧'价格>0说明是旧数据，重置为0
    if (saved.charPrices && saved.charPrices['秧秧'] != null && saved.charPrices['秧秧'] > 0) {
      w.charPrices['秧秧'] = 0;
    }
    // 命座溢价表（使用默认值合并用户自定义）
    w.constPremiums = Object.assign({}, DEFAULT_CONST_PREMIUMS, saved.constPremiums || {});
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
    // 改进5：需要专武的角色列表
    w.needSigWeapons = saved.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
    // 用户自定义专武映射覆盖
    if (saved.sigWeaponsOverride) {
      w.sigWeaponsOverride = saved.sigWeaponsOverride;
    }
    return w;
  }

  /**
   * 保存估值权重到localStorage
   */
  function saveWeights(w) {
    saveStorage(STORAGE_KEYS.weights, w);
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
    // 构建lookahead：所有其他关键词
    const others = SECTION_KEYWORDS.filter(k => k !== keyword)
      .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[：:]');
    const pattern = escaped + '[：:]\\s*([\\s\\S]*?)(?=' + others.join('|') + '|$)';
    const match = text.match(new RegExp(pattern));
    return match ? match[1].trim() : '';
  }

  /**
   * 从文本中提取数字
   */
  function extractNumber(text, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(escaped + '[：:]\\s*(\\d[\\d,]*)', 'i'));
    if (match) return parseInt(match[1].replace(/,/g, ''));
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

    // 按逗号、顿号、空格分割
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

  /**
   * 检查角色是否有专武
   */
  function checkHasSigWeapon(charName, weaponNames, weaponSectionText) {
    const sigName = (weights.sigWeaponsOverride && weights.sigWeaponsOverride[charName]) || SIG_WEAPONS[charName];
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
   * 改进5：计算角色命座溢价（达到指定命座数时额外加价，只取最高溢价不叠加）
   * @param {string} charName - 角色名
   * @param {number} constCount - 命座数
   * @param {object} w - 权重对象（可选）
   * @returns {number} 溢价金额
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
   * 按阶梯区间累加计算（保留原累计逻辑），并返回当前所处阶梯信息
   * @param {number} pulls - 总抽数
   * @returns {object} { pulls, perPull, tierLabel, total }
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
   * @param {number} yellowCount - 黄数
   * @returns {object} { yellowCount, coefficient, tierLabel }
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

  /**
   * 从文本中提取某个关键词段落的条目列表（用于服饰/摩托/车架/涂装明细）
   * @param {string} text - 完整描述文本
   * @param {string} keyword - 关键词
   * @returns {Array} 条目列表
   */
  function extractListItems(text, keyword) {
    const section = extractSection(text, keyword);
    if (!section) return [];
    return section.split(/[,，、\s]+/).filter(s => s.length > 0);
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

    for (const char of parsed.characters) {
      const hasSig = checkHasSigWeapon(char.name, weaponNames, weaponSectionText);
      const val = getCharValue(char, hasSig, w);
      // 改进5：命座溢价（用户自定义的额外加价）
      const premium = calcConstPremium(char.name, char.const, w);
      charValue += val + premium;
      if (hasSig && !hasSignatureWeapons.includes(char.name)) hasSignatureWeapons.push(char.name);

      // 统计加权满命数
      let fullConstWeightVal = 0;
      if (char.const >= 6) {
        fullConstWeightVal = c6Weights[char.tier] != null ? c6Weights[char.tier] : (FULL_CONST_WEIGHT[char.tier] || 0);
        weightedFullConst += fullConstWeightVal;
      }

      // 改进3：获取专武精炼数（0表示无专武，1-5表示精1-5）
      let sigRefine = 0;
      if (hasSig) {
        const sigName = (weights.sigWeaponsOverride && weights.sigWeaponsOverride[char.name]) || SIG_WEAPONS[char.name];
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
        const charSigName = (w.sigWeaponsOverride && w.sigWeaponsOverride[char.name]) || SIG_WEAPONS[char.name];
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

    // 总价值
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
      c6Bonus: { value: Math.round(fullConstPremium), notes: c6BonusNotes }, // 满命溢价信息
      teamBonus: { value: Math.round(teamPremium), notes: teamBonusNotes },  // 配队溢价信息
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
      outfits: outfits,                    // 服饰列表
      motoAccessories: motoAccessories,    // 摩托饰品列表
      motoFrames: motoFrames,              // 车架列表
      paints: paints,                      // 涂装列表
      level: level,                        // 账号等级
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
    const response = await fetch(API_URLS.list, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '',
        gameId: '10302',
        pageIndex: page,
        pageSize: 20,
        bizProd: 1,
        type: '4',
        posType: 1,
      }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  }

  /**
   * 带重试的列表API调用
   */
  async function fetchListWithRetry(page, retries = 1) {
    for (let i = 0; i <= retries; i++) {
      try {
        const data = await fetchList(page);
        if (data && data.success) return data;
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

  /**
   * 调用详情API
   */
  async function fetchDetail(productId) {
    const response = await fetch(API_URLS.detail, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: productId }),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
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
  function handleListResponse(list, fromIntercept) {
    if (!Array.isArray(list)) return;

    if (fromIntercept) {
      interceptCount++;
      lastInterceptTime = new Date();
      updateStatusText();
    }

    for (const item of list) {
      processProduct(item);
    }
  }

  /**
   * 处理单个商品
   */
  function processProduct(item) {
    const productId = item.productId || item.id;
    if (!productId) return;

    const showTitle = item.showTitle || item.title || '';
    const price = (item.price || 0) / 100; // 分转元

    // 自主截图账号不记录
    if (/自主截图/.test(showTitle)) return;

    // 去重：已见商品检查价格是否变化
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
        sortTableData();
        saveTableData();
        refreshTableDisplay();
        console.log('[鸣潮监控] 降价: ' + (existRow.productUniqueNo || productId) + ' ¥' + oldPrice + ' → ¥' + price);

        // 降价通知（如果估值仍满足通知条件）
        if (existRow.value >= notifyMinValue && price >= notifyMinPrice &&
            (existRow.value - price) > notifyDiffThreshold && !notifiedIds.includes(productId + '_drop')) {
          const dropMsg = '降价¥' + (oldPrice - price).toFixed(0) +
            ' ' + (existRow.productUniqueNo || '') +
            ' ¥' + oldPrice.toFixed(0) + '→¥' + price.toFixed(0) +
            ' 估值¥' + (existRow.value || 0).toFixed(0);
          notify(productId + '_drop', '降价提醒 ' + existRow.ratio.toFixed(1) + '%', dropMsg);
          notifiedIds.push(productId + '_drop');
          if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
          saveStorage(STORAGE_KEYS.notified, notifiedIds);
        }
      }
      return;
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

    // 添加到表格
    addTableRow({
      productId,
      productUniqueNo,
      showTitle,
      price,
      value: valuation.totalValue,
      ratio: valuation.ratio,
      status: '初估',
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

    // 加入详情队列：性价比超阈值、S级满命、匹配指定规则、或性价比/差价达通知阈值
    const hasSC6 = parsed.characters.some(c => c.tier === 'S' && c.const === 6);
    // 检查是否匹配指定账号通知规则（须满足全部角色条件）
    const matchesCharRule = charNotifyRules.length > 0 && charNotifyRules.some(rule =>
      rule.chars.every(rc => parsed.characters.some(c => c.name === rc.name && c.const >= rc.minConst))
    );
    // 检查是否达通知阈值（确保低于入队阈值但达通知阈值的账号也能入队）
    const meetsNotifyThreshold = valuation.diff != null && valuation.diff > notifyDiffThreshold;
    if (valuation.ratio > threshold || hasSC6 || matchesCharRule || meetsNotifyThreshold) {
      enqueueDetail(productId);
    }
  }

  // ============================================================
  // 详情API队列管理
  // ============================================================

  /**
   * 加入详情队列
   */
  function enqueueDetail(productId) {
    // 避免重复入队
    if (detailQueue.find(item => item.productId === productId)) return;
    // 避免已处理的
    const row = tableData.find(r => r.productId === productId);
    if (row && row.status === '详估') return;

    detailQueue.push({ productId, time: Date.now() });
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

    fetchDetail(item.productId).then(data => {
      if (data && data.success && data.data) {
        const showTitle = data.data.showTitle || data.data.title || '';
        const price = (data.data.price || 0) / 100;
        // 改进2：从详情API提取字母编号 productUniqueNo
        const productUniqueNo = data.data.productUniqueNo || data.data.uniqueNo || '';

        // 重新解析和估值
        const parsed = parseAccountInfo(showTitle);
        const valuation = calculateValue(parsed, price);

        // 更新表格行
        updateTableRow(item.productId, {
          showTitle,
          price,
          productUniqueNo,
          value: valuation.totalValue,
          ratio: valuation.ratio,
          status: '详估',
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
        // 自主截图账号不通知（信息不可靠）
        const isSelfScreenshot = /自主截图/.test(showTitle);
        if (notifyEnabled && !isSelfScreenshot && !notifiedIds.includes(item.productId)) {
          // 1. 优先检查指定账号通知规则（须满足全部角色条件 + 差价）
          const matchedRules = charNotifyRules.filter(rule =>
            rule.chars.every(rc => parsed.characters.some(c => c.name === rc.name && c.const >= rc.minConst))
          );
          // 常规通知条件：差价超过阈值，且估值/标价不低于各自下限
          const shouldNotifyRegular = (valuation.diff > notifyDiffThreshold)
            && valuation.totalValue >= notifyMinValue
            && price >= notifyMinPrice;

          // 指定账号通知条件：匹配规则 + 差价满足该规则的 minDiff
          let charRuleTriggered = false;
          let triggeredRule = null;
          if (matchedRules.length > 0) {
            for (const r of matchedRules) {
              if (valuation.diff > (r.minDiff || 0)) {
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
            const title = charRuleTriggered
              ? '指定账号 ' + matchedCharNames + ' 差价' + valuation.diff.toFixed(0) + '元'
              : '高差价账号 差价' + valuation.diff.toFixed(0) + '元';

            // 角色明细估值摘要
            let charDetailStr = '';
            if (valuation.charBreakdown && valuation.charBreakdown.length > 0) {
              const topChars = valuation.charBreakdown
                .slice()
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
              charDetailStr = topChars.map(cb => {
                const constStr = cb.const > 0 ? (cb.const === 6 ? '满' : cb.const + '命') : '';
                return cb.name + constStr + '(' + cb.value + '元)';
              }).join(' ');
            }

            // 资源明细估值摘要
            let resourceStr = '';
            const resParts = [];
            if (valuation.pullValue > 0) {
              var pinfo = valuation.pullInfo;
              var pullStr = '抽数' + pinfo.tierLabel + ':' + pinfo.baseTotal + '元';
              if (pinfo.c6Bonus > 0) {
                pullStr += '+满命加成(+' + Math.round((pinfo.c6Multiplier || 0) * 100) + '%):' + pinfo.c6Bonus + '元';
              }
              resParts.push(pullStr);
            }
            if (valuation.fullConstPremium > 0) resParts.push('满命溢价:' + valuation.fullConstPremium + '元');
            if (valuation.teamPremium > 0) resParts.push('配队:' + valuation.teamPremium + '元');
            if (valuation.otherResources > 0) resParts.push('其他:' + valuation.otherResources + '元');
            resourceStr = resParts.join(' ');

            const body = '标价' + price.toFixed(0) + '元 估值' + valuation.totalValue.toFixed(0) + '元 差价' + valuation.diff.toFixed(0) + '元\n' +
              (charDetailStr ? '角色: ' + charDetailStr + '\n' : '') +
              (resourceStr ? '资源: ' + resourceStr + '\n' : '') +
              showTitle.substring(0, 80);
            notify(item.productId, title, body);
            notifiedIds.push(item.productId);
            if (notifiedIds.length > CONFIG.maxNotifiedIds) notifiedIds.shift();
            saveStorage(STORAGE_KEYS.notified, notifiedIds);
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
   * 添加表格行
   */
  function addTableRow(row) {
    // 检查是否已存在
    const existIdx = tableData.findIndex(r => r.productId === row.productId);
    if (existIdx >= 0) {
      tableData[existIdx] = Object.assign(tableData[existIdx], row);
    } else {
      tableData.push(row);
    }

    // 排序：按差价降序
    sortTableData();

    // 限制最大行数
    if (tableData.length > CONFIG.maxTableRows) {
      tableData = tableData.slice(0, CONFIG.maxTableRows);
    }

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
      Object.assign(row, updates);
      sortTableData();
      saveTableData();
      refreshTableDisplay();
    } else {
      // 行不存在（可能被挤出），重新创建
      console.log('[鸣潮监控] 行不存在，重新创建:', productId);
      tableData.push(Object.assign({ productId: productId }, updates));
      sortTableData();
      // 限制最大行数
      if (tableData.length > CONFIG.maxTableRows) {
        tableData = tableData.slice(0, CONFIG.maxTableRows);
      }
      saveTableData();
      refreshTableDisplay();
    }
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
          valA = (a.parsed && a.parsed.yellowCount) ? a.parsed.yellowCount : 0;
          valB = (b.parsed && b.parsed.yellowCount) ? b.parsed.yellowCount : 0;
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
          height: 500px;
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
        /* 统一颜色规则：<-20%红色, -20%~20%灰色, 20%~50%橙色, >50%绿色 */
        .mw-color-red { color: #ef4444; }
        .mw-color-gray { color: #8888aa; }
        .mw-color-orange { color: #f59e0b; font-weight: bold; }
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
          <button class="mw-btn" id="mwBtnMonitor">开始监控</button>
          <button class="mw-btn" id="mwBtnNotify">开启通知</button>
          <button class="mw-btn" id="mwBtnNotifySettings">通知设置</button>
          <button class="mw-btn" id="mwBtnRefresh">立即刷新</button>
          <button class="mw-btn" id="mwBtnSettings">估值设置</button>
          <button class="mw-btn" id="mwBtnClearTable">清空表格</button>
          <button class="mw-btn" id="mwBtnCheckSold">检查已售</button>
          <button class="mw-btn" id="mwBtnExportCSV">导出CSV</button>
          <span class="mw-input-label">≥</span>
          <input type="number" class="mw-input" id="mwInputThreshold" value="20" min="0" max="999">%
          <button class="mw-collapse-btn" id="mwBtnCollapse" title="折叠/展开">—</button>
        </div>
      </div>
      <div class="mw-filter-bar" id="mwFilterBar" style="display:none;">
        <span>筛选角色: <strong id="mwFilterChar"></strong></span>
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
        <label style="color:#8888aa;font-size:12px;cursor:pointer;white-space:nowrap;"><input type="checkbox" id="mwShowOnlySold" style="vertical-align:middle;">只显示已售</label>
        <span class="mw-filter-clear" id="mwNumFilterClear">重置</span>
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
              <th class="mw-sortable" data-col="yellow">黄</th>
              <th class="mw-sortable" data-col="pulls">抽数</th>
              <th>摩托</th>
              <th>五星角色</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody id="mwTableBody">
            <tr><td colspan="10" class="mw-empty">等待数据加载...</td></tr>
          </tbody>
        </table>
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
    dom.btnCheckSold = document.getElementById('mwBtnCheckSold');
    dom.btnExportCSV = document.getElementById('mwBtnExportCSV');
    dom.inputThreshold = document.getElementById('mwInputThreshold');
    dom.tableBody = document.getElementById('mwTableBody');
    dom.filterBar = document.getElementById('mwFilterBar');
    dom.filterChar = document.getElementById('mwFilterChar');
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
      // 不在按钮和输入框上触发拖拽
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
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
      box.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:24px;width:480px;max-height:85vh;overflow-y:auto;color:#e0e0e0;';
      box.innerHTML =
        '<div style="font-size:16px;font-weight:600;margin-bottom:16px;color:#e94560;">通知设置</div>' +
        // 刷新间隔
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">刷新设置</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">刷新间隔（秒）</label>' +
        '<input type="number" id="mwRefreshInterval" value="' + refreshIntervalSec + '" min="10" max="3600" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">自动刷新列表的时间间隔，建议30~120秒</div>' +
        // 通知阈值
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">通知阈值</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">差价阈值（元）</label>' +
        '<input type="number" id="mwNotifyDiff" value="' + notifyDiffThreshold + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">差价超过阈值时发送通知</div>' +
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
        // 检查已售设置
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">检查已售设置</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">性价比阈值（%）</label>' +
        '<input type="number" id="mwSoldCheckRatio" value="' + soldCheckRatio + '" min="0" max="9999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">差价阈值（元）</label>' +
        '<input type="number" id="mwSoldCheckDiff" value="' + soldCheckDiff + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">估值下限（元）</label>' +
        '<input type="number" id="mwSoldCheckMinValue" value="' + soldCheckMinValue + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">估值上限（元，0=不限）</label>' +
        '<input type="number" id="mwSoldCheckMaxValue" value="' + soldCheckMaxValue + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">检查性价比或差价任一超过阈值的账号，且估值在下限~上限范围内（填0表示不限制该条件）</div>' +
        // 最低限制
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">最低限制</div>' +
        '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">估值下限（元）</label>' +
        '<input type="number" id="mwNotifyMinValue" value="' + notifyMinValue + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '<div style="flex:1;"><label style="font-size:12px;color:#888;display:block;margin-bottom:4px;">标价下限（元）</label>' +
        '<input type="number" id="mwNotifyMinPrice" value="' + notifyMinPrice + '" min="0" max="999999" style="width:100%;padding:8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:13px;" /></div>' +
        '</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:16px;">估值或标价低于各自下限时不会发送通知（填0表示不限制）</div>' +
        // 提醒方式
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">提醒方式</div>' +
        '<div style="margin-bottom:8px;"><label style="font-size:13px;color:#ccc;cursor:pointer;"><input type="checkbox" id="mwSoundAlert" ' + (pushConfig.soundAlert ? 'checked' : '') + ' style="margin-right:6px;">声音提醒（连续蜂鸣3次）</label></div>' +
        '<div style="margin-bottom:8px;"><label style="font-size:13px;color:#ccc;cursor:pointer;"><input type="checkbox" id="mwVisualAlert" ' + (pushConfig.visualAlert ? 'checked' : '') + ' style="margin-right:6px;">视觉提醒（标题闪烁+大横幅）</label></div>' +
        '<div style="margin-bottom:16px;"><label style="font-size:13px;color:#ccc;cursor:pointer;"><input type="checkbox" id="mwRepeatAlert" ' + (pushConfig.repeatAlert ? 'checked' : '') + ' style="margin-right:6px;">重复提醒（每30秒直到确认）</label></div>' +
        // 手机推送
        '<div style="font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:8px;">手机推送</div>' +
        '<div style="font-size:11px;color:#666;margin-bottom:12px;">配置后可发送推送到手机，即使浏览器关闭也能收到</div>' +
        // Bark
        '<div style="margin-bottom:12px;padding:10px;background:#16213e;border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;color:#10b981;margin-bottom:4px;">Bark推送（iOS推荐）</div>' +
          '<div style="font-size:10px;color:#666;margin-bottom:6px;">下载Bark App，复制推送Key（格式如 xxxxx）</div>' +
          '<input type="text" id="mwBarkKey" value="' + (pushConfig.barkKey || '') + '" placeholder="Bark Key" style="width:100%;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" />' +
        '</div>' +
        // Server酱
        '<div style="margin-bottom:12px;padding:10px;background:#16213e;border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;color:#10b981;margin-bottom:4px;">Server酱（微信推送）</div>' +
          '<div style="font-size:10px;color:#666;margin-bottom:6px;">访问 sct.ftqq.com 登录后获取 SendKey</div>' +
          '<input type="text" id="mwServerChanKey" value="' + (pushConfig.serverChanKey || '') + '" placeholder="SendKey" style="width:100%;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;" />' +
        '</div>' +
        // PushPlus
        '<div style="margin-bottom:16px;padding:10px;background:#16213e;border-radius:8px;">' +
          '<div style="font-size:12px;font-weight:600;color:#10b981;margin-bottom:4px;">PushPlus（微信推送）</div>' +
          '<div style="font-size:10px;color:#666;margin-bottom:6px;">访问 pushplus.plus 登录后获取 Token，多个Token用逗号或换行分隔</div>' +
          '<textarea id="mwPushPlusToken" placeholder="Token1,Token2 或每行一个" style="width:100%;height:60px;padding:6px 8px;border:1px solid #0f3460;border-radius:4px;background:#0d1a3a;color:#e0e0e0;font-size:12px;resize:vertical;">' + (pushConfig.pushPlusToken || '') + '</textarea>' +
        '</div>' +
        // 测试按钮
        '<div style="margin-bottom:16px;text-align:center;">' +
          '<button id="mwTestPush" style="padding:8px 24px;border:1px solid #0f3460;border-radius:6px;background:#16213e;color:#10b981;font-size:13px;cursor:pointer;">发送测试通知</button>' +
        '</div>' +
        // 操作按钮
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
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
            var diffStr = r.minDiff > 0 ? ('差价>' + r.minDiff + '元') : '不限差价';
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

      // 测试推送
      box.querySelector('#mwTestPush').onclick = function () {
        notify('test', '测试通知 - 鸣潮监控助手', '如果您收到了这条通知，说明推送配置正确！\n标价100元 估值200元\n差价+100元 性价比+100%');
      };

      box.querySelector('#mwNotifyCancel').onclick = function () { overlay.remove(); };
      box.querySelector('#mwNotifySave').onclick = function () {
        notifyDiffThreshold = parseFloat(box.querySelector('#mwNotifyDiff').value) || 0;
        notifyMinValue = parseFloat(box.querySelector('#mwNotifyMinValue').value) || 0;
        notifyMinPrice = parseFloat(box.querySelector('#mwNotifyMinPrice').value) || 0;
        var newInterval = parseInt(box.querySelector('#mwRefreshInterval').value) || 60;
        if (newInterval < 10) newInterval = 10;
        if (newInterval > 3600) newInterval = 3600;
        var intervalChanged = newInterval !== refreshIntervalSec;
        refreshIntervalSec = newInterval;
        soldCheckRatio = parseFloat(box.querySelector('#mwSoldCheckRatio').value) || 0;
        soldCheckDiff = parseFloat(box.querySelector('#mwSoldCheckDiff').value) || 0;
        soldCheckMinValue = parseFloat(box.querySelector('#mwSoldCheckMinValue').value) || 0;
        soldCheckMaxValue = parseFloat(box.querySelector('#mwSoldCheckMaxValue').value) || 0;
        // charNotifyRules 已在添加/删除时实时修改，无需额外读取
        pushConfig.soundAlert = box.querySelector('#mwSoundAlert').checked;
        pushConfig.visualAlert = box.querySelector('#mwVisualAlert').checked;
        pushConfig.repeatAlert = box.querySelector('#mwRepeatAlert').checked;
        pushConfig.barkKey = box.querySelector('#mwBarkKey').value.trim();
        pushConfig.serverChanKey = box.querySelector('#mwServerChanKey').value.trim();
        pushConfig.pushPlusToken = box.querySelector('#mwPushPlusToken').value.trim();
        saveState();
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

    dom.btnExportCSV.addEventListener('click', exportCSV);

    // 检查已售
    dom.btnCheckSold.addEventListener('click', checkSoldAccounts);

    dom.inputThreshold.addEventListener('change', function () {
      threshold = parseInt(dom.inputThreshold.value) || 20;
      saveState();
      updateStatusText();
      refreshTableDisplay();
    });

    dom.filterClear.addEventListener('click', function () {
      charFilter = null;
      dom.filterBar.style.display = 'none';
      refreshTableDisplay();
    });

    // 数值筛选输入框事件（输入时实时筛选）
    function bindNumFilter(inputId, filterObj, key) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.addEventListener('input', function () {
        const v = this.value.trim();
        filterObj[key] = (v === '' || isNaN(parseFloat(v))) ? null : parseFloat(v);
        refreshTableDisplay();
      });
    }
    // 搜索框事件
    const searchInput = document.getElementById('mwSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchKeyword = this.value.trim().toLowerCase();
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
          const sigName = (weights.sigWeaponsOverride && weights.sigWeaponsOverride[c.name]) || SIG_WEAPONS[c.name];
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
      const active = charFilter === c.name ? 'mw-char-tag-active' : '';
      // 颜色：S红 A金 其他默认
      let colorStyle = '';
      if (c.tier === 'S') colorStyle = 'color:#e94560;border-color:#e94560;';
      else if (c.tier === 'A') colorStyle = 'color:#f59e0b;border-color:#f59e0b;';
      // 改进3：专武标记改为 +精炼数 格式（如 +1 表示精1专武）
      const sigMark = c.hasSig ? '<span style="color:#10b981;font-weight:bold;">+' + (c.sigRefine || 1) + '</span>' : '';
      // title 完整信息
      const tierLabel = c.tier + '级';
      const constLabel = c.const + '命';
      const sigLabel = c.hasSig ? '有专武(精' + (c.sigRefine || 1) + ')' : '无专武';
      const valLabel = c.value > 0 ? '估值' + c.value + '元' : '';
      const titleText = c.name + ' ' + constLabel + ' ' + sigLabel + ' ' + tierLabel + (valLabel ? ' ' + valLabel : '');
      return '<span class="mw-char-tag ' + active + '" data-char="' + c.name + '" style="' + colorStyle +
        '" title="' + titleText.replace(/"/g, '&quot;') + '">' + abbr + c.const + sigMark + '</span>';
    }).join('');

    if (rest > 0) {
      tagsHtml += '<span class="mw-char-tag" style="color:#8888aa;cursor:default;" title="还有' + rest + '个角色">+' + rest + '</span>';
    }
    return tagsHtml;
  }

  /**
   * 刷新表格显示
   */
  function refreshTableDisplay() {
    if (!dom.tableBody) return;

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
    // 角色筛选
    if (charFilter) {
      displayData = displayData.filter(row =>
        row.parsed && row.parsed.characters && row.parsed.characters.some(c => c.name === charFilter)
      );
    }
    // 隐藏已售
    // 只显示已售
    if (showOnlySold) {
      displayData = displayData.filter(row => row.status === '已售');
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
      dom.tableBody.innerHTML = '<tr><td colspan="10" class="mw-empty">' +
        (charFilter ? '当前筛选无数据' : '暂无数据，等待监控...') + '</td></tr>';
      return;
    }

    // 构建表格行
    let html = '';
    for (const row of displayData) {
      const diff = row.value - row.price;
      const ratio = row.ratio || 0;
      const isPositive = diff > 0;
      const isGold = ratio > threshold;

      // 统一颜色规则：<-20%红色, -20%~20%灰色, 20%~50%橙色, >50%绿色
      function getColorClass(ratio) {
        if (ratio < -20) return 'mw-color-red';
        if (ratio < 20) return 'mw-color-gray';
        if (ratio < 50) return 'mw-color-orange';
        return 'mw-color-green';
      }

      // 行样式
      let rowClass = '';
      if (ratio > threshold) rowClass = 'mw-row-gold';
      else if (isPositive) rowClass = 'mw-row-positive';

      // 差价和性价比使用统一颜色规则
      const diffColorClass = getColorClass(ratio);
      const ratioColorClass = getColorClass(ratio);

      // 上架时间
      const listDate = new Date(row.listTime);
      const listStr = listDate.getMonth() + 1 + '/' + listDate.getDate() + ' ' +
        String(listDate.getHours()).padStart(2, '0') + ':' + String(listDate.getMinutes()).padStart(2, '0');

      // 角色标签（改进2：按级别排序显示）
      const charsHtml = buildCharTagsHTML(row);

      // 状态标签（可点击检查已售）
      let statusBadge = '<span class="mw-status-badge mw-badge-init" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击检查是否已售">初估</span>';
      if (row.status === '详估') {
        statusBadge = '<span class="mw-status-badge mw-badge-detail" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击检查是否已售">详估</span>';
      } else if (row.status === '已售') {
        statusBadge = '<span class="mw-status-badge mw-badge-sold" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击重新检查">已售</span>';
      } else if (row.status === '降价') {
        statusBadge = '<span class="mw-status-badge mw-badge-drop" data-check-sold="' + row.productId + '" style="cursor:pointer;" title="点击检查是否已售">降价</span>';
      }

      // 悬浮提示
      const tooltip = (row.showTitle || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').substring(0, 500);

      html += '<tr class="' + rowClass + '" data-product-id="' + row.productId + '" title="' + tooltip + '">' +
        '<td>' + listStr + '</td>' +
        '<td>' + row.value.toFixed(0) + '</td>' +
        '<td class="' + diffColorClass + '">' + (diff >= 0 ? '+' : '') + diff.toFixed(0) + '</td>' +
        '<td class="' + ratioColorClass + '">' + ratio.toFixed(1) + '%</td>' +
        '<td>' + (row.priceHistory && row.priceHistory.length > 0
          ? '<span style="color:#666;text-decoration:line-through;font-size:11px;">¥' + row.priceHistory[0].price.toFixed(0) + '</span> <span style="color:#f59e0b;font-weight:600;">¥' + row.price.toFixed(0) + '</span>'
          : row.price.toFixed(0)) + '</td>' +
        '<td>' + (row.parsed ? row.parsed.yellowCount : 0) + '</td>' +
        '<td>' + (row.parsed ? row.parsed.pulls : 0) + '</td>' +
        '<td>' + (row.parsed ? row.parsed.motoCount : 0) + '</td>' +
        '<td class="mw-chars-cell">' + charsHtml + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '</tr>';
    }

    dom.tableBody.innerHTML = html;

    // 绑定角色标签点击筛选
    const tags = dom.tableBody.querySelectorAll('.mw-char-tag');
    tags.forEach(function (tag) {
      tag.addEventListener('click', function (e) {
        e.stopPropagation();
        const charName = tag.getAttribute('data-char');
        if (!charName) return; // "+N" 标签无 data-char，不响应
        if (charFilter === charName) {
          charFilter = null;
          dom.filterBar.style.display = 'none';
        } else {
          charFilter = charName;
          dom.filterBar.style.display = 'flex';
          dom.filterChar.textContent = charName;
        }
        refreshTableDisplay();
      });
    });

    // 绑定状态标签点击检查已售
    const soldBadges = dom.tableBody.querySelectorAll('[data-check-sold]');
    soldBadges.forEach(function (badge) {
      badge.addEventListener('click', function (e) {
        e.stopPropagation();
        const pid = badge.getAttribute('data-check-sold');
        checkSingleSold(pid, badge);
      });
    });

    // 绑定行悬停/点击事件（改进3：详情面板）
    const rows = dom.tableBody.querySelectorAll('tr[data-product-id]');
    rows.forEach(function (tr) {
      const productId = tr.getAttribute('data-product-id');
      tr.addEventListener('mouseenter', function () {
        if (hoverHideTimer) { clearTimeout(hoverHideTimer); hoverHideTimer = null; }
        showHoverDetail(productId, tr);
      });
      tr.addEventListener('mouseleave', function () {
        hoverHideTimer = setTimeout(function () { hideHoverDetail(); }, 200);
      });
      tr.addEventListener('click', function (e) {
        // 点击角色标签时不触发钉住（标签自身已 stopPropagation）
        if (e.target.classList.contains('mw-char-tag')) return;
        e.stopPropagation();
        togglePinRow(productId, tr);
      });
    });

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
   * 获取行估值信息（若旧数据缺少明细字段则从 showTitle 重新计算并缓存）
   * @param {object} row - 表格行数据
   * @returns {object} 估值结果
   */
  function getRowValuation(row) {
    if (row.valuation && row.valuation.charBreakdown) return row.valuation;
    // 旧数据或 slimRow 精简后：重新解析计算
    if (!row._cachedValuation && row.showTitle) {
      try {
        const parsed = parseAccountInfo(row.showTitle);
        row._cachedValuation = calculateValue(parsed, row.price);
        // 同步 row.value 和 row.ratio，避免旧值（可能来自完整 showTitle）与重算值不一致
        row.value = row._cachedValuation.totalValue;
        row.ratio = row._cachedValuation.ratio;
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
    // 改进1：商品详情页跳转URL改为 /product/{productId}/1 格式
    const productLink = 'https://www.pxb7.com/product/' + row.productId + '/1';

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
          ? '<span style="color:#f59e0b">' + (cb.const === 6 ? '满命' : cb.const + '命') + '</span>'
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
    const matchedTeams = v.matchedTeams || [];

    const outfitVal = outfits.length * (w.outfit || 0);
    const motoAccVal = motoAccessories.length * (w.motoAccessory || 0);
    const motoFrameVal = motoFrames.length * (w.motoFrame || 0);
    const paintVal = paints.length * (w.paint || 0);

    const resItems = [
      { label: '抽数(星声/160+月相/160+珊瑚/8+浮金波纹+铸潮波纹)', val: pullInfo.pulls, unit: '抽', weight: pullInfo.perPull, total: pullInfo.baseTotal || pullInfo.total, tierLabel: pullInfo.tierLabel },
    ];
    // 满命抽数加成明细
    if (pullInfo.c6Bonus > 0) {
      var pullC6Label = '抽数满命加成(加权满命 +' + Math.round((pullInfo.c6Multiplier || 0) * 100) + '%)';
      resItems.push({ label: pullC6Label, val: '-', unit: '', weight: '-', total: pullInfo.c6Bonus });
    }
    resItems.push(
      { label: '服饰/皮肤', val: outfits.length, unit: '个', weight: w.outfit, total: outfitVal },
      { label: '摩托饰品', val: motoAccessories.length, unit: '个', weight: w.motoAccessory, total: motoAccVal },
      { label: '车架模组', val: motoFrames.length, unit: '个', weight: w.motoFrame, total: motoFrameVal },
      { label: '涂装', val: paints.length, unit: '个', weight: w.paint, total: paintVal },
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
      (motoAccessories.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#2d1a3b;color:#a78bfa;">' + motoAccessories.length + '摩托饰品</span>' : '') +
      (motoFrames.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#2d1a3b;color:#a78bfa;">' + motoFrames.length + '车架</span>' : '') +
      (paints.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#2d1a3b;color:#a78bfa;">' + paints.length + '涂装</span>' : '') +
      (matchedTeams.length > 0 ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#3b2d1a;color:#f59e0b;">' + matchedTeams.length + '配队</span>' : '');

    // 满命溢价
    const c6Bonus = v.c6Bonus || { value: 0, notes: [] };
    const c6HTML = (c6Bonus.value > 0) ?
      '<div style="margin-bottom:10px;padding:8px 10px;background:rgba(233,69,96,0.1);border-radius:6px;border-left:3px solid #e94560;">' +
      '<div style="font-size:12px;color:#e94560;font-weight:600;">' + c6Bonus.notes.join('，') + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:2px;">满命角色难度递增，额外加成 ' + c6Bonus.value + '元</div></div>' : '';

    // 黄数阶梯系数
    const yellowHTML = (yellowInfo.yellowCount > 0) ?
      '<div style="margin-bottom:10px;padding:8px 10px;background:rgba(245,158,11,0.1);border-radius:6px;border-left:3px solid #f59e0b;">' +
      '<div style="font-size:12px;color:#f59e0b;font-weight:600;">黄数系数：' + yellowInfo.yellowCount + '黄 [' + yellowInfo.tierLabel + '] × ' + yellowInfo.coefficient + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:2px;">最终估值乘以此系数</div></div>' : '';

    return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Noto Sans CJK SC\',sans-serif;">' +
      // 标题栏
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #0f3460;">' +
        '<div><span style="font-size:16px;font-weight:700;color:' + color + ';">' + (ratio >= 0 ? '+' : '') + ratio + '%</span>' +
        '<span style="margin-left:8px;font-size:12px;padding:2px 8px;border-radius:4px;background:' + color + ';color:#fff;font-weight:600;">' + getRatioLabel(ratio) + '</span></div>' +
        '<div><a href="' + productLink + '" target="_blank" style="font-size:11px;color:#6a9fff;text-decoration:none;cursor:pointer;" title="点击查看账号详情">' + (row.productUniqueNo || String(row.productId).slice(-6)) + ' 🔗</a>' +
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
  // 估值设置面板（改进4）
  // ============================================================

  /**
   * 打开估值设置对话框
   * 参考性价比脚本的设置面板，支持编辑角色定价/倍率/资源定价/抽数阶梯/黄数阶梯/配队
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
      'box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid #0f3460;padding:24px;';

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
    subtitle.textContent = '热门角色(S/A/B)按里程碑估值：C0+专武=基础价, C3+专武=2倍, C6+专武=3倍, 无专武仅值15%。冷门角色(C/D/E)仅加分项。保存后立即生效。';
    dialog.appendChild(subtitle);

    // 收集所有角色名（按级别排序）
    const allCharNames = [];
    for (const tierKey of Object.keys(CHAR_TIERS)) {
      for (const name of CHAR_TIERS[tierKey].chars) allCharNames.push(name);
    }
    allCharNames.sort();

    // ===== 1. 五星角色定价 =====
    const charSection = document.createElement('div');
    charSection.style.cssText = 'margin-bottom:20px;';
    const charTitle = document.createElement('div');
    charTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    charTitle.textContent = '五星角色定价（角色名 + 专武 + 估值）';
    charSection.appendChild(charTitle);

    const charDesc = document.createElement('p');
    charDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    charDesc.innerHTML = '可自由添加、修改、删除角色定价。武器名自动匹配，也可手动修改。<br>S/A/B级为热门角色（按里程碑估值），C/D/E级为冷门角色（仅加分项）。';
    charSection.appendChild(charDesc);

    // 角色定价数据（可增删改）
    var charEntries = [];
    const tierLabels = { S: 'S级 热门人权', A: 'A级 热门限定', B: 'B级 温门核心', C: 'C级 冷门限定', D: 'D级 退环境', E: 'E级 常驻五星' };
    const tierColors = { S: '#10b981', A: '#e94560', B: '#f59e0b', C: '#6b7280', D: '#4b5563', E: '#374151' };
    var tierOrder = ['S', 'A', 'B', 'C', 'D', 'E'];

    // 初始化角色列表
    var defPrices = buildDefaultCharPrices();
    for (var ti = 0; ti < tierOrder.length; ti++) {
      var tk = tierOrder[ti];
      if (!CHAR_TIERS[tk]) continue;
      var tier = CHAR_TIERS[tk];
      for (var ci = 0; ci < tier.chars.length; ci++) {
        var cname = tier.chars[ci];
        var defaultPrice = defPrices[cname] != null ? defPrices[cname] : tier.price;
        var userPrice = w.charPrices[cname] != null ? w.charPrices[cname] : defaultPrice;
        var weapon = (w.sigWeaponsOverride && w.sigWeaponsOverride[cname]) || SIG_WEAPONS[cname] || '';
        charEntries.push({ name: cname, weapon: weapon, price: userPrice, tier: tk });
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

            var delBtn = document.createElement('button');
            delBtn.textContent = '×'; delBtn.title = '删除';
            delBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#1a1a2e;color:#e94560;font-size:14px;cursor:pointer;line-height:1;';
            delBtn.onclick = function() {
              var idx = charEntries.indexOf(entry);
              if (idx >= 0) { charEntries.splice(idx, 1); renderCharList(); }
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
      charEntries.push({ name: nm, weapon: wpn, price: pr, tier: addTierSelect.value });
      renderCharList();
      addNameInput.value = ''; addWeaponInput.value = '';
    };
    addCharRow.appendChild(addCharBtn);
    charSection.appendChild(addCharRow);

    dialog.appendChild(charSection);

    // ===== 2. 命座溢价 =====
    var premSection = document.createElement('div');
    premSection.style.cssText = 'margin-bottom:20px;';
    var premTitle = document.createElement('div');
    premTitle.style.cssText = 'font-size:14px;font-weight:600;color:#10b981;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    premTitle.textContent = '命座溢价（特定角色达到指定命座时额外加价）';
    premSection.appendChild(premTitle);

    var premDesc = document.createElement('p');
    premDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    premDesc.innerHTML = '设置方法：选择角色 → 输入命座数和对应溢价 → 添加。例如：绯雪 3命→+100元，6命→+200元。达到3命加100，达到6命加200（只取最高溢价，不叠加）。';
    premSection.appendChild(premDesc);

    var premList = document.createElement('div');
    premList.style.cssText = 'margin-bottom:12px;';
    // premEntries 统一使用 val 字段，在下方从 weights.constPremiums 初始化
    var premEntries = [];

    function renderPremList() {
      premList.innerHTML = '';
      if (premEntries.length === 0) {
        premList.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无溢价规则</div>';
        return;
      }
      for (var i = 0; i < premEntries.length; i++) {
        (function (idx) {
          var e = premEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;';
          row.innerHTML =
            '<span style="color:#e94560;font-weight:600;min-width:60px;">' + e.name + '</span>' +
            '<span style="color:#f59e0b;">' + e.bp + '命</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#10b981;font-weight:600;">+' + e.val + '元</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:280px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#f59e0b;">编辑命座溢价</div>' +
              '<div style="margin-bottom:8px;font-size:12px;color:#888;">角色：<span style="color:#e94560;font-weight:600;">' + e.name + '</span></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">命座数</label>' +
              '<input type="number" class="edit-bp" value="' + e.bp + '" min="1" max="6" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">溢价金额（元）</label>' +
              '<input type="number" class="edit-val" value="' + e.val + '" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
              '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#f59e0b;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
            editBox.querySelector('.cancel-btn').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-btn').onclick = function () {
              var newBp = parseInt(editBox.querySelector('.edit-bp').value);
              var newVal = parseFloat(editBox.querySelector('.edit-val').value);
              if (newBp >= 1 && newBp <= 6 && !isNaN(newVal)) { e.bp = newBp; e.val = newVal; renderPremList(); }
              editOverlay.remove();
            };
            editOverlay.appendChild(editBox);
            editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
            document.body.appendChild(editOverlay);
          };
          row.querySelector('.del-btn').onclick = function () { premEntries.splice(idx, 1); renderPremList(); };
          premList.appendChild(row);
        })(i);
      }
    }

    // 初始化已有规则
    var existingPrems = w.constPremiums || {};
    for (var premName of Object.keys(existingPrems)) {
      for (var premBp of Object.keys(existingPrems[premName])) {
        premEntries.push({ name: premName, bp: parseInt(premBp), val: existingPrems[premName][premBp] });
      }
    }
    renderPremList();
    premSection.appendChild(premList);

    // 添加新规则的输入行
    var addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    var nameSelect = document.createElement('select');
    nameSelect.style.cssText = 'flex:1;min-width:100px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
    for (var ni = 0; ni < allCharNames.length; ni++) {
      var opt = document.createElement('option');
      opt.value = allCharNames[ni]; opt.textContent = allCharNames[ni];
      nameSelect.appendChild(opt);
    }
    addRow.appendChild(nameSelect);
    var bpInput = document.createElement('input');
    bpInput.type = 'number'; bpInput.min = '1'; bpInput.max = '6'; bpInput.placeholder = '命座';
    bpInput.style.cssText = 'width:60px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:center;';
    addRow.appendChild(bpInput);
    var arrowSpan = document.createElement('span');
    arrowSpan.textContent = '→'; arrowSpan.style.cssText = 'color:#555;font-size:12px;';
    addRow.appendChild(arrowSpan);
    var valInput = document.createElement('input');
    valInput.type = 'number'; valInput.placeholder = '溢价';
    valInput.style.cssText = 'width:70px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;text-align:right;';
    addRow.appendChild(valInput);
    var addBtn = document.createElement('button');
    addBtn.textContent = '添加';
    addBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#10b981;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    addBtn.onclick = function () {
      var nm = nameSelect.value; var bp = parseInt(bpInput.value); var vl = parseFloat(valInput.value);
      if (isNaN(bp) || bp < 1 || bp > 6) { alert('命座数请填1-6'); return; }
      if (isNaN(vl)) { alert('请输入溢价金额'); return; }
      premEntries.push({ name: nm, bp: bp, val: vl });
      renderPremList(); bpInput.value = ''; valInput.value = '';
    };
    addRow.appendChild(addBtn);
    premSection.appendChild(addRow);
    dialog.appendChild(premSection);

    // ===== 3. 抽数阶梯定价 =====
    var pullSection = document.createElement('div');
    pullSection.style.cssText = 'margin-bottom:20px;';
    var pullTitle = document.createElement('div');
    pullTitle.style.cssText = 'font-size:14px;font-weight:600;color:#8ecdf5;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    pullTitle.textContent = '抽数阶梯定价（资源越多每抽越值钱）';
    pullSection.appendChild(pullTitle);
    var pullDesc = document.createElement('p');
    pullDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    pullDesc.innerHTML = '抽数 = 星声/160 + 月相/160 + 余波珊瑚/8 + 浮金波纹 + 铸潮波纹。设置阶梯区间和每抽价值，资源越多越值钱。';
    pullSection.appendChild(pullDesc);

    var pullList = document.createElement('div');
    pullList.style.cssText = 'margin-bottom:12px;';
    var pullEntries = (weights.pullTiers || DEFAULT_PULL_TIERS).map(function (e) { return { minPull: e.minPull, maxPull: e.maxPull, perPullPrice: e.perPullPrice }; });

    function renderPullList() {
      pullList.innerHTML = '';
      if (pullEntries.length === 0) { pullList.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无阶梯规则</div>'; return; }
      pullEntries.sort(function (a, b) { return a.minPull - b.minPull; });
      for (var i = 0; i < pullEntries.length; i++) {
        (function (idx) {
          var e = pullEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;';
          var maxLabel = e.maxPull === Infinity ? '+' : '~' + e.maxPull;
          row.innerHTML =
            '<span style="color:#8ecdf5;font-weight:600;min-width:80px;">' + e.minPull + maxLabel + '抽</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#10b981;font-weight:600;">' + e.perPullPrice + '元/抽</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:300px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#8ecdf5;">编辑抽数阶梯</div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">起始抽数</label>' +
              '<input type="number" class="edit-min" value="' + e.minPull + '" min="0" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">结束抽数（填99999表示无限）</label>' +
              '<input type="number" class="edit-max" value="' + (e.maxPull === Infinity ? 99999 : e.maxPull) + '" min="0" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">每抽价值（元）</label>' +
              '<input type="number" class="edit-price" value="' + e.perPullPrice + '" step="0.1" min="0" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
              '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#8ecdf5;color:#1a1a2e;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
            editBox.querySelector('.cancel-btn').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-btn').onclick = function () {
              var newMin = parseInt(editBox.querySelector('.edit-min').value) || 0;
              var newMaxRaw = parseInt(editBox.querySelector('.edit-max').value) || 99999;
              var newMax = newMaxRaw >= 99999 ? Infinity : newMaxRaw;
              var newPrice = parseFloat(editBox.querySelector('.edit-price').value) || 0;
              if (newMin >= 0 && newPrice >= 0) { e.minPull = newMin; e.maxPull = newMax; e.perPullPrice = newPrice; renderPullList(); }
              editOverlay.remove();
            };
            editOverlay.appendChild(editBox);
            editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
            document.body.appendChild(editOverlay);
          };
          row.querySelector('.del-btn').onclick = function () { pullEntries.splice(idx, 1); renderPullList(); };
          pullList.appendChild(row);
        })(i);
      }
    }

    renderPullList();
    pullSection.appendChild(pullList);

    // 添加新抽数阶梯
    var addPullRow = document.createElement('div');
    addPullRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;';
    var minInput = document.createElement('input');
    minInput.type = 'number'; minInput.min = '0'; minInput.placeholder = '起始';
    minInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addPullRow.appendChild(minInput);
    var dashSpan = document.createElement('span');
    dashSpan.textContent = '~'; dashSpan.style.cssText = 'color:#555;font-size:11px;';
    addPullRow.appendChild(dashSpan);
    var maxInput = document.createElement('input');
    maxInput.type = 'number'; maxInput.min = '0'; maxInput.placeholder = '结束';
    maxInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addPullRow.appendChild(maxInput);
    var pullUnit = document.createElement('span');
    pullUnit.textContent = '抽'; pullUnit.style.cssText = 'color:#888;font-size:11px;';
    addPullRow.appendChild(pullUnit);
    var arrowSpan2 = document.createElement('span');
    arrowSpan2.textContent = '→'; arrowSpan2.style.cssText = 'color:#555;font-size:11px;margin-left:4px;';
    addPullRow.appendChild(arrowSpan2);
    var priceInput = document.createElement('input');
    priceInput.type = 'number'; priceInput.step = '0.1'; priceInput.placeholder = '每抽';
    priceInput.style.cssText = 'width:60px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:right;';
    addPullRow.appendChild(priceInput);
    var yuanSpan = document.createElement('span');
    yuanSpan.textContent = '元'; yuanSpan.style.cssText = 'color:#888;font-size:11px;';
    addPullRow.appendChild(yuanSpan);
    var addPullBtn = document.createElement('button');
    addPullBtn.textContent = '添加';
    addPullBtn.style.cssText = 'padding:5px 12px;border:none;border-radius:4px;background:#8ecdf5;color:#1a1a2e;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
    addPullBtn.onclick = function () {
      var minVal = parseInt(minInput.value) || 0;
      var maxValRaw = parseInt(maxInput.value) || 99999;
      var maxVal = maxValRaw >= 99999 ? Infinity : maxValRaw;
      var priceVal = parseFloat(priceInput.value);
      if (isNaN(priceVal) || priceVal < 0) { alert('请输入每抽价值'); return; }
      pullEntries.push({ minPull: minVal, maxPull: maxVal, perPullPrice: priceVal });
      renderPullList(); minInput.value = ''; maxInput.value = ''; priceInput.value = '';
    };
    addPullRow.appendChild(addPullBtn);
    pullSection.appendChild(addPullRow);

    // 满命抽数加成档位
    var pullC6Divider = document.createElement('div');
    pullC6Divider.style.cssText = 'border-top:1px dashed #0f3460;margin:16px 0 12px 0;';
    pullSection.appendChild(pullC6Divider);

    var pullC6Title = document.createElement('div');
    pullC6Title.style.cssText = 'font-size:13px;font-weight:600;color:#f59e0b;margin-bottom:4px;';
    pullC6Title.textContent = '满命抽数加成（加权满命数 → 抽数价值加成）';
    pullSection.appendChild(pullC6Title);

    var pullC6Desc = document.createElement('p');
    pullC6Desc.style.cssText = 'font-size:11px;color:#888;margin-bottom:10px;line-height:1.5;';
    pullC6Desc.innerHTML = '根据加权满命数（与满命溢价共用），对抽数价值额外加成。如加权满命1 → 抽数价值+30%，加权满命2 → +50%。';
    pullSection.appendChild(pullC6Desc);

    var pullC6List = document.createElement('div');
    pullC6List.style.cssText = 'margin-bottom:10px;';
    var pullC6Entries = (weights.pullC6Bonus || DEFAULT_WEIGHTS.pullC6Bonus).map(function (e) { return { count: e.count, bonus: e.bonus }; });

    function renderPullC6List() {
      pullC6List.innerHTML = '';
      if (pullC6Entries.length === 0) { pullC6List.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无加成规则</div>'; return; }
      pullC6Entries.sort(function (a, b) { return a.count - b.count; });
      for (var i = 0; i < pullC6Entries.length; i++) {
        (function (idx) {
          var e = pullC6Entries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;';
          row.innerHTML =
            '<span style="color:#f59e0b;font-weight:600;min-width:80px;">加权满命' + e.count + '</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#10b981;font-weight:600;">+' + (e.bonus * 100) + '%</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:300px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#f59e0b;">编辑抽数满命加成</div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">加权满命数</label>' +
              '<input type="number" class="edit-count" value="' + e.count + '" min="1" step="0.5" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">加成系数（0.5=+50%）</label>' +
              '<input type="number" class="edit-bonus" value="' + e.bonus + '" min="0" step="0.05" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
              '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#f59e0b;color:#1a1a2e;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
            editBox.querySelector('.cancel-btn').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-btn').onclick = function () {
              var newCount = parseFloat(editBox.querySelector('.edit-count').value) || 0;
              var newBonus = parseFloat(editBox.querySelector('.edit-bonus').value) || 0;
              if (newCount >= 1 && newBonus >= 0) { e.count = newCount; e.bonus = newBonus; renderPullC6List(); }
              editOverlay.remove();
            };
            editOverlay.appendChild(editBox);
            editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
            document.body.appendChild(editOverlay);
          };
          row.querySelector('.del-btn').onclick = function () { pullC6Entries.splice(idx, 1); renderPullC6List(); };
          pullC6List.appendChild(row);
        })(i);
      }
    }
    renderPullC6List();
    pullSection.appendChild(pullC6List);

    // 添加新抽数满命加成
    var addPullC6Row = document.createElement('div');
    addPullC6Row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;';
    var pc6CountInput = document.createElement('input');
    pc6CountInput.type = 'number'; pc6CountInput.min = '1'; pc6CountInput.step = '0.5'; pc6CountInput.placeholder = '加权满命';
    pc6CountInput.style.cssText = 'width:80px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addPullC6Row.appendChild(pc6CountInput);
    var pc6Arrow = document.createElement('span');
    pc6Arrow.textContent = '→'; pc6Arrow.style.cssText = 'color:#555;font-size:11px;';
    addPullC6Row.appendChild(pc6Arrow);
    var pc6BonusInput = document.createElement('input');
    pc6BonusInput.type = 'number'; pc6BonusInput.min = '0'; pc6BonusInput.step = '0.05'; pc6BonusInput.placeholder = '加成';
    pc6BonusInput.style.cssText = 'width:60px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:right;';
    addPullC6Row.appendChild(pc6BonusInput);
    var pc6Pct = document.createElement('span');
    pc6Pct.textContent = '(0.5=+50%)'; pc6Pct.style.cssText = 'color:#888;font-size:11px;';
    addPullC6Row.appendChild(pc6Pct);
    var addPullC6Btn = document.createElement('button');
    addPullC6Btn.textContent = '添加';
    addPullC6Btn.style.cssText = 'padding:5px 12px;border:none;border-radius:4px;background:#f59e0b;color:#1a1a2e;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
    addPullC6Btn.onclick = function () {
      var cVal = parseFloat(pc6CountInput.value);
      var bVal = parseFloat(pc6BonusInput.value);
      if (isNaN(cVal) || cVal < 1) { alert('加权满命数至少为1'); return; }
      if (isNaN(bVal) || bVal < 0) { alert('请输入加成系数'); return; }
      pullC6Entries.push({ count: cVal, bonus: bVal });
      renderPullC6List(); pc6CountInput.value = ''; pc6BonusInput.value = '';
    };
    addPullC6Row.appendChild(addPullC6Btn);
    pullSection.appendChild(addPullC6Row);
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
    var c6TierList = ['S', 'A', 'B', 'C', 'D'];
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

    // 满命溢价档位列表
    var c6List = document.createElement('div');
    c6List.style.cssText = 'margin-bottom:12px;';
    var c6Entries = (weights.c6MultiBonus || DEFAULT_WEIGHTS.c6MultiBonus).map(function (e) { return { count: e.count, bonus: e.bonus }; });

    function renderC6List() {
      c6List.innerHTML = '';
      if (c6Entries.length === 0) { c6List.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无溢价档位，可点击下方"载入默认"快速添加</div>'; return; }
      c6Entries.sort(function (a, b) { return a.count - b.count; });
      for (var i = 0; i < c6Entries.length; i++) {
        (function (idx) {
          var e = c6Entries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;';
          row.innerHTML =
            '<span style="color:#e94560;font-weight:600;min-width:80px;">等效' + e.count + '个满命</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#10b981;font-weight:600;">加' + Math.round(e.bonus * 100) + '%</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:300px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#e94560;">编辑满命溢价档位</div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">等效满命数量</label>' +
              '<input type="number" class="edit-count" value="' + e.count + '" min="2" max="20" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">加成比例（如0.2=20%）</label>' +
              '<input type="number" class="edit-bonus" value="' + e.bonus + '" min="0" max="5" step="0.1" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:10px;margin-top:12px;">' +
              '<button class="cancel-edit" style="padding:8px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-edit" style="padding:8px 16px;border:none;border-radius:4px;background:#10b981;color:#fff;font-size:12px;cursor:pointer;">保存</button></div>';
            editOverlay.appendChild(editBox);
            document.body.appendChild(editOverlay);
            editBox.querySelector('.cancel-edit').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-edit').onclick = function () {
              var newCount = parseInt(editBox.querySelector('.edit-count').value);
              var newBonus = parseFloat(editBox.querySelector('.edit-bonus').value);
              if (newCount < 2) { alert('数量至少为2'); return; }
              if (newBonus < 0) { alert('加成比例不能为负'); return; }
              e.count = newCount; e.bonus = newBonus; renderC6List(); editOverlay.remove();
            };
          };
          row.querySelector('.del-btn').onclick = function () { var di = c6Entries.indexOf(e); if (di >= 0) c6Entries.splice(di, 1); renderC6List(); };
          c6List.appendChild(row);
        })(i);
      }
    }

    var existingC6Bonus = w.c6MultiBonus || DEFAULT_WEIGHTS.c6MultiBonus;
    for (var c6i = 0; c6i < existingC6Bonus.length; c6i++) {
      var rule = existingC6Bonus[c6i];
      var existingC6 = c6Entries.find(function (e) { return e.count === rule.count; });
      if (existingC6) { existingC6.bonus = Math.max(existingC6.bonus, rule.bonus); }
      else { c6Entries.push({ count: rule.count, bonus: rule.bonus }); }
    }
    renderC6List();
    c6Section.appendChild(c6List);

    // 载入默认按钮
    var loadC6DefaultBtn = document.createElement('button');
    loadC6DefaultBtn.textContent = '载入默认';
    loadC6DefaultBtn.style.cssText = 'margin-right:10px;padding:5px 12px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;';
    loadC6DefaultBtn.onclick = function () {
      c6Entries.length = 0;
      c6Entries.push({ count: 2, bonus: 0.20 });
      c6Entries.push({ count: 3, bonus: 0.50 });
      c6Entries.push({ count: 4, bonus: 1.00 });
      c6Entries.push({ count: 5, bonus: 1.50 });
      renderC6List();
    };
    c6Section.appendChild(loadC6DefaultBtn);

    // 添加新档位
    var addC6Row = document.createElement('div');
    addC6Row.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-top:10px;';
    var c6CountInput = document.createElement('input');
    c6CountInput.type = 'number'; c6CountInput.min = '2'; c6CountInput.max = '20'; c6CountInput.placeholder = '数量';
    c6CountInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addC6Row.appendChild(c6CountInput);
    var c6Unit = document.createElement('span');
    c6Unit.textContent = '个等效满命'; c6Unit.style.cssText = 'color:#888;font-size:11px;';
    addC6Row.appendChild(c6Unit);
    var c6Arrow = document.createElement('span');
    c6Arrow.textContent = '→'; c6Arrow.style.cssText = 'color:#555;font-size:11px;';
    addC6Row.appendChild(c6Arrow);
    var c6BonusInput = document.createElement('input');
    c6BonusInput.type = 'number'; c6BonusInput.min = '0'; c6BonusInput.max = '5'; c6BonusInput.step = '0.1'; c6BonusInput.placeholder = '加成';
    c6BonusInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addC6Row.appendChild(c6BonusInput);
    var c6BonusUnit = document.createElement('span');
    c6BonusUnit.textContent = '(如0.2=20%)'; c6BonusUnit.style.cssText = 'color:#888;font-size:10px;';
    addC6Row.appendChild(c6BonusUnit);
    var addC6Btn = document.createElement('button');
    addC6Btn.textContent = '添加';
    addC6Btn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#e94560;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    addC6Btn.onclick = function () {
      var count = parseInt(c6CountInput.value);
      var bonus = parseFloat(c6BonusInput.value);
      if (isNaN(count) || count < 2) { alert('数量至少为2'); return; }
      if (isNaN(bonus) || bonus < 0) { alert('请输入有效的加成比例'); return; }
      var existingE = c6Entries.find(function (e) { return e.count === count; });
      if (existingE) { existingE.bonus = bonus; renderC6List(); }
      else { c6Entries.push({ count: count, bonus: bonus }); renderC6List(); }
      c6CountInput.value = ''; c6BonusInput.value = '';
    };
    addC6Row.appendChild(addC6Btn);
    c6Section.appendChild(addC6Row);
    dialog.appendChild(c6Section);

    // ===== 5. 黄数阶梯系数 =====
    var yellowSection = document.createElement('div');
    yellowSection.style.cssText = 'margin-bottom:20px;';
    var yellowTitle = document.createElement('div');
    yellowTitle.style.cssText = 'font-size:14px;font-weight:600;color:#f59e0b;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    yellowTitle.textContent = '黄数阶梯系数（黄数越多越稀有，估值乘以此系数）';
    yellowSection.appendChild(yellowTitle);
    var yellowDesc = document.createElement('p');
    yellowDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    yellowDesc.innerHTML = '黄数 = 五星角色数 + 五星武器数。黄数越多越难搜集，最终估值 = 各项估值之和 × 匹配档位的系数。';
    yellowSection.appendChild(yellowDesc);

    var yellowList = document.createElement('div');
    yellowList.style.cssText = 'margin-bottom:12px;';
    var yellowEntries = (weights.yellowTiers || DEFAULT_YELLOW_TIERS).map(function (e) { return { minYellow: e.minYellow, maxYellow: e.maxYellow, coefficient: e.coefficient }; });

    function renderYellowList() {
      yellowList.innerHTML = '';
      if (yellowEntries.length === 0) { yellowList.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无阶梯规则，可点击下方"载入默认"快速添加</div>'; return; }
      yellowEntries.sort(function (a, b) { return a.minYellow - b.minYellow; });
      for (var i = 0; i < yellowEntries.length; i++) {
        (function (idx) {
          var e = yellowEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;';
          var maxLabel = e.maxYellow === Infinity ? '+' : '~' + e.maxYellow;
          row.innerHTML =
            '<span style="color:#f59e0b;font-weight:600;min-width:80px;">' + e.minYellow + maxLabel + '黄</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#10b981;font-weight:600;">×' + e.coefficient + '</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            var editOverlay = document.createElement('div');
            editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
            var editBox = document.createElement('div');
            editBox.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:20px;width:300px;color:#e0e0e0;';
            editBox.innerHTML =
              '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#f59e0b;">编辑黄数阶梯系数</div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">起始黄数</label>' +
              '<input type="number" class="edit-min" value="' + e.minYellow + '" min="0" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">结束黄数（填99999表示无限）</label>' +
              '<input type="number" class="edit-max" value="' + (e.maxYellow === Infinity ? 99999 : e.maxYellow) + '" min="0" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">系数（如0.5=50%）</label>' +
              '<input type="number" class="edit-coef" value="' + e.coefficient + '" min="0" max="10" step="0.1" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;" /></div>' +
              '<div style="display:flex;gap:10px;margin-top:12px;">' +
              '<button class="cancel-edit" style="padding:8px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
              '<button class="save-edit" style="padding:8px 16px;border:none;border-radius:4px;background:#10b981;color:#fff;font-size:12px;cursor:pointer;">保存</button></div>';
            editOverlay.appendChild(editBox);
            document.body.appendChild(editOverlay);
            editBox.querySelector('.cancel-edit').onclick = function () { editOverlay.remove(); };
            editBox.querySelector('.save-edit').onclick = function () {
              var newMin = parseInt(editBox.querySelector('.edit-min').value);
              var newMax = parseInt(editBox.querySelector('.edit-max').value);
              var newCoef = parseFloat(editBox.querySelector('.edit-coef').value);
              if (isNaN(newMin) || newMin < 0) { alert('起始黄数不能为负'); return; }
              if (isNaN(newCoef) || newCoef < 0) { alert('系数不能为负'); return; }
              e.minYellow = newMin; e.maxYellow = newMax >= 99999 ? Infinity : newMax; e.coefficient = newCoef;
              renderYellowList(); editOverlay.remove();
            };
          };
          row.querySelector('.del-btn').onclick = function () { var di = yellowEntries.indexOf(e); if (di >= 0) yellowEntries.splice(di, 1); renderYellowList(); };
          yellowList.appendChild(row);
        })(i);
      }
    }

    renderYellowList();
    yellowSection.appendChild(yellowList);

    // 载入默认按钮
    var loadYellowDefaultBtn = document.createElement('button');
    loadYellowDefaultBtn.textContent = '载入默认';
    loadYellowDefaultBtn.style.cssText = 'margin-right:10px;padding:5px 12px;border:none;border-radius:4px;background:#333;color:#f59e0b;font-size:11px;cursor:pointer;';
    loadYellowDefaultBtn.onclick = function () {
      yellowEntries.length = 0;
      yellowEntries.push({ minYellow: 0, maxYellow: 10, coefficient: 0.3 });
      yellowEntries.push({ minYellow: 10, maxYellow: 20, coefficient: 0.5 });
      yellowEntries.push({ minYellow: 20, maxYellow: 30, coefficient: 0.7 });
      yellowEntries.push({ minYellow: 30, maxYellow: 40, coefficient: 0.9 });
      yellowEntries.push({ minYellow: 40, maxYellow: 50, coefficient: 1.0 });
      yellowEntries.push({ minYellow: 50, maxYellow: 60, coefficient: 1.1 });
      yellowEntries.push({ minYellow: 60, maxYellow: 70, coefficient: 1.2 });
      yellowEntries.push({ minYellow: 70, maxYellow: 80, coefficient: 1.3 });
      yellowEntries.push({ minYellow: 80, maxYellow: 90, coefficient: 1.4 });
      yellowEntries.push({ minYellow: 90, maxYellow: Infinity, coefficient: 1.5 });
      renderYellowList();
    };
    yellowSection.appendChild(loadYellowDefaultBtn);

    // 添加新黄数阶梯
    var addYellowRow = document.createElement('div');
    addYellowRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-top:10px;';
    var yMinInput = document.createElement('input');
    yMinInput.type = 'number'; yMinInput.min = '0'; yMinInput.placeholder = '起始';
    yMinInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addYellowRow.appendChild(yMinInput);
    var yDash = document.createElement('span');
    yDash.textContent = '~'; yDash.style.cssText = 'color:#555;font-size:11px;';
    addYellowRow.appendChild(yDash);
    var yMaxInput = document.createElement('input');
    yMaxInput.type = 'number'; yMaxInput.min = '0'; yMaxInput.placeholder = '结束';
    yMaxInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addYellowRow.appendChild(yMaxInput);
    var yUnit = document.createElement('span');
    yUnit.textContent = '黄'; yUnit.style.cssText = 'color:#888;font-size:11px;';
    addYellowRow.appendChild(yUnit);
    var yArrow = document.createElement('span');
    yArrow.textContent = '→'; yArrow.style.cssText = 'color:#555;font-size:11px;';
    addYellowRow.appendChild(yArrow);
    var yCoefInput = document.createElement('input');
    yCoefInput.type = 'number'; yCoefInput.min = '0'; yCoefInput.max = '10'; yCoefInput.step = '0.1'; yCoefInput.placeholder = '系数';
    yCoefInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:11px;text-align:center;';
    addYellowRow.appendChild(yCoefInput);
    var yCoefUnit = document.createElement('span');
    yCoefUnit.textContent = '(如0.5=50%)'; yCoefUnit.style.cssText = 'color:#888;font-size:10px;';
    addYellowRow.appendChild(yCoefUnit);
    var addYellowBtn = document.createElement('button');
    addYellowBtn.textContent = '添加';
    addYellowBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#f59e0b;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    addYellowBtn.onclick = function () {
      var min = parseInt(yMinInput.value);
      var max = parseInt(yMaxInput.value);
      var coef = parseFloat(yCoefInput.value);
      if (isNaN(min) || min < 0) { alert('起始黄数不能为负'); return; }
      if (isNaN(coef) || coef < 0) { alert('请输入有效的系数'); return; }
      yellowEntries.push({ minYellow: min, maxYellow: isNaN(max) ? Infinity : max, coefficient: coef });
      renderYellowList(); yMinInput.value = ''; yMaxInput.value = ''; yCoefInput.value = '';
    };
    addYellowRow.appendChild(addYellowBtn);
    yellowSection.appendChild(addYellowRow);
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

    // ===== 8. 需要专武的角色（参考用） =====
    var needSigSection = document.createElement('div');
    needSigSection.style.cssText = 'margin-bottom:20px;';
    var needSigTitle = document.createElement('div');
    needSigTitle.style.cssText = 'font-size:14px;font-weight:600;color:#ef4444;margin-bottom:6px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    needSigTitle.textContent = '需要专武的角色（无专武时扣价值）';
    needSigSection.appendChild(needSigTitle);
    var needSigDesc = document.createElement('p');
    needSigDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    needSigDesc.innerHTML = '新版已自动按热门/冷门分类处理专武折扣（热门角色无专武仅值15%基础价）。此列表仅作参考，不再参与计算。';
    needSigSection.appendChild(needSigDesc);

    var needSigList = document.createElement('div');
    needSigList.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;min-height:30px;';
    var needSigEntries = [].concat(w.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS);
    function renderNeedSigList() {
      needSigList.innerHTML = '';
      if (needSigEntries.length === 0) { needSigList.innerHTML = '<div style="font-size:12px;color:#555;padding:4px 0;">暂无角色，可点击下方"载入默认"</div>'; return; }
      for (var i = 0; i < needSigEntries.length; i++) {
        (function (name) {
          var tag = document.createElement('span');
          tag.style.cssText = 'font-size:11px;padding:4px 10px;border-radius:4px;background:#2d1a3b;color:#ef4444;display:inline-flex;align-items:center;gap:4px;';
          tag.innerHTML = name + ' <button style="border:none;background:none;color:#ef4444;font-size:12px;cursor:pointer;padding:0;margin-left:2px;">×</button>';
          tag.querySelector('button').onclick = function () { var di = needSigEntries.indexOf(name); if (di !== -1) needSigEntries.splice(di, 1); renderNeedSigList(); };
          needSigList.appendChild(tag);
        })(needSigEntries[i]);
      }
    }
    renderNeedSigList();
    needSigSection.appendChild(needSigList);

    var needSigRow = document.createElement('div');
    needSigRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
    var needSigSelect = document.createElement('select');
    needSigSelect.style.cssText = 'flex:1;min-width:120px;padding:5px 8px;border:1px solid #0f3460;border-radius:4px;background:#16213e;color:#e0e0e0;font-size:12px;';
    var nsEmptyOpt = document.createElement('option');
    nsEmptyOpt.value = ''; nsEmptyOpt.textContent = '选择角色...';
    needSigSelect.appendChild(nsEmptyOpt);
    for (var nsi = 0; nsi < allCharNames.length; nsi++) {
      if (needSigEntries.includes(allCharNames[nsi])) continue;
      var nsOpt = document.createElement('option');
      nsOpt.value = allCharNames[nsi]; nsOpt.textContent = allCharNames[nsi];
      needSigSelect.appendChild(nsOpt);
    }
    needSigRow.appendChild(needSigSelect);
    var needSigAddBtn = document.createElement('button');
    needSigAddBtn.textContent = '添加';
    needSigAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#ef4444;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    needSigAddBtn.onclick = function () {
      var nm = needSigSelect.value;
      if (!nm || needSigEntries.includes(nm)) return;
      needSigEntries.push(nm);
      renderNeedSigList();
      var opt = needSigSelect.querySelector('option[value="' + nm + '"]');
      if (opt) opt.remove();
      needSigSelect.value = '';
    };
    needSigRow.appendChild(needSigAddBtn);
    needSigSection.appendChild(needSigRow);

    var needSigDefaultBtn = document.createElement('button');
    needSigDefaultBtn.textContent = '载入默认列表';
    needSigDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #ef4444;border-radius:4px;background:transparent;color:#ef4444;font-size:11px;cursor:pointer;';
    needSigDefaultBtn.onclick = function () {
      var defaults = DEFAULT_NEED_SIG_WEAPONS;
      for (var di = 0; di < defaults.length; di++) {
        if (!needSigEntries.includes(defaults[di])) needSigEntries.push(defaults[di]);
      }
      renderNeedSigList();
    };
    needSigSection.appendChild(needSigDefaultBtn);
    dialog.appendChild(needSigSection);

    // ===== 9. 其他权重 =====
    var weightsSection = document.createElement('div');
    weightsSection.style.cssText = 'margin-bottom:20px;';
    var wsTitle = document.createElement('div');
    wsTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:12px;border-bottom:1px solid #0f3460;padding-bottom:6px;';
    wsTitle.textContent = '其他权重（热门/冷门参数 + 资源定价）';
    weightsSection.appendChild(wsTitle);

    var weightInputs = {};
    var skipKeys = { c6TierWeights: true, c6MultiBonus: true, pullC6Bonus: true, teamMultiBonus: true, charPrices: true, constPremiums: true, teamPremiums: true, teams: true, pullTiers: true, yellowTiers: true, needSigWeapons: true };
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
    btnArea.style.cssText = 'display:flex;gap:10px;';

    var resetBtn = document.createElement('button');
    resetBtn.textContent = '恢复默认';
    resetBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#333;color:#ccc;font-size:14px;font-weight:600;cursor:pointer;';
    resetBtn.onclick = function () {
      // 重置其他权重
      for (var key of Object.keys(DEFAULT_WEIGHTS)) {
        if (skipKeys[key] || !weightInputs[key]) continue;
        weightInputs[key].value = DEFAULT_WEIGHTS[key];
      }
      // 重置角色价格
      charEntries.length = 0;
      var rstDefPrices = buildDefaultCharPrices();
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
          });
        }
      }
      renderCharList();
      // 重置命座溢价
      premEntries.length = 0;
      for (var cpName of Object.keys(DEFAULT_CONST_PREMIUMS)) {
        for (var cpBp of Object.keys(DEFAULT_CONST_PREMIUMS[cpName])) {
          premEntries.push({ name: cpName, bp: parseInt(cpBp), val: DEFAULT_CONST_PREMIUMS[cpName][cpBp] });
        }
      }
      renderPremList();
      // 重置抽数阶梯
      pullEntries.length = 0;
      for (var pi2 = 0; pi2 < DEFAULT_PULL_TIERS.length; pi2++) {
        pullEntries.push({ minPull: DEFAULT_PULL_TIERS[pi2].minPull, maxPull: DEFAULT_PULL_TIERS[pi2].maxPull, perPullPrice: DEFAULT_PULL_TIERS[pi2].perPullPrice });
      }
      renderPullList();
      // 重置满命溢价
      c6Entries.length = 0;
      for (var ci = 0; ci < DEFAULT_WEIGHTS.c6MultiBonus.length; ci++) {
        c6Entries.push({ count: DEFAULT_WEIGHTS.c6MultiBonus[ci].count, bonus: DEFAULT_WEIGHTS.c6MultiBonus[ci].bonus });
      }
      renderC6List();
      // 重置抽数满命加成
      pullC6Entries.length = 0;
      for (var pci2 = 0; pci2 < DEFAULT_WEIGHTS.pullC6Bonus.length; pci2++) {
        pullC6Entries.push({ count: DEFAULT_WEIGHTS.pullC6Bonus[pci2].count, bonus: DEFAULT_WEIGHTS.pullC6Bonus[pci2].bonus });
      }
      renderPullC6List();
      // 重置满命权重
      for (var tw = 0; tw < c6TierList.length; tw++) {
        if (c6WeightInputs[c6TierList[tw]]) c6WeightInputs[c6TierList[tw]].value = DEFAULT_WEIGHTS.c6TierWeights[c6TierList[tw]] || 0;
      }
      // 重置黄数阶梯
      yellowEntries.length = 0;
      for (var yi2 = 0; yi2 < DEFAULT_YELLOW_TIERS.length; yi2++) {
        yellowEntries.push({ minYellow: DEFAULT_YELLOW_TIERS[yi2].minYellow, maxYellow: DEFAULT_YELLOW_TIERS[yi2].maxYellow, coefficient: DEFAULT_YELLOW_TIERS[yi2].coefficient });
      }
      renderYellowList();
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
      // 重置需要专武
      needSigEntries.length = 0;
      needSigEntries.push.apply(needSigEntries, DEFAULT_NEED_SIG_WEAPONS);
      renderNeedSigList();
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
      if (Object.keys(newSigWeapons).length > 0) {
        newW.sigWeaponsOverride = newSigWeapons;
      }

      // 收集命座溢价
      var newConstPremiums = {};
      for (var ei = 0; ei < premEntries.length; ei++) {
        if (!newConstPremiums[premEntries[ei].name]) newConstPremiums[premEntries[ei].name] = {};
        newConstPremiums[premEntries[ei].name][premEntries[ei].bp] = premEntries[ei].val;
      }
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

      // 收集抽数阶梯（去重：相同 minPull 只保留最后一条）
      var newPullTiers = [];
      var pullSeen = {};
      for (var pli = 0; pli < pullEntries.length; pli++) {
        var plKey = pullEntries[pli].minPull + '-' + pullEntries[pli].maxPull;
        pullSeen[plKey] = { minPull: pullEntries[pli].minPull, maxPull: pullEntries[pli].maxPull, perPullPrice: pullEntries[pli].perPullPrice };
      }
      for (var plk in pullSeen) { newPullTiers.push(pullSeen[plk]); }
      newPullTiers.sort(function (a, b) { return a.minPull - b.minPull; });
      newW.pullTiers = newPullTiers;

      // 收集抽数满命加成档位
      var newPullC6Bonus = [];
      for (var pci = 0; pci < pullC6Entries.length; pci++) {
        newPullC6Bonus.push({ count: pullC6Entries[pci].count, bonus: pullC6Entries[pci].bonus });
      }
      newW.pullC6Bonus = newPullC6Bonus;

      // 收集满命溢价档位
      var newC6Bonus = [];
      for (var ci2 = 0; ci2 < c6Entries.length; ci2++) {
        newC6Bonus.push({ count: c6Entries[ci2].count, bonus: c6Entries[ci2].bonus });
      }
      newC6Bonus.sort(function (a, b) { return a.count - b.count; });
      newW.c6MultiBonus = newC6Bonus;

      // 收集满命权重
      var newC6Weights = {};
      for (var cw = 0; cw < c6TierList.length; cw++) {
        var cwVal = parseFloat(c6WeightInputs[c6TierList[cw]].value);
        newC6Weights[c6TierList[cw]] = isNaN(cwVal) ? 0 : cwVal;
      }
      newW.c6TierWeights = newC6Weights;

      // 收集黄数阶梯（去重：相同 minYellow 只保留最后一条）
      var newYellowTiers = [];
      var yellowSeen = {};
      for (var yi3 = 0; yi3 < yellowEntries.length; yi3++) {
        var yKey = yellowEntries[yi3].minYellow + '-' + yellowEntries[yi3].maxYellow;
        yellowSeen[yKey] = { minYellow: yellowEntries[yi3].minYellow, maxYellow: yellowEntries[yi3].maxYellow, coefficient: yellowEntries[yi3].coefficient };
      }
      for (var yk in yellowSeen) { newYellowTiers.push(yellowSeen[yk]); }
      newYellowTiers.sort(function (a, b) { return a.minYellow - b.minYellow; });
      newW.yellowTiers = newYellowTiers;

      // 收集需要专武的角色
      newW.needSigWeapons = needSigEntries;

      // 从 teamPremiums 生成 teams 数组
      newW.teams = [];
      for (var tn of Object.keys(newTeamPremiums)) {
        var td2 = newTeamPremiums[tn];
        if (td2 && td2.enabled !== false) {
          newW.teams.push({ name: tn, members: td2.chars || [], multiplier: td2.multiplier || 1.0 });
        }
      }

      // 保存并刷新
      saveWeights(newW);
      weights = newW;
      overlay.remove();
      // 全量重算表格中已有行的估值
      recalcAllRows();
      refreshTableDisplay();
    };

    btnArea.appendChild(resetBtn);
    btnArea.appendChild(cancelBtn);
    btnArea.appendChild(saveBtn);
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

    dom.bottomLeft.textContent = '最后刷新: ' + lastStr + ' | 下次刷新: ' + countdownStr;

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
  // 通知
  // ============================================================

  /**
   * 发送通知
   */
  /**
   * 多层通知系统
   * 1. 桌面通知 + GM通知
   * 2. 声音提醒（连续蜂鸣）
   * 3. 视觉提醒（页面标题闪烁 + 页面内大横幅）
   * 4. 手机推送（Bark/Server酱/PushPlus）
   * 5. 重复提醒（可选）
   */
  function notify(productId, title, body) {
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
    sendPhonePush(title, body, productId);

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
      '<a href="https://www.pxb7.com/product/' + productId + '/1" target="_blank" ' +
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
   * 支持：Bark（iOS）、Server酱（微信）、PushPlus（微信）
   */
  function sendPhonePush(title, body, productId) {
    const pushBody = body + '\n\n详情: https://www.pxb7.com/product/' + productId + '/1';

    // Bark推送（iOS）
    if (pushConfig.barkKey) {
      try {
        const barkUrl = 'https://api.day.app/' + pushConfig.barkKey + '/' +
          encodeURIComponent(title) + '/' + encodeURIComponent(pushBody) +
          '?isArchive=1&sound=bell&group=鸣潮监控';
        GM_xmlhttpRequest({
          method: 'GET',
          url: barkUrl,
          onload: function () { console.log('[鸣潮监控] Bark推送已发送'); },
          onerror: function (e) { console.error('[鸣潮监控] Bark推送失败:', e); }
        });
      } catch (e) { console.error('[鸣潮监控] Bark推送异常:', e); }
    }

    // Server酱推送（微信）
    if (pushConfig.serverChanKey) {
      try {
        GM_xmlhttpRequest({
          method: 'POST',
          url: 'https://sctapi.ftqq.com/' + pushConfig.serverChanKey + '.send',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          data: 'title=' + encodeURIComponent(title) + '&desp=' + encodeURIComponent(pushBody),
          onload: function () { console.log('[鸣潮监控] Server酱推送已发送'); },
          onerror: function (e) { console.error('[鸣潮监控] Server酱推送失败:', e); }
        });
      } catch (e) { console.error('[鸣潮监控] Server酱推送异常:', e); }
    }

    // PushPlus推送（微信）- 支持多个Token
    if (pushConfig.pushPlusToken) {
      var tokens = pushConfig.pushPlusToken.split(/[,\n\s]+/).filter(function(t) { return t.trim().length > 0; });
      tokens.forEach(function(token) {
        token = token.trim();
        if (!token) return;
        try {
          GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://www.pushplus.plus/send',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
              token: token,
              title: title,
              content: pushBody,
              template: 'txt'
            }),
            onload: function () { console.log('[鸣潮监控] PushPlus推送已发送: ' + token.substring(0, 8) + '...'); },
            onerror: function (e) { console.error('[鸣潮监控] PushPlus推送失败:', token.substring(0, 8) + '...', e); }
          });
        } catch (e) { console.error('[鸣潮监控] PushPlus推送异常:', token.substring(0, 8) + '...', e); }
      });
    }
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
   * 检查已售账号（查性价比>20%的账号是否已下架）
   */
  let soldCheckRunning = false;
  async function checkSoldAccounts() {
    if (soldCheckRunning) {
      alert('正在检查中，请稍候...');
      return;
    }

    // 筛选满足条件的账号：性价比或差价任一超过阈值，且未标记已售
    // 阈值为0表示不限制该条件（即该条件恒满足）
    const diff = function(row) { return (row.value || 0) - (row.price || 0); };
    const candidates = tableData.filter(row =>
      row.status !== '已售' &&
      (row.value || 0) >= soldCheckMinValue &&
      (soldCheckMaxValue <= 0 || (row.value || 0) <= soldCheckMaxValue) &&
      (row.ratio > soldCheckRatio || diff(row) > soldCheckDiff)
    );

    if (candidates.length === 0) {
      var ratioStr = soldCheckRatio > 0 ? '性价比>' + soldCheckRatio + '%' : '性价比不限';
      var diffStr = soldCheckDiff > 0 ? '差价>' + soldCheckDiff + '元' : '差价不限';
      var valStr = soldCheckMinValue > 0 ? '估值≥' + soldCheckMinValue + '元' : '';
      if (soldCheckMaxValue > 0) valStr += (valStr ? '且' : '') + '估值≤' + soldCheckMaxValue + '元';
      alert('没有满足条件的账号需要检查（' + ratioStr + ' 或 ' + diffStr + (valStr ? '，且' + valStr : '') + '）');
      return;
    }

    var condStr = '';
    condStr += soldCheckRatio > 0 ? '性价比>' + soldCheckRatio + '%' : '性价比不限';
    condStr += ' 或 ';
    condStr += soldCheckDiff > 0 ? '差价>' + soldCheckDiff + '元' : '差价不限';
    if (soldCheckMinValue > 0) condStr += '，且估值≥' + soldCheckMinValue + '元';
    if (soldCheckMaxValue > 0) condStr += '，估值≤' + soldCheckMaxValue + '元';
    if (!confirm('将检查 ' + candidates.length + ' 个账号（' + condStr + '）是否已售，可能需要几分钟，是否继续？')) return;

    soldCheckRunning = true;
    dom.btnCheckSold.textContent = '检查中...';
    dom.btnCheckSold.style.opacity = '0.6';

    let soldCount = 0;
    let checkedCount = 0;

    for (const row of candidates) {
      checkedCount++;
      dom.btnCheckSold.textContent = '检查中(' + checkedCount + '/' + candidates.length + ')';

      try {
        const resp = await fetchDetail(row.productId);
        // 判断已售：data为null、status===2（下架）、tradeStatus===2（已成交）
        if (!resp || !resp.success || !resp.data) {
          row.status = '已售';
          soldCount++;
        } else if (resp.data.status === 2 || resp.data.tradeStatus === 2) {
          row.status = '已售';
          soldCount++;
        }
      } catch (e) {
        // 请求失败跳过，不标记已售（避免误判）
        console.log('[鸣潮监控] 检查已售失败: ' + row.productId + ' - ' + e.message);
      }

      // 更新表格显示
      refreshTableDisplay();

      // 间隔1秒，避免请求过快
      if (checkedCount < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    saveTableData();
    refreshTableDisplay();

    soldCheckRunning = false;
    dom.btnCheckSold.textContent = '检查已售';
    dom.btnCheckSold.style.opacity = '1';

    alert('检查完成！共检查 ' + candidates.length + ' 个账号，其中 ' + soldCount + ' 个已售。');
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
      } else {
        // 仍在售，恢复原状态（如果之前是已售则改为初估）
        if (row.status === '已售') {
          row.status = '初估';
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

  /**
   * 导出CSV（UTF-8 BOM）
   */
  function exportCSV() {
    // 改进1：移除"商品码"列
    const headers = ['上架时间', '估值', '差价', '性价比', '标价', '原价', '累计降价', '黄数', '抽数', '摩托', '五星角色', '状态'];

    const rows = tableData.map(function (row) {
      const diff = row.value - row.price;
      const charsStr = row.parsed && row.parsed.characters ?
        row.parsed.characters.map(function (c) { return c.name + c.const + '命'; }).join(' ') : '';
      var origPrice = row.priceHistory && row.priceHistory.length > 0 ? row.priceHistory[0].price : row.price;
      return [
        formatDateTime(new Date(row.listTime)),
        row.value.toFixed(2),
        diff.toFixed(2),
        row.ratio.toFixed(1) + '%',
        row.price.toFixed(2),
        origPrice.toFixed(2),
        (row.priceDrop || 0).toFixed(2),
        row.parsed ? row.parsed.yellowCount : 0,
        row.parsed ? row.parsed.pulls : 0,
        row.parsed ? row.parsed.motoCount : 0,
        charsStr,
        row.status,
      ];
    });

    const csv = '\uFEFF' + [headers, ...rows]
      .map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); })
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '鸣潮监控_' + new Date().toISOString().slice(0, 10) + '_' + Date.now() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      notifyMinValue: notifyMinValue,
      notifyMinPrice: notifyMinPrice,
      refreshIntervalSec: refreshIntervalSec,
      soldCheckRatio: soldCheckRatio,
      soldCheckDiff: soldCheckDiff,
      soldCheckMinValue: soldCheckMinValue,
      soldCheckMaxValue: soldCheckMaxValue,
      charNotifyRules: charNotifyRules,
      pushConfig: pushConfig,
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

    // 立即刷新一次
    doRefresh();

    // 启动定时刷新
    monitorTimeout = setTimeout(monitorTick, refreshIntervalSec * 1000);

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

  /**
   * 监控tick
   */
  function monitorTick() {
    if (!monitorRunning) return;
    doRefresh();
    monitorTimeout = setTimeout(monitorTick, refreshIntervalSec * 1000);
  }

  /**
   * 执行刷新（调用列表API）
   */
  async function doRefresh() {
    lastRefreshTime = Date.now();
    nextRefreshTime = Date.now() + refreshIntervalSec * 1000;

    try {
      // 扫描第1页
      const data = await fetchListWithRetry(1);
      // 兼容多种响应格式：data.data.list 或 data.data（数组）
      let list = null;
      if (data && data.success && data.data) {
        list = Array.isArray(data.data) ? data.data : (data.data.list || null);
      }
      if (list) handleListResponse(list, false);

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
    } catch (e) {
      console.error('[鸣潮监控] 列表刷新失败:', e);
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
    seenIds = loadStorage(STORAGE_KEYS.seen, []);
    notifiedIds = loadStorage(STORAGE_KEYS.notified, []);

    const savedState = loadStorage(STORAGE_KEYS.state, {});
    threshold = savedState.threshold || 20;
    notifyEnabled = savedState.notifyEnabled || false;
    notifyRatioThreshold = savedState.notifyRatioThreshold != null ? savedState.notifyRatioThreshold : 30;
    notifyDiffThreshold = savedState.notifyDiffThreshold != null ? savedState.notifyDiffThreshold : 100;
    notifyMinValue = savedState.notifyMinValue != null ? savedState.notifyMinValue : 200;
    notifyMinPrice = savedState.notifyMinPrice != null ? savedState.notifyMinPrice : 0;
    refreshIntervalSec = savedState.refreshIntervalSec != null ? savedState.refreshIntervalSec : 60;
    soldCheckRatio = savedState.soldCheckRatio != null ? savedState.soldCheckRatio : 20;
    soldCheckDiff = savedState.soldCheckDiff != null ? savedState.soldCheckDiff : 0;
    soldCheckMinValue = savedState.soldCheckMinValue != null ? savedState.soldCheckMinValue : 0;
    soldCheckMaxValue = savedState.soldCheckMaxValue != null ? savedState.soldCheckMaxValue : 0;
    charNotifyRules = Array.isArray(savedState.charNotifyRules) ? savedState.charNotifyRules : [];
    // 加载推送配置
    if (savedState.pushConfig) {
      pushConfig = Object.assign(pushConfig, savedState.pushConfig);
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
