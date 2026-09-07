import { redirect } from 'next/navigation';
import { getCurrentAccount, type AccountContext } from '@/lib/auth/account';
import { ContactsClient } from '@/components/contacts/contacts-client';

export default async function ContactsPage() {
  let ctx: AccountContext;
  try {
    ctx = await getCurrentAccount();
  } catch {
    redirect('/login');
  }

  const { data: tags } = await ctx.supabase
    .from('tags')
    .select('*')
    .eq('account_id', ctx.accountId);

  return (
    <ContactsClient
      accountId={ctx.accountId}
      role={ctx.role}
      initialTags={tags || []}
    />
  );
}
