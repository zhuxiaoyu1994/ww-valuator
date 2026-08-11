/**
 * 独立的首页 Serverless Function
 * 用于测试 Vercel / 路由是否正确重写到此函数
 */

module.exports = (req, res) => {
  // 最简响应测试
  res.status(200).setHeader('Content-Type', 'text/plain').end('HOME_FUNCTION_OK');
};
