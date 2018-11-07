import MonkeyKernel from './monkey_kernel';

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
  raw?: any;
}

export interface FolderInterface extends FileInterface {
  totalSize?: number;
  totalFiles?: number;
}

interface YywFileInterface {
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
}

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
  raw?: any;

  constructor({
                id,
                name,
                isDir,
                size,
                fileType,
                sha,
                createdAt,
                updatedAt,
                thumbnail,
                pickcode,
                stared,
                raw,
              }: FileInterface) {
    this.id = id;
    this.name = name;
    this.isDir = isDir;
    this.size = size;
    this.fileType = fileType;
    this.sha = sha;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.thumbnail = thumbnail;
    this.pickcode = pickcode;
    this.stared = stared;
    this.raw = raw;
  }

  /**
   * @param {string} fileSize
   * @returns {number}
   */
  static humanFileSizeToByte(fileSize: string): number {
    const handlers = {
      B: (i: number) => i,
      KB: (i: number) => i * 1024,
      MB: (i: number) => i * 1024 ** 2,
      GB: (i: number) => i * 1024 ** 3,
      TB: (i: number) => i * 1024 ** 4,
      PB: (i: number) => i * 1024 ** 5,
    };
    const [, size, unit] = fileSize.toUpperCase().match(/([\d\.]+)(\w+)/);
    return Math.floor(handlers[unit](Number.parseFloat(size)));
  }

  /**
   * @param {number} id
   * @returns {File}
   */
  static fromId(id: string): File {
    return new File({ id });
  }

  /**
   * @param fid
   * @param cid
   * @param n
   * @param s
   * @param sha
   * @param pc
   * @param te
   * @param ico
   * @param u
   * @param m
   * @param others
   * @returns {FileInterface}
   */
  static factory(
    {
      fid,
      cid,
      n,
      s,
      sha,
      pc,
      te,
      ico,
      u,
      m,
      ...others // tslint:disable-line
    }: YywFileInterface): FileInterface {
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
      stared: m > 0,
      raw: others,
    });
  }

  /**
   * @param {object[]} files
   * @returns {File[]}
   */
  static factoryFromArray(files: YywFileInterface[] = []): File[] {
    return files.map(file => File.factory(file));
  }

  /**
   * @returns {string}
   */
  toString(): string {
    return this.name;
  }
}

export class Pagination {
  total: number;
  offset: number;
  limit: number;
  order: string;

  constructor({
                total,
                offset,
                limit,
                order,
              }) {
    this.total = total;
    this.offset = offset;
    this.limit = limit;
    this.order = order;
  }

  /**
   * @param count
   * @param offset
   * @param page_size
   * @param order
   * @returns {Pagination}
   */
  static factory({
                   count,
                   offset,
                   page_size: pageSize,
                   order,
                 }) {
    return new Pagination({
      offset,
      order,
      total: count,
      limit: pageSize,
    });
  }
}

export class YYWCloud {
  uid: number;

  constructor({ uid }) {
    this.uid = uid;
  }

  /**
   * @param request
   * @returns {Promise<any>}
   */
  static async requestAPI(request) {
    if (request.method === 'POST') {
      request.headers = request.headers || {};
      Object.assign(request.headers, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      });
    }

    let res = null;
    try {
      res = await MonkeyKernel.requestJSON(request);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('Login required. ');
      }
      throw e;
    }
    if (!res || res.errno > 0 || res.errcode > 0) {
      throw new Error(`Error_${res.errno || res.errcode}:${res.error || res.error_msg}`);
    }
    return res;
  }

  /**
   * @param dirName
   * @param {string} parentId
   * @returns {Promise<File>}
   */
  static async mkDir(dirName, parentId: string = '0') {
    const res = await YYWCloud.requestAPI({
      method: 'POST',
      url: 'http://web.api.115.com/files/add',
      body: {
        pid: parentId,
        cname: dirName,
      },
    });
    // {"state":true,"error":"","errno":"","aid":1,"cid":"1214536459596459422",
    // "cname":"test","file_id":"1214536459596459422","file_name":"test"}
    return new File({
      isDir: true,
      id: res.cid,
      name: res.cname,
    });
  }

  /**
   * @param {File[]} files
   * @param parentId
   * @returns {Promise<boolean>}
   */
  static async remove(files = [], parentId = 0) {
    await YYWCloud.requestAPI({
      method: 'POST',
      url: 'http://web.api.115.com/rb/delete',
      body: {
        pid: parentId,
        fid: files.map(file => file.id),
      },
    });
    return true;
  }

  /**
   * @param {File[]} files
   * @param {Number} parentId
   * @returns {Promise<Boolean>}
   */
  static async move(files = [], parentId) {
    await YYWCloud.requestAPI({
      method: 'POST',
      url: 'http://web.api.115.com/files/move',
      body: {
        pid: parentId,
        fid: files.map(file => file.id),
      },
    });
    return true;
  }

  /**
   * @param {File} file
   * @param name
   * @returns {Promise<Boolean>}
   */
  static async rename(file, name) {
    await YYWCloud.requestAPI({
      method: 'POST',
      url: 'http://web.api.115.com/files/edit',
      body: {
        fid: file.id,
        file_name: name,
      },
    });
    return true;
  }

  /**
   * @param parentId
   * @param offset
   * @param limit
   * @returns Promise<{pagination: Pagination, files: File[]}>
   */
  static async getFileList({
                             parentId,
                             offset = 0,
                             limit = 40,
                           }: { parentId: string, offset?: number, limit?: number }) {
    const res = await YYWCloud.requestAPI({
      method: 'GET',
      url: 'http://web.api.115.com/files',
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
    });
    return {
      pagination: Pagination.factory(res),
      files: File.factoryFromArray(res.data),
    };
  }

  /**
   * @param {string} q
   * @param {number} parentId
   * @param {number} offset
   * @param {number} limit
   * @returns {Promise<{pagination: Pagination; files: File[]}>}
   */
  static async search(
    {
      q,
      parentId = 0,
      offset = 0,
      limit = 40,
    }: { q: string, parentId?: number | string, offset?: number, limit?: number },
  ): Promise<{ pagination: Pagination, files: File[] }> {
    const res = await YYWCloud.requestAPI({
      method: 'GET',
      url: 'http://web.api.115.com/files/search',
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
    });
    return {
      pagination: Pagination.factory(res),
      files: File.factoryFromArray(res.data),
    };
  }

  /**
   *
   * @param {File} file
   * @returns {Promise<{pagination: Pagination, files: File[]}>}
   */
  static async getFolderDetail(file) {
    const res = await YYWCloud.requestAPI({
      method: 'GET',
      url: 'http://web.api.115.com/category/get',
      query: {
        aid: 1,
        cid: file.id,
      },
    });
    if (Number.parseInt(res.file_category, 10) > 0) {
      throw new Error('Not a folder');
    }
    return {
      id: file.id,
      count: res.count,
      size: File.humanFileSizeToByte(res.size),
    };
  }

  //
  //
  // static async setThumbnail(file) {
  //
  // }
  //
  // static async uploadFromUrl(url) {
  //
  // }
  //
  // static async exportToAria2(file) {
  //
  // }
  //
  // static async getStars(offset) {
  //
  // }
  //
  // static async uploadTorrent() {
  //
  // }

  /**
   * @returns {Promise<{{state: boolean, data: number, size: string,
   * url: string, bt_url: string, limit: number, sign: string, time: number}}>}
   */
  private async getSign(): Promise<{ sign: string }> {
    return YYWCloud.requestAPI({
      method: 'GET',
      url: 'http://115.com/',
      query: {
        ct: 'offline',
        ac: 'space',
        _: Date.now(),
      },
    });
  }

  /**
   * @param {string} magnet
   * @returns Promise<{info_hash: string; name: string;
   *  state: boolean; errno: number; errtype: string; url: string; errcode: number}>
   */
  async download(magnet: string): Promise<{
    info_hash: string, name: string, state: boolean,
    errno: number, errtype: string, url: string, errcode: number,
  }> {
    const { sign } = await this.getSign();
    const res = await YYWCloud.requestAPI({
      method: 'POST',
      url: 'http://115.com/web/lixian/?ct=lixian&ac=add_task_url',
      body: {
        sign,
        url: magnet,
        uid: this.uid,
        time: Date.now(),
      },
    });
    return res;
  }
}
