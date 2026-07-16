# 螃蟹网鸣潮账号扫描 - TRAE 定时任务执行指令

本文件是给 TRAE 定时任务的详细执行指令，说明如何通过浏览器 MCP 工具扫描螃蟹网（pxb7.com）的鸣潮账号页面，提取账号数据，并调用 `browser-scan.js` 进行估值计算。

---

## 总体流程

1. 用浏览器导航到螃蟹网鸣潮账号列表页
2. 等待页面加载完成
3. 用 `browser_evaluate` 提取页面上的账号卡片数据
4. 翻到下一页继续提取（重复 2-3 页）
5. 调用 `browser-scan.js` 的 `processScanResults` 处理提取的数据
6. 如果发现高性价比账号，输出通知信息

---

## 第一步：导航到目标页面

使用 `browser_navigate` 工具导航到螃蟹网鸣潮账号列表页：

```
目标 URL: https://www.pxb7.com/buy/10302
```

说明：
- `10302` 是鸣潮游戏在螃蟹网的 gameId
- 该页面展示当前在售的鸣潮账号列表

---

## 第二步：等待页面加载

使用 `browser_wait_for` 或等待一段时间，确保页面内容完全加载。

等待策略（按优先级尝试）：
1. 等待账号卡片元素出现（如果能确定选择器）
2. 等待 `networkidle`（网络空闲）
3. 固定等待 3-5 秒

页面加载完成标志：
- 页面上出现账号列表/卡片内容
- 价格信息已渲染

---

## 第三步：提取账号卡片数据

使用 `browser_evaluate` 工具在页面中执行 JavaScript 脚本，提取账号卡片数据。

### 提取脚本

以下脚本会尝试多种选择器组合来提取数据，适配不确定的 DOM 结构：

```javascript
(() => {
  const cards = [];

  // ============================================================
  // 尝试多种选择器找到账号卡片容器
  // 螃蟹网的实际 DOM 结构可能变化，这里用多种选择器兜底
  // ============================================================
  const cardSelectors = [
    '.product-list-item',
    '.account-card',
    '.goods-item',
    '.list-item',
    '[class*="product"]',
    '[class*="goods"]',
    '[class*="card"]',
    '[class*="item"]',
  ];

  // 收集所有可能的卡片元素
  let cardElements = [];
  for (const sel of cardSelectors) {
    const els = document.querySelectorAll(sel);
    if (els && els.length > 0) {
      cardElements = els;
      break;
    }
  }

  // 如果以上选择器都没找到，尝试从列表容器中找子元素
  if (cardElements.length === 0) {
    const listContainers = document.querySelectorAll(
      '.list, .product-list, .goods-list, [class*="list"], [class*="container"]'
    );
    for (const container of listContainers) {
      const children = container.children;
      if (children.length >= 3) {
        // 如果容器有多个子元素，可能是列表
        cardElements = children;
        break;
      }
    }
  }

  // ============================================================
  // 对每个卡片元素提取数据
  // ============================================================
  for (const el of cardElements) {
    // --- 提取标题/描述文本 ---
    const titleSelectors = [
      '.title', '.product-title', '.goods-title',
      '[class*="title"]', '[class*="desc"]', '[class*="name"]',
      'h2', 'h3', 'h4', 'p',
    ];
    let title = '';
    for (const ts of titleSelectors) {
      const titleEl = el.querySelector(ts);
      if (titleEl && titleEl.textContent && titleEl.textContent.trim().length > 5) {
        title = titleEl.textContent.trim();
        break;
      }
    }
    // 如果没找到标题，尝试用整个卡片的文本
    if (!title) {
      const fullText = el.textContent ? el.textContent.trim() : '';
      if (fullText.length > 10) {
        title = fullText;
      }
    }

    // --- 提取价格 ---
    const priceSelectors = [
      '.price', '.product-price', '.goods-price',
      '[class*="price"]', '[class*="amount"]',
    ];
    let price = 0;
    for (const ps of priceSelectors) {
      const priceEl = el.querySelector(ps);
      if (priceEl) {
        const priceText = priceEl.textContent || '';
        // 匹配数字（支持逗号分隔）
        const match = priceText.match(/(\d[\d,]*\.?\d*)/);
        if (match) {
          price = parseFloat(match[1].replace(/,/g, ''));
          if (price > 0) break;
        }
      }
    }

    // --- 提取 productId ---
    let productId = '';
    let url = '';

    // 方法1: 从详情链接中提取
    const linkEl = el.querySelector('a[href*="detail"], a[href*="product"], a[href*="productId"]');
    if (linkEl) {
      const href = linkEl.getAttribute('href') || '';
      url = href.startsWith('http') ? href : (location.origin + href);
      // 从 URL 中提取 productId
      const idMatch = href.match(/productId[=\/]([^&?\/]+)/i) ||
                      href.match(/detail[=\/]([^&?\/]+)/i) ||
                      href.match(/\/(\d{6,})/);
      if (idMatch) {
        productId = idMatch[1];
      }
    }

    // 方法2: 从 data 属性中提取
    if (!productId) {
      productId = el.getAttribute('data-id') ||
                  el.getAttribute('data-product-id') ||
                  el.getAttribute('data-productId') ||
                  el.getAttribute('data-pid') ||
                  '';
    }

    // 方法3: 从整个卡片的 HTML 中搜索 productId
    if (!productId) {
      const html = el.innerHTML || '';
      const idMatch = html.match(/productId[=:]["']?(\d{6,})["']?/i) ||
                      html.match(/["'](\d{10,})["']/);
      if (idMatch) {
        productId = idMatch[1];
      }
    }

    // --- 只有同时包含标题和价格才认为是一个有效的卡片 ---
    if (title && price > 0) {
      cards.push({
        productId: productId || ('unknown_' + cards.length),
        title: title,
        price: price,
        url: url || '',
      });
    }
  }

  // ============================================================
  // 去重（按 productId）
  // ============================================================
  const seen = new Set();
  const uniqueCards = cards.filter(c => {
    if (seen.has(c.productId)) return false;
    seen.add(c.productId);
    return true;
  });

  return uniqueCards;
})();
```

### 关于 DOM 结构不确定的说明

**重要提示：** 螃蟹网（pxb7.com）的实际 DOM 结构可能随时变化，上述脚本使用了多种 CSS 选择器进行兜底尝试。如果提取结果为空或少于预期，请：

1. 用 `browser_evaluate` 执行 `document.querySelector('body').innerHTML.substring(0, 2000)` 查看页面实际 HTML 结构
2. 根据实际 HTML 调整选择器
3. 螃蟹网可能是 Vue/React 单页应用，内容通过 JS 动态渲染，确保等待足够时间让内容加载
4. 可能存在反爬机制，如果页面显示验证码或拦截页面，需要等待或更换策略

---

## 第四步：翻页继续提取

提取完当前页数据后，需要翻到下一页继续提取。

### 翻页策略

1. **查找下一页按钮**：用 `browser_evaluate` 查找分页按钮
2. **直接修改 URL 参数**：尝试 `?page=2` 或 `?current=2`

#### 方法1：点击下一页按钮

```javascript
(() => {
  // 查找下一页按钮
  const nextSelectors = [
    '.next', '.pagination .next', '[class*="next"]',
    'a[rel="next"]', '.ant-pagination-next', '.el-pagination .btn-next',
    'button[aria-label*="next"]', '.page-next',
  ];

  for (const sel of nextSelectors) {
    const btn = document.querySelector(sel);
    if (btn && !btn.classList.contains('disabled') && !btn.disabled) {
      btn.click();
      return { clicked: true, selector: sel };
    }
  }

  return { clicked: false, message: '未找到下一页按钮' };
})();
```

点击后等待 2-3 秒让页面加载，然后重复第三步的提取脚本。

#### 方法2：直接导航到下一页 URL

如果螃蟹网使用 URL 参数分页，可以直接导航：

```
https://www.pxb7.com/buy/10302?page=2
```

或

```
https://www.pxb7.com/buy/10302?current=2
```

### 翻页数量建议

建议扫描 2-3 页即可，每页约 20 个账号。太多页会消耗过多时间，且较旧的账号性价比通常不高。

---

## 第五步：调用 browser-scan.js 处理数据

将所有页面提取的卡片数据合并后，调用 `browser-scan.js` 的 `processScanResults` 函数处理。

### 调用方式

由于 TRAE 定时任务环境无法直接 `require` Node.js 模块，需要通过以下方式之一调用：

#### 方式1：用 RunCommand 执行 Node.js 脚本

将收集到的卡片数据写入临时 JSON 文件，然后用 Node.js 脚本读取并处理：

1. 将卡片数据保存到 `/Users/xyzhu/.trae-cn/work/6a4af5b0289569a1b3a8417e/scan-input.json`
2. 执行处理脚本：
   ```bash
   node -e "
   const bs = require('/Users/xyzhu/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a4af5b0289569a1b3a8417b/鸣潮估价助手/browser-scan.js');
   const fs = require('fs');
   const cards = JSON.parse(fs.readFileSync('/Users/xyzhu/.trae-cn/work/6a4af5b0289569a1b3a8417e/scan-input.json', 'utf-8'));
   const result = bs.processScanResults(cards, 30);
   console.log(JSON.stringify(result, null, 2));
   if (result.hotAccounts.length > 0) {
     console.log(bs.formatNotification(result.hotAccounts));
   } else {
     console.log('本次扫描未发现高性价比账号');
   }
   "
   ```

#### 方式2：创建独立的运行脚本

在项目目录下创建临时运行脚本（放在临时目录），例如 `/Users/xyzhu/.trae-cn/work/6a4af5b0289569a1b3a8417e/run-scan.js`：

```javascript
const fs = require('fs');
const bs = require('/Users/xyzhu/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a4af5b0289569a1b3a8417b/鸣潮估价助手/browser-scan.js');

// 读取浏览器提取的卡片数据
const inputPath = process.argv[2] || '/Users/xyzhu/.trae-cn/work/6a4af5b0289569a1b3a8417e/scan-input.json';
const cards = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// 处理数据，性价比阈值 30%
const result = bs.processScanResults(cards, 30);

// 输出结果摘要
console.log('=== 扫描结果 ===');
console.log(`扫描总数: ${result.totalScanned}`);
console.log(`新账号数: ${result.totalNew}`);
console.log(`高性价比: ${result.totalHot}`);

// 输出通知消息
if (result.totalHot > 0) {
  console.log('\n' + bs.formatNotification(result.hotAccounts));
} else {
  console.log('\n本次扫描未发现高性价比账号');
}
```

然后执行：
```bash
node /Users/xyzhu/.trae-cn/work/6a4af5b0289569a1b3a8417e/run-scan.js /Users/xyzhu/.trae-cn/work/6a4af5b0289569a1b3a8417e/scan-input.json
```

---

## 第六步：输出通知信息

如果 `processScanResults` 返回的 `hotAccounts` 数组不为空，说明发现了高性价比账号。

### 通知内容

使用 `formatNotification` 函数生成的通知消息格式如下：

```
🎯 发现 3 个高性价比账号！

📊 满命椿+专武, 守岸人, 今汐 | 120黄...
💰 估值: 580元 | 标价: 320元 | 性价比: 81%
🔗 https://www.pxb7.com/buy/10302/detail?productId=1234567890

📊 0命忌炎(浩境长留), 守岸人, 维里奈 | 50黄...
💰 估值: 210元 | 标价: 150元 | 性价比: 40%
🔗 https://www.pxb7.com/buy/10302/detail?productId=1234567891

📊 满命卡提希娅+专武, 守岸人, 今汐...
💰 估值: 890元 | 标价: 600元 | 性价比: 48%
🔗 https://www.pxb7.com/buy/10302/detail?productId=1234567892
```

### 输出方式

将通知消息直接输出到定时任务的执行结果中，用户可以在 TRAE 中查看。如果项目配置了通知渠道（Server酱/Bark/钉钉），也可以调用 `notify.js` 发送推送通知。

---

## 完整执行流程示例

以下是 TRAE 定时任务的完整执行流程（伪代码）：

```
1. browser_navigate("https://www.pxb7.com/buy/10302")
2. 等待 3 秒页面加载
3. browser_evaluate(提取脚本) → 得到第1页卡片数据 cards1
4. browser_evaluate(点击下一页) → 翻到第2页
5. 等待 3 秒页面加载
6. browser_evaluate(提取脚本) → 得到第2页卡片数据 cards2
7. browser_evaluate(点击下一页) → 翻到第3页
8. 等待 3 秒页面加载
9. browser_evaluate(提取脚本) → 得到第3页卡片数据 cards3
10. 合并所有卡片数据: allCards = [...cards1, ...cards2, ...cards3]
11. 将 allCards 写入 /Users/xyzhu/.trae-cn/work/6a4af5b0289569a1b3a8417e/scan-input.json
12. 执行 node run-scan.js 处理数据
13. 读取执行结果，输出通知信息
```

---

## 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 扫描页数 | 3 | 每次扫描翻几页 |
| 性价比阈值 | 30% | (估值-标价)/标价*100 >= 30% 才算高性价比 |
| seen-accounts 上限 | 5000 条 | 超过后自动截断保留最近的 |
| hot-accounts 上限 | 500 条 | 超过后自动截断保留最新的 |

---

## 数据文件说明

### data/seen-accounts.json

记录所有已扫描过的账号 productId，避免重复处理。

```json
[
  {
    "productId": "1234567890",
    "scannedAt": "2026-07-13T10:00:00.000Z",
    "costPerformance": 81.25,
    "estimatedValue": 580,
    "priceInYuan": 320
  }
]
```

### data/hot-accounts.json

记录所有发现的高性价比账号（性价比 >= 阈值），按发现时间倒序排列。

```json
[
  {
    "productId": "1234567890",
    "title": "满命椿+专武, 守岸人, 今汐 | 120黄...",
    "price": 320,
    "value": 580,
    "ratio": 81.25,
    "url": "https://www.pxb7.com/buy/10302/detail?productId=1234567890",
    "foundAt": "2026-07-13T10:00:00.000Z"
  }
]
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| productId | string | 螃蟹网产品ID |
| title | string | 账号标题/描述文本（用于估值解析） |
| price | number | 标价（元） |
| value | number | 估值引擎计算的估值（元） |
| ratio | number | 性价比百分比，(估值-标价)/标价*100 |
| url | string | 详情页链接 |
| foundAt | string | 发现时间（ISO 8601 格式） |

---

## 注意事项

1. **DOM 结构可能变化**：螃蟹网的前端可能随时更新，提取脚本中的选择器需要定期维护。如果提取结果异常，先检查页面 HTML 结构。

2. **反爬机制**：螃蟹网可能有 WAF 或频率限制。如果页面返回异常（验证码、403 等），需要降低扫描频率或增加延迟。

3. **页面动态渲染**：螃蟹网可能是 SPA（单页应用），内容通过 JS 动态加载。确保在提取前等待足够时间。

4. **价格单位**：提取的价格是元，`browser-scan.js` 内部会自动 *100 转成分传给估值引擎。

5. **空标题处理**：如果某个账号卡片没有提取到标题文本，该账号会被记录到 seen 列表但不会进行估值计算（标记 `skipped: true`）。

6. **去重逻辑**：`processScanResults` 内部会根据 productId 去重，已扫描过的账号不会重复处理。

7. **数据截断**：seen-accounts 超过 5000 条、hot-accounts 超过 500 条时会自动截断，保留最新的记录。
