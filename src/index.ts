import MonkeyKernel, { $, Noty } from './monkey_kernel';
import { YYWCloud } from './yyw_cloud';
import YinXing from './yinxing';

class UI {
  static storeAndGetYYWID() {
    const yywId: string = MonkeyKernel.getValue('yywId');
    if (yywId) {
      return yywId;
    }
    return new Noty({
      text: '银杏:请输入115用户ID并保存 <br/> <input id="yinxing_115_uid" type="text">',
      closeWith: ['button'],
      buttons: [
        Noty.button('保存', 'btn btn-success', () => {
          MonkeyKernel.setValue('yywId', $('#yinxing_115_uid').val());
          MonkeyKernel.notify(`115用户ID已保存为${MonkeyKernel.getValue('yywId')}, 请刷新界面`);
        }),
        Noty.button('登录115', 'btn btn-info', () => {
          MonkeyKernel.openTab('https://115.com');
        }),
      ],
    }).show();
  }

  /**
   * @returns {Promise<void>}
   */
  static async handleCurrentPage(entryParentId: string = '1153737365202791679') {
    const yx = new YinXing({
      videoTargetId: '1214716263562079924',
      isoTargetId: '1227621927028387453',
    });
    const parentId = $('#js_data_list li[rel=item]:nth-child(1)').attr('p_id');
    await yx.handleAll(entryParentId || parentId);
  }

  static initYinxingMennu() {
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
          UI.handleCurrentPage();
        }
      });
    return true;
  }

  static addLinkToClipboard(btnElement: HTMLElement): void {
    const { link, text } = UI.parseButton(btnElement);
    MonkeyKernel.setClipboard(link);
    MonkeyKernel.notify(`${text}的Magnet已加入剪切板`);
  }

  /**
   * @param btnElement
   * @param {YYWCloud} cloud
   * @returns {Promise<*>}
   */
  static async downloadByCloud(btnElement: HTMLElement, cloud: YYWCloud) {
    const { link, text } = UI.parseButton(btnElement);
    try {
      await cloud.download(link);
    } catch (e) {
      return MonkeyKernel.notify(`失败:${e.message} FOR ${text} MagnetSending`, 'error');
    }
    return MonkeyKernel.notify(`成功: ${text} MagnetSent`, 'success');
  }

  /**
   * @param btnElement
   * @returns {{$element: jQuery|HTMLElement, link: *, text: string}}
   */
  static parseButton(btnElement: HTMLElement): { $element: JQuery, link: string, text: string } {
    const $el = $(btnElement);
    return {
      $element: $el,
      link: $el.attr('href'),
      text: $el.text().trim(),
    };
  }

  static changeLayouts() {
    MonkeyKernel.addStyle(`
    .view-width { width: 100%; }
    .list-thumb li { width: 140px; height: 290px;}
    .list-thumb li .file-thumb { width: 140px; height:180px; }
    .list-thumb li .file-name { width: 140ox; height: 47px; font-size:11px; }
    `);
  }

  static async autoThumbnails($movieItems: JQuery) {
    const banngos = $movieItems
      .toArray()
      .map((item, index) => ({
        index,
        title: item.getAttribute('title'),
        banngo: YinXing.parseBanngo(item.getAttribute('title')),
      }));
    const { results: movies } = await MonkeyKernel.requestJSON({
      url: 'https://yinxing.av2.us/v1/search',
      query: { q: banngos.map(b => b.banngo || '').join(',') },
    });
    $movieItems.each((index: number, movieItem: HTMLElement) => {
      if (!movies[index]) {
        return;
      }
      const movie = movies[index];
      $(movieItem).find('i.file-thumb')
        .css(
          'cssText',
          `background-image: url( "${movie.images.find(i => i.endsWith('ps.jpg'))}" ) !important`,
        );
      $(movieItem).find('a.name').text(`[${movie.banngo}]${movie.title}`);
      return;
    });
  }
}

const boot = async () => {
  const yywId = UI.storeAndGetYYWID();
  const cloud = new YYWCloud({ uid: yywId });

  $('body').on('click', 'a[href^="magnet"],a[href^="ed2k"]', async (e) => {
    UI.addLinkToClipboard(e.currentTarget);
    await UI.downloadByCloud(e.currentTarget, cloud);
    return true;
  });

  // 会在115所有页面运行
  UI.changeLayouts();
  MonkeyKernel.arrive('#js_file_container ul.list-thumb', async (element) => {
    console.info(
      '[Yinxing:Boot]FileInterface list arrived by DOM(#js_file_container ul.list-thumb) loaded');
    UI.initYinxingMennu();
    await UI.autoThumbnails($(element).find('li[rel="item"]'));
  });

  // 仅在115主页面运行
  // if ($('div.ceiling-container').length > 0) {
  // }

  return true;
};

// Run script at document-start
// https://greasyfork.org/en/forum/discussion/20558
$(document).ready(() => {
  (async () => {
    await boot();
  })();
});
