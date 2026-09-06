import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * GET /api/products
 * List products for the account with optional search and category filters.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRole('viewer');
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category')?.trim();
    const activeOnly = searchParams.get('active_only') === 'true';

    let query = ctx.supabase
      .from('products')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%,hsn_sac.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ products: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/products
 * Create a new product or service.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole('agent');
    const body = await request.json().catch(() => ({}));

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const newProduct = {
      account_id: ctx.accountId,
      created_by: ctx.userId,
      name: body.name.trim(),
      sku: body.sku ? body.sku.trim() : null,
      description: body.description ? body.description.trim() : null,
      category: body.category ? body.category.trim() : null,
      unit: body.unit ? body.unit.trim() : 'Unit',
      unit_price: Math.max(0, parseFloat(body.unit_price) || 0),
      tax_rate: parseFloat(body.tax_rate) ?? 18.0,
      hsn_sac: body.hsn_sac ? body.hsn_sac.trim() : null,
      is_active: body.is_active !== false,
    };

    const { data, error } = await ctx.supabase
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
