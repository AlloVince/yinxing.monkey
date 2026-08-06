# ADR-006: UI 重构与银杏下拉菜单

## 背景

随着功能增加，`src/index.ts` 中混杂了大量 UI 初始化逻辑（域名检测、面包屑判断、标题替换、缩略图替换、arrive 监听等），导致入口文件臃肿。同时 `isCloudDownloadPage()` 硬编码了「云下载」文件夹名，用户无法自定义封面替换的生效目录。

## 问题

1. `src/index.ts` 承担了过多 UI 职责，不符合单一职责原则
2. 封面替换的生效目录硬编码为「云下载」，用户无法配置
3. 115 用户 ID 通过 Noty 弹窗输入，体验不佳
4. 缩略图 URL 生成逻辑中 `prefixMap` 以字母前缀匹配，误伤同前缀的其他番号（如 vdd-204）

## 候选方案

### 方案 A（选定）：UI 逻辑集中 + 可配置化

- 将所有 UI 初始化逻辑从 `index.ts` 迁移到 `UI.initUI()` 中
- 新增 `isCoverAllowedPage()` 从 GM 存储读取用户配置的文件夹名
- 新增 `initYinxingDropdown()` 在导航栏注入银杏专属下拉菜单
- 提取 `replaceSingleTitle()` / `replaceSingleThumbnail()` 单元素操作方法
- 使用 `specialMap` 按具体番号 ID 映射替代字母前缀映射

### 方案 B：保持现状，仅修复 bug

- 不重构，只在现有结构上修 bug
- 无法解决代码组织问题

## 最终选择

方案 A

## 原因

1. **入口轻量化** — `index.ts` 只保留磁力链接处理和 `UI.initUI()` 调用，职责清晰
2. **用户可配置** — 封面替换目录通过下拉菜单设置，支持逗号分割多个文件夹名
3. **体验提升** — 115 ID 和封面设置集成到导航栏下拉菜单，不再弹 Noty 弹窗
4. **代码复用** — 单元素操作方法可被 `replaceTitleWithAttr()` / `replaceThumbnails()` 和 `arrive` 回调共同调用
5. **精确映射** — `specialMap` 按完整番号 ID 匹配，避免误伤

## 后续影响

- `storeAndGetYYWID()` 不再弹 Noty 输入框，调用方需确保在调用前用户已通过下拉菜单设置 ID
- 新增 GM 存储键 `yinxingCoverFolders`，需在 `scripts/release.js` 中确认无需额外 `@grant`
- 下拉菜单样式通过 `MonkeyKernel.addStyle()` 注入，与布局 CSS 一致
- 新增特殊番号映射时只需在 `specialMap` 中添加条目