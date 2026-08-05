import MonkeyKernel, { $ } from './core/monkey_kernel';
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

  // Runs on every 115 page — adjust layout
  UI.changeLayouts();

  // Replace titles for existing items + watch for dynamically added ones
  UI.replaceTitleWithAttr();
  MonkeyKernel.arrive('.file-grid-item', (item: Element) => {
    const titleSpan = item.querySelector<HTMLSpanElement>(
      '.flex.items-center.justify-center.text-xs span.inline-block'
    );
    if (!titleSpan) return;
    const titleAttr = titleSpan.getAttribute('title');
    if (!titleAttr) return;
    const innerSpan = titleSpan.querySelector('span');
    if (innerSpan) {
      innerSpan.textContent = titleAttr;
    } else {
      titleSpan.textContent = titleAttr;
    }
  });

  // When a file list thumbnail container appears, inject the menu & replace thumbnails
  MonkeyKernel.arrive('#js_file_container ul.list-thumb', async (element) => {
    console.info('[Yinxing:Boot]File list arrived by DOM(#js_file_container ul.list-thumb) loaded');
    UI.initYinxingMennu();
    await UI.autoThumbnails($(element).find('li[rel="item"]'));
  });
}

// Start as early as possible (document-start in userscript header)
// https://greasyfork.org/en/forum/discussion/20558
$(document).ready(() => {
  void boot();
});