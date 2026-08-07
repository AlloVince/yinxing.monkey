import MonkeyKernel from '../core/monkey_kernel';
import type { FileInterface, PaginationData, RequestPayload, YywFileInterface } from '../types/domain';

// ---------------------------------------------------------------------------
// File model
// ---------------------------------------------------------------------------

export class File implements FileInterface {
  id: string;
  name?: string;
  isDir?: boolean = false;
  size?: number;
  fileType?: string;
  sha?: string;
  createdAt?: number;
  updatedAt?: number;
  thumbnail?: string;
  pickcode?: string;
  stared?: boolean;
  raw?: Record<string, unknown>;

  constructor(props: FileInterface) {
    this.id = props.id;
    this.name = props.name;
    this.isDir = props.isDir;
    this.size = props.size;
    this.fileType = props.fileType;
    this.sha = props.sha;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.thumbnail = props.thumbnail;
    this.pickcode = props.pickcode;
    this.stared = props.stared;
    this.raw = props.raw;
  }

  static humanFileSizeToByte(fileSize: string): number {
    const handlers: Record<string, (n: number) => number> = {
      B: (i) => i,
      KB: (i) => i * 1024,
      MB: (i) => i * 1024 ** 2,
      GB: (i) => i * 1024 ** 3,
      TB: (i) => i * 1024 ** 4,
      PB: (i) => i * 1024 ** 5,
    };
    const [, size, unit] = fileSize.toUpperCase().match(/([\d.]+)(\w+)/) ?? [];
    return Math.floor(handlers[unit]?.(Number.parseFloat(size)) ?? 0);
  }

  static fromId(id: string): File {
    return new File({ id });
  }

  static factory(raw: YywFileInterface): File {
    const { fid, cid, n, s, sha, pc, te, ico, u, m, ...others } = raw;
    const isDir = !(Number.parseInt(fid, 10) > 0);
    return new File({
      isDir,
      sha,
      id: fid || cid,
      name: n,
      size: s,
      pickcode: pc,
      createdAt: te,
      fileType: ico,
      thumbnail: u,
      stared: (m ?? 0) > 0,
      raw: others as Record<string, unknown>,
    });
  }

  static factoryFromArray(files: YywFileInterface[] = []): File[] {
    return files.map((f) => File.factory(f));
  }

  toString(): string {
    return this.name ?? '';
  }
}

// ---------------------------------------------------------------------------
// Pagination model
// ---------------------------------------------------------------------------

export class Pagination {
  total: number;
  offset: number;
  limit: number;
  order: string;

  constructor(data: { total: number; offset: number; limit: number; order: string }) {
    this.total = data.total;
    this.offset = data.offset;
    this.limit = data.limit;
    this.order = data.order;
  }

  static factory(data: PaginationData): Pagination {
    return new Pagination({
      offset: data.offset,
      order: data.order,
      total: data.count,
      limit: data.page_size,
    });
  }
}

// ---------------------------------------------------------------------------
// 115 Cloud API client
// ---------------------------------------------------------------------------

export class YYWCloud {
  readonly uid: number;

  constructor({ uid }: { uid: number }) {
    this.uid = uid;
  }

  private static async requestAPI(request: RequestPayload): Promise<unknown> {
    const headers: Record<string, string> = { ...(request.headers ?? {}) };
    if (request.method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    let res: unknown;
    try {
      res = await MonkeyKernel.requestJSON({ ...request, headers });
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('Login required. ');
      }
      throw e;
    }

    const obj = res as { errno?: number; errcode?: number; error?: string; error_msg?: string } | null;
    if (!obj || (obj.errno ?? 0) > 0 || (obj.errcode ?? 0) > 0) {
      throw new Error(`Error_${obj?.errno ?? obj?.errcode}:${obj?.error ?? obj?.error_msg}`);
    }
    return res;
  }

  static async mkDir(dirName: string, parentId: string = '0'): Promise<File> {
    const res = (await YYWCloud.requestAPI({
      method: 'POST',
      url: 'https://web.api.115.com/files/add',
      body: { pid: parentId, cname: dirName },
    })) as { cid: string; cname: string };
    return new File({ isDir: true, id: res.cid, name: res.cname });
  }

  static async remove(files: File[] = [], _parentId: number = 0): Promise<boolean> {
    await YYWCloud.requestAPI({
      method: 'POST',
      url: 'https://web.api.115.com/rb/delete',
      body: { pid: _parentId, fid: files.map((f) => f.id) },
    });
    return true;
  }

  static async move(files: File[] = [], parentId: string): Promise<boolean> {
    await YYWCloud.requestAPI({
      method: 'POST',
      url: 'https://web.api.115.com/files/move',
      body: { pid: parentId, fid: files.map((f) => f.id) },
    });
    return true;
  }

  static async rename(file: File, name: string): Promise<boolean> {
    await YYWCloud.requestAPI({
      method: 'POST',
      url: 'https://web.api.115.com/files/edit',
      body: { fid: file.id, file_name: name },
    });
    return true;
  }

  static async getFileList(options: {
    parentId: string;
    offset?: number;
    limit?: number;
  }): Promise<{ pagination: Pagination; files: File[] }> {
    const { parentId, offset = 0, limit = 40 } = options;
    const res = (await YYWCloud.requestAPI({
      method: 'GET',
      url: 'https://web.api.115.com/files',
      query: {
        offset,
        limit,
        aid: 1,
        cid: parentId,
        o: 'user_ptime',
        asc: 0,
        show_dir: 1,
        snap: 0,
        natsort: 1,
        format: 'json',
      },
    })) as { data: YywFileInterface[]; count: number; offset: number; page_size: number; order: string };
    return {
      pagination: Pagination.factory(res),
      files: File.factoryFromArray(res.data),
    };
  }

  static async search(options: {
    q: string;
    parentId?: number | string;
    offset?: number;
    limit?: number;
  }): Promise<{ pagination: Pagination; files: File[] }> {
    const { q, parentId = 0, offset = 0, limit = 40 } = options;
    const res = (await YYWCloud.requestAPI({
      method: 'GET',
      url: 'https://web.api.115.com/files/search',
      query: {
        offset,
        limit,
        aid: 1,
        search_value: q,
        cid: parentId,
        asc: 0,
        show_dir: 1,
        snap: 0,
        natsort: 1,
        format: 'json',
      },
    })) as { data: YywFileInterface[]; count: number; offset: number; page_size: number; order: string };
    return {
      pagination: Pagination.factory(res),
      files: File.factoryFromArray(res.data),
    };
  }

  static async getFolderDetail(file: File): Promise<{ id: string; count: number; size: number }> {
    const res = (await YYWCloud.requestAPI({
      method: 'GET',
      url: 'https://web.api.115.com/category/get',
      query: { aid: 1, cid: file.id },
    })) as { file_category: string; count: number; size: string };
    if (Number.parseInt(res.file_category, 10) > 0) {
      throw new Error('Not a folder');
    }
    return {
      id: file.id,
      count: res.count,
      size: File.humanFileSizeToByte(res.size),
    };
  }

  private async getSign(): Promise<{ sign: string }> {
    return (await YYWCloud.requestAPI({
      method: 'GET',
      url: 'https://115.com/',
      query: { ct: 'offline', ac: 'space', _: Date.now() },
    })) as { sign: string };
  }

  async download(magnet: string): Promise<{
    info_hash: string;
    name: string;
    state: boolean;
    errno: number;
    errtype: string;
    url: string;
    errcode: number;
  }> {
    const { sign } = await this.getSign();
    return (await YYWCloud.requestAPI({
      method: 'POST',
      url: 'https://115.com/web/lixian/?ct=lixian&ac=add_task_url',
      body: { sign, url: magnet, uid: this.uid, time: Date.now() },
    })) as {
      info_hash: string;
      name: string;
      state: boolean;
      errno: number;
      errtype: string;
      url: string;
      errcode: number;
    };
  }
}