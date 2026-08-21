'use strict';

function getPlatformPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>游戏账号估价平台 - 精准估值 · 买卖参考 · 实时监控</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #08080f;
      --bg-soft: #0d0d1a;
      --card: #101020;
      --line: #1e1e33;
      --text: #e8e8f0;
      --text-dim: #8a8aa0;
      --text-faint: #55556b;
      --wuwa: #e94560;
      --wuwa-glow: rgba(233, 69, 96, 0.35);
      --zzz: #ffb84d;
      --zzz-accent: #b8e62e;
      --zzz-glow: rgba(255, 184, 77, 0.3);
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

    /* ===== 背景氛围层 ===== */
    .bg-atmos {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.55;
      animation: orbDrift 16s ease-in-out infinite alternate;
    }
    .bg-orb.wuwa {
      width: 560px; height: 560px;
      background: radial-gradient(circle, rgba(233,69,96,0.32) 0%, transparent 70%);
      top: -180px; left: -120px;
    }
    .bg-orb.zzz {
      width: 620px; height: 620px;
      background: radial-gradient(circle, rgba(255,184,77,0.2) 0%, transparent 70%);
      bottom: -200px; right: -150px;
      animation-delay: -8s;
    }
    .bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, black 0%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, black 0%, transparent 100%);
    }
    .bg-noise {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: 0.05;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    @keyframes orbDrift {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(60px, 40px) scale(1.12); }
    }

    .container {
      position: relative;
      z-index: 2;
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 24px 0;
    }

    /* ===== 入场动画 ===== */
    @keyframes riseIn {
      from { opacity: 0; transform: translateY(28px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .rise { opacity: 0; animation: riseIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .rise.d1 { animation-delay: 0.12s; }
    .rise.d2 { animation-delay: 0.26s; }
    .rise.d3 { animation-delay: 0.4s; }
    .rise.d4 { animation-delay: 0.55s; }
    .rise.d5 { animation-delay: 0.7s; }

    /* ===== Header ===== */
    .header {
      padding: 56px 0 20px;
      text-align: center;
    }
    .logo-row {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .logo-icon {
      width: 54px; height: 54px;
      border-radius: 15px;
      background: linear-gradient(135deg, #e94560 0%, #ff7a45 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 27px; font-weight: 800; color: #fff;
      box-shadow: 0 8px 32px rgba(233, 69, 96, 0.45), inset 0 1px 0 rgba(255,255,255,0.25);
    }
    .site-name {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 2px;
      background: linear-gradient(92deg, #f4f4f8 15%, #ffb1a0 50%, #ffd98a 85%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tagline {
      color: var(--text-dim);
      font-size: 14px;
      letter-spacing: 6px;
      text-indent: 6px;
    }
    .tagline .sep { color: var(--wuwa); margin: 0 10px; font-weight: 700; }

    /* 统计条 */
    .stats-row {
      display: flex;
      justify-content: center;
      gap: 0;
      margin: 34px auto 0;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(13, 13, 26, 0.6);
      backdrop-filter: blur(8px);
      width: fit-content;
      overflow: hidden;
    }
    .stat-cell {
      padding: 14px 34px;
      text-align: center;
      position: relative;
    }
    .stat-cell + .stat-cell::before {
      content: '';
      position: absolute;
      left: 0; top: 22%;
      height: 56%;
      width: 1px;
      background: var(--line);
    }
    .stat-num {
      font-family: var(--mono);
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.1;
    }
    .stat-cell:first-child .stat-num { color: var(--wuwa); }
    .stat-cell:nth-child(2) .stat-num { color: var(--zzz); }
    .stat-label {
      font-size: 11px;
      color: var(--text-faint);
      letter-spacing: 2px;
      margin-top: 5px;
    }

    /* ===== 分节标题 ===== */
    .section-head {
      display: flex;
      align-items: center;
      gap: 18px;
      margin: 52px 0 24px;
    }
    .section-head .tick {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-faint);
      letter-spacing: 3px;
      white-space: nowrap;
    }
    .section-head .line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, var(--line) 0%, transparent 100%);
    }
    .section-head .cn {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 4px;
      color: var(--text-dim);
      white-space: nowrap;
    }

    /* ===== 大封面卡片 ===== */
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 26px;
    }
    .game-card {
      position: relative;
      display: block;
      border-radius: 20px;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      aspect-ratio: 16 / 11;
      border: 1px solid var(--line);
      background: var(--card);
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s, border-color 0.5s;
      isolation: isolate;
    }
    .game-card:hover {
      transform: translateY(-10px);
    }
    .game-card.wuwa:hover {
      border-color: rgba(233, 69, 96, 0.55);
      box-shadow: 0 30px 70px -18px var(--wuwa-glow), 0 12px 40px rgba(0,0,0,0.55);
    }
    .game-card.zzz:hover {
      border-color: rgba(255, 184, 77, 0.55);
      box-shadow: 0 30px 70px -18px var(--zzz-glow), 0 12px 40px rgba(0,0,0,0.55);
    }

    .cover-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 28%;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      transform: scale(1.02);
      will-change: transform;
      z-index: -2;
    }
    .game-card:hover .cover-img {
      transform: scale(1.06);
    }
    .cover-tint {
      position: absolute;
      inset: 0;
      z-index: -1;
      background: rgba(8, 8, 15, 0.22);
      transition: opacity 0.4s;
      opacity: 1;
    }
    .game-card:hover .cover-tint {
      opacity: 0;
    }
    .cover-shade {
      position: absolute;
      inset: 0;
      z-index: -1;
      background: linear-gradient(180deg,
        rgba(8, 8, 15, 0.18) 0%,
        rgba(8, 8, 15, 0.05) 32%,
        rgba(8, 8, 15, 0.62) 62%,
        rgba(8, 8, 15, 0.94) 86%);
    }

    /* HUD 四角括号 */
    .hud-corner {
      position: absolute;
      width: 22px; height: 22px;
      opacity: 0;
      transition: opacity 0.4s, transform 0.4s;
      z-index: 3;
    }
    .hud-corner.tl { top: 14px; left: 14px; border-top: 2px solid; border-left: 2px solid; transform: translate(6px, 6px); }
    .hud-corner.br { bottom: 14px; right: 14px; border-bottom: 2px solid; border-right: 2px solid; transform: translate(-6px, -6px); }
    .game-card.wuwa .hud-corner { border-color: var(--wuwa); }
    .game-card.zzz .hud-corner { border-color: var(--zzz); }
    .game-card:hover .hud-corner { opacity: 0.9; transform: translate(0, 0); }

    /* 状态徽章（卡片左上） */
    .cover-badge {
      position: absolute;
      top: 18px; left: 18px;
      z-index: 3;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      background: rgba(8, 8, 15, 0.72);
    }
    .cover-badge .pulse-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    .cover-badge.available { color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.35); }
    .cover-badge.available .pulse-dot { background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.8); }
    .cover-badge.beta { color: var(--zzz); border: 1px solid rgba(255, 184, 77, 0.4); }
    .cover-badge.beta .pulse-dot { background: var(--zzz); box-shadow: 0 0 8px rgba(255,184,77,0.8); }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.75); }
    }

    /* 卡片底部信息 */
    .card-info {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      z-index: 3;
      padding: 26px 26px 24px;
    }
    .game-title-row {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 8px;
    }
    .game-title {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: 3px;
      text-shadow: 0 4px 24px rgba(0,0,0,0.7);
    }
    .game-card.wuwa .game-title { color: #ff8d9c; }
    .game-card.zzz .game-title { color: var(--zzz); }
    .game-sub {
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 2px;
      color: var(--text-faint);
    }
    .game-desc {
      font-size: 13px;
      color: #b8b8c8;
      line-height: 1.7;
      margin-bottom: 14px;
    }
    .enter-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      transition: gap 0.3s;
    }
    .game-card.wuwa .enter-row { color: var(--wuwa); }
    .game-card.zzz .enter-row { color: var(--zzz); }
    .game-card:hover .enter-row { gap: 14px; }
    .enter-arrow {
      display: inline-block;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .game-card:hover .enter-arrow { transform: translateX(4px); }

    /* ===== 即将上线 ===== */
    .soon-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .soon-chip {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      border: 1px dashed var(--line);
      border-radius: 14px;
      background: rgba(13, 13, 26, 0.45);
      cursor: default;
      transition: border-color 0.3s, background 0.3s;
    }
    .soon-chip:hover {
      border-color: #2e2e4d;
      background: rgba(16, 16, 32, 0.7);
    }
    .soon-icon {
      width: 40px; height: 40px;
      border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; font-weight: 800; color: #fff;
      flex-shrink: 0;
      filter: grayscale(0.55) opacity(0.6);
    }
    .soon-icon.huan { background: linear-gradient(135deg, #7c5cff, #5b8cff); }
    .soon-icon.endfield { background: linear-gradient(135deg, #4ade80, #22c55e); }
    .soon-icon.genshin { background: linear-gradient(135deg, #f5d76e, #d4a017); }
    .soon-icon.starrail { background: linear-gradient(135deg, #a78bfa, #6d5bd0); }
    .soon-name {
      font-size: 14px;
      font-weight: 600;
      color: #a8a8bd;
      margin-bottom: 3px;
    }
    .soon-label {
      font-family: var(--mono);
      font-size: 10px;
      letter-spacing: 1px;
      color: var(--text-faint);
    }

    /* ===== 特性区 ===== */
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .feature-card {
      padding: 26px 24px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: linear-gradient(165deg, rgba(16,16,32,0.8) 0%, rgba(11,11,22,0.5) 100%);
      position: relative;
      overflow: hidden;
    }
    .feature-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 40px; height: 2px;
      background: linear-gradient(90deg, var(--wuwa), transparent);
    }
    .feature-card:nth-child(2)::after { background: linear-gradient(90deg, var(--zzz), transparent); }
    .feature-card:nth-child(3)::after { background: linear-gradient(90deg, #4ade80, transparent); }
    .feature-idx {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text-faint);
      letter-spacing: 2px;
      margin-bottom: 14px;
    }
    .feature-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .feature-desc {
      font-size: 12.5px;
      color: var(--text-dim);
      line-height: 1.8;
    }

    /* ===== Footer ===== */
    .footer {
      margin-top: 64px;
      padding: 30px 0 36px;
      border-top: 1px solid var(--line);
      text-align: center;
    }
    .footer .copyright {
      color: var(--text-faint);
      font-size: 12px;
      letter-spacing: 1px;
    }
    .footer .copyright .mono { font-family: var(--mono); }

    /* ===== 响应式 ===== */
    @media (max-width: 860px) {
      .hero-grid { grid-template-columns: 1fr; }
      .game-card { aspect-ratio: 16 / 10; }
      .soon-row { grid-template-columns: repeat(2, 1fr); }
      .features-grid { grid-template-columns: 1fr; }
      .stat-cell { padding: 12px 22px; }
      .site-name { font-size: 25px; }
      .game-title { font-size: 25px; }
    }
    @media (max-width: 480px) {
      .header { padding-top: 40px; }
      .stats-row { flex-wrap: wrap; border-radius: 16px; }
      .stat-cell { flex: 1 1 40%; }
      .stat-cell:nth-child(3)::before { display: none; }
      .soon-row { grid-template-columns: 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
      .rise, .bg-orb, .cover-badge .pulse-dot { animation: none; opacity: 1; }
      .game-card, .cover-img, .enter-arrow { transition: none; }
    }
  </style>
</head>
<body>
  <div class="bg-atmos">
    <div class="bg-grid"></div>
    <div class="bg-orb wuwa"></div>
    <div class="bg-orb zzz"></div>
  </div>
  <div class="bg-noise"></div>

  <div class="container">
    <!-- Header -->
    <div class="header rise">
      <div class="logo-row">
        <div class="logo-icon">估</div>
        <div class="site-name">游戏账号估价平台</div>
      </div>
      <div class="tagline">精准估值<span class="sep">·</span>买卖参考<span class="sep">·</span>实时监控</div>

      <div class="stats-row">
        <div class="stat-cell">
          <div class="stat-num">2</div>
          <div class="stat-label">支持游戏</div>
        </div>
        <div class="stat-cell">
          <div class="stat-num">4</div>
          <div class="stat-label">交易平台数据源</div>
        </div>
        <div class="stat-cell">
          <div class="stat-num">24h</div>
          <div class="stat-label">实时上新监控</div>
        </div>
      </div>
    </div>

    <!-- 游戏选择 -->
    <div class="section-head rise d1">
      <span class="tick">01 / SELECT GAME</span>
      <span class="line"></span>
      <span class="cn">选择游戏 · 开始估价</span>
    </div>

    <div class="hero-grid">
      <!-- 鸣潮 -->
      <a class="game-card wuwa rise d2" href="/wuwa">
        <img class="cover-img" src="/public/covers/wuwa-cover.jpg" alt="鸣潮" loading="eager">
        <div class="cover-tint"></div>
        <div class="cover-shade"></div>
        <div class="hud-corner tl"></div>
        <div class="hud-corner br"></div>
        <span class="cover-badge available"><span class="pulse-dot"></span>正 常 运 行</span>
        <div class="card-info">
          <div class="game-title-row">
            <div class="game-title">鸣潮</div>
            <div class="game-sub">WUTHERING WAVES</div>
          </div>
          <div class="game-desc">账号价值评估 · 角色武器命座精算 · 四大平台行情参考</div>
          <div class="enter-row">进入估价 <span class="enter-arrow">&#10142;</span></div>
        </div>
      </a>

      <!-- 绝区零 -->
      <a class="game-card zzz rise d3" href="/zzz">
        <img class="cover-img" src="/public/covers/zzz-cover.jpg" alt="绝区零" loading="eager">
        <div class="cover-tint"></div>
        <div class="cover-shade"></div>
        <div class="hud-corner tl"></div>
        <div class="hud-corner br"></div>
        <span class="cover-badge beta"><span class="pulse-dot"></span>BE TA 测 试</span>
        <div class="card-info">
          <div class="game-title-row">
            <div class="game-title">绝区零</div>
            <div class="game-sub">ZENLESS ZONE ZERO</div>
          </div>
          <div class="game-desc">代理人价值评估 · 音擎影画定价 · 定价数据持续完善</div>
          <div class="enter-row">进入估价 <span class="enter-arrow">&#10142;</span></div>
        </div>
      </a>
    </div>

    <!-- 即将上线 -->
    <div class="section-head rise d4">
      <span class="tick">02 / COMING SOON</span>
      <span class="line"></span>
      <span class="cn">即将上线</span>
    </div>

    <div class="soon-row rise d4">
      <div class="soon-chip">
        <div class="soon-icon huan">异</div>
        <div>
          <div class="soon-name">异环</div>
          <div class="soon-label">开发中</div>
        </div>
      </div>
      <div class="soon-chip">
        <div class="soon-icon endfield">终</div>
        <div>
          <div class="soon-name">明日方舟：终末地</div>
          <div class="soon-label">开发中</div>
        </div>
      </div>
      <div class="soon-chip">
        <div class="soon-icon genshin">原</div>
        <div>
          <div class="soon-name">原神</div>
          <div class="soon-label">开发中</div>
        </div>
      </div>
      <div class="soon-chip">
        <div class="soon-icon starrail">星</div>
        <div>
          <div class="soon-name">崩坏：星穹铁道</div>
          <div class="soon-label">开发中</div>
        </div>
      </div>
    </div>

    <!-- 平台特性 -->
    <div class="section-head rise d5">
      <span class="tick">03 / WHY US</span>
      <span class="line"></span>
      <span class="cn">平台特性</span>
    </div>

    <div class="features-grid rise d5">
      <div class="feature-card">
        <div class="feature-idx">FEAT.01</div>
        <div class="feature-title">多维估值引擎</div>
        <div class="feature-desc">角色命座、专武精炼、配队溢价、资源抽数逐项计价，支持自定义定价规则，估值逻辑透明可调。</div>
      </div>
      <div class="feature-card">
        <div class="feature-idx">FEAT.02</div>
        <div class="feature-title">多平台数据兼容</div>
        <div class="feature-desc">支持螃蟹网、盼之、氪金兽、7881 四大交易平台商品描述，粘贴文本即可完成估价。</div>
      </div>
      <div class="feature-card">
        <div class="feature-idx">FEAT.03</div>
        <div class="feature-title">实时上新监控</div>
        <div class="feature-desc">油猴监控脚本实时盯盘各平台新上架账号，高性价比账号自动推送提醒，捡漏快人一步。</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer rise d5">
      <div class="copyright">&copy; <span class="mono">2024-2026</span> 游戏账号估价平台 · 仅供行情参考，不参与任何账号交易</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = getPlatformPage;
