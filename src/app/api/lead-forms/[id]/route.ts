import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/automations/admin-client';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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

  const db = supabaseAdmin();
  const updateData: Record<string, unknown> = {};

  if (typeof body.name === 'string') updateData.name = body.name.trim();
  if (typeof body.is_active === 'boolean') updateData.is_active = body.is_active;
  if ('pipeline_id' in body) updateData.pipeline_id = body.pipeline_id || null;
  if ('stage_id' in body) updateData.stage_id = body.stage_id || null;
  if ('default_deal_title' in body) updateData.default_deal_title = body.default_deal_title;
  if ('default_deal_value' in body) updateData.default_deal_value = body.default_deal_value;
  if (Array.isArray(body.tags)) updateData.tags = body.tags;
  if ('assigned_agent_id' in body) updateData.assigned_agent_id = body.assigned_agent_id || null;
  if ('success_redirect_url' in body) updateData.success_redirect_url = body.success_redirect_url || null;
  if (Array.isArray(body.allowed_origins)) updateData.allowed_origins = body.allowed_origins;

  const { data, error } = await db
    .from('lead_forms')
    .update(updateData)
    .eq('id', id)
    .eq('account_id', ctx.accountId)
    .select('*, pipeline:pipelines(id, name), stage:pipeline_stages(id, name, color), assignee:profiles(id, full_name, email)')
    .single();

  if (error) {
    console.error('[PATCH /api/lead-forms/[id]] update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ form: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  let ctx;
  try {
    ctx = await requireRole('admin');
  } catch (err) {
    return toErrorResponse(err);
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from('lead_forms')
    .delete()
    .eq('id', id)
    .eq('account_id', ctx.accountId);

  if (error) {
    console.error('[DELETE /api/lead-forms/[id]] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
