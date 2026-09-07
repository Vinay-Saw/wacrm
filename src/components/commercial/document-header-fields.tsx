'use client';

import { Building2, Calendar, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CommercialDocumentType, Company, Contact } from '@/types';

interface DocumentHeaderFieldsProps {
  canEdit: boolean;
  documentType: CommercialDocumentType;
  companyId: string;
  companies: Company[];
  onCompanySelect: (id: string) => void;
  contactId: string;
  contacts: Contact[];
  onContactSelect: (id: string) => void;
  documentNumber: string;
  setDocumentNumber: (val: string) => void;
  issueDate: string;
  setIssueDate: (val: string) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
}

export function DocumentHeaderFields({
  canEdit,
  documentType,
  companyId,
  companies,
  onCompanySelect,
  contactId,
  contacts,
  onContactSelect,
  documentNumber,
  setDocumentNumber,
  issueDate,
  setIssueDate,
  dueDate,
  setDueDate,
  status,
  setStatus,
}: DocumentHeaderFieldsProps) {
  return (
    <div className="bg-muted/40 border-border grid grid-cols-1 gap-3.5 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs font-semibold">
          <Building2 className="text-primary h-3.5 w-3.5" />
          Select Company
        </Label>
        <select
          disabled={!canEdit}
          value={companyId}
          onChange={(e) => onCompanySelect(e.target.value)}
          className="border-border bg-card text-foreground focus:ring-primary h-9 w-full rounded-md border px-2.5 text-xs focus:ring-1 focus:outline-none"
        >
          <option value="">Direct Customer / None</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs font-semibold">
          <User className="text-primary h-3.5 w-3.5" />
          Contact Person
        </Label>
        <select
          disabled={!canEdit}
          value={contactId}
          onChange={(e) => onContactSelect(e.target.value)}
          className="border-border bg-card text-foreground focus:ring-primary h-9 w-full rounded-md border px-2.5 text-xs focus:ring-1 focus:outline-none"
        >
          <option value="">Select Contact Person</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.phone} {c.job_title ? `(${c.job_title})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Document Number</Label>
        <Input
          disabled={!canEdit}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="Auto-generated on save"
          className="bg-card border-border h-9 font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1 text-xs font-semibold">
          <Calendar className="text-muted-foreground h-3.5 w-3.5" />
          Issue Date
        </Label>
        <Input
          disabled={!canEdit}
          type="date"
          required
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
          className="bg-card border-border h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1 text-xs font-semibold">
          <Calendar className="text-muted-foreground h-3.5 w-3.5" />
          {documentType === 'estimate'
            ? 'Valid Until'
            : documentType === 'sales_order'
              ? 'Delivery Date'
              : 'Payment Due Date'}
        </Label>
        <Input
          disabled={!canEdit}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-card border-border h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Status</Label>
        <select
          disabled={!canEdit}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border-border bg-card text-foreground focus:ring-primary h-9 w-full rounded-md border px-2.5 text-xs focus:ring-1 focus:outline-none"
        >
          {documentType === 'estimate' && (
            <>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </>
          )}
          {documentType === 'sales_order' && (
            <>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </>
          )}
          {documentType === 'invoice' && (
            <>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid (100%)</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </>
          )}
        </select>
      </div>
    </div>
  );
}
