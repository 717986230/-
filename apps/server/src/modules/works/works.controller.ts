import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { AuthUser, CurrentUser } from '../../common/decorators/auth.decorators';
import { CreateWorkDto } from './dto/work.dto';
import { MAX_WORK_FILES, WorksService } from './works.service';

@ApiTags('我的作品')
@ApiBearerAuth()
@Controller('works')
export class WorksController {
  constructor(private readonly works: WorksService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'files'],
      properties: {
        title: { type: 'string' },
        template: { type: 'string', description: '模板 id 或 code' },
        files: { type: 'array', items: { type: 'string', format: 'binary' }, description: '导出的图片，1~9 张' },
      },
    },
  })
  @ApiOperation({ summary: '保存作品（上传导出的图片）' })
  @UseInterceptors(FilesInterceptor('files', MAX_WORK_FILES))
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWorkDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.works.create(user.id, dto, files);
  }

  @Get()
  @ApiOperation({ summary: '我的作品列表' })
  list(@CurrentUser() user: AuthUser, @Query() q: PaginationQuery) {
    return this.works.list(user.id, q);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.works.get(user.id, id);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.works.remove(user.id, id);
    return null;
  }
}
