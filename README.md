# auto-x-to-wechat

X 推荐内容抓取与归档平台单仓项目。

## Workspace

- `apps/web`: Next.js Web 前端
- `apps/api`: NestJS API 与任务执行服务
- `packages/config`: 共享 TypeScript 与 ESLint 配置
- `docs`: 需求、设计与开发文档

## Current Decisions

- Monorepo 采用 `pnpm workspace`，目录结构固定为 `apps/web`、`apps/api`、`packages/config`。
- MVP 开发阶段采用“抓取适配器接口 + Mock 适配器先行”的策略，真实 X 凭证采集与抓取实现后续接入。
- 当前部署目标按“Vercel 部署 Web、Docker 部署 API/Worker、Neon 托管 PostgreSQL”推进。
- 敏感凭证的服务端加密方案约定为 `AES-256-GCM`，密钥由 `CREDENTIAL_ENCRYPTION_KEY` 提供。
- 环境变量统一以仓库根目录 `.env` 为主，NestJS 通过 `ConfigModule` 读取，Prisma 通过 `dotenv-cli` 读取。

## Git Workflow

- 功能分支建议使用 `codex/<scope>` 前缀。
- 提交信息建议使用 `feat`、`fix`、`docs`、`refactor`、`chore`、`test` 前缀。
- 合并前至少执行 `pnpm lint`、`pnpm test`、`pnpm build`。

## Development

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 启动本地 PostgreSQL：

```bash
docker compose up -d postgres
```

3. 安装依赖：

```bash
pnpm install
```

4. 执行数据库迁移：

```bash
pnpm db:migrate
```

5. 启动开发环境：

```bash
pnpm dev
```
