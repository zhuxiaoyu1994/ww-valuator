/**
 * db.js - Turso (libSQL) 数据库连接
 * 用于持久化存储查询日志
 *
 * 配置方式（Vercel 环境变量）：
 *   TURSO_URL   - 数据库URL（如 libsql://xxx.turso.io）
 *   TURSO_TOKEN - 数据库访问令牌
 *
 * 免费版：100个数据库、5GB存储、每月5亿次读取
 * 注册：https://turso.tech
 */

'use strict';

let dbClient = null;

// 成交记录保留天数（按入库时间计算，超期自动清理）
const DEALS_RETENTION_DAYS = 7;

// 内存配置存储（当未配置数据库时作为降级方案，重启后丢失）
const memoryConfigStore = new Map();

// 按东八区（Asia/Shanghai）计算日期字符串 YYYY-MM-DD
function localDay(iso) {
  const t = iso ? Date.parse(iso) : Date.now();
  const d = new Date((isNaN(t) ? Date.now() : t) + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * 初始化数据库连接
 */
function initDb() {
  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_TOKEN;

  if (!url || !token) {
    console.log('[DB] 未配置TURSO_URL/TURSO_TOKEN，日志和配置将仅存内存');
    return null;
  }

  try {
    const { createClient } = require('@libsql/client');
    dbClient = createClient({ url, authToken: token });
    console.log('[DB] Turso数据库已连接');
    return dbClient;
  } catch (e) {
    console.error('[DB] 连接失败:', e.message);
    return null;
  }
}

/**
 * 创建日志表（首次启动时调用）
 */
async function ensureTable() {
  if (!dbClient) return;
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT NOT NULL,
        type TEXT NOT NULL,
        ip TEXT,
        input TEXT,
        price REAL,
        estimated_value REAL,
        ratio REAL,
        yellow_count INTEGER,
        pulls INTEGER,
        success INTEGER NOT NULL DEFAULT 1,
        error TEXT,
        details_json TEXT
      )
    `);
    // 兼容旧表：添加 details_json 列（如果不存在）
    try {
      await dbClient.execute(`ALTER TABLE query_logs ADD COLUMN details_json TEXT`);
    } catch (e) {
      // 列已存在，忽略
    }
    // 兼容旧表：添加 game 列（多游戏支持，旧行回填为 wuwa）
    try {
      await dbClient.execute(`ALTER TABLE query_logs ADD COLUMN game TEXT DEFAULT 'wuwa'`);
      await dbClient.execute(`UPDATE query_logs SET game = 'wuwa' WHERE game IS NULL`);
      console.log('[DB] 日志表已添加 game 列，旧数据回填为 wuwa');
    } catch (e) {
      // 列已存在，忽略
    }
    // 累计统计表（独立于 query_logs 的滚动裁剪，用于统计历史总量与人数）
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS query_stats_daily (
        day TEXT NOT NULL,
        game TEXT NOT NULL,
        queries INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 0,
        eval_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, game)
      )
    `);
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS query_ips (
        game TEXT NOT NULL,
        ip TEXT NOT NULL,
        first_seen TEXT,
        last_seen TEXT,
        queries INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (game, ip)
      )
    `);
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS query_ips_daily (
        day TEXT NOT NULL,
        game TEXT NOT NULL,
        ip TEXT NOT NULL,
        queries INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, game, ip)
      )
    `);
    console.log('[DB] 累计统计表已就绪');
    await backfillStats();
    console.log('[DB] 日志表已就绪');
  } catch (e) {
    console.error('[DB] 建表失败:', e.message);
  }
}

/**
 * 首次建表时用现有 query_logs 回填累计统计（仅执行一次）
 */
async function backfillStats() {
  try {
    const r = await dbClient.execute('SELECT COUNT(*) AS cnt FROM query_stats_daily');
    if (Number(r.rows[0].cnt) > 0) return;
    await dbClient.execute(`
      INSERT INTO query_stats_daily (day, game, queries, success, eval_count)
      SELECT date(time, '+8 hours') AS day, game, COUNT(*), SUM(success),
             SUM(CASE WHEN type = '粘贴估价' THEN 1 ELSE 0 END)
      FROM query_logs GROUP BY day, game
    `);
    await dbClient.execute(`
      INSERT OR IGNORE INTO query_ips (game, ip, first_seen, last_seen, queries)
      SELECT game, ip, MIN(time), MAX(time), COUNT(*) FROM query_logs
      WHERE ip IS NOT NULL AND ip != '' GROUP BY game, ip
    `);
    await dbClient.execute(`
      INSERT OR IGNORE INTO query_ips_daily (day, game, ip, queries)
      SELECT date(time, '+8 hours'), game, ip, COUNT(*) FROM query_logs
      WHERE ip IS NOT NULL AND ip != '' GROUP BY date(time, '+8 hours'), game, ip
    `);
    console.log('[DB] 累计统计已从现有日志回填');
  } catch (e) {
    console.error('[DB] 累计统计回填失败:', e.message);
  }
}

/**
 * 写入查询日志
 */
async function insertLog(log) {
  // 同时写入内存（兼容未配置数据库的情况）
  // 内存写入由调用方处理

  if (!dbClient) return;
  try {
    // 序列化估值详情（details + characters）
    let detailsJson = null;
    if (log.details) {
      detailsJson = JSON.stringify({
        details: log.details,
        characters: log.characters || [],
      });
    }
    await dbClient.execute({
      sql: `INSERT INTO query_logs (time, type, ip, input, price, estimated_value, ratio, yellow_count, pulls, success, error, details_json, game)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        log.time,
        log.type,
        log.ip || '',
        (log.input || '').substring(0, 500),
        log.price != null ? log.price : null,
        log.estimatedValue != null ? log.estimatedValue : null,
        log.ratio != null ? log.ratio : null,
        log.yellowCount != null ? log.yellowCount : null,
        log.pulls != null ? log.pulls : null,
        log.success ? 1 : 0,
        log.error || null,
        detailsJson,
        log.game || 'wuwa',
      ],
    });

    // 累加统计（独立于 query_logs 裁剪，保证历史总量与人数不丢失）
    const day = localDay(log.time);
    const game = log.game || 'wuwa';
    const ip = (log.ip || '').trim();
    const stmts = [{
      sql: `INSERT INTO query_stats_daily (day, game, queries, success, eval_count)
            VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(day, game) DO UPDATE SET
              queries = queries + 1,
              success = success + excluded.success,
              eval_count = eval_count + excluded.eval_count`,
      args: [day, game, log.success ? 1 : 0, log.type === '粘贴估价' ? 1 : 0],
    }];
    if (ip) {
      stmts.push({
        sql: `INSERT INTO query_ips (game, ip, first_seen, last_seen, queries)
              VALUES (?, ?, ?, ?, 1)
              ON CONFLICT(game, ip) DO UPDATE SET
                last_seen = excluded.last_seen, queries = queries + 1`,
        args: [game, ip, log.time, log.time],
      });
      stmts.push({
        sql: `INSERT INTO query_ips_daily (day, game, ip, queries)
              VALUES (?, ?, ?, 1)
              ON CONFLICT(day, game, ip) DO UPDATE SET queries = queries + 1`,
        args: [day, game, ip],
      });
    }
    await dbClient.batch(stmts, 'write');
  } catch (e) {
    console.error('[DB] 写入失败:', e.message);
  }

  // 清理旧日志，只保留最近 200 条（避免数据库无限增长）
  // 每插入 20 条清理一次，降低开销
  try {
    if (!insertLog._counter) insertLog._counter = 0;
    insertLog._counter++;
    if (insertLog._counter >= 20) {
      insertLog._counter = 0;
      // 按游戏分别保留最近 200 条
      const games = ['wuwa', 'zzz'];
      for (const g of games) {
        await dbClient.execute({
          sql: `DELETE FROM query_logs WHERE game = ? AND id NOT IN (
                  SELECT id FROM query_logs WHERE game = ? ORDER BY id DESC LIMIT 200
                )`,
          args: [g, g],
        });
      }
    }
  } catch (e) {
    console.error('[DB] 清理旧日志失败:', e.message);
  }
}

/**
 * 查询日志（分页，按游戏筛选）
 */
async function queryLogs(limit = 100, offset = 0, filterType = '', game = '') {
  if (!dbClient) return [];
  try {
    let sql = 'SELECT * FROM query_logs';
    const conds = [];
    const args = [];
    if (filterType) {
      conds.push('type = ?');
      args.push(filterType);
    }
    if (game) {
      conds.push("game = ?");
      args.push(game);
    }
    if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const result = await dbClient.execute({ sql, args });
    return result.rows.map(r => {
      const entry = {
        time: r.time,
        type: r.type,
        ip: r.ip,
        input: r.input,
        game: r.game || 'wuwa',
        price: r.price,
        estimatedValue: r.estimated_value,
        ratio: r.ratio,
        yellowCount: r.yellow_count,
        pulls: r.pulls,
        success: r.success === 1,
        error: r.error,
      };
      // 解析估值详情
      if (r.details_json) {
        try {
          const parsed = JSON.parse(r.details_json);
          entry.details = parsed.details || null;
          entry.characters = parsed.characters || [];
        } catch (e) { /* 忽略解析失败 */ }
      }
      return entry;
    });
  } catch (e) {
    console.error('[DB] 查询失败:', e.message);
    return [];
  }
}

/**
 * 获取统计数据（按游戏筛选）
 */
async function getStats(game = '') {
  if (!dbClient) return null;
  try {
    const g = game || 'wuwa';
    const today = localDay();
    const rows = await dbClient.batch([
      { sql: 'SELECT COALESCE(SUM(queries),0) AS cnt FROM query_stats_daily WHERE game = ?', args: [g] },
      { sql: 'SELECT COALESCE(SUM(success),0) AS cnt FROM query_stats_daily WHERE game = ?', args: [g] },
      { sql: 'SELECT COALESCE(SUM(eval_count),0) AS cnt FROM query_stats_daily WHERE game = ?', args: [g] },
      { sql: 'SELECT COUNT(*) AS cnt FROM query_ips WHERE game = ?', args: [g] },
      { sql: 'SELECT COALESCE(SUM(queries),0) AS cnt FROM query_stats_daily WHERE game = ? AND day = ?', args: [g, today] },
      { sql: 'SELECT COUNT(*) AS cnt FROM query_ips_daily WHERE game = ? AND day = ?', args: [g, today] },
    ], 'read');
    return {
      total: Number(rows[0].rows[0].cnt),
      success: Number(rows[1].rows[0].cnt),
      eval: Number(rows[2].rows[0].cnt),
      people: Number(rows[3].rows[0].cnt),
      todayQueries: Number(rows[4].rows[0].cnt),
      todayPeople: Number(rows[5].rows[0].cnt),
    };
  } catch (e) {
    console.error('[DB] 统计失败:', e.message);
    return null;
  }
}

/**
 * 搜索日志
 */
async function searchLogs(keyword, limit = 100) {
  if (!dbClient) return [];
  try {
    const result = await dbClient.execute({
      sql: `SELECT * FROM query_logs
            WHERE input LIKE ? OR ip LIKE ? OR error LIKE ?
            ORDER BY id DESC LIMIT ?`,
      args: [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, limit],
    });
    return result.rows.map(r => {
      const entry = {
        time: r.time,
        type: r.type,
        ip: r.ip,
        input: r.input,
        price: r.price,
        estimatedValue: r.estimated_value,
        ratio: r.ratio,
        yellowCount: r.yellow_count,
        pulls: r.pulls,
        success: r.success === 1,
        error: r.error,
      };
      if (r.details_json) {
        try {
          const parsed = JSON.parse(r.details_json);
          entry.details = parsed.details || null;
          entry.characters = parsed.characters || [];
        } catch (e) { /* 忽略 */ }
      }
      return entry;
    });
  } catch (e) {
    console.error('[DB] 搜索失败:', e.message);
    return [];
  }
}

/**
 * 确保配置表存在
 */
async function ensureConfigTable() {
  if (!dbClient) return;
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  } catch (e) {
    console.error('[DB] 建配置表失败:', e.message);
  }
}

/**
 * 获取配置
 */
async function getConfig(key) {
  if (!dbClient) {
    return memoryConfigStore.has(key) ? memoryConfigStore.get(key).value : null;
  }
  try {
    const result = await dbClient.execute({
      sql: 'SELECT value FROM app_config WHERE key = ?',
      args: [key],
    });
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
    return null;
  } catch (e) {
    console.error('[DB] 读配置失败:', e.message);
    return null;
  }
}

/**
 * 获取配置（含元数据：updated_at 时间戳）
 * 用于客户端检测服务器端配置是否已更新
 */
async function getConfigWithMeta(key) {
  if (!dbClient) {
    if (memoryConfigStore.has(key)) {
      return memoryConfigStore.get(key);
    }
    return { value: null, updatedAt: null };
  }
  try {
    const result = await dbClient.execute({
      sql: 'SELECT value, updated_at FROM app_config WHERE key = ?',
      args: [key],
    });
    if (result.rows.length > 0) {
      return {
        value: JSON.parse(result.rows[0].value),
        updatedAt: result.rows[0].updated_at,
      };
    }
    return { value: null, updatedAt: null };
  } catch (e) {
    console.error('[DB] 读配置(含元数据)失败:', e.message);
    return { value: null, updatedAt: null };
  }
}

/**
 * 设置配置
 */
async function setConfig(key, value) {
  if (!dbClient) {
    memoryConfigStore.set(key, { value, updatedAt: new Date().toISOString() });
    return true;
  }
  try {
    await dbClient.execute({
      sql: `INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, JSON.stringify(value), new Date().toISOString()],
    });
    return true;
  } catch (e) {
    console.error('[DB] 写配置失败:', e.message);
    return false;
  }
}

// ============================================================
// 成交记录持久化
// ============================================================

/**
 * 创建成交记录表
 */
async function ensureDealsTable() {
  if (!dbClient) return;
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS deals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT UNIQUE NOT NULL,
        product_unique_no TEXT,
        price REAL,
        estimated_value REAL,
        deviation REAL,
        deviation_percent REAL,
        pay_time TEXT,
        show_title TEXT,
        short_description TEXT,
        yellow_count INTEGER,
        pulls INTEGER,
        characters_json TEXT,
        attr_name_list_json TEXT,
        main_image_url TEXT,
        url TEXT,
        details_json TEXT,
        cost_performance REAL,
        fetched_at TEXT NOT NULL
      )
    `);
    // 兼容旧表：添加 game 列（多游戏支持，旧行回填为 wuwa——历史成交均来自鸣潮商品池）
    try {
      await dbClient.execute(`ALTER TABLE deals ADD COLUMN game TEXT DEFAULT 'wuwa'`);
      await dbClient.execute(`UPDATE deals SET game = 'wuwa' WHERE game IS NULL`);
      console.log('[DB] 成交记录表已添加 game 列，旧数据回填为 wuwa');
    } catch (e) {
      // 列已存在，忽略
    }
    console.log('[DB] 成交记录表已就绪');
  } catch (e) {
    console.error('[DB] 建成交记录表失败:', e.message);
  }
}

/**
 * 批量插入成交记录（自动去重，已存在的 productId 跳过）
 */
async function insertDealsBatch(deals) {
  if (!dbClient || !deals || deals.length === 0) return { inserted: 0, skipped: 0 };
  let inserted = 0, skipped = 0;
  const now = new Date().toISOString();
  const stmts = [];
  for (const deal of deals) {
    stmts.push({
      sql: `INSERT INTO deals (product_id, product_unique_no, price, estimated_value, deviation, deviation_percent,
            pay_time, show_title, short_description, yellow_count, pulls, characters_json, attr_name_list_json,
            main_image_url, url, details_json, cost_performance, game, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id) DO NOTHING`,
      args: [
        deal.productId || '',
        deal.productUniqueNo || '',
        deal.price != null ? deal.price : null,
        deal.estimatedValue != null ? deal.estimatedValue : null,
        deal.deviation != null ? deal.deviation : null,
        deal.deviationPercent != null ? deal.deviationPercent : null,
        deal.payTime || '',
        deal.showTitle || '',
        deal.shortDescription || '',
        deal.yellowCount != null ? deal.yellowCount : 0,
        deal.pulls != null ? deal.pulls : 0,
        deal.characters ? JSON.stringify(deal.characters) : null,
        deal.attrNameList ? JSON.stringify(deal.attrNameList) : null,
        deal.mainImageUrl || '',
        deal.url || '',
        deal.details ? JSON.stringify(deal.details) : null,
        deal.costPerformance != null ? deal.costPerformance : null,
        deal.game || 'wuwa',
        now,
      ],
    });
  }
  try {
    const results = await dbClient.batch(stmts);
    for (const r of results) {
      if (r.rowsAffected > 0) inserted++; else skipped++;
    }
    console.log(`[DB] 成交记录批量插入: ${inserted} 新增, ${skipped} 跳过`);
  } catch (e) {
    console.error('[DB] 批量插入失败，尝试逐条插入:', e.message);
    // 回退到逐条插入
    for (const stmt of stmts) {
      try {
        const r = await dbClient.execute(stmt);
        if (r.rowsAffected > 0) inserted++; else skipped++;
      } catch (e2) {
        skipped++;
      }
    }
    console.log(`[DB] 成交记录逐条插入: ${inserted} 新增, ${skipped} 跳过`);
  }
  // 只保留最近 N 天成交记录，避免数据库无限增长（以入库时间为准，成交数据每日抓取一次昨日成交，时间差约一天）
  await cleanupOldDeals(DEALS_RETENTION_DAYS);
  return { inserted, skipped };
}

/**
 * 清理超期成交记录
 * @param {number} days - 保留天数（按 fetched_at 入库时间计算，ISO 字符串字典序即时间序）
 */
async function cleanupOldDeals(days) {
  if (!dbClient) return 0;
  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = await dbClient.execute({
      sql: 'DELETE FROM deals WHERE fetched_at < ?',
      args: [cutoff],
    });
    if (result.rowsAffected > 0) {
      console.log(`[DB] 成交记录清理: 删除 ${result.rowsAffected} 条 ${days} 天前的记录`);
    }
    return result.rowsAffected;
  } catch (e) {
    console.error('[DB] 清理成交记录失败:', e.message);
    return 0;
  }
}

/**
 * 查询成交记录（分页，按游戏筛选）
 */
async function queryDeals(limit = 100, offset = 0, game = '') {
  if (!dbClient) return { list: [], total: 0 };
  try {
    const g = game || 'wuwa';
    const countResult = await dbClient.execute({ sql: 'SELECT COUNT(*) as cnt FROM deals WHERE game = ?', args: [g] });
    const total = countResult.rows[0].cnt;

    const result = await dbClient.execute({
      sql: 'SELECT * FROM deals WHERE game = ? ORDER BY pay_time DESC, id DESC LIMIT ? OFFSET ?',
      args: [g, limit, offset],
    });

    const list = result.rows.map(r => {
      const item = {
        productId: r.product_id,
        productUniqueNo: r.product_unique_no,
        price: r.price,
        estimatedValue: r.estimated_value,
        deviation: r.deviation,
        deviationPercent: r.deviation_percent,
        payTime: r.pay_time,
        showTitle: r.show_title,
        shortDescription: r.short_description,
        game: r.game || 'wuwa',
        yellowCount: r.yellow_count,
        pulls: r.pulls,
        attrNameList: r.attr_name_list_json ? JSON.parse(r.attr_name_list_json) : [],
        mainImageUrl: r.main_image_url,
        url: r.url,
        costPerformance: r.cost_performance,
        _fromDb: true,
      };
      if (r.characters_json) {
        try { item.characters = JSON.parse(r.characters_json); } catch (e) { item.characters = []; }
      } else {
        item.characters = [];
      }
      if (r.details_json) {
        try { item.details = JSON.parse(r.details_json); } catch (e) { item.details = null; }
      } else {
        item.details = null;
      }
      return item;
    });

    return { list, total };
  } catch (e) {
    console.error('[DB] 查询成交记录失败:', e.message);
    return { list: [], total: 0 };
  }
}

/**
 * 查询所有成交记录的统计数据（精简字段，用于公开统计页面，按游戏筛选）
 */
async function queryAllDealsForStats(game = '') {
  if (!dbClient) return { list: [], total: 0 };
  try {
    const g = game || 'wuwa';
    const countResult = await dbClient.execute({ sql: 'SELECT COUNT(*) as cnt FROM deals WHERE game = ?', args: [g] });
    const total = countResult.rows[0].cnt;

    const result = await dbClient.execute({
      sql: 'SELECT estimated_value, price, deviation, deviation_percent, yellow_count, pulls, characters_json, show_title FROM deals WHERE estimated_value > 0 AND game = ? ORDER BY pay_time DESC',
      args: [g],
    });

    const list = result.rows.map(r => {
      const item = {
        estimatedValue: r.estimated_value,
        price: r.price,
        deviation: r.deviation,
        deviationPercent: r.deviation_percent,
        yellowCount: r.yellow_count,
        pulls: r.pulls,
        showTitle: r.show_title,
      };
      if (r.characters_json) {
        try { item.characters = JSON.parse(r.characters_json); } catch (e) { item.characters = []; }
      } else {
        item.characters = [];
      }
      return item;
    });

    return { list, total };
  } catch (e) {
    console.error('[DB] 查询统计数据失败:', e.message);
    return { list: [], total: 0 };
  }
}

/**
 * 删除成交记录
 */
async function deleteDealByProductId(productId) {
  if (!dbClient) return false;
  try {
    const result = await dbClient.execute({
      sql: 'DELETE FROM deals WHERE product_id = ?',
      args: [productId],
    });
    return result.rowsAffected > 0;
  } catch (e) {
    console.error('[DB] 删除成交记录失败:', e.message);
    return false;
  }
}

// ============================================================
// 限流计数（基于数据库，支持 Serverless 多实例）
// ============================================================

/**
 * 确保限流计数表存在
 */
async function ensureRateLimitTable() {
  if (!dbClient) return;
  try {
    await dbClient.execute(`
      CREATE TABLE IF NOT EXISTS rate_counters (
        ip TEXT NOT NULL,
        window_key TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (ip, window_key)
      )
    `);
    // 索引：按 IP 查询
    try {
      await dbClient.execute(`CREATE INDEX IF NOT EXISTS idx_rate_counters_ip ON rate_counters(ip)`);
    } catch (e) { /* 索引已存在 */ }
    console.log('[DB] 限流计数表已就绪');
  } catch (e) {
    console.error('[DB] 建限流表失败:', e.message);
  }
}

/**
 * 原子递增限流计数并返回当前计数值
 * @param {string} ip - 客户端IP
 * @param {string} windowKey - 窗口键（如 "1min:12345" 或 "5min:123"）
 * @returns {number} 当前计数值（递增后）
 */
async function incrementRateCounter(ip, windowKey) {
  if (!dbClient) return null; // 无数据库时返回 null，调用方回退到内存计数
  try {
    const now = new Date().toISOString();
    // 原子 upsert + increment
    await dbClient.execute({
      sql: `INSERT INTO rate_counters (ip, window_key, count, updated_at)
            VALUES (?, ?, 1, ?)
            ON CONFLICT(ip, window_key) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`,
      args: [ip, windowKey, now],
    });
    // 读取当前值
    const result = await dbClient.execute({
      sql: 'SELECT count FROM rate_counters WHERE ip = ? AND window_key = ?',
      args: [ip, windowKey],
    });
    if (result.rows.length > 0) {
      return result.rows[0].count;
    }
    return 1;
  } catch (e) {
    console.error('[DB] 限流计数递增失败:', e.message);
    return null;
  }
}

/**
 * 获取限流计数
 */
async function getRateCounter(ip, windowKey) {
  if (!dbClient) return 0;
  try {
    const result = await dbClient.execute({
      sql: 'SELECT count FROM rate_counters WHERE ip = ? AND window_key = ?',
      args: [ip, windowKey],
    });
    if (result.rows.length > 0) {
      return result.rows[0].count;
    }
    return 0;
  } catch (e) {
    console.error('[DB] 限流计数查询失败:', e.message);
    return 0;
  }
}

/**
 * 清理过期的限流计数（定期调用，避免表无限增长）
 * @param {number} maxAgeSeconds - 保留多久的计数（秒）
 */
async function cleanupRateCounters(maxAgeSeconds = 600) {
  if (!dbClient) return 0;
  try {
    const cutoff = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();
    const result = await dbClient.execute({
      sql: 'DELETE FROM rate_counters WHERE updated_at < ?',
      args: [cutoff],
    });
    if (result.rowsAffected > 0) {
      console.log(`[DB] 限流计数清理: 删除 ${result.rowsAffected} 条过期记录`);
    }
    return result.rowsAffected;
  } catch (e) {
    console.error('[DB] 限流计数清理失败:', e.message);
    return 0;
  }
}

module.exports = {
  initDb,
  ensureTable,
  ensureConfigTable,
  ensureDealsTable,
  ensureRateLimitTable,
  insertLog,
  queryLogs,
  getStats,
  searchLogs,
  getConfig,
  getConfigWithMeta,
  setConfig,
  insertDealsBatch,
  queryDeals,
  queryAllDealsForStats,
  deleteDealByProductId,
  cleanupOldDeals,
  incrementRateCounter,
  getRateCounter,
  cleanupRateCounters,
};
