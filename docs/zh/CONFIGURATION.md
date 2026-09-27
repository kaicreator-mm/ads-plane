# 配置

> 🌐 [English](../CONFIGURATION.md) | 中文（如与英文版冲突，以英文版为准）

配置分为两层：

1. **启动默认值（环境变量）** — 服务器启动时读取一次。
2. **运行时设置（UI）** — 应用内设置抽屉在运行时管理 GitHub 令牌与仓库列表；更改立即生效，无需重启。

UI 语言（英文/中文）是客户端偏好，持久化在 `localStorage` 中。

## 环境变量（启动默认值）

| 变量 | 默认值 | 用途 |
|---|---|---|
| `ADS_GITHUB_TOKEN` | 空 | 初始只读 GitHub 令牌/安装令牌。公开仓库可无需令牌。之后可在设置中替换。 |
| `ADS_REPOSITORIES` | 空 | 逗号分隔的 `owner/repo` 条目，可选 `@version` 提示。启动时注册；更多可在设置中添加。 |
| `ADS_DATA_DIR` | `.data` | SQLite/缓存目录。 |
| `ADS_PORT` | `4310` | HTTP 端口。 |
| `ADS_HOST` | `0.0.0.0` | 监听地址。 |
| `ADS_SYNC_INTERVAL_SECONDS` | `300` | 周期性对账；`0` 表示禁用。 |
| `ADS_DEMO` | `0` | `1` 加载内置确定性演示快照（同步已禁用）。 |
| `ADS_WEB_DIST` | `apps/web/dist` | 生产 Web 资源路径（锚定到 server 模块目录）。 |

示例：

```bash
ADS_DEMO=1 npm start -w @ads-plane/server
```

```bash
ADS_GITHUB_TOKEN=... \
ADS_REPOSITORIES=kaicreator-mm/ai-development-standard@4.0.0,kaicreator-mm/domain-harness@v0.3 \
npm start -w @ads-plane/server
```

## 运行时设置 API

Web UI 的设置抽屉调用以下端点；也可以直接使用：

| 方法与路径 | 用途 |
|---|---|
| `GET /api/settings` | 当前仓库、令牌状态（掩码提示，绝不返回令牌本身）、逐仓库同步状态。 |
| `PUT /api/settings/github-token` | `{token}` — 设置或清空（空字符串）运行时令牌。仅存内存。 |
| `POST /api/settings/repositories` | `{repository: "owner/repo@version"}` — 注册并后台同步。`syncNow: false` 仅注册。 |
| `DELETE /api/settings/repositories/:owner/:repo` | 取消注册仓库并丢弃其缓存快照。 |
| `POST /api/projects/:owner/:repo/sync` | 触发已配置仓库的后台重新同步。 |

仓库同步在后台运行；进度通过 UI 轮询的逐仓库同步状态（`syncing` / `ok` / `error`）体现。
