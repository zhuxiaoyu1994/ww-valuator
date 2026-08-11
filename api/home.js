/**
 * 独立的首页 Serverless Function
 * 绕过 Express，直接返回平台页面 HTML
 * 用于解决 Vercel 上 / 路由 FUNCTION_INVOCATION_FAILED 问题
 */

// 复用 server.js 中的 Express app（仅用于首页路由）
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
