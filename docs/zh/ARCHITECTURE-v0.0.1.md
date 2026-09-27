# ADS Plane v0.0.1 架构

> 🌐 [English](../ARCHITECTURE-v0.0.1.md) | 中文（如与英文版冲突，以英文版为准）

状态：v0.0.1 已冻结

## 架构驱动因素

1. GitHub/仓库保持持久权威。
2. 派生状态必须确定性强且可重建。
3. v0.0.1 运行时对 GitHub 必须只读。
4. 精确身份与证据溯源必须在展示层中保留。
5. 同一归约器应可被未来的 CLI、调度器与控制器层复用。
6. 首次部署必须轻量：一个 Node 进程 + SQLite + 静态 Web 资源。

## 系统

```text
GitHub REST + repository contents
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
            |
       +----+-----+
       |          |
    SQLite      HTTP API
     cache         |
                   v
               React UI
```

## 包边界

- `@ads-plane/contracts`：规范的事实与读模型 TypeScript 类型。不含网络/存储逻辑。
- `@ads-plane/reducer`：纯解析/归约。不导入网络/存储。
- `@ads-plane/github-adapter`：仅 GET 的 GitHub 事实采集。
- `@ads-plane/storage`：可重建的 SQLite 快照缓存。
- `@ads-plane/server`：配置、同步与 HTTP API。
- `@ads-plane/web`：浏览器观察器 UI。

## 权威边界

ADS Plane 不拥有工作流真相。VersionSnapshot 携带 `authorityNotice = NON_AUTHORITATIVE_DERIVED_STATE`。当 UI 与当前 Issues、原生 Issue Dependencies、PR HEAD/证据或结构化事件冲突时，正确的操作是重新同步/归约——而不是修改 GitHub 去迁就 UI。

## 依赖语义

采集器优先使用 GitHub 原生 Issue Dependencies 的 `blocked_by` 端点。正文 `Depends On: #N` 解析只是原生依赖事实不可用时的能力回退。该回退会在溯源中显式标注。

## 归约器规则

- 显式的规范 `state:*` 元数据优先于启发式路由；
- 关闭的任务 Issue 在没有更强显式状态时归约为 `done`；
- 未满足的原生/正文依赖归约为 `blocked`，除非显式规范元数据另有说明；
- 当前 PR 的精确 HEAD 是用于 CI/评审/验证过期判断的身份；
- 精确 SHA 与当前 PR HEAD 不同的 PASS 证据会标记为过期，且不会静默迁移；
- 队列是投影，不是任务权威；
- 候选/发布状态只来自可用的持久事件。

## 认证

生产建议：使用只读仓库权限的 GitHub App，并将安装令牌注入 ADS Plane。v0.0.1 运行时接受 `ADS_GITHUB_TOKEN`，因为安装令牌的生命周期可以由外部提供。公开仓库可遵守 GitHub 速率限制进行无认证读取。

## 存储

SQLite 是缓存/读模型。它存储已注册的仓库坐标与最新快照。不允许存在隐藏的规范状态。删除 schema 后可通过同步重建。

## 同步模型

v0.0.1 提供启动同步、周期性对账与显式 `POST .../sync`。未来版本可能增加 webhook 驱动的脏对象刷新，但周期性对账仍有价值，可用于修复漏发的 webhook。

## 未来扩展点

架构刻意把控制器放在归约器之外。未来支持写操作的 ADS Plane 可以增加串行化认领准入、Agent 调度、评审/验证路由、合并控制器与发布控制器，而不改变归约器/读模型的权威。
