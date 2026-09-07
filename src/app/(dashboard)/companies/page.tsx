'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Users,
  MessageSquare,
  Globe,
  Phone,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
  Crown,
  MapPin,
  ExternalLink,
  Briefcase,
  X,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { INDIAN_STATES } from '@/components/settings/organisation-settings';
import type { Company, Contact } from '@/types';

interface CompanyContactItem extends Contact {
  is_primary_company_contact?: boolean;
  job_title?: string;
  department?: string;
}

interface CompanyDealItem {
  id: string;
  title: string;
  value?: number;
  currency?: string;
  status?: string;
  pipeline?: { name: string };
  stage?: { name: string };
  expected_close_date?: string;
}

interface CompanyDetailData extends Company {
  contacts?: CompanyContactItem[];
  deals?: CompanyDealItem[];
}

export default function CompaniesPage() {
  const { defaultCurrency, canManageMembers } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyDetailData | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  // Add Contact Form Fields
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactJobTitle, setNewContactJobTitle] = useState('');
  const [newContactDepartment, setNewContactDepartment] = useState('');
  const [newContactIsPrimary, setNewContactIsPrimary] = useState(false);

  // Fetch Companies
  const fetchCompanies = useCallback(async () => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/companies${q}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load companies');
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error(err);
      toast.error('Could not load companies');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  // Load detailed company
  const openCompanyDetail = async (company: Company) => {
    setSelectedCompany(company);
    setDetailDialogOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyDetail(data.company);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Create Dialog
  const openCreateDialog = () => {
    setSelectedCompany(null);
    setName('');
    setDomain('');
    setIndustry('');
    setCompanySize('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setTaxNumber('');
    setNotes('');
    setStreet('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('India');
    setEditDialogOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (company: Company) => {
    setSelectedCompany(company);
    setName(company.name);
    setDomain(company.domain || '');
    setIndustry(company.industry || '');
    setCompanySize(company.company_size || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setWebsite(company.website || '');
    setTaxNumber(company.tax_number || '');
    setNotes(company.notes || '');

    const bAddr = company.billing_address || {};
    setStreet(bAddr.street || '');
    setCity(bAddr.city || '');
    setState(bAddr.state || '');
    setPostalCode(bAddr.postal_code || '');
    setCountry(bAddr.country || 'India');

    setEditDialogOpen(true);
  };

  // Save Company (Create / Update)
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        domain: domain.trim() || null,
        industry: industry.trim() || null,
        company_size: companySize.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        tax_number: taxNumber.trim() || null,
        notes: notes.trim() || null,
        billing_address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
        },
      };

      const url = selectedCompany
        ? `/api/companies/${selectedCompany.id}`
        : '/api/companies';
      const method = selectedCompany ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save company');
      }

      toast.success(selectedCompany ? 'Company updated' : 'Company created');
      setEditDialogOpen(false);
      fetchCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save company';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Company
  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete company');
      toast.success('Company deleted');
      setDeleteDialogOpen(false);
      setDetailDialogOpen(false);
      fetchCompanies();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete company');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Contact to Company
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!newContactPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/companies/${selectedCompany.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newContactPhone.trim(),
          name: newContactName.trim() || undefined,
          email: newContactEmail.trim() || undefined,
          job_title: newContactJobTitle.trim() || undefined,
          department: newContactDepartment.trim() || undefined,
          is_primary_company_contact: newContactIsPrimary,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add contact');
      }

      toast.success('Contact added to company');
      setAddContactDialogOpen(false);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactEmail('');
      setNewContactJobTitle('');
      setNewContactDepartment('');
      setNewContactIsPrimary(false);

      // Refresh detail
      openCompanyDetail(selectedCompany);
      fetchCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add contact';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Unlink Contact
  const handleUnlinkContact = async (contactId: string) => {
    if (!selectedCompany) return;
    try {
      const res = await fetch(
        `/api/companies/${selectedCompany.id}/contacts?contactId=${contactId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to unlink contact');
      toast.success('Contact unlinked from company');
      openCompanyDetail(selectedCompany);
      fetchCompanies();
    } catch (err) {
      console.error(err);
      toast.error('Failed to unlink contact');
    }
  };

  return (
    <div className="animate-in fade-in-50 space-y-6 duration-200">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Building2 className="text-primary h-6 w-6" />
            Companies
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage B2B organizations, track multiple contacts per account, and
            monitor corporate deals.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-1.5 self-start shadow-sm sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Company
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, domain, GSTIN..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="border-border bg-card flex h-48 items-center justify-center rounded-xl border">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="border-border bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
          <div className="bg-primary-soft text-primary mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-foreground text-base font-semibold">
            No companies found
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            {search
              ? 'No companies matched your search query.'
              : 'Add your first B2B company to group decision-makers, track corporate deals, and generate invoices.'}
          </p>
          {!search && (
            <Button
              onClick={openCreateDialog}
              size="sm"
              className="mt-4 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Company
            </Button>
          )}
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-border bg-muted/40 text-muted-foreground border-b font-medium">
                <tr>
                  <th className="px-4 py-3">Company Name</th>
                  <th className="px-4 py-3">Industry / Size</th>
                  <th className="px-4 py-3">Primary Contact</th>
                  <th className="px-4 py-3">Contacts</th>
                  <th className="px-4 py-3">Open Deals</th>
                  <th className="px-4 py-3">Contact Details</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {companies.map((comp) => (
                  <tr
                    key={comp.id}
                    onClick={() => openCompanyDetail(comp)}
                    className="hover:bg-muted/40 group cursor-pointer transition-colors"
                  >
                    <td className="text-foreground px-4 py-3.5 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-primary-soft text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase">
                          {comp.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-foreground group-hover:text-primary font-semibold transition-colors">
                            {comp.name}
                          </div>
                          {comp.domain ? (
                            <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <Globe className="h-3 w-3" />
                              {comp.domain}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3.5">
                      {comp.industry || '—'}
                      {comp.company_size && (
                        <div className="text-muted-foreground text-[10px]">
                          {comp.company_size}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {comp.primary_contact ? (
                        <div className="flex items-center gap-1.5">
                          <Crown className="h-3 w-3 shrink-0 text-amber-500" />
                          <div>
                            <div className="text-foreground font-medium">
                              {comp.primary_contact.name ||
                                comp.primary_contact.phone}
                            </div>
                            {comp.primary_contact.job_title && (
                              <div className="text-muted-foreground text-[10px]">
                                {comp.primary_contact.job_title}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant="secondary"
                        className="gap-1 text-[11px] font-normal"
                      >
                        <Users className="h-3 w-3" />
                        {comp.contacts_count || 0}
                      </Badge>
                    </td>
                    <td className="text-foreground px-4 py-3.5 font-semibold">
                      {comp.open_deals_value
                        ? formatCurrency(comp.open_deals_value, defaultCurrency)
                        : '—'}
                    </td>
                    <td className="text-muted-foreground space-y-0.5 px-4 py-3.5">
                      {comp.phone && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Phone className="text-muted-foreground h-3 w-3" />
                          {comp.phone}
                        </div>
                      )}
                      {comp.tax_number && (
                        <div className="text-muted-foreground font-mono text-[10px]">
                          GST: {comp.tax_number}
                        </div>
                      )}
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
                          <DropdownMenuItem
                            onClick={() => openCompanyDetail(comp)}
                          >
                            View Company Hub
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(comp)}
                          >
                            <Edit2 className="mr-2 h-3.5 w-3.5" />
                            Edit Details
                          </DropdownMenuItem>
                          {canManageMembers && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedCompany(comp);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete Company
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Company Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <form onSubmit={handleSaveCompany}>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Building2 className="text-primary h-5 w-5" />
                {selectedCompany ? 'Edit Company' : 'New B2B Company'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Group decision-makers, track corporate deals, and specify
                official billing addresses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-name" className="text-xs font-medium">
                    Company Name *
                  </Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tata Consultancy Services"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-domain" className="text-xs font-medium">
                    Domain / Website
                  </Label>
                  <Input
                    id="c-domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="tcs.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-industry" className="text-xs font-medium">
                    Industry
                  </Label>
                  <Input
                    id="c-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Real Estate / IT / Manufacturing"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone" className="text-xs font-medium">
                    Official Phone
                  </Label>
                  <Input
                    id="c-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 22 1234 5678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email" className="text-xs font-medium">
                    Official Email
                  </Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="procurement@company.com"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-tax" className="text-xs font-medium">
                    GSTIN / Tax Identification Number
                  </Label>
                  <Input
                    id="c-tax"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="border-border space-y-2 border-t pt-2">
                <div className="text-foreground text-xs font-semibold">
                  Registered / Billing Address
                </div>
                <div className="space-y-2">
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Street Address, Suite / Floor"
                    className="text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="text-xs"
                    />
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="border-border bg-muted text-foreground focus:border-primary flex h-9 w-full rounded-md border px-2 py-1 text-xs outline-none"
                    >
                      <option value="">State</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="PIN Code"
                      className="text-xs"
                    />
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Country"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                {selectedCompany ? 'Save Changes' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Company Hub / Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {loadingDetail ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : companyDetail ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="border-border flex items-start justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold uppercase shadow-sm">
                    {companyDetail.name.slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-foreground flex items-center gap-2 text-xl font-bold">
                      {companyDetail.name}
                    </h2>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {companyDetail.domain && (
                        <a
                          href={`https://${companyDetail.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary flex items-center gap-1 hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          {companyDetail.domain}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {companyDetail.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {companyDetail.phone}
                        </span>
                      )}
                      {companyDetail.tax_number && (
                        <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
                          GSTIN: {companyDetail.tax_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(companyDetail)}
                  className="gap-1.5 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>

              {/* Tabs: Contacts, Deals, Address & Info */}
              <Tabs defaultValue="contacts" className="w-full">
                <TabsList className="bg-muted grid w-full grid-cols-3">
                  <TabsTrigger value="contacts" className="gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5" />
                    Contacts ({companyDetail.contacts?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="deals" className="gap-1.5 text-xs">
                    <Briefcase className="h-3.5 w-3.5" />
                    Deals ({companyDetail.deals?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="details" className="gap-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5" />
                    Company Details
                  </TabsTrigger>
                </TabsList>

                {/* Contacts Tab */}
                <TabsContent value="contacts" className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      Key decision-makers and contacts associated with{' '}
                      {companyDetail.name}:
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setAddContactDialogOpen(true)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add Contact
                    </Button>
                  </div>

                  {!companyDetail.contacts ||
                  companyDetail.contacts.length === 0 ? (
                    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-center text-xs">
                      No contacts linked to this company yet. Click &ldquo;Add
                      Contact&rdquo; to associate employees.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {companyDetail.contacts?.map((ct: CompanyContactItem) => (
                        <div
                          key={ct.id}
                          className="border-border bg-card flex items-center justify-between rounded-lg border p-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-primary-soft text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                              {(ct.name || ct.phone).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-foreground font-semibold">
                                  {ct.name || 'Unnamed'}
                                </span>
                                {ct.is_primary_company_contact && (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/20 bg-amber-500/10 py-0 text-[10px] text-amber-500"
                                  >
                                    Primary Contact
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                                <span>{ct.job_title || 'No title'}</span>
                                {ct.department && (
                                  <span>· {ct.department}</span>
                                )}
                                <span>· {ct.phone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Link href={`/inbox?contact=${ct.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                              >
                                <MessageSquare className="h-3 w-3 text-emerald-500" />
                                Chat
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlinkContact(ct.id)}
                              className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Deals Tab */}
                <TabsContent value="deals" className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      Pipeline deals and opportunities with {companyDetail.name}
                      :
                    </p>
                  </div>

                  {!companyDetail.deals || companyDetail.deals.length === 0 ? (
                    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-center text-xs">
                      No active deals linked to this company yet.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {companyDetail.deals?.map((deal: CompanyDealItem) => (
                        <div
                          key={deal.id}
                          className="border-border bg-card flex items-center justify-between rounded-lg border p-3 text-xs"
                        >
                          <div>
                            <div className="text-foreground font-semibold">
                              {deal.title}
                            </div>
                            <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[11px]">
                              {deal.pipeline?.name && (
                                <span>{deal.pipeline.name}</span>
                              )}
                              {deal.stage?.name && (
                                <Badge
                                  variant="secondary"
                                  className="py-0 text-[10px]"
                                >
                                  {deal.stage.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-foreground text-sm font-bold">
                            {formatCurrency(deal.value || 0, defaultCurrency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-3 pt-3">
                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <Card className="border-border p-3">
                      <div className="text-foreground mb-1.5 font-semibold">
                        Registered Address
                      </div>
                      <div className="text-muted-foreground space-y-0.5 text-[11px]">
                        <div>
                          {companyDetail.billing_address?.street ||
                            'No street specified'}
                        </div>
                        <div>
                          {[
                            companyDetail.billing_address?.city,
                            companyDetail.billing_address?.state,
                            companyDetail.billing_address?.postal_code,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'No city/state'}
                        </div>
                        <div>
                          {companyDetail.billing_address?.country || 'India'}
                        </div>
                      </div>
                    </Card>

                    <Card className="border-border p-3">
                      <div className="text-foreground mb-1.5 font-semibold">
                        Tax & Registration
                      </div>
                      <div className="text-muted-foreground space-y-1 text-[11px]">
                        <div>
                          <span className="text-foreground">
                            GSTIN / Tax ID:
                          </span>{' '}
                          <code className="text-foreground font-mono font-semibold">
                            {companyDetail.tax_number || 'Not provided'}
                          </code>
                        </div>
                        <div>
                          <span className="text-foreground">Industry:</span>{' '}
                          {companyDetail.industry || 'Not specified'}
                        </div>
                        <div>
                          <span className="text-foreground">
                            Official Email:
                          </span>{' '}
                          {companyDetail.email || 'Not specified'}
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog
        open={addContactDialogOpen}
        onOpenChange={setAddContactDialogOpen}
      >
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-md">
          <form onSubmit={handleAddContact}>
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Add Contact to Company
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Add an employee or decision-maker under {selectedCompany?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  WhatsApp Phone Number *
                </Label>
                <Input
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Contact Full Name</Label>
                <Input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Job Title</Label>
                  <Input
                    value={newContactJobTitle}
                    onChange={(e) => setNewContactJobTitle(e.target.value)}
                    placeholder="e.g. Head of Procurement"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Department</Label>
                  <Input
                    value={newContactDepartment}
                    onChange={(e) => setNewContactDepartment(e.target.value)}
                    placeholder="e.g. Finance"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Email Address</Label>
                <Input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="rajesh@company.com"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="make-primary"
                  checked={newContactIsPrimary}
                  onChange={(e) => setNewContactIsPrimary(e.target.checked)}
                  className="border-border text-primary focus:ring-primary rounded"
                />
                <Label
                  htmlFor="make-primary"
                  className="cursor-pointer text-xs"
                >
                  Designate as Primary Company Contact
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddContactDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Add Contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Delete Company?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Are you sure you want to delete{' '}
              <span className="text-foreground font-semibold">
                &ldquo;{selectedCompany?.name}&rdquo;
              </span>
              ? Contacts and deals linked to this company will remain preserved
              with their company association cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCompany}
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
