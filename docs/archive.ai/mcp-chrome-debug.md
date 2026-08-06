# Chrome DevTools MCP 调试指南

> 本文档记录本项目如何通过 **chrome-devtools MCP** 连接独立调试 Chrome 进行油猴脚本调试。

## 背景：为什么用独立 Chrome

新版 Chrome（**Chrome 136+**）调整了远程调试安全策略：

- ✅ **默认 profile**（`~/Library/Application Support/Google/Chrome`）**不再允许**随便开启远程调试
- ❌ `--remote-debugging-port=9222` 若不加 `--user-data-dir`，会复用默认 profile → 无法生效

因此必须**指定一个非默认的数据目录**。

## 调试 Chrome 启动命令

在终端执行（每次调试前确认已运行）：

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=$HOME/chrome-dev-profile
```

- **Profile**: `$HOME/chrome-dev-profile`
- **端口**: `9222`
- 该 profile 已安装 **Tampermonkey 5.5.0** + 本项目的银杏脚本

## MCP 配置

文件：`.vscode/mcp.json`

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "pnpm",
      "args": [
        "dlx",
        "chrome-devtools-mcp@latest",
        "--browser-url",
        "http://127.0.0.1:9222"
      ]
    }
  }
}
```

**关键点**：
- 用 `pnpm dlx`（而非 `npx`），因为用户环境用 pnpm
- 参数是 `--browser-url`（下划线形式在 pnpm/yargs 场景下会被自动转换，但推荐 `--browser-url` 连字符形式）
- 通过 `--browser-url http://127.0.0.1:9222` **连接**到已运行的调试 Chrome，**不会**自己启动 Chrome

## 使用 chrome-devtools MCP 工具

MCP 连上后，会出现以下工具（`mcp_chrome_devtoo_*`）：

| 工具 | 用途 |
|---|---|
| `list_pages` | 列出调试 Chrome 中的标签页 |
| `select_page` | 切换到目标标签页 |
| `navigate_page` | 导航到 URL |
| `evaluate_script` | 在页面执行 JS（检查 GM 变量、DOM 等） |
| `list_console_messages` | 查看控制台日志 |
| `list_network_requests` | 查看网络请求 |
| `take_screenshot` | 页面截图 |
| `click` / `fill` / `hover` | 页面交互 |

### 检查脚本是否生效

```js
// 在页面执行
typeof GM !== 'undefined'        // Tampermonkey 是否注入
typeof GM_xmlhttpRequest !== 'undefined'  // GM API
typeof GM_info !== 'undefined'   // 是否有脚本信息
```

## ⚠️ 重要注意事项

1. **不要用 VS Code 内置的 `open_browser_page` / `run_playwright_code`**
   - 这些是 VS Code 内置浏览器工具，会**另开一个无扩展的 Chrome**
   - 与 MCP 连接的是**两套不同**的浏览器实例
   - 检查脚本是否生效必须用 `mcp_chrome_devtoo_*` 工具

2. **MCP 需要手动批准**：VS Code 重启后，需在 MCP 面板（`MCP: List Servers`）批准启动 `chrome-devtools`

3. **调试前先确认**：
   - ✅ 调试 Chrome 已运行（`curl -s http://127.0.0.1:9222/json/version`）
   - ✅ MCP 已连上（可用 `list_pages` 看到调试 Chrome 的标签页）

## 验证命令

```bash
# 检查 9222 端口是否在监听
curl -s http://127.0.0.1:9222/json/version

# 列出调试 Chrome 打开的标签页
curl -s http://127.0.0.1:9222/json | python3 -c "import sys,json;[print(p['title'],'-',p['url']) for p in json.load(sys.stdin)]"
```

## 常见问题

### Tampermonkey 检测不到
- 确认用的是 chrome-devtools MCP 工具，而不是 VS Code 内置浏览器
- 确认调试 profile（`~/chrome-dev-profile`）里装了 Tampermonkey
- 确认访问的是 115 云盘页面（`https://115.com/?ct=file&ac=all`），而非 115 首页

### 端口无法连接
- Chrome 136+ 默认 profile 不开放调试 → 必须用 `--user-data-dir` 指定独立 profile
- 确认没有多个 Chrome 实例冲突（杀掉旧实例再启动）