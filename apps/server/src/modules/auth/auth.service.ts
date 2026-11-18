import { HttpStatus, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { AppConfig } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { toUserView } from '../users/user.view';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 10;
/** 用户不存在时用于比较的占位哈希 */
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  /** 首次启动时按配置创建管理员账号 */
  async onApplicationBootstrap() {
    const username = this.config.get('ADMIN_USERNAME');
    const password = this.config.get('ADMIN_PASSWORD');
    if (!username || !password) return;
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) return;
    await this.prisma.user.create({
      data: { username, nickname: '管理员', role: 'ADMIN', passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
    });
    this.logger.log(`已创建管理员账号 ${username}`);
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new BusinessException(ErrorCode.USERNAME_TAKEN, '用户名已被占用', HttpStatus.CONFLICT);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        nickname: dto.nickname || dto.username,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
    });
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    // 用户不存在时也执行一次哈希比较，避免通过响应时间枚举用户名
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, '用户名或密码错误', HttpStatus.UNAUTHORIZED);
    }
    return this.issue(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; ver: number; typ: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
    } catch {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '登录已失效，请重新登录', HttpStatus.UNAUTHORIZED);
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || payload.typ !== 'refresh' || payload.ver !== user.tokenVersion) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '登录已失效，请重新登录', HttpStatus.UNAUTHORIZED);
    }
    return this.issue(user);
  }

  /** 登出：递增 tokenVersion，使所有已签发的 refresh token 失效 */
  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  }

  private async issue(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, username: user.username, role: user.role, typ: 'access' },
        { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: this.config.get('JWT_ACCESS_TTL') },
      ),
      this.jwt.signAsync(
        { sub: user.id, ver: user.tokenVersion, typ: 'refresh' },
        { secret: this.config.get('JWT_REFRESH_SECRET'), expiresIn: this.config.get('JWT_REFRESH_TTL') },
      ),
    ]);
    return { accessToken, refreshToken, user: toUserView(user) };
  }
}
