'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Globe,
  Plus,
  Copy,
  Check,
  Code,
  Trash2,
  Edit2,
  Loader2,
  Tag,
  Kanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { RequireRole } from '@/components/auth/require-role';
import { SettingsPanelHead } from './settings-panel-head';
import { createClient } from '@/lib/supabase/client';
import type { LeadForm, Pipeline, PipelineStage } from '@/types';

export function LeadFormsManager() {
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Active item in modal
  const [selectedForm, setSelectedForm] = useState<LeadForm | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form edit fields
  const [formName, setFormName] = useState('');
  const [formPipelineId, setFormPipelineId] = useState<string>('');
  const [formStageId, setFormStageId] = useState<string>('');
  const [formDealTitle, setFormDealTitle] = useState('{name} - Website Lead');
  const [formDealValue, setFormDealValue] = useState<number>(0);
  const [formTags, setFormTags] = useState<string>('Website Lead');
  const [formRedirectUrl, setFormRedirectUrl] = useState('');

  const supabase = createClient();

  // Load forms
  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch('/api/lead-forms', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch lead forms');
      const data = await res.json();
      setForms(data.forms ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Could not load lead forms');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load metadata (pipelines, stages, tags)
  useEffect(() => {
    fetchForms();

    async function loadMeta() {
      try {
        const [pipeRes, stageRes, tagRes] = await Promise.all([
          supabase.from('pipelines').select('*').order('created_at'),
          supabase.from('pipeline_stages').select('*').order('position'),
          supabase.from('tags').select('id, name').order('name'),
        ]);

        if (pipeRes.data) setPipelines(pipeRes.data as Pipeline[]);
        if (stageRes.data) setStages(stageRes.data as PipelineStage[]);
        if (tagRes.data) setAvailableTags(tagRes.data as { id: string; name: string }[]);
      } catch (err) {
        console.warn('Metadata fetch warning:', err);
      }
    }

    loadMeta();
  }, [fetchForms, supabase]);

  // Open Create Dialog
  const openCreateDialog = () => {
    setSelectedForm(null);
    setFormName('');
    const defaultPipe = pipelines[0]?.id || '';
    setFormPipelineId(defaultPipe);
    const matchingStages = stages.filter((s) => s.pipeline_id === defaultPipe);
    setFormStageId(matchingStages[0]?.id || '');
    setFormDealTitle('{name} - Website Lead');
    setFormDealValue(0);
    setFormTags('Website Lead');
    setFormRedirectUrl('');
    setEditDialogOpen(true);
  };

  // Open Edit Dialog
  const openEditDialog = (form: LeadForm) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormPipelineId(form.pipeline_id || '');
    setFormStageId(form.stage_id || '');
    setFormDealTitle(form.default_deal_title || '{name} - Website Lead');
    setFormDealValue(form.default_deal_value || 0);
    setFormTags(form.tags?.join(', ') || '');
    setFormRedirectUrl(form.success_redirect_url || '');
    setEditDialogOpen(true);
  };

  // Save (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Form name is required');
      return;
    }

    setSubmitting(true);
    const tagArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name: formName.trim(),
      pipeline_id: formPipelineId || null,
      stage_id: formStageId || null,
      default_deal_title: formDealTitle.trim() || '{name} - Website Lead',
      default_deal_value: Number(formDealValue) || 0,
      tags: tagArray,
      success_redirect_url: formRedirectUrl.trim() || null,
    };

    try {
      let res;
      if (selectedForm) {
        res = await fetch(`/api/lead-forms/${selectedForm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/lead-forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save lead form');
      }

      toast.success(selectedForm ? 'Form updated' : 'Lead form created');
      setEditDialogOpen(false);
      fetchForms();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving form';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleActive = async (form: LeadForm, nextState: boolean) => {
    try {
      const res = await fetch(`/api/lead-forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextState }),
      });

      if (!res.ok) throw new Error('Failed to toggle status');

      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, is_active: nextState } : f))
      );
      toast.success(nextState ? 'Form activated' : 'Form paused');
    } catch (err) {
      console.error(err);
      toast.error('Could not update status');
    }
  };

  // Delete Form
  const handleDelete = async () => {
    if (!selectedForm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lead-forms/${selectedForm.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete form');
      toast.success('Form deleted');
      setDeleteDialogOpen(false);
      setForms((prev) => prev.filter((f) => f.id !== selectedForm.id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete form');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy URL
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getEndpointUrl = (formKey: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/leads/${formKey}`;
    }
    return `/api/leads/${formKey}`;
  };

  const filteredStages = stages.filter((s) => s.pipeline_id === formPipelineId);

  return (
    <div>
      <SettingsPanelHead
        title="Lead capture forms"
        description="Create inbound webhook endpoints for your website inquiry forms (Webflow, WordPress, HTML, Elementor). Submissions automatically register contacts, create deals, and trigger WhatsApp automations."
        action={
          <RequireRole min="admin">
            <Button onClick={openCreateDialog} className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              New Lead Form
            </Button>
          </RequireRole>
        }
      />

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Globe className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No lead forms yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your website contact forms to automatically capture leads and sync them directly into Automa CRM.
          </p>
          <RequireRole min="admin">
            <Button onClick={openCreateDialog} className="mt-5 gap-1.5">
              <Plus className="h-4 w-4" />
              Create your first lead form
            </Button>
          </RequireRole>
        </div>
      ) : (
        <div className="space-y-4">
          {forms.map((form) => {
            const endpointUrl = getEndpointUrl(form.form_key);
            const isCopied = copiedKey === form.id;

            return (
              <Card key={form.id} className="overflow-hidden border-border bg-card transition-all hover:border-border/80 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="truncate font-semibold text-foreground text-base">{form.name}</h3>
                        <Badge
                          variant="outline"
                          className={
                            form.is_active
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs'
                              : 'border-muted-foreground/30 bg-muted/40 text-muted-foreground text-xs'
                          }
                        >
                          {form.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>

                      {/* Endpoint Copy Bar */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <code className="truncate rounded-md border border-border/80 bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground select-all font-mono">
                          {endpointUrl}
                        </code>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => copyToClipboard(endpointUrl, form.id)}
                          title="Copy Endpoint URL"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>

                      {/* Form Details / Metadata Pills */}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {form.pipeline && (
                          <div className="flex items-center gap-1">
                            <Kanban className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {form.pipeline.name} {form.stage ? `→ ${form.stage.name}` : ''}
                            </span>
                          </div>
                        )}

                        {form.tags && form.tags.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                            {form.tags.map((t) => (
                              <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-[11px] text-muted-foreground/80">
                          {form.submissions_count} {form.submissions_count === 1 ? 'lead' : 'leads'} captured
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          setSelectedForm(form);
                          setCodeDialogOpen(true);
                        }}
                      >
                        <Code className="h-3.5 w-3.5" />
                        Get Code
                      </Button>

                      <RequireRole min="admin">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(form)}
                          title="Edit form settings"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setSelectedForm(form);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete form"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={form.is_active}
                          onCheckedChange={(checked) => handleToggleActive(form, checked)}
                          title={form.is_active ? 'Pause submissions' : 'Resume submissions'}
                        />
                      </RequireRole>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Form Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-lg">
          <form onSubmit={handleSaveForm}>
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {selectedForm ? 'Edit Lead Form' : 'New Lead Form'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Configure destination pipeline, automated tags, and redirect settings for incoming leads.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="form-name" className="text-xs font-medium">Form Name *</Label>
                <Input
                  id="form-name"
                  placeholder="e.g. Main Website Inquiry, Villa Landing Page"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* Pipeline & Stage Mapping */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pipeline" className="text-xs font-medium">Destination Pipeline</Label>
                  <select
                    id="pipeline"
                    value={formPipelineId}
                    onChange={(e) => {
                      const pipeId = e.target.value;
                      setFormPipelineId(pipeId);
                      const matching = stages.filter((s) => s.pipeline_id === pipeId);
                      setFormStageId(matching[0]?.id || '');
                    }}
                    className="flex h-9 w-full rounded-md border border-border bg-muted px-3 py-1 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value="">None (Don&apos;t create deal)</option>
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="stage" className="text-xs font-medium">Initial Stage</Label>
                  <select
                    id="stage"
                    value={formStageId}
                    disabled={!formPipelineId}
                    onChange={(e) => setFormStageId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-border bg-muted px-3 py-1 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">Select stage...</option>
                    {filteredStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formPipelineId && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="deal-title" className="text-xs font-medium">Default Deal Title</Label>
                    <Input
                      id="deal-title"
                      placeholder="{name} - Website Lead"
                      value={formDealTitle}
                      onChange={(e) => setFormDealTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deal-value" className="text-xs font-medium">Estimated Value</Label>
                    <Input
                      id="deal-value"
                      type="number"
                      placeholder="0"
                      value={formDealValue || ''}
                      onChange={(e) => setFormDealValue(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-1.5">
                <Label htmlFor="form-tags" className="text-xs font-medium">Attach Tags (comma-separated)</Label>
                <Input
                  id="form-tags"
                  placeholder="Website Lead, Project Alpha, Urgent"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                />
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-muted-foreground mr-1">Existing tags:</span>
                    {availableTags.slice(0, 8).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const current = formTags
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (!current.includes(t.name)) {
                            setFormTags(current.length > 0 ? `${formTags}, ${t.name}` : t.name);
                          }
                        }}
                        className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        + {t.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Tags will automatically be attached to the contact, triggering matching automations.
                </p>
              </div>

              {/* Success Redirect URL */}
              <div className="space-y-1.5">
                <Label htmlFor="redirect-url" className="text-xs font-medium">Success Redirect URL (Optional)</Label>
                <Input
                  id="redirect-url"
                  placeholder="https://yourwebsite.com/thank-you"
                  value={formRedirectUrl}
                  onChange={(e) => setFormRedirectUrl(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  For standard HTML forms, visitors will be redirected to this page after submitting.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {selectedForm ? 'Save Changes' : 'Create Form'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Code Snippet / Integration Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Embed & Integration Guide
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Choose your website platform to copy the pre-configured integration code for{' '}
              <span className="font-semibold text-foreground">{selectedForm?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          {selectedForm && (
            <div className="py-2">
              <Tabs defaultValue="html" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted">
                  <TabsTrigger value="html" className="text-xs">HTML Form</TabsTrigger>
                  <TabsTrigger value="webflow" className="text-xs">Webflow / Elementor</TabsTrigger>
                  <TabsTrigger value="fetch" className="text-xs">JavaScript (Fetch)</TabsTrigger>
                </TabsList>

                {/* Tab 1: HTML */}
                <TabsContent value="html" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Copy and paste this standard HTML form into any landing page or website:
                  </p>
                  <div className="relative">
                    <pre className="max-h-72 overflow-x-auto rounded-xl border border-border bg-muted/60 p-3 text-xs text-foreground font-mono">
{`<form action="${getEndpointUrl(selectedForm.form_key)}" method="POST">
  <!-- Anti-spam honeypot (hidden from visitors) -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

  <!-- Contact Fields -->
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="tel" name="phone" placeholder="WhatsApp Number (+91...)" required />
  <input type="email" name="email" placeholder="Email Address" />

  <!-- Custom Fields (define in Settings → Fields & tags) -->
  <input type="text" name="budget" placeholder="Budget (e.g. 1 Cr)" />
  <textarea name="message" placeholder="Project requirements..."></textarea>

  <button type="submit">Submit Inquiry</button>
</form>`}
                    </pre>
                    <Button
                      variant="secondary"
                      size="xs"
                      className="absolute right-2.5 top-2.5 gap-1 shadow-sm"
                      onClick={() =>
                        copyToClipboard(
`<form action="${getEndpointUrl(selectedForm.form_key)}" method="POST">
  <!-- Anti-spam honeypot (hidden from visitors) -->
  <input type="text" name="_gotcha" style="display:none !important" tabindex="-1" autocomplete="off" />

  <!-- Contact Fields -->
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="tel" name="phone" placeholder="WhatsApp Number (+91...)" required />
  <input type="email" name="email" placeholder="Email Address" />

  <!-- Custom Fields (define in Settings → Fields & tags) -->
  <input type="text" name="budget" placeholder="Budget (e.g. 1 Cr)" />
  <textarea name="message" placeholder="Project requirements..."></textarea>

  <button type="submit">Submit Inquiry</button>
</form>`,
                          'html-code'
                        )
                      }
                    >
                      {copiedKey === 'html-code' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy Code
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab 2: Webflow / Elementor */}
                <TabsContent value="webflow" className="space-y-3 pt-3">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>
                      <strong>1. Webflow</strong>: Select your Form element &rarr; Form Settings &rarr; set <strong>Action</strong> to the Endpoint URL below, and <strong>Method</strong> to <code className="text-foreground">POST</code>.
                    </p>
                    <p>
                      <strong>2. WordPress / Elementor / Divi</strong>: Set form action to Webhook and paste the URL below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={getEndpointUrl(selectedForm.form_key)}
                      className="font-mono text-xs select-all bg-muted"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(getEndpointUrl(selectedForm.form_key), 'webhook-url')}
                    >
                      {copiedKey === 'webhook-url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      Copy URL
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab 3: JavaScript */}
                <TabsContent value="fetch" className="space-y-3 pt-3">
                  <p className="text-xs text-muted-foreground">
                    For custom React, Next.js, Framer, or Vue forms submitting via AJAX:
                  </p>
                  <div className="relative">
                    <pre className="max-h-72 overflow-x-auto rounded-xl border border-border bg-muted/60 p-3 text-xs text-foreground font-mono">
{`const res = await fetch("${getEndpointUrl(selectedForm.form_key)}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    phone: "+919876543210",
    email: "john@example.com",
    budget: "1.5 Cr",
    message: "Interested in 3BHK Villa"
  })
});
const data = await res.json();`}
                    </pre>
                    <Button
                      variant="secondary"
                      size="xs"
                      className="absolute right-2.5 top-2.5 gap-1 shadow-sm"
                      onClick={() =>
                        copyToClipboard(
`const res = await fetch("${getEndpointUrl(selectedForm.form_key)}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    phone: "+919876543210",
    email: "john@example.com",
    budget: "1.5 Cr",
    message: "Interested in 3BHK Villa"
  })
});
const data = await res.json();`,
                          'js-code'
                        )
                      }
                    >
                      {copiedKey === 'js-code' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy Code
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Lead Form?</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{selectedForm?.name}&rdquo;</span>?
              Incoming submissions to this endpoint will be rejected. Existing contacts and deals will remain preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
