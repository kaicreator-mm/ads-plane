# GitHub 权限

> 🌐 [English](../GITHUB_PERMISSIONS.md) | 中文（如与英文版冲突，以英文版为准）

v0.0.1 刻意保持只读。

## 推荐的 GitHub App 仓库权限

- Metadata：read（GitHub Apps 隐式/必需）
- Contents：read
- Issues：read
- Pull requests：read
- Actions：read
- Checks：仅当部署后续选择采集工作流运行之外的 check-run 细节时才需要 read

原生 Issue Dependencies 读取端点由 Issues read 权限覆盖。

## 运行时安全规则

`GitHubReadOnlyClient` 只暴露 GET 请求。运行时包中不存在任何 create/update/delete/merge 方法。本地 `POST /sync` 端点的含义是"刷新本地投影"，而不是"向 GitHub 发 POST"。

## 令牌处理

不要提交令牌。优先使用短生命周期的 GitHub App 安装令牌，通过运行时环境/密钥管理器提供。`ADS_GITHUB_TOKEN` 是一个注入点，不要求使用经典 PAT。
