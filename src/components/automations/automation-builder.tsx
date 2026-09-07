'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { AutomationStepType } from '@/types';
import {
  insertAt,
  mapAtPath,
  moveAt,
  removeAt,
  type ParentScope,
  type StepPath,
} from '@/lib/automations/builder-tree';
import {
  blankConfig,
  cid,
  toApiSteps,
  type BuilderInitial,
  type BuilderStep,
} from './types';
import { ResourcesProvider } from './resources-context';
import { AutomationHeader } from './automation-header';
import { TriggerCard } from './trigger-config-panel';
import { StepList } from './step-list';

// Re-export types & utilities for consumers (e.g. edit/page.tsx, new/page.tsx)
export * from './types';

export function AutomationBuilder({ initial }: { initial: BuilderInitial }) {
  const router = useRouter();
  const t = useTranslations('Automations.builder');
  const isEditing = !!initial.id;
  const [state, setState] = useState<BuilderInitial>(initial);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function patchTop<K extends keyof BuilderInitial>(
    key: K,
    value: BuilderInitial[K]
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  // --- Step tree mutations (immutable) ---

  function updateStep(
    path: StepPath,
    updater: (s: BuilderStep) => BuilderStep
  ) {
    setState((s) => ({ ...s, steps: mapAtPath(s.steps, path, updater) }));
  }

  function addStepAt(
    parent: ParentScope,
    index: number,
    type: AutomationStepType
  ) {
    const node: BuilderStep = {
      cid: cid(),
      step_type: type,
      step_config: blankConfig(type),
      branches: type === 'condition' ? { yes: [], no: [] } : undefined,
    };
    setState((s) => ({ ...s, steps: insertAt(s.steps, parent, index, node) }));
    setExpandedId(node.cid);
  }

  function deleteStepAt(path: StepPath) {
    setState((s) => ({ ...s, steps: removeAt(s.steps, path) }));
  }

  function moveStepAt(path: StepPath, direction: -1 | 1) {
    setState((s) => ({ ...s, steps: moveAt(s.steps, path, direction) }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: state.name || 'Untitled automation',
        description: state.description || null,
        trigger_type: state.trigger_type,
        trigger_config: state.trigger_config,
        is_active: state.is_active,
        steps: toApiSteps(state.steps),
      };

      const res = isEditing
        ? await fetch(`/api/automations/${initial.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/automations`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstIssue: { path?: string; message?: string } | undefined =
          body?.issues?.[0];
        if (firstIssue?.message) {
          toast.error(firstIssue.message, {
            description: firstIssue.path ? `at ${firstIssue.path}` : undefined,
          });
        } else {
          toast.error(body?.error ?? t('toasts.saveFailed'));
        }
        return;
      }
      toast.success(isEditing ? t('toasts.saved') : t('toasts.created'));
      if (!isEditing && body?.automation?.id) {
        router.replace(`/automations/${body.automation.id}/edit`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-background fixed inset-0 flex flex-col">
      <AutomationHeader
        name={state.name}
        isActive={state.is_active}
        saving={saving}
        isEditing={isEditing}
        onNameChange={(name) => patchTop('name', name)}
        onActiveChange={(active) => patchTop('is_active', active)}
        onSave={save}
        onBack={() => router.push('/automations')}
      />

      {/* Canvas */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-0 px-4 py-10">
          <ResourcesProvider>
            <TriggerCard
              type={state.trigger_type}
              config={state.trigger_config}
              onTypeChange={(tVal) => patchTop('trigger_type', tVal)}
              onConfigChange={(c) => patchTop('trigger_config', c)}
            />
            <StepList
              steps={state.steps}
              basePath={[]}
              scope={{ kind: 'root' }}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              updateStep={updateStep}
              addStepAt={addStepAt}
              deleteStepAt={deleteStepAt}
              moveStepAt={moveStepAt}
            />
          </ResourcesProvider>
        </div>
      </div>
    </div>
  );
}
