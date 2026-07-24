'use strict';

function getMonitorPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>鸣潮监控助手 - 螃蟹网自动监控</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0f0f23; color: #e0e0e0;
    font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    min-height: 100vh; padding: 20px;
  }
  .container { max-width: 800px; margin: 0 auto; }
  .top-nav {
    display: flex; justify-content: center; gap: 0;
    margin-bottom: 8px; padding: 10px 16px;
    background: #12122a; border-radius: 12px; border: 1px solid #1f1f3a;
  }
  .nav-link {
    padding: 8px 24px; font-size: 14px; color: #888;
    text-decoration: none; border-radius: 8px; transition: all 0.2s;
    border: 1px solid transparent;
  }
  .nav-link:hover { color: #ccc; background: rgba(255,255,255,0.04); }
  .nav-link.active { color: #4ade80; border-color: #2a4a2a; background: rgba(74,222,128,0.06); font-weight: 600; }
  .header { text-align: center; margin-bottom: 32px; padding: 24px; }
  .header h1 { font-size: 28px; color: #e94560; margin-bottom: 8px; }
  .header .subtitle { color: #888; font-size: 14px; }
  .card {
    background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px;
    padding: 24px; margin-bottom: 20px;
  }
  .card h2 { font-size: 18px; color: #4ade80; margin-bottom: 16px; }
  .feature-list { list-style: none; }
  .feature-list li {
    padding: 10px 0; border-bottom: 1px solid #1f1f3a; font-size: 14px;
    display: flex; align-items: flex-start; gap: 10px;
  }
  .feature-list li:last-child { border-bottom: none; }
  .feature-list li::before { content: '✓'; color: #4ade80; font-weight: bold; flex-shrink: 0; }
  .install-steps { counter-reset: step; }
  .install-steps li {
    list-style: none; padding: 12px 0 12px 40px; position: relative; font-size: 14px; line-height: 1.6;
    border-bottom: 1px solid #1f1f3a;
  }
  .install-steps li::before {
    counter-increment: step; content: counter(step);
    position: absolute; left: 0; top: 12px;
    width: 28px; height: 28px; border-radius: 50%;
    background: #4ade80; color: #0f0f23; font-size: 14px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .download-btn {
    display: inline-block; padding: 14px 32px; border: none; border-radius: 10px;
    background: #4ade80; color: #0f0f23; font-size: 16px; font-weight: 700;
    text-decoration: none; cursor: pointer; transition: all 0.2s; text-align: center;
  }
  .download-btn:hover { background: #22c55e; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
  .download-area { text-align: center; padding: 20px 0; }
  .note { font-size: 12px; color: #666; margin-top: 10px; }
  .ext-link { color: #60a5fa; text-decoration: none; }
  .ext-link:hover { text-decoration: underline; }
  .qq-group-card {
    display: flex; gap: 20px; align-items: center;
    background: #12122a; border-radius: 12px; padding: 20px; margin-top: 20px;
  }
  .qq-group-card .info { flex: 1; }
  .qq-group-card .info h3 { font-size: 15px; color: #4ade80; margin-bottom: 6px; }
  .qq-group-card .info p { font-size: 13px; color: #888; }
  .qr-wrapper {
    flex-shrink: 0; width: 120px; height: 120px; border-radius: 10px;
    overflow: hidden; border: 2px solid #2a2a4a; cursor: pointer; transition: transform 0.2s;
  }
  .qr-wrapper:hover { transform: scale(1.05); }
  .qr-wrapper img { width: 100%; height: 100%; object-fit: cover; }
  .img-overlay {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); z-index: 9999; justify-content: center; align-items: center; cursor: zoom-out;
  }
  .img-overlay.show { display: flex; }
  .img-overlay img { max-width: 90vw; max-height: 90vh; border-radius: 12px; }
  @media (max-width: 600px) {
    .qq-group-card { flex-direction: column; text-align: center; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="top-nav">
      <a class="nav-link" href="/">首页</a>
      <a class="nav-link" href="/wuwa">估价助手</a>
      <a class="nav-link active" href="/monitor">监控助手</a>
    </div>

    <div class="header">
      <h1>鸣潮监控助手</h1>
      <div class="subtitle">螃蟹网鸣潮账号自动监控 + 智能估价 + 实时通知</div>
    </div>

    <div class="card">
      <h2>功能特性</h2>
      <ul class="feature-list">
        <li>自动监控螃蟹网鸣潮账号商品列表，实时发现新上架账号</li>
        <li>智能估价引擎，自动计算每个账号的预估价值和性价比</li>
        <li>多渠道通知推送：企业微信、Server酱、Bark、钉钉机器人、飞书</li>
        <li>支持按角色、黄数、估值、性价比等条件筛选和排序</li>
        <li>自定义估值规则：角色价格、命座溢价、配队溢价、抽数阶梯等</li>
        <li>指定角色监控：设置关注角色，匹配到时立即通知</li>
        <li>降价提醒：已监控的账号降价时自动通知</li>
        <li>数据本地存储，支持暂停/恢复监控，不丢失历史数据</li>
      </ul>
    </div>

    <div class="card">
      <h2>安装步骤</h2>
      <ol class="install-steps">
        <li>安装 <a class="ext-link" href="https://www.tampermonkey.net/" target="_blank">Tampermonkey</a> 浏览器扩展（推荐 Chrome/Edge）</li>
        <li>点击下方"安装监控脚本"按钮，Tampermonkey 会自动弹出安装确认页</li>
        <li>确认安装后，打开 <a class="ext-link" href="https://www.pangxie100.com/game/wuwa" target="_blank">螃蟹网鸣潮账号页面</a></li>
        <li>页面右上角会出现监控面板，点击"开始监控"即可自动运行</li>
        <li>在监控面板的"通知设置"中配置你的通知渠道（如企业微信机器人 webhook）</li>
        <li>在"估值设置"中调整估值规则，让估价更符合你的预期</li>
      </ol>
      <div class="download-area">
        <a class="download-btn" href="/public/crab-monitor.user.js">安装监控脚本</a>
        <div class="note">点击后会自动通过 Tampermonkey 安装，如未弹出请确认已安装 Tampermonkey 扩展</div>
      </div>
    </div>

    <div class="card">
      <h2>通知渠道配置</h2>
      <ul class="feature-list">
        <li><strong>企业微信</strong>：创建企业微信群机器人，复制 webhook 地址填入设置</li>
        <li><strong>Server酱</strong>：注册 sct.ftqq.com，获取 SendKey 填入设置</li>
        <li><strong>Bark</strong>：iOS 下载 Bark App，复制推送地址填入设置</li>
        <li><strong>钉钉</strong>：创建钉钉自定义机器人，复制 webhook 地址填入设置</li>
        <li><strong>飞书</strong>：创建飞书自定义机器人，复制 webhook 地址填入设置</li>
      </ul>
    </div>

    <div class="qq-group-card">
      <div class="info">
        <h3>加入QQ群交流</h3>
        <p>遇到问题或有建议？扫码加入QQ群，获取最新更新和使用帮助</p>
      </div>
      <div class="qr-wrapper" onclick="document.getElementById('img-overlay').classList.add('show')">
        <img src="/public/qq-group.jpg" alt="QQ群二维码" />
      </div>
    </div>
  </div>

  <div class="img-overlay" id="img-overlay" onclick="this.classList.remove('show')">
    <img src="/public/qq-group.jpg" alt="QQ群二维码" />
  </div>
</body>
</html>`;
}

module.exports = getMonitorPage;
