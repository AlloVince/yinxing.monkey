import MonkeyKernel, { $, Noty } from '../core/monkey_kernel';
import { YYWCloud } from '../services/yyw_cloud';
import YinXing, { METADATA_API_ENABLED } from '../services/yinxing';

export default class UI {
  static storeAndGetYYWID(): string | void {
    const yywId: string = MonkeyKernel.getValue('yywId') as string;
    if (yywId) {
      return yywId;
    }
    return new Noty({
      text: '银杏:请输入115用户ID并保存 <br/> <input id="yinxing_115_uid" type="text">',
      closeWith: ['button'],
      buttons: [
        Noty.button('保存', 'btn btn-success', () => {
          MonkeyKernel.setValue('yywId', $('#yinxing_115_uid').val() as string);
          MonkeyKernel.notify(`115用户ID已保存为${MonkeyKernel.getValue('yywId')}, 请刷新界面`);
        }),
        Noty.button('登录115', 'btn btn-info', () => {
          MonkeyKernel.openTab('https://115.com');
        }),
      ],
    }).show();
  }

  static async handleCurrentPage(entryParentId: string = '1153737365202791679'): Promise<void> {
    const yx = new YinXing({
      videoTargetId: '1214716263562079924',
      isoTargetId: '1227621927028387453',
    });
    const parentId = $('#js_data_list li[rel=item]:nth-child(1)').attr('p_id');
    await yx.handleAll(entryParentId || (parentId as string));
  }

  static initYinxingMennu(): boolean {
    console.debug('[Yinxing:InitMenu]');
    if ($('#yinxingMenu').get().length > 0) {
      return false;
    }
    $(`<select id="yinxingMenu" style="
        float:  right;
        margin: 12px 130px 0 0;" >
        <option value="">银杏</option>
        <option value="changeUid">更换ID</option>
        <option value="handleFiles">自动整理</option>
        <option value="downloads">同步</option>
      </select>
    `)
      .insertBefore('#js_upload_btn')
      .on('change', (e) => {
        const action = $(e.currentTarget).val();
        if (action === 'handleFiles') {
          void UI.handleCurrentPage();
        }
      });
    return true;
  }

  static addLinkToClipboard(btnElement: HTMLElement): void {
    const { link, text } = UI.parseButton(btnElement);
    MonkeyKernel.setClipboard(link);
    MonkeyKernel.notify(`${text}的Magnet已加入剪切板`);
  }

  static async downloadByCloud(btnElement: HTMLElement, cloud: YYWCloud): Promise<void> {
    const { link, text } = UI.parseButton(btnElement);
    try {
      await cloud.download(link);
    } catch (e) {
      MonkeyKernel.notify(`失败:${(e as Error).message} FOR ${text} MagnetSending`, 'error');
      return;
    }
    MonkeyKernel.notify(`成功: ${text} MagnetSent`, 'success');
  }

  static parseButton(btnElement: HTMLElement): { $element: JQuery; link: string; text: string } {
    const $el = $(btnElement);
    return {
      $element: $el,
      link: $el.attr('href') as string,
      text: $el.text().trim(),
    };
  }

  static changeLayouts(): void {
      MonkeyKernel.addStyle(`
        /* Grid 容器：每列 120px，自动换行 */
        :has(> .file-grid-item) {
          grid-template-columns: repeat(auto-fill, 120px) !important;
          gap: 10px !important;
        }

        /* 每个 item 宽度 120px，高度由内容撑开 */
        .file-grid-item {
          width: 120px !important;
          height: auto !important;
        }

        /* 解除内部固定高度的容器，让图片能撑开 */
        .file-grid-item > .group {
          height: auto !important;
          min-height: 0 !important;
        }

        /* 图片居中容器去掉固定 margin */
        .file-grid-item > .group > .flex.justify-center {
          margin: 0 !important;
        }

        /* 图片外层容器宽度跟随 item（100% = 120px），高度由图片撑开 */
        .file-grid-item .flex.justify-center > .relative[style] {
          width: 100% !important;
          height: auto !important;
        }

        /* 图片填满容器宽度，高度固定 170px */
        .file-grid-item img {
          width: 100% !important;
          height: 170px !important;
          display: block !important;
          object-fit: cover !important;
          max-width: 100% !important;
          max-height: none !important;
        }

        /* 标题容器解除 max-width 限制，最小高度占 4 行 */
        .file-grid-item .flex.items-center.justify-center.text-xs {
          max-width: none !important;
          min-height: 72px !important;
        }

        /* 标题文字：最多 5 行，超出省略 */
        .file-grid-item .flex.items-center.justify-center.text-xs span.inline-block {
          white-space: normal !important;
          overflow: hidden !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 5 !important;
          -webkit-box-orient: vertical !important;
          word-break: break-word !important;
        }
    `);
  }

  /** 将每个 file-grid-item 的标题文本替换为 title 属性内容 */
  static replaceTitleWithAttr(): void {
    document.querySelectorAll('.file-grid-item').forEach((item) => {
      const titleSpan = item.querySelector<HTMLSpanElement>(
        '.flex.items-center.justify-center.text-xs span.inline-block'
      );
      if (!titleSpan) return;
      const titleAttr = titleSpan.getAttribute('title');
      if (!titleAttr) return;
      // 替换最内层 span 的文本
      const innerSpan = titleSpan.querySelector('span');
      if (innerSpan) {
        innerSpan.textContent = titleAttr;
      } else {
        titleSpan.textContent = titleAttr;
      }
    });
  }

  static async autoThumbnails($movieItems: JQuery): Promise<void> {
    if (!METADATA_API_ENABLED) {
      console.debug('[Yinxing:autoThumbnails]Skipped — metadata API disabled');
      return;
    }
    const banngos = $movieItems
      .toArray()
      .map((item) => ({
        title: item.getAttribute('title') ?? '',
        banngo: YinXing.parseBanngo(item.getAttribute('title') ?? ''),
      }));
    const res = (await MonkeyKernel.requestJSON({
      url: 'https://yinxing.av2.us/v1/search',
      query: { q: banngos.map((b) => b.banngo || '').join(',') },
    })) as { results: Array<{ images: string[]; banngo: string; title: string }> };
    const movies = res.results;
    $movieItems.each((index: number, movieItem: HTMLElement) => {
      const movie = movies[index];
      if (!movie) {
        return;
      }
      $(movieItem).find('i.file-thumb')
        .css(
          'cssText',
          `background-image: url( "${movie.images.find((i) => i.endsWith('ps.jpg'))}" ) !important`,
        );
      $(movieItem).find('a.name').text(`[${movie.banngo}]${movie.title}`);
    });
  }
}
