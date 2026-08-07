const fs = require('fs');
const path = require('path');

// 从 package.json 读取版本号（@semantic-release/npm 已在 exec 之前更新它）
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
const version = pkg.version;

/** Load .env file manually (avoid extra dependency). */
function loadEnv() {
  const env = {};
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key) env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
// CDN require URL template, {{version}} replaced with actual version
const cdnRequireUrl = (env.CDN_REQUIRE_URL || 'https://cdn.jsdelivr.net/npm/yinxing.monkey@{{version}}/lib/index.js')
  .replace('{{version}}', version);

fs.writeFileSync(
  'index.js',
  `// ==UserScript==
// @name         银杏
// @namespace    yinxing
// @version      ${version}
// @description  Quick copy & send magnet links
// @author       AlloVince
// @require      ${cdnRequireUrl}
// @grant        GM.xmlHttpRequest
// @grant        GM.addStyle
// @grant        GM.notification
// @grant        GM.setClipboard
// @grant        GM.getResourceUrl
// @grant        GM.deleteValue
// @grant        GM.listValues
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.openInTab
// @grant        GM.download
// @grant        GM.registerMenuCommand
// @grant        GM.unregisterMenuCommand
// @grant        unsafeWindow
// @run-at       document-start
// @include      http*
// ==/UserScript==

// GreasyFork 要求脚本包含可执行代码
void 0;`,
);