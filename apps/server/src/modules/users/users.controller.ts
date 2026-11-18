import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserView } from './user.view';

@ApiTags('用户')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @ApiOperation({ summary: '当前用户信息' })
  async me(@CurrentUser() user: AuthUser) {
    return toUserView(await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } }));
  }
}
