'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazySectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Placeholder height while not yet loaded. Default: '400px' */
  minHeight?: string;
  /** IntersectionObserver rootMargin — start loading before visible. Default: '200px 0px' */
  rootMargin?: string;
  /** Render immediately without waiting for intersection (above-the-fold content). */
  eager?: boolean;
}

export function LazySection({
  children,
  className,
  id,
  minHeight = '400px',
  rootMargin = '200px 0px',
  eager = false,
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(eager);

  useEffect(() => {
    if (eager || isVisible) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, isVisible, rootMargin]);

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      style={{ minHeight: isVisible ? undefined : minHeight }}
    >
      {isVisible ? children : (
        <div
          style={{ gridColumn: '1 / -1' }}
          className="space-y-4 p-6 rounded-xl border border-slate-800/50 bg-slate-900/30"
        >
          <Skeleton className="h-5 w-1/4 bg-slate-800/60" />
          <Skeleton className="h-3 w-2/5 bg-slate-800/40" />
          <Skeleton className="h-[260px] w-full bg-slate-800/30 rounded-lg" />
        </div>
      )}
    </div>
  );
}
