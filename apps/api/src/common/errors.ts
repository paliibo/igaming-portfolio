import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    public readonly details?: unknown,
  ) {
    super({ statusCode: status, code, message, details }, status);
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(details?: unknown) {
    super(
      'INSUFFICIENT_FUNDS',
      'Insufficient wallet balance for this operation',
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }
}

export class LimitExceededError extends DomainError {
  constructor(limitType: string, details?: unknown) {
    super(
      'LIMIT_EXCEEDED',
      `This operation would exceed the player's ${limitType.toLowerCase().replace('_', ' ')} limit`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }
}

export class PlayerRestrictedError extends DomainError {
  constructor(status: string, details?: unknown) {
    super(
      'PLAYER_RESTRICTED',
      `Player account is ${status.toLowerCase().replace('_', ' ')} and cannot wager`,
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(
      'NOT_FOUND',
      id ? `${entity} ${id} was not found` : `${entity} was not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, HttpStatus.CONFLICT, details);
  }
}
