'use strict';

function getStatsPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>算法准确性报告 - 游戏账号估价平台</title>
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
    .header { text-align: center; padding: 40px 24px 24px; }
    .site-name { font-size: 22px; font-weight: 700; color: #8ecdf5; margin-bottom: 6px; }
    .page-title { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .page-subtitle { font-size: 14px; color: #888; }
    .nav-back { display: inline-block; margin-top: 12px; color: #8ecdf5; text-decoration: none; font-size: 13px; }
    .nav-back:hover { text-decoration: underline; }

    /* Loading */
    #loading { text-align: center; padding: 80px 0; color: #888; font-size: 14px; }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid #1a1a3e; border-top-color: #8ecdf5; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Cards */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .stat-card { background: #12122a; border: 1px solid #2a2a4a; border-radius: 10px; padding: 18px 16px; text-align: center; }
    .stat-card.green { border-color: #1a3a1a; } .stat-card.red { border-color: #3a1a1a; }
    .stat-card.blue { border-color: #1a2a3a; } .stat-card.purple { border-color: #2a1a3a; }
    .stat-label { font-size: 12px; color: #888; margin-bottom: 6px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #fff; }
    .stat-value.green { color: #4ade80; } .stat-value.red { color: #f87171; }
    .stat-value.blue { color: #60a5fa; } .stat-value.purple { color: #c084fc; }
    .stat-sub { font-size: 11px; color: #666; margin-top: 4px; }

    /* Section */
    .section { background: #12122a; border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .section-title { font-size: 15px; font-weight: 600; color: #ccc; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #2a2a4a; }

    /* Scatter plot */
    .scatter-wrap { display: flex; justify-content: center; }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { padding: 8px 10px; text-align: left; color: #888; font-weight: 600; border-bottom: 1px solid #2a2a4a; font-size: 12px; }
    .data-table td { padding: 7px 10px; border-bottom: 1px solid #1a1a2e; color: #ccc; }
    .data-table tr:hover td { background: #161630; }
    .dev-pos { color: #4ade80; } .dev-neg { color: #f87171; } .dev-zero { color: #888; }
    .tier-badge { display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 6px; }

    /* Accuracy bar */
    .acc-bar-wrap { margin: 12px 0; }
    .acc-bar { display: flex; height: 28px; border-radius: 6px; overflow: hidden; background: #1a1a2e; }
    .acc-bar-seg { display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; transition: width 0.5s; }
    .acc-bar-seg.s10 { background: #4ade80; color: #0a0a1a; }
    .acc-bar-seg.s20 { background: #fbbf24; color: #0a0a1a; }
    .acc-bar-seg.s30 { background: #fb923c; color: #0a0a1a; }
    .acc-bar-seg.sOut { background: #f87171; color: #0a0a1a; }
    .acc-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #888; }
    .acc-legend span { display: inline-flex; align-items: center; gap: 4px; }
    .acc-legend .dot { width: 10px; height: 10px; border-radius: 2px; }

    .footer { text-align: center; padding: 40px 0 20px; color: #555; font-size: 12px; }
    .empty-state { text-align: center; padding: 60px 0; color: #666; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="site-name">游戏账号估价平台</div>
      <div class="page-title">算法准确性报告</div>
      <div class="page-subtitle">基于真实成交记录的估值模型质量分析</div>
      <a href="/" class="nav-back">← 返回首页</a>
    </div>

    <div id="loading">
      <div class="spinner"></div>
      <div>正在加载统计数据...</div>
    </div>

    <div id="content" style="display:none;"></div>

    <div class="footer">
      © 2024 游戏账号估价平台 · 数据仅供参考，不参与任何账号交易
    </div>
  </div>

  <script>
    (async function() {
      try {
        const resp = await fetch('/api/public-stats');
        const result = await resp.json();
        if (!result.success || !result.data.summary) {
          document.getElementById('loading').innerHTML = '<div style="padding:60px 0;color:#666;">暂无统计数据，请稍后再来查看</div>';
          return;
        }
        render(result.data);
      } catch (e) {
        document.getElementById('loading').innerHTML = '<div style="padding:60px 0;color:#666;">数据加载失败，请刷新重试</div>';
      }
    })();

    function render(data) {
      const s = data.summary;
      const scatter = data.scatter || [];
      const charStats = data.charStats || [];
      let html = '';

      // ===== 关键指标卡片 =====
      html += '<div class="stats-grid">';
      html += statCard('样本总量', s.valued + ' 条', '基于 ' + s.total + ' 条历史记录', 'blue');
      html += statCard('平均准确率', s.accPct + '%', '±20%命中率 (' + s.hit20 + '/' + s.valued + ')', s.accPct >= 70 ? 'green' : 'red');
      html += statCard('平均绝对误差', '¥' + s.mae, '平均' + s.maePct + '%', 'purple');
      html += statCard('平均偏差', (s.avgDev >= 0 ? '+' : '') + '¥' + s.avgDev, (s.avgDevPct >= 0 ? '+' : '') + s.avgDevPct + '%', s.avgDev >= 0 ? 'green' : 'red');
      html += '</div>';

      // 第二行卡片
      html += '<div class="stats-grid">';
      html += statCard('平均成交价', '¥' + s.avgPrice, '所有样本均值', 'blue');
      html += statCard('平均估值', '¥' + s.avgEst, '引擎预估均值', 'blue');
      html += statCard('估值偏低', s.undervalued + ' 条', '成交价 > 估值', 'green');
      html += statCard('估值偏高', s.overvalued + ' 条', '成交价 < 估值', 'red');
      html += '</div>';

      // ===== 准确率分布 =====
      html += '<div class="section">';
      html += '<div class="section-title">准确率分布</div>';
      const total = s.valued;
      const c10 = s.hit10, c20 = s.hit20 - s.hit10, c30 = s.hit30 - s.hit20, cOut = total - s.hit30;
      const p10 = total > 0 ? (c10 / total * 100) : 0;
      const p20 = total > 0 ? (c20 / total * 100) : 0;
      const p30 = total > 0 ? (c30 / total * 100) : 0;
      const pOut = total > 0 ? (cOut / total * 100) : 0;
      html += '<div class="acc-bar-wrap">';
      html += '<div class="acc-bar">';
      if (p10 > 0) html += '<div class="acc-bar-seg s10" style="width:' + p10 + '%;">±10% ' + c10 + '</div>';
      if (p20 > 0) html += '<div class="acc-bar-seg s20" style="width:' + p20 + '%;">±20% ' + c20 + '</div>';
      if (p30 > 0) html += '<div class="acc-bar-seg s30" style="width:' + p30 + '%;">±30% ' + c30 + '</div>';
      if (pOut > 0) html += '<div class="acc-bar-seg sOut" style="width:' + pOut + '%;">>30% ' + cOut + '</div>';
      html += '</div>';
      html += '<div class="acc-legend">';
      html += '<span><span class="dot" style="background:#4ade80;"></span>±10%: ' + c10 + '条 (' + p10.toFixed(1) + '%)</span>';
      html += '<span><span class="dot" style="background:#fbbf24;"></span>±10~20%: ' + c20 + '条 (' + p20.toFixed(1) + '%)</span>';
      html += '<span><span class="dot" style="background:#fb923c;"></span>±20~30%: ' + c30 + '条 (' + p30.toFixed(1) + '%)</span>';
      html += '<span><span class="dot" style="background:#f87171;"></span>>30%: ' + cOut + '条 (' + pOut.toFixed(1) + '%)</span>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // ===== 散点图 =====
      if (scatter.length > 0) {
        html += '<div class="section">';
        html += '<div class="section-title">估值 vs 成交价 散点图（' + scatter.length + ' 个数据点）</div>';
        html += '<div class="scatter-wrap">' + renderScatter(scatter) + '</div>';
        html += '</div>';
      }

      // ===== 角色偏差统计 =====
      if (charStats.length > 0) {
        html += '<div class="section">';
        html += '<div class="section-title">角色估值偏差统计（出现≥2次）</div>';
        html += '<table class="data-table"><thead><tr>';
        html += '<th>角色</th><th>出现次数</th><th>平均偏差率</th><th>平均估值</th><th>评估</th>';
        html += '</tr></thead><tbody>';
        const tierColors = { S: '#f87171', A: '#fbbf24', B: '#60a5fa', C: '#a78bfa', D: '#888' };
        for (const c of charStats) {
          const devClass = c.avgDevPct > 5 ? 'dev-neg' : (c.avgDevPct < -5 ? 'dev-pos' : 'dev-zero');
          const assessment = c.avgDevPct > 10 ? '<span style="color:#f87171;">偏高，建议下调</span>'
            : c.avgDevPct < -10 ? '<span style="color:#4ade80;">偏低，建议上调</span>'
            : c.avgDevPct > 5 ? '<span style="color:#fbbf24;">略偏高</span>'
            : c.avgDevPct < -5 ? '<span style="color:#fbbf24;">略偏低</span>'
            : '<span style="color:#888;">合理</span>';
          const constLabel = c.const >= 6 ? '满命' : 'C' + c.const;
          const tc = tierColors[c.tier] || '#888';
          html += '<tr>';
          html += '<td><span class="tier-badge" style="background:' + tc + '20;color:' + tc + ';">' + c.tier + '</span>' + escHtml(c.name) + ' <span style="color:#888;font-size:12px;">' + constLabel + '</span></td>';
          html += '<td>' + c.count + '</td>';
          html += '<td class="' + devClass + '">' + (c.avgDevPct >= 0 ? '+' : '') + c.avgDevPct + '%</td>';
          html += '<td>¥' + c.avgValue + '</td>';
          html += '<td>' + assessment + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table>';
        html += '</div>';
      }

      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').innerHTML = html;
      document.getElementById('content').style.display = 'block';
    }

    function statCard(label, value, sub, color) {
      return '<div class="stat-card ' + color + '"><div class="stat-label">' + label + '</div><div class="stat-value ' + color + '">' + value + '</div><div class="stat-sub">' + sub + '</div></div>';
    }

    function renderScatter(data) {
      // 使用95百分位数限制坐标轴
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

      var svgW = 560, svgH = 420;
      var padL = 55, padR = 15, padT = 20, padB = 45;
      var plotW = svgW - padL - padR;
      var plotH = svgH - padT - padB;

      function sX(v) { return padL + (Math.min(v, maxVal) / maxVal) * plotW; }
      function sY(v) { return padT + plotH - (Math.min(v, maxVal) / maxVal) * plotH; }

      var sp = [];
      sp.push('<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" style="width:100%;max-width:560px;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">');

      for (var g = 0; g <= 4; g++) {
        var gv = (maxVal / 4) * g;
        var gx = sX(gv), gy = sY(gv);
        sp.push('<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (svgW - padR) + '" y2="' + gy.toFixed(1) + '" stroke="#1f1f3a" stroke-width="1"/>');
        sp.push('<line x1="' + gx.toFixed(1) + '" y1="' + padT + '" x2="' + gx.toFixed(1) + '" y2="' + (svgH - padB) + '" stroke="#1f1f3a" stroke-width="1"/>');
        sp.push('<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" fill="#666" font-size="10" text-anchor="end">' + Math.round(gv) + '</text>');
        sp.push('<text x="' + gx.toFixed(1) + '" y="' + (svgH - padB + 15) + '" fill="#666" font-size="10" text-anchor="middle">' + Math.round(gv) + '</text>');
      }

      sp.push('<line x1="' + sX(0).toFixed(1) + '" y1="' + sY(0).toFixed(1) + '" x2="' + sX(maxVal).toFixed(1) + '" y2="' + sY(maxVal).toFixed(1) + '" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5"/>');
      sp.push('<text x="' + (sX(maxVal) - 5).toFixed(1) + '" y="' + (sY(maxVal) - 6).toFixed(1) + '" fill="#4ade80" font-size="10" text-anchor="end">y=x 完美预测线</text>');

      for (var p = 0; p < data.length; p++) {
        var px = sX(data[p].x);
        var py = sY(data[p].y);
        var pc = data[p].d > 0 ? '#4ade80' : (data[p].d < 0 ? '#f87171' : '#888');
        sp.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="2.5" fill="' + pc + '" opacity="0.55"><title>估值¥' + data[p].x + ' 成交¥' + data[p].y + ' 偏差' + data[p].p + '%</title></circle>');
      }

      sp.push('<text x="' + (padL + plotW / 2) + '" y="' + (svgH - 5) + '" fill="#aaa" font-size="11" text-anchor="middle">估值 (元)</text>');
      sp.push('<text x="15" y="' + (padT + plotH / 2) + '" fill="#aaa" font-size="11" text-anchor="middle" transform="rotate(-90 15 ' + (padT + plotH / 2) + ')">成交价 (元)</text>');

      sp.push('<rect x="' + (svgW - 145) + '" y="8" width="135" height="36" fill="#0d0d22" stroke="#2a2a4a" rx="4"/>');
      sp.push('<circle cx="' + (svgW - 135) + '" cy="20" r="2.5" fill="#4ade80" opacity="0.55"/>');
      sp.push('<text x="' + (svgW - 125) + '" y="24" fill="#888" font-size="10">估值偏低(买赚)</text>');
      sp.push('<circle cx="' + (svgW - 135) + '" cy="35" r="2.5" fill="#f87171" opacity="0.55"/>');
      sp.push('<text x="' + (svgW - 125) + '" y="39" fill="#888" font-size="10">估值偏高(买贵)</text>');

      if (outlierCount > 0) {
        sp.push('<text x="' + (padL + 4) + '" y="' + (padT + 12) + '" fill="#fbbf24" font-size="10">' + outlierCount + '个异常值已截断至边缘</text>');
      }

      sp.push('</svg>');
      return sp.join('');
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
  </script>
</body>
</html>`;
}

module.exports = getStatsPage;
