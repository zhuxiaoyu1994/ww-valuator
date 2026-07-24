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
  .dashboard { display: none; max-width: 700px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #e94560; }
  .header .logout { color: #888; cursor: pointer; font-size: 13px; }
  .add-bar { display: flex; gap: 10px; margin-bottom: 20px; }
  .add-bar input { flex: 1; padding: 10px 14px; border: 1px solid #2a2a4a; border-radius: 8px; background: #1a1a3a; color: #e0e0e0; font-size: 14px; }
  .add-bar button { padding: 10px 20px; border: none; border-radius: 8px; background: #e94560; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .add-bar button:hover { background: #c73e54; }
  .ip-list { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; overflow: hidden; }
  .ip-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #1f1f3a; }
  .ip-row:last-child { border-bottom: none; }
  .ip-row .ip { font-size: 15px; font-family: monospace; color: #e0e0e0; }
  .ip-row .actions { display: flex; gap: 8px; }
  .ip-row .unblock-btn { padding: 5px 14px; border: 1px solid #ef4444; border-radius: 6px; background: transparent; color: #ef4444; font-size: 12px; cursor: pointer; }
  .ip-row .unblock-btn:hover { background: rgba(239,68,68,0.1); }
  .empty { text-align: center; color: #666; padding: 40px; font-size: 14px; }
  .stats { font-size: 13px; color: #888; margin-bottom: 16px; }
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
      <button onclick="addIp()">封禁</button>
    </div>
    <div class="ip-list" id="ip-list"></div>
  </div>

<script>
  const savedPw = sessionStorage.getItem('admin_pw');
  if (savedPw) { document.getElementById('password').value = savedPw; doLogin(); }

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
        renderList(result.data);
      } else {
        document.getElementById('login-error').style.display = 'block';
      }
    } catch (e) {
      document.getElementById('login-error').textContent = '网络错误';
      document.getElementById('login-error').style.display = 'block';
    }
  }

  function logout() { sessionStorage.removeItem('admin_pw'); location.reload(); }

  function renderList(ips) {
    document.getElementById('stats').textContent = '当前共 ' + ips.length + ' 个被封禁IP';
    const list = document.getElementById('ip-list');
    if (ips.length === 0) {
      list.innerHTML = '<div class="empty">暂无封禁IP</div>';
      return;
    }
    list.innerHTML = ips.map(ip =>
      '<div class="ip-row"><span class="ip">' + ip + '</span>' +
      '<div class="actions"><button class="unblock-btn" onclick="removeIp(\\'' + ip + '\\')">解封</button></div></div>'
    ).join('');
  }

  async function addIp() {
    const ip = document.getElementById('new-ip').value.trim();
    if (!ip) return;
    const pw = sessionStorage.getItem('admin_pw');
    try {
      const resp = await fetch('/blocklist/api/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, ip }),
      });
      const result = await resp.json();
      if (result.success) {
        document.getElementById('new-ip').value = '';
        renderList(result.data);
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
      if (result.success) { renderList(result.data); }
      else { alert(result.error || '操作失败'); }
    } catch (e) { alert('网络错误'); }
  }
</script>
</body>
</html>`;
}

module.exports = getBlocklistPage;
