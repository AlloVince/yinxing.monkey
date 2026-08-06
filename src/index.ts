import { $ } from './core/monkey_kernel';
import { YYWCloud } from './services/yyw_cloud';
import UI from './ui/ui';

async function boot(): Promise<void> {
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
  alert(1);
  void boot();
});