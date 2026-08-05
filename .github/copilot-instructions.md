# VS Code Copilot Instructions — 银杏 (yinxing.monkey)

## 项目类型

GM_userscript 项目，运行在 115 网盘网页端。TypeScript + Webpack 5 构建，Tampermonkey 环境。

## 重要约束

### GM API 访问

- 所有 GM_* API 必须通过 `MonkeyKernel` 静态方法访问，而非直接使用全局变量
- 原因：webpack IIFE 闭包中 `GM_*` 全局变量不可见，`MonkeyKernel` 已处理从 `globalThis` → `window` → `unsafeWindow` 的逐级查找

### 布局修改

- 115 页面布局通过注入 CSS `<style>` 标签实现，不修改原始 DOM 结构
- 布局方法放在 `UI.changeLayoutsV1()` / `V2()` 中，`changeLayouts()` 同时调用两者
- 新增布局版本时，在 `UI` 类中新建 `changeLayoutsV3()` 并在 `changeLayouts()` 中调用

### 配置读取

- 本地环境变量通过 `src/config.ts` 的 `config` 对象读取，而非硬编码
- 新增配置项时，同时在 `.env.example` 和 `webpack.config.js` 的 DefinePlugin 中添加

### DOM 操作

- 使用 jQuery（`$`，从 `MonkeyKernel` 导入）做 DOM 操作
- 使用 `MonkeyKernel.arrive(selector, handler)` 监听动态渲染的元素
- 不要使用 `$(document).ready` 直接操作可能动态渲染的元素

### 代码风格

- 静态方法组织（`MonkeyKernel`、`UI`、`YYWCloud` 均为静态类）
- 中文 UI 文本
- `console.debug('[Yinxing:xxx]')` 前缀日志
- `@grant` 声明在 `scripts/release.js` 中维护，新增 GM API 时需同步添加

## 文档索引

| 文档 | 用途 |
|---|---|
| `AGENTS.md` | 项目入口，技术栈、目录、开发原则 |
| `docs/architecture.md` | 系统架构、模块职责、数据流 |
| `docs/development.md` | 环境准备、安装、启动、开发流程 |
| `docs/troubleshooting.md` | 调试方法、已知问题、常见错误 |
| `docs/decisions/` | 架构决策记录 (ADR) |