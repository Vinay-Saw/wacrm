'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Upload,
  Trash2,
  Loader2,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export function OrganisationSettings() {
  const supabase = createClient();
  const { account, accountId, user, canEditSettings, refreshProfile } = useAuth();

  // Basic Profile
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  // Indian GST / Tax
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxId, setTaxId] = useState('');

  // Document Numbering & Branding
  const [estimatePrefix, setEstimatePrefix] = useState('EST');
  const [estimateNext, setEstimateNext] = useState(1);
  const [orderPrefix, setOrderPrefix] = useState('SO');
  const [orderNext, setOrderNext] = useState(1);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [invoiceNext, setInvoiceNext] = useState(1);
  const [headerText, setHeaderText] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [footerText, setFooterText] = useState('');

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with account data
  useEffect(() => {
    if (!account) return;
    setName(account.name || '');
    setLogoUrl(account.logo_url || null);
    setPhone(account.phone || '');
    setEmail(account.email || '');
    setWebsite(account.website || '');

    const addr = account.address || {};
    setStreet(addr.street || '');
    setCity(addr.city || '');
    setState(addr.state || '');
    setPostalCode(addr.postal_code || '');
    setCountry(addr.country || 'India');

    setTaxEnabled(account.tax_enabled ?? true);
    setTaxId(account.tax_id || '');

    const doc = account.document_settings || {};
    setEstimatePrefix(doc.estimate_prefix || 'EST');
    setEstimateNext(doc.estimate_next || 1);
    setOrderPrefix(doc.order_prefix || 'SO');
    setOrderNext(doc.order_next || 1);
    setInvoicePrefix(doc.invoice_prefix || 'INV');
    setInvoiceNext(doc.invoice_next || 1);
    setHeaderText(doc.header_text || '');
    setTermsConditions(doc.terms_conditions || '');
    setFooterText(doc.footer_text || '');
  }, [account]);

  // Handle Logo selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo image must be under 2 MB');
      return;
    }
    setPendingLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setPendingLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    if (!name.trim()) {
      toast.error('Organisation name is required');
      return;
    }

    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      // Upload new logo if selected
      if (pendingLogoFile) {
        const ext = pendingLogoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const uploadUserId = user?.id || accountId;
        const path = `${uploadUserId}/org-logo-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, pendingLogoFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: pendingLogoFile.type,
          });

        if (uploadErr) {
          throw new Error(`Logo upload failed: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        finalLogoUrl = urlData.publicUrl;
      }

      const updatedData = {
        name: name.trim(),
        logo_url: finalLogoUrl,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        address: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
        },
        tax_id: taxId.trim() || null,
        tax_enabled: taxEnabled,
        document_settings: {
          estimate_prefix: estimatePrefix.trim() || 'EST',
          estimate_next: Math.max(1, Number(estimateNext) || 1),
          order_prefix: orderPrefix.trim() || 'SO',
          order_next: Math.max(1, Number(orderNext) || 1),
          invoice_prefix: invoicePrefix.trim() || 'INV',
          invoice_next: Math.max(1, Number(invoiceNext) || 1),
          state: state.trim(),
          terms_conditions: termsConditions.trim(),
          header_text: headerText.trim(),
          footer_text: footerText.trim(),
        },
      };

      const { error: updateErr } = await supabase
        .from('accounts')
        .update(updatedData)
        .eq('id', accountId);

      if (updateErr) throw updateErr;

      setLogoUrl(finalLogoUrl);
      setPendingLogoFile(null);
      await refreshProfile();
      toast.success('Organisation settings saved successfully');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to save organisation settings';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const displayLogo = logoPreviewUrl || logoUrl;

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Organisation Setup"
        description="Configure your official company profile, tax registration (GST), branding logo, and customizable numbering for Estimates, Sales Orders, and Invoices."
        action={
          <Button type="submit" disabled={saving || !canEditSettings} className="gap-2 shadow-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Changes
          </Button>
        }
      />

      {/* 1. Identity & Branding */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Company Identity & Logo
          </CardTitle>
          <CardDescription className="text-xs">
            Your brand assets will appear on all generated Quotations, Orders, and Invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40">
              {displayLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayLogo} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canEditSettings}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {displayLogo ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {displayLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={!canEditSettings}
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Square or horizontal PNG, JPG, or SVG. Maximum 2 MB.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name" className="text-xs font-medium">Organisation Legal Name *</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                disabled={!canEditSettings}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-website" className="text-xs font-medium">Website</Label>
              <Input
                id="org-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                disabled={!canEditSettings}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-phone" className="text-xs font-medium">Official Contact Phone</Label>
              <Input
                id="org-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                disabled={!canEditSettings}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-email" className="text-xs font-medium">Official Billing Email</Label>
              <Input
                id="org-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="billing@example.com"
                disabled={!canEditSettings}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Registered Office Address */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Registered Office Address</CardTitle>
          <CardDescription className="text-xs">
            Appears on the header of formal tax invoices and commercial documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="org-street" className="text-xs font-medium">Street Address / Suite</Label>
            <Input
              id="org-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Suite 401, Tech Park Avenue"
              disabled={!canEditSettings}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-city" className="text-xs font-medium">City</Label>
              <Input
                id="org-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                disabled={!canEditSettings}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-state" className="text-xs font-medium">State / Union Territory *</Label>
              <select
                id="org-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={!canEditSettings}
                className="flex h-9 w-full rounded-md border border-border bg-muted px-3 py-1 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-postal" className="text-xs font-medium">PIN / Postal Code</Label>
              <Input
                id="org-postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="400001"
                disabled={!canEditSettings}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-country" className="text-xs font-medium">Country</Label>
              <Input
                id="org-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                disabled={!canEditSettings}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Indian Standard Tax (GST) Settings */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Tax System (GST / VAT)
              </CardTitle>
              <CardDescription className="text-xs">
                Configure standard Indian GST compliance or disable tax calculations.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {taxEnabled ? 'Tax Enabled' : 'Tax Disabled'}
              </span>
              <Switch
                checked={taxEnabled}
                onCheckedChange={setTaxEnabled}
                disabled={!canEditSettings}
              />
            </div>
          </div>
        </CardHeader>
        {taxEnabled && (
          <CardContent className="space-y-3 pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="org-gstin" className="text-xs font-medium">
                  GSTIN / Tax Identification Number
                </Label>
                <Input
                  id="org-gstin"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                  placeholder="27AABCU9603R1ZM"
                  disabled={!canEditSettings}
                  maxLength={20}
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Home State for Tax Rule</Label>
                <Input
                  value={state || 'Not selected (select in address above)'}
                  disabled
                  className="bg-muted/50 text-xs text-muted-foreground"
                />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Standard Indian GST Rules:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>
                  <strong>Intra-State:</strong> When the customer&apos;s state matches{' '}
                  <span className="text-primary font-medium">{state || 'your home state'}</span>, the tax is split into equal <strong>CGST + SGST</strong>.
                </li>
                <li>
                  <strong>Inter-State:</strong> When the customer&apos;s state is different, <strong>IGST</strong> is applied in full.
                </li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Document Numbering & Header/Footer Customization */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Document Numbering & Custom Branding
          </CardTitle>
          <CardDescription className="text-xs">
            Customize sequential numbering and default headers and footers for your documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Estimate */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-semibold text-foreground">Estimates / Quotations</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Prefix</Label>
                  <Input
                    value={estimatePrefix}
                    onChange={(e) => setEstimatePrefix(e.target.value.toUpperCase())}
                    placeholder="EST"
                    disabled={!canEditSettings}
                    className="h-8 text-xs uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Next #</Label>
                  <Input
                    type="number"
                    min={1}
                    value={estimateNext}
                    onChange={(e) => setEstimateNext(Number(e.target.value))}
                    disabled={!canEditSettings}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Next: <code className="text-foreground">{estimatePrefix}-{String(estimateNext).padStart(4, '0')}</code>
              </p>
            </div>

            {/* Sales Order */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-semibold text-foreground">Sales Orders</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Prefix</Label>
                  <Input
                    value={orderPrefix}
                    onChange={(e) => setOrderPrefix(e.target.value.toUpperCase())}
                    placeholder="SO"
                    disabled={!canEditSettings}
                    className="h-8 text-xs uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Next #</Label>
                  <Input
                    type="number"
                    min={1}
                    value={orderNext}
                    onChange={(e) => setOrderNext(Number(e.target.value))}
                    disabled={!canEditSettings}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Next: <code className="text-foreground">{orderPrefix}-{String(orderNext).padStart(4, '0')}</code>
              </p>
            </div>

            {/* Invoice */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="text-xs font-semibold text-foreground">Tax Invoices</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Prefix</Label>
                  <Input
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                    placeholder="INV"
                    disabled={!canEditSettings}
                    className="h-8 text-xs uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Next #</Label>
                  <Input
                    type="number"
                    min={1}
                    value={invoiceNext}
                    onChange={(e) => setInvoiceNext(Number(e.target.value))}
                    disabled={!canEditSettings}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Next: <code className="text-foreground">{invoicePrefix}-{String(invoiceNext).padStart(4, '0')}</code>
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="header-text" className="text-xs font-medium">Default Document Header Note / Memo</Label>
              <Input
                id="header-text"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="e.g. Thanks for your business!"
                disabled={!canEditSettings}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terms-conditions" className="text-xs font-medium">Standard Terms & Conditions</Label>
              <Textarea
                id="terms-conditions"
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                placeholder="1. Payment is due within 15 days of issue date.&#10;2. Bank Transfer details: HDFC Bank, A/C: 1234567890, IFSC: HDFC0001234"
                rows={3}
                disabled={!canEditSettings}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="footer-text" className="text-xs font-medium">Footer Disclaimer / Authorised Signatory Note</Label>
              <Input
                id="footer-text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="This is a computer-generated document and does not require a physical signature."
                disabled={!canEditSettings}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
