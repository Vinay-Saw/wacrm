'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  Receipt,
  PackageCheck,
  MoreHorizontal,
  Edit2,
  Trash2,
  Printer,
  ArrowRightCircle,
  CreditCard,
  Loader2,
  FileCheck2,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentFormDialog } from './document-form-dialog';
import { DocumentPreviewModal } from './document-preview-modal';
import type { CommercialDocument, CommercialDocumentType } from '@/types';

interface CommercialDocumentsPageProps {
  documentType: CommercialDocumentType;
  title: string;
  subtitle: string;
  icon: typeof FileText;
}

export function CommercialDocumentsPage({
  documentType,
  title,
  subtitle,
  icon: Icon,
}: CommercialDocumentsPageProps) {
  const { defaultCurrency, canManageMembers } = useAuth();
  const isAdmin = canManageMembers;

  const [documents, setDocuments] = useState<CommercialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CommercialDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<CommercialDocument | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/commercial-documents?type=${documentType}${
        statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      toast.error('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [documentType, statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // KPIs
  const totalCount = documents.length;
  const totalAmount = documents.reduce(
    (sum, d) => sum + Number(d.total_amount || 0),
    0
  );
  const totalPaid = documents.reduce(
    (sum, d) => sum + Number(d.amount_paid || 0),
    0
  );
  const totalPending = Math.max(0, totalAmount - totalPaid);

  const filteredDocs = documents.filter((doc) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      doc.document_number.toLowerCase().includes(term) ||
      (doc.client_name && doc.client_name.toLowerCase().includes(term)) ||
      (doc.client_gstin && doc.client_gstin.toLowerCase().includes(term))
    );
  });

  function openCreate() {
    setEditingDoc(null);
    setFormOpen(true);
  }

  function openEdit(doc: CommercialDocument) {
    setEditingDoc(doc);
    setFormOpen(true);
  }

  function openPreview(doc: CommercialDocument) {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  }

  async function handleDelete(doc: CommercialDocument) {
    if (!confirm(`Are you sure you want to delete ${doc.document_number}?`))
      return;
    try {
      const res = await fetch(`/api/commercial-documents/${doc.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="mx-auto max-w-7xl flex-1 space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Icon className="text-primary h-6 w-6" />
            {title}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create{' '}
          {documentType === 'estimate'
            ? 'Estimate'
            : documentType === 'sales_order'
              ? 'Sales Order'
              : 'Invoice'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                Total Documents
              </p>
              <h3 className="text-foreground mt-1 text-2xl font-bold">
                {totalCount}
              </h3>
            </div>
            <div className="bg-primary/10 text-primary rounded-xl p-2.5">
              <Icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium">
                Total Value
              </p>
              <h3 className="text-foreground mt-1 text-2xl font-bold">
                {formatCurrency(totalAmount, defaultCurrency)}
              </h3>
            </div>
            <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-500">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {documentType === 'invoice' ? (
          <>
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Total Collected
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-emerald-500">
                    {formatCurrency(totalPaid, defaultCurrency)}
                  </h3>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Outstanding Due
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-amber-500">
                    {formatCurrency(totalPending, defaultCurrency)}
                  </h3>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Active / In Progress
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-emerald-500">
                    {
                      documents.filter((d) =>
                        ['sent', 'confirmed', 'in_progress'].includes(d.status)
                      ).length
                    }
                  </h3>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Drafts
                  </p>
                  <h3 className="text-muted-foreground mt-1 text-2xl font-bold">
                    {documents.filter((d) => d.status === 'draft').length}
                  </h3>
                </div>
                <div className="bg-muted text-muted-foreground rounded-xl p-2.5">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by document #, client, GSTIN..."
            className="bg-card border-border text-foreground pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-border bg-card text-foreground focus:ring-primary h-10 rounded-md border px-3 text-xs focus:ring-1 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            {documentType === 'estimate' && (
              <>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="converted">Converted</option>
              </>
            )}
            {documentType === 'sales_order' && (
              <>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="invoiced">Invoiced</option>
              </>
            )}
            {documentType === 'invoice' && (
              <>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <Card className="bg-card border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="text-foreground w-full text-left text-sm">
            <thead className="bg-muted/50 border-border text-muted-foreground border-b text-xs tracking-wider uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold">Document #</th>
                <th className="px-4 py-3 font-semibold">Client / Company</th>
                <th className="px-4 py-3 font-semibold">Issue Date</th>
                <th className="px-4 py-3 font-semibold">GST / Tax</th>
                <th className="px-4 py-3 font-semibold">Total Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground py-12 text-center"
                  >
                    <Loader2 className="text-primary mx-auto mb-2 h-6 w-6 animate-spin" />
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground py-12 text-center"
                  >
                    <Icon className="text-muted-foreground/50 mx-auto mb-2 h-10 w-10" />
                    <p className="text-foreground font-medium">
                      No documents found
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {search
                        ? 'Try adjusting your search criteria'
                        : 'Create your first document to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isIssued =
                    doc.document_type === 'invoice' && doc.status !== 'draft';
                  const canEditThisDoc = !isIssued || isAdmin;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => openPreview(doc)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="text-foreground px-4 py-3.5 font-mono font-bold">
                        {doc.document_number}
                        {doc.parent_document_id && (
                          <span className="text-muted-foreground block text-[10px] font-normal">
                            Converted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-foreground font-semibold">
                          {doc.client_name || '-'}
                        </div>
                        {doc.client_gstin && (
                          <div className="text-muted-foreground font-mono text-[10px]">
                            GST: {doc.client_gstin}
                          </div>
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-3.5 text-xs">
                        <div>{doc.issue_date}</div>
                        {doc.due_date && (
                          <div className="text-muted-foreground/70 text-[10px]">
                            Due: {doc.due_date}
                          </div>
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-3.5 font-mono text-xs">
                        {doc.tax_enabled ? (
                          <>
                            {doc.igst_amount > 0 ? (
                              <span>
                                IGST:{' '}
                                {formatCurrency(
                                  doc.igst_amount,
                                  defaultCurrency
                                )}
                              </span>
                            ) : (
                              <span>
                                CGST+SGST:{' '}
                                {formatCurrency(doc.total_tax, defaultCurrency)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Tax Exempt
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-foreground font-mono font-bold">
                          {formatCurrency(doc.total_amount, defaultCurrency)}
                        </div>
                        {doc.amount_paid > 0 && (
                          <div className="text-[10px] font-medium text-emerald-500">
                            Paid:{' '}
                            {formatCurrency(doc.amount_paid, defaultCurrency)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium capitalize ${
                            [
                              'paid',
                              'accepted',
                              'fulfilled',
                              'invoiced',
                            ].includes(doc.status)
                              ? 'border-0 bg-emerald-500/15 text-emerald-500'
                              : [
                                    'issued',
                                    'confirmed',
                                    'sent',
                                    'in_progress',
                                  ].includes(doc.status)
                                ? 'bg-primary/15 text-primary border-0'
                                : ['partially_paid', 'draft'].includes(
                                      doc.status
                                    )
                                  ? 'border-0 bg-amber-500/15 text-amber-500'
                                  : 'bg-muted text-muted-foreground border-0'
                          }`}
                        >
                          {doc.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td
                        className="px-4 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              />
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => openPreview(doc)}>
                              <Printer className="mr-2 h-3.5 w-3.5" />
                              View / Print PDF
                            </DropdownMenuItem>

                            {canEditThisDoc && (
                              <DropdownMenuItem onClick={() => openEdit(doc)}>
                                <Edit2 className="mr-2 h-3.5 w-3.5" />
                                Edit Details
                              </DropdownMenuItem>
                            )}

                            {canManageMembers && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(doc)}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Editor Dialog */}
      <DocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        documentType={documentType}
        initialDocument={editingDoc}
        onSaved={fetchDocuments}
      />

      {/* Preview & Print Modal */}
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={(d) => {
          setPreviewOpen(false);
          openEdit(d);
        }}
        onConverted={fetchDocuments}
      />
    </div>
  );
}
