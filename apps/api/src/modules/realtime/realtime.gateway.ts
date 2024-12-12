import { Injectable, Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  WS_CLIENT_EVENTS,
  WS_PATH,
  WS_SERVER_EVENTS,
  type BetSettledPayload,
  type EventUpdatePayload,
  type MarketStatusPayload,
  type OddsUpdatePayload,
  type WalletDto,
} from '@igaming/contracts';
import { AuthService } from '../auth/auth.service.js';

const SPORTSBOOK_ROOM = 'sportsbook';
const userRoom = (userId: string) => `user:${userId}`;
const eventRoom = (eventId: string) => `event:${eventId}`;

@Injectable()
@WebSocketGateway({ path: WS_PATH, cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly auth: AuthService) {}

  async handleConnection(socket: Socket) {
    await socket.join(SPORTSBOOK_ROOM);
    const user = await this.auth.resolveUserFromCookieHeader(socket.handshake.headers.cookie);
    if (user) {
      socket.data.userId = user.id;
      await socket.join(userRoom(user.id));
    }
    this.logger.debug(
      `socket ${socket.id} connected${user ? ` as ${user.email}` : ' anonymously'}`,
    );
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`socket ${socket.id} disconnected`);
  }

  @SubscribeMessage(WS_CLIENT_EVENTS.subscribeEvent)
  async subscribeEvent(socket: Socket, payload: { eventId?: string }) {
    if (typeof payload?.eventId === 'string') await socket.join(eventRoom(payload.eventId));
    return { ok: true };
  }

  @SubscribeMessage(WS_CLIENT_EVENTS.unsubscribeEvent)
  async unsubscribeEvent(socket: Socket, payload: { eventId?: string }) {
    if (typeof payload?.eventId === 'string') await socket.leave(eventRoom(payload.eventId));
    return { ok: true };
  }

  emitOddsUpdate(payload: OddsUpdatePayload) {
    this.server?.to(SPORTSBOOK_ROOM).emit(WS_SERVER_EVENTS.oddsUpdate, payload);
  }

  emitMarketStatus(payload: MarketStatusPayload) {
    this.server?.to(SPORTSBOOK_ROOM).emit(WS_SERVER_EVENTS.marketStatus, payload);
  }

  emitEventUpdate(payload: EventUpdatePayload) {
    this.server?.to(SPORTSBOOK_ROOM).emit(WS_SERVER_EVENTS.eventUpdate, payload);
  }

  emitWalletUpdate(userId: string, wallet: WalletDto, reason: string) {
    this.server?.to(userRoom(userId)).emit(WS_SERVER_EVENTS.walletUpdate, {
      walletId: wallet.id,
      balanceMinor: wallet.balanceMinor,
      updatedAt: wallet.updatedAt,
      reason,
    });
  }

  emitBetSettled(userId: string, payload: BetSettledPayload) {
    this.server?.to(userRoom(userId)).emit(WS_SERVER_EVENTS.betSettled, payload);
  }
}
