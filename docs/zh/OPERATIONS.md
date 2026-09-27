# 运维

> 🌐 [English](../OPERATIONS.md) | 中文（如与英文版冲突，以英文版为准）

## 健康检查

`GET /api/health` 返回 ADS Plane 运行时版本与只读权威标记。

## 同步

- 启动时：所有已配置仓库对账一次；
- 周期性：由 `ADS_SYNC_INTERVAL_SECONDS` 控制；
- 手动：`POST /api/projects/:owner/:repo/sync` 或 `POST /api/sync`。

同步失败不会抹掉最近一次良好的缓存快照。API 在保留现有快照的同时报告错误。

## 备份

SQLite 文件是可丢弃的。备份是可选的。重建方式：

```bash
rm -f .data/ads-plane.db*
npm start -w @ads-plane/server
```

已配置的仓库通常由环境变量提供。如果只依赖通过 API 注册的仓库，删除数据库后需要重新提供它们的仓库坐标。

## 速率限制

多项目/私有项目建议使用认证访问 GitHub。大型组织应在后续 ADS Plane 版本中转向 webhook 辅助的增量同步，而不是激进轮询。

## 日志

Fastify 输出结构化服务器日志。采集器错误包含 GitHub GET 路径与 HTTP 状态，响应体会被截断以避免日志放大。
