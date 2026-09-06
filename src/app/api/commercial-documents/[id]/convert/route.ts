import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

/**
 * POST /api/commercial-documents/[id]/convert
 * Converts:
 * - Estimate -> Sales Order
 * - Sales Order -> Invoice
 * - Estimate -> Invoice
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const targetType = body.target_type; // 'sales_order' | 'invoice'

    if (!targetType || !['sales_order', 'invoice'].includes(targetType)) {
      return NextResponse.json({ error: 'Valid target_type (sales_order or invoice) is required' }, { status: 400 });
    }

    // 1. Fetch parent document and its line items
    const { data: parentDoc, error: parentErr } = await ctx.supabase
      .from('commercial_documents')
      .select('*, items:commercial_document_items(*)')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .single();

    if (parentErr || !parentDoc) {
      return NextResponse.json({ error: 'Parent document not found' }, { status: 404 });
    }

    // 2. Fetch document settings for numbering
    const { data: account } = await ctx.supabase
      .from('accounts')
      .select('document_settings')
      .eq('id', ctx.accountId)
      .single();

    const docSettings = (account?.document_settings as Record<string, unknown>) || {};
    const typeKey = targetType === 'sales_order' ? 'order' : 'invoice';
    const prefix = String(docSettings[`${typeKey}_prefix`] || (targetType === 'sales_order' ? 'SO-' : 'INV-'));
    const nextNum = Number(docSettings[`${typeKey}_next`] || docSettings[`${typeKey}_next_number`] || 101);
    const newDocNumber = `${prefix}${nextNum}`;

    // Increment document next number
    await ctx.supabase
      .from('accounts')
      .update({
        document_settings: {
          ...docSettings,
          [`${typeKey}_next`]: nextNum + 1,
          [`${typeKey}_next_number`]: nextNum + 1,
        },
      })
      .eq('id', ctx.accountId);

    // 3. Create new converted document
    const newDocPayload = {
      account_id: ctx.accountId,
      created_by: ctx.userId,
      document_type: targetType,
      document_number: newDocNumber,
      company_id: parentDoc.company_id,
      contact_id: parentDoc.contact_id,
      deal_id: parentDoc.deal_id,
      parent_document_id: parentDoc.id,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: body.due_date || null,
      status: targetType === 'invoice' ? 'draft' : 'confirmed',
      currency: parentDoc.currency,
      subtotal: parentDoc.subtotal,
      tax_enabled: parentDoc.tax_enabled,
      cgst_amount: parentDoc.cgst_amount,
      sgst_amount: parentDoc.sgst_amount,
      igst_amount: parentDoc.igst_amount,
      total_tax: parentDoc.total_tax,
      discount_amount: parentDoc.discount_amount,
      total_amount: parentDoc.total_amount,
      amount_paid: 0.0,
      client_name: parentDoc.client_name,
      client_email: parentDoc.client_email,
      client_phone: parentDoc.client_phone,
      client_gstin: parentDoc.client_gstin,
      billing_address: parentDoc.billing_address,
      shipping_address: parentDoc.shipping_address,
      supply_state: parentDoc.supply_state,
      notes: `Converted from ${parentDoc.document_number}. ${parentDoc.notes || ''}`.trim(),
      terms_conditions: parentDoc.terms_conditions,
    };

    const { data: createdDoc, error: createErr } = await ctx.supabase
      .from('commercial_documents')
      .insert(newDocPayload)
      .select()
      .single();

    if (createErr || !createdDoc) {
      throw createErr || new Error('Failed to create converted document');
    }

    // 4. Copy line items
    const parentItems = parentDoc.items || [];
    if (parentItems.length > 0) {
      interface ConvertedItem {
        document_id: string;
        product_id: string | null;
        item_name: string;
        description: string | null;
        hsn_sac: string | null;
        unit: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        tax_rate: number;
        tax_amount: number;
        total_amount: number;
        sort_order: number;
      }

      const itemsToInsert: ConvertedItem[] = parentItems.map((item: Record<string, unknown>) => ({
        document_id: createdDoc.id,
        product_id: (item.product_id as string) || null,
        item_name: String(item.item_name || 'Item'),
        description: (item.description as string) || null,
        hsn_sac: (item.hsn_sac as string) || null,
        unit: String(item.unit || 'Unit'),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        discount_percent: Number(item.discount_percent) || 0,
        tax_rate: Number(item.tax_rate) || 0,
        tax_amount: Number(item.tax_amount) || 0,
        total_amount: Number(item.total_amount) || 0,
        sort_order: Number(item.sort_order) || 0,
      }));

      await ctx.supabase.from('commercial_document_items').insert(itemsToInsert);
    }

    // 5. Update parent document status
    const parentUpdateStatus = parentDoc.document_type === 'estimate' ? 'converted' : 'invoiced';
    await ctx.supabase
      .from('commercial_documents')
      .update({ status: parentUpdateStatus, updated_at: new Date().toISOString() })
      .eq('id', parentDoc.id);

    return NextResponse.json({ document: createdDoc });
  } catch (err) {
    return toErrorResponse(err);
  }
}
