'use client';

import { AlertCircle, Pencil, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { MessageTemplate } from '@/types';
import { templateStatusConfig } from '@/lib/template-status';
import { categoryColors } from './template-types';

interface TemplateListProps {
  templates: MessageTemplate[];
  onEdit: (template: MessageTemplate) => void;
  onDelete: (template: MessageTemplate) => void;
  deletingId: string | null;
}

export function TemplateList({
  templates,
  onEdit,
  onDelete,
  deletingId,
}: TemplateListProps) {
  const t = useTranslations('Settings.templates');

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">{t('noTemplates')}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('createFirst')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {templates.map((template) => {
        const statusKey = template.status || 'DRAFT';
        const status = templateStatusConfig[statusKey];
        return (
          <Card key={template.id}>
            <CardContent className="flex items-start justify-between pt-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-foreground font-medium">
                    {template.name}
                  </h3>
                  <Badge
                    className={`border text-xs ${categoryColors[template.category] || ''}`}
                  >
                    {template.category}
                  </Badge>
                  <Badge className={`border text-xs ${status.classes}`}>
                    {status.label}
                  </Badge>
                  {template.language && (
                    <span className="text-muted-foreground text-xs uppercase">
                      {template.language}
                    </span>
                  )}
                  {template.quality_score && (
                    <span
                      className={`text-[10px] font-medium uppercase ${
                        template.quality_score === 'GREEN'
                          ? 'text-emerald-400'
                          : template.quality_score === 'YELLOW'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                      title="Meta quality score"
                    >
                      {template.quality_score}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {template.body_text}
                </p>
                {template.footer_text && (
                  <p className="text-muted-foreground text-xs italic">
                    {template.footer_text}
                  </p>
                )}
                {(template.rejection_reason || template.submission_error) && (
                  <div className="flex items-start gap-1.5 rounded border border-red-900/40 bg-red-950/20 px-2 py-1.5 text-xs text-red-400">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {template.rejection_reason || template.submission_error}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-1">
                {statusKey === 'APPROVED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(template)}
                    title={t('editTitle')}
                    aria-label={t('editLabel')}
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2"
                  >
                    <Pencil className="size-3.5" />
                    {t('edit')}
                  </Button>
                )}
                {(statusKey === 'REJECTED' || statusKey === 'PAUSED') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(template)}
                    title={t('resubmitTitle')}
                    aria-label={t('resubmitLabel')}
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 px-2"
                  >
                    <RotateCcw className="size-3.5" />
                    {t('resubmit')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(template)}
                  disabled={deletingId === template.id}
                  aria-label={
                    template.meta_template_id
                      ? t('deleteMetaLocallyAria')
                      : t('deleteLocallyAria')
                  }
                  title={
                    template.meta_template_id
                      ? t('deleteMetaLocallyTitle')
                      : t('deleteLocallyTitle')
                  }
                  className="text-muted-foreground h-8 w-8 hover:bg-red-950/30 hover:text-red-400"
                >
                  {deletingId === template.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
