'use client';
import * as React from 'react';

const STORAGE_KEY = 'ledgerarc.sidebar-collapsed';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* storage unavailable: state simply does not persist */
  }
  for (const listener of listeners) listener();
}

export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const collapsed = React.useSyncExternalStore(subscribe, read, () => false);
  return [collapsed, setSidebarCollapsed];
}
