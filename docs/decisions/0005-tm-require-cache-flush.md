# ADR-005: TM @require 缓存刷新方案

- **状态**: 已实施
- **日期**: 2026-08-05

## 背景

银杏脚本通过 `@require` 从 dev server / CDN 加载 Webpack 构建产物。Tampermonkey 会缓存 `@require` 加载的外部脚本，导致修改源码后页面刷新仍执行旧版本。

## 问题

- 每次修改源码并重新构建后，Tampermonkey 仍使用缓存的旧 bundle
- 需要手动打开 TM 管理面板 → 编辑脚本 → Ctrl+S 触发重新缓存，效率低
- 无法自动化处理

## 候选方案

1. **手动刷新** — 在 TM 管理面板中 Ctrl+S 保存
2. **修改 `@require` URL 加 query string** — 手动加 `?v=N`
3. **自动化脚本** — 通过 CDP 连接 TM Service Worker，递增版本号并重启

## 最终选择

方案 3：新增 `scripts/bump-require-version.js`：

- 通过 Chrome DevTools Protocol 连接 Tampermonkey Service Worker
- 读取 `chrome.storage.local` 中的脚本源码
- 递增 `@require` URL 的 `?v=` 版本号
- 写回 storage 并重启 TM Service Worker（让它重新加载配置）
- 通过脚本名称 `@name` 定位目标脚本（支持多脚本）

并提供 `npm run flush` 命令（bump + dev-server）。

## 原因

- 方案 1 完全手动，无法自动化
- 方案 2 需要手动改脚本，容易出错
- 方案 3 完全自动化，且通过 CDP 复用已有的调试 Chrome 连接
- 通过脚本名称定位而非 UUID，支持未来多脚本场景

## 后续影响

- 新增 `scripts/bump-require-version.js` 和 `npm run flush` 命令
- 脚本通过 `.env` 中的 `CDP_URL` 和 `TM_SCRIPT_NAME` 配置
- 需要调试 Chrome 运行在 `--remote-debugging-port=9222`