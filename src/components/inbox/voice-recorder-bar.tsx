'use client';

import { useTranslations } from 'next-intl';
import { Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VoiceRecorderBarProps {
  recordSeconds: number;
  maxSeconds: number;
  onCancel: () => void;
  onStop: () => void;
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceRecorderBar({
  recordSeconds,
  maxSeconds,
  onCancel,
  onStop,
}: VoiceRecorderBarProps) {
  const t = useTranslations('Inbox.composer');

  return (
    <div className="border-border bg-muted flex items-center gap-3 rounded-xl border px-4 py-2.5">
      <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
      <span className="text-foreground flex-1 text-sm">
        {t('recording', {
          current: formatDuration(recordSeconds),
          max: formatDuration(maxSeconds),
        })}
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="text-muted-foreground hover:bg-card hover:text-foreground rounded-md px-2 py-1 text-xs"
      >
        {t('cancel')}
      </button>
      <Button
        size="sm"
        onClick={onStop}
        className="bg-primary hover:bg-primary/90 h-9 w-9 shrink-0 p-0"
        title={t('stopAndAttach')}
      >
        <Square className="h-4 w-4" />
      </Button>
    </div>
  );
}
