# ADR-003: 本地环境配置外部化 (.env)

- **状态**: 已实施
- **日期**: 2026-08-05

## 背景

项目中有多处硬编码的本地环境值：115 云盘目录 ID、API 端点、Chrome 调试端口、dev server URL 等。这些值在不同开发环境或不同用户之间需要不同配置。

## 问题

- 115 目录 ID（`1153737365202791679` 等）硬编码在 `src/ui/ui.ts` 中
- API 端点（`yinxing.com`、`yinxing.av2.us`）硬编码在源码中
- Chrome 调试端口（`9222`）硬编码在 `bump-require-version.js` 和 `.vscode/mcp.json` 中
- dev server URL（`localhost:8080`）硬编码在 `webpack.config.js` 中
- 这些值无法在不同环境间共享，也不适合提交到仓库

## 候选方案

1. **保持硬编码** — 每次修改直接改源码
2. **使用 `.env` 文件** — webpack DefinePlugin 注入到源码
3. **使用 `config.ts` 模块** — 运行时读取环境变量

## 最终选择

方案 2 + 3 结合：

- `.env` 文件存储配置（不入库，`.env.example` 入库作为模板）
- `webpack.config.js` 手动解析 `.env`（避免额外依赖）
- webpack DefinePlugin 将值注入为 `process.env.*`
- `src/config.ts` 提供类型安全的 `config` 常量对象

## 原因

- 方案 1 不可维护，每次换环境都要改源码
- 方案 2 是社区标准实践，与 webpack 生态集成良好
- 手动解析 `.env` 避免引入 `dotenv` 依赖
- DefinePlugin 在构建时替换值，无运行时开销

## 后续影响

- 新增 `.env`（已加入 `.gitignore`）和 `.env.example`
- 新增 `src/config.ts` 配置模块
- 更新 `webpack.config.js`、`scripts/bump-require-version.js`、`scripts/release.js` 读取 `.env`
- 所有硬编码值已迁移到 `.env`