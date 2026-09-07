'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '@/types';

export const messagesQueryKey = (conversationId: string | null | undefined) =>
  ['messages', conversationId] as const;

export function useMessages(
  conversationId: string | null | undefined,
  options?: { resyncToken?: number }
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...messagesQueryKey(conversationId), options?.resyncToken ?? 0],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages:', error);
        throw error;
      }

      return (data as Message[]) ?? [];
    },
    enabled: Boolean(conversationId),
  });

  return {
    ...query,
    messages: query.data ?? [],
    invalidate: () =>
      conversationId
        ? queryClient.invalidateQueries({
            queryKey: messagesQueryKey(conversationId),
          })
        : Promise.resolve(),
  };
}
