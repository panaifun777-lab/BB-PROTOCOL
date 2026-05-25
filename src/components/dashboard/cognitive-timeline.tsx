'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  DollarSign,
  Brain,
  Activity,
  ArrowRightLeft,
  ShieldAlert,
  Download,
  Filter,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { TimelineEvent } from '@/lib/types';

// ===== Event type configuration =====
interface EventTypeConfig {
  icon: React.ElementType;
  color: string;         // Tailwind text color class
  bgColor: string;       // Tailwind bg class for dot
  borderColor: string;   // Tailwind border class for dot ring
  label: string;
  emoji: string;
}

const EVENT_TYPE_CONFIG: Record<TimelineEvent['eventType'], EventTypeConfig> = {
  revenue_received: {
    icon: DollarSign,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/40',
    label: '收益',
    emoji: '💰',
  },
  skill_invocation: {
    icon: Brain,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500',
    borderColor: 'border-purple-500/40',
    label: '技能',
    emoji: '🧠',
  },
  resonance_update: {
    icon: Activity,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500/40',
    label: '共振',
    emoji: '📊',
  },
  delegation_change: {
    icon: ArrowRightLeft,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500/40',
    label: '委托',
    emoji: '🔄',
  },
  circuit_change: {
    icon: ShieldAlert,
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500/40',
    label: '熔断',
    emoji: '⚠️',
  },
};

// ===== Filter tabs =====
type FilterKey = 'all' | 'revenue' | 'skill' | 'delegation' | 'circuit';

const FILTER_MAP: Record<FilterKey, TimelineEvent['eventType'] | null> = {
  all: null,
  revenue: 'revenue_received',
  skill: 'skill_invocation',
  delegation: 'delegation_change',
  circuit: 'circuit_change',
};

const FILTER_LABELS: Record<FilterKey, string> = {
  all: '全部',
  revenue: '收益',
  skill: '技能',
  delegation: '委托',
  circuit: '熔断',
};

// ===== Individual timeline event =====
function TimelineEventCard({ event, index }: { event: TimelineEvent; index: number }) {
  const config = EVENT_TYPE_CONFIG[event.eventType];
  const IconComponent = config.icon;

  const formatTimestamp = (iso: string) => {
    try {
      return format(parseISO(iso), 'yyyy-MM-dd HH:mm:ss');
    } catch {
      return iso;
    }
  };

  const truncateHash = (hash: string) => {
    if (hash.length <= 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
      className="group relative flex gap-4"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <div
          className={cn(
            'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2',
            config.borderColor,
            'bg-slate-800'
          )}
        >
          <div
            className={cn(
              'flex size-4 items-center justify-center rounded-full',
              config.bgColor
            )}
          >
            <IconComponent className="size-2.5 text-white" />
          </div>
        </div>
        {/* Connecting line */}
        <div className="w-px flex-1 bg-slate-700/50" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-6">
        {/* Timestamp */}
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-500">
            {formatTimestamp(event.createdAt)}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'h-5 border px-1.5 text-[10px]',
              config.borderColor,
              config.color
            )}
          >
            {config.emoji} {config.label}
          </Badge>
        </div>

        {/* Description */}
        <p className={cn('text-sm font-medium', config.color)}>
          {event.emoji ?? ''} {event.details}
        </p>

        {/* Amount (for revenue events) */}
        {event.amount != null && (
          <p className="mt-0.5 text-xs text-slate-400">
            金额: <span className="font-medium text-emerald-400">${event.amount.toFixed(2)}</span>
          </p>
        )}

        {/* Transaction / IPFS links */}
        {(event.txHash || event.ipfsHash) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {event.txHash && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[11px] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
                onClick={() =>
                  console.log('View tx:', event.txHash)
                }
              >
                <ExternalLink className="size-3" />
                <span className="font-mono">{truncateHash(event.txHash)}</span>
              </button>
            )}
            {event.ipfsHash && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[11px] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
                onClick={() =>
                  console.log('View IPFS:', event.ipfsHash)
                }
              >
                <FileText className="size-3" />
                <span className="font-mono">{truncateHash(event.ipfsHash)}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===== Main CognitiveTimeline Component =====
interface CognitiveTimelineProps {
  events: TimelineEvent[];
}

export default function CognitiveTimeline({ events }: CognitiveTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filteredEvents = useMemo(() => {
    const eventType = FILTER_MAP[activeFilter];
    if (!eventType) return events;
    return events.filter((e) => e.eventType === eventType);
  }, [events, activeFilter]);

  // Sort by date descending (most recent first)
  const sortedEvents = useMemo(
    () =>
      [...filteredEvents].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [filteredEvents]
  );

  return (
    <Card className="border-slate-700/50 bg-slate-800/80 text-slate-100 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="size-5 text-blue-400" />
            认知时间线
          </CardTitle>
          <Badge
            variant="outline"
            className="border-slate-600 bg-slate-700/50 text-xs text-slate-300"
          >
            {events.length} 条记录
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Filter tabs */}
        <Tabs
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as FilterKey)}
          className="mb-4 w-full"
        >
          <TabsList className="h-8 w-full bg-slate-900/80 p-0.5 sm:w-auto">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => {
              const config =
                key !== 'all'
                  ? EVENT_TYPE_CONFIG[FILTER_MAP[key]!]
                  : null;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={cn(
                    'h-7 px-2.5 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100',
                    config && `data-[state=active]:${config.color}`
                  )}
                >
                  {config ? config.emoji : null} {FILTER_LABELS[key]}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Timeline */}
        <ScrollArea className="max-h-96">
          <div className="pr-4">
            <AnimatePresence mode="popLayout">
              {sortedEvents.map((event, index) => (
                <TimelineEventCard
                  key={event.id}
                  event={event}
                  index={index}
                />
              ))}
            </AnimatePresence>

            {sortedEvents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 text-center text-sm text-slate-500"
              >
                该筛选条件下暂无事件记录
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="gap-2 border-t border-slate-700/50 pt-4">
        <Button
          variant="outline"
          size="sm"
          className="border-slate-600 bg-slate-800 text-xs text-slate-300 hover:border-slate-500 hover:bg-slate-700"
          onClick={() => {
            // Placeholder: export all records
            const data = JSON.stringify(events, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cognitive-timeline-${format(new Date(), 'yyyy-MM-dd')}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="mr-1 size-3.5" />
          导出全部记录
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          <Activity className="mr-1 size-3.5" />
          订阅更新
        </Button>
      </CardFooter>
    </Card>
  );
}
