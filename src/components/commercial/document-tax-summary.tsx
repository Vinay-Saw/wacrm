'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/currency';

interface DocumentTaxSummaryProps {
  canEdit: boolean;
  terms: string;
  setTerms: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  isInterState: boolean;
  orgState: string;
  supplyState: string;
  cgst: number;
  sgst: number;
  igst: number;
  defaultCurrency: string;
}

export function DocumentTaxSummary({
  canEdit,
  terms,
  setTerms,
  notes,
  setNotes,
  subtotal,
  totalDiscount,
  grandTotal,
  isInterState,
  orgState,
  supplyState,
  cgst,
  sgst,
  igst,
  defaultCurrency,
}: DocumentTaxSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Terms & Conditions</Label>
          <Textarea
            disabled={!canEdit}
            rows={2}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="bg-muted border-border resize-none text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            Internal Notes / Payment Instructions
          </Label>
          <Textarea
            disabled={!canEdit}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bank details, UPI ID, or delivery terms..."
            className="bg-muted border-border resize-none text-xs"
          />
        </div>
      </div>

      {/* Indian GST Breakdown Box */}
      <div className="bg-muted/50 border-border space-y-2 rounded-xl border p-4 text-xs">
        <div className="text-muted-foreground flex justify-between">
          <span>Taxable Subtotal:</span>
          <span className="text-foreground font-mono font-medium">
            {formatCurrency(subtotal, defaultCurrency)}
          </span>
        </div>
        {totalDiscount > 0 && (
          <div className="text-muted-foreground flex justify-between">
            <span>Total Discount:</span>
            <span className="font-mono font-medium text-red-400">
              -{formatCurrency(totalDiscount, defaultCurrency)}
            </span>
          </div>
        )}

        <div className="border-border/60 space-y-1.5 border-y py-2">
          <div className="text-muted-foreground flex items-center justify-between text-[11px]">
            <span>
              Tax Mode:{' '}
              {isInterState ? (
                <span className="text-primary font-semibold">
                  Inter-State (IGST)
                </span>
              ) : (
                <span className="text-primary font-semibold">
                  Intra-State (CGST + SGST)
                </span>
              )}
            </span>
            {orgState && supplyState && (
              <span className="text-muted-foreground text-[10px]">
                {orgState} → {supplyState}
              </span>
            )}
          </div>

          {!isInterState ? (
            <>
              <div className="text-muted-foreground flex justify-between">
                <span>Central GST (CGST):</span>
                <span className="text-foreground font-mono font-medium">
                  {formatCurrency(cgst, defaultCurrency)}
                </span>
              </div>
              <div className="text-muted-foreground flex justify-between">
                <span>State GST (SGST):</span>
                <span className="text-foreground font-mono font-medium">
                  {formatCurrency(sgst, defaultCurrency)}
                </span>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex justify-between">
              <span>Integrated GST (IGST):</span>
              <span className="text-foreground font-mono font-medium">
                {formatCurrency(igst, defaultCurrency)}
              </span>
            </div>
          )}
        </div>

        <div className="text-foreground flex justify-between pt-1 text-sm font-bold">
          <span>Grand Total:</span>
          <span className="text-primary font-mono text-base">
            {formatCurrency(grandTotal, defaultCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
}
