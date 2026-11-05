'use strict';

const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');

const source = fs.readFileSync(__dirname + '/public/crab-monitor.user.js', 'utf8');

function createClient(game) {
  const start = source.indexOf('  // 代理人商品事件上报：15秒 / 最多20条 / 轮末三重触发');
  const end = source.indexOf('  // ============================================================\n  // 导出功能', start);
  assert.ok(start >= 0 && end > start, '必须找到完整的上报队列代码块');
  const block = source.slice(start, end);
  const pushConfig = { dispatchToken: 'ingest-test-token' };
  const timers = [];
  const requests = [];
  let responder = () => ({ status: 200, body: { success: true } });

  function fakeSetTimeout(fn, delay) {
    const timer = { fn, delay, active: true };
    timers.push(timer);
    return timer;
  }
  function fakeClearTimeout(timer) {
    if (timer) timer.active = false;
  }
  function GM_xmlhttpRequest(options) {
    requests.push(options);
    const response = responder(options, requests.length);
    queueMicrotask(() => {
      if (response.networkError) return options.onerror();
      if (response.timeout) return options.ontimeout();
      options.onload({ status: response.status, responseText: JSON.stringify(response.body || {}) });
    });
  }
  const silentConsole = { warn() {}, log() {}, error() {} };
  const md5 = (text) => crypto.createHash('md5').update(text).digest('hex');
  const api = new Function(
    'pushConfig', 'currentGame', 'GM_xmlhttpRequest', 'AGENT_PUSH_URL',
    'AGENT_PUSH_BATCH_SIZE', 'AGENT_PUSH_FLUSH_DELAY', 'kjsMd5',
    'setTimeout', 'clearTimeout', 'Date', 'console',
    block + '\nreturn { queueAgentPushEvent, flushAgentPushQueue, getQueue: function () { return agentPushQueue; } };'
  )(
    pushConfig, game || 'wuwa', GM_xmlhttpRequest,
    'https://www.youxigujia.cn/api/agent-push/dispatch', 20, 15000, md5,
    fakeSetTimeout, fakeClearTimeout, Date, silentConsole
  );

  return {
    api,
    pushConfig,
    timers,
    requests,
    setResponder(fn) { responder = fn; },
    activeTimer() { return timers.find((timer) => timer.active); },
    async runTimer() {
      const timer = this.activeTimer();
      assert.ok(timer, '必须存在待执行计时器');
      timer.active = false;
      timer.fn();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

function input(id, overrides) {
  return Object.assign({
    platform: 'pxb7',
    stage: 'pxb7_detail',
    productId: 'product-' + id,
    showTitle: '2命椿 0命守岸人',
    price: 1000,
    value: 1500,
    characters: [{ name: '椿', const: 2 }, { name: '守岸人', const: 0 }],
    goodsImg: 'https://example.com/image.jpg',
    productUrl: 'https://www.pxb7.com/product/' + id + '/1',
  }, overrides || {});
}

(async () => {
  console.log('[1] 未配置密钥不上报；首条事件启动15秒计时器');
  const client = createClient();
  client.pushConfig.dispatchToken = '';
  assert.strictEqual(client.api.queueAgentPushEvent(input('disabled')), false);
  assert.strictEqual(client.requests.length, 0);
  client.pushConfig.dispatchToken = 'ingest-test-token';
  assert.strictEqual(client.api.queueAgentPushEvent(input('one')), true);
  assert.strictEqual(client.api.queueAgentPushEvent(input('one')), false, '队列内相同事件不得重复入队');
  assert.strictEqual(client.api.getQueue().length, 1);
  assert.strictEqual(client.activeTimer().delay, 15000);
  await client.runTimer();
  assert.strictEqual(client.requests.length, 1);
  let body = JSON.parse(client.requests[0].data);
  assert.strictEqual(body.events.length, 1, '不足20条也必须在15秒后上报');
  assert.strictEqual(client.requests[0].headers['x-dispatch-token'], 'ingest-test-token');
  assert.strictEqual(client.requests[0].headers.Origin, undefined);
  assert.strictEqual(client.requests[0].headers.Referer, undefined);
  assert.strictEqual(client.api.getQueue().length, 0);
  console.log('  ✓ 1条事件也会按时上报，请求仅携带独立上报密钥');

  console.log('[2] 达到20条覆盖15秒等待并立即上报');
  const batchClient = createClient();
  for (let index = 0; index < 20; index++) {
    assert.strictEqual(batchClient.api.queueAgentPushEvent(input('batch-' + index)), true);
  }
  assert.strictEqual(batchClient.activeTimer().delay, 0);
  await batchClient.runTimer();
  assert.strictEqual(batchClient.requests.length, 1);
  body = JSON.parse(batchClient.requests[0].data);
  assert.strictEqual(body.events.length, 20);
  assert.strictEqual(batchClient.api.getQueue().length, 0);
  console.log('  ✓ 每批恰好最多20条，无需等待15秒或凑满下一轮');

  console.log('[3] 轮末flush不足20条立即上报，失败保留原eventId后重试');
  const retryClient = createClient();
  retryClient.api.queueAgentPushEvent(input('retry'));
  const originalId = retryClient.api.getQueue()[0].eventId;
  retryClient.setResponder(() => ({ status: 200, body: { success: false, failed: 1 } }));
  assert.strictEqual(await retryClient.api.flushAgentPushQueue(), false);
  assert.strictEqual(retryClient.api.getQueue().length, 1);
  assert.strictEqual(retryClient.api.getQueue()[0].eventId, originalId);
  assert.strictEqual(retryClient.activeTimer().delay, 15000);
  retryClient.setResponder(() => ({ status: 200, body: { success: true, sent: 1 } }));
  assert.strictEqual(await retryClient.api.flushAgentPushQueue(), true);
  assert.strictEqual(retryClient.requests.length, 2);
  const retryBody = JSON.parse(retryClient.requests[1].data);
  assert.strictEqual(retryBody.events[0].eventId, originalId);
  assert.strictEqual(retryClient.api.getQueue().length, 0);
  console.log('  ✓ 轮末立即发送；失败批次不丢失，重试事件编号保持不变');

  console.log('[4] 网络/鉴权失败重试与事件字段规范化');
  const networkClient = createClient('zzz');
  networkClient.api.queueAgentPushEvent(input('network', {
    price: 1000.126,
    value: 1500.126,
    characters: [{ name: '雅', const: 9 }, { name: '', const: 0 }],
    goodsImg: 'data:image/png;base64,invalid-for-dispatch',
  }));
  networkClient.setResponder(() => ({ networkError: true }));
  assert.strictEqual(await networkClient.api.flushAgentPushQueue(), false);
  assert.strictEqual(networkClient.api.getQueue().length, 1);
  networkClient.setResponder(() => ({ status: 401, body: { success: false, error: '密钥错误' } }));
  assert.strictEqual(await networkClient.api.flushAgentPushQueue(), false);
  assert.strictEqual(networkClient.api.getQueue().length, 1);
  networkClient.setResponder(() => ({ status: 200, body: { success: true } }));
  assert.strictEqual(await networkClient.api.flushAgentPushQueue(), true);
  body = JSON.parse(networkClient.requests[2].data);
  assert.strictEqual(body.events[0].game, 'zzz');
  assert.strictEqual(body.events[0].price, 1000.13);
  assert.strictEqual(body.events[0].value, 1500.13);
  assert.deepStrictEqual(body.events[0].characters, [{ name: '雅', const: 6 }]);
  assert.strictEqual(body.events[0].goodsImg, '', '非HTTP图片必须置空，避免拒绝整批事件');
  console.log('  ✓ 网络和401均不丢事件，游戏、金额、命座和链接字段符合服务端契约');

  console.log('[5] 静态接入完整性');
  const callCount = (source.match(/queueAgentPushEvent\(\{/g) || []).length;
  assert.strictEqual(callCount, 7, '七个实际估值点必须全部接入');
  assert.strictEqual((source.match(/await flushAgentPushQueue\(\);/g) || []).length, 2, '两个扫描循环必须轮末flush');
  assert.ok(source.includes('// @version      4.11.0'));
  assert.ok(source.includes("showTitle: showTitle, price: finalPrice, value: valuation.totalValue"), '螃蟹详估必须使用最终秒杀价');
  assert.ok(source.includes("id=\"mwDispatchToken\""));
  assert.ok(source.includes('dispatchToken: pushConfig.dispatchToken'));
  console.log('  ✓ 七个估值点、两处轮末flush、最终秒杀价和配置同步均已接入');

  console.log('\n油猴代理人上报队列测试全部通过 ✓');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
