import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateWorkDto {
  @ApiProperty({ example: '周末出游九宫格' })
  @IsString()
  @Length(1, 64)
  title: string;

  @ApiPropertyOptional({ description: '使用的模板 id 或 code' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  template?: string;
}
