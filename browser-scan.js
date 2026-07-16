/**
 * 浏览器扫描结果处理模块
 * 被 TRAE 定时任务调用，处理从螃蟹网页面提取的账号数据
 *
 * 工作流程：
 *   1. TRAE 定时任务通过浏览器 MCP 工具访问螃蟹网页面
 *   2. 用 browser_evaluate 提取页面上的账号卡片数据
 *   3. 将卡片数据传入本模块的 processScanResults 函数
 *   4. 本模块调用 value-engine 计算每个账号的估值和性价比
 *   5. 筛选高性价比账号，保存到 data/hot-accounts.json
 *   6. 记录已扫描的 productId 到 data/seen-accounts.json
 *   7. 返回发现的高性价比账号列表，供定时任务发送通知
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ve = require('./value-engine');

// ============================================================
// 常量配置
// ============================================================

const DATA_DIR = path.join(__dirname, 'data');
const SEEN_FILE = path.join(DATA_DIR, 'seen-accounts.json');
const HOT_FILE = path.join(DATA_DIR, 'hot-accounts.json');

// 已扫描账号最大保留数量
const MAX_SEEN_ACCOUNTS = 5000;
// 高性价比账号最大保留数量
const MAX_HOT_ACCOUNTS = 500;

// ============================================================
// 数据目录初始化
// ============================================================

/**
 * 确保 data 目录存在
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('[BrowserScan] data 目录已创建:', DATA_DIR);
    } catch (err) {
      console.error('[BrowserScan] 创建 data 目录失败:', err.message);
    }
  }
}

// ============================================================
// JSON 文件读写（容错处理）
// ============================================================

/**
 * 读取 JSON 文件，文件不存在或解析失败时返回默认值
 * @param {string} filePath - 文件路径
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析后的数据或默认值
 */
function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      // 确保返回的是数组（如果默认值是数组）
      if (Array.isArray(defaultValue) && !Array.isArray(data)) {
        console.warn(`[BrowserScan] ${path.basename(filePath)} 内容不是数组，返回默认值`);
        return defaultValue;
      }
      return data;
    }
  } catch (err) {
    console.error(`[BrowserScan] 读取 ${path.basename(filePath)} 失败:`, err.message);
  }
  return defaultValue;
}

/**
 * 写入 JSON 文件
 * @param {string} filePath - 文件路径
 * @param {*} data - 要写入的数据
 * @returns {boolean} 是否写入成功
 */
function writeJsonFile(filePath, data) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[BrowserScan] 写入 ${path.basename(filePath)} 失败:`, err.message);
    return false;
  }
}

// ============================================================
// 已扫描账号管理
// ============================================================

/**
 * 读取已记录的账号列表
 * @returns {Array} 已扫描账号数组，每项包含 { productId, scannedAt, ... }
 */
function loadSeenAccounts() {
  return readJsonFile(SEEN_FILE, []);
}

/**
 * 保存已记录的账号列表
 * @param {Array} accounts - 账号数组
 */
function saveSeenAccounts(accounts) {
  writeJsonFile(SEEN_FILE, accounts);
}

// ============================================================
// 高性价比账号管理
// ============================================================

/**
 * 读取高性价比账号列表
 * @returns {Array} 高性价比账号数组
 */
function loadHotAccounts() {
  return readJsonFile(HOT_FILE, []);
}

/**
 * 保存高性价比账号列表
 * @param {Array} accounts - 账号数组
 */
function saveHotAccounts(accounts) {
  writeJsonFile(HOT_FILE, accounts);
}

// ============================================================
// 核心处理函数
// ============================================================

/**
 * 处理从浏览器提取的卡片数据
 *
 * @param {Array} cards - 从页面提取的账号卡片数据，每项包含:
 *   - productId: 产品ID（字符串或数字）
 *   - title: 账号标题/描述（用于估值解析的文本）
 *   - price: 价格（元，数字）
 *   - url: 详情页链接（可选，不传则自动生成）
 * @param {number} threshold - 性价比阈值（百分比，默认30）
 *   即 (估值 - 标价) / 标价 * 100 >= threshold 才算高性价比
 * @returns {Object} 处理结果
 *   - newAccounts: 本次扫描的所有新账号（含估值信息）
 *   - hotAccounts: 本次发现的高性价比账号
 *   - totalScanned: 本次扫描的卡片总数
 *   - totalNew: 新账号数量
 *   - totalHot: 高性价比账号数量
 */
function processScanResults(cards, threshold = 30) {
  // 确保数据目录存在
  ensureDataDir();

  // 输入校验
  if (!Array.isArray(cards)) {
    console.warn('[BrowserScan] processScanResults: cards 不是数组，返回空结果');
    return {
      newAccounts: [],
      hotAccounts: [],
      totalScanned: 0,
      totalNew: 0,
      totalHot: 0,
    };
  }

  console.log(`[BrowserScan] 开始处理 ${cards.length} 个卡片数据，性价比阈值: ${threshold}%`);

  // 1. 加载已记录的 productId
  const seenAccounts = loadSeenAccounts();
  const seenIds = new Set(seenAccounts.map(a => {
    if (typeof a === 'string') return a;
    return String(a.productId);
  }));
  console.log(`[BrowserScan] 已记录的账号数: ${seenIds.size}`);

  // 2. 过滤出新账号（productId 不在已记录列表中）
  const newCards = cards.filter(card => {
    if (!card || !card.productId) return false;
    return !seenIds.has(String(card.productId));
  });
  console.log(`[BrowserScan] 新账号数: ${newCards.length} (已跳过 ${cards.length - newCards.length} 个已知账号)`);

  // 3. 对每个新账号计算估值和性价比
  const newAccounts = [];
  const newHotAccounts = [];

  for (const card of newCards) {
    const productId = String(card.productId);
    const title = card.title || card.showTitle || '';
    const price = parseFloat(card.price) || 0; // 价格（元）

    // 构造详情页链接
    const url = card.url || `https://www.pxb7.com/buy/10302/detail?productId=${productId}`;

    // 如果没有标题文本，无法估值，跳过
    if (!title) {
      console.warn(`[BrowserScan] 账号 ${productId} 无标题文本，跳过估值`);
      // 仍然记录到 seen 列表，避免重复处理
      newAccounts.push({
        productId,
        title: '',
        price,
        value: 0,
        ratio: 0,
        url,
        foundAt: new Date().toISOString(),
        skipped: true,
      });
      continue;
    }

    // 调用估值引擎计算性价比
    // 注意：priceInCents = price(元) * 100 转成分
    const priceInCents = Math.round(price * 100);
    const evaluation = ve.evaluateWithPrice(title, priceInCents);

    const value = evaluation.details.finalValue;       // 估值（元）
    const ratio = evaluation.costPerformance;            // 性价比百分比

    const accountData = {
      productId,
      title,
      price,
      value,
      ratio,
      url,
      foundAt: new Date().toISOString(),
    };

    newAccounts.push(accountData);

    // 4. 筛选性价比 >= threshold 的账号
    // 额外条件：估值必须 > 0（避免空账号被误判为高性价比）
    if (ratio >= threshold && value > 0) {
      newHotAccounts.push(accountData);
      console.log(`[BrowserScan] 发现高性价比账号! productId=${productId} 估值=${value}元 标价=${price}元 性价比=${ratio}%`);
    }
  }

  // 5. 更新 seen-accounts.json（添加新 productId，最多保留 MAX_SEEN_ACCOUNTS 个）
  const seenEntriesToAdd = newAccounts.map(acc => ({
    productId: acc.productId,
    scannedAt: acc.foundAt,
    costPerformance: acc.ratio,
    estimatedValue: acc.value,
    priceInYuan: acc.price,
  }));

  seenAccounts.push(...seenEntriesToAdd);
  // 保留最近 MAX_SEEN_ACCOUNTS 条记录（截取末尾部分）
  let updatedSeenAccounts = seenAccounts;
  if (seenAccounts.length > MAX_SEEN_ACCOUNTS) {
    updatedSeenAccounts = seenAccounts.slice(-MAX_SEEN_ACCOUNTS);
    console.log(`[BrowserScan] seen-accounts 已截断至 ${MAX_SEEN_ACCOUNTS} 条`);
  }
  saveSeenAccounts(updatedSeenAccounts);

  // 6. 更新 hot-accounts.json（添加新高性价比账号，最多保留 MAX_HOT_ACCOUNTS 个，按时间倒序）
  const hotAccounts = loadHotAccounts();
  // 新账号插入到开头（时间倒序，最新的在前）
  hotAccounts.unshift(...newHotAccounts);
  let updatedHotAccounts = hotAccounts;
  if (hotAccounts.length > MAX_HOT_ACCOUNTS) {
    updatedHotAccounts = hotAccounts.slice(0, MAX_HOT_ACCOUNTS);
    console.log(`[BrowserScan] hot-accounts 已截断至 ${MAX_HOT_ACCOUNTS} 条`);
  }
  saveHotAccounts(updatedHotAccounts);

  // 7. 返回结果
  const result = {
    newAccounts,
    hotAccounts: newHotAccounts,
    totalScanned: cards.length,
    totalNew: newAccounts.length,
    totalHot: newHotAccounts.length,
  };

  console.log(`[BrowserScan] 处理完成: 扫描 ${result.totalScanned} 个，新账号 ${result.totalNew} 个，高性价比 ${result.totalHot} 个`);

  return result;
}

// ============================================================
// 通知消息生成
// ============================================================

/**
 * 生成通知消息文本
 * @param {Array} hotAccounts - 高性价比账号列表
 * @returns {string|null} 通知消息文本，无高性价比账号时返回 null
 */
function formatNotification(hotAccounts) {
  if (!hotAccounts || hotAccounts.length === 0) return null;

  let msg = `🎯 发现 ${hotAccounts.length} 个高性价比账号！\n\n`;

  // 最多展示前 5 个
  for (const acc of hotAccounts.slice(0, 5)) {
    // 标题截断到 50 个字符
    const shortTitle = acc.title
      ? (acc.title.length > 50 ? acc.title.substring(0, 50) + '...' : acc.title)
      : '(无标题)';
    msg += `📊 ${shortTitle}\n`;
    msg += `💰 估值: ${Math.round(acc.value)}元 | 标价: ${acc.price}元 | 性价比: ${acc.ratio}%\n`;
    msg += `🔗 ${acc.url}\n\n`;
  }

  // 如果超过 5 个，提示还有更多
  if (hotAccounts.length > 5) {
    msg += `...还有 ${hotAccounts.length - 5} 个高性价比账号，详情请查看 data/hot-accounts.json\n`;
  }

  return msg;
}

// ============================================================
// 模块导出
// ============================================================

module.exports = {
  processScanResults,
  formatNotification,
  loadSeenAccounts,
  saveSeenAccounts,
  loadHotAccounts,
  saveHotAccounts,
};
