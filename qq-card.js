// qq-card.js — 猜价游戏卡片图渲染（@napi-rs/canvas → PNG Buffer）
// 依赖 assets/fonts/NotoSansSC-Regular.otf（中文字体，Linux 服务器无系统中文字体必须打包）
// 任何失败（缺依赖/缺字体/图片下载失败）都向上抛错，由调用方回退纯文本回复。
// 注意：canvas 里不能画 emoji（NotoSansSC 无 emoji 字形），卡片文案一律不用 emoji。

const fs = require('fs');
const path = require('path');

let canvasLib = null;
function lib() {
  if (!canvasLib) canvasLib = require('@napi-rs/canvas');
  return canvasLib;
}

let fontReady = false;
function ensureFont() {
  if (fontReady) return true;
  const { GlobalFonts } = lib();
  const p = path.join(__dirname, 'assets', 'fonts', 'NotoSansSC-Regular.otf');
  if (!fs.existsSync(p)) return false;
  GlobalFonts.registerFromPath(p, 'GameSans');
  fontReady = true;
  return true;
}

const W = 720, PAD = 36, INNER = W - PAD * 2;
const C = {
  bgTop: '#231a41', bgBottom: '#3b2b63',
  gold: '#f6c445', text: '#f2eeff', sub: '#b3a8d4',
  panel: 'rgba(255,255,255,0.07)', panelBorder: 'rgba(255,255,255,0.14)',
  accent: '#8b7bff', green: '#7ee2a8',
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 伪粗体：描边同色加粗 */
function boldText(ctx, text, x, y, lw) {
  ctx.save();
  ctx.lineWidth = lw || 1.4;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function wrap(mctx, text, maxW, maxLines) {
  const lines = [];
  let cur = '';
  for (const ch of String(text || '')) {
    if (ch === '\n') { lines.push(cur); cur = ''; continue; }
    if (mctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last && mctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    cut[maxLines - 1] = last + '…';
    return cut;
  }
  return lines;
}

async function loadImg(url, timeoutMs) {
  const { loadImage } = lib();
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs || 6000) });
  if (!r.ok) throw new Error('图片下载失败 HTTP ' + r.status);
  return loadImage(Buffer.from(await r.arrayBuffer()));
}

function drawCover(ctx, img, x, y, w, h, r) {
  rr(ctx, x, y, w, h, r);
  ctx.save();
  ctx.clip();
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
  rr(ctx, x, y, w, h, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBg(ctx, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.bgTop);
  g.addColorStop(1, C.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function header(ctx, title, badge) {
  ctx.textBaseline = 'alphabetic';
  ctx.font = '38px GameSans';
  ctx.fillStyle = C.gold;
  boldText(ctx, title, PAD, 78, 1.6);
  ctx.font = '20px GameSans';
  ctx.fillStyle = C.sub;
  ctx.textAlign = 'right';
  ctx.fillText(badge, W - PAD, 74);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.accent;
  rr(ctx, PAD, 96, 76, 5, 2.5);
  ctx.fill();
}

/** 题目卡：商品图 + 题目文本 + 核心数据（含配队）+ 玩法规则 */
async function renderStartCard(card) {
  const { createCanvas } = lib();
  const m = createCanvas(W, 10).getContext('2d');

  // 预排版（测量）
  m.font = '24px GameSans';
  const titleLines = wrap(m, card.maskedTitle || '', INNER, 5);
  const items = Array.isArray(card.coreInfo) ? card.coreInfo : [];
  const itemLines = items.length ? wrap(m, items.join('   ·   '), INNER - 48, 2) : [];
  m.font = '23px GameSans';
  const teamLines = card.teams ? wrap(m, '成型配队：' + card.teams, INNER - 48, 2) : [];

  // 商品图（可选，失败跳过）
  let img = null;
  if (card.imageUrl) { try { img = await loadImg(card.imageUrl); } catch (e) { /* 无图排版 */ } }
  const imgH = img ? 190 : 0;

  // 面板高度
  const panelRows = itemLines.length + teamLines.length;
  const panelH = panelRows > 0 ? (26 + 40 + panelRows * 40 + 16) : 0;

  let y = 118;
  if (img) y += imgH + 20;
  y += titleLines.length * 38;
  if (titleLines.length) y += 18;
  const panelTop = y;
  y += panelH;
  const footerTop = y + 18;
  const H = Math.round(footerTop + 106);
  const FOOT = PAD + INNER; // 右边界

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawBg(ctx, H);
  header(ctx, '猜价游戏', '螃蟹网 · 昨日真实成交');

  y = 118;
  if (img) {
    drawCover(ctx, img, PAD, y, INNER, imgH, 14);
    y += imgH + 20;
  }
  // 题目
  ctx.font = '24px GameSans';
  ctx.fillStyle = C.text;
  for (const ln of titleLines) {
    ctx.fillText(ln, PAD, y + 27);
    y += 38;
  }
  if (titleLines.length) y += 18;
  // 核心数据面板
  if (panelRows > 0) {
    rr(ctx, PAD, y, INNER, panelH, 14);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    let ry = y + 46;
    ctx.font = '22px GameSans';
    ctx.fillStyle = C.gold;
    ctx.fillText('核心数据', PAD + 24, ry - 20);
    ry += 8;
    ctx.font = '24px GameSans';
    ctx.fillStyle = C.text;
    for (const ln of itemLines) { ctx.fillText(ln, PAD + 24, ry + 10); ry += 40; }
    ctx.font = '23px GameSans';
    ctx.fillStyle = C.sub;
    for (const ln of teamLines) { ctx.fillText(ln, PAD + 24, ry + 10); ry += 40; }
    y = panelTop + panelH;
  }
  // 玩法规则
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, footerTop + 12); ctx.lineTo(FOOT, footerTop + 12); ctx.stroke();
  ctx.font = '20px GameSans';
  ctx.fillStyle = C.sub;
  ctx.fillText('「猜 4500」参与竞猜（可改价）  ·  「我叫XX」登记昵称', PAD, footerTop + 46);
  ctx.fillText('猜进成交价 ±10% 即刻揭晓 · 1分钟无人猜中自动揭晓', PAD, footerTop + 76);
  return canvas.toBuffer('image/png');
}

const REASON_TITLE = {
  solved: '有人猜中 · 揭晓答案',
  timeout: '1分钟无人猜中 · 揭晓',
  manual: '提前揭晓',
  recap: '上一局猜价结果',
};

/** 揭晓卡：成交价大字 + 胜者 + 猜价列表 + 商品二维码 */
async function renderRevealCard(card) {
  const { createCanvas } = lib();
  const m = createCanvas(W, 10).getContext('2d');

  const p = Number(card.priceYuan) || 0;
  const lo = Math.round(p * 0.9), hi = Math.round(p * 1.1);
  const guesses = (card.guesses || []).slice(0, 8);
  const more = (card.guesses || []).length - guesses.length;
  m.font = '24px GameSans';
  const titleLine = card.maskedTitle ? wrap(m, card.maskedTitle, INNER, 1)[0] : '';

  // QR 码
  let qrImg = null;
  if (card.productUrl) {
    try {
      const QR = require('qrcode');
      const buf = await QR.toBuffer(card.productUrl, { width: 300, margin: 1, color: { dark: '#171128', light: '#ffffff' } });
      qrImg = await lib().loadImage(buf);
    } catch (e) { /* 无二维码降级为纯链接文字 */ }
  }

  const titleTop = 130;
  const priceTop = titleTop + (titleLine ? 60 : 20);
  const winnerTop = card.winner ? priceTop + 106 : 0;
  const listTop = card.winner ? winnerTop + 24 : priceTop + 84;
  const listH = guesses.length ? (74 + guesses.length * 40 + (more > 0 ? 36 : 0)) : 0;
  const qrTop = listTop + listH + 20;
  const qrH = qrImg ? 170 : 84;
  const H = Math.round(qrTop + qrH + 34);
  const FOOT = PAD + INNER; // 右边界

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawBg(ctx, H);
  header(ctx, REASON_TITLE[card.reason] || '猜价揭晓', '螃蟹网 · 真实成交');

  // 本局题目（1行）
  if (titleLine) {
    ctx.font = '23px GameSans';
    ctx.fillStyle = C.sub;
    ctx.fillText(titleLine, PAD, titleTop);
  }
  // 成交价
  ctx.font = '58px GameSans';
  ctx.fillStyle = C.gold;
  boldText(ctx, '¥' + p, PAD, priceTop + 62, 2.4);
  ctx.font = '20px GameSans';
  ctx.fillStyle = C.sub;
  ctx.textAlign = 'right';
  ctx.fillText('±10% 区间 ¥' + lo + ' ~ ¥' + hi, W - PAD, priceTop + 56);
  ctx.textAlign = 'left';
  // 胜者
  let y = listTop;
  if (card.winner) {
    ctx.font = '26px GameSans';
    ctx.fillStyle = C.green;
    boldText(ctx, '胜者 ' + card.winner.name + '（猜 ¥' + card.winner.guess + ' · 误差 ' + card.winner.err + '%）', PAD, winnerTop, 1.4);
  }
  // 猜价列表
  if (guesses.length) {
    rr(ctx, PAD, y, INNER, listH, 14);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    let ry = y + 44;
    ctx.font = '22px GameSans';
    ctx.fillStyle = C.gold;
    ctx.fillText('本局猜价（' + (card.guesses || []).length + ' 人）', PAD + 24, ry);
    ry += 14;
    ctx.font = '24px GameSans';
    guesses.forEach((g2, i) => {
      ry += 40;
      ctx.fillStyle = C.text;
      ctx.fillText((i + 1) + '. ' + g2.name, PAD + 24, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = card.winner && g2.name === card.winner.name ? C.gold : C.sub;
      ctx.fillText('¥' + g2.guess, FOOT - 24, ry);
      ctx.textAlign = 'left';
    });
    if (more > 0) {
      ry += 34;
      ctx.fillStyle = C.sub;
      ctx.font = '22px GameSans';
      ctx.fillText('……共 ' + (card.guesses || []).length + ' 人参与', PAD + 24, ry);
    }
  }
  // 底部：二维码 + 链接
  if (qrImg) {
    drawCover(ctx, qrImg, PAD, qrTop, 150, 150, 12);
    ctx.font = '23px GameSans';
    ctx.fillStyle = C.text;
    ctx.fillText('扫码查看商品详情', PAD + 180, qrTop + 60);
    ctx.font = '19px GameSans';
    ctx.fillStyle = C.sub;
    const urlLines = wrap(ctx, card.productUrl || '', INNER - 180, 2);
    urlLines.forEach((ln, i) => ctx.fillText(ln, PAD + 180, qrTop + 96 + i * 28));
  } else if (card.productUrl) {
    ctx.font = '21px GameSans';
    ctx.fillStyle = C.sub;
    wrap(ctx, '商品链接：' + card.productUrl, INNER, 2).forEach((ln, i) => ctx.fillText(ln, PAD, qrTop + 20 + i * 30));
  }
  return canvas.toBuffer('image/png');
}

async function renderCard(card) {
  if (!ensureFont()) throw new Error('卡片字体缺失');
  if (card && card.type === 'start') return renderStartCard(card);
  if (card && card.type === 'reveal') return renderRevealCard(card);
  throw new Error('未知卡片类型');
}

module.exports = { renderCard };
