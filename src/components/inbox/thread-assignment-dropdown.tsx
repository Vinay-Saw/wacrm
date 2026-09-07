'use client';

import { useTranslations } from 'next-intl';
import { UserPlus, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PresenceDot } from '@/components/presence/presence-dot';
import { presenceLabel } from '@/lib/presence';
import { usePresence } from '@/hooks/use-presence';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

export interface ThreadAssignmentDropdownProps {
  assignedAgentId: string | null;
  profiles: Profile[];
  currentUserId?: string;
  onAssign: (agentId: string | null) => void;
}

export function ThreadAssignmentDropdown({
  assignedAgentId,
  profiles,
  currentUserId,
  onAssign,
}: ThreadAssignmentDropdownProps) {
  const t = useTranslations('Inbox.messageThread');
  const { getPresence, getRow, now } = usePresence();

  const currentAssignee = profiles.find((p) => p.user_id === assignedAgentId);
  const assignLabel = assignedAgentId
    ? (currentAssignee?.full_name ?? t('assigned'))
    : t('assign');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'hover:bg-muted inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs',
          assignedAgentId ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <UserPlus className="h-3 w-3" />
        <span className="hidden sm:inline">{assignLabel}</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-popover">
        {profiles.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground text-sm">
            {t('noTeammates')}
          </DropdownMenuItem>
        ) : (
          profiles.map((p) => {
            const isSelected = p.user_id === assignedAgentId;
            const presence = getPresence(p.user_id);
            return (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onAssign(p.user_id)}
                className={cn(
                  'text-sm',
                  isSelected ? 'text-primary' : 'text-popover-foreground'
                )}
              >
                <PresenceDot
                  status={presence}
                  label={presenceLabel(
                    presence,
                    getRow(p.user_id)?.last_seen_at ?? null,
                    now
                  )}
                  className="mr-2"
                />
                <span className="flex-1">
                  {p.full_name}
                  {p.user_id === currentUserId ? t('me') : ''}
                </span>
                {isSelected && <Check className="ml-2 h-3 w-3" />}
              </DropdownMenuItem>
            );
          })
        )}
        {assignedAgentId && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => onAssign(null)}
              className="text-muted-foreground text-sm"
            >
              {t('unassign')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
