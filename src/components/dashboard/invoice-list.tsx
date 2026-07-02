'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Plus,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────
interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceRecord {
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

// ── Status badge config ────────────────────────────────
function getStatusConfig(status: string, t: (key: string) => string) {
  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: t('invoice.statusDraft'),
      className: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
    },
    issued: {
      label: t('invoice.statusIssued'),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    },
    paid: {
      label: t('invoice.statusPaid'),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    },
    void: {
      label: t('invoice.statusVoid'),
      className: 'border-red-500/30 bg-red-500/10 text-red-400',
    },
    uncollectible: {
      label: t('invoice.statusUncollectible'),
      className: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
    },
  };
  return config[status] || config.draft;
}

// ── Component ──────────────────────────────────────────
export default function InvoiceList() {
  const { t } = useI18n();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch invoices ───────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ avatarId: 'default' });
      if (filter !== 'all') params.set('status', filter);
      const res = await fetch(`/api/invoice?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : data.invoices || []);
      }
    } catch {
      setError(t('invoice.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ── Generate invoice ─────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId: 'default', paymentId: 'latest' }),
      });
      if (!res.ok) throw new Error('Failed to generate invoice');
      await fetchInvoices();
    } catch {
      setError(t('invoice.generateError'));
    } finally {
      setGenerating(false);
    }
  }, [fetchInvoices, t]);

  // ── Download PDF ─────────────────────────────────────
  const handleDownload = useCallback((invoice: InvoiceRecord) => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    }
  }, []);

  // ── Toggle expand ────────────────────────────────────
  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Receipt className="w-5 h-5 text-violet-400" />
            {t('invoice.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchInvoices}
              className="text-slate-400 hover:text-slate-200"
              aria-label={t('common.refresh')}
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 text-white hover:bg-violet-500"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1" />
              )}
              {t('invoice.generate')}
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-500">{t('common.filter')}:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-7 w-[130px] text-xs border-slate-700 bg-slate-900/60 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              <SelectItem value="all" className="text-xs text-slate-300">{t('common.all')}</SelectItem>
              <SelectItem value="draft" className="text-xs text-slate-300">{t('invoice.statusDraft')}</SelectItem>
              <SelectItem value="issued" className="text-xs text-slate-300">{t('invoice.statusIssued')}</SelectItem>
              <SelectItem value="paid" className="text-xs text-slate-300">{t('invoice.statusPaid')}</SelectItem>
              <SelectItem value="void" className="text-xs text-slate-300">{t('invoice.statusVoid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            {t('invoice.noInvoices')}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {invoices.map((invoice, idx) => {
              const statusCfg = getStatusConfig(invoice.status, t);
              const isExpanded = expandedId === invoice.id;
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-lg border border-slate-700/30 bg-slate-900/40 overflow-hidden"
                >
                  {/* Header row */}
                  <button
                    onClick={() => toggleExpand(invoice.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-900/60 transition-colors text-left"
                    aria-label={`${t('invoice.invoiceNumber')} ${invoice.invoiceNumber}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="text-sm text-slate-200 font-medium">
                          #{invoice.invoiceNumber}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {format(new Date(invoice.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-200">
                          ${invoice.amount.toFixed(2)} {invoice.currency.toUpperCase()}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-700/30 p-3 space-y-3">
                          {/* Line items */}
                          {invoice.lineItems && invoice.lineItems.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                                {t('invoice.lineItems')}
                              </p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="text-left font-normal">{t('invoice.description')}</th>
                                    <th className="text-right font-normal w-14">{t('invoice.qty')}</th>
                                    <th className="text-right font-normal w-20">{t('invoice.unitPrice')}</th>
                                    <th className="text-right font-normal w-16">{t('invoice.total')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoice.lineItems.map((item, i) => (
                                    <tr key={i} className="text-slate-300">
                                      <td className="py-0.5">{item.description}</td>
                                      <td className="text-right py-0.5">{item.quantity}</td>
                                      <td className="text-right py-0.5">${item.unitPrice.toFixed(2)}</td>
                                      <td className="text-right py-0.5">${item.total.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Tax & discount */}
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{t('invoice.tax')}: ${invoice.tax.toFixed(2)}</span>
                            {invoice.discount > 0 && (
                              <span className="text-emerald-400">
                                {t('invoice.discount')}: -${invoice.discount.toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                              onClick={() => handleDownload(invoice)}
                              disabled={!invoice.pdfUrl}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              {t('invoice.downloadPdf')}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
