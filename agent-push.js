'use strict';

const crypto = require('crypto');

const CONFIG_KEY = 'agent_push:default';
const LOG_PREFIX = 'agent_push:log:';
const DEDUP_PREFIX = 'agent_push:dedup:';
const PLATFORMS = new Set(['pxb7', 'pzds', 'kjs', 'qy', 'ysy']);
const MAX_CONCURRENCY = 6;
const DEADLINE_MS = 12000;
const DAY_MS = 24 * 60 * 60 * 1000;

function defaultConfig() {
  return { enabled: true, robots: [], rules: [] };
}

function httpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function badRequest(message) {
  throw httpError(400, message, 'INVALID_INPUT');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkFields(input, allowed, label) {
  if (!isObject(input)) badRequest(label + '必须是对象');
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) badRequest(label + '包含不支持的字段: ' + key);
  }
}

function requiredString(value, label, maxLength) {
  if (typeof value !== 'string') badRequest(label + '必须是字符串');
  const result = value.trim();
  if (!result) badRequest(label + '不能为空');
  if (result.length > maxLength) badRequest(label + '长度不能超过' + maxLength);
  return result;
}

function optionalString(value, label, maxLength) {
  if (value == null) return '';
  if (typeof value !== 'string') badRequest(label + '必须是字符串');
  const result = value.trim();
  if (result.length > maxLength) badRequest(label + '长度不能超过' + maxLength);
  return result;
}

function booleanField(value, label) {
  if (value == null) return true;
  if (typeof value !== 'boolean') badRequest(label + '必须是布尔值');
  return value;
}

function finiteNumber(value, defaultValue, label, minimum) {
  if (value == null) return defaultValue;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    badRequest(label + '必须是有限数字');
  }
  if (minimum != null && value < minimum) badRequest(label + '不能小于' + minimum);
  return value;
}

function validateWebhook(value) {
  const webhook = requiredString(value, '机器人webhook', 2048);
  let url;
  try {
    url = new URL(webhook);
  } catch (e) {
    badRequest('机器人webhook不是有效URL');
  }
  if (url.protocol !== 'https:' || url.hostname !== 'oapi.dingtalk.com' ||
      url.port || url.username || url.password || url.pathname !== '/robot/send' || url.hash) {
    badRequest('机器人webhook仅允许钉钉机器人地址');
  }
  const token = url.searchParams.get('access_token');
  if (!token || !token.trim() || token.length > 512) {
    badRequest('机器人webhook必须包含有效access_token');
  }
  return webhook;
}

function normalizeConfig(input) {
  checkFields(input, ['enabled', 'robots', 'rules'], '配置');
  const enabled = booleanField(input.enabled, 'enabled');
  const robotInputs = input.robots == null ? [] : input.robots;
  const ruleInputs = input.rules == null ? [] : input.rules;
  if (!Array.isArray(robotInputs) || robotInputs.length > 5) {
    badRequest('robots必须是数组且最多5个');
  }
  if (!Array.isArray(ruleInputs) || ruleInputs.length > 50) {
    badRequest('rules必须是数组且最多50条');
  }

  const robotIds = new Set();
  const robots = robotInputs.map((item, index) => {
    const label = '机器人[' + index + ']';
    checkFields(item, ['id', 'name', 'webhook', 'secret', 'enabled'], label);
    const robot = {
      id: requiredString(item.id, label + '.id', 128),
      name: requiredString(item.name, label + '.name', 100),
      webhook: validateWebhook(item.webhook),
      secret: optionalString(item.secret, label + '.secret', 512),
      enabled: booleanField(item.enabled, label + '.enabled'),
    };
    if (robotIds.has(robot.id)) badRequest('机器人id不能重复: ' + robot.id);
    robotIds.add(robot.id);
    return robot;
  });

  const ruleIds = new Set();
  const rules = ruleInputs.map((item, index) => {
    const label = '规则[' + index + ']';
    checkFields(item, ['id', 'name', 'chars', 'minDiff', 'priceMin', 'priceMax', 'platforms', 'robotIds', 'enabled'], label);
    const charInputs = item.chars == null ? [] : item.chars;
    if (!Array.isArray(charInputs) || charInputs.length < 1 || charInputs.length > 50) {
      badRequest(label + '.chars必须包含1到50项角色条件');
    }
    const chars = charInputs.map((char, charIndex) => {
      const charLabel = label + '.chars[' + charIndex + ']';
      checkFields(char, ['name', 'minConst'], charLabel);
      const minConst = finiteNumber(char.minConst, 0, charLabel + '.minConst', 0);
      if (!Number.isInteger(minConst) || minConst > 6) {
        badRequest(charLabel + '.minConst必须是0到6的整数');
      }
      return {
        name: requiredString(char.name, charLabel + '.name', 100),
        minConst,
      };
    });

    const platformInputs = item.platforms == null ? [] : item.platforms;
    if (!Array.isArray(platformInputs) || platformInputs.length > PLATFORMS.size) {
      badRequest(label + '.platforms必须是有效平台数组');
    }
    const platforms = platformInputs.map((platform) => {
      if (typeof platform !== 'string' || !PLATFORMS.has(platform)) {
        badRequest(label + '.platforms包含不支持的平台');
      }
      return platform;
    });
    if (new Set(platforms).size !== platforms.length) badRequest(label + '.platforms不能重复');

    const robotIdInputs = item.robotIds == null ? [] : item.robotIds;
    if (!Array.isArray(robotIdInputs) || robotIdInputs.length < 1 || robotIdInputs.length > 5) {
      badRequest(label + '.robotIds必须选择1到5个机器人');
    }
    const targetIds = robotIdInputs.map((id) => requiredString(id, label + '.robotIds项', 128));
    if (new Set(targetIds).size !== targetIds.length) badRequest(label + '.robotIds不能重复');
    for (const id of targetIds) {
      if (!robotIds.has(id)) badRequest(label + '.robotIds引用了不存在的机器人: ' + id);
    }

    const priceMin = finiteNumber(item.priceMin, 0, label + '.priceMin', 0);
    const priceMax = finiteNumber(item.priceMax, 0, label + '.priceMax', 0);
    if (priceMax !== 0 && priceMin > priceMax) badRequest(label + '价格下限不能大于上限');
    const rule = {
      id: requiredString(item.id, label + '.id', 128),
      name: requiredString(item.name, label + '.name', 100),
      chars,
      minDiff: finiteNumber(item.minDiff, 0, label + '.minDiff', 0),
      priceMin,
      priceMax,
      platforms,
      robotIds: targetIds,
      enabled: booleanField(item.enabled, label + '.enabled'),
    };
    if (ruleIds.has(rule.id)) badRequest('规则id不能重复: ' + rule.id);
    ruleIds.add(rule.id);
    return rule;
  });

  return { enabled, robots, rules };
}

function eventIdString(value, label) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    badRequest(label + '必须是字符串或数字');
  }
  return requiredString(String(value), label, 200);
}

function eventNumber(value, label) {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') {
    badRequest(label + '必须是数字');
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) badRequest(label + '必须是非负有限数字');
  return number;
}

function eventUrl(value, label) {
  const text = optionalString(value, label, 2048);
  if (!text) return '';
  let url;
  try {
    url = new URL(text);
  } catch (e) {
    badRequest(label + '不是有效URL');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    badRequest(label + '仅允许http/https URL');
  }
  return text;
}

function normalizeEvent(input, index) {
  const label = '事件[' + index + ']';
  if (!isObject(input)) badRequest(label + '必须是对象');
  if (!PLATFORMS.has(input.platform)) badRequest(label + '.platform不受支持');
  const characterInputs = input.characters == null ? [] : input.characters;
  if (!Array.isArray(characterInputs) || characterInputs.length > 200) {
    badRequest(label + '.characters必须是数组且最多200项');
  }
  const characters = characterInputs.map((character, charIndex) => {
    const charLabel = label + '.characters[' + charIndex + ']';
    if (!isObject(character)) badRequest(charLabel + '必须是对象');
    const constellation = character.const == null ? 0 : Number(character.const);
    if (!Number.isInteger(constellation) || constellation < 0 || constellation > 6) {
      badRequest(charLabel + '.const必须是0到6的整数');
    }
    return {
      name: requiredString(character.name, charLabel + '.name', 100),
      const: constellation,
    };
  });
  const price = eventNumber(input.price, label + '.price');
  const value = eventNumber(input.value, label + '.value');
  if (input.game !== 'wuwa' && input.game !== 'zzz') badRequest(label + '.game不受支持');
  return {
    eventId: eventIdString(input.eventId, label + '.eventId'),
    productId: eventIdString(input.productId, label + '.productId'),
    game: input.game === 'zzz' ? 'zzz' : 'wuwa',
    platform: input.platform,
    showTitle: optionalString(input.showTitle, label + '.showTitle', 1500),
    price,
    value,
    diff: value - price,
    characters,
    goodsImg: eventUrl(input.goodsImg, label + '.goodsImg'),
    productUrl: eventUrl(input.productUrl, label + '.productUrl'),
    stage: optionalString(input.stage, label + '.stage', 100),
  };
}

function matchesRule(event, rule) {
  if (rule.platforms.length && !rule.platforms.includes(event.platform)) return false;
  if (rule.priceMin !== 0 && event.price < rule.priceMin) return false;
  if (rule.priceMax !== 0 && event.price > rule.priceMax) return false;
  if (rule.minDiff !== 0 && !(event.diff > rule.minDiff)) return false;
  return rule.chars.every((wanted) => event.characters.some(
    (character) => character.name === wanted.name && character.const >= wanted.minConst
  ));
}

function gameName(event) {
  return event.game === 'zzz' ? '绝区零' : '鸣潮';
}

function buildMessage(event, rules) {
  const game = gameName(event);
  const title = game + ' 高性价比账号提醒';
  const lines = [
    '游戏：' + game,
    '商品：' + (event.showTitle || event.productId),
    '标价：¥' + event.price,
    '估值：¥' + event.value,
    '差价：¥' + event.diff,
    '命中规则：' + rules.map((rule) => rule.name).join('、'),
    '链接：' + (event.productUrl || '暂无'),
  ];
  return { title, content: lines.join('\n') };
}

function safeEqual(secret, candidate) {
  if (typeof secret !== 'string' || !secret || typeof candidate !== 'string' ||
      !candidate || candidate.length > 4096) return false;
  const expected = Buffer.from(secret, 'utf8');
  const actual = Buffer.from(candidate, 'utf8');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function runWithDeadline(fn, milliseconds, message) {
  if (milliseconds <= 0) {
    return Promise.reject(httpError(503, message || '处理超时', 'DEADLINE_EXCEEDED'));
  }
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(httpError(503, message || '处理超时', 'DEADLINE_EXCEEDED')), milliseconds);
  });
  return Promise.race([Promise.resolve().then(fn), timeout]).finally(() => clearTimeout(timer));
}

function errorText(error) {
  if (error && typeof error.message === 'string') return error.message;
  if (typeof error === 'string') return error;
  return '未知错误';
}

function sanitizeError(error, robot) {
  let text = errorText(error).slice(0, 300);
  const secrets = [robot.webhook, robot.secret];
  try {
    secrets.push(new URL(robot.webhook).searchParams.get('access_token'));
  } catch (e) { /* 配置保存时已校验 */ }
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join('[已隐藏]');
  }
  return text.replace(/(access_token=)[^&\s]+/gi, '$1[已隐藏]');
}

function createAgentPushService(options) {
  options = options || {};
  const db = options.db;
  const manageKey = options.manageKey;
  const ingestToken = options.ingestToken;
  const sendRobot = options.sendRobot;

  async function getConfig() {
    let stored;
    try {
      stored = await (db.getConfigStrict ? db.getConfigStrict(CONFIG_KEY) : db.getConfig(CONFIG_KEY));
    } catch (e) {
      throw httpError(503, '读取推送配置失败', 'CONFIG_READ_FAILED');
    }
    if (stored == null) return defaultConfig();
    try {
      return normalizeConfig(stored);
    } catch (e) {
      throw httpError(503, '推送配置数据无效', 'CONFIG_INVALID');
    }
  }

  async function saveConfig(input) {
    const config = normalizeConfig(input);
    let saved;
    try {
      saved = await db.setConfig(CONFIG_KEY, config);
    } catch (e) {
      throw httpError(503, '保存推送配置失败', 'CONFIG_WRITE_FAILED');
    }
    if (saved === false) throw httpError(503, '保存推送配置失败', 'CONFIG_WRITE_FAILED');
    return config;
  }

  async function testRobot(robotId) {
    const id = requiredString(robotId, 'robotId', 128);
    const config = await getConfig();
    const robot = config.robots.find((item) => item.id === id);
    if (!robot) throw httpError(404, '机器人不存在', 'ROBOT_NOT_FOUND');
    try {
      const result = await runWithDeadline(
        () => sendRobot(robot, '鸣潮/绝区零 机器人测试', '游戏：鸣潮/绝区零\n这是一条机器人测试消息。'),
        DEADLINE_MS,
        '机器人测试超时'
      );
      if (!result || result.success !== true) {
        throw new Error(result && result.error ? result.error : '机器人返回失败');
      }
      return { success: true, robotId: id };
    } catch (e) {
      throw httpError(503, '机器人测试失败: ' + sanitizeError(e, robot), 'ROBOT_TEST_FAILED');
    }
  }

  async function dispatch(events) {
    if (!Array.isArray(events) || events.length < 1 || events.length > 20) {
      badRequest('events必须包含1到20条事件');
    }
    const normalizedEvents = events.map(normalizeEvent);
    const config = await getConfig();
    const startedAt = Date.now();
    const deadline = startedAt + DEADLINE_MS;
    const createdAt = new Date(startedAt).toISOString();
    const robots = new Map(config.robots.filter((robot) => robot.enabled).map((robot) => [robot.id, robot]));
    const jobs = [];

    if (config.enabled) {
      for (const event of normalizedEvents) {
        const byRobot = new Map();
        for (const rule of config.rules) {
          if (!rule.enabled || !matchesRule(event, rule)) continue;
          for (const robotId of rule.robotIds) {
            if (!robots.has(robotId)) continue;
            if (!byRobot.has(robotId)) byRobot.set(robotId, []);
            byRobot.get(robotId).push(rule);
          }
        }
        for (const [robotId, rules] of byRobot) {
          const robot = robots.get(robotId);
          const digest = crypto.createHash('sha256').update(robotId + '|' + event.eventId).digest('hex');
          jobs.push({
            event,
            robot,
            rules,
            dedupKey: DEDUP_PREFIX + digest,
            message: buildMessage(event, rules),
          });
        }
      }
    }

    const results = new Array(jobs.length);
    let cursor = 0;
    let abortError = null;

    function setResult(index, result) {
      results[index] = Object.assign({
        eventId: jobs[index].event.eventId,
        productId: jobs[index].event.productId,
        robotId: jobs[index].robot.id,
        ruleIds: jobs[index].rules.map((rule) => rule.id),
      }, result);
    }

    async function removeDedup(job) {
      const remaining = deadline - Date.now();
      const operation = () => db.deleteConfig(job.dedupKey);
      if (remaining <= 0) return;
      await runWithDeadline(operation, remaining, '删除去重占位超时').catch(() => {});
    }

    async function worker() {
      while (cursor < jobs.length && !abortError) {
        const index = cursor++;
        const job = jobs[index];
        let inserted;
        try {
          inserted = await runWithDeadline(
            () => db.insertConfigIfAbsent(job.dedupKey, {
              createdAt,
              eventId: job.event.eventId,
              robotId: job.robot.id,
            }),
            deadline - Date.now(),
            '去重处理超时'
          );
        } catch (e) {
          if (e.code === 'DEADLINE_EXCEEDED') {
            setResult(index, { success: false, status: 'failed', code: e.code, error: '整体处理期限已到' });
          } else {
            abortError = e;
            setResult(index, { success: false, status: 'failed', code: 'DEDUP_ERROR', error: '去重存储错误，本批已中止' });
          }
          continue;
        }
        if (inserted === false) {
          setResult(index, { success: true, status: 'duplicate' });
          continue;
        }
        if (inserted !== true) {
          abortError = httpError(503, '去重存储错误', 'DEDUP_ERROR');
          setResult(index, { success: false, status: 'failed', code: 'DEDUP_ERROR', error: '去重存储错误，本批已中止' });
          continue;
        }
        try {
          const result = await runWithDeadline(
            () => sendRobot(job.robot, job.message.title, job.message.content),
            deadline - Date.now(),
            '机器人发送超时'
          );
          if (!result || result.success !== true) {
            throw new Error(result && result.error ? result.error : '机器人返回失败');
          }
          setResult(index, { success: true, status: 'sent' });
        } catch (e) {
          setResult(index, {
            success: false,
            status: 'failed',
            code: e.code === 'DEADLINE_EXCEEDED' ? e.code : 'SEND_FAILED',
            error: sanitizeError(e, job.robot),
          });
          await removeDedup(job);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, jobs.length) }, worker));
    for (let index = 0; index < results.length; index++) {
      if (results[index]) continue;
      const timedOut = Date.now() >= deadline && !abortError;
      setResult(index, {
        success: false,
        status: 'failed',
        code: timedOut ? 'DEADLINE_EXCEEDED' : 'BATCH_ABORTED',
        error: timedOut ? '整体处理期限已到，未处理' : '去重存储错误，本批未处理',
      });
    }

    const sent = results.filter((result) => result.status === 'sent').length;
    const skipped = results.filter((result) => result.status === 'duplicate').length;
    const failed = results.filter((result) => result.status === 'failed').length;
    const matched = new Set(jobs.map((job) => job.event.eventId)).size;
    const report = {
      success: failed === 0,
      received: normalizedEvents.length,
      matched,
      eventCount: normalizedEvents.length,
      total: results.length,
      sent,
      skipped,
      failed,
      results,
    };
    const log = {
      createdAt,
      success: report.success,
      received: report.received,
      matched,
      eventCount: report.eventCount,
      total: report.total,
      sent,
      skipped,
      failed,
      errors: results.filter((result) => result.status === 'failed').map((result) => ({
        productId: result.productId,
        robotId: result.robotId,
        error: result.error,
      })),
      results: results.map((result) => ({
        eventId: result.eventId,
        productId: result.productId,
        robotId: result.robotId,
        ruleIds: result.ruleIds,
        status: result.status,
        code: result.code,
        error: result.error,
      })),
    };
    const logKey = LOG_PREFIX + createdAt + ':' + crypto.randomBytes(6).toString('hex');
    const remaining = deadline - Date.now();
    const writeLog = () => db.setConfig(logKey, log);
    if (remaining > 0) {
      await runWithDeadline(writeLog, remaining, '写入日志超时').catch(() => {});
    }

    const cleanup = () => Promise.all([
      db.deleteConfigsBefore(DEDUP_PREFIX, new Date(startedAt - 7 * DAY_MS).toISOString()),
      db.deleteConfigsBefore(LOG_PREFIX, new Date(startedAt - 30 * DAY_MS).toISOString()),
    ]);
    const cleanupRemaining = deadline - Date.now();
    if (cleanupRemaining > 0) {
      await runWithDeadline(cleanup, cleanupRemaining, '清理超时').catch(() => {});
    }
    return report;
  }

  async function getLogs() {
    let rows;
    try {
      rows = await db.listConfigsByPrefix(LOG_PREFIX);
    } catch (e) {
      throw httpError(503, '读取推送日志失败', 'LOG_READ_FAILED');
    }
    if (!Array.isArray(rows)) throw httpError(503, '推送日志数据无效', 'LOG_READ_FAILED');
    return rows.map((row, index) => {
      let value = row && Object.prototype.hasOwnProperty.call(row, 'value') ? row.value : row;
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch (e) { value = null; }
      }
      return {
        value: isObject(value) ? value : {},
        key: row && typeof row.key === 'string' ? row.key : '',
        index,
      };
    }).sort((a, b) => {
      const aTime = Date.parse(a.value.createdAt || a.value.time || '') || 0;
      const bTime = Date.parse(b.value.createdAt || b.value.time || '') || 0;
      return bTime - aTime || b.key.localeCompare(a.key) || a.index - b.index;
    }).slice(0, 50).map((entry) => entry.value);
  }

  return {
    isManager: (key) => safeEqual(manageKey, key),
    isIngest: (token) => safeEqual(ingestToken, token),
    getConfig,
    saveConfig,
    testRobot,
    dispatch,
    getLogs,
  };
}

module.exports = { createAgentPushService };
