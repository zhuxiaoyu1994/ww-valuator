/**
 * notify.js - 通知模块
 * 支持 Server酱、Bark、钉钉机器人 推送通知
 */

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 通知记录（内存中保留最近50条）
let notificationLog = [];
const MAX_LOG_SIZE = 50;

/**
 * 获取已配置的通知渠道
 */
function getConfiguredChannels() {
  const channels = [];

  if (process.env.SERVERCHAN_KEY) {
    channels.push('serverchan');
  }
  if (process.env.BARK_KEY) {
    channels.push('bark');
  }
  if (process.env.DINGTALK_WEBHOOK) {
    channels.push('dingtalk');
  }

  return channels;
}

/**
 * 发送 HTTPS/HTTP 请求
 */
function httpRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'POST',
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Server酱推送
 * @param {string} title - 标题
 * @param {string} content - 内容
 */
async function sendServerChan(title, content) {
  const key = process.env.SERVERCHAN_KEY;
  if (!key) return { success: false, error: 'SERVERCHAN_KEY not configured' };

  try {
    const postData = `title=${encodeURIComponent(title)}&desp=${encodeURIComponent(content)}`;
    const result = await httpRequest(`https://sctapi.ftqq.com/${key}.send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
      body: postData,
    });

    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      if (body.code === 0 || body.success !== false) {
        return { success: true, channel: 'serverchan' };
      }
      return { success: false, channel: 'serverchan', error: body.message || 'Unknown error' };
    }
    return { success: false, channel: 'serverchan', error: `HTTP ${result.statusCode}` };
  } catch (err) {
    return { success: false, channel: 'serverchan', error: err.message };
  }
}

/**
 * Bark推送 (iOS)
 * @param {string} title - 标题
 * @param {string} content - 内容
 */
async function sendBark(title, content) {
  const key = process.env.BARK_KEY;
  if (!key) return { success: false, error: 'BARK_KEY not configured' };

  try {
    // Bark Key 可以是完整的 URL 或者只是 key
    let baseUrl;
    if (key.startsWith('http')) {
      baseUrl = key.replace(/\/$/, '');
    } else {
      baseUrl = `https://api.day.app/${key}`;
    }

    const url = `${baseUrl}/${encodeURIComponent(title)}/${encodeURIComponent(content)}?group=%E9%B8%A3%E6%BD%AE%E7%9B%91%E6%8E%A7`;
    const result = await httpRequest(url, { method: 'GET' });

    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      if (body.code === 200 || body.success !== false) {
        return { success: true, channel: 'bark' };
      }
      return { success: false, channel: 'bark', error: body.message || 'Unknown error' };
    }
    return { success: false, channel: 'bark', error: `HTTP ${result.statusCode}` };
  } catch (err) {
    return { success: false, channel: 'bark', error: err.message };
  }
}

/**
 * 钉钉机器人推送
 * @param {string} title - 标题
 * @param {string} content - 内容
 */
async function sendDingTalk(title, content) {
  const webhook = process.env.DINGTALK_WEBHOOK;
  if (!webhook) return { success: false, error: 'DINGTALK_WEBHOOK not configured' };

  try {
    const postData = JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        title: title,
        text: `### ${title}\n\n${content}`,
      },
    });

    const result = await httpRequest(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      body: postData,
    });

    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      if (body.errcode === 0 || body.errcode === undefined) {
        return { success: true, channel: 'dingtalk' };
      }
      return { success: false, channel: 'dingtalk', error: body.errmsg || `Error code: ${body.errcode}` };
    }
    return { success: false, channel: 'dingtalk', error: `HTTP ${result.statusCode}` };
  } catch (err) {
    return { success: false, channel: 'dingtalk', error: err.message };
  }
}

/**
 * 记录通知日志
 */
function logNotification(title, content, results) {
  const entry = {
    timestamp: new Date().toISOString(),
    title,
    content,
    results,
    success: results.some(r => r.success),
  };
  notificationLog.unshift(entry);
  if (notificationLog.length > MAX_LOG_SIZE) {
    notificationLog = notificationLog.slice(0, MAX_LOG_SIZE);
  }
  return entry;
}

/**
 * 发送通知（同时尝试所有已配置的渠道）
 * @param {string} title - 通知标题
 * @param {string} content - 通知内容
 * @returns {Promise<object>} 通知结果
 */
async function sendNotification(title, content) {
  const channels = getConfiguredChannels();

  if (channels.length === 0) {
    console.log('[Notify] No notification channels configured. Logging only.');
    const entry = logNotification(title, content, []);
    return { entry, results: [] };
  }

  console.log(`[Notify] Sending notification via ${channels.length} channel(s): ${channels.join(', ')}`);

  const promises = [];
  for (const channel of channels) {
    if (channel === 'serverchan') promises.push(sendServerChan(title, content));
    if (channel === 'bark') promises.push(sendBark(title, content));
    if (channel === 'dingtalk') promises.push(sendDingTalk(title, content));
  }

  const results = await Promise.all(promises);

  for (const result of results) {
    if (result.success) {
      console.log(`[Notify] Successfully sent via ${result.channel}`);
    } else {
      console.error(`[Notify] Failed to send via ${result.channel || 'unknown'}: ${result.error}`);
    }
  }

  const entry = logNotification(title, content, results);
  return { entry, results };
}

/**
 * 获取通知记录
 * @returns {array} 通知记录列表
 */
function getNotificationLog() {
  return notificationLog;
}

/**
 * 格式化高性价比账号通知消息
 */
function formatNotification(hotAccounts) {
  if (!hotAccounts || hotAccounts.length === 0) return '';
  let msg = `发现 ${hotAccounts.length} 个高性价比账号！\n\n`;
  for (const acc of hotAccounts.slice(0, 5)) {
    msg += `📊 ${(acc.title || '').substring(0, 60)}...\n`;
    msg += `💰 估值: ${acc.value}元 | 标价: ${acc.price}元 | 性价比: ${acc.ratio}%\n`;
    msg += `🔗 ${acc.url}\n\n`;
  }
  return msg;
}

module.exports = {
  sendNotification,
  getNotificationLog,
  getConfiguredChannels,
  formatNotification,
};
