# 银杏 (yinxing.monkey)

> 115 网盘 Tampermonkey 用户脚本 — 磁力链接助手 + 文件自动整理

## 项目目标

在 115 网盘网页端提供：

1. **磁力链接助手** — 点击 `magnet:` / `ed2k:` 链接时自动复制并发送到 115 离线下载
2. **文件自动整理** — 扫描云盘文件，解析番号，查询元数据，自动分类归档
3. **UI 增强** — 调整页面布局、替换缩略图、注入操作菜单

## 技术栈

| 层面 | 技术 |
|---|---|
| 运行时 | 浏览器 (115.com)，Tampermonkey GM API |
| 语言 | TypeScript 5.8+ (strict, target es2023) |
| 构建 | Webpack 5 + ts-loader + style-loader + css-loader |
| 检查 | ESLint 9 flat config + typescript-eslint |
| Node | 24.x（fnm 管理） |
| 包管理 | pnpm |
| 发布 | semantic-release → npm → jsDelivr CDN |
| 许可证 | GPL-3.0 |

## 目录说明

```
├── AGENTS.md              ← AI Agent 入口（本文件）
├── README.md              项目说明
├── src/                   源码
│   ├── index.ts           入口 / 启动
│   ├── config.ts          环境配置（.env → webpack DefinePlugin）
│   ├── core/              GM API 抽象层
│   ├── services/          115 API + 元数据 API + 文件整理引擎
│   ├── ui/                UI 类（布局 / 菜单 / 缩略图）
│   └── types/             类型声明
├── scripts/               构建 / 发布 / 调试辅助脚本
├── docs/                  文档
│   ├── architecture.md    架构说明
│   ├── development.md     开发指南
│   ├── troubleshooting.md 调试与常见问题
│   └── decisions/         架构决策记录 (ADR)
├── .github/
│   └── copilot-instructions.md  VS Code Copilot 指令
└── .env                   本地环境配置（不入库）
```

## 开发原则

- **GM API 双模式回退**：`GM_foo()` 和 `GM.foo()` 都兼容
- **静态方法为主**：`MonkeyKernel`、`UI` 类以静态方法组织
- **DOM 变化监听**：使用 `arrive` 库监听动态渲染的元素
- **中文 UI**：用户界面文本全部为中文
- **日志前缀**：`console.debug('[Yinxing:xxx]')` 格式
- **配置外部化**：本地环境变量通过 `.env` + webpack DefinePlugin 注入
- **调试版本号**：每次修改代码后，递增 `src/ui/ui.ts` 中 `initUI()` 的 `DEBUG_VERSION` 常量（如 `v3` → `v4`），用于绕过 TM `@require` 缓存确认注入的是最新代码

## 测试方式

- **Lint**: `npm run lint`
- **构建验证**: `npm run build`
- **运行时调试**: 通过 Chrome DevTools MCP 连接调试 Chrome（见 `docs/troubleshooting.md`） 与常规方式不同，在需要使用 MCP 时 **必须** 先读此文档
- **无单元测试**：项目当前无测试框架

## 文档索引

| 文档 | 用途 |
|---|---|
| `docs/architecture.md` | 系统架构、模块职责、数据流 |
| `docs/ci-cd.md` | CI/CD 与发布流程（npm + jsDelivr + GreasyFork） |
| `docs/development.md` | 环境准备、安装、启动、开发流程 |
| `docs/troubleshooting.md` | 调试方法、已知问题、常见错误 |
| `docs/decisions/` | 架构决策记录 (ADR) |
| `.github/copilot-instructions.md` | VS Code Copilot 行为指令 |
