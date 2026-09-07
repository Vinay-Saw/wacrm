'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  CommercialDocument,
  CommercialDocumentType,
  CommercialDocumentItem,
  Company,
  Contact,
  Product,
} from '@/types';
import { DocumentHeaderFields } from './document-header-fields';
import { DocumentClientFields } from './document-client-fields';
import { DocumentLineItems } from './document-line-items';
import { DocumentTaxSummary } from './document-tax-summary';

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
  const { defaultCurrency, canManageMembers } = useAuth();
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
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split('T')[0]
  );
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
    initialDocument?.document_type === 'invoice' &&
    initialDocument?.status !== 'draft';
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
          fetch('/api/settings/organisation')
            .then((r) => r.json())
            .catch(() => ({})),
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
      setStatus('draft');
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
      if (comp.billing_address?.state)
        setSupplyState(comp.billing_address.state);
      if (comp.billing_address?.street)
        setStreetAddress(comp.billing_address.street);
      if (comp.billing_address?.city) setCity(comp.billing_address.city);
      if (comp.billing_address?.postal_code)
        setPostalCode(comp.billing_address.postal_code);
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
  function updateItem(
    index: number,
    field: keyof CommercialDocumentItem,
    val: unknown
  ) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };

      const qty = Math.max(0.001, parseFloat(String(item.quantity)) || 1);
      const price = Math.max(0, parseFloat(String(item.unit_price)) || 0);
      const disc = Math.min(
        100,
        Math.max(0, parseFloat(String(item.discount_percent)) || 0)
      );
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
    (sum, item) =>
      sum + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
    0
  );
  const totalDiscount = items.reduce((sum, item) => {
    const base = (Number(item.quantity) || 1) * (Number(item.unit_price) || 0);
    return sum + (base * (Number(item.discount_percent) || 0)) / 100;
  }, 0);
  const totalTax = items.reduce(
    (sum, item) => sum + (Number(item.tax_amount) || 0),
    0
  );
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  const isInterState = Boolean(
    orgState &&
    supplyState &&
    orgState.toLowerCase() !== supplyState.toLowerCase()
  );
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
      <DialogContent className="bg-card border-border text-foreground no-scrollbar max-h-[90vh] w-[95vw] overflow-x-hidden overflow-y-auto p-4 sm:w-[92vw] sm:max-w-3xl sm:p-6 md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="text-primary h-5 w-5" />
            {isEdit ? `Edit ${docTitle}` : `New ${docTitle}`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {isIssuedInvoice && !isAdmin
              ? 'This invoice has been issued. Only an administrator can modify it.'
              : 'Fill in client details, GST parameters, and itemized lines.'}
          </DialogDescription>
        </DialogHeader>

        {!canEdit && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
            <strong>Read-only mode:</strong> Agents can edit documents until the
            invoice is issued. Please ask an Admin if you need revisions.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <DocumentHeaderFields
            canEdit={canEdit}
            documentType={documentType}
            companyId={companyId}
            companies={companies}
            onCompanySelect={handleCompanySelect}
            contactId={contactId}
            contacts={contacts}
            onContactSelect={handleContactSelect}
            documentNumber={documentNumber}
            setDocumentNumber={setDocumentNumber}
            issueDate={issueDate}
            setIssueDate={setIssueDate}
            dueDate={dueDate}
            setDueDate={setDueDate}
            status={status}
            setStatus={setStatus}
          />

          <DocumentClientFields
            canEdit={canEdit}
            clientName={clientName}
            setClientName={setClientName}
            clientGstin={clientGstin}
            setClientGstin={setClientGstin}
            supplyState={supplyState}
            setSupplyState={setSupplyState}
            clientPhone={clientPhone}
            setClientPhone={setClientPhone}
            streetAddress={streetAddress}
            setStreetAddress={setStreetAddress}
            city={city}
            setCity={setCity}
            postalCode={postalCode}
            setPostalCode={setPostalCode}
          />

          <DocumentLineItems
            items={items}
            products={products}
            canEdit={canEdit}
            defaultCurrency={defaultCurrency}
            onAddItem={handleAddProductItem}
            onAddNewEmptyItem={addNewEmptyItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
          />

          <DocumentTaxSummary
            canEdit={canEdit}
            terms={terms}
            setTerms={setTerms}
            notes={notes}
            setNotes={setNotes}
            subtotal={subtotal}
            totalDiscount={totalDiscount}
            grandTotal={grandTotal}
            isInterState={isInterState}
            orgState={orgState}
            supplyState={supplyState}
            cgst={cgst}
            sgst={sgst}
            igst={igst}
            defaultCurrency={defaultCurrency}
          />

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
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground"
              >
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
