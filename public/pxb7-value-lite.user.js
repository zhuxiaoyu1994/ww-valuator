// ==UserScript==
// @name         页面估价助手
// @namespace    pxb7-value-lite
// @version      1.4.0
// @description  在螃蟹网鸣潮商品列表页一键显示每个账号的估值与性价比（估值由服务器计算，脚本不含任何算法与规则）
// @author       You
// @homepageURL  https://www.youxigujia.cn/lite
// @downloadURL  https://www.youxigujia.cn/pxb7-value-lite.user.js
// @updateURL    https://www.youxigujia.cn/pxb7-value-lite.user.js
// @match        https://www.pxb7.com/buy/10302/*
// @match        https://www.pxb7.com/buy/10302
// @grant        GM_xmlhttpRequest
// @connect      api-pc.pxb7.com
// @connect      www.youxigujia.cn
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ===== 配置 =====
  const EVAL_API = 'https://www.youxigujia.cn/api/page-eval';
  const GAME = 'wuwa';
  const DETAIL_API = 'https://api-pc.pxb7.com/api/product/web/product/detailPost';
  const KEY_STORE = 'pxl_eval_key';

  const CHUNK_SIZE = 20;    // 每批提交的商品数
  const CONCURRENCY = 2;    // 详情接口并发
  const GAP_MS = 300;       // 批间隔，分散请求频率
  const HOT_RATIO = 30;     // 性价比达到该值(%)的卡片加高亮标记

  // ---------- 密钥：首次运行手动输入，存 localStorage，点「密钥」按钮可随时更换 ----------
  function getKey() {
    try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; }
  }

  function askKey() {
    const input = prompt('请输入估价密钥（由站长发放，形如 pxb7_xxxxxxxx）：', getKey());
    if (input === null) return null;
    const v = input.trim();
    if (!v) { alert('密钥不能为空'); return null; }
    try { localStorage.setItem(KEY_STORE, v); } catch (e) {}
    return v;
  }

  let evalKey = getKey();

  let active = false;
  let running = false;
  const queue = [];
  let done = 0;
  let total = 0;
  let failedCount = 0;
  let observer = null;
  let scanTimer = null;
  let sig = '';
  const detailCache = new Map();

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function ratioColor(ratio) {
    if (ratio > 20) return '#16a34a';
    if (ratio > 0) return '#eab308';
    return '#ef4444';
  }

  // ---------- 样式与按钮 ----------
  const style = document.createElement('style');
  style.textContent = [
    '.pxl-badge{position:absolute;top:8px;right:8px;z-index:10;display:flex;flex-direction:column;',
    'align-items:flex-end;gap:1px;padding:5px 9px;border-radius:8px;color:#fff;font-size:11px;',
    'font-weight:600;line-height:1.4;text-align:right;box-shadow:0 2px 8px rgba(0,0,0,.25);user-select:none;}',
    '.pxl-badge .pxl-val{font-size:15px;font-weight:800;line-height:1.2;}',
    '.pxl-badge .pxl-row{font-size:10.5px;opacity:.95;white-space:nowrap;}',
    '.pxl-res{position:absolute;top:8px;left:8px;z-index:10;padding:4px 9px;border-radius:8px;color:#fff;',
    'font-size:10.5px;font-weight:600;line-height:1.4;white-space:nowrap;',
    'box-shadow:0 2px 8px rgba(0,0,0,.25);user-select:none;}',
    '.pxl-res b{font-weight:800;}',
    '.pxl-btns{position:fixed;right:20px;bottom:20px;z-index:2147483646;display:flex;gap:8px;align-items:center;}',
    '.pxl-btns button{padding:8px 14px;border-radius:20px;border:none;cursor:pointer;font-size:13px;',
    'font-weight:600;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.3);}',
    '.pxl-toggle{background:#e11d48;}',
    '.pxl-toggle.on{background:#16a34a;}',
    '.pxl-key{background:#475569;}',
    '.pxl-key.set{background:#0f766e;}',
    '.pxl-hot{outline:2px solid #16a34a;outline-offset:1px;box-shadow:0 0 12px rgba(22,163,74,.45);}'
  ].join('');
  document.head.appendChild(style);

  const btnWrap = document.createElement('div');
  btnWrap.className = 'pxl-btns';

  const keyBtn = document.createElement('button');
  keyBtn.className = 'pxl-key';
  keyBtn.textContent = '密钥';
  keyBtn.title = '点击设置或更换估价密钥';
  keyBtn.addEventListener('click', function () {
    const v = askKey();
    if (v) {
      evalKey = v;
      refreshKeyBtn();
      alert('密钥已保存' + (active ? '。点「关闭估价」再重新开启即可生效。' : '。'));
    }
  });

  const btn = document.createElement('button');
  btn.className = 'pxl-toggle';
  btn.textContent = '显示估价';
  btn.title = '点击开启或关闭估价';
  btn.addEventListener('click', function () { if (active) stop(); else start(); });

  btnWrap.appendChild(keyBtn);
  btnWrap.appendChild(btn);
  document.body.appendChild(btnWrap);

  function refreshKeyBtn() {
    keyBtn.classList.toggle('set', !!evalKey);
    keyBtn.textContent = evalKey ? '密钥 ✓' : '密钥';
  }

  function setBtnText(t) { btn.textContent = t; }

  refreshKeyBtn();

  // ---------- 读取页面商品卡片 ----------
  function collectCards(cards) {
    const items = [];
    for (const card of cards) {
      const productId = card.getAttribute('productid');
      if (!productId) continue;
      const titleEl = card.querySelector('.smallCardTitle');

      let price = 0;
      if (titleEl) {
        const priceAttr = titleEl.getAttribute('price');
        if (priceAttr) price = Math.round(parseInt(priceAttr, 10) / 100);
        const promo = titleEl.getAttribute('seckillprice') || titleEl.getAttribute('activityprice');
        if (promo) price = Math.round(parseInt(promo, 10) / 100);
      }
      if (price <= 0) {
        const spans = card.querySelectorAll('span, div');
        for (const s of spans) {
          const m = s.textContent.trim().match(/[￥¥]\s*(\d[\d,，]+)/);
          if (m) {
            const n = parseInt(m[1].replace(/[,，\s]/g, ''), 10);
            if (!isNaN(n) && n > 0) { price = n; break; }
          }
        }
      }

      let desc = titleEl ? titleEl.textContent.trim() : '';
      if (!desc) {
        const descEl = card.querySelector('.text-Medium') || card.querySelector('[class*="text-Medium"]');
        if (descEl) desc = descEl.textContent.trim();
      }
      if (!desc) continue;

      items.push({ productId: String(productId), price: price, desc: desc, card: card });
    }
    return items;
  }

  // ---------- 拉取商品详情（拿完整描述与真实价格） ----------
  // 优先使用页面内 XHR，它与站点自身的请求方式一致，可沿用当前页面已有的会话状态；
  // 该方式不可用时再依次回退到 fetch 与 GM 请求，尽可能取到完整描述，
  // 避免只拿到列表页的截断文本导致估值偏低。
  function isChallengeHtml(text) {
    return typeof text === 'string' && (text.indexOf('aliyun_waf') >= 0 || text.indexOf('_waf_') >= 0);
  }

  function xhrDetail(productId) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', DETAIL_API, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
      xhr.withCredentials = true;
      xhr.timeout = 15000;
      xhr.onload = function () {
        var ct = xhr.getResponseHeader('content-type') || '';
        if (ct.indexOf('json') >= 0) {
          try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(new Error('JSON解析失败')); }
          return;
        }
        reject(new Error(isChallengeHtml(xhr.responseText) ? '接口校验未通过' : '返回非JSON'));
      };
      xhr.onerror = function () { reject(new Error('网络错误')); };
      xhr.ontimeout = function () { reject(new Error('超时')); };
      try { xhr.send(JSON.stringify({ productId: productId })); } catch (e) { reject(e); }
    });
  }

  function fetchDetailViaFetch(productId) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 15000);
    return fetch(DETAIL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
      body: JSON.stringify({ productId: productId }),
      credentials: 'include',
      signal: controller.signal
    }).then(function (resp) {
      clearTimeout(timer);
      var ct = resp.headers.get('content-type') || '';
      if (ct.indexOf('json') < 0) throw new Error('返回非JSON');
      return resp.json();
    }, function (e) { clearTimeout(timer); throw e; });
  }

  function gmDetail(productId) {
    return new Promise(function (resolve, reject) {
      if (typeof GM_xmlhttpRequest !== 'function') { reject(new Error('GM 不可用')); return; }
      try {
        GM_xmlhttpRequest({
          method: 'POST',
          url: DETAIL_API,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Referer': location.href,
            'Origin': location.origin
          },
          data: JSON.stringify({ productId: productId }),
          anonymous: false,
          timeout: 15000,
          onload: function (r) {
            try { resolve(JSON.parse(r.responseText)); }
            catch (e) { reject(new Error(isChallengeHtml(r.responseText) ? '接口校验未通过' : '返回非JSON')); }
          },
          onerror: function () { reject(new Error('网络错误')); },
          ontimeout: function () { reject(new Error('超时')); }
        });
      } catch (e) { reject(e); }
    });
  }

  async function fetchDetail(productId) {
    try { var d1 = await xhrDetail(productId); if (d1) return d1; } catch (e) {}
    try { var d2 = await fetchDetailViaFetch(productId); if (d2) return d2; } catch (e) {}
    try { var d3 = await gmDetail(productId); if (d3) return d3; } catch (e) {}
    return null;
  }

  // ---------- 调用服务端估值接口（只取最终估值与性价比） ----------
  // 返回 { data, error, authError }：error 非空表示本次失败，authError 为 true 表示密钥问题
  function callEvalApi(items) {
    return new Promise(function (resolve) {
      if (typeof GM_xmlhttpRequest !== 'function') {
        resolve({ data: null, error: 'GM_xmlhttpRequest 不可用，请检查油猴脚本权限', authError: false });
        return;
      }
      try {
        GM_xmlhttpRequest({
          method: 'POST',
          url: EVAL_API,
          headers: { 'Content-Type': 'application/json', 'x-eval-key': evalKey },
          data: JSON.stringify({ game: GAME, items: items }),
          timeout: 20000,
          onload: function (r) {
            let j = null;
            try { j = JSON.parse(r.responseText); } catch (e) {}
            if (r.status === 200 && j && j.success) {
              resolve({ data: j.data, error: null, authError: false });
              return;
            }
            if (r.status === 401) {
              resolve({ data: null, error: (j && j.error) || '密钥无效', authError: true });
              return;
            }
            const detail = (j && j.error) ? '：' + j.error : '';
            resolve({ data: null, error: '接口异常（HTTP ' + r.status + '）' + detail, authError: false });
          },
          onerror: function () { resolve({ data: null, error: '网络请求失败，无法连接估价服务器', authError: false }); },
          ontimeout: function () { resolve({ data: null, error: '请求估价服务器超时', authError: false }); }
        });
      } catch (e) {
        resolve({ data: null, error: '请求发送失败：' + (e && e.message ? e.message : e), authError: false });
      }
    });
  }

  // ---------- 注入角标 ----------
  function injectBadge(item, r) {
    item.card.dataset.pxl = 'done';
    if (getComputedStyle(item.card).position === 'static') item.card.style.position = 'relative';

    let badge = item.card.querySelector('.pxl-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pxl-badge';
      item.card.appendChild(badge);
    }
    const value = r.value;
    const ratio = r.ratio;
    const shownRatio = Math.round(ratio * 10) / 10;
    badge.style.background = ratioColor(ratio);

    // 有效金直接显示在卡片上，不用悬停即可看到
    const rows = [
      '<span class="pxl-val">¥' + Math.round(value) + '</span>',
      '<span class="pxl-row">性价比 ' + (shownRatio > 0 ? '+' : '') + shownRatio + '%</span>'
    ];
    if (r.effGold != null) rows.push('<span class="pxl-row">有效金 ' + r.effGold + '</span>');
    badge.innerHTML = rows.join('');
    badge.title = '标价: ¥' + item.price;

    // 抽数／皮肤／车架放左上角，与右上角的价值角标分开，避免挤成一大块
    let res = item.card.querySelector('.pxl-res');
    if (!res) {
      res = document.createElement('div');
      res.className = 'pxl-res';
      item.card.appendChild(res);
    }
    res.innerHTML = '抽数 <b>' + (r.pulls || 0) + '</b> · 皮肤 <b>' + (r.outfits || 0) +
      '</b> · 车架 <b>' + (r.motos || 0) + '</b>';
    res.style.background = ratioColor(ratio);

    // 高性价比卡片加绿色描边，方便在一屏里快速定位
    item.card.classList.toggle('pxl-hot', ratio >= HOT_RATIO);
  }

  function injectPending(item) {
    if (item.card.querySelector('.pxl-badge')) return;
    if (getComputedStyle(item.card).position === 'static') item.card.style.position = 'relative';
    const badge = document.createElement('div');
    badge.className = 'pxl-badge';
    badge.style.background = '#6b7280';
    badge.textContent = '估值中…';
    item.card.appendChild(badge);
  }

  // 详情没拿到时不显示金额，避免用户把截断文本算出的低估值当成真实估值
  function injectFailedBadge(item) {
    item.card.dataset.pxl = 'done';
    if (getComputedStyle(item.card).position === 'static') item.card.style.position = 'relative';
    let badge = item.card.querySelector('.pxl-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pxl-badge';
      item.card.appendChild(badge);
    }
    badge.style.background = '#4b5563';
    badge.title = '未能获取该商品的完整描述，无法准确估值。\n请刷新页面重试。';
    badge.innerHTML = '<span class="pxl-val">—</span><span class="pxl-row">详情获取失败</span>';
    // 详情没拿到就没有可信的资源数据，清掉可能残留的左上角计数
    const res = item.card.querySelector('.pxl-res');
    if (res) res.remove();
  }

  // ---------- 队列处理：拉详情 → 批量调接口 → 贴角标 ----------
  async function processQueue() {
    if (running) return;
    running = true;
    try {
      while (active && queue.length > 0) {
        const chunk = queue.splice(0, CHUNK_SIZE);
        const payload = [];
        const failed = [];

        for (let i = 0; i < chunk.length; i += CONCURRENCY) {
          const slice = chunk.slice(i, i + CONCURRENCY);
          await Promise.all(slice.map(async function (item) {
            let cached = detailCache.get(item.productId);
            if (!cached) {
              cached = { showTitle: '', price: 0, ok: false };
              const data = await fetchDetail(item.productId);
              if (data && data.success && data.data) {
                cached.showTitle = data.data.showTitle || data.data.title || '';
                cached.price = (data.data.price || 0) / 100;
                cached.ok = !!cached.showTitle;
              }
              // 只缓存成功结果：失败不缓存，重新开启估价时会重新尝试
              if (cached.ok) detailCache.set(item.productId, cached);
            }
            // 详情没拿到时不能用卡片截断文本凑数，否则估值会明显偏低（少算武器/资源段）
            if (!cached.ok) { failed.push(item); return; }
            let desc = item.desc;
            let price = item.price;
            if (cached.showTitle && cached.showTitle.length > desc.length) desc = cached.showTitle;
            if (cached.price > 0) price = cached.price;
            item.price = price;
            payload.push({ productId: item.productId, desc: desc, price: price });
          }));
          if (i + CONCURRENCY < chunk.length) await sleep(GAP_MS);
        }

        let resp = null;
        if (payload.length > 0) {
          resp = await callEvalApi(payload);
          if (resp.error) {
            stop();
            if (resp.authError) {
              alert('估价密钥' + resp.error + '。\n请向站长确认后重新输入密钥。');
              const v = askKey();
              if (v) { evalKey = v; refreshKeyBtn(); alert('密钥已保存，点「显示估价」重新开始。'); }
            } else {
              alert('估价失败：' + resp.error);
            }
            return;
          }
        }

        if (resp && resp.data) {
          for (const item of chunk) {
            const r = resp.data[item.productId];
            if (r) injectBadge(item, r);
          }
        }
        for (const item of failed) injectFailedBadge(item);
        failedCount += failed.length;
        done += chunk.length;
        updateProgress();
        if (active && queue.length > 0) await sleep(GAP_MS);
      }
    } catch (e) {
      stop();
      alert('估价中断：' + (e && e.message ? e.message : e));
    } finally {
      running = false;
      updateProgress();
    }
  }

  // ---------- 扫描卡片 ----------
  function scan() {
    const cards = document.querySelectorAll('div[productid]');
    if (cards.length === 0) return 0;
    const s = cards.length + '|' + (cards[0].getAttribute('productid') || '') + '|' +
      (cards[cards.length - 1].getAttribute('productid') || '');
    if (s === sig) return 0;
    sig = s;

    let n = 0;
    for (const item of collectCards(cards)) {
      if (item.card.dataset.pxl === 'pending' || item.card.dataset.pxl === 'done') continue;
      item.card.dataset.pxl = 'pending';
      injectPending(item);
      queue.push(item);
      total++;
      n++;
    }
    if (n > 0) processQueue();
    updateProgress();
    return n;
  }

  function scheduleScan() {
    if (!active || scanTimer) return;
    scanTimer = setTimeout(function () {
      scanTimer = null;
      if (active) scan();
    }, 400);
  }

  function updateProgress() {
    if (!active) { btn.classList.remove('on'); setBtnText('显示估价'); return; }
    btn.classList.add('on');
    if (running || queue.length > 0) setBtnText('估价中 ' + done + '/' + total);
    else setBtnText(failedCount > 0 ? '关闭估价（' + failedCount + ' 失败）' : '关闭估价');
  }

  function start() {
    if (!evalKey) {
      const v = askKey();
      if (!v) return;
      evalKey = v;
      refreshKeyBtn();
    }
    active = true;
    sig = '';
    done = 0;
    total = 0;
    failedCount = 0;
    const n = scan();
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    updateProgress();
    if (n === 0) setBtnText('未发现商品');
  }

  function stop() {
    active = false;
    sig = '';
    queue.length = 0;
    if (observer) { observer.disconnect(); observer = null; }
    if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
    document.querySelectorAll('.pxl-badge, .pxl-res').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.pxl-hot').forEach(function (c) { c.classList.remove('pxl-hot'); });
    document.querySelectorAll('div[productid][data-pxl]').forEach(function (c) { delete c.dataset.pxl; });
    updateProgress();
  }
})();
