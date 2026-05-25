'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  DollarSign,
  Activity,
  Sparkles,
  ShieldAlert,
  Info,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────
interface Notification {
  id: string;
  type: 'resonance' | 'revenue' | 'skill' | 'circuit' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// ── Mock Data ──────────────────────────────────────────
const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'revenue', title: '收到新收益', message: 'GPT-4o技能调用收入 $45.20', timestamp: '2026-03-04T14:32:18Z', read: false },
  { id: 'n2', type: 'resonance', title: '共振分更新', message: '共振分从68上升至72 (+4)', timestamp: '2026-03-04T09:08:11Z', read: false },
  { id: 'n3', type: 'skill', title: '技能解锁', message: '知识图谱构建已解锁 (累计收益$500+)', timestamp: '2026-02-15T16:00:00Z', read: true },
  { id: 'n4', type: 'circuit', title: '状态恢复', message: '认知状态从SOFT_LIMIT恢复至NORMAL', timestamp: '2026-03-02T08:00:00Z', read: true },
  { id: 'n5', type: 'system', title: '系统通知', message: 'AFC金库自动回购完成，当前余额 $1,245.80', timestamp: '2026-03-04T06:00:00Z', read: true },
];

// ── Notification type config ───────────────────────────
type NotificationType = Notification['type'];

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; iconColor: string; iconBg: string }
> = {
  revenue: {
    icon: DollarSign,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-400/10',
  },
  resonance: {
    icon: Activity,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-400/10',
  },
  skill: {
    icon: Sparkles,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-400/10',
  },
  circuit: {
    icon: ShieldAlert,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-400/10',
  },
  system: {
    icon: Info,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-400/10',
  },
};

// ── Relative time helper ───────────────────────────────
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHr < 24) return `${diffHr}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// ── Single Notification Item ───────────────────────────
function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notification.type];
  const IconComp = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex items-start gap-3 rounded-lg p-3 transition-colors',
        notification.read
          ? 'hover:bg-slate-700/30'
          : 'bg-slate-700/20 hover:bg-slate-700/40'
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-violet-400" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          config.iconBg
        )}
      >
        <IconComp className={cn('size-4', config.iconColor)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'truncate text-xs font-medium',
              notification.read ? 'text-slate-300' : 'text-slate-100'
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-[10px] text-slate-500">
            {getRelativeTime(notification.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
          {notification.message}
        </p>
      </div>

      {/* Mark as read button (only for unread) */}
      {!notification.read && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-slate-600/50"
          title="标为已读"
        >
          <Check className="size-3.5 text-slate-400 hover:text-slate-200" />
        </button>
      )}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-slate-800">
          <Bell className="size-4.5 text-slate-400 hover:text-slate-200 transition-colors" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] border-slate-700 bg-[#1E293B] p-0 shadow-xl shadow-black/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-slate-100">通知</h3>
            {unreadCount > 0 && (
              <Badge
                variant="outline"
                className="border-violet-500/30 bg-violet-500/10 text-[10px] text-violet-300"
              >
                {unreadCount} 未读
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              onClick={handleMarkAllRead}
            >
              <Check className="mr-1 size-3" />
              全部标为已读
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            <AnimatePresence>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </AnimatePresence>

            {notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Bell className="size-6 text-slate-600" />
                <p className="text-xs text-slate-500">暂无通知</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator className="bg-slate-700/50" />
            <div className="px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[11px] text-slate-400 hover:text-violet-300 hover:bg-slate-700/30"
                onClick={() => setIsOpen(false)}
              >
                查看全部通知
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export type { Notification };
