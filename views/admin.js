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
  body { background: #0f0f23; color: #e0e0e0; font-family: -apple-system, 'Segoe UI', sans-serif; min-height: 100vh; }
  .login-box { max-width: 400px; margin: 100px auto; background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 32px; }
  .login-box h1 { font-size: 20px; color: #4ade80; margin-bottom: 20px; text-align: center; }
  .login-box input { width: 100%; padding: 12px; border: 1px solid #2a2a4a; border-radius: 8px; background: #0f0f23; color: #e0e0e0; font-size: 14px; margin-bottom: 12px; }
  .login-box button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4ade80; color: #0f0f23; font-size: 14px; font-weight: 600; cursor: pointer; }
  .login-box button:hover { background: #22c55e; }
  .login-box .error { color: #ef4444; font-size: 13px; margin-bottom: 8px; display: none; }

  .dashboard { display: none; max-width: 1200px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #4ade80; }
  .header .logout { color: #888; cursor: pointer; font-size: 13px; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; padding: 20px; text-align: center; }
  .stat-card .num { font-size: 28px; font-weight: 700; color: #4ade80; }
  .stat-card .label { font-size: 12px; color: #888; margin-top: 4px; }

  .filters { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
  .filters select, .filters input { padding: 8px 12px; border: 1px solid #2a2a4a; border-radius: 6px; background: #1a1a3a; color: #e0e0e0; font-size: 13px; }

  table { width: 100%; border-collapse: collapse; background: #1a1a3a; border-radius: 10px; overflow: hidden; }
  th { background: #12122a; padding: 12px; text-align: left; font-size: 12px; color: #888; font-weight: 600; border-bottom: 1px solid #2a2a4a; white-space: nowrap; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #1f1f3a; }
  tr:hover { background: #1f1f3f; }
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
      <h1>查询日志</h1>
      <div style="display:flex;align-items:center;gap:16px;">
        <span class="refresh-btn" onclick="refreshLogs()" id="refresh-btn" style="color:#4ade80;cursor:pointer;font-size:13px;user-select:none;">↻ 刷新</span>
        <span class="logout" onclick="logout()">退出</span>
      </div>
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
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>类型</th>
          <th>IP</th>
          <th>输入</th>
          <th>标价</th>
          <th>估值</th>
          <th>性价比</th>
          <th>黄数</th>
          <th>抽数</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody id="log-tbody"></tbody>
    </table>
    <div class="pagination" id="pagination"></div>
  </div>

<script>
  let allLogs = [];
  let filteredLogs = [];
  let currentPage = 1;
  const pageSize = 50;

  // 自动登录（记住密码）
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

    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const start = (currentPage - 1) * pageSize;
    const pageLogs = filteredLogs.slice(start, start + pageSize);
    const tbody = document.getElementById('log-tbody');

    if (pageLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#666;padding:40px;">暂无数据</td></tr>';
    } else {
      tbody.innerHTML = pageLogs.map(l => {
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
        return '<tr>' +
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
          '</tr>';
      }).join('');
    }

    // 分页
    const totalPages = Math.ceil(filteredLogs.length / pageSize);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML =
      '<button onclick="goPage(' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '>上一页</button>' +
      '<span>第 ' + currentPage + ' / ' + totalPages + ' 页 (共 ' + filteredLogs.length + ' 条)</span>' +
      '<button onclick="goPage(' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '>下一页</button>';
  }

  function goPage(p) {
    const totalPages = Math.ceil(filteredLogs.length / pageSize);
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    renderPage();
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
</script>
</body>
</html>`;
}

module.exports = getAdminPage;
