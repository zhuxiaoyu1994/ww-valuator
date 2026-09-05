'use strict';

/**
 * 估值题库页面
 * - 上传页：粘贴螃蟹网已售商品链接，抓取商品信息，填写成交价后入库
 * - 管理页：题库列表，编辑/删除，以及用当前估值设置跑测试
 */

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const COMMON_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f0f23; color: #e0e0e0; font-family: -apple-system, 'Segoe UI', sans-serif; min-height: 100vh; }
  .page { max-width: 980px; margin: 0 auto; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
  .header h1 { font-size: 22px; color: #e94560; }
  .header .links { display: flex; gap: 14px; font-size: 13px; }
  .header .links a { color: #7aa2f7; text-decoration: none; }
  .header .links a:hover { text-decoration: underline; }
  .header .logout { color: #888; cursor: pointer; font-size: 13px; }
  .card { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 10px; padding: 18px; margin-bottom: 14px; }
  input, textarea, select { border: 1px solid #2a2a4a; border-radius: 8px; background: #0f0f23; color: #e0e0e0; font-size: 14px; padding: 10px 12px; }
  textarea { width: 100%; resize: vertical; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: #e94560; }
  .btn { padding: 10px 20px; border: none; border-radius: 8px; background: #e94560; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .btn:hover { background: #c73e54; }
  .btn:disabled { background: #555; cursor: not-allowed; }
  .btn-ghost { padding: 8px 16px; border: 1px solid #e94560; border-radius: 8px; background: transparent; color: #e94560; font-size: 13px; cursor: pointer; white-space: nowrap; }
  .btn-ghost:hover { background: rgba(233,69,96,0.1); }
  .btn-small { padding: 5px 12px; border: 1px solid #ef4444; border-radius: 6px; background: transparent; color: #ef4444; font-size: 12px; cursor: pointer; }
  .btn-small:hover { background: rgba(239,68,68,0.1); }
  .btn-blue { padding: 8px 16px; border: 1px solid #7aa2f7; border-radius: 8px; background: transparent; color: #7aa2f7; font-size: 13px; cursor: pointer; white-space: nowrap; }
  .btn-blue:hover { background: rgba(122,162,247,0.1); }
  .muted { color: #888; font-size: 13px; }
  .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1f4a3a; border: 1px solid #2ecc71; color: #2ecc71; padding: 12px 24px; border-radius: 8px; font-size: 14px; z-index: 999; display: none; }
  .toast.err { background: #4a1f27; border-color: #ef4444; color: #ef4444; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 6px; }
  .badge-sold { background: rgba(46,204,113,0.15); color: #2ecc71; }
  .badge-onsale { background: rgba(241,196,15,0.15); color: #f1c40f; }
  .badge-manual { background: rgba(122,162,247,0.15); color: #7aa2f7; }
  .badge-game { background: rgba(155,89,182,0.15); color: #bb8bfa; }
  .who { color: #2ecc71; font-weight: 600; }
`;

function getTestbankUploadPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>估值题库上传 - 鸣潮估价助手</title>
<style>${COMMON_CSS}
  .paste-box textarea { width: 100%; min-height: 110px; font-size: 13px; line-height: 1.6; }
  .paste-bar { display: flex; gap: 10px; margin-top: 10px; align-items: center; flex-wrap: wrap; }
  .paste-bar .tip { flex: 1; min-width: 200px; }
  .who-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
  .who-bar input { width: 160px; }
  .item-card { position: relative; }
  .item-card .close { position: absolute; top: 12px; right: 12px; }
  .item-title { font-size: 12px; color: #aaa; line-height: 1.5; max-height: 90px; overflow-y: auto; background: #0d0d20; border-radius: 6px; padding: 8px 10px; margin-bottom: 12px; word-break: break-all; }
  .item-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; font-size: 13px; }
  .item-meta .price { color: #f1c40f; font-weight: 600; }
  .item-form { display: flex; gap: 10px; flex-wrap: wrap; }
  .item-form .field { display: flex; flex-direction: column; gap: 4px; }
  .item-form .field label { font-size: 12px; color: #888; }
  .item-form input { width: 130px; }
  .item-form input[type="text"].note-input { width: 220px; }
  .item-form textarea.manual-title { width: 100%; min-height: 70px; font-size: 12px; }
  .fetching { color: #7aa2f7; font-size: 13px; padding: 20px; text-align: center; }
  .fail-tip { color: #f39c12; font-size: 12px; margin-bottom: 10px; }
  .actions-bar { display: flex; gap: 12px; align-items: center; margin-top: 6px; }
</style>
</head>
<body>
  <div class="page" id="page">
    <div class="header">
      <h1>估值题库 · 上传</h1>
      <div class="links">
        <a href="/testbank/list">题库管理</a>
      </div>
    </div>

    <div class="card paste-box">
      <div class="muted" style="margin-bottom:8px">粘贴螃蟹网<strong>已售</strong>商品链接，每行一个（支持批量）：</div>
      <textarea id="links" placeholder="https://www.pxb7.com/product/2358988500582651796/1&#10;https://www.pxb7.com/product/2358988500582651797/1"></textarea>
      <div class="paste-bar">
        <button class="btn" id="btn-fetch" onclick="fetchLinks()">获取商品信息</button>
        <span class="tip muted">自动抓取标题和标价；成交价需手动填写（接口不提供历史成交价）</span>
      </div>
    </div>

    <div class="who-bar">
      <span class="muted">上传人（可选）：</span>
      <input type="text" id="who" placeholder="你的名字">
    </div>

    <div id="items"></div>

    <div class="actions-bar" id="actions-bar" style="display:none">
      <button class="btn" id="btn-submit" onclick="submitAll()">提交到题库</button>
      <span class="muted" id="submit-tip"></span>
    </div>
  </div>

  <div class="toast" id="toast"></div>

<script>
  let cards = [];

  const savedWho = localStorage.getItem('testbank_who');
  if (savedWho) document.getElementById('who').value = savedWho;

  function showToast(msg, isErr) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = isErr ? 'toast err' : 'toast';
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parseLinks(text) {
    return text.split(/[\\n\\r\\s]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  async function fetchLinks() {
    const raw = document.getElementById('links').value;
    const links = parseLinks(raw);
    if (links.length === 0) { showToast('请先粘贴至少一个链接', true); return; }
    if (links.length > 20) { showToast('一次最多处理 20 个链接', true); return; }
    const btn = document.getElementById('btn-fetch');
    btn.disabled = true; btn.textContent = '获取中...';
    for (const link of links) {
      const card = { url: link, state: 'loading' };
      cards.push(card);
      renderCards();
      try {
        const resp = await fetch('/testbank/api/fetch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: link }),
        });
        const result = await resp.json();
        if (result.success) {
          Object.assign(card, result.data, { state: 'ok' });
          card.dealPrice = card.suggestedDealPrice || '';
        } else {
          card.state = 'fail';
          card.error = result.error || '获取失败';
        }
      } catch (e) {
        card.state = 'fail';
        card.error = '网络错误';
      }
      renderCards();
    }
    btn.disabled = false; btn.textContent = '获取商品信息';
    document.getElementById('links').value = '';
  }

  function removeCard(i) { cards.splice(i, 1); renderCards(); }

  function renderCards() {
    const box = document.getElementById('items');
    box.innerHTML = cards.map((c, i) => {
      if (c.state === 'loading') {
        return '<div class="card item-card"><div class="fetching">正在获取 ' + esc(c.url) + ' ...</div></div>';
      }
      if (c.state === 'fail') {
        return '<div class="card item-card">' +
          '<button class="btn-small close" onclick="removeCard(' + i + ')">移除</button>' +
          '<div class="fail-tip">获取失败：' + esc(c.error) + '。可手动填写标题入库（成交价必填）。</div>' +
          '<div class="item-title">手动模式：粘贴商品标题（等级/黄数/角色列表等完整描述）</div>' +
          '<div class="item-form">' +
            '<div class="field" style="flex:1"><label>商品标题（完整描述，必填）</label><textarea class="manual-title" id="title-' + i + '"></textarea></div>' +
          '</div>' +
          '<div class="item-form" style="margin-top:10px">' +
            '<div class="field"><label>标价（元，选填）</label><input type="number" id="lp-' + i + '" placeholder="如 1888"></div>' +
            '<div class="field"><label>成交价（元，必填）</label><input type="number" id="dp-' + i + '" placeholder="如 1550"></div>' +
            '<div class="field"><label>游戏</label><select id="g-' + i + '"><option value="wuwa">鸣潮</option><option value="zzz">绝区零</option></select></div>' +
            '<div class="field"><label>备注（选填）</label><input type="text" class="note-input" id="note-' + i + '"></div>' +
          '</div></div>';
      }
      const badges = '<span class="badge badge-game">' + esc(c.gameName || c.game) + '</span>' +
        (c.sold ? '<span class="badge badge-sold">已售</span>' : '<span class="badge badge-onsale">在售/其他</span>') +
        '<span class="badge badge-manual">编号 ' + esc(c.productUniqueNo || c.productId) + '</span>';
      const hint = c.suggestedDealPrice ? '已按昨日成交清单预填 ¥' + c.suggestedDealPrice : '接口无法获取成交价，请手动填写';
      return '<div class="card item-card">' +
        '<button class="btn-small close" onclick="removeCard(' + i + ')">移除</button>' +
        '<div class="item-title">' + esc(c.showTitle) + '</div>' +
        '<div class="item-meta">' + badges + '<span>标价 <span class="price">¥' + (c.listPrice || 0) + '</span></span></div>' +
        '<div class="item-form">' +
          '<div class="field"><label>成交价（元，必填）</label><input type="number" id="dp-' + i + '" value="' + (c.dealPrice || '') + '" placeholder="实际成交金额"></div>' +
          '<div class="field"><label>备注（选填）</label><input type="text" class="note-input" id="note-' + i + '" placeholder="备注"></div>' +
        '</div>' +
        '<div class="muted" style="margin-top:8px;font-size:12px">' + esc(hint) + '</div>' +
        '</div>';
    }).join('');
    document.getElementById('actions-bar').style.display = cards.some(c => c.state !== 'loading') ? 'flex' : 'none';
    const n = cards.filter(c => c.state !== 'loading').length;
    document.getElementById('submit-tip').textContent = n + ' 条待提交';
  }

  async function submitAll() {
    const who = document.getElementById('who').value.trim();
    localStorage.setItem('testbank_who', who);
    const items = [];
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (c.state === 'loading') continue;
      const dp = parseFloat(document.getElementById('dp-' + i) ? document.getElementById('dp-' + i).value : NaN);
      if (!(dp > 0)) continue;
      const note = document.getElementById('note-' + i) ? document.getElementById('note-' + i).value.trim() : '';
      if (c.state === 'fail') {
        const title = (document.getElementById('title-' + i) || {}).value || '';
        const lp = parseFloat((document.getElementById('lp-' + i) || {}).value || 0) || 0;
        const g = (document.getElementById('g-' + i) || {}).value || 'wuwa';
        if (!title.trim()) continue;
        items.push({ url: c.url, productId: '', productUniqueNo: '', showTitle: title.trim(), listPrice: lp, dealPrice: dp, dealSource: 'manual', game: g, note, addedBy: who });
      } else {
        items.push({ url: c.url, productId: c.productId, productUniqueNo: c.productUniqueNo, showTitle: c.showTitle, listPrice: c.listPrice || 0, dealPrice: dp, dealSource: c.suggestedDealPrice === dp ? 'soldlist' : 'manual', payTime: c.payTime || '', game: c.game, note, addedBy: who });
      }
    }
    if (items.length === 0) { showToast('没有可提交的记录（成交价必填且大于0）', true); return; }
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.textContent = '提交中...';
    try {
      const resp = await fetch('/testbank/api/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const result = await resp.json();
      if (result.success) {
        showToast('已入库 ' + result.data.added + ' 条' + (result.data.skipped > 0 ? '（跳过重复 ' + result.data.skipped + ' 条）' : ''));
        cards = cards.filter((c, idx) => {
          if (c.state === 'loading') return true;
          const dp = parseFloat(document.getElementById('dp-' + idx) ? document.getElementById('dp-' + idx).value : NaN);
          return !(dp > 0);
        });
        renderCards();
      } else {
        showToast(result.error || '提交失败', true);
      }
    } catch (e) {
      showToast('网络错误', true);
    }
    btn.disabled = false; btn.textContent = '提交到题库';
  }
</script>
</body>
</html>`;
}

function getTestbankListPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>估值题库管理 - 鸣潮估价助手</title>
<style>${COMMON_CSS}
  .toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
  .stats-bar { display: none; background: #16213e; border: 1px solid #2a4a6a; border-radius: 10px; padding: 16px 18px; margin-bottom: 14px; font-size: 13px; line-height: 1.8; }
  .stats-bar b { color: #7aa2f7; }
  table { width: 100%; border-collapse: collapse; background: #1a1a3a; border-radius: 10px; overflow: hidden; }
  th, td { padding: 10px 12px; text-align: left; font-size: 13px; border-bottom: 1px solid #1f1f3a; vertical-align: top; }
  th { color: #888; font-weight: 600; font-size: 12px; white-space: nowrap; }
  td.t-title { max-width: 320px; }
  td.t-title .short { max-height: 58px; overflow: hidden; cursor: pointer; word-break: break-all; color: #bbb; font-size: 12px; line-height: 1.45; }
  td.t-title .no { color: #7aa2f7; font-size: 12px; margin-bottom: 3px; }
  td .num { font-weight: 600; }
  td .money { color: #f1c40f; }
  td .est { font-weight: 600; }
  .dev-pos { color: #2ecc71; font-weight: 600; }
  .dev-neg { color: #ef4444; font-weight: 600; }
  .pass { color: #2ecc71; }
  .fail-x { color: #ef4444; }
  .empty { text-align: center; color: #666; padding: 40px; font-size: 14px; }
  .row-actions { display: flex; gap: 6px; white-space: nowrap; }
  .modal-mask { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: #1a1a3a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 24px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
  .modal h2 { font-size: 17px; color: #e94560; margin-bottom: 16px; }
  .modal .field { margin-bottom: 12px; }
  .modal .field label { display: block; font-size: 12px; color: #888; margin-bottom: 5px; }
  .modal .field input, .modal .field textarea { width: 100%; }
  .modal textarea { min-height: 100px; font-size: 12px; }
  .modal .foot { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
  .title-expand { display: none; white-break: break-all; font-size: 12px; color: #999; white-space: pre-wrap; word-break: break-all; margin-top: 6px; background: #0d0d20; padding: 8px; border-radius: 6px; max-height: 260px; overflow-y: auto; }
</style>
</head>
<body>
  <div class="page" id="page">
    <div class="header">
      <h1>估值题库 · 管理</h1>
      <div class="links">
        <a href="/testbank">上传页</a>
      </div>
    </div>

    <div class="toolbar">
      <button class="btn" id="btn-test" onclick="runEvaluate()">测试估值</button>
      <span class="muted">用当前线上估值设置跑一遍全部题目，看偏差</span>
      <span style="flex:1"></span>
      <select id="game-filter" onchange="renderTable()">
        <option value="">全部游戏</option>
        <option value="wuwa">鸣潮</option>
        <option value="zzz">绝区零</option>
      </select>
    </div>

    <div class="stats-bar" id="stats-bar"></div>

    <table>
      <thead>
        <tr>
          <th style="width:44px">#</th>
          <th>商品</th>
          <th style="width:82px">标价</th>
          <th style="width:82px">成交价</th>
          <th style="width:88px">估值</th>
          <th style="width:88px">偏差</th>
          <th style="width:64px">结果</th>
          <th style="width:120px">操作</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
    <div class="empty" id="empty" style="display:none">题库为空，去<a href="/testbank" style="color:#7aa2f7">上传页</a>添加已售商品</div>
  </div>

  <div class="modal-mask" id="modal-mask" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <h2>编辑题目</h2>
      <div class="field"><label>商品标题（题目）</label><textarea id="e-title"></textarea></div>
      <div class="field"><label>标价（元）</label><input type="number" id="e-lp"></div>
      <div class="field"><label>成交价（元，答案）</label><input type="number" id="e-dp"></div>
      <div class="field"><label>备注</label><input type="text" id="e-note"></div>
      <div class="foot">
        <button class="btn-ghost" onclick="closeModal()">取消</button>
        <button class="btn" onclick="saveEdit()">保存</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

<script>
  let items = [];
  let evals = {}; // id -> {estimated, devPct}
  let evalStats = null;
  let editingId = null;

  async function loadList() {
    try {
      const resp = await fetch('/testbank/api/list', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await resp.json();
      if (result.success) {
        items = result.data;
        renderTable();
      } else {
        showToast(result.error || '加载失败', true);
      }
    } catch (e) {
      showToast('加载题库失败', true);
    }
  }
  loadList();

  function showToast(msg, isErr) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = isErr ? 'toast err' : 'toast';
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderTable() {
    const gf = document.getElementById('game-filter').value;
    const list = gf ? items.filter(i => i.game === gf) : items;
    const tbody = document.getElementById('tbody');
    document.getElementById('empty').style.display = list.length === 0 ? 'block' : 'none';
    tbody.innerHTML = list.map((it, idx) => {
      const ev = evals[it.id];
      let estCell = '<span class="muted">-</span>', devCell = '<span class="muted">-</span>', resCell = '<span class="muted">-</span>';
      if (ev) {
        if (ev.error) { estCell = '<span class="fail-x">解析失败</span>'; }
        else {
          estCell = '<span class="est">¥' + Math.round(ev.estimated) + '</span>';
          const pct = ev.devPct;
          devCell = '<span class="' + (pct >= 0 ? 'dev-pos' : 'dev-neg') + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%</span>';
          resCell = Math.abs(pct) <= 20 ? '<span class="pass">合格</span>' : '<span class="fail-x">超差</span>';
        }
      }
      const short = (it.showTitle || '').length > 120 ? (it.showTitle.substring(0, 120) + '…') : (it.showTitle || '');
      const srcBadge = it.dealSource === 'soldlist' ? '<span class="badge badge-sold">清单价</span>' : '<span class="badge badge-manual">手填价</span>';
      return '<tr>' +
        '<td class="muted">' + (idx + 1) + '</td>' +
        '<td class="t-title"><div class="no">' + esc(it.productUniqueNo || it.productId || '(手动)' + '') + ' ' + srcBadge + ' <span class="muted">' + esc(it.game || '') + (it.addedBy ? ' · <span class="who">' + esc(it.addedBy) + '</span>' : '') + (it.note ? ' · ' + esc(it.note) : '') + '</span></div><div class="short" onclick="toggleTitle(this)">' + esc(short) + '<div class="title-expand">' + esc(it.showTitle) + '</div></div></td>' +
        '<td>' + (it.listPrice ? '<span class="money">¥' + it.listPrice + '</span>' : '-') + '</td>' +
        '<td><span class="money num">¥' + it.dealPrice + '</span></td>' +
        '<td>' + estCell + '</td>' +
        '<td>' + devCell + '</td>' +
        '<td>' + resCell + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="btn-blue" onclick="openEdit(\\'' + it.id + '\\')">编辑</button>' +
          '<button class="btn-small" onclick="delItem(\\'' + it.id + '\\')">删除</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function toggleTitle(el) {
    const x = el.querySelector('.title-expand');
    if (x) x.style.display = x.style.display === 'block' ? 'none' : 'block';
  }

  function openEdit(id) {
    const it = items.find(x => x.id === id);
    if (!it) return;
    editingId = id;
    document.getElementById('e-title').value = it.showTitle || '';
    document.getElementById('e-lp').value = it.listPrice || '';
    document.getElementById('e-dp').value = it.dealPrice || '';
    document.getElementById('e-note').value = it.note || '';
    document.getElementById('modal-mask').style.display = 'flex';
  }

  function closeModal() { document.getElementById('modal-mask').style.display = 'none'; editingId = null; }

  async function saveEdit() {
    if (!editingId) return;
    const patch = {
      showTitle: document.getElementById('e-title').value.trim(),
      listPrice: parseFloat(document.getElementById('e-lp').value) || 0,
      dealPrice: parseFloat(document.getElementById('e-dp').value),
      note: document.getElementById('e-note').value.trim(),
    };
    if (!patch.showTitle) { showToast('标题不能为空', true); return; }
    if (!(patch.dealPrice > 0)) { showToast('成交价必须大于0', true); return; }
    try {
      const resp = await fetch('/testbank/api/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, patch }),
      });
      const result = await resp.json();
      if (result.success) {
        Object.assign(items.find(x => x.id === editingId), patch);
        evals = {}; evalStats = null; document.getElementById('stats-bar').style.display = 'none';
        closeModal();
        renderTable();
        showToast('已保存（估值结果已重置，请重新测试）');
      } else { showToast(result.error || '保存失败', true); }
    } catch (e) { showToast('网络错误', true); }
  }

  async function delItem(id) {
    const it = items.find(x => x.id === id);
    if (!it || !confirm('确定删除 ' + (it.productUniqueNo || '该条') + ' 吗？')) return;
    try {
      const resp = await fetch('/testbank/api/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await resp.json();
      if (result.success) {
        items = items.filter(x => x.id !== id);
        delete evals[id];
        renderTable();
        showToast('已删除');
      } else { showToast(result.error || '删除失败', true); }
    } catch (e) { showToast('网络错误', true); }
  }

  async function runEvaluate() {
    const btn = document.getElementById('btn-test');
    btn.disabled = true; btn.textContent = '测试中...';
    try {
      const resp = await fetch('/testbank/api/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await resp.json();
      if (result.success) {
        evals = result.data.items;
        evalStats = result.data.stats;
        renderStats();
        renderTable();
        showToast('测试完成，共 ' + result.data.stats.count + ' 题');
      } else { showToast(result.error || '测试失败', true); }
    } catch (e) { showToast('网络错误', true); }
    btn.disabled = false; btn.textContent = '测试估值';
  }

  function renderStats() {
    const s = evalStats;
    const bar = document.getElementById('stats-bar');
    if (!s || s.count === 0) { bar.style.display = 'none'; return; }
    const dir = s.medianDevPct >= 0 ? '高估' : '低估';
    bar.innerHTML =
      '<b>共 ' + s.count + ' 题</b> · 估值整体' + dir + ' <b>' + Math.abs(s.medianDevPct).toFixed(1) + '%</b>' +
      '（中位偏差） · 平均绝对误差 <b>' + s.meanAbsDevPct.toFixed(1) + '%</b>' +
      ' · ±20%合格率 <b>' + s.pass20Rate.toFixed(0) + '%</b>（' + s.pass20Count + '/' + s.count + '）' +
      ' · 高估 <span class="dev-pos">' + s.overCount + '</span> / 低估 <span class="dev-neg">' + s.underCount + '</span>' +
      (s.games && s.games.wuwa ? '<br>鸣潮：' + s.games.wuwa : '') +
      (s.games && s.games.zzz ? ' · 绝区零：' + s.games.zzz : '') +
      '<div class="muted" style="font-size:12px;margin-top:4px">偏差 = (估值 − 成交价) / 成交价；正值=估值偏高。改估值设置后重新测试即可对比。</div>';
    bar.style.display = 'block';
  }
</script>
</body>
</html>`;
}

module.exports = { getTestbankUploadPage, getTestbankListPage };
