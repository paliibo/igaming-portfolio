import { Injectable } from '@nestjs/common';
import type { AuditLogDto } from '@igaming/contracts';
import { type AuditLog, Prisma } from '@igaming/database';
import { PrismaService, type DbClient } from '../../common/prisma.service.js';

export interface AuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | undefined;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput, db: DbClient = this.prisma.client): Promise<AuditLog> {
    return db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        ipAddress: input.ip ?? null,
      },
    });
  }
}

export function toAuditDto(row: AuditLog): AuditLogDto {
  return {
    id: row.id,
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}
