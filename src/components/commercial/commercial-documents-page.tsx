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
  const totalAmount = documents.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
  const totalPaid = documents.reduce((sum, d) => sum + Number(d.amount_paid || 0), 0);
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
    if (!confirm(`Are you sure you want to delete ${doc.document_number}?`)) return;
    try {
      const res = await fetch(`/api/commercial-documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create {documentType === 'estimate' ? 'Estimate' : documentType === 'sales_order' ? 'Sales Order' : 'Invoice'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Documents</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Value</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(totalAmount, defaultCurrency)}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {documentType === 'invoice' ? (
          <>
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Collected</p>
                  <h3 className="text-2xl font-bold text-emerald-500 mt-1">
                    {formatCurrency(totalPaid, defaultCurrency)}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Outstanding Due</p>
                  <h3 className="text-2xl font-bold text-amber-500 mt-1">
                    {formatCurrency(totalPending, defaultCurrency)}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active / In Progress</p>
                  <h3 className="text-2xl font-bold text-emerald-500 mt-1">
                    {documents.filter((d) => ['sent', 'confirmed', 'in_progress'].includes(d.status)).length}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Drafts</p>
                  <h3 className="text-2xl font-bold text-muted-foreground mt-1">
                    {documents.filter((d) => d.status === 'draft').length}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by document #, client, GSTIN..."
            className="pl-9 bg-card border-border text-foreground"
          />
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-semibold">Document #</th>
                <th className="py-3 px-4 font-semibold">Client / Company</th>
                <th className="py-3 px-4 font-semibold">Issue Date</th>
                <th className="py-3 px-4 font-semibold">GST / Tax</th>
                <th className="py-3 px-4 font-semibold">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Icon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No documents found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? 'Try adjusting your search criteria' : 'Create your first document to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isIssued = doc.document_type === 'invoice' && doc.status !== 'draft';
                  const canEditThisDoc = !isIssued || isAdmin;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => openPreview(doc)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {doc.document_number}
                        {doc.parent_document_id && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            Converted
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{doc.client_name || '-'}</div>
                        {doc.client_gstin && (
                          <div className="text-[10px] font-mono text-muted-foreground">
                            GST: {doc.client_gstin}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <div>{doc.issue_date}</div>
                        {doc.due_date && (
                          <div className="text-[10px] text-muted-foreground/70">Due: {doc.due_date}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                        {doc.tax_enabled ? (
                          <>
                            {doc.igst_amount > 0 ? (
                              <span>IGST: {formatCurrency(doc.igst_amount, defaultCurrency)}</span>
                            ) : (
                              <span>
                                CGST+SGST: {formatCurrency(doc.total_tax, defaultCurrency)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">Tax Exempt</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground font-mono">
                          {formatCurrency(doc.total_amount, defaultCurrency)}
                        </div>
                        {doc.amount_paid > 0 && (
                          <div className="text-[10px] font-medium text-emerald-500">
                            Paid: {formatCurrency(doc.amount_paid, defaultCurrency)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium capitalize ${
                            ['paid', 'accepted', 'fulfilled', 'invoiced'].includes(doc.status)
                              ? 'bg-emerald-500/15 text-emerald-500 border-0'
                              : ['issued', 'confirmed', 'sent', 'in_progress'].includes(doc.status)
                              ? 'bg-primary/15 text-primary border-0'
                              : ['partially_paid', 'draft'].includes(doc.status)
                              ? 'bg-amber-500/15 text-amber-500 border-0'
                              : 'bg-muted text-muted-foreground border-0'
                          }`}
                        >
                          {doc.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" />
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
