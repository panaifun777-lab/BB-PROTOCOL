'use client';

// ===== useClientTime — Safe client-only time hook for hydration-safe rendering =====

import { useSyncExternalStore } from 'react';

// ── Shared time store (module-level, single timer for all consumers) ──
let currentTime: Date | null = null;
let listeners: Set<() => void> = new Set();
let timerId: ReturnType<typeof setInterval> | null = null;
let refCount = 0;

function emitChange() {
  currentTime = new Date();
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  refCount++;
  if (refCount === 1) {
    // First subscriber — start the timer and set initial time
    currentTime = new Date();
    timerId = setInterval(emitChange, 60_000);
  }
  return () => {
    listeners.delete(callback);
    refCount--;
    if (refCount === 0 && timerId !== null) {
      clearInterval(timerId);
      timerId = null;
      currentTime = null;
    }
  };
}

function getSnapshot(): Date | null {
  return currentTime;
}

function getServerSnapshot(): null {
  return null;
}

/**
 * Returns the current Date object, but only on the client side.
 * During SSR, returns null to avoid hydration mismatches.
 *
 * Uses useSyncExternalStore for proper React 18+ concurrent mode support.
 * On the server and during client hydration, returns null.
 * After mount, returns the current Date (updated every 60 seconds).
 *
 * Usage:
 * ```tsx
 * const now = useClientTime();
 * return <span>{now ? getRelativeTime(timestamp, now) : '...'}</span>;
 * ```
 */
export function useClientTime(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns true only on the client after mount.
 * Use to conditionally render time-dependent content.
 */
export function useIsClient(): boolean {
  return useClientTime() !== null;
}
