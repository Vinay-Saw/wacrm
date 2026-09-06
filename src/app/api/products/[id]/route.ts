import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * GET /api/products/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('viewer');
    const { id } = await context.params;

    const { data: product, error } = await ctx.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * PATCH /api/products/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === 'string') updateData.name = body.name.trim();
    if (body.sku !== undefined) updateData.sku = body.sku ? String(body.sku).trim() : null;
    if (body.description !== undefined) updateData.description = body.description ? String(body.description).trim() : null;
    if (body.category !== undefined) updateData.category = body.category ? String(body.category).trim() : null;
    if (body.unit !== undefined) updateData.unit = String(body.unit).trim() || 'Unit';
    if (body.unit_price !== undefined) updateData.unit_price = Math.max(0, parseFloat(body.unit_price) || 0);
    if (body.tax_rate !== undefined) updateData.tax_rate = Math.max(0, parseFloat(body.tax_rate) || 0);
    if (body.hsn_sac !== undefined) updateData.hsn_sac = body.hsn_sac ? String(body.hsn_sac).trim() : null;
    if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);

    const { data: product, error } = await ctx.supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 400 });
    }

    return NextResponse.json({ product });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/products/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await context.params;

    const { error } = await ctx.supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
