/**
 * server.js - 鸣潮估价助手 监控服务器
 * Express 服务器，提供 Web 仪表板和 API 接口
 * 启动后定时执行监控任务，自动发现高性价比账号
 */

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const monitor = require('./monitor');
const notify = require('./notify');
const valueEngine = require('./value-engine');
const browserScan = require('./browser-scan');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// 初始化配置
const config = monitor.loadConfig();

// ============================================================
// 定时监控
// ============================================================
let monitorTimer = null;

function startMonitorTimer() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
  }
  const interval = config.scanInterval || 300000; // 默认5分钟
  console.log(`[Server] Monitor timer started, interval: ${interval / 1000}s`);
  monitorTimer = setInterval(async () => {
    console.log('[Server] Timer triggered, starting scan...');
    await monitor.scanAccounts();
  }, interval);
}

function restartMonitorTimer() {
  startMonitorTimer();
}

// ============================================================
// API 路由
// ============================================================

/**
 * 状态接口
 */
app.get('/api/status', (req, res) => {
  const status = monitor.getStatus();
  res.json({
    success: true,
    data: {
      ...status,
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

/**
 * 配置接口 - GET
 */
app.get('/api/config', (req, res) => {
  const currentConfig = monitor.getConfig();
  // 返回配置，但隐藏敏感信息（只显示是否已设置）
  res.json({
    success: true,
    data: {
      ...currentConfig,
      envConfigured: {
        serverchan: !!process.env.SERVERCHAN_KEY,
        bark: !!process.env.BARK_KEY,
        dingtalk: !!process.env.DINGTALK_WEBHOOK,
      },
    },
  });
});

/**
 * 配置接口 - POST（在线修改配置）
 */
app.post('/api/config', (req, res) => {
  const newConfig = req.body;

  // 只允许修改这些字段
  const allowedFields = ['gameId', 'scanPages', 'pageSize', 'threshold', 'scanInterval', 'maxConcurrent', 'batchDelay'];
  const updates = {};
  for (const field of allowedFields) {
    if (newConfig[field] !== undefined) {
      updates[field] = newConfig[field];
    }
  }

  // 类型转换
  if (updates.scanPages !== undefined) updates.scanPages = parseInt(updates.scanPages, 10);
  if (updates.pageSize !== undefined) updates.pageSize = parseInt(updates.pageSize, 10);
  if (updates.threshold !== undefined) updates.threshold = parseFloat(updates.threshold);
  if (updates.scanInterval !== undefined) updates.scanInterval = parseInt(updates.scanInterval, 10);
  if (updates.maxConcurrent !== undefined) updates.maxConcurrent = parseInt(updates.maxConcurrent, 10);
  if (updates.batchDelay !== undefined) updates.batchDelay = parseInt(updates.batchDelay, 10);

  const savedConfig = monitor.saveConfig(updates);

  // 如果扫描间隔改变了，重启定时器
  if (updates.scanInterval !== undefined) {
    restartMonitorTimer();
  }

  res.json({
    success: true,
    data: savedConfig,
    message: 'Configuration updated successfully',
  });
});

/**
 * 手动触发扫描
 */
app.post('/api/scan', async (req, res) => {
  const result = monitor.triggerScan();
  res.json(result);
});

/**
 * 获取高性价比账号列表
 */
app.get('/api/hot-accounts', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const accounts = monitor.getHotAccounts(limit);
  res.json({
    success: true,
    data: accounts,
    count: accounts.length,
  });
});

/**
 * 获取通知记录
 */
app.get('/api/notifications', (req, res) => {
  const logs = notify.getNotificationLog();
  res.json({
    success: true,
    data: logs,
    count: logs.length,
  });
});

/**
 * 重置数据
 */
app.post('/api/reset', (req, res) => {
  const result = monitor.resetData();
  res.json(result);
});

/**
 * 估值测试接口 - 输入文本返回估值
 */
app.post('/api/evaluate', (req, res) => {
  const { showTitle, priceInCents } = req.body;
  if (!showTitle) {
    return res.status(400).json({ success: false, error: 'showTitle is required' });
  }
  const result = valueEngine.evaluateWithPrice(showTitle, priceInCents || 0);
  res.json({
    success: true,
    data: {
      estimatedValue: result.details.finalValue,
      priceInYuan: result.priceInYuan,
      costPerformance: result.costPerformance,
      details: result.details,
      info: {
        starSounds: result.info.starSounds,
        moonPhases: result.info.moonPhases,
        coral: result.info.coral,
        goldenRipples: result.info.goldenRipples,
        tideRipples: result.info.tideRipples,
        outfits: result.info.outfits,
        motorcycles: result.info.motorcycles,
        yellowCount: result.info.yellowCount,
      },
      shortDescription: valueEngine.generateShortDescription(result),
    },
  });
});

/**
 * 数据上报接口 - 接收油猴脚本从浏览器发送的账号数据
 * 油猴脚本在浏览器中通过 API 获取账号列表后，将数据上报到此接口
 * 服务器使用估值引擎计算性价比，发现高性价比账号时通知
 */
app.post('/api/ingest', async (req, res) => {
  const { accounts, source } = req.body;
  if (!accounts || !Array.isArray(accounts)) {
    return res.status(400).json({ success: false, error: 'accounts array is required' });
  }

  const threshold = config.threshold || 30;
  const seenAccounts = browserScan.loadSeenAccounts();
  const seenSet = new Set(seenAccounts.map(a => a.productId));
  const hotAccounts = browserScan.loadHotAccounts();

  const results = {
    totalReceived: accounts.length,
    newAccounts: 0,
    hotFound: 0,
    hotAccounts: [],
  };

  for (const acc of accounts) {
    if (!acc.productId || !acc.title) continue;
    if (seenSet.has(String(acc.productId))) continue;

    results.newAccounts++;
    seenSet.add(String(acc.productId));

    // 估值计算
    const priceInCents = (acc.price || 0) * 100;
    const evalResult = valueEngine.evaluateWithPrice(acc.title, priceInCents);

    if (evalResult.costPerformance >= threshold && evalResult.details.finalValue > 0) {
      results.hotFound++;
      const hotAccount = {
        productId: String(acc.productId),
        title: acc.title,
        price: acc.price || 0,
        value: Math.round(evalResult.details.finalValue),
        ratio: Math.round(evalResult.costPerformance * 100) / 100,
        url: acc.url || `https://www.pxb7.com/buy/10302/detail?productId=${acc.productId}`,
        foundAt: new Date().toISOString(),
        source: source || 'userscript',
      };
      results.hotAccounts.push(hotAccount);
      hotAccounts.unshift(hotAccount);
    }
  }

  // 保存数据
  const newSeen = accounts
    .filter(a => a.productId)
    .map(a => ({ productId: String(a.productId), seenAt: new Date().toISOString() }));
  browserScan.saveSeenAccounts([...seenAccounts, ...newSeen].slice(-5000));
  browserScan.saveHotAccounts(hotAccounts.slice(0, 500));

  // 发送通知
  if (results.hotAccounts.length > 0) {
    const notifMsg = notify.formatNotification(results.hotAccounts);
    notify.sendNotification(
      `🎯 发现 ${results.hotAccounts.length} 个高性价比账号！`,
      notifMsg
    );
    console.log(`[Ingest] 发现 ${results.hotAccounts.length} 个高性价比账号！`);
  }

  console.log(`[Ingest] 收到 ${accounts.length} 个账号，新 ${results.newAccounts} 个，高性价比 ${results.hotFound} 个`);

  res.json({
    success: true,
    data: results,
  });
});

// ============================================================
// Web 仪表板
// ============================================================
app.get('/', (req, res) => {
  res.send(getDashboardHTML());
});

// ============================================================
// 仪表板 HTML
// ============================================================
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>鸣潮估价助手 - 监控仪表板</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a1a;
      color: #e0e0e0;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #12122a 0%, #1a1a3a 100%);
      border-radius: 12px;
      border: 1px solid #2a2a4a;
    }
    .header h1 {
      font-size: 24px;
      color: #e94560;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header h1 .icon { font-size: 28px; }
    .header .version { color: #666; font-size: 12px; }

    /* Status Bar */
    .status-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #12122a;
      border: 1px solid #2a2a4a;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(233, 69, 96, 0.15);
    }
    .stat-card .label { color: #888; font-size: 13px; margin-bottom: 8px; }
    .stat-card .value { font-size: 28px; font-weight: bold; }
    .stat-card .value.green { color: #4ade80; }
    .stat-card .value.red { color: #e94560; }
    .stat-card .value.blue { color: #60a5fa; }
    .stat-card .value.yellow { color: #fbbf24; }
    .stat-card .sub { color: #666; font-size: 12px; margin-top: 4px; }

    /* Panel */
    .panel {
      background: #12122a;
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    .panel-header {
      padding: 16px 24px;
      border-bottom: 1px solid #2a2a4a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-header h2 {
      font-size: 16px;
      color: #e94560;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panel-body { padding: 20px 24px; }

    /* Buttons */
    .btn {
      background: #e94560;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn:hover { background: #d63d57; transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn.secondary { background: #2a2a4a; color: #aaa; }
    .btn.secondary:hover { background: #3a3a5a; }
    .btn.danger { background: #dc2626; }
    .btn.danger:hover { background: #b91c1c; }
    .btn.small { padding: 4px 12px; font-size: 12px; }

    /* Config Form */
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { color: #888; font-size: 13px; }
    .form-group input, .form-group select {
      background: #0a0a1a;
      border: 1px solid #2a2a4a;
      color: #e0e0e0;
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus { border-color: #e94560; }
    .form-group .hint { color: #666; font-size: 11px; }
    .form-group .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
    }
    .badge.on { background: #166534; color: #4ade80; }
    .badge.off { background: #450a0a; color: #f87171; }

    /* Table */
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #1e1e38;
      font-size: 13px;
    }
    th { color: #888; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    tr:hover { background: #1a1a2e; }
    .cp-high { color: #4ade80; font-weight: bold; }
    .cp-mid { color: #fbbf24; font-weight: bold; }
    .cp-low { color: #f87171; }

    /* Notification Log */
    .notif-item {
      padding: 12px 16px;
      border-bottom: 1px solid #1e1e38;
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-title { font-weight: 600; color: #e0e0e0; font-size: 13px; }
    .notif-time { color: #666; font-size: 11px; white-space: nowrap; }
    .notif-channels { display: flex; gap: 6px; margin-top: 4px; }
    .channel-tag {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    .channel-tag.ok { background: #166534; color: #4ade80; }
    .channel-tag.fail { background: #450a0a; color: #f87171; }
    .channel-tag.none { background: #1e1e38; color: #666; }

    /* Loading */
    .loading { text-align: center; padding: 40px; color: #666; }
    .empty { text-align: center; padding: 40px; color: #555; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #0a0a1a; }
    ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }

    /* Auto-refresh indicator */
    .refresh-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .refresh-indicator.active { background: #4ade80; animation: pulse 2s infinite; }
    .refresh-indicator.idle { background: #555; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Description text */
    .desc-text { color: #aaa; font-size: 12px; line-height: 1.5; }
    .desc-text .char-tag {
      display: inline-block;
      background: #1e1e38;
      padding: 1px 6px;
      border-radius: 3px;
      margin: 1px 2px;
      font-size: 11px;
    }
    .desc-text .char-tag.sig { background: #166534; color: #4ade80; }

    /* Eval Tester */
    .eval-tester textarea {
      width: 100%;
      background: #0a0a1a;
      border: 1px solid #2a2a4a;
      color: #e0e0e0;
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      font-family: monospace;
      resize: vertical;
      min-height: 80px;
      outline: none;
    }
    .eval-tester textarea:focus { border-color: #e94560; }
    .eval-result {
      margin-top: 12px;
      padding: 16px;
      background: #0a0a1a;
      border: 1px solid #2a2a4a;
      border-radius: 6px;
      display: none;
    }
    .eval-result.show { display: block; }
    .eval-result .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #1e1e38;
      font-size: 13px;
    }
    .eval-result .row:last-child { border-bottom: none; }
    .eval-result .row .key { color: #888; }
    .eval-result .row .val { font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1><span class="icon">🌊</span> 鸣潮估价助手 <span class="version">v1.0</span></h1>
      <div>
        <button class="btn" onclick="triggerScan()">手动扫描</button>
        <button class="btn secondary" onclick="loadAll()">刷新数据</button>
      </div>
    </div>

    <!-- Status Cards -->
    <div class="status-bar" id="statusBar">
      <div class="stat-card">
        <div class="label">监控状态</div>
        <div class="value" id="monitorStatus">--</div>
        <div class="sub" id="monitorSub">--</div>
      </div>
      <div class="stat-card">
        <div class="label">已发现账号总数</div>
        <div class="value blue" id="totalScanned">0</div>
        <div class="sub" id="seenSub">--</div>
      </div>
      <div class="stat-card">
        <div class="label">高性价比账号</div>
        <div class="value green" id="totalHot">0</div>
        <div class="sub" id="hotSub">阈值: --%</div>
      </div>
      <div class="stat-card">
        <div class="label">扫描次数</div>
        <div class="value yellow" id="scanCount">0</div>
        <div class="sub" id="lastScan">--</div>
      </div>
    </div>

    <!-- Hot Accounts Table -->
    <div class="panel">
      <div class="panel-header">
        <h2><span class="refresh-indicator idle" id="hotIndicator"></span>高性价比账号列表</h2>
        <button class="btn secondary small" onclick="loadHotAccounts()">刷新</button>
      </div>
      <div class="panel-body" style="padding: 0;">
        <div id="hotAccountsContainer">
          <div class="loading">加载中...</div>
        </div>
      </div>
    </div>

    <!-- Config Panel -->
    <div class="panel">
      <div class="panel-header">
        <h2>⚙ 监控配置</h2>
        <button class="btn small" onclick="saveConfig()">保存配置</button>
      </div>
      <div class="panel-body">
        <div class="config-grid">
          <div class="form-group">
            <label>Game ID</label>
            <input type="text" id="cfg-gameId" value="10302">
            <span class="hint">鸣潮=10302</span>
          </div>
          <div class="form-group">
            <label>扫描页数</label>
            <input type="number" id="cfg-scanPages" value="3" min="1" max="10">
            <span class="hint">每次扫描获取的页数</span>
          </div>
          <div class="form-group">
            <label>每页数量</label>
            <input type="number" id="cfg-pageSize" value="20" min="5" max="50">
            <span class="hint">API 每页返回的账号数</span>
          </div>
          <div class="form-group">
            <label>性价比阈值 (%)</label>
            <input type="number" id="cfg-threshold" value="30" min="0" max="500" step="5">
            <span class="hint">超过此值推送通知</span>
          </div>
          <div class="form-group">
            <label>扫描间隔 (毫秒)</label>
            <input type="number" id="cfg-scanInterval" value="300000" min="60000" step="60000">
            <span class="hint">默认 300000=5分钟</span>
          </div>
          <div class="form-group">
            <label>最大并发数</label>
            <input type="number" id="cfg-maxConcurrent" value="2" min="1" max="5">
            <span class="hint">详情 API 并发请求数</span>
          </div>
          <div class="form-group">
            <label>批次间隔 (毫秒)</label>
            <input type="number" id="cfg-batchDelay" value="300" min="0" step="100">
            <span class="hint">批次间等待时间</span>
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #2a2a4a;">
          <h3 style="color: #888; font-size: 14px; margin-bottom: 12px;">通知渠道配置（通过环境变量设置）</h3>
          <div class="config-grid">
            <div class="form-group">
              <label>Server酱 <span class="badge off" id="env-serverchan">未设置</span></label>
              <input type="text" id="env-serverchan-key" placeholder="SERVERCHAN_KEY (sctxxxxx)" style="font-size: 12px;">
              <span class="hint">环境变量 SERVERCHAN_KEY</span>
            </div>
            <div class="form-group">
              <label>Bark <span class="badge off" id="env-bark">未设置</span></label>
              <input type="text" id="env-bark-key" placeholder="BARK_KEY" style="font-size: 12px;">
              <span class="hint">环境变量 BARK_KEY</span>
            </div>
            <div class="form-group">
              <label>钉钉机器人 <span class="badge off" id="env-dingtalk">未设置</span></label>
              <input type="text" id="env-dingtalk-key" placeholder="DINGTALK_WEBHOOK URL" style="font-size: 12px;">
              <span class="hint">环境变量 DINGTALK_WEBHOOK</span>
            </div>
          </div>
          <div style="margin-top: 8px; color: #666; font-size: 12px;">
            注意: 通知渠道的 Key 需要通过环境变量设置后重启服务生效。上方输入框仅供参考显示。
          </div>
        </div>
      </div>
    </div>

    <!-- Evaluation Tester -->
    <div class="panel">
      <div class="panel-header">
        <h2>🔬 估值测试器</h2>
      </div>
      <div class="panel-body eval-tester">
        <div class="form-group" style="margin-bottom: 12px;">
          <label>账号描述文本 (showTitle)</label>
          <textarea id="eval-text" placeholder="例如: 满命爱弥斯+专武 0命守岸人 500星声 200黄数 3件服饰"></textarea>
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label>标价 (元)</label>
          <input type="number" id="eval-price" placeholder="例如: 500" style="max-width: 200px;">
        </div>
        <button class="btn" onclick="testEvaluate()">计算估值</button>
        <div class="eval-result" id="evalResult"></div>
      </div>
    </div>

    <!-- Notification Log -->
    <div class="panel">
      <div class="panel-header">
        <h2>📬 最近推送通知</h2>
        <button class="btn secondary small" onclick="loadNotifications()">刷新</button>
      </div>
      <div class="panel-body" style="padding: 0;" id="notifContainer">
        <div class="loading">加载中...</div>
      </div>
    </div>

    <!-- Data Management -->
    <div class="panel">
      <div class="panel-header">
        <h2>🗃 数据管理</h2>
      </div>
      <div class="panel-body" style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button class="btn danger" onclick="resetData()">清空所有数据</button>
        <span style="color: #666; font-size: 12px; line-height: 36px;">将清空已扫描账号记录和高性价比账号记录</span>
      </div>
    </div>
  </div>

  <script>
    // ============================================================
    // API 调用
    // ============================================================
    async function apiGet(url) {
      const res = await fetch(url);
      return res.json();
    }
    async function apiPost(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      return res.json();
    }

    // ============================================================
    // 加载状态
    // ============================================================
    async function loadStatus() {
      try {
        const result = await apiGet('/api/status');
        if (!result.success) return;
        const d = result.data;

        // 监控状态
        const statusEl = document.getElementById('monitorStatus');
        const subEl = document.getElementById('monitorSub');
        if (d.isScanning) {
          statusEl.textContent = '扫描中...';
          statusEl.className = 'value yellow';
          subEl.textContent = '正在获取账号数据';
        } else {
          statusEl.textContent = '运行中';
          statusEl.className = 'value green';
          subEl.textContent = '等待下次扫描';
        }

        // 统计数据
        document.getElementById('totalScanned').textContent = d.totalScanned;
        document.getElementById('totalHot').textContent = d.totalHot;
        document.getElementById('scanCount').textContent = d.scanCount;

        // 子文本
        document.getElementById('seenSub').textContent = d.lastScanTime ? '上次扫描: ' + formatTime(d.lastScanTime) : '未扫描';
        document.getElementById('hotSub').textContent = '阈值: ' + (d.config.threshold || 30) + '%';
        document.getElementById('lastScan').textContent = d.lastScanTime ? formatTime(d.lastScanTime) : '从未扫描';

        if (d.lastScanError) {
          document.getElementById('lastScan').textContent = '错误: ' + d.lastScanError.substring(0, 40);
        }

        // 加载配置到表单
        loadConfigToForm(d.config);

        // 通知渠道状态
        const envCfg = d.config.envConfigured || {};
        updateChannelBadge('env-serverchan', envCfg.serverchan);
        updateChannelBadge('env-bark', envCfg.bark);
        updateChannelBadge('env-dingtalk', envCfg.dingtalk);

      } catch (err) {
        console.error('Failed to load status:', err);
      }
    }

    function updateChannelBadge(id, configured) {
      const el = document.getElementById(id);
      if (configured) {
        el.textContent = '已配置';
        el.className = 'badge on';
      } else {
        el.textContent = '未设置';
        el.className = 'badge off';
      }
    }

    // ============================================================
    // 加载配置到表单
    // ============================================================
    function loadConfigToForm(cfg) {
      if (!cfg) return;
      const fields = ['gameId', 'scanPages', 'pageSize', 'threshold', 'scanInterval', 'maxConcurrent', 'batchDelay'];
      fields.forEach(f => {
        const el = document.getElementById('cfg-' + f);
        if (el && cfg[f] !== undefined && document.activeElement !== el) {
          el.value = cfg[f];
        }
      });
    }

    // ============================================================
    // 保存配置
    // ============================================================
    async function saveConfig() {
      const config = {
        gameId: document.getElementById('cfg-gameId').value,
        scanPages: parseInt(document.getElementById('cfg-scanPages').value, 10),
        pageSize: parseInt(document.getElementById('cfg-pageSize').value, 10),
        threshold: parseFloat(document.getElementById('cfg-threshold').value),
        scanInterval: parseInt(document.getElementById('cfg-scanInterval').value, 10),
        maxConcurrent: parseInt(document.getElementById('cfg-maxConcurrent').value, 10),
        batchDelay: parseInt(document.getElementById('cfg-batchDelay').value, 10),
      };
      try {
        const result = await apiPost('/api/config', config);
        if (result.success) {
          alert('配置已保存！');
          loadStatus();
        } else {
          alert('保存失败: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('保存失败: ' + err.message);
      }
    }

    // ============================================================
    // 加载高性价比账号
    // ============================================================
    async function loadHotAccounts() {
      try {
        const result = await apiGet('/api/hot-accounts?limit=50');
        const container = document.getElementById('hotAccountsContainer');
        if (!result.success || result.data.length === 0) {
          container.innerHTML = '<div class="empty">暂无高性价比账号</div>';
          return;
        }
        let html = '<table><thead><tr>';
        html += '<th>性价比</th><th>估值</th><th>标价</th><th>角色</th><th>抽数</th><th>时间</th><th>链接</th>';
        html += '</tr></thead><tbody>';
        result.data.forEach(acc => {
          const cpClass = acc.costPerformance >= 100 ? 'cp-high' : (acc.costPerformance >= 50 ? 'cp-mid' : 'cp-low');
          const charTags = (acc.evaluation && acc.evaluation.characters || []).map(c => {
            const cls = c.hasSignatureWeapon ? 'char-tag sig' : 'char-tag';
            const constStr = c.constellation === 6 ? '满' : c.constellation + '命';
            return '<span class="' + cls + '">' + constStr + c.name + (c.hasSignatureWeapon ? '+武' : '') + '</span>';
          }).join('');
          html += '<tr>';
          html += '<td class="' + cpClass + '">' + acc.costPerformance + '%</td>';
          html += '<td style="color:#4ade80;font-weight:600;">' + (acc.estimatedValue || 0) + '元</td>';
          html += '<td style="color:#f87171;">' + (acc.priceInYuan || 0) + '元</td>';
          html += '<td><div class="desc-text">' + (charTags || acc.shortDescription || '-') + '</div></td>';
          html += '<td>' + ((acc.info && acc.info.yellowCount) || 0) + '黄</td>';
          html += '<td style="color:#666;font-size:11px;">' + formatTime(acc.scannedAt) + '</td>';
          html += '<td><a href="' + acc.detailUrl + '" target="_blank" style="color:#60a5fa;font-size:12px;">查看</a></td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
      } catch (err) {
        console.error('Failed to load hot accounts:', err);
      }
    }

    // ============================================================
    // 加载通知记录
    // ============================================================
    async function loadNotifications() {
      try {
        const result = await apiGet('/api/notifications');
        const container = document.getElementById('notifContainer');
        if (!result.success || result.data.length === 0) {
          container.innerHTML = '<div class="empty">暂无通知记录</div>';
          return;
        }
        let html = '';
        result.data.forEach(n => {
          let channelsHtml = '';
          if (n.results && n.results.length > 0) {
            n.results.forEach(r => {
              const cls = r.success ? 'ok' : 'fail';
              channelsHtml += '<span class="channel-tag ' + cls + '">' + (r.channel || '?') + (r.success ? ' OK' : ' FAIL') + '</span>';
            });
          } else {
            channelsHtml = '<span class="channel-tag none">无渠道</span>';
          }
          html += '<div class="notif-item">';
          html += '<div style="flex:1;">';
          html += '<div class="notif-title">' + escapeHtml(n.title) + '</div>';
          html += '<div class="notif-channels">' + channelsHtml + '</div>';
          html += '</div>';
          html += '<div class="notif-time">' + formatTime(n.timestamp) + '</div>';
          html += '</div>';
        });
        container.innerHTML = html;
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }

    // ============================================================
    // 手动触发扫描
    // ============================================================
    async function triggerScan() {
      try {
        const result = await apiPost('/api/scan');
        if (result.success) {
          alert('扫描已触发！');
          setTimeout(() => loadAll(), 3000);
        } else {
          alert(result.message || '触发失败');
        }
      } catch (err) {
        alert('触发失败: ' + err.message);
      }
    }

    // ============================================================
    // 估值测试
    // ============================================================
    async function testEvaluate() {
      const text = document.getElementById('eval-text').value.trim();
      const price = parseFloat(document.getElementById('eval-price').value) || 0;
      if (!text) {
        alert('请输入账号描述文本');
        return;
      }
      try {
        const result = await apiPost('/api/evaluate', {
          showTitle: text,
          priceInCents: price * 100,
        });
        if (!result.success) {
          alert('估值失败: ' + (result.error || ''));
          return;
        }
        const d = result.data;
        const el = document.getElementById('evalResult');
        let html = '';
        html += row('最终估值', d.estimatedValue + ' 元', '#4ade80');
        html += row('标价', d.priceInYuan + ' 元', '#f87171');
        html += row('性价比', d.costPerformance + ' %', d.costPerformance >= 30 ? '#4ade80' : '#fbbf24');
        html += '<div style="border-top:1px solid #2a2a4a;margin:8px 0;"></div>';
        html += row('角色价值', d.details.characterValue + ' 元', '#aaa');
        html += row('满命溢价', d.details.c6Premium + ' 元', '#aaa');
        html += row('配队溢价', d.details.teamPremium + ' 元', '#aaa');
        html += row('抽数价值', d.details.pullValue + ' 元', '#aaa');
        html += row('资源价值', d.details.resourceValue + ' 元', '#aaa');
        html += row('黄数系数', 'x' + d.details.yellowMultiplier, '#aaa');
        html += '<div style="border-top:1px solid #2a2a4a;margin:8px 0;"></div>';
        // 角色明细
        if (d.details.characters && d.details.characters.length > 0) {
          html += '<div style="color:#888;font-size:12px;margin-bottom:4px;">角色明细:</div>';
          d.details.characters.forEach(c => {
            const constStr = c.constellation === 6 ? '满命' : c.constellation + '命';
            const w = c.hasSignatureWeapon ? '+专武' : '';
            html += row(constStr + c.name + w, c.value + ' 元', c.hasSignatureWeapon ? '#4ade80' : '#aaa');
          });
        }
        // 资源
        html += '<div style="border-top:1px solid #2a2a4a;margin:8px 0;"></div>';
        html += row('星声', d.info.starSounds, '#666');
        html += row('月相', d.info.moonPhases, '#666');
        html += row('余波珊瑚', d.info.coral, '#666');
        html += row('黄数', d.info.yellowCount, '#666');
        html += row('服饰', d.info.outfits + ' 件', '#666');
        el.innerHTML = html;
        el.classList.add('show');
      } catch (err) {
        alert('估值失败: ' + err.message);
      }
    }

    function row(key, val, color) {
      return '<div class="row"><span class="key">' + key + '</span><span class="val" style="color:' + (color || '#e0e0e0') + ';">' + val + '</span></div>';
    }

    // ============================================================
    // 重置数据
    // ============================================================
    async function resetData() {
      if (!confirm('确定要清空所有数据吗？此操作不可撤销。')) return;
      try {
        const result = await apiPost('/api/reset');
        if (result.success) {
          alert('数据已清空');
          loadAll();
        }
      } catch (err) {
        alert('操作失败: ' + err.message);
      }
    }

    // ============================================================
    // 工具函数
    // ============================================================
    function formatTime(iso) {
      if (!iso) return '--';
      const d = new Date(iso);
      const pad = n => String(n).padStart(2, '0');
      return pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }

    function loadAll() {
      loadStatus();
      loadHotAccounts();
      loadNotifications();
    }

    // ============================================================
    // 初始化
    // ============================================================
    loadAll();
    // 每 10 秒刷新状态
    setInterval(loadStatus, 10000);
    // 每 30 秒刷新高性价比列表
    setInterval(loadHotAccounts, 30000);
  </script>

  <!-- QQ群 & 合规声明 -->
  <style>
    .footer-section {
      max-width: 1200px;
      margin: 0 auto 40px;
    }
    .qq-group-card {
      background: linear-gradient(135deg, #12122a 0%, #1a1a3a 100%);
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 16px;
    }
    .qq-group-card .qr-wrapper {
      flex-shrink: 0;
      width: 140px;
      height: 140px;
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid #2a2a4a;
    }
    .qq-group-card .qr-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .qq-group-card .info h3 {
      font-size: 18px;
      color: #4ade80;
      margin-bottom: 8px;
    }
    .qq-group-card .info .group-id {
      font-size: 16px;
      color: #e0e0e0;
      margin-bottom: 6px;
    }
    .qq-group-card .info .group-id .num {
      font-weight: bold;
      color: #60a5fa;
      font-size: 18px;
      letter-spacing: 1px;
    }
    .qq-group-card .info .desc {
      font-size: 13px;
      color: #888;
      line-height: 1.6;
    }
    .disclaimer {
      background: rgba(233, 69, 96, 0.05);
      border: 1px solid rgba(233, 69, 96, 0.2);
      border-radius: 10px;
      padding: 16px 20px;
      font-size: 12px;
      color: #999;
      line-height: 1.8;
    }
    .disclaimer .title {
      color: #e94560;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .disclaimer p { margin: 0; }
    .disclaimer p + p { margin-top: 4px; }
  </style>

  <div class="footer-section">
    <div class="qq-group-card">
      <div class="qr-wrapper">
        <img src="/public/qq-group.jpg" alt="QQ群二维码" />
      </div>
      <div class="info">
        <h3>鸣潮账号估价交流群</h3>
        <div class="group-id">群号：<span class="num">1064412729</span></div>
        <div class="desc">扫码加入QQ群，交流鸣潮账号估价心得，获取最新行情动态</div>
      </div>
    </div>
    <div class="disclaimer">
      <div class="title">合规声明</div>
      <p>本工具仅提供游戏账号行情数据测算参考，不支持、不引导任何账号买卖、转让行为。</p>
      <p>《鸣潮》官方禁止账号交易，所有账号交易产生封禁、被骗等损失由用户自行承担。</p>
      <p>本站不收集任何游戏账号密码、实名隐私信息，数据仅本地临时解析。</p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// 启动服务器
// ============================================================
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  鸣潮估价助手 监控服务器已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  仪表板: http://localhost:${PORT}`);
  console.log(`  性价比阈值: ${config.threshold || 30}%`);
  console.log(`  通知渠道: ${notify.getConfiguredChannels().join(', ') || '无'}`);
  console.log(`  模式: 被动接收（油猴脚本上报数据）`);
  console.log(`  上报接口: POST http://localhost:${PORT}/api/ingest`);
  console.log(`========================================`);

  // 不再启动定时扫描（WAF拦截），改为油猴脚本主动上报
  // startMonitorTimer();

  // 启动后立即执行一次扫描
  console.log('[Server] Starting initial scan...');
  setTimeout(() => {
    monitor.scanAccounts().catch(err => {
      console.error('[Server] Initial scan error:', err.message);
    });
  }, 3000);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  if (monitorTimer) clearInterval(monitorTimer);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  if (monitorTimer) clearInterval(monitorTimer);
  process.exit(0);
});
