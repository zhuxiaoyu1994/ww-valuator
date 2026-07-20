/**
 * server.js - 鸣潮估价助手
 * 轻量估价工具，支持按编号查询和粘贴描述估价
 */

'use strict';

const express = require('express');
const path = require('path');
const https = require('https');

const valueEngine = require('./value-engine');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 管理后台密码（可通过环境变量配置）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'guga2024';

// IP黑名单（可通过环境变量 BLOCKED_IPS 配置，逗号分隔）
const BLOCKED_IPS = (process.env.BLOCKED_IPS || '216.195.201.153').split(',').map(s => s.trim()).filter(Boolean);

// 查询日志（内存存储，最多保留1000条）
const queryLogs = [];
const MAX_LOGS = 1000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// IP黑名单拦截中间件
app.use((req, res, next) => {
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (BLOCKED_IPS.some(blocked => clientIp === blocked || clientIp.endsWith('.' + blocked))) {
    console.log('[Blocked] IP: ' + clientIp + ' ' + req.method + ' ' + req.path);
    return res.status(403).json({ success: false, error: '访问被拒绝' });
  }
  next();
});

// ============================================================
// API 路由
// ============================================================

/**
 * 估值接口 - 输入文本返回估值
 */
app.post('/api/x9k2-eval', (req, res) => {
  const { showTitle, priceInCents } = req.body;
  if (!showTitle) {
    return res.status(400).json({ success: false, error: 'showTitle is required' });
  }
  const result = valueEngine.evaluateWithPrice(showTitle, priceInCents || 0);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  // 记录查询日志
  const logEntry = {
    time: new Date().toISOString(),
    type: '粘贴估价',
    ip: clientIp.split(',')[0].trim(),
    input: showTitle.substring(0, 200),
    price: (priceInCents || 0) / 100,
    estimatedValue: result.details.finalValue,
    ratio: result.costPerformance,
    yellowCount: result.info.yellowCount,
    pulls: result.info.pulls,
    success: true,
  };
  queryLogs.unshift(logEntry);
  if (queryLogs.length > MAX_LOGS) queryLogs.pop();
  db.insertLog(logEntry); // 异步写入数据库

  res.json({
    success: true,
    data: {
      estimatedValue: result.details.finalValue,
      price: result.priceInYuan,
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
        pulls: result.info.pulls,
      },
      shortDescription: valueEngine.generateShortDescription(result),
    },
  });
});

/**
 * 按商品编号查询 - 先搜索获取商品信息，再估价
 * 支持商品编号（如 MEBNB9606）和数字 productId
 */
app.post('/api/x9k2-find', async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, error: '请输入商品编号' });
  }

  try {
    // 先尝试直接用 detail API（适用于数字 productId）
    let productData = null;
    let actualProductId = productId;

    // 如果是纯数字，直接调 detail API
    if (/^\d+$/.test(String(productId).trim())) {
      productData = await fetchProductDetail(productId.trim());
    }

    // 如果 detail API 没找到，用搜索 API 查找
    if (!productData) {
      const searchResult = await fetchProductBySearch(productId.trim());
      if (searchResult) {
        productData = searchResult;
        actualProductId = searchResult.productId || productId;
      }
    }

    if (!productData) {
      return res.json({ success: false, error: '未找到该商品，请检查编号是否正确' });
    }

    const showTitle = productData.showTitle || productData.title || '';
    const priceInCents = productData.price || 0; // API返回的price已经是分

    if (!showTitle) {
      return res.json({ success: false, error: '无法获取商品描述信息' });
    }

    const result = valueEngine.evaluateWithPrice(showTitle, priceInCents);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    // 记录查询日志
    const logEntry = {
      time: new Date().toISOString(),
      type: '编号查询',
      ip: clientIp.split(',')[0].trim(),
      input: String(productId),
      price: priceInCents / 100,
      estimatedValue: result.details.finalValue,
      ratio: result.costPerformance,
      yellowCount: result.info.yellowCount,
      pulls: result.info.pulls,
      success: true,
    };
    queryLogs.unshift(logEntry);
    if (queryLogs.length > MAX_LOGS) queryLogs.pop();
    db.insertLog(logEntry); // 异步写入数据库

    res.json({
      success: true,
      data: {
        productId: actualProductId,
        title: productData.gameName || showTitle.substring(0, 50),
        showTitle: showTitle,
        price: priceInCents / 100,
        estimatedValue: result.details.finalValue,
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
          pulls: result.info.pulls,
        },
        shortDescription: valueEngine.generateShortDescription(result),
        url: `https://www.pxb7.com/buy/10302/detail?productId=${actualProductId}`,
      },
    });
  } catch (err) {
    console.error('[Lookup] Error:', err.message);
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const failEntry = {
      time: new Date().toISOString(),
      type: '编号查询',
      ip: clientIp.split(',')[0].trim(),
      input: String(productId),
      error: err.message.substring(0, 100),
      success: false,
    };
    queryLogs.unshift(failEntry);
    if (queryLogs.length > MAX_LOGS) queryLogs.pop();
    db.insertLog(failEntry);
    const isTimeout = err.message.includes('超时') || err.code === 'ECONNRESET';
    res.json({
      success: false,
      error: isTimeout
        ? '查询超时，螃蟹网可能限制了服务器访问。请改用「粘贴描述估价」：在商品页复制描述文本，粘贴到估价框中即可。'
        : '查询失败: ' + err.message,
    });
  }
});

/**
 * 从螃蟹网 API 获取商品详情（数字 productId）
 */
function fetchProductDetail(productId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ productId: String(productId) });
    const options = {
      hostname: 'api-pc.pxb7.com',
      port: 443,
      path: '/api/product/web/product/detailPost',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Origin': 'https://www.pxb7.com',
        'Referer': 'https://www.pxb7.com/',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code === 200 && json.data) {
            resolve(json.data);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(new Error('解析商品数据失败'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy(new Error('请求超时'));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * 通过搜索 API 查找商品（支持商品编号如 MEBNB9606）
 */
function fetchProductBySearch(keyword) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: String(keyword),
      gameId: '10302',
      pageIndex: 1,
      pageSize: 20,
      bizProd: 1,
      type: '4',
      posType: 1,
    });
    const options = {
      hostname: 'api-pc.pxb7.com',
      port: 443,
      path: '/api/search/product/v2/selectSearchPageList',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Origin': 'https://www.pxb7.com',
        'Referer': 'https://www.pxb7.com/',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data) {
            const list = Array.isArray(json.data) ? json.data : (json.data.list || []);
            // 精确匹配商品编号
            const keywordUpper = String(keyword).toUpperCase();
            let matched = list.find(item =>
              (item.productUniqueNo || '').toUpperCase() === keywordUpper
            );
            // 模糊匹配
            if (!matched) {
              matched = list.find(item =>
                (item.productUniqueNo || '').toUpperCase().includes(keywordUpper) ||
                String(item.productId || '').includes(keyword)
              );
            }
            // 取第一条
            if (!matched && list.length > 0) {
              matched = list[0];
            }
            resolve(matched || null);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(new Error('解析搜索结果失败'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy(new Error('请求超时'));
    });
    req.write(postData);
    req.end();
  });
}

// ============================================================
// Web 页面
// ============================================================
app.get('/', (req, res) => {
  res.send(getPageHTML());
});

function getPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>鸣潮账号估价助手</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a1a;
      color: #e0e0e0;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding: 32px 24px 24px;
    }
    .header h1 {
      font-size: 28px;
      color: #e94560;
      margin-bottom: 8px;
    }
    .header .subtitle {
      color: #888;
      font-size: 14px;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .tab-btn {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      background: #12122a;
      color: #888;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .tab-btn.active {
      background: #e94560;
      color: #fff;
      border-color: #e94560;
    }

    /* Input area */
    .input-card {
      background: #12122a;
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .input-row {
      display: flex;
      gap: 12px;
      align-items: stretch;
    }
    .input-row input,
    .input-row textarea {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      background: #0a0a1a;
      color: #e0e0e0;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-row input:focus,
    .input-row textarea:focus {
      border-color: #e94560;
    }
    .input-row textarea {
      resize: vertical;
      min-height: 120px;
    }
    .eval-btn {
      padding: 12px 28px;
      border: none;
      border-radius: 8px;
      background: #e94560;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .eval-btn:hover { background: #ff5577; }
    .eval-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .price-input {
      width: 120px !important;
      flex: none !important;
    }

    /* Result */
    .result-card {
      background: #12122a;
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px;
      display: none;
    }
    .result-card.show { display: block; }
    .result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 14px;
    }
    .result-row .key { color: #888; }
    .result-row .val { font-weight: 600; }
    .result-divider {
      border-top: 1px solid #2a2a4a;
      margin: 10px 0;
    }
    .result-summary {
      text-align: center;
      padding: 20px 0;
    }
    .result-summary .big-value {
      font-size: 36px;
      font-weight: bold;
      color: #4ade80;
    }
    .result-summary .label {
      color: #888;
      font-size: 13px;
      margin-top: 4px;
    }
    .result-summary .ratio {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 8px;
    }
    .ratio.good { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .ratio.ok { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
    .ratio.bad { background: rgba(248, 113, 113, 0.15); color: #f87171; }

    .char-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .char-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .char-tag.S { background: rgba(233, 69, 96, 0.2); color: #e94560; }
    .char-tag.A { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
    .char-tag.B { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
    .char-tag.C { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .char-tag.D { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }
    .char-tag.E { background: rgba(156, 163, 175, 0.1); color: #666; }
    .char-tag .const { color: #aaa; margin-left: 2px; }
    .char-tag .sig { color: #4ade80; }

    /* History */
    .history {
      margin-top: 20px;
    }
    .history-title {
      color: #666;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .history-tag {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 16px;
      background: #12122a;
      border: 1px solid #2a2a4a;
      color: #888;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .history-tag:hover { border-color: #e94560; color: #e0e0e0; }

    .loading {
      text-align: center;
      padding: 20px;
      color: #888;
    }
    .error-msg {
      text-align: center;
      padding: 16px;
      color: #f87171;
      font-size: 14px;
    }

    /* QQ群 & 合规声明 */
    .footer-section {
      margin-top: 40px;
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
      cursor: pointer;
      transition: transform 0.2s;
    }
    .qq-group-card .qr-wrapper:hover {
      transform: scale(1.05);
    }
    .qq-group-card .qr-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* 图片放大遮罩层 */
    .img-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      cursor: zoom-out;
    }
    .img-overlay.show { display: flex; }
    .img-overlay img {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
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

    @media (max-width: 600px) {
      .input-row { flex-direction: column; }
      .price-input { width: 100% !important; }
      .qq-group-card { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>鸣潮账号估价助手</h1>
      <div class="subtitle">输入螃蟹网商品编号，或粘贴商品描述进行估价</div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn active" id="tab-lookup" onclick="switchTab('lookup')">按编号查询</button>
      <button class="tab-btn" id="tab-paste" onclick="switchTab('paste')">粘贴描述估价</button>
    </div>

    <!-- 按编号查询 -->
    <div class="input-card" id="panel-lookup">
      <div class="input-row">
        <input type="text" id="product-id" placeholder="输入商品编号，如 MEBNB9606" onkeydown="if(event.key==='Enter')doLookup()" />
        <button class="eval-btn" id="lookup-btn" onclick="doLookup()">估价</button>
      </div>
    </div>

    <!-- 粘贴描述估价 -->
    <div class="input-card" id="panel-paste" style="display:none;">
      <div class="input-row" style="flex-direction:column;gap:12px;">
        <textarea id="eval-text" placeholder="粘贴螃蟹网商品描述文本（包含角色、命座、武器、资源等信息）"></textarea>
        <div class="input-row">
          <input type="number" class="price-input" id="eval-price" placeholder="标价(元)" min="0" />
          <button class="eval-btn" id="eval-btn" onclick="doEvaluate()">估价</button>
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <div class="result-card" id="result">
      <div class="result-summary" id="result-summary"></div>
      <div class="result-divider"></div>
      <div id="result-details"></div>
      <div class="result-divider"></div>
      <div id="result-chars"></div>
      <div class="result-divider"></div>
      <div id="result-resources"></div>
    </div>

    <!-- Loading/Error -->
    <div id="status-msg"></div>

    <!-- History -->
    <div class="history" id="history-section" style="display:none;">
      <div class="history-title">最近查询</div>
      <div class="history-tags" id="history-tags"></div>
    </div>

    <!-- QQ群 & 合规声明 -->
    <div class="footer-section">
      <div class="qq-group-card">
        <div class="qr-wrapper">
          <img src="/public/qq-group.jpg" alt="QQ群二维码" />
        </div>
        <div class="info">
          <h3>咕嘎鸣潮估价群</h3>
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
  </div>

  <!-- 图片放大遮罩层 -->
  <div class="img-overlay" id="img-overlay">
    <img src="/public/qq-group.jpg" alt="QQ群二维码" />
  </div>

  <script>
    // ============================================================
    // Tab 切换
    // ============================================================
    let currentTab = 'lookup';
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tab-lookup').classList.toggle('active', tab === 'lookup');
      document.getElementById('tab-paste').classList.toggle('active', tab === 'paste');
      document.getElementById('panel-lookup').style.display = tab === 'lookup' ? '' : 'none';
      document.getElementById('panel-paste').style.display = tab === 'paste' ? '' : 'none';
      // 清空结果
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '';
    }

    // ============================================================
    // 按编号查询
    // ============================================================
    async function doLookup() {
      const productId = document.getElementById('product-id').value.trim();
      if (!productId) { alert('请输入商品编号'); return; }

      const btn = document.getElementById('lookup-btn');
      btn.disabled = true; btn.textContent = '查询中...';
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '<div class="loading">正在查询商品信息...</div>';

      try {
        const resp = await fetch('/api/x9k2-find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        const result = await resp.json();
        document.getElementById('status-msg').innerHTML = '';

        if (!result.success) {
          const isTimeout = result.error && result.error.includes('超时');
          const errorHtml = '<div class="error-msg">' + (result.error || '查询失败') + '</div>';
          if (isTimeout) {
            document.getElementById('status-msg').innerHTML = errorHtml +
              '<div style="text-align:center;margin-top:8px;"><button class="eval-btn" onclick="switchTab(\\'paste\\')">切换到粘贴描述估价</button></div>';
          } else {
            document.getElementById('status-msg').innerHTML = errorHtml;
          }
          return;
        }

        showResult(result.data);
        saveHistory(productId, result.data);
      } catch (err) {
        document.getElementById('status-msg').innerHTML = '<div class="error-msg">查询失败: ' + err.message + '</div>';
      } finally {
        btn.disabled = false; btn.textContent = '估价';
      }
    }

    // ============================================================
    // 粘贴描述估价
    // ============================================================
    async function doEvaluate() {
      const text = document.getElementById('eval-text').value.trim();
      const price = parseFloat(document.getElementById('eval-price').value) || 0;
      if (!text) { alert('请输入账号描述文本'); return; }

      const btn = document.getElementById('eval-btn');
      btn.disabled = true; btn.textContent = '计算中...';
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '<div class="loading">正在计算估值...</div>';

      try {
        const resp = await fetch('/api/x9k2-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showTitle: text, priceInCents: price * 100 }),
        });
        const result = await resp.json();
        document.getElementById('status-msg').innerHTML = '';

        if (!result.success) {
          document.getElementById('status-msg').innerHTML = '<div class="error-msg">' + (result.error || '估值失败') + '</div>';
          return;
        }

        showResult(result.data);
      } catch (err) {
        document.getElementById('status-msg').innerHTML = '<div class="error-msg">估值失败: ' + err.message + '</div>';
      } finally {
        btn.disabled = false; btn.textContent = '估价';
      }
    }

    // ============================================================
    // 显示结果
    // ============================================================
    function showResult(d) {
      // 摘要
      const ratioClass = d.costPerformance >= 30 ? 'good' : (d.costPerformance >= 0 ? 'ok' : 'bad');
      const ratioText = d.costPerformance >= 0 ? '+' + d.costPerformance + '%' : d.costPerformance + '%';
      let summaryHtml = '';
      summaryHtml += '<div class="big-value">' + d.estimatedValue + ' 元</div>';
      summaryHtml += '<div class="label">预估价值</div>';
      if (d.price && d.price > 0) {
        summaryHtml += '<div class="ratio ' + ratioClass + '">性价比 ' + ratioText + ' (标价' + d.price + '元)</div>';
      }
      document.getElementById('result-summary').innerHTML = summaryHtml;

      // 明细
      const det = d.details;
      let detailHtml = '';
      detailHtml += resultRow('角色价值', det.characterValue + ' 元', '#aaa');
      detailHtml += resultRow('满命溢价', det.c6Premium + ' 元', '#aaa');
      detailHtml += resultRow('配队溢价', det.teamPremium + ' 元', '#aaa');
      detailHtml += resultRow('抽数价值', (det.pullValue || 0) + ' 元' + (d.info && d.info.pulls ? '（' + d.info.pulls + '抽）' : ''), '#aaa');
      detailHtml += resultRow('资源价值', det.resourceValue + ' 元', '#aaa');
      detailHtml += resultRow('黄数系数', 'x' + det.yellowMultiplier, '#aaa');
      document.getElementById('result-details').innerHTML = detailHtml;

      // 角色标签
      let charHtml = '<div style="color:#888;font-size:12px;margin-bottom:4px;">角色明细</div><div class="char-tags">';
      if (det.characters && det.characters.length > 0) {
        det.characters.forEach(c => {
          const constStr = c.const === 6 ? '满命' : c.const + '命';
          const sigStr = c.hasSig ? ' <span class="sig">+专武</span>' : '';
          charHtml += '<span class="char-tag ' + c.tier + '">' + constStr + ' ' + c.name + sigStr + ' (' + c.value + '元)</span>';
        });
      } else {
        charHtml += '<span style="color:#666;font-size:12px;">未识别到角色</span>';
      }
      charHtml += '</div>';
      document.getElementById('result-chars').innerHTML = charHtml;

      // 资源
      const info = d.info || {};
      let resHtml = '';
      resHtml += resultRow('星声', info.starSounds || 0, '#666');
      resHtml += resultRow('月相', info.moonPhases || 0, '#666');
      resHtml += resultRow('余波珊瑚', info.coral || 0, '#666');
      resHtml += resultRow('浮金波纹', info.goldenRipples || 0, '#666');
      resHtml += resultRow('铸潮波纹', info.tideRipples || 0, '#666');
      resHtml += resultRow('服饰', (info.outfits || 0) + ' 件', '#666');
      resHtml += resultRow('黄数', info.yellowCount || 0, '#666');
      document.getElementById('result-resources').innerHTML = resHtml;

      document.getElementById('result').classList.add('show');
    }

    function resultRow(key, val, color) {
      return '<div class="result-row"><span class="key">' + key + '</span><span class="val" style="color:' + (color || '#e0e0e0') + ';">' + val + '</span></div>';
    }

    // ============================================================
    // 历史记录
    // ============================================================
    function saveHistory(productId, data) {
      let history = [];
      try { history = JSON.parse(localStorage.getItem('mw_history') || '[]'); } catch(e) {}
      // 去重
      history = history.filter(h => h.id !== productId);
      history.unshift({
        id: productId,
        ratio: data.costPerformance,
        value: data.estimatedValue,
      });
      history = history.slice(0, 10);
      localStorage.setItem('mw_history', JSON.stringify(history));
      renderHistory();
    }

    function renderHistory() {
      let history = [];
      try { history = JSON.parse(localStorage.getItem('mw_history') || '[]'); } catch(e) {}
      if (history.length === 0) {
        document.getElementById('history-section').style.display = 'none';
        return;
      }
      document.getElementById('history-section').style.display = '';
      let html = '';
      history.forEach(h => {
        const ratioText = h.ratio >= 0 ? '+' + h.ratio + '%' : h.ratio + '%';
        html += '<span class="history-tag" onclick="loadHistory(\\'' + h.id + '\\')">' + h.id + ' (' + ratioText + ')</span>';
      });
      document.getElementById('history-tags').innerHTML = html;
    }

    function loadHistory(productId) {
      document.getElementById('product-id').value = productId;
      switchTab('lookup');
      doLookup();
    }

    // ============================================================
    // 初始化
    // ============================================================
    renderHistory();

    // QQ群图片点击放大
    (function() {
      var qrWrapper = document.querySelector('.qr-wrapper');
      var overlay = document.getElementById('img-overlay');
      if (!qrWrapper || !overlay) return;
      qrWrapper.addEventListener('click', function() {
        overlay.classList.add('show');
      });
      overlay.addEventListener('click', function() {
        overlay.classList.remove('show');
      });
    })();
  </script>
</body>
</html>`;
}

// ============================================================
// 管理后台
// ============================================================

// 管理后台页面
app.get('/admin', (req, res) => {
  res.send(getAdminPage());
});

// 管理后台API - 获取日志
app.post('/admin/api/logs', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }

  // 优先从数据库读取（持久化），回退到内存
  const dbStats = await db.getStats();
  if (dbStats) {
    const logs = await db.queryLogs(500, 0, '');
    return res.json({
      success: true,
      data: {
        logs: logs,
        total: dbStats.total,
        stats: {
          totalQueries: dbStats.total,
          successCount: dbStats.success,
          lookupCount: dbStats.lookup,
          evalCount: dbStats.eval,
        },
      },
    });
  }

  // 回退到内存
  res.json({
    success: true,
    data: {
      logs: queryLogs,
      total: queryLogs.length,
      stats: {
        totalQueries: queryLogs.length,
        successCount: queryLogs.filter(l => l.success).length,
        lookupCount: queryLogs.filter(l => l.type === '编号查询').length,
        evalCount: queryLogs.filter(l => l.type === '粘贴估价').length,
      },
    },
  });
});

// 管理后台页面HTML
function getAdminPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理后台 - 鸣潮估价助手</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f0f23; color: #e0e0e0; font-family: -apple-system, 'Segoe UI', sans-serif; min-height: 100vh; }
  .login-box { max-width: 400px; margin: 100px auto; background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 32px; }
  .login-box h1 { font-size: 20px; color: #4ade80; margin-bottom: 20px; text-align: center; }
  .login-box input { width: 100%; padding: 12px; border: 1px solid #2a2a4a; border-radius: 8px; background: #0f0f23; color: #e0e0e0; font-size: 14px; margin-bottom: 12px; }
  .login-box button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4ade80; color: #0f0f23; font-size: 14px; font-weight: 600; cursor: pointer; }
  .login-box button:hover { background: #22c55e; }
  .login-box .error { color: #ef4444; font-size: 13px; margin-bottom: 8px; display: none; }

  .dashboard { display: none; max-width: 1200px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #4ade80; }
  .header .logout { color: #888; cursor: pointer; font-size: 13px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; padding: 20px; text-align: center; }
  .stat-card .num { font-size: 28px; font-weight: 700; color: #4ade80; }
  .stat-card .label { font-size: 12px; color: #888; margin-top: 4px; }

  .filters { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
  .filters select, .filters input { padding: 8px 12px; border: 1px solid #2a2a4a; border-radius: 6px; background: #1a1a3a; color: #e0e0e0; font-size: 13px; }

  table { width: 100%; border-collapse: collapse; background: #1a1a3a; border-radius: 10px; overflow: hidden; }
  th { background: #12122a; padding: 12px; text-align: left; font-size: 12px; color: #888; font-weight: 600; border-bottom: 1px solid #2a2a4a; white-space: nowrap; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #1f1f3a; }
  tr:hover { background: #1f1f3f; }
  .tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .tag-eval { background: #1e3a1e; color: #4ade80; }
  .tag-lookup { background: #1e2a3a; color: #60a5fa; }
  .tag-fail { background: #3a1e1e; color: #ef4444; }
  .ratio-good { color: #4ade80; }
  .ratio-bad { color: #ef4444; }
  .truncate { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
  .truncate:hover { white-space: normal; word-break: break-all; }
  .pagination { display: flex; gap: 8px; margin-top: 16px; justify-content: center; align-items: center; }
  .pagination button { padding: 6px 14px; border: 1px solid #2a2a4a; border-radius: 6px; background: #1a1a3a; color: #e0e0e0; cursor: pointer; font-size: 13px; }
  .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
  .pagination span { color: #888; font-size: 13px; }
</style>
</head>
<body>
  <div class="login-box" id="login-box">
    <h1>管理后台</h1>
    <div class="error" id="login-error">密码错误</div>
    <input type="password" id="password" placeholder="请输入管理密码" onkeydown="if(event.key==='Enter')doLogin()">
    <button onclick="doLogin()">登录</button>
  </div>

  <div class="dashboard" id="dashboard">
    <div class="header">
      <h1>查询日志</h1>
      <span class="logout" onclick="logout()">退出</span>
    </div>
    <div class="stats">
      <div class="stat-card"><div class="num" id="stat-total">0</div><div class="label">总查询数</div></div>
      <div class="stat-card"><div class="num" id="stat-success">0</div><div class="label">成功</div></div>
      <div class="stat-card"><div class="num" id="stat-lookup">0</div><div class="label">编号查询</div></div>
      <div class="stat-card"><div class="num" id="stat-eval">0</div><div class="label">粘贴估价</div></div>
    </div>
    <div class="filters">
      <select id="filter-type" onchange="renderTable()">
        <option value="">全部类型</option>
        <option value="编号查询">编号查询</option>
        <option value="粘贴估价">粘贴估价</option>
      </select>
      <input type="text" id="filter-search" placeholder="搜索编号/描述/IP..." oninput="renderTable()">
    </div>
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>类型</th>
          <th>IP</th>
          <th>输入</th>
          <th>标价</th>
          <th>估值</th>
          <th>性价比</th>
          <th>黄数</th>
          <th>抽数</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody id="log-tbody"></tbody>
    </table>
    <div class="pagination" id="pagination"></div>
  </div>

<script>
  let allLogs = [];
  let filteredLogs = [];
  let currentPage = 1;
  const pageSize = 50;

  // 自动登录（记住密码）
  const savedPw = sessionStorage.getItem('admin_pw');
  if (savedPw) {
    document.getElementById('password').value = savedPw;
    doLogin();
  }

  async function doLogin() {
    const pw = document.getElementById('password').value.trim();
    if (!pw) return;
    try {
      const resp = await fetch('/admin/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const result = await resp.json();
      if (result.success) {
        sessionStorage.setItem('admin_pw', pw);
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        allLogs = result.data.logs;
        document.getElementById('stat-total').textContent = result.data.stats.totalQueries;
        document.getElementById('stat-success').textContent = result.data.stats.successCount;
        document.getElementById('stat-lookup').textContent = result.data.stats.lookupCount;
        document.getElementById('stat-eval').textContent = result.data.stats.evalCount;
        renderTable();
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    } catch (e) {
      document.getElementById('login-error').textContent = '网络错误';
      document.getElementById('login-error').style.display = 'block';
    }
  }

  function logout() {
    sessionStorage.removeItem('admin_pw');
    location.reload();
  }

  function renderTable() {
    const filterType = document.getElementById('filter-type').value;
    const searchTerm = document.getElementById('filter-search').value.trim().toLowerCase();

    filteredLogs = allLogs.filter(l => {
      if (filterType && l.type !== filterType) return false;
      if (searchTerm) {
        const hay = (l.input + ' ' + l.ip + ' ' + (l.error || '')).toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const start = (currentPage - 1) * pageSize;
    const pageLogs = filteredLogs.slice(start, start + pageSize);
    const tbody = document.getElementById('log-tbody');

    if (pageLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#666;padding:40px;">暂无数据</td></tr>';
    } else {
      tbody.innerHTML = pageLogs.map(l => {
        const time = new Date(l.time).toLocaleString('zh-CN');
        const typeTag = l.success
          ? (l.type === '编号查询' ? '<span class="tag tag-lookup">编号</span>' : '<span class="tag tag-eval">粘贴</span>')
          : '<span class="tag tag-fail">失败</span>';
        const ratio = l.ratio != null
          ? '<span class="' + (l.ratio >= 0 ? 'ratio-good' : 'ratio-bad') + '">' + (l.ratio >= 0 ? '+' : '') + l.ratio.toFixed(1) + '%</span>'
          : '-';
        const price = l.price != null ? '¥' + l.price : '-';
        const estValue = l.estimatedValue != null ? '¥' + l.estimatedValue.toFixed(2) : '-';
        const yellow = l.yellowCount != null ? l.yellowCount : '-';
        const pulls = l.pulls != null ? l.pulls : '-';
        return '<tr>' +
          '<td style="white-space:nowrap;">' + time + '</td>' +
          '<td>' + typeTag + '</td>' +
          '<td>' + (l.ip || '-') + '</td>' +
          '<td class="truncate" title="' + escapeHtml(l.input) + '">' + escapeHtml(l.input) + '</td>' +
          '<td>' + price + '</td>' +
          '<td>' + estValue + '</td>' +
          '<td>' + ratio + '</td>' +
          '<td>' + yellow + '</td>' +
          '<td>' + pulls + '</td>' +
          '<td>' + (l.success ? '成功' : '<span style="color:#ef4444;">' + escapeHtml(l.error || '失败') + '</span>') + '</td>' +
          '</tr>';
      }).join('');
    }

    // 分页
    const totalPages = Math.ceil(filteredLogs.length / pageSize);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML =
      '<button onclick="goPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>上一页</button>' +
      '<span>第 ' + currentPage + ' / ' + totalPages + ' 页 (共 ' + filteredLogs.length + ' 条)</span>' +
      '<button onclick="goPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>下一页</button>';
  }

  function goPage(p) {
    const totalPages = Math.ceil(filteredLogs.length / pageSize);
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    renderPage();
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
</script>
</body>
</html>`;
}

// ============================================================
// 启动服务器
// ============================================================

// 初始化数据库
db.initDb();
db.ensureTable();

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  鸣潮估价助手 已启动`);
  console.log(`  端口: ${PORT}`);
  console.log(`  访问: http://localhost:${PORT}`);
  console.log(`========================================`);
});
