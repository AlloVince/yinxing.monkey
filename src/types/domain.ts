// ---------------------------------------------------------------------------
// Domain types — 115 cloud file / folder models
// ---------------------------------------------------------------------------

export interface FileInterface {
  id: string;
  name?: string;
  isDir?: boolean;
  size?: number; // Byte
  fileType?: string;
  sha?: string;
  createdAt?: number;
  updatedAt?: number;
  thumbnail?: string;
  pickcode?: string;
  stared?: boolean;
  raw?: Record<string, unknown>;
}

export interface FolderInterface extends FileInterface {
  totalSize?: number;
  totalFiles?: number;
}

/** Raw 115 API response shape for a single file entry. */
export interface YywFileInterface {
  fid: string;
  cid: string;
  n: string;
  s?: number;
  sha?: string;
  pc?: string;
  te?: number;
  ico?: string;
  u?: string;
  m?: number;
  [key: string]: unknown;
}

export interface PaginationData {
  count: number;
  offset: number;
  page_size: number;
  order: string;
}

// ---------------------------------------------------------------------------
// Domain types — metadata API (movie)
// ---------------------------------------------------------------------------

export interface MovieCast {
  name: string;
}

export interface MovieMaker {
  id: string;
  name: string;
}

export interface Movie {
  id: string;
  title: string;
  banngo: string;
  subBanngo: string;
  alt: string;
  pubdate: string;
  year: string;
  durations: string;
  summary: string;
  tags: string;
  makerId: string;
  seriesId: string;
  images: string[];
  previews: string[];
  casts: MovieCast[];
  maker: MovieMaker;
}

// ---------------------------------------------------------------------------
// Domain types — request / response helpers
// ---------------------------------------------------------------------------

export interface RequestPayload {
  url: string;
  method?: 'GET' | 'POST';
  query?: Record<string, unknown>;
  data?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}