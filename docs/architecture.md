# 架构说明

## 系统整体结构

银杏是一个运行在 115 网盘网页端的 Tampermonkey 用户脚本。它通过 `@require` 从 CDN（开发时从本地 webpack-dev-server）加载 Webpack 打包后的 bundle，在 115 页面 DOM 中注入功能。

```
Tampermonkey 沙箱
┌─────────────────────────────────────────────────┐
│  @require → bundle (lib/index.js)               │
│                                                  │
│  src/index.ts (boot)                             │
│    ├─ MonkeyKernel (GM API 抽象层)               │
│    ├─ UI (布局 / 菜单 / 缩略图)                  │
│    ├─ YYWCloud (115 API 客户端)                  │
│    └─ YinXing (元数据 API + 文件整理引擎)        │
│                                                  │
│  GM_* API ←→ Tampermonkey 沙箱全局               │
│  unsafeWindow ←→ 115 页面真实 window              │
└─────────────────────────────────────────────────┘
```

## 核心模块职责

### `src/core/monkey_kernel.ts` — GM API 抽象层

- 封装所有 `GM_*` / `GM.*` API，提供统一接口
- 处理 webpack IIFE 闭包中 GM API 不可见的问题（从 `globalThis` → `unsafeWindow` 逐级回退）
- 提供 `arrive()` DOM 监听、`requestJSON()` HTTP 请求、`notify()` 通知等工具方法
- 导出 `$`（jQuery noConflict 模式）、`Noty` 供其他模块使用

### `src/services/yyw_cloud.ts` — 115 云盘 API 客户端

- 封装 115 网盘 HTTP API（文件列表、创建/移动/重命名/删除、离线下载）
- 提供 `File.factory()` 将 115 原始响应映射为领域对象
- 统一请求处理（POST 表单、X-Requested-With 头、错误处理）

### `src/services/yinxing.ts` — 元数据 API + 文件整理引擎

- `parseBanngo()` — 从文件名中提取番号
- `matchMovie()` — 查询元数据 API 获取影片信息
- `handleAll()` / `handlePage()` / `handleFile()` — 递归遍历文件夹，执行整理管线

### `src/ui/ui.ts` — UI 类

- 注入操作菜单、调整页面布局（CSS 覆盖）、替换缩略图
- 磁力链接复制与离线下载触发
- 布局样式分 V1/V2 两套，自动检测页面结构后应用

### `src/config.ts` — 应用配置

- 通过 webpack DefinePlugin 注入 `.env` 变量
- 提供 `config` 常量对象供各模块引用

## 数据流

### 磁力链接处理

```
用户点击 magnet:/ed2k: 链接
  → index.ts 全局 click 事件
  → UI.addLinkToClipboard() 复制到剪贴板
  → UI.downloadByCloud() → YYWCloud.download() → 115 离线下载 API
```

### 文件自动整理

```
boot() → UI.handleCurrentPage()
  → YinXing.handleAll(entryParentId)
    → 分页遍历文件夹 (YYWCloud.getFileList)
      → 对每个文件:
        → YinXing.parseBanngo(文件名)
        → 有番号? → YinXing.matchMovie(番号) → 元数据 API
          → 匹配? → YinXing.toNames(movie) → 生成目录名/文件名
            → findOrCreateDir() → move() → rename()
        → 无番号? → 跳过
```

### 布局调整

```
boot() → UI.changeLayouts()
  → 检测页面结构 (是否有 .w-16.h-16.relative 包裹层)
  → 注入对应 CSS (V1 或 V2)
  → UI.replaceTitleWithAttr() 替换标题文本
  → UI.replaceThumbnails() 替换缩略图
```

## 外部依赖

### 运行时依赖

| 包 | 用途 |
|---|---|
| jquery | DOM 操作、事件处理 |
| arrive | 监听动态 DOM 元素出现 |
| noty | 通知弹窗 |
| sanitize-filename | 文件名清理 |

### 外部 API

| API | 用途 | 端点 |
|---|---|---|
| 115 云盘 API | 文件 CRUD、离线下载 | `web.api.115.com` |
| 元数据 API | 番号查询 | `yinxing.com/v1/movies` |
| 批量元数据 API | 批量缩略图 | `yinxing.av2.us/v1/search` |
| DMM 图片 CDN | 缩略图源 | `awsimgsrc.dmm.co.jp` |

### Greasemonkey API（通过 `@grant` 声明）

`GM_xmlhttpRequest`, `GM_addStyle`, `GM_setValue`, `GM_getValue`, `GM_deleteValue`, `GM_openInTab`, `GM_setClipboard`, `GM_download`, `GM_notification`, `GM_registerMenuCommand`, `GM_unregisterMenuCommand`, `unsafeWindow`

## 关键设计原则

1. **GM API 双模式回退** — 同时支持 `GM_foo()`（旧版）和 `GM.foo()`（新版），兼容不同 Greasemonkey 版本
2. **webpack IIFE 兼容** — GM API 从 `globalThis` → `window` → `unsafeWindow` 逐级查找，解决闭包作用域问题
3. **DOM arrive 模式** — 115 页面使用 Next.js 动态渲染，通过 `arrive` 库监听元素出现而非轮询
4. **CSS 覆盖布局** — 通过注入 `<style>` 标签覆盖 115 页面样式，不修改原始 DOM 结构
5. **配置外部化** — 本地环境变量通过 `.env` + webpack DefinePlugin 注入，不硬编码在源码中
