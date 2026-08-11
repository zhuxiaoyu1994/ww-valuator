/**
 * 独立的首页 Serverless Function
 * 直接返回平台页面 HTML，绕过 Express
 * 解决 Vercel 上 / 路由通过 Express 时 FUNCTION_INVOCATION_FAILED 问题
 */

const getPlatformPage = require('../views/platform');

module.exports = (req, res) => {
  try {
    const html = getPlatformPage();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).end(html);
  } catch (e) {
    console.error('[home] Error:', e.message);
    res.status(500).end('Internal Server Error');
  }
};
