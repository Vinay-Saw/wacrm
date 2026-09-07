'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type {
  AccountMember,
  CustomField,
  MessageTemplate,
  Tag as TagRecord,
} from '@/types';
import {
  SELECT_CLASS,
  type AutomationResources,
  type PipelineOption,
  type PipelineStageOption,
} from './types';

const ResourcesContext = createContext<AutomationResources>({
  tags: [],
  members: [],
  templates: [],
  customFields: [],
  pipelines: [],
  stages: [],
});

export function useResources(): AutomationResources {
  return useContext(ResourcesContext);
}

export function ResourcesProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [pipelines, setPipelines] = useState<PipelineOption[]>([]);
  const [stages, setStages] = useState<PipelineStageOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const [tagsRes, templatesRes, customFieldsRes, pipelinesRes, stagesRes] =
        await Promise.all([
          supabase.from('tags').select('*').order('name'),
          supabase
            .from('message_templates')
            .select('*')
            .eq('status', 'APPROVED')
            .order('name'),
          supabase.from('custom_fields').select('*').order('field_name'),
          supabase.from('pipelines').select('id, name').order('name'),
          supabase
            .from('pipeline_stages')
            .select('id, name, pipeline_id, position')
            .order('position'),
        ]);
      if (cancelled) return;
      setTags((tagsRes.data as TagRecord[] | null) ?? []);
      setTemplates((templatesRes.data as MessageTemplate[] | null) ?? []);
      setCustomFields((customFieldsRes.data as CustomField[] | null) ?? []);
      setPipelines((pipelinesRes.data as PipelineOption[] | null) ?? []);
      setStages((stagesRes.data as PipelineStageOption[] | null) ?? []);
    })();

    void (async () => {
      try {
        const res = await fetch('/api/account/members', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { members?: AccountMember[] };
        if (!cancelled) setMembers(json.members ?? []);
      } catch {
        // Members endpoint absent — caller falls back to raw input.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ResourcesContext.Provider
      value={{ tags, members, templates, customFields, pipelines, stages }}
    >
      {children}
    </ResourcesContext.Provider>
  );
}

export function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <label className="text-muted-foreground mb-1 block text-xs font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Tag dropdown by name + color, storing the tag's id. */
export function TagSelect({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { tags } = useResources();
  if (tags.length === 0) {
    return (
      <Input
        placeholder={t('tags.placeholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted text-foreground"
      />
    );
  }
  const selected = tags.find((t) => t.id === value);
  return (
    <div className="flex items-center gap-2">
      <span
        className="border-border h-3 w-3 shrink-0 rounded-full border"
        style={{ backgroundColor: selected?.color ?? 'transparent' }}
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">{t('tags.select')}</option>
        {tags.map((tg) => (
          <option key={tg.id} value={tg.id}>
            {tg.name}
          </option>
        ))}
        {value && !selected && (
          <option value={value}>{t('tags.unknown', { id: value })}</option>
        )}
      </select>
    </div>
  );
}

/** Contact-field dropdown for "Update Contact Field" */
export function ContactFieldSelect({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { customFields } = useResources();
  const customValue = value.startsWith('custom:') ? value : '';
  const knownCustom =
    customValue && customFields.some((f) => `custom:${f.id}` === customValue);
  return (
    <select
      value={value || 'name'}
      onChange={(e) => onChange(e.target.value)}
      className={SELECT_CLASS}
    >
      <option value="name">{t('fields.name')}</option>
      <option value="email">{t('fields.email')}</option>
      <option value="company">{t('fields.company')}</option>
      {customFields.length > 0 && (
        <optgroup label={t('fields.customFields')}>
          {customFields.map((f) => (
            <option key={f.id} value={`custom:${f.id}`}>
              {f.field_name}
            </option>
          ))}
        </optgroup>
      )}
      {customValue && !knownCustom && (
        <option value={customValue}>
          {t('fields.unknown', { id: customValue })}
        </option>
      )}
    </select>
  );
}

/** Agent dropdown by name, storing member user_id. */
export function AgentSelect({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { members } = useResources();
  if (members.length === 0) {
    return (
      <Input
        placeholder={t('agents.placeholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted text-foreground"
      />
    );
  }
  const selected = members.find((m) => m.user_id === value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={SELECT_CLASS}
    >
      <option value="">{t('agents.select')}</option>
      {members.map((m) => (
        <option key={m.user_id} value={m.user_id}>
          {m.full_name || m.email || m.user_id}
        </option>
      ))}
      {value && !selected && (
        <option value={value}>{t('agents.unknown', { id: value })}</option>
      )}
    </select>
  );
}

/** Pipeline + stage picker for Create Deal. */
export function DealPipelineFields({
  pipelineId,
  stageId,
  onChange,
  t,
}: {
  pipelineId: string;
  stageId: string;
  onChange: (patch: { pipeline_id: string; stage_id: string }) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { pipelines, stages } = useResources();

  if (pipelines.length === 0) {
    return (
      <>
        <FieldBlock label={t('pipelines.pipelineIdLabel')}>
          <Input
            value={pipelineId}
            onChange={(e) =>
              onChange({ pipeline_id: e.target.value, stage_id: stageId })
            }
            className="bg-muted text-foreground"
          />
        </FieldBlock>
        <FieldBlock label={t('pipelines.stageIdLabel')}>
          <Input
            value={stageId}
            onChange={(e) =>
              onChange({ pipeline_id: pipelineId, stage_id: e.target.value })
            }
            className="bg-muted text-foreground"
          />
        </FieldBlock>
      </>
    );
  }

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);
  const stageOptions = stages.filter((s) => s.pipeline_id === pipelineId);
  const selectedStage = stageOptions.find((s) => s.id === stageId);

  return (
    <>
      <FieldBlock label={t('pipelines.pipelineLabel')}>
        <select
          value={pipelineId}
          onChange={(e) => {
            const nextPipelineId = e.target.value;
            const firstStage = stages.find(
              (s) => s.pipeline_id === nextPipelineId
            );
            onChange({
              pipeline_id: nextPipelineId,
              stage_id: firstStage?.id ?? '',
            });
          }}
          className={SELECT_CLASS}
        >
          <option value="">{t('pipelines.selectPipeline')}</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {pipelineId && !selectedPipeline && (
            <option value={pipelineId}>
              {t('pipelines.unknownPipeline', { id: pipelineId })}
            </option>
          )}
        </select>
      </FieldBlock>
      <FieldBlock label={t('pipelines.stageLabel')}>
        <select
          value={stageId}
          onChange={(e) =>
            onChange({ pipeline_id: pipelineId, stage_id: e.target.value })
          }
          className={SELECT_CLASS}
          disabled={!pipelineId || stageOptions.length === 0}
        >
          <option value="">
            {pipelineId
              ? t('pipelines.selectStage')
              : t('pipelines.selectPipelineFirst')}
          </option>
          {stageOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          {stageId && pipelineId && !selectedStage && (
            <option value={stageId}>
              {t('pipelines.unknownStage', { id: stageId })}
            </option>
          )}
        </select>
      </FieldBlock>
    </>
  );
}

/** Template dropdown showing approved templates by name + language */
export function SendTemplateFields({
  templateName,
  language,
  onChange,
  t,
}: {
  templateName: string;
  language: string;
  onChange: (patch: { template_name: string; language: string }) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { templates } = useResources();

  if (templates.length === 0) {
    return (
      <>
        <FieldBlock label={t('templates.templateNameLabel')}>
          <Input
            value={templateName}
            onChange={(e) =>
              onChange({ template_name: e.target.value, language })
            }
            className="bg-muted text-foreground"
          />
        </FieldBlock>
        <FieldBlock label={t('templates.languageLabel')}>
          <Input
            value={language}
            onChange={(e) =>
              onChange({
                template_name: templateName,
                language: e.target.value,
              })
            }
            className="bg-muted text-foreground"
          />
        </FieldBlock>
      </>
    );
  }

  const toValue = (name: string, lang: string) => `${name}::${lang}`;
  const current = templateName ? toValue(templateName, language) : '';
  const hasMatch = templates.some(
    (t) => toValue(t.name, t.language ?? 'en_US') === current
  );

  return (
    <FieldBlock label={t('templates.templateLabel')}>
      <select
        value={current}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            onChange({ template_name: '', language: 'en_US' });
            return;
          }
          const [name, lang] = raw.split('::');
          onChange({ template_name: name, language: lang || 'en_US' });
        }}
        className={SELECT_CLASS}
      >
        <option value="">{t('templates.selectTemplate')}</option>
        {templates.map((tpl) => {
          const val = toValue(tpl.name, tpl.language ?? 'en_US');
          return (
            <option key={tpl.id} value={val}>
              {tpl.name} ({tpl.language ?? 'en_US'})
            </option>
          );
        })}
        {templateName && !hasMatch && (
          <option value={current}>
            {t('templates.unknownTemplate', {
              name: templateName,
              lang: language || 'en_US',
            })}
          </option>
        )}
      </select>
    </FieldBlock>
  );
}
