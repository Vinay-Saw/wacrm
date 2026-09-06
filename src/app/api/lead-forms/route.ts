import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { generateFormKey } from '@/lib/lead-forms/service';

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount();
    const { data, error } = await supabase
      .from('lead_forms')
      .select('*, pipeline:pipelines(id, name), stage:pipeline_stages(id, name, color), assignee:profiles(id, full_name, email)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ forms: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireRole('admin');
  } catch (err) {
    return toErrorResponse(err);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const formKey = generateFormKey();
  const db = supabaseAdmin();

  const insertData = {
    account_id: ctx.accountId,
    created_by: ctx.userId,
    name,
    form_key: formKey,
    is_active: body.is_active !== false,
    pipeline_id: typeof body.pipeline_id === 'string' && body.pipeline_id ? body.pipeline_id : null,
    stage_id: typeof body.stage_id === 'string' && body.stage_id ? body.stage_id : null,
    default_deal_title: typeof body.default_deal_title === 'string' ? body.default_deal_title : '{name} - Website Lead',
    default_deal_value: typeof body.default_deal_value === 'number' ? body.default_deal_value : 0,
    tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [],
    assigned_agent_id: typeof body.assigned_agent_id === 'string' && body.assigned_agent_id ? body.assigned_agent_id : null,
    success_redirect_url: typeof body.success_redirect_url === 'string' && body.success_redirect_url.trim() ? body.success_redirect_url.trim() : null,
    allowed_origins: Array.isArray(body.allowed_origins) && body.allowed_origins.length > 0 ? body.allowed_origins : ['*'],
  };

  const { data, error } = await db
    .from('lead_forms')
    .insert(insertData)
    .select('*, pipeline:pipelines(id, name), stage:pipeline_stages(id, name, color), assignee:profiles(id, full_name, email)')
    .single();

  if (error) {
    console.error('[POST /api/lead-forms] insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ form: data }, { status: 201 });
}
