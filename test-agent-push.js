'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { createAgentPushService } = require('./agent-push');
const { buildDingTalkSignedUrl, buildDingTalkRobotPayload } = require('./notify');
const getAgentPushPage = require('./views/agent-push');

function createMemoryDb() {
  const store = new Map();
  return {
    store,
    async getConfigStrict(key) {
      return store.has(key) ? store.get(key).value : null;
    },
    async setConfig(key, value) {
      store.set(key, { value, updatedAt: new Date().toISOString() });
      return true;
    },
    async insertConfigIfAbsent(key, value) {
      if (store.has(key)) return false;
      store.set(key, { value, updatedAt: new Date().toISOString() });
      return true;
    },
    async deleteConfig(key) {
      return store.delete(key);
    },
    async listConfigsByPrefix(prefix) {
      return Array.from(store.entries())
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, entry]) => ({ key, value: entry.value, updatedAt: entry.updatedAt }));
    },
    async deleteConfigsBefore(prefix, iso) {
      let count = 0;
      for (const [key, entry] of store.entries()) {
        if (key.startsWith(prefix) && entry.updatedAt < iso) {
          store.delete(key);
          count++;
        }
      }
      return count;
    },
  };
}

function webhook(token) {
  return 'https://oapi.dingtalk.com/robot/send?access_token=' + token;
}

function config() {
  return {
    enabled: true,
    robots: [
      { id: 'r1', name: '一群', webhook: webhook('token-one'), secret: 'SEC-one', enabled: true },
      { id: 'r2', name: '二群', webhook: webhook('token-two'), secret: '', enabled: true },
    ],
    rules: [
      {
        id: 'rule-full', name: '完整条件', chars: [
          { name: '椿', minConst: 2 },
          { name: '守岸人', minConst: 0 },
        ],
        minDiff: 100, priceMin: 500, priceMax: 2000,
        platforms: ['pxb7'], robotIds: ['r1', 'r2'], enabled: true,
      },
      {
        id: 'rule-merge', name: '同机器人合并', chars: [{ name: '椿', minConst: 1 }],
        minDiff: 0, priceMin: 0, priceMax: 0,
        platforms: [], robotIds: ['r1'], enabled: true,
      },
      {
        id: 'rule-disabled', name: '停用规则', chars: [{ name: '椿', minConst: 0 }],
        minDiff: 0, priceMin: 0, priceMax: 0,
        platforms: [], robotIds: ['r1'], enabled: false,
      },
    ],
  };
}

function event(eventId, overrides) {
  return Object.assign({
    eventId,
    productId: 'product-' + eventId,
    game: 'wuwa',
    platform: 'pxb7',
    showTitle: '测试账号',
    price: 1000,
    value: 1500,
    characters: [{ name: '椿', const: 2 }, { name: '守岸人', const: 0 }],
    goodsImg: 'https://example.com/a.jpg',
    productUrl: 'https://example.com/product/' + eventId,
    stage: 'detail',
  }, overrides || {});
}

async function expectReject(promise, messagePart) {
  await assert.rejects(promise, (error) => {
    assert.ok(String(error.message).includes(messagePart), error.message);
    return true;
  });
}

(async () => {
  const db = createMemoryDb();
  const sends = [];
  let failPredicate = () => false;
  const service = createAgentPushService({
    db,
    manageKey: 'manager-secret',
    ingestToken: 'ingest-secret',
    sendRobot: async (robot, title, content, options) => {
      sends.push({ robot, title, content, options: options || {} });
      if (failPredicate(robot)) return { success: false, error: '失败 ' + robot.webhook };
      return { success: true };
    },
  });

  console.log('[1] 独立鉴权与配置校验');
  assert.strictEqual(service.isManager('manager-secret'), true);
  assert.strictEqual(service.isManager('ingest-secret'), false);
  assert.strictEqual(service.isIngest('ingest-secret'), true);
  assert.strictEqual(service.isIngest('manager-secret'), false);
  assert.deepStrictEqual(await service.getConfig(), { enabled: true, robots: [], rules: [] });
  const badConfig = config();
  badConfig.robots[0].webhook = 'https://example.com/robot/send?access_token=x';
  await expectReject(service.saveConfig(badConfig), '仅允许钉钉');
  await expectReject(service.saveConfig(Object.assign(config(), { unknown: true })), '不支持的字段');
  const saved = await service.saveConfig(config());
  assert.strictEqual(saved.rules.length, 3);
  console.log('  ✓ 管理/上报密钥隔离，Webhook 白名单和字段校验生效');

  console.log('[2] 全角色、命座、平台、价格、差价匹配与同机器人合并');
  const first = await service.dispatch([event('e1')]);
  assert.strictEqual(first.success, true);
  assert.strictEqual(first.received, 1);
  assert.strictEqual(first.matched, 1);
  assert.strictEqual(first.sent, 2);
  assert.strictEqual(first.total, 2, '同一机器人命中两条规则只能生成一个发送任务');
  assert.strictEqual(sends.length, 2);
  const r1Send = sends.find((item) => item.robot.id === 'r1');
  assert.ok(r1Send.content.includes('![账号图](https://example.com/a.jpg)'));
  assert.ok(!r1Send.content.includes('[🔗 查看详情]('), '商品链接必须改为按钮，不得保留正文链接');
  assert.deepStrictEqual(r1Send.options.buttons, [{
    title: '🔗 查看详情',
    actionURL: 'https://example.com/product/e1',
  }]);
  assert.ok(r1Send.content.includes('命中：完整条件、同机器人合并'));
  assert.ok(r1Send.content.includes('差价 +500元'), '差价必须由服务端根据估值与标价计算');
  const filtered = await service.dispatch([
    event('low-const', { characters: [{ name: '椿', const: 1 }, { name: '守岸人', const: 0 }] }),
    event('missing-char', { characters: [{ name: '椿', const: 2 }] }),
    event('wrong-platform', { platform: 'pzds' }),
    event('low-price', { price: 400 }),
    event('high-price', { price: 2500 }),
    event('low-diff', { value: 1100 }),
  ]);
  assert.strictEqual(filtered.received, 6);
  assert.strictEqual(filtered.matched, 6, '这些事件仍命中不限平台的第二规则');
  assert.strictEqual(filtered.sent, 6);
  assert.ok(filtered.results.every((item) => item.robotId === 'r1' && item.ruleIds.join(',') === 'rule-merge'),
    '完整规则的角色、命座、平台、价格和差价条件任一项不满足时都不得命中');
  console.log('  ✓ 所有角色条件必须满足，其余过滤器及机器人合井语义正确');

  console.log('[3] 持久化去重与失败释放占位后重试');
  sends.length = 0;
  const duplicate = await service.dispatch([event('e1')]);
  assert.strictEqual(duplicate.sent, 0);
  assert.strictEqual(duplicate.skipped, 2);
  assert.strictEqual(sends.length, 0);

  failPredicate = (robot) => robot.id === 'r1';
  const failed = await service.dispatch([event('retry-me')]);
  assert.strictEqual(failed.success, false);
  assert.strictEqual(failed.sent, 1);
  assert.strictEqual(failed.failed, 1);
  assert.strictEqual(failed.results.find((item) => item.robotId === 'r1').code, 'SEND_FAILED');
  assert.ok(!failed.results.find((item) => item.robotId === 'r1').error.includes('token-one'), '错误日志不得泄露 access_token');
  assert.strictEqual(Array.from(db.store.keys()).filter((key) => key.startsWith('agent_push:dedup:')).length, 9,
    '历史成功记录保留，retry-me 失败的一条已删除、成功的一条保留');

  failPredicate = () => false;
  sends.length = 0;
  const retried = await service.dispatch([event('retry-me')]);
  assert.strictEqual(retried.success, true);
  assert.strictEqual(retried.sent, 1);
  assert.strictEqual(retried.skipped, 1);
  assert.strictEqual(sends.length, 1);
  assert.strictEqual(sends[0].robot.id, 'r1', '重试只能补发先前失败的机器人');
  console.log('  ✓ 重复事件不重复推送；失败任务可独立重试，成功任务保持去重');

  console.log('[4] 日志、停用开关与事件输入校验');
  const logs = await service.getLogs();
  assert.ok(logs.length >= 4);
  assert.ok(logs.every((log) => typeof log.received === 'number' && typeof log.matched === 'number'));
  assert.ok(logs.every((log) => Array.isArray(log.errors) && Array.isArray(log.results)));
  const disabled = config();
  disabled.enabled = false;
  await service.saveConfig(disabled);
  sends.length = 0;
  const paused = await service.dispatch([event('paused')]);
  assert.strictEqual(paused.success, true);
  assert.strictEqual(paused.matched, 0);
  assert.strictEqual(paused.total, 0);
  assert.strictEqual(sends.length, 0);
  await expectReject(service.dispatch([event('bad-game', { game: 'other' })]), 'game不受支持');
  await expectReject(service.dispatch([event('bad-diff', { value: -1 })]), '非负有限数字');
  await expectReject(service.dispatch([]), '1到20条');
  sends.length = 0;
  assert.deepStrictEqual(await service.testRobot('r1'), { success: true, robotId: 'r1' });
  assert.strictEqual(sends.length, 1);
  assert.ok(sends[0].content.includes('机器人测试消息'));
  assert.ok(!sends[0].content.includes('![账号图]'), '测试消息仍使用普通文本格式');
  await expectReject(service.testRobot('missing'), '机器人不存在');
  console.log('  ✓ 日志统计完整，停用开关、非法事件和机器人测试接口行为正确');

  console.log('[5] 机器人有效期到期自动停用');
  const expiring = config();
  expiring.robots[0].expiresAt = new Date(Date.now() - 1000).toISOString();
  expiring.robots[1].expiresAt = new Date(Date.now() + 3600000).toISOString();
  await service.saveConfig(expiring);
  sends.length = 0;
  const expiryResult = await service.dispatch([event('expiry-test')]);
  assert.strictEqual(expiryResult.success, true);
  assert.strictEqual(expiryResult.matched, 1);
  assert.strictEqual(expiryResult.sent, 1);
  assert.deepStrictEqual(expiryResult.results.map((item) => item.robotId), ['r2'],
    '过期机器人即使 enabled=true 也不得参与分发');
  await expectReject(service.testRobot('r1'), '机器人已停用或已过期');
  const badExpiry = config();
  badExpiry.robots[0].expiresAt = 'not-a-time';
  await expectReject(service.saveConfig(badExpiry), '不是有效时间');
  await service.saveConfig(config());
  console.log('  ✓ 过期机器人不再分发和测试，非法有效期被拒绝');

  console.log('[6] 钉钉加签与敏感信息处理');
  const timestamp = 1700000000000;
  const signed = new URL(buildDingTalkSignedUrl(webhook('sign-token'), 'SEC-test', timestamp));
  const expectedSign = crypto.createHmac('sha256', 'SEC-test').update(timestamp + '\nSEC-test').digest('base64');
  assert.strictEqual(signed.searchParams.get('access_token'), 'sign-token');
  assert.strictEqual(signed.searchParams.get('timestamp'), String(timestamp));
  assert.strictEqual(signed.searchParams.get('sign'), expectedSign);
  console.log('  ✓ HMAC-SHA256、时间戳和URL编码正确，原access_token保留');

  console.log('[7] 钉钉 actionCard 图片按钮消息');
  const actionPayload = buildDingTalkRobotPayload('标题', '![账号图](https://example.com/a.jpg)', {
    rawMarkdown: true,
    buttons: [
      { title: '查看详情', actionURL: 'https://example.com/product/e1' },
      { title: 'bad', actionURL: 'javascript:alert(1)' },
      { title: '', actionURL: 'https://example.com/x' },
    ],
  });
  assert.strictEqual(actionPayload.msgtype, 'actionCard');
  assert.strictEqual(actionPayload.actionCard.text, '![账号图](https://example.com/a.jpg)');
  assert.deepStrictEqual(actionPayload.actionCard.btns, [{
    title: '查看详情',
    actionURL: 'https://example.com/product/e1',
  }]);
  const markdownPayload = buildDingTalkRobotPayload('标题', '内容');
  assert.strictEqual(markdownPayload.msgtype, 'markdown');
  assert.strictEqual(markdownPayload.markdown.text, '### 标题\n\n内容');
  console.log('  ✓ 有链接时发送 actionCard 按钮和无按钮时回退 markdown，非法按钮被过滤');

  console.log('[8] 管理页交互与文案');
  const page = getAgentPushPage({ wuwa: ['椿', '守岸人'], zzz: ['星见雅'] });
  assert.ok(!page.includes('代理人'), '管理页可见文案不得出现代理人');
  assert.ok(page.includes('<title>推送管理</title>'));
  assert.ok(page.includes("const CHARACTER_GROUPS = {\"wuwa\":[\"椿\",\"守岸人\"],\"zzz\":[\"星见雅\"]}"), '角色下拉列表必须来自服务端配置');
  assert.ok(page.includes("name.type = 'select'") || page.includes("document.createElement('select')"), '角色条件必须使用下拉选择');
  assert.ok(page.includes('id="robot-valid-hours"'), '机器人必须支持有效小时数');
  assert.ok(page.includes('有效小时数（留空表示永久）'));
  assert.ok(page.includes('最低差价（元，留空不限）'));
  assert.ok(page.includes('translate(-50%, -50%)'), '新增弹窗必须居中');
  const emptyPage = getAgentPushPage();
  assert.ok(emptyPage.includes('const CHARACTER_GROUPS = {}'));
  console.log('  ✓ 弹窗居中、角色下拉、有效期、差价留空和文案约束均生效');

  console.log('\n代理人服务端测试全部通过 ✓');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
