'use client';

import { useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────
export type PaymentEventType =
  | 'payment_initiated'
  | 'payment_method_selected'
  | 'payment_submitted'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_retried';

export interface PaymentEvent {
  type: PaymentEventType;
  timestamp: number;
  method?: 'x402' | 'stripe' | 'subscription';
  paymentId?: string;
  amount?: number;
  metadata?: Record<string, string>;
}

const STORAGE_KEY = 'bb_payment_events';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Helpers ───────────────────────────────────────────────────

function loadEvents(): PaymentEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const events: PaymentEvent[] = JSON.parse(raw);
    // Auto-clean events older than 30 days
    const cutoff = Date.now() - MAX_AGE_MS;
    const filtered = events.filter((e) => e.timestamp >= cutoff);
    if (filtered.length !== events.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

function saveEvents(events: PaymentEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // localStorage might be full or unavailable
  }
}

// ── Hook ──────────────────────────────────────────────────────

export function useConversionTracking() {
  const eventsRef = useRef<PaymentEvent[]>([]);

  // Load events lazily
  const getEvents = useCallback((): PaymentEvent[] => {
    if (eventsRef.current.length === 0) {
      eventsRef.current = loadEvents();
    }
    return eventsRef.current;
  }, []);

  // Track a payment conversion funnel event
  const trackEvent = useCallback(
    (type: PaymentEventType, data?: { method?: 'x402' | 'stripe' | 'subscription'; paymentId?: string; amount?: number; metadata?: Record<string, string> }) => {
      const event: PaymentEvent = {
        type,
        timestamp: Date.now(),
        method: data?.method,
        paymentId: data?.paymentId,
        amount: data?.amount,
        metadata: data?.metadata,
      };
      const events = getEvents();
      events.push(event);
      saveEvents(events);
      eventsRef.current = events;
    },
    [getEvents],
  );

  // Get conversion rate: completed / initiated
  const getConversionRate = useCallback((): number => {
    const events = getEvents();
    const initiated = events.filter((e) => e.type === 'payment_initiated').length;
    const completed = events.filter((e) => e.type === 'payment_completed').length;
    if (initiated === 0) return 0;
    return Math.round((completed / initiated) * 10000) / 100; // percentage with 2 decimals
  }, [getEvents]);

  // Get method preference: percentage breakdown
  const getMethodPreference = useCallback((): { x402: number; stripe: number; subscription: number } => {
    const events = getEvents();
    const methodEvents = events.filter((e) => e.type === 'payment_method_selected' && e.method);
    const total = methodEvents.length;
    if (total === 0) return { x402: 0, stripe: 0, subscription: 0 };
    const x402 = methodEvents.filter((e) => e.method === 'x402').length;
    const stripe = methodEvents.filter((e) => e.method === 'stripe').length;
    const subscription = methodEvents.filter((e) => e.method === 'subscription').length;
    return {
      x402: Math.round((x402 / total) * 10000) / 100,
      stripe: Math.round((stripe / total) * 10000) / 100,
      subscription: Math.round((subscription / total) * 10000) / 100,
    };
  }, [getEvents]);

  // Get average completion time (from initiated to completed) in seconds
  const getAverageCompletionTime = useCallback((): number => {
    const events = getEvents();
    const initiatedEvents = events.filter((e) => e.type === 'payment_initiated');
    const completedEvents = events.filter((e) => e.type === 'payment_completed');

    if (initiatedEvents.length === 0 || completedEvents.length === 0) return 0;

    // Match initiated and completed events by paymentId
    const durations: number[] = [];
    for (const completed of completedEvents) {
      if (!completed.paymentId) continue;
      const initiated = initiatedEvents.find(
        (e) => e.paymentId === completed.paymentId && e.timestamp < completed.timestamp,
      );
      if (initiated) {
        durations.push((completed.timestamp - initiated.timestamp) / 1000); // seconds
      }
    }

    if (durations.length === 0) return 0;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return Math.round(avg * 100) / 100;
  }, [getEvents]);

  // Get full event log
  const getEventLog = useCallback((): PaymentEvent[] => {
    return getEvents().slice().sort((a, b) => b.timestamp - a.timestamp);
  }, [getEvents]);

  return {
    trackEvent,
    getConversionRate,
    getMethodPreference,
    getAverageCompletionTime,
    getEventLog,
  };
}
