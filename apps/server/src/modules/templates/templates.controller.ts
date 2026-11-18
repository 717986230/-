import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../common/decorators/auth.decorators';
import {
  AdminListTemplatesQuery,
  CreateTemplateDto,
  ListTemplatesQuery,
  UpdateTemplateDto,
} from './dto/template.dto';
import { TemplatesService } from './templates.service';

@ApiTags('模板')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '已上架模板列表' })
  list(@Query() q: ListTemplatesQuery) {
    return this.templates.listPublished(q.category);
  }

  @Public()
  @Get(':idOrCode')
  @ApiOperation({ summary: '模板详情（支持 id 或 code）' })
  get(@Param('idOrCode') idOrCode: string) {
    return this.templates.getPublished(idOrCode);
  }
}

@ApiTags('管理后台 - 模板')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/templates')
export class AdminTemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: '分页查询全部模板' })
  list(@Query() q: AdminListTemplatesQuery) {
    return this.templates.adminList(q);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.templates.adminGet(id);
  }

  @Post()
  @ApiOperation({ summary: '新建模板' })
  create(@Body() dto: CreateTemplateDto) {
    return this.templates.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改模板（含上下架、排序）' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '归档模板' })
  archive(@Param('id') id: string) {
    return this.templates.archive(id);
  }
}
