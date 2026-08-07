# ADR-005: TM @require 缓存刷新方案

- **状态**: 已实施（2026-08-07 更新：修复 `@meta` 缓存同步问题）
- **日期**: 2026-08-05（更新: 2026-08-07）

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

## 2026-08-07 更新：`@meta` 缓存同步

### 发现的问题

直接修改 `chrome.storage.local` 中的 `@source` 条目后，`GM_info.script.header` 仍返回旧值。

### 根因

TM 在 `chrome.storage.local` 中有两套存储：
- `@source` — 脚本原始源码
- `@meta` — 解析后的脚本元数据（包含 `header` 字段，即脚本头部原始字符串）

`GM_info.script.header` 从 `@meta` 的 `value.header` 字段读取，而非从 `@source` 解析。
仅修改 `@source` 不会更新 `@meta`，导致 `GM_info.script.header` 仍为旧值。

### 修复方式

在 `bump-require-version.js` 中，通过 `sourceKey` 推导出 `metaKey`（将 `@source` 替换为 `@meta`），
同步更新 `meta.value.header` 中的 `@require` 版本号：

```js
const metaKey = sourceKey.replace('@source', '@meta');
const metaEntry = all[metaKey];
if (metaEntry && metaEntry.value) {
  const meta = metaEntry.value;
  if (meta.header) {
    meta.header = meta.header.replace(/v=\\\\d+/, 'v=' + newVer);
    metaEntry.value = meta;
    await chrome.storage.local.set({ [metaKey]: metaEntry });
  }
}
```

### 验证方式

新增 `getRequireVersion()` 函数，从 `GM_info.script.header` 中提取 `@require` 的 `?v=` 参数，
输出到 `[Yinxing:boot] 脚本注入成功 v{version}` 日志。

### 经验教训

- TM 的 `GM_info` 字段不含 `require`/`requires` 数组，需从 `GM_info.script.header`（原始头部字符串）解析
- `GM_info.script.header` 来自 `@meta` 缓存而非 `@source`
- 修改 TM 存储时应检查所有相关缓存条目，确保一致