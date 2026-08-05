/**
 * Greasemonkey / Tampermonkey `GM_*` / `GM.*` global declarations.
 *
 * Both the legacy `GM_*` function style and the modern `GM.*` object API are
 * declared as `unknown` so that every call site must narrow / cast the result.
 * `MonkeyKernel` is the only module allowed to interact with these globals.
 */

declare const GM: unknown;
declare const GM_openInTab: unknown;
declare const GM_setValue: unknown;
declare const GM_getValue: unknown;
declare const GM_deleteValue: unknown;
declare const GM_addStyle: unknown;
declare const GM_xmlhttpRequest: unknown;
declare const GM_setClipboard: unknown;

/** Tampermonkey sandbox global — the real page window. */
declare const unsafeWindow: Window;
