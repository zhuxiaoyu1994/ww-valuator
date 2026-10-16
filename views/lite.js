'use strict';

function getLitePage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>螃蟹网鸣潮估价助手 - 安装说明</title>
<meta name="description" content="在螃蟹网鸣潮商品列表页直接显示每个账号的估值与性价比。附完整安装步骤。">
<style>
  :root {
    --bg: #08080f;
    --bg-soft: #0d0d1a;
    --card: #101020;
    --card-glass: rgba(15, 15, 29, 0.78);
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.14);
    --text: #e8e8f0;
    --text-dim: #8a8aa0;
    --text-faint: #55556b;
    --accent: #e94560;
    --accent-deep: #c73852;
    --accent-soft: rgba(233, 69, 96, 0.12);
    --accent-glow: rgba(233, 69, 96, 0.35);
    --green: #4ade80;
    --yellow: #eab308;
    --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    --mono: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  .wrap { max-width: 780px; margin: 0 auto; padding: 0 20px 80px; }

  /* 顶部 */
  .nav {
    display: flex; align-items: center; gap: 10px;
    padding: 18px 0 0; margin-bottom: 40px;
  }
  .nav img { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; }
  .nav .name { font-size: 15px; font-weight: 600; }
  .nav .back {
    margin-left: auto; font-size: 13px; color: var(--text-dim);
    text-decoration: none; padding: 6px 14px; border-radius: 8px;
    border: 1px solid var(--border); transition: all .2s;
  }
  .nav .back:hover { color: var(--accent); border-color: var(--accent); }

  /* 头图区 */
  .hero { position: relative; text-align: center; padding: 8px 0 44px; }
  .hero::before {
    content: ''; position: absolute; left: 50%; top: -60px;
    width: 460px; height: 300px; transform: translateX(-50%);
    background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
    opacity: .5; pointer-events: none; z-index: 0;
  }
  .hero > * { position: relative; z-index: 1; }
  .kicker {
    font-family: var(--mono); font-size: 11px; letter-spacing: 4px;
    color: var(--accent); margin-bottom: 14px;
  }
  h1 { font-size: 30px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 14px; }
  .sub { font-size: 15px; color: var(--text-dim); max-width: 560px; margin: 0 auto; }

  /* 卡片通用 */
  .card {
    background: var(--card-glass);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 26px 28px;
    margin-bottom: 18px;
  }

  /* 安装按钮区 */
  .cta { text-align: center; padding: 34px 28px; }
  .btn-install {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 15px 42px; border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent-deep));
    color: #fff; font-size: 16px; font-weight: 600;
    text-decoration: none; border: none; cursor: pointer;
    box-shadow: 0 8px 28px rgba(233, 69, 96, 0.32);
    transition: transform .15s, box-shadow .15s;
  }
  .btn-install:hover { transform: translateY(-2px); box-shadow: 0 12px 34px rgba(233, 69, 96, 0.45); }
  .btn-install:active { transform: translateY(0); }
  .cta .hint { margin-top: 14px; font-size: 12.5px; color: var(--text-faint); }
  .cta .hint code {
    font-family: var(--mono); font-size: 11.5px; color: var(--text-dim);
    background: var(--bg-soft); padding: 2px 7px; border-radius: 5px;
    word-break: break-all;
  }

  /* 步骤 */
  .steps-title {
    font-family: var(--mono); font-size: 11px; letter-spacing: 4px;
    color: var(--text-faint); margin: 40px 0 18px;
  }
  .step { display: flex; gap: 18px; }
  .step-no {
    flex: 0 0 34px; height: 34px; border-radius: 10px;
    background: var(--accent-soft); border: 1px solid rgba(233, 69, 96, 0.3);
    color: var(--accent); font-family: var(--mono); font-size: 14px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .step-body { flex: 1; min-width: 0; }
  .step-body h3 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
  .step-body p { font-size: 14px; color: var(--text-dim); margin-bottom: 8px; }
  .step-body p:last-child { margin-bottom: 0; }
  .step-body a { color: var(--accent); text-decoration: none; }
  .step-body a:hover { text-decoration: underline; }
  .step-body code {
    font-family: var(--mono); font-size: 12.5px; color: var(--text);
    background: var(--bg-soft); padding: 2px 7px; border-radius: 5px;
    word-break: break-all;
  }
  .step + .step { margin-top: 22px; }

  /* 颜色说明 */
  .legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .tag {
    font-size: 12px; padding: 4px 11px; border-radius: 7px;
    border: 1px solid var(--border-strong); color: var(--text-dim);
  }
  .tag b { font-weight: 700; }
  .tag.g b { color: var(--green); }
  .tag.y b { color: var(--yellow); }
  .tag.r b { color: var(--accent); }

  /* 提示框 */
  .notice {
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    border-radius: 0 12px 12px 0;
    padding: 16px 20px; margin-bottom: 18px;
  }
  .notice h4 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .notice ul { list-style: none; }
  .notice li {
    font-size: 13.5px; color: var(--text-dim); padding-left: 16px;
    position: relative; margin-bottom: 5px;
  }
  .notice li:last-child { margin-bottom: 0; }
  .notice li::before {
    content: '·'; position: absolute; left: 4px; color: var(--accent); font-weight: 700;
  }

  /* FAQ */
  .faq-title {
    font-family: var(--mono); font-size: 11px; letter-spacing: 4px;
    color: var(--text-faint); margin: 40px 0 18px;
  }
  .faq { border-bottom: 1px solid var(--border); }
  .faq:last-child { border-bottom: none; }
  .faq summary {
    cursor: pointer; padding: 15px 0; font-size: 14.5px; font-weight: 500;
    list-style: none; display: flex; align-items: center; gap: 10px;
    transition: color .15s;
  }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::before {
    content: '+'; font-family: var(--mono); color: var(--accent);
    font-size: 16px; width: 14px; flex: 0 0 14px;
  }
  .faq[open] summary::before { content: '−'; }
  .faq summary:hover { color: var(--accent); }
  .faq .ans { font-size: 13.5px; color: var(--text-dim); padding: 0 0 16px 24px; }

  .foot {
    text-align: center; font-size: 12px; color: var(--text-faint);
    margin-top: 46px; padding-top: 22px; border-top: 1px solid var(--border);
  }
  .foot a { color: var(--text-dim); text-decoration: none; }
  .foot a:hover { color: var(--accent); }

  @media (max-width: 640px) {
    .wrap { padding: 0 16px 60px; }
    h1 { font-size: 24px; }
    .card { padding: 22px 18px; }
    .btn-install { padding: 14px 28px; font-size: 15px; width: 100%; justify-content: center; }
    .nav .name { font-size: 14px; }
  }
</style>
</head>
<body>
<div class="wrap">

  <div class="nav">
    <img src="/icons/wuwaLogo.jpeg" alt="鸣潮估价助手">
    <span class="name">鸣潮估价助手</span>
    <a class="back" href="/wuwa">网站首页 →</a>
  </div>

  <div class="hero">
    <div class="kicker">PXB7 VALUE HELPER</div>
    <h1>螃蟹网鸣潮估价助手</h1>
    <p class="sub">在螃蟹网的鸣潮商品列表页，直接在每个商品上显示该账号的估算价值和性价比，一眼看出哪些值得入手。</p>
  </div>

  <div class="card cta">
    <a class="btn-install" href="/pxb7-value-lite.user.js">⬇ 安装估价助手</a>
    <p class="hint">点按钮后 Tampermonkey 会自动弹出安装页。没反应的话，把 <code>www.youxigujia.cn/pxb7-value-lite.user.js</code> 粘到地址栏回车。</p>
  </div>

  <div class="steps-title">安装步骤</div>

  <div class="card">
    <div class="step">
      <div class="step-no">1</div>
      <div class="step-body">
        <h3>装好油猴插件</h3>
        <p>这个脚本靠 Tampermonkey（俗称油猴）运行。Chrome、Edge 在浏览器扩展商店搜「Tampermonkey」安装；Firefox 在附加组件商店搜同样的名字。</p>
        <p>已经装过就跳过这步。</p>
      </div>
    </div>
    <div class="step">
      <div class="step-no">2</div>
      <div class="step-body">
        <h3>安装估价助手脚本</h3>
        <p>点上面的「安装估价助手」按钮，油猴会打开一个安装页面，点里面的「安装」就完成了。</p>
        <p>装好之后脚本会自动更新，以后我这边更新功能你不用重新装。</p>
      </div>
    </div>
    <div class="step">
      <div class="step-no">3</div>
      <div class="step-body">
        <h3>填入密钥</h3>
        <p>打开螃蟹网鸣潮列表页：<a href="https://www.pxb7.com/buy/10302/1" target="_blank" rel="noopener">www.pxb7.com/buy/10302/1</a></p>
        <p>页面右下角会出现一个「密钥」按钮，点它，把站长发给你的密钥粘贴进去，确定。</p>
        <p>密钥是一人一把的，有有效期，到期找站长续期即可。</p>
      </div>
    </div>
    <div class="step">
      <div class="step-no">4</div>
      <div class="step-body">
        <h3>开始看估价</h3>
        <p>点右下角的「显示估价」，稍等片刻，每个商品卡片右上角就会显示估算价值和性价比百分比。</p>
        <div class="legend">
          <span class="tag g">性价比 <b>高于 20%</b> · 划算</span>
          <span class="tag y">性价比 <b>0~20%</b> · 一般</span>
          <span class="tag r">性价比 <b>为负</b> · 偏贵</span>
        </div>
      </div>
    </div>
  </div>

  <div class="steps-title">使用须知</div>

  <div class="notice">
    <h4>几点说明</h4>
    <ul>
      <li>必须有密钥才能使用。脚本本身不含任何估值规则，估值由服务器计算，所以密钥才是入口。</li>
      <li>密钥请勿转发他人。发现异常站长可以单独停用某一把密钥，不影响其他人。</li>
      <li>目前仅支持鸣潮，且只在螃蟹网鸣潮列表页生效。</li>
      <li>首次开启估价时需要逐个获取商品信息，商品越多越慢，请耐心等待，中途别关页面。</li>
      <li>估算价值仅供参考，不构成交易建议，实际成交价以你与卖家协商为准。</li>
      <li>本工具为个人开发的第三方辅助工具，与螃蟹网等交易平台、游戏官方均无任何关联，也未获其授权或认可。使用前请自行确认并遵守相关平台规则。</li>
    </ul>
  </div>

  <div class="faq-title">常见问题</div>

  <div class="card">
    <details class="faq">
      <summary>右下角没有「密钥」按钮？</summary>
      <div class="ans">先确认油猴里这个脚本处于启用状态，然后刷新页面。另外脚本只在螃蟹网的鸣潮列表页生效，其他页面不会出现按钮。</div>
    </details>
    <details class="faq">
      <summary>一直显示「估价中」不动？</summary>
      <div class="ans">这是正常的。脚本要逐个获取商品信息并读取完整描述，列表越长耗时越久。等它跑完，或者关掉再重开也可以。若长时间卡住不动，刷新页面重试。</div>
    </details>
    <details class="faq">
      <summary>提示「密钥无效」或「已过期」？</summary>
      <div class="ans">说明密钥不对或者有效期到了。把密钥重新核对一遍，或者找站长续期。到期后脚本会立刻失效，续期后重新填入即可。</div>
    </details>
    <details class="faq">
      <summary>估价和实际成交价差很多？</summary>
      <div class="ans">估价是按账号配置（角色命座、专武精炼、资源等）折算出的参考值，不含卖家主观溢价、平台手续费和议价空间。把它当作筛选工具用，不要当成交价。</div>
    </details>
    <details class="faq">
      <summary>换电脑了需要重新装吗？</summary>
      <div class="ans">需要。脚本装在浏览器里，换电脑或换浏览器都要重新装一次，然后用同一把密钥即可。</div>
    </details>
  </div>

  <div class="foot">
    鸣潮估价助手 · <a href="/wuwa">www.youxigujia.cn</a>
  </div>

</div>
</body>
</html>`;
}

module.exports = getLitePage;
