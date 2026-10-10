#!/usr/bin/env node
/**
 * 只读拉取线上 Turso 数据快照，用于评估用户规模与数据资产。
 *
 * 用法：
 *   TURSO_URL=libsql://xxx.turso.io TURSO_TOKEN=xxx node scripts/db-stats.js
 * 或把两个变量写进项目根目录的 .env（该文件已在 .gitignore 中，不会被提交）
 *
 * 本脚本只执行 SELECT，不做任何写入或删除。
 */
const fs = require('fs');
const path = require('path');

// 项目未引入 dotenv，这里做一次极简 .env 读取
(function loadEnv() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
})();

const url = process.env.TURSO_URL;
const token = process.env.TURSO_TOKEN;
if (!url || !token) {
  console.error('缺少 TURSO_URL / TURSO_TOKEN。');
  console.error('请设置环境变量后重试，或写入项目根目录 .env（已在 .gitignore 中）。');
  process.exit(1);
}

const { createClient } = require('@libsql/client');
const db = createClient({ url, token });

async function q(sql, args = []) {
  const res = await db.execute({ sql, args });
  return res.rows;
}

async function safe(label, fn) {
  try {
    return await fn();
  } catch (e) {
    console.log(`  ${label}: 查询失败（${e.message}）`);
    return null;
  }
}

function fmtTime(v) {
  if (v == null) return '-';
  const n = Number(v);
  const d = Number.isFinite(n) && String(v).length <= 13 && !String(v).includes('-')
    ? new Date(n > 1e12 ? n : n * 1000)
    : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

(async () => {
  console.log('=== 鸣潮估价助手 · 线上数据快照 ===');
  console.log(`生成时间: ${fmtTime(Date.now())}`);
  console.log(`数据库:   ${String(url).replace(/\/\/.*@/, '//***@')}`);
  console.log('（只读查询，未做任何写入）\n');

  // ---------- 查询日志 ----------
  console.log('【查询日志 query_logs】');
  console.log('  注意：代码里每游戏只保留最近 200 条，因此只能反映「近期速率」，无法反映历史累计。');
  const byGame = await safe('按游戏分组', () => q(
    'SELECT game, COUNT(*) AS c, MIN(time) AS mn, MAX(time) AS mx, COUNT(DISTINCT ip) AS ips FROM query_logs GROUP BY game'
  ));
  if (byGame) {
    if (!byGame.length) console.log('  无数据');
    for (const r of byGame) {
      const c = Number(r.c);
      const spanMs = new Date(r.mx).getTime() - new Date(r.mn).getTime();
      const days = spanMs > 0 ? spanMs / 86400000 : 0;
      const rate = days > 0 ? (c / days).toFixed(1) : '样本跨度不足，无法推算';
      console.log(`  ${r.game}: ${c} 条 | 去重 IP ${r.ips} 个 | 跨度 ${fmtTime(r.mn)} ~ ${fmtTime(r.mx)}`);
      console.log(`     → 近期速率 ≈ ${rate}${days > 0 ? ' 次/天' : ''}`);
    }
  }

  const types = await safe('类型分布', () => q(
    'SELECT type, COUNT(*) AS c FROM query_logs GROUP BY type ORDER BY c DESC'
  ));
  if (types && types.length) {
    console.log('  类型分布: ' + types.map((r) => `${r.type || '(空)'} ${r.c}`).join(' / '));
  }

  const succ = await safe('成功率', () => q(
    'SELECT COUNT(*) AS c, SUM(success) AS s FROM query_logs'
  ));
  if (succ && succ[0] && Number(succ[0].c) > 0) {
    const c = Number(succ[0].c);
    const s = Number(succ[0].s || 0);
    console.log(`  成功率: ${((s / c) * 100).toFixed(1)}%（${s}/${c}）`);
  }

  // ---------- 成交记录 ----------
  console.log('\n【成交记录 deals】');
  console.log('  注意：代码里只保留最近 7 天（DEALS_RETENTION_DAYS = 7）。');
  const deals = await safe('成交统计', () => q(
    'SELECT game, COUNT(*) AS c, MIN(pay_time) AS mn, MAX(pay_time) AS mx FROM deals GROUP BY game'
  ));
  if (deals) {
    if (!deals.length) console.log('  无数据');
    for (const r of deals) {
      console.log(`  ${r.game}: ${r.c} 条 | ${fmtTime(r.mn)} ~ ${fmtTime(r.mx)}`);
    }
  }
  const prices = await safe('成交价分布', () => q('SELECT price FROM deals WHERE price > 0'));
  if (prices && prices.length) {
    const arr = prices.map((r) => Number(r.price)).filter((n) => n > 0);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    console.log(`  成交价（样本 ${arr.length} 条）: 中位 ${median(arr)} 元 / 均值 ${avg.toFixed(0)} 元 / 最低 ${Math.min(...arr)} / 最高 ${Math.max(...arr)}`);
  }

  // ---------- 可触达用户 ----------
  console.log('\n【可触达用户 app_config】');
  const keys = await safe('配置键', () => q('SELECT key, updated_at FROM app_config ORDER BY key'));
  if (keys && keys.length) {
    console.log('  配置键: ' + keys.map((r) => r.key).join(', '));
  } else if (keys) {
    console.log('  无配置数据');
  }

  const pushRaw = await safe('推送配置', () => q(
    "SELECT value FROM app_config WHERE key = 'push_config'"
  ));
  if (pushRaw && pushRaw.length && pushRaw[0].value) {
    try {
      const cfg = JSON.parse(pushRaw[0].value);
      const subs = (cfg.pushConfig && cfg.pushConfig.pushPlusSubscribers) || [];
      const now = Date.now();
      let active = 0;
      let bonusTotal = 0;
      const rows = subs.map((s) => {
        const used = Math.floor((now - Number(s.createdAt || 0)) / 86400000);
        const remain = Number(s.validDays || 0) - used;
        const bonus = Number(s.bonusDays || 0);
        bonusTotal += bonus;
        if (remain > 0) active++;
        return { name: s.name || '未命名', remain, bonus, priority: s.priority || 'secondary' };
      });
      console.log(`  PushPlus 订阅者: 共 ${subs.length} 人，其中未过期 ${active} 人`);
      if (bonusTotal) console.log(`  累计赠送天数: ${bonusTotal} 天`);
      if (rows.length) {
        console.log('  明细（仅显示前 20 条）:');
        for (const r of rows.slice(0, 20)) {
          console.log(`    - ${r.name} | 剩余 ${r.remain} 天${r.bonus ? ` | 赠送 ${r.bonus} 天` : ''} | ${r.priority === 'primary' ? '主' : '从'}`);
        }
        if (rows.length > 20) console.log(`    …… 其余 ${rows.length - 20} 人省略`);
      }
    } catch (e) {
      console.log(`  push_config 解析失败: ${e.message}`);
    }
  } else {
    console.log('  未找到 push_config（订阅者列表可能在本地脚本中，未同步到云端）');
  }

  console.log('\n=== 快照结束 ===');
  process.exit(0);
})().catch((e) => {
  console.error('执行失败:', e.message);
  process.exit(1);
});
