import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppConfig } from '../../config/app-config.service';
import { AuthUser, IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes';

interface AccessPayload {
  sub: string;
  username: string;
  role: AuthUser['role'];
  typ: 'access';
}

/** 全局鉴权守卫：校验 Bearer access token；@Public() 接口放行（若带 token 也会解析，便于可选登录） */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extract(req);

    if (!token) {
      if (isPublic) return true;
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '请先登录', HttpStatus.UNAUTHORIZED);
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      if (payload.typ !== 'access') throw new Error('wrong token type');
      req.user = { id: payload.sub, username: payload.username, role: payload.role };
      return true;
    } catch (e) {
      if (isPublic) return true;
      if (e instanceof TokenExpiredError) {
        throw new BusinessException(ErrorCode.TOKEN_EXPIRED, '登录已过期', HttpStatus.UNAUTHORIZED);
      }
      throw new BusinessException(ErrorCode.UNAUTHORIZED, '登录凭证无效', HttpStatus.UNAUTHORIZED);
    }
  }

  private extract(req: Request) {
    const [type, value] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && value ? value : undefined;
  }
}
