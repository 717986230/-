import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { TemplateDefinition } from '@moments/shared';
import { validateDefinition } from '@moments/shared';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import { PaginationQuery } from '../../../common/dto/pagination.dto';

export const CATEGORIES = ['grid', 'collage', 'split', 'frame'] as const;
export const STATUSES = ['draft', 'published', 'archived'] as const;

/** 复用 @moments/shared 的校验规则，前后端对模板结构的约束保持一致 */
function IsTemplateDefinition() {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isTemplateDefinition',
      target: object.constructor,
      propertyName,
      validator: {
        validate: (value: unknown) => validateDefinition(value).length === 0,
        defaultMessage: (args: ValidationArguments) => validateDefinition(args.value).join('；'),
      },
    });
}

export class ListTemplatesQuery {
  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];
}

export class AdminListTemplatesQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiPropertyOptional({ description: '按名称或编码模糊搜索' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  keyword?: string;
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'grid-3x3', description: '唯一编码，小写字母、数字和中划线' })
  @Matches(/^[a-z0-9-]{2,64}$/, { message: 'code 为 2~64 位小写字母、数字或中划线' })
  code: string;

  @ApiProperty({ example: '九宫格' })
  @IsString()
  @Length(1, 64)
  name: string;

  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  category: (typeof CATEGORIES)[number];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  sort?: number;

  @ApiPropertyOptional({ enum: STATUSES, default: 'draft' })
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @ApiProperty({ description: '模板定义，结构见 @moments/shared TemplateDefinition' })
  @IsObject()
  @IsTemplateDefinition()
  definition: TemplateDefinition;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
