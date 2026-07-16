/**
 * API扫描脚本 - 使用螃蟹网API扫描账号
 * 不依赖浏览器，直接通过HTTPS请求获取数据
 */

'use strict';

const https = require('https');
const browserScan = require('./browser-scan');

const API_BASE = 'api-pc.pxb7.com';
const LIST_API_PATH = '/api/search/product/v2/selectSearchPageList';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Origin': 'https://www.pxb7.com',
  'Referer': 'https://www.pxb7.com/',
};

/**
 * HTTPS POST请求
 */
function httpsPost(host, apiPath, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);

    const options = {
      hostname: host,
      port: 443,
      path: apiPath,
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          console.error('[API] 解析响应失败:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('请求超时')));
    req.write(postData);
    req.end();
  });
}

/**
 * 获取账号列表（一页）
 */
async function fetchAccountList(page, pageSize = 16) {
  const body = {
    query: "",
    gameId: "10302",
    pageIndex: page,
    pageSize: pageSize,
    bizProd: 1,
    type: "4",
    posType: 1,
    filterDTOList: [],
    combineFilterList: []
  };

  try {
    console.log(`[API] 获取第${page}页...`);
    const result = await httpsPost(API_BASE, LIST_API_PATH, body);

    if (!result) return [];

    if (result.success !== false && result.data && result.data.list) {
      return result.data.list;
    }

    console.warn('[API] 返回数据格式异常:', JSON.stringify(result).substring(0, 300));
    return [];
  } catch (err) {
    console.error('[API] 获取失败:', err.message);
    return [];
  }
}

/**
 * 主扫描函数
 */
async function scan() {
  console.log('[API] 开始扫描螃蟹网鸣潮账号...');

  const allCards = [];
  const maxPages = 3;

  // 扫描多页
  for (let page = 1; page <= maxPages; page++) {
    const list = await fetchAccountList(page);

    if (list.length === 0) {
      console.log(`[API] 第${page}页无数据，停止扫描`);
      break;
    }

    console.log(`[API] 第${page}页获取 ${list.length} 个账号`);

    for (const item of list) {
      const productId = item.productId || item.id;
      if (!productId) continue;

      allCards.push({
        productId: String(productId),
        title: (item.showTitle || item.title || '').substring(0, 300),
        price: item.price ? Math.round(parseInt(item.price) / 100) : 0,
        url: `https://www.pxb7.com/buy/10302/detail?productId=${productId}`,
      });
    }

    // 页间延迟
    if (page < maxPages) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`[API] 共提取 ${allCards.length} 个账号`);

  // 调用估值引擎处理
  const result = browserScan.processScanResults(allCards, 30);

  console.log(`[API] 扫描完成: 共 ${result.totalScanned} 个，新账号 ${result.totalNew} 个，高性价比 ${result.totalHot} 个`);

  if (result.totalHot > 0) {
    const notification = browserScan.formatNotification(result.hotAccounts);
    if (notification) {
      console.log('\n' + notification);
    }
  } else {
    console.log(`本次扫描 ${result.totalScanned} 个账号，未发现高性价比账号`);
  }
}

scan().catch(err => {
  console.error('[API] 扫描失败:', err.message);
  console.error(err.stack);
});