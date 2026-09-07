'use client';

import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AutomationStepType } from '@/types';
import {
  childPath,
  type ParentScope,
  type StepPath,
} from '@/lib/automations/builder-tree';
import { ADDABLE_STEPS, STEP_META, type BuilderStep } from './types';
import { StepEditor, previewFor } from './step-editor';

export interface StepListProps {
  steps: BuilderStep[];
  /**
   * Path of the step that owns this list — `[]` for the root canvas,
   * the condition's own path for a branch column. Combined with
   * `scope` by `childPath` to address each child.
   */
  basePath: StepPath;
  /** Which bucket this list reads and writes. */
  scope: ParentScope;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  updateStep: (
    path: StepPath,
    updater: (s: BuilderStep) => BuilderStep
  ) => void;
  addStepAt: (
    parent: ParentScope,
    index: number,
    type: AutomationStepType
  ) => void;
  deleteStepAt: (path: StepPath) => void;
  moveStepAt: (path: StepPath, direction: -1 | 1) => void;
}

export function StepList(props: StepListProps) {
  const { steps, basePath, scope, ...rest } = props;

  return (
    <div className="flex w-full flex-col items-center">
      <AddButton onPick={(t) => props.addStepAt(scope, 0, t)} />
      {steps.map((step, idx) => (
        <StepRenderer
          key={step.cid}
          step={step}
          index={idx}
          total={steps.length}
          basePath={basePath}
          scope={scope}
          {...rest}
        />
      ))}
    </div>
  );
}

function StepRenderer({
  step,
  index,
  total,
  scope,
  basePath,
  ...props
}: {
  step: BuilderStep;
  index: number;
  total: number;
  scope: ParentScope;
  basePath: StepPath;
} & Omit<StepListProps, 'steps' | 'basePath' | 'scope'>) {
  const t = useTranslations('Automations.builder');
  const path = childPath(basePath, scope, index);
  const meta = STEP_META[step.step_type];
  const Icon = meta.icon;
  const expanded = props.expandedId === step.cid;
  const isCondition = step.step_type === 'condition';
  const nested = basePath.length > 0;

  const width = nested
    ? 'w-full'
    : isCondition
      ? 'w-full max-w-[600px] sm:w-[600px]'
      : 'w-full max-w-[320px] sm:w-80';

  return (
    <>
      <div className={cn('z-10 flex min-w-0 flex-col', width)}>
        <div
          className={cn(
            'border-border bg-card rounded-lg border border-l-4 shadow-lg',
            meta.border
          )}
        >
          <button
            type="button"
            onClick={() => props.setExpandedId(expanded ? null : step.cid)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <GripVertical
              className="text-muted-foreground h-4 w-4 flex-shrink-0"
              aria-hidden
            />
            <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-md">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
                {isCondition
                  ? 'Condition'
                  : step.step_type === 'wait'
                    ? 'Wait'
                    : 'Action'}
              </div>
              <div className="text-foreground truncate text-sm font-medium">
                {t(`steps.${meta.label}`)}
              </div>
              <div className="text-muted-foreground truncate text-[11px]">
                {previewFor(step)}
              </div>
            </div>
            <ChevronDown
              className={cn(
                'text-muted-foreground h-4 w-4 transition-transform',
                expanded && 'rotate-180'
              )}
            />
          </button>
          {expanded && (
            <div className="border-border border-t px-4 py-3">
              <StepEditor
                step={step}
                onChange={(next) => props.updateStep(path, () => next)}
              />
              <div className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    aria-label="Move up"
                    onClick={() => props.moveStepAt(path, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={index === total - 1}
                    aria-label="Move down"
                    onClick={() => props.moveStepAt(path, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => props.deleteStepAt(path)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('delete')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {isCondition && (
          <ConditionBranches step={step} path={path} {...props} />
        )}
      </div>

      {!isCondition && (
        <AddButton onPick={(t) => props.addStepAt(scope, index + 1, t)} />
      )}
    </>
  );
}

function ConditionBranches({
  step,
  path,
  ...props
}: {
  step: BuilderStep;
  path: StepPath;
} & Omit<StepListProps, 'steps' | 'basePath' | 'scope'>) {
  const t = useTranslations('Automations.builder');
  const yes = step.branches?.yes ?? [];
  const no = step.branches?.no ?? [];
  return (
    <div className="@container mt-3 w-full">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <BranchColumn label={t('branches.yes')} color="text-primary">
          <StepList
            {...props}
            steps={yes}
            basePath={path}
            scope={{ kind: 'branch', parentCid: step.cid, branch: 'yes' }}
          />
        </BranchColumn>
        <BranchColumn label={t('branches.no')} color="text-rose-400">
          <StepList
            {...props}
            steps={no}
            basePath={path}
            scope={{ kind: 'branch', parentCid: step.cid, branch: 'no' }}
          />
        </BranchColumn>
      </div>
    </div>
  );
}

function BranchColumn({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className={cn('mb-2 text-[11px] font-semibold uppercase', color)}>
        {label}
      </div>
      {children}
    </div>
  );
}

function AddButton({ onPick }: { onPick: (t: AutomationStepType) => void }) {
  const t = useTranslations('Automations.builder');
  return (
    <div className="relative flex flex-col items-center">
      <div className="bg-border h-4 w-[2px]" aria-hidden />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="border-border bg-background text-muted-foreground hover:border-primary hover:bg-primary/10 hover:text-primary data-[popup-open]:border-primary data-[popup-open]:bg-primary/20 data-[popup-open]:text-primary flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed transition-colors"
          aria-label={t('addStep')}
        >
          <Plus className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="border-border bg-popover max-h-80 min-w-56 overflow-y-auto"
        >
          {ADDABLE_STEPS.map((tp) => {
            const Icon = STEP_META[tp].icon;
            return (
              <DropdownMenuItem key={tp} onClick={() => onPick(tp)}>
                <Icon className="h-4 w-4" />
                {t(`steps.${STEP_META[tp].label}`)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="bg-border h-4 w-[2px]" aria-hidden />
    </div>
  );
}
