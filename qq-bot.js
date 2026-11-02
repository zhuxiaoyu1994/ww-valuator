/**
 * QQ 官方机器人 WebHook 接入模块（v4.11.0）
 *
 * 功能：群友 @机器人 发送鸣潮商品描述（可带标价），机器人回复估值/性价比/概要。
 * 仅支持鸣潮（wuwa）估值，走服务端内置引擎，不对外泄露算法参数。
 *
 * 接入方式：QQ 开放平台（q.qq.com）机器人 → 回调地址配置为本模块挂载的端点。
 * 支持：
 *  - 回调地址验证（op=13 plainToken challenge，HMAC-SHA256 签名回显）
 *  - Ed25519 请求验签（X-Signature-Ed25519 / X-Signature-Timestamp）
 *  - AES-256-GCM 加密载荷（配置了 QQ_BOT_ENCRYPT_KEY 时自动解密）
 *  - 群聊 GROUP_AT_MESSAGE_CREATE / 私聊 C2C_MESSAGE_CREATE
 *  - 被动回复（带 msg_id，5分钟窗口内）
 *  - 按用户限频：最小间隔 5 秒，每小时最多 30 次
 *
 * 需要的环境变量：
 *  - QQ_BOT_APP_ID      机器人 AppID（必填）
 *  - QQ_BOT_SECRET      机器人 AppSecret（必填）
 *  - QQ_BOT_PUBLIC_KEY  机器人 Ed25519 公钥（64位HEX，必填）
 *  - QQ_BOT_ENCRYPT_KEY 消息加密密钥（可选，官方后台配置了加密才需要）
 */

const crypto = require('crypto');

const API_BASE = 'https://api.sgroup.qq.com';
const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';

// 每用户限频：最小间隔 5 秒，每小时最多 30 次
const RATE_MIN_GAP_MS = 5 * 1000;
const RATE_HOURLY_CAP = 30;

// ── 工具函数 ────────────────────────────────────────────────

function hexToBuf(hex) {
  return Buffer.from(hex, 'hex');
}

/** Ed25519 工具函数见下方：密钥对由 AppSecret 派生（官方 sign.html 规定），无需控制台公钥 */

/** 回调地址验证挑战（新版协议）：用 AppSecret 派生 Ed25519 私钥，对 event_ts+plain_token 签名。
 *  Go 参考: seed=secret 重复填充到32字节 → ed25519.GenerateKey → Sign(event_ts + plain_token) */
function deriveSeed(secret) {
  let seed = Buffer.from(secret, 'utf8');
  while (seed.length < 32) seed = Buffer.concat([seed, seed]);
  return seed.subarray(0, 32);
}

function signValidation(appSecret, eventTs, plainToken) {
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), deriveSeed(appSecret)]);
  const key = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  return crypto.sign(null, Buffer.from(eventTs + plainToken, 'utf8'), key).toString('hex');
}

/** 事件推送验签用：从 AppSecret 派生 Ed25519 公钥（官方 sign.html：公钥私钥均由 Secret 派生，
 *  控制台不提供公钥，开发者自行计算） */
function derivePublicKey(appSecret) {
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), deriveSeed(appSecret)]);
  const priv = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  return crypto.createPublicKey(priv);
}

/** 验证事件推送签名：msg = timestamp + rawBody，签名取自 X-Signature-Ed25519（hex） */
function verifyEventSignature(publicKeyObj, timestamp, rawBody, sigHex) {
  try {
    const sig = Buffer.from(sigHex, 'hex');
    if (sig.length !== 64) return false;
    const msg = Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]);
    return crypto.verify(null, msg, publicKeyObj, sig);
  } catch (e) {
    console.error('[QQ机器人] 事件验签异常:', e.message);
    return false;
  }
}

/** AES-256-GCM 解密加密推送：hex = iv(12B) + authTag(16B) + 密文 */
function decryptPayload(encryptKeyHex, encryptedHex) {
  const buf = Buffer.from(encryptedHex, 'hex');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const cipherText = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', hexToBuf(encryptKeyHex), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
}

// ── access_token 管理 ───────────────────────────────────────

let cachedToken = { token: '', expiresAt: 0 };
let tokenPromise = null;

function getAccessToken(appId, appSecret) {
  if (cachedToken.token && Date.now() < cachedToken.expiresAt - 60 * 1000) {
    return Promise.resolve(cachedToken.token);
  }
  if (tokenPromise) return tokenPromise;
  tokenPromise = fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, clientSecret: appSecret }),
  })
    .then(r => r.json())
    .then(data => {
      if (!data.access_token) throw new Error('获取access_token失败: ' + JSON.stringify(data).substring(0, 200));
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (parseInt(data.expires_in, 10) || 7200) * 1000,
      };
      return cachedToken.token;
    })
    .finally(() => { tokenPromise = null; });
  return tokenPromise;
}

// 被动回复的 msg_seq 必须在同一 msg_id 下递增，重复的 seq 会被 QQ 去重拒绝（错误码 40054005）
const msgSeqMap = new Map(); // msgId -> 已使用的最大 seq

/** 发送被动回复（群聊/私聊） */
function nextMsgSeq(msgId) {
  if (!msgId) return 1;
  const seq = (msgSeqMap.get(msgId) || 0) + 1;
  msgSeqMap.set(msgId, seq);
  if (msgSeqMap.size > 5000) msgSeqMap.clear();
  return seq;
}

async function sendReply(cfg, openid, isGroup, content, msgId) {
  const token = await getAccessToken(cfg.appId, cfg.appSecret);
  const url = isGroup
    ? API_BASE + '/v2/groups/' + encodeURIComponent(openid) + '/messages'
    : API_BASE + '/v2/users/' + encodeURIComponent(openid) + '/messages';
  const seq = nextMsgSeq(msgId);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'QQBot ' + token,
    },
    body: JSON.stringify({
      content: content,
      msg_type: 0,
      msg_id: msgId,
      msg_seq: seq,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || (data.retcode && data.retcode !== 0)) {
    throw new Error('回复消息失败 HTTP ' + resp.status + ' ' + JSON.stringify(data).substring(0, 200));
  }
}

/** 卡片回复：先 multipart 上传 PNG 富媒体拿 file_info，再以 msg_type=7 图片消息发出 */
async function sendCardReply(cfg, openid, isGroup, png, msgId) {
  const token = await getAccessToken(cfg.appId, cfg.appSecret);
  const base = isGroup
    ? API_BASE + '/v2/groups/' + encodeURIComponent(openid)
    : API_BASE + '/v2/users/' + encodeURIComponent(openid);
  const form = new FormData();
  form.append('file_type', '1');
  form.append('srv_send_msg', 'false');
  form.append('file_data', new Blob([png], { type: 'image/png' }), 'card.png');
  const up = await fetch(base + '/files', {
    method: 'POST',
    headers: { 'Authorization': 'QQBot ' + token },
    body: form,
  });
  const ud = await up.json().catch(() => ({}));
  if (!up.ok || !ud.file_info) {
    throw new Error('上传富媒体失败 HTTP ' + up.status + ' ' + JSON.stringify(ud).substring(0, 150));
  }
  const resp = await fetch(base + '/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'QQBot ' + token,
    },
    body: JSON.stringify({
      content: '',
      msg_type: 7,
      msg_id: msgId,
      msg_seq: nextMsgSeq(msgId),
      media: { file_info: ud.file_info },
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || (data.retcode && data.retcode !== 0)) {
    throw new Error('发送图片消息失败 HTTP ' + resp.status + ' ' + JSON.stringify(data).substring(0, 150));
  }
}

// ── 消息解析与回复格式化 ─────────────────────────────────────

const HELP_TEXT = '🤖 鸣潮账号估价\n\n用法：@机器人 + 商品描述 +（可选）标价\n示例：\n· @机器人 今汐满命 洛可可满命 长离1命 金18 抽卡剩200发 标价3500\n· @机器人 维里奈0命 延奏金3 ¥1200\n\n标价支持写法：标价3500 / ¥3500 / 3500元\n命座范围 0~6（满命）\n🧩 小游戏：发「开始猜价」来一局，「我叫昵称」上猜价榜单\n⚠️ 估值仅供参考，以实际成交为准';

const TEASE_TEXTS = [
  '🙄 调戏无效，白眼已翻。命座上限就是 6（满命），小数命、负数命、π 命在这个世界都不存在。\n正经描述，正经估价～',
  '😒 检测到整活成分 ≥ 99%。命座 0~6，请按地球规则发描述。',
  '🙄 命座不是浮点数，也不是负数，更不是圆周率。再来一次，正经点。',
  '😴 这号是平行世界的吧？本机器人只估这个世界的号。命座 0~6，谢谢配合。',
];
// 调戏检测：明显不存在的命座写法（1.3命 / -99命 / π命 / 99命……）
// 返回 null=正常；'decimal'/'negative'/'letter'=无效写法；'over:N'=整数超过命座上限 N
function detectInvalidConst(text) {
  if (!text) return null;
  if (/\d+\.\d+\s*命/.test(text)) return 'decimal';              // 小数命：1.3命
  if (/-\s*\d+\s*命/.test(text)) return 'negative';              // 负数命：-99命
  if (/[A-Za-z\u0370-\u03FF\u2100-\u214F]\s*命/.test(text)) return 'letter'; // 字母/希腊字母命：π命
  for (const m of text.matchAll(/(\d+)\s*命/g)) {                // 整数超上限：99命
    if (parseInt(m[1], 10) > 6) return 'over:' + parseInt(m[1], 10);
  }
  return null;
}

// ── 猜价游戏 ────────────────────────────────────────────────
// 题目取自螃蟹网昨日真实成交账号（POST /api/search/product/selectSelledList，无需登录，
// 字段 productId/showTitle/price(分)/payTime），通过 fetchPxb7Api（代理轮询+直连回退）拉取。
// 局状态存 db KV（qq_guess_game），Vercel 多实例共享；30 分钟无人猜中惰性揭晓（serverless 无定时器）。
const GUESS_STATE_KEY = 'qq_guess_game';
const NICK_KEY = 'qq_nicknames';           // openid → 群友自报昵称（「我叫XX」登记）
const GUESS_TOLERANCE = 0.10;              // ±10% 判中
const GUESS_DURATION_MS = 60 * 1000;       // 1 分钟无人猜中自动揭晓
const GUESS_PRODUCT_URL = 'https://www.pxb7.com/product/';  // 拼接 productId + '/1'

function maskPrice(text) {
  return String(text)
    .replace(/[¥￥]\s*\d+(?:\.\d+)?/g, '¥***')
    .replace(/(?:价格|标价|售价|出价|到手价|成交价)[：:]?\s*\d+(?:\.\d+)?/gi, '价：***')
    .replace(/\d+(?:\.\d+)?\s*元/g, '***元');
}

/** 提取标价：仅识别明确的价格写法，避免把描述里的数字（命座/抽数）误当价格 */
function extractPrice(text) {
  const patterns = [
    /(?:价格|标价|售价|出价)\s*[:：]?\s*(\d+(?:\.\d+)?)/,
    /[¥￥]\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*元/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const v = parseFloat(m[1]);
      if (v >= 0 && v <= 9999999) return v;
    }
  }
  return 0;
}

/** 清洗 @ 前缀 */
function stripMention(content, selfOpenid) {
  let t = String(content || '');
  t = t.replace(/<@!?[^>]*>/g, ' ');
  return t.trim();
}

function fmtMoney(v) {
  return '¥' + Math.round(v).toLocaleString('zh-CN');
}

/** 保留最多两位小数，整数不带小数点 */
function fmtValue(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n.toLocaleString('zh-CN') : n.toFixed(2);
}

/**
 * 格式化有效金类数值：有效金是各角色/专武贡献的加权累加值（浮点），
 * 累加会产生 32.999999999999986 这类精度尾巴，展示时四舍五入到最多1位小数
 */
function fmtGold(v) {
  const n = Number(v);
  if (v == null || !isFinite(n)) return '0';
  return String(Math.round(n * 10) / 10);
}

/** 格式化估值回复（对齐网站展示样式：估值+合理区间+核心数据，不做多余赘述） */
function formatReply(result, priceYuan) {
  const d = result.details || {};
  const info = result.info || {};
  const lines = [];
  lines.push('💰 预估价值：' + fmtValue(d.finalValue) + ' 元');
  const pr = d.priceRange;
  if (pr && pr.low > 0 && pr.high > 0) {
    lines.push('📐 合理交易区间：' + fmtValue(pr.low) + ' ~ ' + fmtValue(pr.high) + ' 元');
  }
  lines.push('');
  lines.push('核心数据');
  lines.push('· 五星角色：' + (d.fiveStarChars || 0) + ' 个');
  const weaponCount = (info.weapons || []).length;
  if (weaponCount > 0) lines.push('· 专武：' + weaponCount + ' 把');
  const pulls = (d.pullInfo && d.pullInfo.pulls) || info.pulls || 0;
  if (pulls > 0) lines.push('· 总抽数：' + pulls + ' 抽');
  const yi = d.yellowInfo || {};
  if (yi.totalYellow > 0 || yi.yellowCount > 0) {
    lines.push('· 有效金/限定金/总金数：' + fmtGold(yi.yellowCount) + '/' + fmtGold(yi.limitedYellow) + '/' + fmtGold(yi.totalYellow));
  }
  const teams = (d.matchedTeams || []).map(t => typeof t === 'string' ? t : (t.name || t.label || '')).filter(Boolean);
  if (teams.length > 0) {
    lines.push('· 成型配队：' + teams.slice(0, 8).join('、') + (teams.length > 8 ? ' 等' + teams.length + '队' : ''));
  }
  if (priceYuan > 0) {
    lines.push('');
    lines.push('🏷️ 标价：' + fmtMoney(priceYuan));
    const ratio = result.costPerformance;
    if (ratio != null && isFinite(ratio)) {
      // 引擎的 costPerformance = (估值-标价)/标价×100（已是百分比数值，勿再乘100）；
      // 性价比 = 估值/标价×100 = 100 + costPerformance
      const pct = Math.round((100 + ratio) * 10) / 10;
      lines.push('📊 性价比：' + pct + '%（' + (pct >= 100 ? '估值高于标价' : '估值低于标价') + '）');
    }
    lines.push('🔍 参考差价：' + (d.finalValue - priceYuan >= 0 ? '+' : '') + fmtMoney(d.finalValue - priceYuan));
  }
  lines.push('');
  lines.push('⚠️ 估值仅供参考，以实际成交为准');
  return lines.join('\n');
}

// ── 主处理器工厂 ────────────────────────────────────────────

function createQQBotHandler(opts) {
  const cfg = {
    appId: opts.appId || '',
    appSecret: opts.appSecret || '',
    encryptKey: opts.encryptKey || '',
  };
  const getEngine = opts.getEngine;
  const onLog = opts.onLog || function () {};
  const fetchPxb7 = opts.fetchPxb7 || null;   // server.js 的 fetchPxb7Api（代理轮询拉螃蟹接口）
  const gameDb = opts.db || null;             // db 模块（猜价游戏状态存 KV）
  // 只要求 AppID/Secret：Ed25519 公私钥均由 Secret 派生（官方 sign.html），无需额外公钥配置
  if (!cfg.appId || !cfg.appSecret) {
    const stubWebhook = function (req, res) {
      res.status(503).json({ success: false, error: 'QQ机器人未配置（缺少 QQ_BOT_APP_ID / QQ_BOT_SECRET）' });
    };
    return {
      webhook: stubWebhook,
      getLastDebug: function () { return { note: '未配置 QQ_BOT_APP_ID / QQ_BOT_SECRET' }; },
    };
  }
  const derivedPublicKey = derivePublicKey(cfg.appSecret);

  // 限频表：openid -> [timestamps]
  const rateMap = new Map();
  // 消息幂等去重：QQ 对处理慢的事件会重推（同 msg_id），只处理一次。
  // 之前 msg_seq 固定为 1 时重推的回复被 QQ 去重掩盖；msg_seq 递增修复后重推会发出第二条回复，
  // 因此必须在处理入口按消息 id 去重。
  const handledMsgIds = new Map(); // msgId -> 首次处理时间
  // 调试：记录最后一次 webhook 请求（供 /api/qq-bot-debug 排查回调验证问题）
  let lastDebug = { time: null, path: null, headers: null, bodyHead: null, note: null, status: null };
  let lastError = null;   // 异步处理（回复消息）失败的详情
  let lastReply = null;   // 最近一次回复消息调用的结果（成功也记录）
  function recordDebug(req, note, status) {
    lastDebug = {
      time: new Date().toISOString(),
      path: req.originalUrl,
      headers: {
        'x-signature-ed25519': String(req.headers['x-signature-ed25519'] || '').substring(0, 20) + '...',
        'x-signature-timestamp': req.headers['x-signature-timestamp'] || '',
        'content-type': req.headers['content-type'] || '',
        'user-agent': req.headers['user-agent'] || '',
      },
      bodyHead: JSON.stringify(req.body || {}).substring(0, 600),
      note: note || '',
      status: status || null,
    };
  }
  function rateCheck(openid) {
    const now = Date.now();
    let arr = rateMap.get(openid) || [];
    arr = arr.filter(t => now - t < 3600 * 1000);
    if (arr.length && now - arr[arr.length - 1] < RATE_MIN_GAP_MS) return '太快了，休息几秒再试～';
    if (arr.length >= RATE_HOURLY_CAP) return '本小时估价次数已达上限，请稍后再试～';
    arr.push(now);
    rateMap.set(openid, arr);
    if (rateMap.size > 5000) rateMap.clear();   // 防表无限膨胀
    return null;
  }

  /** 回复并记录结果（成功/失败都进调试端点） */
  async function tryReply(openid, isGroup, content, msgId) {    const t0 = Date.now();
    try {
      await sendReply(cfg, openid, isGroup, content, msgId);
      lastReply = { time: new Date().toISOString(), ok: true, openid: String(openid).substring(0, 10) + '...', group: isGroup, costMs: Date.now() - t0, contentHead: String(content).substring(0, 120) };
    } catch (e) {
      lastReply = { time: new Date().toISOString(), ok: false, openid: String(openid).substring(0, 10) + '...', group: isGroup, costMs: Date.now() - t0, contentHead: String(content).substring(0, 120), error: e.message };
      lastError = { time: new Date().toISOString(), scene: isGroup ? '群消息回复' : '私聊回复', message: e.message, stack: String(e.stack || '').substring(0, 400) };
      throw e;
    }
  }

  // ── 猜价游戏逻辑 ──────────────────────────────────────────

  async function loadGuessState() {
    if (!gameDb) return { active: false };
    try { return (await gameDb.getConfig(GUESS_STATE_KEY)) || { active: false }; }
    catch (e) { return { active: false }; }
  }
  async function saveGuessState(state) {
    if (!gameDb) return;
    try { await gameDb.setConfig(GUESS_STATE_KEY, state); } catch (e) { /* 忽略 */ }
  }
  // 昵称表：QQ 官方机器人 webhook 拿不到群昵称（只有匿名 openid），由群友「我叫XX」自报
  async function loadNicknames() {
    if (!gameDb) return {};
    try { return (await gameDb.getConfig(NICK_KEY)) || {}; }
    catch (e) { return {}; }
  }
  async function saveNickname(member, nick) {
    if (!gameDb) return {};
    let map = {};
    try { map = (await gameDb.getConfig(NICK_KEY)) || {}; } catch (e) { /* 忽略 */ }
    map[member] = nick;
    try { await gameDb.setConfig(NICK_KEY, map); } catch (e) { /* 忽略 */ }
    return map;
  }
  // 展示名：有昵称用昵称，否则退回 openid 尾4位
  function displayName(member, nickMap) {
    const n = nickMap && nickMap[member];
    return n ? n : '...' + String(member).slice(-4);
  }

  // 卡片渲染模块（懒加载；缺依赖/缺字体时返回 null，自动回退纯文本）
  let cardModCache;
  function getCardModule() {
    if (cardModCache !== undefined) return cardModCache;
    try { cardModCache = require('./qq-card'); }
    catch (e) { cardModCache = null; }
    return cardModCache;
  }

  /** 游戏回复统一入口：payload = 字符串 或 {text, card}；群聊且有卡片则发图，失败回退文本 */
  async function replyGame(openid, isGroup, msgId, payload) {
    const p = typeof payload === 'string' ? { text: payload } : (payload || {});
    if (isGroup && p.card) {
      const cardMod = getCardModule();
      if (cardMod) {
        const t0 = Date.now();
        try {
          const png = await cardMod.renderCard(p.card);
          await sendCardReply(cfg, openid, isGroup, png, msgId);
          lastReply = { time: new Date().toISOString(), ok: true, openid: String(openid).substring(0, 10) + '...', group: isGroup, costMs: Date.now() - t0, contentHead: '[图片卡片] ' + String(p.text).substring(0, 100) };
          return;
        } catch (e) {
          lastReply = { time: new Date().toISOString(), ok: false, group: isGroup, costMs: Date.now() - t0, contentHead: '[卡片失败回退文本] ' + String(p.text).substring(0, 90), error: e.message };
        }
      }
    }
    await tryReply(openid, isGroup, p.text, msgId);
  }

  /** 核心数据：用估价引擎解析题目文本，提炼 等级/五星角色/专武/抽数/金数/配队 */
  function extractCoreInfo(title) {
    const out = { items: [], teams: '' };
    try {
      const engine = getEngine('wuwa');
      const r = engine.evaluateWithPrice(title, 0, null);
      const d = r.details || {};
      const info = r.info || {};
      const lv = (title.match(/【?联觉等级】?\s*(\d{1,3})\s*级?/) || title.match(/^(\d{1,3})\s*级/) || [])[1];
      if (lv) out.items.push('等级 ' + lv);
      if (d.fiveStarChars) out.items.push('五星角色 ' + d.fiveStarChars);
      const wc = (info.weapons || []).length;
      if (wc > 0) out.items.push('专武 ' + wc + ' 把');
      const pulls = (d.pullInfo && d.pullInfo.pulls) || info.pulls || 0;
      if (pulls > 0) out.items.push('总抽数 ' + pulls);
      const yi = d.yellowInfo || {};
      if (yi.totalYellow > 0 || yi.yellowCount > 0) {
        out.items.push('金数 ' + fmtGold(yi.yellowCount) + '/' + fmtGold(yi.totalYellow));
      }
      const teams = (d.matchedTeams || []).map(t => typeof t === 'string' ? t : (t.name || t.label || '')).filter(Boolean);
      if (teams.length > 0) out.teams = teams.slice(0, 6).join('、') + (teams.length > 6 ? ' 等' + teams.length + '队' : '');
    } catch (e) { /* 解析失败就不展示核心数据 */ }
    return out;
  }

  /** 出题：从螃蟹网昨日成交清单随机选一个 */
  async function startGuessGame() {
    const prev = await loadGuessState();
    if (prev.active && !prev.revealed) {
      const cnt = Object.keys(prev.guesses || {}).length;
      return '🎮 猜价游戏正在进行中（' + cnt + ' 人已参与）！直接发「猜 4500」参与～\n\n📄 本局题目：\n' + (prev.maskedTitle || '');
    }
    if (!fetchPxb7) return '猜价游戏暂不可用（未配置螃蟹接口）';
    let candidates = [];
    for (let p = 1; p <= 2; p++) {
      try {
        const r = await fetchPxb7('/api/search/product/selectSelledList', { pageIndex: p, pageSize: 100, gameId: '10302' });
        const json = JSON.parse(r.data);
        const list = (json && json.success && Array.isArray(json.data)) ? json.data : [];
        candidates = candidates.concat(list);
        if (list.length < 100) break;
      } catch (e) { break; }
    }
    const pool = candidates.filter(it => {
      const t = String(it.showTitle || '');
      const yuan = Number(it.price) / 100;
      return t.length >= 30 && t.length <= 600 && yuan >= 600 && yuan <= 50000;
    });
    if (pool.length === 0) return '螃蟹网接口暂时不通（可能被风控了），稍后再开一局吧 🙏';
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const masked = maskPrice(String(pick.showTitle));
    const core = extractCoreInfo(masked);
    const state = {
      active: true,
      startedAt: Date.now(),
      product: {
        productId: String(pick.productId),
        priceYuan: Math.round(Number(pick.price)) / 100,
        url: GUESS_PRODUCT_URL + pick.productId + '/1',
      },
      maskedTitle: masked,
      imageUrl: String(pick.mainImageUrl || ''),
      coreInfo: core.items,
      coreTeams: core.teams,
      guesses: {},
    };
    await saveGuessState(state);
    const coreText = core.items.length ? '\n\n📊 核心数据：' + core.items.join(' · ') : '';
    const teamText = core.teams ? '\n👥 成型配队：' + core.teams : '';
    return {
      text: '🎮 猜价游戏开始！\n下面是昨日真实成交的一个鸣潮账号描述，猜猜它的成交价是多少？\n\n' + state.maskedTitle + coreText + teamText + '\n\n📌 发「猜 4500」参与竞猜（可随时修改自己的猜价）\n🏷️ 发「我叫XX」登记昵称，上榜更拉风\n🎯 有人猜进成交价 ±10% 即刻揭晓；1 分钟无人猜中自动揭晓',
      card: { type: 'start', maskedTitle: state.maskedTitle, coreInfo: state.coreInfo, teams: state.coreTeams, imageUrl: state.imageUrl },
    };
  }

  /** 参与竞猜：每人记录最新一次猜价（可修改）；猜进 ±10% 立即揭晓 */
  async function handleGuess(member, val) {
    const st = await loadGuessState();
    if (!st.active || st.revealed) return '现在没有进行中的猜价局～发「开始猜价」来一局！';
    const guess = Math.round(Number(val) * 100) / 100;
    st.guesses = st.guesses || {};
    st.guesses[member] = { guess: guess, ts: Date.now() };
    const priceYuan = st.product.priceYuan;
    const hit = Math.abs(guess - priceYuan) <= priceYuan * GUESS_TOLERANCE;
    if (hit) st.winner = member;
    await saveGuessState(st);
    const cnt = Object.keys(st.guesses).length;
    if (hit) return await revealGuessText(st, 'solved');
    return '📥 已记录你的猜价：¥' + guess + '（第 ' + cnt + ' 位参与者）\n是否猜中暂不揭晓，等其他群友一起猜～';
  }

  /** 揭晓结果文案（纯展示，不改状态）；reason: solved | timeout | manual | recap */
  async function guessResultText(st, reason) {
    const nickMap = await loadNicknames();
    const p = st.product.priceYuan;
    const lines = [];
    const rangeLine = '💰 成交价：¥' + p + '（±10% 区间：¥' + Math.round(p * 0.9) + ' ~ ¥' + Math.round(p * 1.1) + '）';
    if (reason === 'solved' && st.winner) {
      const wg = (st.guesses[st.winner] || {}).guess;
      const err = Math.round(Math.abs(wg - p) / p * 1000) / 10;
      lines.push('🎯 有人猜中，揭晓答案！');
      lines.push('💰 成交价：¥' + p);
      lines.push('🎉 胜者：' + displayName(st.winner, nickMap) + '（猜 ¥' + wg + '，误差 ' + err + '%）');
    } else if (reason === 'recap') {
      lines.push('📢 上一局猜价结果：');
      lines.push('💰 成交价：¥' + p);
      if (st.winner) {
        const wg = (st.guesses[st.winner] || {}).guess;
        const err = Math.round(Math.abs(wg - p) / p * 1000) / 10;
        lines.push('🎉 胜者：' + displayName(st.winner, nickMap) + '（猜 ¥' + wg + '，误差 ' + err + '%）');
      } else {
        lines.push(rangeLine);
      }
    } else if (reason === 'timeout') {
      lines.push('⏰ 1 分钟无人猜中，揭晓答案！');
      lines.push(rangeLine);
    } else {
      lines.push('📢 猜价提前揭晓！');
      lines.push(rangeLine);
    }
    const gs = Object.entries(st.guesses || {});
    if (gs.length > 0) {
      lines.push('👥 本局猜价：' + gs.map(([k, v]) => displayName(k, nickMap) + '猜¥' + v.guess).join('，'));
    }
    lines.push('🔗 商品链接：' + st.product.url);
    return lines.join('\n');
  }

  /** 揭晓卡数据：成交价/胜者/猜价列表/二维码链接（商品图只放在题目卡，揭晓卡放二维码） */
  async function revealCardData(st, reason) {
    const nickMap = await loadNicknames();
    const p = st.product.priceYuan;
    const card = {
      type: 'reveal',
      reason: reason,
      priceYuan: p,
      productUrl: st.product.url,
      maskedTitle: String(st.maskedTitle || '').substring(0, 60),
      winner: null,
      guesses: Object.entries(st.guesses || {})
        .sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0))
        .map(([k, v]) => ({ name: displayName(k, nickMap), guess: v.guess })),
    };
    if (st.winner) {
      const wg = (st.guesses[st.winner] || {}).guess;
      const err = Math.round(Math.abs(wg - p) / p * 1000) / 10;
      card.winner = { name: displayName(st.winner, nickMap), guess: wg, err: err };
    }
    return card;
  }

  /** 揭晓结果（文案+卡片，纯展示不改状态）；reason: solved | timeout | manual | recap */
  async function guessResult(st, reason) {
    return {
      text: await guessResultText(st, reason),
      card: await revealCardData(st, reason),
    };
  }

  /** 揭晓当前局（置结束态并落盘），返回 {text, card} */
  async function revealGuessText(st, reason) {
    st.active = false;
    st.revealed = true;
    st.revealedAt = Date.now();
    saveGuessState(st);
    return guessResult(st, reason);
  }

  /** 惰性过期检查：serverless 无定时器，每条群消息进来时看一眼这局是否超时（3秒节流） */
  let lastGuessCheckAt = 0;
  async function checkGuessExpiry() {
    const now = Date.now();
    if (now - lastGuessCheckAt < 3000) return null;
    lastGuessCheckAt = now;
    try {
      const st = await loadGuessState();
      if (st.active && !st.revealed && now - st.startedAt > GUESS_DURATION_MS) {
        return await revealGuessText(st, 'timeout');
      }
    } catch (e) { /* 忽略 */ }
    return null;
  }

  async function handleMessage(d, isGroup) {
    // openid 兼容多种载荷结构：C2C 在 d.user_openid 或 d.author.user_openid；群在 d.group_openid
    const author = d.author || {};
    const openid = isGroup
      ? (d.group_openid || author.group_openid || '')
      : (d.user_openid || author.user_openid || author.id || '');
    if (!openid) return;
    const text = stripMention(d.content);

    // 猜价游戏：惰性过期检查（仅群聊，3秒节流）
    if (isGroup) {
      try {
        const expiredMsg = await checkGuessExpiry();
        if (expiredMsg) {
          await replyGame(openid, isGroup, d.id, expiredMsg);
          // 揭晓后继续处理当前消息的其余意图
        }
      } catch (e) { /* 忽略 */ }
    }

    if (!text || /^(帮助|help|菜单|指令)$/i.test(text)) {
      await tryReply(openid, isGroup, HELP_TEXT, d.id);
      return;
    }
    // 调戏检测：明显无效的命座写法（1.3命 / -99命 / π命 / 99命），回敬一句，不估价
    const tease = detectInvalidConst(text);
    if (tease) {
      const msg = String(tease).startsWith('over:')
        ? '🙄 ' + tease.slice(5) + ' 命？把开发者都惊动了。命座上限就是 6（满命），调戏无效，白眼已翻。'
        : TEASE_TEXTS[Math.floor(Math.random() * TEASE_TEXTS.length)];
      await tryReply(openid, isGroup, msg, d.id);
      return;
    }
    // 限频按发送者维度（群里避免整个群共享额度）
    const member = author.member_openid || author.user_openid || openid;
    const limited = rateCheck(member);
    if (limited) {
      await tryReply(openid, isGroup, limited, d.id);
      return;
    }
    const priceYuan = extractPrice(text);
    const desc = text.replace(/(?:价格|标价|售价|出价)\s*[:：]?\s*\d+(?:\.\d+)?/g, ' ').replace(/[¥￥]\s*\d+(?:\.\d+)?/g, ' ').replace(/\d+(?:\.\d+)?\s*元/g, ' ').replace(/\s+/g, ' ').trim();

    // 猜价游戏命令：开始猜价 / 结束猜价 / 猜 4500 / 我叫XX
    const nickCmd = text.match(/^我叫\s*([^\s]{1,12})$/);
    const guessCmd = text.match(/^(开始猜价|来局猜价|猜价游戏|结束猜价|公布答案)$/);
    const guessVal = text.match(/^猜价?[:：]?\s*(\d+(?:\.\d+)?)$/);
    if (nickCmd || guessCmd || guessVal) {
      if (!isGroup) {
        await tryReply(openid, isGroup, '猜价游戏请在群聊里玩～', d.id);
        return;
      }
      if (nickCmd) {
        const nick = nickCmd[1].trim();
        await saveNickname(member, nick);
        await tryReply(openid, isGroup, '✅ 好嘞，猜价榜单上就叫你「' + nick + '」！（下次猜价生效，再发可修改）', d.id);
        return;
      }
      if (guessCmd && (guessCmd[1] === '结束猜价' || guessCmd[1] === '公布答案')) {
        const st = await loadGuessState();
        if (st.active && !st.revealed) {
          // 直接给结果：不等±10%，不等超时
          await replyGame(openid, isGroup, d.id, await revealGuessText(st, 'manual'));
        } else if (st.revealed && st.product) {
          // 无进行中的局：重看上一局结果
          await replyGame(openid, isGroup, d.id, await guessResult(st, 'recap'));
        } else {
          await tryReply(openid, isGroup, '还没有猜价记录～发「开始猜价」来一局！', d.id);
        }
        return;
      }
      if (guessCmd) {
        await replyGame(openid, isGroup, d.id, await startGuessGame());
        return;
      }
      if (guessVal) {
        const member = author.member_openid || author.user_openid || openid;
        await replyGame(openid, isGroup, d.id, await handleGuess(member, guessVal[1]));
        return;
      }
    }
    if (desc.length < 4) {
      await tryReply(openid, isGroup, '描述太短啦，请把商品的账号描述发给我～\n\n' + HELP_TEXT, d.id);
      return;
    }
    const t0 = Date.now();
    const engine = getEngine('wuwa');
    // 优先使用服务器数据库配置的权重（与管理后台/网站估价一致），失败回退源码内置默认值
    let weights = null;
    if (opts.getWeights) {
      try { weights = await opts.getWeights(); } catch (e) { weights = null; }
    }
    const result = engine.evaluateWithPrice(desc, Math.round(priceYuan * 100), weights);
    const reply = formatReply(result, priceYuan);
    onLog({
      time: new Date().toISOString(),
      type: 'QQ机器人',
      ip: isGroup ? '群聊' : '私聊',
      input: desc.substring(0, 200),
      price: priceYuan,
      estimatedValue: result.details.finalValue,
      ratio: result.costPerformance,
      game: 'wuwa',
      yellowCount: result.info.yellowCount,
      pulls: result.info.pulls,
      success: true,
      costMs: Date.now() - t0,
    });
    await tryReply(openid, isGroup, reply, d.id);
  }

  async function webhook(req, res) {
    const rawBody = req.rawBody ? Buffer.from(req.rawBody) : Buffer.from(JSON.stringify(req.body || {}));

    // 0. 回调地址验证挑战（op=13；兼容加密推送与任意 op 值，只要带 plainToken 即按挑战处理）
    try {
      let bodyObj = req.body || {};

      // 加密推送：先解密再判断（验证挑战也可能是加密的）
      if (bodyObj && typeof bodyObj.encrypted === 'string' && bodyObj.encrypted.length > 0) {
        if (!cfg.encryptKey) {
          recordDebug(req, '收到加密推送但未配置 QQ_BOT_ENCRYPT_KEY，无法解密', 400);
          console.error('[QQ机器人] 收到加密推送但未配置 QQ_BOT_ENCRYPT_KEY，无法解密。请到QQ开放平台复制加密密钥并配置到 Vercel');
          return res.status(400).json({ success: false, error: '未配置解密密钥' });
        }
        try {
          bodyObj = JSON.parse(decryptPayload(cfg.encryptKey, bodyObj.encrypted));
        } catch (e) {
          recordDebug(req, '解密失败: ' + e.message, 400);
          console.error('[QQ机器人] 解密失败:', e.message);
          return res.status(400).json({ success: false, error: '解密失败' });
        }
      }

      if (bodyObj.d && (bodyObj.d.plainToken || bodyObj.d.plain_token)) {
        // 新版验证协议（官方文档 webhook.html）：Ed25519 签名，msg = event_ts + plain_token，
        // 响应字段为下划线 plain_token/signature
        const plainToken = String(bodyObj.d.plainToken || bodyObj.d.plain_token);
        const eventTs = String(bodyObj.d.event_ts || bodyObj.d.eventTs || '');
        const sig = signValidation(cfg.appSecret, eventTs, plainToken);
        recordDebug(req, '验证挑战：已用 AppSecret 派生 Ed25519 签名应答', 200);
        console.log('[QQ机器人] 回调地址验证挑战已应答，plainToken=' + plainToken);
        return res.json({ plain_token: plainToken, signature: sig });
      }

      // 1. Ed25519 验签（对 timestamp + 原始body，公钥由 AppSecret 派生）
      const sig = req.headers['x-signature-ed25519'] || '';
      const ts = req.headers['x-signature-timestamp'] || '';
      if (!sig || !ts) {
        recordDebug(req, '缺少验签头', 401);
        console.warn('[QQ机器人] 缺少验签头，拒绝处理');
        return res.status(401).json({ success: false, error: '缺少验签头' });
      }
      if (!verifyEventSignature(derivedPublicKey, ts, rawBody, sig)) {
        recordDebug(req, 'Ed25519 验签失败', 401);
        console.warn('[QQ机器人] 验签失败，拒绝处理');
        return res.status(401).json({ success: false, error: '签名校验失败' });
      }

      // 2. 事件分发（全部先 200，再异步处理，避免 QQ 超时重推）
      const type = bodyObj.t || '';
      const d = bodyObj.d || {};

      // 2.5 消息幂等去重：同一 msg_id 只处理一次（10 分钟窗口）
      const evtMsgId = String(d.id || '');
      if (evtMsgId) {
        const now = Date.now();
        if (handledMsgIds.size > 2000) {
          for (const [k, t] of handledMsgIds) {
            if (now - t > 600000) handledMsgIds.delete(k);
          }
        }
        if (handledMsgIds.has(evtMsgId)) {
          recordDebug(req, '重复推送已忽略（幂等去重）', 200);
          console.log('[QQ机器人] 重复推送已忽略: ' + evtMsgId.slice(0, 30));
          return res.json({ success: true, duplicated: true });
        }
        handledMsgIds.set(evtMsgId, now);
      }

      if (type === 'GROUP_AT_MESSAGE_CREATE') {
        // Vercel Serverless 在响应返回后会冻结函数，必须先处理完（估价+回复）再应答，
        // 否则异步回复永远没有执行机会
        try {
          await handleMessage(d, true);
        } catch (e) {
          console.error('[QQ机器人] 群消息处理失败:', e.message);
        }
        recordDebug(req, '群消息事件已处理', 200);
        return res.json({ success: true });
      }
      if (type === 'C2C_MESSAGE_CREATE') {
        try {
          await handleMessage(d, false);
        } catch (e) {
          console.error('[QQ机器人] 私聊消息处理失败:', e.message);
        }
        recordDebug(req, '私聊消息事件已处理', 200);
        return res.json({ success: true });
      }
      // 其他事件（频道消息/生命周期事件等）直接确认
      recordDebug(req, '其他事件已确认: ' + (type || 'unknown'), 200);
      return res.json({ success: true, ignored: type || 'unknown' });
    } catch (e) {
      recordDebug(req, '处理异常: ' + e.message, 200);
      console.error('[QQ机器人] webhook处理异常:', e.message);
      return res.status(200).json({ success: false, error: e.message });
    }
  };

  return {
    webhook: webhook,
    getLastDebug: function () { return Object.assign({}, lastDebug, { lastError: lastError, lastReply: lastReply }); },
  };
}

module.exports = { createQQBotHandler, HELP_TEXT };
