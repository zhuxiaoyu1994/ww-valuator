'use strict';

function getNewsPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>角色资讯 - 鸣潮账号估价平台</title>
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
      max-width: 1000px; margin: 0 auto;
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

    /* ===== 分类标签 ===== */
    .category-tabs {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 36px;
      flex-wrap: wrap;
    }
    .cat-tab {
      padding: 8px 18px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 20px;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .cat-tab:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .cat-tab.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #000;
      font-weight: 600;
    }

    /* ===== 文章卡片列表 ===== */
    .news-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .news-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.25s;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }
    .news-card:hover {
      transform: translateY(-3px);
      border-color: var(--border-light);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }
    .news-cover {
      height: 160px;
      background: linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      position: relative;
      overflow: hidden;
    }
    .news-cover::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 30%, rgba(251, 191, 36, 0.1) 0%, transparent 60%);
    }
    .news-tag {
      position: absolute;
      top: 12px; left: 12px;
      padding: 3px 10px;
      background: rgba(251, 191, 36, 0.2);
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      backdrop-filter: blur(4px);
    }
    .news-body {
      padding: 18px 20px 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .news-title {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 8px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .news-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 14px;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .news-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    .news-date { display: flex; align-items: center; gap: 4px; }

    /* 占位提示 */
    .placeholder-section {
      background: var(--bg-card);
      border: 1px dashed var(--border);
      border-radius: 12px;
      padding: 80px 20px;
      text-align: center;
    }
    .placeholder-icon {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: rgba(251, 191, 36, 0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      margin: 0 auto 20px;
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
      .news-grid {
        grid-template-columns: 1fr;
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
        <a href="/wuwa/news" class="nav-link active">角色资讯</a>
        <a href="/wuwa/tips" class="nav-link">买卖攻略</a>
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
      <div class="page-kicker">CHARACTER NEWS</div>
      <h1 class="page-title">角色资讯</h1>
      <p class="page-subtitle">最新角色评测、版本分析、培养攻略，助你了解角色价值走势</p>
      <div class="page-divider"></div>
    </div>

    <!-- 分类标签 -->
    <div class="category-tabs">
      <span class="cat-tab active">全部</span>
      <span class="cat-tab">角色评测</span>
      <span class="cat-tab">版本分析</span>
      <span class="cat-tab">培养攻略</span>
      <span class="cat-tab">节奏榜</span>
    </div>

    <!-- 文章列表 -->
    <div class="placeholder-section">
      <div class="placeholder-icon">📰</div>
      <div class="placeholder-text">资讯内容待补充</div>
      <div class="placeholder-subtext">请将角色资讯的文章列表发给我，我会帮你整理成卡片式布局</div>
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

module.exports = getNewsPageHTML;
