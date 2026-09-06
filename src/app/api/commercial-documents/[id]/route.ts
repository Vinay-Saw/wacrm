import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * GET /api/commercial-documents/[id]
 * Fetch document details with line items, company, and contact relations.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('viewer');
    const { id } = await context.params;

    const { data: document, error } = await ctx.supabase
      .from('commercial_documents')
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        deal:deals(*),
        parent_document:commercial_documents!commercial_documents_parent_document_id_fkey(*),
        items:commercial_document_items(*)
      `)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * PATCH /api/commercial-documents/[id]
 * Update document details, status, or line items with strict role-based edit guards:
 * - Viewer: Read-only.
 * - Agent: Can edit until invoice is issued.
 * - Admin: Can edit after 100% invoiced and at any time.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    // Fetch existing document
    const { data: existingDoc, error: fetchErr } = await ctx.supabase
      .from('commercial_documents')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .single();

    if (fetchErr || !existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Role-based edit guard:
    // "Agent can edit till invoice is not issued, Admin can edit after 100% invoiced"
    const isAdmin = ctx.role === 'admin' || ctx.role === 'owner';
    const isIssuedInvoice = existingDoc.document_type === 'invoice' && existingDoc.status !== 'draft';

    if (!isAdmin && isIssuedInvoice) {
      return NextResponse.json(
        { error: 'Issued invoices can only be modified by an Admin.' },
        { status: 403 }
      );
    }

    // Fetch account organisation details for tax calculation
    const { data: account } = await ctx.supabase
      .from('accounts')
      .select('tax_enabled, address')
      .eq('id', ctx.accountId)
      .single();

    const orgAddress = (account?.address as Record<string, unknown>) || {};
    const sellerState = String(orgAddress.state || '').trim().toLowerCase();
    const supplyState = String(body.supply_state || existingDoc.supply_state || '').trim().toLowerCase();
    const isInterState = sellerState && supplyState && sellerState !== supplyState;
    const taxEnabled = body.tax_enabled !== undefined ? Boolean(body.tax_enabled) : existingDoc.tax_enabled;

    // Recalculate line items if provided
    let subtotal = existingDoc.subtotal;
    let totalDiscount = existingDoc.discount_amount;
    let totalTax = existingDoc.total_tax;
    let grandTotal = existingDoc.total_amount;
    let cgst = existingDoc.cgst_amount;
    let sgst = existingDoc.sgst_amount;
    let igst = existingDoc.igst_amount;

    if (Array.isArray(body.items)) {
      subtotal = 0;
      totalDiscount = 0;
      totalTax = 0;

      const rawItems = body.items;
      const sanitizedItems = rawItems.map((item: Record<string, unknown>, index: number) => {
        const qty = Math.max(0.001, parseFloat(String(item.quantity)) || 1);
        const price = Math.max(0, parseFloat(String(item.unit_price)) || 0);
        const discountPct = Math.min(100, Math.max(0, parseFloat(String(item.discount_percent)) || 0));
        const lineBase = qty * price;
        const lineDiscount = (lineBase * discountPct) / 100;
        const lineTaxable = lineBase - lineDiscount;
        const rate = taxEnabled ? Math.max(0, parseFloat(String(item.tax_rate)) || 0) : 0;
        const taxAmount = (lineTaxable * rate) / 100;
        const lineTotal = lineTaxable + taxAmount;

        subtotal += lineBase;
        totalDiscount += lineDiscount;
        totalTax += taxAmount;

        return {
          document_id: id,
          product_id: (item.product_id as string) || null,
          item_name: String(item.item_name || 'Item').trim(),
          description: item.description ? String(item.description).trim() : null,
          hsn_sac: item.hsn_sac ? String(item.hsn_sac).trim() : null,
          unit: String(item.unit || 'Unit').trim(),
          quantity: qty,
          unit_price: price,
          discount_percent: discountPct,
          tax_rate: rate,
          tax_amount: Math.round(taxAmount * 100) / 100,
          total_amount: Math.round(lineTotal * 100) / 100,
          sort_order: index,
        };
      });

      // Recalculate taxes
      cgst = !isInterState && taxEnabled ? totalTax / 2 : 0;
      sgst = !isInterState && taxEnabled ? totalTax / 2 : 0;
      igst = isInterState && taxEnabled ? totalTax : 0;
      grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

      // Replace items in database
      await ctx.supabase.from('commercial_document_items').delete().eq('document_id', id);
      if (sanitizedItems.length > 0) {
        await ctx.supabase.from('commercial_document_items').insert(sanitizedItems);
      }
    }

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      subtotal: Math.round(subtotal * 100) / 100,
      tax_enabled: taxEnabled,
      cgst_amount: Math.round(cgst * 100) / 100,
      sgst_amount: Math.round(sgst * 100) / 100,
      igst_amount: Math.round(igst * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      discount_amount: Math.round(totalDiscount * 100) / 100,
      total_amount: Math.round(grandTotal * 100) / 100,
    };

    if (body.document_number !== undefined) updateFields.document_number = String(body.document_number).trim();
    if (body.company_id !== undefined) updateFields.company_id = body.company_id || null;
    if (body.contact_id !== undefined) updateFields.contact_id = body.contact_id || null;
    if (body.deal_id !== undefined) updateFields.deal_id = body.deal_id || null;
    if (body.issue_date !== undefined) updateFields.issue_date = body.issue_date;
    if (body.due_date !== undefined) updateFields.due_date = body.due_date || null;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.currency !== undefined) updateFields.currency = body.currency;
    if (body.amount_paid !== undefined) updateFields.amount_paid = parseFloat(body.amount_paid) || 0;
    if (body.client_name !== undefined) updateFields.client_name = body.client_name ? String(body.client_name).trim() : null;
    if (body.client_email !== undefined) updateFields.client_email = body.client_email ? String(body.client_email).trim() : null;
    if (body.client_phone !== undefined) updateFields.client_phone = body.client_phone ? String(body.client_phone).trim() : null;
    if (body.client_gstin !== undefined) updateFields.client_gstin = body.client_gstin ? String(body.client_gstin).trim() : null;
    if (body.billing_address !== undefined) updateFields.billing_address = body.billing_address;
    if (body.shipping_address !== undefined) updateFields.shipping_address = body.shipping_address;
    if (body.supply_state !== undefined) updateFields.supply_state = body.supply_state;
    if (body.notes !== undefined) updateFields.notes = body.notes ? String(body.notes).trim() : null;
    if (body.terms_conditions !== undefined) updateFields.terms_conditions = body.terms_conditions ? String(body.terms_conditions).trim() : null;

    const { data: updatedDoc, error: updateErr } = await ctx.supabase
      .from('commercial_documents')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ document: updatedDoc });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/commercial-documents/[id]
 * Only Admin can delete commercial documents.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('admin');
    const { id } = await context.params;

    const { error } = await ctx.supabase
      .from('commercial_documents')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
