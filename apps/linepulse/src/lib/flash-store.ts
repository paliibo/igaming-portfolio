'use client';
import { create } from 'zustand';

export type FlashDirection = 'up' | 'down';

interface FlashState {
  flashes: Record<string, { direction: FlashDirection; token: number }>;
  flash: (selectionId: string, direction: FlashDirection) => void;
}

const FLASH_DURATION_MS = 1600;

/** Short-lived per-selection odds movement markers that drive the green/red button animation. */
export const useFlashStore = create<FlashState>()((set) => ({
  flashes: {},
  flash: (selectionId, direction) => {
    const token = Date.now();
    set((state) => ({ flashes: { ...state.flashes, [selectionId]: { direction, token } } }));
    window.setTimeout(() => {
      set((state) => {
        if (state.flashes[selectionId]?.token !== token) return state;
        const next = { ...state.flashes };
        delete next[selectionId];
        return { flashes: next };
      });
    }, FLASH_DURATION_MS);
  },
}));

export function useFlash(selectionId: string) {
  return useFlashStore((state) => state.flashes[selectionId] ?? null);
}
