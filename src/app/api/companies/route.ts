import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * GET /api/companies
 * List companies for the caller's account, optionally filtered by search.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRole('viewer');
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    let query = ctx.supabase
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
        contacts:contacts(id, name, phone, email, job_title, is_primary_company_contact),
        deals:deals(id, title, value, status, stage_id)
      `)
      .eq('account_id', ctx.accountId)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%,email.ilike.%${search}%,tax_number.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    interface JoinedCompanyRow {
      contacts?: {
        id: string;
        name?: string | null;
        phone: string;
        email?: string | null;
        job_title?: string | null;
        is_primary_company_contact?: boolean | null;
      }[];
      deals?: {
        id: string;
        title: string;
        value: number;
        status?: string | null;
        stage_id: string;
      }[];
      [key: string]: unknown;
    }

    // Format hydrated stats
    const companies = ((data || []) as unknown as JoinedCompanyRow[]).map((c) => {
      const contactsList = c.contacts || [];
      const dealsList = c.deals || [];
      const openDealsValue = dealsList
        .filter((d) => d.status !== 'won' && d.status !== 'lost')
        .reduce((sum: number, d) => sum + (Number(d.value) || 0), 0);

      const primaryContact =
        contactsList.find((ct) => ct.is_primary_company_contact) ||
        contactsList[0] ||
        null;

      return {
        ...c,
        contacts_count: contactsList.length,
        open_deals_value: openDealsValue,
        primary_contact: primaryContact,
      };
    });

    return NextResponse.json({ companies });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/companies
 * Create a new company. Requires agent+ role.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole('agent');
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    const { data: company, error } = await ctx.supabase
      .from('companies')
      .insert({
        account_id: ctx.accountId,
        created_by: ctx.userId,
        name,
        domain: typeof body.domain === 'string' ? body.domain.trim() : null,
        industry: typeof body.industry === 'string' ? body.industry.trim() : null,
        company_size: typeof body.company_size === 'string' ? body.company_size.trim() : null,
        phone: typeof body.phone === 'string' ? body.phone.trim() : null,
        email: typeof body.email === 'string' ? body.email.trim() : null,
        website: typeof body.website === 'string' ? body.website.trim() : null,
        billing_address: body.billing_address || {},
        shipping_address: body.shipping_address || {},
        tax_number: typeof body.tax_number === 'string' ? body.tax_number.trim() : null,
        notes: typeof body.notes === 'string' ? body.notes.trim() : null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
