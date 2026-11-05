'use strict';

function getAgentPushPage(characterGroups) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>推送管理</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { color-scheme: dark; }
  body { min-height: 100vh; background: #0d1020; color: #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 14px; }
  button, input, select { font: inherit; }
  button { cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  input, select { min-width: 0; }
  input:focus, select:focus, button:focus-visible { outline: 2px solid rgba(129,140,248,.55); outline-offset: 1px; }
  .hidden { display: none !important; }
  .login-shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
  .login-card { width: 100%; max-width: 400px; padding: 32px; background: #171a2e; border: 1px solid #292e49; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
  .login-card h1 { margin-bottom: 8px; color: #a5b4fc; font-size: 23px; text-align: center; }
  .login-card .intro { margin-bottom: 24px; color: #8b91aa; font-size: 13px; line-height: 1.7; text-align: center; }
  .login-card input { width: 100%; margin: 8px 0 16px; }
  .login-card button { width: 100%; }
  .login-error { display: none; margin-bottom: 12px; padding: 10px 12px; border: 1px solid rgba(248,113,113,.3); border-radius: 7px; background: rgba(248,113,113,.08); color: #fca5a5; font-size: 13px; line-height: 1.5; }
  .app { max-width: 1180px; margin: 0 auto; padding: 24px; }
  .page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
  .page-header h1 { color: #a5b4fc; font-size: 24px; }
  .page-header .subtitle { margin-top: 5px; color: #7f86a3; font-size: 12px; }
  .header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .save-state { color: #858ca6; font-size: 12px; white-space: nowrap; }
  .save-state.dirty { color: #fbbf24; }
  .card { margin-bottom: 18px; padding: 20px; background: #171a2e; border: 1px solid #292e49; border-radius: 12px; }
  .overview { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .master-label { display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .master-label input, .inline-toggle input { width: 18px; height: 18px; accent-color: #818cf8; cursor: pointer; }
  .master-label strong { display: block; margin-bottom: 3px; font-size: 16px; }
  .master-label small { color: #858ca6; }
  .summary { display: flex; gap: 24px; color: #9298b2; font-size: 13px; }
  .summary b { margin-left: 5px; color: #e5e7eb; font-size: 18px; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  .section-heading h2 { font-size: 17px; }
  .section-heading .heading-side { display: flex; align-items: center; gap: 12px; }
  .muted { color: #858ca6; }
  .small { font-size: 12px; }
  .btn { padding: 8px 15px; border: 1px solid #343a59; border-radius: 7px; background: #20243b; color: #dce0f0; transition: background .15s, border-color .15s; }
  .btn:hover:not(:disabled) { background: #292e48; border-color: #495171; }
  .btn-primary { border-color: #818cf8; background: #818cf8; color: #101327; font-weight: 600; }
  .btn-primary:hover:not(:disabled) { border-color: #a5b4fc; background: #a5b4fc; }
  .btn-quiet { border-color: transparent; background: transparent; color: #a5b4fc; }
  .btn-danger { border-color: rgba(248,113,113,.35); background: transparent; color: #f87171; }
  .btn-danger:hover:not(:disabled) { background: rgba(248,113,113,.1); border-color: #f87171; }
  .btn-sm { padding: 6px 11px; font-size: 12px; }
  .list { display: grid; gap: 10px; }
  .list-item { padding: 15px 16px; border: 1px solid #292e49; border-radius: 9px; background: #121526; }
  .item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
  .item-main { min-width: 0; flex: 1; }
  .item-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; font-size: 15px; font-weight: 600; }
  .item-actions { display: flex; gap: 7px; flex-wrap: wrap; flex-shrink: 0; }
  .webhook { overflow: hidden; color: #8e95af; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .item-meta { display: flex; gap: 8px 16px; flex-wrap: wrap; margin-top: 10px; color: #a4aac0; font-size: 12px; line-height: 1.6; }
  .conditions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 5px; background: #252a43; color: #b8bfd7; font-size: 11px; font-weight: 500; }
  .tag-on { background: rgba(52,211,153,.12); color: #6ee7b7; }
  .tag-off { background: rgba(148,163,184,.12); color: #94a3b8; }
  .tag-secret { background: rgba(251,191,36,.1); color: #fbbf24; }
  .inline-toggle { display: inline-flex; align-items: center; gap: 6px; color: #9298b2; font-size: 12px; cursor: pointer; }
  .empty { padding: 34px 16px; border: 1px dashed #303650; border-radius: 9px; color: #737b98; text-align: center; }
  .table-wrap { overflow-x: auto; border: 1px solid #292e49; border-radius: 9px; }
  table { width: 100%; min-width: 820px; border-collapse: collapse; }
  th { padding: 11px 12px; background: #121526; color: #858ca6; font-size: 12px; font-weight: 600; text-align: left; white-space: nowrap; }
  td { padding: 12px; border-top: 1px solid #252a42; color: #c6cbdc; font-size: 13px; vertical-align: top; }
  tbody tr:hover { background: rgba(129,140,248,.035); }
  .log-error { max-width: 300px; color: #fca5a5; line-height: 1.5; word-break: break-word; }
  dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: calc(100% - 32px); max-width: 580px; max-height: 90vh; margin: 0; padding: 0; overflow: auto; border: 1px solid #343a59; border-radius: 12px; background: #171a2e; color: #e5e7eb; box-shadow: 0 24px 80px rgba(0,0,0,.5); }
  dialog::backdrop { background: rgba(3,5,15,.75); }
  .dialog-form { padding: 22px; }
  .dialog-form h2 { margin-bottom: 20px; color: #a5b4fc; font-size: 18px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .field { min-width: 0; }
  .field.span-2 { grid-column: 1 / -1; }
  .field > label, .field-label { display: block; margin-bottom: 6px; color: #a2a8bf; font-size: 12px; }
  .field input[type=text], .field input[type=password], .field input[type=url], .field input[type=number], .field select, .condition-row input, .condition-row select { width: 100%; padding: 9px 11px; border: 1px solid #343a59; border-radius: 7px; background: #0d1020; color: #e5e7eb; }
  .field input[type=checkbox] { width: 17px; height: 17px; accent-color: #818cf8; }
  .check-line { display: flex; align-items: center; gap: 8px; min-height: 38px; cursor: pointer; }
  .help { margin-top: 5px; color: #737b98; font-size: 11px; line-height: 1.5; }
  .choice-grid { display: flex; gap: 8px; flex-wrap: wrap; }
  .choice { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid #303650; border-radius: 7px; background: #121526; color: #c4c9da; font-size: 12px; cursor: pointer; }
  .choice:has(input:checked) { border-color: #818cf8; background: rgba(129,140,248,.1); color: #c7d2fe; }
  .choice input { accent-color: #818cf8; }
  .condition-list { display: grid; gap: 8px; }
  .condition-row { display: grid; grid-template-columns: minmax(0,1fr) 110px auto; gap: 8px; align-items: center; }
  .condition-tools { margin-top: 9px; }
  .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; padding-top: 16px; border-top: 1px solid #292e49; }
  .toast { position: fixed; top: 20px; left: 50%; z-index: 100; display: none; max-width: calc(100% - 32px); padding: 11px 18px; transform: translateX(-50%); border: 1px solid rgba(52,211,153,.45); border-radius: 8px; background: #153b35; color: #6ee7b7; box-shadow: 0 10px 35px rgba(0,0,0,.35); line-height: 1.5; text-align: center; }
  .toast.error { border-color: rgba(248,113,113,.45); background: #421f2a; color: #fca5a5; }
  @media (max-width: 640px) {
    .app { padding: 16px 12px; }
    .page-header { align-items: flex-start; flex-direction: column; }
    .page-header h1 { font-size: 21px; }
    .header-actions { width: 100%; justify-content: flex-start; }
    .card { padding: 15px 13px; }
    .overview { align-items: flex-start; flex-direction: column; }
    .summary { width: 100%; justify-content: space-between; gap: 10px; }
    .section-heading { align-items: flex-start; }
    .item-top { flex-direction: column; }
    .item-actions { width: 100%; }
    .webhook { white-space: normal; word-break: break-all; }
    .form-grid { grid-template-columns: 1fr; }
    .field.span-2 { grid-column: auto; }
    .condition-row { grid-template-columns: minmax(0,1fr) 86px auto; gap: 6px; }
    .dialog-form { padding: 18px 14px; }
    .login-card { padding: 26px 20px; }
  }
</style>
</head>
<body>
  <div class="login-shell" id="login-shell">
    <form class="login-card" id="login-form">
      <h1>推送管理</h1>
      <p class="intro">请输入独立管理密钥。密钥仅保存在当前浏览器会话中。</p>
      <div class="login-error" id="login-error" role="alert"></div>
      <label for="agent-key">管理密钥</label>
      <input type="password" id="agent-key" autocomplete="current-password" required placeholder="请输入管理密钥">
      <button class="btn btn-primary" id="login-btn" type="submit">验证并进入</button>
    </form>
  </div>

  <div class="app hidden" id="app">
    <header class="page-header">
      <div>
        <h1>推送管理</h1>
        <div class="subtitle">独立配置推送机器人、筛选规则并查看推送结果</div>
      </div>
      <div class="header-actions">
        <span class="save-state" id="save-state">配置已同步</span>
        <button class="btn btn-primary" id="save-btn" type="button" data-action="save-config" disabled>保存配置</button>
        <button class="btn" type="button" data-action="logout">退出</button>
      </div>
    </header>

    <main>
      <section class="card overview">
        <label class="master-label">
          <input type="checkbox" id="master-enabled" data-action="toggle-master">
          <span><strong>推送总开关</strong><small>关闭后不会执行自动推送，修改后请保存配置</small></span>
        </label>
        <div class="summary">
          <span>机器人<b id="robot-count">0</b></span>
          <span>规则<b id="rule-count">0</b></span>
          <span>启用规则<b id="enabled-rule-count">0</b></span>
        </div>
      </section>

      <section class="card">
        <div class="section-heading">
          <h2>推送机器人</h2>
          <button class="btn btn-primary btn-sm" type="button" data-action="add-robot">添加机器人</button>
        </div>
        <div class="list" id="robot-list"></div>
      </section>

      <section class="card">
        <div class="section-heading">
          <h2>推送规则</h2>
          <button class="btn btn-primary btn-sm" type="button" data-action="add-rule">添加规则</button>
        </div>
        <div class="list" id="rule-list"></div>
      </section>

      <section class="card">
        <div class="section-heading">
          <h2>最近推送日志</h2>
          <div class="heading-side">
            <span class="muted small" id="logs-updated"></span>
            <button class="btn btn-sm" id="refresh-logs-btn" type="button" data-action="refresh-logs">刷新日志</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>批次时间</th><th>收到</th><th>命中</th><th>成功</th><th>重复</th><th>失败</th><th>简要错误</th></tr></thead>
            <tbody id="log-list"><tr><td colspan="7" class="muted">正在加载...</td></tr></tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <dialog id="robot-dialog">
    <form class="dialog-form" id="robot-form">
      <h2 id="robot-dialog-title">添加机器人</h2>
      <input type="hidden" id="robot-id">
      <div class="form-grid">
        <div class="field span-2">
          <label for="robot-remark">备注</label>
          <input type="text" id="robot-remark" required maxlength="80" placeholder="例如：低价账号通知群">
        </div>
        <div class="field span-2">
          <label for="robot-webhook">完整 Webhook</label>
          <input type="url" id="robot-webhook" required placeholder="https://...">
          <div class="help">请填写完整机器人 Webhook 地址。</div>
        </div>
        <div class="field span-2">
          <label for="robot-secret">加签密钥（可选）</label>
          <input type="password" id="robot-secret" autocomplete="off" placeholder="未启用加签时留空">
        </div>
        <div class="field span-2">
          <label for="robot-valid-hours">有效小时数（留空表示永久）</label>
          <input type="number" id="robot-valid-hours" min="1" max="87600" step="1" placeholder="例如：3 = 3小时，168 = 7天">
          <div class="help">到期后自动停用；编辑时填写会从当前时间重新计时。</div>
        </div>
        <div class="field span-2">
          <label class="check-line"><input type="checkbox" id="robot-enabled" checked>启用此机器人</label>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn" type="button" data-action="close-robot">取消</button>
        <button class="btn btn-primary" type="submit">确定</button>
      </div>
    </form>
  </dialog>

  <dialog id="rule-dialog">
    <form class="dialog-form" id="rule-form">
      <h2 id="rule-dialog-title">添加规则</h2>
      <input type="hidden" id="rule-id">
      <div class="form-grid">
        <div class="field span-2">
          <label for="rule-name">规则名</label>
          <input type="text" id="rule-name" required maxlength="80" placeholder="例如：高命座低价账号">
        </div>
        <div class="field span-2">
          <span class="field-label">角色条件（均需满足）</span>
          <div class="condition-list" id="condition-list"></div>
          <div class="condition-tools"><button class="btn btn-sm" type="button" data-action="add-condition">添加角色条件</button></div>
        </div>
        <div class="field">
          <label for="rule-min-diff">最低差价（元，留空不限）</label>
          <input type="number" id="rule-min-diff" min="0" step="0.01" placeholder="留空不限">
        </div>
        <div class="field"></div>
        <div class="field">
          <label for="rule-min-price">标价下限（元）</label>
          <input type="number" id="rule-min-price" min="0" step="0.01" placeholder="留空不限">
        </div>
        <div class="field">
          <label for="rule-max-price">标价上限（元）</label>
          <input type="number" id="rule-max-price" min="0" step="0.01" placeholder="留空不限">
        </div>
        <div class="field span-2">
          <span class="field-label">平台（不选择表示全部平台）</span>
          <div class="choice-grid" id="platform-choices">
            <label class="choice"><input type="checkbox" value="pxb7">螃蟹网</label>
            <label class="choice"><input type="checkbox" value="pzds">盼之</label>
            <label class="choice"><input type="checkbox" value="kjs">氪金兽</label>
            <label class="choice"><input type="checkbox" value="qy">7881</label>
            <label class="choice"><input type="checkbox" value="ysy">易手游</label>
          </div>
        </div>
        <div class="field span-2">
          <span class="field-label">目标机器人（至少选择一个）</span>
          <div class="choice-grid" id="rule-robot-choices"></div>
        </div>
        <div class="field span-2">
          <label class="check-line"><input type="checkbox" id="rule-enabled" checked>启用此规则</label>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn" type="button" data-action="close-rule">取消</button>
        <button class="btn btn-primary" type="submit">确定</button>
      </div>
    </form>
  </dialog>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
(function () {
  'use strict';

  const STORAGE_KEY = 'agent_push_key';
  const CHARACTER_GROUPS = ${JSON.stringify(characterGroups || {}).replace(/</g, '\\u003c')};
  const PLATFORMS = { pxb7: '螃蟹网', pzds: '盼之', kjs: '氪金兽', 'qy': '7881', ysy: '易手游' };
  const $ = function (id) { return document.getElementById(id); };
  let agentKey = '';
  let state = { enabled: false, robots: [], rules: [] };
  let logs = [];
  let dirty = false;
  let saving = false;
  let loginPending = false;
  let logsLoading = false;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return prefix + '_' + window.crypto.randomUUID();
    }
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '-');
    const pad = function (number) { return String(number).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function toast(message, isError) {
    const el = $('toast');
    el.textContent = message;
    el.classList.toggle('error', Boolean(isError));
    el.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.style.display = 'none'; }, 3500);
  }

  async function api(path, options) {
    const opts = options || {};
    const headers = { 'x-agent-key': opts.key == null ? agentKey : opts.key };
    const init = { method: opts.method || 'GET', headers: headers };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    const response = await fetch(path, init);
    const result = await response.json().catch(function () { return null; });
    if (!response.ok || !result || result.success !== true) {
      const error = new Error(result && result.error ? result.error : '请求失败（HTTP ' + response.status + '）');
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function nullableNumber(value) {
    if (value === '' || value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeConfig(config) {
    const source = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
    const robots = Array.isArray(source.robots) ? source.robots : [];
    const rules = Array.isArray(source.rules) ? source.rules : [];
    return Object.assign({}, source, {
      enabled: source.enabled === true,
      robots: robots.map(function (robot) {
        return Object.assign({}, robot, {
          id: String(robot.id || createId('robot')),
          remark: String(robot.remark || robot.name || ''),
          webhook: String(robot.webhook || ''),
          secret: String(robot.secret || ''),
          enabled: robot.enabled !== false,
          expiresAt: robot.expiresAt ? String(robot.expiresAt) : null
        });
      }),
      rules: rules.map(function (rule) {
        return Object.assign({}, rule, {
          id: String(rule.id || createId('rule')),
          name: String(rule.name || ''),
          conditions: (Array.isArray(rule.conditions) ? rule.conditions : (Array.isArray(rule.chars) ? rule.chars : [])).map(function (condition) {
            return {
              name: String(condition.name || ''),
              minConstellation: Math.max(0, Math.min(6, Number(condition.minConstellation != null ? condition.minConstellation : condition.minConst) || 0))
            };
          }),
          minPriceDiff: nullableNumber(rule.minPriceDiff != null ? rule.minPriceDiff : rule.minDiff),
          minListPrice: nullableNumber(rule.minListPrice != null ? rule.minListPrice : rule.priceMin),
          maxListPrice: nullableNumber(rule.maxListPrice != null ? rule.maxListPrice : rule.priceMax),
          platforms: Array.isArray(rule.platforms) ? rule.platforms.map(String) : [],
          robotIds: Array.isArray(rule.robotIds) ? rule.robotIds.map(String) : [],
          enabled: rule.enabled !== false
        });
      })
    });
  }

  function updateSaveState() {
    const button = $('save-btn');
    const label = $('save-state');
    button.disabled = saving || !dirty;
    button.textContent = saving ? '保存中...' : '保存配置';
    label.textContent = saving ? '正在保存' : (dirty ? '有未保存的更改' : '配置已同步');
    label.classList.toggle('dirty', dirty && !saving);
  }

  function markDirty() {
    dirty = true;
    updateSaveState();
  }

  function renderSummary() {
    $('master-enabled').checked = state.enabled;
    $('robot-count').textContent = state.robots.length;
    $('rule-count').textContent = state.rules.length;
    $('enabled-rule-count').textContent = state.rules.filter(function (rule) { return rule.enabled; }).length;
  }

  function renderRobots() {
    const list = $('robot-list');
    if (!state.robots.length) {
      list.innerHTML = '<div class="empty">暂无机器人，请先添加机器人</div>';
      return;
    }
    list.innerHTML = state.robots.map(function (robot) {
      const id = escapeHtml(robot.id);
      const expired = robot.expiresAt && Date.parse(robot.expiresAt) <= Date.now();
      const statusText = expired ? '已过期' : (robot.enabled ? '已启用' : '已停用');
      const statusClass = robot.enabled && !expired ? 'tag-on' : 'tag-off';
      return '<article class="list-item">' +
        '<div class="item-top"><div class="item-main">' +
          '<div class="item-title">' + escapeHtml(robot.remark || '未命名机器人') +
            '<span class="tag ' + statusClass + '">' + statusText + '</span>' +
            (robot.secret ? '<span class="tag tag-secret">已加签</span>' : '') + '</div>' +
          '<div class="webhook" title="' + escapeHtml(robot.webhook) + '">' + escapeHtml(robot.webhook) + '</div>' +
          '<div class="item-meta">' +
            (robot.expiresAt ? '<span>有效期至：' + escapeHtml(formatDateTime(robot.expiresAt)) + '</span>' : '<span>有效期：永久</span>') +
          '</div>' +
        '</div><div class="item-actions">' +
          '<label class="inline-toggle"><input type="checkbox" data-action="toggle-robot" data-id="' + id + '"' +
            (robot.enabled && !expired ? ' checked' : '') + (expired ? ' disabled' : '') + '>启用</label>' +
          '<button class="btn btn-sm" type="button" data-action="test-robot" data-id="' + id + '">测试</button>' +
          '<button class="btn btn-sm" type="button" data-action="edit-robot" data-id="' + id + '">编辑</button>' +
          '<button class="btn btn-danger btn-sm" type="button" data-action="delete-robot" data-id="' + id + '">删除</button>' +
        '</div></div></article>';
    }).join('');
  }

  function formatMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '0';
  }

  function formatPriceRange(rule) {
    const min = rule.minListPrice == null ? '不限' : '¥' + formatMoney(rule.minListPrice);
    const max = rule.maxListPrice == null ? '不限' : '¥' + formatMoney(rule.maxListPrice);
    return min + ' ~ ' + max;
  }

  function renderRules() {
    const list = $('rule-list');
    if (!state.rules.length) {
      list.innerHTML = '<div class="empty">暂无规则，请添加角色与价格筛选条件</div>';
      return;
    }
    list.innerHTML = state.rules.map(function (rule) {
      const id = escapeHtml(rule.id);
      const conditions = rule.conditions.length ? rule.conditions.map(function (condition) {
        return '<span class="tag">' + escapeHtml(condition.name) + ' ≥ ' + escapeHtml(condition.minConstellation) + ' 命</span>';
      }).join('') : '<span class="muted small">未设置角色条件</span>';
      const platforms = rule.platforms.length ? rule.platforms.map(function (code) {
        return escapeHtml(PLATFORMS[code] || code);
      }).join('、') : '全部平台';
      const robotNames = rule.robotIds.map(function (robotId) {
        const robot = state.robots.find(function (item) { return String(item.id) === String(robotId); });
        return robot ? (robot.remark || '未命名机器人') : '未知机器人';
      });
      return '<article class="list-item">' +
        '<div class="item-top"><div class="item-main">' +
          '<div class="item-title">' + escapeHtml(rule.name || '未命名规则') +
            '<span class="tag ' + (rule.enabled ? 'tag-on' : 'tag-off') + '">' + (rule.enabled ? '已启用' : '已停用') + '</span></div>' +
          '<div class="conditions">' + conditions + '</div>' +
          '<div class="item-meta"><span>最低差价：' + (rule.minPriceDiff == null ? '不限' : '¥' + formatMoney(rule.minPriceDiff)) + '</span>' +
            '<span>标价：' + escapeHtml(formatPriceRange(rule)) + '</span><span>平台：' + platforms + '</span>' +
            '<span>目标：' + escapeHtml(robotNames.length ? robotNames.join('、') : '未选择') + '</span></div>' +
        '</div><div class="item-actions">' +
          '<label class="inline-toggle"><input type="checkbox" data-action="toggle-rule" data-id="' + id + '"' + (rule.enabled ? ' checked' : '') + '>启用</label>' +
          '<button class="btn btn-sm" type="button" data-action="edit-rule" data-id="' + id + '">编辑</button>' +
          '<button class="btn btn-danger btn-sm" type="button" data-action="delete-rule" data-id="' + id + '">删除</button>' +
        '</div></div></article>';
    }).join('');
  }

  function renderAll() {
    renderSummary();
    renderRobots();
    renderRules();
  }

  async function login(key, automatic) {
    if (loginPending || !key) return;
    loginPending = true;
    $('login-btn').disabled = true;
    $('login-btn').textContent = '验证中...';
    $('login-error').style.display = 'none';
    try {
      const result = await api('/agent-push/api/config', { key: key });
      agentKey = key;
      sessionStorage.setItem(STORAGE_KEY, key);
      state = normalizeConfig(result.config);
      logs = [];
      dirty = false;
      $('login-shell').classList.add('hidden');
      $('app').classList.remove('hidden');
      renderAll();
      updateSaveState();
      loadLogs();
    } catch (error) {
      sessionStorage.removeItem(STORAGE_KEY);
      const message = automatic ? '保存的密钥验证失败，请重新输入。' : (error.message || '密钥验证失败，请重试。');
      $('login-error').textContent = message;
      $('login-error').style.display = 'block';
      $('agent-key').focus();
    } finally {
      loginPending = false;
      $('login-btn').disabled = false;
      $('login-btn').textContent = '验证并进入';
    }
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    agentKey = '';
    state = { enabled: false, robots: [], rules: [] };
    logs = [];
    dirty = false;
    document.querySelectorAll('dialog[open]').forEach(function (dialog) { dialog.close(); });
    $('app').classList.add('hidden');
    $('login-shell').classList.remove('hidden');
    $('agent-key').value = '';
    $('login-error').style.display = 'none';
    $('toast').style.display = 'none';
    $('agent-key').focus();
  }

  function toServerConfig() {
    return {
      enabled: state.enabled,
      robots: state.robots.map(function (robot) {
        return {
          id: robot.id,
          name: robot.remark,
          webhook: robot.webhook,
          secret: robot.secret,
          enabled: robot.enabled,
          expiresAt: robot.expiresAt
        };
      }),
      rules: state.rules.map(function (rule) {
        return {
          id: rule.id,
          name: rule.name,
          chars: rule.conditions.map(function (condition) {
            return { name: condition.name, minConst: condition.minConstellation };
          }),
          minDiff: rule.minPriceDiff == null ? 0 : rule.minPriceDiff,
          priceMin: rule.minListPrice == null ? 0 : rule.minListPrice,
          priceMax: rule.maxListPrice == null ? 0 : rule.maxListPrice,
          platforms: rule.platforms,
          robotIds: rule.robotIds,
          enabled: rule.enabled
        };
      })
    };
  }

  async function saveConfig() {
    if (saving) return false;
    saving = true;
    updateSaveState();
    try {
      const result = await api('/agent-push/api/config', { method: 'PUT', body: { config: toServerConfig() } });
      state = normalizeConfig(result.config);
      dirty = false;
      toast('配置已保存到服务端');
      return true;
    } catch (error) {
      toast(error.message || '保存失败，请稍后重试', true);
      return false;
    } finally {
      saving = false;
      updateSaveState();
    }
  }

  function findRobot(id) {
    return state.robots.find(function (robot) { return String(robot.id) === String(id); });
  }

  function findRule(id) {
    return state.rules.find(function (rule) { return String(rule.id) === String(id); });
  }

  function openRobotDialog(robot) {
    $('robot-form').reset();
    $('robot-id').value = robot ? robot.id : '';
    $('robot-dialog-title').textContent = robot ? '编辑机器人' : '添加机器人';
    $('robot-remark').value = robot ? robot.remark : '';
    $('robot-webhook').value = robot ? robot.webhook : '';
    $('robot-secret').value = robot ? robot.secret : '';
    $('robot-enabled').checked = robot ? robot.enabled : true;
    const remainingHours = robot && robot.expiresAt ?
      Math.max(1, Math.ceil((Date.parse(robot.expiresAt) - Date.now()) / 3600000)) : null;
    $('robot-valid-hours').value = remainingHours == null ? '' : String(remainingHours);
    $('robot-dialog').showModal();
  }

  function fillCharacterSelect(select, selectedName) {
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '请选择角色';
    select.appendChild(placeholder);
    const known = new Set();
    Object.keys(CHARACTER_GROUPS).forEach(function (groupKey) {
      const characters = Array.isArray(CHARACTER_GROUPS[groupKey]) ? CHARACTER_GROUPS[groupKey] : [];
      if (!characters.length) return;
      const group = document.createElement('optgroup');
      group.label = groupKey === 'zzz' ? '绝区零' : '鸣潮';
      characters.forEach(function (name) {
        known.add(String(name));
        const option = document.createElement('option');
        option.value = String(name);
        option.textContent = String(name);
        group.appendChild(option);
      });
      select.appendChild(group);
    });
    const selected = String(selectedName || '');
    if (selected && !known.has(selected)) {
      const option = document.createElement('option');
      option.value = selected;
      option.textContent = selected + '（当前配置角色）';
      select.appendChild(option);
    }
    select.value = selected || '';
  }

  function addConditionRow(condition) {
    const row = document.createElement('div');
    row.className = 'condition-row';
    const name = document.createElement('select');
    name.className = 'condition-name';
    name.required = true;
    name.setAttribute('aria-label', '角色名');
    fillCharacterSelect(name, condition ? condition.name : '');
    const level = document.createElement('select');
    level.className = 'condition-level';
    level.setAttribute('aria-label', '最低命座');
    for (let index = 0; index <= 6; index += 1) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = index + ' 命';
      level.appendChild(option);
    }
    level.value = String(condition ? condition.minConstellation : 0);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger btn-sm';
    remove.dataset.action = 'remove-condition';
    remove.textContent = '删除';
    row.append(name, level, remove);
    $('condition-list').appendChild(row);
  }

  function renderRuleRobotChoices(selectedIds) {
    const container = $('rule-robot-choices');
    container.replaceChildren();
    state.robots.forEach(function (robot) {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = robot.id;
      input.checked = selectedIds.some(function (id) { return String(id) === String(robot.id); });
      const text = document.createElement('span');
      text.textContent = robot.remark || '未命名机器人';
      label.append(input, text);
      container.appendChild(label);
    });
  }

  function openRuleDialog(rule) {
    if (!state.robots.length) {
      toast('请先添加至少一个机器人', true);
      return;
    }
    $('rule-form').reset();
    $('rule-id').value = rule ? rule.id : '';
    $('rule-dialog-title').textContent = rule ? '编辑规则' : '添加规则';
    $('rule-name').value = rule ? rule.name : '';
    $('rule-min-diff').value = rule && rule.minPriceDiff != null ? rule.minPriceDiff : '';
    $('rule-min-price').value = rule && rule.minListPrice != null ? rule.minListPrice : '';
    $('rule-max-price').value = rule && rule.maxListPrice != null ? rule.maxListPrice : '';
    $('rule-enabled').checked = rule ? rule.enabled : true;
    const selectedPlatforms = rule ? rule.platforms : [];
    $('platform-choices').querySelectorAll('input[type=checkbox]').forEach(function (input) {
      input.checked = selectedPlatforms.indexOf(input.value) !== -1;
    });
    $('condition-list').replaceChildren();
    const conditions = rule && rule.conditions.length ? rule.conditions : [{ name: '', minConstellation: 0 }];
    conditions.forEach(addConditionRow);
    renderRuleRobotChoices(rule ? rule.robotIds : []);
    $('rule-dialog').showModal();
  }

  async function testRobot(id, button) {
    const robot = findRobot(id);
    if (!robot) return;
    if (dirty) {
      if (!window.confirm('测试前需要先保存当前配置，是否保存并继续？')) return;
      const saved = await saveConfig();
      if (!saved) return;
    }
    button.disabled = true;
    try {
      const result = await api('/agent-push/api/test', { method: 'POST', body: { robotId: robot.id } });
      toast(result.message || '测试推送请求已成功提交');
      loadLogs();
    } catch (error) {
      toast(error.message || '测试推送失败', true);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  function deleteRobot(id) {
    const robot = findRobot(id);
    if (!robot) return;
    if (!window.confirm('确定删除机器人“' + (robot.remark || '未命名机器人') + '”吗？相关规则会同步移除该机器人，没有剩余目标的规则也会删除。')) return;
    state.robots = state.robots.filter(function (item) { return String(item.id) !== String(id); });
    state.rules.forEach(function (rule) {
      rule.robotIds = rule.robotIds.filter(function (robotId) { return String(robotId) !== String(id); });
    });
    state.rules = state.rules.filter(function (rule) { return rule.robotIds.length > 0; });
    markDirty();
    renderAll();
  }

  function deleteRule(id) {
    const rule = findRule(id);
    if (!rule || !window.confirm('确定删除规则“' + (rule.name || '未命名规则') + '”吗？')) return;
    state.rules = state.rules.filter(function (item) { return String(item.id) !== String(id); });
    markDirty();
    renderAll();
  }

  function getLogNumber(log, names) {
    const sources = [log, log && log.stats];
    for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
      const source = sources[sourceIndex];
      if (!source || typeof source !== 'object') continue;
      for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
        const value = source[names[nameIndex]];
        if (value !== true && value !== false && value !== '' && value != null && Number.isFinite(Number(value))) {
          return Number(value);
        }
      }
    }
    return 0;
  }

  function formatLogTime(log) {
    const raw = log.time || log.timestamp || log.createdAt || log.batchTime || log.batchAt;
    if (!raw) return '-';
    const timestamp = typeof raw === 'number' && raw < 1000000000000 ? raw * 1000 : raw;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return String(raw);
    const pad = function (number) { return String(number).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
      pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  function summarizeLogError(log) {
    let value = log.errorSummary || log.error || log.errors || log.failures || '';
    if (Array.isArray(value)) {
      value = value.map(function (item) {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.error || item.message || item.reason || JSON.stringify(item);
        return String(item);
      }).filter(Boolean).join('；');
    } else if (value && typeof value === 'object') {
      value = value.error || value.message || JSON.stringify(value);
    }
    return String(value || '—');
  }

  function renderLogs() {
    const list = $('log-list');
    if (!logs.length) {
      list.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:32px;">暂无推送日志</td></tr>';
      return;
    }
    list.innerHTML = logs.map(function (log) {
      const error = summarizeLogError(log);
      const shortError = error.length > 140 ? error.slice(0, 140) + '…' : error;
      return '<tr><td style="white-space:nowrap;">' + escapeHtml(formatLogTime(log)) + '</td>' +
        '<td>' + getLogNumber(log, ['received', 'receivedCount', 'total']) + '</td>' +
        '<td>' + getLogNumber(log, ['matched', 'matchedCount', 'hit', 'hitCount']) + '</td>' +
        '<td>' + getLogNumber(log, ['successCount', 'sent', 'sentCount', 'success']) + '</td>' +
        '<td>' + getLogNumber(log, ['duplicate', 'duplicates', 'duplicateCount', 'duplicated', 'skipped']) + '</td>' +
        '<td>' + getLogNumber(log, ['failed', 'failedCount', 'failure', 'failureCount', 'errorCount']) + '</td>' +
        '<td><div class="log-error" title="' + escapeHtml(error) + '">' + escapeHtml(shortError) + '</div></td></tr>';
    }).join('');
  }

  async function loadLogs() {
    if (logsLoading || !agentKey) return;
    logsLoading = true;
    $('refresh-logs-btn').disabled = true;
    try {
      const result = await api('/agent-push/api/logs');
      logs = Array.isArray(result.logs) ? result.logs : [];
      renderLogs();
      $('logs-updated').textContent = '已更新 ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    } catch (error) {
      $('log-list').innerHTML = '<tr><td colspan="7" class="log-error">日志加载失败：' + escapeHtml(error.message || '未知错误') + '</td></tr>';
      $('logs-updated').textContent = '';
    } finally {
      logsLoading = false;
      $('refresh-logs-btn').disabled = false;
    }
  }

  $('login-form').addEventListener('submit', function (event) {
    event.preventDefault();
    login($('agent-key').value.trim(), false);
  });

  $('robot-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const id = $('robot-id').value;
    const webhook = $('robot-webhook').value.trim();
    let parsedUrl;
    try { parsedUrl = new URL(webhook); } catch (error) { parsedUrl = null; }
    if (!parsedUrl || parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'oapi.dingtalk.com' ||
        parsedUrl.pathname !== '/robot/send' || !parsedUrl.searchParams.get('access_token')) {
      toast('请输入钉钉官方完整机器人 Webhook（含 access_token）', true);
      $('robot-webhook').focus();
      return;
    }
    const validHours = nullableNumber($('robot-valid-hours').value);
    if (validHours != null && (!(validHours > 0) || validHours > 87600)) {
      toast('有效小时数必须是1到87600之间的数字，留空表示永久', true);
      $('robot-valid-hours').focus();
      return;
    }
    const existing = id ? findRobot(id) : null;
    const robot = Object.assign({}, existing || {}, {
      id: existing ? existing.id : createId('robot'),
      remark: $('robot-remark').value.trim(),
      webhook: webhook,
      secret: $('robot-secret').value.trim(),
      enabled: $('robot-enabled').checked,
      expiresAt: validHours == null ? null : new Date(Date.now() + validHours * 3600000).toISOString()
    });
    if (existing) {
      const index = state.robots.indexOf(existing);
      state.robots.splice(index, 1, robot);
    } else {
      state.robots.push(robot);
    }
    $('robot-dialog').close();
    markDirty();
    renderAll();
  });

  $('rule-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const minListPrice = nullableNumber($('rule-min-price').value);
    const maxListPrice = nullableNumber($('rule-max-price').value);
    if (minListPrice != null && maxListPrice != null && maxListPrice < minListPrice) {
      toast('标价上限不能小于标价下限', true);
      $('rule-max-price').focus();
      return;
    }
    const conditions = Array.from($('condition-list').children).map(function (row) {
      return {
        name: row.querySelector('.condition-name').value.trim(),
        minConstellation: Number(row.querySelector('.condition-level').value)
      };
    });
    if (!conditions.length || conditions.some(function (condition) { return !condition.name; })) {
      toast('请填写至少一个完整的角色条件', true);
      return;
    }
    const platforms = Array.from($('platform-choices').querySelectorAll('input:checked')).map(function (input) { return input.value; });
    const robotIds = Array.from($('rule-robot-choices').querySelectorAll('input:checked')).map(function (input) { return input.value; });
    if (!robotIds.length) {
      toast('请至少选择一个目标机器人', true);
      return;
    }
    const id = $('rule-id').value;
    const existing = id ? findRule(id) : null;
    const rule = Object.assign({}, existing || {}, {
      id: existing ? existing.id : createId('rule'),
      name: $('rule-name').value.trim(),
      conditions: conditions,
      minPriceDiff: nullableNumber($('rule-min-diff').value),
      minListPrice: minListPrice,
      maxListPrice: maxListPrice,
      platforms: platforms,
      robotIds: robotIds,
      enabled: $('rule-enabled').checked
    });
    if (existing) {
      const index = state.rules.indexOf(existing);
      state.rules.splice(index, 1, rule);
    } else {
      state.rules.push(rule);
    }
    $('rule-dialog').close();
    markDirty();
    renderAll();
  });

  document.addEventListener('click', async function (event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'logout') logout();
    else if (action === 'save-config') saveConfig();
    else if (action === 'refresh-logs') loadLogs();
    else if (action === 'add-robot') openRobotDialog();
    else if (action === 'edit-robot') openRobotDialog(findRobot(id));
    else if (action === 'delete-robot') deleteRobot(id);
    else if (action === 'test-robot') await testRobot(id, button);
    else if (action === 'add-rule') openRuleDialog();
    else if (action === 'edit-rule') openRuleDialog(findRule(id));
    else if (action === 'delete-rule') deleteRule(id);
    else if (action === 'close-robot') $('robot-dialog').close();
    else if (action === 'close-rule') $('rule-dialog').close();
    else if (action === 'add-condition') addConditionRow();
    else if (action === 'remove-condition') {
      if ($('condition-list').children.length <= 1) {
        toast('至少保留一个角色条件', true);
      } else {
        button.closest('.condition-row').remove();
      }
    }
  });

  document.addEventListener('change', function (event) {
    const input = event.target;
    const action = input.dataset.action;
    if (action === 'toggle-master') {
      state.enabled = input.checked;
      markDirty();
      renderSummary();
    } else if (action === 'toggle-robot') {
      const robot = findRobot(input.dataset.id);
      if (!robot) return;
      robot.enabled = input.checked;
      markDirty();
      renderRobots();
    } else if (action === 'toggle-rule') {
      const rule = findRule(input.dataset.id);
      if (!rule) return;
      rule.enabled = input.checked;
      markDirty();
      renderSummary();
      renderRules();
    }
  });

  ['robot-dialog', 'rule-dialog'].forEach(function (id) {
    $(id).addEventListener('click', function (event) {
      if (event.target === this) this.close();
    });
  });

  window.addEventListener('beforeunload', function (event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  const savedKey = sessionStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    $('agent-key').value = savedKey;
    login(savedKey, true);
  }
})();
</script>
</body>
</html>`;
}

module.exports = getAgentPushPage;
