'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MessageTemplate } from '@/types';
import {
  uploadAccountMedia,
  MEDIA_MAX_BYTES_BY_KIND,
} from '@/lib/storage/upload-media';
import {
  extractVariableIndices,
  TEMPLATE_LIMITS,
} from '@/lib/whatsapp/template-validators';
import {
  CATEGORIES,
  COMMON_LANGUAGE_CODES,
  HEADER_FORMATS,
  HeaderFormat,
  TemplateFormData,
} from './template-types';
import { TemplateButtonEditor } from './template-button-editor';

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: TemplateFormData;
  setForm: React.Dispatch<React.SetStateAction<TemplateFormData>>;
  submitting: boolean;
  onSubmit: () => void;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  editingId,
  form,
  setForm,
  submitting,
  onSubmit,
}: TemplateEditorDialogProps) {
  const t = useTranslations('Settings.templates');
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const headerFileRef = useRef<HTMLInputElement>(null);

  const bodyVarCount = useMemo(
    () => extractVariableIndices(form.body_text).length,
    [form.body_text]
  );
  const headerVarCount = useMemo(
    () =>
      form.header_format === 'text'
        ? extractVariableIndices(form.header_content).length
        : 0,
    [form.header_format, form.header_content]
  );

  // Resize body_samples so it always has exactly bodyVarCount entries.
  useEffect(() => {
    setForm((prev) => {
      if (prev.body_samples.length === bodyVarCount) return prev;
      const next = prev.body_samples.slice(0, bodyVarCount);
      while (next.length < bodyVarCount) next.push('');
      return { ...prev, body_samples: next };
    });
  }, [bodyVarCount, setForm]);

  const headerNeedsMedia =
    form.header_format !== 'none' && form.header_format !== 'text';

  async function handleHeaderImageFile(file: File) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error(t('toastInvalidImage'));
      return;
    }
    if (file.size > MEDIA_MAX_BYTES_BY_KIND.image) {
      toast.error(
        t('toastImageTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) })
      );
      return;
    }
    setUploadingHeader(true);
    try {
      const { publicUrl } = await uploadAccountMedia('chat-media', file);
      setForm((f) => ({ ...f, header_media_url: publicUrl }));
      toast.success(t('toastUploadSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('toastUploadFailed'));
    } finally {
      setUploadingHeader(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {editingId ? t('dialogEditTitle') : t('dialogNewTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {editingId ? t('dialogEditDesc') : t('dialogNewDesc')}
          </DialogDescription>
        </DialogHeader>

        {form.category === 'Authentication' && (
          <div className="flex items-start gap-2 rounded border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>
              {t.rich('authWarning', {
                bold: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('templateName')}</Label>
            <Input
              placeholder={t('namePlaceholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={editingId !== null}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-muted-foreground text-[11px]">
              {editingId ? t('nameFixed') : t('nameHint')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('category')}</Label>
              <Select
                value={form.category}
                onValueChange={(val) =>
                  setForm({
                    ...form,
                    category: val as MessageTemplate['category'],
                  })
                }
              >
                <SelectTrigger className="bg-muted border-border text-foreground w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {CATEGORIES.map((cat) => (
                    <SelectItem
                      key={cat}
                      value={cat}
                      className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('language')}</Label>
              <Input
                list="template-language-codes"
                placeholder="en_US"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                disabled={editingId !== null}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
              <datalist id="template-language-codes">
                {COMMON_LANGUAGE_CODES.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
              <p className="text-muted-foreground text-[11px]">
                {editingId ? (
                  t('langFixed')
                ) : (
                  <span>
                    {t.rich('langHint', {
                      code: (chunks) => <code>{chunks}</code>,
                    })}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('header')}</Label>
            <Select
              value={form.header_format}
              onValueChange={(val) =>
                setForm({
                  ...form,
                  header_format: (val || 'none') as HeaderFormat,
                })
              }
            >
              <SelectTrigger className="bg-muted border-border text-foreground w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {HEADER_FORMATS.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                  >
                    {type === 'none'
                      ? t('headerNone')
                      : type === 'text'
                        ? t('headerText')
                        : type === 'image'
                          ? t('headerImage')
                          : type === 'video'
                            ? t('headerVideo')
                            : t('headerDocument')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {form.header_format === 'text' && (
              <div className="mt-2 space-y-2">
                <Input
                  id="template-header-text"
                  aria-label="Header text"
                  placeholder={t.raw('headerTextPlaceholder')}
                  value={form.header_content}
                  onChange={(e) =>
                    setForm({ ...form, header_content: e.target.value })
                  }
                  maxLength={TEMPLATE_LIMITS.headerTextMaxLength}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                {headerVarCount > 0 && (
                  <Input
                    id="template-header-sample"
                    aria-label={t('headerSampleAria')}
                    placeholder={t.raw('headerSamplePlaceholder')}
                    value={form.header_sample}
                    onChange={(e) =>
                      setForm({ ...form, header_sample: e.target.value })
                    }
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                )}
              </div>
            )}

            {headerNeedsMedia && (
              <div className="mt-2 space-y-2">
                {form.header_format === 'image' && (
                  <div className="flex items-center gap-2">
                    <input
                      ref={headerFileRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleHeaderImageFile(f);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingHeader}
                      onClick={() => headerFileRef.current?.click()}
                    >
                      {uploadingHeader ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {t('uploadImage')}
                    </Button>
                    <span className="text-muted-foreground text-[11px]">
                      {t('uploadHint')}
                    </span>
                  </div>
                )}
                <Input
                  placeholder={t('mediaUrlPlaceholder', {
                    format: form.header_format,
                  })}
                  value={form.header_media_url}
                  onChange={(e) =>
                    setForm({ ...form, header_media_url: e.target.value })
                  }
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                {form.header_format === 'image' && form.header_media_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.header_media_url}
                    alt="Header sample"
                    className="border-border max-h-28 rounded-md border object-contain"
                  />
                )}
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {form.header_format === 'image'
                    ? t('imageHint')
                    : t('mediaHint')}
                  {form.header_format === 'video' && t('videoHint')}
                  {form.header_format === 'document' && t('documentHint')}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('bodyText')}</Label>
            <Textarea
              placeholder={t.raw('bodyPlaceholder')}
              value={form.body_text}
              onChange={(e) => setForm({ ...form, body_text: e.target.value })}
              rows={4}
              maxLength={TEMPLATE_LIMITS.bodyMaxLength}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
            <p className="text-muted-foreground text-[11px]">
              {t.raw('bodyHint')}
            </p>

            {bodyVarCount > 0 && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-muted-foreground text-[11px]">
                  {t('sampleValues')}
                </Label>
                {form.body_samples.map((val, i) => {
                  const inputId = `template-body-sample-${i}`;
                  return (
                    <Input
                      key={i}
                      id={inputId}
                      aria-label={t('sampleAria', { var: `{{${i + 1}}}` })}
                      placeholder={t('samplePlaceholder', {
                        var: `{{${i + 1}}}`,
                      })}
                      value={val}
                      onChange={(e) => {
                        const next = [...form.body_samples];
                        next[i] = e.target.value;
                        setForm({ ...form, body_samples: next });
                      }}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('footer')}</Label>
            <Input
              placeholder={t('footerPlaceholder')}
              value={form.footer_text}
              onChange={(e) =>
                setForm({ ...form, footer_text: e.target.value })
              }
              maxLength={TEMPLATE_LIMITS.footerMaxLength}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <TemplateButtonEditor
            buttons={form.buttons}
            onChange={(buttons) => setForm({ ...form, buttons })}
          />
        </div>

        <DialogFooter className="bg-popover border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || form.category === 'Authentication'}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {editingId ? t('saving') : t('submitting')}
              </>
            ) : editingId ? (
              t('saveResubmit')
            ) : (
              t('submitApproval')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
