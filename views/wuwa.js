'use strict';

function getPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>鸣潮账号估价 - 游戏账号估价平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #08080f;
      --bg-soft: #0d0d1a;
      --card: #101020;
      --card-glass: rgba(15, 15, 29, 0.78);
      --line: #1e1e33;
      --line-soft: #171729;
      --text: #e8e8f0;
      --text-dim: #8a8aa0;
      --text-faint: #55556b;
      --accent: #e94560;
      --accent-deep: #c73852;
      --accent-soft: rgba(233, 69, 96, 0.12);
      --accent-glow: rgba(233, 69, 96, 0.35);
      --good: #4ade80;
      --warn: #fbbf24;
      --bad: #f87171;
      --mono: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace;
      --sans: 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', -apple-system, sans-serif;
    }

    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
    }
    .container { position: relative; z-index: 2; max-width: 880px; margin: 0 auto; padding: 0 20px 44px; }

    /* ===== 背景氛围 ===== */
    .bg-atmos { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
    .bg-orb {
      position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.55;
      animation: orbDrift 16s ease-in-out infinite alternate;
    }
    .bg-orb.a {
      width: 560px; height: 560px;
      background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      top: -180px; left: -120px;
    }
    .bg-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, black 0%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, black 0%, transparent 100%);
    }
    .bg-noise {
      position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.05;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    @keyframes orbDrift {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(60px, 40px) scale(1.12); }
    }

    /* ===== Hero 封面头部 ===== */
    .hero { position: relative; height: 330px; margin: 0 -20px; overflow: hidden; }
    .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 28%; }
    .hero-shade {
      position: absolute; inset: 0;
      background:
        linear-gradient(180deg, rgba(8,8,15,0.38) 0%, rgba(8,8,15,0.1) 32%, rgba(8,8,15,0.6) 70%, var(--bg) 100%),
        linear-gradient(100deg, rgba(8,8,15,0.5) 0%, transparent 48%);
    }
    .hud-corner { position: absolute; width: 26px; height: 26px; opacity: 0.5; }
    .hud-corner.tl { top: 16px; left: 16px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
    .hud-corner.br { bottom: 16px; right: 16px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }
    .back-home {
      position: absolute; top: 18px; left: 20px; z-index: 3;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 15px; border: 1px solid rgba(255,255,255,0.18); border-radius: 999px;
      background: rgba(8,8,15,0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      color: #d8d8e4; font-size: 13px; text-decoration: none; transition: all 0.2s;
    }
    .back-home:hover { color: var(--accent); border-color: var(--accent); }
    .cover-badge {
      position: absolute; top: 18px; right: 20px; z-index: 3;
      display: inline-flex; align-items: center; gap: 7px;
      padding: 6px 13px; border-radius: 999px;
      background: rgba(8,8,15,0.5); border: 1px solid rgba(74,222,128,0.38);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      color: var(--good); font-size: 11px; letter-spacing: 2px;
    }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .hero-body { position: absolute; left: 0; right: 0; bottom: 26px; z-index: 2; padding: 0 30px; }
    .hero-kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 4px; color: var(--accent); margin-bottom: 10px; }
    .hero-title { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
    .hero-title h1 { font-size: 34px; font-weight: 800; letter-spacing: 2px; color: #fff; text-shadow: 0 2px 24px rgba(0,0,0,0.65); }
    .hero-title .en { font-family: var(--mono); font-size: 12px; letter-spacing: 3px; color: rgba(255,255,255,0.75); }
    .subtitle { margin-top: 9px; font-size: 13px; color: rgba(255,255,255,0.8); text-shadow: 0 1px 12px rgba(0,0,0,0.8); max-width: 620px; line-height: 1.65; }

    /* 教学视频 */
    .tutorial-section {
      background: var(--card-glass);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 16px;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    .tutorial-header {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }
    .tutorial-icon {
      color: var(--accent);
      font-size: 14px;
    }
    .tutorial-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;
      padding: 5px;
      background: var(--card-glass);
      border: 1px solid var(--line);
      border-radius: 14px;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    .tab-btn {
      flex: 1;
      padding: 11px 16px;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: var(--text-dim);
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.22s;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active {
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 18px var(--accent-glow);
    }

    /* Input area */
    .input-card {
      background: var(--card-glass);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 22px;
      margin-bottom: 18px;
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    }
    .input-row {
      display: flex;
      gap: 12px;
      align-items: stretch;
    }
    .input-row input,
    .input-row textarea {
      flex: 1;
      padding: 13px 16px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(8,8,15,0.62);
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-row input:focus,
    .input-row textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .input-row textarea {
      resize: vertical;
      min-height: 130px;
      line-height: 1.6;
    }
    #product-id { font-family: var(--mono); letter-spacing: 1.5px; text-transform: uppercase; }
    .eval-btn {
      padding: 13px 30px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      box-shadow: 0 4px 16px var(--accent-glow);
      letter-spacing: 2px;
    }
    .eval-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
    .eval-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .price-input {
      width: 130px !important;
      flex: none !important;
    }

    /* Result */
    .result-card {
      background: var(--card-glass);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 26px;
      display: none;
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    }
    .result-card.show { display: block; animation: cardIn 0.4s cubic-bezier(0.22,1,0.36,1); }
    @keyframes cardIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    .result-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 2px 8px;
      padding: 6px 0;
      font-size: 14px;
    }
    .result-row .key { color: var(--text-dim); flex-shrink: 0; }
    .result-row .val { font-weight: 600; text-align: right; word-break: break-word; font-variant-numeric: tabular-nums; }
    .result-divider {
      height: 1px; border: none; margin: 13px 0;
      background: linear-gradient(90deg, transparent, var(--line) 12%, var(--line) 88%, transparent);
    }
    .result-summary {
      text-align: center;
      padding: 16px 0;
      position: relative;
    }
    .result-summary .big-value {
      font-family: var(--mono);
      font-size: 46px;
      font-weight: 700;
      color: var(--good);
      text-shadow: 0 0 36px rgba(74,222,128,0.35);
      font-variant-numeric: tabular-nums;
      letter-spacing: -1px;
    }
    .result-summary .label {
      color: var(--text-dim);
      font-size: 13px;
      margin-top: 6px;
      letter-spacing: 3px;
    }
    .result-summary .ratio {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 10px;
      font-variant-numeric: tabular-nums;
    }
    .ratio.good { background: rgba(74, 222, 128, 0.14); color: var(--good); border: 1px solid rgba(74,222,128,0.3); }
    .ratio.ok { background: rgba(251, 191, 36, 0.14); color: var(--warn); border: 1px solid rgba(251,191,36,0.3); }
    .ratio.bad { background: rgba(248, 113, 113, 0.14); color: var(--bad); border: 1px solid rgba(248,113,113,0.3); }

    .char-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 8px;
    }
    .char-tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      border: 1px solid transparent;
      font-variant-numeric: tabular-nums;
    }
    .char-tag.S { background: rgba(233, 69, 96, 0.12); color: #ff6b83; border-color: rgba(233,69,96,0.4); }
    .char-tag.A { background: rgba(251, 191, 36, 0.12); color: var(--warn); border-color: rgba(251,191,36,0.35); }
    .char-tag.B { background: rgba(96, 165, 250, 0.12); color: #60a5fa; border-color: rgba(96,165,250,0.35); }
    .char-tag.C { background: rgba(74, 222, 128, 0.1); color: var(--good); border-color: rgba(74,222,128,0.3); }
    .char-tag.D { background: rgba(156, 163, 175, 0.1); color: #9ca3af; border-color: rgba(156,163,175,0.28); }
    .char-tag.E { background: rgba(156, 163, 175, 0.07); color: #6b6b80; border-color: rgba(156,163,175,0.18); }
    .char-tag .const { color: var(--text-dim); margin-left: 2px; }
    .char-tag .sig { color: var(--good); }

    /* History */
    .history {
      margin-top: 22px;
    }
    .history-title {
      color: var(--text-faint);
      font-size: 12px;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }
    .history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .history-tag {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 999px;
      background: var(--card);
      border: 1px solid var(--line);
      color: var(--text-dim);
      font-size: 12px;
      font-family: var(--mono);
      cursor: pointer;
      transition: all 0.2s;
    }
    .history-tag:hover { border-color: var(--accent); color: var(--text); }

    .loading {
      text-align: center;
      padding: 22px;
      color: var(--text-dim);
      font-size: 14px;
      letter-spacing: 1px;
    }
    .error-msg {
      text-align: center;
      padding: 18px;
      color: var(--bad);
      font-size: 14px;
    }

    /* QQ群 & 合规声明 */
    .footer-section {
      margin-top: 44px;
    }
    .qq-group-card {
      background: var(--card-glass);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 16px;
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    }
    .qq-group-card .qr-wrapper {
      flex-shrink: 0;
      width: 140px;
      height: 140px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--line);
      cursor: pointer;
      transition: transform 0.2s, border-color 0.2s;
    }
    .qq-group-card .qr-wrapper:hover {
      transform: scale(1.04);
      border-color: var(--accent);
    }
    .qq-group-card .qr-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* 图片放大遮罩层 */
    .img-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(4,4,10,0.88);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      cursor: zoom-out;
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .img-overlay.show { display: flex; }
    .img-overlay img {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .qq-group-card .info h3 {
      font-size: 18px;
      color: var(--good);
      margin-bottom: 8px;
    }
    .qq-group-card .info .group-id {
      font-size: 15px;
      color: var(--text);
      margin-bottom: 6px;
    }
    .qq-group-card .info .group-id .num {
      font-weight: 700;
      color: #60a5fa;
      font-size: 18px;
      letter-spacing: 1px;
      font-family: var(--mono);
    }
    .qq-group-card .info .desc {
      font-size: 13px;
      color: var(--text-dim);
      line-height: 1.7;
    }
    .disclaimer {
      background: var(--accent-soft);
      border: 1px solid rgba(233, 69, 96, 0.22);
      border-radius: 14px;
      padding: 18px 22px;
      font-size: 12px;
      color: var(--text-dim);
      line-height: 1.9;
    }
    .disclaimer .title {
      color: var(--accent);
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 7px;
      letter-spacing: 1px;
    }
    .disclaimer p { margin: 0; }
    .disclaimer p + p { margin-top: 4px; }

    @media (max-width: 600px) {
      .container { padding: 0 12px 32px; }
      .hero { height: 250px; margin: 0 -12px; }
      .hero-body { padding: 0 18px; bottom: 20px; }
      .hero-title h1 { font-size: 25px; }
      .hero-title .en { font-size: 10px; }
      .subtitle { font-size: 11.5px; }
      .hud-corner { width: 18px; height: 18px; }
      .back-home { top: 14px; left: 14px; font-size: 12px; padding: 5px 12px; }
      .cover-badge { top: 14px; right: 14px; font-size: 10px; padding: 5px 10px; }
      .input-row { flex-direction: column; }
      .price-input { width: 100% !important; }
      .qq-group-card { flex-direction: column; text-align: center; }
      .tab-btn { padding: 10px 8px; font-size: 13px; }
      .input-card, .result-card { padding: 16px; }
      .result-row { flex-wrap: wrap; gap: 2px 8px; font-size: 13px; }
      .result-row .key { min-width: 60px; }
      .result-row .val { flex: 1; text-align: right; word-break: break-word; }
      .result-summary .big-value { font-size: 34px; }
      .char-tags { gap: 5px; }
      .char-tag { font-size: 11px; padding: 2px 8px; }
      #stats-modal > div { max-width: 95% !important; margin: 10px auto !important; padding: 14px !important; }
      #stats-modal-content > div[style*="grid"] { grid-template-columns: repeat(2, 1fr) !important; }
    }
    /* 估值规则设置入口 */
    .settings-bar {
      display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px;
    }
    .settings-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; border: 1px solid var(--line); border-radius: 10px;
      background: transparent; color: var(--warn); font-size: 13px; cursor: pointer;
      transition: all 0.2s; font-family: inherit;
    }
    .settings-btn:hover { border-color: var(--warn); background: rgba(251,191,36,0.08); }
    .settings-btn.customized { color: var(--good); border-color: rgba(74,222,128,0.5); }
    .settings-btn.customized:hover { background: rgba(74,222,128,0.08); }
    /* "估值不准"按钮 - 显示在估值结果下方 */
    .adjust-link {
      display: none;
      margin-top: 14px;
      padding: 6px 14px; border: 1px solid rgba(251,191,36,0.5); border-radius: 10px;
      background: rgba(15,15,29,0.9); color: var(--warn); font-size: 12px;
      cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .adjust-link:hover { background: rgba(251,191,36,0.14); }
    /* 新规则通知横幅 */
    .rules-banner {
      background: rgba(251,191,36,0.08);
      border: 1px solid rgba(251,191,36,0.3);
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: rulesFadeIn 0.3s ease;
    }
    @keyframes rulesFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .rules-banner-text {
      color: var(--warn); font-size: 13px; flex: 1;
    }
    .rules-banner-btns { display: flex; gap: 8px; }
    .rules-banner-btn {
      padding: 6px 14px; border: none; border-radius: 8px;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: opacity 0.2s; font-family: inherit;
    }
    .rules-banner-btn:hover { opacity: 0.85; }
    .rules-banner-btn.load { background: var(--warn); color: #0f0f1e; }
    .rules-banner-btn.dismiss { background: var(--line); color: var(--text-dim); }

    /* ===== 入场动画 & 补充 ===== */
    @keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    .rise { animation: rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .d1 { animation-delay: 0.08s; }
    .d2 { animation-delay: 0.16s; }
    .d3 { animation-delay: 0.24s; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="bg-atmos">
    <div class="bg-grid"></div>
    <div class="bg-orb a"></div>
  </div>
  <div class="bg-noise"></div>
  <div class="container">
    <!-- Hero 封面头部 -->
    <div class="hero">
      <img class="hero-img" src="/public/covers/wuwa-cover.jpg" alt="鸣潮" loading="eager">
      <div class="hero-shade"></div>
      <div class="hud-corner tl"></div>
      <div class="hud-corner br"></div>
      <a class="back-home" href="/">← 返回首页</a>
      <span class="cover-badge"><span class="pulse-dot"></span>正常开放</span>
      <div class="hero-body">
        <div class="hero-kicker">ACCOUNT VALUATOR · 01</div>
        <div class="hero-title">
          <h1>鸣潮账号估价</h1>
          <span class="en">WUTHERING WAVES</span>
        </div>
        <div class="subtitle">粘贴螃蟹网/盼之商品链接，或粘贴任意平台（螃蟹网/盼之/氪金兽/7881）商品描述进行估价</div>
      </div>
    </div>

    <!-- 教学视频 -->
    <div class="tutorial-section rise d1">
      <div class="tutorial-header" onclick="var f=document.getElementById('tutorial-frame');var a=this.querySelector('.tutorial-arrow');if(f.style.display==='none'){f.style.display='block';a.textContent='▲';this.querySelector('.tutorial-label').textContent='收起教程';}else{f.style.display='none';a.textContent='▼';this.querySelector('.tutorial-label').textContent='展开教程';}">
        <span class="tutorial-icon">▶</span>
        <span class="tutorial-title">新手必看：鸣潮估价工具使用教程</span>
        <span class="tutorial-label" style="margin-left:auto;font-size:12px;color:#ff8296;cursor:pointer;">展开教程</span>
        <span class="tutorial-arrow" style="font-size:10px;color:#ff8296;">▼</span>
      </div>
      <div id="tutorial-frame" style="display:none;margin-top:12px;">
        <div style="position:relative;padding:56.25% 0 0 0;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
          <iframe src="//player.bilibili.com/player.html?bvid=BV1ueKq6TEgV&autoplay=0&high_quality=1&danmaku=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#666;text-align:center;">
          <a href="https://www.bilibili.com/video/BV1ueKq6TEgV/" target="_blank" style="color:#ff8296;text-decoration:none;">在B站观看完整视频 →</a>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs rise d1">
      <button class="tab-btn active" id="tab-lookup" onclick="switchTab('lookup')">链接查询</button>
      <button class="tab-btn" id="tab-paste" onclick="switchTab('paste')">粘贴描述估价</button>
    </div>

    <!-- 估值规则设置入口 -->
    <div class="settings-bar rise d2">
      <button class="settings-btn" id="settings-btn" onclick="safeOpenValueSettings()" style="display:none;">估值规则设置</button>
      <button class="settings-btn" id="stats-btn" onclick="openStatsModal()">算法准确性报告</button>
    </div>

    <!-- 按编号查询 -->
    <div class="input-card rise d2" id="panel-lookup">
      <div class="input-row" style="flex-direction:column;gap:12px;">
        <textarea id="product-id" placeholder="粘贴商品链接（螃蟹网/盼之网），如 https://www.pxb7.com/product/2353711688582091796/1 或 https://www.pzds.com/goodsDetails/MC2VGU/6" style="min-height:80px;resize:vertical;"></textarea>
        <div class="input-row">
          <button class="eval-btn" id="lookup-btn" onclick="doLookup()" style="width:100%;">估价</button>
        </div>
      </div>
    </div>

    <!-- 粘贴描述估价 -->
    <div class="input-card" id="panel-paste" style="display:none;">
      <div class="input-row" style="flex-direction:column;gap:12px;">
        <textarea id="eval-text" placeholder="粘贴任意平台（螃蟹网/盼之/氪金兽/7881）商品描述文本（包含角色、命座、武器、资源等信息）"></textarea>
        <div class="input-row">
          <input type="number" class="price-input" id="eval-price" placeholder="标价(元)" min="0" />
          <button class="eval-btn" id="eval-btn" onclick="doEvaluate()">估价</button>
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <div class="result-card" id="result">
      <div class="result-summary" id="result-summary"></div>
      <div class="result-divider"></div>
      <div id="result-highlights"></div>
      <div class="result-divider"></div>
      <div id="result-details"></div>
      <div class="result-divider"></div>
      <div id="result-chars"></div>
      <div class="result-divider"></div>
      <div id="result-weapons"></div>
      <div class="result-divider"></div>
      <div id="result-resources"></div>
    </div>

    <!-- Loading/Error -->
    <div id="status-msg"></div>

    <!-- History -->
    <div class="history" id="history-section" style="display:none;">
      <div class="history-title">最近查询</div>
      <div class="history-tags" id="history-tags"></div>
    </div>

    <!-- QQ群 & 合规声明 -->
    <div class="footer-section rise d3">
      <div class="qq-group-card">
        <div class="qr-wrapper">
          <img src="/public/qq-group.jpg" alt="QQ群二维码" />
        </div>
        <div class="info">
          <h3>咕嘎鸣潮估价群</h3>
          <div class="group-id">群号：<span class="num">1064412729</span></div>
          <div class="desc">扫码加入QQ群，交流鸣潮账号估价心得，获取最新行情动态</div>
        </div>
      </div>
      <div class="disclaimer">
        <div class="title">合规声明</div>
        <p>本工具仅提供游戏账号行情数据测算参考，不支持、不引导任何账号买卖、转让行为。</p>
        <p>《鸣潮》官方禁止账号交易，所有账号交易产生封禁、被骗等损失由用户自行承担。</p>
        <p>本站不收集任何游戏账号密码、实名隐私信息，数据仅本地临时解析。</p>
      </div>
    </div>
  </div>

  <!-- 算法准确性报告弹窗 -->
  <div id="stats-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:100001;overflow-y:auto;" onclick="if(event.target===this)closeStatsModal()">
    <div style="max-width:1080px;margin:20px auto;background:#0d0d1a;border:1px solid #1e1e33;border-radius:12px;padding:24px;min-height:400px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <div style="font-size:20px;font-weight:700;color:#fff;">算法准确性报告</div>
          <div style="font-size:13px;color:#888;margin-top:2px;">基于真实成交记录的估值模型质量分析</div>
        </div>
        <button onclick="closeStatsModal()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;padding:4px 8px;">×</button>
      </div>
      <div id="stats-modal-content"></div>
    </div>
  </div>

  <!-- 图片放大遮罩层 -->
  <div class="img-overlay" id="img-overlay">
    <img src="/public/qq-group.jpg" alt="QQ群二维码" />
  </div>

  <script src="/public/value-settings.js?v=20260824" onerror="window.__vsFailed=true"></script>
  <script>
    // ============================================================
    // 服务器端默认配置（从数据库加载，优先于源码内置默认值）
    // 检测配置更新时间戳，自动清除用户旧的自定义配置
    // ============================================================
    window._serverDefaultConfig = null;
    fetch('/api/config/default').then(r => r.json()).then(json => {
      if (json.success && json.data) {
        window._serverDefaultConfig = json.data;
        console.log('[config] 已加载服务器端默认估值配置');
        // 检测 CONFIG_VERSION 变更（代码更新时不改变数据库 updated_at，需独立检查）
        var serverConfigVersion = json.data.configVersion || 1;
        var storedConfigVersion = parseInt(localStorage.getItem('mw_eval_config_version') || '0', 10);
        if (serverConfigVersion > storedConfigVersion) {
          if (localStorage.getItem('mw_eval_weights')) {
            localStorage.removeItem('mw_eval_weights');
            console.log('[config] 检测到CONFIG_VERSION更新(' + storedConfigVersion + '→' + serverConfigVersion + ')，已自动清除旧配置');
          }
          localStorage.setItem('mw_eval_config_version', String(serverConfigVersion));
        }
        // 检测服务器端配置是否已更新（基于数据库 updated_at 时间戳）
        var serverUpdatedAt = json.configUpdatedAt;
        var storedUpdatedAt = localStorage.getItem('mw_config_updated_at');
        if (serverUpdatedAt && serverUpdatedAt !== storedUpdatedAt) {
          // 服务器配置已更新，清除用户旧的自定义配置
          if (localStorage.getItem('mw_eval_weights')) {
            localStorage.removeItem('mw_eval_weights');
            console.log('[config] 检测到服务器配置更新(' + storedUpdatedAt + '→' + serverUpdatedAt + ')，已自动清除旧配置');
          }
          localStorage.setItem('mw_config_updated_at', serverUpdatedAt);
        }
      }
    }).catch(() => {});

    // ============================================================
    // 估值规则设置按钮状态更新
    // ============================================================
    function updateSettingsBtnState() {
      const btn = document.getElementById('settings-btn');
      if (!btn) return;
      if (typeof hasCustomWeights === 'function' && hasCustomWeights()) {
        btn.textContent = '估值规则设置（已自定义）';
        btn.classList.add('customized');
      } else {
        btn.textContent = '估值规则设置';
        btn.classList.remove('customized');
      }
    }

    // 安全打开估值设置：如果 value-settings.js 加载失败则提示用户
    function safeOpenValueSettings() {
      if (typeof openValueSettings === 'function') {
        openValueSettings(reevaluateAfterSettings);
      } else if (window.__vsFailed) {
        alert('估值设置面板加载失败，请刷新页面重试。如问题持续，请检查网络连接。');
      } else {
        alert('估值设置面板尚未加载完成，请稍后重试。');
      }
    }
    // 页面加载后初始化按钮状态
    (function(){ updateSettingsBtnState(); })();

    // ============================================================
    // 新规则检测：页面加载后自动应用最新规则（无需用户确认）
    // ============================================================
    (function checkNewRules() {
      if (typeof checkNewRulesAvailable !== 'function') return;
      checkNewRulesAvailable().then(function(hasNew) {
        if (!hasNew) return;
        // 自动加载最新规则，不显示横幅
        if (typeof loadLatestRules === 'function') loadLatestRules();
        updateSettingsBtnState();
        console.log('[config] 检测到新规则版本，已自动加载最新规则');
        // 如果之前有估价结果，重新估价以应用新规则
        if (currentTab === 'paste') {
          doEvaluate();
        } else if (lastLookupId) {
          doLookup();
        }
      });
    })();

    // 最近一次按编号查询的商品ID（用于设置保存后重新估价）
    let lastLookupId = '';

    // 估值规则保存后：更新按钮状态并重新估价（根据当前Tab）
    function reevaluateAfterSettings() {
      updateSettingsBtnState();
      if (currentTab === 'paste') {
        doEvaluate();
      } else if (currentTab === 'lookup' && lastLookupId) {
        // 重新查询编号以应用新规则
        document.getElementById('product-id').value = lastLookupId;
        doLookup();
      }
    }

    // ============================================================
    // Tab 切换
    // ============================================================
    let currentTab = 'lookup';
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('tab-lookup').classList.toggle('active', tab === 'lookup');
      document.getElementById('tab-paste').classList.toggle('active', tab === 'paste');
      document.getElementById('panel-lookup').style.display = tab === 'lookup' ? '' : 'none';
      document.getElementById('panel-paste').style.display = tab === 'paste' ? '' : 'none';
      // 清空结果
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '';
    }

    // ============================================================
    // 按编号查询
    // ============================================================
    async function doLookup() {
      const productId = document.getElementById('product-id').value.trim();
      if (!productId) { alert('请输入商品编号或商品链接'); return; }
      if (!/^https?:\/\//.test(productId)) { alert('请粘贴商品链接，不要输入纯编号。\\n\\n链接查询支持螃蟹网和盼之网的商品链接。'); return; }
      lastLookupId = productId;

      const btn = document.getElementById('lookup-btn');
      btn.disabled = true; btn.textContent = '查询中...';
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '<div class="loading">正在查询商品信息...</div>';

      try {
        const customWeights = (typeof getSavedWeights === 'function') ? (getSavedWeights() || window._serverDefaultConfig || null) : (window._serverDefaultConfig || null);
        const resp = await fetch('/api/x9k2-find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, customWeights, game: 'wuwa' }),
        });
        const result = await resp.json();
        document.getElementById('status-msg').innerHTML = '';

        if (!result.success) {
          const isTimeout = result.error && result.error.includes('超时');
          const switchToPaste = result.switchToPaste || isTimeout;
          let errorHtml = '<div class="error-msg">' + (result.error || '查询失败') + '</div>';
          if (switchToPaste) {
            errorHtml += '<div style="text-align:center;margin-top:8px;">' +
              '<button class="eval-btn" onclick="switchTab(\\'paste\\')">切换到粘贴描述估价</button></div>';
          }
          if (result.pxb7Url) {
            errorHtml += '<div style="text-align:center;margin-top:8px;">' +
              '<a href="' + result.pxb7Url + '" target="_blank" style="color:#4a90d9;font-size:14px;">打开螃蟹网商品页面 →</a></div>';
          }
          document.getElementById('status-msg').innerHTML = errorHtml;
          return;
        }

        showResult(result.data);
        saveHistory(productId, result.data);
      } catch (err) {
        document.getElementById('status-msg').innerHTML = '<div class="error-msg">查询失败: ' + err.message + '</div>';
      } finally {
        btn.disabled = false; btn.textContent = '估价';
      }
    }

    // ============================================================
    // 粘贴描述估价
    // ============================================================
    async function doEvaluate() {
      const text = document.getElementById('eval-text').value.trim();
      const price = parseFloat(document.getElementById('eval-price').value) || 0;
      if (!text) { alert('请输入账号描述文本'); return; }

      const btn = document.getElementById('eval-btn');
      btn.disabled = true; btn.textContent = '计算中...';
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '<div class="loading">正在计算估值...</div>';

      try {
        const customWeights = (typeof getSavedWeights === 'function') ? (getSavedWeights() || window._serverDefaultConfig || null) : (window._serverDefaultConfig || null);
        const resp = await fetch('/api/x9k2-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showTitle: text, priceInCents: price * 100, customWeights }),
        });
        const result = await resp.json();
        document.getElementById('status-msg').innerHTML = '';

        if (!result.success) {
          document.getElementById('status-msg').innerHTML = '<div class="error-msg">' + (result.error || '估值失败') + '</div>';
          return;
        }

        showResult(result.data);
      } catch (err) {
        document.getElementById('status-msg').innerHTML = '<div class="error-msg">估值失败: ' + err.message + '</div>';
      } finally {
        btn.disabled = false; btn.textContent = '估价';
      }
    }

    // ============================================================
    // 显示结果
    // ============================================================
    function showResult(d) {
      // 摘要
      const ratioClass = d.costPerformance >= 30 ? 'good' : (d.costPerformance >= 0 ? 'ok' : 'bad');
      const ratioText = d.costPerformance >= 0 ? '+' + d.costPerformance.toFixed(2) + '%' : d.costPerformance.toFixed(2) + '%';
      let summaryHtml = '';
      summaryHtml += '<div class="big-value">' + d.estimatedValue + ' 元</div>';
      summaryHtml += '<div class="label">预估价值</div>';
      if (d.price && d.price > 0) {
        const diff = (d.estimatedValue - d.price).toFixed(2);
        const diffText = diff >= 0 ? '+' + diff : diff;
        summaryHtml += '<div class="ratio ' + ratioClass + '">性价比 ' + ratioText + ' (标价' + d.price + '元 · 差价' + diffText + '元)</div>';
      }
      summaryHtml += '<button class="adjust-link" id="adjust-link" onclick="openStatsModal()">估值准不准？查看算法准确性报告</button>';
      document.getElementById('result-summary').innerHTML = summaryHtml;

      const det = d.details;
      const info = d.info || {};

      // ===== 核心亮点 =====
      let hlHtml = '<div style="color:#888;font-size:12px;margin-bottom:6px;">核心亮点</div>';
      hlHtml += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      // 角色数
      const charCount = (det.characters && det.characters.length) || 0;
      const c6Count = (det.characters || []).filter(c => c.const >= 6).length;
      const sTierCount = (det.characters || []).filter(c => c.tier === 'S').length;
      if (charCount > 0) {
        hlHtml += '<span style="background:#16162a;border:1px solid #2c2c48;border-radius:4px;padding:2px 8px;font-size:11px;color:#ccc;">五星角色 ' + charCount + ' 个</span>';
      }
      if (c6Count > 0) {
        hlHtml += '<span style="background:#1a2e1a;border:1px solid #4ade80;border-radius:4px;padding:2px 8px;font-size:11px;color:#4ade80;">满命角色 ' + c6Count + ' 个</span>';
      }
      if (sTierCount > 0) {
        hlHtml += '<span style="background:#2e1a1a;border:1px solid #f87171;border-radius:4px;padding:2px 8px;font-size:11px;color:#f87171;">S级角色 ' + sTierCount + ' 个</span>';
      }
      // 配队
      if (det.satisfiedTeams && det.satisfiedTeams.length > 0) {
        hlHtml += '<span style="background:#12121f;border:1px solid #818cf8;border-radius:4px;padding:2px 8px;font-size:11px;color:#818cf8;max-width:100%;word-break:break-word;">配队 ' + det.satisfiedTeams.length + ' 组(' + det.satisfiedTeams.join('/') + ')</span>';
      }
      // 专武
      const sigCount = (det.characters || []).filter(c => c.hasSig).length;
      if (sigCount > 0) {
        hlHtml += '<span style="background:#2e2a1a;border:1px solid #fbbf24;border-radius:4px;padding:2px 8px;font-size:11px;color:#fbbf24;">专武 ' + sigCount + ' 把</span>';
      }
      // 金数
      const yi = det.yellowInfo || {};
      if (yi.yellowCount > 0) {
        var goldBadge = (yi.effectiveYellow != null ? yi.effectiveYellow : '-') + '/' + (yi.limitedYellow != null ? yi.limitedYellow : yi.yellowCount) + '/' + (yi.totalYellow != null ? yi.totalYellow : (yi.rawYellowCount || 0));
        hlHtml += '<span style="background:#2e241a;border:1px solid #f59e0b;border-radius:4px;padding:2px 8px;font-size:11px;color:#f59e0b;">' + goldBadge + '金 [有效/限定/总]</span>';
      }
      // 抽数
      if (info.pulls > 0) {
        hlHtml += '<span style="background:#1a2a2e;border:1px solid #2dd4bf;border-radius:4px;padding:2px 8px;font-size:11px;color:#2dd4bf;">' + info.pulls + '抽</span>';
      }
      // 满命加权
      if (det.weightedFullConst > 0) {
        hlHtml += '<span style="background:#2a1a2e;border:1px solid #c084fc;border-radius:4px;padding:2px 8px;font-size:11px;color:#c084fc;">加权满命 ' + det.weightedFullConst.toFixed(1) + '</span>';
      }
      // 低命折扣
      const fd = det.flatDiscount || { value: 1, notes: [] };
      if (fd.value < 1) {
        hlHtml += '<span style="background:#2e1a2a;border:1px solid #f472b6;border-radius:4px;padding:2px 8px;font-size:11px;color:#f472b6;">低命折扣 ×' + fd.value + '</span>';
      }
      hlHtml += '</div>';
      document.getElementById('result-highlights').innerHTML = hlHtml;

      // ===== 估价计算 =====
      let detailHtml = '<div style="color:#888;font-size:12px;margin-bottom:6px;">估价计算</div>';
      // 基础价值
      detailHtml += resultRow('角色价值', det.characterValue + ' 元', '#e0e0e0');
      // 满命溢价
      const c6Bonus = det.c6Bonus || {};
      if (det.c6Premium > 0) {
        let c6Label = det.c6Premium + ' 元';
        if (c6Bonus.notes && c6Bonus.notes.length > 0) c6Label += '（' + c6Bonus.notes.join('，') + '）';
        detailHtml += resultRow('满命溢价', c6Label, '#4ade80');
      }
      // 配队溢价
      const teamBonus = det.teamBonus || {};
      if (det.teamPremium > 0) {
        let teamLabel = det.teamPremium + ' 元';
        if (teamBonus.notes && teamBonus.notes.length > 0) teamLabel += '（' + teamBonus.notes.join('，') + '）';
        detailHtml += resultRow('配队溢价', teamLabel, '#818cf8');
      }
      // 强绑折扣
      if (det.c6DepNotes && det.c6DepNotes.length > 0) {
        detailHtml += resultRow('强绑折扣', det.c6DepNotes.join('；'), '#f472b6');
      }
      // 无专武折扣
      if (det.sigDiscountNotes && det.sigDiscountNotes.length > 0) {
        detailHtml += resultRow('无专武折扣', det.sigDiscountNotes.join('；'), '#fbbf24');
      }
      // 抽数价值
      const pi = det.pullInfo || {};
      if (det.pullValue > 0 || pi.pulls > 0) {
        let pullLabel = det.pullValue + ' 元';
        if (pi.pulls > 0) {
          pullLabel += '（' + pi.pulls + '抽';
          if (pi.perPull != null) pullLabel += '·每抽' + pi.perPull + '元';
          if (pi.baseTotal > 0) pullLabel += '·基础' + pi.baseTotal + '元';
          if (pi.c6Bonus > 0) pullLabel += '·满命加成+' + pi.c6Bonus + '元';
          pullLabel += '）';
        }
        detailHtml += resultRow('抽数价值', pullLabel, '#2dd4bf');
      }
      // 资源价值
      if (det.resourceValue > 0) {
        detailHtml += resultRow('资源价值', det.resourceValue + ' 元', '#fbbf24');
      }
      // 小计
      const totalBeforeCoeff = det.characterValue + det.c6Premium + det.teamPremium + det.pullValue + det.resourceValue;
      detailHtml += resultRow('基础小计', totalBeforeCoeff.toFixed(2) + ' 元', '#aaa');
      // 生效系数
      const flatActive = (fd.value < 1 && fd.notes && fd.notes.length > 0 && fd.value < (yi.coefficient || 1));
      if (flatActive) {
        detailHtml += resultRow('低命折扣', '× ' + fd.value + '（' + fd.notes.join('，') + '）', '#a78bfa');
      } else if (yi.yellowCount > 0) {
        var goldDisplay = (yi.effectiveYellow != null ? yi.effectiveYellow : '-') + '/' + (yi.limitedYellow != null ? yi.limitedYellow : yi.yellowCount) + '/' + (yi.totalYellow != null ? yi.totalYellow : (yi.rawYellowCount || 0));
        detailHtml += resultRow('有效金系数', goldDisplay + ' [' + (yi.tierLabel || '') + '] × ' + yi.coefficient, '#f59e0b');
      }
      // 最终价值
      detailHtml += '<div class="result-row" style="border-top:1px solid #1e1e33;padding-top:6px;margin-top:4px;"><span class="key" style="color:#ccc;font-weight:bold;">最终估值</span><span class="val" style="color:#4ade80;font-weight:bold;font-size:16px;">' + det.finalValue + ' 元</span></div>';
      document.getElementById('result-details').innerHTML = detailHtml;

      // ===== 角色明细（按估值从大到小排序） =====
      let charHtml = '<div style="color:#888;font-size:12px;margin-bottom:6px;">角色明细（按价值排序）</div>';
      if (det.characters && det.characters.length > 0) {
        const sortedChars = [...det.characters].sort((a, b) => b.value - a.value);
        charHtml += '<div class="char-tags">';
        sortedChars.forEach(c => {
          const constStr = c.const === 6 ? '满命' : c.const + '命';
          const sigStr = c.hasSig ? ' <span class="sig">+专武</span>' : '';
          charHtml += '<span class="char-tag ' + c.tier + '">' + constStr + ' ' + c.name + sigStr + ' (' + c.value + '元)</span>';
        });
        charHtml += '</div>';
        // 角色价值汇总
        const totalCharValue = sortedChars.reduce((s, c) => s + c.value, 0);
        charHtml += '<div style="color:#666;font-size:11px;margin-top:6px;">角色总价值: ' + totalCharValue + ' 元 · 平均: ' + Math.round(totalCharValue / sortedChars.length) + ' 元/个</div>';
      } else {
        charHtml += '<span style="color:#666;font-size:12px;">未识别到角色</span>';
      }
      document.getElementById('result-chars').innerHTML = charHtml;

      // ===== 武器明细 =====
      let wpnHtml = '<div style="color:#888;font-size:12px;margin-bottom:6px;">武器明细</div>';
      const weapons = det.weaponDetails || info.weapons || [];
      if (weapons.length > 0) {
        wpnHtml += '<div class="char-tags">';
        weapons.forEach(w => {
          const refineStr = w.refine > 0 ? '精' + w.refine + ' ' : '';
          const sigBadge = w.isSig ? ' <span class="sig">专武</span>' : '';
          wpnHtml += '<span class="char-tag" style="border-color:#666;color:#ccc;">' + refineStr + w.name + sigBadge + '</span>';
        });
        wpnHtml += '</div>';
      } else {
        wpnHtml += '<span style="color:#666;font-size:12px;">未识别到武器</span>';
      }
      document.getElementById('result-weapons').innerHTML = wpnHtml;

      // ===== 资源明细 =====
      let resHtml = '<div style="color:#888;font-size:12px;margin-bottom:6px;">资源明细</div>';
      resHtml += resultRow('星声', info.starSounds || 0, '#e0e0e0');
      resHtml += resultRow('月相', info.moonPhases || 0, '#e0e0e0');
      resHtml += resultRow('余波珊瑚', info.coral || 0, '#e0e0e0');
      resHtml += resultRow('浮金波纹', info.goldenRipples || 0, '#e0e0e0');
      resHtml += resultRow('铸潮波纹', info.tideRipples || 0, '#e0e0e0');
      const outfitList = det.outfits || [];
      if (outfitList.length > 0) {
        resHtml += resultRow('服饰', outfitList.length + '件: ' + outfitList.join('、'), '#fbbf24');
      }
      const motoList = det.motoFrames || [];
      if (motoList.length > 0) {
        resHtml += resultRow('车架模组', motoList.length + '个: ' + motoList.join('、'), '#fbbf24');
      }
      if (info.pulls > 0) resHtml += resultRow('抽数', info.pulls + ' 抽', '#2dd4bf');
      var yiInfo = det.yellowInfo || {};
      var goldSummary = (yiInfo.effectiveYellow != null ? yiInfo.effectiveYellow : '-') + '/' + (yiInfo.limitedYellow != null ? yiInfo.limitedYellow : '-') + '/' + (info.yellowCount || 0);
      resHtml += resultRow('有效金/限定金/总金数', goldSummary, '#f59e0b');
      document.getElementById('result-resources').innerHTML = resHtml;

      document.getElementById('result').classList.add('show');
      // 显示"估值不准"按钮
      const adjustBtn = document.getElementById('adjust-link');
      if (adjustBtn) adjustBtn.style.display = 'inline-block';
    }

    function resultRow(key, val, color) {
      return '<div class="result-row"><span class="key">' + key + '</span><span class="val" style="color:' + (color || '#e0e0e0') + ';">' + val + '</span></div>';
    }

    // ============================================================
    // 算法准确性报告弹窗
    // ============================================================
    function openStatsModal() {
      var modal = document.getElementById('stats-modal');
      var content = document.getElementById('stats-modal-content');
      modal.style.display = 'block';
      content.innerHTML = '<div style="text-align:center;padding:60px 0;color:#888;"><div style="display:inline-block;width:32px;height:32px;border:3px solid #1e1e33;border-top-color:#ff8296;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div><div>正在加载统计数据...</div></div>';
      document.body.style.overflow = 'hidden';

      fetch('/api/public-stats').then(function(r) { return r.json(); }).then(function(result) {
        if (!result.success || !result.data.summary) {
          content.innerHTML = '<div style="text-align:center;padding:60px 0;color:#666;">暂无统计数据，请稍后再来查看</div>';
          return;
        }
        renderStatsModal(result.data);
      }).catch(function() {
        content.innerHTML = '<div style="text-align:center;padding:60px 0;color:#666;">数据加载失败，请关闭重试</div>';
      });
    }

    function closeStatsModal() {
      document.getElementById('stats-modal').style.display = 'none';
      document.body.style.overflow = '';
    }

    function renderStatsModal(data) {
      var s = data.summary;
      var scatter = data.scatter || [];
      var html = '';

      // ===== 12个关键指标卡片 (4列×3行，与管理后台一致) =====
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">';
      // 第一行：成交概览
      html += statsCard('成交商品', s.valued + '', s.valued + '条成功估值', 'blue');
      html += statsCard('平均成交价', '¥' + s.avgPrice, '', 'yellow');
      html += statsCard('平均估值', '¥' + s.avgEst, '', 'blue');
      html += statsCard('平均偏差', (s.avgDev >= 0 ? '+' : '') + '¥' + s.avgDev, (s.avgDevPct >= 0 ? '+' : '') + s.avgDevPct + '%', s.avgDev >= 0 ? 'green' : 'red');
      // 第二行：误差与准确率
      html += statsCard('MAE(平均绝对误差)', '¥' + s.mae, '平均' + s.maePct + '%', 'yellow');
      html += statsCard('准确率(±20%)', s.accPct + '%', '±10%: ' + s.hit10 + '条 / ±20%: ' + s.hit20 + '条 / ±30%: ' + s.hit30 + '条', s.accPct >= 70 ? 'green' : 'red');
      html += statsCard('估值偏高(买赚)', s.overvalued + '', '成交价 < 估值', 'green');
      html += statsCard('估值偏低(买贵)', s.undervalued + '', '成交价 > 估值', 'red');
      // 第三行：统计学指标
      var r2Desc = s.r2 >= 0.8 ? '优秀，模型解释力强' : s.r2 >= 0.6 ? '良好，有一定解释力' : s.r2 >= 0.4 ? '一般，存在较大偏差' : '较差，模型需调整';
      var corrDesc = s.corr >= 0.9 ? '高度正相关' : s.corr >= 0.7 ? '强相关' : s.corr >= 0.5 ? '中等相关' : '弱相关';
      html += statsCard('R²(决定系数)', s.r2.toFixed(3), r2Desc, 'blue');
      html += statsCard('相关系数(r)', s.corr.toFixed(3), corrDesc, 'blue');
      html += statsCard('中位数偏差率', (s.medDevPct >= 0 ? '+' : '') + s.medDevPct + '%', '抗极端值，反映系统偏置', 'yellow');
      html += statsCard('P90偏差率', '±' + s.p90DevPct + '%', '90%账号偏差不超过此值', s.p90DevPct <= 20 ? 'green' : s.p90DevPct <= 40 ? 'yellow' : 'red');
      html += '</div>';

      // ===== 误差说明 =====
      html += '<div style="background:#101020;border:1px solid #1e1e33;border-radius:10px;padding:16px;margin-bottom:16px;">';
      html += '<div style="font-size:14px;font-weight:600;color:#ccc;margin-bottom:12px;">为什么会有误差？</div>';
      html += '<div style="font-size:13px;color:#999;line-height:1.8;">';
      html += '<div style="margin-bottom:8px;"><span style="color:#ff8296;font-weight:600;">市场供需波动：</span>账号价格受市场供需关系影响，热门角色在特定时期可能溢价，冷门角色则可能折价，估价引擎基于历史均价计算，无法实时反映短期市场波动。</div>';
      html += '<div style="margin-bottom:8px;"><span style="color:#ff8296;font-weight:600;">账号组合差异：</span>每个账号的角色组合、命座、武器配置各不相同，部分稀有组合在市场上缺乏足够的成交样本，导致估值偏差较大。</div>';
      html += '<div style="margin-bottom:8px;"><span style="color:#ff8296;font-weight:600;">主观价值因素：</span>账号的视觉效果（皮肤、服饰）、ID稀有度、服务器热度等主观因素难以量化，这些因素可能导致实际成交价偏离估值。</div>';
      html += '<div style="margin-bottom:8px;"><span style="color:#ff8296;font-weight:600;">定价模型迭代：</span>估值引擎基于可配置的角色定价和系数公式，随着市场数据积累和参数调优，准确率会持续提升。当前R²=' + s.r2.toFixed(3) + '表明模型' + (s.r2 >= 0.8 ? '已具有较强解释力' : '仍有优化空间') + '。</div>';
      html += '<div><span style="color:#ff8296;font-weight:600;">如何理解这些指标：</span>R²越接近1表示估值越准确；相关系数(r)反映估值与成交价的线性相关程度；中位数偏差率排除极端值后反映系统性偏置；P90表示90%的账号偏差都在此范围内。</div>';
      html += '</div>';
      html += '</div>';

      // ===== 准确率分布条 =====
      html += '<div style="background:#101020;border:1px solid #1e1e33;border-radius:10px;padding:16px;margin-bottom:16px;">';
      html += '<div style="font-size:14px;font-weight:600;color:#ccc;margin-bottom:12px;">准确率分布</div>';
      var total = s.valued;
      var c10 = s.hit10, c20 = s.hit20 - s.hit10, c30 = s.hit30 - s.hit20, cOut = total - s.hit30;
      var p10 = total > 0 ? (c10 / total * 100) : 0;
      var p20 = total > 0 ? (c20 / total * 100) : 0;
      var p30 = total > 0 ? (c30 / total * 100) : 0;
      var pOut = total > 0 ? (cOut / total * 100) : 0;
      html += '<div style="display:flex;height:28px;border-radius:6px;overflow:hidden;background:#12121f;">';
      if (p10 > 0) html += '<div style="display:flex;align-items:center;justify-content:center;width:' + p10 + '%;background:#4ade80;color:#08080f;font-size:11px;font-weight:600;">±10% ' + c10 + '</div>';
      if (p20 > 0) html += '<div style="display:flex;align-items:center;justify-content:center;width:' + p20 + '%;background:#fbbf24;color:#08080f;font-size:11px;font-weight:600;">±20% ' + c20 + '</div>';
      if (p30 > 0) html += '<div style="display:flex;align-items:center;justify-content:center;width:' + p30 + '%;background:#fb923c;color:#08080f;font-size:11px;font-weight:600;">±30% ' + c30 + '</div>';
      if (pOut > 0) html += '<div style="display:flex;align-items:center;justify-content:center;width:' + pOut + '%;background:#f87171;color:#08080f;font-size:11px;font-weight:600;">>30% ' + cOut + '</div>';
      html += '</div>';
      html += '<div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:#888;">';
      html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#4ade80;margin-right:4px;"></span>±10%: ' + c10 + '条 (' + p10.toFixed(1) + '%)</span>';
      html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#fbbf24;margin-right:4px;"></span>±10~20%: ' + c20 + '条 (' + p20.toFixed(1) + '%)</span>';
      html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#fb923c;margin-right:4px;"></span>±20~30%: ' + c30 + '条 (' + p30.toFixed(1) + '%)</span>';
      html += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f87171;margin-right:4px;"></span>>30%: ' + cOut + '条 (' + pOut.toFixed(1) + '%)</span>';
      html += '</div>';
      html += '</div>';

      // ===== 散点图 =====
      if (scatter.length > 0) {
        html += '<div style="background:#101020;border:1px solid #1e1e33;border-radius:10px;padding:16px;">';
        html += '<div style="font-size:14px;font-weight:600;color:#ccc;margin-bottom:12px;">估值 vs 成交价 散点图（' + scatter.length + ' 个数据点）</div>';
        html += '<div style="display:flex;justify-content:center;">' + renderStatsScatter(scatter) + '</div>';
        html += '</div>';
      }

      document.getElementById('stats-modal-content').innerHTML = html;
    }

    function statsCard(label, value, sub, color) {
      var borderColor = { green: '#1a3a1a', red: '#3a1a1a', blue: '#1a2a3a', purple: '#2a1a3a', yellow: '#3e3a1a' }[color] || '#1e1e33';
      var valueColor = { green: '#4ade80', red: '#f87171', blue: '#60a5fa', purple: '#c084fc', yellow: '#fbbf24' }[color] || '#fff';
      return '<div style="background:#101020;border:1px solid ' + borderColor + ';border-radius:10px;padding:14px 12px;text-align:center;">' +
        '<div style="font-size:12px;color:#888;margin-bottom:4px;">' + label + '</div>' +
        '<div style="font-size:20px;font-weight:700;color:' + valueColor + ';">' + value + '</div>' +
        '<div style="font-size:11px;color:#666;margin-top:3px;">' + sub + '</div></div>';
    }

    function renderStatsScatter(data) {
      var allVals = data.map(function(d) { return d.x; }).concat(data.map(function(d) { return d.y; }));
      allVals.sort(function(a, b) { return a - b; });
      var p95Index = Math.floor(allVals.length * 0.95);
      var maxVal = allVals[p95Index] || allVals[allVals.length - 1] || 100;
      if (maxVal <= 500) maxVal = Math.ceil(maxVal / 50) * 50;
      else if (maxVal <= 2000) maxVal = Math.ceil(maxVal / 100) * 100;
      else if (maxVal <= 10000) maxVal = Math.ceil(maxVal / 500) * 500;
      else maxVal = Math.ceil(maxVal / 1000) * 1000;
      if (maxVal < 100) maxVal = 100;
      var outlierCount = data.filter(function(d) { return d.x > maxVal || d.y > maxVal; }).length;
      var svgW = 560, svgH = 420, padL = 55, padR = 15, padT = 20, padB = 45;
      var plotW = svgW - padL - padR, plotH = svgH - padT - padB;
      function sX(v) { return padL + (Math.min(v, maxVal) / maxVal) * plotW; }
      function sY(v) { return padT + plotH - (Math.min(v, maxVal) / maxVal) * plotH; }
      var sp = [];
      sp.push('<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" style="width:100%;max-width:560px;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">');
      for (var g = 0; g <= 4; g++) {
        var gv = (maxVal / 4) * g, gx = sX(gv), gy = sY(gv);
        sp.push('<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (svgW - padR) + '" y2="' + gy.toFixed(1) + '" stroke="#1a1a2e" stroke-width="1"/>');
        sp.push('<line x1="' + gx.toFixed(1) + '" y1="' + padT + '" x2="' + gx.toFixed(1) + '" y2="' + (svgH - padB) + '" stroke="#1a1a2e" stroke-width="1"/>');
        sp.push('<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" fill="#666" font-size="10" text-anchor="end">' + Math.round(gv) + '</text>');
        sp.push('<text x="' + gx.toFixed(1) + '" y="' + (svgH - padB + 15) + '" fill="#666" font-size="10" text-anchor="middle">' + Math.round(gv) + '</text>');
      }
      sp.push('<line x1="' + sX(0).toFixed(1) + '" y1="' + sY(0).toFixed(1) + '" x2="' + sX(maxVal).toFixed(1) + '" y2="' + sY(maxVal).toFixed(1) + '" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5"/>');
      sp.push('<text x="' + (sX(maxVal) - 5).toFixed(1) + '" y="' + (sY(maxVal) - 6).toFixed(1) + '" fill="#4ade80" font-size="10" text-anchor="end">y=x 完美预测线</text>');
      for (var p = 0; p < data.length; p++) {
        var px = sX(data[p].x), py = sY(data[p].y);
        var pc = data[p].d > 0 ? '#4ade80' : (data[p].d < 0 ? '#f87171' : '#888');
        sp.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="2.5" fill="' + pc + '" opacity="0.55"><title>估值¥' + data[p].x + ' 成交¥' + data[p].y + ' 偏差' + data[p].p + '%</title></circle>');
      }
      sp.push('<text x="' + (padL + plotW / 2) + '" y="' + (svgH - 5) + '" fill="#aaa" font-size="11" text-anchor="middle">估值 (元)</text>');
      sp.push('<text x="15" y="' + (padT + plotH / 2) + '" fill="#aaa" font-size="11" text-anchor="middle" transform="rotate(-90 15 ' + (padT + plotH / 2) + ')">成交价 (元)</text>');
      sp.push('<rect x="' + (svgW - 145) + '" y="8" width="135" height="36" fill="#0d0d1a" stroke="#1e1e33" rx="4"/>');
      sp.push('<circle cx="' + (svgW - 135) + '" cy="20" r="2.5" fill="#4ade80" opacity="0.55"/>');
      sp.push('<text x="' + (svgW - 125) + '" y="24" fill="#888" font-size="10">估值偏低(买赚)</text>');
      sp.push('<circle cx="' + (svgW - 135) + '" cy="35" r="2.5" fill="#f87171" opacity="0.55"/>');
      sp.push('<text x="' + (svgW - 125) + '" y="39" fill="#888" font-size="10">估值偏高(买贵)</text>');
      if (outlierCount > 0) sp.push('<text x="' + (padL + 4) + '" y="' + (padT + 12) + '" fill="#fbbf24" font-size="10">' + outlierCount + '个异常值已截断至边缘</text>');
      sp.push('</svg>');
      return sp.join('');
    }

    function escStatsHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ============================================================
    // 历史记录
    // ============================================================
    function saveHistory(productId, data) {
      let history = [];
      try { history = JSON.parse(localStorage.getItem('mw_history') || '[]'); } catch(e) {}
      // 去重
      history = history.filter(h => h.id !== productId);
      history.unshift({
        id: productId,
        ratio: data.costPerformance,
        value: data.estimatedValue,
      });
      history = history.slice(0, 10);
      localStorage.setItem('mw_history', JSON.stringify(history));
      renderHistory();
    }

    function renderHistory() {
      let history = [];
      try { history = JSON.parse(localStorage.getItem('mw_history') || '[]'); } catch(e) {}
      if (history.length === 0) {
        document.getElementById('history-section').style.display = 'none';
        return;
      }
      document.getElementById('history-section').style.display = '';
      let html = '';
      history.forEach(h => {
        const ratioText = h.ratio >= 0 ? '+' + h.ratio + '%' : h.ratio + '%';
        html += '<span class="history-tag" onclick="loadHistory(\\'' + h.id + '\\')">' + h.id + ' (' + ratioText + ')</span>';
      });
      document.getElementById('history-tags').innerHTML = html;
    }

    function loadHistory(productId) {
      document.getElementById('product-id').value = productId;
      switchTab('lookup');
      doLookup();
    }

    // ============================================================
    // 初始化
    // ============================================================
    renderHistory();

    // QQ群图片点击放大
    (function() {
      var qrWrapper = document.querySelector('.qr-wrapper');
      var overlay = document.getElementById('img-overlay');
      if (!qrWrapper || !overlay) return;
      qrWrapper.addEventListener('click', function() {
        overlay.classList.add('show');
      });
      overlay.addEventListener('click', function() {
        overlay.classList.remove('show');
      });
    })();
  </script>
</body>
</html>`;
}

module.exports = getPageHTML;
