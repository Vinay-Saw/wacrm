'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { INDIAN_STATES } from '@/components/settings/organisation-settings';

interface DocumentClientFieldsProps {
  canEdit: boolean;
  clientName: string;
  setClientName: (val: string) => void;
  clientGstin: string;
  setClientGstin: (val: string) => void;
  supplyState: string;
  setSupplyState: (val: string) => void;
  clientPhone: string;
  setClientPhone: (val: string) => void;
  streetAddress: string;
  setStreetAddress: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  postalCode: string;
  setPostalCode: (val: string) => void;
}

export function DocumentClientFields({
  canEdit,
  clientName,
  setClientName,
  clientGstin,
  setClientGstin,
  supplyState,
  setSupplyState,
  clientPhone,
  setClientPhone,
  streetAddress,
  setStreetAddress,
  city,
  setCity,
  postalCode,
  setPostalCode,
}: DocumentClientFieldsProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
        Bill To & Supply Details
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Client Name *</Label>
          <Input
            disabled={!canEdit}
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Acme Corporation"
            className="bg-muted border-border h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Client GSTIN / Tax ID</Label>
          <Input
            disabled={!canEdit}
            value={clientGstin}
            onChange={(e) => setClientGstin(e.target.value)}
            placeholder="e.g. 27AAAAA0000A1Z5"
            className="bg-muted border-border h-8 font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Place of Supply (State)</Label>
          <select
            disabled={!canEdit}
            value={supplyState}
            onChange={(e) => setSupplyState(e.target.value)}
            className="border-border bg-muted text-foreground focus:ring-primary h-8 w-full rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
          >
            <option value="">Select State</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Phone</Label>
          <Input
            disabled={!canEdit}
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="+91..."
            className="bg-muted border-border h-8 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 sm:col-span-2 lg:col-span-2">
          <Label className="text-xs">Street Address</Label>
          <Input
            disabled={!canEdit}
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="Building, Street, Area..."
            className="bg-muted border-border h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">City</Label>
          <Input
            disabled={!canEdit}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="bg-muted border-border h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Postal Code / PIN</Label>
          <Input
            disabled={!canEdit}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="PIN"
            className="bg-muted border-border h-8 font-mono text-xs"
          />
        </div>
      </div>
    </div>
  );
}
