'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, queryKeys } from '@igaming/api-client';
import type {
  AdjustmentInput,
  AdminNoteDto,
  AdminPlayerDetailDto,
  AdminPlayerListItemDto,
  AuditLogDto,
  BetDto,
  CasinoGameDto,
  DashboardMetricsDto,
  GameRoundDto,
  JournalEntryDto,
  KycStatus,
  LedgerAccountDto,
  Page,
  PlayerLimitDto,
  PlayerProfileDto,
  ReconciliationDto,
  ReportsDto,
  RiskAlertDto,
  SetLimitInput,
  UpdatePlayerStatusInput,
  WalletDto,
  WalletTransactionDto,
} from '@igaming/contracts';
import { useCursorQuery, type CursorQueryOptions, type QueryFilters } from '../use-cursor-query';

export interface PlayerRef {
  id: string;
  email: string;
  displayName: string;
}

export type AdminTransactionDto = WalletTransactionDto & { player: PlayerRef };

export interface DemoResetSummary {
  users: number;
  events: number;
  games: number;
  bets: number;
  rounds: number;
  seededAt: string;
}

export interface AdjustmentResponse {
  wallet: WalletDto;
  transaction: WalletTransactionDto;
  replayed: boolean;
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: ({ signal }) => apiFetch<DashboardMetricsDto>('/admin/dashboard', { signal }),
    refetchInterval: 30_000,
  });
}

export function useReconciliation() {
  return useQuery({
    queryKey: queryKeys.admin.reconciliation,
    queryFn: ({ signal }) =>
      apiFetch<ReconciliationDto>('/admin/ledger/reconciliation', { signal }),
    staleTime: 30_000,
  });
}

export function useLedgerAccounts() {
  return useQuery({
    queryKey: queryKeys.admin.accounts,
    queryFn: ({ signal }) => apiFetch<LedgerAccountDto[]>('/admin/ledger/accounts', { signal }),
  });
}

export function useReports(days: number) {
  return useQuery({
    queryKey: queryKeys.admin.reports(days),
    queryFn: ({ signal }) => apiFetch<ReportsDto>('/admin/reports', { query: { days }, signal }),
  });
}

export function usePlayers(filters: QueryFilters, options?: CursorQueryOptions) {
  return useCursorQuery<AdminPlayerListItemDto>(
    queryKeys.admin.players(filters),
    '/admin/players',
    filters,
    options,
  );
}

export function usePlayerSearch(search: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.players({ search, quick: true }),
    queryFn: ({ signal }) =>
      apiFetch<Page<AdminPlayerListItemDto>>('/admin/players', {
        query: { search, limit: 6 },
        signal,
      }),
    enabled,
    staleTime: 30_000,
  });
}

export function usePlayer(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.player(id),
    queryFn: ({ signal }) => apiFetch<AdminPlayerDetailDto>(`/admin/players/${id}`, { signal }),
    enabled: enabled && id !== '',
  });
}

function useInvalidatePlayer(id: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.admin.player(id) });
    void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
  };
}

export function useUpdatePlayerStatus(id: string) {
  const invalidate = useInvalidatePlayer(id);
  return useMutation({
    mutationFn: (input: UpdatePlayerStatusInput) =>
      apiFetch<PlayerProfileDto>(`/admin/players/${id}/status`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateKyc(id: string) {
  const invalidate = useInvalidatePlayer(id);
  return useMutation({
    mutationFn: (kycStatus: KycStatus) =>
      apiFetch<PlayerProfileDto>(`/admin/players/${id}/kyc`, {
        method: 'PATCH',
        body: { kycStatus },
      }),
    onSuccess: invalidate,
  });
}

export function useSetLimit(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidatePlayer(id);
  return useMutation({
    mutationFn: (input: SetLimitInput) =>
      apiFetch<PlayerLimitDto[]>(`/admin/players/${id}/limits`, { method: 'PUT', body: input }),
    onSuccess: (limits) => {
      qc.setQueryData<AdminPlayerDetailDto>(queryKeys.admin.player(id), (prev) =>
        prev ? { ...prev, limits } : prev,
      );
      invalidate();
    },
  });
}

export function useAddNote(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidatePlayer(id);
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<AdminNoteDto>(`/admin/players/${id}/notes`, { method: 'POST', body: { body } }),
    onSuccess: (note) => {
      qc.setQueryData<AdminPlayerDetailDto>(queryKeys.admin.player(id), (prev) =>
        prev ? { ...prev, notes: [note, ...prev.notes] } : prev,
      );
      invalidate();
    },
  });
}

export function useAdjustBalance(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidatePlayer(id);
  return useMutation({
    mutationFn: (input: AdjustmentInput) =>
      apiFetch<AdjustmentResponse>(`/admin/players/${id}/adjustments`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'journal'] });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.accounts });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.reconciliation });
    },
  });
}

export function useAdminTransactions(filters: QueryFilters, options?: CursorQueryOptions) {
  return useCursorQuery<AdminTransactionDto>(
    queryKeys.admin.transactions(filters),
    '/admin/transactions',
    filters,
    options,
  );
}

export function useJournal(filters: QueryFilters, options?: CursorQueryOptions) {
  return useCursorQuery<JournalEntryDto>(
    queryKeys.admin.journal(filters),
    '/admin/journal',
    filters,
    options,
  );
}

export function useJournalEntry(id: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.journalEntry(id ?? ''),
    queryFn: ({ signal }) => apiFetch<JournalEntryDto>(`/admin/journal/${id}`, { signal }),
    enabled: id !== null,
  });
}

export function useReverseEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<JournalEntryDto>(`/admin/journal/${id}/reverse`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'journal'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'player'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.accounts });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.reconciliation });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
    },
  });
}

export function useAdminBets(filters: QueryFilters, options?: CursorQueryOptions) {
  return useCursorQuery<BetDto>(queryKeys.admin.bets(filters), '/admin/bets', filters, options);
}

export function useOperatorGames() {
  return useQuery({
    queryKey: queryKeys.admin.games,
    queryFn: ({ signal }) => apiFetch<CasinoGameDto[]>('/casino/operator/games', { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useAdminRounds(filters: QueryFilters, options?: CursorQueryOptions) {
  return useCursorQuery<GameRoundDto>(
    queryKeys.admin.rounds(filters),
    '/admin/rounds',
    filters,
    options,
  );
}

export function useAlerts(filters: QueryFilters, options?: CursorQueryOptions) {
  return useCursorQuery<RiskAlertDto>(
    queryKeys.admin.alerts(filters),
    '/admin/risk/alerts',
    filters,
    options,
  );
}

export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'RESOLVED' | 'DISMISSED' }) =>
      apiFetch<RiskAlertDto>(`/admin/risk/alerts/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'player'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'players'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.dashboard });
    },
  });
}

export function useAudit(filters: QueryFilters, options?: CursorQueryOptions) {
  return useCursorQuery<AuditLogDto>(
    queryKeys.admin.audit(filters),
    '/admin/audit',
    filters,
    options,
  );
}

export function useDemoReset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<DemoResetSummary>('/admin/demo/reset', { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
