import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { z } from 'zod';
import { parseBody } from '@/lib/api/validate';

const lineItemSchema = z.object({
  product_id: z.string().nullable().optional(),
  item_name: z.string().optional(),
  description: z.string().nullable().optional(),
  hsn_sac: z.string().nullable().optional(),
  unit: z.string().optional(),
  quantity: z.union([z.number(), z.string()]).optional(),
  unit_price: z.union([z.number(), z.string()]).optional(),
  discount_percent: z.union([z.number(), z.string()]).optional(),
  tax_rate: z.union([z.number(), z.string()]).optional(),
});

const createCommercialDocumentSchema = z.object({
  document_type: z.enum(['estimate', 'sales_order', 'invoice']),
  document_number: z.string().optional(),
  company_id: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  deal_id: z.string().nullable().optional(),
  parent_document_id: z.string().nullable().optional(),
  issue_date: z.string().optional(),
  due_date: z.string().nullable().optional(),
  status: z.string().optional(),
  currency: z.string().optional(),
  tax_enabled: z.boolean().optional(),
  amount_paid: z.union([z.number(), z.string()]).optional(),
  supply_state: z.string().optional(),
  billing_address: z
    .object({
      state: z.string().optional(),
    })
    .passthrough()
    .optional(),
  shipping_address: z.record(z.string(), z.unknown()).optional(),
  client_name: z.string().nullable().optional(),
  client_email: z.string().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  client_gstin: z.string().nullable().optional(),
  client_pan: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  terms_conditions: z.string().nullable().optional(),
  items: z.array(lineItemSchema).optional(),
});

/**
 * GET /api/commercial-documents
 * List commercial documents filtered by type (estimate, sales_order, invoice), status, or search.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRole('viewer');
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const companyId = searchParams.get('company_id');
    const search = searchParams.get('search')?.trim();

    let query = ctx.supabase
      .from('commercial_documents')
      .select(`
        *,
        company:companies(id, name, phone, email, tax_number),
        contact:contacts(id, name, phone, email),
        deal:deals(id, title, value),
        items:commercial_document_items(*)
      `)
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('document_type', type);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (search) {
      query = query.or(`document_number.ilike.%${search}%,client_name.ilike.%${search}%,client_gstin.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ documents: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/commercial-documents
 * Create a new Estimate, Sales Order, or Invoice with line items.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole('agent');
    const body = await parseBody(request, createCommercialDocumentSchema);

    // Fetch account organisation details for tax calculation and document sequence
    const { data: account } = await ctx.supabase
      .from('accounts')
      .select('tax_enabled, address, document_settings')
      .eq('id', ctx.accountId)
      .single();

    const docSettings = (account?.document_settings as Record<string, unknown>) || {};
    const orgAddress = (account?.address as Record<string, unknown>) || {};
    const sellerState = String(orgAddress.state || '').trim().toLowerCase();
    const supplyState = String(body.supply_state || body.billing_address?.state || '').trim().toLowerCase();
    const isInterState = sellerState && supplyState && sellerState !== supplyState;
    const taxEnabled = account?.tax_enabled !== false && body.tax_enabled !== false;

    // Generate document number if not provided
    let documentNumber = body.document_number?.trim();
    if (!documentNumber) {
      const typeKey = body.document_type === 'estimate' ? 'estimate' : body.document_type === 'sales_order' ? 'order' : 'invoice';
      const prefix = String(docSettings[`${typeKey}_prefix`] || (body.document_type === 'estimate' ? 'EST-' : body.document_type === 'sales_order' ? 'SO-' : 'INV-'));
      const nextNum = Number(docSettings[`${typeKey}_next`] || docSettings[`${typeKey}_next_number`] || 101);
      documentNumber = `${prefix}${nextNum}`;

      // Increment next number
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
    }

    // Calculate line items and totals
    const rawItems = Array.isArray(body.items) ? body.items : [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    interface SanitizedItem {
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

    const sanitizedItems: SanitizedItem[] = rawItems.map((item: Record<string, unknown>, index: number) => {
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

    // Indian GST Breakdown
    const cgst = !isInterState && taxEnabled ? totalTax / 2 : 0;
    const sgst = !isInterState && taxEnabled ? totalTax / 2 : 0;
    const igst = isInterState && taxEnabled ? totalTax : 0;
    const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

    const docPayload = {
      account_id: ctx.accountId,
      created_by: ctx.userId,
      document_type: body.document_type,
      document_number: documentNumber,
      company_id: body.company_id || null,
      contact_id: body.contact_id || null,
      deal_id: body.deal_id || null,
      parent_document_id: body.parent_document_id || null,
      issue_date: body.issue_date || new Date().toISOString().split('T')[0],
      due_date: body.due_date || null,
      status: body.status || 'draft',
      currency: body.currency || 'INR',
      subtotal: Math.round(subtotal * 100) / 100,
      tax_enabled: taxEnabled,
      cgst_amount: Math.round(cgst * 100) / 100,
      sgst_amount: Math.round(sgst * 100) / 100,
      igst_amount: Math.round(igst * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      discount_amount: Math.round(totalDiscount * 100) / 100,
      total_amount: Math.round(grandTotal * 100) / 100,
      amount_paid: parseFloat(String(body.amount_paid ?? 0)) || 0.0,
      client_name: body.client_name ? String(body.client_name).trim() : null,
      client_email: body.client_email ? String(body.client_email).trim() : null,
      client_phone: body.client_phone ? String(body.client_phone).trim() : null,
      client_gstin: body.client_gstin ? String(body.client_gstin).trim() : null,
      billing_address: body.billing_address || {},
      shipping_address: body.shipping_address || {},
      supply_state: body.supply_state || null,
      notes: body.notes ? String(body.notes).trim() : null,
      terms_conditions: body.terms_conditions ? String(body.terms_conditions).trim() : (docSettings.default_terms as string) || null,
    };

    const { data: document, error: docError } = await ctx.supabase
      .from('commercial_documents')
      .insert(docPayload)
      .select()
      .single();

    if (docError) throw docError;

    // Insert line items
    if (sanitizedItems.length > 0) {
      const itemsToInsert = sanitizedItems.map((item) => ({
        ...item,
        document_id: document.id,
      }));
      const { error: itemError } = await ctx.supabase
        .from('commercial_document_items')
        .insert(itemsToInsert);
      if (itemError) console.error('Failed to insert document items:', itemError);
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
