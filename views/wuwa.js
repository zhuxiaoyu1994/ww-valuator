'use strict';

function getPageHTML(options) {
  options = options || {};
  const pxb7Proxies = options.pxb7Proxies || [];
  const charList = options.charList || [];
  const sigWeapons = options.sigWeapons || {};
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
      --nav-h: 60px;
      --nav-total: calc(var(--nav-h) + env(safe-area-inset-top, 0px));
    }

    html {
      scroll-behavior: smooth;
      scroll-padding-top: calc(var(--nav-total) + 12px);
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
    }
    .container { position: relative; z-index: 2; max-width: 880px; margin: 0 auto; padding: 0 20px 44px; }

    /* ===== 顶部导航栏 ===== */
    .top-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      height: var(--nav-total);
      padding-top: env(safe-area-inset-top, 0px);
      box-sizing: border-box;
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
      color: #e63946;
      font-weight: 700;
    }
    .nav-links {
      margin-left: auto;
      display: flex; align-items: center; gap: 4px;
    }
    .nav-link {
      padding: 8px 16px;
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      font-size: 14px;
      border-radius: 6px;
      transition: all 0.2s;
      position: relative;
    }
    .nav-link:hover { color: #e63946; background: rgba(230, 57, 70, 0.08); }
    .nav-link.active {
      color: #e63946;
      font-weight: 600;
    }
    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: 2px; left: 50%;
      transform: translateX(-50%);
      width: 20px; height: 2px;
      background: #e63946;
      border-radius: 1px;
    }
    /* 给页面内容留出导航栏高度（含刘海安全区） */
    body { padding-top: var(--nav-total); }
    @media (max-width: 640px) {
      .top-nav-inner { padding: 0 10px; gap: 8px; }
      .nav-logo img { width: 28px; height: 28px; border-radius: 6px; }
      .nav-logo span { display: none; }
      .nav-links {
        gap: 0;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        flex: 1;
        justify-content: flex-end;
        scrollbar-width: none;
      }
      .nav-links::-webkit-scrollbar { display: none; }
      .nav-link {
        padding: 6px 8px;
        font-size: 12px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .nav-link.active::after { display: none; }
    }

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

    /* 可视化编辑器 */
    .visual-editor {
      display: none;
    }
    .visual-editor.active {
      display: block;
    }
    .ve-section-title {
      font-size: 13px;
      color: var(--text-dim);
      margin-bottom: 10px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ve-section-title .ve-count {
      color: var(--accent);
      font-weight: 600;
    }
    /* 可视化编辑左右布局 */
    .ve-main-row {
      display: grid;
      grid-template-columns: 1fr 200px;
      gap: 16px;
      align-items: start;
    }
    .ve-main-left { min-width: 0; }
    .ve-main-right { position: sticky; top: 10px; }
    .ve-side-card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px;
    }
    .ve-side-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }
    @media (max-width: 640px) {
      .ve-main-row { grid-template-columns: 1fr; }
      .ve-main-right { position: static; }
    }

    .ve-char-grid {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
      min-height: 60px;
    }
    .ve-char-grid.parsing::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(10, 10, 20, 0.6);
      backdrop-filter: blur(2px);
      border-radius: 12px;
      z-index: 10;
    }
    .ve-char-grid.parsing::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 28px;
      height: 28px;
      margin: -14px 0 0 -14px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      z-index: 11;
    }
    .ve-char-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px;
      cursor: default;
      transition: all 0.2s;
      width: calc(33.333% - 7px);
    }
    .ve-char-card:hover {
      border-color: rgba(96, 165, 250, 0.4);
    }
    .ve-char-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ve-char-card .ve-char-avatar {
      width: 38px;
      height: 38px;
      border: 2px solid transparent;
    }
    /* 头像边框颜色和等级一致 */
    .ve-char-card .ve-char-avatar.S { border-color: #e94560; background: linear-gradient(135deg, #e94560, #c73550); }
    .ve-char-card .ve-char-avatar.A { border-color: #fbbf24; background: linear-gradient(135deg, #fbbf24, #d97706); }
    .ve-char-card .ve-char-avatar.B { border-color: #60a5fa; background: linear-gradient(135deg, #60a5fa, #3b82f6); }
    .ve-char-card .ve-char-avatar.C { border-color: #4ade80; background: linear-gradient(135deg, #4ade80, #22c55e); }
    .ve-char-card .ve-char-avatar.D { border-color: #9ca3af; background: linear-gradient(135deg, #9ca3af, #6b7280); }
    .ve-char-card .ve-char-info {
      flex: 1;
      min-width: 0;
    }
    .ve-char-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
    .ve-char-card .ve-char-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .ve-char-card .ve-char-price {
      font-size: 12px;
      font-weight: 700;
      color: #fbbf24;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .ve-char-card .ve-char-price.muted {
      color: #555;
      font-weight: 500;
    }
    .ve-char-card .ve-char-tier {
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 2px;
    }
    .ve-char-card .ve-char-tier .tier-badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 10px;
    }
    .ve-char-card .ve-char-tier .tier-badge.S { background: rgba(233,69,96,0.12); color: #ff6b83; }
    .ve-char-card .ve-char-tier .tier-badge.A { background: rgba(251,191,36,0.12); color: #fbbf24; }
    .ve-char-card .ve-char-tier .tier-badge.B { background: rgba(96,165,250,0.12); color: #60a5fa; }
    .ve-char-card .ve-char-tier .tier-badge.C { background: rgba(74,222,128,0.1); color: #4ade80; }
    .ve-char-card .ve-char-tier .tier-badge.D { background: rgba(156,163,175,0.1); color: #9ca3af; }
    .ve-char-selects {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ve-char-selects select {
      width: 100%;
      padding: 4px 6px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--bg-soft);
      color: var(--text);
      font-size: 11px;
      font-family: inherit;
      outline: none;
      cursor: pointer;
      text-align: center;
    }
    .ve-char-selects select:focus {
      border-color: var(--accent);
    }
    .ve-char-price {
      font-size: 12px;
      font-weight: 600;
      color: #fbbf24;
      text-align: center;
      margin-top: 2px;
    }
    .ve-char-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.8);
      color: #fff;
      font-size: 14px;
      line-height: 18px;
      text-align: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 2;
    }
    .ve-char-card:hover .ve-char-remove {
      opacity: 1;
    }
    .ve-char-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      background: linear-gradient(135deg, #4a5568, #2d3748);
      overflow: hidden;
      position: relative;
    }
    .ve-char-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .ve-char-avatar.S { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .ve-char-avatar.A { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
    .ve-char-avatar.B { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .ve-char-avatar.C { background: linear-gradient(135deg, #10b981, #059669); }
    .ve-char-avatar.D { background: linear-gradient(135deg, #64748b, #475569); }
    .ve-char-avatar.E { background: linear-gradient(135deg, #4a5568, #2d3748); }
    .ve-char-info {
      flex: 1;
      min-width: 0;
    }
    .ve-char-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ve-char-meta {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 2px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .ve-char-meta .tag {
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
    }
    .ve-char-meta .tag.const {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }
    .ve-char-meta .tag.sig {
      background: rgba(96, 165, 250, 0.15);
      color: #60a5fa;
    }
    .ve-char-meta .tag.price {
      color: #4ade80;
      font-weight: 600;
    }
    .ve-char-remove {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ef4444;
      color: #fff;
      font-size: 12px;
      line-height: 18px;
      text-align: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
      border: 2px solid var(--bg-soft);
    }
    .ve-char-card:hover .ve-char-remove {
      opacity: 1;
    }
    .ve-add-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 12px;
      border: 1px dashed var(--line);
      border-radius: 10px;
      background: transparent;
      color: var(--text-dim);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 18px;
    }
    .ve-add-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      background: rgba(37, 99, 235, 0.05);
    }
    /* 顶部显眼的添加角色按钮（红色） */
    .ve-add-char-top {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      padding: 14px;
      border: 2px solid #ef4444;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06));
      color: #f87171;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      position: relative;
      z-index: 2;
    }
    .ve-add-char-top:hover {
      background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1));
      border-color: #f87171;
      color: #fca5a5;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(239,68,68,0.3);
    }
    /* 移动端添加角色按钮默认隐藏 */
    .ve-add-char-mobile { display: none; }
    .ve-resource-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }
    .ve-resource-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ve-resource-item label {
      font-size: 11px;
      color: var(--text-dim);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .ve-resource-item .res-icon {
      font-size: 13px;
    }
    .ve-resource-item input {
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--bg-soft);
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .ve-resource-item input:focus {
      border-color: var(--accent);
    }
    .ve-actions {
      display: flex;
      gap: 10px;
      margin-top: 8px;
    }
    .ve-actions .ve-btn {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--bg-soft);
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ve-actions .ve-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .ve-actions .ve-btn.primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      color: #fff;
      border-color: transparent;
      font-weight: 600;
    }
    .ve-actions .ve-btn.primary:hover {
      filter: brightness(1.1);
      color: #fff;
    }

    /* 移动端估价按钮区（默认隐藏） */
    .ve-mobile-eval {
      display: none;
    }

    /* 角色选择器弹层 */
    .char-picker {
      position: absolute;
      z-index: 1000;
      width: 480px;
      max-height: 520px;
      overflow-y: auto;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      padding: 14px;
    }
    .char-picker-search {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--bg-soft);
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      margin-bottom: 10px;
    }
    .char-picker-search:focus {
      border-color: var(--accent);
    }
    .char-picker-tiers {
      display: flex;
      gap: 4px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .char-picker-tier-btn {
      padding: 4px 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: transparent;
      color: var(--text-dim);
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
    }
    .char-picker-tier-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .char-picker-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .char-picker-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 4px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--bg-soft);
      cursor: pointer;
      transition: all 0.15s;
    }
    .char-picker-item:hover {
      border-color: var(--accent);
      background: rgba(37, 99, 235, 0.1);
    }
    .char-picker-item.selected {
      border-color: #4ade80;
      background: rgba(74, 222, 128, 0.1);
    }
    .char-picker-item .cp-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, #4a5568, #2d3748);
      overflow: hidden;
      flex-shrink: 0;
    }
    .char-picker-item .cp-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .char-picker-item .cp-avatar.S { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .char-picker-item .cp-avatar.A { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
    .char-picker-item .cp-avatar.B { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .char-picker-item .cp-avatar.C { background: linear-gradient(135deg, #10b981, #059669); }
    .char-picker-item .cp-avatar.D { background: linear-gradient(135deg, #64748b, #475569); }
    .char-picker-item .cp-name {
      font-size: 11px;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .char-picker-item .cp-price {
      font-size: 10px;
      color: var(--text-dim);
    }

    /* 买卖攻略弹窗侧边导航 */
    .tips-sidenav {
      display: flex;
      flex-direction: column;
    }
    .tips-nav-item {
      padding: 10px 20px;
      font-size: 13px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
      border-left: 2px solid transparent;
    }
    .tips-nav-item:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.02);
    }
    .tips-nav-item.active {
      color: var(--accent);
      background: rgba(251, 191, 36, 0.06);
      border-left-color: var(--accent);
      font-weight: 600;
    }

    /* 角色编辑弹窗（命座/专武） */
    .char-edit-modal {
      position: fixed;
      inset: 0;
      z-index: 1001;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .char-edit-dialog {
      width: 320px;
      max-width: 90vw;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 20px;
    }
    .char-edit-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .char-edit-header h3 {
      font-size: 16px;
      color: var(--text);
    }
    .char-edit-field {
      margin-bottom: 14px;
    }
    .char-edit-field label {
      display: block;
      font-size: 12px;
      color: var(--text-dim);
      margin-bottom: 6px;
    }
    .const-slider {
      display: flex;
      gap: 6px;
    }
    .const-btn {
      flex: 1;
      padding: 8px 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--bg-soft);
      color: var(--text-dim);
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .const-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .const-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
      font-weight: 600;
    }
    .sig-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--bg-soft);
      cursor: pointer;
    }
    .sig-toggle .sig-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sig-toggle .sig-name {
      font-size: 13px;
      color: var(--text);
      font-weight: 500;
    }
    .sig-toggle .sig-desc {
      font-size: 11px;
      color: var(--text-dim);
    }
    .sig-switch {
      width: 40px;
      height: 22px;
      border-radius: 11px;
      background: var(--line);
      position: relative;
      transition: background 0.2s;
    }
    .sig-switch.on {
      background: var(--accent);
    }
    .sig-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s;
    }
    .sig-switch.on::after {
      transform: translateX(18px);
    }
    .refine-select {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    .refine-btn {
      flex: 1;
      padding: 6px 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--bg-soft);
      color: var(--text-dim);
      font-size: 11px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }
    .refine-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .refine-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
      font-weight: 600;
    }
    .char-edit-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .char-edit-actions button {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .char-edit-actions .ce-cancel {
      background: var(--bg-soft);
      color: var(--text-dim);
      border: 1px solid var(--line);
    }
    .char-edit-actions .ce-confirm {
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      color: #fff;
      font-weight: 600;
    }
    .char-edit-actions .ce-delete {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .char-edit-actions .ce-delete:hover {
       background: rgba(239, 68, 68, 0.2);
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
      position: relative;
    }
    .eval-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
    .eval-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .eval-btn.loading {
      color: transparent !important;
      pointer-events: none;
    }
    .eval-btn.loading::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 18px;
      height: 18px;
      margin: -9px 0 0 -9px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

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
      word-break: break-word;
      overflow-wrap: break-word;
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
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: bottom;
    }
    .history-tag:hover { border-color: var(--accent); color: var(--text); }

    .loading {
      text-align: center;
      padding: 22px;
      color: var(--text-dim);
      font-size: 14px;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .loading::before {
      content: '';
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
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
      object-fit: contain;
      background: #fff;
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
      .input-row { flex-direction: column !important; }
      .price-input { width: 100% !important; }
      .eval-btn { width: 100% !important; }
      .clear-btn { width: 100% !important; height: 40px; }
      .qq-group-card { flex-direction: column; text-align: center; }
      .tab-btn { padding: 10px 8px; font-size: 13px; }
      .input-card, .result-card { padding: 16px; }
      .result-row { flex-wrap: wrap; gap: 2px 8px; font-size: 13px; }
      .result-row .key { min-width: 60px; }
      .result-row .val { flex: 1; text-align: right; word-break: break-word; }
      .result-summary .big-value { font-size: 32px; }
      .char-tags { gap: 5px; }
      .char-tag { font-size: 11px; padding: 2px 8px; }
      .help-popup { max-width: calc(100vw - 30px) !important; font-size: 12px; padding: 12px 14px; }
      #stats-modal > div { max-width: 95% !important; margin: 10px auto !important; padding: 14px !important; }
      #stats-modal-content > div[style*="grid"] { grid-template-columns: repeat(2, 1fr) !important; }
      /* 可视化编辑器移动端 */
      .tab-btn { font-size: 12px; padding: 10px 6px; letter-spacing: 0; }
      .ve-char-card { min-width: 130px; flex: 1 1 calc(50% - 5px); padding: 8px 10px 8px 8px; }
      .ve-char-avatar { width: 34px; height: 34px; font-size: 14px; }
      .ve-char-name { font-size: 13px; }
      .ve-char-remove { opacity: 1; }
      .ve-resource-grid { grid-template-columns: repeat(2, 1fr); }
      .ve-actions { flex-direction: column; }
      .char-picker { width: calc(100vw - 30px); max-width: 320px; }
      .char-picker-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 375px) {
      .result-summary .big-value { font-size: 26px; }
      .hero-title h1 { font-size: 22px; }
    }

    /* ===== 桌面端双栏布局 ===== */
    @media (min-width: 1024px) {
      .container { max-width: 1100px; }
      .main-layout {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 24px;
        align-items: start;
      }
      .main-left { min-width: 0; }
      .main-right {
        position: sticky;
        top: 80px;
      }
      /* 详细结果占满底部（桌面端隐藏，内容都在右侧） */
      .result-full {
        display: none;
      }
      /* 桌面端隐藏原有的 result-summary */
      .result-card .result-summary { display: none; }
      .result-card .result-divider:first-of-type { display: none; }
    }

    /* ===== 侧边摘要卡 ===== */
    .side-summary {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 24px;
      display: none;
    }
    @media (min-width: 1024px) {
      .side-summary { display: block; }
    }
    .side-summary .ss-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .side-summary .ss-price {
      font-size: 36px;
      font-weight: 700;
      color: var(--accent);
      line-height: 1.1;
      margin-bottom: 2px;
    }
    .side-summary .ss-price .unit {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-left: 4px;
    }
    .side-summary .ss-range {
      font-size: 12px;
      color: #60a5fa;
      margin-bottom: 14px;
      font-weight: 500;
    }
    .side-summary .ss-ratio {
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 16px;
    }
    .side-summary .ss-ratio.good {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .side-summary .ss-ratio.ok {
      background: rgba(251, 191, 36, 0.1);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.2);
    }
    .side-summary .ss-ratio.bad {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .side-summary .ss-section-title {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
    }
    .side-summary .ss-collapse-title {
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    .side-summary .ss-collapse-title:hover {
      color: var(--text-secondary);
    }
    .side-summary .ss-collapse-arrow {
      font-size: 9px;
      transition: transform 0.2s;
    }
    .side-summary .ss-collapse-arrow.open {
      transform: rotate(90deg);
    }
    .side-summary .ss-highlights {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .side-summary .ss-hl-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }
    .side-summary .ss-hl-item .k { color: var(--text-muted); }
    .side-summary .ss-hl-item .v { color: var(--text); font-weight: 600; }
    .side-summary .ss-hl-item .v.good { color: #4ade80; }
    .side-summary .ss-hl-item .v.warn { color: #fbbf24; }
    .side-summary .ss-hl-item .v.danger { color: #f87171; }
    .side-summary .ss-hl-item .k {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .side-summary .hl-tip {
      position: relative;
      display: inline-block;
      width: 14px;
      height: 14px;
      line-height: 14px;
      text-align: center;
      background: rgba(74, 222, 128, 0.15);
      color: #4ade80;
      border-radius: 50%;
      font-size: 10px;
      cursor: help;
      font-style: normal;
      flex-shrink: 0;
    }
    .side-summary .hl-tip .tooltip {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 6px;
      padding: 6px 10px;
      background: #1a1a2e;
      border: 1px solid var(--line);
      border-radius: 6px;
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
      z-index: 100;
      transition: all 0.2s;
      pointer-events: none;
      font-weight: 400;
      bottom: auto;
      top: 100%;
      left: 0;
      transform: none;
      margin-top: 4px;
    }
    .side-summary .hl-tip:hover .tooltip {
      visibility: visible;
      opacity: 1;
    }
    .side-summary .ss-calc {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.7;
    }
    .side-summary .ss-calc-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
    }
    .side-summary .ss-calc-row .label {
      color: var(--text-muted);
    }
    .side-summary .ss-calc-row .val {
      font-weight: 600;
      color: var(--text);
    }
    .side-summary .ss-calc-row .val.neg { color: #f87171; }
    .side-summary .ss-calc-row .val.pos { color: #4ade80; }
    .side-summary .ss-calc-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 8px;
      margin-top: 4px;
      border-top: 1px dashed var(--line);
      font-weight: 700;
      font-size: 13px;
    }
    .side-summary .ss-calc-total .val {
      color: #fbbf24;
      font-size: 15px;
    }
    /* 爱发电模块 */
    .side-summary .ss-afdian {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      background: linear-gradient(135deg, rgba(255, 107, 157, 0.08), rgba(255, 159, 67, 0.08));
      border: 1px solid rgba(255, 107, 157, 0.2);
      border-radius: 10px;
      margin-top: 4px;
    }
    .side-summary .ss-afdian-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .side-summary .ss-afdian-text {
      flex: 1;
      min-width: 0;
    }
    .side-summary .ss-afdian-title {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 2px;
    }
    .side-summary .ss-afdian-desc {
      font-size: 11px;
      color: var(--text-muted);
    }
    .side-summary .ss-afdian-btn {
      flex-shrink: 0;
      padding: 6px 14px;
      background: linear-gradient(135deg, #ff6b9d, #ff9f43);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      border-radius: 20px;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .side-summary .ss-afdian-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 107, 157, 0.4);
    }
    /* tooltip 样式 */
    .ss-calc-row .label {
      position: relative;
      cursor: help;
      border-bottom: 1px dotted var(--text-muted);
    }
    .ss-calc-row .label .tooltip {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 6px;
      padding: 8px 10px;
      background: #1a1a2e;
      border: 1px solid var(--line);
      border-radius: 6px;
      font-size: 11px;
      color: var(--text-secondary);
      line-height: 1.5;
      white-space: normal;
      width: 200px;
      text-align: left;
      z-index: 100;
      transition: all 0.2s;
      pointer-events: none;
      font-weight: 400;
    }
    .ss-calc-row .label:hover .tooltip {
      visibility: visible;
      opacity: 1;
    }
    .side-summary .ss-empty {
      text-align: center;
      padding: 30px 10px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .side-summary .ss-empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
    .side-summary .ss-action-btn {
      width: 100%;
      margin-top: 16px;
      padding: 10px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 8px;
      color: var(--accent);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .side-summary .ss-action-btn:hover {
      background: rgba(251, 191, 36, 0.15);
    }
    .side-summary .ss-stats-link {
      margin-top: 10px;
      padding: 8px 10px;
      text-align: center;
      font-size: 11px;
      color: var(--text-dim);
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .side-summary .ss-stats-link:hover {
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.03);
    }
    .side-summary .ss-stats-link span {
      margin-right: 4px;
    }
    /* 估价按钮（红色） */
    .side-summary .eval-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border: 1px solid transparent;
      border-radius: 8px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .side-summary .eval-btn:hover {
      filter: brightness(1.1);
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.35);
    }
    .side-summary .ss-divider {
      height: 1px;
      background: var(--line);
      margin: 14px 0;
    }
    .ss-action-section {
      margin-bottom: 4px;
    }

    /* 移动端估值详情弹窗（桌面端样式） */
    @media (min-width: 1024px) {
      .mobile-detail-container {
        max-width: 640px;
        margin: 30px auto;
        background: #0d0d1a;
        border: 1px solid #1e1e33;
        border-radius: 14px;
        padding: 24px;
        min-height: 300px;
      }
      .mobile-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .mobile-detail-title {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
      }
      .mobile-detail-subtitle {
        font-size: 12px;
        color: #888;
        margin-top: 4px;
      }
      .mobile-detail-close {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 4px 10px;
        font-family: inherit;
      }
    }

    /* ===== 移动端浮动结果条 ===== */
    .mobile-float-bar { display: none; }
    @media (max-width: 1023px) {
      /* 移动端隐藏右侧摘要卡，用底部浮动条代替 */
      .main-right { display: none; }
      /* 顶部添加角色按钮：移动端隐藏 */
      .ve-add-char-desktop { display: none; }
      /* 角色列表下方添加角色按钮：移动端显示 */
      .ve-add-char-mobile {
        display: flex;
        margin-top: 12px;
      }
      /* 移动端估价按钮（账号描述下方） - 垂直布局 */
      .ve-mobile-eval {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 0;
        margin-bottom: 16px;
        padding-top: 0;
        padding-bottom: 16px;
        border-top: none;
        border-bottom: 1px solid var(--line);
        width: 100%;
        box-sizing: border-box;
      }
      .ve-mobile-eval input {
        width: 100%;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: var(--bg-soft);
        color: var(--text);
        font-size: 16px;
        font-weight: 600;
        font-family: inherit;
        outline: none;
        text-align: center;
        box-sizing: border-box;
      }
      .ve-mobile-eval .eval-btn {
        width: 100%;
        padding: 14px;
        font-size: 15px;
        font-weight: 600;
        border-radius: 10px;
      }
      .mobile-float-bar {
        display: none;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 90;
        background: rgba(10, 10, 20, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid var(--line);
        padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
        align-items: center;
        justify-content: space-between;
        transform: translateY(100%);
        transition: transform 0.3s ease;
        cursor: pointer;
      }
      .mobile-float-bar.show {
        transform: translateY(0);
        display: flex;
      }
      .mobile-float-bar .mfb-price {
        font-size: 20px;
        font-weight: 700;
        color: var(--accent);
      }
      .mobile-float-bar .mfb-price .unit {
        font-size: 12px;
        color: var(--text-dim);
        margin-left: 2px;
        font-weight: 400;
      }
      .mobile-float-bar .mfb-info {
        font-size: 11px;
        color: var(--text-faint);
      }
      .mobile-float-bar .mfb-ratio {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 20px;
      }
      .mobile-float-bar .mfb-ratio.good { background: rgba(34,197,94,0.15); color: #4ade80; }
      .mobile-float-bar .mfb-ratio.ok { background: rgba(251,191,36,0.15); color: #fbbf24; }
      .mobile-float-bar .mfb-ratio.bad { background: rgba(239,68,68,0.15); color: #f87171; }
      .mobile-float-bar .mfb-detail-hint {
        color: var(--accent);
        font-size: 11px;
        margin-left: 4px;
      }
      /* 移动端底部留出浮动条空间 */
      body.has-float-bar { padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)); }

      /* 移动端估值详情弹窗 - 单屏自适应（不超出屏幕边界） */
      #mobile-detail-modal {
        background: rgba(0,0,0,0.92) !important;
        overflow: hidden !important;
      }
      .mobile-detail-container {
        width: 100% !important;
        max-width: 100% !important;
        height: 100vh !important;
        height: 100dvh !important;
        margin: 0 !important;
        border-radius: 0 !important;
        border: none !important;
        background: var(--bg) !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .mobile-detail-header {
        flex: 0 0 auto !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px !important;
        border-bottom: 1px solid var(--line) !important;
        background: rgba(13, 13, 26, 0.98) !important;
      }
      .mobile-detail-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: var(--text) !important;
        line-height: 1.2 !important;
      }
      .mobile-detail-subtitle {
        font-size: 11px !important;
        color: var(--text-faint) !important;
        margin-top: 2px !important;
      }
      .mobile-detail-close {
        background: none !important;
        border: none !important;
        color: var(--text-dim) !important;
        font-size: 26px !important;
        line-height: 1 !important;
        cursor: pointer !important;
        padding: 2px 10px !important;
        font-family: inherit !important;
        flex-shrink: 0 !important;
      }
      .mobile-detail-body {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        padding: 0 !important;
      }
      /* 移动端估值详情 - 内容区 */
      #mobile-detail-content {
        padding: 12px 14px calc(14px + env(safe-area-inset-bottom, 0px));
      }
      /* 移动端预估价值卡片 */
      .md-hero {
        position: relative;
        padding: 14px 16px 12px;
        border-radius: 14px;
        background: linear-gradient(150deg, rgba(233,69,96,0.14), rgba(233,69,96,0.03));
        border: 1px solid rgba(233,69,96,0.22);
        margin-bottom: 10px;
        overflow: hidden;
      }
      .md-hero::after {
        content: '';
        position: absolute;
        top: -60px; right: -40px;
        width: 160px; height: 160px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(233,69,96,0.18), transparent 70%);
        pointer-events: none;
      }
      .md-hero-label {
        position: relative;
        font-size: 11px;
        letter-spacing: 1px;
        color: var(--text-dim);
        margin-bottom: 2px;
      }
      .md-hero-price {
        position: relative;
        font-size: 36px;
        font-weight: 800;
        line-height: 1.05;
        color: var(--accent);
        font-variant-numeric: tabular-nums;
      }
      .md-hero-price .unit {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-dim);
        margin-left: 3px;
      }
      .md-hero-foot {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 8px;
        min-height: 22px;
      }
      .md-hero-range {
        font-size: 11px;
        color: #60a5fa;
        font-weight: 500;
      }
      .md-hero-ratio {
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
      }
      .md-hero-ratio.good { background: rgba(34,197,94,0.15); color: #4ade80; }
      .md-hero-ratio.ok { background: rgba(251,191,36,0.15); color: #fbbf24; }
      .md-hero-ratio.bad { background: rgba(239,68,68,0.15); color: #f87171; }

      /* 移动端详情 - 区块卡片 */
      .md-sec {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px 14px;
        margin-bottom: 10px;
      }
      .md-sec-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.8px;
        color: var(--text-dim);
        margin-bottom: 10px;
      }
      .md-sec-title::before {
        content: '';
        width: 3px;
        height: 12px;
        border-radius: 2px;
        background: var(--accent);
        flex-shrink: 0;
      }
      .md-sec-title.md-collapse {
        cursor: pointer;
        margin-bottom: 0;
      }
      .md-sec-title.md-collapse > span:first-child { flex: 1; }
      .md-arrow {
        font-size: 10px;
        color: var(--text-faint);
        transition: transform 0.2s;
      }
      .md-arrow.open { transform: rotate(180deg); }
      .md-sec-body { margin-top: 10px; }

      /* 移动端核心数据 - 覆盖 ss-highlights 样式 */
      #mobile-detail-content .ss-highlights {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      #mobile-detail-content .ss-hl-item {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 2px;
        min-width: 0;
        padding: 9px 11px;
        background: var(--bg-soft);
        border: 1px solid var(--line-soft);
        border-radius: 9px;
      }
      #mobile-detail-content .ss-hl-item .k {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        font-size: 11px;
        font-weight: 400;
        color: var(--text-dim);
      }
      #mobile-detail-content .ss-hl-item .v {
        font-size: 17px;
        font-weight: 700;
        line-height: 1.2;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }
      #mobile-detail-content .ss-hl-item .v.good { color: var(--good); }
      #mobile-detail-content .ss-hl-item .v.warn { color: var(--warn); }
      #mobile-detail-content .ss-hl-item .v.danger { color: var(--bad); }
      #mobile-detail-content .hl-tip {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: rgba(233,69,96,0.15);
        color: var(--accent);
        font-size: 9px;
        font-style: normal;
        flex-shrink: 0;
      }
      #mobile-detail-content .hl-tip .tooltip {
        visibility: hidden;
        opacity: 0;
        position: absolute;
        bottom: 150%;
        left: 50%;
        transform: translateX(-50%);
        width: 180px;
        padding: 8px 10px;
        background: #1a1a2e;
        border: 1px solid var(--line);
        border-radius: 6px;
        font-size: 11px;
        font-weight: 400;
        line-height: 1.5;
        color: var(--text-dim);
        text-align: left;
        white-space: normal;
        z-index: 20;
        transition: opacity 0.2s;
      }
      #mobile-detail-content .hl-tip:hover .tooltip,
      #mobile-detail-content .hl-tip:active .tooltip {
        visibility: visible;
        opacity: 1;
      }

      /* 移动端估价计算 - 覆盖 ss-calc 样式 */
      #mobile-detail-content .ss-calc {
        font-size: 12px;
        line-height: 1.6;
      }
      #mobile-detail-content .ss-calc-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 7px 0;
        border-bottom: 1px solid var(--line-soft);
      }
      #mobile-detail-content .ss-calc-row:last-child {
        border-bottom: none;
      }
      #mobile-detail-content .ss-calc-row .label {
        min-width: 0;
        font-size: 12px;
        color: var(--text-dim);
      }
      #mobile-detail-content .ss-calc-row .val {
        flex-shrink: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }
      #mobile-detail-content .ss-calc-row .val.neg { color: var(--bad); }
      #mobile-detail-content .ss-calc-row .val.pos { color: var(--good); }
      /* 移动端 tooltip 改为左对齐，避免居中时超出左边界 */
      #mobile-detail-content .ss-calc-row .label .tooltip {
        left: 0;
        transform: none;
        max-width: calc(100vw - 60px);
      }
      #mobile-detail-content .ss-calc-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 9px;
        margin-top: 2px;
        border-top: 1px dashed var(--line);
        font-weight: 700;
      }
      #mobile-detail-content .ss-calc-total span:first-child {
        font-size: 12px;
        color: var(--text-dim);
      }
      #mobile-detail-content .ss-calc-total .val {
        font-size: 17px;
        font-weight: 700;
        color: var(--warn);
        font-variant-numeric: tabular-nums;
      }

      /* 移动端详情 - 底部操作区 */
      .md-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .md-stats {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 11px;
        background: var(--bg-soft);
        border: 1px solid var(--line);
        border-radius: 10px;
        color: var(--text-dim);
        font-size: 12px;
        cursor: pointer;
      }
      .md-afdian {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 12px;
        background: linear-gradient(135deg, rgba(255,107,157,0.08), rgba(255,159,67,0.06));
        border: 1px solid rgba(255,107,157,0.2);
        border-radius: 12px;
      }
      .md-afdian-icon { font-size: 24px; flex-shrink: 0; }
      .md-afdian-text { flex: 1; min-width: 0; }
      .md-afdian-title { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 2px; }
      .md-afdian-desc { font-size: 10.5px; color: var(--text-dim); }
      .md-afdian-btn {
        flex-shrink: 0;
        padding: 7px 16px;
        background: linear-gradient(135deg, #ff6b9d, #ff9f43);
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        border-radius: 20px;
        text-decoration: none;
      }

      /* 移动端买卖攻略 & 使用须知弹窗 - 全屏优化 */
      #tips-modal, #guide-modal {
        background: rgba(0,0,0,0.9) !important;
        overflow: hidden !important;
      }
      #tips-modal > div, #guide-modal > div {
        flex-direction: column !important;
        width: 100% !important;
        max-width: 100% !important;
        height: 100vh !important;
        height: 100dvh !important;
        margin: 0 !important;
        border-radius: 0 !important;
        border: none !important;
        overflow: hidden !important;
      }
      #tips-modal > div > div:first-child, #guide-modal > div > div:first-child {
        width: 100% !important;
        border-right: none !important;
        border-bottom: 1px solid var(--line) !important;
        padding: calc(4px + env(safe-area-inset-top, 0px)) 0 4px !important;
        flex-shrink: 0 !important;
      }
      /* 移动端弹窗 - 目录标题隐藏 */
      #tips-modal > div > div:first-child > div:first-child,
      #guide-modal > div > div:first-child > div:first-child {
        display: none !important;
      }
      /* 移动端弹窗 - 目录横向滚动 */
      .tips-sidenav {
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
        padding: 10px 16px !important;
        gap: 8px !important;
        scrollbar-width: none;
        width: 100% !important;
        box-sizing: border-box;
      }
      .tips-sidenav::-webkit-scrollbar { display: none; }
      .tips-nav-item {
        padding: 8px 16px !important;
        font-size: 13px !important;
        border-left: none !important;
        border-radius: 20px !important;
        flex-shrink: 0 !important;
        white-space: nowrap !important;
        background: rgba(255,255,255,0.04) !important;
        color: rgba(255,255,255,0.6) !important;
        margin: 0 !important;
      }
      .tips-nav-item.active {
        border-left: none !important;
        background: rgba(230, 57, 70, 0.15) !important;
        color: #e63946 !important;
        font-weight: 600 !important;
      }
      #tips-modal > div > div:last-child, #guide-modal > div > div:last-child {
        flex: 1 !important;
        max-height: none !important;
        height: 0 !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
        padding: 0 20px 30px !important;
      }
      /* 移动端弹窗关闭按钮 - 右上角 */
      #tips-modal > div > div:last-child > div:first-child,
      #guide-modal > div > div:last-child > div:first-child {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #0d0d1a;
        margin: -16px -20px 12px;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--line);
      }
      #tips-modal > div > div:last-child > div:first-child > div,
      #guide-modal > div > div:last-child > div:first-child > div {
        flex: 1;
      }
      #tips-modal > div > div:last-child > div:first-child button,
      #guide-modal > div > div:last-child > div:first-child button {
        font-size: 22px;
        padding: 4px 12px;
        color: #888;
      }

      /* 移动端角色选择器 - 改为底部弹层，始终完整可见可点击 */
      .char-picker {
        position: fixed !important;
        left: 10px !important;
        right: 10px !important;
        bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important;
        top: auto !important;
        width: auto !important;
        max-width: none !important;
        max-height: 68vh !important;
        border-radius: 16px !important;
        padding: 14px !important;
        box-shadow: 0 -8px 44px rgba(0, 0, 0, 0.7) !important;
        z-index: 100002 !important;
      }
      .char-picker-grid { grid-template-columns: repeat(3, 1fr) !important; }
      .char-picker-item .cp-price { font-size: 11px; }
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
    /* 帮助问号按钮 */
    .help-icon {
      display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;
      border-radius:50%;background:#2a2a4a;color:#888;font-size:11px;
      cursor:pointer;vertical-align:middle;margin-left:4px;
      user-select:none;transition:background 0.2s,color 0.2s;
    }
    .help-icon:hover { background:#3b3b6a;color:#ccc; }
    /* 帮助弹窗 */
    .help-popup {
      position:fixed;z-index:100002;background:#1a1a2e;border:1px solid #3b3b6a;
      border-radius:10px;padding:14px 16px;max-width:300px;font-size:13px;
      color:#ccc;line-height:1.6;box-shadow:0 8px 32px rgba(0,0,0,0.5);
      pointer-events:none;opacity:0;transform:translateY(-6px);
      transition:opacity 0.2s,transform 0.2s;
    }
    .help-popup.show { opacity:1;transform:translateY(0); }
    .help-popup::before {
      content:'';position:absolute;top:-6px;left:20px;
      border-left:6px solid transparent;border-right:6px solid transparent;
      border-bottom:6px solid #3b3b6a;
    }
    .help-popup::after {
      content:'';position:absolute;top:-5px;left:21px;
      border-left:5px solid transparent;border-right:5px solid transparent;
      border-bottom:5px solid #1a1a2e;
    }
  </style>
</head>
<body>
  <!-- 顶部导航栏 -->
  <nav class="top-nav" id="top-nav">
    <div class="top-nav-inner">
      <a href="/wuwa" class="nav-logo">
        <img src="/public/icons/wuwaLogo.jpeg" alt="鸣潮估价">
        <span>鸣潮估价助手</span>
      </a>
      <div class="nav-links">
        <a href="javascript:void(0)" class="nav-link" onclick="openGuideModal()">使用须知</a>
        <a href="javascript:void(0)" class="nav-link" onclick="openNewsModal()">角色资讯</a>
        <a href="javascript:void(0)" class="nav-link" onclick="openTipsModal()">买卖攻略</a>
        <a href="javascript:void(0)" class="nav-link" onclick="openQQGroupModal()">加群交流</a>
      </div>
    </div>
  </nav>
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
        <div class="subtitle">粘贴任意平台（螃蟹网/盼之/氪金兽/7881）商品描述进行估价</div>
      </div>
    </div>

    <!-- 双栏布局开始 -->
    <div class="main-layout">
      <div class="main-left">

    <!-- 主输入卡片 -->
    <div class="input-card rise d1">
      <!-- 描述输入框 -->
      <div class="ve-section-title">
        <span>账号描述</span>
        <span style="font-size:11px;color:#888;font-weight:400;">输入描述自动识别，修改角色自动同步</span>
      </div>
      <div style="margin-bottom:14px;">
        <textarea id="ve-desc-input" placeholder="粘贴账号描述，如：50级，10黄，星声16000，1命今汐+专武..." style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg-soft);color:var(--text);font-size:13px;font-family:inherit;outline:none;resize:vertical;min-height:180px;line-height:1.6;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--line)'" oninput="veOnDescInput()"></textarea>
      </div>

      <!-- 移动端估价按钮（账号描述下方，仅移动端显示） -->
      <div class="ve-mobile-eval ve-mobile-eval-desc">
        <input type="number" id="ve-price-mobile-desc" placeholder="标价(元)" min="0" oninput="syncMobilePrice(this)" />
        <button class="ve-btn eval-btn" onclick="veEvaluate()">立即估价</button>
      </div>

      <!-- 角色列表 + 资源 -->
      <div class="ve-main-row">
        <div class="ve-main-left" style="grid-column:1/-1;">
          <!-- 添加角色按钮（顶部显眼位置，仅桌面端显示） -->
          <button class="ve-add-char-top ve-add-char-desktop" onclick="openCharPickerTop(this)">＋ 添加角色</button>

          <!-- 其他资源 -->
          <div class="ve-section-title" style="margin-top:14px;">其他资源</div>
          <div class="ve-resource-grid">
            <div class="ve-resource-item"><label><span class="res-icon">⭐</span>星声</label><input type="number" id="ve-starsound" min="0" placeholder="0" oninput="veOnChange()"></div>
            <div class="ve-resource-item"><label><span class="res-icon">🌙</span>月相</label><input type="number" id="ve-moonphase" min="0" placeholder="0" oninput="veOnChange()"></div>
            <div class="ve-resource-item"><label><span class="res-icon">🪸</span>余波珊瑚</label><input type="number" id="ve-coral" min="0" placeholder="0" oninput="veOnChange()"></div>
            <div class="ve-resource-item"><label><span class="res-icon">🟡</span>浮金波纹</label><input type="number" id="ve-floatgold" min="0" placeholder="0" oninput="veOnChange()"></div>
            <div class="ve-resource-item"><label><span class="res-icon">⚔️</span>铸潮波纹</label><input type="number" id="ve-casttide" min="0" placeholder="0" oninput="veOnChange()"></div>
            <div class="ve-resource-item"><label><span class="res-icon">✨</span>限定金数</label><input type="number" id="ve-yellow" min="0" placeholder="0" oninput="veOnChange()"></div>
            <div class="ve-resource-item"><label><span class="res-icon">👕</span>服饰</label><input type="number" id="ve-outfit" min="0" placeholder="0" oninput="veOnChange()"></div>
            <div class="ve-resource-item"><label><span class="res-icon">🏍️</span>车架模组</label><input type="number" id="ve-frame" min="0" placeholder="0" oninput="veOnChange()"></div>
          </div>

          <!-- 角色列表 -->
          <div class="ve-section-title" style="margin-top:16px;">
            <span>角色列表</span>
            <span class="ve-count" id="ve-char-count">0 个角色</span>
          </div>
          <div class="ve-char-grid" id="ve-char-grid"></div>

          <!-- 移动端添加角色按钮（角色列表下方，仅移动端显示） -->
          <button class="ve-add-char-top ve-add-char-mobile" onclick="openCharPickerTop(this)">＋ 添加角色</button>
        </div>
      </div>
    </div>

      </div><!-- /main-left -->

      <!-- 右侧摘要卡（桌面端固定） -->
      <div class="main-right">
        <div class="side-summary" id="side-summary">
          <!-- 标价 + 估价按钮 -->
          <div class="ss-action-section">
            <div class="ss-label" style="margin-bottom:6px;">标价（元）</div>
            <input type="number" id="ve-price-side" placeholder="选填" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg-soft);color:var(--text);font-size:16px;font-weight:600;font-family:inherit;outline:none;text-align:center;margin-bottom:10px;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--line)'" oninput="syncPriceInput(this)">
            <button class="ve-btn eval-btn" onclick="veEvaluate()">立即估价</button>
            <div style="font-size:11px;color:#666;text-align:center;margin-top:6px;">修改内容后点击重新估价</div>
          </div>
          
          <div class="ss-divider" style="display:none;" id="ss-divider-top"></div>
          
          <div class="ss-empty" id="side-summary-empty">
            <div class="ss-empty-icon">💰</div>
            输入账号信息后查看估价结果
          </div>
          <div id="side-summary-content" style="display:none;">
            <div class="ss-label">预估价值</div>
            <div class="ss-price" id="ss-price">--<span class="unit">元</span></div>
            <div class="ss-range" id="ss-range" style="display:none;"></div>
            <div class="ss-ratio" id="ss-ratio" style="display:none;"></div>

            <div class="ss-stats-link" onclick="openStatsModal()">
              <span>📊</span> 估值准不准？查看算法准确性报告
            </div>

            <div class="ss-section-title">核心数据</div>
            <div class="ss-highlights" id="ss-highlights"></div>

            <div class="ss-divider"></div>

            <div class="ss-section-title ss-collapse-title" onclick="toggleCalcCollapse()">
              <span>估价计算</span>
              <span class="ss-collapse-arrow" id="calc-collapse-arrow">▶</span>
            </div>
            <div class="ss-calc" id="ss-calc" style="display:none;"></div>

            <div class="ss-divider"></div>

            <!-- 爱发电支持 -->
            <div class="ss-afdian">
              <div class="ss-afdian-icon">☕</div>
              <div class="ss-afdian-text">
                <div class="ss-afdian-title">对你有帮助？请作者喝杯咖啡</div>
                <div class="ss-afdian-desc">你的支持是持续更新的动力</div>
              </div>
              <a href="https://ifdian.net/a/youxigujia" target="_blank" rel="noopener" class="ss-afdian-btn">
                支持
              </a>
            </div>
          </div>
        </div>
      </div><!-- /main-right -->
    </div><!-- /main-layout -->

    <!-- Loading/Error -->
    <div id="status-msg"></div>

    <!-- History -->
    <div class="history" id="history-section" style="display:none;">
      <div class="history-title" style="display:flex;align-items:center;">
        <span>最近查询</span>
        <span style="margin-left:auto;letter-spacing:0;color:var(--bad);cursor:pointer;font-size:12px;" onclick="clearHistory()">清空历史</span>
      </div>
      <div class="history-tags" id="history-tags"></div>
    </div>

    <!-- QQ群弹窗 -->
    <div id="qqgroup-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:100001;" onclick="if(event.target===this)closeQQGroupModal()">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#0d0d1a;border:1px solid #1e1e33;border-radius:14px;padding:28px;text-align:center;min-width:280px;max-width:90vw;">
        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:4px;">咕嘎鸣潮估价群</div>
        <div style="font-size:12px;color:#888;margin-bottom:16px;">扫码加入，交流估价心得，获取最新行情</div>
        <img src="/public/qq-group.jpg" alt="QQ群二维码" style="width:100%;max-width:200px;height:auto;aspect-ratio:1/1;object-fit:contain;border-radius:10px;margin-bottom:12px;background:#fff;" />
        <div style="font-size:13px;color:#aaa;">群号：<span style="color:#fbbf24;font-weight:600;">1064412729</span></div>
        <button onclick="closeQQGroupModal()" style="margin-top:16px;background:none;border:1px solid var(--line);color:#888;font-size:13px;cursor:pointer;padding:6px 20px;border-radius:6px;">关闭</button>
      </div>
    </div>
  </div>

  <!-- 角色资讯弹窗 -->
  <div id="news-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:100001;overflow-y:auto;" onclick="if(event.target===this)closeNewsModal()">
    <div style="max-width:720px;margin:40px auto;background:#0d0d1a;border:1px solid #1e1e33;border-radius:14px;padding:28px;min-height:300px;position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div>
          <div style="font-size:20px;font-weight:700;color:#fff;">角色资讯</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">最新角色动态、版本更新、强度排行</div>
        </div>
        <button onclick="closeNewsModal()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;padding:4px 10px;">×</button>
      </div>
      <div style="color:#aaa;font-size:13px;line-height:1.8;">
        <div style="text-align:center;padding:40px 20px;color:#666;">
          <div style="font-size:32px;margin-bottom:12px;">📰</div>
          <div style="font-size:14px;">内容建设中，敬请期待</div>
          <div style="font-size:12px;color:#555;margin-top:6px;">后续将更新角色强度榜、版本更新资讯、配队推荐等内容</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 买卖攻略弹窗 -->
  <div id="tips-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:100001;overflow-y:auto;" onclick="if(event.target===this)closeTipsModal()">
    <div style="max-width:800px;margin:30px auto;background:#0d0d1a;border:1px solid #1e1e33;border-radius:14px;min-height:300px;position:relative;display:flex;">
      <!-- 左侧目录 -->
      <div style="width:180px;flex-shrink:0;border-right:1px solid var(--line);padding:20px 0;">
        <div style="padding:0 20px 12px;font-size:13px;font-weight:600;color:#fff;">目录</div>
        <div class="tips-sidenav">
          <div class="tips-nav-item active" data-tab="safety" onclick="switchTipsTab('safety')">账号安全解析</div>
          <div class="tips-nav-item" data-tab="buy" onclick="switchTipsTab('buy')">买号注意事项</div>
          <div class="tips-nav-item" data-tab="sell" onclick="switchTipsTab('sell')">卖号注意事项</div>
          <div class="tips-nav-item" data-tab="wegame" onclick="switchTipsTab('wegame')">WeGame解绑</div>
          <div class="tips-nav-item" data-tab="tech" onclick="switchTipsTab('tech')">科技号判断</div>
          <div class="tips-nav-item" data-tab="platform" onclick="switchTipsTab('platform')">平台优惠</div>
        </div>
      </div>
      <!-- 右侧内容 -->
      <div style="flex:1;padding:24px 28px;max-height:85vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div>
            <div style="font-size:20px;font-weight:700;color:#fff;" id="tips-title">鸣潮买卖号注意事项</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">为降低交易风险、避免踩坑，建议在交易前仔细阅读本指南。</div>
          </div>
          <button onclick="closeTipsModal()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;padding:0 10px;flex-shrink:0;">×</button>
        </div>

        <!-- 账号安全 -->
        <div class="tips-content" id="tips-safety">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#4ade80;">🛡</span> 账号安全
          </h3>
          <div style="padding:12px 14px;background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;font-size:13px;color:#f87171;margin-bottom:16px;line-height:1.7;">
            <strong>核心提示：</strong>虚拟财产交易本身存在风险。尽管鸣潮账号找回率不高，但任何私下、无担保的交易仍可能导致钱号两空，建议优先选择有保障的第三方平台进行交易。
          </div>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 实名认证与换绑：</strong>实名信息一经绑定无法更换；手机号可更换。在无第三方绑定的情况下，鸣潮账号只有手机号这一种绑定。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 防范封号风险：</strong>自抽号、科技号存在封号风险，购买前请务必确认账号类型。若有意购买科技号，请自行权衡风险（买别怕，怕别买）。此外，目前多数平台的包赔服务不涵盖封号情形，部分平台支持封号赔付，具体以平台规则及客服说明为准，本站不做平台推荐。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">3. 第三方绑定：</strong>所有第三方绑定在开启新设备验证后都无法上号，账号绑定过多也不利于后续流转。关于 WeGame 与 Tap：若卖家无法自行解绑 WeGame，可通过 WeGame 管理群联系群管理申请解绑，具体步骤见后文；Tap 一经绑定无法解绑，建议优先购买仅绑定手机号的账号。</p>
          </div>
        </div>

        <!-- 买号注意 -->
        <div class="tips-content" id="tips-buy" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#60a5fa;">🛒</span> 买号注意事项
          </h3>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 仔细验号：</strong>进号后请逐项核对：角色、武器、资源等是否与卖家描述或截图一致，是否为科技号，角色练度是否合理，月相是否为负数。尤其注意资源与抽数：不少商家会以「准多少抽」等话术宣传，请自行根据游戏内数据计算，勿轻信口头承诺。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 第三方绑定查看：</strong>在游戏内依次打开「设置 → 账户设置 → 用户中心」，确认关联账号中是否存在第三方绑定。务必亲自核对，部分卖家页面标注无绑定，实际账号内仍有绑定。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">3. 换绑后及时修改密码：</strong>换绑完成后，建议立即修改账号密码并清除其他设备的登录权限，以降低被盗风险。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">4. 买号后慎绑第三方：</strong>购号后尽量避免绑定第三方，以免影响日后转卖。若需绑定 WeGame，请使用可长期登录的 QQ，勿用小号绑定，否则解绑时难以找回。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">5. 切勿私下交易：</strong>切勿脱离平台进行私下交易，谨防诈骗（贴吧等渠道尤其多发）。若在线下看中账号，可与卖家协商通过平台中介完成交易（手续费较低），并确保全程在官方 APP 内操作。</p>
          </div>
          <div style="padding:12px 14px;background:rgba(251,191,36,0.06);border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;font-size:12px;color:#d4a84b;margin-top:16px;line-height:1.7;">
            <strong>小贴士：</strong>建议验号时全程录屏，保留凭证，以便在出现描述不符时维权。
          </div>
        </div>

        <!-- 卖号注意 -->
        <div class="tips-content" id="tips-sell" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#fbbf24;">💰</span> 卖号注意事项
          </h3>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 切勿线下/私下交易：</strong>私下交易风险极高，易导致钱号两空。鸣潮换绑需通过短信验证，若有人以「登录游戏」等理由要求发送短信，均为诈骗，请勿理会。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 建议先解绑 WeGame 再上架：</strong>解绑后再挂售，更容易出手，也减少买家顾虑。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">3. 定价前先询价：</strong>不要凭感觉定价，以免卖亏。建议先向多家号商询价，再在此基础上适当加价（如约一倍）作为参考，多问几家更稳妥。</p>
          </div>
          <div style="padding:12px 14px;background:rgba(251,191,36,0.06);border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;font-size:12px;color:#d4a84b;margin-top:16px;line-height:1.7;">
            <strong>小贴士：</strong>若账号上架后几秒内就被拍下，多为脚本秒单，说明标价偏低，可取消订单并重新定价。价格合理时，1～7 天内成交属正常情况，请勿急躁。
          </div>
        </div>

        <!-- WeGame解绑 -->
        <div class="tips-content" id="tips-wegame" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#a78bfa;">🔗</span> WeGame 解绑指引
          </h3>
          <div style="padding:12px 14px;background:rgba(167,139,250,0.06);border-left:3px solid #a78bfa;border-radius:0 8px 8px 0;font-size:13px;color:#c4b5fd;margin-bottom:16px;line-height:1.7;">
            <strong>重点：</strong>WeGame 现已支持自助解绑，通过官方解绑页面即可操作，无需联系客服。
          </div>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 进入自助解绑页面：</strong>打开 <a href="https://www.wegame.com.cn/act/wegame/MCunbind/?hcfrom=WeGame.helper" target="_blank" style="color:#60a5fa;">WeGame × 库洛通行证解绑页面</a>，使用需要解绑的 WeGame 账号登录。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 按页面指引操作：</strong>登录后可查看当前绑定关系，按页面提示完成解绑即可。解绑和绑定操作对《鸣潮》《战双帕弥什》同步生效。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">3. 常见问题：</strong>详细的绑定/解绑规则可参考 <a href="https://www.wegame.com.cn/platform/article/detail.html?feedsid=236e3c5304e14bdc8e59fda2ced118a9&articleId=0de2164d7be34b058f4fb82a19b7c77b" target="_blank" style="color:#60a5fa;">WeGame × 鸣潮账号绑定常见问题</a>。</p>
          </div>
        </div>

        <!-- 科技号判断 -->
        <div class="tips-content" id="tips-tech" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#f87171;">⚠</span> 科技号深度识别
          </h3>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 速通全息截图：</strong>当前不少平台会展示「全息战略」通关截图。若截图中为「主角 + 秧秧 + 赤霞」通关全部全息关卡，即可基本判定为科技号。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 成就查询：</strong>可借助两个成就辅助判断：①「自新世界」— 完成日期即为账号建号日期；②「黑暗森林的幽灵」— 系列成就，对应通关深塔。在成就栏搜索上述两项，若建号首日即完成全部深塔，基本可判定为科技号（首日无资源难以正常全通）。</p>
          </div>
          <div style="padding:12px 14px;background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;font-size:12px;color:#f87171;margin-top:16px;line-height:1.7;">
            <strong>提醒：</strong>科技号未必被封，但存在封号风险；当前虽封禁较少，但无法排除个案。请自行权衡：买别怕，怕别买。
          </div>
        </div>

        <!-- 平台优惠 -->
        <div class="tips-content" id="tips-platform" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#4ade80;">🎁</span> 平台优惠指南
          </h3>
          <div style="padding:12px 14px;background:rgba(74,222,128,0.06);border-left:3px solid #4ade80;border-radius:0 8px 8px 0;font-size:13px;color:#86efac;margin-bottom:16px;line-height:1.7;">
            螃蟹平台优惠：每月可在京东 APP 领取专属优惠券，买卖号时记得先领券再下单，能省一笔就是一笔。
          </div>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 打开京东 APP 搜索「螃蟹账号」：</strong>在首页搜索栏输入「螃蟹账号」，找到并进入螃蟹账号官方旗舰店。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 进入店铺领取优惠券：</strong>进入店铺后，关注首页顶部或活动横幅中的「领券」入口，每月可领取一批优惠券，下单前务必先领券再拍单。</p>
          </div>
        </div>

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

  <!-- 移动端浮动结果条 -->
  <div class="mobile-float-bar" id="mobile-float-bar" onclick="openMobileDetailModal()">
    <div>
      <div class="mfb-price" id="mfb-price">--<span class="unit">元</span></div>
      <div class="mfb-info" id="mfb-info">预估价值 <span class="mfb-detail-hint">查看详情 ▸</span></div>
    </div>
    <div class="mfb-ratio" id="mfb-ratio" style="display:none;"></div>
  </div>

  <!-- 移动端估值详情弹窗 -->
  <div id="mobile-detail-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100001;overflow-y:auto;" onclick="if(event.target===this)closeMobileDetailModal()">
    <div class="mobile-detail-container">
      <div class="mobile-detail-header">
        <div>
          <div class="mobile-detail-title">估值详情</div>
          <div class="mobile-detail-subtitle">完整估值计算明细</div>
        </div>
        <button onclick="closeMobileDetailModal()" class="mobile-detail-close">×</button>
      </div>
      <div class="mobile-detail-body">
        <div id="mobile-detail-content">
          <div style="text-align:center;padding:60px 20px;color:#666;">暂无数据</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 使用须知弹窗 -->
  <div id="guide-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:100001;overflow-y:auto;" onclick="if(event.target===this)closeGuideModal()">
    <div style="max-width:800px;margin:30px auto;background:#0d0d1a;border:1px solid #1e1e33;border-radius:14px;min-height:300px;position:relative;display:flex;">
      <!-- 左侧目录 -->
      <div style="width:180px;flex-shrink:0;border-right:1px solid var(--line);padding:20px 0;">
        <div style="padding:0 20px 12px;font-size:13px;font-weight:600;color:#fff;">目录</div>
        <div class="tips-sidenav">
          <div class="tips-nav-item active" data-tab="guide-usage" onclick="switchGuideTab('usage')">使用方法</div>
          <div class="tips-nav-item" data-tab="guide-notice" onclick="switchGuideTab('notice')">重要提示</div>
          <div class="tips-nav-item" data-tab="guide-tips" onclick="switchGuideTab('tips')">使用小贴士</div>
          <div class="tips-nav-item" data-tab="guide-data" onclick="switchGuideTab('data')">数据说明</div>
        </div>
      </div>
      <!-- 右侧内容 -->
      <div style="flex:1;padding:24px 28px;max-height:85vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
          <div>
            <div style="font-size:20px;font-weight:700;color:#fff;">使用须知</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">使用前请仔细阅读以下内容</div>
          </div>
          <button onclick="closeGuideModal()" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;padding:0 10px;flex-shrink:0;">×</button>
        </div>

        <!-- 使用方法 -->
        <div class="guide-content" id="guide-usage">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#60a5fa;">📖</span> 使用方法
          </h3>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:12px;"><strong style="color:#fff;">方法一：粘贴账号描述（推荐，最快）</strong></p>
            <ol style="margin-left:20px;margin-bottom:16px;">
              <li style="margin-bottom:6px;">从螃蟹网、盼之、氪金兽等平台复制账号描述文本</li>
              <li style="margin-bottom:6px;">粘贴到页面顶部的"账号描述"输入框</li>
              <li style="margin-bottom:6px;">系统自动识别角色、命座、专武、资源等信息</li>
              <li style="margin-bottom:6px;">在右侧输入标价（选填），点击"立即估价"查看结果</li>
            </ol>

            <p style="margin-bottom:12px;"><strong style="color:#fff;">方法二：手动添加角色</strong></p>
            <ol style="margin-left:20px;margin-bottom:16px;">
              <li style="margin-bottom:6px;">点击红色的"＋ 添加角色"按钮</li>
              <li style="margin-bottom:6px;">在弹窗中选择要添加的角色（支持搜索）</li>
              <li style="margin-bottom:6px;">在角色卡片上调整命座和专武精炼等级</li>
              <li style="margin-bottom:6px;">在"其他资源"中填写星声、月相等资源数量</li>
              <li style="margin-bottom:6px;">点击右侧"立即估价"按钮查看结果</li>
            </ol>

            <p style="margin-bottom:12px;"><strong style="color:#fff;">查看估价结果</strong></p>
            <ul style="margin-left:20px;margin-bottom:10px;">
              <li style="margin-bottom:6px;"><strong style="color:#ddd;">桌面端</strong>：右侧摘要卡显示预估总价、性价比、核心数据亮点</li>
              <li style="margin-bottom:6px;"><strong style="color:#ddd;">移动端</strong>：点击底部浮动条查看完整估值详情</li>
              <li style="margin-bottom:6px;"><strong style="color:#ddd;">详细结果</strong>：向下滚动查看角色明细、武器明细、资源明细</li>
              <li style="margin-bottom:6px;"><strong style="color:#ddd;">算法准确性</strong>：点击"查看准确性报告"了解模型误差分布</li>
            </ul>
          </div>
        </div>

        <!-- 重要提示 -->
        <div class="guide-content" id="guide-notice" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#fbbf24;">⚠️</span> 重要提示
          </h3>
          <div style="padding:12px 14px;background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;font-size:13px;color:#f87171;margin-bottom:16px;line-height:1.7;">
            <strong>核心提示：</strong>本工具仅提供行情参考，不构成任何交易建议。估价结果基于历史成交数据和算法模型测算，实际交易价格受市场供需、账号稀有度、平台政策等多种因素影响，仅供参考。
          </div>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 交易风险：</strong>游戏官方禁止账号交易，交易有封禁风险。请勿在非官方平台交易，谨防诈骗。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 隐私安全：</strong>本工具不收集任何账号密码和实名隐私信息，描述解析在本地浏览器进行，数据安全。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">3. 仅供参考：</strong>估价结果为算法测算值，实际成交价可能因账号细节、市场行情等因素有所波动。</p>
          </div>
        </div>

        <!-- 使用小贴士 -->
        <div class="guide-content" id="guide-tips" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#4ade80;">💡</span> 使用小贴士
          </h3>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">1. 描述越详细越准确：</strong>描述文本越详细，识别越准确，尽量包含完整的角色命座和武器信息。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">2. 角色列表排序：</strong>角色列表按等级排序（S/A/B/C/D），方便快速查看高价值角色。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">3. 自动同步：</strong>修改角色或资源后，描述文本会自动同步更新。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">4. 性价比查看：</strong>输入标价后可查看性价比，正值表示物超所值。</p>
          </div>
        </div>

        <!-- 数据说明 -->
        <div class="guide-content" id="guide-data" style="display:none;">
          <h3 style="color:#fff;font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:8px;">
            <span style="color:#a78bfa;">📊</span> 数据说明
          </h3>
          <div style="font-size:13px;color:#aaa;line-height:1.8;">
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">数据来源：</strong>估价模型基于螃蟹网、盼之等平台的历史成交数据训练，定期更新行情参数。</p>
            <p style="margin-bottom:10px;"><strong style="color:#ddd;">算法准确性：</strong>算法准确性报告可查看当前模型的误差分布，帮助你了解估价的可靠程度。</p>
          </div>
          <div style="margin-top:20px;padding:14px 16px;background:rgba(251,191,36,0.06);border-left:3px solid #fbbf24;border-radius:0 8px 8px 0;font-size:12px;color:#d4a84b;line-height:1.7;">
            如有问题或建议，可加入QQ群反馈：<strong style="color:#fbbf24;">1064412729</strong>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- 图片放大遮罩层 -->
  <div class="img-overlay" id="img-overlay">
    <img src="/public/qq-group.jpg" alt="QQ群二维码" />
  </div>

  <script src="/public/value-settings.js?v=20260824" onerror="window.__vsFailed=true"></script>
  <script>
    // 头像图片加载失败兜底（显示首字母）
    function onAvatarError(img) {
      if (!img || !img.parentNode) return;
      var name = img.getAttribute('data-name') || '';
      var firstChar = name.charAt(0) || '?';
      img.style.display = 'none';
      img.parentNode.innerHTML = firstChar;
    }

    // 移动端价格输入同步
    function syncMobilePrice(el) {
      var val = el.value;
      // 同步到侧边栏
      var side = document.getElementById('ve-price-side');
      if (side) side.value = val;
      // 同步到另一个移动端输入框
      var otherId = el.id === 've-price-mobile-desc' ? 've-price-mobile' : 've-price-mobile-desc';
      var other = document.getElementById(otherId);
      if (other && document.activeElement !== other) other.value = val;
    }

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

      // 首次访问自动弹出使用须知
      try {
        if (!localStorage.getItem('mw_guide_shown')) {
          setTimeout(function() {
            openGuideModal();
            localStorage.setItem('mw_guide_shown', '1');
          }, 500);
        }
      } catch(e) {}
    })();

    // 使用须知弹窗
    function openGuideModal() {
      document.getElementById('guide-modal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
    function closeGuideModal() {
      document.getElementById('guide-modal').style.display = 'none';
      document.body.style.overflow = '';
    }
    // 使用须知Tab切换
    function switchGuideTab(tab) {
      var contents = document.querySelectorAll('.guide-content');
      contents.forEach(function(c) { c.style.display = 'none'; });
      var target = document.getElementById('guide-' + tab);
      if (target) target.style.display = 'block';
      var items = document.querySelectorAll('#guide-modal .tips-nav-item');
      items.forEach(function(item) {
        item.classList.toggle('active', item.getAttribute('data-tab') === 'guide-' + tab);
      });
    }
    function openQQGroupModal() {
      document.getElementById('qqgroup-modal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
    function closeQQGroupModal() {
      document.getElementById('qqgroup-modal').style.display = 'none';
      document.body.style.overflow = '';
    }
    // 移动端估值详情弹窗
    function openMobileDetailModal() {
      document.getElementById('mobile-detail-modal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
    function closeMobileDetailModal() {
      document.getElementById('mobile-detail-modal').style.display = 'none';
      document.body.style.overflow = '';
    }
    // 角色资讯弹窗
    function openNewsModal() {
      document.getElementById('news-modal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
    function closeNewsModal() {
      document.getElementById('news-modal').style.display = 'none';
      document.body.style.overflow = '';
    }
    // 买卖攻略弹窗
    function openTipsModal() {
      document.getElementById('tips-modal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
    function closeTipsModal() {
      document.getElementById('tips-modal').style.display = 'none';
      document.body.style.overflow = '';
    }
    // 买卖攻略Tab切换
    function switchTipsTab(tab) {
      var contents = document.querySelectorAll('.tips-content');
      contents.forEach(function(c) { c.style.display = 'none'; });
      var target = document.getElementById('tips-' + tab);
      if (target) target.style.display = 'block';
      var items = document.querySelectorAll('.tips-nav-item');
      items.forEach(function(item) {
        item.classList.toggle('active', item.getAttribute('data-tab') === tab);
      });
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeGuideModal();
        closeQQGroupModal();
        closeNewsModal();
        closeTipsModal();
        closeStatsModal();
      }
    });
  </script>
  <script>
    // 螃蟹网代理列表（客户端抓取用，多代理轮询降低被封风险）
    window._pxb7Proxies = ${JSON.stringify(pxb7Proxies)};
    // 可视化编辑器用：角色列表 + 专武映射
    window._charList = ${JSON.stringify(charList)};
    window._sigWeapons = ${JSON.stringify(sigWeapons)};
  </script>
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
      updateConfigInfo();
    }).catch(() => {});

    // 记录本次页面加载时间（用户刷新浏览器即更新）
    var pageLoadTime = new Date().toISOString();
    localStorage.setItem('mw_page_loaded_at', pageLoadTime);

    updateConfigInfo();

    function clearPasteInput() {
      document.getElementById('eval-text').value = '';
      document.getElementById('eval-price').value = '';
      document.getElementById('eval-text').focus();
    }

    function clearLookupInput() {
      document.getElementById('product-id').value = '';
      document.getElementById('product-id').focus();
    }

    function updateConfigInfo() {
      var el = document.getElementById('config-info');
      if (!el) return;
      var storedAt = localStorage.getItem('mw_page_loaded_at');
      if (!storedAt) { el.innerHTML = ''; return; }
      var date = new Date(storedAt);
      if (isNaN(date.getTime())) { el.innerHTML = ''; return; }
      var now = new Date();
      var diffMs = now - date;
      var diffDays = Math.floor(diffMs / (86400000));
      var dateStr = date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      var html = '算法规则加载时间：' + dateStr;
      if (diffDays >= 3) {
        html += ' <span style="color:#e65100;font-weight:600;">已超' + diffDays + '天未刷新，建议定期刷新页面获取最新规则</span>';
      }
      el.innerHTML = html;
    }

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
      } else if (currentTab === 'visual' && VE_CHARS.length > 0) {
        veEvaluate(true);
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
      document.getElementById('tab-visual').classList.toggle('active', tab === 'visual');
      document.getElementById('panel-lookup').style.display = tab === 'lookup' ? '' : 'none';
      document.getElementById('panel-paste').style.display = tab === 'paste' ? '' : 'none';
      document.getElementById('panel-visual').style.display = tab === 'visual' ? '' : 'none';
      // 清空结果
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '';
    }

    // ============================================================
    // 按编号查询
    // ============================================================

    // 解析商品链接，返回 { platform, productId }
    function parseProductLink(input) {
      const s = String(input || '').trim();
      // 螃蟹网
      const pxb7Match = s.match(/pxb7\\.com\\/product\\/(\\d+)/) || s.match(/\\/product\\/(\\d+)/) || s.match(/m1\\.pxb7\\.com.*[?&]id=(\\d+)/);
      if (pxb7Match) return { platform: 'pxb7', productId: pxb7Match[1] };
      // 盼之
      const pzdsMatch = s.match(/pzds\\.com\\/goodsDetails\\/([^/?]+)/);
      if (pzdsMatch) return { platform: 'pzds', productId: pzdsMatch[1] };
      return null;
    }

    // 客户端抓取：通过 CORS 代理直接调螃蟹网 API
    async function clientFetchPxb7(productId) {
      const proxies = window._pxb7Proxies || [];
      if (proxies.length === 0) throw new Error('无可用代理');

      const apiPath = '/api/product/web/product/detailPost';
      const postData = JSON.stringify({ productId: String(productId) });

      // 随机起点轮询
      const total = proxies.length;
      const startIdx = Math.floor(Math.random() * total);
      const errors = [];

      for (let i = 0; i < total; i++) {
        const proxyIdx = (startIdx + i) % total;
        const proxyUrl = proxies[proxyIdx].replace(/\\/$/, '') + '?path=' + encodeURIComponent(apiPath);
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const resp = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: postData,
            signal: controller.signal,
          });
          clearTimeout(timer);
          const text = await resp.text();
          // 检测 WAF 拦截
          if (text.indexOf('aliyun_waf') >= 0 || text.indexOf('_waf_') >= 0) {
            errors.push('代理' + (proxyIdx + 1) + ': WAF拦截');
            continue;
          }
          const json = JSON.parse(text);
          if ((json.code === 200 || json.success === true) && json.data) {
            return json.data;
          }
          errors.push('代理' + (proxyIdx + 1) + ': ' + (json.msg || json.message || '返回数据为空'));
        } catch (e) {
          errors.push('代理' + (proxyIdx + 1) + ': ' + (e.name === 'AbortError' ? '超时' : e.message));
        }
      }
      throw new Error('所有代理均失败: ' + errors.join('; '));
    }

    async function doLookup() {
      const productId = document.getElementById('product-id').value.trim();
      if (!productId) { alert('请输入商品编号或商品链接'); return; }
      if (!productId.startsWith('http')) { alert('请粘贴商品链接，不要输入纯编号。\\n\\n链接查询支持螃蟹网和盼之网的商品链接。'); return; }
      lastLookupId = productId;

      const btn = document.getElementById('lookup-btn');
      btn.disabled = true; btn.textContent = '查询中...';
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '<div class="loading">正在查询商品信息...</div>';

      try {
        const customWeights = (typeof getSavedWeights === 'function') ? (getSavedWeights() || window._serverDefaultConfig || null) : (window._serverDefaultConfig || null);
        const parsed = parseProductLink(productId);
        let clientSuccess = false;
        let clientError = null;

        // 尝试客户端抓取（仅螃蟹网，且有代理配置时）
        if (parsed && parsed.platform === 'pxb7' && window._pxb7Proxies && window._pxb7Proxies.length > 0) {
          try {
            const productData = await clientFetchPxb7(parsed.productId);
            const showTitle = productData.showTitle || productData.title || '';
            const priceInCents = productData.price || 0;
            const title = productData.gameName || (showTitle ? showTitle.substring(0, 50) : '');

            if (showTitle) {
              // 客户端拿到数据了，调粘贴估价接口
              const resp = await fetch('/api/x9k2-eval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showTitle, priceInCents, customWeights, game: 'wuwa' }),
              });
              const result = await resp.json();
              document.getElementById('status-msg').innerHTML = '';

              if (!result.success) {
                throw new Error(result.error || '估值失败');
              }

              // 补全字段，保持和 x9k2-find 返回格式一致
              result.data.productId = parsed.productId;
              result.data.title = title;
              result.data.showTitle = showTitle;
              result.data.url = 'https://www.pxb7.com/buy/10302/detail?productId=' + parsed.productId;
              clientSuccess = true;
              showResult(result.data);
              saveHistory(productId, result.data);
            }
          } catch (e) {
            clientError = e.message;
            console.warn('[客户端抓取] 失败，回退服务器模式:', e.message);
          }
        }

        // 客户端抓取失败或不支持，回退服务器模式
        if (!clientSuccess) {
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
            if (clientError) {
              errorHtml += '<div style="font-size:12px;color:#888;margin-top:4px;">客户端抓取失败: ' + clientError + '</div>';
            }
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
        }
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
      if (d.details && d.details.priceRange && d.details.priceRange.low != null) {
        summaryHtml += '<div style="font-size:13px;color:#60a5fa;margin-top:4px;font-weight:500;">合理交易范围：¥' + d.details.priceRange.low + ' ~ ¥' + d.details.priceRange.high +
          ' <span class="help-icon" data-help="range" title="点击查看说明">?</span></div>';
      }
      if (d.price && d.price > 0) {
        const diff = (d.estimatedValue - d.price).toFixed(2);
        const diffText = diff >= 0 ? '+' + diff : diff;
        summaryHtml += '<div class="ratio ' + ratioClass + '">性价比 ' + ratioText + ' (标价' + d.price + '元 · 差价' + diffText + '元)</div>';
      }
      summaryHtml += '<button class="adjust-link" id="adjust-link" onclick="openStatsModal()">估值准不准？查看算法准确性报告</button>';
      var sumEl = document.getElementById('result-summary');
      if (sumEl) sumEl.innerHTML = summaryHtml;

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
        var goldBadge = (yi.effectiveYellow != null ? fmtGold(yi.effectiveYellow) : '-') + '/' + (yi.limitedYellow != null ? fmtGold(yi.limitedYellow) : yi.yellowCount) + '/' + (yi.totalYellow != null ? fmtGold(yi.totalYellow) : (yi.rawYellowCount || 0));
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
      var hlEl = document.getElementById('result-highlights');
      if (hlEl) hlEl.innerHTML = hlHtml;

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
        var goldDisplay = (yi.effectiveYellow != null ? fmtGold(yi.effectiveYellow) : '-') + '/' + (yi.limitedYellow != null ? fmtGold(yi.limitedYellow) : yi.yellowCount) + '/' + (yi.totalYellow != null ? fmtGold(yi.totalYellow) : (yi.rawYellowCount || 0));
        detailHtml += resultRow('有效金系数', goldDisplay + ' [' + (yi.tierLabel || '') + '] × ' + yi.coefficient, '#f59e0b');
        // 有效金贡献明细
        var bd = yi.effectiveYellowBreakdown || [];
        if (bd.length > 0) {
          var bdItems = bd.map(function(b) {
            var constText = b.const > 0 ? (b.const === 6 ? '满命' : b.const + '命') : '0命';
            var sigText = b.sigName ? ' +精' + b.sigRefine + ' ' + escStatsHtml(b.sigName) : '';
            var totalContrib = b.contrib + (b.sigContrib || 0);
            var contribStr = fmtGold(totalContrib);
            var coeffText = (b.coeff != null && b.coeff !== 1) ? '×' + b.coeff + ' ' : '';
            return '<span style="display:inline-block;font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.12);padding:3px 8px;border-radius:4px;margin:2px 4px 2px 0;">' + escStatsHtml(b.name) + ' ' + constText + sigText + ' (' + coeffText + '+' + contribStr + ')</span>';
          });
          detailHtml += '<div style="padding:4px 0 8px 0;">' + bdItems.join('') + '</div>';
        }
      }
      // 最终价值
      detailHtml += '<div class="result-row" style="border-top:1px solid #1e1e33;padding-top:6px;margin-top:4px;"><span class="key" style="color:#ccc;font-weight:bold;">最终估值</span><span class="val" style="color:#4ade80;font-weight:bold;font-size:16px;">' + det.finalValue + ' 元</span></div>';
      // 交易范围
      if (det.priceRange && det.priceRange.low != null) {
        detailHtml += '<div class="result-row" style="padding-top:4px;">' +
          '<span class="key" style="color:#aaa;">' +
            '合理交易范围 ' +
            '<span class="help-icon" data-help="range" title="点击查看说明">?</span>' +
          '</span>' +
          '<span class="val" style="color:#60a5fa;font-weight:600;font-size:14px;">¥' + det.priceRange.low + ' ~ ¥' + det.priceRange.high + '</span>' +
          '</div>';
      }
      var detEl = document.getElementById('result-details');
      if (detEl) detEl.innerHTML = detailHtml;

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
      var charsEl = document.getElementById('result-chars');
      if (charsEl) charsEl.innerHTML = charHtml;

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
      var wpnEl = document.getElementById('result-weapons');
      if (wpnEl) wpnEl.innerHTML = wpnHtml;

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
      var goldSummary = (yiInfo.effectiveYellow != null ? fmtGold(yiInfo.effectiveYellow) : '-') + '/' + (yiInfo.limitedYellow != null ? fmtGold(yiInfo.limitedYellow) : '-') + '/' + (info.yellowCount || 0);
      resHtml += resultRow('有效金/限定金/总金数', goldSummary, '#f59e0b');
      var resEl = document.getElementById('result-resources');
      if (resEl) resEl.innerHTML = resHtml;

      var resultEl = document.getElementById('result');
      if (resultEl) resultEl.classList.add('show');
      // 显示"估值不准"按钮
      const adjustBtn = document.getElementById('adjust-link');
      if (adjustBtn) adjustBtn.style.display = 'inline-block';

      // ===== 更新侧边摘要卡 & 移动端浮动条 =====
      updateSideSummary(d);
    }

    // 更新侧边摘要卡和移动端浮动条
    function updateSideSummary(d) {
      const det = d.details || {};
      const info = d.info || {};

      // 隐藏空状态，显示内容
      const emptyEl = document.getElementById('side-summary-empty');
      const contentEl = document.getElementById('side-summary-content');
      const dividerEl = document.getElementById('ss-divider-top');
      if (emptyEl) emptyEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';
      if (dividerEl) dividerEl.style.display = 'block';

      // 价格
      const priceEl = document.getElementById('ss-price');
      if (priceEl) priceEl.innerHTML = d.estimatedValue + '<span class="unit">元</span>';

      // 合理交易范围
      const rangeEl = document.getElementById('ss-range');
      if (rangeEl) {
        if (det.priceRange && det.priceRange.low != null) {
          rangeEl.style.display = 'block';
          rangeEl.textContent = '合理交易范围：¥' + det.priceRange.low + ' ~ ¥' + det.priceRange.high;
        } else {
          rangeEl.style.display = 'none';
        }
      }

      // 性价比
      const ratioEl = document.getElementById('ss-ratio');
      if (ratioEl && d.price && d.price > 0) {
        const ratioClass = d.costPerformance >= 30 ? 'good' : (d.costPerformance >= 0 ? 'ok' : 'bad');
        const ratioText = d.costPerformance >= 0 ? '+' + d.costPerformance.toFixed(2) + '%' : d.costPerformance.toFixed(2) + '%';
        const diff = (d.estimatedValue - d.price).toFixed(0);
        const diffText = diff >= 0 ? '+' + diff : diff;
        ratioEl.className = 'ss-ratio ' + ratioClass;
        ratioEl.style.display = 'block';
        ratioEl.textContent = '性价比 ' + ratioText + '（差价' + diffText + '元）';
      } else if (ratioEl) {
        ratioEl.style.display = 'none';
      }

      // 核心数据亮点
      const hlEl = document.getElementById('ss-highlights');
      if (hlEl) {
        const items = [];
        const charCount = (det.characters && det.characters.length) || 0;
        const c6Count = (det.characters || []).filter(c => c.const >= 6).length;
        const sTierCount = (det.characters || []).filter(c => c.tier === 'S').length;
        const sigCount = (det.characters || []).filter(c => c.hasSig).length;
        const yi = det.yellowInfo || {};
        const fd = det.flatDiscount || { value: 1, notes: [] };

        if (charCount > 0) items.push({ k: '五星角色', v: charCount + ' 个' });
        if (sigCount > 0) items.push({ k: '专武', v: sigCount + ' 把', cls: 'warn' });
        if (info.pulls > 0) items.push({ k: '总抽数', v: info.pulls + ' 抽' });
        if (yi.effectiveYellow != null) {
          items.push({ k: '有效金', v: fmtGold(yi.effectiveYellow) });
        }
        if (det.weightedFullConst > 0) {
          items.push({ k: '加权满命', v: det.weightedFullConst.toFixed(1), cls: 'good' });
        }
        if (det.satisfiedTeams && det.satisfiedTeams.length > 0) {
          var teamNames = det.satisfiedTeams.map(function(t) { return t.name || t; }).join('、');
          items.push({ k: '成型配队', v: det.satisfiedTeams.length + ' 组', cls: 'good', tip: teamNames });
        }
        if (fd.value < 1) {
          items.push({ k: '低命折扣', v: '×' + fd.value, cls: 'warn' });
        }

        let html = '';
        items.slice(0, 8).forEach(item => {
          var kHtml = item.k;
          if (item.tip) {
            kHtml = item.k + '<span class="hl-tip">ⓘ<span class="tooltip">' + item.tip + '</span></span>';
          }
          html += '<div class="ss-hl-item"><span class="k">' + kHtml + '</span><span class="v ' + (item.cls || '') + '">' + item.v + '</span></div>';
        });
        hlEl.innerHTML = html;
      }

      // 估价计算明细
      const calcEl = document.getElementById('ss-calc');
      if (calcEl && det) {
        let calcRows = [];
        // 角色价值
        if (det.characterValue != null) {
          calcRows.push({ label: '角色价值', val: det.characterValue + ' 元' });
        }
        // 满命溢价
        if (det.c6Premium != null && det.c6Premium > 0) {
          calcRows.push({ label: '满命溢价', val: '+' + det.c6Premium + ' 元', cls: 'pos', tip: '满命角色越多，账号稀缺性越高，额外加成越多' });
        }
        // 配队溢价
        if (det.teamPremium != null && det.teamPremium > 0) {
          calcRows.push({ label: '配队溢价', val: '+' + det.teamPremium + ' 元', cls: 'pos', tip: '凑成完整成型配队的账号，可玩性更高，有额外价值加成' });
        }
        // 抽数价值
        if (det.pullValue != null && det.pullValue > 0) {
          calcRows.push({ label: '抽数价值', val: '+' + det.pullValue + ' 元', cls: 'pos', tip: '星声、月相、波纹等抽卡资源按比例换算的等价价值' });
        }
        // 资源价值
        if (det.resourceValue != null && det.resourceValue > 0) {
          calcRows.push({ label: '资源价值', val: '+' + det.resourceValue + ' 元', cls: 'pos' });
        }
        // 强绑折扣
        if (det.c6DepDiscount != null && det.c6DepDiscount > 0) {
          calcRows.push({ label: '强绑折扣', val: '-' + det.c6DepDiscount + ' 元', cls: 'neg' });
        }
        // 无专武折扣
        if (det.sigDiscount != null && det.sigDiscount > 0) {
          calcRows.push({ label: '无专武折扣', val: '-' + det.sigDiscount + ' 元', cls: 'neg' });
        }
        // 低命折扣
        const fd = det.fullConstDep || {};
        if (fd.value != null && fd.value < 1) {
          calcRows.push({ label: '低命折扣', val: '× ' + fd.value, cls: 'neg' });
        }
        // 有效金系数
        const yi = det.yellowInfo || {};
        if (yi.coefficient != null && yi.coefficient !== 1) {
          const goldLabel = yi.effectiveYellow != null ? fmtGold(yi.effectiveYellow) + ' 金' : '';
          calcRows.push({ label: '有效金系数', val: '× ' + yi.coefficient, cls: yi.coefficient > 1 ? 'pos' : 'neg', tip: '根据有效金数量（限定角色+专武）调整系数，金越多账号越值钱，系数越高' });
        }

        let calcHtml = '';
        calcRows.forEach(function(row) {
          var labelHtml = row.label;
          if (row.tip) {
            labelHtml = row.label + '<span class="tooltip">' + row.tip + '</span>';
          }
          calcHtml += '<div class="ss-calc-row"><span class="label">' + labelHtml + '</span><span class="val ' + (row.cls || '') + '">' + row.val + '</span></div>';
        });
        calcHtml += '<div class="ss-calc-total"><span>最终估值</span><span class="val">¥' + d.estimatedValue + '</span></div>';
        calcEl.innerHTML = calcHtml;
      }

      // 移动端浮动条
      const floatBar = document.getElementById('mobile-float-bar');
      const mfbPrice = document.getElementById('mfb-price');
      const mfbRatio = document.getElementById('mfb-ratio');
      if (floatBar) {
        floatBar.classList.add('show');
        document.body.classList.add('has-float-bar');
      }
      if (mfbPrice) mfbPrice.innerHTML = d.estimatedValue + '<span class="unit">元</span>';
      if (mfbRatio && d.price && d.price > 0) {
        const ratioClass2 = d.costPerformance >= 30 ? 'good' : (d.costPerformance >= 0 ? 'ok' : 'bad');
        const ratioText2 = d.costPerformance >= 0 ? '+' + d.costPerformance.toFixed(1) + '%' : d.costPerformance.toFixed(1) + '%';
        mfbRatio.className = 'mfb-ratio ' + ratioClass2;
        mfbRatio.style.display = 'block';
        mfbRatio.textContent = ratioText2;
      } else if (mfbRatio) {
        mfbRatio.style.display = 'none';
      }

      // 移动端详情弹窗内容
      const mobileDetailEl = document.getElementById('mobile-detail-content');
      if (mobileDetailEl) {
        let detailHtml = '';

        // 预估价值主卡片
        detailHtml += '<div class="md-hero">';
        detailHtml += '<div class="md-hero-label">预估价值</div>';
        detailHtml += '<div class="md-hero-price">' + d.estimatedValue + '<span class="unit">元</span></div>';
        detailHtml += '<div class="md-hero-foot">';
        if (d.reasonableRange) {
          detailHtml += '<span class="md-hero-range">合理范围 ¥' + d.reasonableRange[0] + ' ~ ¥' + d.reasonableRange[1] + '</span>';
        } else {
          detailHtml += '<span></span>';
        }
        if (d.price && d.price > 0) {
          const ratioClass3 = d.costPerformance >= 30 ? 'good' : (d.costPerformance >= 0 ? 'ok' : 'bad');
          const ratioText3 = d.costPerformance >= 0 ? '+' + d.costPerformance.toFixed(1) + '%' : d.costPerformance.toFixed(1) + '%';
          detailHtml += '<span class="md-hero-ratio ' + ratioClass3 + '">性价比 ' + ratioText3 + '</span>';
        }
        detailHtml += '</div>';
        detailHtml += '</div>';

        // 核心数据 - 复用PC端结构，保持一致
        const hlEl2 = document.getElementById('ss-highlights');
        if (hlEl2 && hlEl2.children.length) {
          detailHtml += '<div class="md-sec">';
          detailHtml += '<div class="md-sec-title"><span>核心数据</span></div>';
          detailHtml += '<div class="ss-highlights">' + hlEl2.innerHTML + '</div>';
          detailHtml += '</div>';
        }

        // 估价计算 - 默认收起，保证一屏内显示完整内容
        const calcEl2 = document.getElementById('ss-calc');
        if (calcEl2 && calcEl2.children.length) {
          detailHtml += '<div class="md-sec">';
          detailHtml += '<div class="md-sec-title md-collapse" onclick="toggleMobileSec(this)"><span>估价计算明细</span><span class="md-arrow">▼</span></div>';
          detailHtml += '<div class="md-sec-body" style="display:none;"><div class="ss-calc">' + calcEl2.innerHTML + '</div></div>';
          detailHtml += '</div>';
        }

        // 底部操作区
        detailHtml += '<div class="md-actions">';
        detailHtml += '<div class="md-stats" onclick="closeMobileDetailModal();openStatsModal();"><span>📊</span> 估值准不准？查看算法准确性报告</div>';
        detailHtml += '<div class="md-afdian">';
        detailHtml += '<div class="md-afdian-icon">☕</div>';
        detailHtml += '<div class="md-afdian-text">';
        detailHtml += '<div class="md-afdian-title">对你有帮助？请作者喝杯咖啡</div>';
        detailHtml += '<div class="md-afdian-desc">你的支持是持续更新的动力</div>';
        detailHtml += '</div>';
        detailHtml += '<a class="md-afdian-btn" href="https://ifdian.net/a/youxigujia" target="_blank" rel="noopener">支持</a>';
        detailHtml += '</div>';
        detailHtml += '</div>';

        mobileDetailEl.innerHTML = detailHtml;
      }
    }

    function resultRow(key, val, color) {
      return '<div class="result-row"><span class="key">' + key + '</span><span class="val" style="color:' + (color || '#e0e0e0') + ';">' + val + '</span></div>';
    }
    function fmtGold(n) { if (n == null) return '-'; return n % 1 === 0 ? n : (Math.round(n * 10) / 10); }

    // 移动端详情区块折叠/展开
    function toggleMobileSec(titleEl) {
      var bodyEl = titleEl.nextElementSibling;
      if (!bodyEl) return;
      var arrowEl = titleEl.querySelector('.md-arrow');
      var expanding = bodyEl.style.display === 'none';
      bodyEl.style.display = expanding ? '' : 'none';
      if (arrowEl) arrowEl.classList.toggle('open', expanding);
    }

    // 估价计算折叠/展开
    let calcCollapsed = true;
    function toggleCalcCollapse() {
      calcCollapsed = !calcCollapsed;
      var calcEl = document.getElementById('ss-calc');
      var arrowEl = document.getElementById('calc-collapse-arrow');
      if (calcCollapsed) {
        calcEl.style.display = 'none';
        arrowEl.classList.remove('open');
      } else {
        calcEl.style.display = '';
        arrowEl.classList.add('open');
      }
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

    // 帮助弹窗内容
    var HELP_CONTENTS = {
      range: '<div style="font-weight:600;color:#60a5fa;margin-bottom:8px;font-size:14px;">合理交易范围</div>' +
        '<div style="color:#bbb;line-height:1.7;">基于同价位段成交记录的市场波动统计得出的参考区间，90%以上同类账号成交价落在此范围内。</div>' +
        '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #2a2a4a;color:#888;font-size:12px;line-height:1.6;">' +
        '• 500元以下：±20%（最低±30元）<br>' +
        '• 500~2000元：±15%<br>' +
        '• 2000~5000元：±12%<br>' +
        '• 5000元以上：±10%' +
        '</div>' +
        '<div style="margin-top:10px;color:#666;font-size:11px;">仅供参考，实际成交受账号细节、卖家心态、平台手续费等因素影响。</div>'
    };

    // 显示帮助弹窗
    function showHelpPopup(icon, key) {
      // 移除已有弹窗
      var old = document.querySelector('.help-popup');
      if (old) old.remove();

      var content = HELP_CONTENTS[key] || '暂无说明';
      var popup = document.createElement('div');
      popup.className = 'help-popup';
      popup.innerHTML = content;
      document.body.appendChild(popup);

      // 定位到问号下方
      var rect = icon.getBoundingClientRect();
      popup.style.left = rect.left + 'px';
      popup.style.top = (rect.bottom + 8) + 'px';

      // 防止超出右边界
      var popupRect = popup.getBoundingClientRect();
      if (popupRect.right > window.innerWidth - 10) {
        popup.style.left = (window.innerWidth - popupRect.width - 10) + 'px';
      }
      // 防止超出左边界
      popupRect = popup.getBoundingClientRect();
      if (popupRect.left < 10) {
        popup.style.left = '10px';
      }

      requestAnimationFrame(function() {
        popup.classList.add('show');
      });

      // 点击外部关闭
      setTimeout(function() {
        document.addEventListener('click', closeHelpPopupOutside, { once: true });
      }, 10);
    }

    function closeHelpPopupOutside(e) {
      var popup = document.querySelector('.help-popup');
      if (!popup) return;
      if (e.target.classList.contains('help-icon')) {
        // 点击了另一个问号，交给新的处理
        popup.remove();
        return;
      }
      if (!popup.contains(e.target)) {
        popup.classList.remove('show');
        setTimeout(function() { popup.remove(); }, 200);
      } else {
        document.addEventListener('click', closeHelpPopupOutside, { once: true });
      }
    }

    // 事件委托：点击问号显示帮助
    document.addEventListener('click', function(e) {
      var icon = e.target.closest('.help-icon');
      if (icon) {
        e.stopPropagation();
        var key = icon.getAttribute('data-help');
        showHelpPopup(icon, key);
      }
    });

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
        html += '<span class="history-tag" title="' + escStatsHtml(h.id) + '" onclick="loadHistory(\\'' + h.id + '\\')">' + h.id + ' (' + ratioText + ')</span>';
      });
      document.getElementById('history-tags').innerHTML = html;
    }

    function clearHistory() {
      if (!confirm('确定清空全部查询历史？')) return;
      localStorage.removeItem('mw_history');
      renderHistory();
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

    // ============================================================
    // 可视化编辑器
    // ============================================================
    var VE_CHARS = [];      // 角色列表 [{name, tier, price, const, hasSig, sigRefine}]
    var VE_DEBOUNCE = null;
    var VE_EVALUATING = false;
    var VE_SYNC_DESC = true; // 是否同步描述文本（防止双向触发死循环）

    // 从当前生效的权重配置动态构建角色列表（支持服务端默认+用户自定义双层覆盖）
    function veGetCharList() {
      var baseList = window._charList || [];
      var serverConfig = window._serverDefaultConfig || {};
      var userConfig = (typeof getSavedWeights === 'function') ? (getSavedWeights() || {}) : {};
      // 服务端默认覆盖（管理员后台设置）优先级高于硬编码默认，低于用户自定义
      var serverTierOverride = serverConfig.charTierOverride || {};
      var serverCharPrices = serverConfig.charPrices || {};
      var userTierOverride = userConfig.charTierOverride || {};
      var userCharPrices = userConfig.charPrices || {};
      var added = {};
      var list = [];

      // 基础角色列表（服务端渲染的完整默认数据）+ 双层覆盖
      for (var i = 0; i < baseList.length; i++) {
        var c = baseList[i];
        if (added[c.name]) continue;
        added[c.name] = true;
        // 等级：用户自定义 > 服务端默认 > 基础
        var finalTier = userTierOverride[c.name] || serverTierOverride[c.name] || c.tier;
        // 价格：用户自定义 > 服务端默认 > 基础
        var finalPrice = c.price;
        if (serverCharPrices[c.name] != null) finalPrice = serverCharPrices[c.name];
        if (userCharPrices[c.name] != null) finalPrice = userCharPrices[c.name];
        list.push({
          name: c.name,
          tier: finalTier,
          price: finalPrice,
          isHot: c.isHot,
        });
      }
      // 服务端默认里可能有新角色
      for (var srvName in serverTierOverride) {
        if (!serverTierOverride.hasOwnProperty(srvName)) continue;
        if (added[srvName]) continue;
        added[srvName] = true;
        var srvPrice = serverCharPrices[srvName] != null ? serverCharPrices[srvName] : 0;
        if (userCharPrices[srvName] != null) srvPrice = userCharPrices[srvName];
        list.push({
          name: srvName,
          tier: userTierOverride[srvName] || serverTierOverride[srvName],
          price: srvPrice,
          isHot: false,
        });
      }
      // 用户自定义里可能有新角色
      for (var usrName in userTierOverride) {
        if (!userTierOverride.hasOwnProperty(usrName)) continue;
        if (added[usrName]) continue;
        added[usrName] = true;
        list.push({
          name: usrName,
          tier: userTierOverride[usrName],
          price: userCharPrices[usrName] != null ? userCharPrices[usrName] : 0,
          isHot: false,
        });
      }
      // charPrices 里可能有新角色
      var allCharPrices = {};
      for (var pn in serverCharPrices) { if (serverCharPrices.hasOwnProperty(pn)) allCharPrices[pn] = serverCharPrices[pn]; }
      for (var pn2 in userCharPrices) { if (userCharPrices.hasOwnProperty(pn2)) allCharPrices[pn2] = userCharPrices[pn2]; }
      for (var cpName in allCharPrices) {
        if (!allCharPrices.hasOwnProperty(cpName)) continue;
        if (added[cpName]) continue;
        added[cpName] = true;
        list.push({ name: cpName, tier: 'E', price: allCharPrices[cpName], isHot: false });
      }
      // 按价格从高到低排序
      list.sort(function(a, b) { return b.price - a.price; });
      return list;
    }

    function veGetSigWeapons() {
      var serverConfig = window._serverDefaultConfig || {};
      var userConfig = (typeof getSavedWeights === 'function') ? (getSavedWeights() || {}) : {};
      // 用户自定义 > 服务端默认 > 基础
      return Object.assign({}, window._sigWeapons || {}, serverConfig.sigWeapons || {}, userConfig.sigWeapons || {});
    }

    // 渲染角色卡片列表
    function veRenderChars() {
      var grid = document.getElementById('ve-char-grid');
      if (!grid) return;
      document.getElementById('ve-char-count').textContent = VE_CHARS.length + ' 个角色';
      if (VE_CHARS.length === 0) {
        grid.innerHTML = '<div style="width:100%;text-align:center;padding:24px 0;color:var(--text-dim);font-size:12px;">还没有添加角色，点击上方按钮添加</div>';
        return;
      }
      // 按等级排序（S>A>B>C>D>E），同等级按价格从高到低
      var tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5 };
      var sorted = [...VE_CHARS].sort(function(a, b) {
        var ta = tierOrder[a.tier] != null ? tierOrder[a.tier] : 99;
        var tb = tierOrder[b.tier] != null ? tierOrder[b.tier] : 99;
        if (ta !== tb) return ta - tb;
        return (b.price || 0) - (a.price || 0);
      });
      grid.innerHTML = sorted.map(function(c) {
        var tier = c.tier || 'E';
        var tierLabels = { S: 'S级', A: 'A级', B: 'B级', C: 'C级', D: 'D级', E: 'E级' };
        var tierLabel = tierLabels[tier] || tier + '级';
        var sigWeapons = veGetSigWeapons();
        var sigName = sigWeapons[c.name];
        var hasSig = !!c.hasSig;
        var sigRefine = c.sigRefine || 1;
        
        // 命座选项
        var constOptions = '';
        for (var i = 0; i <= 6; i++) {
          var label = i === 0 ? '零命' : (i === 6 ? '满命' : i + '命');
          constOptions += '<option value="' + i + '"' + (c.const === i ? ' selected' : '') + '>' + label + '</option>';
        }
        
        // 武器精数选项（0=无，1-5=精1到精5）
        var refineOptions = '<option value="0">无专武</option>';
        if (sigName) {
          for (var j = 1; j <= 5; j++) {
            refineOptions += '<option value="' + j + '"' + (hasSig && sigRefine === j ? ' selected' : '') + '>精' + j + '</option>';
          }
        }
        
        return (
          '<div class="ve-char-card" data-name="' + c.name + '">' +
            '<div class="ve-char-top">' +
              '<div class="ve-char-avatar ' + tier + '"><img src="/public/avatars/' + encodeURIComponent(c.name) + '.png" data-name="' + c.name + '" onerror="onAvatarError(this)"></div>' +
              '<div class="ve-char-info">' +
                '<div class="ve-char-name-row">' +
                  '<span class="ve-char-name">' + c.name + '</span>' +
                  '<span class="ve-char-price' + ((c.price && c.price > 0) ? '' : ' muted') + '">' + ((c.price && c.price > 0) ? '¥' + c.price : '¥--') + '</span>' +
                '</div>' +
                '<div class="ve-char-tier"><span class="tier-badge ' + tier + '">' + tierLabel + '</span></div>' +
              '</div>' +
            '</div>' +
            '<div class="ve-char-selects">' +
              '<select onchange="veUpdateCharConst(\\'' + c.name.replace(/'/g, "\\\\'") + '\\', this.value)">' + constOptions + '</select>' +
              '<select onchange="veUpdateCharSig(\\'' + c.name.replace(/'/g, "\\\\'") + '\\', this.value)">' + refineOptions + '</select>' +
            '</div>' +
            '<div class="ve-char-remove" onclick="veRemoveChar(\\'' + c.name.replace(/'/g, "\\\\'") + '\\')" title="移除">×</div>' +
          '</div>'
        );
      }).join('');
    }

    // 更新角色命座
    function veUpdateCharConst(name, value) {
      var c = VE_CHARS.find(function(c) { return c.name === name; });
      if (!c) return;
      c.const = parseInt(value) || 0;
      // 重新计算价格
      var list = veGetCharList();
      var info = list.find(function(c) { return c.name === name; });
      if (info) {
        var constPremiums = (typeof getSavedWeights === 'function') ? ((getSavedWeights() || {}).constPremiums || {}) : {};
        var basePrice = info.price || 0;
        var premium = constPremiums[name] && constPremiums[name][c.const] != null ? constPremiums[name][c.const] : 0;
        c.price = Math.round(basePrice + premium);
      }
      veRenderChars();
      veOnChange();
    }

    // 更新角色专武精炼
    function veUpdateCharSig(name, value) {
      var c = VE_CHARS.find(function(c) { return c.name === name; });
      if (!c) return;
      var v = parseInt(value) || 0;
      if (v === 0) {
        c.hasSig = false;
        c.sigRefine = 1;
      } else {
        c.hasSig = true;
        c.sigRefine = v;
      }
      // 重新计算价格（简化：专武按固定加成）
      var list = veGetCharList();
      var info = list.find(function(c) { return c.name === name; });
      if (info) {
        var constPremiums = (typeof getSavedWeights === 'function') ? ((getSavedWeights() || {}).constPremiums || {}) : {};
        var basePrice = info.price || 0;
        var premium = constPremiums[name] && constPremiums[name][c.const] != null ? constPremiums[name][c.const] : 0;
        var sigWeapons = veGetSigWeapons();
        var sigName = sigWeapons[name];
        var sigPrice = 0;
        if (c.hasSig && sigName) {
          sigPrice = Math.round((info.price || 0) * 0.4 * (0.5 + 0.5 * c.sigRefine));
        }
        c.price = Math.round(basePrice + premium + sigPrice);
        c.sigName = sigName;
      }
      veRenderChars();
      veOnChange();
    }

    // 添加角色
    function veAddChar(name) {
      var list = veGetCharList();
      var info = list.find(function(c) { return c.name === name; });
      if (!info) return;
      // 已存在则跳过
      if (VE_CHARS.find(function(c) { return c.name === name; })) return;
      var sigMap = veGetSigWeapons();
      VE_CHARS.push({
        name: name,
        tier: info.tier,
        price: info.price,
        const: 0,
        hasSig: false,
        sigRefine: 1,
        sigName: sigMap[name] || '',
      });
      veRenderChars();
      veOnChange();
    }

    // 移除角色
    function veRemoveChar(name) {
      VE_CHARS = VE_CHARS.filter(function(c) { return c.name !== name; });
      veRenderChars();
      veOnChange();
    }

    // 打开角色编辑弹窗
    function veOpenCharEdit(name) {
      var c = VE_CHARS.find(function(x) { return x.name === name; });
      if (!c) return;
      var existing = document.getElementById('ve-char-edit-modal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 've-char-edit-modal';
      modal.className = 'char-edit-modal';

      var tier = c.tier || 'E';
      var firstChar = c.name.charAt(0);
      var sigName = c.sigName || '该角色暂无专武';

      var html =
        '<div class="char-edit-dialog">' +
          '<div class="char-edit-header">' +
            '<div class="ve-char-avatar ' + tier + '" style="width:44px;height:44px;font-size:18px;"><img src="/public/avatars/' + encodeURIComponent(c.name) + '.png" data-name="' + c.name + '" onerror="onAvatarError(this)"></div>' +
            '<h3>' + c.name + '</h3>' +
          '</div>' +

          '<div class="char-edit-field">' +
            '<label>命座</label>' +
            '<div class="const-slider">' +
              [0,1,2,3,4,5,6].map(function(n) {
                var label = n >= 6 ? '满命' : (n === 0 ? '零命' : n + '命');
                return '<button class="const-btn ' + (c.const === n ? 'active' : '') + '" data-const="' + n + '">' + label + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="char-edit-field">' +
            '<label>专武</label>' +
            '<div class="sig-toggle" id="ve-sig-toggle">' +
              '<div class="sig-info">' +
                '<div class="sig-name">' + sigName + '</div>' +
                '<div class="sig-desc">' + (c.sigName ? '点击开启/关闭专武' : '暂无专属武器数据') + '</div>' +
              '</div>' +
              '<div class="sig-switch ' + (c.hasSig ? 'on' : '') + '"></div>' +
            '</div>' +
            (c.sigName && c.hasSig ?
              '<div class="refine-select" id="ve-refine-select">' +
                [1,2,3,4,5].map(function(r) {
                  return '<button class="refine-btn ' + (c.sigRefine === r ? 'active' : '') + '" data-refine="' + r + '">精' + r + '</button>';
                }).join('') +
              '</div>' : '') +
          '</div>' +

          '<div class="char-edit-actions">' +
            '<button class="ce-delete" onclick="veDeleteFromEdit()">删除角色</button>' +
            '<button class="ce-cancel" onclick="veCloseEdit()">取消</button>' +
            '<button class="ce-confirm" onclick="veConfirmEdit()">确定</button>' +
          '</div>' +
        '</div>';

      modal.innerHTML = html;
      document.body.appendChild(modal);

      // 存储当前编辑的角色名
      modal.dataset.editingName = name;
      var editingConst = c.const;
      var editingHasSig = c.hasSig;
      var editingSigRefine = c.sigRefine;

      // 命座按钮
      modal.querySelectorAll('.const-btn').forEach(function(btn) {
        btn.onclick = function() {
          editingConst = parseInt(btn.dataset.const);
          modal.querySelectorAll('.const-btn').forEach(function(b) {
            b.classList.toggle('active', parseInt(b.dataset.const) === editingConst);
          });
        };
      });

      // 专武开关
      var sigToggle = modal.querySelector('#ve-sig-toggle');
      if (sigToggle && c.sigName) {
        sigToggle.onclick = function() {
          editingHasSig = !editingHasSig;
          modal.querySelector('.sig-switch').classList.toggle('on', editingHasSig);
          // 显示/隐藏精炼选择
          var refineSel = modal.querySelector('#ve-refine-select');
          if (editingHasSig && !refineSel) {
            var newRefine = document.createElement('div');
            newRefine.className = 'refine-select';
            newRefine.id = 've-refine-select';
            newRefine.innerHTML = [1,2,3,4,5].map(function(r) {
              return '<button class="refine-btn ' + (editingSigRefine === r ? 'active' : '') + '" data-refine="' + r + '">精' + r + '</button>';
            }).join('');
            sigToggle.parentNode.insertBefore(newRefine, sigToggle.nextSibling);
            newRefine.querySelectorAll('.refine-btn').forEach(function(rb) {
              rb.onclick = function() {
                editingSigRefine = parseInt(rb.dataset.refine);
                newRefine.querySelectorAll('.refine-btn').forEach(function(b) {
                  b.classList.toggle('active', parseInt(b.dataset.refine) === editingSigRefine);
                });
              };
            });
          } else if (!editingHasSig && refineSel) {
            refineSel.remove();
          }
        };
      }

      // 精炼按钮（如果已存在）
      var refineButtons = modal.querySelectorAll('.refine-btn');
      refineButtons.forEach(function(rb) {
        rb.onclick = function() {
          editingSigRefine = parseInt(rb.dataset.refine);
          modal.querySelectorAll('.refine-btn').forEach(function(b) {
            b.classList.toggle('active', parseInt(b.dataset.refine) === editingSigRefine);
          });
        };
      });

      // 关闭
      modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
      };

      // 全局函数
      window.veCloseEdit = function() { modal.remove(); };
      window.veDeleteFromEdit = function() {
        if (confirm('确定删除 ' + name + ' 吗？')) {
          veRemoveChar(name);
          modal.remove();
        }
      };
      window.veConfirmEdit = function() {
        var target = VE_CHARS.find(function(x) { return x.name === name; });
        if (target) {
          target.const = editingConst;
          target.hasSig = editingHasSig;
          target.sigRefine = editingHasSig ? editingSigRefine : 1;
        }
        veRenderChars();
        veOnChange();
        modal.remove();
      };
    }

    // 角色选择器
    var _charPickerEl = null;
    var _charPickerTier = 'all';
    var _charPickerSearch = '';

    function openCharPickerTop(btn) {
      openCharPicker(btn);
    }

    function openCharPicker(anchorBtn) {
      if (_charPickerEl) { _charPickerEl.remove(); _charPickerEl = null; return; }

      var list = veGetCharList();
      var sigMap = veGetSigWeapons();

      var picker = document.createElement('div');
      picker.className = 'char-picker';
      picker.id = 'char-picker';

      // 获取所有级别
      var tiers = ['all', ...new Set(list.map(function(c) { return c.tier; }).filter(Boolean).sort())];

      picker.innerHTML =
        '<input type="text" class="char-picker-search" id="cp-search" placeholder="搜索角色名...">' +
        '<div class="char-picker-tiers" id="cp-tiers">' +
          tiers.map(function(t) {
            return '<button class="char-picker-tier-btn ' + (t === 'all' ? 'active' : '') + '" data-tier="' + t + '">' +
              (t === 'all' ? '全部' : t + '级') + '</button>';
          }).join('') +
        '</div>' +
        '<div class="char-picker-grid" id="cp-grid"></div>';

      // 定位在按钮下方
      var rect = anchorBtn.getBoundingClientRect();
      picker.style.top = (window.scrollY + rect.bottom + 8) + 'px';
      picker.style.left = (window.scrollX + rect.left) + 'px';

      document.body.appendChild(picker);
      _charPickerEl = picker;

      // 渲染角色网格
      function renderGrid() {
        var grid = picker.querySelector('#cp-grid');
        var filtered = list.filter(function(c) {
          if (_charPickerTier !== 'all' && c.tier !== _charPickerTier) return false;
          if (_charPickerSearch && !c.name.toLowerCase().includes(_charPickerSearch.toLowerCase())) return false;
          return true;
        });
        if (filtered.length === 0) {
          grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px 0;color:var(--text-dim);font-size:12px;">未找到匹配的角色</div>';
          return;
        }
        grid.innerHTML = filtered.map(function(c) {
          var selected = VE_CHARS.some(function(vc) { return vc.name === c.name; });
          var tier = c.tier || 'E';
          return (
            '<div class="char-picker-item ' + (selected ? 'selected' : '') + '" data-name="' + c.name + '">' +
              '<div class="cp-avatar ' + tier + '"><img src="/public/avatars/' + encodeURIComponent(c.name) + '.png" data-name="' + c.name + '" onerror="onAvatarError(this)"></div>' +
              '<div class="cp-name">' + c.name + '</div>' +
              '<div class="cp-price">¥' + c.price + '</div>' +
            '</div>'
          );
        }).join('');

        // 点击添加/移除
        grid.querySelectorAll('.char-picker-item').forEach(function(item) {
          item.onclick = function() {
            var name = item.dataset.name;
            var existing = VE_CHARS.find(function(vc) { return vc.name === name; });
            if (existing) {
              veRemoveChar(name);
            } else {
              veAddChar(name);
            }
            renderGrid();
          };
        });
      }

      // 搜索
      picker.querySelector('#cp-search').oninput = function(e) {
        _charPickerSearch = e.target.value;
        renderGrid();
      };
      picker.querySelector('#cp-search').focus();

      // 级别筛选
      picker.querySelectorAll('.char-picker-tier-btn').forEach(function(btn) {
        btn.onclick = function() {
          _charPickerTier = btn.dataset.tier;
          picker.querySelectorAll('.char-picker-tier-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.tier === _charPickerTier);
          });
          renderGrid();
        };
      });

      renderGrid();

      // 点击外部关闭
      setTimeout(function() {
        document.addEventListener('click', closePickerOnOutside);
      }, 10);
      function closePickerOnOutside(e) {
        if (!picker.contains(e.target) && e.target !== anchorBtn && !anchorBtn.contains(e.target)) {
          picker.remove();
          _charPickerEl = null;
          document.removeEventListener('click', closePickerOnOutside);
        }
      }
    }

    // 数据变动时防抖触发估价
    function veOnChange() {
      // 同步更新描述文本
      if (VE_SYNC_DESC) {
        var descInput = document.getElementById('ve-desc-input');
        if (descInput) {
          var desc = veGenerateDescText();
          descInput.value = desc;
        }
      }
    }

    // 描述输入框变化：解析描述到角色列表
    var VE_DESC_DEBOUNCE = null;
    function veOnDescInput() {
      if (VE_DESC_DEBOUNCE) clearTimeout(VE_DESC_DEBOUNCE);
      VE_DESC_DEBOUNCE = setTimeout(function() {
        var descInput = document.getElementById('ve-desc-input');
        if (!descInput) return;
        var text = descInput.value.trim();
        if (!text) {
          VE_CHARS = [];
          // 清空资源
          ['ve-starsound','ve-moonphase','ve-coral','ve-floatgold','ve-casttide','ve-yellow','ve-outfit','ve-frame','ve-pulls'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
          });
          veRenderChars();
          return;
        }
        
        // 调用估价接口（同时返回解析后的结构化数据）
        VE_SYNC_DESC = false; // 防止反向触发
        // 显示解析中加载动画
        var charGrid = document.getElementById('ve-char-grid');
        if (charGrid) charGrid.classList.add('parsing');
        
        fetch('/api/x9k2-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showTitle: text, priceInCents: 0, game: 'wuwa' })
        }).then(function(r) { return r.json(); })
          .then(function(result) {
            if (result.success && result.data) {
              var info = result.data.info || {};
              var det = result.data.details || {};
              var chars = info.characters || [];
              var weapons = info.weapons || [];
              var detChars = det.characters || [];
              
              // 建立 details 中角色名→价值的映射（估价后才用）
              var detPriceMap = {};
              var sigWeaponsMap = veGetSigWeapons();
              var weaponRefineMap = {}; // weaponName -> refine
              
              // 1. 从 info.weapons 里拿（如果解析正确的话）
              weapons.forEach(function(w) {
                if (w.name && w.refine) {
                  weaponRefineMap[w.name] = w.refine;
                }
              });
              
              // 2. 从文本中正则匹配 "精N+武器名" 兜底
              var refinePattern = /精([1-5])[\\s]*([^\\s，,、;；+]+)/g;
              var m;
              while ((m = refinePattern.exec(text)) !== null) {
                var refine = parseInt(m[1]);
                var wName = m[2].replace(/[的是为有]+$/, '');
                if (wName.length >= 2) {
                  weaponRefineMap[wName] = refine;
                }
              }
              
              // 更新角色列表，带上武器精炼信息
              VE_CHARS = chars.map(function(c) {
                var sigName = sigWeaponsMap[c.name];
                var hasSig = !!c.hasSig;
                var sigRefine = c.sigRefine || 1;
                
                // 如果引擎没识别到专武，从 weaponRefineMap 里找
                if (!hasSig && sigName) {
                  if (weaponRefineMap[sigName]) {
                    hasSig = true;
                    sigRefine = weaponRefineMap[sigName];
                  }
                }
                
                return {
                  name: c.name,
                  tier: c.tier || 'B',
                  const: c.const || 0,
                  hasSig: hasSig,
                  sigRefine: sigRefine,
                  price: 0, // 估价前不显示价格
                  sigName: sigName || ''
                };
              });
              
              // 更新资源（注意：接口返回的字段名是平铺在 info 下的）
              if (document.getElementById('ve-starsound')) document.getElementById('ve-starsound').value = info.starSounds || '';
              if (document.getElementById('ve-moonphase')) document.getElementById('ve-moonphase').value = info.moonPhases || '';
              if (document.getElementById('ve-coral')) document.getElementById('ve-coral').value = info.coral || '';
              if (document.getElementById('ve-floatgold')) document.getElementById('ve-floatgold').value = info.goldenRipples || '';
              if (document.getElementById('ve-casttide')) document.getElementById('ve-casttide').value = info.tideRipples || '';
              if (document.getElementById('ve-yellow')) document.getElementById('ve-yellow').value = info.yellowCount || '';
              if (document.getElementById('ve-outfit')) document.getElementById('ve-outfit').value = info.outfits || '';
              if (document.getElementById('ve-frame')) document.getElementById('ve-frame').value = info.motorcycles || '';
              if (document.getElementById('ve-pulls')) document.getElementById('ve-pulls').value = Math.round(info.pulls || 0) || '';
              
              veRenderChars();
              // 注意：不自动显示估价结果，用户点击"立即估价"才计算
            }
          })
          .catch(function() {})
          .finally(function() {
            if (charGrid) charGrid.classList.remove('parsing');
            setTimeout(function() { VE_SYNC_DESC = true; }, 50);
          });
      }, 400);
    }

    // 收集结构化数据
    function veGetInfo() {
      var info = {
        characters: VE_CHARS.map(function(c) {
          return { name: c.name, const: c.const, tier: c.tier, price: c.price, isHot: c.isHot };
        }),
        weapons: [],
        starSound: parseInt(document.getElementById('ve-starsound').value) || 0,
        moonPhase: parseInt(document.getElementById('ve-moonphase').value) || 0,
        aftermathCoral: parseInt(document.getElementById('ve-coral').value) || 0,
        floatGoldRipple: parseInt(document.getElementById('ve-floatgold').value) || 0,
        castTideRipple: parseInt(document.getElementById('ve-casttide').value) || 0,
        yellowCount: parseInt(document.getElementById('ve-yellow').value) || 0,
        outfitCount: parseInt(document.getElementById('ve-outfit').value) || 0,
        vehicleFrameCount: parseInt(document.getElementById('ve-frame').value) || 0,
        pulls: (parseInt(document.getElementById('ve-pulls')?.value) || 0),
      };
      // 从有专武的角色生成武器列表
      VE_CHARS.forEach(function(c) {
        if (c.hasSig && c.sigName) {
          info.weapons.push({ name: c.sigName, refine: c.sigRefine || 1 });
        }
      });
      return info;
    }

    // 估价
    async function veEvaluate(silent) {
      if (VE_CHARS.length === 0) {
        if (!silent) veShowError('请先添加至少一个角色');
        return;
      }
      if (VE_EVALUATING) return;
      VE_EVALUATING = true;

      // 所有估价按钮进入加载状态
      var allEvalBtns = document.querySelectorAll('.eval-btn');
      allEvalBtns.forEach(function(btn) { btn.classList.add('loading'); btn.disabled = true; });

      if (!silent) veShowLoading('估价中...');

      var info = veGetInfo();
      // 生成描述文本再调用估价接口（复用现有接口）
      var desc = veGenerateDescText(info);
      var priceEl = document.getElementById('ve-price-side') || document.getElementById('ve-price');
      var price = parseFloat(priceEl.value) || 0;

      try {
        const resp = await fetch('/api/x9k2-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            showTitle: desc,
            priceInCents: Math.round(price * 100),
            customWeights: (typeof getSavedWeights === 'function') ? (getSavedWeights() || window._serverDefaultConfig || null) : (window._serverDefaultConfig || null),
            game: 'wuwa',
          }),
        });
        const result = await resp.json();
        if (result.success) {
          veClearStatus();
          showResult(result.data);
          // 用估价结果更新角色价格显示
          var detChars = (result.data.details && result.data.details.characters) || [];
          var priceMap = {};
          detChars.forEach(function(dc) { priceMap[dc.name] = dc.value || 0; });
          VE_CHARS.forEach(function(c) {
            if (priceMap[c.name] != null) c.price = priceMap[c.name];
          });
          veRenderChars();
        } else {
          veShowError(result.error || '估价失败');
        }
      } catch (e) {
        veShowError('网络错误：' + e.message);
      } finally {
        VE_EVALUATING = false;
        allEvalBtns.forEach(function(btn) { btn.classList.remove('loading'); btn.disabled = false; });
      }
    }

    function veGetCustomWeights() {
      return (typeof getSavedWeights === 'function') ? (getSavedWeights() || window._serverDefaultConfig || null) : (window._serverDefaultConfig || null);
    }

    function veShowLoading(text) {
      var el = document.getElementById('status-msg');
      if (el) el.innerHTML = '<div class="loading">' + text + '</div>';
    }
    function veShowError(text) {
      var el = document.getElementById('status-msg');
      if (el) el.innerHTML = '<div class="error-msg">' + text + '</div>';
    }
    function veShowSuccess(text) {
      var el = document.getElementById('status-msg');
      if (el) el.innerHTML = '<div class="success-msg" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);color:#4ade80;padding:10px 14px;border-radius:8px;font-size:13px;text-align:center;">' + text + '</div>';
    }
    function veClearStatus() {
      var el = document.getElementById('status-msg');
      if (el) el.innerHTML = '';
    }

    // 生成描述文本（用现有接口的话直接传文本，不依赖 generateDescription 函数）
    function veGenerateDescText(info) {
      info = info || veGetInfo();
      var lines = [];
      // 角色
      if (info.characters && info.characters.length > 0) {
        var sorted = [...info.characters].sort((a, b) => (b.price || 0) - (a.price || 0));
        var charStr = sorted.map(function(c) {
          if (c.const >= 6) return '满命' + c.name;
          if (c.const > 0) return c.const + '命' + c.name;
          return c.name;
        }).join('、');
        lines.push('【角色】' + charStr);
      }
      // 武器
      if (info.weapons && info.weapons.length > 0) {
        var weaponStr = info.weapons.map(function(w) {
          return (w.refine > 1 ? '精' + w.refine : '') + w.name;
        }).join('、');
        lines.push('【武器】' + weaponStr);
      }
      // 资源
      if (info.starSound) lines.push('【星声】' + info.starSound);
      if (info.moonPhase) lines.push('【月相】' + info.moonPhase);
      if (info.aftermathCoral) lines.push('【余波珊瑚】' + info.aftermathCoral);
      if (info.floatGoldRipple) lines.push('【浮金波纹】' + info.floatGoldRipple);
      if (info.castTideRipple) lines.push('【铸潮波纹】' + info.castTideRipple);
      if (info.yellowCount) lines.push('【黄数】' + info.yellowCount);
      if (info.outfitCount) lines.push('【服饰】' + info.outfitCount + '个');
      if (info.vehicleFrameCount) lines.push('【车架模组】' + info.vehicleFrameCount + '个');
      if (info.pulls && !info.yellowCount) lines.push('【总抽数】' + info.pulls);
      return lines.join('\\n');
    }

    // 生成描述文本按钮
    function veGenerateDesc() {
      var desc = veGenerateDescText();
      if (!desc) {
        veShowError('暂无数据可生成');
        return;
      }
      // 复制到剪贴板
      if (navigator.clipboard) {
        navigator.clipboard.writeText(desc).then(function() {
          veShowSuccess('描述文本已复制到剪贴板');
        }).catch(function() {
          prompt('生成的描述文本（Ctrl+C复制）：', desc);
        });
      } else {
        prompt('生成的描述文本（Ctrl+C复制）：', desc);
      }
    }

    // 从描述导入
    function veImportFromPaste() {
      var existing = document.getElementById('ve-import-modal');
      if (existing) { existing.remove(); return; }

      var modal = document.createElement('div');
      modal.id = 've-import-modal';
      modal.className = 'char-edit-modal';

      var dialog = document.createElement('div');
      dialog.className = 'char-edit-dialog';
      dialog.style.width = '480px';
      dialog.style.maxWidth = '92vw';

      dialog.innerHTML =
        '<h3 style="font-size:16px;color:var(--text);margin-bottom:10px;">从描述文本导入</h3>' +
        '<p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;line-height:1.5;">粘贴任意平台的商品描述，自动解析角色、武器、资源等数据。</p>' +
        '<textarea id="ve-import-text" placeholder="粘贴描述文本..." style="width:100%;height:180px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg-soft);color:var(--text);font-size:13px;font-family:inherit;resize:vertical;outline:none;line-height:1.5;"></textarea>' +
        '<div class="char-edit-actions">' +
          '<button class="ce-cancel" id="ve-import-cancel">取消</button>' +
          '<button class="ce-confirm" id="ve-import-confirm">开始导入</button>' +
        '</div>';

      modal.appendChild(dialog);
      document.body.appendChild(modal);

      var textarea = dialog.querySelector('#ve-import-text');
      textarea.focus();

      // 取消
      dialog.querySelector('#ve-import-cancel').onclick = function() { modal.remove(); };
      modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

      // 确认导入
      function doImport() {
        var desc = textarea.value.trim();
        if (!desc) { veShowError('请输入描述文本'); return; }
        modal.remove();
        veShowLoading('解析中...');

        fetch('/api/x9k2-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showTitle: desc, priceInCents: 0, customWeights: veGetCustomWeights(), game: 'wuwa' }),
        }).then(function(r) { return r.json(); }).then(function(result) {
          if (result.success && result.data && result.data.info) {
            var info = result.data.info;
            // 回填角色
            VE_CHARS = [];
            var sigMap = veGetSigWeapons();
            var charList = veGetCharList();
            var weaponNames = (info.weapons || []).map(function(w) { return w.name; });
            var weaponRefines = {};
            (info.weapons || []).forEach(function(w) { weaponRefines[w.name] = w.refine || 1; });

            if (info.characters && info.characters.length > 0) {
              info.characters.forEach(function(c) {
                var listInfo = charList.find(function(lc) { return lc.name === c.name; });
                var sigName = sigMap[c.name] || '';
                var hasSig = false;
                var sigRefine = 1;
                if (sigName && weaponNames.some(function(wn) { return wn === sigName || wn.includes(sigName) || sigName.includes(wn); })) {
                  hasSig = true;
                  for (var wn in weaponRefines) {
                    if (wn === sigName || wn.includes(sigName) || sigName.includes(wn)) {
                      sigRefine = weaponRefines[wn] || 1;
                      break;
                    }
                  }
                }
                VE_CHARS.push({
                  name: c.name,
                  tier: c.tier || (listInfo ? listInfo.tier : 'E'),
                  price: c.price || (listInfo ? listInfo.price : 0),
                  const: c.const || 0,
                  hasSig: hasSig,
                  sigRefine: sigRefine,
                  sigName: sigName,
                });
              });
            }
            // 回填资源（API 返回的 info 字段名是复数/缩写形式）
            document.getElementById('ve-starsound').value = info.starSounds || '';
            document.getElementById('ve-moonphase').value = info.moonPhases || '';
            document.getElementById('ve-coral').value = info.coral || '';
            document.getElementById('ve-floatgold').value = info.goldenRipples || '';
            document.getElementById('ve-casttide').value = info.tideRipples || '';
            document.getElementById('ve-yellow').value = info.yellowCount || '';
            document.getElementById('ve-outfit').value = info.outfits || '';
            if (document.getElementById('ve-pulls')) document.getElementById('ve-pulls').value = info.pulls || '';

            veRenderChars();
            veEvaluate(true);
            veShowSuccess('导入成功，共 ' + VE_CHARS.length + ' 个角色');
          } else {
            veShowError('导入失败：' + (result.error || '未知错误'));
          }
        }).catch(function(e) {
          veShowError('网络错误：' + e.message);
        });
      }

      dialog.querySelector('#ve-import-confirm').onclick = doImport;
      // Ctrl+Enter 快捷导入
      textarea.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          doImport();
        }
      });
    }
  </script>
</body>
</html>`;
}

module.exports = getPageHTML;
