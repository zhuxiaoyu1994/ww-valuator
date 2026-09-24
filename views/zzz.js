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
  <title>绝区零账号估价 - 游戏账号估价平台</title>
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
      --accent: #ffb84d;
      --accent-deep: #e89a2e;
      --accent-soft: rgba(255, 184, 77, 0.12);
      --accent-glow: rgba(255, 184, 77, 0.32);
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
    /* 给页面内容留出导航栏高度 */
    body { padding-top: 60px; }
    @media (max-width: 640px) {
      .top-nav-inner { padding: 0 16px; }
      .nav-logo span { display: none; }
      .nav-link { padding: 6px 10px; font-size: 13px; }
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
      background: rgba(8,8,15,0.5); border: 1px solid rgba(255,184,77,0.45);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      color: var(--accent); font-size: 11px; letter-spacing: 2px;
    }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .hero-body { position: absolute; left: 0; right: 0; bottom: 26px; z-index: 2; padding: 0 30px; }
    .hero-kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 4px; color: var(--accent); margin-bottom: 10px; }
    .hero-title { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
    .hero-title h1 { font-size: 34px; font-weight: 800; letter-spacing: 2px; color: #fff; text-shadow: 0 2px 24px rgba(0,0,0,0.65); }
    .hero-title .en { font-family: var(--mono); font-size: 12px; letter-spacing: 3px; color: rgba(255,255,255,0.75); }
    .subtitle { margin-top: 9px; font-size: 13px; color: rgba(255,255,255,0.8); text-shadow: 0 1px 12px rgba(0,0,0,0.8); max-width: 620px; line-height: 1.65; }

    /* 教学视频（预留） */
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
      color: #1a1206;
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
    .ve-char-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
      min-height: 60px;
    }
    .ve-char-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 12px 10px 10px;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 150px;
    }
    .ve-char-card:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.2);
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

    /* 角色选择器弹层 */
    .char-picker {
      position: absolute;
      z-index: 1000;
      width: 320px;
      max-height: 400px;
      overflow-y: auto;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      padding: 12px;
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
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
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
      color: #1a1206;
      font-size: 14px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      box-shadow: 0 4px 16px var(--accent-glow);
      letter-spacing: 2px;
    }
    .eval-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
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
    }
    .error-msg {
      text-align: center;
      padding: 18px;
      color: var(--bad);
      font-size: 14px;
    }

    /* 合规声明 */
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
      border: 1px solid rgba(255, 184, 77, 0.22);
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
      /* 详细结果占满底部 */
      .result-full {
        grid-column: 1 / -1;
        margin-top: 8px;
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

    /* ===== 移动端浮动结果条 ===== */
    @media (max-width: 1023px) {
      .mobile-float-bar {
        display: none;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 90;
        background: rgba(10, 10, 20, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid var(--line);
        padding: 10px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transform: translateY(100%);
        transition: transform 0.3s ease;
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
        color: var(--text-secondary);
        margin-left: 2px;
        font-weight: 400;
      }
      .mobile-float-bar .mfb-info {
        font-size: 11px;
        color: var(--text-muted);
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
      /* 移动端底部留出浮动条空间 */
      body.has-float-bar { padding-bottom: 70px; }
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
      <a href="/zzz" class="nav-logo">
        <img src="/public/icons/wuwaLogo.jpeg" alt="绝区零估价">
        <span>绝区零估价助手</span>
      </a>
      <div class="nav-links">
        <a href="/zzz" class="nav-link active">估价</a>
        <a href="/zzz/guide" class="nav-link">使用须知</a>
        <a href="/zzz/news" class="nav-link">角色资讯</a>
        <a href="/zzz/tips" class="nav-link">买卖攻略</a>
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
      <img class="hero-img" src="/public/covers/zzz-cover.jpg" alt="绝区零" loading="eager">
      <div class="hero-shade"></div>
      <div class="hud-corner tl"></div>
      <div class="hud-corner br"></div>
      <a class="back-home" href="/">← 返回首页</a>
      <span class="cover-badge"><span class="pulse-dot"></span>BE TA 测 试</span>
      <div class="hero-body">
        <div class="hero-kicker">ACCOUNT VALUATOR · 02</div>
        <div class="hero-title">
          <h1>绝区零账号估价</h1>
          <span class="en">ZENLESS ZONE ZERO</span>
        </div>
        <div class="subtitle">角色定价数据持续完善中，估值仅供参考 · 粘贴螃蟹网/盼之商品链接，或粘贴任意平台（螃蟹网/盼之/氪金兽/7881）描述估价</div>
      </div>
    </div>

    <!-- 双栏布局开始 -->
    <div class="main-layout">
      <div class="main-left">

    <!-- Tabs -->
    <div class="tabs rise d1">
      <button class="tab-btn active" id="tab-lookup" onclick="switchTab('lookup')">链接查询</button>
      <button class="tab-btn" id="tab-paste" onclick="switchTab('paste')">粘贴描述估价</button>
      <button class="tab-btn" id="tab-visual" onclick="switchTab('visual')">可视化编辑 <span style="display:inline-block;padding:1px 6px;border-radius:6px;background:rgba(245,158,11,0.15);color:#fbbf24;font-size:10px;font-weight:600;vertical-align:middle;margin-left:2px;letter-spacing:0;">BETA</span></button>
    </div>

    <!-- 估值规则设置入口 -->
    <div class="settings-bar rise d2">
      <button class="settings-btn" id="settings-btn" onclick="safeOpenValueSettings()" style="display:none;">估值规则设置</button>
      <button class="settings-btn" id="stats-btn" onclick="openStatsModal()">算法准确性报告</button>
    </div>

    <!-- 链接查询 -->
    <div class="input-card rise d2" id="panel-lookup">
      <div class="input-row" style="flex-direction:column;gap:12px;">
        <textarea id="product-id" placeholder="粘贴商品链接（螃蟹网/盼之网），如 https://www.pxb7.com/product/2353711688582091796/1 或 https://www.pzds.com/goodsDetails/MC2VGU/6" style="min-height:80px;resize:vertical;"></textarea>
        <div class="input-row" style="gap:8px;flex-direction:row;">
          <button class="eval-btn" id="lookup-btn" onclick="doLookup()" style="flex:1;">估价</button>
          <button class="clear-btn" id="clear-lookup-btn" onclick="clearLookupInput()" style="flex-shrink:0;width:60px;padding:0;border:1px solid #ddd;background:#f9f9f9;color:#666;border-radius:8px;cursor:pointer;font-size:14px;">清空</button>
        </div>
        <div id="config-info" style="font-size:12px;color:#888;margin-top:4px;"></div>
      </div>
    </div>

    <!-- 粘贴描述估价 -->
    <div class="input-card" id="panel-paste" style="display:none;">
      <div class="input-row" style="flex-direction:column;gap:12px;">
        <textarea id="eval-text" placeholder="粘贴任意平台（螃蟹网/盼之/氪金兽/7881）商品描述文本（包含角色、命座、武器、资源等信息）"></textarea>
        <div class="input-row" style="gap:8px;flex-direction:row;">
          <input type="number" class="price-input" id="eval-price" placeholder="标价(元)" min="0" style="flex:1;" />
          <button class="eval-btn" id="eval-btn" onclick="doEvaluate()">估价</button>
          <button class="clear-btn" id="clear-paste-btn" onclick="clearPasteInput()" style="flex-shrink:0;width:60px;padding:0;border:1px solid #ddd;background:#f9f9f9;color:#666;border-radius:8px;cursor:pointer;font-size:14px;">清空</button>
        </div>
      </div>
    </div>

    <!-- 可视化编辑 -->
    <div class="input-card" id="panel-visual" style="display:none;">
      <!-- 标价 -->
      <div class="ve-section-title">标价（元）</div>
      <div style="margin-bottom:18px;">
        <input type="number" id="ve-price" placeholder="输入标价（可选）" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg-soft);color:var(--text);font-size:14px;font-family:inherit;outline:none;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--line)'">
      </div>

      <!-- 角色列表 -->
      <div class="ve-section-title">
        <span>角色列表</span>
        <span class="ve-count" id="ve-char-count">0 个角色</span>
      </div>
      <div class="ve-char-grid" id="ve-char-grid"></div>
      <button class="ve-add-btn" onclick="openCharPicker(this)">+ 添加角色</button>

      <!-- 其他资源 -->
      <div class="ve-section-title" style="margin-top:8px;">其他资源</div>
      <div class="ve-resource-grid">
        <div class="ve-resource-item"><label>星声</label><input type="number" id="ve-starsound" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>月相</label><input type="number" id="ve-moonphase" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>余波珊瑚</label><input type="number" id="ve-coral" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>浮金波纹</label><input type="number" id="ve-floatgold" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>铸潮波纹</label><input type="number" id="ve-casttide" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>黄数（限定金）</label><input type="number" id="ve-yellow" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>服饰</label><input type="number" id="ve-outfit" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>车架模组</label><input type="number" id="ve-frame" min="0" placeholder="0" oninput="veOnChange()"></div>
        <div class="ve-resource-item"><label>总抽数</label><input type="number" id="ve-pulls" min="0" placeholder="0" oninput="veOnChange()"></div>
      </div>

      <!-- 操作按钮 -->
      <div class="ve-actions">
        <button class="ve-btn" onclick="veGenerateDesc()">生成描述文本</button>
        <button class="ve-btn" onclick="veImportFromPaste()">从描述导入</button>
        <button class="ve-btn primary" onclick="veEvaluate()">立即估价</button>
      </div>
    </div>


    <!-- 结果 -->
    <div class="result-card result-full" id="result">
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

      </div><!-- /main-left -->

      <!-- 右侧摘要卡（桌面端固定） -->
      <div class="main-right">
        <div class="side-summary" id="side-summary">
          <div class="ss-empty" id="side-summary-empty">
            <div class="ss-empty-icon">💰</div>
            输入账号信息后查看估价结果
          </div>
          <div id="side-summary-content" style="display:none;">
            <div class="ss-label">预估价值</div>
            <div class="ss-price" id="ss-price">--<span class="unit">元</span></div>
            <div class="ss-range" id="ss-range" style="display:none;"></div>
            <div class="ss-ratio" id="ss-ratio" style="display:none;"></div>

            <div class="ss-section-title">核心数据</div>
            <div class="ss-highlights" id="ss-highlights"></div>

            <button class="ss-action-btn" onclick="document.getElementById('result').scrollIntoView({behavior:'smooth'})">查看详细结果 ↓</button>
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

    <!-- 合规声明 -->
    <div class="footer-section rise d3">
      <div class="disclaimer">
        <div class="title">合规声明</div>
        <p>本工具仅提供游戏账号行情数据测算参考，不支持、不引导任何账号买卖、转让行为。</p>
        <p>《绝区零》官方禁止账号交易，所有账号交易产生封禁、被骗等损失由用户自行承担。</p>
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

  <!-- 移动端浮动结果条 -->
  <div class="mobile-float-bar" id="mobile-float-bar">
    <div>
      <div class="mfb-price" id="mfb-price">--<span class="unit">元</span></div>
      <div class="mfb-info" id="mfb-info">预估价值</div>
    </div>
    <div class="mfb-ratio" id="mfb-ratio" style="display:none;"></div>
  </div>

  <script src="/public/value-settings.js?v=20260824" onerror="window.__vsFailed=true"></script>
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
  <script>
    // 螃蟹网代理列表（客户端抓取用，多代理轮询降低被封风险）
    window._pxb7Proxies = ${JSON.stringify(pxb7Proxies)};
    window._charList = ${JSON.stringify(charList)};
    window._sigWeapons = ${JSON.stringify(sigWeapons)};
  </script>
  <script>
    // 切换估值设置面板到绝区零上下文（存储键 zzz_eval_weights，默认配置走 zzz 引擎）
    if (typeof setValueSettingsGame === 'function') setValueSettingsGame('zzz');

    // ============================================================
    // 服务器端默认配置（从数据库加载，优先于源码内置默认值）
    // 检测配置更新时间戳，自动清除用户旧的自定义配置
    // ============================================================
    window._serverDefaultConfig = null;
    fetch('/api/config/default?game=zzz').then(r => r.json()).then(json => {
      if (json.success && json.data) {
        window._serverDefaultConfig = json.data;
        console.log('[config] 已加载服务器端默认估值配置');
        // 检测 CONFIG_VERSION 变更（代码更新时不改变数据库 updated_at，需独立检查）
        var serverConfigVersion = json.data.configVersion || 1;
        var storedConfigVersion = parseInt(localStorage.getItem('zzz_eval_config_version') || '0', 10);
        if (serverConfigVersion > storedConfigVersion) {
          if (localStorage.getItem('zzz_eval_weights')) {
            localStorage.removeItem('zzz_eval_weights');
            console.log('[config] 检测到CONFIG_VERSION更新(' + storedConfigVersion + '→' + serverConfigVersion + ')，已自动清除旧配置');
          }
          localStorage.setItem('zzz_eval_config_version', String(serverConfigVersion));
        }
        // 检测服务器端配置是否已更新（基于数据库 updated_at 时间戳）
        var serverUpdatedAt = json.configUpdatedAt;
        var storedUpdatedAt = localStorage.getItem('zzz_config_updated_at');
        if (serverUpdatedAt && serverUpdatedAt !== storedUpdatedAt) {
          // 服务器配置已更新，清除用户旧的自定义配置
          if (localStorage.getItem('zzz_eval_weights')) {
            localStorage.removeItem('zzz_eval_weights');
            console.log('[config] 检测到服务器配置更新(' + storedUpdatedAt + '→' + serverUpdatedAt + ')，已自动清除旧配置');
          }
          localStorage.setItem('zzz_config_updated_at', serverUpdatedAt);
        }
      }
      updateConfigInfo();
    }).catch(() => {});

    // 记录本次页面加载时间（用户刷新浏览器即更新）
    var pageLoadTime = new Date().toISOString();
    localStorage.setItem('zzz_page_loaded_at', pageLoadTime);

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
      var storedAt = localStorage.getItem('zzz_page_loaded_at');
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
                body: JSON.stringify({ showTitle, priceInCents, customWeights, game: 'zzz' }),
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
              result.data.url = 'https://www.pxb7.com/buy/10304/detail?productId=' + parsed.productId;
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
            body: JSON.stringify({ productId, customWeights, game: 'zzz' }),
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
          body: JSON.stringify({ showTitle: text, priceInCents: price * 100, customWeights, game: 'zzz' }),
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
      resHtml += resultRow('菲林', info.starSounds || 0, '#e0e0e0');
      resHtml += resultRow('母带', info.moonPhases || 0, '#e0e0e0');
      resHtml += resultRow('丁尼', info.coral || 0, '#e0e0e0');
      resHtml += resultRow('调查记录', info.goldenRipples || 0, '#e0e0e0');
      resHtml += resultRow('活跃天数', info.tideRipples || 0, '#e0e0e0');
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
      document.getElementById('result-resources').innerHTML = resHtml;

      document.getElementById('result').classList.add('show');
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
      if (emptyEl) emptyEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';

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

        if (charCount > 0) items.push({ k: '五星角色', v: charCount + ' 个' });
        if (sTierCount > 0) items.push({ k: 'S级角色', v: sTierCount + ' 个', cls: 'danger' });
        if (c6Count > 0) items.push({ k: '满命角色', v: c6Count + ' 个', cls: 'good' });
        if (sigCount > 0) items.push({ k: '专武', v: sigCount + ' 把', cls: 'warn' });
        if (info.pulls > 0) items.push({ k: '总抽数', v: info.pulls + ' 抽' });
        if (yi.effectiveYellow != null) {
          items.push({ k: '有效金', v: fmtGold(yi.effectiveYellow) });
        }
        if (det.weightedFullConst > 0) {
          items.push({ k: '加权满命', v: det.weightedFullConst.toFixed(1), cls: 'good' });
        }
        if (det.satisfiedTeams && det.satisfiedTeams.length > 0) {
          items.push({ k: '成型配队', v: det.satisfiedTeams.length + ' 组', cls: 'good' });
        }

        let html = '';
        items.slice(0, 6).forEach(item => {
          html += '<div class="ss-hl-item"><span class="k">' + item.k + '</span><span class="v ' + (item.cls || '') + '">' + item.v + '</span></div>';
        });
        hlEl.innerHTML = html;
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
    }

    function resultRow(key, val, color) {
      return '<div class="result-row"><span class="key">' + key + '</span><span class="val" style="color:' + (color || '#e0e0e0') + ';">' + val + '</span></div>';
    }
    function fmtGold(n) { if (n == null) return '-'; return n % 1 === 0 ? n : (Math.round(n * 10) / 10); }

    // ============================================================
    // 算法准确性报告弹窗
    // ============================================================
    function openStatsModal() {
      var modal = document.getElementById('stats-modal');
      var content = document.getElementById('stats-modal-content');
      modal.style.display = 'block';
      content.innerHTML = '<div style="text-align:center;padding:60px 0;color:#888;"><div style="display:inline-block;width:32px;height:32px;border:3px solid #1e1e33;border-top-color:#ffcf8a;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:12px;"></div><div>正在加载统计数据...</div></div>';
      document.body.style.overflow = 'hidden';

      fetch('/api/public-stats?game=zzz').then(function(r) { return r.json(); }).then(function(result) {
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
      var old = document.querySelector('.help-popup');
      if (old) old.remove();

      var content = HELP_CONTENTS[key] || '暂无说明';
      var popup = document.createElement('div');
      popup.className = 'help-popup';
      popup.innerHTML = content;
      document.body.appendChild(popup);

      var rect = icon.getBoundingClientRect();
      popup.style.left = rect.left + 'px';
      popup.style.top = (rect.bottom + 8) + 'px';

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

      setTimeout(function() {
        document.addEventListener('click', closeHelpPopupOutside, { once: true });
      }, 10);
    }

    function closeHelpPopupOutside(e) {
      var popup = document.querySelector('.help-popup');
      if (!popup) return;
      if (e.target.classList.contains('help-icon')) {
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
      html += '<div style="margin-bottom:8px;"><span style="color:#ffcf8a;font-weight:600;">市场供需波动：</span>账号价格受市场供需关系影响，热门角色在特定时期可能溢价，冷门角色则可能折价，估价引擎基于历史均价计算，无法实时反映短期市场波动。</div>';
      html += '<div style="margin-bottom:8px;"><span style="color:#ffcf8a;font-weight:600;">账号组合差异：</span>每个账号的角色组合、命座、武器配置各不相同，部分稀有组合在市场上缺乏足够的成交样本，导致估值偏差较大。</div>';
      html += '<div style="margin-bottom:8px;"><span style="color:#ffcf8a;font-weight:600;">主观价值因素：</span>账号的视觉效果（皮肤、服饰）、ID稀有度、服务器热度等主观因素难以量化，这些因素可能导致实际成交价偏离估值。</div>';
      html += '<div style="margin-bottom:8px;"><span style="color:#ffcf8a;font-weight:600;">定价模型迭代：</span>估值引擎基于可配置的角色定价和系数公式，随着市场数据积累和参数调优，准确率会持续提升。当前R²=' + s.r2.toFixed(3) + '表明模型' + (s.r2 >= 0.8 ? '已具有较强解释力' : '仍有优化空间') + '。</div>';
      html += '<div><span style="color:#ffcf8a;font-weight:600;">如何理解这些指标：</span>R²越接近1表示估值越准确；相关系数(r)反映估值与成交价的线性相关程度；中位数偏差率排除极端值后反映系统性偏置；P90表示90%的账号偏差都在此范围内。</div>';
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
      try { history = JSON.parse(localStorage.getItem('zzz_history') || '[]'); } catch(e) {}
      // 去重
      history = history.filter(h => h.id !== productId);
      history.unshift({
        id: productId,
        ratio: data.costPerformance,
        value: data.estimatedValue,
      });
      history = history.slice(0, 10);
      localStorage.setItem('zzz_history', JSON.stringify(history));
      renderHistory();
    }

    function renderHistory() {
      let history = [];
      try { history = JSON.parse(localStorage.getItem('zzz_history') || '[]'); } catch(e) {}
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
      localStorage.removeItem('zzz_history');
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
    // ============================================================
    // 可视化编辑器
    // ============================================================
    var VE_CHARS = [];      // 角色列表 [{name, tier, price, const, hasSig, sigRefine}]
    var VE_DEBOUNCE = null;
    var VE_EVALUATING = false;

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
        grid.innerHTML = '<div style="width:100%;text-align:center;padding:20px 0;color:var(--text-dim);font-size:12px;">还没有添加角色，点击下方按钮添加</div>';
        return;
      }
      // 按价格从高到低排序
      var sorted = [...VE_CHARS].sort((a, b) => (b.price || 0) - (a.price || 0));
      grid.innerHTML = sorted.map(function(c) {
        var tier = c.tier || 'E';
        var firstChar = c.name.charAt(0);
        var constStr = c.const >= 6 ? '满命' : (c.const > 0 ? c.const + '命' : '零命');
        var sigStr = c.hasSig ? ('+专武' + (c.sigRefine > 1 ? '精' + c.sigRefine : '')) : '';
        var priceStr = '¥' + (c.price || 0);
        return (
          '<div class="ve-char-card" onclick="veOpenCharEdit(\\'' + c.name.replace(/'/g, "\\\\'") + '\\')">' +
            '<div class="ve-char-avatar ' + tier + '">' + firstChar + '</div>' +
            '<div class="ve-char-info">' +
              '<div class="ve-char-name">' + c.name + '</div>' +
              '<div class="ve-char-meta">' +
                '<span class="tag const">' + constStr + '</span>' +
                (c.hasSig ? '<span class="tag sig">' + sigStr + '</span>' : '') +
                '<span class="tag price">' + priceStr + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="ve-char-remove" onclick="event.stopPropagation();veRemoveChar(\\'' + c.name.replace(/'/g, "\\\\'") + '\\')" title="移除">×</div>' +
          '</div>'
        );
      }).join('');
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
            '<div class="ve-char-avatar ' + tier + '" style="width:44px;height:44px;font-size:18px;">' + firstChar + '</div>' +
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
              '<div class="cp-avatar ' + tier + '">' + c.name.charAt(0) + '</div>' +
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
      if (VE_DEBOUNCE) clearTimeout(VE_DEBOUNCE);
      VE_DEBOUNCE = setTimeout(function() {
        if (VE_CHARS.length > 0) {
          veEvaluate(true);
        }
      }, 500);
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
        pulls: parseInt(document.getElementById('ve-pulls').value) || 0,
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
      VE_EVALUATING = true;
      if (!silent) veShowLoading('估价中...');

      var info = veGetInfo();
      // 生成描述文本再调用估价接口（复用现有接口）
      var desc = veGenerateDescText(info);
      var price = parseFloat(document.getElementById('ve-price').value) || 0;

      try {
        const resp = await fetch('/api/x9k2-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            showTitle: desc,
            priceInCents: Math.round(price * 100),
            customWeights: (typeof getSavedWeights === 'function') ? (getSavedWeights() || window._serverDefaultConfig || null) : (window._serverDefaultConfig || null),
            game: 'zzz',
          }),
        });
        const result = await resp.json();
        if (result.success) {
          veClearStatus();
          showResult(result.data);
        } else {
          veShowError(result.error || '估价失败');
        }
      } catch (e) {
        veShowError('网络错误：' + e.message);
      } finally {
        VE_EVALUATING = false;
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
          body: JSON.stringify({ showTitle: desc, priceInCents: 0, customWeights: veGetCustomWeights(), game: 'zzz' }),
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
            // 车架模组/涂装/摩托饰品 info 里不含，暂不回填
            document.getElementById('ve-pulls').value = info.pulls || '';

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
