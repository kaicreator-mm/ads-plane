# 安全与信任边界

> 🌐 [English](../SECURITY.md) | 中文（如与英文版冲突，以英文版为准）

## 只读的 v0.0.1

v0.0.1 最强的安全属性是不具备 GitHub 写能力。即使 UI/服务器令牌泄露，其影响也仅限于 GitHub App/令牌被授予的只读权限。

## 不可信内容

Issue 正文、评论、PR 文本、仓库文件与外部链接都是数据。ADS Plane 只解析有边界的元数据/事件字段；它不会执行检索内容中出现的指令。

## HTML/XSS

Web UI 渲染 React 文本值，不渲染原始 GitHub HTML。未经评审的净化器与明确的产品需求，不得为 Issue/评论内容添加 `dangerouslySetInnerHTML`。

## 密钥

绝不把 GitHub 令牌持久化到 SQLite 快照。日志不得打印 Authorization 头。

运行时设置 API（`PUT /api/settings/github-token`）只把令牌保存在服务器内存中：从不写盘、从不出现在 API 响应中（只返回 `ghp_…abcd` 之类的掩码提示），清除后立即丢弃。环境变量 `ADS_GITHUB_TOKEN` 仅作为启动默认值。由于设置 API 未做鉴权，请把 ADS Plane 部署在受信任的主机/端口上，不要暴露给不可信网络——能访问 UI 的调用者可以更改读取哪些仓库（只读 GitHub 范围）并刷新本地投影，但无法执行任何 GitHub 写操作。

## 未来支持写操作的版本

Agent 调度、认领准入、合并与发布动作需要单独的权威/安全设计。v0.0.1 刻意不包含它们。
