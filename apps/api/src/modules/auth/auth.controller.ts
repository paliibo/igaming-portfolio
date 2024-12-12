import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@igaming/contracts';
import type { Request, Response } from 'express';
import { ZodBody } from '../../common/zod.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { UsersService } from '../users/users.service.js';
import { AuditService } from '../audit/audit.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowSeconds: 60, name: 'login' })
  @ZodBody(loginSchema)
  @ApiOperation({ summary: 'Sign in; sets an HttpOnly session cookie' })
  async login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const user = await this.auth.validateCredentials(body.email, body.password);
    this.auth.setSessionCookie(res, this.auth.signToken(user));
    if (user.role !== 'PLAYER') {
      await this.audit.record({
        actorId: user.id,
        actorEmail: user.email,
        action: 'auth.staff_login',
        targetType: 'USER',
        targetId: user.id,
        ip: req.ip,
      });
    }
    return { user };
  }

  @Public()
  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 300, name: 'register' })
  @ZodBody(registerSchema)
  @ApiOperation({ summary: 'Create a demo player account with a welcome balance' })
  async register(@Body() body: RegisterInput, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(body);
    this.auth.setSessionCookie(res, this.auth.signToken(user));
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    this.auth.clearSessionCookie(res);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Current authenticated user' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { user: await this.users.getDto(user.id) };
  }
}
