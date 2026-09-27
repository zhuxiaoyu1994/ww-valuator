'use strict';

// 从 B站鸣潮 WIKI 同步活动日历，生成本地快照 configs/wuwa-events.json。
// 手动运行：node scripts/sync-wiki.js
// 不要在服务端定时跑：该站有 EdgeOne WAF，连续请求会封 IP。

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WIKI_HOST = 'wiki.biligame.com';
const WIKI_PATH = 'wutheringwaves';
const PAGE = '首页/活动日历';
const OUT_FILE = path.join(__dirname, '..', 'configs', 'wuwa-events.json');

// 本机装有 TLS 中间人代理时 Node 内置根证书不认，改用 curl 走系统信任链
function fetchWikitext() {
  const url = `https://${WIKI_HOST}/${WIKI_PATH}/api.php?action=parse` +
    `&page=${encodeURIComponent(PAGE)}&prop=wikitext&format=json&formatversion=2`;
  let raw;
  try {
    raw = execFileSync('curl', ['-sS', '--max-time', '30', '-A', 'Mozilla/5.0', url], {
      encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
  } catch (e) {
    throw new Error('请求失败：' + (e.stderr || e.message || e));
  }
  if (/^\s*<(!doctype|html)/i.test(raw)) {
    const code = (raw.match(/id=statusCode>(\d+)/) || [])[1] || '?';
    throw new Error(`被 wiki 的 WAF 拦截（状态码 ${code}）。请等待一段时间后重试，不要连续运行。`);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error('返回内容不是合法 JSON：' + raw.slice(0, 120));
  }
  const wikitext = json.parse && json.parse.wikitext;
  if (typeof wikitext !== 'string') throw new Error('未取到 wikitext，页面名可能已变更');
  return wikitext;
}

// wiki 上的时间均为北京时间，补上 +08:00 偏移，避免不同时区的访客算错倒计时
function toISO(text) {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/.exec(String(text).trim());
  if (!m) return null;
  const p = n => String(n).padStart(2, '0');
  return `${m[1]}-${p(m[2])}-${p(m[3])}T${p(m[4])}:${m[5]}:00+08:00`;
}

function parseCalendar(wikitext) {
  const src = wikitext.replace(/<!--[\s\S]*?-->/g, '');
  const events = [];
  const re = /\{\{活动日历\|([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(src))) {
    const parts = m[1].split('|').map(s => s.trim());
    const start = toISO(parts[1] || '');
    const end = parts[2] ? toISO(parts[2]) : null;
    if (!parts[0] || !start) continue;

    const segs = parts[0].split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
    const name = segs[0];
    const codes = segs.slice(1);

    // 名称形如「活动名」活动类型，取右引号之后的部分作为类型标签
    let tag = '';
    if (!codes.length) {
      const cut = name.lastIndexOf('」');
      if (cut >= 0) tag = name.slice(cut + 1).trim();
    }
    events.push({ name, tag, codes, start, end });
  }
  events.sort((a, b) => a.start.localeCompare(b.start));
  return events;
}

function main() {
  console.log(`拉取 ${PAGE} ...`);
  const events = parseCalendar(fetchWikitext());
  if (!events.length) throw new Error('解析结果为空，wiki 模板格式可能已变更');

  const out = {
    updatedAt: new Date().toISOString(),
    source: `https://${WIKI_HOST}/${WIKI_PATH}/${PAGE}`,
    events,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const now = Date.now();
  console.log(`\n已写入 configs/wuwa-events.json，共 ${events.length} 条\n`);
  for (const e of events) {
    const state = !e.end ? '常驻' : (new Date(e.end).getTime() > now ? '进行中' : '已结束');
    const codes = e.codes.length ? `  [兑换码 ${e.codes.join(' ')}]` : '';
    console.log(`  [${state}] ${e.name}${e.tag ? ' · ' + e.tag : ''}${codes}`);
  }
}

main();
