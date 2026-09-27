# HTTP API

> 🌐 [English](../API.md) | 中文（如与英文版冲突，以英文版为准）

默认端点：`http://localhost:4310`。

## `GET /api/health`

返回运行时版本、只读标志与权威标记。

## `GET /api/projects`

返回已缓存项目快照的摘要列表。

## `GET /api/projects/:owner/:repo`

返回最新的 `VersionSnapshot`。快照不存在时返回 404。

## `POST /api/projects/:owner/:repo/sync`

执行一次只读的 GitHub/仓库对账，并替换本地缓存快照。该端点只写本地 SQLite；绝不变更 GitHub。

## `POST /api/sync`

同步全部已配置仓库。每个结果报告 `{repository, ok, error?}`。

## 运行时设置

| 方法与路径 | 用途 |
|---|---|
| `GET /api/settings` | 当前仓库列表、令牌状态（掩码提示，绝不返回完整令牌）与逐仓库同步状态。 |
| `PUT /api/settings/github-token` | `{token}` — 设置或清空（空字符串）运行时令牌。仅存于服务器内存。 |
| `POST /api/settings/repositories` | `{repository: "owner/repo@version"}` — 注册并在后台同步。`syncNow: false` 时仅注册。 |
| `DELETE /api/settings/repositories/:owner/:repo` | 取消注册仓库并丢弃其缓存快照。 |

## 稳定性

v0.0.1 API 属于内部/实验性质。`@ads-plane/contracts` 中的 `VersionSnapshot` 类型是本版本的机器契约。
