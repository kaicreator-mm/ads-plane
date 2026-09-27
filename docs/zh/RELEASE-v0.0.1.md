# ADS Plane v0.0.1 发布说明

> 🌐 [English](../RELEASE-v0.0.1.md) | 中文（如与英文版冲突，以英文版为准）

## 主题

面向采用 AI 开标准项目的第一个只读观察器。

## 包含内容

- TypeScript monorepo 与共享机器契约；
- 确定性的工作流/证据归约器；
- 支持原生 Issue Dependencies 的仅 GET GitHub 事实采集器；
- 可重建的 SQLite 读模型；
- 具备启动/周期/手动对账的 Node/Fastify API；
- React 观察器 UI：进度、泳道、DAG、队列、Agent/调度活动、证据矩阵、过期精确 SHA 警告与任务溯源；
- 确定性演示模式；
- 测试、CI、Docker 路径与完整文档。

## 已知限制

- v0.0.1 每个仓库只保留最新快照，不含历史时间序列；
- 事件解析支持当前 ADS 工作流使用的稳定键/值表面，不是通用 Markdown 解释器；
- 周期/全量对账刻意保持简单；webhook 增量采集被推迟；
- 当 API/能力不暴露依赖事实时，原生依赖回退使用正文的 `Depends On` 字段；
- 不存在 GitHub 写操作或 Agent 控制动作。
