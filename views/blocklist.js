'use strict';

function getBlocklistPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IP封禁管理 - 鸣潮估价助手</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f0f23; color: #e0e0e0; font-family: -apple-system, 'Segoe UI', sans-serif; min-height: 100vh; }
  .login-box { max-width: 400px; margin: 100px auto; background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 32px; }
  .login-box h1 { font-size: 20px; color: #e94560; margin-bottom: 20px; text-align: center; }
  .login-box input { width: 100%; padding: 12px; border: 1px solid #2a2a4a; border-radius: 8px; background: #0f0f23; color: #e0e0e0; font-size: 14px; margin-bottom: 12px; }
  .login-box button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #e94560; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
  .login-box button:hover { background: #c73e54; }
  .login-box .error { color: #ef4444; font-size: 13px; margin-bottom: 8px; display: none; }
  .dashboard { display: none; max-width: 800px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #e94560; }
  .header .logout { color: #888; cursor: pointer; font-size: 13px; }
  .stats { font-size: 13px; color: #888; margin-bottom: 16px; display: flex; gap: 20px; }
  .stats span b { color: #e0e0e0; }
  .add-bar { display: flex; gap: 10px; margin-bottom: 20px; }
  .add-bar input { padding: 10px 14px; border: 1px solid #2a2a4a; border-radius: 8px; background: #1a1a3a; color: #e0e0e0; font-size: 14px; }
  .add-bar input[type=text] { flex: 1; }
  .add-bar input[type=text].reason-input { flex: 2; }
  .add-bar button { padding: 10px 20px; border: none; border-radius: 8px; background: #e94560; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .add-bar button:hover { background: #c73e54; }
  .tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #2a2a4a; }
  .tab { padding: 10px 16px; cursor: pointer; font-size: 14px; color: #888; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tab.active { color: #e94560; border-bottom-color: #e94560; }
  .ip-list { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; overflow: hidden; }
  .ip-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #1f1f3a; gap: 12px; }
  .ip-row:last-child { border-bottom: none; }
  .ip-row .info { flex: 1; min-width: 0; }
  .ip-row .ip { font-size: 15px; font-family: monospace; color: #e0e0e0; margin-bottom: 4px; }
  .ip-row .meta { font-size: 12px; color: #888; display: flex; gap: 12px; flex-wrap: wrap; }
  .ip-row .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .tag.manual { background: rgba(233,69,96,0.15); color: #e94560; }
  .tag.auto { background: rgba(251,191,36,0.15); color: #fbbf24; }
  .tag.expired { background: rgba(107,114,128,0.2); color: #6b7280; }
  .ip-row .actions { display: flex; gap: 8px; flex-shrink: 0; }
  .ip-row .unblock-btn { padding: 5px 14px; border: 1px solid #ef4444; border-radius: 6px; background: transparent; color: #ef4444; font-size: 12px; cursor: pointer; }
  .ip-row .unblock-btn:hover { background: rgba(239,68,68,0.1); }
  .empty { text-align: center; color: #666; padding: 40px; font-size: 14px; }
  .reason-text { color: #a0a0c0; }
  .countdown { color: #6ee7b7; }
  .permanent { color: #f87171; }
</style>
</head>
<body>
  <div class="login-box" id="login-box">
    <h1>IP封禁管理</h1>
    <div class="error" id="login-error">密码错误</div>
    <input type="password" id="password" placeholder="请输入管理密码" onkeydown="if(event.key==='Enter')doLogin()">
    <button onclick="doLogin()">登录</button>
  </div>

  <div class="dashboard" id="dashboard">
    <div class="header">
      <h1>IP封禁管理</h1>
      <span class="logout" onclick="logout()">退出</span>
    </div>
    <div class="stats" id="stats"></div>
    <div class="add-bar">
      <input type="text" id="new-ip" placeholder="输入要封禁的IP地址，如 1.2.3.4" onkeydown="if(event.key==='Enter')addIp()">
      <input type="text" class="reason-input" id="new-reason" placeholder="封禁原因（可选）" onkeydown="if(event.key==='Enter')addIp()">
      <button onclick="addIp()">封禁</button>
    </div>
    <div class="tabs">
      <div class="tab active" data-tab="all" onclick="switchTab('all')">全部</div>
      <div class="tab" data-tab="manual" onclick="switchTab('manual')">手动封禁</div>
      <div class="tab" data-tab="auto" onclick="switchTab('auto')">自动封禁</div>
    </div>
    <div class="ip-list" id="ip-list"></div>
  </div>

<script>
  const savedPw = sessionStorage.getItem('admin_pw');
  if (savedPw) { document.getElementById('password').value = savedPw; doLogin(); }

  let allData = [];
  let currentTab = 'all';

  async function doLogin() {
    const pw = document.getElementById('password').value.trim();
    if (!pw) return;
    try {
      const resp = await fetch('/blocklist/api/list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const result = await resp.json();
      if (result.success) {
        sessionStorage.setItem('admin_pw', pw);
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        allData = result.data;
        renderList();
        // 每分钟刷新一次倒计时
        setInterval(renderList, 60000);
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    } catch (e) {
      document.getElementById('login-error').textContent = '网络错误: ' + (e.message || '未知');
      document.getElementById('login-error').style.display = 'block';
    }
  }

  function logout() { sessionStorage.removeItem('admin_pw'); location.reload(); }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    renderList();
  }

  function formatTime(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    const pad = n => n.toString().padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function formatCountdown(expiresAt) {
    if (!expiresAt) return '<span class="permanent">永久</span>';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return '<span class="tag expired">已过期</span>';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours >= 24) {
      return '<span class="countdown">' + Math.floor(hours/24) + '天' + (hours%24) + '小时后解除</span>';
    }
    return '<span class="countdown">' + hours + '小时' + mins + '分后解除</span>';
  }

  function getTypeLabel(type) {
    if (type === 'auto') return '<span class="tag auto">自动封禁</span>';
    return '<span class="tag manual">手动封禁</span>';
  }

  function renderList() {
    const filtered = currentTab === 'all' ? allData : allData.filter(b => b.type === currentTab);
    const manualCount = allData.filter(b => b.type === 'manual').length;
    const autoCount = allData.filter(b => b.type === 'auto').length;
    const activeAuto = allData.filter(b => b.type === 'auto' && b.expiresAt && b.expiresAt > Date.now()).length;

    document.getElementById('stats').innerHTML =
      '共 <b>' + allData.length + '</b> 个封禁 IP ' +
      '（手动 <b>' + manualCount + '</b>，自动 <b>' + activeAuto + '</b> 生效中 / ' + autoCount + ' 总计）';

    const list = document.getElementById('ip-list');
    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty">暂无数据</div>';
      return;
    }
    list.innerHTML = filtered.map(b =>
      '<div class="ip-row">' +
        '<div class="info">' +
          '<div class="ip">' + b.ip + ' ' + getTypeLabel(b.type) + '</div>' +
          '<div class="meta">' +
            '<span>封禁时间：' + formatTime(b.createdAt) + '</span>' +
            '<span>剩余：' + formatCountdown(b.expiresAt) + '</span>' +
          '</div>' +
          (b.reason ? '<div class="meta"><span class="reason-text">原因：' + escapeHtml(b.reason) + '</span></div>' : '') +
        '</div>' +
        '<div class="actions"><button class="unblock-btn" onclick="removeIp(\\'' + b.ip.replace(/'/g, "\\\\'") + '\\')">解封</button></div>' +
      '</div>'
    ).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function addIp() {
    const ip = document.getElementById('new-ip').value.trim();
    const reason = document.getElementById('new-reason').value.trim();
    if (!ip) return;
    const pw = sessionStorage.getItem('admin_pw');
    try {
      const resp = await fetch('/blocklist/api/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, ip, reason }),
      });
      const result = await resp.json();
      if (result.success) {
        document.getElementById('new-ip').value = '';
        document.getElementById('new-reason').value = '';
        allData = result.data;
        renderList();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (e) { alert('网络错误'); }
  }

  async function removeIp(ip) {
    if (!confirm('确定解封 ' + ip + ' 吗？')) return;
    const pw = sessionStorage.getItem('admin_pw');
    try {
      const resp = await fetch('/blocklist/api/remove', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, ip }),
      });
      const result = await resp.json();
      if (result.success) {
        allData = result.data;
        renderList();
      }
      else { alert(result.error || '操作失败'); }
    } catch (e) { alert('网络错误'); }
  }
</script>
</body>
</html>`;
}

module.exports = getBlocklistPage;
