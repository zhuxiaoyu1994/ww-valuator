/**
 * Vercel Serverless 入口
 * 将 Express 应用导出为 Vercel Serverless Function
 * 不影响 Railway 部署（Railway 仍使用 server.js 的 app.listen）
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
// server.js 中导出了 app（见底部 module.exports）
const { app, initApp } = require('../server');

// 初始化数据库（Vercel Serverless 每次冷启动时执行）
let initialized = false;
if (!initialized) {
  initApp();
  initialized = true;
}

module.exports = app;
