import { $ } from './core/monkey_kernel';
import { YYWCloud } from './services/yyw_cloud';
import UI from './ui/ui';

/**
 * 从 Tampermonkey 的 GM_info 中提取 @require 版本号。
 * TM 5.5 的 GM_info.script 没有 require 字段，需解析 script.header（原始头部字符串）中的 @require 行。
 * 例如 // @require      http://localhost:8080/index.js?v=62 → "62"
 */
function getRequireVersion(): string {
  try {
    const info = (typeof GM_info !== 'undefined' ? GM_info : undefined) as any;
    if (!info?.script) return '?';
    const header: string = info.script.header || '';
    const lines = header.split('\n');
    const requireLine = lines.find(
      (l) => l.includes('@require') && (l.includes('localhost:8080') || l.includes('127.0.0.1:8080')),
    );
    if (requireLine) {
      const match = requireLine.match(/[?&]v=(\d+)/);
      if (match) return match[1];
    }
  } catch {
    // GM_info not available in some contexts
  }
  return '?';
}

async function boot(): Promise<void> {
  console.debug(`[Yinxing:boot] 脚本注入成功 v${getRequireVersion()}`);
  const yywId = UI.storeAndGetYYWID();
  const cloud = new YYWCloud({ uid: yywId as unknown as number });

  // Click handler for magnet / ed2k links
  $('body').on('click', 'a[href^="magnet"],a[href^="ed2k"]', async (e) => {
    UI.addLinkToClipboard(e.currentTarget as HTMLElement);
    await UI.downloadByCloud(e.currentTarget as HTMLElement, cloud);
    return true;
  });

  // Initialize all UI modifications (layout, titles, thumbnails, menu, etc.)
  UI.initUI();
}

// Start as early as possible (document-start in userscript header)
// https://greasyfork.org/en/forum/discussion/20558
$(document).ready(() => {
  void boot();
});