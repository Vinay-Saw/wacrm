import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * GET /api/companies/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('viewer');
    const { id } = await context.params;

    const { data: company, error } = await ctx.supabase
      .from('companies')
      .select(`
        id,
        account_id,
        name,
        domain,
        industry,
        company_size,
        phone,
        email,
        website,
        billing_address,
        shipping_address,
        tax_number,
        notes,
        created_at,
        updated_at,
        contacts:contacts(id, name, phone, email, job_title, department, is_primary_company_contact, avatar_url),
        deals:deals(id, title, value, status, stage_id, created_at, pipeline:pipelines(name), stage:pipeline_stages(name, color))
      `)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (error) throw error;
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * PATCH /api/companies/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const updatePayload: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updatePayload.name = body.name.trim();
    if (body.domain !== undefined) updatePayload.domain = body.domain?.trim() || null;
    if (body.industry !== undefined) updatePayload.industry = body.industry?.trim() || null;
    if (body.company_size !== undefined) updatePayload.company_size = body.company_size?.trim() || null;
    if (body.phone !== undefined) updatePayload.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updatePayload.email = body.email?.trim() || null;
    if (body.website !== undefined) updatePayload.website = body.website?.trim() || null;
    if (body.billing_address !== undefined) updatePayload.billing_address = body.billing_address || {};
    if (body.shipping_address !== undefined) updatePayload.shipping_address = body.shipping_address || {};
    if (body.tax_number !== undefined) updatePayload.tax_number = body.tax_number?.trim() || null;
    if (body.notes !== undefined) updatePayload.notes = body.notes?.trim() || null;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: company, error } = await ctx.supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/companies/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await context.params;

    const { error } = await ctx.supabase
      .from('companies')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
