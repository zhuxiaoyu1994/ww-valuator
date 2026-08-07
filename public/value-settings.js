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

  // localStorage 存储键
  var STORAGE_KEY = 'mw_eval_weights';
  var CONFIG_VERSION_KEY = 'mw_eval_config_version';

  // 缓存的默认配置（从 /api/defaults 获取）
  var cachedDefaults = null;

  // ============================================================
  // 默认配置获取与缓存
  // ============================================================

  /**
   * 从后端获取默认权重配置
   * @returns {Promise<object|null>}
   */
  function fetchDefaults() {
    if (cachedDefaults) return Promise.resolve(cachedDefaults);
    return fetch('/api/defaults')
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
    w.c6MultiBonus = (s.c6MultiBonus && s.c6MultiBonus.length) ? s.c6MultiBonus : DEFAULT_WEIGHTS.c6MultiBonus;
    w.pullC6Bonus = (s.pullC6Bonus && s.pullC6Bonus.length) ? s.pullC6Bonus : DEFAULT_WEIGHTS.pullC6Bonus;
    w.teamMultiBonus = (s.teamMultiBonus && s.teamMultiBonus.length) ? s.teamMultiBonus : DEFAULT_WEIGHTS.teamMultiBonus;
    w.flatDiscountRules = (s.flatDiscountRules && s.flatDiscountRules.length) ? s.flatDiscountRules : DEFAULT_WEIGHTS.flatDiscountRules;
    w.c6TeamDependency = s.c6TeamDependency || DEFAULT_WEIGHTS.c6TeamDependency;
    w.pullTiers = (s.pullTiers && s.pullTiers.length) ? s.pullTiers : defaults.pullTiers;
    w.yellowTiers = (s.yellowTiers && s.yellowTiers.length) ? s.yellowTiers : defaults.yellowTiers;
    w.charPrices = Object.assign({}, defaults.charPrices, s.charPrices || {});
    w.constPremiums = Object.assign({}, defaults.constPremiums, s.constPremiums || {});
    w.teamPremiums = s.teamPremiums || buildDefaultTeamPremiums(defaults.teams);
    w.teams = [];
    for (var teamName in w.teamPremiums) {
      if (!w.teamPremiums.hasOwnProperty(teamName)) continue;
      var t = w.teamPremiums[teamName];
      if (t && t.enabled !== false) {
        w.teams.push({ name: teamName, members: t.chars || [], multiplier: t.multiplier || 1.0 });
      }
    }
    w.needSigWeapons = s.needSigWeapons || defaults.needSigWeapons;
    w.deletedChars = s.deletedChars || [];
    w.charTierOverride = s.charTierOverride || {};
    return w;
  }

  // ============================================================
  // 存储读写
  // ============================================================

  /**
   * 从 localStorage 读取保存的权重，没有则返回 null
   * 配置版本不匹配时自动清除旧配置
   */
  function getSavedWeights() {
    try {
      // 配置版本检查
      var savedVersion = parseInt(localStorage.getItem(CONFIG_VERSION_KEY) || '0', 10);
      var currentVersion = (cachedDefaults && cachedDefaults.configVersion) || 1;
      if (savedVersion < currentVersion) {
        var existing = localStorage.getItem(STORAGE_KEY);
        if (existing) {
          console.log('[value-settings] 检测到新规则版本，用户有自定义配置');
          window._hasNewRulesAvailable = true;
          localStorage.setItem(CONFIG_VERSION_KEY, String(currentVersion));
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

    fetchDefaults().then(function (defaults) {
      if (!defaults) {
        alert('无法加载默认权重配置，请检查网络后重试');
        return;
      }
      buildSettingsModal(defaults, onSave);
    });
  }

  function buildSettingsModal(defaults, onSave) {
    var saved = getSavedWeights() || {};
    var w = loadWeights(defaults, saved);

    // 收集所有角色名（按级别排序）
    var allCharNames = [];
    var CHAR_TIERS = defaults.charTiers;
    for (var tierKey in CHAR_TIERS) {
      if (!CHAR_TIERS.hasOwnProperty(tierKey)) continue;
      for (var ni = 0; ni < CHAR_TIERS[tierKey].chars.length; ni++) {
        allCharNames.push(CHAR_TIERS[tierKey].chars[ni]);
      }
    }
    allCharNames.sort();

    var DEFAULT_WEIGHTS = defaults.weights;
    var DEFAULT_TEAMS = defaults.teams;
    var DEFAULT_PULL_TIERS = defaults.pullTiers;
    var DEFAULT_YELLOW_TIERS = defaults.yellowTiers;
    var DEFAULT_CONST_PREMIUMS = defaults.constPremiums;
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
    subtitle.textContent = '热门角色(S/A/B)按里程碑估值：C0+专武=基础价, C3+专武=2倍, C6+专武=3倍, 无专武仅值15%。冷门角色(C/D/E)仅加分项。保存后立即生效。';
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
    charDesc.innerHTML = '可自由添加、修改、删除角色定价及命座溢价。武器名自动匹配，也可手动修改。<br>S/A/B级为热门角色（按里程碑估值），C/D/E级为冷门角色（仅加分项）。<br>点击每行"溢价"按钮可设置该角色达到指定命座时的额外加价（如C3→+50元，C6→+180元，只取最高不叠加）。';
    charSection.appendChild(charDesc);

    // 角色定价数据（可增删改）
    var charEntries = [];
    var deletedChars = (saved && Array.isArray(saved.deletedChars)) ? saved.deletedChars.slice() : [];
    var tierLabels = { S: 'S级 热门人权', A: 'A级 热门限定', B: 'B级 温门核心', C: 'C级 冷门限定', D: 'D级 退环境', E: 'E级 常驻五星' };
    var tierColors = { S: '#4ade80', A: '#e94560', B: '#fbbf24', C: '#9ca3af', D: '#6b7280', E: '#4b5563' };
    var tierOrder = ['S', 'A', 'B', 'C', 'D', 'E'];

    // 获取角色的默认级别（在CHAR_TIERS中的原始级别）
    function getDefaultTier(name) {
      for (var dti = 0; dti < tierOrder.length; dti++) {
        var dtk = tierOrder[dti];
        if (CHAR_TIERS[dtk] && CHAR_TIERS[dtk].chars.indexOf(name) >= 0) return dtk;
      }
      return null;
    }

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
        charEntries.push({ name: cname, weapon: weapon, price: userPrice, tier: tk, premiums: w.constPremiums && w.constPremiums[cname] ? Object.assign({}, w.constPremiums[cname]) : {} });
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
        charEntries.push({ name: ovrName, weapon: ovrWeapon, price: ovrUserPrice, tier: ovrTier, premiums: w.constPremiums && w.constPremiums[ovrName] ? Object.assign({}, w.constPremiums[ovrName]) : {} });
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
        charEntries.push({ name: customName, weapon: customWeapon, price: w.charPrices[customName], tier: customTier, premiums: w.constPremiums && w.constPremiums[customName] ? Object.assign({}, w.constPremiums[customName]) : {} });
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

            // 命座溢价按钮
            var premBtn = document.createElement('button');
            var premCount = entry.premiums ? Object.keys(entry.premiums).length : 0;
            premBtn.textContent = '溢价' + (premCount > 0 ? '(' + premCount + ')' : '');
            premBtn.title = '编辑命座溢价';
            premBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:' + (premCount > 0 ? '#4ade80' : '#555') + ';font-size:11px;cursor:pointer;line-height:1.4;';
            premBtn.onclick = function() {
              var premOverlay = document.createElement('div');
              premOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100003;display:flex;align-items:center;justify-content:center;';
              var premBox = document.createElement('div');
              premBox.style.cssText = 'background:#0f0f23;border-radius:12px;padding:20px;width:300px;color:#e0e0e0;';
              var premHTML = '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#4ade80;">编辑命座溢价 - ' + entry.name + '</div>';
              premHTML += '<div style="font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;">达到指定命座时额外加价（只取最高溢价，不叠加）。留空或0表示无溢价。</div>';
              for (var pci = 1; pci <= 6; pci++) {
                var curPremVal = entry.premiums && entry.premiums[pci] != null ? entry.premiums[pci] : '';
                premHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                  '<span style="font-size:12px;color:#e94560;font-weight:600;min-width:30px;">C' + pci + '</span>' +
                  '<span style="color:#555;font-size:11px;">→ +</span>' +
                  '<input type="number" class="prem-c' + pci + '" value="' + curPremVal + '" placeholder="0" min="0" style="width:80px;padding:4px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:right;" />' +
                  '<span style="color:#555;font-size:11px;">元</span>' +
                  '</div>';
              }
              premHTML += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
                '<button class="cancel-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#333;color:#888;font-size:12px;cursor:pointer;">取消</button>' +
                '<button class="save-btn" style="padding:6px 16px;border:none;border-radius:4px;background:#4ade80;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;">保存</button></div>';
              premBox.innerHTML = premHTML;
              premBox.querySelector('.cancel-btn').onclick = function() { premOverlay.remove(); };
              premBox.querySelector('.save-btn').onclick = function() {
                entry.premiums = {};
                for (var sci = 1; sci <= 6; sci++) {
                  var pv = parseFloat(premBox.querySelector('.prem-c' + sci).value);
                  if (!isNaN(pv) && pv > 0) {
                    entry.premiums[sci] = pv;
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
      charEntries.push({ name: nm, weapon: wpn, price: pr, tier: addTierSelect.value, premiums: {} });
      // 如果角色之前被删除过，从 deletedChars 中移除
      var dcIdx = deletedChars.indexOf(nm);
      if (dcIdx >= 0) deletedChars.splice(dcIdx, 1);
      renderCharList();
      addNameInput.value = ''; addWeaponInput.value = '';
    };
    addCharRow.appendChild(addCharBtn);
    charSection.appendChild(addCharRow);

    dialog.appendChild(charSection);

    // ===== 2. 抽数阶梯定价 =====
    var pullSection = document.createElement('div');
    pullSection.style.cssText = 'margin-bottom:20px;';
    var pullTitle = document.createElement('div');
    pullTitle.style.cssText = 'font-size:14px;font-weight:600;color:#60a5fa;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    pullTitle.textContent = '抽数阶梯定价（资源越多每抽越值钱）';
    pullSection.appendChild(pullTitle);
    var pullDesc = document.createElement('p');
    pullDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    pullDesc.innerHTML = '抽数 = 星声/160 + 月相/160 + 余波珊瑚/8 + 浮金波纹 + 铸潮波纹。设置阶梯区间和每抽价值，资源越多越值钱。';
    pullSection.appendChild(pullDesc);

    var pullList = document.createElement('div');
    pullList.style.cssText = 'margin-bottom:12px;max-height:300px;overflow-y:auto;border:1px solid #2a2a4a;border-radius:8px;padding:6px;';
    var pullEntries = (w.pullTiers || DEFAULT_PULL_TIERS).map(function (e) { return { minPull: e.minPull, maxPull: e.maxPull, perPullPrice: e.perPullPrice }; });

    function renderPullList() {
      pullList.innerHTML = '';
      if (pullEntries.length === 0) { pullList.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无阶梯规则</div>'; return; }
      pullEntries.sort(function (a, b) { return a.minPull - b.minPull; });
      var prices = pullEntries.map(function(e) { return e.perPullPrice; });
      var minPrice = Math.min.apply(null, prices);
      var maxPrice = Math.max.apply(null, prices);
      for (var i = 0; i < pullEntries.length; i++) {
        (function (idx) {
          var e = pullEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:3px;padding:3px 4px;font-size:11px;border-bottom:1px solid #1a1a3a;';

          var minInp = document.createElement('input');
          minInp.type = 'number'; minInp.value = e.minPull; minInp.min = 0;
          minInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#60a5fa;font-size:11px;text-align:center;';
          minInp.title = '起始抽数';
          minInp.onchange = function() { e.minPull = parseInt(minInp.value) || 0; };
          row.appendChild(minInp);

          var dash = document.createElement('span');
          dash.textContent = '~'; dash.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(dash);

          var maxInp = document.createElement('input');
          maxInp.type = 'number'; maxInp.value = (e.maxPull === Infinity ? '' : e.maxPull); maxInp.min = 0; maxInp.placeholder = '∞';
          maxInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#60a5fa;font-size:11px;text-align:center;';
          maxInp.title = '结束抽数（留空表示无限）';
          maxInp.onchange = function() {
            var v = parseInt(maxInp.value);
            e.maxPull = (isNaN(v) || v >= 99999) ? Infinity : v;
          };
          row.appendChild(maxInp);

          var unitLab = document.createElement('span');
          unitLab.textContent = '抽'; unitLab.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(unitLab);

          var priceInp = document.createElement('input');
          priceInp.type = 'number'; priceInp.value = e.perPullPrice; priceInp.step = 0.1; priceInp.min = 0;
          priceInp.style.cssText = 'width:42px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
          priceInp.title = '每抽价值（元）';
          priceInp.onchange = function() { e.perPullPrice = parseFloat(priceInp.value) || 0; };
          row.appendChild(priceInp);

          var yuanLab = document.createElement('span');
          yuanLab.textContent = '元'; yuanLab.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(yuanLab);

          var barWrap = document.createElement('div');
          barWrap.style.cssText = 'flex:1;min-width:20px;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;margin-left:2px;';
          var barFill = document.createElement('div');
          var ratio = maxPrice > minPrice ? (e.perPullPrice - minPrice) / (maxPrice - minPrice) : 0.5;
          barFill.className = 'price-bar';
          barFill.style.cssText = 'height:100%;width:' + (15 + ratio * 85) + '%;background:linear-gradient(90deg,#60a5fa,#4ade80);border-radius:3px;transition:width 0.2s;';
          barWrap.appendChild(barFill);
          row.appendChild(barWrap);

          var delBtn = document.createElement('button');
          delBtn.textContent = '×'; delBtn.title = '删除';
          delBtn.style.cssText = 'padding:1px 6px;border:none;border-radius:3px;background:#1a1a2e;color:#e94560;font-size:13px;cursor:pointer;line-height:1;';
          delBtn.onclick = function () { pullEntries.splice(idx, 1); renderPullList(); };
          row.appendChild(delBtn);

          pullList.appendChild(row);
        })(i);
      }
    }

    renderPullList();
    pullSection.appendChild(pullList);

    // 添加新抽数阶梯
    var addPullRow = document.createElement('div');
    addPullRow.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:11px;margin-top:4px;';
    var minInput = document.createElement('input');
    minInput.type = 'number'; minInput.min = '0'; minInput.placeholder = '起始';
    minInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#60a5fa;font-size:11px;text-align:center;';
    addPullRow.appendChild(minInput);
    var dashSpan = document.createElement('span');
    dashSpan.textContent = '~'; dashSpan.style.cssText = 'color:#555;font-size:10px;';
    addPullRow.appendChild(dashSpan);
    var maxInput = document.createElement('input');
    maxInput.type = 'number'; maxInput.min = '0'; maxInput.placeholder = '∞';
    maxInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#60a5fa;font-size:11px;text-align:center;';
    addPullRow.appendChild(maxInput);
    var pullUnit = document.createElement('span');
    pullUnit.textContent = '抽'; pullUnit.style.cssText = 'color:#555;font-size:10px;';
    addPullRow.appendChild(pullUnit);
    var priceInput = document.createElement('input');
    priceInput.type = 'number'; priceInput.step = '0.1'; priceInput.placeholder = '每抽';
    priceInput.style.cssText = 'width:46px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
    addPullRow.appendChild(priceInput);
    var yuanSpan = document.createElement('span');
    yuanSpan.textContent = '元'; yuanSpan.style.cssText = 'color:#555;font-size:10px;';
    addPullRow.appendChild(yuanSpan);
    var addPullBtn = document.createElement('button');
    addPullBtn.textContent = '添加';
    addPullBtn.style.cssText = 'padding:3px 10px;border:none;border-radius:3px;background:#60a5fa;color:#0f0f23;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
    addPullBtn.onclick = function () {
      var minVal = parseInt(minInput.value) || 0;
      var maxRaw = parseInt(maxInput.value);
      var maxVal = (isNaN(maxRaw) || maxRaw >= 99999) ? Infinity : maxRaw;
      var priceVal = parseFloat(priceInput.value);
      if (isNaN(priceVal) || priceVal < 0) { alert('请输入每抽价值'); return; }
      pullEntries.push({ minPull: minVal, maxPull: maxVal, perPullPrice: priceVal });
      renderPullList(); minInput.value = ''; maxInput.value = ''; priceInput.value = '';
    };
    addPullRow.appendChild(addPullBtn);
    pullSection.appendChild(addPullRow);

    // 满命抽数加成档位
    var pullC6Divider = document.createElement('div');
    pullC6Divider.style.cssText = 'border-top:1px dashed #2a2a4a;margin:16px 0 12px 0;';
    pullSection.appendChild(pullC6Divider);

    var pullC6Title = document.createElement('div');
    pullC6Title.style.cssText = 'font-size:13px;font-weight:600;color:#fbbf24;margin-bottom:4px;';
    pullC6Title.textContent = '满命抽数加成（加权满命数 → 抽数价值加成）';
    pullSection.appendChild(pullC6Title);

    var pullC6Desc = document.createElement('p');
    pullC6Desc.style.cssText = 'font-size:11px;color:#888;margin-bottom:10px;line-height:1.5;';
    pullC6Desc.innerHTML = '根据加权满命数（与满命溢价共用），对抽数价值额外加成。如加权满命1 → 抽数价值+30%，加权满命2 → +50%。';
    pullSection.appendChild(pullC6Desc);

    var pullC6List = document.createElement('div');
    pullC6List.style.cssText = 'margin-bottom:10px;max-height:200px;overflow-y:auto;border:1px solid #2a2a4a;border-radius:8px;padding:6px;';
    var pullC6Entries = (w.pullC6Bonus || DEFAULT_WEIGHTS.pullC6Bonus).map(function (e) { return { count: e.count, bonus: e.bonus }; });

    function renderPullC6List() {
      pullC6List.innerHTML = '';
      if (pullC6Entries.length === 0) { pullC6List.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无加成规则</div>'; return; }
      pullC6Entries.sort(function (a, b) { return a.count - b.count; });
      var bonuses = pullC6Entries.map(function(e) { return e.bonus; });
      var minBonus = Math.min.apply(null, bonuses);
      var maxBonus = Math.max.apply(null, bonuses);
      for (var i = 0; i < pullC6Entries.length; i++) {
        (function (idx) {
          var e = pullC6Entries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:3px;padding:3px 4px;font-size:11px;border-bottom:1px solid #1a1a3a;';

          var countInp = document.createElement('input');
          countInp.type = 'number'; countInp.value = e.count; countInp.min = 1; countInp.step = 0.5;
          countInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#fbbf24;font-size:11px;text-align:center;font-weight:600;';
          countInp.title = '加权满命数';
          countInp.onchange = function() { e.count = parseFloat(countInp.value) || 1; };
          row.appendChild(countInp);

          var mingLab = document.createElement('span');
          mingLab.textContent = '命'; mingLab.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(mingLab);

          var plusLab = document.createElement('span');
          plusLab.textContent = '+'; plusLab.style.cssText = 'color:#555;font-size:10px;margin-left:2px;';
          row.appendChild(plusLab);

          var bonusInp = document.createElement('input');
          bonusInp.type = 'number'; bonusInp.value = parseFloat((e.bonus * 100).toFixed(2)); bonusInp.min = 0; bonusInp.step = 5;
          bonusInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
          bonusInp.title = '加成百分比（如15表示+15%）';
          bonusInp.onchange = function() { e.bonus = parseFloat(bonusInp.value) / 100 || 0; };
          row.appendChild(bonusInp);

          var pctLab = document.createElement('span');
          pctLab.textContent = '%'; pctLab.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(pctLab);

          var barWrap = document.createElement('div');
          barWrap.style.cssText = 'flex:1;min-width:20px;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;margin-left:2px;';
          var barFill = document.createElement('div');
          var ratio = maxBonus > minBonus ? (e.bonus - minBonus) / (maxBonus - minBonus) : 0.5;
          barFill.className = 'price-bar';
          barFill.style.cssText = 'height:100%;width:' + (15 + ratio * 85) + '%;background:linear-gradient(90deg,#fbbf24,#4ade80);border-radius:3px;transition:width 0.2s;';
          barWrap.appendChild(barFill);
          row.appendChild(barWrap);

          var delBtn = document.createElement('button');
          delBtn.textContent = '×'; delBtn.title = '删除';
          delBtn.style.cssText = 'padding:1px 6px;border:none;border-radius:3px;background:#1a1a2e;color:#e94560;font-size:13px;cursor:pointer;line-height:1;';
          delBtn.onclick = function () { pullC6Entries.splice(idx, 1); renderPullC6List(); };
          row.appendChild(delBtn);

          pullC6List.appendChild(row);
        })(i);
      }
    }
    renderPullC6List();
    pullSection.appendChild(pullC6List);

    // 添加新抽数满命加成
    var addPullC6Row = document.createElement('div');
    addPullC6Row.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:11px;margin-top:4px;';
    var pc6CountInput = document.createElement('input');
    pc6CountInput.type = 'number'; pc6CountInput.min = '1'; pc6CountInput.step = '0.5'; pc6CountInput.placeholder = '满命';
    pc6CountInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#fbbf24;font-size:11px;text-align:center;font-weight:600;';
    addPullC6Row.appendChild(pc6CountInput);
    var pc6MingLab = document.createElement('span');
    pc6MingLab.textContent = '命'; pc6MingLab.style.cssText = 'color:#555;font-size:10px;';
    addPullC6Row.appendChild(pc6MingLab);
    var pc6PlusLab = document.createElement('span');
    pc6PlusLab.textContent = '+'; pc6PlusLab.style.cssText = 'color:#555;font-size:10px;margin-left:2px;';
    addPullC6Row.appendChild(pc6PlusLab);
    var pc6BonusInput = document.createElement('input');
    pc6BonusInput.type = 'number'; pc6BonusInput.min = '0'; pc6BonusInput.step = '5'; pc6BonusInput.placeholder = '加成%';
    pc6BonusInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
    addPullC6Row.appendChild(pc6BonusInput);
    var pc6Pct = document.createElement('span');
    pc6Pct.textContent = '%'; pc6Pct.style.cssText = 'color:#555;font-size:10px;';
    addPullC6Row.appendChild(pc6Pct);
    var addPullC6Btn = document.createElement('button');
    addPullC6Btn.textContent = '添加';
    addPullC6Btn.style.cssText = 'padding:3px 10px;border:none;border-radius:3px;background:#fbbf24;color:#0f0f23;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
    addPullC6Btn.onclick = function () {
      var cVal = parseFloat(pc6CountInput.value);
      var bVal = parseFloat(pc6BonusInput.value) / 100;
      if (isNaN(cVal) || cVal < 1) { alert('加权满命数至少为1'); return; }
      if (isNaN(bVal) || bVal < 0) { alert('请输入加成百分比'); return; }
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

    // 满命溢价档位列表
    var c6List = document.createElement('div');
    c6List.style.cssText = 'margin-bottom:12px;max-height:200px;overflow-y:auto;border:1px solid #2a2a4a;border-radius:8px;padding:6px;';
    var c6Entries = (w.c6MultiBonus || DEFAULT_WEIGHTS.c6MultiBonus).map(function (e) { return { count: e.count, bonus: e.bonus }; });

    function renderC6List() {
      c6List.innerHTML = '';
      if (c6Entries.length === 0) { c6List.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无溢价档位，可点击下方"载入默认"快速添加</div>'; return; }
      c6Entries.sort(function (a, b) { return a.count - b.count; });
      var bonuses = c6Entries.map(function(e) { return e.bonus; });
      var minBonus = Math.min.apply(null, bonuses);
      var maxBonus = Math.max.apply(null, bonuses);
      for (var i = 0; i < c6Entries.length; i++) {
        (function (idx) {
          var e = c6Entries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:3px;padding:3px 4px;font-size:11px;border-bottom:1px solid #1a1a3a;';

          var countInp = document.createElement('input');
          countInp.type = 'number'; countInp.value = e.count; countInp.min = 1; countInp.max = 20; countInp.step = 0.5;
          countInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#e94560;font-size:11px;text-align:center;font-weight:600;';
          countInp.title = '等效满命数量';
          countInp.onchange = function() { e.count = parseFloat(countInp.value) || 1; };
          row.appendChild(countInp);

          var mingLab = document.createElement('span');
          mingLab.textContent = '命'; mingLab.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(mingLab);

          var plusLab = document.createElement('span');
          plusLab.textContent = '+'; plusLab.style.cssText = 'color:#555;font-size:10px;margin-left:2px;';
          row.appendChild(plusLab);

          var bonusInp = document.createElement('input');
          bonusInp.type = 'number'; bonusInp.value = parseFloat((e.bonus * 100).toFixed(2)); bonusInp.min = 0; bonusInp.step = 5;
          bonusInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
          bonusInp.title = '加成百分比（如50表示+50%，200表示+200%）';
          bonusInp.onchange = function() { e.bonus = parseFloat(bonusInp.value) / 100 || 0; };
          row.appendChild(bonusInp);

          var pctLab = document.createElement('span');
          pctLab.textContent = '%'; pctLab.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(pctLab);

          var barWrap = document.createElement('div');
          barWrap.style.cssText = 'flex:1;min-width:20px;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;margin-left:2px;';
          var barFill = document.createElement('div');
          var ratio = maxBonus > minBonus ? (e.bonus - minBonus) / (maxBonus - minBonus) : 0.5;
          barFill.className = 'price-bar';
          barFill.style.cssText = 'height:100%;width:' + (15 + ratio * 85) + '%;background:linear-gradient(90deg,#e94560,#4ade80);border-radius:3px;transition:width 0.2s;';
          barWrap.appendChild(barFill);
          row.appendChild(barWrap);

          var delBtn = document.createElement('button');
          delBtn.textContent = '×'; delBtn.title = '删除';
          delBtn.style.cssText = 'padding:1px 6px;border:none;border-radius:3px;background:#1a1a2e;color:#e94560;font-size:13px;cursor:pointer;line-height:1;';
          delBtn.onclick = function () { var di = c6Entries.indexOf(e); if (di >= 0) c6Entries.splice(di, 1); renderC6List(); };
          row.appendChild(delBtn);

          c6List.appendChild(row);
        })(i);
      }
    }
    renderC6List();
    c6Section.appendChild(c6List);

    // 载入默认按钮 + 添加新档位
    var c6AddRow = document.createElement('div');
    c6AddRow.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:11px;margin-top:4px;';

    var loadC6DefaultBtn = document.createElement('button');
    loadC6DefaultBtn.textContent = '载入默认';
    loadC6DefaultBtn.style.cssText = 'padding:3px 10px;border:none;border-radius:3px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;margin-right:6px;';
    loadC6DefaultBtn.onclick = function () {
      c6Entries.length = 0;
      c6Entries.push({ count: 2, bonus: 0.50 });
      c6Entries.push({ count: 3, bonus: 1.00 });
      c6Entries.push({ count: 4, bonus: 1.50 });
      c6Entries.push({ count: 5, bonus: 2.00 });
      renderC6List();
    };
    c6AddRow.appendChild(loadC6DefaultBtn);

    var c6CountInput = document.createElement('input');
    c6CountInput.type = 'number'; c6CountInput.min = '1'; c6CountInput.max = '20'; c6CountInput.step = '0.5'; c6CountInput.placeholder = '满命';
    c6CountInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#e94560;font-size:11px;text-align:center;font-weight:600;';
    c6AddRow.appendChild(c6CountInput);
    var c6MingLab = document.createElement('span');
    c6MingLab.textContent = '命'; c6MingLab.style.cssText = 'color:#555;font-size:10px;';
    c6AddRow.appendChild(c6MingLab);
    var c6PlusLab = document.createElement('span');
    c6PlusLab.textContent = '+'; c6PlusLab.style.cssText = 'color:#555;font-size:10px;margin-left:2px;';
    c6AddRow.appendChild(c6PlusLab);
    var c6BonusInput = document.createElement('input');
    c6BonusInput.type = 'number'; c6BonusInput.min = '0'; c6BonusInput.step = '5'; c6BonusInput.placeholder = '加成%';
    c6BonusInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
    c6AddRow.appendChild(c6BonusInput);
    var c6PctLab = document.createElement('span');
    c6PctLab.textContent = '%'; c6PctLab.style.cssText = 'color:#555;font-size:10px;';
    c6AddRow.appendChild(c6PctLab);
    var addC6Btn = document.createElement('button');
    addC6Btn.textContent = '添加';
    addC6Btn.style.cssText = 'padding:3px 10px;border:none;border-radius:3px;background:#e94560;color:#fff;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
    addC6Btn.onclick = function () {
      var count = parseFloat(c6CountInput.value);
      var bonus = parseFloat(c6BonusInput.value) / 100;
      if (isNaN(count) || count < 1) { alert('数量至少为1'); return; }
      if (isNaN(bonus) || bonus < 0) { alert('请输入加成百分比'); return; }
      var existingE = c6Entries.find(function (e) { return e.count === count; });
      if (existingE) { existingE.bonus = bonus; renderC6List(); }
      else { c6Entries.push({ count: count, bonus: bonus }); renderC6List(); }
      c6CountInput.value = ''; c6BonusInput.value = '';
    };
    c6AddRow.appendChild(addC6Btn);
    c6Section.appendChild(c6AddRow);
    dialog.appendChild(c6Section);

    // ===== 5. 黄数阶梯系数 =====
    var yellowSection = document.createElement('div');
    yellowSection.style.cssText = 'margin-bottom:20px;';
    var yellowTitle = document.createElement('div');
    yellowTitle.style.cssText = 'font-size:14px;font-weight:600;color:#fbbf24;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    yellowTitle.textContent = '黄数阶梯系数（黄数越多越稀有，估值乘以此系数）';
    yellowSection.appendChild(yellowTitle);
    var yellowDesc = document.createElement('p');
    yellowDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    yellowDesc.innerHTML = '黄数 = 五星角色数 + 五星武器数。黄数越多越难搜集，最终估值 = 各项估值之和 × 匹配档位的系数。';
    yellowSection.appendChild(yellowDesc);

    var yellowList = document.createElement('div');
    yellowList.style.cssText = 'margin-bottom:12px;max-height:300px;overflow-y:auto;border:1px solid #2a2a4a;border-radius:8px;padding:6px;';
    var yellowEntries = (w.yellowTiers || DEFAULT_YELLOW_TIERS).map(function (e) { return { minYellow: e.minYellow, maxYellow: e.maxYellow, coefficient: e.coefficient }; });

    function renderYellowList() {
      yellowList.innerHTML = '';
      if (yellowEntries.length === 0) { yellowList.innerHTML = '<div style="font-size:12px;color:#555;padding:8px 0;">暂无阶梯规则，可点击下方"载入默认"快速添加</div>'; return; }
      yellowEntries.sort(function (a, b) { return a.minYellow - b.minYellow; });
      var coefs = yellowEntries.map(function(e) { return e.coefficient; });
      var minCoef = Math.min.apply(null, coefs);
      var maxCoef = Math.max.apply(null, coefs);
      for (var i = 0; i < yellowEntries.length; i++) {
        (function (idx) {
          var e = yellowEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:3px;padding:3px 4px;font-size:11px;border-bottom:1px solid #1a1a3a;';

          var minInp = document.createElement('input');
          minInp.type = 'number'; minInp.value = e.minYellow; minInp.min = 0;
          minInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#fbbf24;font-size:11px;text-align:center;';
          minInp.title = '起始黄数';
          minInp.onchange = function() { e.minYellow = parseInt(minInp.value) || 0; };
          row.appendChild(minInp);

          var dash = document.createElement('span');
          dash.textContent = '~'; dash.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(dash);

          var maxInp = document.createElement('input');
          maxInp.type = 'number'; maxInp.value = (e.maxYellow === Infinity ? '' : e.maxYellow); maxInp.min = 0; maxInp.placeholder = '∞';
          maxInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#fbbf24;font-size:11px;text-align:center;';
          maxInp.title = '结束黄数（留空表示无限）';
          maxInp.onchange = function() {
            var v = parseInt(maxInp.value);
            e.maxYellow = (isNaN(v) || v >= 99999) ? Infinity : v;
          };
          row.appendChild(maxInp);

          var unitLab = document.createElement('span');
          unitLab.textContent = '黄'; unitLab.style.cssText = 'color:#555;font-size:10px;';
          row.appendChild(unitLab);

          var xLab = document.createElement('span');
          xLab.textContent = '×'; xLab.style.cssText = 'color:#555;font-size:10px;margin-left:2px;';
          row.appendChild(xLab);

          var coefInp = document.createElement('input');
          coefInp.type = 'number'; coefInp.value = e.coefficient; coefInp.min = 0; coefInp.step = 0.05;
          coefInp.style.cssText = 'width:52px;padding:2px 3px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
          coefInp.title = '系数（如1.5表示×1.5）';
          coefInp.onchange = function() { e.coefficient = parseFloat(coefInp.value) || 0; };
          row.appendChild(coefInp);

          var barWrap = document.createElement('div');
          barWrap.style.cssText = 'flex:1;min-width:20px;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;margin-left:2px;';
          var barFill = document.createElement('div');
          var ratio = maxCoef > minCoef ? (e.coefficient - minCoef) / (maxCoef - minCoef) : 0.5;
          barFill.className = 'price-bar';
          barFill.style.cssText = 'height:100%;width:' + (15 + ratio * 85) + '%;background:linear-gradient(90deg,#fbbf24,#4ade80);border-radius:3px;transition:width 0.2s;';
          barWrap.appendChild(barFill);
          row.appendChild(barWrap);

          var delBtn = document.createElement('button');
          delBtn.textContent = '×'; delBtn.title = '删除';
          delBtn.style.cssText = 'padding:1px 6px;border:none;border-radius:3px;background:#1a1a2e;color:#e94560;font-size:13px;cursor:pointer;line-height:1;';
          delBtn.onclick = function () { var di = yellowEntries.indexOf(e); if (di >= 0) yellowEntries.splice(di, 1); renderYellowList(); };
          row.appendChild(delBtn);

          yellowList.appendChild(row);
        })(i);
      }
    }

    renderYellowList();
    yellowSection.appendChild(yellowList);

    // 载入默认按钮 + 添加新黄数阶梯
    var yellowAddRow = document.createElement('div');
    yellowAddRow.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:11px;margin-top:4px;';

    var loadYellowDefaultBtn = document.createElement('button');
    loadYellowDefaultBtn.textContent = '载入默认';
    loadYellowDefaultBtn.style.cssText = 'padding:3px 10px;border:none;border-radius:3px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;margin-right:6px;';
    loadYellowDefaultBtn.onclick = function () {
      yellowEntries.length = 0;
      for (var i = 0; i < DEFAULT_YELLOW_TIERS.length; i++) {
        yellowEntries.push({ minYellow: DEFAULT_YELLOW_TIERS[i].minYellow, maxYellow: DEFAULT_YELLOW_TIERS[i].maxYellow, coefficient: DEFAULT_YELLOW_TIERS[i].coefficient });
      }
      renderYellowList();
    };
    yellowAddRow.appendChild(loadYellowDefaultBtn);

    var yMinInput = document.createElement('input');
    yMinInput.type = 'number'; yMinInput.min = '0'; yMinInput.placeholder = '起始';
    yMinInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#fbbf24;font-size:11px;text-align:center;';
    yellowAddRow.appendChild(yMinInput);
    var yDash = document.createElement('span');
    yDash.textContent = '~'; yDash.style.cssText = 'color:#555;font-size:10px;';
    yellowAddRow.appendChild(yDash);
    var yMaxInput = document.createElement('input');
    yMaxInput.type = 'number'; yMaxInput.min = '0'; yMaxInput.placeholder = '∞';
    yMaxInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#fbbf24;font-size:11px;text-align:center;';
    yellowAddRow.appendChild(yMaxInput);
    var yUnit = document.createElement('span');
    yUnit.textContent = '黄'; yUnit.style.cssText = 'color:#555;font-size:10px;';
    yellowAddRow.appendChild(yUnit);
    var yXLab = document.createElement('span');
    yXLab.textContent = '×'; yXLab.style.cssText = 'color:#555;font-size:10px;margin-left:2px;';
    yellowAddRow.appendChild(yXLab);
    var yCoefInput = document.createElement('input');
    yCoefInput.type = 'number'; yCoefInput.min = '0'; yCoefInput.step = '0.05'; yCoefInput.placeholder = '系数';
    yCoefInput.style.cssText = 'width:52px;padding:3px 4px;border:1px solid #2a2a4a;border-radius:3px;background:#0a0a1a;color:#4ade80;font-size:11px;text-align:right;font-weight:600;';
    yellowAddRow.appendChild(yCoefInput);
    var addYellowBtn = document.createElement('button');
    addYellowBtn.textContent = '添加';
    addYellowBtn.style.cssText = 'padding:3px 10px;border:none;border-radius:3px;background:#fbbf24;color:#0f0f23;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
    addYellowBtn.onclick = function () {
      var min = parseInt(yMinInput.value);
      var maxRaw = parseInt(yMaxInput.value);
      var max = (isNaN(maxRaw) || maxRaw >= 99999) ? Infinity : maxRaw;
      var coef = parseFloat(yCoefInput.value);
      if (isNaN(min) || min < 0) { alert('起始黄数不能为负'); return; }
      if (isNaN(coef) || coef < 0) { alert('请输入有效的系数'); return; }
      yellowEntries.push({ minYellow: min, maxYellow: max, coefficient: coef });
      renderYellowList(); yMinInput.value = ''; yMaxInput.value = ''; yCoefInput.value = '';
    };
    yellowAddRow.appendChild(addYellowBtn);
    yellowSection.appendChild(yellowAddRow);
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

    // ===== 8. 需要专武的角色（无专武时按折扣扣价值） =====
    var needSigSection = document.createElement('div');
    needSigSection.style.cssText = 'margin-bottom:20px;';
    var needSigTitle = document.createElement('div');
    needSigTitle.style.cssText = 'font-size:14px;font-weight:600;color:#f87171;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    needSigTitle.textContent = '需要专武的角色（无专武时扣价值）';
    needSigSection.appendChild(needSigTitle);
    var needSigDesc = document.createElement('p');
    needSigDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    needSigDesc.innerHTML = '列表中的角色无专武时，价值 = 基础价 × 折扣（0.5=仅值50%）。不在此列表的角色按热门/冷门统一倍率处理。';
    needSigSection.appendChild(needSigDesc);

    var needSigList = document.createElement('div');
    needSigList.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:12px;min-height:30px;';
    var needSigEntries = [].concat(w.needSigWeapons || DEFAULT_NEED_SIG_WEAPONS);
    function getNeedSigName(e) { return typeof e === 'string' ? e : e.name; }
    function getNeedSigDiscount(e) { return typeof e === 'string' ? 0.5 : (e.discount != null ? e.discount : 0.5); }
    function renderNeedSigList() {
      needSigList.innerHTML = '';
      if (needSigEntries.length === 0) { needSigList.innerHTML = '<div style="font-size:12px;color:#555;padding:4px 0;">暂无角色，可在下方添加</div>'; return; }
      for (var i = 0; i < needSigEntries.length; i++) {
        (function (idx) {
          var entry = needSigEntries[idx];
          var nm = getNeedSigName(entry);
          var dc = getNeedSigDiscount(entry);
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;background:rgba(248,113,113,0.1);border-radius:4px;';
          row.innerHTML =
            '<span style="font-size:12px;color:#f87171;font-weight:600;min-width:60px;">' + nm + '</span>' +
            '<span style="font-size:11px;color:#888;">无专武值</span>' +
            '<input type="number" class="ns-discount" value="' + dc + '" min="0" max="1" step="0.05" style="width:60px;padding:3px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;" />' +
            '<span style="font-size:11px;color:#888;">倍</span>' +
            '<button class="ns-del" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#333;color:#f87171;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.ns-discount').oninput = function () {
            if (typeof entry === 'string') { needSigEntries[idx] = { name: entry, discount: parseFloat(this.value) || 0 }; entry = needSigEntries[idx]; }
            else { entry.discount = parseFloat(this.value) || 0; }
          };
          row.querySelector('.ns-del').onclick = function () { needSigEntries.splice(idx, 1); renderNeedSigList(); };
          needSigList.appendChild(row);
        })(i);
      }
    }
    renderNeedSigList();
    needSigSection.appendChild(needSigList);

    var needSigRow = document.createElement('div');
    needSigRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;';
    var needSigSelect = document.createElement('select');
    needSigSelect.style.cssText = 'flex:1;min-width:120px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    var nsEmptyOpt = document.createElement('option');
    nsEmptyOpt.value = ''; nsEmptyOpt.textContent = '选择角色...';
    needSigSelect.appendChild(nsEmptyOpt);
    function refreshNeedSigSelect() {
      var selected = needSigSelect.value;
      var opts = [nsEmptyOpt];
      for (var nsi = 0; nsi < allCharNames.length; nsi++) {
        var inList = needSigEntries.some(function(e) { return getNeedSigName(e) === allCharNames[nsi]; });
        if (inList) continue;
        var nsOpt = document.createElement('option');
        nsOpt.value = allCharNames[nsi]; nsOpt.textContent = allCharNames[nsi];
        opts.push(nsOpt);
      }
      needSigSelect.innerHTML = '';
      for (var oi = 0; oi < opts.length; oi++) needSigSelect.appendChild(opts[oi]);
      needSigSelect.value = selected;
    }
    refreshNeedSigSelect();
    needSigRow.appendChild(needSigSelect);
    var needSigAddBtn = document.createElement('button');
    needSigAddBtn.textContent = '添加';
    needSigAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#f87171;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    needSigAddBtn.onclick = function () {
      var nm = needSigSelect.value;
      if (!nm) return;
      if (needSigEntries.some(function(e) { return getNeedSigName(e) === nm; })) return;
      needSigEntries.push({ name: nm, discount: 0.5 });
      renderNeedSigList();
      refreshNeedSigSelect();
      needSigSelect.value = '';
    };
    needSigRow.appendChild(needSigAddBtn);
    needSigSection.appendChild(needSigRow);

    var needSigDefaultBtn = document.createElement('button');
    needSigDefaultBtn.textContent = '载入默认列表';
    needSigDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #f87171;border-radius:4px;background:transparent;color:#f87171;font-size:11px;cursor:pointer;';
    needSigDefaultBtn.onclick = function () {
      var defaults = DEFAULT_NEED_SIG_WEAPONS;
      for (var di = 0; di < defaults.length; di++) {
        var dName = getNeedSigName(defaults[di]);
        if (!needSigEntries.some(function(e) { return getNeedSigName(e) === dName; })) {
          needSigEntries.push({ name: dName, discount: getNeedSigDiscount(defaults[di]) });
        }
      }
      renderNeedSigList();
      refreshNeedSigSelect();
    };
    needSigSection.appendChild(needSigDefaultBtn);
    dialog.appendChild(needSigSection);

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

    // ===== 8.6 C6配队依赖 =====
    var c6DepSection = document.createElement('div');
    c6DepSection.style.cssText = 'margin-bottom:20px;border:1px solid #2a2a4a;border-radius:8px;padding:12px;background:#0a0a1a;';
    var c6DepTitle = document.createElement('div');
    c6DepTitle.style.cssText = 'font-size:14px;font-weight:600;color:#fbbf24;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    c6DepTitle.textContent = 'C6配队依赖（满命角色缺少关键队友时降级）';
    c6DepSection.appendChild(c6DepTitle);
    var c6DepDesc = document.createElement('p');
    c6DepDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    c6DepDesc.innerHTML = '满命角色缺少关键队友时：C6权重降级（影响满命溢价）+ 角色价值打折（影响基础价值）。例如卡提希娅C6缺夏空时，权重从S(1.0)降到A(0.6)，角色价值×80%。';
    c6DepSection.appendChild(c6DepDesc);

    var c6DepList = document.createElement('div');
    c6DepList.style.cssText = 'margin-bottom:8px;';
    var c6DepEntries = [];
    var c6DepConfig = w.c6TeamDependency || DEFAULT_WEIGHTS.c6TeamDependency || {};
    for (var cdk in c6DepConfig) {
      if (!c6DepConfig.hasOwnProperty(cdk)) continue;
      var cdInfo = c6DepConfig[cdk];
      c6DepEntries.push({
        name: cdk,
        teammate: Array.isArray(cdInfo.teammate) ? cdInfo.teammate.join(',') : (cdInfo.teammate || ''),
        weightTier: cdInfo.weightTier || 'A',
        valueDiscount: cdInfo.valueDiscount != null ? cdInfo.valueDiscount : 1.0
      });
    }
    function renderC6DepList() {
      c6DepList.innerHTML = '';
      if (c6DepEntries.length === 0) { c6DepList.innerHTML = '<div style="font-size:12px;color:#555;padding:4px 0;">暂无C6配队依赖规则，可点击下方"载入默认"</div>'; return; }
      for (var i = 0; i < c6DepEntries.length; i++) {
        (function (idx) {
          var e = c6DepEntries[idx];
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid #2a2a4a;border-radius:4px;margin-bottom:4px;background:#12122a;';
          var info = document.createElement('div');
          info.style.cssText = 'flex:1;font-size:12px;color:#e0e0e0;';
          info.innerHTML = '<b style="color:#fbbf24;">' + e.name + '</b> 缺 <b style="color:#f87171;">' + e.teammate + '</b> → C6降' + e.weightTier + ' ×' + Math.round(e.valueDiscount * 100) + '%';
          row.appendChild(info);
          var editBtn = document.createElement('button');
          editBtn.textContent = '编辑';
          editBtn.style.cssText = 'padding:3px 10px;border:1px solid #4a4a6a;border-radius:4px;background:transparent;color:#60a5fa;font-size:11px;cursor:pointer;';
          editBtn.onclick = function () {
            openEditDialog({
              title: '编辑C6配队依赖',
              titleColor: '#fbbf24', saveColor: '#fbbf24',
              fields: [
                { label: '角色名称', key: 'name', type: 'select', value: e.name, options: allCharNames },
                { label: '所需队友', key: 'teammate', type: 'select', value: e.teammate.split(',')[0], options: allCharNames, allowEmpty: true },
                { label: '降级权重档位', key: 'weightTier', type: 'text', value: e.weightTier },
                { label: '角色价值折扣（0-1）', key: 'valueDiscount', type: 'number', value: e.valueDiscount, min: 0, max: 1, step: 0.05 }
              ],
              onSave: function (vals) {
                if (!vals.name) { alert('请输入角色名称'); return false; }
                c6DepEntries[idx] = {
                  name: vals.name,
                  teammate: vals.teammate || '',
                  weightTier: (vals.weightTier || 'A').toUpperCase(),
                  valueDiscount: isNaN(parseFloat(vals.valueDiscount)) ? 1.0 : parseFloat(vals.valueDiscount)
                };
                renderC6DepList();
                return true;
              }
            });
          };
          row.appendChild(editBtn);
          var delBtn = document.createElement('button');
          delBtn.textContent = '删除';
          delBtn.className = 'del-btn';
          delBtn.style.cssText = 'padding:3px 10px;border:1px solid #4a4a6a;border-radius:4px;background:transparent;color:#f87171;font-size:11px;cursor:pointer;';
          delBtn.onclick = function () { c6DepEntries.splice(idx, 1); renderC6DepList(); };
          row.appendChild(delBtn);
          c6DepList.appendChild(row);
        })(i);
      }
    }
    renderC6DepList();
    c6DepSection.appendChild(c6DepList);

    var c6DepAddRow = document.createElement('div');
    c6DepAddRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;';
    var c6DepNameInput = document.createElement('select');
    c6DepNameInput.style.cssText = 'flex:1;min-width:100px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    var c6DepNamePlaceholder = document.createElement('option');
    c6DepNamePlaceholder.value = ''; c6DepNamePlaceholder.textContent = '角色名称';
    c6DepNameInput.appendChild(c6DepNamePlaceholder);
    for (var dni = 0; dni < allCharNames.length; dni++) {
      var c6no = document.createElement('option');
      c6no.value = allCharNames[dni]; c6no.textContent = allCharNames[dni];
      c6DepNameInput.appendChild(c6no);
    }
    c6DepAddRow.appendChild(c6DepNameInput);
    var c6DepMateInput = document.createElement('select');
    c6DepMateInput.style.cssText = 'flex:1;min-width:100px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    var c6DepMatePlaceholder = document.createElement('option');
    c6DepMatePlaceholder.value = ''; c6DepMatePlaceholder.textContent = '所需队友';
    c6DepMateInput.appendChild(c6DepMatePlaceholder);
    for (var dmi = 0; dmi < allCharNames.length; dmi++) {
      var c6mo = document.createElement('option');
      c6mo.value = allCharNames[dmi]; c6mo.textContent = allCharNames[dmi];
      c6DepMateInput.appendChild(c6mo);
    }
    c6DepAddRow.appendChild(c6DepMateInput);
    var c6DepTierInput = document.createElement('select');
    c6DepTierInput.style.cssText = 'width:60px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    var tierOpts = ['S', 'A', 'B', 'C', 'D', 'E'];
    for (var ti2 = 0; ti2 < tierOpts.length; ti2++) {
      var opt = document.createElement('option');
      opt.value = tierOpts[ti2]; opt.textContent = tierOpts[ti2];
      c6DepTierInput.appendChild(opt);
    }
    c6DepTierInput.value = 'A';
    c6DepAddRow.appendChild(c6DepTierInput);
    var c6DepDiscountInput = document.createElement('input');
    c6DepDiscountInput.type = 'number'; c6DepDiscountInput.min = '0'; c6DepDiscountInput.max = '1'; c6DepDiscountInput.step = '0.05'; c6DepDiscountInput.value = '0.8';
    c6DepDiscountInput.style.cssText = 'width:60px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    c6DepAddRow.appendChild(c6DepDiscountInput);
    var c6DepAddBtn = document.createElement('button');
    c6DepAddBtn.textContent = '添加';
    c6DepAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#fbbf24;color:#12122a;font-size:12px;font-weight:600;cursor:pointer;';
    c6DepAddBtn.onclick = function () {
      var nm = c6DepNameInput.value.trim();
      var mt = c6DepMateInput.value.trim();
      if (!nm || !mt) { alert('请输入角色名称和所需队友'); return; }
      c6DepEntries.push({ name: nm, teammate: mt, weightTier: c6DepTierInput.value, valueDiscount: parseFloat(c6DepDiscountInput.value) || 1.0 });
      c6DepNameInput.value = ''; c6DepMateInput.value = '';
      renderC6DepList();
    };
    c6DepAddRow.appendChild(c6DepAddBtn);
    c6DepSection.appendChild(c6DepAddRow);

    var c6DepDefaultBtn = document.createElement('button');
    c6DepDefaultBtn.textContent = '载入默认';
    c6DepDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #fbbf24;border-radius:4px;background:transparent;color:#fbbf24;font-size:11px;cursor:pointer;';
    c6DepDefaultBtn.onclick = function () {
      var defaults = DEFAULT_WEIGHTS.c6TeamDependency || {};
      c6DepEntries.length = 0;
      for (var dname in defaults) {
        if (!defaults.hasOwnProperty(dname)) continue;
        var dInfo = defaults[dname];
        c6DepEntries.push({
          name: dname,
          teammate: Array.isArray(dInfo.teammate) ? dInfo.teammate.join(',') : (dInfo.teammate || ''),
          weightTier: dInfo.weightTier || 'A',
          valueDiscount: dInfo.valueDiscount != null ? dInfo.valueDiscount : 1.0
        });
      }
      renderC6DepList();
    };
    c6DepSection.appendChild(c6DepDefaultBtn);
    dialog.appendChild(c6DepSection);

    // ===== 9. 其他权重 =====
    var weightsSection = document.createElement('div');
    weightsSection.style.cssText = 'margin-bottom:20px;';
    var wsTitle = document.createElement('div');
    wsTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:12px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    wsTitle.textContent = '其他权重（热门/冷门参数 + 资源定价）';
    weightsSection.appendChild(wsTitle);

    var weightInputs = {};
    var skipKeys = { c6TierWeights: true, c6MultiBonus: true, pullC6Bonus: true, teamMultiBonus: true, flatDiscountRules: true, c6TeamDependency: true, charPrices: true, constPremiums: true, teamPremiums: true, teams: true, pullTiers: true, yellowTiers: true, needSigWeapons: true };
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
      // 重置其他权重
      for (var key in DEFAULT_WEIGHTS) {
        if (!DEFAULT_WEIGHTS.hasOwnProperty(key) || skipKeys[key] || !weightInputs[key]) continue;
        weightInputs[key].value = DEFAULT_WEIGHTS[key];
      }
      // 重置角色价格
      charEntries.length = 0;
      deletedChars.length = 0;
      // 重置角色级别覆盖（恢复所有角色到默认级别）
      if (w.charTierOverride) {
        w.charTierOverride = {};
      }
      for (var rt = 0; rt < tierOrder.length; rt++) {
        var rtk = tierOrder[rt];
        if (!CHAR_TIERS[rtk]) continue;
        var rTier = CHAR_TIERS[rtk];
        for (var rc = 0; rc < rTier.chars.length; rc++) {
          var rName = rTier.chars[rc];
          charEntries.push({
            name: rName,
            weapon: SIG_WEAPONS[rName] || '',
            price: DEFAULT_CHAR_PRICES[rName] != null ? DEFAULT_CHAR_PRICES[rName] : rTier.price,
            tier: rtk,
            premiums: DEFAULT_CONST_PREMIUMS[rName] ? Object.assign({}, DEFAULT_CONST_PREMIUMS[rName]) : {},
          });
        }
      }
      renderCharList();
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
      // 重置低命折扣系数
      flatDiscountEntries.length = 0;
      for (var fdi = 0; fdi < DEFAULT_WEIGHTS.flatDiscountRules.length; fdi++) {
        flatDiscountEntries.push({ tiers: [].concat(DEFAULT_WEIGHTS.flatDiscountRules[fdi].tiers || []), maxConst: DEFAULT_WEIGHTS.flatDiscountRules[fdi].maxConst, discount: DEFAULT_WEIGHTS.flatDiscountRules[fdi].discount });
      }
      renderFlatDiscountList();
      // 重置C6配队依赖
      c6DepEntries.length = 0;
      var defC6Dep = DEFAULT_WEIGHTS.c6TeamDependency || {};
      for (var dname2 in defC6Dep) {
        if (!defC6Dep.hasOwnProperty(dname2)) continue;
        var dInfo2 = defC6Dep[dname2];
        c6DepEntries.push({
          name: dname2,
          teammate: Array.isArray(dInfo2.teammate) ? dInfo2.teammate.join(',') : (dInfo2.teammate || ''),
          weightTier: dInfo2.weightTier || 'A',
          valueDiscount: dInfo2.valueDiscount != null ? dInfo2.valueDiscount : 1.0
        });
      }
      renderC6DepList();
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
          // 自定义角色：级别不是默认C时保存
          if (entTier !== 'C') {
            newCharTierOverride[entName] = entTier;
          }
        }
      }
      newW.charTierOverride = newCharTierOverride;

      // 收集命座溢价（从角色定价条目中提取）
      var newConstPremiums = {};
      for (var ei = 0; ei < charEntries.length; ei++) {
        if (charEntries[ei].premiums && Object.keys(charEntries[ei].premiums).length > 0) {
          newConstPremiums[charEntries[ei].name] = {};
          for (var pbp in charEntries[ei].premiums) {
            if (charEntries[ei].premiums.hasOwnProperty(pbp)) {
              newConstPremiums[charEntries[ei].name][pbp] = charEntries[ei].premiums[pbp];
            }
          }
        }
      }
      // 保留不在charEntries中的角色命座溢价（如已删除角色），避免数据丢失
      var _existingPrems = w.constPremiums || {};
      var _charEntryNames = {};
      for (var _cei3 = 0; _cei3 < charEntries.length; _cei3++) _charEntryNames[charEntries[_cei3].name] = true;
      for (var _epName in _existingPrems) {
        if (!_existingPrems.hasOwnProperty(_epName)) continue;
        if (!_charEntryNames[_epName]) {
          newConstPremiums[_epName] = _existingPrems[_epName];
        }
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
      for (var tmk in tmSeen) { if (tmSeen.hasOwnProperty(tmk)) newTeamMultiBonus.push(tmSeen[tmk]); }
      newTeamMultiBonus.sort(function (a, b) { return a.count - b.count; });
      newW.teamMultiBonus = newTeamMultiBonus;

      // 收集抽数阶梯（去重：相同区间只保留最后一条）
      var newPullTiers = [];
      var pullSeen = {};
      for (var pli = 0; pli < pullEntries.length; pli++) {
        var plKey = pullEntries[pli].minPull + '-' + pullEntries[pli].maxPull;
        pullSeen[plKey] = { minPull: pullEntries[pli].minPull, maxPull: pullEntries[pli].maxPull, perPullPrice: pullEntries[pli].perPullPrice };
      }
      for (var plk in pullSeen) { if (pullSeen.hasOwnProperty(plk)) newPullTiers.push(pullSeen[plk]); }
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

      // 收集黄数阶梯（去重：相同区间只保留最后一条）
      var newYellowTiers = [];
      var yellowSeen = {};
      for (var yi3 = 0; yi3 < yellowEntries.length; yi3++) {
        var yKey = yellowEntries[yi3].minYellow + '-' + yellowEntries[yi3].maxYellow;
        yellowSeen[yKey] = { minYellow: yellowEntries[yi3].minYellow, maxYellow: yellowEntries[yi3].maxYellow, coefficient: yellowEntries[yi3].coefficient };
      }
      for (var yk in yellowSeen) { if (yellowSeen.hasOwnProperty(yk)) newYellowTiers.push(yellowSeen[yk]); }
      newYellowTiers.sort(function (a, b) { return a.minYellow - b.minYellow; });
      newW.yellowTiers = newYellowTiers;

      // 收集低命折扣系数规则
      var newFlatDiscountRules = [];
      for (var fdi2 = 0; fdi2 < flatDiscountEntries.length; fdi2++) {
        if (flatDiscountEntries[fdi2].tiers.length > 0) {
          newFlatDiscountRules.push({ tiers: flatDiscountEntries[fdi2].tiers, maxConst: flatDiscountEntries[fdi2].maxConst, discount: flatDiscountEntries[fdi2].discount });
        }
      }
      newW.flatDiscountRules = newFlatDiscountRules;

      // 收集C6配队依赖
      var newC6Dep = {};
      for (var cdi = 0; cdi < c6DepEntries.length; cdi++) {
        var depEntry = c6DepEntries[cdi];
        if (!depEntry.name) continue;
        var depMates = depEntry.teammate.split(/[,，]/).map(function (t) { return t.trim(); }).filter(function (t) { return t.length > 0; });
        if (depMates.length === 0) continue;
        newC6Dep[depEntry.name] = {
          teammate: depMates.length === 1 ? depMates[0] : depMates,
          weightTier: depEntry.weightTier || 'A',
          valueDiscount: depEntry.valueDiscount != null ? depEntry.valueDiscount : 1.0
        };
      }
      newW.c6TeamDependency = newC6Dep;

      // 收集需要专武的角色
      newW.needSigWeapons = needSigEntries;

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

    btnArea.appendChild(resetBtn);
    btnArea.appendChild(cancelBtn);
    btnArea.appendChild(saveBtn);
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
  window.checkNewRulesAvailable = checkNewRulesAvailable;
  window.loadLatestRules = loadLatestRules;
  window.dismissNewRules = dismissNewRules;
})();
