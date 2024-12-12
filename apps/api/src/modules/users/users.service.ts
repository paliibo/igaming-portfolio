import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { UserDto } from '@igaming/contracts';
import { type PlayerProfile, Prisma, type Role, type User } from '@igaming/database';
import { PrismaService } from '../../common/prisma.service.js';
import { ConflictError, NotFoundError } from '../../common/errors.js';
import { LedgerService } from '../ledger/ledger.service.js';

export const WELCOME_BALANCE_MINOR = 100_000n; // 1,000 demo credits

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async getDto(id: string): Promise<UserDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) throw new NotFoundError('User', id);
    return this.toDto(user);
  }

  /** Creates a user, their profile, wallet and ledger account, and posts the welcome balance. */
  async createUser(input: {
    email: string;
    password: string;
    displayName: string;
    role: Role;
    welcomeBalanceMinor?: bigint;
    kycVerified?: boolean;
  }): Promise<UserDto> {
    const email = input.email.toLowerCase();
    const passwordHash = await bcrypt.hash(input.password, 10);
    const houseFloat = await this.ledger.systemAccountId('HOUSE_FLOAT');
    const welcome =
      input.welcomeBalanceMinor ?? (input.role === 'PLAYER' ? WELCOME_BALANCE_MINOR : 0n);
    try {
      const user = await this.prisma.client.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            passwordHash,
            displayName: input.displayName,
            role: input.role,
            profile: { create: { kycStatus: input.kycVerified ? 'VERIFIED' : 'PENDING' } },
          },
          include: { profile: true },
        });
        const account = await tx.ledgerAccount.create({
          data: {
            code: `WALLET:${created.id}`,
            name: `Wallet of ${created.displayName}`,
            kind: 'PLAYER_WALLET',
          },
        });
        await tx.wallet.create({ data: { userId: created.id, accountId: account.id } });
        if (welcome > 0n) {
          await this.ledger.postEntry(tx, {
            kind: 'TOPUP',
            description: 'Welcome demo credits',
            referenceType: 'WELCOME',
            referenceId: created.id,
            idempotencyKey: `welcome:${created.id}`,
            createdById: created.id,
            metadata: { source: 'welcome' },
            lines: [
              { accountId: houseFloat, direction: 'DEBIT', amountMinor: welcome },
              { accountId: account.id, direction: 'CREDIT', amountMinor: welcome },
            ],
          });
        }
        return created;
      });
      return this.toDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw error;
    }
  }

  createPlayer(input: { email: string; password: string; displayName: string }): Promise<UserDto> {
    return this.createUser({ ...input, role: 'PLAYER' });
  }

  toDto(user: User & { profile: PlayerProfile | null }): UserDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile ? toProfileDto(user.profile) : null,
    };
  }
}

export function toProfileDto(profile: PlayerProfile) {
  return {
    status: profile.status,
    kycStatus: profile.kycStatus,
    country: profile.country,
    selfExcludedUntil: profile.selfExcludedUntil?.toISOString() ?? null,
    coolingOffUntil: profile.coolingOffUntil?.toISOString() ?? null,
    suspendedReason: profile.suspendedReason,
    lastLoginAt: profile.lastLoginAt?.toISOString() ?? null,
  };
}
