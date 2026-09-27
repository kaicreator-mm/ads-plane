# 数据模型

> 🌐 [English](../DATA_MODEL.md) | 中文（如与英文版冲突，以英文版为准）

ADS Plane 有两个刻意分离的层次。

## 持久输入事实

`RepositoryFacts` 包含仓库身份、Issues、依赖、拉取请求、工作流运行、评论/事件与仓库制品。这些是外部持久事实经适配器规范化的副本。

重要的输入身份：

- 仓库 + 默认分支 SHA；
- Issue 编号/id；
- 依赖边 `issue -> blocked_by`；
- PR 编号 + head/base SHA；
- 工作流运行 id + head SHA；
- 评论/事件 id；
- 制品路径 + blob SHA。

## 派生读模型

`VersionSnapshot` 是可丢弃的，包含：

- 进度汇总；
- 候选/发布状态；
- 泳道摘要；
- 构建/评审/验证/合并/阻塞队列；
- `WorkItemSnapshot[]`；
- 溯源。

`WorkItemSnapshot` 包含工作流状态、依赖/阻塞、PR 身份、调度、CI/评审/验证门禁与就绪投影。

每份快照都标记为 `NON_AUTHORITATIVE_DERIVED_STATE`。

## 证据过期

门禁可以携带 `exactSha`。当 `state=PASS` 且 `exactSha != 当前 PR headSha` 时，ADS Plane 将该门禁标记为 `stale=true`。它不会改写旧证据，也不会声称证据在新 SHA 上运行过。

## SQLite

表：

- `repositories(repository, version_hint, updated_at)`
- `snapshots(repository, version, generated_at, payload_json)`

payload 是完整的 VersionSnapshot JSON。v0.0.1 刻意避免高度规范化的派生数据库，因为快照是缓存，不是权威。
