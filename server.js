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

// IP黑名单（初始从环境变量加载，运行时可动态增删）
let blockedIps = (process.env.BLOCKED_IPS || '216.195.201.153').split(',').map(s => s.trim()).filter(Boolean);

// 查询日志（内存存储，最多保留1000条）
const queryLogs = [];
const MAX_LOGS = 1000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// IP黑名单拦截中间件
app.use((req, res, next) => {
  // 放行管理页面和封禁管理API（否则被封IP无法解封）
  if (req.path === '/blocklist' || req.path.startsWith('/blocklist/api/')) {
    return next();
  }
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  // 支持精确匹配、后缀匹配（.xxx）、前缀匹配（xxx.）
  const isBlocked = blockedIps.some(blocked => {
    if (clientIp === blocked) return true;
    if (blocked.startsWith('.') && clientIp.endsWith(blocked)) return true;
    if (blocked.endsWith('.') && clientIp.startsWith(blocked)) return true;
    // 支持 CIDR 前缀如 "216.195.201"（匹配 216.195.201.*）
    if (!blocked.includes(':') && clientIp.startsWith(blocked + '.')) return true;
    return false;
  });
  if (isBlocked) {
    console.log('[Blocked] IP: ' + clientIp + ' ' + req.method + ' ' + req.path);
    return res.status(403).json({ success: false, error: '访问被拒绝' });
  }
  next();
});

// ============================================================
// 频率限制 + 自动封禁
// ============================================================
const RATE_LIMIT_WINDOW = 5 * 60 * 1000;  // 5分钟窗口
const RATE_LIMIT_MAX = 6;                  // 每个IP每窗口最多6次API请求（降低以防止慢速绕过）
const AUTO_BAN_THRESHOLD = 3;              // 触发限流3次自动封禁
const GLOBAL_RATE_LIMIT_MAX = 40;          // 全局每分钟最多40次
const PATTERN_DETECT_COUNT = 5;            // 规律性检测：连续N次请求间隔过小则封禁
const PATTERN_MIN_INTERVAL = 4 * 60 * 1000; // 规律性检测：间隔小于4分钟视为异常

const ipRequestRecords = {};  // { ip: { timestamps: [], violations: 0, lastTime: 0, patternCount: 0 } }
const globalRequestTimestamps = [];

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function cleanOldTimestamps(arr, windowMs) {
  const now = Date.now();
  while (arr.length > 0 && arr[0] < now - windowMs) {
    arr.shift();
  }
}

// 频率限制中间件（仅作用于 /api/ 路径）
app.use('/api/', (req, res, next) => {
  const clientIp = getClientIp(req);

  // 本地开发环境放行 localhost
  if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === '::ffff:127.0.0.1') {
    return next();
  }

  // 全局频率限制
  cleanOldTimestamps(globalRequestTimestamps, 60 * 1000);
  if (globalRequestTimestamps.length >= GLOBAL_RATE_LIMIT_MAX) {
    console.log('[RateLimit] 全局限流触发');
    return res.status(429).json({ success: false, error: '服务器繁忙，请稍后再试' });
  }

  // 单IP频率限制
  if (!ipRequestRecords[clientIp]) {
    ipRequestRecords[clientIp] = { timestamps: [], violations: 0, lastTime: 0, patternCount: 0 };
  }
  const record = ipRequestRecords[clientIp];
  const now = Date.now();
  cleanOldTimestamps(record.timestamps, RATE_LIMIT_WINDOW);

  // 规律性检测：请求间隔过小（模拟人工但频率稳定）
  if (record.lastTime > 0) {
    const interval = now - record.lastTime;
    if (interval > 0 && interval < PATTERN_MIN_INTERVAL) {
      record.patternCount++;
      console.log('[Pattern] IP: ' + clientIp + ' 间隔 ' + Math.round(interval / 1000) + 's，连续快请求计数 ' + record.patternCount);
      if (record.patternCount >= PATTERN_DETECT_COUNT) {
        if (!blockedIps.includes(clientIp)) {
          blockedIps.push(clientIp);
          console.log('[AutoBan] IP: ' + clientIp + ' 已自动封禁（请求规律异常，疑似脚本）');
        }
        return res.status(403).json({ success: false, error: '访问被拒绝' });
      }
    } else if (interval >= PATTERN_MIN_INTERVAL) {
      // 间隔正常，重置规律计数
      record.patternCount = 0;
    }
  }
  record.lastTime = now;

  if (record.timestamps.length >= RATE_LIMIT_MAX) {
    record.violations++;
    console.log('[RateLimit] IP: ' + clientIp + ' 违规第' + record.violations + '次');

    // 自动封禁
    if (record.violations >= AUTO_BAN_THRESHOLD) {
      if (!blockedIps.includes(clientIp)) {
        blockedIps.push(clientIp);
        console.log('[AutoBan] IP: ' + clientIp + ' 已自动封禁（频繁触发限流）');
      }
      return res.status(403).json({ success: false, error: '访问被拒绝' });
    }

    return res.status(429).json({
      success: false,
      error: '请求过于频繁，请' + Math.ceil(RATE_LIMIT_WINDOW / 60000) + '分钟后再试',
    });
  }

  // 记录本次请求
  record.timestamps.push(Date.now());
  globalRequestTimestamps.push(Date.now());
  next();
});

// ============================================================
// API 路由
// ============================================================

/**
 * 默认权重接口 - 返回估值引擎的默认权重配置（供前端设置面板初始化用）
 */
app.get('/api/defaults', (req, res) => {
  try {
    const defaults = valueEngine.getDefaults();
    res.json({ success: true, data: defaults });
  } catch (err) {
    console.error('[/api/defaults] Error:', err.message);
    res.status(500).json({ success: false, error: '获取默认权重失败' });
  }
});

/**
 * 估值接口 - 输入文本返回估值
 */
app.post('/api/x9k2-eval', (req, res) => {
  const { showTitle, priceInCents, customWeights } = req.body;
  if (!showTitle) {
    return res.status(400).json({ success: false, error: 'showTitle is required' });
  }
  const result = valueEngine.evaluateWithPrice(showTitle, priceInCents || 0, customWeights || null);
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
  const { productId, customWeights } = req.body;
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

    const result = valueEngine.evaluateWithPrice(showTitle, priceInCents, customWeights || null);
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
  res.send(getPlatformPage());
});

app.get('/wuwa', (req, res) => {
  res.send(getPageHTML());
});

// ============================================================
// 平台首页 - 多游戏估价平台选择页
// ============================================================
function getPlatformPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>游戏账号估价平台 - 精准估值 · 买卖参考 · 实时监控</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(160deg, #0a0a1a 0%, #0f0f2a 100%);
      background-attachment: fixed;
      color: #e0e0e0;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1080px; margin: 0 auto; }

    /* Header */
    .header {
      text-align: center;
      padding: 48px 24px 32px;
    }
    .logo-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .logo-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #e94560 0%, #ff7a45 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 800; color: #fff;
      box-shadow: 0 6px 24px rgba(233, 69, 96, 0.35);
    }
    .site-name {
      font-size: 30px; font-weight: 800;
      background: linear-gradient(90deg, #e94560, #fbbf24, #4ade80);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 1px;
    }
    .tagline {
      color: #999;
      font-size: 15px;
      letter-spacing: 2px;
    }
    .tagline .dot { color: #e94560; margin: 0 8px; }

    /* Section title */
    .section-title {
      text-align: center;
      color: #ccc;
      font-size: 18px;
      font-weight: 600;
      margin: 8px 0 28px;
      letter-spacing: 1px;
    }

    /* Game cards grid */
    .games-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 48px;
    }
    .game-card {
      position: relative;
      background: linear-gradient(160deg, #14142e 0%, #1a1a38 100%);
      border: 1px solid #2a2a4a;
      border-radius: 18px;
      padding: 32px 24px;
      text-decoration: none;
      color: inherit;
      transition: transform 0.28s cubic-bezier(.2,.8,.2,1), box-shadow 0.28s, border-color 0.28s;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .game-card.clickable { cursor: pointer; }
    .game-card.clickable:hover {
      transform: translateY(-8px);
      box-shadow: 0 18px 48px rgba(0,0,0,0.45);
    }
    .game-card.wuwa:hover { border-color: rgba(233, 69, 96, 0.6); box-shadow: 0 18px 48px rgba(233, 69, 96, 0.18); }
    .game-card.disabled { cursor: not-allowed; opacity: 0.78; }
    .game-card.disabled:hover { transform: none; box-shadow: none; }

    /* glow accent */
    .game-card .accent {
      position: absolute;
      top: -40px; right: -40px;
      width: 140px; height: 140px;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.35;
      pointer-events: none;
    }
    .game-card.wuwa .accent { background: #e94560; }
    .game-card.zzz .accent { background: #ffb84d; }
    .game-card.huan .accent { background: #7c5cff; }
    .game-card.endfield .accent { background: #4ade80; }
    .game-card.delta .accent { background: #3b82f6; }
    .game-card.honor .accent { background: #f0c040; }

    /* Icon */
    .game-icon {
      width: 84px; height: 84px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 36px; font-weight: 800; color: #fff;
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }
    .game-icon.wuwa { background: linear-gradient(135deg, #e94560 0%, #ff6b4a 100%); box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4); }
    .game-icon.zzz { background: linear-gradient(135deg, #ffb84d 0%, #ff8a3d 100%); }
    .game-icon.huan { background: linear-gradient(135deg, #7c5cff 0%, #5b8cff 100%); }
    .game-icon.endfield { background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); }
    .game-icon.delta { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .game-icon.honor { background: linear-gradient(135deg, #f0c040 0%, #eab308 100%); }

    .game-name {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .game-card.wuwa .game-name { color: #ff6b7a; }
    .game-card.zzz .game-name { color: #ffb84d; }
    .game-card.huan .game-name { color: #9d7cff; }
    .game-card.endfield .game-name { color: #4ade80; }
    .game-card.delta .game-name { color: #60a5fa; }
    .game-card.honor .game-name { color: #f0c040; }

    .game-desc {
      font-size: 13px;
      color: #888;
      line-height: 1.7;
      margin-bottom: 18px;
      min-height: 44px;
      position: relative;
      z-index: 1;
    }

    .status-badge {
      display: inline-block;
      padding: 5px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
    }
    .status-badge.available { background: rgba(74, 222, 128, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); }
    .status-badge.soon { background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.25); }

    /* Coming soon overlay */
    .coming-soon-mask {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 10, 26, 0.55);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      z-index: 2;
    }
    .coming-soon-text {
      font-size: 22px;
      font-weight: 800;
      color: #e0e0e0;
      letter-spacing: 4px;
      text-shadow: 0 2px 12px rgba(0,0,0,0.6);
      transform: rotate(-12deg);
      padding: 10px 28px;
      border: 2px solid rgba(224, 224, 224, 0.3);
      border-radius: 10px;
      background: rgba(20, 20, 40, 0.5);
    }

    .enter-arrow {
      margin-top: 14px;
      font-size: 13px;
      color: #e94560;
      font-weight: 600;
      position: relative;
      z-index: 1;
      transition: transform 0.28s;
    }
    .game-card.clickable:hover .enter-arrow { transform: translateX(4px); }

    /* Footer */
    .footer {
      text-align: center;
      padding: 32px 16px;
      border-top: 1px solid #1f1f3a;
      margin-top: 24px;
    }
    .footer .copyright {
      color: #666;
      font-size: 13px;
      margin-bottom: 10px;
    }
    .footer .qq-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border: 1px solid #2a2a4a;
      border-radius: 20px;
      color: #888;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .footer .qq-link:hover { color: #4ade80; border-color: rgba(74,222,128,0.4); }

    @media (max-width: 768px) {
      .games-grid { grid-template-columns: 1fr; }
      .header { padding: 32px 16px 20px; }
      .site-name { font-size: 24px; }
      .logo-icon { width: 44px; height: 44px; font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-wrap">
        <div class="logo-icon">估</div>
        <div class="site-name">游戏账号估价平台</div>
      </div>
      <div class="tagline">精准估值<span class="dot">·</span>买卖参考<span class="dot">·</span>实时监控</div>
    </div>

    <div class="section-title">选择游戏 · 开始估价</div>

    <!-- Game cards -->
    <div class="games-grid">
      <!-- 鸣潮 -->
      <a class="game-card wuwa clickable" href="/wuwa">
        <div class="accent"></div>
        <div class="game-icon wuwa">鸣</div>
        <div class="game-name">鸣潮</div>
        <div class="game-desc">账号价值评估 · 角色武器定价 · 螃蟹网监控</div>
        <span class="status-badge available">可用</span>
        <div class="enter-arrow">进入估价 →</div>
      </a>

      <!-- 绝区零 -->
      <div class="game-card zzz disabled">
        <div class="accent"></div>
        <div class="game-icon zzz">绝</div>
        <div class="game-name">绝区零</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 异环 -->
      <div class="game-card huan disabled">
        <div class="accent"></div>
        <div class="game-icon huan">异</div>
        <div class="game-name">异环</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 明日方舟：终末地 -->
      <div class="game-card endfield disabled">
        <div class="accent"></div>
        <div class="game-icon endfield">终</div>
        <div class="game-name">明日方舟：终末地</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 三角洲行动 -->
      <div class="game-card delta disabled">
        <div class="accent"></div>
        <div class="game-icon delta">三</div>
        <div class="game-name">三角洲行动</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 王者荣耀 -->
      <div class="game-card honor disabled">
        <div class="accent"></div>
        <div class="game-icon honor">王</div>
        <div class="game-name">王者荣耀</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="copyright">© 2024 游戏账号估价平台 · 仅供行情参考，不参与任何账号交易</div>
    </div>
  </div>
</body>
</html>`;
}

function getPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>鸣潮账号估价 - 游戏账号估价平台</title>
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

    /* Top Nav */
    .top-nav {
      display: flex; justify-content: center; gap: 0;
      margin-bottom: 8px; padding: 10px 16px;
      background: #12122a; border-radius: 12px; border: 1px solid #1f1f3a;
    }
    .nav-link {
      padding: 8px 24px; font-size: 14px; color: #888;
      text-decoration: none; border-radius: 8px; transition: all 0.2s;
      border: 1px solid transparent;
    }
    .nav-link:hover { color: #ccc; background: rgba(255,255,255,0.04); }
    .nav-link.active { color: #4ade80; border-color: #2a4a2a; background: rgba(74,222,128,0.06); font-weight: 600; }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding: 20px 24px 16px;
      position: relative;
    }
    .back-home {
      position: absolute;
      top: 16px;
      left: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 14px;
      border: 1px solid #2a2a4a;
      border-radius: 20px;
      color: #aaa;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .back-home:hover { color: #e94560; border-color: rgba(233,69,96,0.5); background: rgba(233,69,96,0.06); }
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
      position: relative;
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
    /* 估值规则设置入口 */
    .settings-bar {
      display: flex; justify-content: flex-end; margin-bottom: 10px;
    }
    .settings-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border: 1px solid #2a2a4a; border-radius: 8px;
      background: transparent; color: #fbbf24; font-size: 13px; cursor: pointer;
      transition: all 0.2s; font-family: inherit;
    }
    .settings-btn:hover { border-color: #fbbf24; background: rgba(251,191,36,0.08); }
    .settings-btn.customized { color: #4ade80; border-color: #4ade80; }
    .settings-btn.customized:hover { background: rgba(74,222,128,0.08); }
    /* "估值不准"按钮 - 固定在预估价值容器右上角 */
    .adjust-link {
      display: none;
      position: absolute; top: 0; right: 0; z-index: 10;
      padding: 6px 14px; border: 1px solid #fbbf24; border-radius: 8px;
      background: rgba(15,15,35,0.9); color: #fbbf24; font-size: 12px;
      cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .adjust-link:hover { background: rgba(251,191,36,0.15); }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <a class="back-home" href="/">← 返回首页</a>
      <h1>鸣潮账号估价助手</h1>
      <div class="subtitle">输入螃蟹网商品编号，或粘贴商品描述进行估价</div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn active" id="tab-lookup" onclick="switchTab('lookup')">按编号查询</button>
      <button class="tab-btn" id="tab-paste" onclick="switchTab('paste')">粘贴描述估价</button>
    </div>

    <!-- 估值规则设置入口 -->
    <div class="settings-bar">
      <button class="settings-btn" id="settings-btn" onclick="openValueSettings(reevaluateAfterSettings)">估值规则设置</button>
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

  <script src="/public/value-settings.js"></script>
  <script>
    // ============================================================
    // 估值规则设置按钮状态更新
    // ============================================================
    function updateSettingsBtnState() {
      const btn = document.getElementById('settings-btn');
      if (!btn) return;
      if (typeof hasCustomWeights === 'function' && hasCustomWeights()) {
        btn.textContent = '估值规则设置（已自定义）';
        btn.classList.add('customized');
      } else {
        btn.textContent = '估值规则设置';
        btn.classList.remove('customized');
      }
    }
    // 页面加载后初始化按钮状态
    (function(){ updateSettingsBtnState(); })();

    // 最近一次按编号查询的商品ID（用于设置保存后重新估价）
    let lastLookupId = '';

    // 估值规则保存后：更新按钮状态并重新估价（根据当前Tab）
    function reevaluateAfterSettings() {
      updateSettingsBtnState();
      if (currentTab === 'paste') {
        doEvaluate();
      } else if (currentTab === 'lookup' && lastLookupId) {
        // 重新查询编号以应用新规则
        document.getElementById('product-id').value = lastLookupId;
        doLookup();
      }
    }

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
      lastLookupId = productId;

      const btn = document.getElementById('lookup-btn');
      btn.disabled = true; btn.textContent = '查询中...';
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '<div class="loading">正在查询商品信息...</div>';

      try {
        const customWeights = (typeof getSavedWeights === 'function') ? getSavedWeights() : null;
        const resp = await fetch('/api/x9k2-find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, customWeights }),
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
        const customWeights = (typeof getSavedWeights === 'function') ? getSavedWeights() : null;
        const resp = await fetch('/api/x9k2-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showTitle: text, priceInCents: price * 100, customWeights }),
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
      summaryHtml += '<button class="adjust-link" id="adjust-link" onclick="openValueSettings(reevaluateAfterSettings)">估值不准？修改规则</button>';
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
      // 显示"估值不准"按钮
      const adjustBtn = document.getElementById('adjust-link');
      if (adjustBtn) adjustBtn.style.display = 'inline-block';
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
// 监控助手页面
// ============================================================
app.get('/monitor', (req, res) => {
  res.send(getMonitorPage());
});

function getMonitorPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>鸣潮监控助手 - 螃蟹网自动监控</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0f0f23; color: #e0e0e0;
    font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    min-height: 100vh; padding: 20px;
  }
  .container { max-width: 800px; margin: 0 auto; }
  .top-nav {
    display: flex; justify-content: center; gap: 0;
    margin-bottom: 8px; padding: 10px 16px;
    background: #12122a; border-radius: 12px; border: 1px solid #1f1f3a;
  }
  .nav-link {
    padding: 8px 24px; font-size: 14px; color: #888;
    text-decoration: none; border-radius: 8px; transition: all 0.2s;
    border: 1px solid transparent;
  }
  .nav-link:hover { color: #ccc; background: rgba(255,255,255,0.04); }
  .nav-link.active { color: #4ade80; border-color: #2a4a2a; background: rgba(74,222,128,0.06); font-weight: 600; }
  .header { text-align: center; margin-bottom: 32px; padding: 24px; }
  .header h1 { font-size: 28px; color: #e94560; margin-bottom: 8px; }
  .header .subtitle { color: #888; font-size: 14px; }
  .card {
    background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px;
    padding: 24px; margin-bottom: 20px;
  }
  .card h2 { font-size: 18px; color: #4ade80; margin-bottom: 16px; }
  .feature-list { list-style: none; }
  .feature-list li {
    padding: 10px 0; border-bottom: 1px solid #1f1f3a; font-size: 14px;
    display: flex; align-items: flex-start; gap: 10px;
  }
  .feature-list li:last-child { border-bottom: none; }
  .feature-list li::before { content: '✓'; color: #4ade80; font-weight: bold; flex-shrink: 0; }
  .install-steps { counter-reset: step; }
  .install-steps li {
    list-style: none; padding: 12px 0 12px 40px; position: relative; font-size: 14px; line-height: 1.6;
    border-bottom: 1px solid #1f1f3a;
  }
  .install-steps li::before {
    counter-increment: step; content: counter(step);
    position: absolute; left: 0; top: 12px;
    width: 28px; height: 28px; border-radius: 50%;
    background: #4ade80; color: #0f0f23; font-size: 14px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .download-btn {
    display: inline-block; padding: 14px 32px; border: none; border-radius: 10px;
    background: #4ade80; color: #0f0f23; font-size: 16px; font-weight: 700;
    text-decoration: none; cursor: pointer; transition: all 0.2s; text-align: center;
  }
  .download-btn:hover { background: #22c55e; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
  .download-area { text-align: center; padding: 20px 0; }
  .note { font-size: 12px; color: #666; margin-top: 10px; }
  .ext-link { color: #60a5fa; text-decoration: none; }
  .ext-link:hover { text-decoration: underline; }
  .qq-group-card {
    display: flex; gap: 20px; align-items: center;
    background: #12122a; border-radius: 12px; padding: 20px; margin-top: 20px;
  }
  .qq-group-card .info { flex: 1; }
  .qq-group-card .info h3 { font-size: 15px; color: #4ade80; margin-bottom: 6px; }
  .qq-group-card .info p { font-size: 13px; color: #888; }
  .qr-wrapper {
    flex-shrink: 0; width: 120px; height: 120px; border-radius: 10px;
    overflow: hidden; border: 2px solid #2a2a4a; cursor: pointer; transition: transform 0.2s;
  }
  .qr-wrapper:hover { transform: scale(1.05); }
  .qr-wrapper img { width: 100%; height: 100%; object-fit: cover; }
  .img-overlay {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); z-index: 9999; justify-content: center; align-items: center; cursor: zoom-out;
  }
  .img-overlay.show { display: flex; }
  .img-overlay img { max-width: 90vw; max-height: 90vh; border-radius: 12px; }
  @media (max-width: 600px) {
    .qq-group-card { flex-direction: column; text-align: center; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="top-nav">
      <a class="nav-link" href="/">首页</a>
      <a class="nav-link" href="/wuwa">估价助手</a>
      <a class="nav-link active" href="/monitor">监控助手</a>
    </div>

    <div class="header">
      <h1>鸣潮监控助手</h1>
      <div class="subtitle">螃蟹网鸣潮账号自动监控 + 智能估价 + 实时通知</div>
    </div>

    <div class="card">
      <h2>功能特性</h2>
      <ul class="feature-list">
        <li>自动监控螃蟹网鸣潮账号商品列表，实时发现新上架账号</li>
        <li>智能估价引擎，自动计算每个账号的预估价值和性价比</li>
        <li>多渠道通知推送：企业微信、Server酱、Bark、钉钉机器人、飞书</li>
        <li>支持按角色、黄数、估值、性价比等条件筛选和排序</li>
        <li>自定义估值规则：角色价格、命座溢价、配队溢价、抽数阶梯等</li>
        <li>指定角色监控：设置关注角色，匹配到时立即通知</li>
        <li>降价提醒：已监控的账号降价时自动通知</li>
        <li>数据本地存储，支持暂停/恢复监控，不丢失历史数据</li>
      </ul>
    </div>

    <div class="card">
      <h2>安装步骤</h2>
      <ol class="install-steps">
        <li>安装 <a class="ext-link" href="https://www.tampermonkey.net/" target="_blank">Tampermonkey</a> 浏览器扩展（推荐 Chrome/Edge）</li>
        <li>点击下方"安装监控脚本"按钮，Tampermonkey 会自动弹出安装确认页</li>
        <li>确认安装后，打开 <a class="ext-link" href="https://www.pangxie100.com/game/wuwa" target="_blank">螃蟹网鸣潮账号页面</a></li>
        <li>页面右上角会出现监控面板，点击"开始监控"即可自动运行</li>
        <li>在监控面板的"通知设置"中配置你的通知渠道（如企业微信机器人 webhook）</li>
        <li>在"估值设置"中调整估值规则，让估价更符合你的预期</li>
      </ol>
      <div class="download-area">
        <a class="download-btn" href="/public/crab-monitor.user.js">安装监控脚本</a>
        <div class="note">点击后会自动通过 Tampermonkey 安装，如未弹出请确认已安装 Tampermonkey 扩展</div>
      </div>
    </div>

    <div class="card">
      <h2>通知渠道配置</h2>
      <ul class="feature-list">
        <li><strong>企业微信</strong>：创建企业微信群机器人，复制 webhook 地址填入设置</li>
        <li><strong>Server酱</strong>：注册 sct.ftqq.com，获取 SendKey 填入设置</li>
        <li><strong>Bark</strong>：iOS 下载 Bark App，复制推送地址填入设置</li>
        <li><strong>钉钉</strong>：创建钉钉自定义机器人，复制 webhook 地址填入设置</li>
        <li><strong>飞书</strong>：创建飞书自定义机器人，复制 webhook 地址填入设置</li>
      </ul>
    </div>

    <div class="qq-group-card">
      <div class="info">
        <h3>加入QQ群交流</h3>
        <p>遇到问题或有建议？扫码加入QQ群，获取最新更新和使用帮助</p>
      </div>
      <div class="qr-wrapper" onclick="document.getElementById('img-overlay').classList.add('show')">
        <img src="/public/qq-group.jpg" alt="QQ群二维码" />
      </div>
    </div>
  </div>

  <div class="img-overlay" id="img-overlay" onclick="this.classList.remove('show')">
    <img src="/public/qq-group.jpg" alt="QQ群二维码" />
  </div>
</body>
</html>`;
}

// ============================================================
// IP封禁管理
// ============================================================

app.get('/blocklist', (req, res) => {
  res.send(getBlocklistPage());
});

// 获取封禁列表
app.post('/blocklist/api/list', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  res.json({ success: true, data: blockedIps });
});

// 添加封禁IP
app.post('/blocklist/api/add', (req, res) => {
  const { password, ip } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  const trimIp = (ip || '').trim();
  if (!trimIp) return res.json({ success: false, error: 'IP不能为空' });
  // 简单校验IP格式
  if (!/^[\d.:a-fA-F]+$/.test(trimIp)) {
    return res.json({ success: false, error: 'IP格式不正确' });
  }
  if (blockedIps.includes(trimIp)) {
    return res.json({ success: false, error: '该IP已在封禁列表中' });
  }
  blockedIps.push(trimIp);
  console.log('[Blocklist] 添加封禁IP:', trimIp);
  res.json({ success: true, data: blockedIps });
});

// 移除封禁IP
app.post('/blocklist/api/remove', (req, res) => {
  const { password, ip } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  const trimIp = (ip || '').trim();
  blockedIps = blockedIps.filter(b => b !== trimIp);
  console.log('[Blocklist] 移除封禁IP:', trimIp);
  res.json({ success: true, data: blockedIps });
});

function getBlocklistPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IP封禁管理 - 鸣潮估价助手</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f0f23; color: #e0e0e0; font-family: -apple-system, 'Segoe UI', sans-serif; min-height: 100vh; }
  .login-box { max-width: 400px; margin: 100px auto; background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 32px; }
  .login-box h1 { font-size: 20px; color: #e94560; margin-bottom: 20px; text-align: center; }
  .login-box input { width: 100%; padding: 12px; border: 1px solid #2a2a4a; border-radius: 8px; background: #0f0f23; color: #e0e0e0; font-size: 14px; margin-bottom: 12px; }
  .login-box button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #e94560; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
  .login-box button:hover { background: #c73e54; }
  .login-box .error { color: #ef4444; font-size: 13px; margin-bottom: 8px; display: none; }
  .dashboard { display: none; max-width: 700px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #e94560; }
  .header .logout { color: #888; cursor: pointer; font-size: 13px; }
  .add-bar { display: flex; gap: 10px; margin-bottom: 20px; }
  .add-bar input { flex: 1; padding: 10px 14px; border: 1px solid #2a2a4a; border-radius: 8px; background: #1a1a3a; color: #e0e0e0; font-size: 14px; }
  .add-bar button { padding: 10px 20px; border: none; border-radius: 8px; background: #e94560; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .add-bar button:hover { background: #c73e54; }
  .ip-list { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; overflow: hidden; }
  .ip-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #1f1f3a; }
  .ip-row:last-child { border-bottom: none; }
  .ip-row .ip { font-size: 15px; font-family: monospace; color: #e0e0e0; }
  .ip-row .actions { display: flex; gap: 8px; }
  .ip-row .unblock-btn { padding: 5px 14px; border: 1px solid #ef4444; border-radius: 6px; background: transparent; color: #ef4444; font-size: 12px; cursor: pointer; }
  .ip-row .unblock-btn:hover { background: rgba(239,68,68,0.1); }
  .empty { text-align: center; color: #666; padding: 40px; font-size: 14px; }
  .stats { font-size: 13px; color: #888; margin-bottom: 16px; }
</style>
</head>
<body>
  <div class="login-box" id="login-box">
    <h1>IP封禁管理</h1>
    <div class="error" id="login-error">密码错误</div>
    <input type="password" id="password" placeholder="请输入管理密码" onkeydown="if(event.key==='Enter')doLogin()">
    <button onclick="doLogin()">登录</button>
  </div>

  <div class="dashboard" id="dashboard">
    <div class="header">
      <h1>IP封禁管理</h1>
      <span class="logout" onclick="logout()">退出</span>
    </div>
    <div class="stats" id="stats"></div>
    <div class="add-bar">
      <input type="text" id="new-ip" placeholder="输入要封禁的IP地址，如 1.2.3.4" onkeydown="if(event.key==='Enter')addIp()">
      <button onclick="addIp()">封禁</button>
    </div>
    <div class="ip-list" id="ip-list"></div>
  </div>

<script>
  const savedPw = sessionStorage.getItem('admin_pw');
  if (savedPw) { document.getElementById('password').value = savedPw; doLogin(); }

  async function doLogin() {
    const pw = document.getElementById('password').value.trim();
    if (!pw) return;
    try {
      const resp = await fetch('/blocklist/api/list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const result = await resp.json();
      if (result.success) {
        sessionStorage.setItem('admin_pw', pw);
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        renderList(result.data);
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    } catch (e) {
      document.getElementById('login-error').textContent = '网络错误';
      document.getElementById('login-error').style.display = 'block';
    }
  }

  function logout() { sessionStorage.removeItem('admin_pw'); location.reload(); }

  function renderList(ips) {
    document.getElementById('stats').textContent = '当前共 ' + ips.length + ' 个被封禁IP';
    const list = document.getElementById('ip-list');
    if (ips.length === 0) {
      list.innerHTML = '<div class="empty">暂无封禁IP</div>';
      return;
    }
    list.innerHTML = ips.map(ip =>
      '<div class="ip-row"><span class="ip">' + ip + '</span>' +
      '<div class="actions"><button class="unblock-btn" onclick="removeIp(\\'' + ip + '\\')">解封</button></div></div>'
    ).join('');
  }

  async function addIp() {
    const ip = document.getElementById('new-ip').value.trim();
    if (!ip) return;
    const pw = sessionStorage.getItem('admin_pw');
    try {
      const resp = await fetch('/blocklist/api/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, ip }),
      });
      const result = await resp.json();
      if (result.success) {
        document.getElementById('new-ip').value = '';
        renderList(result.data);
      } else {
        alert(result.error || '操作失败');
      }
    } catch (e) { alert('网络错误'); }
  }

  async function removeIp(ip) {
    if (!confirm('确定解封 ' + ip + ' 吗？')) return;
    const pw = sessionStorage.getItem('admin_pw');
    try {
      const resp = await fetch('/blocklist/api/remove', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, ip }),
      });
      const result = await resp.json();
      if (result.success) { renderList(result.data); }
      else { alert(result.error || '操作失败'); }
    } catch (e) { alert('网络错误'); }
  }
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

/**
 * 初始化应用（数据库连接等）
 * Vercel Serverless 环境调用此函数，不启动 HTTP 监听
 */
function initApp() {
  db.initDb();
  db.ensureTable();
}

// 导出 app 和 initApp（供 Vercel 使用）
module.exports = { app, initApp };

// Railway / 本地环境：启动 HTTP 服务器
if (require.main === module) {
  initApp();
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  鸣潮估价助手 已启动`);
    console.log(`  端口: ${PORT}`);
    console.log(`  访问: http://localhost:${PORT}`);
    console.log(`========================================`);
  });
}
