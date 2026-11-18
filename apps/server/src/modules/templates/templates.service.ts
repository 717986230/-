import { HttpStatus, Injectable } from '@nestjs/common';
import { photoCountOf } from '@moments/shared';
import { Prisma } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminListTemplatesQuery, CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** C 端：只返回已上架模板 */
  listPublished(category?: string) {
    return this.prisma.template.findMany({
      where: { status: 'published', ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { sort: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getPublished(idOrCode: string) {
    const t = await this.prisma.template.findFirst({
      where: { status: 'published', OR: [{ id: idOrCode }, { code: idOrCode }] },
    });
    if (!t) throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, '模板不存在或已下架', HttpStatus.NOT_FOUND);
    return t;
  }

  async adminList(q: AdminListTemplatesQuery) {
    const where: Prisma.TemplateWhereInput = {
      ...(q.category ? { category: q.category } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.keyword
        ? { OR: [{ name: { contains: q.keyword, mode: 'insensitive' } }, { code: { contains: q.keyword } }] }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.template.findMany({
        where,
        orderBy: [{ category: 'asc' }, { sort: 'asc' }],
        skip: q.skip,
        take: q.pageSize,
      }),
      this.prisma.template.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async adminGet(id: string) {
    const t = await this.prisma.template.findUnique({ where: { id } });
    if (!t) throw new BusinessException(ErrorCode.TEMPLATE_NOT_FOUND, '模板不存在', HttpStatus.NOT_FOUND);
    return t;
  }

  async create(dto: CreateTemplateDto) {
    try {
      return await this.prisma.template.create({
        data: {
          code: dto.code,
          name: dto.name,
          category: dto.category,
          sort: dto.sort ?? 0,
          status: dto.status ?? 'draft',
          kind: dto.definition.kind,
          photoCount: photoCountOf(dto.definition),
          definition: dto.definition as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      throw this.mapUniqueError(e);
    }
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.adminGet(id);
    const { definition, ...rest } = dto;
    try {
      return await this.prisma.template.update({
        where: { id },
        data: {
          ...rest,
          ...(definition
            ? {
                definition: definition as unknown as Prisma.InputJsonValue,
                kind: definition.kind,
                photoCount: photoCountOf(definition),
              }
            : {}),
        },
      });
    } catch (e) {
      throw this.mapUniqueError(e);
    }
  }

  /** 逻辑删除：归档后 C 端不可见，已有作品仍保留关联 */
  async archive(id: string) {
    await this.adminGet(id);
    return this.prisma.template.update({ where: { id }, data: { status: 'archived' } });
  }

  private mapUniqueError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new BusinessException(ErrorCode.TEMPLATE_CODE_TAKEN, '模板编码已存在', HttpStatus.CONFLICT);
    }
    return e;
  }
}
