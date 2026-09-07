'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export interface AutomationHeaderProps {
  name: string;
  isActive: boolean;
  saving: boolean;
  isEditing: boolean;
  onNameChange: (name: string) => void;
  onActiveChange: (active: boolean) => void;
  onSave: () => void;
  onBack: () => void;
}

export function AutomationHeader({
  name,
  isActive,
  saving,
  isEditing,
  onNameChange,
  onActiveChange,
  onSave,
  onBack,
}: AutomationHeaderProps) {
  const t = useTranslations('Automations.builder');

  return (
    <header className="border-border bg-card/80 flex flex-shrink-0 items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors"
        aria-label={t('backToAutomations')}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t('untitled')}
        className="text-foreground placeholder:text-muted-foreground focus:bg-muted min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm font-semibold focus:outline-none sm:text-base"
      />
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span className="hidden sm:inline">{t('active')}</span>
        <Switch
          checked={isActive}
          onCheckedChange={(v) => onActiveChange(!!v)}
          aria-label={t('activeAria')}
        />
      </div>
      <Button
        onClick={onSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isEditing ? t('save') : t('saveDraft')}
      </Button>
    </header>
  );
}
