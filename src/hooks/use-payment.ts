'use client';

import { useState, useCallback } from 'react';
import { useDynamicSplitter } from '@/hooks/use-web3';

export interface PaymentRecord {
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

export interface PaymentStats {
  totalAmount: number;
  confirmed: number;
  pending: number;
  failed: number;
}

export interface PaymentHistoryResult {
  payments: PaymentRecord[];
  total: number;
  page: number;
  totalPages: number;
  stats: PaymentStats;
}

export type PaymentMethod = 'x402' | 'stripe';

export interface PaymentState {
  isProcessing: boolean;
  currentPayment: PaymentRecord | null;
  error: string | null;
  splitConfig: {
    humanBps: number;
    avatarBps: number;
    protocolBps: number;
  };
}

// ── New types for subscriptions, usage, invoices, currency ──

export interface SubscriptionRecord {
  id: string;
  avatarId: string;
  tier: 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  apiCallsUsed: number;
  apiCallsLimit: number;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface UsageRecord {
  serviceType: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface UsageSummary {
  avatarId: string;
  billingPeriod: string;
  periodStart: string;
  periodEnd: string;
  usage: UsageRecord[];
  totalUnbilled: number;
  projectedMonthly: number;
  tierLimits: Record<string, number>;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  avatarId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'void' | 'uncollectible';
  date: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  tax: number;
  discount: number;
  pdfUrl: string | null;
  paymentId: string | null;
  createdAt: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

const DEFAULT_SPLIT = { humanBps: 7000, avatarBps: 2000, protocolBps: 1000 };

export function usePayment(avatarId: string = 'default') {
  const { splitConfig } = useDynamicSplitter();
  const [state, setState] = useState<PaymentState>({
    isProcessing: false,
    currentPayment: null,
    error: null,
    splitConfig: splitConfig ? { humanBps: splitConfig.humanBps, avatarBps: splitConfig.avatarBps, protocolBps: splitConfig.protocolBps } : DEFAULT_SPLIT,
  });

  // Create payment
  const createPayment = useCallback(async (serviceName: string, amount: number, method: PaymentMethod = 'x402') => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const gasFee = amount * 0.05;
      const riskLevel = amount <= 0.05 ? 'low' : amount <= 0.5 ? 'medium' : 'high';
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, serviceName, amount, currency: method === 'stripe' ? 'USD' : 'USDC', gasFee, riskLevel }),
      });
      if (!res.ok) throw new Error('Failed to create payment');
      const payment = await res.json();
      setState(prev => ({ ...prev, currentPayment: payment, isProcessing: false }));
      return payment;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      setState(prev => ({ ...prev, error: errorMsg, isProcessing: false }));
      throw err;
    }
  }, [avatarId]);

  // Confirm payment with tx hash
  const confirmPayment = useCallback(async (paymentId: string, txHash: string) => {
    try {
      const res = await fetch(`/api/payment/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', txHash }),
      });
      if (!res.ok) throw new Error('Failed to confirm payment');
      const payment = await res.json();
      setState(prev => ({ ...prev, currentPayment: payment }));
      return payment;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Confirm failed';
      setState(prev => ({ ...prev, error: errorMsg }));
      throw err;
    }
  }, []);

  // Fail payment
  const failPayment = useCallback(async (paymentId: string) => {
    try {
      const res = await fetch(`/api/payment/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed' }),
      });
      if (!res.ok) throw new Error('Failed to update payment');
      const payment = await res.json();
      setState(prev => ({ ...prev, currentPayment: payment }));
      return payment;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Update failed' }));
      throw err;
    }
  }, []);

  // Get payment history
  const getHistory = useCallback(async (page: number = 1, status?: string) => {
    const params = new URLSearchParams({ avatarId, page: String(page), limit: '20' });
    if (status) params.set('status', status);
    const res = await fetch(`/api/payment/history?${params}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json() as Promise<PaymentHistoryResult>;
  }, [avatarId]);

  // Get payment status (for polling)
  const getPaymentStatus = useCallback(async (paymentId: string) => {
    const res = await fetch(`/api/payment/${paymentId}`);
    if (!res.ok) throw new Error('Failed to fetch payment');
    const payment = await res.json();
    setState(prev => ({ ...prev, currentPayment: payment }));
    return payment;
  }, []);

  // Calculate split amounts
  const calculateSplit = useCallback((totalAmount: number) => {
    const { humanBps, avatarBps, protocolBps } = state.splitConfig;
    return {
      human: totalAmount * humanBps / 10000,
      avatar: totalAmount * avatarBps / 10000,
      protocol: totalAmount * protocolBps / 10000,
      humanPercent: humanBps / 100,
      avatarPercent: avatarBps / 100,
      protocolPercent: protocolBps / 100,
    };
  }, [state.splitConfig]);

  // ── Subscription methods ──────────────────────────────

  const createSubscription = useCallback(async (tier: string) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, tier }),
      });
      if (!res.ok) throw new Error('Failed to create subscription');
      const subscription = await res.json();
      setState(prev => ({ ...prev, isProcessing: false }));
      return subscription as SubscriptionRecord;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Subscription failed';
      setState(prev => ({ ...prev, error: errorMsg, isProcessing: false }));
      throw err;
    }
  }, [avatarId]);

  const cancelSubscription = useCallback(async (subscriptionId: string) => {
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, action: 'cancel' }),
      });
      if (!res.ok) throw new Error('Failed to cancel subscription');
      return res.json() as Promise<SubscriptionRecord>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Cancel failed' }));
      throw err;
    }
  }, []);

  const reactivateSubscription = useCallback(async (subscriptionId: string) => {
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, action: 'reactivate' }),
      });
      if (!res.ok) throw new Error('Failed to reactivate subscription');
      return res.json() as Promise<SubscriptionRecord>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Reactivate failed' }));
      throw err;
    }
  }, []);

  const getSubscriptions = useCallback(async () => {
    try {
      const res = await fetch(`/api/stripe/subscription?avatarId=${avatarId}`);
      if (!res.ok) throw new Error('Failed to fetch subscriptions');
      return res.json() as Promise<SubscriptionRecord[]>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Fetch failed' }));
      throw err;
    }
  }, [avatarId]);

  // ── Usage methods ─────────────────────────────────────

  const reportUsage = useCallback(async (serviceType: string, quantity: number) => {
    try {
      const res = await fetch('/api/stripe/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, serviceType, quantity }),
      });
      if (!res.ok) throw new Error('Failed to report usage');
      return res.json();
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Usage report failed' }));
      throw err;
    }
  }, [avatarId]);

  const getUsageSummary = useCallback(async (billingPeriod?: string) => {
    try {
      const params = new URLSearchParams({ avatarId });
      if (billingPeriod) params.set('billingPeriod', billingPeriod);
      const res = await fetch(`/api/stripe/usage?${params}`);
      if (!res.ok) throw new Error('Failed to fetch usage');
      return res.json() as Promise<UsageSummary>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Fetch failed' }));
      throw err;
    }
  }, [avatarId]);

  // ── Invoice methods ───────────────────────────────────

  const getInvoices = useCallback(async (status?: string) => {
    try {
      const params = new URLSearchParams({ avatarId });
      if (status) params.set('status', status);
      const res = await fetch(`/api/invoice?${params}`);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json() as Promise<InvoiceRecord[]>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Fetch failed' }));
      throw err;
    }
  }, [avatarId]);

  const generateInvoice = useCallback(async (paymentId: string) => {
    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId, paymentId }),
      });
      if (!res.ok) throw new Error('Failed to generate invoice');
      return res.json() as Promise<InvoiceRecord>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Invoice generation failed' }));
      throw err;
    }
  }, [avatarId]);

  // ── Currency methods ──────────────────────────────────

  const getCurrencies = useCallback(async () => {
    try {
      const res = await fetch('/api/currency');
      if (!res.ok) throw new Error('Failed to fetch currencies');
      return res.json() as Promise<CurrencyInfo[]>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Fetch failed' }));
      throw err;
    }
  }, []);

  const convertCurrency = useCallback(async (amount: number, from: string, to: string) => {
    try {
      const res = await fetch('/api/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, from, to }),
      });
      if (!res.ok) throw new Error('Failed to convert currency');
      return res.json() as Promise<{ amount: number; rate: number; from: string; to: string }>;
    } catch (err) {
      setState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Conversion failed' }));
      throw err;
    }
  }, []);

  return {
    ...state,
    createPayment,
    confirmPayment,
    failPayment,
    getHistory,
    getPaymentStatus,
    calculateSplit,
    createSubscription,
    cancelSubscription,
    reactivateSubscription,
    getSubscriptions,
    reportUsage,
    getUsageSummary,
    getInvoices,
    generateInvoice,
    getCurrencies,
    convertCurrency,
  };
}
