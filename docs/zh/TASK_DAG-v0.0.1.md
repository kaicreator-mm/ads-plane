# 任务 DAG — ADS Plane v0.0.1

> 🌐 [English](../TASK_DAG-v0.0.1.md) | 中文（如与英文版冲突，以英文版为准）

## 冻结的输入

- PRD：`docs/PRD-v0.0.1.md`
- 架构：`docs/ARCHITECTURE-v0.0.1.md`
- 基线：`main@b4cb0d70601b9614af896f04b742d411c2d96232`
- 标准：`ai-development-standard 4.0.0@88aa35a6ac6ceec859c7c1d9114828873842c0c5`

## 泳道摘要

| 泳道 | 任务 | 可并行理由 |
|---|---|---|
| core-contracts | T-001 | 共享契约/归约器奠定语义基础。 |
| github-adapter | T-002 | 契约之后开始；隔离的网络适配器。 |
| backend-runtime | T-003 | 集成采集器 + 归约器 + 存储/API。 |
| web-ui | T-004 | API 形态确定后即可基于共享契约/演示快照开发。 |
| validation | T-005 | 将实现收敛到重放/CI 验证。 |
| docs-release | T-006 | 文档并行演进，但最终收尾依赖经验证的实现。 |

## 规划 DAG

| 任务 | Issue | 泳道 | 依赖 | 可并行 | 产出 | 评审策略 | 状态 |
|---|---|---|---|---|---|---|---|
| T-001 | #2 | core-contracts | — | 是 | contracts + reducer | 建议 | DOING |
| T-002 | #3 | github-adapter | T-001 | 是 | 仅 GET 事实采集器 | 建议 | DOING |
| T-003 | #4 | backend-runtime | T-001,T-002 | 否 | SQLite + 同步 + API | 建议 | DOING |
| T-004 | #5 | web-ui | T-001,T-003 | 是 | React 观察器 | 建议 | DOING |
| T-005 | #6 | validation | T-001..T-004 | 否 | 重放/测试/CI | 建议 | DOING |
| T-006 | #7 | docs-release | T-001..T-005 | 是 | 文档/打包/发布 | 建议 | DOING |

此检查点仅用于规划/历史记录。在连接的能力支持时，GitHub Issue 状态/依赖/事件才是实时执行事实。
