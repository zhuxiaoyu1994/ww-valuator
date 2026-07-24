'use strict';

function getPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>鸣潮账号估价 - 游戏账号估价平台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a1a;
      color: #e0e0e0;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }

    /* Top Nav */
    .top-nav {
      display: flex; justify-content: center; gap: 0;
      margin-bottom: 8px; padding: 10px 16px;
      background: #12122a; border-radius: 12px; border: 1px solid #1f1f3a;
    }
    .nav-link {
      padding: 8px 24px; font-size: 14px; color: #888;
      text-decoration: none; border-radius: 8px; transition: all 0.2s;
      border: 1px solid transparent;
    }
    .nav-link:hover { color: #ccc; background: rgba(255,255,255,0.04); }
    .nav-link.active { color: #4ade80; border-color: #2a4a2a; background: rgba(74,222,128,0.06); font-weight: 600; }

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

    /* 教学视频 */
    .tutorial-section {
      background: rgba(15, 52, 96, 0.3);
      border: 1px solid rgba(142, 205, 245, 0.15);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .tutorial-header {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }
    .tutorial-icon {
      color: #e94560;
      font-size: 14px;
    }
    .tutorial-title {
      font-size: 14px;
      font-weight: 600;
      color: #e0e0e0;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .tab-btn {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      background: #12122a;
      color: #888;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .tab-btn.active {
      background: #e94560;
      color: #fff;
      border-color: #e94560;
    }

    /* Input area */
    .input-card {
      background: #12122a;
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .input-row {
      display: flex;
      gap: 12px;
      align-items: stretch;
    }
    .input-row input,
    .input-row textarea {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      background: #0a0a1a;
      color: #e0e0e0;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .input-row input:focus,
    .input-row textarea:focus {
      border-color: #e94560;
    }
    .input-row textarea {
      resize: vertical;
      min-height: 120px;
    }
    .eval-btn {
      padding: 12px 28px;
      border: none;
      border-radius: 8px;
      background: #e94560;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .eval-btn:hover { background: #ff5577; }
    .eval-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .price-input {
      width: 120px !important;
      flex: none !important;
    }

    /* Result */
    .result-card {
      background: #12122a;
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px;
      display: none;
    }
    .result-card.show { display: block; }
    .result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 14px;
    }
    .result-row .key { color: #888; }
    .result-row .val { font-weight: 600; }
    .result-divider {
      border-top: 1px solid #2a2a4a;
      margin: 10px 0;
    }
    .result-summary {
      text-align: center;
      padding: 20px 0;
      position: relative;
    }
    .result-summary .big-value {
      font-size: 36px;
      font-weight: bold;
      color: #4ade80;
    }
    .result-summary .label {
      color: #888;
      font-size: 13px;
      margin-top: 4px;
    }
    .result-summary .ratio {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 8px;
    }
    .ratio.good { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .ratio.ok { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
    .ratio.bad { background: rgba(248, 113, 113, 0.15); color: #f87171; }

    .char-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .char-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .char-tag.S { background: rgba(233, 69, 96, 0.2); color: #e94560; }
    .char-tag.A { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
    .char-tag.B { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
    .char-tag.C { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .char-tag.D { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }
    .char-tag.E { background: rgba(156, 163, 175, 0.1); color: #666; }
    .char-tag .const { color: #aaa; margin-left: 2px; }
    .char-tag .sig { color: #4ade80; }

    /* History */
    .history {
      margin-top: 20px;
    }
    .history-title {
      color: #666;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .history-tag {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 16px;
      background: #12122a;
      border: 1px solid #2a2a4a;
      color: #888;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .history-tag:hover { border-color: #e94560; color: #e0e0e0; }

    .loading {
      text-align: center;
      padding: 20px;
      color: #888;
    }
    .error-msg {
      text-align: center;
      padding: 16px;
      color: #f87171;
      font-size: 14px;
    }

    /* QQ群 & 合规声明 */
    .footer-section {
      margin-top: 40px;
    }
    .qq-group-card {
      background: linear-gradient(135deg, #12122a 0%, #1a1a3a 100%);
      border: 1px solid #2a2a4a;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 16px;
    }
    .qq-group-card .qr-wrapper {
      flex-shrink: 0;
      width: 140px;
      height: 140px;
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid #2a2a4a;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .qq-group-card .qr-wrapper:hover {
      transform: scale(1.05);
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
      background: rgba(0,0,0,0.85);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      cursor: zoom-out;
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
      color: #4ade80;
      margin-bottom: 8px;
    }
    .qq-group-card .info .group-id {
      font-size: 16px;
      color: #e0e0e0;
      margin-bottom: 6px;
    }
    .qq-group-card .info .group-id .num {
      font-weight: bold;
      color: #60a5fa;
      font-size: 18px;
      letter-spacing: 1px;
    }
    .qq-group-card .info .desc {
      font-size: 13px;
      color: #888;
      line-height: 1.6;
    }
    .disclaimer {
      background: rgba(233, 69, 96, 0.05);
      border: 1px solid rgba(233, 69, 96, 0.2);
      border-radius: 10px;
      padding: 16px 20px;
      font-size: 12px;
      color: #999;
      line-height: 1.8;
    }
    .disclaimer .title {
      color: #e94560;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .disclaimer p { margin: 0; }
    .disclaimer p + p { margin-top: 4px; }

    @media (max-width: 600px) {
      .input-row { flex-direction: column; }
      .price-input { width: 100% !important; }
      .qq-group-card { flex-direction: column; text-align: center; }
    }
    /* 估值规则设置入口 */
    .settings-bar {
      display: flex; justify-content: flex-end; margin-bottom: 10px;
    }
    .settings-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border: 1px solid #2a2a4a; border-radius: 8px;
      background: transparent; color: #fbbf24; font-size: 13px; cursor: pointer;
      transition: all 0.2s; font-family: inherit;
    }
    .settings-btn:hover { border-color: #fbbf24; background: rgba(251,191,36,0.08); }
    .settings-btn.customized { color: #4ade80; border-color: #4ade80; }
    .settings-btn.customized:hover { background: rgba(74,222,128,0.08); }
    /* "估值不准"按钮 - 固定在预估价值容器右上角 */
    .adjust-link {
      display: none;
      position: absolute; top: 0; right: 0; z-index: 10;
      padding: 6px 14px; border: 1px solid #fbbf24; border-radius: 8px;
      background: rgba(15,15,35,0.9); color: #fbbf24; font-size: 12px;
      cursor: pointer; transition: all 0.2s; font-family: inherit;
    }
    .adjust-link:hover { background: rgba(251,191,36,0.15); }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <a class="back-home" href="/">← 返回首页</a>
      <h1>鸣潮账号估价助手</h1>
      <div class="subtitle">输入螃蟹网商品编号，或粘贴商品描述进行估价</div>
    </div>

    <!-- 教学视频 -->
    <div class="tutorial-section">
      <div class="tutorial-header" onclick="var f=document.getElementById('tutorial-frame');var a=this.querySelector('.tutorial-arrow');if(f.style.display==='none'){f.style.display='block';a.textContent='▲';this.querySelector('.tutorial-label').textContent='收起教程';}else{f.style.display='none';a.textContent='▼';this.querySelector('.tutorial-label').textContent='展开教程';}">
        <span class="tutorial-icon">▶</span>
        <span class="tutorial-title">新手必看：鸣潮估价工具使用教程</span>
        <span class="tutorial-label" style="margin-left:auto;font-size:12px;color:#8ecdf5;cursor:pointer;">展开教程</span>
        <span class="tutorial-arrow" style="font-size:10px;color:#8ecdf5;">▼</span>
      </div>
      <div id="tutorial-frame" style="display:none;margin-top:12px;">
        <div style="position:relative;padding:56.25% 0 0 0;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
          <iframe src="//player.bilibili.com/player.html?bvid=BV1ueKq6TEgV&autoplay=0&high_quality=1&danmaku=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#666;text-align:center;">
          <a href="https://www.bilibili.com/video/BV1ueKq6TEgV/" target="_blank" style="color:#8ecdf5;text-decoration:none;">在B站观看完整视频 →</a>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn active" id="tab-lookup" onclick="switchTab('lookup')">按编号查询</button>
      <button class="tab-btn" id="tab-paste" onclick="switchTab('paste')">粘贴描述估价</button>
    </div>

    <!-- 估值规则设置入口 -->
    <div class="settings-bar">
      <button class="settings-btn" id="settings-btn" onclick="openValueSettings(reevaluateAfterSettings)">估值规则设置</button>
    </div>

    <!-- 按编号查询 -->
    <div class="input-card" id="panel-lookup">
      <div class="input-row">
        <input type="text" id="product-id" placeholder="输入商品编号，如 MEBNB9606" onkeydown="if(event.key==='Enter')doLookup()" />
        <button class="eval-btn" id="lookup-btn" onclick="doLookup()">估价</button>
      </div>
    </div>

    <!-- 粘贴描述估价 -->
    <div class="input-card" id="panel-paste" style="display:none;">
      <div class="input-row" style="flex-direction:column;gap:12px;">
        <textarea id="eval-text" placeholder="粘贴螃蟹网商品描述文本（包含角色、命座、武器、资源等信息）"></textarea>
        <div class="input-row">
          <input type="number" class="price-input" id="eval-price" placeholder="标价(元)" min="0" />
          <button class="eval-btn" id="eval-btn" onclick="doEvaluate()">估价</button>
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <div class="result-card" id="result">
      <div class="result-summary" id="result-summary"></div>
      <div class="result-divider"></div>
      <div id="result-details"></div>
      <div class="result-divider"></div>
      <div id="result-chars"></div>
      <div class="result-divider"></div>
      <div id="result-resources"></div>
    </div>

    <!-- Loading/Error -->
    <div id="status-msg"></div>

    <!-- History -->
    <div class="history" id="history-section" style="display:none;">
      <div class="history-title">最近查询</div>
      <div class="history-tags" id="history-tags"></div>
    </div>

    <!-- QQ群 & 合规声明 -->
    <div class="footer-section">
      <div class="qq-group-card">
        <div class="qr-wrapper">
          <img src="/public/qq-group.jpg" alt="QQ群二维码" />
        </div>
        <div class="info">
          <h3>咕嘎鸣潮估价群</h3>
          <div class="group-id">群号：<span class="num">1064412729</span></div>
          <div class="desc">扫码加入QQ群，交流鸣潮账号估价心得，获取最新行情动态</div>
        </div>
      </div>
      <div class="disclaimer">
        <div class="title">合规声明</div>
        <p>本工具仅提供游戏账号行情数据测算参考，不支持、不引导任何账号买卖、转让行为。</p>
        <p>《鸣潮》官方禁止账号交易，所有账号交易产生封禁、被骗等损失由用户自行承担。</p>
        <p>本站不收集任何游戏账号密码、实名隐私信息，数据仅本地临时解析。</p>
      </div>
    </div>
  </div>

  <!-- 图片放大遮罩层 -->
  <div class="img-overlay" id="img-overlay">
    <img src="/public/qq-group.jpg" alt="QQ群二维码" />
  </div>

  <script src="/public/value-settings.js"></script>
  <script>
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
    // 页面加载后初始化按钮状态
    (function(){ updateSettingsBtnState(); })();

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
      document.getElementById('panel-lookup').style.display = tab === 'lookup' ? '' : 'none';
      document.getElementById('panel-paste').style.display = tab === 'paste' ? '' : 'none';
      // 清空结果
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '';
    }

    // ============================================================
    // 按编号查询
    // ============================================================
    async function doLookup() {
      const productId = document.getElementById('product-id').value.trim();
      if (!productId) { alert('请输入商品编号'); return; }
      lastLookupId = productId;

      const btn = document.getElementById('lookup-btn');
      btn.disabled = true; btn.textContent = '查询中...';
      document.getElementById('result').classList.remove('show');
      document.getElementById('status-msg').innerHTML = '<div class="loading">正在查询商品信息...</div>';

      try {
        const customWeights = (typeof getSavedWeights === 'function') ? getSavedWeights() : null;
        const resp = await fetch('/api/x9k2-find', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, customWeights }),
        });
        const result = await resp.json();
        document.getElementById('status-msg').innerHTML = '';

        if (!result.success) {
          const isTimeout = result.error && result.error.includes('超时');
          const errorHtml = '<div class="error-msg">' + (result.error || '查询失败') + '</div>';
          if (isTimeout) {
            document.getElementById('status-msg').innerHTML = errorHtml +
              '<div style="text-align:center;margin-top:8px;"><button class="eval-btn" onclick="switchTab(\\'paste\\')">切换到粘贴描述估价</button></div>';
          } else {
            document.getElementById('status-msg').innerHTML = errorHtml;
          }
          return;
        }

        showResult(result.data);
        saveHistory(productId, result.data);
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
        const customWeights = (typeof getSavedWeights === 'function') ? getSavedWeights() : null;
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
      const ratioText = d.costPerformance >= 0 ? '+' + d.costPerformance + '%' : d.costPerformance + '%';
      let summaryHtml = '';
      summaryHtml += '<button class="adjust-link" id="adjust-link" onclick="openValueSettings(reevaluateAfterSettings)">估值不准？修改规则</button>';
      summaryHtml += '<div class="big-value">' + d.estimatedValue + ' 元</div>';
      summaryHtml += '<div class="label">预估价值</div>';
      if (d.price && d.price > 0) {
        summaryHtml += '<div class="ratio ' + ratioClass + '">性价比 ' + ratioText + ' (标价' + d.price + '元)</div>';
      }
      document.getElementById('result-summary').innerHTML = summaryHtml;

      // 明细
      const det = d.details;
      let detailHtml = '';
      detailHtml += resultRow('角色价值', det.characterValue + ' 元', '#aaa');
      detailHtml += resultRow('满命溢价', det.c6Premium + ' 元', '#aaa');
      detailHtml += resultRow('配队溢价', det.teamPremium + ' 元', '#aaa');
      detailHtml += resultRow('抽数价值', (det.pullValue || 0) + ' 元' + (d.info && d.info.pulls ? '（' + d.info.pulls + '抽）' : ''), '#aaa');
      detailHtml += resultRow('资源价值', det.resourceValue + ' 元', '#aaa');
      detailHtml += resultRow('黄数系数', 'x' + det.yellowMultiplier, '#aaa');
      document.getElementById('result-details').innerHTML = detailHtml;

      // 角色标签
      let charHtml = '<div style="color:#888;font-size:12px;margin-bottom:4px;">角色明细</div><div class="char-tags">';
      if (det.characters && det.characters.length > 0) {
        det.characters.forEach(c => {
          const constStr = c.const === 6 ? '满命' : c.const + '命';
          const sigStr = c.hasSig ? ' <span class="sig">+专武</span>' : '';
          charHtml += '<span class="char-tag ' + c.tier + '">' + constStr + ' ' + c.name + sigStr + ' (' + c.value + '元)</span>';
        });
      } else {
        charHtml += '<span style="color:#666;font-size:12px;">未识别到角色</span>';
      }
      charHtml += '</div>';
      document.getElementById('result-chars').innerHTML = charHtml;

      // 资源
      const info = d.info || {};
      let resHtml = '';
      resHtml += resultRow('星声', info.starSounds || 0, '#666');
      resHtml += resultRow('月相', info.moonPhases || 0, '#666');
      resHtml += resultRow('余波珊瑚', info.coral || 0, '#666');
      resHtml += resultRow('浮金波纹', info.goldenRipples || 0, '#666');
      resHtml += resultRow('铸潮波纹', info.tideRipples || 0, '#666');
      resHtml += resultRow('服饰', (info.outfits || 0) + ' 件', '#666');
      resHtml += resultRow('黄数', info.yellowCount || 0, '#666');
      document.getElementById('result-resources').innerHTML = resHtml;

      document.getElementById('result').classList.add('show');
      // 显示"估值不准"按钮
      const adjustBtn = document.getElementById('adjust-link');
      if (adjustBtn) adjustBtn.style.display = 'inline-block';
    }

    function resultRow(key, val, color) {
      return '<div class="result-row"><span class="key">' + key + '</span><span class="val" style="color:' + (color || '#e0e0e0') + ';">' + val + '</span></div>';
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
        html += '<span class="history-tag" onclick="loadHistory(\\'' + h.id + '\\')">' + h.id + ' (' + ratioText + ')</span>';
      });
      document.getElementById('history-tags').innerHTML = html;
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
  </script>
</body>
</html>`;
}

module.exports = getPageHTML;
