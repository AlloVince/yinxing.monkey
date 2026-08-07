import MonkeyKernel, { $ } from '../core/monkey_kernel';
import { YYWCloud } from '../services/yyw_cloud';
import YinXing, { METADATA_API_ENABLED } from '../services/yinxing';
import { config } from '../config';

/** 判断当前页面是否为 115 网盘 */
function is115Domain(): boolean {
  return window.location.hostname.includes('115.com');
}

/**
 * 检测面包屑导航是否匹配用户设置的封面替换文件夹。
 * 读取 GM 存储中的 yinxingCoverFolders（逗号分割的文件夹名），
 * 检查当前面包屑中「根目录」的下一个节点是否匹配其中任意一个。
 * 未设置时默认匹配「云下载」。
 */
function isCoverAllowedPage(): boolean {
  // 星标文件页始终启用封面替换
  if (window.location.pathname.includes('/storage/starredfiles')) {
    return true;
  }

  const savedFolders = MonkeyKernel.getValue('yinxingCoverFolders') as string;
  const folderNames = savedFolders
    ? savedFolders.split(',').map(s => s.trim()).filter(Boolean)
    : ['云下载'];

  const rootBtn = document.querySelector<HTMLButtonElement>('button[title="根目录"]');
  if (!rootBtn) return false;
  const parent = rootBtn.parentElement;
  if (!parent || !parent.nextElementSibling) return false;

  return folderNames.some((name) => {
    const btn = parent.nextElementSibling!.querySelector<HTMLButtonElement>(`button[title="${name}"]`);
    return !!btn;
  });
}

export default class UI {
  /** 获取已保存的 115 用户 ID（不再弹出输入框，由下拉菜单替代） */
  static storeAndGetYYWID(): string | void {
    const yywId = MonkeyKernel.getValue('yywId') as string;
    return yywId || undefined;
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

    // 特殊番号映射：某些番号在 DMM 上的产品 ID 与标准格式不同
    // 例如 vdd-203 → 24vdd00203
    const specialMap: Record<string, string> = {
      'vdd203': '24vdd00203',
    };
    const productId = specialMap[`${letters}${number}`] ?? `${letters}${number}`;
    const imgUrl = `https://awsimgsrc.dmm.co.jp/pics_dig/digital/video/${productId}/${productId}ps.jpg?w=200&h=272&f=webp`;

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

  /** 注入银杏专属下拉菜单到顶部导航栏 */
  static initYinxingDropdown(): void {
    if ($('#yinxingDropdown').length > 0) return;

    MonkeyKernel.addStyle(`
      #yinxingDropdownContent {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 50;
        min-width: 280px;
        padding: 12px;
      }
      #yinxingDropdownContent.show {
        display: block;
      }
      #yinxingDropdownContent label {
        font-size: 13px;
        color: #6b7280;
        display: block;
        margin-bottom: 4px;
      }
      #yinxingDropdownContent .field-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #yinxingDropdownContent .field-row + .field-row {
        margin-top: 8px;
      }
      #yinxingDropdownContent .input-row {
        display: flex;
        gap: 4px;
      }
      #yinxingDropdownContent input {
        flex: 1;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 13px;
        outline: none;
      }
      #yinxingDropdownContent input:focus {
        border-color: #2777F8;
      }
      #yinxingDropdownContent .save-btn {
        background: #2777F8;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 12px;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
      }
      #yinxingDropdownContent .save-btn:hover {
        background: #1a5fc7;
      }
      #yinxingDropdownContent .divider {
        border-bottom: 1px solid #f3f4f6;
        margin: 8px 0;
      }
    `);

    const savedUid = (MonkeyKernel.getValue('yywId') as string) || '';
    const savedFolders = (MonkeyKernel.getValue('yinxingCoverFolders') as string) || '';

    const $dropdown = $(`
      <div id="yinxingDropdown" style="position:relative;display:inline-flex;align-items:center;">
        <button id="yinxingDropdownToggle" class="px-6 font-medium transition-all cursor-pointer flex items-center relative text-[#64707A] hover:text-[#1A2734]" style="font-size:16px;">银杏</button>
        <div id="yinxingDropdownContent">
          <div class="field-row">
            <label>115 ID</label>
            <div class="input-row">
              <input id="yinxingUidInput" type="text" value="${savedUid}" placeholder="输入115用户ID" />
              <button class="save-btn" id="yinxingUidSave">保存</button>
            </div>
          </div>
          <div class="divider"></div>
          <div class="field-row">
            <label>封面仅限</label>
            <div class="input-row">
              <input id="yinxingCoverInput" type="text" value="${savedFolders}" placeholder="文件夹名，逗号分割" />
              <button class="save-btn" id="yinxingCoverSave">保存</button>
            </div>
          </div>
        </div>
      </div>
    `);

    $('div.sticky > div.flex.justify-evenly').append($dropdown);

    // 点击「银杏」切换下拉菜单
    $('#yinxingDropdownToggle').on('click', (e) => {
      e.stopPropagation();
      $('#yinxingDropdownContent').toggleClass('show');
    });

    // 点击外部关闭下拉菜单
    $(document).on('click', (e) => {
      if (!$(e.target).closest('#yinxingDropdown').length) {
        $('#yinxingDropdownContent').removeClass('show');
      }
    });

    // 保存 115 ID
    $('#yinxingUidSave').on('click', () => {
      const val = ($('#yinxingUidInput').val() as string || '').trim();
      if (val) {
        MonkeyKernel.setValue('yywId', val);
        MonkeyKernel.notify(`115用户ID已保存为 ${val}`);
      } else {
        MonkeyKernel.deleteValue('yywId');
        MonkeyKernel.notify('已清除115用户ID');
      }
    });

    // 保存封面仅限文件夹
    $('#yinxingCoverSave').on('click', () => {
      const val = ($('#yinxingCoverInput').val() as string || '').trim();
      if (val) {
        MonkeyKernel.setValue('yinxingCoverFolders', val);
        MonkeyKernel.notify(`封面仅限已保存: ${val}`);
      } else {
        MonkeyKernel.deleteValue('yinxingCoverFolders');
        MonkeyKernel.notify('已清除封面仅限设置');
      }
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

    // 注入银杏下拉菜单（直接调用 + arrive 监听，覆盖首次渲染和后续 React 重渲染）
    // 直接调用：处理首次渲染时导航栏已存在的情况
    UI.initYinxingDropdown();
    // arrive 监听：处理导航栏尚未渲染或 React 重渲染清除手动追加 DOM 的情况
    MonkeyKernel.arrive('div.sticky > div.flex.justify-evenly', () => {
      UI.initYinxingDropdown();
    });

    // 图片替换仅在匹配的面包屑页面生效
    if (isCoverAllowedPage()) {
      UI.replaceThumbnails();
    }

    // 监听动态插入的 file-grid-item：替换标题 + 缩略图
    MonkeyKernel.arrive('.file-grid-item', (item: Element) => {
      UI.replaceSingleTitle(item);

      // 缩略图替换仅在匹配的面包屑页面生效（每次动态重检）
      if (!isCoverAllowedPage()) return;
      UI.replaceSingleThumbnail(item);
    });

    // 监听文件列表缩略图容器出现：注入菜单 + 元数据缩略图
    MonkeyKernel.arrive('#js_file_container ul.list-thumb', async (element) => {
      console.info('[Yinxing:UI]File list arrived by DOM(#js_file_container ul.list-thumb) loaded');
      UI.initYinxingMennu();
      if (!isCoverAllowedPage()) return;
      await UI.autoThumbnails($(element).find('li[rel="item"]'));
    });
  }
}
