'use client';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BetDto, PriceChange, WalletDto } from '@igaming/contracts';
import { MAX_SELECTIONS } from './odds';

export interface BetslipSelection {
  selectionId: string;
  marketId: string;
  eventId: string;
  eventName: string;
  marketName: string;
  selectionName: string;
  /** Price currently shown for the selection; kept in sync with realtime odds. */
  priceMilli: number;
  /** Price at the moment the selection was added (or last accepted). */
  acceptedPriceMilli: number;
}

export type BetslipMode = 'single' | 'accumulator';

export interface PlacedBetSummary {
  bet: BetDto;
  wallet: WalletDto;
}

interface BetslipState {
  selections: BetslipSelection[];
  stake: string;
  mode: BetslipMode;
  priceChanges: PriceChange[];
  placed: PlacedBetSummary[];
  hydrated: boolean;
  toggle: (selection: Omit<BetslipSelection, 'acceptedPriceMilli'>) => void;
  remove: (selectionId: string) => void;
  clear: () => void;
  setStake: (stake: string) => void;
  setMode: (mode: BetslipMode) => void;
  syncPrice: (selectionId: string, priceMilli: number) => void;
  acceptCurrentPrices: () => void;
  setPriceChanges: (changes: PriceChange[]) => void;
  recordPlaced: (summary: PlacedBetSummary) => void;
  dismissPlaced: () => void;
  markHydrated: () => void;
}

export const useBetslipStore = create<BetslipState>()(
  persist(
    (set) => ({
      selections: [],
      stake: '',
      mode: 'single',
      priceChanges: [],
      placed: [],
      hydrated: false,
      toggle: (selection) =>
        set((state) => {
          const existing = state.selections.find((s) => s.selectionId === selection.selectionId);
          if (existing) {
            return {
              selections: state.selections.filter((s) => s.selectionId !== selection.selectionId),
              priceChanges: [],
              placed: [],
            };
          }
          const entry: BetslipSelection = {
            ...selection,
            acceptedPriceMilli: selection.priceMilli,
          };
          const sameMarketIndex = state.selections.findIndex(
            (s) => s.marketId === selection.marketId,
          );
          if (sameMarketIndex >= 0) {
            const next = [...state.selections];
            next[sameMarketIndex] = entry;
            return { selections: next, priceChanges: [], placed: [] };
          }
          if (state.selections.length >= MAX_SELECTIONS) return state;
          return { selections: [...state.selections, entry], priceChanges: [], placed: [] };
        }),
      remove: (selectionId) =>
        set((state) => ({
          selections: state.selections.filter((s) => s.selectionId !== selectionId),
          priceChanges: state.priceChanges.filter((c) => c.selectionId !== selectionId),
        })),
      clear: () => set({ selections: [], stake: '', priceChanges: [] }),
      setStake: (stake) => set({ stake }),
      setMode: (mode) => set({ mode }),
      syncPrice: (selectionId, priceMilli) =>
        set((state) => {
          if (
            !state.selections.some(
              (s) => s.selectionId === selectionId && s.priceMilli !== priceMilli,
            )
          )
            return state;
          return {
            selections: state.selections.map((s) =>
              s.selectionId === selectionId ? { ...s, priceMilli } : s,
            ),
          };
        }),
      acceptCurrentPrices: () =>
        set((state) => ({
          selections: state.selections.map((s) => ({ ...s, acceptedPriceMilli: s.priceMilli })),
          priceChanges: [],
        })),
      setPriceChanges: (changes) =>
        set((state) => ({
          priceChanges: changes,
          selections: state.selections.map((s) => {
            const change = changes.find((c) => c.selectionId === s.selectionId);
            return change ? { ...s, priceMilli: change.currentPriceMilli } : s;
          }),
        })),
      recordPlaced: (summary) => set((state) => ({ placed: [...state.placed, summary] })),
      dismissPlaced: () => set({ placed: [] }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'linepulse.betslip',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selections: state.selections,
        stake: state.stake,
        mode: state.mode,
      }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

export function useIsSelected(selectionId: string): boolean {
  return useBetslipStore((state) => state.selections.some((s) => s.selectionId === selectionId));
}
