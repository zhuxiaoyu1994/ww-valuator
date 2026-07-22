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
    return w;
  }

  // ============================================================
  // 存储读写
  // ============================================================

  /**
   * 从 localStorage 读取保存的权重，没有则返回 null
   */
  function getSavedWeights() {
    try {
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
   * 保存权重到 localStorage
   */
  function saveWeights(w) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
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
      'box-shadow:0 20px 60px rgba(0,0,0,0.6);border:1px solid #2a2a4a;padding:24px;';

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
    charTitle.textContent = '五星角色定价（角色名 + 专武 + 估值）';
    charSection.appendChild(charTitle);

    var charDesc = document.createElement('p');
    charDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    charDesc.innerHTML = '可自由添加、修改、删除角色定价。武器名自动匹配，也可手动修改。<br>S/A/B级为热门角色（按里程碑估值），C/D/E级为冷门角色（仅加分项）。';
    charSection.appendChild(charDesc);

    // 角色定价数据（可增删改）
    var charEntries = [];
    var tierLabels = { S: 'S级 热门人权', A: 'A级 热门限定', B: 'B级 温门核心', C: 'C级 冷门限定', D: 'D级 退环境', E: 'E级 常驻五星' };
    var tierColors = { S: '#4ade80', A: '#e94560', B: '#fbbf24', C: '#9ca3af', D: '#6b7280', E: '#4b5563' };
    var tierOrder = ['S', 'A', 'B', 'C', 'D', 'E'];

    // 初始化角色列表
    for (var ti = 0; ti < tierOrder.length; ti++) {
      var tk = tierOrder[ti];
      if (!CHAR_TIERS[tk]) continue;
      var tier = CHAR_TIERS[tk];
      for (var ci = 0; ci < tier.chars.length; ci++) {
        var cname = tier.chars[ci];
        var defaultPrice = DEFAULT_CHAR_PRICES[cname] != null ? DEFAULT_CHAR_PRICES[cname] : tier.price;
        var userPrice = w.charPrices[cname] != null ? w.charPrices[cname] : defaultPrice;
        var weapon = SIG_WEAPONS[cname] || '';
        charEntries.push({ name: cname, weapon: weapon, price: userPrice, tier: tk });
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

            // 删除按钮
            var delBtn = document.createElement('button');
            delBtn.textContent = '×'; delBtn.title = '删除';
            delBtn.style.cssText = 'padding:2px 8px;border:none;border-radius:4px;background:#333;color:#e94560;font-size:14px;cursor:pointer;line-height:1;';
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
    premTitle.style.cssText = 'font-size:14px;font-weight:600;color:#4ade80;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    premTitle.textContent = '命座溢价（特定角色达到指定命座时额外加价）';
    premSection.appendChild(premTitle);

    var premDesc = document.createElement('p');
    premDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    premDesc.innerHTML = '设置方法：选择角色 → 输入命座数和对应溢价 → 添加。例如：绯雪 3命→+100元，6命→+200元。达到3命加100，达到6命加200（只取最高溢价，不叠加）。';
    premSection.appendChild(premDesc);

    var premList = document.createElement('div');
    premList.style.cssText = 'margin-bottom:12px;';
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
            '<span style="color:#fbbf24;">' + e.bp + '命</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#4ade80;font-weight:600;">+' + e.val + '元</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            openEditDialog({
              title: '编辑命座溢价', fields: [
                { label: '命座数', key: 'bp', type: 'number', value: e.bp, min: 1, max: 6 },
                { label: '溢价金额（元）', key: 'val', type: 'number', value: e.val },
              ],
              headerInfo: '角色：<span style="color:#e94560;font-weight:600;">' + e.name + '</span>',
              headerColor: '#fbbf24',
              saveColor: '#fbbf24',
              onSave: function (vals) {
                var newBp = parseInt(vals.bp);
                var newVal = parseFloat(vals.val);
                if (newBp >= 1 && newBp <= 6 && !isNaN(newVal)) { e.bp = newBp; e.val = newVal; renderPremList(); return true; }
                return false;
              }
            });
          };
          row.querySelector('.del-btn').onclick = function () { premEntries.splice(idx, 1); renderPremList(); };
          premList.appendChild(row);
        })(i);
      }
    }

    // 初始化已有规则
    var existingPrems = w.constPremiums || {};
    for (var premName in existingPrems) {
      if (!existingPrems.hasOwnProperty(premName)) continue;
      for (var premBp in existingPrems[premName]) {
        if (!existingPrems[premName].hasOwnProperty(premBp)) continue;
        premEntries.push({ name: premName, bp: parseInt(premBp), val: existingPrems[premName][premBp] });
      }
    }
    renderPremList();
    premSection.appendChild(premList);

    // 添加新规则的输入行
    var addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    var nameSelect = document.createElement('select');
    nameSelect.style.cssText = 'flex:1;min-width:100px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    for (var ni2 = 0; ni2 < allCharNames.length; ni2++) {
      var opt = document.createElement('option');
      opt.value = allCharNames[ni2]; opt.textContent = allCharNames[ni2];
      nameSelect.appendChild(opt);
    }
    addRow.appendChild(nameSelect);
    var bpInput = document.createElement('input');
    bpInput.type = 'number'; bpInput.min = '1'; bpInput.max = '6'; bpInput.placeholder = '命座';
    bpInput.style.cssText = 'width:60px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:center;';
    addRow.appendChild(bpInput);
    var arrowSpan = document.createElement('span');
    arrowSpan.textContent = '→'; arrowSpan.style.cssText = 'color:#555;font-size:12px;';
    addRow.appendChild(arrowSpan);
    var valInput = document.createElement('input');
    valInput.type = 'number'; valInput.placeholder = '溢价';
    valInput.style.cssText = 'width:70px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;text-align:right;';
    addRow.appendChild(valInput);
    var addBtn = document.createElement('button');
    addBtn.textContent = '添加';
    addBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#4ade80;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;';
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
    pullTitle.style.cssText = 'font-size:14px;font-weight:600;color:#60a5fa;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    pullTitle.textContent = '抽数阶梯定价（资源越多每抽越值钱）';
    pullSection.appendChild(pullTitle);
    var pullDesc = document.createElement('p');
    pullDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    pullDesc.innerHTML = '抽数 = 星声/160 + 月相/160 + 余波珊瑚/8 + 浮金波纹 + 铸潮波纹。设置阶梯区间和每抽价值，资源越多越值钱。';
    pullSection.appendChild(pullDesc);

    var pullList = document.createElement('div');
    pullList.style.cssText = 'margin-bottom:12px;';
    var pullEntries = (w.pullTiers || DEFAULT_PULL_TIERS).map(function (e) { return { minPull: e.minPull, maxPull: e.maxPull, perPullPrice: e.perPullPrice }; });

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
            '<span style="color:#60a5fa;font-weight:600;min-width:80px;">' + e.minPull + maxLabel + '抽</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#4ade80;font-weight:600;">' + e.perPullPrice + '元/抽</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            openEditDialog({
              title: '编辑抽数阶梯', titleColor: '#60a5fa', saveColor: '#60a5fa',
              fields: [
                { label: '起始抽数', key: 'min', type: 'number', value: e.minPull, min: 0 },
                { label: '结束抽数（填99999表示无限）', key: 'max', type: 'number', value: (e.maxPull === Infinity ? 99999 : e.maxPull), min: 0 },
                { label: '每抽价值（元）', key: 'price', type: 'number', value: e.perPullPrice, step: 0.1, min: 0 },
              ],
              onSave: function (vals) {
                var newMin = parseInt(vals.min) || 0;
                var newMaxRaw = parseInt(vals.max) || 99999;
                var newMax = newMaxRaw >= 99999 ? Infinity : newMaxRaw;
                var newPrice = parseFloat(vals.price) || 0;
                if (newMin >= 0 && newPrice >= 0) { e.minPull = newMin; e.maxPull = newMax; e.perPullPrice = newPrice; renderPullList(); return true; }
                return false;
              }
            });
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
    minInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    addPullRow.appendChild(minInput);
    var dashSpan = document.createElement('span');
    dashSpan.textContent = '~'; dashSpan.style.cssText = 'color:#555;font-size:11px;';
    addPullRow.appendChild(dashSpan);
    var maxInput = document.createElement('input');
    maxInput.type = 'number'; maxInput.min = '0'; maxInput.placeholder = '结束';
    maxInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    addPullRow.appendChild(maxInput);
    var pullUnit = document.createElement('span');
    pullUnit.textContent = '抽'; pullUnit.style.cssText = 'color:#888;font-size:11px;';
    addPullRow.appendChild(pullUnit);
    var arrowSpan2 = document.createElement('span');
    arrowSpan2.textContent = '→'; arrowSpan2.style.cssText = 'color:#555;font-size:11px;margin-left:4px;';
    addPullRow.appendChild(arrowSpan2);
    var priceInput = document.createElement('input');
    priceInput.type = 'number'; priceInput.step = '0.1'; priceInput.placeholder = '每抽';
    priceInput.style.cssText = 'width:60px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:right;';
    addPullRow.appendChild(priceInput);
    var yuanSpan = document.createElement('span');
    yuanSpan.textContent = '元'; yuanSpan.style.cssText = 'color:#888;font-size:11px;';
    addPullRow.appendChild(yuanSpan);
    var addPullBtn = document.createElement('button');
    addPullBtn.textContent = '添加';
    addPullBtn.style.cssText = 'padding:5px 12px;border:none;border-radius:4px;background:#60a5fa;color:#0f0f23;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
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
    pullC6List.style.cssText = 'margin-bottom:10px;';
    var pullC6Entries = (w.pullC6Bonus || DEFAULT_WEIGHTS.pullC6Bonus).map(function (e) { return { count: e.count, bonus: e.bonus }; });

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
            '<span style="color:#fbbf24;font-weight:600;min-width:80px;">加权满命' + e.count + '</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#4ade80;font-weight:600;">+' + (e.bonus * 100) + '%</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            openEditDialog({
              title: '编辑抽数满命加成', titleColor: '#fbbf24', saveColor: '#fbbf24',
              fields: [
                { label: '加权满命数', key: 'count', type: 'number', value: e.count, min: 1, step: 0.5 },
                { label: '加成系数（0.5=+50%）', key: 'bonus', type: 'number', value: e.bonus, min: 0, step: 0.05 },
              ],
              onSave: function (vals) {
                var newCount = parseFloat(vals.count) || 0;
                var newBonus = parseFloat(vals.bonus) || 0;
                if (newCount >= 1 && newBonus >= 0) { e.count = newCount; e.bonus = newBonus; renderPullC6List(); return true; }
                return false;
              }
            });
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
    pc6CountInput.style.cssText = 'width:80px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    addPullC6Row.appendChild(pc6CountInput);
    var pc6Arrow = document.createElement('span');
    pc6Arrow.textContent = '→'; pc6Arrow.style.cssText = 'color:#555;font-size:11px;';
    addPullC6Row.appendChild(pc6Arrow);
    var pc6BonusInput = document.createElement('input');
    pc6BonusInput.type = 'number'; pc6BonusInput.min = '0'; pc6BonusInput.step = '0.05'; pc6BonusInput.placeholder = '加成';
    pc6BonusInput.style.cssText = 'width:60px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:right;';
    addPullC6Row.appendChild(pc6BonusInput);
    var pc6Pct = document.createElement('span');
    pc6Pct.textContent = '(0.5=+50%)'; pc6Pct.style.cssText = 'color:#888;font-size:11px;';
    addPullC6Row.appendChild(pc6Pct);
    var addPullC6Btn = document.createElement('button');
    addPullC6Btn.textContent = '添加';
    addPullC6Btn.style.cssText = 'padding:5px 12px;border:none;border-radius:4px;background:#fbbf24;color:#0f0f23;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;';
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
    var c6TierList = ['S', 'A', 'B', 'C', 'D'];
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
    c6List.style.cssText = 'margin-bottom:12px;';
    var c6Entries = (w.c6MultiBonus || DEFAULT_WEIGHTS.c6MultiBonus).map(function (e) { return { count: e.count, bonus: e.bonus }; });

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
            '<span style="color:#4ade80;font-weight:600;">加' + Math.round(e.bonus * 100) + '%</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            openEditDialog({
              title: '编辑满命溢价档位', titleColor: '#e94560', saveColor: '#4ade80',
              fields: [
                { label: '等效满命数量', key: 'count', type: 'number', value: e.count, min: 2, max: 20 },
                { label: '加成比例（如0.2=20%）', key: 'bonus', type: 'number', value: e.bonus, min: 0, max: 5, step: 0.1 },
              ],
              onSave: function (vals) {
                var newCount = parseInt(vals.count);
                var newBonus = parseFloat(vals.bonus);
                if (newCount < 2) { alert('数量至少为2'); return false; }
                if (newBonus < 0) { alert('加成比例不能为负'); return false; }
                e.count = newCount; e.bonus = newBonus; renderC6List(); return true;
              }
            });
          };
          row.querySelector('.del-btn').onclick = function () { var di = c6Entries.indexOf(e); if (di >= 0) c6Entries.splice(di, 1); renderC6List(); };
          c6List.appendChild(row);
        })(i);
      }
    }
    renderC6List();
    c6Section.appendChild(c6List);

    // 载入默认按钮
    var loadC6DefaultBtn = document.createElement('button');
    loadC6DefaultBtn.textContent = '载入默认';
    loadC6DefaultBtn.style.cssText = 'margin-right:10px;padding:5px 12px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;';
    loadC6DefaultBtn.onclick = function () {
      c6Entries.length = 0;
      c6Entries.push({ count: 2, bonus: 0.50 });
      c6Entries.push({ count: 3, bonus: 1.00 });
      c6Entries.push({ count: 4, bonus: 1.50 });
      c6Entries.push({ count: 5, bonus: 2.00 });
      renderC6List();
    };
    c6Section.appendChild(loadC6DefaultBtn);

    // 添加新档位
    var addC6Row = document.createElement('div');
    addC6Row.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-top:10px;';
    var c6CountInput = document.createElement('input');
    c6CountInput.type = 'number'; c6CountInput.min = '2'; c6CountInput.max = '20'; c6CountInput.placeholder = '数量';
    c6CountInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    addC6Row.appendChild(c6CountInput);
    var c6Unit = document.createElement('span');
    c6Unit.textContent = '个等效满命'; c6Unit.style.cssText = 'color:#888;font-size:11px;';
    addC6Row.appendChild(c6Unit);
    var c6Arrow = document.createElement('span');
    c6Arrow.textContent = '→'; c6Arrow.style.cssText = 'color:#555;font-size:11px;';
    addC6Row.appendChild(c6Arrow);
    var c6BonusInput = document.createElement('input');
    c6BonusInput.type = 'number'; c6BonusInput.min = '0'; c6BonusInput.max = '5'; c6BonusInput.step = '0.1'; c6BonusInput.placeholder = '加成';
    c6BonusInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
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
    yellowTitle.style.cssText = 'font-size:14px;font-weight:600;color:#fbbf24;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    yellowTitle.textContent = '黄数阶梯系数（黄数越多越稀有，估值乘以此系数）';
    yellowSection.appendChild(yellowTitle);
    var yellowDesc = document.createElement('p');
    yellowDesc.style.cssText = 'font-size:11px;color:#888;margin-bottom:12px;line-height:1.5;';
    yellowDesc.innerHTML = '黄数 = 五星角色数 + 五星武器数。黄数越多越难搜集，最终估值 = 各项估值之和 × 匹配档位的系数。';
    yellowSection.appendChild(yellowDesc);

    var yellowList = document.createElement('div');
    yellowList.style.cssText = 'margin-bottom:12px;';
    var yellowEntries = (w.yellowTiers || DEFAULT_YELLOW_TIERS).map(function (e) { return { minYellow: e.minYellow, maxYellow: e.maxYellow, coefficient: e.coefficient }; });

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
            '<span style="color:#fbbf24;font-weight:600;min-width:80px;">' + e.minYellow + maxLabel + '黄</span>' +
            '<span style="color:#555;">→</span>' +
            '<span style="color:#4ade80;font-weight:600;">×' + e.coefficient + '</span>' +
            '<button class="edit-btn" style="margin-left:auto;padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;">编辑</button>' +
            '<button class="del-btn" style="padding:2px 8px;border:none;border-radius:4px;background:#1a1a3a;color:#e94560;font-size:11px;cursor:pointer;">删除</button>';
          row.querySelector('.edit-btn').onclick = function () {
            openEditDialog({
              title: '编辑黄数阶梯系数', titleColor: '#fbbf24', saveColor: '#4ade80',
              fields: [
                { label: '起始黄数', key: 'min', type: 'number', value: e.minYellow, min: 0 },
                { label: '结束黄数（填99999表示无限）', key: 'max', type: 'number', value: (e.maxYellow === Infinity ? 99999 : e.maxYellow), min: 0 },
                { label: '系数（如0.5=50%）', key: 'coef', type: 'number', value: e.coefficient, min: 0, max: 10, step: 0.1 },
              ],
              onSave: function (vals) {
                var newMin = parseInt(vals.min);
                var newMax = parseInt(vals.max);
                var newCoef = parseFloat(vals.coef);
                if (isNaN(newMin) || newMin < 0) { alert('起始黄数不能为负'); return false; }
                if (isNaN(newCoef) || newCoef < 0) { alert('系数不能为负'); return false; }
                e.minYellow = newMin; e.maxYellow = newMax >= 99999 ? Infinity : newMax; e.coefficient = newCoef;
                renderYellowList(); return true;
              }
            });
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
    loadYellowDefaultBtn.style.cssText = 'margin-right:10px;padding:5px 12px;border:none;border-radius:4px;background:#1a1a3a;color:#fbbf24;font-size:11px;cursor:pointer;';
    loadYellowDefaultBtn.onclick = function () {
      yellowEntries.length = 0;
      for (var i = 0; i < DEFAULT_YELLOW_TIERS.length; i++) {
        yellowEntries.push({ minYellow: DEFAULT_YELLOW_TIERS[i].minYellow, maxYellow: DEFAULT_YELLOW_TIERS[i].maxYellow, coefficient: DEFAULT_YELLOW_TIERS[i].coefficient });
      }
      renderYellowList();
    };
    yellowSection.appendChild(loadYellowDefaultBtn);

    // 添加新黄数阶梯
    var addYellowRow = document.createElement('div');
    addYellowRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;margin-top:10px;';
    var yMinInput = document.createElement('input');
    yMinInput.type = 'number'; yMinInput.min = '0'; yMinInput.placeholder = '起始';
    yMinInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    addYellowRow.appendChild(yMinInput);
    var yDash = document.createElement('span');
    yDash.textContent = '~'; yDash.style.cssText = 'color:#555;font-size:11px;';
    addYellowRow.appendChild(yDash);
    var yMaxInput = document.createElement('input');
    yMaxInput.type = 'number'; yMaxInput.min = '0'; yMaxInput.placeholder = '结束';
    yMaxInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    addYellowRow.appendChild(yMaxInput);
    var yUnit = document.createElement('span');
    yUnit.textContent = '黄'; yUnit.style.cssText = 'color:#888;font-size:11px;';
    addYellowRow.appendChild(yUnit);
    var yArrow = document.createElement('span');
    yArrow.textContent = '→'; yArrow.style.cssText = 'color:#555;font-size:11px;';
    addYellowRow.appendChild(yArrow);
    var yCoefInput = document.createElement('input');
    yCoefInput.type = 'number'; yCoefInput.min = '0'; yCoefInput.max = '10'; yCoefInput.step = '0.1'; yCoefInput.placeholder = '系数';
    yCoefInput.style.cssText = 'width:55px;padding:5px 6px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:11px;text-align:center;';
    addYellowRow.appendChild(yCoefInput);
    var yCoefUnit = document.createElement('span');
    yCoefUnit.textContent = '(如0.5=50%)'; yCoefUnit.style.cssText = 'color:#888;font-size:10px;';
    addYellowRow.appendChild(yCoefUnit);
    var addYellowBtn = document.createElement('button');
    addYellowBtn.textContent = '添加';
    addYellowBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#fbbf24;color:#0f0f23;font-size:12px;font-weight:600;cursor:pointer;';
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

    // ===== 8. 需要专武的角色（参考用） =====
    var needSigSection = document.createElement('div');
    needSigSection.style.cssText = 'margin-bottom:20px;';
    var needSigTitle = document.createElement('div');
    needSigTitle.style.cssText = 'font-size:14px;font-weight:600;color:#f87171;margin-bottom:6px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
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
          tag.style.cssText = 'font-size:11px;padding:4px 10px;border-radius:4px;background:rgba(248,113,113,0.15);color:#f87171;display:inline-flex;align-items:center;gap:4px;';
          tag.innerHTML = name + ' <button style="border:none;background:none;color:#f87171;font-size:12px;cursor:pointer;padding:0;margin-left:2px;">×</button>';
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
    needSigSelect.style.cssText = 'flex:1;min-width:120px;padding:5px 8px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;';
    var nsEmptyOpt = document.createElement('option');
    nsEmptyOpt.value = ''; nsEmptyOpt.textContent = '选择角色...';
    needSigSelect.appendChild(nsEmptyOpt);
    for (var nsi = 0; nsi < allCharNames.length; nsi++) {
      if (needSigEntries.indexOf(allCharNames[nsi]) !== -1) continue;
      var nsOpt = document.createElement('option');
      nsOpt.value = allCharNames[nsi]; nsOpt.textContent = allCharNames[nsi];
      needSigSelect.appendChild(nsOpt);
    }
    needSigRow.appendChild(needSigSelect);
    var needSigAddBtn = document.createElement('button');
    needSigAddBtn.textContent = '添加';
    needSigAddBtn.style.cssText = 'padding:5px 14px;border:none;border-radius:4px;background:#f87171;color:#fff;font-size:12px;font-weight:600;cursor:pointer;';
    needSigAddBtn.onclick = function () {
      var nm = needSigSelect.value;
      if (!nm || needSigEntries.indexOf(nm) !== -1) return;
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
    needSigDefaultBtn.style.cssText = 'padding:4px 12px;border:1px solid #f87171;border-radius:4px;background:transparent;color:#f87171;font-size:11px;cursor:pointer;';
    needSigDefaultBtn.onclick = function () {
      var defaults = DEFAULT_NEED_SIG_WEAPONS;
      for (var di = 0; di < defaults.length; di++) {
        if (needSigEntries.indexOf(defaults[di]) === -1) needSigEntries.push(defaults[di]);
      }
      renderNeedSigList();
    };
    needSigSection.appendChild(needSigDefaultBtn);
    dialog.appendChild(needSigSection);

    // ===== 9. 其他权重 =====
    var weightsSection = document.createElement('div');
    weightsSection.style.cssText = 'margin-bottom:20px;';
    var wsTitle = document.createElement('div');
    wsTitle.style.cssText = 'font-size:14px;font-weight:600;color:#e94560;margin-bottom:12px;border-bottom:1px solid #2a2a4a;padding-bottom:6px;';
    wsTitle.textContent = '其他权重（热门/冷门参数 + 资源定价）';
    weightsSection.appendChild(wsTitle);

    var weightInputs = {};
    var skipKeys = { c6TierWeights: true, c6MultiBonus: true, pullC6Bonus: true, teamMultiBonus: true, charPrices: true, constPremiums: true, teamPremiums: true, teams: true, pullTiers: true, yellowTiers: true, needSigWeapons: true };
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
    btnArea.style.cssText = 'display:flex;gap:10px;';

    var resetBtn = document.createElement('button');
    resetBtn.textContent = '恢复默认';
    resetBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:#1a1a3a;color:#ccc;font-size:14px;font-weight:600;cursor:pointer;';
    resetBtn.onclick = function () {
      // 重置其他权重
      for (var key in DEFAULT_WEIGHTS) {
        if (!DEFAULT_WEIGHTS.hasOwnProperty(key) || skipKeys[key] || !weightInputs[key]) continue;
        weightInputs[key].value = DEFAULT_WEIGHTS[key];
      }
      // 重置角色价格
      charEntries.length = 0;
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
          });
        }
      }
      renderCharList();
      // 重置命座溢价
      premEntries.length = 0;
      for (var cpName in DEFAULT_CONST_PREMIUMS) {
        if (!DEFAULT_CONST_PREMIUMS.hasOwnProperty(cpName)) continue;
        for (var cpBp in DEFAULT_CONST_PREMIUMS[cpName]) {
          if (!DEFAULT_CONST_PREMIUMS[cpName].hasOwnProperty(cpBp)) continue;
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
      // 如果用户修改了专武映射，保存到权重中
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
      html += '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#888;">' + f.label + '</label>' +
        '<input type="' + (f.type || 'number') + '" class="field-' + f.key + '" value="' + f.value + '"' +
        (f.min != null ? ' min="' + f.min + '"' : '') +
        (f.max != null ? ' max="' + f.max + '"' : '') +
        (f.step != null ? ' step="' + f.step + '"' : '') +
        ' style="width:100%;padding:6px 8px;margin-top:4px;border:1px solid #2a2a4a;border-radius:4px;background:#0a0a1a;color:#e0e0e0;font-size:12px;" /></div>';
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
  // 导出全局函数
  // ============================================================
  window.openValueSettings = openValueSettings;
  window.getSavedWeights = getSavedWeights;
  window.hasCustomWeights = hasCustomWeights;
})();
