# 油猴脚本 + webpack 5 调试经验总结

> 2026-08-05 调试记录

## 问题现象

脚本注入到 115 云盘页面后不工作，打开 DevTools Console 看到：

1. `ReferenceError: GM_openInTab is not defined`
2. `TypeError: gms.getValue is not a function`
3. `Error: Automatic publicPath is not supported in this browser`

## 根因一：webpack 5 Automatic publicPath

### 错误

```
Error: Automatic publicPath is not supported in this browser
```

### 原因

webpack 5 默认会生成自动 publicPath 推断代码：

```js
var scriptUrl;
if (document.currentScript)
    scriptUrl = document.currentScript.src;
if (!scriptUrl)
    throw new Error("Automatic publicPath is not supported in this browser");
```

Tampermonkey 沙箱中 `document.currentScript` 为 `null`，导致抛出异常，**整个 bundle 执行中断**。

### 修复

`webpack.config.js` 中：

```js
output: {
  // ...
  publicPath: '',           // 禁用自动 publicPath 推断
  chunkLoading: false,      // 禁用 chunk 加载
  chunkFormat: 'array-push', // 使用兼容格式
}
```

### 验证

```bash
grep "Automatic publicPath" lib/index.js
# 无输出说明已修复
```

## 根因二：webpack IIFE 闭包中 GM_* API 不可见

### 错误

```
ReferenceError: GM_openInTab is not defined
```

### 原因

webpack 打包后代码运行在 IIFE 闭包中，`GM_openInTab` 等 `@grant` 全局变量在闭包作用域中不可见。

`unsafeWindow` 是**页面真实 window**，Tampermonkey 的 GM API 挂在**沙箱全局**（`globalThis`/`window`）上，**不在** `unsafeWindow` 上。

### 修复

在 `src/core/monkey_kernel.ts` 中，从沙箱全局逐级查找：

```ts
const uw = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : undefined) as any;
const g = (typeof globalThis !== 'undefined' ? globalThis : window) as { [key: string]: any };
const gms = {
  openInTab: (g.GM_openInTab ?? g.GM?.openInTab ?? uw?.GM_openInTab ?? uw?.GM?.openInTab) as (...),
  setValue: (g.GM_setValue ?? g.GM?.setValue ?? uw?.GM_setValue ?? uw?.GM?.setValue) as (...),
  getValue: (g.GM_getValue ?? g.GM?.getValue ?? uw?.GM_getValue ?? uw?.GM?.getValue) as (...),
  deleteValue: (g.GM_deleteValue ?? g.GM?.deleteValue ?? uw?.GM_deleteValue ?? uw?.GM?.deleteValue) as (...),
  addStyle: (g.GM_addStyle ?? g.GM?.addStyle ?? uw?.GM_addStyle ?? uw?.GM?.addStyle) as (...),
  setClipboard: (g.GM_setClipboard ?? g.GM?.setClipboard ?? uw?.GM_setClipboard ?? uw?.GM?.setClipboard) as (...),
  xmlhttpRequest: (g.GM_xmlhttpRequest ?? g.GM?.xmlHttpRequest ?? uw?.GM_xmlhttpRequest ?? uw?.GM?.xmlHttpRequest) as (...),
};
```

### 类型声明

`src/types/greasemonkey.d.ts` 中 `unsafeWindow` 必须声明为**全局变量**，而非 `Window` interface 属性：

```ts
declare const unsafeWindow: Window;
```

## 根因三：Tampermonkey @require 缓存

### 现象

修改 webpack 生成 `lib/index.js` 后，页面刷新后脚本仍执行旧版本。

### 原因

Tampermonkey 对 `@require` 加载的外部脚本有缓存。

### 解决

1. 打开 TM 管理面板 → 编辑脚本 → Ctrl+S 保存（触发重新缓存）
2. 或临时修改 `@require` URL 加 query string：`// @require http://localhost:8080/index.js?v=2`

## 当前生效的 webpack 配置

```js
// webpack.config.js
output: {
  path: path.resolve(__dirname, 'lib'),
  filename: 'index.js',
  clean: false,
  publicPath: '',
  chunkLoading: false,
  chunkFormat: 'array-push',
},
devtool: false,
optimization: {
  runtimeChunk: false,
  splitChunks: false,
},
```

## 调试流程

### 启动调试 Chrome

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/chrome-dev-profile
```

### 检查 MCP 连接

```bash
# MCP 配置 .vscode/mcp.json 连接远程调试端口
chrome-devtools-mcp --browser-url http://127.0.0.1:9222
```

### 验证脚本是否注入

```js
// 在 DevTools Console 或 MCP evaluate_script 中执行
typeof GM_info !== 'undefined'  // true 表示脚本已注入
```

## 关键教训

1. **webpack 5 + Tampermonkey 必须禁用 publicPath 和 chunkLoading**
2. **GM_* API 在沙箱全局（globalThis/window），不在 unsafeWindow 上**
3. **Tampermonkey 缓存 @require 内容，修改后需手动刷新**
4. **MCP chrome-devtools 使用独立工具名（`mcp_chrome_devtoo_*`），不要用 VS Code 内置 `open_browser_page`**