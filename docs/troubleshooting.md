# 调试与常见问题

## 调试方法

### Chrome DevTools MCP 调试

本项目使用 chrome-devtools MCP 连接独立调试 Chrome 进行油猴脚本调试。

**启动调试 Chrome**：

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/chrome-dev-profile
```

**验证连接**：

```bash
curl -s http://127.0.0.1:9222/json/version
```

**检查脚本是否注入**（在 MCP `evaluate_script` 中执行）：

```js
typeof GM !== 'undefined'        // Tampermonkey 是否注入
typeof GM_info !== 'undefined'   // 是否有脚本信息
```

### 刷新 TM @require 缓存

```bash
npm run flush
```

这会自动递增 `@require` URL 版本号并重启 TM Service Worker。

### 查看控制台日志

使用 MCP 的 `list_console_messages` 工具查看 115 页面控制台输出。脚本日志以 `[Yinxing:xxx]` 前缀输出。

## 已知问题

### webpack 5 + Tampermonkey 兼容

- **publicPath**：必须设为 `''` 或完整 URL，禁用自动 publicPath 推断（`document.currentScript` 在 TM 沙箱中为 `null`）
- **chunkLoading**：必须设为 `false`，TM 沙箱不支持动态加载
- **chunkFormat**：使用 `'array-push'` 兼容格式

### GM API 作用域

- webpack 打包后代码运行在 IIFE 闭包中，`GM_*` 全局变量不可直接访问
- `unsafeWindow` 是页面真实 `window`，GM API 挂在**沙箱全局**（`globalThis`/`window`）上
- 修复方式：从 `globalThis` → `window` → `unsafeWindow` 逐级查找

### Tampermonkey @require 缓存

- TM 会缓存 `@require` 加载的外部脚本
- 修改 webpack 后需通过 `npm run flush` 递增版本号强制刷新
- 或在 TM 管理面板中编辑脚本 → Ctrl+S 保存触发重新缓存

### 115 页面动态渲染

- 115 使用 Next.js 动态渲染，DOM 元素在页面加载后异步出现
- 必须使用 `arrive` 库监听元素出现，不能用 `$(document).ready` 直接操作

## 常见错误

| 错误 | 原因 | 解决 |
|---|---|---|
| `ReferenceError: GM_openInTab is not defined` | webpack IIFE 闭包中 GM API 不可见 | 检查 `monkey_kernel.ts` 中的 GM API 查找逻辑 |
| `Error: Automatic publicPath is not supported` | webpack 5 自动 publicPath 推断失败 | 检查 `webpack.config.js` 中 `publicPath: ''` |
| `TypeError: gms.getValue is not a function` | GM API 查找失败 | 检查 `@grant` 声明是否完整 |
| 脚本不工作但无报错 | TM 缓存了旧版 `@require` | 运行 `npm run flush` |
| MCP 连不上 | 调试 Chrome 未启动或端口被占用 | 确认 `curl -s http://127.0.0.1:9222/json/version` 有响应 |
| 页面布局不对 | 页面结构版本与注入的 CSS 不匹配 | `changeLayouts()` 会自动检测，检查 V1/V2 选择器 |

## 调试 Chrome 注意事项

1. **不要用 VS Code 内置 `open_browser_page`** — 会开无扩展 Chrome，必须用 `mcp_chrome_devtoo_*` 工具
2. **Chrome 136+** 默认 profile 不开放远程调试，必须用 `--user-data-dir` 指定独立 profile
3. **MCP 需手动批准**：VS Code 重启后，在 MCP 面板批准启动 `chrome-devtools`
