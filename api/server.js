/**
 * Vercel Serverless 入口
 * 将 Express 应用导出为 Serverless Function
 * 本地开发仍使用 server.js 的 app.listen
 *
 * 注意：文件名必须为 server.js 而非 index.js
 * Vercel 会将 api/index.js 作为 / 路径的默认函数直接调用，
 * 绕过 vercel.json 的 rewrite 规则，导致 FUNCTION_INVOCATION_FAILED
 */

// 加载环境变量（Vercel 自动注入，这里只是兼容本地测试）
if (!process.env.TURSO_URL) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv 不存在则忽略
  }
}

// 复用 server.js 中的 Express app
const { app, initApp } = require('../server');

// 初始化数据库（Vercel Serverless 每次冷启动时执行）
try {
  initApp();
} catch (e) {
  console.error('[Vercel] initApp error:', e.message);
}

// Express 全局错误处理（防止未捕获错误导致 FUNCTION_INVOCATION_FAILED）
app.use((err, req, res, next) => {
  console.error('[Vercel] Express error:', err.message, err.stack);
  if (!res.headersSent) {
    res.status(500).type('text/plain').send('Internal Server Error: ' + err.message);
  }
});

module.exports = app;
