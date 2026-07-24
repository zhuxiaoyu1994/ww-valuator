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

// HTML页面模板（从views/目录加载）
const getPlatformPage = require('./views/platform');
const getPageHTML = require('./views/wuwa');
const getMonitorPage = require('./views/monitor');
const getBlocklistPage = require('./views/blocklist');
const getAdminPage = require('./views/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 管理后台密码（可通过环境变量配置）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'guga2024';

// IP黑名单（初始从环境变量加载，运行时可动态增删）
let blockedIps = (process.env.BLOCKED_IPS || '216.195.201.153').split(',').map(s => s.trim()).filter(Boolean);

// 查询日志（内存存储，最多保留1000条）
const queryLogs = [];
const MAX_LOGS = 1000;

// ============================================================
// 查询缓存（LRU + TTL，避免重复请求螃蟹网API）
// ============================================================
const CACHE_TTL = 5 * 60 * 1000;   // 缓存有效期 5 分钟
const CACHE_MAX = 200;              // 最多缓存 200 条
const apiCache = new Map();         // { key: { data, expireAt } }
const cacheStats = { hits: 0, misses: 0, expired: 0 };

function cacheGet(key) {
  const entry = apiCache.get(key);
  if (!entry) { cacheStats.misses++; return null; }
  if (Date.now() > entry.expireAt) {
    apiCache.delete(key);
    cacheStats.expired++;
    return null;
  }
  // LRU: 重新插入到末尾（Map保持插入顺序，删除再添加=移到末尾）
  apiCache.delete(key);
  apiCache.set(key, entry);
  cacheStats.hits++;
  return entry.data;
}

function cacheSet(key, data) {
  if (apiCache.size >= CACHE_MAX) {
    // 删除最旧的条目（Map的第一个元素）
    const oldestKey = apiCache.keys().next().value;
    apiCache.delete(oldestKey);
  }
  apiCache.set(key, { data, expireAt: Date.now() + CACHE_TTL });
}

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
    // 检查缓存（按商品ID缓存商品数据，5分钟内不重复请求螃蟹网API）
    const cacheKey = 'product:' + productId.trim();
    let productData = cacheGet(cacheKey);
    let actualProductId = productId;

    if (productData) {
      // 缓存命中，跳过API请求
      actualProductId = productData.productId || productId;
    } else {
      // 缓存未命中，请求螃蟹网API
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

      // 缓存商品数据（即使为null也缓存，避免重复查询失败的商品）
      if (productData) {
        cacheSet(cacheKey, productData);
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
 * 优先走 Cloudflare Worker 代理（避免服务器IP被封），无配置时直连
 */
const PXB7_PROXY_URL = process.env.PXB7_PROXY_URL || '';

function fetchProductDetail(productId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ productId: String(productId) });
    const apiPath = '/api/product/web/product/detailPost';

    // 走 CF Worker 代理
    if (PXB7_PROXY_URL) {
      const proxyUrl = PXB7_PROXY_URL.replace(/\/$/, '') + '?path=' + encodeURIComponent(apiPath);
      const proxyReq = https.request(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
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
      proxyReq.on('error', (err) => reject(err));
      proxyReq.setTimeout(10000, () => {
        proxyReq.destroy(new Error('请求超时'));
      });
      proxyReq.write(postData);
      proxyReq.end();
      return;
    }

    // 直连螃蟹网（无代理时回退）
    const options = {
      hostname: 'api-pc.pxb7.com',
      port: 443,
      path: apiPath,
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
 * 优先走 Cloudflare Worker 代理，无配置时直连
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
    const apiPath = '/api/search/product/v2/selectSearchPageList';

    // 处理搜索结果的公共逻辑
    function handleSearchResult(data) {
      try {
        const json = JSON.parse(data);
        if (json.success && json.data) {
          const list = Array.isArray(json.data) ? json.data : (json.data.list || []);
          const keywordUpper = String(keyword).toUpperCase();
          let matched = list.find(item =>
            (item.productUniqueNo || '').toUpperCase() === keywordUpper
          );
          if (!matched) {
            matched = list.find(item =>
              (item.productUniqueNo || '').toUpperCase().includes(keywordUpper) ||
              String(item.productId || '').includes(keyword)
            );
          }
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
    }

    // 走 CF Worker 代理
    if (PXB7_PROXY_URL) {
      const proxyUrl = PXB7_PROXY_URL.replace(/\/$/, '') + '?path=' + encodeURIComponent(apiPath);
      const proxyReq = https.request(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => handleSearchResult(data));
      });
      proxyReq.on('error', (err) => reject(err));
      proxyReq.setTimeout(10000, () => {
        proxyReq.destroy(new Error('请求超时'));
      });
      proxyReq.write(postData);
      proxyReq.end();
      return;
    }

    // 直连螃蟹网（无代理时回退）
    const options = {
      hostname: 'api-pc.pxb7.com',
      port: 443,
      path: apiPath,
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
      res.on('end', () => handleSearchResult(data));
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
// ============================================================
// 监控助手页面
// ============================================================
app.get('/monitor', (req, res) => {
  res.send(getMonitorPage());
});

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

// 管理后台API - 缓存统计
app.post('/admin/api/cache-stats', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  const total = cacheStats.hits + cacheStats.misses;
  res.json({
    success: true,
    data: {
      size: apiCache.size,
      maxSize: CACHE_MAX,
      ttl: CACHE_TTL,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      expired: cacheStats.expired,
      hitRate: total > 0 ? (cacheStats.hits / total * 100).toFixed(1) + '%' : '0%',
    },
  });
});

// 管理后台API - 清空缓存
app.post('/admin/api/cache-clear', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  const cleared = apiCache.size;
  apiCache.clear();
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.expired = 0;
  res.json({ success: true, data: { cleared } });
});

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
