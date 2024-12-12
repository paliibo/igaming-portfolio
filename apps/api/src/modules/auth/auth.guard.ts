import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.auth.extractToken(
      req.cookies as Record<string, string> | undefined,
      req.headers.authorization,
    );
    const user = token ? await this.auth.resolveUser(token) : null;
    if (user) req.user = user;
    if (isPublic) return true;
    if (!user)
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Sign in to continue' });
    return true;
  }
}
