/**
 * monitor.js - 监控核心
 * 负责调用螃蟹网 API 获取鸣潮账号列表和详情，用估值引擎计算性价比
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const valueEngine = require('./value-engine');
const notify = require('./notify');

// ============================================================
// 常量配置
// ============================================================
const DATA_DIR = path.join(__dirname, 'data');
const SEEN_FILE = path.join(DATA_DIR, 'seen-accounts.json');
const HOT_FILE = path.join(DATA_DIR, 'hot-accounts.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const API_BASE = 'api-pc.pxb7.com';
// 新 API 端点 (旧端点 /api/product/web/product/selectSearchPageList 已失效)
const LIST_API_PATH = '/api/search/product/v2/selectSearchPageList';
const DETAIL_API_PATH = '/api/product/web/product/detailPost';
const DETAIL_URL_BASE = 'https://www.pxb7.com/buy/10302/detail?productId=';

// 默认请求头（模拟浏览器请求，避免被 WAF 拦截）
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Origin': 'https://www.pxb7.com',
  'Referer': 'https://www.pxb7.com/',
};

// ============================================================
// 运行时状态
// ============================================================
let monitorState = {
  isRunning: false,
  isScanning: false,
  lastScanTime: null,
  lastScanError: null,
  totalScanned: 0,
  totalHot: 0,
  scanCount: 0,
};

// 缓存的配置（可被 server.js 动态更新）
let cachedConfig = null;

// ============================================================
// 配置管理
// ============================================================

/**
 * 加载配置（环境变量覆盖文件配置）
 */
function loadConfig() {
  let fileConfig = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[Monitor] Failed to load config file:', err.message);
  }

  // 环境变量覆盖
  const config = {
    gameId: process.env.GAME_ID || fileConfig.gameId || '10302',
    scanPages: parseInt(process.env.SCAN_PAGES || fileConfig.scanPages || 3, 10),
    pageSize: parseInt(process.env.PAGE_SIZE || fileConfig.pageSize || 20, 10),
    threshold: parseFloat(process.env.THRESHOLD || fileConfig.threshold || 30),
    scanInterval: parseInt(process.env.SCAN_INTERVAL || fileConfig.scanInterval || 300000, 10),
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT || fileConfig.maxConcurrent || 2, 10),
    batchDelay: parseInt(process.env.BATCH_DELAY || fileConfig.batchDelay || 300, 10),
    ...fileConfig,
  };

  cachedConfig = config;
  return config;
}

/**
 * 保存配置到文件
 */
function saveConfig(newConfig) {
  try {
    const merged = { ...cachedConfig, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    cachedConfig = merged;
    return merged;
  } catch (err) {
    console.error('[Monitor] Failed to save config:', err.message);
    return cachedConfig;
  }
}

/**
 * 获取当前配置
 */
function getConfig() {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

// ============================================================
// 数据文件读写
// ============================================================

/**
 * 读取 JSON 数据文件
 */
function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`[Monitor] Failed to read ${path.basename(filePath)}:`, err.message);
  }
  return defaultValue;
}

/**
 * 写入 JSON 数据文件
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[Monitor] Failed to write ${path.basename(filePath)}:`, err.message);
    return false;
  }
}

// ============================================================
// API 调用
// ============================================================

/**
 * 发送 HTTPS POST 请求
 */
function httpsPost(host, apiPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = typeof body === 'string' ? body : JSON.stringify(body);

    const options = {
      hostname: host,
      port: 443,
      path: apiPath,
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        ...headers,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          console.error('[Monitor] Failed to parse API response:', e.message);
          console.error('[Monitor] Raw response (first 500 chars):', data.substring(0, 500));
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Monitor] Request error:', err.message);
      reject(err);
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('API request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 获取账号列表（一页）
 *
 * 注意：螃蟹网 API 的请求参数可能需要调整。
 * 已知参数组合：
 *   1. { gameId: "10302", page: 1, pageSize: 20 }
 *   2. { gameId: "10302", current: 1, size: 20 }
 *   3. 可能需要额外的 sort/filter 参数
 *
 * 如果第一种参数不工作，函数会自动尝试备选参数组合。
 *
 * @param {number} page - 页码（从1开始）
 * @returns {Promise<array>} 账号列表
 */
async function fetchAccountList(page) {
  const config = getConfig();

  // 尝试不同的参数组合
  // 新API参数格式: query, gameId, pageIndex, pageSize, bizProd, type, posType, filterDTOList, combineFilterList
  const paramSets = [
    // 组合1: 新API参数格式
    { query: "", gameId: config.gameId, pageIndex: page, pageSize: config.pageSize, bizProd: 1, type: "4", posType: 1, filterDTOList: [], combineFilterList: [] },
    // 组合2: 简化版本
    { gameId: config.gameId, pageIndex: page, pageSize: config.pageSize },
    // 组合3: 兼容旧参数
    { gameId: config.gameId, page: page, pageSize: config.pageSize },
  ];

  for (let i = 0; i < paramSets.length; i++) {
    try {
      console.log(`[Monitor] Fetching page ${page} (param set ${i + 1})...`);
      const result = await httpsPost(API_BASE, LIST_API_PATH, paramSets[i]);

      if (!result) {
        console.warn(`[Monitor] Empty response for param set ${i + 1}`);
        continue;
      }

      // 尝试从不同的返回结构中提取列表数据
      let list = null;
      if (result.success !== false) {
        if (result.data && result.data.list) {
          list = result.data.list;
        } else if (result.data && result.data.records) {
          list = result.data.records;
        } else if (result.data && Array.isArray(result.data)) {
          list = result.data;
        } else if (result.data && result.data.rows) {
          list = result.data.rows;
        }
      }

      if (list && Array.isArray(list) && list.length > 0) {
        console.log(`[Monitor] Got ${list.length} accounts on page ${page}`);
        return list;
      }

      // 如果 success=true 但列表为空，说明可能是最后一页
      if (result.success === true && !list) {
        console.log(`[Monitor] Page ${page} returned empty list`);
        return [];
      }

      console.warn(`[Monitor] Param set ${i + 1} did not return valid list. Response:`, JSON.stringify(result).substring(0, 300));
    } catch (err) {
      console.error(`[Monitor] Failed to fetch page ${page} with param set ${i + 1}:`, err.message);
    }
  }

  console.warn(`[Monitor] All param sets failed for page ${page}`);
  return [];
}

/**
 * 获取账号详情
 * @param {string} productId - 商品ID
 * @returns {Promise<object|null>} 账号详情
 */
async function fetchAccountDetail(productId) {
  try {
    const result = await httpsPost(API_BASE, DETAIL_API_PATH, { productId });

    if (!result) return null;

    if (result.success !== false && result.data) {
      return result.data;
    }

    console.warn(`[Monitor] Detail API returned non-success for ${productId}:`, result.message || '');
    return null;
  } catch (err) {
    console.error(`[Monitor] Failed to fetch detail for ${productId}:`, err.message);
    return null;
  }
}

// ============================================================
// 并发控制
// ============================================================

/**
 * 批量执行异步任务（控制并发数）
 * @param {array} items - 待处理项
 * @param {function} fn - 处理函数
 * @param {number} concurrency - 并发数
 * @param {number} batchDelay - 批次间隔（毫秒）
 * @returns {Promise<array>} 处理结果数组
 */
async function batchProcess(items, fn, concurrency, batchDelay) {
  const results = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(item => fn(item).catch(err => {
        console.error('[Monitor] Batch item error:', err.message);
        return null;
      }))
    );
    results.push(...batchResults);

    // 批次间延迟（最后一批不需要）
    if (i + concurrency < items.length && batchDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  return results;
}

// ============================================================
// 主扫描函数
// ============================================================

/**
 * 主扫描函数
 * 1. 获取第1-N页账号列表
 * 2. 对每个新账号调用详情API
 * 3. 用 value-engine 计算估值和性价比
 * 4. 性价比 > 阈值的推送到通知列表
 * 5. 保存数据
 */
async function scanAccounts() {
  if (monitorState.isScanning) {
    console.log('[Monitor] Scan already in progress, skipping...');
    return;
  }

  monitorState.isScanning = true;
  const config = getConfig();
  const scanStartTime = new Date();

  console.log(`[Monitor] === Scan #${monitorState.scanCount + 1} started at ${scanStartTime.toISOString()} ===`);

  try {
    // 加载已扫描的账号 ID
    let seenAccounts = readJsonFile(SEEN_FILE, []);
    let seenIds = new Set(seenAccounts.map(a => typeof a === 'string' ? a : a.productId));

    // 加载高性价比账号
    let hotAccounts = readJsonFile(HOT_FILE, []);

    // 1. 获取多页账号列表
    let allAccounts = [];
    for (let page = 1; page <= config.scanPages; page++) {
      const list = await fetchAccountList(page);
      if (list.length === 0) {
        console.log(`[Monitor] No more accounts on page ${page}, stopping pagination.`);
        break;
      }
      allAccounts.push(...list);
      // 页间延迟
      if (page < config.scanPages) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[Monitor] Total accounts fetched: ${allAccounts.length}`);

    // 2. 过滤出新账号
    const newAccounts = allAccounts.filter(acc => {
      const productId = acc.productId || acc.id;
      return productId && !seenIds.has(String(productId));
    });

    console.log(`[Monitor] New accounts to scan: ${newAccounts.length} (already seen: ${allAccounts.length - newAccounts.length})`);

    if (newAccounts.length === 0) {
      console.log('[Monitor] No new accounts found.');
      monitorState.lastScanTime = new Date().toISOString();
      monitorState.lastScanError = null;
      monitorState.scanCount++;
      monitorState.isScanning = false;
      return;
    }

    // 3. 获取详情并估值
    const processAccount = async (account) => {
      const productId = String(account.productId || account.id);
      const listPrice = account.price || 0;

      // 获取详情
      const detail = await fetchAccountDetail(productId);
      if (!detail) {
        console.warn(`[Monitor] No detail for ${productId}, using list data`);
      }

      // showTitle 优先从详情获取，其次从列表
      const showTitle = (detail && detail.showTitle) || account.showTitle || account.title || '';
      // price 优先从详情获取，其次从列表
      const priceInCents = (detail && detail.price) || listPrice || 0;

      if (!showTitle) {
        console.warn(`[Monitor] No showTitle for ${productId}, skipping valuation`);
        return {
          productId,
          showTitle: '',
          priceInCents,
          evaluation: null,
          costPerformance: 0,
          isNew: true,
        };
      }

      // 计算估值
      const evaluation = valueEngine.evaluateWithPrice(showTitle, priceInCents);

      return {
        productId,
        showTitle,
        priceInCents,
        priceInYuan: evaluation.priceInYuan,
        estimatedValue: evaluation.details.finalValue,
        costPerformance: evaluation.costPerformance,
        evaluation: {
          characterValue: evaluation.details.characterValue,
          c6Premium: evaluation.details.c6Premium,
          teamPremium: evaluation.details.teamPremium,
          pullValue: evaluation.details.pullValue,
          resourceValue: evaluation.details.resourceValue,
          yellowMultiplier: evaluation.details.yellowMultiplier,
          characters: evaluation.details.characters,
        },
        info: {
          starSounds: evaluation.info.starSounds,
          moonPhases: evaluation.info.moonPhases,
          coral: evaluation.info.coral,
          goldenRipples: evaluation.info.goldenRipples,
          tideRipples: evaluation.info.tideRipples,
          outfits: evaluation.info.outfits,
          motorcycles: evaluation.info.motorcycles,
          yellowCount: evaluation.info.yellowCount,
        },
        shortDescription: valueEngine.generateShortDescription(evaluation),
        detailUrl: `${DETAIL_URL_BASE}${productId}`,
        scannedAt: new Date().toISOString(),
      };
    };

    // 并发处理（控制并发和批次间隔）
    const results = await batchProcess(
      newAccounts,
      processAccount,
      config.maxConcurrent,
      config.batchDelay
    );

    // 4. 处理结果
    const newSeenEntries = [];
    const newHotAccounts = [];
    let hotCount = 0;

    for (const result of results) {
      if (!result) continue;

      // 添加到已扫描列表
      newSeenEntries.push({
        productId: result.productId,
        scannedAt: result.scannedAt,
        costPerformance: result.costPerformance,
        estimatedValue: result.estimatedValue,
        priceInYuan: result.priceInYuan,
      });

      // 检查是否高性价比
      if (result.costPerformance >= config.threshold && result.estimatedValue > 0) {
        hotCount++;
        newHotAccounts.push(result);

        // 推送通知
        const title = `发现高性价比账号! 估值${result.estimatedValue}元 | 标价${result.priceInYuan}元`;
        const content = formatNotificationContent(result);

        console.log(`[Monitor] HOT ACCOUNT! productId=${result.productId} CP=${result.costPerformance}%`);

        // 异步发送通知（不阻塞扫描）
        notify.sendNotification(title, content).catch(err => {
          console.error('[Monitor] Notification error:', err.message);
        });
      }
    }

    // 5. 保存数据
    seenAccounts.push(...newSeenEntries);
    // 保留最近 5000 条已扫描记录
    if (seenAccounts.length > 5000) {
      seenAccounts = seenAccounts.slice(-5000);
    }
    writeJsonFile(SEEN_FILE, seenAccounts);

    hotAccounts.unshift(...newHotAccounts);
    // 保留最近 500 条高性价比记录
    if (hotAccounts.length > 500) {
      hotAccounts = hotAccounts.slice(0, 500);
    }
    writeJsonFile(HOT_FILE, hotAccounts);

    // 更新状态
    monitorState.totalScanned += newSeenEntries.length;
    monitorState.totalHot += hotCount;
    monitorState.lastScanTime = new Date().toISOString();
    monitorState.lastScanError = null;
    monitorState.scanCount++;

    console.log(`[Monitor] === Scan complete. Scanned ${newSeenEntries.length} new, found ${hotCount} hot accounts ===`);

  } catch (err) {
    console.error('[Monitor] Scan error:', err.message);
    console.error(err.stack);
    monitorState.lastScanError = err.message;
    monitorState.lastScanTime = new Date().toISOString();
    monitorState.scanCount++;
  } finally {
    monitorState.isScanning = false;
  }
}

/**
 * 格式化通知内容
 */
function formatNotificationContent(result) {
  const lines = [];

  lines.push('========================================');
  lines.push(`估值：${result.estimatedValue}元 | 标价：${result.priceInYuan}元`);
  lines.push(`性价比：${result.costPerformance}%`);
  lines.push('');
  lines.push(`角色：${result.shortDescription}`);
  lines.push(`抽数：${result.info.yellowCount}抽`);

  if (result.info.starSounds > 0) lines.push(`星声：${result.info.starSounds}`);
  if (result.info.moonPhases > 0) lines.push(`月相：${result.info.moonPhases}`);
  if (result.info.coral > 0) lines.push(`余波珊瑚：${result.info.coral}`);
  if (result.info.outfits > 0) lines.push(`服饰：${result.info.outfits}件`);
  if (result.info.motorcycles > 0) lines.push(`摩托：${result.info.motorcycles}辆`);

  lines.push('');
  lines.push(`链接：${result.detailUrl}`);
  lines.push('========================================');

  return lines.join('\n');
}

/**
 * 获取监控状态
 */
function getStatus() {
  return {
    ...monitorState,
    config: getConfig(),
    channels: notify.getConfiguredChannels(),
    notificationLog: notify.getNotificationLog(),
  };
}

/**
 * 获取高性价比账号列表
 */
function getHotAccounts(limit = 50) {
  const hotAccounts = readJsonFile(HOT_FILE, []);
  return hotAccounts.slice(0, limit);
}

/**
 * 获取已扫描账号数量
 */
function getSeenCount() {
  const seenAccounts = readJsonFile(SEEN_FILE, []);
  return seenAccounts.length;
}

/**
 * 手动触发扫描
 */
async function triggerScan() {
  if (monitorState.isScanning) {
    return { success: false, message: 'Scan already in progress' };
  }
  // 异步执行，不阻塞响应
  scanAccounts().catch(err => {
    console.error('[Monitor] Manual scan error:', err.message);
  });
  return { success: true, message: 'Scan triggered' };
}

/**
 * 重置数据（清空已扫描记录和高性价比记录）
 */
function resetData() {
  writeJsonFile(SEEN_FILE, []);
  writeJsonFile(HOT_FILE, []);
  monitorState.totalScanned = 0;
  monitorState.totalHot = 0;
  monitorState.scanCount = 0;
  console.log('[Monitor] All data has been reset.');
  return { success: true };
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  scanAccounts,
  getStatus,
  getHotAccounts,
  getSeenCount,
  triggerScan,
  resetData,
  fetchAccountList,
  fetchAccountDetail,
};
