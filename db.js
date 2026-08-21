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

// 内存配置存储（当未配置数据库时作为降级方案，重启后丢失）
const memoryConfigStore = new Map();

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
    console.log('[DB] 日志表已就绪');
  } catch (e) {
    console.error('[DB] 建表失败:', e.message);
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
  } catch (e) {
    console.error('[DB] 写入失败:', e.message);
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
    const total = await dbClient.execute({ sql: 'SELECT COUNT(*) as cnt FROM query_logs WHERE game = ?', args: [g] });
    const success = await dbClient.execute({ sql: 'SELECT COUNT(*) as cnt FROM query_logs WHERE success = 1 AND game = ?', args: [g] });
    const lookup = await dbClient.execute({ sql: "SELECT COUNT(*) as cnt FROM query_logs WHERE type = '编号查询' AND game = ?", args: [g] });
    const evalCount = await dbClient.execute({ sql: "SELECT COUNT(*) as cnt FROM query_logs WHERE type = '粘贴估价' AND game = ?", args: [g] });
    return {
      total: total.rows[0].cnt,
      success: success.rows[0].cnt,
      lookup: lookup.rows[0].cnt,
      eval: evalCount.rows[0].cnt,
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
  return { inserted, skipped };
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

module.exports = {
  initDb,
  ensureTable,
  ensureConfigTable,
  ensureDealsTable,
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
};
