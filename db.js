/**
 * db.js - Turso (libSQL) 数据库连接
 * 用于持久化存储查询日志
 *
 * 配置方式（Railway 环境变量）：
 *   TURSO_URL   - 数据库URL（如 libsql://xxx.turso.io）
 *   TURSO_TOKEN - 数据库访问令牌
 *
 * 免费版：100个数据库、5GB存储、每月5亿次读取
 * 注册：https://turso.tech
 */

'use strict';

let dbClient = null;

/**
 * 初始化数据库连接
 */
function initDb() {
  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_TOKEN;

  if (!url || !token) {
    console.log('[DB] 未配置TURSO_URL/TURSO_TOKEN，日志将仅存内存');
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
        error TEXT
      )
    `);
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
    await dbClient.execute({
      sql: `INSERT INTO query_logs (time, type, ip, input, price, estimated_value, ratio, yellow_count, pulls, success, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ],
    });
  } catch (e) {
    console.error('[DB] 写入失败:', e.message);
  }
}

/**
 * 查询日志（分页）
 */
async function queryLogs(limit = 100, offset = 0, filterType = '') {
  if (!dbClient) return [];
  try {
    let sql = 'SELECT * FROM query_logs';
    const args = [];
    if (filterType) {
      sql += ' WHERE type = ?';
      args.push(filterType);
    }
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const result = await dbClient.execute({ sql, args });
    return result.rows.map(r => ({
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
    }));
  } catch (e) {
    console.error('[DB] 查询失败:', e.message);
    return [];
  }
}

/**
 * 获取统计数据
 */
async function getStats() {
  if (!dbClient) return null;
  try {
    const total = await dbClient.execute('SELECT COUNT(*) as cnt FROM query_logs');
    const success = await dbClient.execute('SELECT COUNT(*) as cnt FROM query_logs WHERE success = 1');
    const lookup = await dbClient.execute("SELECT COUNT(*) as cnt FROM query_logs WHERE type = '编号查询'");
    const evalCount = await dbClient.execute("SELECT COUNT(*) as cnt FROM query_logs WHERE type = '粘贴估价'");
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
    return result.rows.map(r => ({
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
    }));
  } catch (e) {
    console.error('[DB] 搜索失败:', e.message);
    return [];
  }
}

module.exports = {
  initDb,
  ensureTable,
  insertLog,
  queryLogs,
  getStats,
  searchLogs,
};
