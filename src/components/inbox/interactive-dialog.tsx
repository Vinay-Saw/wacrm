'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InteractiveBuilder } from '@/components/interactive/interactive-builder';
import type { InteractiveMessagePayload } from '@/types';

export interface InteractiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: InteractiveMessagePayload;
  onPayloadChange: (payload: InteractiveMessagePayload) => void;
  onSend: () => void;
  onSaveAsQuickReply: () => void;
  savingQuickReply: boolean;
}

export function InteractiveDialog({
  open,
  onOpenChange,
  payload,
  onPayloadChange,
  onSend,
  onSaveAsQuickReply,
  savingQuickReply,
}: InteractiveDialogProps) {
  const t = useTranslations('Inbox.composer');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('interactiveMessage')}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <InteractiveBuilder value={payload} onChange={onPayloadChange} />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={savingQuickReply}
            onClick={onSaveAsQuickReply}
          >
            {savingQuickReply ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-1 h-4 w-4" />
            )}
            {t('saveAsQuickReply')}
          </Button>
          <Button onClick={onSend}>
            <Send className="mr-1 h-4 w-4" />
            {t('send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
