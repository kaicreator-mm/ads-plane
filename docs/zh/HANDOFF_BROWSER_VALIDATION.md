# 本地浏览器验证交接 — v0.0.1

> 🌐 [English](../HANDOFF_BROWSER_VALIDATION.md) | 中文（如与英文版冲突，以英文版为准）

仅在具备 Node.js 22+、npm registry 访问与真实 Chromium/Chrome 级浏览器的机器上使用本交接。

## 验证候选

开始前先核对跟踪 Issue 中记录的精确 `version/v0.0.1` HEAD。若分支已移动，停止并重新绑定到新的精确 SHA。

## 环境准备

```bash
npm install
npm run check
ADS_DEMO=1 npm run dev
npm run dev:web
```

打开 UI，验证桌面与窄屏/移动级视口行为。

## 必需检查

1. 版本总览渲染无控制台/运行时错误。
2. 泳道/DAG 节点可读，依赖方向可理解。
3. 就绪/运行中/阻塞/可合并队列与演示夹具一致。
4. Agent/调度活动正确渲染角色/操作者/状态。
5. 证据矩阵清楚区分 PASS/FAIL/BLOCKED/NOT_RUN 与过期的精确 SHA 证据。
6. 选中任务后可见任务详情与溯源/活动信息。
7. `NON_AUTHORITATIVE_DERIVED_STATE` 标记可见。
8. 窄视口保持可用，不丢失关键状态信息。
9. 服务器演示模式可正常启动。
10. 可选：使用只读 GitHub 令牌的真实模式可同步已配置仓库，且不产生任何 GitHub 变更。

## 结果

在跟踪 Issue 中记录精确 SHA、浏览器/系统、视口、PASS/FAIL、截图（如有用）、控制台错误以及所有 P0/P1/P2/P3 发现。不得对不同 HEAD 标记浏览器验证为 PASS。
