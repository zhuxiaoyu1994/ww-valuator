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
    body {
      background: linear-gradient(160deg, #0a0a1a 0%, #0f0f2a 100%);
      background-attachment: fixed;
      color: #e0e0e0;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1080px; margin: 0 auto; }

    /* Header */
    .header {
      text-align: center;
      padding: 48px 24px 32px;
    }
    .logo-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .logo-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #e94560 0%, #ff7a45 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 800; color: #fff;
      box-shadow: 0 6px 24px rgba(233, 69, 96, 0.35);
    }
    .site-name {
      font-size: 30px; font-weight: 800;
      background: linear-gradient(90deg, #e94560, #fbbf24, #4ade80);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 1px;
    }
    .tagline {
      color: #999;
      font-size: 15px;
      letter-spacing: 2px;
    }
    .tagline .dot { color: #e94560; margin: 0 8px; }

    /* Section title */
    .section-title {
      text-align: center;
      color: #ccc;
      font-size: 18px;
      font-weight: 600;
      margin: 8px 0 28px;
      letter-spacing: 1px;
    }

    /* Game cards grid */
    .games-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 48px;
    }
    .game-card {
      position: relative;
      background: linear-gradient(160deg, #14142e 0%, #1a1a38 100%);
      border: 1px solid #2a2a4a;
      border-radius: 18px;
      padding: 32px 24px;
      text-decoration: none;
      color: inherit;
      transition: transform 0.28s cubic-bezier(.2,.8,.2,1), box-shadow 0.28s, border-color 0.28s;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .game-card.clickable { cursor: pointer; }
    .game-card.clickable:hover {
      transform: translateY(-8px);
      box-shadow: 0 18px 48px rgba(0,0,0,0.45);
    }
    .game-card.wuwa:hover { border-color: rgba(233, 69, 96, 0.6); box-shadow: 0 18px 48px rgba(233, 69, 96, 0.18); }
    .game-card.disabled { cursor: not-allowed; opacity: 0.78; }
    .game-card.disabled:hover { transform: none; box-shadow: none; }

    /* glow accent */
    .game-card .accent {
      position: absolute;
      top: -40px; right: -40px;
      width: 140px; height: 140px;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.35;
      pointer-events: none;
    }
    .game-card.wuwa .accent { background: #e94560; }
    .game-card.zzz .accent { background: #ffb84d; }
    .game-card.huan .accent { background: #7c5cff; }
    .game-card.endfield .accent { background: #4ade80; }
    .game-card.delta .accent { background: #3b82f6; }
    .game-card.honor .accent { background: #f0c040; }

    /* Icon */
    .game-icon {
      width: 84px; height: 84px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 36px; font-weight: 800; color: #fff;
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }
    .game-icon.wuwa { background: linear-gradient(135deg, #e94560 0%, #ff6b4a 100%); box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4); }
    .game-icon.zzz { background: linear-gradient(135deg, #ffb84d 0%, #ff8a3d 100%); }
    .game-icon.huan { background: linear-gradient(135deg, #7c5cff 0%, #5b8cff 100%); }
    .game-icon.endfield { background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); }
    .game-icon.delta { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .game-icon.honor { background: linear-gradient(135deg, #f0c040 0%, #eab308 100%); }

    .game-name {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .game-card.wuwa .game-name { color: #ff6b7a; }
    .game-card.zzz .game-name { color: #ffb84d; }
    .game-card.huan .game-name { color: #9d7cff; }
    .game-card.endfield .game-name { color: #4ade80; }
    .game-card.delta .game-name { color: #60a5fa; }
    .game-card.honor .game-name { color: #f0c040; }

    .game-desc {
      font-size: 13px;
      color: #888;
      line-height: 1.7;
      margin-bottom: 18px;
      min-height: 44px;
      position: relative;
      z-index: 1;
    }

    .status-badge {
      display: inline-block;
      padding: 5px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
    }
    .status-badge.available { background: rgba(74, 222, 128, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); }
    .status-badge.soon { background: rgba(156, 163, 175, 0.15); color: #9ca3af; border: 1px solid rgba(156, 163, 175, 0.25); }

    /* Coming soon overlay */
    .coming-soon-mask {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 10, 26, 0.55);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      z-index: 2;
    }
    .coming-soon-text {
      font-size: 22px;
      font-weight: 800;
      color: #e0e0e0;
      letter-spacing: 4px;
      text-shadow: 0 2px 12px rgba(0,0,0,0.6);
      transform: rotate(-12deg);
      padding: 10px 28px;
      border: 2px solid rgba(224, 224, 224, 0.3);
      border-radius: 10px;
      background: rgba(20, 20, 40, 0.5);
    }

    .enter-arrow {
      margin-top: 14px;
      font-size: 13px;
      color: #e94560;
      font-weight: 600;
      position: relative;
      z-index: 1;
      transition: transform 0.28s;
    }
    .game-card.clickable:hover .enter-arrow { transform: translateX(4px); }

    /* Footer */
    .footer {
      text-align: center;
      padding: 32px 16px;
      border-top: 1px solid #1f1f3a;
      margin-top: 24px;
    }
    .footer .copyright {
      color: #666;
      font-size: 13px;
      margin-bottom: 10px;
    }
    .footer .qq-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border: 1px solid #2a2a4a;
      border-radius: 20px;
      color: #888;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .footer .qq-link:hover { color: #4ade80; border-color: rgba(74,222,128,0.4); }

    @media (max-width: 768px) {
      .games-grid { grid-template-columns: 1fr; }
      .header { padding: 32px 16px 20px; }
      .site-name { font-size: 24px; }
      .logo-icon { width: 44px; height: 44px; font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-wrap">
        <div class="logo-icon">估</div>
        <div class="site-name">游戏账号估价平台</div>
      </div>
      <div class="tagline">精准估值<span class="dot">·</span>买卖参考<span class="dot">·</span>实时监控</div>
    </div>

    <div class="section-title">选择游戏 · 开始估价</div>

    <!-- Game cards -->
    <div class="games-grid">
      <!-- 鸣潮 -->
      <a class="game-card wuwa clickable" href="/wuwa">
        <div class="accent"></div>
        <div class="game-icon wuwa">鸣</div>
        <div class="game-name">鸣潮</div>
        <div class="game-desc">账号价值评估 · 角色武器定价 · 螃蟹网监控</div>
        <span class="status-badge available">可用</span>
        <div class="enter-arrow">进入估价 →</div>
      </a>

      <!-- 绝区零 -->
      <div class="game-card zzz disabled">
        <div class="accent"></div>
        <div class="game-icon zzz">绝</div>
        <div class="game-name">绝区零</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 异环 -->
      <div class="game-card huan disabled">
        <div class="accent"></div>
        <div class="game-icon huan">异</div>
        <div class="game-name">异环</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 明日方舟：终末地 -->
      <div class="game-card endfield disabled">
        <div class="accent"></div>
        <div class="game-icon endfield">终</div>
        <div class="game-name">明日方舟：终末地</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 三角洲行动 -->
      <div class="game-card delta disabled">
        <div class="accent"></div>
        <div class="game-icon delta">三</div>
        <div class="game-name">三角洲行动</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>

      <!-- 王者荣耀 -->
      <div class="game-card honor disabled">
        <div class="accent"></div>
        <div class="game-icon honor">王</div>
        <div class="game-name">王者荣耀</div>
        <div class="game-desc">账号估价即将上线</div>
        <span class="status-badge soon">敬请期待</span>
        <div class="coming-soon-mask">
          <div class="coming-soon-text">敬请期待</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="copyright">© 2024 游戏账号估价平台 · 仅供行情参考，不参与任何账号交易</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = getPlatformPage;
