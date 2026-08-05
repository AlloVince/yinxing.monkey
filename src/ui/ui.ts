import MonkeyKernel, { $, Noty } from '../core/monkey_kernel';
import { YYWCloud } from '../services/yyw_cloud';
import YinXing, { METADATA_API_ENABLED } from '../services/yinxing';
import { config } from '../config';

/** 判断当前页面是否为 115 网盘 */
function is115Domain(): boolean {
  return window.location.hostname.includes('115.com');
}

/**
 * 检测面包屑导航中是否存在「根目录 / 云下载」路径。
 * 即 button[title="根目录"] 的父元素的下一个兄弟元素中包含 button[title="云下载"]。
 * 只有在这个页面结构下，图片替换才生效。
 */
function isCloudDownloadPage(): boolean {
  const rootBtn = document.querySelector<HTMLButtonElement>('button[title="根目录"]');
  if (!rootBtn) return false;
  const parent = rootBtn.parentElement;
  if (!parent || !parent.nextElementSibling) return false;
  const cloudBtn = parent.nextElementSibling.querySelector<HTMLButtonElement>('button[title="云下载"]');
  return !!cloudBtn;
}

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

  static async handleCurrentPage(entryParentId: string = config.entryParentId): Promise<void> {
    const yx = new YinXing({
      videoTargetId: config.videoTargetId,
      isoTargetId: config.isoTargetId,
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

  /** Layout A: 标准文件列表页（/storage/allfiles） */
  static changeLayoutsV1(): void {
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

  /** Layout B: 星标文件页（/storage/starredfiles），图片外多一层 div.w-16.h-16 */
  static changeLayoutsV2(): void {
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

        /* 图片外层容器宽度跟随 item */
        .file-grid-item .flex.justify-center > .relative[style] {
          width: 100% !important;
          height: auto !important;
        }

        /* 额外图片包裹层（w-16 h-16）解除固定尺寸 */
        .file-grid-item .flex.justify-center .w-16.h-16.relative {
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

  /** 自动检测当前页面布局并应用对应样式 */
  static changeLayouts(): void {
    // 注入两套 CSS，让浏览器根据实际匹配的选择器生效
    // V1: 标准文件列表页，图片直接挂在 .relative[style] 下
    // V2: 星标文件页，图片外多一层 div.w-16.h-16.relative
    // 两套规则无冲突，同时注入即可兼容两种页面
    UI.changeLayoutsV1();
    UI.changeLayoutsV2();
  }

  /** 将单个 file-grid-item 的标题文本替换为 title 属性内容 */
  static replaceSingleTitle(item: Element): void {
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
  }

  /** 将每个 file-grid-item 的标题文本替换为 title 属性内容 */
  static replaceTitleWithAttr(): void {
    document.querySelectorAll('.file-grid-item').forEach((item) => {
      UI.replaceSingleTitle(item);
    });
  }

  /** 根据 banngo 替换单个 file-grid-item 的缩略图为 DMM 图片 */
  static replaceSingleThumbnail(item: Element): void {
    const titleSpan = item.querySelector<HTMLSpanElement>(
      '.flex.items-center.justify-center.text-xs span.inline-block'
    );
    if (!titleSpan) return;
    const title = titleSpan.textContent?.trim();
    if (!title) return;

    const banngo = YinXing.parseBanngo(title);
    if (!banngo) return;

    // banngo 格式: "abc-123" 或 "abc123"
    const match = /([a-z]{2,6})-?(\d{2,5})/.exec(banngo);
    if (!match) return;
    const letters = match[1];
    const number = match[2].padStart(5, '0');

    // 特殊前缀映射：某些番号需要额外前缀
    // 例如 vdd-203 → 24vdd00203
    const prefixMap: Record<string, string> = {
      vdd: '24',
    };
    const prefix = prefixMap[letters] ?? '';
    const imgUrl = `https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/${prefix}${letters}${number}/${prefix}${letters}${number}ps.jpg?w=200&h=272&f=webp`;

    const img = item.querySelector('img');
    if (!img) return;
    img.src = imgUrl;
  }

  /** 根据 banngo 替换所有 file-grid-item 的缩略图为 DMM 图片 */
  static replaceThumbnails(): void {
    document.querySelectorAll('.file-grid-item').forEach((item) => {
      UI.replaceSingleThumbnail(item);
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
      url: config.metadataApiUrl,
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

  /** 初始化所有 UI 修改（布局、标题、缩略图、菜单等），仅在 115.com 生效 */
  static initUI(): void {
    if (!is115Domain()) {
      console.debug('[Yinxing:UI]非 115.com 页面，跳过 UI 修改');
      return;
    }

    // 布局调整（所有 115 页面）
    UI.changeLayouts();

    // 标题替换（所有 115 页面）
    UI.replaceTitleWithAttr();

    // 图片替换仅在「根目录 / 云下载」面包屑页面生效
    if (isCloudDownloadPage()) {
      UI.replaceThumbnails();
    }

    // 监听动态插入的 file-grid-item：替换标题 + 缩略图
    MonkeyKernel.arrive('.file-grid-item', (item: Element) => {
      UI.replaceSingleTitle(item);

      // 缩略图替换仅在云下载页面生效（每次动态重检）
      if (!isCloudDownloadPage()) return;
      UI.replaceSingleThumbnail(item);
    });

    // 监听文件列表缩略图容器出现：注入菜单 + 元数据缩略图
    MonkeyKernel.arrive('#js_file_container ul.list-thumb', async (element) => {
      console.info('[Yinxing:UI]File list arrived by DOM(#js_file_container ul.list-thumb) loaded');
      UI.initYinxingMennu();
      if (!isCloudDownloadPage()) return;
      await UI.autoThumbnails($(element).find('li[rel="item"]'));
    });
  }
}
