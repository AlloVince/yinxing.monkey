/**
 * Application configuration, sourced from .env via webpack DefinePlugin.
 *
 * All values are injected at build time by webpack's DefinePlugin.
 * In production builds, these are replaced with literal strings.
 * In development, they fall back to defaults.
 */

declare const process: {
  env: {
    NODE_ENV: string;
    DEV_SERVER_URL: string;
    ENTRY_PARENT_ID: string;
    VIDEO_TARGET_ID: string;
    ISO_TARGET_ID: string;
    METADATA_API_URL: string;
    MOVIE_API_URL: string;
  };
};

export const config = {
  /** Current environment. */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** Webpack dev server URL (used for @require during development). */
  devServerUrl: process.env.DEV_SERVER_URL || 'http://localhost:8080',

  /** 115 云盘目录 ID — 入口目录（全部文件根目录）. */
  entryParentId: process.env.ENTRY_PARENT_ID || '1153737365202791679',

  /** 115 云盘目录 ID — 视频文件目标目录. */
  videoTargetId: process.env.VIDEO_TARGET_ID || '1214716263562079924',

  /** 115 云盘目录 ID — ISO 文件目标目录. */
  isoTargetId: process.env.ISO_TARGET_ID || '1227621927028387453',

  /** 番号查询 API 地址. */
  metadataApiUrl: process.env.METADATA_API_URL || 'https://yinxing.av2.us/v1/search',

  /** 影片匹配 API 地址. */
  movieApiUrl: process.env.MOVIE_API_URL || 'http://yinxing.com/v1/movies',
} as const;
