/**
 * Puppeteer 扫描模块
 * 使用系统 Chrome 通过阿里云 WAF 挑战，调用螃蟹网 API 获取账号数据
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DATA_DIR = path.join(__dirname, 'data');
const COOKIE_FILE = path.join(DATA_DIR, 'pxb-cookies.json');
// TRAE沙箱临时目录，避免Chrome Crashpad文件权限限制
// 动态生成唯一临时目录避免多实例冲突
const TEMP_DIR = '/Users/xyzhu/.trae-cn/work/pxb-scan-' + Date.now();

// 等待指定毫秒
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * 启动浏览器并通过 WAF 挑战
 */
async function getBrowser() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: TEMP_DIR, // 设置userDataDir避免Crashpad权限问题
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  });
  return browser;
}

/**
 * 通过浏览器访问螃蟹网，通过 WAF 挑战，保存 cookies
 */
async function passWAFChallenge() {
  ensureDataDir();
  console.log('[PuppetScan] 启动浏览器通过 WAF 挑战...');
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    // 访问螃蟹网首页，触发 WAF 挑战
    console.log('[PuppetScan] 访问螃蟹网...');
    await page.goto('https://www.pxb7.com/buy/10302', { waitUntil: 'networkidle2', timeout: 30000 });

    // 等待 WAF 挑战完成（页面会自动重载）
    await sleep(3000);

    // 检查是否通过了 WAF
    const title = await page.title();
    console.log('[PuppetScan] 页面标题:', title);

    // 提取 cookies
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    console.log(`[PuppetScan] 保存了 ${cookies.length} 个 cookies`);

    // 同时提取页面上的账号卡片数据
    const cards = await extractCardsFromPage(page);
    console.log(`[PuppetScan] 从页面提取了 ${cards.length} 个账号卡片`);

    await page.close();
    return { cookies, cards };
  } finally {
    await browser.close();
  }
}

/**
 * 从页面提取账号卡片数据
 */
async function extractCardsFromPage(page) {
  return await page.evaluate(() => {
    const cards = [];
    const cardEls = document.querySelectorAll('div[productid]');
    cardEls.forEach(el => {
      const productId = el.getAttribute('productid');
      const titleEl = el.querySelector('.smallCardTitle');
      let price = 0;
      let showTitle = '';
      if (titleEl) {
        const priceAttr = titleEl.getAttribute('price');
        if (priceAttr) price = Math.round(parseInt(priceAttr) / 100);
        const seckillAttr = titleEl.getAttribute('seckillprice') || titleEl.getAttribute('activityprice');
        if (seckillAttr) price = Math.round(parseInt(seckillAttr) / 100);
        showTitle = titleEl.getAttribute('title') || titleEl.textContent || '';
      }
      // 从卡片中找链接
      const link = el.closest('a') || el.querySelector('a[href*="detail"]');
      const href = link ? link.href : '';
      if (productId && showTitle) {
        cards.push({
          productId: String(productId),
          title: showTitle.substring(0, 300),
          price: price,
          url: href || `https://www.pxb7.com/buy/10302/detail?productId=${productId}`,
        });
      }
    });
    return cards;
  });
}

/**
 * 在浏览器中直接调用 API 获取账号列表
 */
async function fetchAccountListViaBrowser(browser, pageNum = 1, pageSize = 20) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    // 先访问页面通过 WAF
    await page.goto('https://www.pxb7.com/buy/10302', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    // 在页面中直接调用 API
    const result = await page.evaluate(async (pn, ps) => {
      try {
        const resp = await fetch('https://api-pc.pxb7.com/api/product/web/product/selectSearchPageList', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: '10302', page: pn, pageSize: ps }),
          credentials: 'include',
        });
        const data = await resp.json();
        return data;
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, pageNum, pageSize);

    return result;
  } finally {
    await page.close();
  }
}

/**
 * 在浏览器中调用详情 API
 */
async function fetchDetailViaBrowser(browser, productId) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://www.pxb7.com/buy/10302', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    const result = await page.evaluate(async (pid) => {
      try {
        const resp = await fetch('https://api-pc.pxb7.com/api/product/web/product/detailPost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: String(pid) }),
          credentials: 'include',
        });
        const data = await resp.json();
        return data;
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, productId);

    return result;
  } finally {
    await page.close();
  }
}

/**
 * 完整扫描：获取多页账号列表 + 提取卡片数据
 * @param {number} maxPages - 最大扫描页数
 * @returns {Array} 账号卡片数据数组
 */
async function scanAccounts(maxPages = 3) {
  console.log(`[PuppetScan] 开始扫描，最多 ${maxPages} 页`);
  const browser = await getBrowser();
  const allCards = [];

  try {
    // 第1页：通过 WAF + 提取 DOM 卡片 + 调用 API
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    console.log('[PuppetScan] 访问第1页...');
    // 使用新版URL格式（末尾/1表示账号分类）
    await page.goto('https://pxb7.com/buy/10302/1', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // 提取 DOM 卡片
    let cards = await extractCardsFromPage(page);
    console.log(`[PuppetScan] 第1页 DOM 提取: ${cards.length} 个卡片`);
    allCards.push(...cards);

    // 尝试通过新版 API 获取更多数据
    // 新端点: /api/search/product/v2/selectSearchPageList
    // 新参数: pageIndex (而非 page), pageSize, bizProd:1, type:"4", posType:1
    for (let p = 1; p <= maxPages; p++) {
      try {
        const apiResult = await page.evaluate(async (pn) => {
          try {
            const resp = await fetch('https://api-pc.pxb7.com/api/search/product/v2/selectSearchPageList', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: "",
                gameId: "10302",
                pageIndex: pn, // 使用 pageIndex 而非 page
                pageSize: 16,
                bizProd: 1,
                type: "4",
                posType: 1,
                filterDTOList: [],
                combineFilterList: []
              }),
              credentials: 'include',
            });
            return await resp.json();
          } catch (e) {
            return { success: false, error: e.message };
          }
        }, p);

        if (apiResult.success && apiResult.data && apiResult.data.list) {
          console.log(`[PuppetScan] API 第${p}页: ${apiResult.data.list.length} 个账号`);
          for (const item of apiResult.data.list) {
            allCards.push({
              productId: String(item.productId || item.id || ''),
              title: (item.showTitle || item.title || '').substring(0, 300),
              price: item.price ? Math.round(parseInt(item.price) / 100) : 0,
              url: `https://www.pxb7.com/buy/10302/detail?productId=${item.productId || item.id || ''}`,
            });
          }
        } else {
          console.log(`[PuppetScan] API 第${p}页失败:`, apiResult.error || JSON.stringify(apiResult).substring(0, 100));
          if (p > 1) break; // 第1页之后失败就停止
        }
      } catch (e) {
        console.log(`[PuppetScan] API 第${p}页异常:`, e.message);
        if (p > 1) break;
      }
    }

    await page.close();

    // 去重
    const seen = new Set();
    const unique = [];
    for (const c of allCards) {
      if (c.productId && !seen.has(c.productId)) {
        seen.add(c.productId);
        unique.push(c);
      }
    }
    console.log(`[PuppetScan] 总计 ${allCards.length} 个卡片，去重后 ${unique.length} 个`);
    return unique;
  } finally {
    await browser.close();
  }
}

module.exports = {
  scanAccounts,
  passWAFChallenge,
  fetchAccountListViaBrowser,
  fetchDetailViaBrowser,
  getBrowser,
  extractCardsFromPage,
  CHROME_PATH,
};
