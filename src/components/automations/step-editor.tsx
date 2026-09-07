'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InteractiveBuilder } from '@/components/interactive/interactive-builder';
import { interactivePayloadPreviewText } from '@/lib/whatsapp/interactive';
import { asInteractive, toStepConfig, type BuilderStep } from './types';
import {
  AgentSelect,
  ContactFieldSelect,
  DealPipelineFields,
  FieldBlock,
  SendTemplateFields,
  TagSelect,
} from './resources-context';

export interface StepEditorProps {
  step: BuilderStep;
  onChange: (s: BuilderStep) => void;
}

export function StepEditor({ step, onChange }: StepEditorProps) {
  const t = useTranslations('Automations.builder');
  const cfg = step.step_config;
  const set = (patch: Record<string, unknown>) =>
    onChange({ ...step, step_config: { ...cfg, ...patch } });

  switch (step.step_type) {
    case 'send_message':
      return (
        <FieldBlock label={t('config.messageText')}>
          <Textarea
            value={(cfg.text as string) ?? ''}
            onChange={(e) => set({ text: e.target.value })}
            placeholder={t('config.placeholderMessageText')}
            className="bg-muted text-foreground min-h-24"
          />
        </FieldBlock>
      );
    case 'send_buttons':
    case 'send_list':
      return (
        <InteractiveBuilder
          value={asInteractive(cfg)}
          onChange={(payload) =>
            onChange({ ...step, step_config: toStepConfig(payload) })
          }
        />
      );
    case 'send_template':
      return (
        <SendTemplateFields
          templateName={(cfg.template_name as string) ?? ''}
          language={(cfg.language as string) ?? ''}
          onChange={(patch) => set(patch)}
          t={t}
        />
      );
    case 'add_tag':
    case 'remove_tag':
      return (
        <FieldBlock label={t('config.tagLabel')}>
          <TagSelect
            value={(cfg.tag_id as string) ?? ''}
            onChange={(v) => set({ tag_id: v })}
            t={t}
          />
        </FieldBlock>
      );
    case 'assign_conversation':
      return (
        <>
          <FieldBlock label={t('config.modeLabel')}>
            <select
              value={(cfg.mode as string) ?? 'round_robin'}
              onChange={(e) => set({ mode: e.target.value })}
              className="border-border bg-muted text-foreground w-full rounded-md border px-2 py-1.5 text-sm"
            >
              <option value="round_robin">
                {t('config.modes.round_robin')}
              </option>
              <option value="specific">{t('config.modes.specific')}</option>
            </select>
          </FieldBlock>
          {cfg.mode === 'specific' && (
            <FieldBlock label={t('config.agentLabel')}>
              <AgentSelect
                value={(cfg.agent_id as string) ?? ''}
                onChange={(v) => set({ agent_id: v })}
                t={t}
              />
            </FieldBlock>
          )}
        </>
      );
    case 'update_contact_field':
      return (
        <>
          <FieldBlock label={t('config.fieldLabel')}>
            <ContactFieldSelect
              value={(cfg.field as string) ?? 'name'}
              onChange={(v) => set({ field: v })}
              t={t}
            />
          </FieldBlock>
          <FieldBlock label={t('config.valueLabel')}>
            <Input
              value={(cfg.value as string) ?? ''}
              onChange={(e) => set({ value: e.target.value })}
              placeholder={t.raw('config.placeholderValue')}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
        </>
      );
    case 'create_deal':
      return (
        <>
          <DealPipelineFields
            pipelineId={(cfg.pipeline_id as string) ?? ''}
            stageId={(cfg.stage_id as string) ?? ''}
            onChange={(patch) => set(patch)}
            t={t}
          />
          <FieldBlock label={t('config.titleLabel')}>
            <Input
              value={(cfg.title as string) ?? ''}
              onChange={(e) => set({ title: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label={t('config.valueLabel')}>
            <Input
              type="number"
              value={(cfg.value as number) ?? 0}
              onChange={(e) => set({ value: Number(e.target.value) })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
        </>
      );
    case 'wait':
      return (
        <div className="grid grid-cols-2 gap-2">
          <FieldBlock label={t('config.amountLabel')}>
            <Input
              type="number"
              min={1}
              value={(cfg.amount as number) ?? 1}
              onChange={(e) =>
                set({ amount: Math.max(1, Number(e.target.value)) })
              }
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label={t('config.unitLabel')}>
            <select
              value={(cfg.unit as string) ?? 'hours'}
              onChange={(e) => set({ unit: e.target.value })}
              className="border-border bg-muted text-foreground w-full rounded-md border px-2 py-1.5 text-sm"
            >
              <option value="minutes">{t('config.units.minutes')}</option>
              <option value="hours">{t('config.units.hours')}</option>
              <option value="days">{t('config.units.days')}</option>
            </select>
          </FieldBlock>
        </div>
      );
    case 'condition':
      return (
        <>
          <FieldBlock label={t('config.subjectLabel')}>
            <select
              value={(cfg.subject as string) ?? 'tag_presence'}
              onChange={(e) => set({ subject: e.target.value })}
              className="border-border bg-muted text-foreground w-full rounded-md border px-2 py-1.5 text-sm"
            >
              <option value="tag_presence">
                {t('config.subjects.tag_presence')}
              </option>
              <option value="contact_field">
                {t('config.subjects.contact_field')}
              </option>
              <option value="message_content">
                {t('config.subjects.message_content')}
              </option>
              <option value="time_of_day">
                {t('config.subjects.time_of_day')}
              </option>
            </select>
          </FieldBlock>
          <FieldBlock label={t('config.operandLabel')}>
            <Input
              placeholder={
                cfg.subject === 'time_of_day'
                  ? t('config.placeholderTime')
                  : cfg.subject === 'contact_field'
                    ? t('config.placeholderContact')
                    : cfg.subject === 'tag_presence'
                      ? t('config.placeholderTag')
                      : ''
              }
              value={(cfg.operand as string) ?? ''}
              onChange={(e) => set({ operand: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          {(cfg.subject === 'contact_field' ||
            cfg.subject === 'message_content') && (
            <FieldBlock label="Value">
              <Input
                value={(cfg.value as string) ?? ''}
                onChange={(e) => set({ value: e.target.value })}
                className="bg-muted text-foreground"
              />
            </FieldBlock>
          )}
        </>
      );
    case 'send_webhook':
      return (
        <>
          <FieldBlock label={t('config.urlLabel')}>
            <Input
              value={(cfg.url as string) ?? ''}
              onChange={(e) => set({ url: e.target.value })}
              className="bg-muted text-foreground"
            />
          </FieldBlock>
          <FieldBlock label={t('config.bodyTemplateLabel')}>
            <Textarea
              value={(cfg.body_template as string) ?? ''}
              onChange={(e) => set({ body_template: e.target.value })}
              className="bg-muted text-foreground min-h-20 font-mono text-xs"
            />
          </FieldBlock>
        </>
      );
    case 'close_conversation':
      return (
        <p className="text-muted-foreground text-xs">
          {t('config.closeConversationHint', {
            defaultValue:
              'Sets the conversation status to "closed". No configuration needed.',
          })}
        </p>
      );
    default:
      return null;
  }
}

export function previewFor(step: BuilderStep): string {
  switch (step.step_type) {
    case 'send_message':
      return (step.step_config.text as string) || 'no text yet';
    case 'send_buttons':
    case 'send_list':
      return (
        interactivePayloadPreviewText(asInteractive(step.step_config)) ||
        'no body yet'
      );
    case 'send_template':
      return (step.step_config.template_name as string) || 'pick a template';
    case 'wait':
      return `${step.step_config.amount ?? '?'} ${step.step_config.unit ?? ''}`;
    case 'condition':
      return `when ${step.step_config.subject ?? '?'}`;
    case 'send_webhook':
      return (step.step_config.url as string) || 'no url';
    default:
      return '';
  }
}
