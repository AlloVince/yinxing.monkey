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

## 调试前自检流程（AI Agent 必须执行）

> 每次用户要求通过 MCP 调试脚本时，AI Agent **必须先完成以下自检**，确认与调试 Chrome 的连接正常，再告知用户开始操作。

### Step 1: 确认调试 Chrome 正在运行

```bash
curl -s http://127.0.0.1:9222/json/version
```

如果失败，告知用户先启动调试 Chrome：

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/chrome-dev-profile
```

### Step 2: 确认 MCP 页面列表可达

用 `mcp_chrome_devtoo_list_pages` 列出页面。**至少应看到 115 的标签页**。

如果列表为空，说明 MCP 连接异常，需要检查 `.vscode/mcp.json` 配置或重启 VS Code MCP 服务。

### Step 3: 选中目标页面

用 `mcp_chrome_devtoo_select_page` 选中 115 标签页。

### Step 4: 验证脚本已注入

用 `mcp_chrome_devtoo_evaluate_script` 执行：

```js
() => {
  const styles = Array.from(document.querySelectorAll('style')).map(s => s.textContent?.slice(0, 80)).filter(Boolean);
  const yinxingStyles = styles.filter(s => s?.includes('yinxing') || s?.includes('银杏'));
  return { yinxingStyleCount: yinxingStyles.length, totalStyleCount: styles.length };
}
```

- `yinxingStyleCount > 0` → 脚本已注入成功
- 如果为 0，提示用户刷新页面或检查 TM 中脚本是否启用

### Step 5: 验证控制台日志可达

用 `mcp_chrome_devtoo_list_console_messages` 查看日志。

**确认能看到 `[Yinxing:boot]` 日志后再提问用户**，避免用户说"已经看到了"而 AI 说"看不到"。

### Step 6: 通知用户

所有检查通过后，告知用户调试环境就绪，可以开始操作。

> ⚠️ **重要**：检查过程中如果发现任何异常（页面打不开、连接失败、脚本未注入），**先尝试自行排查**（如刷新页面、重新选中页面），不要直接告诉用户"看不到"。

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

4. **浏览器重启/重连会导致历史日志丢失**
   - 如果浏览器重启过（`Note: the browser was restarted or reconnected since the last call`），**之前的控制台日志会被清空**
   - 此时 `list_console_messages`（即使是 `includePreservedMessages: true`）也读不到重启前的日志
   - **必须在页面刷新后重新等待脚本注入，再读取日志**

5. **脚本注入的可见证据**
   - `document.querySelectorAll('script')` 查不到 `@require` 脚本（TM 沙箱不是标准 `<script>` 注入）
   - `typeof GM` / `typeof unsafeWindow` 在沙箱里可能为 `false`，不能作为"脚本未注入"的依据
   - **可靠的判断方式**：检查银杏注入的 `<style>` 标签（含 `#yinxingDropdownContent` 等），或看 `[Yinxing:boot]` 控制台日志

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