# TideDesk

一个围绕“真实 X 登录态绑定 -> 推荐流抓取 -> 去重归档 -> AI 整理 -> 报告与发布”打造的内容工作台。

当前仓库已经不是最早期的单点抓取 Demo，而是一套可本地运行、可 Docker 部署、可继续演进的管理平台：支持真实 X 账号绑定、按账号维护抓取策略、沉淀帖子归档、配置 AI 模型、生成报告、整理发布草稿，并管理微信公众号 / 知乎 / CSDN 等发布渠道。

## 当前版本能做什么

- 真实 X 绑定：支持浏览器辅助绑定，用户手动登录 X 后，系统自动回填账号信息与 Cookie。
- 多账号管理：一个平台用户可绑定多个 X 账号，并分别维护策略和抓取状态。
- 策略工作区：支持 `推荐模式`、`热点模式`、`搜索模式`，并通过可视化周期配置管理抓取频率。
- 去重归档：按 `绑定账号 + 帖子 ID` 去重，沉淀正文、媒体、链接、关系信息和抓取来源。
- 归档管理：支持分页浏览、筛选、详情查看、媒体跳转、分类和标签维护。
- AI 能力：支持配置多提供商 / 多模型，记录调用审计，并用于帖子分类、报告生成、草稿改写。
- 报告中心：支持基于归档生成周报 / 月报，并继续人工编辑。
- 发布中心：支持管理微信公众号、知乎、CSDN 渠道，基于归档或报告创建发布草稿。
- 管理后台体验：支持中英切换、亮暗主题、运行记录、错误摘要、分页表格与统一工作台壳层。

## 最新界面截图

以下截图来自当前仓库本地运行环境。

| 首页概览 | 工作台仪表盘 |
| --- | --- |
| ![首页概览](docs/assets/readme-landing.png) | ![工作台仪表盘](docs/assets/readme-dashboard.png) |

| 绑定与渠道工作区 | 策略工作区 |
| --- | --- |
| ![绑定与渠道工作区](docs/assets/readme-bindings.png) | ![策略工作区](docs/assets/readme-strategies.png) |

| 归档中心 | AI 模型与调用审计 |
| --- | --- |
| ![归档中心](docs/assets/readme-archives.png) | ![AI 模型与调用审计](docs/assets/readme-ai.png) |

## 典型业务链路

```mermaid
flowchart LR
  A["登录平台"] --> B["绑定真实 X 账号"]
  B --> C["保存加密 Cookie 与账号资料"]
  C --> D["创建抓取策略"]
  D --> E["定时 / 手动执行抓取"]
  E --> F["标准化帖子与媒体"]
  F --> G["按账号 + 帖子 ID 去重归档"]
  G --> H["分类 / 标签 / AI 自动分析"]
  H --> I["生成周报 / 月报"]
  I --> J["创建发布草稿"]
  J --> K["投放到公众号 / 知乎 / CSDN"]
```

## 核心能力拆解

### 1. X 绑定与抓取

- 浏览器辅助绑定真实 X 登录态，而不是只保存 OAuth 授权结果。
- 支持本机 Chrome 与 Docker noVNC 两种登录方式。
- 真实抓取适配器基于 Playwright，支持 `x.com/home` 推荐流、热点页和搜索结果页。
- 每次执行都会记录运行记录、抓取统计、错误摘要和新增归档数量。

### 2. 归档、分类与检索

- 帖子正文以富文本形式存档。
- 媒体资源、链接、作者信息、原帖 URL、抓取模式都会被一并保留。
- 支持分类、标签、多标签归档和手动编辑。
- AI 自动分类生成的标签可以继续由人工修改或删除。

### 3. AI、报告与发布

- AI 模型中心支持多提供商、多模型、默认任务模型配置和调用审计。
- 当前已接入帖子分类、报告生成、草稿改写三类 AI 任务。
- 报告中心支持周报 / 月报生成、查看、编辑与再生成。
- 发布中心支持从归档或报告创建草稿，并管理外部渠道投放。
- 发布渠道适配器当前覆盖微信公众号、知乎、CSDN。

### 4. 后台体验与工程能力

- 前端基于 Next.js App Router、TypeScript、Tailwind CSS 4、ShadCN / Base UI。
- 后端基于 NestJS 11、Prisma、PostgreSQL、Playwright。
- 认证基于 NextAuth.js + Prisma Adapter。
- 支持中英国际化、亮暗主题、本地 Docker Compose、Vercel + Neon 组合部署。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Next.js 16、React 19、TypeScript、Tailwind CSS 4、ShadCN / Base UI |
| 后端 | NestJS 11、Prisma、Playwright |
| 数据库 | PostgreSQL |
| 认证 | NextAuth.js 5 beta + Prisma Adapter |
| AI / 网关 | 多 Provider / 多 Model 配置、调用审计、任务模型路由 |
| 包管理 | pnpm workspace |
| 部署 | Docker Compose / Vercel + Neon |

## 仓库结构

```text
.
├── apps
│   ├── api        # NestJS API、抓取执行、AI、报告、发布、Prisma
│   └── web        # Next.js 管理后台
├── docs           # 需求、设计、TODO、部署文档
├── packages
│   └── config     # 共享配置
└── docker-compose.yml
```

## 快速开始

### 1. 准备环境变量

```bash
cp .env.example .env
```

如果你使用本仓库自带的 Docker PostgreSQL，请把 `.env` 中的 `DATABASE_URL` 改成：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/auto_x_to_wechat?schema=public
```

关键变量：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `NEXTAUTH_SECRET` | NextAuth 会话密钥 |
| `NEXTAUTH_URL` | Web 地址 |
| `INTERNAL_API_BASE_URL` | Web 访问 API 的内部地址 |
| `INTERNAL_API_SHARED_SECRET` | Web / API 内部签名密钥 |
| `CREDENTIAL_ENCRYPTION_KEY` | 凭证与 Cookie 加密密钥 |
| `CRAWLER_ADAPTER_NAME` | `mock` 或 `real` |
| `X_BINDING_SESSION_TIMEOUT_SECONDS` | X 浏览器绑定会话时长 |
| `REAL_CRAWLER_MAX_POSTS` | 单次真实抓取帖子上限 |

### 2. 安装依赖

```bash
pnpm install
```

### 3. 初始化数据库并写入演示账号

```bash
pnpm db:migrate
pnpm --filter api db:seed
```

默认演示账号：

```text
demo@example.com
demo123456
```

### 4. 启动开发环境

```bash
pnpm dev
```

默认地址：

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## Docker Compose 启动

### 启动完整环境

```bash
docker compose --profile full up -d --build
docker compose exec api pnpm --filter api db:seed
```

默认地址：

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- PostgreSQL: `55432`
- noVNC 远程桌面: `http://localhost:6080/vnc.html?autoconnect=1&resize=scale&reconnect=1`

### 启用真实 X 抓取

当前 [docker-compose.yml](docker-compose.yml) 为了更安全的默认体验，`api` 服务里默认使用：

```yaml
CRAWLER_ADAPTER_NAME: mock
```

如果你要测试真实 X 绑定与真实抓取，请把它改成：

```yaml
CRAWLER_ADAPTER_NAME: real
```

然后重新构建 API：

```bash
docker compose up -d --build api web
```

## 真实 X 绑定流程

### 本机开发模式

1. 登录平台。
2. 进入 `绑定` 页面。
3. 点击“浏览器辅助绑定”。
4. 系统拉起本机 Chrome，跳转到 `x.com` 登录流程。
5. 你手动完成登录后，系统自动识别账号信息并保存 Cookie。

### Docker 模式

1. 启动完整环境。
2. 打开 noVNC 页面。
3. 在平台 `绑定` 页面发起浏览器辅助绑定。
4. 在 noVNC 里的 Chromium 中完成 X 登录。
5. 返回平台等待绑定结果自动回填。

## 当前更适合拿来验证的模块

- `绑定`：验证真实 X 绑定、账号状态、凭证校验和发布渠道管理。
- `策略`：验证多账号策略拆分、模式切换和周期配置。
- `归档`：验证推荐流沉淀、媒体、详情、分类标签。
- `AI 模型`：验证 Provider / Model 配置、测试连接和调用审计。
- `报告`：验证周报 / 月报生成与编辑。
- `发布`：验证草稿管理、AI 改写、渠道发布工作流。

## 测试与校验

推荐在提交前执行：

```bash
pnpm --filter web test
pnpm --filter api test
pnpm --filter api build
pnpm --filter web build
```

如果 API 测试依赖本地 Docker PostgreSQL，可显式指定：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:55432/auto_x_to_wechat?schema=public' pnpm --filter api test
```

## 部署建议

### 方案一：Docker Compose

适合自托管、内网部署、个人服务器。

建议流程：

1. 准备生产环境变量。
2. 执行数据库迁移。
3. 启动 `db + api + web`。
4. 使用登录页、绑定页、归档页、AI 页做一次回归验证。

### 方案二：Vercel + Neon + Docker API

推荐拓扑：

- Web：Vercel
- PostgreSQL：Neon
- API / Worker / Playwright Browser：支持 Docker 的服务器

关键点：

- Vercel Root Directory 设为 `apps/web`
- `DATABASE_URL` 同时供 Web 与 API 使用
- `INTERNAL_API_BASE_URL` 指向已部署的 NestJS API
- 真实 X 绑定与浏览器自动化能力需要部署在具备 Chrome / Playwright 运行环境的 API 节点

详细说明见 [docs/部署上线说明.md](docs/部署上线说明.md)。

## 文档索引

- [需求文档](docs/需求文档.md)
- [详细设计文档](docs/详细设计文档.md)
- [开发 TODO 文档](docs/开发TODO文档.md)
- [部署上线说明](docs/部署上线说明.md)
- [上线检查清单](docs/上线检查清单.md)
