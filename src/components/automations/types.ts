import {
  MessageSquare,
  FileText,
  Tag,
  TagIcon,
  UserCheck,
  PencilLine,
  Briefcase,
  Hourglass,
  GitBranch,
  Webhook,
  CircleSlash,
  Zap,
  MousePointerClick,
  List,
} from 'lucide-react';
import type {
  AccountMember,
  AutomationStepType,
  AutomationTriggerType,
  CustomField,
  InteractiveMessagePayload,
  MessageTemplate,
  Tag as TagRecord,
} from '@/types';
import {
  blankButtonsPayload,
  blankListPayload,
} from '@/components/interactive/interactive-builder';

// ------------------------------------------------------------
// Types (builder-local — mirror the flattened rows we POST)
// ------------------------------------------------------------

export interface BuilderStep {
  /** Client id; the API assigns real UUIDs server-side. */
  cid: string;
  step_type: AutomationStepType;
  step_config: Record<string, unknown>;
  branches?: { yes: BuilderStep[]; no: BuilderStep[] };
}

export interface BuilderInitial {
  id?: string;
  name: string;
  description: string;
  trigger_type: AutomationTriggerType;
  trigger_config: Record<string, unknown>;
  is_active: boolean;
  steps: BuilderStep[];
}

export interface StepMeta {
  label: string;
  icon: typeof Zap;
  /** Left-border accent color per spec. */
  border: string;
}

export const STEP_META: Record<AutomationStepType, StepMeta> = {
  send_message: {
    label: 'send_message',
    icon: MessageSquare,
    border: 'border-l-primary',
  },
  send_buttons: {
    label: 'send_buttons',
    icon: MousePointerClick,
    border: 'border-l-primary',
  },
  send_list: { label: 'send_list', icon: List, border: 'border-l-primary' },
  send_template: {
    label: 'send_template',
    icon: FileText,
    border: 'border-l-primary',
  },
  add_tag: { label: 'add_tag', icon: Tag, border: 'border-l-primary' },
  remove_tag: {
    label: 'remove_tag',
    icon: TagIcon,
    border: 'border-l-primary',
  },
  assign_conversation: {
    label: 'assign_conversation',
    icon: UserCheck,
    border: 'border-l-primary',
  },
  update_contact_field: {
    label: 'update_contact_field',
    icon: PencilLine,
    border: 'border-l-primary',
  },
  create_deal: {
    label: 'create_deal',
    icon: Briefcase,
    border: 'border-l-primary',
  },
  wait: { label: 'wait', icon: Hourglass, border: 'border-l-border' },
  condition: {
    label: 'condition',
    icon: GitBranch,
    border: 'border-l-amber-500',
  },
  send_webhook: {
    label: 'send_webhook',
    icon: Webhook,
    border: 'border-l-primary',
  },
  close_conversation: {
    label: 'close_conversation',
    icon: CircleSlash,
    border: 'border-l-primary',
  },
};

export const ADDABLE_STEPS: AutomationStepType[] = [
  'send_message',
  'send_buttons',
  'send_list',
  'send_template',
  'add_tag',
  'remove_tag',
  'assign_conversation',
  'update_contact_field',
  'create_deal',
  'wait',
  'condition',
  'send_webhook',
  'close_conversation',
];

export const TRIGGER_OPTIONS: { value: AutomationTriggerType }[] = [
  { value: 'new_message_received' },
  { value: 'first_inbound_message' },
  { value: 'keyword_match' },
  { value: 'interactive_reply' },
  { value: 'new_contact_created' },
  { value: 'conversation_assigned' },
  { value: 'tag_added' },
  { value: 'time_based' },
];

export const SELECT_CLASS =
  'w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none';

export function cid(): string {
  return (
    'c_' +
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36))
  );
}

export function toStepConfig(
  p: InteractiveMessagePayload
): Record<string, unknown> {
  return p as unknown as Record<string, unknown>;
}

export function asInteractive(
  cfg: Record<string, unknown>
): InteractiveMessagePayload {
  return cfg as unknown as InteractiveMessagePayload;
}

export function blankConfig(type: AutomationStepType): Record<string, unknown> {
  switch (type) {
    case 'send_message':
      return { text: '' };
    case 'send_buttons':
      return toStepConfig(blankButtonsPayload());
    case 'send_list':
      return toStepConfig(blankListPayload());
    case 'send_template':
      return { template_name: '', language: 'en_US' };
    case 'add_tag':
    case 'remove_tag':
      return { tag_id: '' };
    case 'assign_conversation':
      return { mode: 'round_robin' };
    case 'update_contact_field':
      return { field: 'name', value: '' };
    case 'create_deal':
      return { pipeline_id: '', stage_id: '', title: '', value: 0 };
    case 'wait':
      return { amount: 1, unit: 'hours' };
    case 'condition':
      return { subject: 'tag_presence', operand: '', value: '' };
    case 'send_webhook':
      return { url: '', headers: {}, body_template: '' };
    case 'close_conversation':
      return {};
    default:
      return {};
  }
}

export interface PipelineOption {
  id: string;
  name: string;
}

export interface PipelineStageOption {
  id: string;
  name: string;
  pipeline_id: string;
  position: number;
}

export interface AutomationResources {
  tags: TagRecord[];
  members: AccountMember[];
  templates: MessageTemplate[];
  customFields: CustomField[];
  pipelines: PipelineOption[];
  stages: PipelineStageOption[];
}

export interface ApiStep {
  step_type: string;
  step_config: Record<string, unknown>;
  branches?: { yes?: ApiStep[]; no?: ApiStep[] };
}

export function toApiSteps(steps: BuilderStep[]): ApiStep[] {
  return steps.map((s) => ({
    step_type: s.step_type,
    step_config: s.step_config,
    branches: s.branches
      ? { yes: toApiSteps(s.branches.yes), no: toApiSteps(s.branches.no) }
      : undefined,
  }));
}

export interface ServerStepNode {
  id: string;
  step_type: string;
  step_config: Record<string, unknown>;
  branches: { yes: ServerStepNode[]; no: ServerStepNode[] };
}

export function fromServerSteps(nodes: ServerStepNode[]): BuilderStep[] {
  return nodes.map((n) => ({
    cid: cid(),
    step_type: n.step_type as AutomationStepType,
    step_config: n.step_config ?? {},
    branches:
      n.step_type === 'condition'
        ? {
            yes: fromServerSteps(n.branches?.yes ?? []),
            no: fromServerSteps(n.branches?.no ?? []),
          }
        : undefined,
  }));
}
