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

### UI 初始化

- 所有 UI 修改（布局、标题、缩略图、菜单）统一在 `UI.initUI()` 中初始化
- `index.ts` 保持轻量，只做入口引导（磁力链接事件 + `UI.initUI()` 调用）
- 标题替换使用 `UI.replaceSingleTitle(item)` 操作单个元素，`UI.replaceTitleWithAttr()` 遍历全部
- 缩略图替换使用 `UI.replaceSingleThumbnail(item)` 操作单个元素，`UI.replaceThumbnails()` 遍历全部
- `arrive` 回调中应调用单元素方法而非内联重复逻辑

### 封面替换目录

- 封面替换的生效目录通过 `isCoverAllowedPage()` 判断，从 GM 存储读取 `yinxingCoverFolders`
- 用户可在银杏下拉菜单中设置逗号分割的文件夹名，未设置时默认匹配「云下载」
- 新增封面替换目录判断时，修改 `isCoverAllowedPage()` 即可

### 缩略图 URL 生成

- DMM 缩略图 URL 在 `replaceSingleThumbnail()` 中生成
- 特殊番号映射使用 `specialMap`（按完整番号 ID 匹配），而非字母前缀匹配
- 例如 `vdd-203` → `specialMap["vdd00203"] = "24vdd00203"`
- 新增特殊映射时在 `specialMap` 中添加条目

### 银杏下拉菜单

- 通过 `UI.initYinxingDropdown()` 注入到 `div.sticky > div.flex` 导航栏末尾
- 样式通过 `MonkeyKernel.addStyle()` 注入
- 点击「银杏」按钮切换显示，点击外部区域自动关闭
- 新增菜单项时在 `initYinxingDropdown()` 的 HTML 模板中添加

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

### 调试版本号约定

- `src/ui/ui.ts` 的 `initUI()` 中定义了 `DEBUG_VERSION` 常量（如 `'v4'`）
- **每次修改代码后，必须递增此版本号**（如 `v3` → `v4`）
- 脚本启动时会 `console.debug('[Yinxing:Debug]', DEBUG_VERSION)` 输出版本号
- 同时在页面中注入 `<div id="yinxingDebug" data-version="v4">` 供 AI Agent 通过 DOM 检查
- 修改完成后，提示用户「请刷新页面并检查 Console 中的 `[Yinxing:Debug]` 版本号」
- 此机制用于绕过 Tampermonkey `@require` 缓存，确认注入的是最新代码

## 文档索引

| 文档 | 用途 |
|---|---|
| `AGENTS.md` | 项目入口，技术栈、目录、开发原则 |
| `docs/architecture.md` | 系统架构、模块职责、数据流 |
| `docs/development.md` | 环境准备、安装、启动、开发流程 |
| `docs/troubleshooting.md` | 调试方法、已知问题、常见错误 |
| `docs/decisions/` | 架构决策记录 (ADR) |

## 开发环境

- **Node.js 版本管理**: 使用 `fnm`（`.node-version` 文件中定义了版本 `24`）
- **包管理器**: 使用 `pnpm`（项目以 `pnpm-lock.yaml` 作为锁定文件）
- 运行命令时使用 `pnpm` 而非 `npm`，例如 `pnpm install`、`pnpm run build`、`pnpm run lint`