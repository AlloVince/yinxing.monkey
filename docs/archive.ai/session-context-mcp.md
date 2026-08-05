# 会话上下文 — MCP Chrome 调试配置 (2026-08-05)

> 供下个 session 快速了解 chrome-devtools MCP 的运作方式。

## 核心结论

1. **调试 Chrome**：使用独立 profile `$HOME/chrome-dev-profile` + 远程调试端口 `9222`
2. **MCP 配置**：`.vscode/mcp.json` 用 `pnpm dlx chrome-devtools-mcp@latest --browser-url http://127.0.0.1:9222` **连接**到已运行的调试 Chrome
3. **关键教训**：不要用 VS Code 内置 `open_browser_page` 检查脚本（会开无扩展 Chrome），必须用 `mcp_chrome_devtoo_*` 工具

## 启动调试 Chrome

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=$HOME/chrome-dev-profile
```

## 验证 MCP 连接

- `mcp_chrome_devtoo_list_pages` → 应看到调试 Chrome 的标签页（115.com）
- 页面检查脚本是否生效：
  ```js
  typeof GM !== 'undefined'  // true 表示 Tampermonkey 已注入
  ```

## 详细文档

见 `.ai/mcp-chrome-debug.md`

## 当前状态

- MCP 已连上（能 `list_pages` 看到 115.com）
- 调试 profile 已装 Tampermonkey 5.5.0
- **待办**：确认访问 115 云盘页面时脚本真正生效（当前打开的可能是 115 首页）