/**
 * Cloudflare Worker - 螃蟹网API代理
 * 解决阿里云WAF拦截问题：先访问网站首页获取WAF cookie，再请求API
 */

const ALLOWED_PATHS = [
  '/api/product/web/product/detailPost',
  '/api/search/product/v2/selectSearchPageList',
  '/api/search/product/selectSelledList',
];

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Origin': 'https://www.pxb7.com',
  'Referer': 'https://www.pxb7.com/',
};

// 缓存WAF cookie（Worker全局复用，避免每次都访问首页）
let cachedCookies = '';
let cookieExpiry = 0;

async function getWAFCookie() {
  // cookie未过期则直接复用
  if (cachedCookies && Date.now() < cookieExpiry) {
    return cachedCookies;
  }

  try {
    // 访问网站首页，让WAF设置cookie
    const homeResp = await fetch('https://www.pxb7.com/', {
      method: 'GET',
      headers: {
        'User-Agent': HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': HEADERS['Accept-Language'],
      },
      redirect: 'manual',
    });

    // 从响应头提取Set-Cookie
    const setCookies = homeResp.headers.getAll ? homeResp.headers.getAll('set-cookie') : [];
    // 手动提取（兼容旧API）
    let cookies = '';
    const rawHeaders = [...homeResp.headers.entries()];
    // Cloudflare Workers的fetch不暴露set-cookie，尝试用cf properties
    // 如果无法获取cookie，改用另一种方式：直接带首页请求的redirect chain

    if (cookies) {
      cachedCookies = cookies;
      cookieExpiry = Date.now() + 300000; // 5分钟有效
      return cookies;
    }

    // 如果首页没有触发WAF（直接返回200），说明CF Worker IP未被WAF拦截
    // 那WAF拦截可能是针对API请求本身的
    // 尝试直接请求API，用cf redirect:follow让Worker自动处理WAF重定向
    return '';
  } catch (e) {
    return '';
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const targetPath = url.searchParams.get('path');

    if (!targetPath || !ALLOWED_PATHS.includes(targetPath)) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let body;
    try {
      body = await request.text();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = 'https://api-pc.pxb7.com' + targetPath;

    // 方案1: 先GET网站首页（获取cookie），再POST API
    // CF Worker的fetch会自动管理cookie jar
    const maxRetries = 3;
    let lastData = null;
    let lastStatus = 502;

    for (let i = 0; i < maxRetries; i++) {
      try {
        // 第1次重试前先访问首页（让CF fetch获取WAF cookie）
        if (i === 1) {
          try {
            await fetch('https://www.pxb7.com/', {
              method: 'GET',
              headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            });
          } catch (e) {}
          await new Promise(r => setTimeout(r, 500));
        }

        // 第2次重试前访问API的GET方式（有些WAF要求先GET再POST）
        if (i === 2) {
          try {
            await fetch(targetUrl, {
              method: 'GET',
              headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': 'https://www.pxb7.com/',
              },
            });
          } catch (e) {}
          await new Promise(r => setTimeout(r, 500));
        }

        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: HEADERS,
          body: body,
          redirect: 'follow',
        });

        const data = await resp.text();

        // 检测WAF拦截
        if (data.indexOf('aliyun_waf') >= 0 || data.indexOf('_waf_') >= 0) {
          if (i < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }

        lastData = data;
        lastStatus = resp.status;
        break;
      } catch (e) {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        lastData = JSON.stringify({ error: 'Proxy error: ' + e.message });
        lastStatus = 502;
      }
    }

    return new Response(lastData, {
      status: lastStatus,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
