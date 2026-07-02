'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PaymentData {
  id: string;
  avatarId: string;
  serviceName: string;
  amount: number;
  currency: string;
  gasFee: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string | null;
  createdAt: string;
}

interface UsePaymentPollingResult {
  status: PaymentData['status'] | null;
  payment: PaymentData | null;
  isPolling: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 20; // 60 seconds total

/**
 * Polls payment status at /api/payment/[paymentId] every 3 seconds.
 * Stops when status is no longer 'pending', or after MAX_POLL_ATTEMPTS.
 */
export function usePaymentPolling(
  paymentId: string | null,
  enabled: boolean = false,
): UsePaymentPollingResult {
  const [status, setStatus] = useState<PaymentData['status'] | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mountedRef.current) {
      setIsPolling(false);
    }
  }, []);

  const pollPayment = useCallback(async () => {
    if (!paymentId) return;

    try {
      const res = await fetch(`/api/payment/${paymentId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch payment: ${res.status}`);
      }
      const data: PaymentData = await res.json();

      if (mountedRef.current) {
        setPayment(data);
        setStatus(data.status);
        setError(null);
      }

      // Stop polling if no longer pending
      if (data.status !== 'pending') {
        stopPolling();
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Polling error');
      }
    }
  }, [paymentId, stopPolling]);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !paymentId) {
      stopPolling();
      return;
    }

    // Reset state for a new polling session
    setStatus(null);
    setPayment(null);
    setError(null);
    setIsPolling(true);
    attemptsRef.current = 0;

    // Immediately fetch once
    pollPayment();
    attemptsRef.current += 1;

    // Set up interval polling
    intervalRef.current = setInterval(() => {
      attemptsRef.current += 1;

      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        if (mountedRef.current) {
          setError('Polling timed out after 60 seconds');
        }
        return;
      }

      pollPayment();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [enabled, paymentId, pollPayment, stopPolling]);

  return { status, payment, isPolling, error };
}
