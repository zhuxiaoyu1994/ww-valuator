# AGENTS.md — 鸣潮估价助手项目接手指南

## 项目概览

鸣潮账号估价与监控平台，部署在 Vercel。用户在网站查看账号估价，油猴脚本在螃蟹网实时监控高性价比账号。

## 目录结构

```
youxigujia/                          # 工作区根目录（无 git 仓库）
├── 螃蟹网鸣潮监控助手.user.js         # 油猴脚本（独立文件，无 git）
└── 鸣潮估价助手/                     # 网站项目（git 仓库，remote: ww-valuator）
    ├── server.js                    # Express 主服务入口
    ├── value-engine.src.js          # 估值引擎源码（可读，含所有默认常量）
    ├── value-engine.js              # 混淆版估值引擎（由 build-engine.js 生成，勿手改）
    ├── build-engine.js              # 混淆构建脚本
    ├── public/                      # 前端静态资源
    │   ├── value-settings.js        # 设置面板 UI 逻辑
    │   └── crab-monitor.user.js     # 网站托管的油猴脚本副本
    ├── views/                       # EJS 页面模板与前端逻辑
    ├── monitor.js                   # 监控扫描逻辑
    ├── db.js                        # 数据存储
    ├── notify.js                    # 通知推送
    ├── data/                        # 运行时数据（config.json, seen-accounts.json）
    ├── api/                         # Vercel Serverless 入口
    ├── vercel.json                  # Vercel 部署配置
    └── cf-worker/                   # Cloudflare Worker 备用部署
```

## 核心同步规则（最重要）

估值配置分散在 **3 个文件** 中，修改时必须全部同步，漏一个会导致两端估价结果不一致：

| 文件 | 作用 | 格式 |
|------|------|------|
| `鸣潮估价助手/value-engine.src.js` | 网站估值引擎源码 | `const X = {...}` |
| `鸣潮估价助手/value-engine.js` | 混淆版（由 src 生成） | 自动生成，勿手改 |
| `螃蟹网鸣潮监控助手.user.js` | 油猴脚本 | `const X = {...}`（缩进多 2 空格） |

### 需要同步的常量清单

`CONFIG_VERSION`、`CHAR_TIERS`、`SIG_WEAPONS`、`DEFAULT_WEIGHTS`（含 outfit/motoFrame 等）、`DEFAULT_TEAMS`、`DEFAULT_PULL_TIERS`、`DEFAULT_YELLOW_TIERS`、`DEFAULT_CHAR_PRICES`、`DEFAULT_CONST_PREMIUMS`、`DEFAULT_NEED_SIG_WEAPONS`、`CHAR_ALIASES`。

## CONFIG_VERSION 机制

两端都有 `CONFIG_VERSION` 整数常量。用户配置存储在 localStorage（键名 `mw_monitor_config`），脚本启动时比对版本：

- `savedVersion < CONFIG_VERSION` 且用户无自定义 → 直接使用新默认值
- `savedVersion < CONFIG_VERSION` 且用户有自定义 → 提醒用户更新，不强制覆盖

**每次修改默认常量，必须将 CONFIG_VERSION +1**，否则用户端不会加载新规则。

## 修改配置的标准流程

1. 编辑 `value-engine.src.js` 中的常量
2. 编辑 `螃蟹网鸣潮监控助手.user.js` 中对应常量（注意缩进差异）
3. 两端 `CONFIG_VERSION` 同步递增
4. 在 `鸣潮估价助手/` 下运行：`node build-engine.js` 重新生成混淆版
5. 验证两端常量一致（可用 `grep` 对比关键值）
6. 提交 `value-engine.src.js`、`value-engine.js`、`value-settings.js`（如有改动）
7. 推送到 GitHub，Vercel 自动部署

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
- 油猴脚本与网站项目物理分离，但估值逻辑必须保持完全一致
- Vercel Serverless 环境下无持久化文件系统，`data/` 目录运行时数据仅在本地有效
- Vercel Serverless 冷启动时 `initApp()` 初始化数据库连接，无数据库配置时降级为内存存储
