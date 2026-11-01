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

/** Ed25519 验签：QQ 公钥为 64 位 hex（32 字节裸公钥），包一层 SPKI DER 头 */
function verifyEd25519(publicKeyHex, timestamp, rawBody, sigHex) {
  try {
    const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const der = Buffer.concat([spkiPrefix, hexToBuf(publicKeyHex)]);
    const keyObj = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    const data = Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]);
    return crypto.verify(null, data, keyObj, Buffer.from(sigHex, 'hex'));
  } catch (e) {
    console.error('[QQ机器人] 验签异常:', e.message);
    return false;
  }
}

/** 回调地址验证挑战（新版协议）：用 AppSecret 派生 Ed25519 私钥，对 event_ts+plain_token 签名。
 *  Go 参考: seed=secret 重复填充到32字节 → ed25519.GenerateKey → Sign(event_ts + plain_token) */
function signValidation(appSecret, eventTs, plainToken) {
  let seed = Buffer.from(appSecret, 'utf8');
  while (seed.length < 32) seed = Buffer.concat([seed, seed]);
  seed = seed.subarray(0, 32);
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
  const key = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  return crypto.sign(null, Buffer.from(eventTs + plainToken, 'utf8'), key).toString('hex');
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

/** 发送被动回复（群聊/私聊） */
async function sendReply(cfg, openid, isGroup, content, msgId) {
  const token = await getAccessToken(cfg.appId, cfg.appSecret);
  const url = isGroup
    ? API_BASE + '/v2/groups/' + encodeURIComponent(openid) + '/messages'
    : API_BASE + '/v2/users/' + encodeURIComponent(openid) + '/messages';
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
      msg_seq: 1,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || (data.retcode && data.retcode !== 0)) {
    throw new Error('回复消息失败 HTTP ' + resp.status + ' ' + JSON.stringify(data).substring(0, 200));
  }
}

// ── 消息解析与回复格式化 ─────────────────────────────────────

const HELP_TEXT = '🤖 鸣潮账号估价\n\n用法：@机器人 + 商品描述 +（可选）标价\n示例：\n· @机器人 今汐满命 洛可可满命 长离1命 金18 抽卡剩200发 标价3500\n· @机器人 维里奈0命 延奏金3 ¥1200\n\n标价支持写法：标价3500 / ¥3500 / 3500元\n⚠️ 估值仅供参考，以实际成交为准';

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

/** 格式化估值回复 */
function formatReply(result, priceYuan) {
  const lines = [];
  lines.push('📋 鸣潮账号估值');
  lines.push('');
  const shortDesc = result && result.shortDescription;
  if (shortDesc) lines.push(shortDesc);
  lines.push('');
  lines.push('💰 估值：' + fmtMoney(result.details.finalValue));
  if (priceYuan > 0) {
    lines.push('🏷️ 标价：' + fmtMoney(priceYuan));
    const ratio = result.costPerformance;
    if (ratio != null && isFinite(ratio)) {
      const pct = Math.round(ratio * 100);
      lines.push('📊 性价比：' + pct + '%（' + (pct >= 100 ? '估值高于标价' : '估值低于标价') + '）');
    }
    lines.push('🔍 参考差价：' + (result.details.finalValue - priceYuan >= 0 ? '+' : '') + fmtMoney(result.details.finalValue - priceYuan));
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
    publicKey: opts.publicKey || '',
    encryptKey: opts.encryptKey || '',
  };
  const getEngine = opts.getEngine;
  const onLog = opts.onLog || function () {};
  // 只要求 AppID/Secret：回调地址验证挑战（op=13）仅需 Secret；
  // 公钥缺失时挑战可用，真实事件消息会因验签失败被拒并给出明确日志
  if (!cfg.appId || !cfg.appSecret) {
    return function (req, res) {
      res.status(503).json({ success: false, error: 'QQ机器人未配置（缺少 QQ_BOT_APP_ID / QQ_BOT_SECRET）' });
    };
  }

  // 限频表：openid -> [timestamps]
  const rateMap = new Map();
  // 调试：记录最后一次 webhook 请求（供 /api/qq-bot-debug 排查回调验证问题）
  let lastDebug = { time: null, path: null, headers: null, bodyHead: null, note: null, status: null };
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

  async function handleMessage(d, isGroup) {
    const openid = isGroup ? d.group_openid : d.user_openid;
    if (!openid) return;
    const text = stripMention(d.content);
    if (!text || /^(帮助|help|菜单|指令)$/i.test(text)) {
      await sendReply(cfg, openid, isGroup, HELP_TEXT, d.id);
      return;
    }
    const limited = rateCheck(openid);
    if (limited) {
      await sendReply(cfg, openid, isGroup, limited, d.id);
      return;
    }
    const priceYuan = extractPrice(text);
    const desc = text.replace(/(?:价格|标价|售价|出价)\s*[:：]?\s*\d+(?:\.\d+)?/g, ' ').replace(/[¥￥]\s*\d+(?:\.\d+)?/g, ' ').replace(/\d+(?:\.\d+)?\s*元/g, ' ').replace(/\s+/g, ' ').trim();
    if (desc.length < 4) {
      await sendReply(cfg, openid, isGroup, '描述太短啦，请把商品的账号描述发给我～\n\n' + HELP_TEXT, d.id);
      return;
    }
    const t0 = Date.now();
    const engine = getEngine('wuwa');
    const result = engine.evaluateWithPrice(desc, Math.round(priceYuan * 100));
    result.shortDescription = engine.generateShortDescription(result);
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
    await sendReply(cfg, openid, isGroup, reply, d.id);
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

      // 1. Ed25519 验签（对 timestamp + 原始body）
      const sig = req.headers['x-signature-ed25519'] || '';
      const ts = req.headers['x-signature-timestamp'] || '';
      if (!sig || !ts) {
        recordDebug(req, '缺少验签头', 401);
        console.warn('[QQ机器人] 缺少验签头，拒绝处理');
        return res.status(401).json({ success: false, error: '缺少验签头' });
      }
      if (!cfg.publicKey) {
        recordDebug(req, '收到事件推送但未配置 QQ_BOT_PUBLIC_KEY，无法验签', 401);
        console.error('[QQ机器人] 收到事件推送但未配置 QQ_BOT_PUBLIC_KEY，无法验签。请到QQ开放平台复制机器人公钥并配置到 Vercel');
        return res.status(401).json({ success: false, error: '服务端未配置公钥' });
      }
      if (!verifyEd25519(cfg.publicKey, ts, rawBody, sig)) {
        recordDebug(req, 'Ed25519 验签失败', 401);
        console.warn('[QQ机器人] 验签失败，拒绝处理');
        return res.status(401).json({ success: false, error: '签名校验失败' });
      }

      // 2. 事件分发（全部先 200，再异步处理，避免 QQ 超时重推）
      const type = bodyObj.t || '';
      const d = bodyObj.d || {};
      if (type === 'GROUP_AT_MESSAGE_CREATE') {
        recordDebug(req, '群消息事件已受理', 200);
        res.json({ success: true });
        handleMessage(d, true).catch(e => console.error('[QQ机器人] 群消息处理失败:', e.message));
        return;
      }
      if (type === 'C2C_MESSAGE_CREATE') {
        recordDebug(req, '私聊消息事件已受理', 200);
        res.json({ success: true });
        handleMessage(d, false).catch(e => console.error('[QQ机器人] 私聊消息处理失败:', e.message));
        return;
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
    getLastDebug: function () { return lastDebug; },
  };
}

module.exports = { createQQBotHandler, HELP_TEXT };
