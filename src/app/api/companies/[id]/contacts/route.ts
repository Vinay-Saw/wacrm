import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { findOrCreateContact } from '@/lib/api/v1/contacts';

/**
 * POST /api/companies/[id]/contacts
 * Link an existing contact or create a new contact under this company.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id: companyId } = await context.params;
    const body = await request.json().catch(() => ({}));

    // Verify company belongs to account
    const { data: company, error: compErr } = await ctx.supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (compErr || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let contactId = typeof body.contact_id === 'string' ? body.contact_id.trim() : null;

    // If contact_id is not provided, create contact by phone & name
    if (!contactId) {
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      if (!phone) {
        return NextResponse.json({ error: 'Phone number or contact_id is required' }, { status: 400 });
      }

      const { id: createdId } = await findOrCreateContact(
        ctx.supabase,
        ctx.accountId,
        ctx.userId,
        {
          phone,
          name: typeof body.name === 'string' ? body.name.trim() : undefined,
          email: typeof body.email === 'string' ? body.email.trim() : undefined,
          company: company.name,
        }
      );
      contactId = createdId;
    }

    const jobTitle = typeof body.job_title === 'string' ? body.job_title.trim() : null;
    const department = typeof body.department === 'string' ? body.department.trim() : null;
    const isPrimary = Boolean(body.is_primary_company_contact);

    // If setting this contact as primary, unmark existing primary contacts
    if (isPrimary) {
      await ctx.supabase
        .from('contacts')
        .update({ is_primary_company_contact: false })
        .eq('company_id', companyId)
        .eq('account_id', ctx.accountId);
    }

    // Update the contact's company relationship
    const { data: updatedContact, error: updErr } = await ctx.supabase
      .from('contacts')
      .update({
        company_id: companyId,
        company: company.name,
        job_title: jobTitle,
        department: department,
        is_primary_company_contact: isPrimary,
      })
      .eq('id', contactId)
      .eq('account_id', ctx.accountId)
      .select()
      .single();

    if (updErr) throw updErr;

    return NextResponse.json({ contact: updatedContact }, { status: 200 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/companies/[id]/contacts?contactId=...
 * Unlink a contact from this company.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id: companyId } = await context.params;
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json({ error: 'contactId parameter is required' }, { status: 400 });
    }

    const { error } = await ctx.supabase
      .from('contacts')
      .update({
        company_id: null,
        is_primary_company_contact: false,
      })
      .eq('id', contactId)
      .eq('company_id', companyId)
      .eq('account_id', ctx.accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
