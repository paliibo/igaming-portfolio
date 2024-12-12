import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { Role, UserDto } from '@igaming/contracts';
import type { Response } from 'express';
import { ENV, type Env } from '../../config/env.js';
import { PrismaService } from '../../common/prisma.service.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { UsersService } from '../users/users.service.js';
import { DomainError } from '../../common/errors.js';

interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<UserDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true },
    });
    const hash =
      user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidu';
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok)
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    if (user.profile?.status === 'CLOSED')
      throw new DomainError('ACCOUNT_CLOSED', 'This account has been closed', 403);
    if (user.profile) {
      await this.prisma.client.playerProfile.update({
        where: { id: user.profile.id },
        data: { lastLoginAt: new Date() },
      });
    }
    return this.users.toDto(user);
  }

  async register(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<UserDto> {
    return this.users.createPlayer(input);
  }

  signToken(user: UserDto): string {
    const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
    return this.jwt.sign(payload, { expiresIn: `${this.env.SESSION_TTL_HOURS}h` });
  }

  setSessionCookie(res: Response, token: string): void {
    res.cookie(this.env.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.isProduction,
      path: '/',
      maxAge: this.env.SESSION_TTL_HOURS * 3600 * 1000,
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(this.env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.isProduction,
      path: '/',
    });
  }

  extractToken(cookies: Record<string, string> | undefined, authorization?: string): string | null {
    const fromCookie = cookies?.[this.env.SESSION_COOKIE_NAME];
    if (fromCookie) return fromCookie;
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
    return null;
  }

  async resolveUser(token: string): Promise<AuthenticatedUser | null> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      return null;
    }
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        profile: { select: { status: true } },
      },
    });
    if (!user || user.profile?.status === 'CLOSED') return null;
    return { id: user.id, email: user.email, role: user.role, displayName: user.displayName };
  }

  /** Used by the Socket.IO gateway: parses the session cookie out of a raw Cookie header. */
  async resolveUserFromCookieHeader(
    cookieHeader: string | undefined,
  ): Promise<AuthenticatedUser | null> {
    if (!cookieHeader) return null;
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((part) => {
        const [k, ...rest] = part.trim().split('=');
        return [k ?? '', decodeURIComponent(rest.join('='))];
      }),
    );
    const token = this.extractToken(cookies);
    return token ? this.resolveUser(token) : null;
  }
}
