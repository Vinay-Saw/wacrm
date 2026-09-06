'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Trash2,
  Building2,
  User,
  Calculator,
  Percent,
  Calendar,
  Loader2,
  Package,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { INDIAN_STATES } from '@/components/settings/organisation-settings';
import { GST_BRACKETS, COMMON_UNITS } from '@/app/(dashboard)/products/page';
import type {
  CommercialDocument,
  CommercialDocumentType,
  CommercialDocumentItem,
  Company,
  Contact,
  Product,
} from '@/types';

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: CommercialDocumentType;
  initialDocument?: CommercialDocument | null;
  onSaved: () => void;
}

export function DocumentFormDialog({
  open,
  onOpenChange,
  documentType,
  initialDocument,
  onSaved,
}: DocumentFormDialogProps) {
  const { accountId, defaultCurrency, canManageMembers } = useAuth();
  const isAdmin = canManageMembers;
  const isEdit = !!initialDocument;

  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orgState, setOrgState] = useState('');

  // Form states
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [supplyState, setSupplyState] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<CommercialDocumentItem[]>([]);

  // Check role-based permission
  const isIssuedInvoice =
    initialDocument?.document_type === 'invoice' && initialDocument?.status !== 'draft';
  const canEdit = !isIssuedInvoice || isAdmin;

  // Load supporting lists
  useEffect(() => {
    if (!open) return;
    async function loadData() {
      try {
        const [compRes, contRes, prodRes, orgRes] = await Promise.all([
          fetch('/api/companies').then((r) => r.json()),
          fetch('/api/v1/contacts').then((r) => r.json()),
          fetch('/api/products?active_only=true').then((r) => r.json()),
          fetch('/api/settings/organisation').then((r) => r.json()).catch(() => ({})),
        ]);

        if (compRes.companies) setCompanies(compRes.companies);
        if (contRes.data) setContacts(contRes.data);
        if (prodRes.products) setProducts(prodRes.products);
        if (orgRes.organisation?.address?.state) {
          setOrgState(orgRes.organisation.address.state);
        }
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    }
    loadData();
  }, [open]);

  // Reset or populate fields
  useEffect(() => {
    if (!open) return;
    if (initialDocument) {
      setCompanyId(initialDocument.company_id || '');
      setContactId(initialDocument.contact_id || '');
      setDocumentNumber(initialDocument.document_number);
      setIssueDate(initialDocument.issue_date);
      setDueDate(initialDocument.due_date || '');
      setStatus(initialDocument.status);
      setClientName(initialDocument.client_name || '');
      setClientEmail(initialDocument.client_email || '');
      setClientPhone(initialDocument.client_phone || '');
      setClientGstin(initialDocument.client_gstin || '');
      setSupplyState(initialDocument.supply_state || '');
      setStreetAddress(initialDocument.billing_address?.street || '');
      setCity(initialDocument.billing_address?.city || '');
      setPostalCode(initialDocument.billing_address?.postal_code || '');
      setNotes(initialDocument.notes || '');
      setTerms(initialDocument.terms_conditions || '');
      setItems(initialDocument.items || []);
    } else {
      setCompanyId('');
      setContactId('');
      setDocumentNumber('');
      setIssueDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setStatus(documentType === 'invoice' ? 'draft' : 'draft');
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientGstin('');
      setSupplyState('');
      setStreetAddress('');
      setCity('');
      setPostalCode('');
      setNotes('');
      setTerms('Payment due within 30 days of invoice date.');
      setItems([
        {
          item_name: '',
          description: '',
          hsn_sac: '',
          unit: 'Unit',
          quantity: 1,
          unit_price: 0,
          discount_percent: 0,
          tax_rate: 18,
          tax_amount: 0,
          total_amount: 0,
        },
      ]);
    }
  }, [open, initialDocument, documentType]);

  // Auto-fill when company is selected
  function handleCompanySelect(id: string) {
    setCompanyId(id);
    const comp = companies.find((c) => c.id === id);
    if (comp) {
      setClientName(comp.name);
      if (comp.email) setClientEmail(comp.email);
      if (comp.phone) setClientPhone(comp.phone);
      if (comp.tax_number) setClientGstin(comp.tax_number);
      if (comp.billing_address?.state) setSupplyState(comp.billing_address.state);
      if (comp.billing_address?.street) setStreetAddress(comp.billing_address.street);
      if (comp.billing_address?.city) setCity(comp.billing_address.city);
      if (comp.billing_address?.postal_code) setPostalCode(comp.billing_address.postal_code);
    }
  }

  // Auto-fill when contact is selected
  function handleContactSelect(id: string) {
    setContactId(id);
    const ct = contacts.find((c) => c.id === id);
    if (ct) {
      if (!clientName) setClientName(ct.name || ct.phone);
      if (ct.email && !clientEmail) setClientEmail(ct.email);
      if (ct.phone && !clientPhone) setClientPhone(ct.phone);
      if (ct.company_id && !companyId) handleCompanySelect(ct.company_id);
    }
  }

  // Add line item from catalog
  function handleAddProductItem(productId: string) {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const base = Number(prod.unit_price) || 0;
    const tax = (base * (prod.tax_rate || 0)) / 100;

    const newItem: CommercialDocumentItem = {
      product_id: prod.id,
      item_name: prod.name,
      description: prod.description || '',
      hsn_sac: prod.hsn_sac || '',
      unit: prod.unit || 'Unit',
      quantity: 1,
      unit_price: base,
      discount_percent: 0,
      tax_rate: prod.tax_rate ?? 18,
      tax_amount: Math.round(tax * 100) / 100,
      total_amount: Math.round((base + tax) * 100) / 100,
    };

    setItems((prev) => [...prev, newItem]);
  }

  // Update line item
  function updateItem(index: number, field: keyof CommercialDocumentItem, val: unknown) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };

      const qty = Math.max(0.001, parseFloat(String(item.quantity)) || 1);
      const price = Math.max(0, parseFloat(String(item.unit_price)) || 0);
      const disc = Math.min(100, Math.max(0, parseFloat(String(item.discount_percent)) || 0));
      const lineBase = qty * price;
      const discountVal = (lineBase * disc) / 100;
      const taxable = lineBase - discountVal;
      const rate = Math.max(0, parseFloat(String(item.tax_rate)) || 0);
      const taxAmt = (taxable * rate) / 100;

      item.tax_amount = Math.round(taxAmt * 100) / 100;
      item.total_amount = Math.round((taxable + taxAmt) * 100) / 100;
      updated[index] = item;
      return updated;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addNewEmptyItem() {
    setItems((prev) => [
      ...prev,
      {
        item_name: '',
        description: '',
        hsn_sac: '',
        unit: 'Unit',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        tax_rate: 18,
        tax_amount: 0,
        total_amount: 0,
      },
    ]);
  }

  // Computed Totals
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
    0
  );
  const totalDiscount = items.reduce((sum, item) => {
    const base = (Number(item.quantity) || 1) * (Number(item.unit_price) || 0);
    return sum + (base * (Number(item.discount_percent) || 0)) / 100;
  }, 0);
  const totalTax = items.reduce((sum, item) => sum + (Number(item.tax_amount) || 0), 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  const isInterState = orgState && supplyState && orgState.toLowerCase() !== supplyState.toLowerCase();
  const cgst = !isInterState ? totalTax / 2 : 0;
  const sgst = !isInterState ? totalTax / 2 : 0;
  const igst = isInterState ? totalTax : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error('Customer / Company name is required');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        document_type: documentType,
        document_number: documentNumber.trim() || undefined,
        company_id: companyId || null,
        contact_id: contactId || null,
        issue_date: issueDate,
        due_date: dueDate || null,
        status,
        currency: defaultCurrency,
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        client_phone: clientPhone.trim() || null,
        client_gstin: clientGstin.trim() || null,
        supply_state: supplyState.trim() || null,
        billing_address: {
          street: streetAddress.trim(),
          city: city.trim(),
          state: supplyState.trim(),
          postal_code: postalCode.trim(),
          country: 'India',
        },
        notes: notes.trim() || null,
        terms_conditions: terms.trim() || null,
        items,
      };

      const url = isEdit
        ? `/api/commercial-documents/${initialDocument.id}`
        : '/api/commercial-documents';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save document');
      }

      toast.success(
        isEdit
          ? `${documentType.toUpperCase()} updated successfully`
          : `${documentType.toUpperCase()} created successfully`
      );
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  }

  const docTitle =
    documentType === 'estimate'
      ? 'Estimate / Quotation'
      : documentType === 'sales_order'
      ? 'Sales Order'
      : 'Tax Invoice';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-card border-border text-foreground no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            {isEdit ? `Edit ${docTitle}` : `New ${docTitle}`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isIssuedInvoice && !isAdmin
              ? 'This invoice has been issued. Only an administrator can modify it.'
              : 'Fill in client details, GST parameters, and itemized lines.'}
          </DialogDescription>
        </DialogHeader>

        {!canEdit && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
            <strong>Read-only mode:</strong> Agents can edit documents until the invoice is issued.
            Please ask an Admin if you need revisions.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Top Parameters: Company, Contact, Date, Number, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 p-4 bg-muted/40 rounded-xl border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Select Company
              </Label>
              <select
                disabled={!canEdit}
                value={companyId}
                onChange={(e) => handleCompanySelect(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Contact Person
              </Label>
              <select
                disabled={!canEdit}
                value={contactId}
                onChange={(e) => handleContactSelect(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="bg-card border-border text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Issue Date
              </Label>
              <Input
                disabled={!canEdit}
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="bg-card border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
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
                className="bg-card border-border text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <select
                disabled={!canEdit}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

          {/* Client & Tax Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bill To & Supply Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Client Name *</Label>
                <Input
                  disabled={!canEdit}
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="bg-muted border-border text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Client GSTIN / Tax ID</Label>
                <Input
                  disabled={!canEdit}
                  value={clientGstin}
                  onChange={(e) => setClientGstin(e.target.value)}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="bg-muted border-border text-xs h-8 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Place of Supply (State)</Label>
                <select
                  disabled={!canEdit}
                  value={supplyState}
                  onChange={(e) => setSupplyState(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="bg-muted border-border text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2 lg:col-span-2 space-y-1">
                <Label className="text-xs">Street Address</Label>
                <Input
                  disabled={!canEdit}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Building, Street, Area..."
                  className="bg-muted border-border text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  disabled={!canEdit}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="bg-muted border-border text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Postal Code / PIN</Label>
                <Input
                  disabled={!canEdit}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="PIN"
                  className="bg-muted border-border text-xs h-8 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-primary" />
                Line Items
              </h4>
              {canEdit && products.length > 0 && (
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddProductItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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

            <div className="border border-border rounded-xl overflow-hidden bg-card">
              {/* Desktop / Tablet View: Spacious Dynamic Table (md: and up) */}
              <div className="hidden md:block overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[200px]">Item Description</th>
                      <th className="py-2.5 px-2 w-24">HSN/SAC</th>
                      <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                      <th className="py-2.5 px-2 w-22">Unit</th>
                      <th className="py-2.5 px-2 w-28 text-right">Rate ({defaultCurrency})</th>
                      <th className="py-2.5 px-2 w-18 text-center">Disc %</th>
                      <th className="py-2.5 px-2 w-22 text-center">GST %</th>
                      <th className="py-2.5 px-3 text-right w-28">Total</th>
                      {canEdit && <th className="py-2.5 px-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <Input
                            disabled={!canEdit}
                            required
                            value={item.item_name}
                            onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                            placeholder="Item name..."
                            className="h-7 text-xs bg-muted border-border font-medium"
                          />
                          <Input
                            disabled={!canEdit}
                            value={item.description || ''}
                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            placeholder="Optional line description..."
                            className="h-6 text-[11px] bg-transparent border-0 text-muted-foreground mt-0.5 px-1 focus-visible:ring-0"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            disabled={!canEdit}
                            value={item.hsn_sac || ''}
                            onChange={(e) => updateItem(idx, 'hsn_sac', e.target.value)}
                            placeholder="9983"
                            className="h-7 text-xs bg-muted border-border font-mono"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            disabled={!canEdit}
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="h-7 text-xs bg-muted border-border font-medium text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            disabled={!canEdit}
                            value={item.unit || 'Unit'}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                            className="w-full h-7 rounded border border-border bg-muted px-1 text-xs text-foreground"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            disabled={!canEdit}
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                            className="h-7 text-xs bg-muted border-border font-mono text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            disabled={!canEdit}
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            value={item.discount_percent}
                            onChange={(e) => updateItem(idx, 'discount_percent', e.target.value)}
                            className="h-7 text-xs bg-muted border-border font-mono text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            disabled={!canEdit}
                            value={item.tax_rate}
                            onChange={(e) => updateItem(idx, 'tax_rate', e.target.value)}
                            className="w-full h-7 rounded border border-border bg-muted px-1 text-xs text-foreground font-medium"
                          >
                            {GST_BRACKETS.map((b) => (
                              <option key={b.rate} value={b.rate}>
                                {b.rate}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          {formatCurrency(item.total_amount, defaultCurrency)}
                        </td>
                        {canEdit && (
                          <td className="py-2 px-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(idx)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
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
              <div className="block md:hidden divide-y divide-border">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3.5 space-y-2.5 bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Item #{idx + 1}
                        </span>
                        <span className="font-bold text-xs text-foreground font-mono">
                          {formatCurrency(item.total_amount, defaultCurrency)}
                        </span>
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(idx)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
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
                        onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                        placeholder="Item name *"
                        className="h-8 text-xs bg-muted border-border font-medium"
                      />
                      <Input
                        disabled={!canEdit}
                        value={item.description || ''}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Optional description / details..."
                        className="h-7 text-xs bg-muted/50 border-border text-muted-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">HSN/SAC</Label>
                        <Input
                          disabled={!canEdit}
                          value={item.hsn_sac || ''}
                          onChange={(e) => updateItem(idx, 'hsn_sac', e.target.value)}
                          placeholder="e.g. 9983"
                          className="h-8 text-xs bg-muted border-border font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Unit</Label>
                        <select
                          disabled={!canEdit}
                          value={item.unit || 'Unit'}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-full h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
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
                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input
                          disabled={!canEdit}
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="h-8 text-xs bg-muted border-border font-medium text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Rate ({defaultCurrency})</Label>
                        <Input
                          disabled={!canEdit}
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          className="h-8 text-xs bg-muted border-border font-mono text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">GST %</Label>
                        <select
                          disabled={!canEdit}
                          value={item.tax_rate}
                          onChange={(e) => updateItem(idx, 'tax_rate', e.target.value)}
                          className="w-full h-8 rounded-md border border-border bg-muted px-1.5 text-xs text-foreground font-medium"
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
                        <Label className="text-[10px] text-muted-foreground">Discount %</Label>
                        <Input
                          disabled={!canEdit}
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={item.discount_percent}
                          onChange={(e) => updateItem(idx, 'discount_percent', e.target.value)}
                          className="h-8 text-xs bg-muted border-border font-mono text-center"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <span className="text-[10px] text-muted-foreground">Item Subtotal</span>
                        <div className="text-xs font-mono font-bold text-foreground h-8 flex items-center">
                          {formatCurrency(item.total_amount, defaultCurrency)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {canEdit && (
                <div className="p-2.5 border-t border-border bg-muted/20 flex justify-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addNewEmptyItem}
                    className="text-xs text-primary font-medium hover:bg-primary/10 h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Custom Line Item
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tax Calculation Summary & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Terms & Conditions</Label>
                <Textarea
                  disabled={!canEdit}
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="bg-muted border-border text-xs resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Internal Notes / Payment Instructions</Label>
                <Textarea
                  disabled={!canEdit}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bank details, UPI ID, or delivery terms..."
                  className="bg-muted border-border text-xs resize-none"
                />
              </div>
            </div>

            {/* Indian GST Breakdown Box */}
            <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Taxable Subtotal:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatCurrency(subtotal, defaultCurrency)}
                </span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Discount:</span>
                  <span className="font-mono font-medium text-red-400">
                    -{formatCurrency(totalDiscount, defaultCurrency)}
                  </span>
                </div>
              )}

              <div className="py-2 border-y border-border/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Tax Mode:{' '}
                    {isInterState ? (
                      <span className="text-primary font-semibold">Inter-State (IGST)</span>
                    ) : (
                      <span className="text-primary font-semibold">Intra-State (CGST + SGST)</span>
                    )}
                  </span>
                  {orgState && supplyState && (
                    <span className="text-[10px] text-muted-foreground">
                      {orgState} → {supplyState}
                    </span>
                  )}
                </div>

                {!isInterState ? (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(cgst, defaultCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>State GST (SGST):</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(sgst, defaultCurrency)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(igst, defaultCurrency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-sm font-bold text-foreground pt-1">
                <span>Grand Total:</span>
                <span className="font-mono text-primary text-base">
                  {formatCurrency(grandTotal, defaultCurrency)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground"
            >
              Close
            </Button>
            {canEdit && (
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save Changes' : `Create ${docTitle}`}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
