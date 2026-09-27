# ADS Plane

> 🌐 [English](README.md) | 中文
>
> 如中英文内容存在差异，以英文版为准。

**ADS Plane** 是面向采用 [AI 开发标准（AI Development Standard）](https://github.com/kaicreator-mm/ai-development-standard)的项目的只读观察器，也是未来控制平面（control-plane）的基础。

版本：**0.0.1**

ADS Plane 读取 GitHub 与仓库的持久事实，将其确定性归约（reduce）为项目/版本状态，并对该状态进行可视化，同时绝不成为第二事实来源。

> 每一份 UI 快照都是 `NON_AUTHORITATIVE_DERIVED_STATE`（非权威派生状态）。GitHub Issues、原生 Issue Dependencies、PR/精确 SHA 证据、结构化事件与仓库制品始终是权威的。

## v0.0.1 展示的内容

- 版本进度与候选/发布状态；
- 以泳道（lane）组织的任务 DAG 与依赖阻塞；
- 构建 / 评审 / 验证 / 合并 / 阻塞队列；
- 活跃的 Agent/调度事实；
- CI / 评审 / 验证证据矩阵；
- 过期的精确 SHA PASS 证据警告；
- 任务详情、PR 身份与溯源；
- 无需凭据即可评估的确定性演示模式。

## 架构

```text
GitHub REST + repository files
            |
            v
   GitHubReadOnlyClient
            |
            v
       RepositoryFacts
            |
            v
   deterministic reducer
            |
            v
       VersionSnapshot
         /       \
   SQLite cache   HTTP API
                     |
                     v
                  React UI
```

v0.0.1 的运行时刻意保持对 GitHub 只读。本地同步端点只刷新 SQLite 投影。

## 环境要求

- Node.js 22+
- npm 10+

## 快速开始 — 演示模式

```bash
npm install
npm run build
ADS_DEMO=1 npm start -w @ads-plane/server
```

打开 `http://localhost:4310`。

演示模式加载一份确定性的项目快照，展示完成、运行中、就绪、阻塞、过期证据与调度活动。

## 快速开始 — 真实 GitHub 仓库

复制 `.env.example` 或导出环境变量：

```bash
export ADS_GITHUB_TOKEN='<read-only token or GitHub App installation token>'
export ADS_REPOSITORIES='kaicreator-mm/ai-development-standard@4.0.0'

npm install
npm run build
npm start -w @ads-plane/server
```

公开仓库无需令牌即可读取，但为了速率限制建议认证访问；私有仓库则必须认证。

也可以在完全不配置仓库的情况下启动，之后再在运行时添加：打开 UI，点击 **设置**，粘贴只读 GitHub 令牌并添加仓库（`owner/repo@version`）。令牌仅保存在服务器内存中，之后不会再显示。参见[配置文档](docs/zh/CONFIGURATION.md)。

多仓库配置：

```bash
ADS_REPOSITORIES='owner/project-a@v1.2,owner/project-b@v0.4' npm start -w @ads-plane/server
```

UI 提供英文与中文界面；通过头部的 `EN / 中文` 开关切换语言（选择会按浏览器记忆）。

## 开发

```bash
npm install
npm run check
```

实时开发：

```bash
# 终端 1
ADS_DEMO=1 npm run dev

# 终端 2
npm run dev:web
```

Vite 开发服务器将 `/api` 代理到 ADS Plane 服务器端口 `4310`。

## Docker

```bash
docker compose up --build
```

`compose.yaml` 默认启动演示模式。真实仓库场景请覆盖环境变量。

## 仓库结构

```text
apps/
  server/              Fastify sync/API runtime
  web/                 React observer UI
packages/
  contracts/           durable fact + read-model TypeScript contracts
  reducer/             pure deterministic reducer
  github-adapter/      GitHub GET-only collector
  storage/             rebuildable SQLite snapshot cache
docs/                  英文文档（权威版本）
docs/zh/               中文文档（本目录）
```

## 只读安全模型

推荐的生产部署是使用 GitHub App，其仓库权限仅限 Contents、Issues、Pull Requests 与 Actions 的只读访问。`GitHubReadOnlyClient` 只包含 GET 请求。v0.0.1 中不存在 Issue 更新、依赖变更、合并或调度动作。

## ADS 标准锁定

v0.0.1 采用：

- `ai-development-standard` 版本 `4.0.0`
- 锁定修订 `88aa35a6ac6ceec859c7c1d9114828873842c0c5`

参见 `.dev-standard/PROJECT_OVERRIDES.md`。

## 文档

中文文档位于 [docs/zh/](docs/zh/)：

- [产品需求](docs/zh/PRD-v0.0.1.md)
- [架构](docs/zh/ARCHITECTURE-v0.0.1.md)
- [任务 DAG](docs/zh/TASK_DAG-v0.0.1.md)
- [API](docs/zh/API.md)
- [配置](docs/zh/CONFIGURATION.md)
- [数据模型](docs/zh/DATA_MODEL.md)
- [GitHub 权限](docs/zh/GITHUB_PERMISSIONS.md)
- [运维](docs/zh/OPERATIONS.md)
- [开发](docs/zh/DEVELOPMENT.md)
- [安全](docs/zh/SECURITY.md)
- [发布说明](docs/zh/RELEASE-v0.0.1.md)
- [验证](docs/zh/VALIDATION.md)
- [浏览器验证交接](docs/zh/HANDOFF_BROWSER_VALIDATION.md)

英文文档（权威版本）见 [README](README.md) 的 Documentation 一节。

## v0.0.1 之后的路线图

归约器/读模型与控制器刻意分离。未来版本可以在不重新定义 GitHub 持久权威的前提下，增加 webhook 增量同步、历史/时间序列、串行化的 Agent 认领准入、调度、评审/验证路由、合并控制器、候选冻结与发布控制器。
