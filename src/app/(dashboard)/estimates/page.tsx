'use client';

import { FileText } from 'lucide-react';
import { CommercialDocumentsPage } from '@/components/commercial/commercial-documents-page';

export default function EstimatesPage() {
  return (
    <CommercialDocumentsPage
      documentType="estimate"
      title="Estimates & Quotations"
      subtitle="Create formal price estimates, track customer approvals, and convert directly into sales orders."
      icon={FileText}
    />
  );
}
