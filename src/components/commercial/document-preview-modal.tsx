'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Printer,
  Edit2,
  ArrowRightCircle,
  CreditCard,
  FileCheck2,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { CommercialDocument } from '@/types';

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: CommercialDocument | null;
  onEdit?: (doc: CommercialDocument) => void;
  onConverted?: () => void;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  document,
  onEdit,
  onConverted,
}: DocumentPreviewModalProps) {
  const { defaultCurrency, canManageMembers, account } = useAuth();
  const isAdmin = canManageMembers;
  const [converting, setConverting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (!document) return null;

  const orgAddress =
    (account?.address as Record<string, string> | undefined) || {};
  const streetStr = orgAddress.street || '';
  const cityStr = orgAddress.city || '';
  const stateStr = orgAddress.state || '';
  const postalStr = orgAddress.postal_code || '';

  const isIssuedInvoice =
    document.document_type === 'invoice' && document.status !== 'draft';
  const canEdit = !isIssuedInvoice || isAdmin;

  const docTitle =
    document.document_type === 'estimate'
      ? 'ESTIMATE / QUOTATION'
      : document.document_type === 'sales_order'
        ? 'SALES ORDER'
        : 'TAX INVOICE';

  function handlePrint() {
    window.print();
  }

  async function handleConvert(targetType: 'sales_order' | 'invoice') {
    setConverting(true);
    try {
      const res = await fetch(
        `/api/commercial-documents/${document?.id}/convert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: targetType }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Conversion failed');
      }

      toast.success(
        `Successfully converted to ${targetType === 'sales_order' ? 'Sales Order' : 'Invoice'}!`
      );
      onOpenChange(false);
      if (onConverted) onConverted();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to convert document'
      );
    } finally {
      setConverting(false);
    }
  }

  async function handleRecordPayment() {
    const val = parseFloat(paymentAmount);
    if (!val || val <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }

    try {
      const newPaid = (document?.amount_paid || 0) + val;
      const isFull = newPaid >= (document?.total_amount || 0);

      const res = await fetch(`/api/commercial-documents/${document?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paid: newPaid,
          status: isFull ? 'paid' : 'partially_paid',
        }),
      });

      if (!res.ok) throw new Error('Failed to update payment');
      toast.success('Payment recorded successfully');
      setPaymentOpen(false);
      setPaymentAmount('');
      onOpenChange(false);
      if (onConverted) onConverted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Payment recording failed'
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground no-scrollbar max-h-[90vh] w-[95vw] overflow-x-hidden overflow-y-auto p-0 sm:w-[92vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl print:max-h-none print:max-w-none print:border-0 print:p-0">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b p-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-bold">
              {document.document_number}
            </span>
            <Badge
              variant="outline"
              className="text-xs font-semibold capitalize"
            >
              {document.status}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(document);
                }}
                className="border-border h-8 text-xs"
              >
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}

            {document.document_type === 'estimate' &&
              document.status !== 'converted' && (
                <Button
                  size="sm"
                  variant="default"
                  disabled={converting}
                  onClick={() => handleConvert('sales_order')}
                  className="bg-primary text-primary-foreground h-8 text-xs"
                >
                  {converting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRightCircle className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Convert to Order
                </Button>
              )}

            {document.document_type === 'sales_order' &&
              document.status !== 'invoiced' && (
                <Button
                  size="sm"
                  variant="default"
                  disabled={converting}
                  onClick={() => handleConvert('invoice')}
                  className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                >
                  {converting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Generate Invoice
                </Button>
              )}

            {document.document_type === 'invoice' &&
              document.status !== 'paid' && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setPaymentOpen(true)}
                  className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                >
                  <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                  Record Payment
                </Button>
              )}

            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="border-border h-8 text-xs"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Record Payment Prompt */}
        {paymentOpen && (
          <div className="flex items-center justify-between gap-4 border-b border-emerald-500/20 bg-emerald-500/10 p-4 print:hidden">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-500">
                Record Received Payment:
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                value={paymentAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPaymentAmount(e.target.value)
                }
                placeholder={`Remaining: ${formatCurrency(
                  document.total_amount - (document.amount_paid || 0),
                  defaultCurrency
                )}`}
                className="bg-card border-border h-8 w-48 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleRecordPayment}
                className="h-8 bg-emerald-600 text-xs text-white"
              >
                Save Payment
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPaymentOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* PRINTABLE INVOICE / DOCUMENT TEMPLATE */}
        <div
          id="printable-commercial-document"
          className="text-foreground bg-card space-y-6 p-4 sm:p-6 md:p-10"
        >
          {/* Header */}
          <div className="border-border flex flex-col items-start justify-between gap-4 border-b pb-6 sm:flex-row">
            <div className="max-w-sm space-y-1">
              <div className="text-foreground text-xl font-bold">
                {account?.name || 'Automa Technologies'}
              </div>
              <div className="text-muted-foreground text-xs leading-relaxed">
                {streetStr ? <div>{streetStr}</div> : null}
                {cityStr || stateStr || postalStr ? (
                  <div>
                    {[cityStr, stateStr, postalStr].filter(Boolean).join(', ')}
                  </div>
                ) : null}
                {account?.phone && <div>Phone: {account.phone}</div>}
                {account?.email && <div>Email: {account.email}</div>}
                {account?.tax_id && (
                  <div className="text-foreground mt-1 font-semibold">
                    GSTIN: <span className="font-mono">{account.tax_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full text-right sm:w-auto sm:text-right">
              <h2 className="text-primary text-2xl font-extrabold tracking-tight uppercase">
                {docTitle}
              </h2>
              <div className="text-foreground mt-1 font-mono text-sm font-bold">
                {document.document_number}
              </div>
              <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                <div>
                  <strong>Issue Date:</strong> {document.issue_date}
                </div>
                {document.due_date && (
                  <div>
                    <strong>
                      {document.document_type === 'estimate'
                        ? 'Valid Until:'
                        : document.document_type === 'sales_order'
                          ? 'Delivery Date:'
                          : 'Due Date:'}
                    </strong>{' '}
                    {document.due_date}
                  </div>
                )}
                {document.supply_state && (
                  <div>
                    <strong>Place of Supply:</strong> {document.supply_state}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To & Ship To */}
          <div className="border-border grid grid-cols-1 gap-6 border-b pb-6 text-xs sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Billed To:
              </span>
              <div className="text-foreground text-sm font-bold">
                {document.client_name}
              </div>
              {document.billing_address?.street && (
                <div className="text-muted-foreground">
                  {document.billing_address.street}
                </div>
              )}
              {(document.billing_address?.city ||
                document.billing_address?.state ||
                document.billing_address?.postal_code) && (
                <div className="text-muted-foreground">
                  {[
                    document.billing_address.city,
                    document.billing_address.state,
                    document.billing_address.postal_code,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
              {document.client_phone && (
                <div className="text-muted-foreground">
                  Phone: {document.client_phone}
                </div>
              )}
              {document.client_email && (
                <div className="text-muted-foreground">
                  Email: {document.client_email}
                </div>
              )}
              {document.client_gstin && (
                <div className="text-foreground pt-0.5 font-semibold">
                  GSTIN:{' '}
                  <span className="font-mono">{document.client_gstin}</span>
                </div>
              )}
            </div>

            {document.contact && (
              <div className="space-y-1 sm:text-right">
                <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  Attention:
                </span>
                <div className="text-foreground text-sm font-bold">
                  {document.contact.name}
                </div>
                {document.contact.job_title && (
                  <div className="text-muted-foreground">
                    {document.contact.job_title}{' '}
                    {document.contact.department
                      ? `(${document.contact.department})`
                      : ''}
                  </div>
                )}
                <div className="text-muted-foreground">
                  {document.contact.phone}
                </div>
                {document.contact.email && (
                  <div className="text-muted-foreground">
                    {document.contact.email}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="no-scrollbar overflow-x-auto">
            <table className="border-border w-full border text-left text-xs">
              <thead className="bg-muted/70 text-foreground border-border border-b font-semibold">
                <tr>
                  <th className="w-8 px-3 py-2.5 text-center">#</th>
                  <th className="px-3 py-2.5">Item & Description</th>
                  <th className="px-3 py-2.5 text-center">HSN/SAC</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="px-3 py-2.5 text-center">GST %</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {(document.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-muted-foreground px-3 py-2.5 text-center font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-foreground font-semibold">
                        {item.item_name}
                      </div>
                      {item.description && (
                        <div className="text-muted-foreground mt-0.5 text-[11px]">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 text-center font-mono">
                      {item.hsn_sac || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {formatCurrency(item.unit_price, defaultCurrency)}
                      {item.discount_percent > 0 && (
                        <span className="block text-[10px] text-red-400">
                          (-{item.discount_percent}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium">
                      {item.tax_rate}%
                    </td>
                    <td className="text-foreground px-3 py-2.5 text-right font-mono font-bold">
                      {formatCurrency(item.total_amount, defaultCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & GST Summary */}
          <div className="flex flex-col justify-between gap-6 pt-2 sm:flex-row">
            <div className="text-muted-foreground max-w-sm space-y-4 text-xs">
              {document.notes && (
                <div>
                  <span className="text-foreground mb-0.5 block font-bold">
                    Notes:
                  </span>
                  <p className="leading-relaxed">{document.notes}</p>
                </div>
              )}
              {document.terms_conditions && (
                <div>
                  <span className="text-foreground mb-0.5 block font-bold">
                    Terms & Conditions:
                  </span>
                  <p className="leading-relaxed whitespace-pre-line">
                    {document.terms_conditions}
                  </p>
                </div>
              )}
            </div>

            <div className="border-border bg-muted/20 w-full space-y-2 rounded-xl border p-4 text-xs sm:w-72">
              <div className="text-muted-foreground flex justify-between">
                <span>Taxable Amount:</span>
                <span className="text-foreground font-mono font-medium">
                  {formatCurrency(document.subtotal, defaultCurrency)}
                </span>
              </div>
              {document.discount_amount > 0 && (
                <div className="text-muted-foreground flex justify-between">
                  <span>Discount:</span>
                  <span className="font-mono text-red-400">
                    -{formatCurrency(document.discount_amount, defaultCurrency)}
                  </span>
                </div>
              )}

              {document.tax_enabled && (
                <div className="border-border space-y-1.5 border-y py-2">
                  {document.cgst_amount > 0 && (
                    <div className="text-muted-foreground flex justify-between">
                      <span>Central GST (CGST):</span>
                      <span className="text-foreground font-mono font-medium">
                        {formatCurrency(document.cgst_amount, defaultCurrency)}
                      </span>
                    </div>
                  )}
                  {document.sgst_amount > 0 && (
                    <div className="text-muted-foreground flex justify-between">
                      <span>State GST (SGST):</span>
                      <span className="text-foreground font-mono font-medium">
                        {formatCurrency(document.sgst_amount, defaultCurrency)}
                      </span>
                    </div>
                  )}
                  {document.igst_amount > 0 && (
                    <div className="text-muted-foreground flex justify-between">
                      <span>Integrated GST (IGST):</span>
                      <span className="text-foreground font-mono font-medium">
                        {formatCurrency(document.igst_amount, defaultCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="text-foreground flex justify-between pt-1 text-sm font-bold">
                <span>Total Amount:</span>
                <span className="text-primary font-mono text-base">
                  {formatCurrency(document.total_amount, defaultCurrency)}
                </span>
              </div>

              {document.amount_paid > 0 && (
                <div className="border-border space-y-1 border-t pt-2">
                  <div className="flex justify-between font-semibold text-emerald-500">
                    <span>Amount Paid:</span>
                    <span className="font-mono">
                      {formatCurrency(document.amount_paid, defaultCurrency)}
                    </span>
                  </div>
                  <div className="text-foreground flex justify-between font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">
                      {formatCurrency(
                        Math.max(
                          0,
                          document.total_amount - document.amount_paid
                        ),
                        defaultCurrency
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Signature Block */}
          <div className="text-muted-foreground flex items-end justify-between pt-12 text-xs">
            <div>
              <p>Thank you for your business.</p>
            </div>
            <div className="space-y-2 text-center">
              <div className="border-border w-48 border-b pb-10" />
              <p className="text-foreground font-semibold">
                Authorised Signatory
              </p>
              <p className="text-muted-foreground text-[10px]">
                {account?.name}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
