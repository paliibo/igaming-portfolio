'use client';
import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  WS_CLIENT_EVENTS,
  WS_PATH,
  WS_SERVER_EVENTS,
  type BetSettledPayload,
  type EventUpdatePayload,
  type MarketStatusPayload,
  type OddsUpdatePayload,
  type WalletUpdatePayload,
  type WalletDto,
} from '@igaming/contracts';
import { getApiBaseUrl } from './client';
import { queryKeys } from './query-keys';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface RealtimeContextValue {
  socket: Socket | null;
  state: ConnectionState;
}

const RealtimeContext = React.createContext<RealtimeContextValue>({
  socket: null,
  state: 'connecting',
});

/**
 * Keeps one Socket.IO connection per tab, reconnecting automatically, and translates server
 * pushes into TanStack Query cache updates (wallet balance) and invalidations (settled bets).
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [state, setState] = React.useState<ConnectionState>('connecting');

  React.useEffect(() => {
    const s = io(getApiBaseUrl(), {
      path: WS_PATH,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });
    s.on('connect', () => setState('connected'));
    s.on('disconnect', () => setState('disconnected'));
    s.io.on('reconnect_attempt', () => setState('connecting'));
    s.on(WS_SERVER_EVENTS.walletUpdate, (payload: WalletUpdatePayload) => {
      qc.setQueryData<WalletDto>(queryKeys.wallet, (prev) =>
        prev
          ? { ...prev, balanceMinor: payload.balanceMinor, updatedAt: payload.updatedAt }
          : {
              id: payload.walletId,
              currency: 'DMO',
              balanceMinor: payload.balanceMinor,
              updatedAt: payload.updatedAt,
            },
      );
      void qc.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    });
    s.on(WS_SERVER_EVENTS.betSettled, () => {
      void qc.invalidateQueries({ queryKey: ['sportsbook', 'bets'] });
    });
    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [qc]);

  const value = React.useMemo(() => ({ socket, state }), [socket, state]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

const subscribeNoop = () => () => {};

/**
 * Connection state is reported as "connecting" until the component has hydrated, so server and
 * first client render always agree even when the socket connects before a late Suspense boundary.
 */
export function useRealtime(): RealtimeContextValue {
  const value = React.useContext(RealtimeContext);
  const hydrated = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  return hydrated ? value : { socket: value.socket, state: 'connecting' };
}

/** Subscribe to a server event for the lifetime of the component. */
export function useRealtimeEvent<T>(event: string, handler: (payload: T) => void) {
  const { socket } = useRealtime();
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;
  React.useEffect(() => {
    if (!socket) return;
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}

export function useOddsUpdates(handler: (payload: OddsUpdatePayload) => void) {
  useRealtimeEvent<OddsUpdatePayload>(WS_SERVER_EVENTS.oddsUpdate, handler);
}
export function useMarketStatusUpdates(handler: (payload: MarketStatusPayload) => void) {
  useRealtimeEvent<MarketStatusPayload>(WS_SERVER_EVENTS.marketStatus, handler);
}
export function useEventUpdates(handler: (payload: EventUpdatePayload) => void) {
  useRealtimeEvent<EventUpdatePayload>(WS_SERVER_EVENTS.eventUpdate, handler);
}
export function useBetSettled(handler: (payload: BetSettledPayload) => void) {
  useRealtimeEvent<BetSettledPayload>(WS_SERVER_EVENTS.betSettled, handler);
}

/** Joins an event room while mounted (server also broadcasts to the global sportsbook room). */
export function useEventRoom(eventId: string | undefined) {
  const { socket, state } = useRealtime();
  React.useEffect(() => {
    if (!socket || !eventId || state !== 'connected') return;
    socket.emit(WS_CLIENT_EVENTS.subscribeEvent, { eventId });
    return () => {
      socket.emit(WS_CLIENT_EVENTS.unsubscribeEvent, { eventId });
    };
  }, [socket, eventId, state]);
}
