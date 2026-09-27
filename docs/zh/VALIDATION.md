# 验证 — v0.0.1

> 🌐 [English](../VALIDATION.md) | 中文（如与英文版冲突，以英文版为准）

## 仓库真实验证

权威的干净运行环境验证由 `.github/workflows/ci.yml` 在精确的 PR HEAD 上执行。

必需检查：

- Node.js 22 上的干净依赖安装；
- 生产依赖审计（`npm audit --omit=dev --audit-level=high`）；
- package/server/web 生产构建；
- reducer、adapter、storage 与 server 测试；
- 覆盖全部 workspace 的 TypeScript 严格类型检查；
- 静态安全断言：运行时 GitHub 适配器不包含 POST/PUT/PATCH/DELETE 方法。

PASS 只对被测试的精确提交 SHA 有效。

## 当前的环境限制

初始实现使用的 ChatGPT 执行容器无法解析 npm registry，因此该环境下的本地安装/构建结果不作为发布证据。GitHub Actions 被用作干净的仓库真实验证主机。

## 浏览器/UX 验证

真实浏览器的视觉与交互验证刻意与仓库编译/测试验证分离。它至少需要验证：

- 桌面与窄视口布局；
- 泳道/DAG 可读性；
- 就绪/运行中/阻塞/可合并面板；
- Agent/调度卡片；
- 证据矩阵与过期精确 SHA 警告的可见性；
- 任务详情/溯源交互；
- 演示模式启动与真实 API 启动。

当当前执行环境不提供合适的浏览器宿主时，浏览器验证以本地环境验证交接 Issue 的形式跟踪。

## 权威

所有 UI/缓存状态都是 `NON_AUTHORITATIVE_DERIVED_STATE`；GitHub/仓库持久事实始终是权威的。
