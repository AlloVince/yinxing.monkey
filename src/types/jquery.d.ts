import type { JQueryStatic } from 'jquery';

declare global {
  interface JQuery {
    /** `arrive` library — fires when elements matching `selector` appear in the DOM. */
    arrive: (selector: string, handler: (el: HTMLElement) => void) => void;
  }

  var jQuery: JQueryStatic;
}

export {};
