/**
 * Vercel Serverless Function 入口
 * 将 Express app 导出为 Vercel 可识别的处理函数
 */
const app = require('../server');

module.exports = app;
