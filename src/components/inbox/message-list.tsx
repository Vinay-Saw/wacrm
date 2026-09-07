'use client';

import { useMemo, type RefObject } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useTranslations } from 'next-intl';
import type { Contact, Message, MessageReaction } from '@/types';
import { MessageBubble } from './message-bubble';
import { MessageActions } from './message-actions';
import { buildReplyPreview } from './reply-quote';

export interface MessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  messages: Message[];
  contact: Contact | null;
  currentUserId?: string;
  reactionsByMessageId: Map<string, MessageReaction[]>;
  onStartReply: (message: Message) => void;
  onPostReaction: (messageId: string, emoji: string) => Promise<void>;
  onOpenMedia: (messageId: string | null) => void;
}

function formatDateSeparator(
  dateStr: string,
  t: ReturnType<typeof useTranslations>
): string {
  const date = new Date(dateStr);
  if (isToday(date)) return t('today');
  if (isYesterday(date)) return t('yesterday');
  return format(date, 'MMMM d, yyyy');
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    const day = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (day !== currentDate) {
      currentDate = day;
      groups.push({ date: msg.created_at, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return groups;
}

export function MessageList({
  scrollRef,
  loading,
  messages,
  contact,
  currentUserId,
  reactionsByMessageId,
  onStartReply,
  onPostReaction,
  onOpenMedia,
}: MessageListProps) {
  const t = useTranslations('Inbox.messageThread');
  const tQuote = useTranslations('Inbox.replyQuote');

  const messageGroups = useMemo(
    () => groupMessagesByDate(messages),
    [messages]
  );

  const messagesById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar flex-1 [scrollbar-width:none] overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">{t('noMessagesYet')}</p>
          <p className="text-muted-foreground text-xs">
            {t('sendTemplateHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messageGroups.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="mb-4 flex items-center justify-center">
                <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-[10px] font-medium">
                  {formatDateSeparator(group.date, t)}
                </span>
              </div>
              {/* Messages */}
              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const parent = msg.reply_to_message_id
                    ? messagesById.get(msg.reply_to_message_id)
                    : null;
                  const reply = parent
                    ? {
                        authorLabel:
                          parent.sender_type === 'agent' ||
                          parent.sender_type === 'bot'
                            ? t('me')
                            : contact?.name || contact?.phone || 'Unknown',
                        preview: buildReplyPreview(parent, tQuote),
                      }
                    : null;
                  const msgReactions = reactionsByMessageId.get(msg.id);

                  const handlePillToggle = (emoji: string) => {
                    const own = msgReactions?.find(
                      (r) =>
                        r.actor_type === 'agent' && r.actor_id === currentUserId
                    );
                    const next = own?.emoji === emoji ? '' : emoji;
                    void onPostReaction(msg.id, next);
                  };

                  return (
                    <MessageActions
                      key={msg.id}
                      message={msg}
                      onReply={() => onStartReply(msg)}
                      onReact={(emoji) => {
                        if (emoji) void onPostReaction(msg.id, emoji);
                      }}
                    >
                      <MessageBubble
                        message={msg}
                        reply={reply}
                        reactions={msgReactions}
                        currentUserId={currentUserId}
                        onToggleReaction={handlePillToggle}
                        onOpenMedia={onOpenMedia}
                      />
                    </MessageActions>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
