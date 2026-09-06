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
  Mail,
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
import { Card, CardContent } from '@/components/ui/card';
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
  const [companyDetail, setCompanyDetail] = useState<any | null>(null);
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
      const res = await fetch(`/api/companies/${company.id}`, { cache: 'no-store' });
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

      const url = selectedCompany ? `/api/companies/${selectedCompany.id}` : '/api/companies';
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
      const res = await fetch(`/api/companies/${selectedCompany.id}`, { method: 'DELETE' });
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
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-primary" />
            Companies
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage B2B organizations, track multiple contacts per account, and monitor corporate deals.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5 shadow-sm self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          New Company
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, domain, GSTIN..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No companies found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {search
              ? 'No companies matched your search query.'
              : 'Add your first B2B company to group decision-makers, track corporate deals, and generate invoices.'}
          </p>
          {!search && (
            <Button onClick={openCreateDialog} size="sm" className="mt-4 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Company
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Industry / Size</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">Contacts</th>
                  <th className="py-3 px-4">Open Deals</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((comp) => (
                  <tr
                    key={comp.id}
                    onClick={() => openCompanyDetail(comp)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary font-bold text-xs uppercase">
                          {comp.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {comp.name}
                          </div>
                          {comp.domain ? (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {comp.domain}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {comp.industry || '—'}
                      {comp.company_size && (
                        <div className="text-[10px] text-muted-foreground">{comp.company_size}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {comp.primary_contact ? (
                        <div className="flex items-center gap-1.5">
                          <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                          <div>
                            <div className="font-medium text-foreground">
                              {comp.primary_contact.name || comp.primary_contact.phone}
                            </div>
                            {comp.primary_contact.job_title && (
                              <div className="text-[10px] text-muted-foreground">
                                {comp.primary_contact.job_title}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="secondary" className="gap-1 text-[11px] font-normal">
                        <Users className="h-3 w-3" />
                        {comp.contacts_count || 0}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {comp.open_deals_value
                        ? formatCurrency(comp.open_deals_value, defaultCurrency)
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground space-y-0.5">
                      {comp.phone && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {comp.phone}
                        </div>
                      )}
                      {comp.tax_number && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          GST: {comp.tax_number}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem onClick={() => openCompanyDetail(comp)}>
                            View Company Hub
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(comp)}>
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
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveCompany}>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {selectedCompany ? 'Edit Company' : 'New B2B Company'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Group decision-makers, track corporate deals, and specify official billing addresses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-name" className="text-xs font-medium">Company Name *</Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tata Consultancy Services"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-domain" className="text-xs font-medium">Domain / Website</Label>
                  <Input
                    id="c-domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="tcs.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-industry" className="text-xs font-medium">Industry</Label>
                  <Input
                    id="c-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Real Estate / IT / Manufacturing"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone" className="text-xs font-medium">Official Phone</Label>
                  <Input
                    id="c-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 22 1234 5678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email" className="text-xs font-medium">Official Email</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="procurement@company.com"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-tax" className="text-xs font-medium">GSTIN / Tax Identification Number</Label>
                  <Input
                    id="c-tax"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    className="font-mono uppercase text-xs"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="text-xs font-semibold text-foreground">Registered / Billing Address</div>
                <div className="space-y-2">
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Street Address, Suite / Floor"
                    className="text-xs"
                  />
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="text-xs"
                    />
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
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
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {selectedCompany ? 'Save Changes' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Company Hub / Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : companyDetail ? (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg uppercase shadow-sm">
                    {companyDetail.name.slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      {companyDetail.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                      {companyDetail.domain && (
                        <a
                          href={`https://${companyDetail.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 text-primary"
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
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
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
                <TabsList className="grid w-full grid-cols-3 bg-muted">
                  <TabsTrigger value="contacts" className="text-xs gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Contacts ({companyDetail.contacts?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="deals" className="text-xs gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    Deals ({companyDetail.deals?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="details" className="text-xs gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Company Details
                  </TabsTrigger>
                </TabsList>

                {/* Contacts Tab */}
                <TabsContent value="contacts" className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Key decision-makers and contacts associated with {companyDetail.name}:
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setAddContactDialogOpen(true)}
                      className="gap-1 text-xs h-7"
                    >
                      <Plus className="h-3 w-3" />
                      Add Contact
                    </Button>
                  </div>

                  {companyDetail.contacts?.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No contacts linked to this company yet. Click &ldquo;Add Contact&rdquo; to associate employees.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {companyDetail.contacts.map((ct: any) => (
                        <div
                          key={ct.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary font-semibold text-xs">
                              {(ct.name || ct.phone).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{ct.name || 'Unnamed'}</span>
                                {ct.is_primary_company_contact && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 py-0">
                                    Primary Contact
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>{ct.job_title || 'No title'}</span>
                                {ct.department && <span>· {ct.department}</span>}
                                <span>· {ct.phone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Link href={`/inbox?contact=${ct.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <MessageSquare className="h-3 w-3 text-emerald-500" />
                                Chat
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlinkContact(ct.id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
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
                    <p className="text-xs text-muted-foreground">
                      Pipeline deals and opportunities with {companyDetail.name}:
                    </p>
                  </div>

                  {companyDetail.deals?.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      No active deals linked to this company yet.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {companyDetail.deals.map((deal: any) => (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-foreground">{deal.title}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              {deal.pipeline?.name && <span>{deal.pipeline.name}</span>}
                              {deal.stage?.name && (
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  {deal.stage.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            {formatCurrency(deal.value, defaultCurrency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-3 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <Card className="border-border p-3">
                      <div className="font-semibold text-foreground mb-1.5">Registered Address</div>
                      <div className="text-muted-foreground space-y-0.5 text-[11px]">
                        <div>{companyDetail.billing_address?.street || 'No street specified'}</div>
                        <div>
                          {[
                            companyDetail.billing_address?.city,
                            companyDetail.billing_address?.state,
                            companyDetail.billing_address?.postal_code,
                          ]
                            .filter(Boolean)
                            .join(', ') || 'No city/state'}
                        </div>
                        <div>{companyDetail.billing_address?.country || 'India'}</div>
                      </div>
                    </Card>

                    <Card className="border-border p-3">
                      <div className="font-semibold text-foreground mb-1.5">Tax & Registration</div>
                      <div className="text-muted-foreground space-y-1 text-[11px]">
                        <div>
                          <span className="text-foreground">GSTIN / Tax ID:</span>{' '}
                          <code className="font-mono text-foreground font-semibold">
                            {companyDetail.tax_number || 'Not provided'}
                          </code>
                        </div>
                        <div>
                          <span className="text-foreground">Industry:</span>{' '}
                          {companyDetail.industry || 'Not specified'}
                        </div>
                        <div>
                          <span className="text-foreground">Official Email:</span>{' '}
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
      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-md">
          <form onSubmit={handleAddContact}>
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Contact to Company</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Add an employee or decision-maker under {selectedCompany?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">WhatsApp Phone Number *</Label>
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
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <Label htmlFor="make-primary" className="text-xs cursor-pointer">
                  Designate as Primary Company Contact
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddContactDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
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
            <DialogTitle className="text-foreground">Delete Company?</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{selectedCompany?.name}&rdquo;</span>?
              Contacts and deals linked to this company will remain preserved with their company association cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCompany} disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
