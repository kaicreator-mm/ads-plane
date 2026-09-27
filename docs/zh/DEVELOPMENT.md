# 开发指南

> 🌐 [English](../DEVELOPMENT.md) | 中文（如与英文版冲突，以英文版为准）

## 环境要求

- Node.js 22+
- npm 10+

## 安装

```bash
npm install
```

## 校验

```bash
npm run check
```

该命令对所有 workspace 运行严格类型检查、Vitest 与生产构建。

## 开发服务器

终端 1：

```bash
ADS_DEMO=1 npm run dev
```

终端 2：

```bash
npm run dev:web
```

Vite 将 `/api` 代理到端口 4310。

## 包规则

- contracts 不得导入 adapter/storage/server 代码；
- reducer 必须保持纯函数与确定性；
- GitHub adapter 必须保持只读；
- storage 不得成为项目权威；
- web 必须消费 VersionSnapshot，而不是自行发明独立的工作流语义。

## 新增归约器语义

先添加重放/反向夹具（fixture），再实现最小的确定性规则。任何回退/启发式都必须保留溯源。新的权威语义应首先在 `ai-development-standard` 中定义，而不是由 ADS Plane 自行发明。
