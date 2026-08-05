import sanitize from 'sanitize-filename';
import MonkeyKernel from '../core/monkey_kernel';
import type { Movie } from '../types/domain';
import { File, YYWCloud } from './yyw_cloud';
import { config } from '../config';

export { YYWCloud, File };
export type { Movie };

/**
 * Metadata API feature toggle.
 *
 * Set to `false` when the external metadata API (yinxing.com / yinxing.av2.us)
 * is unavailable, to disable auto-organize and thumbnail replacement without
 * breaking the rest of the script (magnet link handling, offline download, etc.).
 */
export const METADATA_API_ENABLED = false;

export default class YinXing {
  readonly videoTargetId: string;
  readonly isoTargetId: string;

  constructor(options: { videoTargetId: string; isoTargetId: string }) {
    this.videoTargetId = options.videoTargetId;
    this.isoTargetId = options.isoTargetId;
  }

  /**
   * Extract a banngo (e.g. `ABC-123`) from arbitrary text, stripping known
   * noise prefixes first. Returns `null` when nothing matches.
   */
  static parseBanngo(
    text: string,
    ignorePrefixes: string[] = ['hhd800.com', 'hjd2048.com', 'fhd-1080p', 'bbs25'],
  ): string | null {
    let filteredText = text.toLowerCase();
    ignorePrefixes.forEach((ignore) => { filteredText = filteredText.replace(ignore, ''); });
    const res = /([a-zA-Z]{2,6})-?(\d{2,5})/ig.exec(filteredText);
    return res ? res[0] : null;
  }

  /** Query the metadata API for a movie matching the given banngo. */
  static async matchMovie(banngo: string): Promise<Movie | null> {
    if (!METADATA_API_ENABLED) {
      console.debug('[Yinxing:matchMovie]Skipped — metadata API disabled');
      return null;
    }
    const res = (await MonkeyKernel.requestJSON({
      url: config.movieApiUrl,
      query: { q: banngo },
    })) as { results: Movie[] };

    if (!res || !res.results || res.results.length < 1) {
      return null;
    }
    return res.results[0];
  }

  /** Find an existing folder by name under `targetFolderId`, or create it. */
  async findOrCreateDir(dirName: string, targetFolderId: string): Promise<File> {
    console.debug('[Yinxing:findOrCreateDir]Start search for %s under %s', dirName, targetFolderId);
    const res = await YYWCloud.search({ q: dirName, parentId: targetFolderId });
    const existing = res.files.find((file) => file.name === dirName);
    if (existing) {
      return existing;
    }
    return YYWCloud.mkDir(dirName, targetFolderId);
  }

  toNames(movie: Movie): { dirName: string; fileName: string } {
    const dirName = movie.maker ? movie.maker.name : 'Unknown';
    const casts = movie.casts.map((c) => c.name).join(',');
    const fileName = sanitize(`[${movie.banngo}]${casts} - ${movie.title}`);
    return { dirName, fileName };
  }

  async handleAll(entryParentId: string): Promise<void> {
    let { pagination } = await this.handlePage(entryParentId);
    let offset = 0;
    while (pagination && offset < pagination.total) {
      offset += 40;
      ({ pagination } = await this.handlePage(entryParentId, offset));
    }
  }

  async handlePage(parentId: string, offset: number = 0): Promise<{ pagination: { total: number }; files: File[] }> {
    console.group(`[Yinxing:handlePage]Page ${parentId}, offset ${offset}`);
    const res = await YYWCloud.getFileList({ parentId, offset });
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

  async handleFile(file: File): Promise<boolean> {
    console.debug('[Yinxing:handleFile]Start handle file %s', file.name);
    if (file.isDir) {
      console.debug('[Yinxing:handleFile]Skipped handle dir %s', file.name);
      return false;
    }

    const banngo = YinXing.parseBanngo(file.name ?? '');
    if (!banngo) {
      console.debug('[Yinxing:handleFile]Not able to handle %s by no banngo', file.name);
      return false;
    }

    if (!['mp4', 'avi', 'wmv', 'mkv', 'iso', 'rmvb'].includes(file.fileType ?? '')) {
      console.debug(
        '[Yinxing:handleFile]Not able to handle %s by incorrect file type %s',
        file.name,
        file.fileType,
      );
      return false;
    }

    const movie = await YinXing.matchMovie(banngo);
    if (!movie) {
      console.debug('[Yinxing:handleFile]Not able to handle %s by no matched movie', file.name);
      return false;
    }

    const { dirName, fileName } = this.toNames(movie);
    console.debug(
      '[Yinxing:handleFile]Try to handle file from %s to %s/%s',
      file.name,
      dirName,
      fileName,
    );

    const movieDir = await this.findOrCreateDir(
      dirName,
      file.fileType === 'iso' ? this.isoTargetId : this.videoTargetId,
    );
    console.debug('[Yinxing:handleFile]-- FindOrCreateDir: %o', movieDir);

    console.debug('[Yinxing:handleFile]-- Move %o to: %o', file, movieDir);
    await YYWCloud.move([file], movieDir.id);

    console.debug('[Yinxing:handleFile]-- Rename file %o to: %o', file, fileName);
    await YYWCloud.rename(file, fileName);
    console.info('[Yinxing:handleFile]Success from %s to %s/%s', file.name, dirName, fileName);
    return true;
  }
}