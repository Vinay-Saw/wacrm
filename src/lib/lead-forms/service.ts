import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeadForm } from '@/types';
import { findOrCreateContact, resolveAuditUserId, setContactTags } from '@/lib/api/v1/contacts';
import { sanitizePhoneForMeta, isValidE164 } from '@/lib/whatsapp/phone-utils';
import { runAutomationsForTrigger } from '@/lib/automations/engine';

export class LeadSubmissionError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'LeadSubmissionError';
    this.status = status;
  }
}

/** Generate a unique public form slug: lf_live_xxxxxxxxxxxxxxxx */
export function generateFormKey(): string {
  return `lf_live_${crypto.randomBytes(12).toString('hex')}`;
}

/** Look up an active lead form by its public form_key */
export async function findFormByKey(
  db: SupabaseClient,
  formKey: string
): Promise<LeadForm | null> {
  const { data, error } = await db
    .from('lead_forms')
    .select('*, pipeline:pipelines(*), stage:pipeline_stages(*), assignee:profiles(*)')
    .eq('form_key', formKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as LeadForm;
}

export interface LeadSubmissionResult {
  contactId: string;
  isNewContact: boolean;
  dealId?: string | null;
  spamDropped?: boolean;
}

/**
 * Ingest and process an incoming lead submission for a form.
 * Handles anti-spam, field normalization, contact find/create, custom fields,
 * deal creation, notes, and automations.
 */
export async function processLeadSubmission(
  db: SupabaseClient,
  form: LeadForm,
  rawPayload: Record<string, unknown>
): Promise<LeadSubmissionResult> {
  // 1. Anti-spam honeypot detection
  // Hidden fields like _gotcha, honeypot, bot_check should be empty for real users
  const honeypotVal = rawPayload._gotcha ?? rawPayload.honeypot ?? rawPayload.bot_field;
  if (typeof honeypotVal === 'string' && honeypotVal.trim().length > 0) {
    return {
      contactId: 'spam_detected',
      isNewContact: false,
      spamDropped: true,
    };
  }

  // 2. Intelligent field normalization from diverse form naming conventions
  const name = String(
    rawPayload.name ??
      rawPayload.full_name ??
      rawPayload.fullName ??
      [rawPayload.first_name ?? rawPayload.firstName, rawPayload.last_name ?? rawPayload.lastName]
        .filter(Boolean)
        .join(' ') ??
      ''
  ).trim();

  const rawPhone = String(
    rawPayload.phone ??
      rawPayload.mobile ??
      rawPayload.whatsapp ??
      rawPayload.tel ??
      rawPayload.contact_number ??
      rawPayload.phone_number ??
      ''
  ).trim();

  if (!rawPhone) {
    throw new LeadSubmissionError("A valid 'phone' or 'whatsapp' number is required", 400);
  }

  const phone = sanitizePhoneForMeta(rawPhone);
  if (!isValidE164(phone)) {
    throw new LeadSubmissionError(
      "'phone' must be a valid phone number in E.164 format (e.g. +919876543210 or +14155550123)",
      400
    );
  }

  const email = String(rawPayload.email ?? rawPayload.mail ?? '').trim() || undefined;
  const company = String(rawPayload.company ?? rawPayload.organization ?? rawPayload.business ?? '').trim() || undefined;
  const message = String(rawPayload.message ?? rawPayload.notes ?? rawPayload.comments ?? rawPayload.inquiry ?? rawPayload.query ?? '').trim();

  // 3. Resolve audit user ID (WhatsApp config owner or account owner)
  const auditUserId = await resolveAuditUserId(db, form.account_id);

  // 4. Find or create the contact under the form's account
  const { id: contactId, created: isNewContact } = await findOrCreateContact(
    db,
    form.account_id,
    auditUserId,
    {
      phone,
      name: name || undefined,
      email,
      company,
    }
  );

  // 5. Attach tags configured on the lead form
  if (Array.isArray(form.tags) && form.tags.length > 0) {
    try {
      await setContactTags(db, form.account_id, auditUserId, contactId, form.tags);
    } catch (tagErr) {
      console.warn('[lead-forms] Failed to apply tags:', tagErr);
    }
  }

  // 6. Map custom fields from form submission
  try {
    const { data: customFields } = await db
      .from('custom_fields')
      .select('id, field_name')
      .eq('account_id', form.account_id);

    if (customFields && customFields.length > 0) {
      const fieldMap = new Map<string, string>();
      for (const cf of customFields) {
        // Normalize: lowercase, no underscores/spaces
        const key = cf.field_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        fieldMap.set(key, cf.id);
      }

      for (const [k, v] of Object.entries(rawPayload)) {
        if (v == null || v === '') continue;
        const normalizedKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fieldId = fieldMap.get(normalizedKey);
        if (fieldId) {
          await db.from('contact_custom_values').upsert(
            {
              contact_id: contactId,
              custom_field_id: fieldId,
              value: String(v),
            },
            { onConflict: 'contact_id,custom_field_id' }
          );
        }
      }
    }
  } catch (cfErr) {
    console.warn('[lead-forms] Custom field mapping warning:', cfErr);
  }

  // 7. Create Pipeline Deal if configured
  let dealId: string | null = null;
  if (form.pipeline_id && form.stage_id) {
    try {
      const dealTitleTemplate = form.default_deal_title || '{name} - Website Lead';
      const dealTitle = dealTitleTemplate.replace('{name}', name || phone);

      const { data: deal } = await db
        .from('deals')
        .insert({
          account_id: form.account_id,
          user_id: auditUserId,
          pipeline_id: form.pipeline_id,
          stage_id: form.stage_id,
          contact_id: contactId,
          title: dealTitle,
          value: form.default_deal_value ?? 0,
          assigned_to: form.assigned_agent_id ?? null,
          status: 'open',
          notes: message || undefined,
        })
        .select('id')
        .single();

      if (deal) {
        dealId = deal.id;
      }
    } catch (dealErr) {
      console.warn('[lead-forms] Deal creation warning:', dealErr);
    }
  }

  // 8. Create a Contact Note if a message or extra inquiry information was provided
  if (message) {
    try {
      await db.from('contact_notes').insert({
        account_id: form.account_id,
        contact_id: contactId,
        user_id: auditUserId,
        note_text: `[Website Inquiry - ${form.name}]\n${message}`,
      });
    } catch (noteErr) {
      console.warn('[lead-forms] Note creation warning:', noteErr);
    }
  }

  // 9. Fire Automation Triggers (new_contact_created)
  if (isNewContact) {
    void runAutomationsForTrigger({
      accountId: form.account_id,
      triggerType: 'new_contact_created',
      contactId,
      context: {
        vars: {
          source: 'lead_form',
          form_name: form.name,
          deal_id: dealId,
        },
      },
    }).catch((autoErr: unknown) => {
      console.error('[lead-forms] Automation dispatch error:', autoErr);
    });
  }

  // 10. Increment form metrics
  try {
    await db
      .from('lead_forms')
      .update({
        submissions_count: (form.submissions_count || 0) + 1,
        last_submitted_at: new Date().toISOString(),
      })
      .eq('id', form.id);
  } catch (metricErr) {
    console.warn('[lead-forms] Metrics update warning:', metricErr);
  }

  return {
    contactId,
    isNewContact,
    dealId,
  };
}
