import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { PrismaService } from '../../prisma/prisma.service';
import { sniffImage } from '../storage/image-sniff';
import { StorageService } from '../storage/storage.service';
import type { CreateWorkDto } from './dto/work.dto';

export interface WorkFile {
  key: string;
  url: string;
  width: number;
  height: number;
  size: number;
}

export const MAX_WORK_FILES = 9;

@Injectable()
export class WorksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateWorkDto, uploads: Express.Multer.File[]) {
    if (!uploads?.length || uploads.length > MAX_WORK_FILES) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, `请上传 1~${MAX_WORK_FILES} 张图片`);
    }
    // 先全部校验，再写盘，避免半途失败留下垃圾文件
    const sniffed = uploads.map((f, i) => {
      const info = sniffImage(f.buffer);
      if (!info || info.width === 0 || info.height === 0) {
        throw new BusinessException(
          ErrorCode.UNSUPPORTED_MEDIA,
          `第 ${i + 1} 个文件不是有效的 JPG/PNG/WEBP 图片`,
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }
      return info;
    });

    let templateId: string | undefined;
    if (dto.template) {
      const t = await this.prisma.template.findFirst({
        where: { OR: [{ id: dto.template }, { code: dto.template }] },
        select: { id: true },
      });
      if (!t) throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, '模板不存在', HttpStatus.NOT_FOUND);
      templateId = t.id;
    }

    const files: WorkFile[] = [];
    try {
      for (let i = 0; i < uploads.length; i++) {
        const stored = await this.storage.put(uploads[i].buffer, sniffed[i].ext, `works/${userId}`);
        files.push({ ...stored, width: sniffed[i].width, height: sniffed[i].height });
      }
      return await this.prisma.work.create({
        data: { userId, templateId, title: dto.title, files: files as unknown as Prisma.InputJsonValue },
        include: { template: { select: { id: true, code: true, name: true } } },
      });
    } catch (e) {
      await Promise.all(files.map((f) => this.storage.remove(f.key)));
      throw e;
    }
  }

  async list(userId: string, q: PaginationQuery) {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.work.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.pageSize,
        include: { template: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.work.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async get(userId: string, id: string) {
    const work = await this.prisma.work.findFirst({
      where: { id, userId },
      include: { template: { select: { id: true, code: true, name: true } } },
    });
    // 不区分"不存在"与"不属于你"，防止探测他人作品
    if (!work) throw new BusinessException(ErrorCode.WORK_NOT_FOUND, '作品不存在', HttpStatus.NOT_FOUND);
    return work;
  }

  async remove(userId: string, id: string) {
    const work = await this.get(userId, id);
    await this.prisma.work.delete({ where: { id: work.id } });
    await Promise.all((work.files as unknown as WorkFile[]).map((f) => this.storage.remove(f.key)));
  }
}
