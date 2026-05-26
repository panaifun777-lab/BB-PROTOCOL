'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <Card className="max-w-md w-full border-red-500/30 bg-slate-800/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="size-5" />
            应用错误
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300">
            {error.message || '发生了意外错误'}
          </p>
          <Button
            onClick={reset}
            className="w-full bg-violet-600 hover:bg-violet-500"
          >
            <RefreshCw className="mr-2 size-4" />
            重试
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
