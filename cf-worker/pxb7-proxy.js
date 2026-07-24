/**
 * Cloudflare Worker - 螃蟹网API代理
 *
 * 部署步骤：
 * 1. 登录 https://dash.cloudflare.com → Workers & Pages
 * 2. 点击 "Create application" → "Create Worker"
 * 3. 名称填 "pxb7-proxy"，点击 "Deploy"
 * 4. 点击 "Edit code"，将本文件内容粘贴进去
 * 5. 点击 "Save and deploy"
 * 6. 复制 Worker URL（如 https://pxb7-proxy.你的子域.workers.dev）
 * 7. 在 Railway 的环境变量中添加：
 *    PXB7_PROXY_URL = https://pxb7-proxy.你的子域.workers.dev
 */

// 允许的API路径白名单
const ALLOWED_PATHS = [
  '/api/product/web/product/detailPost',
  '/api/search/product/v2/selectSearchPageList',
];

// 请求头模板
const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Origin': 'https://www.pxb7.com',
  'Referer': 'https://www.pxb7.com/',
};

export default {
  async fetch(request, env) {
    // 只允许 POST 请求
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 从查询参数获取目标路径
    const url = new URL(request.url);
    const targetPath = url.searchParams.get('path');

    if (!targetPath || !ALLOWED_PATHS.includes(targetPath)) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 读取请求体
    let body;
    try {
      body = await request.text();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 转发到螃蟹网API
    const targetUrl = 'https://api-pc.pxb7.com' + targetPath;

    try {
      const resp = await fetch(targetUrl, {
        method: 'POST',
        headers: HEADERS,
        body: body,
      });

      const data = await resp.text();

      // 返回结果，添加CORS头（允许你的服务器访问）
      return new Response(data, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + e.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
