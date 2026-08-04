import MonkeyKernel, { $, Noty } from '../core/monkey_kernel';
import { YYWCloud } from '../services/yyw_cloud';
import YinXing from '../services/yinxing';

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
    .view-width { width: 100%; }
    .list-thumb li { width: 140px; height: 294px;}
    .list-thumb li .file-thumb { width: 140px; height:180px; }
    .list-thumb li .file-name { width: 140ox; height: 57px; font-size:11px; }
    `);
  }

  static async autoThumbnails($movieItems: JQuery): Promise<void> {
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
