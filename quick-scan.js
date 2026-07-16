/**
 * 快速扫描脚本 - 使用动态临时目录避免Chrome冲突
 */
const puppeteer = require('puppeteer-core');
const browserScan = require('./browser-scan.js');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TEMP_DIR = '/Users/xyzhu/.trae-cn/work/pxb-quick-' + Date.now();

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('[QuickScan] 启动浏览器...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: TEMP_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  });

  const allCards = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    console.log('[QuickScan] 访问螃蟹网鸣潮账号列表...');
    await page.goto('https://pxb7.com/buy/10302/1', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // 从DOM提取卡片
    const domCards = await page.evaluate(() => {
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
    console.log(`[QuickScan] DOM提取: ${domCards.length} 个卡片`);
    allCards.push(...domCards);

    // 调用API获取更多数据（2页）
    for (let p = 1; p <= 2; p++) {
      try {
        const apiResult = await page.evaluate(async (pn) => {
          try {
            const resp = await fetch('https://api-pc.pxb7.com/api/search/product/v2/selectSearchPageList', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: "",
                gameId: "10302",
                pageIndex: pn,
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
          console.log(`[QuickScan] API第${p}页: ${apiResult.data.list.length} 个账号`);
          for (const item of apiResult.data.list) {
            allCards.push({
              productId: String(item.productId || item.id || ''),
              title: (item.showTitle || item.title || '').substring(0, 300),
              price: item.price ? Math.round(parseInt(item.price) / 100) : 0,
              url: `https://www.pxb7.com/buy/10302/detail?productId=${item.productId || item.id || ''}`,
            });
          }
        } else {
          console.log(`[QuickScan] API第${p}页失败或无数据`);
        }
      } catch (e) {
        console.log(`[QuickScan] API第${p}页异常:`, e.message);
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
    console.log(`[QuickScan] 去重后: ${unique.length} 个账号`);

    // 处理结果
    const result = browserScan.processScanResults(unique, 30);
    console.log(`[QuickScan] 扫描完成: 共 ${result.totalScanned} 个，新账号 ${result.totalNew} 个，高性价比 ${result.totalHot} 个`);

    if (result.totalHot > 0) {
      const notification = browserScan.formatNotification(result.hotAccounts);
      if (notification) {
        console.log('\n' + notification);
      }
    } else {
      console.log(`本次扫描 ${result.totalScanned} 个账号，未发现高性价比账号`);
    }
  } catch (err) {
    console.error('[QuickScan] 扫描失败:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

main();