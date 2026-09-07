import { redirect } from 'next/navigation';
import { getCurrentAccount, type AccountContext } from '@/lib/auth/account';
import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries';
import {
  DashboardClient,
  type RangeDays,
} from '@/components/dashboard/dashboard-client';
import type { ConversationsSeriesPoint } from '@/lib/dashboard/types';

export default async function DashboardPage() {
  let ctx: AccountContext;
  try {
    ctx = await getCurrentAccount();
  } catch {
    redirect('/login');
  }

  const [metrics, series30, pipeline, responseTime, activity] =
    await Promise.all([
      loadMetrics(ctx.supabase).catch((err) => {
        console.error('[dashboard server] metrics failed:', err);
        return null;
      }),
      loadConversationsSeries(ctx.supabase, 30).catch((err) => {
        console.error('[dashboard server] series failed:', err);
        return null;
      }),
      loadPipelineDonut(ctx.supabase).catch((err) => {
        console.error('[dashboard server] pipeline failed:', err);
        return null;
      }),
      loadResponseTime(ctx.supabase).catch((err) => {
        console.error('[dashboard server] response time failed:', err);
        return null;
      }),
      loadActivity(ctx.supabase, 50).catch((err) => {
        console.error('[dashboard server] activity failed:', err);
        return null;
      }),
    ]);

  const initialSeries: Record<RangeDays, ConversationsSeriesPoint[] | null> = {
    7: null,
    30: series30,
    90: null,
  };

  return (
    <DashboardClient
      accountId={ctx.accountId}
      role={ctx.role}
      initialMetrics={metrics}
      initialSeries={initialSeries}
      initialPipeline={pipeline}
      initialResponseTime={responseTime}
      initialActivity={activity}
    />
  );
}
