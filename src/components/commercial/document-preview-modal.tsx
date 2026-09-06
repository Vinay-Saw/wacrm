'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Printer,
  Edit2,
  ArrowRightCircle,
  CreditCard,
  Building2,
  X,
  FileCheck2,
  Loader2,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  const orgAddress = (account?.address as Record<string, string> | undefined) || {};
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
      const res = await fetch(`/api/commercial-documents/${document?.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Conversion failed');
      }

      toast.success(`Successfully converted to ${targetType === 'sales_order' ? 'Sales Order' : 'Invoice'}!`);
      onOpenChange(false);
      if (onConverted) onConverted();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert document');
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
      toast.error(err instanceof Error ? err.message : 'Payment recording failed');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 print:p-0 print:border-0 print:max-h-none print:max-w-none bg-card border-border text-foreground no-scrollbar">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="print:hidden p-4 border-b border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">{document.document_number}</span>
            <Badge variant="outline" className="capitalize text-xs font-semibold">
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
                className="text-xs h-8 border-border"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}

            {document.document_type === 'estimate' && document.status !== 'converted' && (
              <Button
                size="sm"
                variant="default"
                disabled={converting}
                onClick={() => handleConvert('sales_order')}
                className="text-xs h-8 bg-primary text-primary-foreground"
              >
                {converting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" />}
                Convert to Order
              </Button>
            )}

            {document.document_type === 'sales_order' && document.status !== 'invoiced' && (
              <Button
                size="sm"
                variant="default"
                disabled={converting}
                onClick={() => handleConvert('invoice')}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {converting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />}
                Generate Invoice
              </Button>
            )}

            {document.document_type === 'invoice' && document.status !== 'paid' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setPaymentOpen(true)}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Record Payment
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="text-xs h-8 border-border"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Record Payment Prompt */}
        {paymentOpen && (
          <div className="print:hidden p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-500">Record Received Payment:</span>
              <Input
                type="number"
                step="any"
                min="0"
                value={paymentAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                placeholder={`Remaining: ${formatCurrency(
                  document.total_amount - (document.amount_paid || 0),
                  defaultCurrency
                )}`}
                className="h-8 w-48 text-xs bg-card border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleRecordPayment} className="h-8 text-xs bg-emerald-600 text-white">
                Save Payment
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPaymentOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* PRINTABLE INVOICE / DOCUMENT TEMPLATE */}
        <div id="printable-commercial-document" className="p-4 sm:p-6 md:p-10 space-y-6 text-foreground bg-card">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-border">
            <div className="space-y-1 max-w-sm">
              <div className="text-xl font-bold text-foreground">
                {account?.name || 'Automa Technologies'}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {streetStr ? <div>{streetStr}</div> : null}
                {(cityStr || stateStr || postalStr) ? (
                  <div>
                    {[cityStr, stateStr, postalStr].filter(Boolean).join(', ')}
                  </div>
                ) : null}
                {account?.phone && <div>Phone: {account.phone}</div>}
                {account?.email && <div>Email: {account.email}</div>}
                {account?.tax_id && (
                  <div className="font-semibold text-foreground mt-1">
                    GSTIN: <span className="font-mono">{account.tax_id}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto">
              <h2 className="text-2xl font-extrabold tracking-tight text-primary uppercase">
                {docTitle}
              </h2>
              <div className="text-sm font-bold font-mono text-foreground mt-1">
                {document.document_number}
              </div>
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-border text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                Billed To:
              </span>
              <div className="text-sm font-bold text-foreground">{document.client_name}</div>
              {document.billing_address?.street && (
                <div className="text-muted-foreground">{document.billing_address.street}</div>
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
                <div className="text-muted-foreground">Phone: {document.client_phone}</div>
              )}
              {document.client_email && (
                <div className="text-muted-foreground">Email: {document.client_email}</div>
              )}
              {document.client_gstin && (
                <div className="font-semibold text-foreground pt-0.5">
                  GSTIN: <span className="font-mono">{document.client_gstin}</span>
                </div>
              )}
            </div>

            {document.contact && (
              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  Attention:
                </span>
                <div className="text-sm font-bold text-foreground">{document.contact.name}</div>
                {document.contact.job_title && (
                  <div className="text-muted-foreground">
                    {document.contact.job_title}{' '}
                    {document.contact.department ? `(${document.contact.department})` : ''}
                  </div>
                )}
                <div className="text-muted-foreground">{document.contact.phone}</div>
                {document.contact.email && (
                  <div className="text-muted-foreground">{document.contact.email}</div>
                )}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border border-border">
              <thead className="bg-muted/70 text-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Item & Description</th>
                  <th className="py-2.5 px-3 text-center">HSN/SAC</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-center">GST %</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(document.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground">{item.item_name}</div>
                      {item.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                      {item.hsn_sac || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(item.unit_price, defaultCurrency)}
                      {item.discount_percent > 0 && (
                        <span className="block text-[10px] text-red-400">
                          (-{item.discount_percent}%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium">
                      {item.tax_rate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                      {formatCurrency(item.total_amount, defaultCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & GST Summary */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
            <div className="space-y-4 max-w-sm text-xs text-muted-foreground">
              {document.notes && (
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Notes:</span>
                  <p className="leading-relaxed">{document.notes}</p>
                </div>
              )}
              {document.terms_conditions && (
                <div>
                  <span className="font-bold text-foreground block mb-0.5">Terms & Conditions:</span>
                  <p className="leading-relaxed whitespace-pre-line">{document.terms_conditions}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs border border-border rounded-xl p-4 bg-muted/20">
              <div className="flex justify-between text-muted-foreground">
                <span>Taxable Amount:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(document.subtotal, defaultCurrency)}
                </span>
              </div>
              {document.discount_amount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount:</span>
                  <span className="font-mono text-red-400">
                    -{formatCurrency(document.discount_amount, defaultCurrency)}
                  </span>
                </div>
              )}

              {document.tax_enabled && (
                <div className="py-2 border-y border-border space-y-1.5">
                  {document.cgst_amount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(document.cgst_amount, defaultCurrency)}
                      </span>
                    </div>
                  )}
                  {document.sgst_amount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>State GST (SGST):</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(document.sgst_amount, defaultCurrency)}
                      </span>
                    </div>
                  )}
                  {document.igst_amount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Integrated GST (IGST):</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(document.igst_amount, defaultCurrency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-foreground pt-1">
                <span>Total Amount:</span>
                <span className="font-mono text-primary text-base">
                  {formatCurrency(document.total_amount, defaultCurrency)}
                </span>
              </div>

              {document.amount_paid > 0 && (
                <div className="pt-2 border-t border-border space-y-1">
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Amount Paid:</span>
                    <span className="font-mono">
                      {formatCurrency(document.amount_paid, defaultCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-foreground font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">
                      {formatCurrency(
                        Math.max(0, document.total_amount - document.amount_paid),
                        defaultCurrency
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Signature Block */}
          <div className="pt-12 flex justify-between items-end text-xs text-muted-foreground">
            <div>
              <p>Thank you for your business.</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-48 border-b border-border pb-10" />
              <p className="font-semibold text-foreground">Authorised Signatory</p>
              <p className="text-[10px] text-muted-foreground">{account?.name}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
