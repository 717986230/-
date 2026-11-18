import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config/app-config.service';

export interface StoredFile {
  key: string;
  url: string;
  size: number;
}

/** 存储抽象：业务只依赖这个接口，生产环境可替换为 OSS/COS/S3 实现 */
export abstract class StorageService {
  abstract put(buffer: Buffer, ext: string, prefix: string): Promise<StoredFile>;
  abstract remove(key: string): Promise<void>;
}

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;
  private readonly publicBase: string;

  constructor(config: AppConfig) {
    super();
    this.root = resolve(config.get('UPLOAD_DIR'));
    this.publicBase = config.get('PUBLIC_UPLOAD_BASE').replace(/\/$/, '');
  }

  get rootDir() {
    return this.root;
  }

  async put(buffer: Buffer, ext: string, prefix: string): Promise<StoredFile> {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const key = `${prefix}/${day}/${randomUUID()}.${ext}`;
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer);
    return { key, url: `${this.publicBase}/${key}`, size: buffer.length };
  }

  async remove(key: string) {
    try {
      await unlink(this.pathOf(key));
    } catch (e) {
      this.logger.warn(`删除文件失败 ${key}: ${(e as Error).message}`);
    }
  }

  /** 防目录穿越：key 解析后必须仍在根目录内 */
  private pathOf(key: string) {
    const path = resolve(join(this.root, key));
    if (!path.startsWith(this.root + '/')) throw new Error(`非法的文件 key: ${key}`);
    return path;
  }
}
