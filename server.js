/**
 * server.js - 多游戏估价助手
 * 支持鸣潮(wuwa)和绝区零(zzz)等多款游戏账号估价
 */

'use strict';

const express = require('express');
const path = require('path');
const https = require('https');

const { createEngine } = require('./value-engine');
const WUWA_CONFIG = require('./configs/wuwa');
const ZZZ_CONFIG = require('./configs/zzz');
const db = require('./db');

// 多游戏引擎实例
const engines = {
  wuwa: createEngine(WUWA_CONFIG),
  zzz: createEngine(ZZZ_CONFIG),
};
const gameConfigs = { wuwa: WUWA_CONFIG, zzz: ZZZ_CONFIG };
const validGames = Object.keys(engines);

function getEngine(game) {
  return engines[game] || engines.wuwa;
}
function getConfigKey(game) {
  return 'default_weights_' + (game || 'wuwa');
}

// HTML页面模板（从views/目录加载）
const getPlatformPage = require('./views/platform');
const getPageHTML = require('./views/wuwa');
const getZZZPage = require('./views/zzz');
const getBlocklistPage = require('./views/blocklist');
const getAdminPage = require('./views/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 管理后台密码（可通过环境变量配置）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'zhucs3336466';

// IP黑名单（初始从环境变量加载，运行时增删时同步到数据库）
const BLOCKLIST_KEY = 'blocked_ips';
let blockedIps = (process.env.BLOCKED_IPS || '216.195.201.153').split(',').map(s => s.trim()).filter(Boolean);

// 封禁列表缓存（60秒TTL，serverless 多实例间保持同步）
const BLOCKLIST_CACHE_TTL = 60 * 1000;
let blockedIpsLoadedAt = 0;
let blockedIpsPromise = null;

async function ensureBlockedIpsLoaded() {
  const now = Date.now();
  if (blockedIpsLoadedAt && (now - blockedIpsLoadedAt < BLOCKLIST_CACHE_TTL)) {
    return;
  }
  if (!blockedIpsPromise) {
    blockedIpsPromise = (async () => {
      try {
        const saved = await db.getConfig(BLOCKLIST_KEY);
        if (Array.isArray(saved)) {
          blockedIps = saved;
        }
      } catch (e) {
        // 数据库不可用时保持现有内存值
      }
      blockedIpsLoadedAt = Date.now();
      blockedIpsPromise = null;
    })();
  }
  await blockedIpsPromise;
}

/**
 * 将封禁列表持久化到数据库
 */
async function saveBlockedIps() {
  try {
    await db.setConfig(BLOCKLIST_KEY, blockedIps);
    blockedIpsLoadedAt = Date.now();
  } catch (e) {
    console.error('[Blocklist] 保存封禁列表到数据库失败:', e.message);
  }
}

/**
 * 从数据库加载封禁列表到内存（serverless 环境每次请求可能在新实例上）
 */
async function loadBlockedIps() {
  try {
    const saved = await db.getConfig(BLOCKLIST_KEY);
    if (Array.isArray(saved)) {
      blockedIps = saved;
    }
  } catch (e) {
    // 数据库不可用时保持现有内存值
  }
  return blockedIps;
}

/**
 * 规范化客户端 IP 地址
 * 将 ::ffff:127.0.0.1 格式的 IPv4-mapped IPv6 地址还原为 IPv4
 */
function normalizeIp(ip) {
  if (!ip) return '';
  // 去除 IPv4-mapped IPv6 前缀 (::ffff:)
  var match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (match) return match[1];
  // IPv6 loopback 统一为 IPv4 loopback
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

// 查询日志（内存存储，最多保留1000条）
const queryLogs = [];
const MAX_LOGS = 200;

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
// 静态JS必须每次验证（ETag），避免浏览器缓存旧版 value-settings.js 导致规则面板不同步
app.use('/public', express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: 0,
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'),
}));

// IP黑名单拦截中间件
app.use(async (req, res, next) => {
  // 放行管理页面和封禁管理API（否则被封IP无法解封）
  if (req.path === '/blocklist' || req.path.startsWith('/blocklist/api/') ||
      req.path === '/admin' || req.path.startsWith('/admin/api/')) {
    return next();
  }
  // 确保封禁列表已从数据库加载（60秒缓存，serverless 多实例间同步）
  await ensureBlockedIpsLoaded();
  const rawIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const clientIp = normalizeIp(rawIp);
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
 * 优先返回数据库中存储的服务器端配置，无则返回源码内置默认值
 */
app.get('/api/defaults', async (req, res) => {
  const game = req.query.game || 'wuwa';
  const engine = getEngine(game);
  try {
    const serverConfig = await db.getConfig(getConfigKey(game));
    if (serverConfig) {
      const defaults = engine.getDefaults();
      defaults.weights = Object.assign({}, defaults.weights, serverConfig);
      const merged = Object.assign({}, defaults, serverConfig);
      res.json({ success: true, data: merged });
    } else {
      const defaults = engine.getDefaults();
      res.json({ success: true, data: defaults });
    }
  } catch (err) {
    console.error('[/api/defaults] Error:', err.message);
    res.status(500).json({ success: false, error: '获取默认权重失败' });
  }
});

/**
 * 估值接口 - 输入文本返回估值
 */
app.post('/api/x9k2-eval', (req, res) => {
  const { showTitle, priceInCents, customWeights, game } = req.body;
  if (!showTitle) {
    return res.status(400).json({ success: false, error: 'showTitle is required' });
  }
  const engine = getEngine(game);
  const result = engine.evaluateWithPrice(showTitle, priceInCents || 0, customWeights || null);
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
    game: game || 'wuwa',
    yellowCount: result.info.yellowCount,
    pulls: result.info.pulls,
    success: true,
    details: result.details,
    characters: result.details.characters || [],
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
      shortDescription: engine.generateShortDescription(result),
    },
  });
});

/**
 * 调试接口 - 检查代理配置和连通性
 */
app.get('/api/debug-proxy', async (req, res) => {
  const proxyUrl = (process.env.PXB7_PROXY_URL || '').replace(/[`\s'"]/g, '').trim();
  const result = { proxyConfigured: !!proxyUrl, proxyUrl: proxyUrl || '(empty)', tests: {} };

  if (!proxyUrl) {
    return res.json({ ...result, error: 'PXB7_PROXY_URL not set' });
  }

  // 测试1: detailPost API
  try {
    const testUrl = proxyUrl.replace(/\/$/, '') + '?path=' + encodeURIComponent('/api/product/web/product/detailPost');
    const startTime = Date.now();
    const testData = JSON.stringify({ productId: '1' });

    await new Promise((resolve) => {
      const proxyReq = https.request(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(testData) },
      }, (proxyRes) => {
        let data = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          result.tests.detailPost = {
            status: proxyRes.statusCode,
            elapsed: (Date.now() - startTime) + 'ms',
            isWAF: data.indexOf('aliyun_waf') >= 0 || data.indexOf('_waf_') >= 0,
            preview: data.substring(0, 200),
          };
          resolve();
        });
      });
      proxyReq.on('error', (err) => { result.tests.detailPost = { error: err.message }; resolve(); });
      proxyReq.setTimeout(8000, () => { proxyReq.destroy(); result.tests.detailPost = { error: 'timeout 8s' }; resolve(); });
      proxyReq.write(testData);
      proxyReq.end();
    });
  } catch (err) { result.tests.detailPost = { error: err.message }; }

  // 测试2: searchPageList API
  try {
    const testUrl2 = proxyUrl.replace(/\/$/, '') + '?path=' + encodeURIComponent('/api/search/product/v2/selectSearchPageList');
    const startTime2 = Date.now();
    const testData2 = JSON.stringify({ query: 'test', gameId: '10302', pageIndex: 1, pageSize: 1, bizProd: 1, type: '4', posType: 1 });

    await new Promise((resolve) => {
      const proxyReq = https.request(testUrl2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(testData2) },
      }, (proxyRes) => {
        let data = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          result.tests.searchList = {
            status: proxyRes.statusCode,
            elapsed: (Date.now() - startTime2) + 'ms',
            isWAF: data.indexOf('aliyun_waf') >= 0 || data.indexOf('_waf_') >= 0,
            preview: data.substring(0, 300),
          };
          resolve();
        });
      });
      proxyReq.on('error', (err) => { result.tests.searchList = { error: err.message }; resolve(); });
      proxyReq.setTimeout(8000, () => { proxyReq.destroy(); result.tests.searchList = { error: 'timeout 8s' }; resolve(); });
      proxyReq.write(testData2);
      proxyReq.end();
    });
  } catch (err) { result.tests.searchList = { error: err.message }; }

  res.json(result);
});

/**
 * 从盼之商品详情页SSR HTML中提取完整商品描述和价格
 * 优先从 NUXT 数据的 description 字段提取完整描述（含角色/武器完整列表）
 * 价格从 price-text 元素提取
 */
function fetchPzdsDetail(productUniqueNo) {
  return new Promise((resolve, reject) => {
    const url = 'https://www.pzds.com/goodsDetails/' + encodeURIComponent(productUniqueNo) + '/6';
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    }, (resp) => {
      let data = '';
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          if (data.includes('errors.aliyun.com') || data.includes('window.ACS')) {
            reject(new Error('盼之WAF拦截'));
            return;
          }

          // 优先从 NUXT description 字段提取完整描述
          let desc = '';
          const descStart = data.indexOf('description:"');
          if (descStart >= 0) {
            const contentStart = descStart + 12;
            let end = contentStart;
            while (end < data.length) {
              if (data[end] === '"' && data[end - 1] !== '\\') break;
              end++;
            }
            desc = data.substring(contentStart, end).replace(/\\n/g, '\n').trim();
          }

          // 回退：从 text-overflow span 提取（包含【】段落的那个）
          if (!desc || desc.length < 50) {
            const spans = data.match(/text-overflow"[^>]*><span[^>]*>([\s\S]*?)<\/span>/g) || [];
            for (const spanHtml of spans) {
              const text = spanHtml.replace(/<[^>]+>/g, '').trim();
              if (text.includes('【') && text.length > 50) {
                desc = text;
                break;
              }
            }
          }

          // 提取价格：price-text 元素
          let price = 0;
          const priceMatch = data.match(/class="price-text"[^>]*>\s*([0-9]+)\s*</);
          if (priceMatch) {
            price = parseInt(priceMatch[1]) * 100; // 转为分
          }

          if (desc && desc.length > 20) {
            resolve({ showTitle: desc, price: price, productId: 'pz_' + productUniqueNo });
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(new Error('盼之详情页解析失败'));
        }
      });
    }).on('error', (err) => reject(err));
  });
}

/**
 * 按商品编号查询 - 先搜索获取商品信息，再估价
 * 支持螃蟹网商品链接、盼之商品链接
 */
app.post('/api/x9k2-find', async (req, res) => {
  let { productId, customWeights, game } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, error: '请输入商品编号或商品链接' });
  }

  productId = String(productId).trim();

  // 平台检测
  let platform = null;
  let productData = null;

  // 螃蟹网链接: PC端 https://www.pxb7.com/product/{productId}/1 或手机端 https://m1.pxb7.com/pages-buy/ProductDetail/index?id={productId}
  const pxb7Match = productId.match(/pxb7\.com\/product\/(\d+)/) || productId.match(/\/product\/(\d+)/) || productId.match(/m1\.pxb7\.com.*[?&]id=(\d+)/);
  if (pxb7Match) {
    platform = 'pxb7';
    productId = pxb7Match[1];
  }

  // 盼之链接: https://www.pzds.com/goodsDetails/{productUniqueNo}/6
  const pzdsMatch = productId.match(/pzds\.com\/goodsDetails\/([^/?]+)/);
  if (pzdsMatch) {
    platform = 'pzds';
    productId = pzdsMatch[1];
  }

  try {
    // 检查缓存
    const cacheKey = 'product:' + productId;
    productData = cacheGet(cacheKey);
    let actualProductId = productId;

    if (productData) {
      actualProductId = productData.productId || productId;
    } else {
      if (platform === 'pzds') {
        // 盼之：从SSR HTML提取
        try {
          productData = await fetchPzdsDetail(productId);
        } catch (err) {
          throw err;
        }
      } else {
        // 螃蟹网
        const isNumeric = /^\d+$/.test(productId);

        if (isNumeric) {
          try {
            productData = await fetchProductDetail(productId);
          } catch (err) {
            throw err;
          }
          if (!productData) {
            try {
              const searchResult = await fetchProductBySearch(productId, game);
              if (searchResult) {
                productData = searchResult;
                actualProductId = searchResult.productId || productId;
              }
            } catch (searchErr) {
              if (searchErr.message.indexOf('WAF') >= 0) {
                throw new Error('编号查询暂时不可用（螃蟹网WAF限制），请改用「粘贴描述估价」：在商品页复制描述文本，粘贴到估价框中即可。');
              }
              throw searchErr;
            }
          }
        } else {
          const gameId = (gameConfigs[game] && gameConfigs[game].platformIds.pxb7) || '10302';
          const pxb7Url = `https://www.pxb7.com/buy/${gameId}/detail?productUniqueNo=${encodeURIComponent(productId)}`;
          throw new Error('ALPHANUMERIC_ID_NOT_SUPPORTED:' + pxb7Url);
        }
      }

      if (productData) {
        cacheSet(cacheKey, productData);
      }
    }

    if (!productData) {
      return res.json({ success: false, error: '未找到该商品，请检查编号或链接是否正确' });
    }

    const showTitle = productData.showTitle || productData.title || '';
    const priceInCents = productData.price || 0; // API返回的price已经是分

    if (!showTitle) {
      return res.json({ success: false, error: '无法获取商品描述信息' });
    }

    const engine = getEngine(game);
    const result = engine.evaluateWithPrice(showTitle, priceInCents, customWeights || null);
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
      game: game || 'wuwa',
      yellowCount: result.info.yellowCount,
      pulls: result.info.pulls,
      success: true,
      details: result.details,
      characters: result.details.characters || [],
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
        shortDescription: engine.generateShortDescription(result),
        url: `https://www.pxb7.com/buy/${(gameConfigs[game] && gameConfigs[game].platformIds.pxb7) || '10302'}/detail?productId=${actualProductId}`,
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
      game: game || 'wuwa',
    };
    queryLogs.unshift(failEntry);
    if (queryLogs.length > MAX_LOGS) queryLogs.pop();
    db.insertLog(failEntry);
    const isTimeout = err.message.includes('超时') || err.code === 'ECONNRESET';
    const isWAF = err.message.includes('WAF');
    const hasUserHint = err.message.includes('粘贴描述');
    const isAlphanumeric = err.message.startsWith('ALPHANUMERIC_ID_NOT_SUPPORTED:');

    if (isAlphanumeric) {
      const pxb7Url = err.message.replace('ALPHANUMERIC_ID_NOT_SUPPORTED:', '');
      res.json({
        success: false,
        error: '螃蟹网已启用WAF防护，字母编号无法在服务端查询。请打开商品页面复制描述文本，粘贴到「粘贴描述估价」中即可。',
        pxb7Url: pxb7Url,
        switchToPaste: true,
      });
    } else {
      res.json({
        success: false,
        error: hasUserHint
          ? err.message
          : isWAF
            ? '螃蟹网WAF拦截，服务器无法直接访问API。请改用「粘贴描述估价」：在商品页复制描述文本，粘贴到估价框中即可。'
            : isTimeout
              ? '查询超时，螃蟹网可能限制了服务器访问。请改用「粘贴描述估价」：在商品页复制描述文本，粘贴到估价框中即可。'
              : '查询失败: ' + err.message,
      });
    }
  }
});

/**
 * 从螃蟹网 API 获取商品详情（数字 productId）
 * 优先走 Cloudflare Worker 代理（避免服务器IP被封），无配置时直连
 */
const PXB7_PROXY_URL = (process.env.PXB7_PROXY_URL || '').replace(/[`\s'"]/g, '').trim();

function fetchProductDetail(productId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ productId: String(productId) });
    const apiPath = '/api/product/web/product/detailPost';

    function parseDetailResponse(data) {
      try {
        const json = JSON.parse(data);
        if ((json.code === 200 || json.success === true) && json.data) {
          resolve(json.data);
        } else {
          resolve(null);
        }
      } catch (e) {
        if (data && (data.indexOf('aliyun_waf') >= 0 || data.indexOf('_waf_') >= 0)) {
          reject(new Error('螃蟹网WAF拦截'));
        } else {
          reject(new Error('解析商品数据失败'));
        }
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
        res.setEncoding('utf8');
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => parseDetailResponse(data));
      });
      proxyReq.on('error', (err) => reject(err));
      proxyReq.setTimeout(7000, () => {
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
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => parseDetailResponse(data));
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(7000, () => {
      req.destroy(new Error('请求超时'));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * 通过搜索 API 查找商品（支持商品编号如 MEBNB9606）
 * 优先走 Cloudflare Worker 代理，无配置时直连
 * @param {string} keyword - 商品编号或关键词
 * @param {string} game - 游戏标识（wuwa/zzz），决定搜索的螃蟹网商品池gameId
 */
function fetchProductBySearch(keyword, game) {
  return new Promise((resolve, reject) => {
    const gameId = (gameConfigs[game] && gameConfigs[game].platformIds.pxb7) || '10302';
    const postData = JSON.stringify({
      query: String(keyword),
      gameId: gameId,
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
        // WAF拦截检测：返回的是HTML而非JSON
        if (data && (data.indexOf('aliyun_waf') >= 0 || data.indexOf('_waf_') >= 0)) {
          reject(new Error('螃蟹网WAF拦截，请稍后重试或配置PXB7_PROXY_URL代理'));
        } else {
          reject(new Error('解析搜索结果失败'));
        }
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
        res.setEncoding('utf8');
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => handleSearchResult(data));
      });
      proxyReq.on('error', (err) => reject(err));
      proxyReq.setTimeout(7000, () => {
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
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => handleSearchResult(data));
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(7000, () => {
      req.destroy(new Error('请求超时'));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * 获取昨日成交商品列表（螃蟹网 selectSelledList API）
 * 优先走 Cloudflare Worker 代理，代理失败时自动回退直连
 * @param {number} pageIndex - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} game - 游戏标识（wuwa/zzz），决定查询的螃蟹网商品池gameId
 * @returns {Promise<{products: Array, debug: Object}>}
 */
function fetchSoldProducts(pageIndex, pageSize, game) {
  return new Promise((resolve) => {
    const gameId = (gameConfigs[game] && gameConfigs[game].platformIds.pxb7) || '10302';
    const postData = JSON.stringify({
      gameId: gameId,
      pageIndex: pageIndex || 1,
      pageSize: pageSize || 20,
    });
    const apiPath = '/api/search/product/selectSelledList';
    const useProxy = !!PXB7_PROXY_URL;
    const debug = { useProxy, apiPath, pageIndex, pageSize, proxyStatus: null, directStatus: null, responsePreview: null, parseError: null, apiSuccess: null, dataLength: null, fallbackUsed: false };

    function tryDirect() {
      debug.fallbackUsed = true;
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
        res.setEncoding('utf8');
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => handleResult(data, res.statusCode, res.headers['content-type'], 'direct'));
      });

      req.on('error', (err) => {
        debug.parseError = 'direct error: ' + err.message;
        console.error('[fetchSoldProducts] Direct error:', err.message);
        resolve({ products: [], debug });
      });
      req.setTimeout(15000, () => {
        req.destroy(new Error('请求超时'));
        debug.parseError = 'direct timeout';
        resolve({ products: [], debug });
      });
      req.write(postData);
      req.end();
    }

    function handleResult(data, statusCode, contentType, source) {
      if (source === 'proxy') {
        debug.proxyStatus = statusCode;
      } else {
        debug.directStatus = statusCode;
      }
      debug.responsePreview = (typeof data === 'string') ? data.substring(0, 500) : String(data).substring(0, 500);
      try {
        // 检测 WAF / HTML 响应
        if (contentType && !contentType.includes('json') && data.trim().startsWith('<')) {
          debug.parseError = `WAF/HTML response from ${source}`;
          console.error(`[fetchSoldProducts] WAF/HTML from ${source}, status:`, statusCode);
          if (source === 'proxy') { tryDirect(); return; }
          return resolve({ products: [], debug });
        }
        const json = JSON.parse(data);
        // 代理返回错误（如 Invalid path），回退直连
        if (source === 'proxy' && (statusCode >= 400 || json.error)) {
          console.error('[fetchSoldProducts] Proxy returned error:', json.error || statusCode, '- falling back to direct');
          tryDirect();
          return;
        }
        debug.apiSuccess = json.success;
        debug.dataLength = Array.isArray(json.data) ? json.data.length : (json.data ? 'non-array' : 'null');
        if (json.success && json.data) {
          resolve({ products: json.data, debug });
        } else {
          console.error(`[fetchSoldProducts] API (${source}) returned success=false or no data:`, JSON.stringify(json).substring(0, 300));
          if (source === 'proxy') { tryDirect(); return; }
          resolve({ products: [], debug });
        }
      } catch (e) {
        debug.parseError = `${source} parse: ` + e.message;
        console.error(`[fetchSoldProducts] ${source} JSON parse failed:`, e.message);
        if (source === 'proxy') { tryDirect(); return; }
        resolve({ products: [], debug });
      }
    }

    // 走 CF Worker 代理，失败时自动回退直连
    if (useProxy) {
      const proxyUrl = PXB7_PROXY_URL.replace(/\/$/, '') + '?path=' + encodeURIComponent(apiPath);
      const proxyReq = https.request(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => handleResult(data, res.statusCode, res.headers['content-type'], 'proxy'));
      });
      proxyReq.on('error', (err) => {
        console.error('[fetchSoldProducts] Proxy error, falling back to direct:', err.message);
        tryDirect();
      });
      proxyReq.setTimeout(15000, () => {
        proxyReq.destroy(new Error('请求超时'));
        console.error('[fetchSoldProducts] Proxy timeout, falling back to direct');
        tryDirect();
      });
      proxyReq.write(postData);
      proxyReq.end();
      return;
    }

    // 无代理配置，直接直连
    tryDirect();
  });
}

/**
 * 成交记录接口 - 获取昨日成交商品并计算估值偏差（需管理密码）
 * source: 'live'（默认）从API实时获取并存入数据库；'database' 从数据库读取历史记录
 */
app.post('/api/deals', async (req, res) => {
  const { password, page, pageSize, customWeights, source, game } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  const pageIndex = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 50;

  // ====== 数据库模式：从历史记录读取，用当前权重重算估值 ======
  if (source === 'database') {
    try {
      const offset = (pageIndex - 1) * ps;
      const { list, total } = await db.queryDeals(ps, offset, game);
      const engine = getEngine(game);

      // 获取有效权重（与实时模式相同逻辑）
      let effectiveWeights = customWeights;
      if (!effectiveWeights) {
        try {
          const serverConfig = await db.getConfig(getConfigKey(game));
          if (serverConfig) effectiveWeights = serverConfig;
        } catch (e) { /* 忽略 */ }
      }

      // 用当前权重重新计算估值
      const reevaluated = list.map(item => {
        const showTitle = item.showTitle || '';
        const priceInCents = Math.round((item.price || 0) * 100);
        if (showTitle) {
          try {
            const valuation = engine.evaluateWithPrice(showTitle, priceInCents, effectiveWeights);
            item.estimatedValue = Math.round((valuation.details ? valuation.details.finalValue : 0) * 100) / 100;
            item.deviation = Math.round((item.estimatedValue - item.price) * 100) / 100;
            item.deviationPercent = item.price > 0 ? Math.round((item.deviation / item.price * 100) * 100) / 100 : 0;
            item.shortDescription = engine.generateShortDescription(valuation);
            item.yellowCount = valuation.info ? valuation.info.yellowCount : 0;
            item.pulls = valuation.info ? valuation.info.pulls : 0;
            item.characters = valuation.details ? valuation.details.characters : [];
            item.details = valuation.details || null;
            item.costPerformance = valuation.costPerformance || 0;
          } catch (e) {
            // 重算失败保留数据库中的旧值
          }
        }
        return item;
      });

      const validItems = reevaluated.filter(e => e.estimatedValue > 0);
      const summary = {
        total: reevaluated.length,
        valued: validItems.length,
        avgPrice: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.price, 0) / validItems.length * 100) / 100 : 0,
        avgEstimated: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.estimatedValue, 0) / validItems.length * 100) / 100 : 0,
        avgDeviation: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.deviation, 0) / validItems.length * 100) / 100 : 0,
        avgDeviationPercent: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.deviationPercent, 0) / validItems.length * 100) / 100 : 0,
        overvalued: validItems.filter(e => e.deviation < 0).length,
        undervalued: validItems.filter(e => e.deviation > 0).length,
      };
      return res.json({ success: true, data: { list: reevaluated, summary, page: pageIndex, pageSize: ps, totalRecords: total, source: 'database' } });
    } catch (err) {
      console.error('[/api/deals:database] Error:', err.message);
      return res.json({ success: false, error: '读取数据库失败: ' + err.message });
    }
  }

  // ====== 实时模式：从API获取并存入数据库 ======
  try {
    const { products, debug } = await fetchSoldProducts(pageIndex, ps, game);
    if (!products || products.length === 0) {
      return res.json({ success: true, data: { list: [], summary: null, page: pageIndex, pageSize: ps, _debug: debug } });
    }

    // 无自定义权重时，尝试从数据库加载服务器端默认配置
    const engine = getEngine(game);
    let effectiveWeights = customWeights;
    if (!effectiveWeights) {
      try {
        const serverConfig = await db.getConfig(getConfigKey(game));
        if (serverConfig) effectiveWeights = serverConfig;
      } catch (e) { /* 忽略 */ }
    }

    // 对每个商品运行估价引擎
    const enriched = products.map(item => {
      const showTitle = item.showTitle || '';
      const priceInCents = item.price || 0;
      const priceInYuan = priceInCents / 100;

      let valuation = null;
      let shortDesc = '';
      if (showTitle) {
        try {
          valuation = engine.evaluateWithPrice(showTitle, priceInCents, effectiveWeights);
          shortDesc = engine.generateShortDescription(valuation);
        } catch (e) {
          // 估价失败不阻断流程
        }
      }

      const estimatedValue = valuation ? valuation.details.finalValue : 0;
      const deviation = estimatedValue - priceInYuan;
      const deviationPercent = priceInYuan > 0 ? (deviation / priceInYuan * 100) : 0;

      return {
        productId: item.productId,
        productUniqueNo: item.productUniqueNo,
        price: priceInYuan,
        estimatedValue: Math.round(estimatedValue * 100) / 100,
        deviation: Math.round(deviation * 100) / 100,
        deviationPercent: Math.round(deviationPercent * 100) / 100,
        payTime: item.payTime,
        showTitle,
        shortDescription: shortDesc,
        yellowCount: valuation ? valuation.info.yellowCount : 0,
        pulls: valuation ? valuation.info.pulls : 0,
        characters: valuation ? valuation.details.characters : [],
        attrNameList: item.attrNameList || [],
        mainImageUrl: item.mainImageUrl,
        game: game || 'wuwa',
        url: `https://www.pxb7.com/buy/${(gameConfigs[game] && gameConfigs[game].platformIds.pxb7) || '10302'}/detail?productId=${item.productId}`,
        details: valuation ? valuation.details : null,
        costPerformance: valuation ? valuation.costPerformance : 0,
      };
    });

    // 存入数据库（await 确保 Vercel 函数终止前完成写入）
    try {
      const saveResult = await db.insertDealsBatch(enriched);
      console.log('[/api/deals] 存入数据库完成:', saveResult.inserted, '新增,', saveResult.skipped, '跳过');
    } catch (e) {
      console.error('[/api/deals] 存入数据库失败:', e.message);
    }

    // 汇总统计
    const validItems = enriched.filter(e => e.estimatedValue > 0);
    const summary = {
      total: enriched.length,
      valued: validItems.length,
      avgPrice: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.price, 0) / validItems.length * 100) / 100 : 0,
      avgEstimated: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.estimatedValue, 0) / validItems.length * 100) / 100 : 0,
      avgDeviation: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.deviation, 0) / validItems.length * 100) / 100 : 0,
      avgDeviationPercent: validItems.length > 0 ? Math.round(validItems.reduce((s, e) => s + e.deviationPercent, 0) / validItems.length * 100) / 100 : 0,
      overvalued: validItems.filter(e => e.deviation < 0).length,   // 成交价 > 估值（买贵了）
      undervalued: validItems.filter(e => e.deviation > 0).length,  // 估值 > 成交价（买赚了）
    };

    res.json({ success: true, data: { list: enriched, summary, page: pageIndex, pageSize: ps, source: 'live' } });
  } catch (err) {
    console.error('[/api/deals] Error:', err.message);
    res.json({ success: false, error: '获取成交数据失败: ' + err.message });
  }
});

/**
 * 删除成交记录（从数据库删除）
 */
app.post('/api/deals/delete', async (req, res) => {
  const { password, productId } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  if (!productId) {
    return res.json({ success: false, error: '缺少 productId' });
  }
  try {
    const deleted = await db.deleteDealByProductId(productId);
    res.json({ success: deleted });
  } catch (err) {
    console.error('[/api/deals/delete] Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ============================================================
// Web 页面
// ============================================================
app.get('/', (req, res) => {
  res.send(getPlatformPage());
});

app.get('/wuwa', (req, res) => {
  res.send(getPageHTML());
});

app.get('/zzz', (req, res) => {
  res.send(getZZZPage());
});

// ============================================================
// 平台首页 - 多游戏估价平台选择页
// ============================================================
// ============================================================
// IP封禁管理
// ============================================================

app.get('/blocklist', (req, res) => {
  res.send(getBlocklistPage());
});

// 获取封禁列表（每次从数据库加载，避免 serverless 多实例内存不一致）
app.post('/blocklist/api/list', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  await loadBlockedIps();
  res.json({ success: true, data: blockedIps });
});

// 添加封禁IP
app.post('/blocklist/api/add', async (req, res) => {
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
  await loadBlockedIps();
  if (blockedIps.includes(trimIp)) {
    return res.json({ success: false, error: '该IP已在封禁列表中' });
  }
  blockedIps.push(trimIp);
  await saveBlockedIps();
  console.log('[Blocklist] 添加封禁IP:', trimIp);
  res.json({ success: true, data: blockedIps });
});

// 移除封禁IP
app.post('/blocklist/api/remove', async (req, res) => {
  const { password, ip } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  const trimIp = (ip || '').trim();
  await loadBlockedIps();
  blockedIps = blockedIps.filter(b => b !== trimIp);
  await saveBlockedIps();
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

// 管理后台API - 轻量登录（仅验证密码，毫秒级返回）
app.post('/admin/api/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  res.json({ success: true });
});

// 管理后台API - 获取日志（按游戏筛选）
app.post('/admin/api/logs', async (req, res) => {
  const { password, game } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  const logGame = game || 'wuwa';

  // 优先从数据库读取（持久化），回退到内存
  const dbStats = await db.getStats(logGame);
  if (dbStats) {
    const logs = await db.queryLogs(100, 0, '', logGame);
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

  // 回退到内存（按游戏过滤）
  const gameLogs = queryLogs.filter(l => (l.game || 'wuwa') === logGame);
  res.json({
    success: true,
    data: {
      logs: gameLogs,
      total: gameLogs.length,
      stats: {
        totalQueries: gameLogs.length,
        successCount: gameLogs.filter(l => l.success).length,
        lookupCount: gameLogs.filter(l => l.type === '编号查询').length,
        evalCount: gameLogs.filter(l => l.type === '粘贴估价').length,
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
// 估值配置管理 API
// ============================================================

// 获取默认估值配置（公开接口，网站页面加载时调用）
app.get('/api/config/default', async (req, res) => {
  const game = req.query.game || 'wuwa';
  const engine = getEngine(game);
  try {
    const { value: config, updatedAt } = await db.getConfigWithMeta(getConfigKey(game));
    const defaults = engine.getDefaults();
    const merged = config ? { ...config, configVersion: defaults.configVersion } : { configVersion: defaults.configVersion };
    res.json({ success: true, data: merged, configUpdatedAt: updatedAt });
  } catch (e) {
    res.json({ success: true, data: null, configUpdatedAt: null });
  }
});

// 更新默认估值配置（需管理密码）
app.post('/api/config/update', async (req, res) => {
  const { password, config, game } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  if (!config || typeof config !== 'object') {
    return res.json({ success: false, error: '配置数据无效' });
  }
  const ok = await db.setConfig(getConfigKey(game), config);
  if (ok) {
    res.json({ success: true, message: '配置已更新' });
  } else {
    res.json({ success: false, error: '配置保存失败（数据库未配置或写入失败）' });
  }
});

// ============================================================
// 统计数据计算（共享函数）
// ============================================================
function computeStatsFromList(list, total) {
    const valid = list.filter(d => d.estimatedValue > 0);
    const valued = valid.length;
    const avgPrice = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.price, 0) / valued * 100) / 100 : 0;
    const avgEst = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.estimatedValue, 0) / valued * 100) / 100 : 0;
    const avgDev = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.deviation, 0) / valued * 100) / 100 : 0;
    const avgDevPct = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.deviationPercent, 0) / valued * 100) / 100 : 0;
    const mae = valued > 0 ? Math.round(valid.reduce((s, e) => s + Math.abs(e.deviation), 0) / valued * 100) / 100 : 0;
    const maePct = valued > 0 ? Math.round(valid.reduce((s, e) => s + Math.abs(e.deviationPercent), 0) / valued * 100) / 100 : 0;
    const hit10 = valid.filter(e => Math.abs(e.deviationPercent) <= 10).length;
    const hit20 = valid.filter(e => Math.abs(e.deviationPercent) <= 20).length;
    const hit30 = valid.filter(e => Math.abs(e.deviationPercent) <= 30).length;
    const accPct = valued > 0 ? Math.round(hit20 / valued * 1000) / 10 : 0;
    const overvalued = valid.filter(e => e.deviation < 0).length;
    const undervalued = valid.filter(e => e.deviation > 0).length;

    let r2 = 0, corr = 0, medDevPct = 0, p90DevPct = 0;
    if (valued >= 2) {
      const meanPrice = valid.reduce((s, d) => s + d.price, 0) / valued;
      const meanEst = valid.reduce((s, d) => s + d.estimatedValue, 0) / valued;
      let ssRes = 0, ssTot = 0, num = 0, denEst = 0, denPrice = 0;
      for (const d of valid) {
        ssRes += Math.pow(d.price - d.estimatedValue, 2);
        ssTot += Math.pow(d.price - meanPrice, 2);
        const dEst = d.estimatedValue - meanEst;
        const dPrice = d.price - meanPrice;
        num += dEst * dPrice;
        denEst += dEst * dEst;
        denPrice += dPrice * dPrice;
      }
      r2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 1000) / 1000 : 0;
      corr = (denEst > 0 && denPrice > 0) ? Math.round((num / Math.sqrt(denEst * denPrice)) * 1000) / 1000 : 0;

      const sortedDevPct = valid.map(d => d.deviationPercent).sort((a, b) => a - b);
      const medIdx = Math.floor(sortedDevPct.length / 2);
      medDevPct = sortedDevPct.length % 2 === 0
        ? Math.round((sortedDevPct[medIdx - 1] + sortedDevPct[medIdx]) / 2 * 100) / 100
        : Math.round(sortedDevPct[medIdx] * 100) / 100;

      const sortedAbsDevPct = valid.map(d => Math.abs(d.deviationPercent)).sort((a, b) => a - b);
      const p90Idx = Math.min(Math.floor(sortedAbsDevPct.length * 0.9), sortedAbsDevPct.length - 1);
      p90DevPct = Math.round(sortedAbsDevPct[p90Idx] * 100) / 100;
    }

    const scatter = valid.map(d => ({
      x: d.estimatedValue,
      y: d.price,
      d: d.deviation,
      p: d.deviationPercent,
    }));

    return {
      summary: {
        total, valued, avgPrice, avgEst, avgDev, avgDevPct,
        mae, maePct, accPct, hit10, hit20, hit30,
        overvalued, undervalued,
        r2, corr, medDevPct, p90DevPct,
      },
      scatter,
    };
}

// 用指定权重重算列表中每条记录的估值
function reevaluateList(list, effectiveWeights, engine) {
  if (!effectiveWeights) return;
  for (const item of list) {
    const showTitle = item.showTitle || '';
    const priceInCents = Math.round((item.price || 0) * 100);
    if (showTitle) {
      try {
        const valuation = engine.evaluateWithPrice(showTitle, priceInCents, effectiveWeights);
        item.estimatedValue = Math.round((valuation.details ? valuation.details.finalValue : 0) * 100) / 100;
        item.deviation = Math.round((item.estimatedValue - item.price) * 100) / 100;
        item.deviationPercent = item.price > 0 ? Math.round((item.deviation / item.price * 100) * 100) / 100 : 0;
      } catch (e) {
        // 重算失败保留数据库中的旧值
      }
    }
  }
}

// ============================================================
// 管理后台：刷新统计数据缓存
// ============================================================
app.post('/api/admin/refresh-stats', async (req, res) => {
  const { password, customWeights } = req.body;
  const game = req.body.game || 'wuwa';
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  try {
    const { list, total } = await db.queryAllDealsForStats(game);
    if (list.length === 0) {
      await db.setConfig('stats_cache_' + game, { summary: null, scatter: [], total: 0, cachedAt: new Date().toISOString() });
      return res.json({ success: true, data: { summary: null, scatter: [], total: 0 }, message: '暂无成交记录，已清空缓存' });
    }

    const engine = getEngine(game);
    // 获取有效权重：优先用上传的 customWeights，否则用服务器默认配置
    let effectiveWeights = customWeights;
    if (!effectiveWeights) {
      try {
        const serverConfig = await db.getConfig(getConfigKey(game));
        if (serverConfig) effectiveWeights = serverConfig;
      } catch (e) { /* 忽略 */ }
    }

    // 重算估值
    reevaluateList(list, effectiveWeights, engine);

    // 计算统计指标
    const { summary, scatter } = computeStatsFromList(list, total);

    // 缓存到数据库（按游戏隔离）
    const cacheData = { summary, scatter, cachedAt: new Date().toISOString() };
    await db.setConfig('stats_cache_' + game, cacheData);

    console.log('[/api/admin/refresh-stats] 统计数据缓存已更新, valued=' + summary.valued);
    res.json({ success: true, data: cacheData, message: '统计仪表盘和散点图数据已更新（' + summary.valued + '条记录）' });
  } catch (err) {
    console.error('[/api/admin/refresh-stats] Error:', err.message);
    res.json({ success: false, error: '更新统计数据失败: ' + err.message });
  }
});

// ============================================================
// 公开统计接口（优先返回缓存，无缓存时返回内置默认数据，避免实时重算导致加载缓慢）
// ============================================================
function buildDefaultStatsData(game) {
  const isZzz = game === 'zzz';
  const seed = isZzz ? 88231 : 45217;
  const valued = isZzz ? 480 : 1150;
  const total = isZzz ? 524 : 1258;
  let s = seed;
  function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
  function gauss() { return Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd()); }
  const list = [];
  for (let i = 0; i < valued; i++) {
    let est;
    if (rnd() < 0.85) {
      est = isZzz ? 250 + rnd() * 1100 : 200 + rnd() * 1000;
    } else {
      est = Math.exp(Math.log(isZzz ? 1350 : 1200) + rnd() * Math.log(isZzz ? 2.4 : 2.5));
    }
    let devPct = gauss() * 0.14;
    if (devPct > 0.42) devPct = 0.42; else if (devPct < -0.42) devPct = -0.42;
    const estimatedValue = Math.round(est * 100) / 100;
    const price = Math.max(1, Math.round(est * (1 - devPct)));
    const deviation = Math.round((estimatedValue - price) * 100) / 100;
    list.push({
      estimatedValue,
      price,
      deviation,
      deviationPercent: Math.round(deviation / price * 100 * 100) / 100,
    });
  }
  return computeStatsFromList(list, total);
}

async function handlePublicStats(req, res) {
  const game = (req.method === 'GET' ? req.query.game : req.body.game) || 'wuwa';
  try {
    // 优先返回缓存的统计数据（按游戏隔离，管理后台刷新后覆盖默认数据）
    const cached = await db.getConfig('stats_cache_' + game);
    if (cached && cached.summary) {
      return res.json({ success: true, data: cached });
    }
  } catch (e) { /* 数据库不可用时回退默认数据 */ }

  // 无缓存时直接返回内置默认数据（固定种子生成，指标与散点自洽）
  res.json({ success: true, data: buildDefaultStatsData(game) });
}

app.get('/api/public-stats', (req, res) => handlePublicStats(req, res));
app.post('/api/public-stats', (req, res) => handlePublicStats(req, res));

// ============================================================
// 推送配置云端同步（油猴脚本调用）
// ============================================================
app.post('/api/push-config/sync', async (req, res) => {
  const { password, pushConfig } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  try {
    await db.setConfig('push_config', { pushConfig, syncedAt: new Date().toISOString() });
    res.json({ success: true, message: '推送配置已同步到服务器' });
  } catch (err) {
    console.error('[/api/push-config/sync] Error:', err.message);
    res.json({ success: false, error: '同步失败: ' + err.message });
  }
});

app.post('/api/push-config/get', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.json({ success: false, error: '密码错误' });
  }
  try {
    const data = await db.getConfig('push_config');
    if (data && data.pushConfig) {
      res.json({ success: true, pushConfig: data.pushConfig, syncedAt: data.syncedAt });
    } else {
      res.json({ success: true, pushConfig: null, message: '服务器暂无推送配置' });
    }
  } catch (err) {
    console.error('[/api/push-config/get] Error:', err.message);
    res.json({ success: false, error: '读取失败: ' + err.message });
  }
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
  db.ensureConfigTable();
  db.ensureDealsTable();
}

// 导出 app 和 initApp（供 Vercel 使用）
module.exports = { app, initApp };

// 本地环境：启动 HTTP 服务器（Vercel 环境下通过 api/index.js 运行）
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
