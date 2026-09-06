'use client';

import { PackageCheck } from 'lucide-react';
import { CommercialDocumentsPage } from '@/components/commercial/commercial-documents-page';

export default function SalesOrdersPage() {
  return (
    <CommercialDocumentsPage
      documentType="sales_order"
      title="Sales Orders"
      subtitle="Track confirmed buyer orders, monitor order status, and convert into final tax invoices."
      icon={PackageCheck}
    />
  );
}
