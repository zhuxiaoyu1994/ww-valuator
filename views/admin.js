'use strict';

function getAdminPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理后台 - 鸣潮估价助手</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f0f23; color: #e0e0e0; font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; min-height: 100vh; }
  .login-box { max-width: 400px; margin: 100px auto; background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 32px; }
  .login-box h1 { font-size: 20px; color: #4ade80; margin-bottom: 20px; text-align: center; }
  .login-box input { width: 100%; padding: 12px; border: 1px solid #2a2a4a; border-radius: 8px; background: #0f0f23; color: #e0e0e0; font-size: 14px; margin-bottom: 12px; }
  .login-box button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4ade80; color: #0f0f23; font-size: 14px; font-weight: 600; cursor: pointer; }
  .login-box button:hover { background: #22c55e; }
  .login-box .error { color: #ef4444; font-size: 13px; margin-bottom: 8px; display: none; }

  .dashboard { display: none; max-width: 1200px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #4ade80; }
  .header .logout { color: #888; cursor: pointer; font-size: 13px; }

  /* Tabs */
  .tabs { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid #1f1f3a; }
  .tab-btn { padding: 10px 24px; background: transparent; border: none; color: #888; font-size: 14px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
  .tab-btn:hover { color: #ccc; }
  .tab-btn.active { color: #4ade80; border-bottom-color: #4ade80; font-weight: 600; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Logs Tab */
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; padding: 20px; text-align: center; }
  .stat-card .num { font-size: 28px; font-weight: 700; color: #4ade80; }
  .stat-card .label { font-size: 12px; color: #888; margin-top: 4px; }
  .filters { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
  .filters select, .filters input { padding: 8px 12px; border: 1px solid #2a2a4a; border-radius: 6px; background: #1a1a3a; color: #e0e0e0; font-size: 13px; }
  .log-table-wrap { background: #1a1a3a; border-radius: 10px; overflow-x: auto; }
  .log-table-wrap table { width: 100%; border-collapse: collapse; }
  .log-table-wrap th { background: #12122a; padding: 12px; text-align: left; font-size: 12px; color: #888; font-weight: 600; border-bottom: 1px solid #2a2a4a; white-space: nowrap; }
  .log-table-wrap td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #1f1f3a; }
  .log-table-wrap tr:hover { background: #1f1f3f; }
  .tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .tag-eval { background: #1e3a1e; color: #4ade80; }
  .tag-lookup { background: #1e2a3a; color: #60a5fa; }
  .tag-fail { background: #3a1e1e; color: #ef4444; }
  .ratio-good { color: #4ade80; }
  .ratio-bad { color: #ef4444; }
  .truncate { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
  .truncate:hover { white-space: normal; word-break: break-all; }
  .pagination { display: flex; gap: 8px; margin-top: 16px; justify-content: center; align-items: center; }
  .pagination button { padding: 6px 14px; border: 1px solid #2a2a4a; border-radius: 6px; background: #1a1a3a; color: #e0e0e0; cursor: pointer; font-size: 13px; }
  .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
  .pagination span { color: #888; font-size: 13px; }

  /* Deals Tab */
  .d-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .d-stat-card { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; padding: 16px 18px; text-align: center; }
  .d-stat-card .d-label { font-size: 12px; color: #888; margin-bottom: 6px; }
  .d-stat-card .d-val { font-size: 22px; font-weight: 700; }
  .d-stat-card .d-sub { font-size: 11px; color: #666; margin-top: 4px; }
  .d-stat-card.green .d-val { color: #4ade80; }
  .d-stat-card.red .d-val { color: #f87171; }
  .d-stat-card.blue .d-val { color: #60a5fa; }
  .d-stat-card.yellow .d-val { color: #fbbf24; }

  .d-controls { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
  .d-controls select, .d-controls button { background: #1a1a3a; border: 1px solid #2a2a4a; color: #ccc; padding: 8px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; outline: none; transition: all 0.2s; }
  .d-controls select:hover, .d-controls button:hover { border-color: #3a3a5a; background: #222244; }
  .d-controls .fetch-btn { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.3); color: #4ade80; font-weight: 600; }
  .d-controls .fetch-btn:hover { background: rgba(74,222,128,0.25); }
  .d-controls .more-btn { background: rgba(96,165,250,0.15); border-color: rgba(96,165,250,0.3); color: #60a5fa; }
  .d-controls .more-btn:hover { background: rgba(96,165,250,0.25); }
  .d-controls .clear-btn { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.2); color: #f87171; }
  .d-controls .clear-btn:hover { background: rgba(248,113,113,0.2); }
  .d-controls .d-info { margin-left: auto; font-size: 12px; color: #888; }

  .d-table-wrap { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; overflow-x: auto; }
  .d-table { width: 100%; border-collapse: collapse; }
  .d-table thead { background: #12122a; }
  .d-table th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #888; border-bottom: 1px solid #2a2a4a; white-space: nowrap; }
  .d-table td { padding: 10px 12px; border-bottom: 1px solid #1a1a30; font-size: 13px; vertical-align: top; }
  .d-table tbody tr { transition: background 0.15s; }
  .d-table tbody tr:hover { background: rgba(255,255,255,0.02); }
  .d-table tbody tr.expanded { background: rgba(74,222,128,0.04); }

  .d-no a { color: #8ecdf5; text-decoration: none; font-weight: 600; }
  .d-no a:hover { text-decoration: underline; }
  .d-desc { max-width: 350px; cursor: pointer; line-height: 1.5; }
  .d-desc .short { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #ccc; }
  .d-desc .full { display: none; color: #aaa; font-size: 12px; white-space: pre-wrap; word-break: break-all; }
  .d-desc.expanded .short { display: none; }
  .d-desc.expanded .full { display: block; }
  .d-price { font-weight: 600; white-space: nowrap; }
  .d-price-actual { color: #fbbf24; }
  .d-price-est { color: #60a5fa; }
  .d-dev { font-weight: 700; white-space: nowrap; }
  .d-dev-pos { color: #4ade80; }
  .d-dev-neg { color: #f87171; }
  .d-dev-zero { color: #888; }

  .d-detail-row td { background: #0d0d22; padding: 16px 20px; border-bottom: 1px solid #1f1f3a; }
  .d-detail-content { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .d-detail-section h4 { font-size: 13px; color: #4ade80; margin-bottom: 8px; }
  .d-detail-section table.inner { width: 100%; font-size: 12px; }
  .d-detail-section table.inner td { padding: 4px 8px; border: none; background: none; }
  .d-detail-section table.inner td:first-child { color: #888; width: 100px; }
  .d-detail-section table.inner td:last-child { color: #ccc; text-align: right; }
  .d-char-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .d-char-item { font-size: 12px; padding: 3px 10px; border-radius: 6px; background: #1a1a35; border: 1px solid #2a2a4a; }
  .d-char-item.has-sig { border-color: rgba(251,191,36,0.3); color: #fbbf24; }
  .d-char-item.full-const { border-color: rgba(74,222,128,0.3); color: #4ade80; }
  .d-tag-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .d-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #1a1a35; color: #aaa; border: 1px solid #2a2a4a; }

  /* Monitor Tab */
  .mon-card { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .mon-card h2 { font-size: 18px; color: #4ade80; margin-bottom: 16px; }
  .mon-feature-list { list-style: none; }
  .mon-feature-list li { padding: 10px 0; border-bottom: 1px solid #1f1f3a; font-size: 14px; display: flex; align-items: flex-start; gap: 10px; }
  .mon-feature-list li:last-child { border-bottom: none; }
  .mon-feature-list li::before { content: '✓'; color: #4ade80; font-weight: bold; flex-shrink: 0; }
  .mon-steps { counter-reset: step; }
  .mon-steps li { list-style: none; padding: 12px 0 12px 40px; position: relative; font-size: 14px; line-height: 1.6; border-bottom: 1px solid #1f1f3a; }
  .mon-steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: 12px; width: 28px; height: 28px; border-radius: 50%; background: #4ade80; color: #0f0f23; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .mon-download-area { text-align: center; padding: 20px 0; }
  .mon-download-btn { display: inline-block; padding: 14px 32px; border: none; border-radius: 10px; background: #4ade80; color: #0f0f23; font-size: 16px; font-weight: 700; text-decoration: none; cursor: pointer; transition: all 0.2s; text-align: center; }
  .mon-download-btn:hover { background: #22c55e; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
  .mon-note { font-size: 12px; color: #666; margin-top: 10px; }
  .mon-ext-link { color: #60a5fa; text-decoration: none; }
  .mon-ext-link:hover { text-decoration: underline; }
</style>
</head>
<body>
  <div class="login-box" id="login-box">
    <h1>管理后台</h1>
    <div class="error" id="login-error">密码错误</div>
    <input type="password" id="password" placeholder="请输入管理密码" onkeydown="if(event.key==='Enter')doLogin()">
    <button onclick="doLogin()">登录</button>
  </div>

  <div class="dashboard" id="dashboard">
    <div class="header">
      <h1>管理后台</h1>
      <div style="display:flex;align-items:center;gap:16px;">
        <span class="logout" onclick="logout()">退出</span>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('logs', this)">查询日志</button>
      <button class="tab-btn" onclick="switchTab('deals', this)">成交记录</button>
      <button class="tab-btn" onclick="switchTab('monitor', this)">监控脚本</button>
      <button class="tab-btn" onclick="switchTab('config', this)">配置管理</button>
    </div>

    <!-- Tab 1: 查询日志 -->
    <div id="tab-logs" class="tab-content active">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
        <span class="refresh-btn" onclick="refreshLogs()" id="refresh-btn" style="color:#4ade80;cursor:pointer;font-size:13px;user-select:none;">↻ 刷新</span>
      </div>
      <div class="stats">
        <div class="stat-card"><div class="num" id="stat-total">0</div><div class="label">总查询数</div></div>
        <div class="stat-card"><div class="num" id="stat-success">0</div><div class="label">成功</div></div>
        <div class="stat-card"><div class="num" id="stat-lookup">0</div><div class="label">编号查询</div></div>
        <div class="stat-card"><div class="num" id="stat-eval">0</div><div class="label">粘贴估价</div></div>
      </div>
      <div class="filters">
        <select id="filter-type" onchange="renderTable()">
          <option value="">全部类型</option>
          <option value="编号查询">编号查询</option>
          <option value="粘贴估价">粘贴估价</option>
        </select>
        <input type="text" id="filter-search" placeholder="搜索编号/描述/IP..." oninput="renderTable()">
      </div>
      <div class="log-table-wrap">
        <table>
          <thead>
            <tr>
              <th>时间</th><th>类型</th><th>IP</th><th>输入</th><th>标价</th><th>估值</th><th>性价比</th><th>黄数</th><th>抽数</th><th>状态</th><th style="width:50px">详情</th>
            </tr>
          </thead>
          <tbody id="log-tbody"></tbody>
        </table>
      </div>
      <div class="pagination" id="pagination"></div>
    </div>

    <!-- Tab 2: 成交记录 -->
    <div id="tab-deals" class="tab-content">
      <div class="d-stats">
        <div class="d-stat-card blue"><div class="d-label">成交商品</div><div class="d-val" id="d-total">-</div><div class="d-sub" id="d-valued"></div></div>
        <div class="d-stat-card yellow"><div class="d-label">平均成交价</div><div class="d-val" id="d-avg-price">-</div></div>
        <div class="d-stat-card blue"><div class="d-label">平均估值</div><div class="d-val" id="d-avg-est">-</div></div>
        <div class="d-stat-card" id="d-dev-card"><div class="d-label">平均偏差</div><div class="d-val" id="d-avg-dev">-</div><div class="d-sub" id="d-avg-dev-pct"></div></div>
        <div class="d-stat-card yellow"><div class="d-label">MAE(平均绝对误差)</div><div class="d-val" id="d-mae">-</div><div class="d-sub" id="d-mae-pct"></div></div>
        <div class="d-stat-card green"><div class="d-label">准确率(±20%)</div><div class="d-val" id="d-accuracy">-</div><div class="d-sub" id="d-accuracy-detail"></div></div>
        <div class="d-stat-card green"><div class="d-label">估值偏高(买赚)</div><div class="d-val" id="d-undervalued">-</div></div>
        <div class="d-stat-card red"><div class="d-label">估值偏低(买贵)</div><div class="d-val" id="d-overvalued">-</div></div>
        <div class="d-stat-card blue"><div class="d-label">R²(决定系数)</div><div class="d-val" id="d-r2">-</div><div class="d-sub" id="d-r2-desc"></div></div>
        <div class="d-stat-card blue"><div class="d-label">相关系数(r)</div><div class="d-val" id="d-corr">-</div><div class="d-sub" id="d-corr-desc"></div></div>
        <div class="d-stat-card yellow"><div class="d-label">中位数偏差率</div><div class="d-val" id="d-med-dev">-</div><div class="d-sub" id="d-med-dev-desc"></div></div>
        <div class="d-stat-card yellow"><div class="d-label">P90偏差率</div><div class="d-val" id="d-p90-dev">-</div><div class="d-sub" id="d-p90-dev-desc"></div></div>
      </div>
      <div class="d-controls">
        <select id="d-pagesize" onchange="dealsPageSize=parseInt(this.value)">
          <option value="50">每页50条</option>
          <option value="100">每页100条</option>
          <option value="200">每页200条</option>
        </select>
        <button class="fetch-btn" onclick="fetchDealsInitial()">获取数据</button>
        <button class="more-btn" id="d-more-btn" onclick="fetchDeals(false)">加载更多</button>
        <button class="clear-btn" onclick="clearDeals()">清空</button>
        <select id="d-filter" onchange="applyDealsFilter()">
          <option value="all">全部</option>
          <option value="undervalued">估值偏高(买赚)</option>
          <option value="overvalued">估值偏低(买贵)</option>
          <option value="unvalued">未能估价</option>
        </select>
        <select id="d-sort" onchange="applyDealsSort()">
          <option value="deviation-desc">偏差率 ↓</option>
          <option value="deviation-asc">偏差率 ↑</option>
          <option value="devAmount-desc">偏差值 ↓</option>
          <option value="devAmount-asc">偏差值 ↑</option>
          <option value="yellow-desc">黄数 ↓</option>
          <option value="yellow-asc">黄数 ↑</option>
          <option value="price-desc">成交价 ↓</option>
          <option value="price-asc">成交价 ↑</option>
          <option value="est-desc">估值 ↓</option>
          <option value="est-asc">估值 ↑</option>
        </select>
        <span class="d-info" id="d-info"></span>
      </div>
      <!-- 成交记录列表（可折叠） -->
      <div id="d-deals-list-section" style="margin-top:12px;background:#1a1a3a;border:1px solid #2a2a4a;border-radius:10px;overflow:hidden;">
        <div onclick="var t=document.getElementById('d-deals-list-body');var a=this.querySelector('.d-collapse-arrow');if(t.style.display==='none'){t.style.display='block';a.textContent='▼';}else{t.style.display='none';a.textContent='▶';}" style="padding:14px 18px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a;">
          <span style="font-size:14px;font-weight:600;color:#60a5fa;">成交记录列表</span>
          <span style="font-size:12px;color:#888;" id="d-deals-list-info">（点击展开/收起）</span>
          <span class="d-collapse-arrow" style="margin-left:auto;font-size:12px;color:#888;">▼</span>
        </div>
        <div id="d-deals-list-body" style="display:block;padding:0;">
          <div class="d-table-wrap">
            <table class="d-table">
              <thead>
                <tr>
                  <th style="width:90px">编号</th><th style="width:80px">成交日</th><th>商品描述</th>
                  <th style="width:80px">成交价</th><th style="width:80px">估值</th><th style="width:80px">偏差值</th>
                  <th style="width:70px">偏差率</th><th style="width:50px">黄数</th><th style="width:50px">详情</th>
                </tr>
              </thead>
              <tbody id="d-tbody">
                <tr><td colspan="9" style="text-align:center;padding:40px;color:#666;">点击"获取数据"按钮加载成交记录</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <!-- 按角色维度偏差统计 -->
      <div id="d-char-stats-section" style="display:none;margin-top:20px;background:#1a1a3a;border:1px solid #2a2a4a;border-radius:10px;overflow:hidden;">
        <div onclick="var t=document.getElementById('d-char-stats-body');var a=this.querySelector('.d-collapse-arrow');if(t.style.display==='none'){t.style.display='block';a.textContent='▼';}else{t.style.display='none';a.textContent='▶';}" style="padding:14px 18px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a;">
          <span style="font-size:14px;font-weight:600;color:#fbbf24;">按角色偏差统计</span>
          <span style="font-size:12px;color:#888;">（点击展开/收起，按级别S→D、角色名、命座高→低排序）</span>
          <span class="d-collapse-arrow" style="margin-left:auto;font-size:12px;color:#888;">▶</span>
        </div>
        <div id="d-char-stats-body" style="display:none;overflow-x:auto;">
          <table class="d-table">
            <thead>
              <tr>
                <th style="width:120px">角色/命座</th><th style="width:60px">出现次数</th>
                <th style="width:80px">平均偏差率</th><th style="width:80px">平均偏差值</th>
                <th style="width:80px">平均角色价值</th><th style="width:60px">建议调整</th>
              </tr>
            </thead>
            <tbody id="d-char-stats-tbody"></tbody>
          </table>
        </div>
      </div>
      <!-- 按抽数分档偏差统计 -->
      <div id="d-pull-stats-section" style="display:none;margin-top:20px;background:#1a1a3a;border:1px solid #2a2a4a;border-radius:10px;overflow:hidden;">
        <div onclick="var t=document.getElementById('d-pull-stats-body');var a=this.querySelector('.d-collapse-arrow');if(t.style.display==='none'){t.style.display='block';a.textContent='▼';}else{t.style.display='none';a.textContent='▶';}" style="padding:14px 18px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a;">
          <span style="font-size:14px;font-weight:600;color:#a78bfa;">按抽数分档偏差统计</span>
          <span style="font-size:12px;color:#888;">（用于调整抽数定价公式参数）</span>
          <span class="d-collapse-arrow" style="margin-left:auto;font-size:12px;color:#888;">▶</span>
        </div>
        <div id="d-pull-stats-body" style="display:none;overflow-x:auto;">
          <table class="d-table">
            <thead>
              <tr>
                <th style="width:90px">抽数区间</th><th style="width:50px">数量</th>
                <th style="width:60px">平均抽数</th><th style="width:80px">平均抽数价值</th>
                <th style="width:70px">平均成交价</th><th style="width:70px">平均估值</th>
                <th style="width:70px">平均偏差率</th><th style="width:60px">MAE</th>
                <th style="width:60px">准确率(±20%)</th><th style="width:70px">建议调整</th>
              </tr>
            </thead>
            <tbody id="d-pull-stats-tbody"></tbody>
          </table>
        </div>
      </div>
      <!-- 角色定价建议（多元回归） -->
      <div id="d-pricing-suggest-section" style="display:none;margin-top:20px;background:#1a1a3a;border:1px solid #2a2a4a;border-radius:10px;overflow:hidden;">
        <div onclick="var t=document.getElementById('d-pricing-body');var a=this.querySelector('.d-collapse-arrow');if(t.style.display==='none'){t.style.display='block';a.textContent='▼';}else{t.style.display='none';a.textContent='▶';}" style="padding:14px 18px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a;">
          <span style="font-size:14px;font-weight:600;color:#4ade80;">角色定价建议（比例调整法）</span>
          <span id="d-pricing-r2" style="font-size:12px;color:#888;"></span>
          <span class="d-collapse-arrow" style="margin-left:auto;font-size:12px;color:#888;">▶</span>
        </div>
        <div id="d-pricing-body" style="display:none;padding:16px 18px;">
          <div style="font-size:12px;color:#888;margin-bottom:12px;line-height:1.6;">基于比例调整法，对每个账号计算角色部分缩放比率（排除抽数/黄数影响），再按角色×命座取平均。建议价=该组合在各账号中调整后的均值。绿色=需上调，红色=需下调。仅显示出现≥3次的角色命座组合。</div>
          <div style="overflow-x:auto;">
            <table class="d-table">
              <thead>
                <tr>
                  <th style="width:120px">角色</th><th style="width:50px">命座</th>
                  <th style="width:70px">当前价格</th><th style="width:70px">建议价格</th>
                  <th style="width:60px">调整额</th><th style="width:60px">调整率</th>
                  <th style="width:50px">样本数</th><th style="width:40px">可靠度</th>
                </tr>
              </thead>
              <tbody id="d-pricing-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
      <!-- 算法准确性分析 -->
      <div id="d-accuracy-analysis" style="display:none;margin-top:20px;background:#1a1a3a;border:1px solid #2a2a4a;border-radius:10px;overflow:hidden;">
        <div onclick="var t=document.getElementById('d-accuracy-body');var a=this.querySelector('.d-collapse-arrow');if(t.style.display==='none'){t.style.display='block';a.textContent='▼';}else{t.style.display='none';a.textContent='▶';}" style="padding:14px 18px;cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a4a;">
          <span style="font-size:14px;font-weight:600;color:#60a5fa;">算法准确性分析</span>
          <span style="font-size:12px;color:#888;">（价格分段 + 散点图）</span>
          <span class="d-collapse-arrow" style="margin-left:auto;font-size:12px;color:#888;">▶</span>
        </div>
        <div id="d-accuracy-body" style="display:none;padding:16px 18px;">
          <div style="font-size:13px;color:#aaa;margin-bottom:10px;">价格区间分段统计</div>
          <div style="overflow-x:auto;">
            <table class="d-table">
              <thead>
                <tr>
                  <th style="width:100px">价格区间</th><th style="width:50px">数量</th>
                  <th style="width:80px">平均成交价</th><th style="width:80px">平均估值</th>
                  <th style="width:70px">平均偏差</th><th style="width:70px">平均偏差率</th>
                  <th style="width:60px">MAE</th><th style="width:70px">准确率(±20%)</th>
                </tr>
              </thead>
              <tbody id="d-price-range-tbody"></tbody>
            </table>
          </div>
          <div style="font-size:13px;color:#aaa;margin:20px 0 10px;">估值 vs 成交价 散点图</div>
          <div id="d-scatter-plot" style="background:#0d0d22;border-radius:8px;padding:16px;"></div>
        </div>
      </div>
    </div>
    <div id="tab-monitor" class="tab-content">
      <div class="mon-card">
        <h2>功能特性</h2>
        <ul class="mon-feature-list">
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
      <div class="mon-card">
        <h2>安装步骤</h2>
        <ol class="mon-steps">
          <li>安装 <a class="mon-ext-link" href="https://www.tampermonkey.net/" target="_blank">Tampermonkey</a> 浏览器扩展（推荐 Chrome/Edge）</li>
          <li>点击下方"安装监控脚本"按钮，Tampermonkey 会自动弹出安装确认页</li>
          <li>确认安装后，打开 <a class="mon-ext-link" href="https://www.pangxie100.com/game/wuwa" target="_blank">螃蟹网鸣潮账号页面</a></li>
          <li>页面右上角会出现监控面板，点击"开始监控"即可自动运行</li>
          <li>在监控面板的"通知设置"中配置你的通知渠道（如企业微信机器人 webhook）</li>
          <li>在"估值设置"中调整估值规则，让估价更符合你的预期</li>
        </ol>
        <div class="mon-download-area">
          <a class="mon-download-btn" href="/public/crab-monitor.user.js">安装监控脚本</a>
          <div class="mon-note">点击后会自动通过 Tampermonkey 安装，如未弹出请确认已安装 Tampermonkey 扩展</div>
        </div>
      </div>
      <div class="mon-card">
        <h2>通知渠道配置</h2>
        <ul class="mon-feature-list">
          <li><strong>企业微信</strong>：创建企业微信群机器人，复制 webhook 地址填入设置</li>
          <li><strong>Server酱</strong>：注册 sct.ftqq.com，获取 SendKey 填入设置</li>
          <li><strong>Bark</strong>：iOS 下载 Bark App，复制推送地址填入设置</li>
          <li><strong>钉钉</strong>：创建钉钉自定义机器人，复制 webhook 地址填入设置</li>
          <li><strong>飞书</strong>：创建飞书自定义机器人，复制 webhook 地址填入设置</li>
        </ul>
      </div>
    </div>

    <!-- Tab 4: 配置管理 -->
    <div id="tab-config" class="tab-content">
      <div class="mon-card">
        <h2>估值配置导入</h2>
        <p style="color:#aaa;font-size:13px;line-height:1.8;margin-bottom:16px;">
          从油猴脚本「导出配置」获取 JSON 文件，上传后网站将使用该配置作为默认估值规则。<br>
          上传后<strong style="color:#4ade80;">立即生效</strong>，无需修改代码或重新部署。所有用户在未自定义配置时均使用此默认配置。
        </p>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:20px;">
          <input type="file" id="config-file-input" accept=".json" style="display:none;" onchange="handleConfigFile(event)">
          <button onclick="document.getElementById('config-file-input').click()" style="padding:10px 24px;background:#4ade80;color:#000;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">选择配置文件</button>
          <span id="config-file-name" style="color:#888;font-size:13px;">未选择文件</span>
        </div>
        <div id="config-preview" style="display:none;background:#0d0d22;border:1px solid #2a2a4a;border-radius:8px;padding:16px;margin-bottom:16px;">
          <h4 style="color:#4ade80;font-size:13px;margin-bottom:8px;">配置预览</h4>
          <div id="config-preview-content" style="font-size:12px;color:#ccc;max-height:300px;overflow-y:auto;"></div>
        </div>
        <button id="config-upload-btn" onclick="uploadConfig()" disabled style="padding:10px 24px;background:#60a5fa;color:#000;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;opacity:0.5;">上传配置</button>
        <span id="config-upload-status" style="margin-left:12px;font-size:13px;"></span>
      </div>
      <div class="mon-card">
        <h2>当前服务器配置</h2>
        <p style="color:#aaa;font-size:13px;margin-bottom:12px;">点击刷新查看当前服务器存储的默认配置状态</p>
        <button onclick="checkServerConfig()" style="padding:8px 20px;background:#1a1a3a;color:#4ade80;border:1px solid #2a2a4a;border-radius:6px;font-size:13px;cursor:pointer;">检查服务器配置</button>
        <div id="server-config-status" style="margin-top:12px;font-size:13px;"></div>
      </div>
    </div>
  </div>

<script>
  // ============================================================
  // 通用变量
  // ============================================================
  let allLogs = [];
  let filteredLogs = [];
  let logCurrentPage = 1;
  const logPageSize = 50;
  let logExpandedRow = null;

  let dealsData = [];
  let dealsFiltered = [];
  let dealsPage = 1;
  let dealsPageSize = 50;
  let dealsHasMore = true;
  let dealsLoading = false;
  let dealsExpandedRow = null;
  let dealsLoaded = false;

  // ============================================================
  // 登录
  // ============================================================
  const savedPw = sessionStorage.getItem('admin_pw');
  if (savedPw) {
    document.getElementById('password').value = savedPw;
    doLogin();
  }

  async function doLogin() {
    const pw = document.getElementById('password').value.trim();
    if (!pw) return;
    try {
      const resp = await fetch('/admin/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const result = await resp.json();
      if (result.success) {
        sessionStorage.setItem('admin_pw', pw);
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        allLogs = result.data.logs;
        document.getElementById('stat-total').textContent = result.data.stats.totalQueries;
        document.getElementById('stat-success').textContent = result.data.stats.successCount;
        document.getElementById('stat-lookup').textContent = result.data.stats.lookupCount;
        document.getElementById('stat-eval').textContent = result.data.stats.evalCount;
        renderTable();
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    } catch (e) {
      document.getElementById('login-error').textContent = '网络错误';
      document.getElementById('login-error').style.display = 'block';
    }
  }

  function logout() {
    sessionStorage.removeItem('admin_pw');
    location.reload();
  }

  // ============================================================
  // Tab切换
  // ============================================================
  function switchTab(name, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
    if (name === 'deals' && !dealsLoaded && !dealsLoading) {
      fetchDealsInitial();
    }
  }

  // ============================================================
  // 日志Tab
  // ============================================================
  async function refreshLogs() {
    const pw = sessionStorage.getItem('admin_pw');
    if (!pw) return;
    const btn = document.getElementById('refresh-btn');
    btn.textContent = '↻ 刷新中...';
    btn.style.color = '#888';
    try {
      const resp = await fetch('/admin/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const result = await resp.json();
      if (result.success) {
        allLogs = result.data.logs;
        document.getElementById('stat-total').textContent = result.data.stats.totalQueries;
        document.getElementById('stat-success').textContent = result.data.stats.successCount;
        document.getElementById('stat-lookup').textContent = result.data.stats.lookupCount;
        document.getElementById('stat-eval').textContent = result.data.stats.evalCount;
        renderTable();
      }
    } catch (e) { }
    btn.textContent = '↻ 刷新';
    btn.style.color = '#4ade80';
  }

  function renderTable() {
    const filterType = document.getElementById('filter-type').value;
    const searchTerm = document.getElementById('filter-search').value.trim().toLowerCase();
    filteredLogs = allLogs.filter(l => {
      if (filterType && l.type !== filterType) return false;
      if (searchTerm) {
        const hay = (l.input + ' ' + l.ip + ' ' + (l.error || '')).toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });
    logCurrentPage = 1;
    renderPage();
  }

  function renderPage() {
    const start = (logCurrentPage - 1) * logPageSize;
    const pageLogs = filteredLogs.slice(start, start + logPageSize);
    const tbody = document.getElementById('log-tbody');
    if (pageLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#666;padding:40px;">暂无数据</td></tr>';
    } else {
      tbody.innerHTML = pageLogs.map((l, i) => {
        const time = new Date(l.time).toLocaleString('zh-CN');
        const typeTag = l.success
          ? (l.type === '编号查询' ? '<span class="tag tag-lookup">编号</span>' : '<span class="tag tag-eval">粘贴</span>')
          : '<span class="tag tag-fail">失败</span>';
        const ratio = l.ratio != null
          ? '<span class="' + (l.ratio >= 0 ? 'ratio-good' : 'ratio-bad') + '">' + (l.ratio >= 0 ? '+' : '') + l.ratio.toFixed(1) + '%</span>'
          : '-';
        const price = l.price != null ? '¥' + l.price : '-';
        const estValue = l.estimatedValue != null ? '¥' + l.estimatedValue.toFixed(2) : '-';
        const yellow = l.yellowCount != null ? l.yellowCount : '-';
        const pulls = l.pulls != null ? l.pulls : '-';
        const hasDetails = l.success && l.details;
        const globalIdx = start + i;
        return '<tr class="d-deal-row" id="log-row-' + globalIdx + '">' +
          '<td style="white-space:nowrap;">' + time + '</td>' +
          '<td>' + typeTag + '</td>' +
          '<td>' + (l.ip || '-') + '</td>' +
          '<td class="truncate" title="' + escapeHtml(l.input) + '">' + escapeHtml(l.input) + '</td>' +
          '<td>' + price + '</td>' +
          '<td>' + estValue + '</td>' +
          '<td>' + ratio + '</td>' +
          '<td>' + yellow + '</td>' +
          '<td>' + pulls + '</td>' +
          '<td>' + (l.success ? '成功' : '<span style="color:#ef4444;">' + escapeHtml(l.error || '失败') + '</span>') + '</td>' +
          '<td style="text-align:center;">' + (hasDetails ? '<span style="cursor:pointer;color:#8ecdf5;font-size:16px;" onclick="toggleLogDetail(' + globalIdx + ')">▶</span>' : '') + '</td>' +
          '</tr>' +
          (hasDetails ? '<tr class="d-detail-row" id="log-detail-' + globalIdx + '" style="display:none;"><td colspan="11">' + renderLogDetail(l) + '</td></tr>' : '');
      }).join('');
    }
    const totalPages = Math.ceil(filteredLogs.length / logPageSize);
    document.getElementById('pagination').innerHTML =
      '<button onclick="goPage(' + (logCurrentPage - 1) + ')" ' + (logCurrentPage <= 1 ? 'disabled' : '') + '>上一页</button>' +
      '<span>第 ' + logCurrentPage + ' / ' + totalPages + ' 页 (共 ' + filteredLogs.length + ' 条)</span>' +
      '<button onclick="goPage(' + (logCurrentPage + 1) + ')" ' + (logCurrentPage >= totalPages ? 'disabled' : '') + '>下一页</button>';
  }

  function goPage(p) {
    const totalPages = Math.ceil(filteredLogs.length / logPageSize);
    if (p < 1 || p > totalPages) return;
    logCurrentPage = p;
    renderPage();
  }

  // ============================================================
  // 成交记录Tab
  // ============================================================

  // 初始加载：自动获取前4页数据
  async function fetchDealsInitial() {
    var targetPages = 4;
    await fetchDeals(true);
    for (var p = 1; p < targetPages; p++) {
      if (!dealsHasMore || dealsLoading) break;
      await fetchDeals(false);
    }
  }

  async function fetchDeals(reset) {
    const pw = sessionStorage.getItem('admin_pw');
    if (!pw) { alert('请先登录'); return; }
    if (dealsLoading) return;
    dealsLoading = true;

    if (reset) {
      dealsPage = 1;
      dealsData = [];
      dealsHasMore = true;
    } else {
      dealsPage++;
    }

    const tbody = document.getElementById('d-tbody');
    const moreBtn = document.getElementById('d-more-btn');
    if (reset) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#666;">正在获取成交数据并计算估值...</td></tr>';
    } else {
      moreBtn.textContent = '加载中...';
      moreBtn.disabled = true;
    }

    try {
      // 读取 localStorage 中的自定义估值权重（与 /wuwa 页面共享）
      let customWeights = null;
      try {
        const saved = localStorage.getItem('mw_eval_weights');
        if (saved) customWeights = JSON.parse(saved);
      } catch (e) { /* 忽略 */ }

      const resp = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, page: dealsPage, pageSize: dealsPageSize, customWeights }),
      });
      const json = await resp.json();
      if (!json.success) {
        if (reset) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#f87171;">' + escapeHtml(json.error || '获取失败') + '</td></tr>';
        else moreBtn.textContent = '加载更多';
        dealsLoading = false;
        return;
      }

      const newItems = json.data.list || [];
      if (newItems.length < dealsPageSize) {
        dealsHasMore = false;
      }

      if (reset) {
        dealsData = newItems;
      } else {
        dealsData = dealsData.concat(newItems);
      }

      renderDealsSummary();
      applyDealsFilter();
      dealsLoaded = true;
    } catch (err) {
      if (reset) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#f87171;">网络错误: ' + escapeHtml(err.message) + '</td></tr>';
    }

    dealsLoading = false;
    moreBtn.textContent = '加载更多';
    moreBtn.disabled = !dealsHasMore;
  }

  function clearDeals() {
    dealsData = [];
    dealsFiltered = [];
    dealsPage = 1;
    dealsHasMore = true;
    dealsLoaded = false;
    dealsExpandedRow = null;
    document.getElementById('d-tbody').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#666;">点击"获取数据"按钮加载成交记录</td></tr>';
    document.getElementById('d-total').textContent = '-';
    document.getElementById('d-valued').textContent = '';
    document.getElementById('d-avg-price').textContent = '-';
    document.getElementById('d-avg-est').textContent = '-';
    document.getElementById('d-avg-dev').textContent = '-';
    document.getElementById('d-avg-dev-pct').textContent = '';
    document.getElementById('d-mae').textContent = '-';
    document.getElementById('d-mae-pct').textContent = '';
    document.getElementById('d-accuracy').textContent = '-';
    document.getElementById('d-accuracy-detail').textContent = '';
    document.getElementById('d-undervalued').textContent = '-';
    document.getElementById('d-overvalued').textContent = '-';
    document.getElementById('d-r2').textContent = '-';
    document.getElementById('d-r2-desc').textContent = '';
    document.getElementById('d-corr').textContent = '-';
    document.getElementById('d-corr-desc').textContent = '';
    document.getElementById('d-med-dev').textContent = '-';
    document.getElementById('d-med-dev-desc').textContent = '';
    document.getElementById('d-p90-dev').textContent = '-';
    document.getElementById('d-p90-dev-desc').textContent = '';
    document.getElementById('d-info').textContent = '';
    document.getElementById('d-more-btn').disabled = false;
    document.getElementById('d-char-stats-section').style.display = 'none';
    document.getElementById('d-pull-stats-section').style.display = 'none';
    document.getElementById('d-accuracy-analysis').style.display = 'none';
    document.getElementById('d-pricing-suggest-section').style.display = 'none';
  }

  function renderDealsSummary() {
    const valid = dealsData.filter(d => d.estimatedValue > 0);
    const total = dealsData.length;
    const valued = valid.length;
    const avgPrice = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.price, 0) / valued * 100) / 100 : 0;
    const avgEst = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.estimatedValue, 0) / valued * 100) / 100 : 0;
    const avgDev = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.deviation, 0) / valued * 100) / 100 : 0;
    const avgDevPct = valued > 0 ? Math.round(valid.reduce((s, e) => s + e.deviationPercent, 0) / valued * 100) / 100 : 0;
    const overvalued = valid.filter(e => e.deviation < 0).length;
    const undervalued = valid.filter(e => e.deviation > 0).length;

    // MAE（平均绝对误差）
    const mae = valued > 0 ? Math.round(valid.reduce((s, e) => s + Math.abs(e.deviation), 0) / valued * 100) / 100 : 0;
    const maePct = valued > 0 ? Math.round(valid.reduce((s, e) => s + Math.abs(e.deviationPercent), 0) / valued * 100) / 100 : 0;

    // 准确率（±20% 命中率）
    const hit10 = valid.filter(e => Math.abs(e.deviationPercent) <= 10).length;
    const hit20 = valid.filter(e => Math.abs(e.deviationPercent) <= 20).length;
    const hit30 = valid.filter(e => Math.abs(e.deviationPercent) <= 30).length;
    const accPct = valued > 0 ? Math.round(hit20 / valued * 1000) / 10 : 0;

    document.getElementById('d-total').textContent = total;
    document.getElementById('d-valued').textContent = valued + ' 条成功估值';
    document.getElementById('d-avg-price').textContent = '¥' + avgPrice;
    document.getElementById('d-avg-est').textContent = '¥' + avgEst;
    document.getElementById('d-avg-dev').textContent = (avgDev >= 0 ? '+' : '') + '¥' + avgDev;
    document.getElementById('d-avg-dev-pct').textContent = (avgDevPct >= 0 ? '+' : '') + avgDevPct + '%';
    document.getElementById('d-mae').textContent = '¥' + mae;
    document.getElementById('d-mae-pct').textContent = '平均' + maePct + '%';
    document.getElementById('d-accuracy').textContent = accPct + '%';
    document.getElementById('d-accuracy-detail').textContent = '±10%: ' + hit10 + '条 / ±20%: ' + hit20 + '条 / ±30%: ' + hit30 + '条';
    document.getElementById('d-undervalued').textContent = undervalued;
    document.getElementById('d-overvalued').textContent = overvalued;

    const devCard = document.getElementById('d-dev-card');
    devCard.className = 'd-stat-card ' + (avgDev >= 0 ? 'green' : 'red');

    // 按角色维度偏差统计
    renderCharStats(valid);
    // 按抽数分档偏差统计
    renderPullStats(valid);
    // 算法准确性分析（R² + 价格分段）
    renderAccuracyAnalysis(valid);
    // 角色定价建议（多元岭回归）
    renderPricingSuggestions(valid);
  }

  function renderCharStats(valid) {
    const charMap = {};
    for (const d of valid) {
      const chars = d.characters || [];
      for (const c of chars) {
        if (!c.name) continue;
        // 跳过E级角色（无价值，不参与统计）
        if (c.tier === 'E') continue;
        // 按角色名+命座分组
        const key = c.name + '_C' + (c.const || 0);
        if (!charMap[key]) {
          charMap[key] = { name: c.name, tier: c.tier, const: c.const || 0, count: 0, devSum: 0, devPctSum: 0, valueSum: 0 };
        }
        charMap[key].count++;
        charMap[key].devSum += (d.deviation || 0);
        charMap[key].devPctSum += (d.deviationPercent || 0);
        charMap[key].valueSum += (c.value || 0);
      }
    }

    const charList = Object.values(charMap).filter(e => e.count >= 2);
    if (charList.length === 0) {
      document.getElementById('d-char-stats-section').style.display = 'none';
      return;
    }

    // 按级别(S>A>B>C>D)再按角色名、最后按命座(高>低)排序，同一角色的不同命座排在一起
    var tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
    charList.sort((a, b) => {
      var ta = tierOrder[a.tier] != null ? tierOrder[a.tier] : 99;
      var tb = tierOrder[b.tier] != null ? tierOrder[b.tier] : 99;
      if (ta !== tb) return ta - tb;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return b.const - a.const;
    });

    const tbody = document.getElementById('d-char-stats-tbody');
    tbody.innerHTML = charList.map(e => {
      const avgDevPct = Math.round(e.devPctSum / e.count * 100) / 100;
      const avgDev = Math.round(e.devSum / e.count * 100) / 100;
      const avgVal = Math.round(e.valueSum / e.count);
      const devClass = avgDevPct > 5 ? 'd-dev-neg' : (avgDevPct < -5 ? 'd-dev-pos' : 'd-dev-zero');
      const suggestion = avgDevPct > 10 ? '<span style="color:#f87171;">↓ 下调</span>'
        : avgDevPct < -10 ? '<span style="color:#4ade80;">↑ 上调</span>'
        : avgDevPct > 5 ? '<span style="color:#fbbf24;">↓ 微调</span>'
        : avgDevPct < -5 ? '<span style="color:#fbbf24;">↑ 微调</span>'
        : '<span style="color:#888;">- 合理</span>';
      var constLabel = e.const >= 6 ? '满命' : 'C' + e.const;
      var tierColors = { S: '#f87171', A: '#fbbf24', B: '#60a5fa', C: '#a78bfa', D: '#888' };
      var tierColor = tierColors[e.tier] || '#888';
      return '<tr>' +
        '<td style="font-weight:600;"><span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:4px;background:' + tierColor + '20;color:' + tierColor + ';font-size:11px;font-weight:700;margin-right:6px;">' + (e.tier || '?') + '</span>' + escapeHtml(e.name) + ' <span style="color:#888;font-size:12px;">' + constLabel + '</span></td>' +
        '<td>' + e.count + '</td>' +
        '<td class="' + devClass + '">' + (avgDevPct >= 0 ? '+' : '') + avgDevPct + '%</td>' +
        '<td class="' + devClass + '">' + (avgDev >= 0 ? '+' : '') + '¥' + avgDev + '</td>' +
        '<td>¥' + avgVal + '</td>' +
        '<td>' + suggestion + '</td>' +
        '</tr>';
    }).join('');

    document.getElementById('d-char-stats-section').style.display = 'block';
  }

  function renderPullStats(valid) {
    var pullRanges = [
      { label: '0-100', min: 0, max: 100 },
      { label: '100-200', min: 100, max: 200 },
      { label: '200-400', min: 200, max: 400 },
      { label: '400-600', min: 400, max: 600 },
      { label: '600-800', min: 600, max: 800 },
      { label: '800-1000', min: 800, max: 1000 },
      { label: '1000+', min: 1000, max: Infinity },
    ];

    var hasData = false;
    var rows = pullRanges.map(function(r) {
      var items = valid.filter(function(d) {
        var p = d.pulls || 0;
        return p >= r.min && p < r.max;
      });
      if (items.length === 0) return null;
      hasData = true;

      var cnt = items.length;
      var avgPulls = Math.round(items.reduce(function(s, d) { return s + (d.pulls || 0); }, 0) / cnt);
      var avgPullVal = Math.round(items.reduce(function(s, d) {
        return s + ((d.details && d.details.pullValue) || 0);
      }, 0) / cnt);
      var avgP = Math.round(items.reduce(function(s, d) { return s + d.price; }, 0) / cnt * 100) / 100;
      var avgE = Math.round(items.reduce(function(s, d) { return s + d.estimatedValue; }, 0) / cnt * 100) / 100;
      var avgDPct = Math.round(items.reduce(function(s, d) { return s + d.deviationPercent; }, 0) / cnt * 100) / 100;
      var mae = Math.round(items.reduce(function(s, d) { return s + Math.abs(d.deviation); }, 0) / cnt * 100) / 100;
      var hit20 = items.filter(function(d) { return Math.abs(d.deviationPercent) <= 20; }).length;
      var acc = Math.round(hit20 / cnt * 1000) / 10;

      var devCls = avgDPct > 5 ? 'd-dev-neg' : (avgDPct < -5 ? 'd-dev-pos' : 'd-dev-zero');
      var accColor = acc >= 70 ? '#4ade80' : acc >= 50 ? '#fbbf24' : '#f87171';

      var suggestion = avgDPct > 10 ? '<span style="color:#f87171;">↓ 下调每抽价</span>'
        : avgDPct < -10 ? '<span style="color:#4ade80;">↑ 上调每抽价</span>'
        : avgDPct > 5 ? '<span style="color:#fbbf24;">↓ 微调</span>'
        : avgDPct < -5 ? '<span style="color:#fbbf24;">↑ 微调</span>'
        : '<span style="color:#888;">- 合理</span>';

      return '<tr>' +
        '<td style="font-weight:600;color:#a78bfa;">' + r.label + '抽</td>' +
        '<td>' + cnt + '</td>' +
        '<td>' + avgPulls + '</td>' +
        '<td style="color:#60a5fa;">¥' + avgPullVal + '</td>' +
        '<td class="d-price d-price-actual">¥' + avgP + '</td>' +
        '<td class="d-price d-price-est">¥' + avgE + '</td>' +
        '<td class="' + devCls + '">' + (avgDPct >= 0 ? '+' : '') + avgDPct + '%</td>' +
        '<td>¥' + mae + '</td>' +
        '<td style="color:' + accColor + ';font-weight:600;">' + acc + '%</td>' +
        '<td>' + suggestion + '</td>' +
        '</tr>';
    }).filter(function(r) { return r !== null; }).join('');

    if (!hasData) {
      document.getElementById('d-pull-stats-section').style.display = 'none';
      return;
    }

    document.getElementById('d-pull-stats-tbody').innerHTML = rows;
    document.getElementById('d-pull-stats-section').style.display = 'block';
  }

  // ============================================================
  // 矩阵运算工具（用于多元岭回归）
  // ============================================================
  function _matT(A) {
    var m = A.length, n = A[0].length;
    var T = [];
    for (var j = 0; j < n; j++) {
      var row = [];
      for (var i = 0; i < m; i++) row.push(A[i][j]);
      T.push(row);
    }
    return T;
  }
  function _matMul(A, B) {
    var m = A.length, n = B[0].length, k = B.length;
    var C = [];
    for (var i = 0; i < m; i++) {
      var row = [];
      for (var j = 0; j < n; j++) {
        var sum = 0;
        for (var l = 0; l < k; l++) sum += A[i][l] * B[l][j];
        row.push(sum);
      }
      C.push(row);
    }
    return C;
  }
  function _matVec(A, v) {
    var m = A.length, n = v.length;
    var r = [];
    for (var i = 0; i < m; i++) {
      var sum = 0;
      for (var j = 0; j < n; j++) sum += A[i][j] * v[j];
      r.push(sum);
    }
    return r;
  }
  function _gaussSolve(A, b) {
    var n = A.length;
    var aug = [];
    for (var i = 0; i < n; i++) {
      var row = A[i].slice();
      row.push(b[i]);
      aug.push(row);
    }
    for (var i = 0; i < n; i++) {
      var maxRow = i;
      for (var k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      var tmp = aug[i]; aug[i] = aug[maxRow]; aug[maxRow] = tmp;
      if (Math.abs(aug[i][i]) < 1e-12) return null;
      for (var k2 = i + 1; k2 < n; k2++) {
        var factor = aug[k2][i] / aug[i][i];
        for (var j = i; j <= n; j++) aug[k2][j] -= factor * aug[i][j];
      }
    }
    var x = [];
    for (var i2 = 0; i2 < n; i2++) x.push(0);
    for (var i3 = n - 1; i3 >= 0; i3--) {
      var s = aug[i3][n];
      for (var j2 = i3 + 1; j2 < n; j2++) s -= aug[i3][j2] * x[j2];
      x[i3] = s / aug[i3][i3];
    }
    return x;
  }

  // ============================================================
  // 角色定价建议（比例调整法 - 按命座区分）
  // 对每个账号计算角色部分缩放比率，避免回归共线性问题
  // ============================================================
  function renderPricingSuggestions(valid) {
    if (valid.length < 10) {
      document.getElementById('d-pricing-suggest-section').style.display = 'none';
      return;
    }

    // 1. 收集角色×命座组合信息 + 计算每个账号的角色缩放比率
    var pairSet = {}, pairTier = {}, pairCount = {}, pairVals = {}, pairAdjustedVals = {};
    var allRatios = []; // 用于计算全局平均比率
    var accountPredictions = []; // 用于计算R²

    for (var di = 0; di < valid.length; di++) {
      var d = valid[di];
      var chars = d.characters || [];

      // 计算该账号的角色总价值和非角色总价值
      var engineCharTotal = 0;
      for (var ci0 = 0; ci0 < chars.length; ci0++) {
        if (chars[ci0].tier !== 'E' && chars[ci0].value != null) {
          engineCharTotal += chars[ci0].value;
        }
      }
      var engineOtherTotal = d.estimatedValue - engineCharTotal; // 抽数/黄数/资源等
      // 假设非角色部分定价正确，市场角色总价 = 成交价 - 非角色部分
      var marketCharTotal = d.price - engineOtherTotal;
      var charRatio = engineCharTotal > 0 ? marketCharTotal / engineCharTotal : 1.0;
      // 限制在合理范围，避免极端值干扰
      if (charRatio < 0.1) charRatio = 0.1;
      if (charRatio > 3.0) charRatio = 3.0;
      allRatios.push(charRatio);

      for (var ci = 0; ci < chars.length; ci++) {
        var c = chars[ci];
        if (!c.name || c.tier === 'E') continue;
        var key = c.name + '_C' + (c.const || 0);
        pairSet[key] = true;
        pairTier[key] = c.tier;
        pairCount[key] = (pairCount[key] || 0) + 1;
        if (c.value != null && !isNaN(c.value)) {
          if (!pairVals[key]) pairVals[key] = [];
          pairVals[key].push(c.value);
          if (!pairAdjustedVals[key]) pairAdjustedVals[key] = [];
          pairAdjustedVals[key].push(c.value * charRatio);
        }
      }
    }

    var tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
    // 只保留出现≥3次的组合，按级别和命座排序
    var pairKeys = Object.keys(pairSet).filter(function(k) { return pairCount[k] >= 3; }).sort(function(a, b) {
      var ta = tierOrder[pairTier[a]] != null ? tierOrder[pairTier[a]] : 9;
      var tb = tierOrder[pairTier[b]] != null ? tierOrder[pairTier[b]] : 9;
      if (ta !== tb) return ta - tb;
      var na = a.replace(/_C\d+$/, ''), nb = b.replace(/_C\d+$/, '');
      if (na !== nb) return na < nb ? -1 : 1;
      var ca = parseInt(a.replace(/.*_C/, '')), cb = parseInt(b.replace(/.*_C/, ''));
      return ca - cb;
    });

    if (pairKeys.length === 0) {
      document.getElementById('d-pricing-suggest-section').style.display = 'none';
      return;
    }

    // 2. 计算全局平均比率用于R²
    var overallRatio = 0;
    for (var ri = 0; ri < allRatios.length; ri++) overallRatio += allRatios[ri];
    overallRatio /= allRatios.length;

    // 计算R²: predicted = engineOther + engineChar × overallRatio
    var yMean = 0;
    for (var di3 = 0; di3 < valid.length; di3++) yMean += valid[di3].price;
    yMean /= valid.length;
    var ssRes = 0, ssTot = 0;
    for (var di4 = 0; di4 < valid.length; di4++) {
      var d4 = valid[di4];
      var charT = 0;
      var chars4 = d4.characters || [];
      for (var ci4 = 0; ci4 < chars4.length; ci4++) {
        if (chars4[ci4].tier !== 'E' && chars4[ci4].value != null) charT += chars4[ci4].value;
      }
      var otherT = d4.estimatedValue - charT;
      var pred = otherT + charT * overallRatio;
      ssRes += Math.pow(d4.price - pred, 2);
      ssTot += Math.pow(d4.price - yMean, 2);
    }
    var modelR2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    modelR2 = Math.round(modelR2 * 1000) / 1000;

    // 3. 从 localStorage 加载当前估值权重，用于读取角色当前配置价格
    var savedWeights = null;
    try {
      var _saved = localStorage.getItem('mw_eval_weights');
      if (_saved) savedWeights = JSON.parse(_saved);
    } catch (e) { /* ignore */ }

    // 根据角色名和命座查找当前配置价格（与估值引擎 calcConstPremium 逻辑一致）
    function getCurrentCharPrice(charName, constLevel) {
      if (!savedWeights) return null;
      var charPrices = savedWeights.charPrices || {};
      var base = charPrices[charName] != null ? charPrices[charName] : null;
      if (base === null) return null;
      if (constLevel <= 0) return base;
      var constPrices = savedWeights.constPrices || {};
      var charCP = constPrices[charName];
      if (charCP) {
        var maxLevel = 0;
        for (var bp in charCP) {
          if (!charCP.hasOwnProperty(bp)) continue;
          var level = parseInt(bp);
          if (!isNaN(level) && level <= constLevel && level > maxLevel) {
            maxLevel = level;
          }
        }
        if (maxLevel > 0 && charCP[maxLevel] != null) {
          return charCP[maxLevel];
        }
      }
      return base;
    }

    // 4. 生成建议（建议价=该组合在各账号中的调整后均值）
    var suggestions = [];
    for (var si = 0; si < pairKeys.length; si++) {
      var key = pairKeys[si];
      var vals = pairVals[key] || [];
      var adjVals = pairAdjustedVals[key] || [];
      var count = pairCount[key];
      var name = key.replace(/_C\d+$/, '');
      var constLevel = parseInt(key.replace(/.*_C/, ''));

      // 当前价格：优先从 localStorage 保存的估值规则中读取，无则回退到历史均值
      var currentPrice = getCurrentCharPrice(name, constLevel);
      if (currentPrice == null) {
        currentPrice = vals.length > 0
          ? Math.round(vals.reduce(function(s, v) { return s + v; }, 0) / vals.length)
          : null;
      }
      var suggestedPrice = adjVals.length > 0
        ? Math.round(adjVals.reduce(function(s, v) { return s + v; }, 0) / adjVals.length)
        : null;

      if (currentPrice != null && currentPrice > 0 && suggestedPrice != null) {
        var adjust = suggestedPrice - currentPrice;
        var adjustPct = Math.round(adjust / currentPrice * 1000) / 10;
        suggestions.push({
          name: name, tier: pairTier[key], constLevel: constLevel,
          current: currentPrice, suggested: suggestedPrice,
          adjust: adjust, adjustPct: adjustPct,
          count: count, valSamples: vals.length,
          reliability: count >= 10 ? 'high' : count >= 5 ? 'medium' : 'low'
        });
      }
    }

    suggestions.sort(function(a, b) {
      var ta = tierOrder[a.tier] != null ? tierOrder[a.tier] : 9;
      var tb = tierOrder[b.tier] != null ? tierOrder[b.tier] : 9;
      if (ta !== tb) return ta - tb;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return a.constLevel - b.constLevel;
    });

    if (suggestions.length === 0) {
      document.getElementById('d-pricing-suggest-section').style.display = 'none';
      return;
    }

    // 6. 渲染
    var tierColors = { S: '#f87171', A: '#fbbf24', B: '#60a5fa', C: '#a78bfa', D: '#888' };
    var constLabels = ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', '满命'];
    var rows = suggestions.map(function(s) {
      var tc = tierColors[s.tier] || '#888';
      var ac = s.adjustPct > 10 ? '#f87171' : s.adjustPct < -10 ? '#4ade80' : '#fbbf24';
      var rc = s.reliability === 'high' ? '#4ade80' : s.reliability === 'medium' ? '#fbbf24' : '#666';
      var rt = s.reliability === 'high' ? '高' : s.reliability === 'medium' ? '中' : '低';
      var cl = s.constLevel >= 6 ? '满命' : 'C' + s.constLevel;
      var constColor = s.constLevel >= 6 ? '#f87171' : s.constLevel >= 3 ? '#fbbf24' : '#888';
      return '<tr>' +
        '<td style="font-weight:600;"><span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:4px;background:' + tc + '20;color:' + tc + ';font-size:11px;font-weight:700;margin-right:6px;">' + s.tier + '</span>' + escapeHtml(s.name) + '</td>' +
        '<td style="color:' + constColor + ';font-weight:600;">' + cl + '</td>' +
        '<td class="d-price d-price-actual">¥' + s.current + '</td>' +
        '<td class="d-price d-price-est">¥' + s.suggested + '</td>' +
        '<td style="color:' + ac + ';font-weight:600;">' + (s.adjust >= 0 ? '+' : '') + '¥' + s.adjust + '</td>' +
        '<td style="color:' + ac + ';">' + (s.adjustPct >= 0 ? '+' : '') + s.adjustPct + '%</td>' +
        '<td>' + s.count + '次</td>' +
        '<td style="color:' + rc + ';">' + rt + '</td>' +
        '</tr>';
    }).join('');

    document.getElementById('d-pricing-tbody').innerHTML = rows;
    document.getElementById('d-pricing-r2').textContent = '模型R²=' + modelR2.toFixed(3) + ' | 样本=' + valid.length + ' | 全局比率=' + overallRatio.toFixed(2);
    document.getElementById('d-pricing-suggest-section').style.display = 'block';
  }

  function renderAccuracyAnalysis(valid) {
    if (valid.length < 2) {
      document.getElementById('d-accuracy-analysis').style.display = 'none';
      document.getElementById('d-r2').textContent = '-';
      document.getElementById('d-r2-desc').textContent = '';
      document.getElementById('d-corr').textContent = '-';
      document.getElementById('d-corr-desc').textContent = '';
      document.getElementById('d-med-dev').textContent = '-';
      document.getElementById('d-med-dev-desc').textContent = '';
      document.getElementById('d-p90-dev').textContent = '-';
      document.getElementById('d-p90-dev-desc').textContent = '';
      return;
    }

    // ===== R²(决定系数) =====
    // R² = 1 - SS_res / SS_tot
    // SS_res = Σ(实际价 - 估值)²   SS_tot = Σ(实际价 - 均价)²
    var n = valid.length;
    var meanPrice = valid.reduce(function(s, d) { return s + d.price; }, 0) / n;
    var ssRes = 0, ssTot = 0;
    for (var i = 0; i < valid.length; i++) {
      ssRes += Math.pow(valid[i].price - valid[i].estimatedValue, 2);
      ssTot += Math.pow(valid[i].price - meanPrice, 2);
    }
    var r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    r2 = Math.round(r2 * 1000) / 1000;

    // ===== Pearson 相关系数 =====
    var meanEst = valid.reduce(function(s, d) { return s + d.estimatedValue; }, 0) / n;
    var num = 0, denEst = 0, denPrice = 0;
    for (var j = 0; j < valid.length; j++) {
      var dEst = valid[j].estimatedValue - meanEst;
      var dPrice = valid[j].price - meanPrice;
      num += dEst * dPrice;
      denEst += dEst * dEst;
      denPrice += dPrice * dPrice;
    }
    var corr = (denEst > 0 && denPrice > 0) ? num / Math.sqrt(denEst * denPrice) : 0;
    corr = Math.round(corr * 1000) / 1000;

    // ===== 中位数偏差率 =====
    var sortedDevPct = valid.map(function(d) { return d.deviationPercent; }).sort(function(a, b) { return a - b; });
    var medIdx = Math.floor(sortedDevPct.length / 2);
    var medDevPct = sortedDevPct.length % 2 === 0
      ? Math.round((sortedDevPct[medIdx - 1] + sortedDevPct[medIdx]) / 2 * 100) / 100
      : Math.round(sortedDevPct[medIdx] * 100) / 100;

    // 渲染 R²
    document.getElementById('d-r2').textContent = r2.toFixed(3);
    var r2Desc = r2 >= 0.8 ? '优秀，模型解释力强' : r2 >= 0.6 ? '良好，有一定解释力' : r2 >= 0.4 ? '一般，存在较大偏差' : '较差，模型需调整';
    document.getElementById('d-r2-desc').textContent = r2Desc;

    // 渲染相关系数
    document.getElementById('d-corr').textContent = corr.toFixed(3);
    var corrDesc = corr >= 0.9 ? '高度正相关' : corr >= 0.7 ? '强相关' : corr >= 0.5 ? '中等相关' : corr >= 0.3 ? '弱相关' : '几乎无相关';
    document.getElementById('d-corr-desc').textContent = corrDesc;

    // 渲染中位数偏差率
    var medEl = document.getElementById('d-med-dev');
    medEl.textContent = (medDevPct >= 0 ? '+' : '') + medDevPct + '%';
    medEl.style.color = medDevPct > 5 ? '#f87171' : medDevPct < -5 ? '#4ade80' : '#fbbf24';
    document.getElementById('d-med-dev-desc').textContent = '抗极端值，反映系统偏置';

    // ===== P90 偏差率（90%的账号偏差不超过此值）=====
    var sortedAbsDevPct = valid.map(function(d) { return Math.abs(d.deviationPercent); }).sort(function(a, b) { return a - b; });
    var p90Idx = Math.min(Math.floor(sortedAbsDevPct.length * 0.9), sortedAbsDevPct.length - 1);
    var p90DevPct = Math.round(sortedAbsDevPct[p90Idx] * 100) / 100;

    // 渲染 P90 偏差率
    var p90El = document.getElementById('d-p90-dev');
    p90El.textContent = '±' + p90DevPct + '%';
    p90El.style.color = p90DevPct <= 10 ? '#4ade80' : p90DevPct <= 20 ? '#fbbf24' : '#f87171';
    document.getElementById('d-p90-dev-desc').textContent = '90%账号偏差不超过此值';

    // ===== 价格区间分段统计 =====
    var priceRanges = [
      { label: '<300', min: 0, max: 300 },
      { label: '300-500', min: 300, max: 500 },
      { label: '500-1000', min: 500, max: 1000 },
      { label: '1000-2000', min: 1000, max: 2000 },
      { label: '2000-3000', min: 2000, max: 3000 },
      { label: '3000-5000', min: 3000, max: 5000 },
      { label: '>5000', min: 5000, max: Infinity },
    ];

    var rangeRows = priceRanges.map(function(r) {
      var items = valid.filter(function(d) { return d.price >= r.min && d.price < r.max; });
      if (items.length === 0) return null;

      var cnt = items.length;
      var avgP = Math.round(items.reduce(function(s, d) { return s + d.price; }, 0) / cnt * 100) / 100;
      var avgE = Math.round(items.reduce(function(s, d) { return s + d.estimatedValue; }, 0) / cnt * 100) / 100;
      var avgD = Math.round(items.reduce(function(s, d) { return s + d.deviation; }, 0) / cnt * 100) / 100;
      var avgDPct = Math.round(items.reduce(function(s, d) { return s + d.deviationPercent; }, 0) / cnt * 100) / 100;
      var mae = Math.round(items.reduce(function(s, d) { return s + Math.abs(d.deviation); }, 0) / cnt * 100) / 100;
      var hit20 = items.filter(function(d) { return Math.abs(d.deviationPercent) <= 20; }).length;
      var acc = Math.round(hit20 / cnt * 1000) / 10;

      var devCls = avgDPct > 5 ? 'd-dev-neg' : (avgDPct < -5 ? 'd-dev-pos' : 'd-dev-zero');
      var accColor = acc >= 70 ? '#4ade80' : acc >= 50 ? '#fbbf24' : '#f87171';

      return '<tr>' +
        '<td style="font-weight:600;">¥' + r.label + '</td>' +
        '<td>' + cnt + '</td>' +
        '<td class="d-price d-price-actual">¥' + avgP + '</td>' +
        '<td class="d-price d-price-est">¥' + avgE + '</td>' +
        '<td class="' + devCls + '">' + (avgD >= 0 ? '+' : '') + '¥' + avgD + '</td>' +
        '<td class="' + devCls + '">' + (avgDPct >= 0 ? '+' : '') + avgDPct + '%</td>' +
        '<td>¥' + mae + '</td>' +
        '<td style="color:' + accColor + ';font-weight:600;">' + acc + '%</td>' +
        '</tr>';
    }).filter(function(r) { return r !== null; }).join('');

    document.getElementById('d-price-range-tbody').innerHTML = rangeRows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#666;">暂无数据</td></tr>';

    // ===== 散点图(估值 vs 成交价) =====
    var maxVal = Math.max(
      Math.max.apply(null, valid.map(function(d) { return d.estimatedValue; })),
      Math.max.apply(null, valid.map(function(d) { return d.price; }))
    );
    maxVal = Math.ceil(maxVal / 100) * 100;
    if (maxVal < 100) maxVal = 100;

    var svgW = 500, svgH = 480;
    var padL = 55, padR = 15, padT = 20, padB = 45;
    var plotW = svgW - padL - padR;
    var plotH = svgH - padT - padB;

    function sX(v) { return padL + (v / maxVal) * plotW; }
    function sY(v) { return padT + plotH - (v / maxVal) * plotH; }

    var sp = [];
    sp.push('<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" style="width:100%;max-width:500px;height:auto;display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg">');

    // 网格线 + 刻度
    for (var g = 0; g <= 4; g++) {
      var gv = (maxVal / 4) * g;
      var gx = sX(gv), gy = sY(gv);
      sp.push('<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (svgW - padR) + '" y2="' + gy.toFixed(1) + '" stroke="#1f1f3a" stroke-width="1"/>');
      sp.push('<line x1="' + gx.toFixed(1) + '" y1="' + padT + '" x2="' + gx.toFixed(1) + '" y2="' + (svgH - padB) + '" stroke="#1f1f3a" stroke-width="1"/>');
      sp.push('<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" fill="#666" font-size="10" text-anchor="end">' + Math.round(gv) + '</text>');
      sp.push('<text x="' + gx.toFixed(1) + '" y="' + (svgH - padB + 15) + '" fill="#666" font-size="10" text-anchor="middle">' + Math.round(gv) + '</text>');
    }

    // y=x 参考线（完美预测）
    sp.push('<line x1="' + sX(0).toFixed(1) + '" y1="' + sY(0).toFixed(1) + '" x2="' + sX(maxVal).toFixed(1) + '" y2="' + sY(maxVal).toFixed(1) + '" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5"/>');
    sp.push('<text x="' + (sX(maxVal) - 5).toFixed(1) + '" y="' + (sY(maxVal) - 6).toFixed(1) + '" fill="#4ade80" font-size="10" text-anchor="end">y=x 完美预测线</text>');

    // 数据点
    for (var p = 0; p < valid.length; p++) {
      var px = sX(valid[p].estimatedValue);
      var py = sY(valid[p].price);
      var pc = valid[p].deviation > 0 ? '#4ade80' : (valid[p].deviation < 0 ? '#f87171' : '#888');
      sp.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3" fill="' + pc + '" opacity="0.65"><title>估值¥' + valid[p].estimatedValue + ' 成交¥' + valid[p].price + ' 偏差' + valid[p].deviationPercent + '%</title></circle>');
    }

    // 轴标签
    sp.push('<text x="' + (padL + plotW / 2) + '" y="' + (svgH - 5) + '" fill="#aaa" font-size="11" text-anchor="middle">估值 (元)</text>');
    sp.push('<text x="15" y="' + (padT + plotH / 2) + '" fill="#aaa" font-size="11" text-anchor="middle" transform="rotate(-90 15 ' + (padT + plotH / 2) + ')">成交价 (元)</text>');

    // 图例
    sp.push('<rect x="' + (svgW - 145) + '" y="8" width="135" height="36" fill="#0d0d22" stroke="#2a2a4a" rx="4"/>');
    sp.push('<circle cx="' + (svgW - 135) + '" cy="20" r="3" fill="#4ade80" opacity="0.65"/>');
    sp.push('<text x="' + (svgW - 125) + '" y="24" fill="#888" font-size="10">估值偏高(买赚)</text>');
    sp.push('<circle cx="' + (svgW - 135) + '" cy="35" r="3" fill="#f87171" opacity="0.65"/>');
    sp.push('<text x="' + (svgW - 125) + '" y="39" fill="#888" font-size="10">估值偏低(买贵)</text>');

    sp.push('</svg>');
    document.getElementById('d-scatter-plot').innerHTML = sp.join('');

    document.getElementById('d-accuracy-analysis').style.display = 'block';
  }

  function applyDealsFilter() {
    const filter = document.getElementById('d-filter').value;
    dealsFiltered = dealsData.filter(d => {
      if (filter === 'undervalued') return d.deviation > 0;
      if (filter === 'overvalued') return d.deviation < 0;
      if (filter === 'unvalued') return d.estimatedValue === 0;
      return true;
    });
    applyDealsSort();
  }

  function applyDealsSort() {
    const sort = document.getElementById('d-sort').value;
    dealsFiltered.sort((a, b) => {
      switch (sort) {
        case 'deviation-desc': return b.deviationPercent - a.deviationPercent;
        case 'deviation-asc': return a.deviationPercent - b.deviationPercent;
        case 'devAmount-desc': return (b.deviation || 0) - (a.deviation || 0);
        case 'devAmount-asc': return (a.deviation || 0) - (b.deviation || 0);
        case 'yellow-desc': return (b.yellowCount || 0) - (a.yellowCount || 0);
        case 'yellow-asc': return (a.yellowCount || 0) - (b.yellowCount || 0);
        case 'price-desc': return b.price - a.price;
        case 'price-asc': return a.price - b.price;
        case 'est-desc': return b.estimatedValue - a.estimatedValue;
        case 'est-asc': return a.estimatedValue - b.estimatedValue;
        default: return 0;
      }
    });
    renderDealsTable();
  }

  function renderDealsTable() {
    const tbody = document.getElementById('d-tbody');
    if (dealsFiltered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#666;">暂无数据</td></tr>';
      document.getElementById('d-info').textContent = '';
      return;
    }

    tbody.innerHTML = dealsFiltered.map((d, i) => {
      const devClass = d.deviation > 0 ? 'd-dev-pos' : (d.deviation < 0 ? 'd-dev-neg' : 'd-dev-zero');
      const devSign = d.deviation > 0 ? '+' : '';
      const devPctSign = d.deviationPercent > 0 ? '+' : '';
      const hasDetails = d.details && d.estimatedValue > 0;
      return '<tr class="d-deal-row" id="d-row-' + i + '">' +
        '<td class="d-no"><a href="' + d.url + '" target="_blank">' + (d.productUniqueNo || '-') + '</a></td>' +
        '<td>' + (d.payTime || '-') + '</td>' +
        '<td><div class="d-desc" onclick="toggleDesc(this)"><div class="short">' + escapeHtml(d.shortDescription || d.showTitle || '-') + '</div><div class="full">' + escapeHtml(d.showTitle || '') + '</div></div></td>' +
        '<td class="d-price d-price-actual">¥' + d.price + '</td>' +
        '<td class="d-price d-price-est">' + (d.estimatedValue > 0 ? '¥' + d.estimatedValue : '-') + '</td>' +
        '<td class="d-dev ' + devClass + '">' + (hasDetails ? devSign + '¥' + d.deviation : '-') + '</td>' +
        '<td class="d-dev ' + devClass + '">' + (hasDetails ? devPctSign + d.deviationPercent + '%' : '-') + '</td>' +
        '<td>' + (d.yellowCount > 0 ? d.yellowCount : '-') + '</td>' +
        '<td style="text-align:center;">' + (hasDetails ? '<span style="cursor:pointer;color:#8ecdf5;font-size:16px;" onclick="toggleDetail(' + i + ')">▶</span>' : '') + '</td>' +
        '</tr>' +
        (hasDetails ? '<tr class="d-detail-row" id="d-detail-' + i + '" style="display:none;"><td colspan="9">' + renderDealDetail(d) + '</td></tr>' : '');
    }).join('');

    document.getElementById('d-info').textContent = '共 ' + dealsFiltered.length + ' 条' + (dealsHasMore ? ' (可加载更多)' : ' (已全部加载)');
  }

  function renderDealDetail(d) {
    const det = d.details;
    if (!det) return '';
    const chars = (d.characters || []).sort((a, b) => (b.value || 0) - (a.value || 0));
    const charTags = chars.map(c => {
      let cls = 'd-char-item';
      if (c.const >= 6) cls += ' full-const';
      if (c.hasSig) cls += ' has-sig';
      const constStr = c.const >= 6 ? '满命' : c.const + '命';
      const valStr = (c.value != null && !isNaN(c.value)) ? '¥' + Math.round(c.value) : '-';
      return '<span class="' + cls + '">' + constStr + c.name + (c.hasSig ? '+专武' : '') + ' (' + valStr + ')</span>';
    }).join('');

    return '<div class="d-detail-content">' +
      '<div class="d-detail-section">' +
        '<h4>估值明细</h4>' +
        '<table class="inner">' +
          '<tr><td>角色价值</td><td>¥' + (det.characterValue || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>满命溢价</td><td>' + ((det.c6Premium || 0) >= 0 ? '+' : '') + '¥' + (det.c6Premium || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>配队溢价</td><td>' + ((det.teamPremium || 0) >= 0 ? '+' : '') + '¥' + (det.teamPremium || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>抽数价值</td><td>¥' + (det.pullValue || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>资源价值</td><td>¥' + (det.resourceValue || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>有效金系数</td><td>×' + (det.yellowMultiplier || 0).toFixed(2) + '</td></tr>' +
          '<tr style="border-top:1px solid #2a2a4a;"><td style="color:#4ade80;font-weight:600;">估算总值</td><td style="color:#60a5fa;font-weight:700;">¥' + (det.finalValue || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>实际成交价</td><td style="color:#fbbf24;">¥' + d.price + '</td></tr>' +
          '<tr><td>偏差值</td><td style="color:' + (d.deviation >= 0 ? '#4ade80' : '#f87171') + ';font-weight:600;">' + (d.deviation >= 0 ? '+' : '') + '¥' + d.deviation + '</td></tr>' +
          '<tr><td>偏差率</td><td style="color:' + (d.deviation >= 0 ? '#4ade80' : '#f87171') + ';font-weight:600;">' + (d.deviationPercent >= 0 ? '+' : '') + d.deviationPercent + '%</td></tr>' +
          '<tr><td>性价比</td><td>' + (d.costPerformance >= 0 ? '+' : '') + d.costPerformance + '%</td></tr>' +
        '</table>' +
        (d.attrNameList && d.attrNameList.length ? '<div class="d-tag-list">' + d.attrNameList.map(t => '<span class="d-tag">' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
      '</div>' +
      '<div class="d-detail-section">' +
        '<h4>角色列表 (' + chars.length + '个)</h4>' +
        '<div class="d-char-list">' + (charTags || '<span style="color:#666;">无角色数据</span>') + '</div>' +
      '</div>' +
    '</div>';
  }

  function toggleDesc(el) { el.classList.toggle('expanded'); }

  function toggleDetail(idx) {
    const detailRow = document.getElementById('d-detail-' + idx);
    const row = document.getElementById('d-row-' + idx);
    if (!detailRow) return;
    if (detailRow.style.display === 'none') {
      if (dealsExpandedRow !== null && dealsExpandedRow !== idx) {
        const prev = document.getElementById('d-detail-' + dealsExpandedRow);
        const prevRow = document.getElementById('d-row-' + dealsExpandedRow);
        if (prev) prev.style.display = 'none';
        if (prevRow) prevRow.classList.remove('expanded');
      }
      detailRow.style.display = '';
      row.classList.add('expanded');
      dealsExpandedRow = idx;
    } else {
      detailRow.style.display = 'none';
      row.classList.remove('expanded');
      dealsExpandedRow = null;
    }
  }

  function toggleLogDetail(idx) {
    const detailRow = document.getElementById('log-detail-' + idx);
    const row = document.getElementById('log-row-' + idx);
    if (!detailRow) return;
    if (detailRow.style.display === 'none') {
      if (logExpandedRow !== null && logExpandedRow !== idx) {
        const prev = document.getElementById('log-detail-' + logExpandedRow);
        const prevRow = document.getElementById('log-row-' + logExpandedRow);
        if (prev) prev.style.display = 'none';
        if (prevRow) prevRow.classList.remove('expanded');
      }
      detailRow.style.display = '';
      row.classList.add('expanded');
      logExpandedRow = idx;
    } else {
      detailRow.style.display = 'none';
      row.classList.remove('expanded');
      logExpandedRow = null;
    }
  }

  function renderLogDetail(l) {
    const det = l.details;
    if (!det) return '';
    const chars = (l.characters || []).sort((a, b) => (b.value || 0) - (a.value || 0));
    const charTags = chars.map(c => {
      let cls = 'd-char-item';
      if (c.const >= 6) cls += ' full-const';
      if (c.hasSig) cls += ' has-sig';
      const constStr = c.const >= 6 ? '满命' : c.const + '命';
      const valStr = (c.value != null && !isNaN(c.value)) ? '¥' + Math.round(c.value) : '-';
      return '<span class="' + cls + '">' + constStr + c.name + (c.hasSig ? '+专武' : '') + ' (' + valStr + ')</span>';
    }).join('');

    return '<div class="d-detail-content">' +
      '<div class="d-detail-section">' +
        '<h4>估值明细</h4>' +
        '<table class="inner">' +
          '<tr><td>角色价值</td><td>¥' + (det.characterValue || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>满命溢价</td><td>' + ((det.c6Premium || 0) >= 0 ? '+' : '') + '¥' + (det.c6Premium || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>配队溢价</td><td>' + ((det.teamPremium || 0) >= 0 ? '+' : '') + '¥' + (det.teamPremium || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>抽数价值</td><td>¥' + (det.pullValue || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>资源价值</td><td>¥' + (det.resourceValue || 0).toFixed(2) + '</td></tr>' +
          '<tr><td>有效金系数</td><td>×' + (det.yellowMultiplier || 0).toFixed(2) + '</td></tr>' +
          '<tr style="border-top:1px solid #2a2a4a;"><td style="color:#4ade80;font-weight:600;">估算总值</td><td style="color:#60a5fa;font-weight:700;">¥' + (det.finalValue || 0).toFixed(2) + '</td></tr>' +
          (l.price != null ? '<tr><td>标价</td><td style="color:#fbbf24;">¥' + l.price + '</td></tr>' : '') +
          (l.ratio != null ? '<tr><td>性价比</td><td>' + (l.ratio >= 0 ? '+' : '') + l.ratio.toFixed(1) + '%</td></tr>' : '') +
        '</table>' +
      '</div>' +
      '<div class="d-detail-section">' +
        '<h4>角色列表 (' + chars.length + '个)</h4>' +
        '<div class="d-char-list">' + (charTags || '<span style="color:#666;">无角色数据</span>') + '</div>' +
      '</div>' +
    '</div>';
  }

  // ============================================================
  // 配置管理
  // ============================================================
  let pendingConfig = null;

  function handleConfigFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('config-file-name').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const config = JSON.parse(e.target.result);
        pendingConfig = config;
        // 预览
        const preview = document.getElementById('config-preview');
        const content = document.getElementById('config-preview-content');
        const keys = Object.keys(config);
        let html = '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">';
        for (const key of keys) {
          const val = config[key];
          let valStr;
          if (Array.isArray(val)) valStr = '[' + val.length + ' 项]';
          else if (typeof val === 'object' && val !== null) valStr = '{' + Object.keys(val).length + ' 键}';
          else valStr = String(val);
          html += '<span style="color:#8ecdf5;">' + escapeHtml(key) + '</span><span style="color:#aaa;">' + escapeHtml(valStr) + '</span>';
        }
        html += '</div>';
        content.innerHTML = html;
        preview.style.display = '';
        const btn = document.getElementById('config-upload-btn');
        btn.disabled = false;
        btn.style.opacity = '1';
        document.getElementById('config-upload-status').textContent = '';
      } catch (err) {
        document.getElementById('config-upload-status').innerHTML = '<span style="color:#ef4444;">JSON 解析失败: ' + escapeHtml(err.message) + '</span>';
        pendingConfig = null;
      }
    };
    reader.readAsText(file);
  }

  async function uploadConfig() {
    if (!pendingConfig) return;
    const pw = sessionStorage.getItem('admin_pw');
    if (!pw) { alert('请先登录'); return; }

    const btn = document.getElementById('config-upload-btn');
    const status = document.getElementById('config-upload-status');
    btn.disabled = true;
    btn.textContent = '上传中...';
    status.innerHTML = '<span style="color:#fbbf24;">正在上传...</span>';

    try {
      const resp = await fetch('/api/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, config: pendingConfig }),
      });
      const json = await resp.json();
      if (json.success) {
        status.innerHTML = '<span style="color:#4ade80;">✓ ' + (json.message || '配置已更新') + '</span>';
        btn.textContent = '已上传';
        btn.style.background = '#4ade80';
      } else {
        status.innerHTML = '<span style="color:#ef4444;">✗ ' + escapeHtml(json.error || '上传失败') + '</span>';
        btn.disabled = false;
        btn.textContent = '上传配置';
      }
    } catch (err) {
      status.innerHTML = '<span style="color:#ef4444;">网络错误: ' + escapeHtml(err.message) + '</span>';
      btn.disabled = false;
      btn.textContent = '上传配置';
    }
  }

  async function checkServerConfig() {
    const status = document.getElementById('server-config-status');
    status.innerHTML = '<span style="color:#fbbf24;">检查中...</span>';
    try {
      const resp = await fetch('/api/config/default');
      const json = await resp.json();
      if (json.success && json.data) {
        const config = json.data;
        const keys = Object.keys(config);
        let html = '<div style="color:#4ade80;margin-bottom:8px;">✓ 服务器已配置默认估值规则</div>';
        html += '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;">';
        for (const key of keys) {
          const val = config[key];
          let valStr;
          if (Array.isArray(val)) valStr = '[' + val.length + ' 项]';
          else if (typeof val === 'object' && val !== null) valStr = '{' + Object.keys(val).length + ' 键}';
          else valStr = String(val);
          html += '<span style="color:#8ecdf5;">' + escapeHtml(key) + '</span><span style="color:#aaa;">' + escapeHtml(valStr) + '</span>';
        }
        html += '</div>';
        status.innerHTML = html;
      } else {
        status.innerHTML = '<span style="color:#fbbf24;">服务器未配置默认估值规则，使用源码内置默认值</span>';
      }
    } catch (err) {
      status.innerHTML = '<span style="color:#ef4444;">检查失败: ' + escapeHtml(err.message) + '</span>';
    }
  }

  // ============================================================
  // 通用
  // ============================================================
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
</script>
</body>
</html>`;
}

module.exports = getAdminPage;
