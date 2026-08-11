'use strict';

function getDealsPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>鸣潮成交记录 - 估值偏差分析</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a1a;
      color: #e0e0e0;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding: 20px 24px 16px;
      position: relative;
    }
    .back-home {
      position: absolute;
      top: 16px;
      left: 0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 14px;
      border: 1px solid #2a2a4a;
      border-radius: 20px;
      color: #aaa;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .back-home:hover { color: #e94560; border-color: rgba(233,69,96,0.5); background: rgba(233,69,96,0.06); }
    .header h1 {
      font-size: 28px;
      color: #e94560;
      margin-bottom: 8px;
    }
    .header .subtitle {
      color: #888;
      font-size: 14px;
    }

    /* Top Nav */
    .top-nav {
      display: flex; justify-content: center; gap: 0;
      margin-bottom: 20px; padding: 10px 16px;
      background: #12122a; border-radius: 12px; border: 1px solid #1f1f3a;
    }
    .nav-link {
      padding: 8px 24px; font-size: 14px; color: #888;
      text-decoration: none; border-radius: 8px; transition: all 0.2s;
      border: 1px solid transparent;
    }
    .nav-link:hover { color: #ccc; background: rgba(255,255,255,0.04); }
    .nav-link.active { color: #4ade80; border-color: #2a4a2a; background: rgba(74,222,128,0.06); font-weight: 600; }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: #12122a;
      border: 1px solid #1f1f3a;
      border-radius: 12px;
      padding: 16px 18px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 12px;
      color: #888;
      margin-bottom: 6px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
    }
    .summary-card .sub {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
    .summary-card.green .value { color: #4ade80; }
    .summary-card.red .value { color: #f87171; }
    .summary-card.blue .value { color: #60a5fa; }
    .summary-card.yellow .value { color: #fbbf24; }

    /* Controls */
    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .controls select, .controls button {
      background: #12122a;
      border: 1px solid #2a2a4a;
      color: #ccc;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      transition: all 0.2s;
    }
    .controls select:hover, .controls button:hover {
      border-color: #3a3a5a;
      background: #1a1a35;
    }
    .controls .refresh-btn {
      background: rgba(233,69,96,0.15);
      border-color: rgba(233,69,96,0.3);
      color: #e94560;
    }
    .controls .refresh-btn:hover {
      background: rgba(233,69,96,0.25);
    }
    .controls .page-info {
      margin-left: auto;
      font-size: 13px;
      color: #888;
    }

    /* Table */
    .deals-table-wrap {
      background: #12122a;
      border: 1px solid #1f1f3a;
      border-radius: 12px;
      overflow: hidden;
    }
    .deals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .deals-table thead {
      background: #1a1a35;
    }
    .deals-table th {
      padding: 12px 14px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #aaa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #1f1f3a;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
    }
    .deals-table th:hover { color: #e0e0e0; }
    .deals-table th .sort-arrow { font-size: 10px; margin-left: 4px; opacity: 0.5; }
    .deals-table th.sorted .sort-arrow { opacity: 1; color: #e94560; }
    .deals-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #1a1a30;
      font-size: 13px;
      vertical-align: top;
    }
    .deals-table tbody tr { transition: background 0.15s; }
    .deals-table tbody tr:hover { background: rgba(255,255,255,0.02); }
    .deals-table tbody tr.expanded { background: rgba(233,69,96,0.04); }

    .deal-no a {
      color: #8ecdf5;
      text-decoration: none;
      font-weight: 600;
    }
    .deal-no a:hover { text-decoration: underline; }
    .deal-no .copy-btn {
      font-size: 11px;
      color: #666;
      cursor: pointer;
      margin-left: 4px;
    }
    .deal-no .copy-btn:hover { color: #aaa; }

    .deal-desc {
      max-width: 380px;
      cursor: pointer;
      line-height: 1.5;
    }
    .deal-desc .short {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: #ccc;
    }
    .deal-desc .full {
      display: none;
      color: #aaa;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .deal-desc.expanded .short { display: none; }
    .deal-desc.expanded .full { display: block; }

    .price-cell { font-weight: 600; white-space: nowrap; }
    .price-actual { color: #fbbf24; }
    .price-estimated { color: #60a5fa; }

    .deviation-cell { font-weight: 700; white-space: nowrap; }
    .deviation-pos { color: #4ade80; }
    .deviation-neg { color: #f87171; }
    .deviation-zero { color: #888; }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .tag {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: #1a1a35;
      color: #aaa;
      border: 1px solid #2a2a4a;
    }

    /* Detail Row */
    .detail-row td {
      background: #0d0d22;
      padding: 16px 20px;
      border-bottom: 1px solid #1f1f3a;
    }
    .detail-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .detail-section h4 {
      font-size: 13px;
      color: #e94560;
      margin-bottom: 8px;
    }
    .detail-row table.inner {
      width: 100%;
      font-size: 12px;
    }
    .detail-row table.inner td {
      padding: 4px 8px;
      border: none;
      background: none;
    }
    .detail-row table.inner td:first-child {
      color: #888;
      width: 100px;
    }
    .detail-row table.inner td:last-child {
      color: #ccc;
      text-align: right;
    }
    .char-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .char-item {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 6px;
      background: #1a1a35;
      border: 1px solid #2a2a4a;
    }
    .char-item.has-sig { border-color: rgba(251,191,36,0.3); color: #fbbf24; }
    .char-item.full-const { border-color: rgba(74,222,128,0.3); color: #4ade80; }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 20px;
    }
    .pagination button {
      background: #12122a;
      border: 1px solid #2a2a4a;
      color: #ccc;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pagination button:hover:not(:disabled) {
      background: #1a1a35;
      border-color: #3a3a5a;
    }
    .pagination button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .pagination .page-num {
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      background: #1a1a35;
      color: #e94560;
      font-weight: 600;
    }

    /* Loading & Empty */
    .loading-msg, .empty-msg {
      text-align: center;
      padding: 60px 20px;
      color: #666;
      font-size: 14px;
    }
    .loading-msg .spinner {
      display: inline-block;
      width: 32px;
      height: 32px;
      border: 3px solid #1f1f3a;
      border-top-color: #e94560;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-msg {
      text-align: center;
      padding: 40px 20px;
      color: #f87171;
      font-size: 14px;
    }

    /* Footer */
    .footer-section {
      margin-top: 32px;
      padding: 16px 0;
      text-align: center;
      color: #555;
      font-size: 12px;
      border-top: 1px solid #1a1a30;
    }
    .footer-section a { color: #8ecdf5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <a class="back-home" href="/">← 返回首页</a>
      <h1>鸣潮成交记录分析</h1>
      <div class="subtitle">昨日成交商品 · 估价系统估值 vs 实际成交价偏差分析</div>
    </div>

    <!-- Nav -->
    <div class="top-nav">
      <a class="nav-link" href="/">首页</a>
      <a class="nav-link" href="/wuwa">鸣潮估价</a>
      <a class="nav-link active" href="/deals">成交记录</a>
      <a class="nav-link" href="/monitor">监控助手</a>
    </div>

    <!-- Summary -->
    <div class="summary-grid" id="summary-grid">
      <div class="summary-card blue">
        <div class="label">成交商品</div>
        <div class="value" id="stat-total">-</div>
        <div class="sub" id="stat-valued"></div>
      </div>
      <div class="summary-card yellow">
        <div class="label">平均成交价</div>
        <div class="value" id="stat-avg-price">-</div>
      </div>
      <div class="summary-card blue">
        <div class="label">平均估值</div>
        <div class="value" id="stat-avg-est">-</div>
      </div>
      <div class="summary-card" id="stat-dev-card">
        <div class="label">平均偏差</div>
        <div class="value" id="stat-avg-dev">-</div>
        <div class="sub" id="stat-avg-dev-pct"></div>
      </div>
      <div class="summary-card green">
        <div class="label">估值偏高(买赚)</div>
        <div class="value" id="stat-undervalued">-</div>
      </div>
      <div class="summary-card red">
        <div class="label">估值偏低(买贵)</div>
        <div class="value" id="stat-overvalued">-</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <select id="filter-select">
        <option value="all">全部商品</option>
        <option value="undervalued">仅估值偏高(买赚)</option>
        <option value="overvalued">仅估值偏低(买贵)</option>
        <option value="unvalued">未能估价</option>
      </select>
      <select id="sort-select">
        <option value="deviation-desc">偏差率 ↓</option>
        <option value="deviation-asc">偏差率 ↑</option>
        <option value="price-desc">成交价 ↓</option>
        <option value="price-asc">成交价 ↑</option>
        <option value="est-desc">估值 ↓</option>
        <option value="est-asc">估值 ↑</option>
      </select>
      <button class="refresh-btn" onclick="loadDeals(currentPage)">刷新数据</button>
      <div class="page-info" id="page-info"></div>
    </div>

    <!-- Table -->
    <div class="deals-table-wrap">
      <table class="deals-table" id="deals-table">
        <thead>
          <tr>
            <th style="width:90px">编号</th>
            <th style="width:80px">成交日</th>
            <th>商品描述</th>
            <th style="width:90px">成交价</th>
            <th style="width:90px">估值</th>
            <th style="width:90px">偏差值</th>
            <th style="width:80px">偏差率</th>
            <th style="width:70px">黄数</th>
            <th style="width:60px">详情</th>
          </tr>
        </thead>
        <tbody id="deals-tbody">
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination" id="pagination" style="display:none;">
      <button id="prev-btn" onclick="changePage(-1)">上一页</button>
      <span class="page-num" id="page-num">1</span>
      <button id="next-btn" onclick="changePage(1)">下一页</button>
    </div>

    <!-- Footer -->
    <div class="footer-section">
      <p>数据来源：螃蟹网昨日成交 · 估值由本站估价引擎自动计算 · <a href="/wuwa">前往估价</a></p>
      <p style="margin-top:4px;color:#444;">偏差值 = 估算值 - 成交价 · 正值表示估值高于成交价（买赚）· 负值表示估值低于成交价（买贵）</p>
    </div>
  </div>

  <script>
    let currentPage = 1;
    let allDeals = [];
    let filteredDeals = [];
    let expandedRow = null;

    async function loadDeals(page) {
      currentPage = page || 1;
      const tbody = document.getElementById('deals-tbody');
      tbody.innerHTML = '<tr><td colspan="9"><div class="loading-msg"><div class="spinner"></div><br>正在获取成交数据并计算估值...</div></td></tr>';
      document.getElementById('pagination').style.display = 'none';

      try {
        const resp = await fetch('/api/deals?page=' + currentPage + '&pageSize=20');
        const json = await resp.json();
        if (!json.success) {
          tbody.innerHTML = '<tr><td colspan="9"><div class="error-msg">' + (json.error || '获取失败') + '</div></td></tr>';
          return;
        }

        allDeals = json.data.list || [];
        renderSummary(json.data.summary);
        applyFilter();
      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="9"><div class="error-msg">网络错误: ' + err.message + '</div></td></tr>';
      }
    }

    function renderSummary(s) {
      if (!s) return;
      document.getElementById('stat-total').textContent = s.total;
      document.getElementById('stat-valued').textContent = s.valued + ' 条成功估值';
      document.getElementById('stat-avg-price').textContent = '\\u00a5' + s.avgPrice;
      document.getElementById('stat-avg-est').textContent = '\\u00a5' + s.avgEstimated;
      document.getElementById('stat-avg-dev').textContent = (s.avgDeviation >= 0 ? '+' : '') + '\\u00a5' + s.avgDeviation;
      document.getElementById('stat-avg-dev-pct').textContent = (s.avgDeviationPercent >= 0 ? '+' : '') + s.avgDeviationPercent + '%';
      document.getElementById('stat-undervalued').textContent = s.undervalued;
      document.getElementById('stat-overvalued').textContent = s.overvalued;

      const devCard = document.getElementById('stat-dev-card');
      devCard.className = 'summary-card ' + (s.avgDeviation >= 0 ? 'green' : 'red');
    }

    function applyFilter() {
      const filter = document.getElementById('filter-select').value;
      filteredDeals = allDeals.filter(d => {
        if (filter === 'undervalued') return d.deviation > 0;
        if (filter === 'overvalued') return d.deviation < 0;
        if (filter === 'unvalued') return d.estimatedValue === 0;
        return true;
      });
      applySort();
    }

    function applySort() {
      const sort = document.getElementById('sort-select').value;
      filteredDeals.sort((a, b) => {
        switch (sort) {
          case 'deviation-desc': return b.deviationPercent - a.deviationPercent;
          case 'deviation-asc': return a.deviationPercent - b.deviationPercent;
          case 'price-desc': return b.price - a.price;
          case 'price-asc': return a.price - b.price;
          case 'est-desc': return b.estimatedValue - a.estimatedValue;
          case 'est-asc': return a.estimatedValue - b.estimatedValue;
          default: return 0;
        }
      });
      renderTable();
    }

    function renderTable() {
      const tbody = document.getElementById('deals-tbody');
      if (filteredDeals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9"><div class="empty-msg">暂无符合条件的数据</div></td></tr>';
        document.getElementById('page-info').textContent = '';
        return;
      }

      tbody.innerHTML = filteredDeals.map((d, i) => {
        const devClass = d.deviation > 0 ? 'deviation-pos' : (d.deviation < 0 ? 'deviation-neg' : 'deviation-zero');
        const devSign = d.deviation > 0 ? '+' : '';
        const devPctSign = d.deviationPercent > 0 ? '+' : '';
        const hasDetails = d.details && d.estimatedValue > 0;

        return '<tr class="deal-row" id="row-' + i + '">' +
          '<td class="deal-no"><a href="' + d.url + '" target="_blank">' + (d.productUniqueNo || '-') + '</a></td>' +
          '<td>' + (d.payTime || '-') + '</td>' +
          '<td><div class="deal-desc" onclick="toggleDesc(this)"><div class="short">' + escapeHtml(d.shortDescription || d.showTitle || '-') + '</div><div class="full">' + escapeHtml(d.showTitle || '') + '</div></div></td>' +
          '<td class="price-cell price-actual">\\u00a5' + d.price + '</td>' +
          '<td class="price-cell price-estimated">' + (d.estimatedValue > 0 ? '\\u00a5' + d.estimatedValue : '-') + '</td>' +
          '<td class="deviation-cell ' + devClass + '">' + (hasDetails ? devSign + '\\u00a5' + d.deviation : '-') + '</td>' +
          '<td class="deviation-cell ' + devClass + '">' + (hasDetails ? devPctSign + d.deviationPercent + '%' : '-') + '</td>' +
          '<td>' + (d.yellowCount > 0 ? d.yellowCount : '-') + '</td>' +
          '<td style="text-align:center;">' + (hasDetails ? '<span style="cursor:pointer;color:#8ecdf5;font-size:16px;" onclick="toggleDetail(' + i + ')">\\u25b6</span>' : '') + '</td>' +
          '</tr>' +
          (hasDetails ? '<tr class="detail-row" id="detail-' + i + '" style="display:none;"><td colspan="9">' + renderDetail(d) + '</td></tr>' : '');
      }).join('');

      document.getElementById('page-info').textContent = '第 ' + currentPage + ' 页 · 共 ' + filteredDeals.length + ' 条';
      document.getElementById('pagination').style.display = 'flex';
      document.getElementById('page-num').textContent = currentPage;
      document.getElementById('prev-btn').disabled = currentPage <= 1;
      document.getElementById('next-btn').disabled = allDeals.length < 20;
    }

    function renderDetail(d) {
      const det = d.details;
      if (!det) return '';
      const chars = (d.characters || []).sort((a, b) => b.value - a.value);
      const charTags = chars.map(c => {
        let cls = 'char-item';
        if (c.const >= 6) cls += ' full-const';
        if (c.hasSig) cls += ' has-sig';
        const constStr = c.const >= 6 ? '满命' : c.const + '命';
        return '<span class="' + cls + '">' + constStr + c.name + (c.hasSig ? '+专武' : '') + ' (\\u00a5' + Math.round(c.value) + ')</span>';
      }).join('');

      return '<div class="detail-content">' +
        '<div class="detail-section">' +
          '<h4>估值明细</h4>' +
          '<table class="inner">' +
            '<tr><td>角色价值</td><td>\\u00a5' + (det.characterValue || 0).toFixed(2) + '</td></tr>' +
            '<tr><td>满命溢价</td><td>' + ((det.c6Premium || 0) >= 0 ? '+' : '') + '\\u00a5' + (det.c6Premium || 0).toFixed(2) + '</td></tr>' +
            '<tr><td>配队溢价</td><td>' + ((det.teamPremium || 0) >= 0 ? '+' : '') + '\\u00a5' + (det.teamPremium || 0).toFixed(2) + '</td></tr>' +
            '<tr><td>抽数价值</td><td>\\u00a5' + (det.pullValue || 0).toFixed(2) + '</td></tr>' +
            '<tr><td>资源价值</td><td>\\u00a5' + (det.resourceValue || 0).toFixed(2) + '</td></tr>' +
            '<tr><td>有效金系数</td><td>\\u00d7' + (det.yellowMultiplier || 0).toFixed(2) + '</td></tr>' +
            '<tr style="border-top:1px solid #2a2a4a;"><td style="color:#e94560;font-weight:600;">估算总值</td><td style="color:#60a5fa;font-weight:700;">\\u00a5' + (det.finalValue || 0).toFixed(2) + '</td></tr>' +
            '<tr><td>实际成交价</td><td style="color:#fbbf24;">\\u00a5' + d.price + '</td></tr>' +
            '<tr><td>偏差值</td><td style="color:' + (d.deviation >= 0 ? '#4ade80' : '#f87171') + ';font-weight:600;">' + (d.deviation >= 0 ? '+' : '') + '\\u00a5' + d.deviation + '</td></tr>' +
            '<tr><td>偏差率</td><td style="color:' + (d.deviation >= 0 ? '#4ade80' : '#f87171') + ';font-weight:600;">' + (d.deviationPercent >= 0 ? '+' : '') + d.deviationPercent + '%</td></tr>' +
            '<tr><td>性价比</td><td>' + (d.costPerformance >= 0 ? '+' : '') + d.costPerformance + '%</td></tr>' +
          '</table>' +
          '<div style="margin-top:8px;">' +
            (d.attrNameList && d.attrNameList.length ? '<div class="tag-list">' + d.attrNameList.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="detail-section">' +
          '<h4>角色列表 (' + chars.length + '个)</h4>' +
          '<div class="char-list">' + (charTags || '<span style="color:#666;">无角色数据</span>') + '</div>' +
        '</div>' +
      '</div>';
    }

    function toggleDesc(el) {
      el.classList.toggle('expanded');
    }

    function toggleDetail(idx) {
      const detailRow = document.getElementById('detail-' + idx);
      const row = document.getElementById('row-' + idx);
      if (!detailRow) return;

      if (detailRow.style.display === 'none') {
        // 关闭其他已展开的
        if (expandedRow !== null && expandedRow !== idx) {
          const prevDetail = document.getElementById('detail-' + expandedRow);
          const prevRow = document.getElementById('row-' + expandedRow);
          if (prevDetail) prevDetail.style.display = 'none';
          if (prevRow) prevRow.classList.remove('expanded');
        }
        detailRow.style.display = '';
        row.classList.add('expanded');
        expandedRow = idx;
      } else {
        detailRow.style.display = 'none';
        row.classList.remove('expanded');
        expandedRow = null;
      }
    }

    function changePage(delta) {
      const newPage = currentPage + delta;
      if (newPage < 1) return;
      loadDeals(newPage);
    }

    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Event listeners
    document.getElementById('filter-select').addEventListener('change', applyFilter);
    document.getElementById('sort-select').addEventListener('change', applySort);

    // Load on page open
    loadDeals(1);
  </script>
</body>
</html>`;
}

module.exports = getDealsPage;
