'use client';

import { useState, useCallback, useRef } from 'react';

interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  lastError: string | null;
}

/**
 * Payment retry hook with exponential backoff.
 * On failure, creates a new payment with the same params.
 *
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in ms for exponential backoff (default: 1000)
 */
export function usePaymentRetry(maxRetries: number = 3, baseDelay: number = 1000) {
  const [state, setState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    lastError: null,
  });

  const retryAbortRef = useRef<AbortController | null>(null);

  const delay = useCallback((ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  /**
   * Retry a failed payment by creating a new payment with the same params.
   *
   * @param paymentId - The ID of the failed payment
   * @returns The new payment ID, or null if retry failed
   */
  const retryPayment = useCallback(async (paymentId: string): Promise<string | null> => {
    // Cancel any in-flight retry
    if (retryAbortRef.current) {
      retryAbortRef.current.abort();
    }
    const abortController = new AbortController();
    retryAbortRef.current = abortController;

    setState((prev) => ({
      ...prev,
      isRetrying: true,
      lastError: null,
    }));

    let currentAttempt = 0;

    while (currentAttempt < maxRetries) {
      currentAttempt++;
      const currentDelay = baseDelay * Math.pow(2, currentAttempt - 1);

      try {
        // Check if aborted
        if (abortController.signal.aborted) {
          setState((prev) => ({ ...prev, isRetrying: false }));
          return null;
        }

        // Wait for backoff delay
        await delay(currentDelay);

        // 1. Get the current payment status
        const statusRes = await fetch(`/api/payment/${paymentId}`, {
          signal: abortController.signal,
        });

        if (!statusRes.ok) {
          throw new Error('Failed to fetch payment status');
        }

        const existingPayment = await statusRes.json();

        // Only retry if the payment is in failed status
        if (existingPayment.status !== 'failed') {
          setState((prev) => ({
            ...prev,
            isRetrying: false,
            retryCount: currentAttempt,
            lastError: null,
          }));
          return existingPayment.id;
        }

        // 2. Create a new payment with the same params
        const createRes = await fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            avatarId: existingPayment.avatarId,
            serviceName: existingPayment.serviceName,
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            gasFee: existingPayment.gasFee,
            riskLevel: existingPayment.riskLevel,
          }),
          signal: abortController.signal,
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to create retry payment');
        }

        const newPayment = await createRes.json();

        // Show toast on retry attempt
        import('sonner').then(({ toast }) => {
          toast.info(`Payment retry attempt ${currentAttempt}/${maxRetries}`, {
            description: `New payment created: ${newPayment.id?.slice(0, 8)}...`,
            duration: 4000,
          });
        });

        setState((prev) => ({
          ...prev,
          isRetrying: false,
          retryCount: currentAttempt,
          lastError: null,
        }));

        return newPayment.id;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Retry failed';

        // If aborted, stop retrying
        if (abortController.signal.aborted) {
          setState((prev) => ({ ...prev, isRetrying: false }));
          return null;
        }

        setState((prev) => ({
          ...prev,
          retryCount: currentAttempt,
          lastError: errorMsg,
        }));

        // Show retry failure toast
        import('sonner').then(({ toast }) => {
          toast.error(`Retry attempt ${currentAttempt}/${maxRetries} failed`, {
            description: errorMsg,
            duration: 4000,
          });
        });

        // If we've exhausted retries, stop
        if (currentAttempt >= maxRetries) {
          setState((prev) => ({ ...prev, isRetrying: false }));
          return null;
        }
      }
    }

    setState((prev) => ({ ...prev, isRetrying: false }));
    return null;
  }, [maxRetries, baseDelay, delay]);

  const resetRetry = useCallback(() => {
    if (retryAbortRef.current) {
      retryAbortRef.current.abort();
    }
    setState({
      retryCount: 0,
      isRetrying: false,
      lastError: null,
    });
  }, []);

  return {
    retryPayment,
    retryCount: state.retryCount,
    isRetrying: state.isRetrying,
    lastError: state.lastError,
    resetRetry,
  };
}
