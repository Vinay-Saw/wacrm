import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Contact, Tag } from '@/types';

export interface ContactWithTags extends Contact {
  tags?: Tag[];
}

export interface UseContactsParams {
  page: number;
  pageSize?: number;
  search?: string;
  selectedTagIds?: string[];
  tagsMap?: Record<string, Tag>;
}

export interface ContactsRawQueryResult {
  contactRows: Contact[];
  tagsByContact: Record<string, string[]>;
  totalCount: number;
}

export const contactsQueryKey = (params: Omit<UseContactsParams, 'tagsMap'>) =>
  [
    'contacts',
    params.page,
    params.pageSize ?? 25,
    params.search ?? '',
    params.selectedTagIds ?? [],
  ] as const;

export function useContacts({
  page,
  pageSize = 25,
  search = '',
  selectedTagIds = [],
  tagsMap = {},
}: UseContactsParams) {
  const queryClient = useQueryClient();
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const term = search.trim();

  const query = useQuery({
    queryKey: contactsQueryKey({
      page,
      pageSize,
      search: term,
      selectedTagIds,
    }),
    queryFn: async (): Promise<ContactsRawQueryResult> => {
      const supabase = createClient();
      let contactRows: Contact[];
      let count: number;

      if (selectedTagIds.length > 0) {
        const { data, error } = await supabase.rpc('filter_contacts_by_tags', {
          p_tag_ids: selectedTagIds,
          p_search: term || null,
          p_limit: pageSize,
          p_offset: from,
        });
        if (error) throw error;
        const rows = (data ?? []) as {
          contact: Contact;
          total_count: number;
        }[];
        contactRows = rows.map((r) => r.contact);
        count = rows.length > 0 ? Number(rows[0].total_count) : 0;
      } else {
        let q = supabase
          .from('contacts')
          .select('*, company_relation:companies(*)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);

        if (term) {
          const like = `%${term}%`;
          q = q.or(
            `name.ilike.${like},phone.ilike.${like},email.ilike.${like}`
          );
        }

        const { data, count: exactCount, error } = await q;
        if (error) throw error;
        contactRows = (data as Contact[]) ?? [];
        count = exactCount ?? 0;
      }

      if (contactRows.length === 0) {
        return { contactRows: [], tagsByContact: {}, totalCount: count };
      }

      const contactIds = contactRows.map((c) => c.id);
      const { data: contactTags } = await supabase
        .from('contact_tags')
        .select('contact_id, tag_id')
        .in('contact_id', contactIds);

      const tagsByContact: Record<string, string[]> = {};
      contactTags?.forEach((ct) => {
        if (!tagsByContact[ct.contact_id]) tagsByContact[ct.contact_id] = [];
        tagsByContact[ct.contact_id].push(ct.tag_id);
      });

      return { contactRows, tagsByContact, totalCount: count };
    },
  });

  const contacts: ContactWithTags[] = useMemo(() => {
    if (!query.data) return [];
    const { contactRows, tagsByContact } = query.data;
    return contactRows.map((c) => ({
      ...c,
      tags: (tagsByContact[c.id] ?? [])
        .map((tid) => tagsMap[tid])
        .filter(Boolean),
    }));
  }, [query.data, tagsMap]);

  return {
    ...query,
    contacts,
    totalCount: query.data?.totalCount ?? 0,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  };
}
