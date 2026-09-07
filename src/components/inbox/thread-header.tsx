'use client';

import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Clock,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Contact, ConversationStatus, Profile } from '@/types';
import { ThreadStatusControls } from './thread-status-controls';
import { ThreadAssignmentDropdown } from './thread-assignment-dropdown';

export interface ThreadHeaderProps {
  displayName: string;
  contact: Contact;
  status: ConversationStatus;
  assignedAgentId: string | null;
  profiles: Profile[];
  currentUserId?: string;
  sessionInfo: { expired: boolean; remaining: string };
  isRefreshing: boolean;
  contactPanelOpen?: boolean;
  onBack?: () => void;
  onRefreshClick?: () => void;
  onToggleContactPanel?: () => void;
  onStatusChange: (status: ConversationStatus) => void;
  onAssignChange: (agentId: string | null) => void;
}

export function ThreadHeader({
  displayName,
  contact,
  status,
  assignedAgentId,
  profiles,
  currentUserId,
  sessionInfo,
  isRefreshing,
  contactPanelOpen,
  onBack,
  onRefreshClick,
  onToggleContactPanel,
  onStatusChange,
  onAssignChange,
}: ThreadHeaderProps) {
  const t = useTranslations('Inbox.messageThread');

  return (
    <div className="border-border bg-card flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('backToConversations')}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="bg-muted text-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-sm font-semibold">
            {displayName}
          </h2>
          <p className="text-muted-foreground truncate text-xs">
            {contact.phone}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'border-border ml-1 hidden gap-1 text-[10px] sm:ml-2 sm:inline-flex',
            sessionInfo.expired ? 'text-red-400' : 'text-primary'
          )}
        >
          <Clock className="h-3 w-3" />
          {sessionInfo.remaining}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {onToggleContactPanel && (
          <button
            type="button"
            onClick={onToggleContactPanel}
            aria-label={
              contactPanelOpen ? t('hideContactPanel') : t('showContactPanel')
            }
            title={contactPanelOpen ? t('hideContact') : t('showContact')}
            aria-pressed={contactPanelOpen}
            className={cn(
              'hover:bg-muted hover:text-foreground hidden h-7 w-7 items-center justify-center rounded-md transition-colors lg:inline-flex',
              contactPanelOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {contactPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        )}

        {onRefreshClick && (
          <button
            type="button"
            onClick={onRefreshClick}
            disabled={isRefreshing}
            aria-label={t('refreshConversation')}
            title={t('refresh')}
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
            />
          </button>
        )}

        <ThreadStatusControls status={status} onChange={onStatusChange} />

        <ThreadAssignmentDropdown
          assignedAgentId={assignedAgentId}
          profiles={profiles}
          currentUserId={currentUserId}
          onAssign={onAssignChange}
        />
      </div>
    </div>
  );
}
