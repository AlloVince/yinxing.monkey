import Noty from 'noty';
import jQuery from 'jquery';
import 'arrive';
import 'noty/lib/noty.css';
import 'noty/lib/themes/relax.css';

declare const GM: any;
const $ = jQuery.noConflict(true);

Noty.overrideDefaults({
  // layout: 'bottomRight',
  theme: 'relax',
});

declare global {
  interface JQuery {
    arrive: any;
  }
}

interface Request {
  url: string;
  query?: object;
  data?: object;
  body?: object;
}

export default class MonkeyKernel {

  /**
   * @param {string} url
   * @param {object} options
   */
  static openTab(url: string, options?: object): void {
    return (GM_openInTab || GM.openInTab)(url, options);
  }

  static setValue(key: string, value: string | number | string[]) {
    return (GM_setValue || GM.setValue)(key, value);
  }

  static getValue(key: string, defaultValue?: string | number) {
    return (GM_getValue || GM.getValue)(key, defaultValue);
  }

  /**
   * @param {string} key
   */
  static deleteValue(key: string): void {
    return (GM_deleteValue || GM.deleteValue)(key);
  }

  /**
   * @param {string} style
   */
  static addStyle(style: string): void {
    return (GM_addStyle || GM.addStyle)(style);
  }

  /**
   * @param {Request} request
   * @returns {Promise<any>}
   */
  static requestJSON(request: Request): Promise<any> {
    const { query, body } = request;
    if (query) {
      Object.assign(request, { url: [request.url, $.param(query)].join('?') });
    }
    if (body) {
      Object.assign(request, { data: $.param(body) });
    }

    return new Promise((resolve, reject) => {
      (GM_xmlhttpRequest || GM.xmlHttpRequest)(Object.assign(
        {
          method: 'GET',
        },
        request,
        {
          onerror: (err: Error) => {
            console.debug('[GM:Kernel]Request: %o, Response error: %o', request, err);
            reject(err);
          },
          onload: (response: any) => {
            if (response.status >= 300) {
              return reject(response.responseText);
            }

            try {
              const res = JSON.parse(response.responseText);
              console.debug('[GM:Kernel]Request: %o, Response success: %o', request, res);
              return resolve(res);
            } catch (e) {
              console.debug('[GM:Kernel]Request: %o, Response error: %o', request, response);
              return reject(e);
            }
          },
        }));
    });
  }

  /**
   * @param {string} text
   */
  static setClipboard(text: string): void {
    return (GM_setClipboard || GM.setClipboard)(text);
  }

  /**
   * @param {string} text
   * @param {object} notyOptions
   */
  static notify(text: string, notyOptions: object = {}): void {
    // GM_notification(text);
    new Noty(Object.assign({ text }, notyOptions)).show();
  }

  /**
   * @param selector
   * @param handle
   */
  static arrive(selector: string, handle: (el: HTMLElement) => {}) {
    return $(document).arrive(selector, handle);
  }
}

export { $, jQuery, Noty };
