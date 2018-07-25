const fs = require('fs');
const [, , version] = process.argv;
fs.writeFileSync('index.js',
  `// ==UserScript==
// @name         银杏
// @namespace    yinxing
// @version      ${version}
// @description  Quick copy & send magnet links
// @author       AlloVince
// @require      https://cdn.jsdelivr.net/npm/yinxing.monkey@${version}/lib/index.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_setClipboard
// @grant        GM_getResourceURL
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM.xmlhttpRequest
// @grant        GM.addStyle
// @grant        GM.notification
// @grant        GM.setClipboard
// @grant        GM.getResourceURL
// @grant        unsafeWindow
// @run-at       document-start
// @include      http*
// ==/UserScript==`);



