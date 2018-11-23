import sanitize from 'sanitize-filename';
import MonkeyKernel from './monkey_kernel';
import { YYWCloud, File } from './yyw_cloud';

interface Movie {
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
  casts: [{ name: string }];
  maker: { id: string, name: string };
}

export default class YinXing {
  videoTargetId: string;
  isoTargetId: string;

  constructor({ videoTargetId, isoTargetId }: { videoTargetId: string, isoTargetId: string }) {
    this.videoTargetId = videoTargetId;
    this.isoTargetId = isoTargetId;
  }

  /**
   * @param {string} text
   * @param {string[]} ignorePrefixes
   * @returns {string | null}
   */
  static parseBanngo(
    text: string,
    ignorePrefixes: string[] = ['hjd2048.com', 'fhd-1080p', 'bbs25'],
  ): string | null {
    let filteredText = text.toLowerCase();
    ignorePrefixes.forEach(ignore => filteredText = filteredText.replace(ignore, ''));
    const res = /([a-zA-Z]{2,6})-?(\d{2,5})/ig.exec(filteredText);
    return res ? res[0] : null;
  }

  /**
   * @param {string} banngo
   * @returns {Movie | null}
   */
  static async matchMovie(banngo: string): Promise<Movie | null> {
    const res: { results: Movie[] } = await MonkeyKernel.requestJSON({
      url: 'http://yinxing.com/v1/movies',
      query: { q: banngo },
    });

    if (!res || !res.results || res.results.length < 1) {
      return null;
    }
    return res.results[0];
  }

  /**
   * @param {string} dirName
   * @param {string} targetFolderId
   * @returns {Promise<File>}
   */
  async findOrCreateDir(dirName: string, targetFolderId: string) {
    console.debug('[Yinxing:findOrCreateDir]Start search for %s under %s', dirName, targetFolderId);
    const res = await YYWCloud.search({ q: dirName, parentId: targetFolderId });
    if (res.files.length > 0) {
      for (const file of res.files) {
        if (file.name === dirName) {
          return file;
        }
      }
    }
    return YYWCloud.mkDir(dirName, targetFolderId);
  }

  toNames(movie: Movie) {
    const dirName = movie.maker ? movie.maker.name : 'Unknown';
    const casts = movie.casts.map(c => c.name).join(',');
    const fileName = sanitize(`[${movie.banngo}]${casts} - ${movie.title}`);
    return {
      dirName,
      fileName,
    };
  }

  async handleAll(entryParentId: string) {
    let { pagination } = await this.handlePage(entryParentId);
    let offset = 0;
    while (pagination && offset < pagination.total) {
      offset += 40;
      ({ pagination } = await this.handlePage(entryParentId, offset));
    }
  }

  /**
   * @param {number} parentId
   * @param {number} offset
   * @returns Promise<{pagination: Pagination; files: File[]}>
   */
  async handlePage(parentId: string, offset: number = 0) {
    console.group(`[Yinxing:handlePage]Page ${parentId}, offset ${offset}`);
    const res = await YYWCloud.getFileList({
      parentId,
      offset,
    });
    for (const file of res.files) {
      if (file.isDir) {
        console.debug(
          '[Yinxing:handlePage]Start handle %s isFolder[%s] on page %s',
          file.name,
          file.isDir,
          parentId,
        );
        const folderInfo = await YYWCloud.getFolderDetail(file);
        if (folderInfo.size < File.humanFileSizeToByte('120MB')) {
          console.info('[Yinxing:handlePage]Remove dir %s by empty folder', file.name);
          await YYWCloud.remove([file]);
        } else {
          await this.handlePage(file.id);
        }
      } else {
        try {
          console.group(`[Yinxing:handleFile]${file.name}`);
          await this.handleFile(file);
        } catch (e) {
          console.error('[Yinxing:handlePage]Handle error for file %s', file, e);
        } finally {
          console.groupEnd();
        }
      }
    }
    console.groupEnd();
    return res;
  }

  /**
   * @param file
   * @returns {Promise<*>}
   */
  async handleFile(file: File): Promise<any> {
    console.debug('[Yinxing:handleFie]Start handle file %s', file.name);
    if (file.isDir) {
      return console.debug('[Yinxing:handleFie]Skipped handle dir %s', file.name);
    }

    const banngo = YinXing.parseBanngo(file.name);
    if (!banngo) {
      return console.debug('[Yinxing:handleFie]Not able to handle %s by no banngo', file.name);
    }

    if (!['mp4', 'avi', 'wmv', 'mkv', 'iso', 'rmvb'].includes(file.fileType)) {
      return console.debug(
        '[Yinxing:handleFie]Not able to handle %s by incorrect file type %s',
        file.name,
        file.fileType,
      );
    }

    const movie = await YinXing.matchMovie(banngo);

    if (!movie) {
      console.debug('[Yinxing:handleFie]Not able to handle %s by no matched movie', file.name);
      return false;
    }

    const { dirName, fileName } = this.toNames(movie);
    console.debug(
      '[Yinxing:handleFie]Try to handle file from %s to %s/%s',
      file.name,
      dirName,
      fileName,
    );

    const movieDir = await this.findOrCreateDir(
      dirName, file.fileType === 'iso' ? this.isoTargetId : this.videoTargetId,
    );
    console.debug('[Yinxing:handleFie]-- FindOrCreateDir: %o', movieDir);

    console.debug('[Yinxing:handleFie]-- Move %o to: %o', file, movieDir);
    await YYWCloud.move([file], movieDir.id);

    console.debug('[Yinxing:handleFie]-- Rename file %o to: %o', file, fileName);
    await YYWCloud.rename(file, fileName);
    console.info('[Yinxing:handleFie]Success from %s to %s/%s', file.name, dirName, fileName);
    return true;
  }
}
