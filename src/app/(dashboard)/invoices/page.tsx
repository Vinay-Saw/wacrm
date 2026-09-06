'use client';

import { Receipt } from 'lucide-react';
import { CommercialDocumentsPage } from '@/components/commercial/commercial-documents-page';

export default function InvoicesPage() {
  return (
    <CommercialDocumentsPage
      documentType="invoice"
      title="Tax Invoices"
      subtitle="Issue GST compliant invoices (CGST/SGST/IGST), record payments, and track outstanding receivables."
      icon={Receipt}
    />
  );
}
