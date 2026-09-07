'use client';

import { Calculator, Package, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/currency';
import { GST_BRACKETS, COMMON_UNITS } from '@/app/(dashboard)/products/page';
import type { CommercialDocumentItem, Product } from '@/types';

interface DocumentLineItemsProps {
  items: CommercialDocumentItem[];
  products: Product[];
  canEdit: boolean;
  defaultCurrency: string;
  onAddItem: (productId: string) => void;
  onAddNewEmptyItem: () => void;
  onUpdateItem: (
    index: number,
    field: keyof CommercialDocumentItem,
    val: unknown
  ) => void;
  onRemoveItem: (index: number) => void;
}

export function DocumentLineItems({
  items,
  products,
  canEdit,
  defaultCurrency,
  onAddItem,
  onAddNewEmptyItem,
  onUpdateItem,
  onRemoveItem,
}: DocumentLineItemsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
          <Calculator className="text-primary h-4 w-4" />
          Line Items
        </h4>
        {canEdit && products.length > 0 && (
          <div className="flex items-center gap-2">
            <Package className="text-muted-foreground h-3.5 w-3.5" />
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onAddItem(e.target.value);
                  e.target.value = '';
                }
              }}
              className="border-border bg-muted text-foreground focus:ring-primary h-8 rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
            >
              <option value="">+ Add from Catalog...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.unit_price, defaultCurrency)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        {/* Desktop / Tablet View: Spacious Dynamic Table (md: and up) */}
        <div className="no-scrollbar hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 border-border text-muted-foreground border-b text-[10px] font-semibold uppercase">
              <tr>
                <th className="min-w-[200px] px-3 py-2.5">Item Description</th>
                <th className="w-24 px-2 py-2.5">HSN/SAC</th>
                <th className="w-20 px-2 py-2.5 text-center">Qty</th>
                <th className="w-22 px-2 py-2.5">Unit</th>
                <th className="w-28 px-2 py-2.5 text-right">
                  Rate ({defaultCurrency})
                </th>
                <th className="w-18 px-2 py-2.5 text-center">Disc %</th>
                <th className="w-22 px-2 py-2.5 text-center">GST %</th>
                <th className="w-28 px-3 py-2.5 text-right">Total</th>
                {canEdit && <th className="w-8 px-2 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Input
                      disabled={!canEdit}
                      required
                      value={item.item_name}
                      onChange={(e) =>
                        onUpdateItem(idx, 'item_name', e.target.value)
                      }
                      placeholder="Item name..."
                      className="bg-muted border-border h-7 text-xs font-medium"
                    />
                    <Input
                      disabled={!canEdit}
                      value={item.description || ''}
                      onChange={(e) =>
                        onUpdateItem(idx, 'description', e.target.value)
                      }
                      placeholder="Optional line description..."
                      className="text-muted-foreground mt-0.5 h-6 border-0 bg-transparent px-1 text-[11px] focus-visible:ring-0"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      disabled={!canEdit}
                      value={item.hsn_sac || ''}
                      onChange={(e) =>
                        onUpdateItem(idx, 'hsn_sac', e.target.value)
                      }
                      placeholder="9983"
                      className="bg-muted border-border h-7 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      disabled={!canEdit}
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateItem(idx, 'quantity', e.target.value)
                      }
                      className="bg-muted border-border h-7 text-center text-xs font-medium"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      disabled={!canEdit}
                      value={item.unit || 'Unit'}
                      onChange={(e) =>
                        onUpdateItem(idx, 'unit', e.target.value)
                      }
                      className="border-border bg-muted text-foreground h-7 w-full rounded border px-1 text-xs"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      disabled={!canEdit}
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) =>
                        onUpdateItem(idx, 'unit_price', e.target.value)
                      }
                      className="bg-muted border-border h-7 text-right font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      disabled={!canEdit}
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={item.discount_percent}
                      onChange={(e) =>
                        onUpdateItem(idx, 'discount_percent', e.target.value)
                      }
                      className="bg-muted border-border h-7 text-center font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      disabled={!canEdit}
                      value={item.tax_rate}
                      onChange={(e) =>
                        onUpdateItem(idx, 'tax_rate', e.target.value)
                      }
                      className="border-border bg-muted text-foreground h-7 w-full rounded border px-1 text-xs font-medium"
                    >
                      {GST_BRACKETS.map((b) => (
                        <option key={b.rate} value={b.rate}>
                          {b.rate}%
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-foreground px-3 py-2 text-right font-mono font-bold">
                    {formatCurrency(item.total_amount, defaultCurrency)}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(idx)}
                        className="text-muted-foreground h-6 w-6 p-0 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Stacked Card Layout (< md) */}
        <div className="divide-border block divide-y md:hidden">
          {items.map((item, idx) => (
            <div key={idx} className="bg-card space-y-2.5 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    Item #{idx + 1}
                  </span>
                  <span className="text-foreground font-mono text-xs font-bold">
                    {formatCurrency(item.total_amount, defaultCurrency)}
                  </span>
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(idx)}
                    className="text-muted-foreground h-7 w-7 p-0 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <Input
                  disabled={!canEdit}
                  required
                  value={item.item_name}
                  onChange={(e) =>
                    onUpdateItem(idx, 'item_name', e.target.value)
                  }
                  placeholder="Item name *"
                  className="bg-muted border-border h-8 text-xs font-medium"
                />
                <Input
                  disabled={!canEdit}
                  value={item.description || ''}
                  onChange={(e) =>
                    onUpdateItem(idx, 'description', e.target.value)
                  }
                  placeholder="Optional description / details..."
                  className="bg-muted/50 border-border text-muted-foreground h-7 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">
                    HSN/SAC
                  </Label>
                  <Input
                    disabled={!canEdit}
                    value={item.hsn_sac || ''}
                    onChange={(e) =>
                      onUpdateItem(idx, 'hsn_sac', e.target.value)
                    }
                    placeholder="e.g. 9983"
                    className="bg-muted border-border h-8 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">
                    Unit
                  </Label>
                  <select
                    disabled={!canEdit}
                    value={item.unit || 'Unit'}
                    onChange={(e) => onUpdateItem(idx, 'unit', e.target.value)}
                    className="border-border bg-muted text-foreground h-8 w-full rounded-md border px-2 text-xs"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">
                    Qty
                  </Label>
                  <Input
                    disabled={!canEdit}
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateItem(idx, 'quantity', e.target.value)
                    }
                    className="bg-muted border-border h-8 text-center text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">
                    Rate ({defaultCurrency})
                  </Label>
                  <Input
                    disabled={!canEdit}
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={item.unit_price}
                    onChange={(e) =>
                      onUpdateItem(idx, 'unit_price', e.target.value)
                    }
                    className="bg-muted border-border h-8 text-right font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">
                    GST %
                  </Label>
                  <select
                    disabled={!canEdit}
                    value={item.tax_rate}
                    onChange={(e) =>
                      onUpdateItem(idx, 'tax_rate', e.target.value)
                    }
                    className="border-border bg-muted text-foreground h-8 w-full rounded-md border px-1.5 text-xs font-medium"
                  >
                    {GST_BRACKETS.map((b) => (
                      <option key={b.rate} value={b.rate}>
                        {b.rate}%
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-[10px]">
                    Discount %
                  </Label>
                  <Input
                    disabled={!canEdit}
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={item.discount_percent}
                    onChange={(e) =>
                      onUpdateItem(idx, 'discount_percent', e.target.value)
                    }
                    className="bg-muted border-border h-8 text-center font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-muted-foreground text-[10px]">
                    Item Subtotal
                  </span>
                  <div className="text-foreground flex h-8 items-center font-mono text-xs font-bold">
                    {formatCurrency(item.total_amount, defaultCurrency)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="border-border bg-muted/20 flex justify-start border-t p-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAddNewEmptyItem}
              className="text-primary hover:bg-primary/10 h-8 text-xs font-medium"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Custom Line Item
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
