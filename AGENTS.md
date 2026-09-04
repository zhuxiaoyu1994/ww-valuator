# AGENTS.md — 鸣潮估价助手项目接手指南

## 项目概览

鸣潮/绝区零账号估价与监控平台，部署在 Vercel。用户在网站查看账号估价，油猴脚本在螃蟹网等平台实时监控高性价比账号。

## 目录结构

```
youxigujia/                          # 工作区根目录（无 git 仓库）
└── 鸣潮估价助手/                     # 网站项目（git 仓库，remote: ww-valuator）
    ├── server.js                    # Express 主服务入口
    ├── configs/                     # 各游戏默认配置（configVersion 所在处）
    │   ├── wuwa.js                  # 鸣潮配置（charTiers/sigWeapons/资源换算等）
    │   └── zzz.js                   # 绝区零配置
    ├── value-engine.src.js          # 估值引擎源码（可读，含所有默认常量）
    ├── value-engine.js              # 混淆版估值引擎（由 build-engine.js 生成，勿手改）
    ├── build-engine.js              # 混淆构建脚本
    ├── public/                      # 前端静态资源
    │   ├── value-settings.js        # 设置面板 UI 逻辑
    │   └── crab-monitor.user.js     # 油猴脚本（网站托管，唯一维护副本）
    ├── views/                       # EJS 页面模板与前端逻辑
    ├── monitor.js                   # 监控扫描逻辑
    ├── db.js                        # 数据存储
    ├── notify.js                    # 通知推送
    ├── data/                        # 运行时数据（config.json, seen-accounts.json）
    ├── api/                         # Vercel Serverless 入口
    ├── vercel.json                  # Vercel 部署配置
    └── cf-worker/                   # Cloudflare Worker 备用部署
```

## 油猴脚本版本号规则（每次修改必须升级）

`public/crab-monitor.user.js` 头部有 `@version`（如 `3.6.0`）。**每次修改该文件，必须同步递增版本号**，否则 Tampermonkey 不会推送更新，用户端永远停留在旧版：

- Bug 修复、小调整 → 补丁位 +1（`3.6.0` → `3.6.1`）
- 新功能、交互改动 → 次位 +1（`3.6.1` → `3.7.0`）
- 大版本重构才升主位

推送到 GitHub 后，需**手动**在 Greasy Fork / 分发渠道同步发布新版本（分发渠道不会自动同步）。

## 核心同步规则（最重要）

估值配置分散在 **4 处** 中，修改时必须全部同步，漏一处会导致两端估价结果不一致：

| 文件 | 作用 | 格式 |
|------|------|------|
| `configs/wuwa.js` / `configs/zzz.js` | 服务端各游戏默认配置 | `configVersion` + 常量对象 |
| `value-engine.src.js` | 网站估值引擎源码 | `const X = {...}` |
| `value-engine.js` | 混淆版（由 src 生成） | 自动生成，勿手改 |
| `public/crab-monitor.user.js` | 油猴脚本 | `const X = {...}`（缩进多 2 空格） |

### 需要同步的常量清单

`CONFIG_VERSION`、`CHAR_TIERS`、`SIG_WEAPONS`、`DEFAULT_WEIGHTS`（含 outfit/motoFrame/effTierWeights 等）、`DEFAULT_TEAMS`、`DEFAULT_PULL_TIERS`、`DEFAULT_YELLOW_TIERS`、`DEFAULT_CHAR_PRICES`、`DEFAULT_CONST_PREMIUMS`、`DEFAULT_NEED_SIG_WEAPONS`、`CHAR_ALIASES`。

## CONFIG_VERSION 机制

版本常量分布在两处：`configs/wuwa.js`（鸣潮，当前 24）和 `configs/zzz.js`（绝区零，当前 4）各有 `configVersion`；油猴脚本有全局 `CONFIG_VERSION`（随鸣潮配置走，当前 24）。用户配置存储在 localStorage（键名按游戏前缀区分，如 `mw_monitor_config`），脚本启动时比对版本：

- `savedVersion < CONFIG_VERSION` 且用户无自定义 → 直接使用新默认值
- `savedVersion < CONFIG_VERSION` 且用户有自定义 → 提醒用户更新，不强制覆盖

**每次修改默认常量，必须将 CONFIG_VERSION +1**，否则用户端不会加载新规则。

## 修改配置的标准流程

1. 编辑 `configs/wuwa.js` / `configs/zzz.js` 中的常量，`configVersion` +1
2. 编辑 `value-engine.src.js` 中对应常量
3. 编辑 `public/crab-monitor.user.js` 中对应常量（注意缩进差异），`CONFIG_VERSION` 同步递增，`@version` 升版本号
4. 在 `鸣潮估价助手/` 下运行：`node build-engine.js` 重新生成混淆版
5. 验证各处常量一致（可用 `grep` 对比关键值）
6. 提交改动文件（含 `public/value-settings.js`，如设置面板 UI 有新增项）
7. 推送到 GitHub，Vercel 自动部署；手动更新 Greasy Fork

## 构建

```bash
cd 鸣潮估价助手
node build-engine.js        # 生成 value-engine.js（依赖 javascript-obfuscator）
npm start                   # 本地启动（node server.js）
```

## 部署

- **Vercel**：push 到 `main` 分支自动部署，入口 `api/server.js`（Serverless Function）
- **域名**：`www.youxigujia.cn`（Vercel 自定义域名）
- **GitHub 仓库**：`git@github.com:zhuxiaoyu1994/ww-valuator.git`
- **油猴脚本**：需手动在 Greasy Fork / 分发渠道更新发布

### Vercel 路由配置（vercel.json）

```json
{
  "framework": null,
  "functions": {
    "api/server.js": { "memory": 1024, "maxDuration": 15 }
  },
  "rewrites": [
    { "source": "/public/(.*)", "destination": "/$1" },
    { "source": "/(.*)", "destination": "/api/server" }
  ]
}
```

- `/public/xxx` → 重写为 `/xxx`，由 Vercel 从 `public/` 目录提供静态文件
- 其余所有请求（含 `/`） → 转发到 `api/server.js`（Express Serverless Function）
- `"framework": null` 禁用框架自动检测，避免 Vercel 误判 Express 路由
- **禁止在 `public/` 目录放置 `index.html`**：会导致 `/` 路由与 Serverless 函数冲突，返回 500 `FUNCTION_INVOCATION_FAILED`
- **注意**：Serverless 入口文件必须命名为 `api/server.js` 而非 `api/index.js`，否则 Vercel 会将其作为 `/` 的默认函数直接调用，绕过 rewrite 规则

### 环境变量（Vercel 控制台配置）

| 变量 | 用途 |
|------|------|
| `TURSO_URL` | Turso 数据库 URL（持久化查询日志） |
| `TURSO_TOKEN` | Turso 访问令牌 |
| `ADMIN_PASSWORD` | 管理后台密码 |
| `PXB7_PROXY_URL` | Cloudflare Worker 代理 URL（可选，避免螃蟹网 IP 封禁） |
| `BLOCKED_IPS` | IP 黑名单（逗号分隔） |

## 注意事项

- `value-engine.js` 是混淆产物，不要手动编辑，改源码后重新构建
- `data/` 目录下的运行时数据不在 git 中跟踪
- `.env` 存放通知推送 token 等密钥，勿提交
- 油猴脚本（`public/crab-monitor.user.js`）与网站估值逻辑必须保持完全一致
- Vercel Serverless 环境下无持久化文件系统，`data/` 目录运行时数据仅在本地有效
- Vercel Serverless 冷启动时 `initApp()` 初始化数据库连接，无数据库配置时降级为内存存储
- git 提交与推送需先经用户确认

## 油猴脚本架构要点（改动前必读）

- **表格分页**：列表 2000+ 行时全量渲染会卡顿。`refreshTableDisplay` 只渲染当前页（`PAGE_SIZE = 100`），由 `renderPaginationBar` 生成底部固定分页栏（`position:sticky; bottom:0`）。**新增筛选条件时必须同步重置 `currentPage = 1`**，否则筛选后可能停留在空页
- **事件委托**：表格内角色标签点击/右键、已售检查、删除按钮、行钉住、悬停详情全部委托到 `tbody` 统一监听（`bindTableDelegatedEvents`）。**新增行内交互元素时在委托函数里加分支，禁止对行元素逐个绑定**
- **z-index 层级**：监控面板 `#mw-dashboard` 为 999999，设置弹窗 100005 左右，**弹层要盖住面板必须 ≥ 1000001**（角色选择器曾因 100002 被面板盖住而"点击无反应"）
- **面板高度**：`calc(100vh - 100px)` 自适应视口，表格容器 `flex-grow:1` 占满剩余高度
- **多游戏**：`GAME_CONFIGS` 按游戏分键（wuwa/zzz），localStorage 键名带游戏前缀（`mw`/`zz`），`G()` 取当前游戏配置
- **多平台监控**：支持螃蟹网(pxb7)、盼之(pzds)、氪金兽(kjs)、7881(qy)、易手游(ysy)
