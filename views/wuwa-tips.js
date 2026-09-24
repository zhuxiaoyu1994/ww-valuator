'use strict';

function getTipsPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>买卖攻略 - 鸣潮账号估价平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #07070f;
      --bg-card: #0d0d1a;
      --bg-card-hover: #131328;
      --text: #e5e7eb;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --accent: #fbbf24;
      --accent-glow: rgba(251, 191, 36, 0.25);
      --success: #22c55e;
      --danger: #ef4444;
      --border: rgba(255, 255, 255, 0.08);
      --border-light: rgba(255, 255, 255, 0.12);
      --sans: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
      padding-top: 60px;
      line-height: 1.7;
    }
    .container {
      position: relative; z-index: 2;
      max-width: 960px; margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* ===== 背景氛围 ===== */
    .bg-atmos { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
    .bg-orb {
      position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.4;
      animation: orbDrift 20s ease-in-out infinite alternate;
    }
    .bg-orb.a {
      width: 600px; height: 600px;
      background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      top: -200px; right: -100px;
    }
    .bg-orb.b {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
      bottom: 100px; left: -150px;
      animation-delay: -10s;
    }
    .bg-noise {
      position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    @keyframes orbDrift {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(40px, 30px) scale(1.1); }
    }

    /* ===== 顶部导航栏 ===== */
    .top-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      height: 60px;
      background: rgba(10, 10, 20, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      transition: background 0.3s, box-shadow 0.3s;
    }
    .top-nav.scrolled {
      background: rgba(10, 10, 20, 0.92);
      box-shadow: 0 2px 20px rgba(0,0,0,0.3);
    }
    .top-nav-inner {
      max-width: 1200px; margin: 0 auto; height: 100%;
      display: flex; align-items: center; padding: 0 24px;
    }
    .nav-logo {
      display: flex; align-items: center; gap: 10px;
      text-decoration: none; color: #fff;
      font-weight: 700; font-size: 16px;
    }
    .nav-logo img {
      width: 34px; height: 34px; border-radius: 8px;
      object-fit: cover;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .nav-logo span {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .nav-links {
      margin-left: auto;
      display: flex; align-items: center; gap: 4px;
    }
    .nav-link {
      padding: 8px 16px;
      color: #aaa;
      text-decoration: none;
      font-size: 14px;
      border-radius: 6px;
      transition: all 0.2s;
      position: relative;
    }
    .nav-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
    .nav-link.active {
      color: #fbbf24;
      font-weight: 600;
    }
    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: 2px; left: 50%;
      transform: translateX(-50%);
      width: 20px; height: 2px;
      background: #fbbf24;
      border-radius: 1px;
    }

    /* ===== 页面头部 ===== */
    .page-header {
      text-align: center;
      padding: 40px 0 50px;
      position: relative;
    }
    .page-kicker {
      font-size: 12px;
      letter-spacing: 3px;
      color: var(--accent);
      text-transform: uppercase;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .page-title {
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .page-subtitle {
      font-size: 15px;
      color: var(--text-secondary);
      max-width: 560px;
      margin: 0 auto;
    }
    .page-divider {
      width: 40px; height: 3px;
      background: linear-gradient(90deg, var(--accent), transparent);
      margin: 24px auto 0;
      border-radius: 2px;
    }

    /* ===== 双栏卡片 ===== */
    .dual-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 36px;
    }
    .info-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      transition: all 0.25s;
    }
    .info-card:hover {
      border-color: var(--border-light);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    .info-card-icon {
      width: 48px; height: 48px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      margin-bottom: 14px;
    }
    .info-card.buy .info-card-icon { background: rgba(34, 197, 94, 0.15); }
    .info-card.sell .info-card-icon { background: rgba(251, 191, 36, 0.15); }
    .info-card-title {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
    }
    .info-card-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .info-card-link {
      display: inline-block;
      margin-top: 14px;
      font-size: 13px;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }
    .info-card-link:hover { text-decoration: underline; }

    /* ===== 内容区域 ===== */
    .content-wrapper {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 40px;
      align-items: start;
    }

    /* 侧边目录 */
    .side-toc {
      position: sticky;
      top: 80px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 16px;
    }
    .toc-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 12px;
      padding-left: 8px;
    }
    .toc-list { list-style: none; }
    .toc-list li { margin-bottom: 2px; }
    .toc-list a {
      display: block;
      padding: 6px 10px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      border-radius: 6px;
      transition: all 0.2s;
      border-left: 2px solid transparent;
    }
    .toc-list a:hover {
      color: #fff;
      background: rgba(255,255,255,0.04);
      border-left-color: var(--accent);
    }
    .toc-section {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 600;
      letter-spacing: 0.5px;
      padding-left: 8px;
    }
    .toc-section:first-child { margin-top: 0; padding-top: 0; border-top: none; }

    /* 文章内容 */
    .article-content {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 40px;
      min-height: 500px;
    }
    .article-content h2 {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      margin: 32px 0 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .article-content h2:first-child { margin-top: 0; }
    .article-content h3 {
      font-size: 17px;
      font-weight: 600;
      color: #fff;
      margin: 24px 0 10px;
    }
    .article-content p {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 14px;
      line-height: 1.85;
    }
    .article-content ul, .article-content ol {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 12px 0 14px 20px;
      line-height: 1.85;
    }
    .article-content li { margin-bottom: 6px; }
    .article-content strong { color: #fff; font-weight: 600; }
    .article-content .tip-box {
      background: rgba(34, 197, 94, 0.06);
      border-left: 3px solid var(--success);
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    .article-content .tip-box .tip-label {
      color: var(--success);
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .article-content .warn-box {
      background: rgba(239, 68, 68, 0.06);
      border-left: 3px solid var(--danger);
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    .article-content .warn-box .warn-label {
      color: var(--danger);
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 4px;
    }

    /* 占位提示 */
    .placeholder-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
      color: var(--text-muted);
    }
    .placeholder-icon {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: rgba(251, 191, 36, 0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      margin-bottom: 20px;
    }
    .placeholder-text {
      font-size: 15px;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
    .placeholder-subtext {
      font-size: 13px;
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .dual-cards {
        grid-template-columns: 1fr;
      }
      .content-wrapper {
        grid-template-columns: 1fr;
        gap: 24px;
      }
      .side-toc {
        position: static;
      }
      .article-content {
        padding: 24px 20px;
      }
      .page-title { font-size: 28px; }
      .top-nav-inner { padding: 0 16px; }
      .nav-logo span { display: none; }
      .nav-link { padding: 6px 10px; font-size: 13px; }
      .container { padding: 24px 16px 60px; }
    }
  </style>
</head>
<body>
  <!-- 顶部导航栏 -->
  <nav class="top-nav" id="top-nav">
    <div class="top-nav-inner">
      <a href="/wuwa" class="nav-logo">
        <img src="/public/icons/wuwaLogo.jpeg" alt="鸣潮估价">
        <span>游戏估价助手</span>
      </a>
      <div class="nav-links">
        <a href="/wuwa" class="nav-link">估价</a>
        <a href="/wuwa/guide" class="nav-link">使用须知</a>
        <a href="/wuwa/news" class="nav-link">角色资讯</a>
        <a href="/wuwa/tips" class="nav-link active">买卖攻略</a>
      </div>
    </div>
  </nav>

  <!-- 背景 -->
  <div class="bg-atmos">
    <div class="bg-orb a"></div>
    <div class="bg-orb b"></div>
  </div>
  <div class="bg-noise"></div>

  <div class="container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-kicker">TRADING GUIDE</div>
      <h1 class="page-title">买卖攻略</h1>
      <p class="page-subtitle">买号防坑、卖号定价，全方位攻略帮你安全高效地交易</p>
      <div class="page-divider"></div>
    </div>

    <!-- 双栏卡片入口 -->
    <div class="dual-cards">
      <div class="info-card buy">
        <div class="info-card-icon">🛒</div>
        <div class="info-card-title">买号攻略</div>
        <div class="info-card-desc">如何挑选高性价比账号、识别风险账号、交易流程注意事项，避免踩坑被骗</div>
        <a href="#buy-guide" class="info-card-link">查看详情 →</a>
      </div>
      <div class="info-card sell">
        <div class="info-card-icon">💰</div>
        <div class="info-card-title">卖号攻略</div>
        <div class="info-card-desc">账号怎么定价、哪些因素影响账号价值、如何快速出手、平台选择建议</div>
        <a href="#sell-guide" class="info-card-link">查看详情 →</a>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content-wrapper">
      <!-- 侧边目录 -->
      <aside class="side-toc">
        <div class="toc-section">买号指南</div>
        <ul class="toc-list">
          <li><a href="#buy-prepare">买前准备</a></li>
          <li><a href="#buy-pick">如何选号</a></li>
          <li><a href="#buy-risk">风险识别</a></li>
          <li><a href="#buy-process">交易流程</a></li>
          <li><a href="#buy-after">买后必做</a></li>
        </ul>
        <div class="toc-section">卖号指南</div>
        <ul class="toc-list">
          <li><a href="#sell-price">定价技巧</a></li>
          <li><a href="#sell-prepare">账号整理</a></li>
          <li><a href="#sell-platform">平台选择</a></li>
          <li><a href="#sell-tips">快速出手</a></li>
        </ul>
      </aside>

      <!-- 文章内容 -->
      <article class="article-content">
        <div class="placeholder-hint">
          <div class="placeholder-icon">📋</div>
          <div class="placeholder-text">攻略内容待补充</div>
          <div class="placeholder-subtext">请将买卖攻略的内容发给我，我会帮你整理排版</div>
        </div>
      </article>
    </div>
  </div>

  <script>
    // 顶部导航栏滚动效果
    (function() {
      var nav = document.getElementById('top-nav');
      if (!nav) return;
      function onScroll() {
        if (window.scrollY > 20) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();
  </script>
</body>
</html>`;
}

module.exports = getTipsPageHTML;
