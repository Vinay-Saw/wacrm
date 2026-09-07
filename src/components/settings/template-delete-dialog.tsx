'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { MessageTemplate } from '@/types';

interface TemplateDeleteDialogProps {
  template: MessageTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  deleting: boolean;
}

export function TemplateDeleteDialog({
  template,
  open,
  onOpenChange,
  onConfirm,
  deleting,
}: TemplateDeleteDialogProps) {
  const t = useTranslations('Settings.templates');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {t('deleteDialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {template?.meta_template_id
              ? t('deleteMetaDesc', { name: template.name })
              : t('deleteLocalDesc', { name: template?.name || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-popover border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('deleting')}
              </>
            ) : (
              t('delete')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
