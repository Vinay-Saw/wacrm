'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  CONVERSATION_SELECT,
  normalizeConversations,
} from '@/lib/inbox/conversations';
import type { Conversation } from '@/types';

export const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

export function useConversations(options?: { resyncToken?: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...CONVERSATIONS_QUERY_KEY, options?.resyncToken ?? 0],
    queryFn: async (): Promise<Conversation[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('conversations')
        .select(CONVERSATION_SELECT)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch conversations:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      return normalizeConversations(data ?? []);
    },
  });

  return {
    ...query,
    conversations: query.data ?? [],
    invalidate: () =>
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
  };
}
