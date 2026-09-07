'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AutomationTriggerType, KeywordMatchTriggerConfig } from '@/types';
import { TRIGGER_OPTIONS } from './types';
import { TagSelect } from './resources-context';

export interface TriggerCardProps {
  type: AutomationTriggerType;
  config: Record<string, unknown>;
  onTypeChange: (t: AutomationTriggerType) => void;
  onConfigChange: (c: Record<string, unknown>) => void;
}

export function TriggerCard({
  type,
  config,
  onTypeChange,
  onConfigChange,
}: TriggerCardProps) {
  const t = useTranslations('Automations.builder');
  const [open, setOpen] = useState(false);

  return (
    <div className="z-10 w-full max-w-[320px] sm:w-80">
      <div className="border-border bg-card rounded-lg border border-l-4 border-l-blue-500 shadow-lg">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] tracking-wide text-blue-300 uppercase">
              {t('trigger')}
            </div>
            <div className="text-foreground truncate text-sm font-medium">
              {t(`triggers.${type}.label`)}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'text-muted-foreground h-4 w-4 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
        {open && (
          <div className="border-border space-y-3 border-t px-4 py-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {t('triggerType')}
              </label>
              <select
                value={type}
                onChange={(e) =>
                  onTypeChange(e.target.value as AutomationTriggerType)
                }
                className="border-border bg-muted text-foreground focus:border-primary w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none"
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(`triggers.${o.value}.label`)}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {t(`triggers.${type}.hint`)}
              </p>
            </div>
            {type === 'keyword_match' && (
              <KeywordMatchConfig
                config={config as unknown as KeywordMatchTriggerConfig}
                onChange={onConfigChange}
                t={t}
              />
            )}
            {type === 'interactive_reply' && (
              <InteractiveReplyConfig
                config={config}
                onChange={onConfigChange}
                t={t}
              />
            )}
            {type === 'tag_added' && (
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  Tag
                </label>
                <TagSelect
                  value={(config.tag_id as string) ?? ''}
                  onChange={(v) => onConfigChange({ ...config, tag_id: v })}
                  t={t}
                />
              </div>
            )}
            {type === 'time_based' && (
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  {t('schedule')}
                </label>
                <Input
                  placeholder="Cron expression or HH:mm"
                  value={(config.schedule as string) ?? ''}
                  onChange={(e) =>
                    onConfigChange({ ...config, schedule: e.target.value })
                  }
                  className="bg-muted text-foreground"
                />
                <p className="text-muted-foreground mt-1 text-[11px]">
                  {t('scheduleHint')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KeywordMatchConfig({
  config,
  onChange,
  t,
}: {
  config: KeywordMatchTriggerConfig;
  onChange: (c: Record<string, unknown>) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const keywords = config?.keywords ?? [];
  const [draft, setDraft] = useState(keywords.join(', '));

  useEffect(() => {
    if (config?.match_type == null) {
      onChange({ ...config, match_type: 'contains' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit() {
    const parsed = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setDraft(parsed.join(', '));
    onChange({ ...config, keywords: parsed });
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-muted-foreground mb-1 block text-xs font-medium">
          {t('keywords')}
        </label>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={t('keywordsHint')}
          className="bg-muted text-foreground"
        />
      </div>
      <div>
        <label className="text-muted-foreground mb-1 block text-xs font-medium">
          {t('config.matchType')}
        </label>
        <select
          value={config?.match_type ?? 'contains'}
          onChange={(e) =>
            onChange({
              ...config,
              match_type: e.target.value as 'exact' | 'contains' | 'word',
            })
          }
          className="border-border bg-muted text-foreground w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none"
        >
          <option value="contains">{t('config.matchContains')}</option>
          <option value="word">{t('config.matchWord')}</option>
          <option value="exact">{t('config.matchExact')}</option>
        </select>
        {config?.match_type === 'word' && (
          <p className="text-muted-foreground mt-1 text-xs">
            {t('config.matchWordHint')}
          </p>
        )}
      </div>
    </div>
  );
}

function InteractiveReplyConfig({
  config,
  onChange,
  t,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const ids = (config?.reply_ids as string[] | undefined) ?? [];
  const [draft, setDraft] = useState(ids.join(', '));

  function commit() {
    const parsed = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setDraft(parsed.join(', '));
    onChange({ ...config, reply_ids: parsed });
  }

  return (
    <div>
      <label className="text-muted-foreground mb-1 block text-xs font-medium">
        {t('replyIds')}
      </label>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={t('replyIdsHint')}
        className="bg-muted text-foreground font-mono"
      />
      <p className="text-muted-foreground mt-1 text-[11px]">
        {t('replyIdsHelp')}
      </p>
    </div>
  );
}
