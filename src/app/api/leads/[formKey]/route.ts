import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { findFormByKey, processLeadSubmission, LeadSubmissionError } from '@/lib/lead-forms/service';

function getCorsHeaders(origin: string | null, allowedOrigins: string[] = ['*']) {
  let allowOrigin = '*';
  if (allowedOrigins.length > 0 && !allowedOrigins.includes('*')) {
    if (origin && allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = allowedOrigins[0];
    }
  } else if (origin) {
    allowOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ formKey: string }> }
) {
  const { formKey } = await context.params;
  const origin = request.headers.get('origin');
  const db = supabaseAdmin();

  // 1. Locate active lead form
  const form = await findFormByKey(db, formKey);
  if (!form) {
    return NextResponse.json(
      { error: 'Lead form not found or inactive' },
      { status: 404, headers: getCorsHeaders(origin) }
    );
  }

  const corsHeaders = getCorsHeaders(origin, form.allowed_origins);

  // 2. Parse payload based on Content-Type
  let payload: Record<string, unknown> = {};
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    } else {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        formData.forEach((value, key) => {
          payload[key] = typeof value === 'string' ? value : value.name;
        });
      }
    }
  } catch (parseErr) {
    console.error('[api/leads/[formKey]] Failed to parse body:', parseErr);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: corsHeaders }
    );
  }

  // 3. Process the lead submission
  try {
    const result = await processLeadSubmission(db, form, payload);

    // If a honeypot bot trap triggered, silently return success without taking action
    if (result.spamDropped) {
      return NextResponse.json(
        { success: true, message: 'Inquiry received' },
        { status: 200, headers: corsHeaders }
      );
    }

    // 4. Determine response: HTML 303 Redirect for native HTML forms vs JSON for AJAX
    const acceptHeader = request.headers.get('accept') || '';
    const isHtmlFormPost =
      !contentType.includes('application/json') &&
      acceptHeader.includes('text/html') &&
      Boolean(form.success_redirect_url);

    if (isHtmlFormPost && form.success_redirect_url) {
      return NextResponse.redirect(form.success_redirect_url, { status: 303 });
    }

    return NextResponse.json(
      {
        success: true,
        lead_id: result.contactId,
        is_new_contact: result.isNewContact,
        deal_id: result.dealId,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    if (err instanceof LeadSubmissionError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status, headers: corsHeaders }
      );
    }

    console.error('[api/leads/[formKey]] Ingestion error:', err);
    return NextResponse.json(
      { error: 'An error occurred while processing the inquiry' },
      { status: 500, headers: corsHeaders }
    );
  }
}
