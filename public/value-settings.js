/**
 * value-settings.js - 估值规则设置面板（独立模块）
 * 从监控助手移植，适配估价助手首页。
 *
 * 对外接口（挂载到 window）：
 *   - openValueSettings(onSave)  打开设置弹窗，onSave(newWeights) 是保存后的回调
 *   - getSavedWeights()          从 localStorage 读取保存的权重，没有则返回 null
 *   - hasCustomWeights()         判断是否有自定义权重
 *
 * 数据存储：localStorage key = mw_eval_weights
 * 依赖：后端 /api/defaults 接口返回默认权重配置
 */
(function () {
  'use strict';

  // 游戏上下文（默认鸣潮 mw；绝区零 zzz 通过 setValueSettingsGame 切换）
  var gameKey = 'mw';

  // localStorage 存储键（随游戏上下文切换）
  var STORAGE_KEY = 'mw_eval_weights';
  var CONFIG_VERSION_KEY = 'mw_eval_config_version';

  // 缓存的默认配置（从 /api/defaults 获取）
  var cachedDefaults = null;

  /**
   * 切换游戏上下文：更新存储键并清空默认配置缓存
   * @param {string} game - 游戏标识（wuwa/zzz）
   */
  function setValueSettingsGame(game) {
    var newKey = game === 'zzz' ? 'zzz' : 'mw';
    if (newKey === gameKey) return;
    gameKey = newKey;
    STORAGE_KEY = gameKey + '_eval_weights';
    CONFIG_VERSION_KEY = gameKey + '_eval_config_version';
    cachedDefaults = null;
  }

  // ============================================================
  // 默认配置获取与缓存
  // ============================================================

  /**
   * 从后端获取默认权重配置（按当前游戏上下文）
   * @returns {Promise<object|null>}
   */
  function fetchDefaults() {
    if (cachedDefaults) return Promise.resolve(cachedDefaults);
    return fetch('/api/defaults?game=' + (gameKey === 'zzz' ? 'zzz' : 'wuwa') + '&_t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (result) {
        if (result.success && result.data) {
          cachedDefaults = result.data;
          return cachedDefaults;
        }
        return null;
      })
      .catch(function (e) {
        console.error('[value-settings] 获取默认权重失败:', e);
        return null;
      });
  }

  /**
   * 从默认配队列表构建 teamPremiums 对象
   */
  function buildDefaultTeamPremiums(teams) {
    var result = {};
    for (var i = 0; i < teams.length; i++) {
      result[teams[i].name] = {
        chars: [].concat(teams[i].members || []),
        multiplier: teams[i].multiplier || 1.0,
        enabled: true,
      };
    }
    return result;
  }

  /**
   * 构建完整权重对象（合并默认值与localStorage中的用户设置）
   * 等价于 value-engine.src.js 的 buildDefaultWeights
   */
  function loadWeights(defaults, saved) {
    var DEFAULT_WEIGHTS = defaults.weights;
    var s = saved || {};
    var w = Object.assign({}, DEFAULT_WEIGHTS, s);
    w.c6TierWeights = Object.assign({}, DEFAULT_WEIGHTS.c6TierWeights, s.c6TierWeights || {});
    // 有效金级别系数（该级别角色的命座与专武折算计入有效金的比例）
    w.effTierWeights = Object.assign({}, DEFAULT_WEIGHTS.effTierWeights || { S: 1, A: 1, B: 1, C: 0.5, D: 0.5, E: 0 }, s.effTierWeights || {});
    w.c6MultiBonus = (s.c6MultiBonus && s.c6MultiBonus.length) ? s.c6MultiBonus : DEFAULT_WEIGHTS.c6MultiBonus;
    w.teamMultiBonus = (s.teamMultiBonus && s.teamMultiBonus.length) ? s.teamMultiBonus : DEFAULT_WEIGHTS.teamMultiBonus;
    w.flatDiscountRules = (s.flatDiscountRules && s.flatDiscountRules.length) ? s.flatDiscountRules : DEFAULT_WEIGHTS.flatDiscountRules;
    w.c6TeamDependency = (s.c6TeamDependency && Object.keys(s.c6TeamDependency).length > 0) ? s.c6TeamDependency : (DEFAULT_WEIGHTS.c6TeamDependency || {});
    w.pullBase = (s.pullBase != null) ? s.pullBase : (DEFAULT_WEIGHTS.pullBase != null ? DEFAULT_WEIGHTS.pullBase : (defaults.pullFormula || {}).pullBase);
    w.pullBasePrice = (s.pullBasePrice != null) ? s.pullBasePrice : (DEFAULT_WEIGHTS.pullBasePrice != null ? DEFAULT_WEIGHTS.pullBasePrice : (defaults.pullFormula || {}).pullBasePrice);
    w.pullStepPrice = (s.pullStepPrice != null) ? s.pullStepPrice : (DEFAULT_WEIGHTS.pullStepPrice != null ? DEFAULT_WEIGHTS.pullStepPrice : (defaults.pullFormula || {}).pullStepPrice);
    w.pullMaxPrice = (s.pullMaxPrice != null) ? s.pullMaxPrice : (DEFAULT_WEIGHTS.pullMaxPrice != null ? DEFAULT_WEIGHTS.pullMaxPrice : ((defaults.pullFormula || {}).pullMaxPrice != null ? (defaults.pullFormula || {}).pullMaxPrice : 0));
    w.yellowBase = (s.yellowBase != null) ? s.yellowBase : (DEFAULT_WEIGHTS.yellowBase != null ? DEFAULT_WEIGHTS.yellowBase : 40);
    w.yellowStep = (s.yellowStep != null) ? s.yellowStep : (DEFAULT_WEIGHTS.yellowStep != null ? DEFAULT_WEIGHTS.yellowStep : 1);
    w.yellowBaseCoeff = (s.yellowBaseCoeff != null) ? s.yellowBaseCoeff : (DEFAULT_WEIGHTS.yellowBaseCoeff != null ? DEFAULT_WEIGHTS.yellowBaseCoeff : 1.0);
    w.yellowStepCoeff = (s.yellowStepCoeff != null) ? s.yellowStepCoeff : (DEFAULT_WEIGHTS.yellowStepCoeff != null ? DEFAULT_WEIGHTS.yellowStepCoeff : 0.01);
    w.yellowMaxCoeff = (s.yellowMaxCoeff != null) ? s.yellowMaxCoeff : (DEFAULT_WEIGHTS.yellowMaxCoeff != null ? DEFAULT_WEIGHTS.yellowMaxCoeff : 3.0);
  // 限定金分段系数：优先使用保存的分段配置，否则为null（单公式模式）
  w.yellowSegments = (s.yellowSegments && s.yellowSegments.length > 0) ? s.yellowSegments : (DEFAULT_WEIGHTS.yellowSegments || null);
    // 有效金系数参数（动态分段数组）
    w.effYellowMaxCoeff = (s.effYellowMaxCoeff != null) ? s.effYellowMaxCoeff : (DEFAULT_WEIGHTS.effYellowMaxCoeff != null ? DEFAULT_WEIGHTS.effYellowMaxCoeff : 2.5);
    if (s.effYellowSegments && Array.isArray(s.effYellowSegments) && s.effYellowSegments.length > 0) {
      w.effYellowSegments = s.effYellowSegments.map(function(seg) {
        return { baseCoeff: seg.baseCoeff, threshold: seg.threshold != null ? seg.threshold : null, step: seg.step };
      });
    } else {
      // 向后兼容：从旧的固定3段字段构建数组
      var _s1B = (s.effYellowSeg1BaseCoeff != null) ? s.effYellowSeg1BaseCoeff : (s.effYellowBaseCoeff != null ? s.effYellowBaseCoeff : 0.3);
      var _s1T = (s.effYellowSeg1Threshold != null) ? s.effYellowSeg1Threshold : 10;
      var _s1S = (s.effYellowSeg1Step != null) ? s.effYellowSeg1Step : 0.03;
      var _s2B = (s.effYellowSeg2BaseCoeff != null) ? s.effYellowSeg2BaseCoeff : 0.4;
      var _s2T = (s.effYellowSeg2Threshold != null) ? s.effYellowSeg2Threshold : 40;
      var _s2S = (s.effYellowSeg2Step != null) ? s.effYellowSeg2Step : 0.02;
      var _s3B = (s.effYellowSeg3BaseCoeff != null) ? s.effYellowSeg3BaseCoeff : 0.88;
      var _s3S = (s.effYellowSeg3Step != null) ? s.effYellowSeg3Step : 0.008;
      w.effYellowSegments = [
        { baseCoeff: _s1B, threshold: _s1T, step: _s1S },
        { baseCoeff: _s2B, threshold: _s2T, step: _s2S },
        { baseCoeff: _s3B, threshold: null, step: _s3S }
      ];
    }
    w.needSigDiscount = (s.needSigDiscount != null) ? s.needSigDiscount : (DEFAULT_WEIGHTS.needSigDiscount != null ? DEFAULT_WEIGHTS.needSigDiscount : 0.3);
    w.teamDepDiscount = (s.teamDepDiscount != null) ? s.teamDepDiscount : (DEFAULT_WEIGHTS.teamDepDiscount != null ? DEFAULT_WEIGHTS.teamDepDiscount : 0.7);
    w.c6Base = (s.c6Base != null) ? s.c6Base : (DEFAULT_WEIGHTS.c6Base != null ? DEFAULT_WEIGHTS.c6Base : 3);
    w.c6BaseBonus = (s.c6BaseBonus != null) ? s.c6BaseBonus : (DEFAULT_WEIGHTS.c6BaseBonus != null ? DEFAULT_WEIGHTS.c6BaseBonus : 1.0);
    w.c6Step = (s.c6Step != null) ? s.c6Step : (DEFAULT_WEIGHTS.c6Step != null ? DEFAULT_WEIGHTS.c6Step : 0.1);
    w.c6StepBonus = (s.c6StepBonus != null) ? s.c6StepBonus : (DEFAULT_WEIGHTS.c6StepBonus != null ? DEFAULT_WEIGHTS.c6StepBonus : 0.05);
    w.c6MaxWeightedConst = (s.c6MaxWeightedConst != null) ? s.c6MaxWeightedConst : (DEFAULT_WEIGHTS.c6MaxWeightedConst != null ? DEFAULT_WEIGHTS.c6MaxWeightedConst : 0);
    w.pullC6Base = (s.pullC6Base != null) ? s.pullC6Base : (DEFAULT_WEIGHTS.pullC6Base != null ? DEFAULT_WEIGHTS.pullC6Base : 5);
    w.pullC6BaseBonus = (s.pullC6BaseBonus != null) ? s.pullC6BaseBonus : (DEFAULT_WEIGHTS.pullC6BaseBonus != null ? DEFAULT_WEIGHTS.pullC6BaseBonus : 0.5);
    w.pullC6Step = (s.pullC6Step != null) ? s.pullC6Step : (DEFAULT_WEIGHTS.pullC6Step != null ? DEFAULT_WEIGHTS.pullC6Step : 0.1);
    w.pullC6StepBonus = (s.pullC6StepBonus != null) ? s.pullC6StepBonus : (DEFAULT_WEIGHTS.pullC6StepBonus != null ? DEFAULT_WEIGHTS.pullC6StepBonus : 0.005);
    w.pullC6Threshold = (s.pullC6Threshold != null) ? s.pullC6Threshold : (DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400);
    w.pullC6MaxWeightedConst = (s.pullC6MaxWeightedConst != null) ? s.pullC6MaxWeightedConst : (DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20);
    w.pullPerWeightedConst = (s.pullPerWeightedConst != null) ? s.pullPerWeightedConst : (DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450);
    w.pullPerWeightedConstCount = (s.pullPerWeightedConstCount != null) ? s.pullPerWeightedConstCount : (DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1);
    w.teamMates = (s.teamMates && Object.keys(s.teamMates).length > 0) ? s.teamMates : (DEFAULT_WEIGHTS.teamMates || defaults.teamMates || {});
    w.charPrices = Object.assign({}, defaults.charPrices, DEFAULT_WEIGHTS.charPrices || {}, s.charPrices || {});
    w.constPremiums = Object.assign({}, defaults.constPremiums, DEFAULT_WEIGHTS.constPremiums || {}, s.constPremiums || {});
    // 命座绝对定价表：优先使用用户保存的constPrices，否则从constPremiums转换
    var _defConstPrices = defaults.constPrices || {};
    if (s.constPrices) {
      w.constPrices = Object.assign({}, _defConstPrices, s.constPrices);
    } else {
      w.constPrices = Object.assign({}, _defConstPrices);
      var _oldPrems = Object.assign({}, defaults.constPremiums || {}, DEFAULT_WEIGHTS.constPremiums || {}, s.constPremiums || {});
      for (var _cpName in _oldPrems) {
        if (!_oldPrems.hasOwnProperty(_cpName)) continue;
        var _cpBase = w.charPrices[_cpName] != null ? w.charPrices[_cpName] : ((defaults.charPrices || {})[_cpName] || 0);
        var _cpPrem = _oldPrems[_cpName];
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
    w.teamPremiums = (s.teamPremiums && Object.keys(s.teamPremiums).length > 0) ? s.teamPremiums : (DEFAULT_WEIGHTS.teamPremiums || buildDefaultTeamPremiums(defaults.teams));
    w.teams = [];
    for (var teamName in w.teamPremiums) {
      if (!w.teamPremiums.hasOwnProperty(teamName)) continue;
      var t = w.teamPremiums[teamName];
      if (t && t.enabled !== false) {
        w.teams.push({ name: teamName, members: t.chars || [], multiplier: t.multiplier || 1.0 });
      }
    }
    w.needSigWeapons = (s.needSigWeapons && s.needSigWeapons.length > 0) ? s.needSigWeapons : (DEFAULT_WEIGHTS.needSigWeapons || defaults.needSigWeapons || []);
    w.deletedChars = (s.deletedChars && s.deletedChars.length > 0) ? s.deletedChars : (DEFAULT_WEIGHTS.deletedChars || []);
    w.charTierOverride = (s.charTierOverride && Object.keys(s.charTierOverride).length > 0) ? s.charTierOverride : (DEFAULT_WEIGHTS.charTierOverride || {});
    return w;
  }

  // ============================================================
  // 存储读写
  // ============================================================

  /**
   * 从 localStorage 读取保存的权重，没有则返回 null
   * 配置版本不匹配时自动清除旧配置，使用最新服务器规则
   */
  function getSavedWeights() {
    try {
      // 配置版本检查
      var savedVersion = parseInt(localStorage.getItem(CONFIG_VERSION_KEY) || '0', 10);
      var currentVersion = (cachedDefaults && cachedDefaults.configVersion) || 1;
      if (savedVersion < currentVersion) {
        var existing = localStorage.getItem(STORAGE_KEY);
        if (existing) {
          // 检测到新规则版本，自动清除旧的自定义配置，使用最新服务器默认值
          console.log('[value-settings] 检测到新规则版本(' + savedVersion + '→' + currentVersion + ')，自动清除旧配置');
          localStorage.removeItem(STORAGE_KEY);
          localStorage.setItem(CONFIG_VERSION_KEY, String(currentVersion));
          return null;
        } else {
          localStorage.setItem(CONFIG_VERSION_KEY, String(currentVersion));
          return null;
        }
      }
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 判断是否有自定义权重
   */
  function hasCustomWeights() {
    return getSavedWeights() !== null;
  }

  /**
   * 保存权重到 localStorage，同时记录配置版本号
   */
  function saveWeights(w) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
    var currentVersion = (cachedDefaults && cachedDefaults.configVersion) || 1;
    localStorage.setItem(CONFIG_VERSION_KEY, String(currentVersion));
  }

  // ============================================================
  // 设置弹窗（移植自监控助手 openSettings，适配独立模块）
  // ============================================================

  /**
   * 打开估值设置对话框
   * @param {function} [onSave] - 保存成功后的回调，参数为新权重对象
   */
  function openValueSettings(onSave) {
    // 移除已有对话框
    var existing = document.getElementById('mw-settings-modal');
    if (existing) { existing.remove(); return; }

    // 每次打开都强制从服务器拉取最新配置（服务器规则可能已更新，避免读到旧缓存）
    cachedDefaults = null;
    fetchDefaults().then(function (defaults) {
      if (!defaults) {
        alert('无法加载默认权重配置，请检查网络后重试');
        return;
      }
      buildSettingsModal(defaults, onSave);
    });
  }

  function buildSettingsModal(defaults, onSave, ignoreSaved) {
    var saved = ignoreSaved ? {} : (getSavedWeights() || {});
    var w = loadWeights(defaults, saved);

    // 收集所有角色名（按级别排序）
    var allCharNames = [];
    var _addedNameSet = {};
    var CHAR_TIERS = defaults.charTiers;
    for (var tierKey in CHAR_TIERS) {
      if (!CHAR_TIERS.hasOwnProperty(tierKey)) continue;
      for (var ni = 0; ni < CHAR_TIERS[tierKey].chars.length; ni++) {
        var _cn = CHAR_TIERS[tierKey].chars[ni];
        if (!_addedNameSet[_cn]) { allCharNames.push(_cn); _addedNameSet[_cn] = true; }
      }
    }
    // 用户自定义角色级别覆盖中的新角色
    if (w.charTierOverride) {
      for (var _ovrName in w.charTierOverride) {
        if (!w.charTierOverride.hasOwnProperty(_ovrName)) continue;
        if (!_addedNameSet[_ovrName]) { allCharNames.push(_ovrName); _addedNameSet[_ovrName] = true; }
      }
    }
    // charPrices中的自定义角色
    if (w.charPrices) {
      for (var _cpName in w.charPrices) {
        if (!w.charPrices.hasOwnProperty(_cpName)) continue;
        if (!_addedNameSet[_cpName]) { allCharNames.push(_cpName); _addedNameSet[_cpName] = true; }
      }
    }
    allCharNames.sort();

    var DEFAULT_WEIGHTS = defaults.weights;
    var DEFAULT_TEAMS = defaults.teams;
    // var DEFAULT_PULL_TIERS = defaults.pullTiers;   // 已迁移为公式参数
    // var DEFAULT_YELLOW_TIERS = defaults.yellowTiers; // 已迁移为公式参数
    var DEFAULT_CONST_PREMIUMS = defaults.constPremiums;
    var DEFAULT_CONST_PRICES = defaults.constPrices || {};
    var DEFAULT_NEED_SIG_WEAPONS = defaults.needSigWeapons;
    var DEFAULT_CHAR_PRICES = defaults.charPrices;
    var WEIGHT_LABELS = defaults.weightLabels;
    var SIG_WEAPONS = defaults.sigWeapons || {};

    // 创建遮罩与对话框
    var overlay = document.createElement('div');
    overlay.id = 'mw-settings-modal';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,0.75);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-family:\'Segoe UI\',\'PingFang SC\',\'Microsoft YaHei\',sans-serif;';

    var dialog = document.createElement('div');
    dialog.style.cssText =
      'position:relative;' +
      'width:560px;max-width:92vw;max-height:88vh;overflow-y:auto;' +
      'background:#12122a;color:#e0e0e0;border-radius:12px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid #2a2a4a;padding:24px 24px 0;';

    // 关闭按钮（右上角）
    var closeBtn = document.createElement('div');
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
    var title = document.createElement('h2');
    title.style.cssText = 'font-size:18px;color:#e94560;margin-bottom:6px;';
    title.textContent = '估值规则设置';
    dialog.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.style.cssText = 'font-size:12px;color:#888;margin-bottom:20px;line-height:1.5;';
    subtitle.textContent = '所有角色统一按基础价估值，命座价值通过每行"溢价"按钮单独配置。保存后立即生效。';
    dialog.appendChild(subtitle);

    // ===== 1. 五星角色定价 =====
    var charSection = document.createElement('div');
    charSection.style.cssText = 'margin-bottom:20px;';
    var charTitle = document.createElement('div');
    charTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    charTitle.textContent = '五星角色定价（角色名 + 专武 + 估值 + 命座溢价）';
    charSection.appendChild(charTitle);

    var charDesc = document.createElement('p');
    charDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    charDesc.innerHTML = '可自由添加、修改、删除角色定价及命座溢价。武器名自动匹配，也可手动修改。<br>所有角色统一按基础价估值，命座价值通过"溢价"按钮单独配置（如C3→+50元，C6→+180元，只取最高不叠加）。<br>勾选"专武"=需要专武（无专武时价值×折扣，折扣值在下方"其他权重"中配置）。<br>点击"强绑"按钮可设置强绑队友（队友全不在场时角色价值×折扣，可与无专武折扣叠加）。';
    charSection.appendChild(charDesc);

    // 角色定价数据（可增删改）
    var charEntries = [];
    var deletedChars = (saved && Array.isArray(saved.deletedChars)) ? saved.deletedChars.slice() : [];
    var tierLabels = { S: 'S级 热门人权', A: 'A级 热门限定', B: 'B级 温门核心', C: 'C级 冷门限定', D: 'D级 退环境', E: 'E级 常驻五星' };
    var tierColors = { S: '#4ade80', A: '#e94560', B: '#fbbf24', C: '#9ca3af', D: '#6b7280', E: '#4b5563' };
    var tierOrder = ['S', 'A', 'B', 'C', 'D', 'E'];

    // 有效金级别系数（该级别角色的命座与专武折算计入有效金的比例）
    var effTierWeights = Object.assign({}, w.effTierWeights || DEFAULT_WEIGHTS.effTierWeights || { S: 1, A: 1, B: 1, C: 0.5, D: 0.5, E: 0 });
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
        tInput.style.cssText = 'width:44px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#38bdf8;font-size:11px;text-align:right;font-weight:600;';
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
      return null;
    }

    // 检查角色是否在需要专武列表中
    var _needSigSet = {};
    var _needSigList = w.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS;
    for (var nsi = 0; nsi < _needSigList.length; nsi++) {
      var _nsName = typeof _needSigList[nsi] === 'string' ? _needSigList[nsi] : _needSigList[nsi].name;
      _needSigSet[_nsName] = true;
    }
    function isNeedSig(name) { return !!_needSigSet[name]; }

    // 构建强绑队友映射（从 teamMates 或旧 c6TeamDependency 配置加载）
    var _teamMatesMap = {};
    var _rawTeamMates = w.teamMates || {};
    for (var tmn in _rawTeamMates) {
      if (!_rawTeamMates.hasOwnProperty(tmn)) continue;
      var mates = _rawTeamMates[tmn];
      if (Array.isArray(mates) && mates.length > 0) _teamMatesMap[tmn] = [].concat(mates);
    }
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
        var defaultPrice = DEFAULT_CHAR_PRICES[cname] != null ? DEFAULT_CHAR_PRICES[cname] : tier.price;
        var userPrice = w.charPrices[cname] != null ? w.charPrices[cname] : defaultPrice;
        var weapon = (w.sigWeaponsOverride && w.sigWeaponsOverride[cname]) || SIG_WEAPONS[cname] || '';
        charEntries.push({ name: cname, weapon: weapon, price: userPrice, tier: tk, constPrices: w.constPrices && w.constPrices[cname] ? Object.assign({}, w.constPrices[cname]) : {}, needSig: isNeedSig(cname), teamMates: getTeamMates(cname) });
        _addedNames[cname] = true;
      }
    }
    // 加载级别被覆盖的角色（在CHAR_TIERS中但级别被用户修改）
    if (w.charTierOverride) {
      for (var ovrName in w.charTierOverride) {
        if (!w.charTierOverride.hasOwnProperty(ovrName)) continue;
        if (_addedNames[ovrName]) continue;
        if (deletedChars.indexOf(ovrName) >= 0) continue;
        var ovrTier = w.charTierOverride[ovrName];
        var ovrTierInfo = CHAR_TIERS[ovrTier];
        var ovrDefaultPrice = DEFAULT_CHAR_PRICES[ovrName] != null ? DEFAULT_CHAR_PRICES[ovrName] : (ovrTierInfo ? ovrTierInfo.price : 0);
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
    charList.style.cssText = 'margin-bottom:12px;max-height:400px;overflow-y:auto;border:1px solid #2a2a4a;border-radius:8px;padding:8px;';

    function renderCharList() {
      charList.innerHTML = '';
      // 按级别分组渲染
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
            row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;font-size:12px;border-bottom:1px solid #111128;';

            // 角色名输入
            var nameInput = document.createElement('input');
            nameInput.type = 'text'; nameInput.value = entry.name;
            nameInput.style.cssText = 'flex:1;min-width:60px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
            nameInput.onchange = function() {
              entry.name = nameInput.value.trim() || entry.name;
              // 自动匹配武器
              if (SIG_WEAPONS[entry.name] && !entry.weapon) {
                entry.weapon = SIG_WEAPONS[entry.name];
                weaponInput.value = entry.weapon;
              }
            };
            row.appendChild(nameInput);

            // 武器名输入
            var weaponInput = document.createElement('input');
            weaponInput.type = 'text'; weaponInput.value = entry.weapon;
            weaponInput.placeholder = '专武名';
            weaponInput.style.cssText = 'flex:1;min-width:60px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
            weaponInput.onchange = function() { entry.weapon = weaponInput.value.trim(); };
            row.appendChild(weaponInput);

            // 价格输入
            var priceInput = document.createElement('input');
            priceInput.type = 'number'; priceInput.value = entry.price;
            priceInput.style.cssText = 'width:50px;padding:4px 4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:right;';
            priceInput.onchange = function() { var v = parseFloat(priceInput.value); entry.price = isNaN(v) ? 0 : v; };
            row.appendChild(priceInput);

            // 元单位
            var yuanLabel = document.createElement('span');
            yuanLabel.textContent = '元'; yuanLabel.style.cssText = 'color:#555;font-size:11px;';
            row.appendChild(yuanLabel);

            // 级别下拉框
            var tierSelect = document.createElement('select');
            tierSelect.style.cssText = 'width:42px;padding:3px 2px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:' + tierColors[entry.tier] + ';font-size:11px;text-align:center;cursor:pointer;';
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

            // 专武复选框
            var sigCheck = document.createElement('input');
            sigCheck.type = 'checkbox'; sigCheck.checked = !!entry.needSig;
            sigCheck.title = '勾选=需要专武（无专武时价值×' + Math.round((w.needSigDiscount != null ? w.needSigDiscount : 0.3) * 100) + '%）';
            sigCheck.style.cssText = 'margin:0;cursor:pointer;accent-color:#f87171;';
            sigCheck.onchange = function() { entry.needSig = sigCheck.checked; };
            row.appendChild(sigCheck);

            var sigLabel = document.createElement('span');
            sigLabel.textContent = '专武'; sigLabel.style.cssText = 'color:' + (entry.needSig ? '#f87171' : '#555') + ';font-size:10px;cursor:pointer;';
            sigLabel.onclick = function() { sigCheck.checked = !sigCheck.checked; entry.needSig = sigCheck.checked; sigLabel.style.color = entry.needSig ? '#f87171' : '#555'; };
            row.appendChild(sigLabel);

            // 命座定价按钮
            var premBtn = document.createElement('button');
            var premCount = entry.constPrices ? Object.keys(entry.constPrices).length : 0;
            premBtn.textContent = '定价' + (premCount > 0 ? '(' + premCount + ')' : '');
            premBtn.title = '编辑命座定价（C0-C6绝对价格）';
            premBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:' + (premCount > 0 ? '#4ade80' : '#555') + ';font-size:11px;cursor:pointer;line-height:1.4;';
            premBtn.onclick = function() {
              var premOverlay = document.createElement('div');
              premOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
              var premBox = document.createElement('div');
              premBox.style.cssText = 'background:#0f0f23;border-radius:12px;padding:20px;width:320px;color:#e0e0e0;';
              var premHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#4ade80;">编辑命座定价 - ' + entry.name + '</div>';
              premHTML += '<div style="font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;">设置每个命座的绝对价格。角色几命就取对应命座的价格，未设置的命座取低于它的最近价格。</div>';
              // C0 定价（与基础价同步）
              premHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                '<span style="font-size:12px;color:#60a5fa;font-weight:600;min-width:30px;">C0</span>' +
                '<span style="color:#555;font-size:11px;">→</span>' +
                '<input type="number" class="prem-c0" value="' + entry.price + '" placeholder="0" min="0" style="width:80px;padding:4px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:right;" />' +
                '<span style="color:#555;font-size:11px;">元</span>' +
                '<span style="color:#555;font-size:10px;">（基础价）</span>' +
                '</div>';
              for (var pci = 1; pci <= 6; pci++) {
                var curPremVal = entry.constPrices && entry.constPrices[pci] != null ? entry.constPrices[pci] : '';
                premHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                  '<span style="font-size:12px;color:#e94560;font-weight:600;min-width:30px;">C' + pci + '</span>' +
                  '<span style="color:#555;font-size:11px;">→</span>' +
                  '<input type="number" class="prem-c' + pci + '" value="' + curPremVal + '" placeholder="" min="0" style="width:80px;padding:4px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:right;" />' +
                  '<span style="color:#555;font-size:11px;">元</span>' +
                  '</div>';
              }
              premHTML += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
                '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
                '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#4ade80;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
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

            // 强绑队友按钮
            var mateBtn = document.createElement('button');
            var mateCount = entry.teamMates ? entry.teamMates.length : 0;
            mateBtn.textContent = '强绑' + (mateCount > 0 ? '(' + mateCount + ')' : '');
            mateBtn.title = '编辑强绑队友（全不在场时价值×' + Math.round((w.teamDepDiscount != null ? w.teamDepDiscount : 0.7) * 100) + '%）';
            mateBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:' + (mateCount > 0 ? '#fbbf24' : '#555') + ';font-size:11px;cursor:pointer;line-height:1.4;';
            mateBtn.onclick = function() {
              var mateOverlay = document.createElement('div');
              mateOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
              var mateBox = document.createElement('div');
              mateBox.style.cssText = 'background:#0f0f23;border-radius:12px;padding:20px;width:340px;max-height:500px;overflow-y:auto;color:#e0e0e0;';
              var mateHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:8px;color:#fbbf24;">编辑强绑队友 - ' + entry.name + '</div>';
              mateHTML += '<div style="font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;">勾选强绑队友，当这些队友全不在账号中时，角色价值×' + Math.round((w.teamDepDiscount != null ? w.teamDepDiscount : 0.7) * 100) + '%。可与无专武折扣叠加。</div>';
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
                '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#fbbf24;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
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

            // 删除按钮
            var delBtn = document.createElement('button');
            delBtn.textContent = '×'; delBtn.title = '删除';
            delBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:14px;cursor:pointer;line-height:1;';
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
    addNameInput.style.cssText = 'flex:1;min-width:80px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    addCharRow.appendChild(addNameInput);

    var addWeaponInput = document.createElement('input');
    addWeaponInput.type = 'text'; addWeaponInput.placeholder = '专武名（可留空自动匹配）';
    addWeaponInput.style.cssText = 'flex:1;min-width:80px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    addCharRow.appendChild(addWeaponInput);

    var addPriceInput = document.createElement('input');
    addPriceInput.type = 'number'; addPriceInput.placeholder = '价格'; addPriceInput.value = '15';
    addPriceInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:right;';
    addCharRow.appendChild(addPriceInput);

    // 级别选择
    var addTierSelect = document.createElement('select');
    addTierSelect.style.cssText = 'padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
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
      // 检查重复
      if (charEntries.some(function(e) { return e.name === nm; })) {
        alert('角色"' + nm + '"已存在'); return;
      }
      var wpn = addWeaponInput.value.trim();
      if (!wpn && SIG_WEAPONS[nm]) wpn = SIG_WEAPONS[nm]; // 自动匹配
      var pr = parseFloat(addPriceInput.value);
      if (isNaN(pr)) pr = 15;
      charEntries.push({ name: nm, weapon: wpn, price: pr, tier: addTierSelect.value, constPrices: {}, needSig: false, teamMates: [] });
      // 如果角色之前被删除过，从 deletedChars 中移除
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
    pullTitle.style.cssText = 'font-size:14px;font-weight:600;color:#60a5fa;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    pullTitle.textContent = '抽数定价（资源越多每抽越值钱）';
    pullSection.appendChild(pullTitle);
    var pullDesc = document.createElement('p');
    pullDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    pullDesc.innerHTML = '抽数 = 星声/160 + 月相/160 + 余波珊瑚/8 + 浮金波纹 + 铸潮波纹。资源越多每抽越值钱，按公式线性递增。';
    pullSection.appendChild(pullDesc);

    // 公式参数输入区
    var pullFormulaRow = document.createElement('div');
    pullFormulaRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;';

    // 基准抽数
    var pullBaseLabel = document.createElement('span');
    pullBaseLabel.textContent = '基准抽数';
    pullBaseLabel.style.cssText = 'font-size:12px;color:#60a5fa;font-weight:600;';
    pullFormulaRow.appendChild(pullBaseLabel);
    var pullBaseInput = document.createElement('input');
    pullBaseInput.type = 'number'; pullBaseInput.min = 0; pullBaseInput.step = 1;
    pullBaseInput.value = w.pullBase != null ? w.pullBase : 200;
    pullBaseInput.style.cssText = 'width:70px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#60a5fa;font-size:12px;text-align:center;';
    pullBaseInput.title = '基准抽数（默认200）';
    pullFormulaRow.appendChild(pullBaseInput);

    var pullBaseUnit = document.createElement('span');
    pullBaseUnit.textContent = '抽'; pullBaseUnit.style.cssText = 'color:#555;font-size:11px;';
    pullFormulaRow.appendChild(pullBaseUnit);

    // 分隔
    var pullSep1 = document.createElement('span');
    pullSep1.textContent = '|'; pullSep1.style.cssText = 'color:#333;font-size:11px;margin:0 4px;';
    pullFormulaRow.appendChild(pullSep1);

    // 基准每抽价格
    var pullBasePriceLabel = document.createElement('span');
    pullBasePriceLabel.textContent = '基准每抽价格';
    pullBasePriceLabel.style.cssText = 'font-size:12px;color:#4ade80;font-weight:600;';
    pullFormulaRow.appendChild(pullBasePriceLabel);
    var pullBasePriceInput = document.createElement('input');
    pullBasePriceInput.type = 'number'; pullBasePriceInput.min = 0; pullBasePriceInput.step = 0.1;
    pullBasePriceInput.value = w.pullBasePrice != null ? w.pullBasePrice : 1.0;
    pullBasePriceInput.style.cssText = 'width:60px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#4ade80;font-size:12px;text-align:right;font-weight:600;';
    pullBasePriceInput.title = '基准每抽价格（元，默认1.0）';
    pullFormulaRow.appendChild(pullBasePriceInput);

    var pullBasePriceUnit = document.createElement('span');
    pullBasePriceUnit.textContent = '元'; pullBasePriceUnit.style.cssText = 'color:#555;font-size:11px;';
    pullFormulaRow.appendChild(pullBasePriceUnit);

    // 分隔
    var pullSep2 = document.createElement('span');
    pullSep2.textContent = '|'; pullSep2.style.cssText = 'color:#333;font-size:11px;margin:0 4px;';
    pullFormulaRow.appendChild(pullSep2);

    // 每抽浮动价格
    var pullStepPriceLabel = document.createElement('span');
    pullStepPriceLabel.textContent = '每抽浮动';
    pullStepPriceLabel.style.cssText = 'font-size:12px;color:#fbbf24;font-weight:600;';
    pullFormulaRow.appendChild(pullStepPriceLabel);
    var pullStepPriceInput = document.createElement('input');
    pullStepPriceInput.type = 'number'; pullStepPriceInput.min = 0; pullStepPriceInput.step = 0.001;
    pullStepPriceInput.value = w.pullStepPrice != null ? w.pullStepPrice : 0.002;
    pullStepPriceInput.style.cssText = 'width:70px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#fbbf24;font-size:12px;text-align:right;font-weight:600;';
    pullStepPriceInput.title = '每抽浮动价格（默认0.002）';
    pullFormulaRow.appendChild(pullStepPriceInput);

    var pullStepPriceUnit = document.createElement('span');
    pullStepPriceUnit.textContent = '元/抽'; pullStepPriceUnit.style.cssText = 'color:#555;font-size:11px;';
    pullFormulaRow.appendChild(pullStepPriceUnit);

    // 分隔
    var pullSep3 = document.createElement('span');
    pullSep3.textContent = '|'; pullSep3.style.cssText = 'color:#333;font-size:11px;margin:0 4px;';
    pullFormulaRow.appendChild(pullSep3);

    // 每抽价格上限
    var pullMaxPriceLabel = document.createElement('span');
    pullMaxPriceLabel.textContent = '每抽上限';
    pullMaxPriceLabel.style.cssText = 'font-size:12px;color:#f87171;font-weight:600;';
    pullFormulaRow.appendChild(pullMaxPriceLabel);
    var pullMaxPriceInput = document.createElement('input');
    pullMaxPriceInput.type = 'number'; pullMaxPriceInput.min = 0; pullMaxPriceInput.step = 0.1;
    pullMaxPriceInput.value = w.pullMaxPrice != null ? w.pullMaxPrice : 5;
    pullMaxPriceInput.style.cssText = 'width:60px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#f87171;font-size:12px;text-align:right;font-weight:600;';
    pullMaxPriceInput.title = '每抽价格上限（元，0=不限制，默认5）';
    pullFormulaRow.appendChild(pullMaxPriceInput);

    var pullMaxPriceUnit = document.createElement('span');
    pullMaxPriceUnit.textContent = '元'; pullMaxPriceUnit.style.cssText = 'color:#555;font-size:11px;';
    pullFormulaRow.appendChild(pullMaxPriceUnit);

    pullSection.appendChild(pullFormulaRow);

    // 预览
    var pullPreview = document.createElement('div');
    pullPreview.style.cssText = 'font-size:11px;color:#888;line-height:1.8;padding:8px 10px;background:rgba(96,165,250,0.05);border-radius:6px;border:1px solid rgba(96,165,250,0.15);';
    function updatePullPreview() {
      var base = parseFloat(pullBaseInput.value) || 0;
      var basePrice = parseFloat(pullBasePriceInput.value) || 0;
      var stepPrice = parseFloat(pullStepPriceInput.value) || 0;
      var maxPrice = parseFloat(pullMaxPriceInput.value) || 0;
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
    [pullBaseInput, pullBasePriceInput, pullStepPriceInput, pullMaxPriceInput].forEach(function(inp) {
      inp.oninput = updatePullPreview;
    });
    updatePullPreview();
    pullSection.appendChild(pullPreview);

    // 载入默认按钮
    var pullDefaultRow = document.createElement('div');
    pullDefaultRow.style.cssText = 'margin-top:8px;';
    var loadPullDefaultBtn = document.createElement('button');
    loadPullDefaultBtn.textContent = '载入默认（200抽基准1.0元，每抽浮动0.002元，上限5元）';
    loadPullDefaultBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#1a1a3a;color:#60a5fa;font-size:11px;cursor:pointer;';
    loadPullDefaultBtn.onclick = function () {
      pullBaseInput.value = (DEFAULT_WEIGHTS.pullBase != null) ? DEFAULT_WEIGHTS.pullBase : 200;
      pullBasePriceInput.value = (DEFAULT_WEIGHTS.pullBasePrice != null) ? DEFAULT_WEIGHTS.pullBasePrice : 1.0;
      pullStepPriceInput.value = (DEFAULT_WEIGHTS.pullStepPrice != null) ? DEFAULT_WEIGHTS.pullStepPrice : 0.002;
      pullMaxPriceInput.value = (DEFAULT_WEIGHTS.pullMaxPrice != null) ? DEFAULT_WEIGHTS.pullMaxPrice : 5;
      updatePullPreview();
    };
    pullDefaultRow.appendChild(loadPullDefaultBtn);
    pullSection.appendChild(pullDefaultRow);

    // 满命抽数加成（公式参数）
    var pullC6Divider = document.createElement('div');
    pullC6Divider.style.cssText = 'border-top:1px dashed #2a2a4a;margin:16px 0 12px 0;';
    pullSection.appendChild(pullC6Divider);

    var pullC6Title = document.createElement('div');
    pullC6Title.style.cssText = 'font-size:13px;font-weight:600;color:#fbbf24;margin-bottom:4px;';
    pullC6Title.textContent = '满命抽数加成（加权满命数 → 抽数价值加成）';
    pullSection.appendChild(pullC6Title);

    var pullC6Desc = document.createElement('p');
    pullC6Desc.style.cssText = 'font-size:11px;color:#888;margin-bottom:10px;line-height:1.5;';
    pullC6Desc.innerHTML = '根据加权满命数（与满命溢价共用），对抽数价值额外加成。';
    pullSection.appendChild(pullC6Desc);

    var pullC6FormRow = document.createElement('div');
    pullC6FormRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-bottom:10px;';

    function pc6Label(text) {
      var s = document.createElement('span');
      s.textContent = text; s.style.cssText = 'color:#aaa;font-size:11px;';
      return s;
    }
    function pc6Input(val, step, color, title) {
      var i = document.createElement('input');
      i.type = 'number'; i.value = val; i.step = step; i.min = '0';
      i.title = title;
      i.style.cssText = 'width:60px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:' + color + ';font-size:12px;text-align:center;font-weight:600;';
      return i;
    }

    pullC6FormRow.appendChild(pc6Label('基准满命'));
    var pullC6BaseInput = pc6Input(w.pullC6Base != null ? w.pullC6Base : DEFAULT_WEIGHTS.pullC6Base, '0.5', '#fbbf24', '此加权满命数对应的加成为基准加成');
    pullC6FormRow.appendChild(pullC6BaseInput);
    pullC6FormRow.appendChild(pc6Label('基准加成'));
    var pullC6BaseBonusInput = pc6Input((w.pullC6BaseBonus != null ? w.pullC6BaseBonus : DEFAULT_WEIGHTS.pullC6BaseBonus) * 100, '1', '#4ade80', '基准满命数对应的加成百分比');
    pullC6FormRow.appendChild(pullC6BaseBonusInput);
    pullC6FormRow.appendChild(pc6Label('%，每'));
    var pullC6StepInput = pc6Input(w.pullC6Step != null ? w.pullC6Step : DEFAULT_WEIGHTS.pullC6Step, '0.1', '#fbbf24', '每N命浮动一档');
    pullC6FormRow.appendChild(pullC6StepInput);
    pullC6FormRow.appendChild(pc6Label('命浮动'));
    var pullC6StepBonusInput = pc6Input((w.pullC6StepBonus != null ? w.pullC6StepBonus : DEFAULT_WEIGHTS.pullC6StepBonus) * 100, '0.1', '#4ade80', '每档浮动百分比');
    pullC6FormRow.appendChild(pullC6StepBonusInput);
    pullC6FormRow.appendChild(pc6Label('%'));
    pullC6FormRow.appendChild(pc6Label('阈值'));
    var pullC6ThresholdInput = pc6Input(w.pullC6Threshold != null ? w.pullC6Threshold : (DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400), '1', '#fbbf24', '抽数低于此值时不加成');
    pullC6FormRow.appendChild(pullC6ThresholdInput);
    pullC6FormRow.appendChild(pc6Label('抽'));
    pullC6FormRow.appendChild(pc6Label('加权上限'));
    var pullC6MaxWCInput = pc6Input(w.pullC6MaxWeightedConst != null ? w.pullC6MaxWeightedConst : (DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20), '1', '#fbbf24', '加权满命数超过此值后加成不再增加');
    pullC6FormRow.appendChild(pullC6MaxWCInput);
    pullC6FormRow.appendChild(pc6Label('每'));
    var pullC6PullPerWCInput = pc6Input(w.pullPerWeightedConst != null ? w.pullPerWeightedConst : (DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450), '1', '#f59e0b', '每N抽折算一次加权满命（0=不折算）');
    pullC6FormRow.appendChild(pullC6PullPerWCInput);
    pullC6FormRow.appendChild(pc6Label('抽+'));
    var pullC6PullPerWCCountInput = pc6Input(w.pullPerWeightedConstCount != null ? w.pullPerWeightedConstCount : (DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1), '1', '#4ade80', '每次折算多少个加权满命');
    pullC6FormRow.appendChild(pullC6PullPerWCCountInput);
    pullC6FormRow.appendChild(pc6Label('命'));
    pullSection.appendChild(pullC6FormRow);

    // 预览
    var pullC6Preview = document.createElement('div');
    pullC6Preview.style.cssText = 'font-size:11px;color:#888;line-height:1.8;padding:8px 10px;background:rgba(251,191,36,0.05);border-radius:6px;border:1px solid rgba(251,191,36,0.15);';
    function updatePullC6Preview() {
      var base = parseFloat(pullC6BaseInput.value) || 0;
      var baseBonus = (parseFloat(pullC6BaseBonusInput.value) || 0) / 100;
      var step = parseFloat(pullC6StepInput.value) || 1;
      var stepBonus = (parseFloat(pullC6StepBonusInput.value) || 0) / 100;
      var threshold = parseFloat(pullC6ThresholdInput.value);
      if (isNaN(threshold)) threshold = 400;
      var maxWC = parseFloat(pullC6MaxWCInput.value);
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
      html += '<br><span style="color:#fbbf24">注：抽数 ≥ ' + threshold + '时才生效，低于此值无加成' + (maxWC > 0 ? '；加权满命数超过' + maxWC + '后加成封顶' : '') + '</span>';
      var pullPerWC = parseFloat(pullC6PullPerWCInput.value);
      var pullPerWCCount = parseFloat(pullC6PullPerWCCountInput.value);
      if (!isNaN(pullPerWC) && pullPerWC > 0 && !isNaN(pullPerWCCount)) {
        html += '；每' + pullPerWC + '抽+' + pullPerWCCount + '加权满命';
      }
      pullC6Preview.innerHTML = html;
    }
    [pullC6BaseInput, pullC6BaseBonusInput, pullC6StepInput, pullC6StepBonusInput, pullC6ThresholdInput, pullC6MaxWCInput, pullC6PullPerWCInput, pullC6PullPerWCCountInput].forEach(function(inp) {
      inp.oninput = updatePullC6Preview;
    });
    updatePullC6Preview();
    pullSection.appendChild(pullC6Preview);

    // 载入默认按钮
    var pullC6DefaultRow = document.createElement('div');
    pullC6DefaultRow.style.cssText = 'margin-top:8px;';
    var loadPullC6DefaultBtn = document.createElement('button');
    loadPullC6DefaultBtn.textContent = '载入默认（5命基准50%，每0.1命浮动0.5%）';
    loadPullC6DefaultBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;';
    loadPullC6DefaultBtn.onclick = function () {
      pullC6BaseInput.value = DEFAULT_WEIGHTS.pullC6Base;
      pullC6BaseBonusInput.value = DEFAULT_WEIGHTS.pullC6BaseBonus * 100;
      pullC6StepInput.value = DEFAULT_WEIGHTS.pullC6Step;
      pullC6StepBonusInput.value = DEFAULT_WEIGHTS.pullC6StepBonus * 100;
      pullC6ThresholdInput.value = DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400;
      pullC6MaxWCInput.value = DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20;
      pullC6PullPerWCInput.value = DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450;
      pullC6PullPerWCCountInput.value = DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1;
      updatePullC6Preview();
    };
    pullC6DefaultRow.appendChild(loadPullC6DefaultBtn);
    pullSection.appendChild(pullC6DefaultRow);

    dialog.appendChild(pullSection);

    // ===== 4. 满命多角色溢价 =====
    var c6Section = document.createElement('div');
    c6Section.style.cssText = 'margin-bottom:20px;';
    var c6Title = document.createElement('div');
    c6Title.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    c6Title.textContent = '满命多角色溢价（加权满命计数）';
    c6Section.appendChild(c6Title);
    var c6Desc = document.createElement('p');
    c6Desc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    c6Desc.innerHTML = '各级别权重可在下方编辑。加权满命数=Σ(满命角色×权重)，直接用小数匹配档位（加权数≥档位数即触发）。';
    c6Section.appendChild(c6Desc);

    // 权重编辑区
    var c6WeightInfo = document.createElement('div');
    c6WeightInfo.style.cssText = 'font-size:11px;color:#60a5fa;margin-bottom:10px;padding:8px;background:rgba(96,165,250,0.08);border-radius:4px;';
    var c6Weights = Object.assign({}, w.c6TierWeights || DEFAULT_WEIGHTS.c6TierWeights);
    var c6WeightInputs = {};
    c6WeightInfo.innerHTML = '<div style="margin-bottom:6px;color:#aaa;">各级别满命权重（可编辑）：</div>';
    var c6WeightRow = document.createElement('div');
    c6WeightRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    var c6TierList = ['S', 'A', 'B', 'C', 'D', 'E'];
    for (var cwi = 0; cwi < c6TierList.length; cwi++) {
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
        input.style.cssText = 'width:45px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
        c6WeightInputs[t] = input;
        wrapper.appendChild(input);
        c6WeightRow.appendChild(wrapper);
      })(c6TierList[cwi]);
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
      i.style.cssText = 'width:60px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:' + color + ';font-size:12px;text-align:center;font-weight:600;';
      return i;
    }

    c6FormulaRow.appendChild(c6fLabel('基准满命'));
    var c6BaseInp = c6fInput(w.c6Base != null ? w.c6Base : DEFAULT_WEIGHTS.c6Base, '0.5', '#e94560', '此加权满命数对应的溢价为基准溢价');
    c6FormulaRow.appendChild(c6BaseInp);
    c6FormulaRow.appendChild(c6fLabel('基准溢价'));
    var c6BaseBonusInp = c6fInput((w.c6BaseBonus != null ? w.c6BaseBonus : DEFAULT_WEIGHTS.c6BaseBonus) * 100, '5', '#4ade80', '基准满命数对应的溢价百分比');
    c6FormulaRow.appendChild(c6BaseBonusInp);
    c6FormulaRow.appendChild(c6fLabel('%，每'));
    var c6StepInp = c6fInput(w.c6Step != null ? w.c6Step : DEFAULT_WEIGHTS.c6Step, '0.1', '#e94560', '每N命浮动一档');
    c6FormulaRow.appendChild(c6StepInp);
    c6FormulaRow.appendChild(c6fLabel('命浮动'));
    var c6StepBonusInp = c6fInput((w.c6StepBonus != null ? w.c6StepBonus : DEFAULT_WEIGHTS.c6StepBonus) * 100, '0.5', '#4ade80', '每档浮动百分比');
    c6FormulaRow.appendChild(c6StepBonusInp);
    c6FormulaRow.appendChild(c6fLabel('%，加权上限'));
    var c6MaxWCInp = c6fInput(w.c6MaxWeightedConst != null ? w.c6MaxWeightedConst : (DEFAULT_WEIGHTS.c6MaxWeightedConst != null ? DEFAULT_WEIGHTS.c6MaxWeightedConst : 0), '0.5', '#fbbf24', '加权满命数超过此值后溢价不再增加（0=不封顶）');
    c6FormulaRow.appendChild(c6MaxWCInp);
    c6FormulaRow.appendChild(c6fLabel('（0=不封顶）'));
    c6Section.appendChild(c6FormulaRow);

    // 预览
    var c6Preview = document.createElement('div');
    c6Preview.style.cssText = 'font-size:11px;color:#888;line-height:1.8;padding:8px 10px;background:rgba(233,69,96,0.05);border-radius:6px;border:1px solid rgba(233,69,96,0.15);';
    function updateC6Preview() {
      var base = parseFloat(c6BaseInp.value) || 0;
      var baseBonus = (parseFloat(c6BaseBonusInp.value) || 0) / 100;
      var step = parseFloat(c6StepInp.value) || 1;
      var stepBonus = (parseFloat(c6StepBonusInp.value) || 0) / 100;
      var maxWC = parseFloat(c6MaxWCInp.value);
      if (isNaN(maxWC) || maxWC <= 0) maxWC = 0;
      var samples = [0, 1, 2, base, base + step, base + step * 5, base + step * 10, base + step * 20, base + step * 50];
      if (maxWC > 0) samples.push(maxWC, maxWC + step, maxWC + step * 5);
      samples = samples.filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort(function(a, b) { return a - b; });
      var html = '';
      for (var si = 0; si < samples.length; si++) {
        var c = samples[si];
        var effC = (maxWC > 0 && c > maxWC) ? maxWC : c;
        var bonus = baseBonus + (effC - base) / step * stepBonus;
        if (bonus < 0) bonus = 0;
        html += c + '命 → +' + (Math.round(bonus * 1000) / 10) + '%　';
      }
      c6Preview.innerHTML = html;
    }
    [c6BaseInp, c6BaseBonusInp, c6StepInp, c6StepBonusInp, c6MaxWCInp].forEach(function(inp) {
      inp.oninput = updateC6Preview;
    });
    updateC6Preview();
    c6Section.appendChild(c6Preview);

    // 载入默认按钮
    var c6DefaultRow = document.createElement('div');
    c6DefaultRow.style.cssText = 'margin-top:8px;';
    var loadC6DefaultBtn = document.createElement('button');
    loadC6DefaultBtn.textContent = '载入默认（3命基准100%，每0.1命浮动5%）';
    loadC6DefaultBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;';
    loadC6DefaultBtn.onclick = function () {
      c6BaseInp.value = DEFAULT_WEIGHTS.c6Base;
      c6BaseBonusInp.value = DEFAULT_WEIGHTS.c6BaseBonus * 100;
      c6StepInp.value = DEFAULT_WEIGHTS.c6Step;
      c6StepBonusInp.value = DEFAULT_WEIGHTS.c6StepBonus * 100;
      c6MaxWCInp.value = DEFAULT_WEIGHTS.c6MaxWeightedConst != null ? DEFAULT_WEIGHTS.c6MaxWeightedConst : 0;
      updateC6Preview();
    };
    c6DefaultRow.appendChild(loadC6DefaultBtn);
    c6Section.appendChild(c6DefaultRow);
    dialog.appendChild(c6Section);

    // ===== 5. 有效金系数（按有效金数分段，动态分段） =====
    var yellowSection = document.createElement('div');
    yellowSection.style.cssText = 'margin-bottom:20px;';
    var yellowTitle = document.createElement('div');
    yellowTitle.style.cssText = 'font-size:14px;font-weight:600;color:#f59e0b;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    yellowTitle.textContent = '有效金系数（按有效金数分段）';
    yellowSection.appendChild(yellowTitle);
    var yellowDesc = document.createElement('p');
    yellowDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    yellowDesc.innerHTML = '有效金 = S/A级角色(含命座) + 其专武(含精炼) + 完整配队角色(含命座) + 其专武。按有效金数量分段，每段独立基准系数，调整一段不影响其他段。可自由添加/删除分段。';
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
      i.style.cssText = 'width:' + (inpW||48) + 'px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:' + color + ';font-size:11px;text-align:center;font-weight:600;';
      return i;
    }

    var segColors = ['#22c55e', '#f59e0b', '#e94560', '#3b82f6', '#a855f7', '#ec4899'];
    var effSegInputs = []; // [{baseInp, thresholdInp, stepInp}, ...]
    var effSegRows = []; // row DOM elements

    // 系数上限
    var baseRow = document.createElement('div');
    baseRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;';
    baseRow.appendChild(yfLabel('系数上限'));
    var effMaxCoeffInp = yfInput(w.effYellowMaxCoeff != null ? w.effYellowMaxCoeff : 2.5, '0.1', '#e94560', '系数最大值', 48);
    effMaxCoeffInp.style.textAlign = 'right';
    baseRow.appendChild(effMaxCoeffInp);
    yellowSection.appendChild(baseRow);

    var segsContainer = document.createElement('div');
    yellowSection.appendChild(segsContainer);

    function renderSegRows() {
      segsContainer.innerHTML = '';
      effSegInputs.length = 0;
      effSegRows.length = 0;
      var segs = w.effYellowSegments || [];
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

          // 基准系数
          row.appendChild(yfLabel('基准'));
          var baseInp = yfInput(seg.baseCoeff != null ? seg.baseCoeff : 0.3, '0.01', '#f59e0b', '基准系数', 44);
          baseInp.style.textAlign = 'right';
          row.appendChild(baseInp);

          // 边界（最后一段无边界）
          var thresholdInp = null;
          if (!isLast) {
            row.appendChild(yfLabel('|边界'));
            thresholdInp = yfInput(seg.threshold != null ? seg.threshold : 10, '1', color, '有效金上界', 42);
            thresholdInp.style.textAlign = 'right';
            row.appendChild(thresholdInp);
          }

          // 每金浮动
          row.appendChild(yfLabel('|每金浮动'));
          var stepInp = yfInput(seg.step != null ? seg.step : 0.01, '0.001', '#10b981', '每金浮动系数', 52);
          stepInp.style.textAlign = 'right';
          row.appendChild(stepInp);

          // 删除按钮（至少保留1段）
          if (segs.length > 1) {
            var delBtn = document.createElement('button');
            delBtn.textContent = '✕';
            delBtn.style.cssText = 'margin-left:4px;padding:1px 6px;border:1px solid #444;border-radius:3px;background:#1a1a2e;color:#f87171;font-size:10px;cursor:pointer;line-height:1.4;';
            delBtn.title = '删除此段';
            delBtn.onclick = function() {
              w.effYellowSegments.splice(si, 1);
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

    // 添加分段 + 载入默认按钮
    var yellowBtnRow = document.createElement('div');
    yellowBtnRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;';
    var addSegBtn = document.createElement('button');
    addSegBtn.textContent = '+ 添加分段';
    addSegBtn.style.cssText = 'padding:4px 10px;border:1px solid #2a2a4a;border-radius:4px;background:#1a1a2e;color:#22c55e;font-size:11px;cursor:pointer;';
    addSegBtn.onclick = function() {
      var segs = w.effYellowSegments || [];
      var prevT = segs.length > 0 ? (segs[segs.length-1].threshold || 50) : 50;
      // 前一段变为有边界，新段为最后一段
      if (segs.length > 0 && segs[segs.length-1].threshold == null) {
        segs[segs.length-1].threshold = prevT;
      }
      segs.push({ baseCoeff: 1.0, threshold: null, step: 0.005 });
      w.effYellowSegments = segs;
      renderSegRows();
      updateYellowPreview();
    };
    yellowBtnRow.appendChild(addSegBtn);
    var yellowDefaultBtn = document.createElement('button');
    yellowDefaultBtn.textContent = '载入默认';
    yellowDefaultBtn.style.cssText = 'padding:4px 10px;border:1px solid #2a2a4a;border-radius:4px;background:#1a1a2e;color:#f59e0b;font-size:11px;cursor:pointer;';
    yellowDefaultBtn.onclick = function() {
      w.effYellowSegments = [
        { baseCoeff: 0.3, threshold: 10, step: 0.03 },
        { baseCoeff: 0.4, threshold: 40, step: 0.02 },
        { baseCoeff: 0.88, threshold: null, step: 0.008 }
      ];
      effMaxCoeffInp.value = 2.5;
      renderSegRows();
      updateYellowPreview();
    };
    yellowBtnRow.appendChild(yellowDefaultBtn);
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
    teamTitle.style.cssText = 'font-size:14px;font-weight:600;color:#fbbf24;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    teamTitle.textContent = '配队溢价（队员价值倍数 + 多配队额外系数）';
    teamSection.appendChild(teamTitle);
    var teamDesc = document.createElement('p');
    teamDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    teamDesc.innerHTML = '满足配队后，队员价值 × 倍数（如1.2=溢价20%）。多配队再额外乘以系数。';
    teamSection.appendChild(teamDesc);

    var teamList = document.createElement('div');
    teamList.style.cssText = 'margin-bottom:12px;';
    var teamEntries = [];
    var teamSeenNames = {};
    if (w.teamPremiums) {
      for (var tName in w.teamPremiums) {
        if (!w.teamPremiums.hasOwnProperty(tName) || teamSeenNames[tName]) continue;
        teamSeenNames[tName] = true;
        var tInfo = w.teamPremiums[tName];
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
            '<span style="color:#fbbf24;font-weight:600;min-width:60px;">' + e.name + '</span>' +
            '<span style="color:#e94560;">' + e.chars.join(' + ') + '</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#4ade80;font-weight:600;">×' + e.multiplier + '</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.enable-cb').onchange = function (ev) { e.enabled = ev.target.checked; };
          row.querySelector('.edit-btn').onclick = function () {
            openTeamEditDialog(e, function () { renderTeamList(); });
          };
          row.querySelector('.del-btn').onclick = function () { teamEntries.splice(idx, 1); renderTeamList(); };
          teamList.appendChild(row);
        })(i);
      }
    }

    function openTeamEditDialog(e, onDone) {
      var editOverlay = document.createElement('div');
      editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
      var editBox = document.createElement('div');
      editBox.style.cssText = 'background:#12122a;border:1px solid #2a2a4a;border-radius:12px;padding:20px;width:320px;color:#e0e0e0;';
      editBox.innerHTML =
        '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#fbbf24;">编辑配队</div>' +
        '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">配队名称</label>' +
        '<input type="text" class="edit-name" value="' + e.name + '" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;" /></div>' +
        '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">角色（3名）</label>' +
        '<div style="display:flex;gap:6px;margin-top:4px;" class="char-selects"></div></div>' +
        '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">价值倍数（如1.2=溢价20%）</label>' +
        '<input type="number" class="edit-mult" value="' + e.multiplier + '" min="1" max="3" step="0.05" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;" /></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#1a1a3a;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
        '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#fbbf24;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
      var charSelectsDiv = editBox.querySelector('.char-selects');
      var selects = [];
      for (var s = 0; s < 3; s++) {
        (function (selIdx) {
          var sel = document.createElement('select');
          sel.style.cssText = 'flex:1;padding:6px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
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
        onDone(); editOverlay.remove();
      };
      editOverlay.appendChild(editBox);
      editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
      document.body.appendChild(editOverlay);
    }

    renderTeamList();
    teamSection.appendChild(teamList);

    // 添加新配队
    var teamAddRow = document.createElement('div');
    teamAddRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
    var teamNameInput = document.createElement('input');
    teamNameInput.type = 'text'; teamNameInput.placeholder = '配队名称';
    teamNameInput.style.cssText = 'width:90px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    teamAddRow.appendChild(teamNameInput);
    var teamCharSelects = [];
    for (var ts = 0; ts < 3; ts++) {
      (function (selIdx) {
        var sel = document.createElement('select');
        sel.style.cssText = 'flex:1;min-width:80px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
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
    teamMultInput.style.cssText = 'width:55px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:center;';
    teamAddRow.appendChild(teamMultInput);
    var teamAddBtn = document.createElement('button');
    teamAddBtn.textContent = '添加';
    teamAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#fbbf24;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;';
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
    loadDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #fbbf24;border-radius:4px;background:transparent;color:#fbbf24;font-size:11px;cursor:pointer;';
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
    teamMultiSection.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px dashed #2a2a4a;';
    var tmTitle = document.createElement('div');
    tmTitle.style.cssText = 'font-size:12px;font-weight:600;color:#60a5fa;margin-bottom:6px;';
    tmTitle.textContent = '多配队额外系数';
    teamMultiSection.appendChild(tmTitle);
    var tmDesc = document.createElement('p');
    tmDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:8px;line-height:1.4;';
    tmDesc.innerHTML = '凑满N个配队时，配队溢价额外乘以系数。如2配队×1.1，3配队×1.2。';
    teamMultiSection.appendChild(tmDesc);
    var teamMultiList = document.createElement('div');
    teamMultiList.style.cssText = 'margin-bottom:8px;';
    var teamMultiEntries = (w.teamMultiBonus || DEFAULT_WEIGHTS.teamMultiBonus).map(function (e) { return { count: e.count, coef: e.coef }; });
    function renderTeamMultiList() {
      teamMultiList.innerHTML = '';
      if (teamMultiEntries.length === 0) { teamMultiList.innerHTML = '<div style="font-size:11px;color:#555;padding:4px 0;">暂无多配队系数</div>'; return; }
      teamMultiEntries.sort(function (a, b) { return a.count - b.count; });
      for (var i = 0; i < teamMultiEntries.length; i++) {
        (function (idx) {
          var e = teamMultiEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;';
          row.innerHTML = '<span style="color:#60a5fa;font-weight:600;min-width:60px;">' + e.count + '配队</span><span style="color:#555;">→</span><span style="color:#4ade80;font-weight:600;">×' + e.coef + '</span><button class="edit-btn" style="margin-left:auto;padding:2px 6px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:10px;cursor:pointer;">编辑</button><button class="del-btn" style="padding:2px 6px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:10px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            openEditDialog({
              title: '编辑多配队系数', titleColor: '#60a5fa', saveColor: '#60a5fa',
              fields: [
                { label: '配队数量', key: 'count', type: 'number', value: e.count, min: 2, max: 10 },
                { label: '额外系数', key: 'coef', type: 'number', value: e.coef, min: 1, max: 5, step: 0.05 },
              ],
              onSave: function (vals) {
                var newCount = parseInt(vals.count);
                var newCoef = parseFloat(vals.coef);
                if (isNaN(newCount) || newCount < 2) { alert('配队数至少为2'); return false; }
                if (isNaN(newCoef) || newCoef < 1) { alert('系数不能小于1'); return false; }
                var conflict = teamMultiEntries.find(function (x) { return x !== e && x.count === newCount; });
                if (conflict) { alert('已有' + newCount + '配队的系数，请直接编辑那条'); return false; }
                e.count = newCount; e.coef = newCoef; renderTeamMultiList(); return true;
              }
            });
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
    tmCountInput.style.cssText = 'width:50px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    tmAddRow.appendChild(tmCountInput);
    var tmUnit = document.createElement('span'); tmUnit.textContent = '配队 →'; tmUnit.style.cssText = 'color:#888;font-size:11px;'; tmAddRow.appendChild(tmUnit);
    var tmCoefInput = document.createElement('input');
    tmCoefInput.type = 'number'; tmCoefInput.min = '1'; tmCoefInput.max = '5'; tmCoefInput.step = '0.05'; tmCoefInput.placeholder = '系数';
    tmCoefInput.style.cssText = 'width:50px;padding:4px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    tmAddRow.appendChild(tmCoefInput);
    var tmAddBtn = document.createElement('button');
    tmAddBtn.textContent = '添加'; tmAddBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:4px;background:#60a5fa;color:#0f0f23;font-size:11px;font-weight:600;cursor:pointer;';
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
    flatDiscountSection.style.cssText = 'margin-bottom:20px;border:1px solid #2a2a4a;border-radius:8px;padding:12px;background:#0a0a1a;';
    var fdTitle = document.createElement('div');
    fdTitle.style.cssText = 'font-size:14px;font-weight:600;color:#a78bfa;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    fdTitle.textContent = '低命折扣系数（指定级别角色均不超过N命时打折）';
    flatDiscountSection.appendChild(fdTitle);
    var fdDesc = document.createElement('p');
    fdDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    fdDesc.innerHTML = '当账号中指定级别(S/A/B/C/D/E)的所有角色命座均不超过设定值时，折扣系数与黄数阶梯系数取较低值。如指定S+A级且全≤2命，折扣系数0.9。';
    flatDiscountSection.appendChild(fdDesc);

    var flatDiscountList = document.createElement('div');
    flatDiscountList.style.cssText = 'margin-bottom:8px;';
    var flatDiscountEntries = (w.flatDiscountRules || DEFAULT_WEIGHTS.flatDiscountRules).map(function (e) { return { tiers: [].concat(e.tiers || []), maxConst: e.maxConst, discount: e.discount }; });
    function renderFlatDiscountList() {
      flatDiscountList.innerHTML = '';
      if (flatDiscountEntries.length === 0) { flatDiscountList.innerHTML = '<div style="font-size:12px;color:#555;padding:4px 0;">暂无低命折扣系数规则，可点击下方"载入默认"</div>'; return; }
      for (var i = 0; i < flatDiscountEntries.length; i++) {
        (function (idx) {
          var e = flatDiscountEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px;flex-wrap:wrap;';
          var tiersHtml = e.tiers.map(function (t) {
            return '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(167,139,250,0.15);color:#a78bfa;">' + t + '级</span>';
          }).join('<span style="color:#555;font-size:11px;"> + </span>');
          row.innerHTML =
            '<span style="display:inline-flex;align-items:center;gap:4px;">' + tiersHtml + '</span>' +
            '<span style="color:#888;font-size:11px;">≤ ' + e.maxConst + '命</span>' +
            '<span style="color:#4ade80;font-weight:600;font-size:11px;">× ' + e.discount + '</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 6px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:10px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 6px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:10px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            openFlatDiscountEditDialog(e, function () { renderFlatDiscountList(); });
          };
          row.querySelector('.del-btn').onclick = function () { flatDiscountEntries.splice(idx, 1); renderFlatDiscountList(); };
          flatDiscountList.appendChild(row);
        })(i);
      }
    }
    function openFlatDiscountEditDialog(e, onDone) {
      var editOverlay = document.createElement('div');
      editOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
      var editBox = document.createElement('div');
      editBox.style.cssText = 'background:#12122a;border:1px solid #2a2a4a;border-radius:12px;padding:20px;width:340px;color:#e0e0e0;';
      editBox.innerHTML =
        '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#a78bfa;">编辑低命折扣系数规则</div>' +
        '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">角色级别</label>' +
        '<div class="tier-toggles" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;"></div></div>' +
        '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">命座上限</label>' +
        '<input type="number" class="edit-maxconst" value="' + e.maxConst + '" min="0" max="6" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;" /></div>' +
        '<div style="margin-bottom:12px;"><label style="font-size:12px;color:#888;">折扣系数</label>' +
        '<input type="number" class="edit-discount" value="' + e.discount + '" min="0.1" max="1" step="0.05" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;" /></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
        '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#1a1a3a;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
        '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#a78bfa;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
      var editTiers = [].concat(e.tiers || []);
      var tierTogglesDiv = editBox.querySelector('.tier-toggles');
      var allTiers = ['S', 'A', 'B', 'C', 'D', 'E'];
      function renderEditTierToggles() {
        tierTogglesDiv.innerHTML = '';
        for (var ti = 0; ti < allTiers.length; ti++) {
          (function (tier) {
            var btn = document.createElement('button');
            var selected = editTiers.indexOf(tier) !== -1;
            btn.textContent = tier + '级';
            btn.style.cssText = selected
              ? 'padding:6px 12px;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;background:#a78bfa;color:#0f0f23;border:1px solid #a78bfa;'
              : 'padding:6px 12px;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;background:#1a1a3a;color:#888;border:1px solid #2a2a4a;';
            btn.onclick = function () {
              var di = editTiers.indexOf(tier);
              if (di !== -1) { editTiers.splice(di, 1); } else { editTiers.push(tier); }
              renderEditTierToggles();
            };
            tierTogglesDiv.appendChild(btn);
          })(allTiers[ti]);
        }
      }
      renderEditTierToggles();
      editBox.querySelector('.cancel-btn').onclick = function () { editOverlay.remove(); };
      editBox.querySelector('.save-btn').onclick = function () {
        var newMaxConst = parseInt(editBox.querySelector('.edit-maxconst').value);
        var newDiscount = parseFloat(editBox.querySelector('.edit-discount').value);
        if (editTiers.length === 0) { alert('请至少选择1个级别'); return; }
        if (isNaN(newMaxConst) || newMaxConst < 0 || newMaxConst > 6) { alert('命座上限需在0-6之间'); return; }
        if (isNaN(newDiscount) || newDiscount < 0.1 || newDiscount > 1) { alert('折扣系数需在0.1-1之间'); return; }
        e.tiers = editTiers; e.maxConst = newMaxConst; e.discount = newDiscount;
        onDone(); editOverlay.remove();
      };
      editOverlay.appendChild(editBox);
      editOverlay.onclick = function (ev) { if (ev.target === editOverlay) editOverlay.remove(); };
      document.body.appendChild(editOverlay);
    }
    renderFlatDiscountList();
    flatDiscountSection.appendChild(flatDiscountList);
    var fdAddRow = document.createElement('div');
    fdAddRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
    var fdSelectedTiers = [];
    var fdTierTogglesDiv = document.createElement('div');
    fdTierTogglesDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;width:100%;';
    var fdAllTiers = ['S', 'A', 'B', 'C', 'D', 'E'];
    function renderFdTierToggles() {
      fdTierTogglesDiv.innerHTML = '';
      for (var ti = 0; ti < fdAllTiers.length; ti++) {
        (function (tier) {
          var btn = document.createElement('button');
          var selected = fdSelectedTiers.indexOf(tier) !== -1;
          btn.textContent = tier + '级';
          btn.style.cssText = selected
            ? 'padding:5px 10px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;background:#a78bfa;color:#0f0f23;border:1px solid #a78bfa;'
            : 'padding:5px 10px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;background:#1a1a3a;color:#888;border:1px solid #2a2a4a;';
          btn.onclick = function () {
            var di = fdSelectedTiers.indexOf(tier);
            if (di !== -1) { fdSelectedTiers.splice(di, 1); } else { fdSelectedTiers.push(tier); }
            renderFdTierToggles();
          };
          fdTierTogglesDiv.appendChild(btn);
        })(fdAllTiers[ti]);
      }
    }
    renderFdTierToggles();
    fdAddRow.appendChild(fdTierTogglesDiv);
    var fdMaxConstInput = document.createElement('input');
    fdMaxConstInput.type = 'number'; fdMaxConstInput.min = '0'; fdMaxConstInput.max = '6'; fdMaxConstInput.placeholder = '命座上限';
    fdMaxConstInput.style.cssText = 'width:70px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    fdAddRow.appendChild(fdMaxConstInput);
    var fdDiscountInput = document.createElement('input');
    fdDiscountInput.type = 'number'; fdDiscountInput.min = '0.1'; fdDiscountInput.max = '1'; fdDiscountInput.step = '0.05'; fdDiscountInput.placeholder = '折扣';
    fdDiscountInput.style.cssText = 'width:55px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    fdAddRow.appendChild(fdDiscountInput);
    var fdAddBtn = document.createElement('button');
    fdAddBtn.textContent = '添加';
    fdAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#a78bfa;color:#0f0f23;font-size:11px;font-weight:600;cursor:pointer;';
    fdAddBtn.onclick = function () {
      if (fdSelectedTiers.length === 0) { alert('请至少选择1个级别'); return; }
      var mc = parseInt(fdMaxConstInput.value);
      var dc = parseFloat(fdDiscountInput.value);
      if (isNaN(mc) || mc < 0 || mc > 6) { alert('命座上限需在0-6之间'); return; }
      if (isNaN(dc) || dc < 0.1 || dc > 1) { alert('折扣系数需在0.1-1之间'); return; }
      flatDiscountEntries.push({ tiers: [].concat(fdSelectedTiers), maxConst: mc, discount: dc });
      renderFlatDiscountList();
      fdSelectedTiers.length = 0; renderFdTierToggles();
      fdMaxConstInput.value = ''; fdDiscountInput.value = '';
    };
    fdAddRow.appendChild(fdAddBtn);
    flatDiscountSection.appendChild(fdAddRow);
    var fdDefaultBtn = document.createElement('button');
    fdDefaultBtn.textContent = '载入默认';
    fdDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #a78bfa;border-radius:4px;background:transparent;color:#a78bfa;font-size:11px;cursor:pointer;';
    fdDefaultBtn.onclick = function () {
      var defaults = DEFAULT_WEIGHTS.flatDiscountRules || [];
      for (var di = 0; di < defaults.length; di++) {
        var exist = flatDiscountEntries.find(function (e) {
          return e.tiers.join(',') === (defaults[di].tiers || []).join(',') && e.maxConst === defaults[di].maxConst;
        });
        if (!exist) {
          flatDiscountEntries.push({ tiers: [].concat(defaults[di].tiers || []), maxConst: defaults[di].maxConst, discount: defaults[di].discount });
        }
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
    wsTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:12px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    wsTitle.textContent = '其他权重（资源定价 + 折扣参数）';
    weightsSection.appendChild(wsTitle);

    var weightInputs = {};
    var skipKeys = { c6TierWeights: true, effTierWeights: true, c6MultiBonus: true, teamMultiBonus: true, flatDiscountRules: true, c6TeamDependency: true, charPrices: true, constPremiums: true, teamPremiums: true, teams: true, needSigWeapons: true, teamMates: true, pullBase: true, pullBasePrice: true, pullStepPrice: true, pullMaxPrice: true, yellowBase: true, yellowStep: true, yellowBaseCoeff: true, yellowStepCoeff: true, yellowMaxCoeff: true, yellowSegments: true, effYellowSegments: true, effYellowMaxCoeff: true, effYellowSeg1BaseCoeff: true, effYellowSeg1Threshold: true, effYellowSeg1Step: true, effYellowSeg2BaseCoeff: true, effYellowSeg2Threshold: true, effYellowSeg2Step: true, effYellowSeg3BaseCoeff: true, effYellowSeg3Step: true, c6Base: true, c6BaseBonus: true, c6Step: true, c6StepBonus: true, pullC6Base: true, pullC6BaseBonus: true, pullC6Step: true, pullC6StepBonus: true, pullC6Threshold: true, pullC6MaxWeightedConst: true, pullPerWeightedConst: true, pullPerWeightedConstCount: true, constPrices: true, deletedChars: true, charTierOverride: true, sigWeaponsOverride: true };
    for (var wk in DEFAULT_WEIGHTS) {
      if (!DEFAULT_WEIGHTS.hasOwnProperty(wk) || skipKeys[wk]) continue;
      var meta = (WEIGHT_LABELS && WEIGHT_LABELS[wk]) || { label: wk, desc: '' };
      var wRow = document.createElement('div');
      wRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';
      var wLabelEl = document.createElement('div');
      wLabelEl.style.cssText = 'flex:1;';
      wLabelEl.innerHTML = '<div style="font-size:14px;color:#e0e0e0;">' + meta.label + '</div><div style="font-size:11px;color:#666;">' + meta.desc + '</div>';
      var wInput = document.createElement('input');
      wInput.type = 'number'; wInput.step = '0.01';
      wInput.value = w[wk] != null ? w[wk] : DEFAULT_WEIGHTS[wk];
      wInput.style.cssText = 'width:80px;padding:6px 8px;border:1px solid #2a2a4a;border-radius:6px;background:#0a0a1a;color:#e0e0e0;font-size:14px;text-align:right;';
      weightInputs[wk] = wInput;
      wRow.appendChild(wLabelEl);
      wRow.appendChild(wInput);
      weightsSection.appendChild(wRow);
    }
    dialog.appendChild(weightsSection);

    // ===== 按钮区 =====
    var btnArea = document.createElement('div');
    btnArea.style.cssText = 'display:flex;gap:10px;position:sticky;bottom:0;background:#12122a;padding:12px 24px 16px;margin:8px -24px 0;border-top:1px solid #2a2a4a;z-index:5;border-radius:0 0 12px 12px;';

    var resetBtn = document.createElement('button');
    resetBtn.textContent = '加载最新规则';
    resetBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#1a1a3a;color:#ccc;font-size:14px;font-weight:600;cursor:pointer;';
    resetBtn.onclick = function () {
      var hasCustom = localStorage.getItem(STORAGE_KEY) != null;
      if (hasCustom && !confirm('检测到您有自定义配置，加载最新规则将覆盖当前设置（保存后生效）。是否继续？')) {
        return;
      }
      // 强制从服务器拉取最新规则并重建面板（忽略本地自定义配置）
      cachedDefaults = null;
      overlay.remove();
      fetchDefaults().then(function (freshDefaults) {
        if (!freshDefaults) {
          alert('无法加载最新规则，请检查网络后重试');
          return;
        }
        buildSettingsModal(freshDefaults, onSave, true);
      });
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#1a1a3a;color:#ccc;font-size:14px;font-weight:600;cursor:pointer;';
    cancelBtn.onclick = function () { overlay.remove(); };

    var saveBtn = document.createElement('button');
    saveBtn.textContent = '保存';
    saveBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#e94560;color:#fff;font-size:14px;font-weight:600;cursor:pointer;';
    saveBtn.onclick = function () {
      // 收集其他权重
      var newW = {};
      for (var key in DEFAULT_WEIGHTS) {
        if (!DEFAULT_WEIGHTS.hasOwnProperty(key)) continue;
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
      // 如果用户修改了专武映射，保存到权重中
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
          // 自定义角色：始终保存到charTierOverride（确保导出后监控脚本能识别新角色）
          newCharTierOverride[entName] = entTier;
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
      for (var tmk in tmSeen) { if (tmSeen.hasOwnProperty(tmk)) newTeamMultiBonus.push(tmSeen[tmk]); }
      newTeamMultiBonus.sort(function (a, b) { return a.count - b.count; });
      newW.teamMultiBonus = newTeamMultiBonus;

      // 收集抽数公式参数（使用 isNaN 而非 || ，否则输入 0 会被当作 falsy 而被默认值覆盖）
      var _pullBaseVal = parseFloat(pullBaseInput.value);
      newW.pullBase = isNaN(_pullBaseVal) ? 200 : _pullBaseVal;
      var _pullBasePriceVal = parseFloat(pullBasePriceInput.value);
      newW.pullBasePrice = isNaN(_pullBasePriceVal) ? 1.0 : _pullBasePriceVal;
      var _pullStepPriceVal = parseFloat(pullStepPriceInput.value);
      newW.pullStepPrice = isNaN(_pullStepPriceVal) ? 0.002 : _pullStepPriceVal;
      var _pullMaxPriceVal = parseFloat(pullMaxPriceInput.value);
      newW.pullMaxPrice = isNaN(_pullMaxPriceVal) ? (DEFAULT_WEIGHTS.pullMaxPrice != null ? DEFAULT_WEIGHTS.pullMaxPrice : 5) : _pullMaxPriceVal;

      // 收集满命抽数加成公式参数
      var _pullC6BaseVal = parseFloat(pullC6BaseInput.value);
      newW.pullC6Base = isNaN(_pullC6BaseVal) ? DEFAULT_WEIGHTS.pullC6Base : _pullC6BaseVal;
      newW.pullC6BaseBonus = (parseFloat(pullC6BaseBonusInput.value) || 0) / 100;
      var _pullC6StepVal = parseFloat(pullC6StepInput.value);
      newW.pullC6Step = isNaN(_pullC6StepVal) ? DEFAULT_WEIGHTS.pullC6Step : _pullC6StepVal;
      newW.pullC6StepBonus = (parseFloat(pullC6StepBonusInput.value) || 0) / 100;
      var _pullC6ThresholdVal = parseFloat(pullC6ThresholdInput.value);
      newW.pullC6Threshold = isNaN(_pullC6ThresholdVal) ? (DEFAULT_WEIGHTS.pullC6Threshold != null ? DEFAULT_WEIGHTS.pullC6Threshold : 400) : _pullC6ThresholdVal;
      var _pullC6MaxWCVal = parseFloat(pullC6MaxWCInput.value);
      newW.pullC6MaxWeightedConst = isNaN(_pullC6MaxWCVal) ? (DEFAULT_WEIGHTS.pullC6MaxWeightedConst != null ? DEFAULT_WEIGHTS.pullC6MaxWeightedConst : 20) : _pullC6MaxWCVal;
      var _pullC6PPWCVal = parseFloat(pullC6PullPerWCInput.value);
      newW.pullPerWeightedConst = isNaN(_pullC6PPWCVal) ? (DEFAULT_WEIGHTS.pullPerWeightedConst != null ? DEFAULT_WEIGHTS.pullPerWeightedConst : 450) : _pullC6PPWCVal;
      var _pullC6PPWCCountVal = parseFloat(pullC6PullPerWCCountInput.value);
      newW.pullPerWeightedConstCount = isNaN(_pullC6PPWCCountVal) ? (DEFAULT_WEIGHTS.pullPerWeightedConstCount != null ? DEFAULT_WEIGHTS.pullPerWeightedConstCount : 1) : _pullC6PPWCCountVal;

      // 收集满命溢价公式参数
      var _c6BaseVal = parseFloat(c6BaseInp.value);
      newW.c6Base = isNaN(_c6BaseVal) ? DEFAULT_WEIGHTS.c6Base : _c6BaseVal;
      newW.c6BaseBonus = (parseFloat(c6BaseBonusInp.value) || 0) / 100;
      var _c6StepVal = parseFloat(c6StepInp.value);
      newW.c6Step = isNaN(_c6StepVal) ? DEFAULT_WEIGHTS.c6Step : _c6StepVal;
      newW.c6StepBonus = (parseFloat(c6StepBonusInp.value) || 0) / 100;
      var _c6MaxWCVal = parseFloat(c6MaxWCInp.value);
      newW.c6MaxWeightedConst = isNaN(_c6MaxWCVal) ? (DEFAULT_WEIGHTS.c6MaxWeightedConst != null ? DEFAULT_WEIGHTS.c6MaxWeightedConst : 0) : _c6MaxWCVal;

      // 保留默认满命溢价档位（引擎使用，UI 不编辑）
      newW.c6MultiBonus = DEFAULT_WEIGHTS.c6MultiBonus;

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
      var _effMaxCoeffVal = parseFloat(effMaxCoeffInp.value);
      newW.effYellowMaxCoeff = isNaN(_effMaxCoeffVal) ? 2.5 : _effMaxCoeffVal;
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
      for (var tn in newTeamPremiums) {
        if (!newTeamPremiums.hasOwnProperty(tn)) continue;
        var td2 = newTeamPremiums[tn];
        if (td2 && td2.enabled !== false) {
          newW.teams.push({ name: tn, members: td2.chars || [], multiplier: td2.multiplier || 1.0 });
        }
      }

      // 保存到 localStorage
      saveWeights(newW);
      overlay.remove();
      // 触发保存回调（用于重新估价等）
      if (typeof onSave === 'function') {
        try { onSave(newW); } catch (e) { console.error('[value-settings] onSave 回调出错:', e); }
      }
    };

    // 导出配置按钮
    var exportBtn = document.createElement('button');
    exportBtn.textContent = '导出配置';
    exportBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#0f3460;color:#8ecdf5;font-size:14px;font-weight:600;cursor:pointer;';
    exportBtn.onclick = function () {
      var config = localStorage.getItem(STORAGE_KEY);
      if (!config) {
        alert('当前没有已保存的自定义配置，请先点击「保存」后再导出。');
        return;
      }
      // 去除内部派生字段（constPrices 由 constPremiums 推导，无需导出）
      try {
        var parsed = JSON.parse(config);
        delete parsed.constPrices;
        delete parsed.deletedChars;
        delete parsed.sigWeaponsOverride;
        config = JSON.stringify(parsed, null, 2);
      } catch (e) { /* 解析失败则导出原始配置 */ }
      var blob = new Blob([config], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = gameKey + '_value_config_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    // 导入配置按钮
    var importBtn = document.createElement('button');
    importBtn.textContent = '导入配置';
    importBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#1a3a1a;color:#4ade80;font-size:14px;font-weight:600;cursor:pointer;';
    importBtn.onclick = function () {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var imported = JSON.parse(ev.target.result);
            // 去除内部派生字段
            delete imported.constPrices;
            delete imported.deletedChars;
            delete imported.sigWeaponsOverride;
            saveWeights(imported);
            alert('配置导入成功！面板将刷新以显示导入的配置。');
            overlay.remove();
            if (typeof onSave === 'function') {
              try { onSave(imported); } catch (e) { console.error('[value-settings] onSave 回调出错:', e); }
            }
            // 重新打开面板以加载导入的配置
            setTimeout(function () { openValueSettings(onSave); }, 100);
          } catch (err) {
            alert('导入失败：文件不是有效的 JSON 配置。\n' + err.message);
          }
        };
        reader.readAsText(file);
      };
      fileInput.click();
    };

    btnArea.appendChild(resetBtn);
    btnArea.appendChild(cancelBtn);
    btnArea.appendChild(saveBtn);
    btnArea.appendChild(exportBtn);
    btnArea.appendChild(importBtn);
    dialog.appendChild(btnArea);

    overlay.appendChild(dialog);
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  // ============================================================
  // 通用编辑对话框（简化各处编辑弹窗代码）
  // ============================================================
  function openEditDialog(opts) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#12122a;border:1px solid #2a2a4a;border-radius:12px;padding:20px;width:300px;color:#e0e0e0;';
    var html = '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:' + (opts.titleColor || '#fbbf24') + ';">' + opts.title + '</div>';
    if (opts.headerInfo) {
      html += '<div style="margin-bottom:10px;font-size:12px;color:#888;">' + opts.headerInfo + '</div>';
    }
    for (var i = 0; i < opts.fields.length; i++) {
      var f = opts.fields[i];
      html += '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">' + f.label + '</label>';
      if (f.type === 'select') {
        html += '<select class="field-' + f.key + '" style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;">';
        if (f.allowEmpty) html += '<option value="">（不选）</option>';
        for (var oi = 0; oi < (f.options || []).length; oi++) {
          var o = f.options[oi];
          html += '<option value="' + o + '"' + (o === f.value ? ' selected' : '') + '>' + o + '</option>';
        }
        html += '</select>';
      } else {
        html += '<input type="' + (f.type || 'number') + '" class="field-' + f.key + '" value="' + f.value + '"' +
          (f.min != null ? ' min="' + f.min + '"' : '') +
          (f.max != null ? ' max="' + f.max + '"' : '') +
          (f.step != null ? ' step="' + f.step + '"' : '') +
          ' style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;" />';
      }
      html += '</div>';
    }
    html += '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
      '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#1a1a3a;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
      '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:' + (opts.saveColor || '#4ade80') + ';color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
    box.innerHTML = html;
    overlay.appendChild(box);

    box.querySelector('.cancel-btn').onclick = function () { overlay.remove(); };
    box.querySelector('.save-btn').onclick = function () {
      var vals = {};
      for (var i = 0; i < opts.fields.length; i++) {
        var f = opts.fields[i];
        vals[f.key] = box.querySelector('.field-' + f.key).value;
      }
      var ok = opts.onSave(vals);
      if (ok !== false) overlay.remove();
    };
    overlay.onclick = function (ev) { if (ev.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  // ============================================================
  // 新规则检测与加载（网站前端用）
  // ============================================================

  /**
   * 检测是否有新规则可用
   * 异步获取后端默认配置，与本地存储的版本号比较。
   * - 无自定义配置：静默更新版本号，返回 false
   * - 有自定义配置且版本落后：返回 true（由前端显示横幅提醒）
   * - 版本一致：返回 false
   * @returns {Promise<boolean>}
   */
  function checkNewRulesAvailable() {
    return fetchDefaults().then(function (defaults) {
      if (!defaults) return false;
      var currentVersion = defaults.configVersion || 1;
      var savedVersion = parseInt(localStorage.getItem(CONFIG_VERSION_KEY) || '0', 10);
      if (savedVersion < currentVersion) {
        var hasCustom = localStorage.getItem(STORAGE_KEY) != null;
        if (hasCustom) {
          // 有自定义配置，不自动更新版本号，等用户决定
          return true;
        } else {
          // 无自定义配置，静默更新版本号
          localStorage.setItem(CONFIG_VERSION_KEY, String(currentVersion));
          return false;
        }
      }
      return false;
    });
  }

  /**
   * 加载最新规则（清除自定义配置，使用最新默认值）
   */
  function loadLatestRules() {
    localStorage.removeItem(STORAGE_KEY);
    var currentVersion = (cachedDefaults && cachedDefaults.configVersion) || 1;
    localStorage.setItem(CONFIG_VERSION_KEY, String(currentVersion));
  }

  /**
   * 忽略新规则提醒（保留自定义配置，仅更新版本号）
   */
  function dismissNewRules() {
    var currentVersion = (cachedDefaults && cachedDefaults.configVersion) || 1;
    localStorage.setItem(CONFIG_VERSION_KEY, String(currentVersion));
  }

  // ============================================================
  // 导出全局函数
  // ============================================================
  window.openValueSettings = openValueSettings;
  window.getSavedWeights = getSavedWeights;
  window.hasCustomWeights = hasCustomWeights;
  window.setValueSettingsGame = setValueSettingsGame;
  window.checkNewRulesAvailable = checkNewRulesAvailable;
  window.loadLatestRules = loadLatestRules;
  window.dismissNewRules = dismissNewRules;

  // 预加载默认配置，使 getSavedWeights() 的 CONFIG_VERSION 检查能正常工作
  fetchDefaults();
})();
