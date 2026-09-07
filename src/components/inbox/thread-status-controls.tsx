'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ConversationStatus } from '@/types';

export const STATUS_OPTIONS: {
  label: string;
  value: ConversationStatus;
  color: string;
}[] = [
  { label: 'Open', value: 'open', color: 'text-primary' },
  { label: 'Pending', value: 'pending', color: 'text-amber-400' },
  { label: 'Closed', value: 'closed', color: 'text-muted-foreground' },
];

export interface ThreadStatusControlsProps {
  status: ConversationStatus;
  onChange: (status: ConversationStatus) => void;
}

export function ThreadStatusControls({
  status,
  onChange,
}: ThreadStatusControlsProps) {
  const t = useTranslations('Inbox.messageThread');
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'hover:bg-muted inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs',
          currentStatus?.color ?? 'text-muted-foreground'
        )}
      >
        {currentStatus ? t(`status${currentStatus.label}`) : t('status')}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-popover">
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn('text-sm', opt.color)}
          >
            {t(`status${opt.label}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
