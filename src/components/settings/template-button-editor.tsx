'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TemplateButton } from '@/types';
import {
  extractVariableIndices,
  TEMPLATE_LIMITS,
} from '@/lib/whatsapp/template-validators';
import { emptyButton } from './template-types';

export type ButtonPatch = {
  text?: string;
  url?: string;
  phone_number?: string;
  example?: string;
};

interface TemplateButtonEditorProps {
  buttons: TemplateButton[];
  onChange: (buttons: TemplateButton[]) => void;
}

export function TemplateButtonEditor({
  buttons,
  onChange,
}: TemplateButtonEditorProps) {
  const t = useTranslations('Settings.templates');

  function updateButton(index: number, patch: ButtonPatch) {
    const current = buttons[index];
    if (!current) return;
    const next = [...buttons];
    switch (current.type) {
      case 'QUICK_REPLY':
        next[index] = {
          ...current,
          ...(patch.text !== undefined && { text: patch.text }),
        };
        break;
      case 'URL':
        next[index] = {
          ...current,
          ...(patch.text !== undefined && { text: patch.text }),
          ...(patch.url !== undefined && { url: patch.url }),
          ...(patch.example !== undefined && { example: patch.example }),
        };
        break;
      case 'PHONE_NUMBER':
        next[index] = {
          ...current,
          ...(patch.text !== undefined && { text: patch.text }),
          ...(patch.phone_number !== undefined && {
            phone_number: patch.phone_number,
          }),
        };
        break;
      case 'COPY_CODE':
        next[index] = {
          ...current,
          ...(patch.text !== undefined && { text: patch.text }),
          ...(patch.example !== undefined && { example: patch.example }),
        };
        break;
    }
    onChange(next);
  }

  function changeButtonType(index: number, type: TemplateButton['type']) {
    const next = [...buttons];
    next[index] = emptyButton(type);
    onChange(next);
  }

  function removeButton(index: number) {
    onChange(buttons.filter((_, i) => i !== index));
  }

  function addButton() {
    if (buttons.length >= TEMPLATE_LIMITS.maxButtonsTotal) return;
    onChange([...buttons, emptyButton('QUICK_REPLY')]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">{t('buttons')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addButton}
          disabled={buttons.length >= TEMPLATE_LIMITS.maxButtonsTotal}
          className="border-border text-muted-foreground hover:bg-muted h-7 bg-transparent text-xs"
        >
          <Plus className="size-3" />
          {t('addButton')}
        </Button>
      </div>
      {buttons.length === 0 ? (
        <p className="text-muted-foreground text-[11px]">
          {t('buttonsLimit', { max: TEMPLATE_LIMITS.maxButtonsTotal })}
        </p>
      ) : (
        <div className="space-y-2">
          {buttons.map((btn, i) => (
            <div
              key={i}
              className="border-border bg-muted/50 space-y-2 rounded border p-2"
            >
              <div className="flex items-center gap-2">
                <Select
                  value={btn.type}
                  onValueChange={(val) => {
                    if (!val) return;
                    changeButtonType(i, val as TemplateButton['type']);
                  }}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem
                      value="QUICK_REPLY"
                      className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                    >
                      {t('btnQuickReply')}
                    </SelectItem>
                    <SelectItem
                      value="URL"
                      className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                    >
                      {t('btnUrl')}
                    </SelectItem>
                    <SelectItem
                      value="PHONE_NUMBER"
                      className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                    >
                      {t('btnPhone')}
                    </SelectItem>
                    <SelectItem
                      value="COPY_CODE"
                      className="text-popover-foreground focus:bg-muted focus:text-popover-foreground"
                    >
                      {t('btnCopyCode')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={t('btnLabelPlaceholder')}
                  value={btn.text}
                  maxLength={TEMPLATE_LIMITS.buttonTextMaxLength}
                  onChange={(e) => updateButton(i, { text: e.target.value })}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeButton(i)}
                  className="text-muted-foreground size-7 hover:bg-red-950/30 hover:text-red-400"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
              {btn.type === 'URL' && (
                <div className="space-y-1 pl-1">
                  <Input
                    placeholder={t.raw('urlPlaceholder')}
                    value={btn.url}
                    onChange={(e) => updateButton(i, { url: e.target.value })}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                  />
                  {extractVariableIndices(btn.url).length > 0 && (
                    <Input
                      placeholder={t.raw('urlSamplePlaceholder')}
                      value={btn.example ?? ''}
                      onChange={(e) =>
                        updateButton(i, { example: e.target.value })
                      }
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                    />
                  )}
                </div>
              )}
              {btn.type === 'PHONE_NUMBER' && (
                <Input
                  placeholder={t('phonePlaceholder')}
                  value={btn.phone_number}
                  onChange={(e) =>
                    updateButton(i, { phone_number: e.target.value })
                  }
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                />
              )}
              {btn.type === 'COPY_CODE' && (
                <Input
                  placeholder={t('codePlaceholder')}
                  value={btn.example}
                  onChange={(e) => updateButton(i, { example: e.target.value })}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
