'use client';

import { useTranslations } from 'next-intl';
import {
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Sparkles,
  Video,
  MessageSquareDashed,
  Zap,
} from 'lucide-react';
import { GatedButton } from '@/components/ui/gated-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ComposerToolbarProps {
  readOnly: boolean;
  busy: boolean;
  drafting: boolean;
  inputsDisabled: boolean;
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickDocument: () => void;
  onStartRecording: () => void;
  onOpenTemplates: () => void;
  onDraftWithAi: () => void;
  onOpenInteractive: () => void;
  onOpenQuickReplies: () => void;
}

export function ComposerToolbar({
  readOnly,
  busy,
  drafting,
  inputsDisabled,
  mobileMenuOpen,
  onMobileMenuOpenChange,
  onPickImage,
  onPickVideo,
  onPickDocument,
  onStartRecording,
  onOpenTemplates,
  onDraftWithAi,
  onOpenInteractive,
  onOpenQuickReplies,
}: ComposerToolbarProps) {
  const t = useTranslations('Inbox.composer');

  return (
    <>
      {/* Mobile consolidated "+" menu (< md) */}
      <div className="flex items-end md:hidden">
        <DropdownMenu
          open={mobileMenuOpen}
          onOpenChange={onMobileMenuOpenChange}
        >
          <DropdownMenuTrigger
            disabled={readOnly || busy}
            title={readOnly ? t('readOnlyTitle') : t('moreActions')}
            aria-label={t('moreActions')}
            className="bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy || drafting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  mobileMenuOpen && 'rotate-45'
                )}
              />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="border-border/80 bg-popover/95 w-64 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md"
          >
            <div className="text-muted-foreground/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
              {t('attachMedia')}
            </div>

            <DropdownMenuItem
              disabled={inputsDisabled || busy}
              onClick={onPickImage}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
                <ImageIcon className="h-4 w-4" />
              </div>
              <span className="text-foreground font-medium">{t('photo')}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={inputsDisabled || busy}
              onClick={onPickVideo}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-500">
                <Video className="h-4 w-4" />
              </div>
              <span className="text-foreground font-medium">{t('video')}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={inputsDisabled || busy}
              onClick={onPickDocument}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-foreground font-medium">
                {t('document')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={inputsDisabled || busy}
              onClick={onStartRecording}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500">
                <Mic className="h-4 w-4" />
              </div>
              <span className="text-foreground font-medium">
                {t('voiceNote')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <div className="text-muted-foreground/70 px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
              {t('moreActions')}
            </div>

            <DropdownMenuItem
              disabled={readOnly}
              onClick={onOpenTemplates}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <span className="text-foreground font-medium">
                {t('sendTemplate')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={inputsDisabled || drafting}
              onClick={onDraftWithAi}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                {drafting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <span className="text-foreground font-medium">
                {t('draftWithAI')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={inputsDisabled}
              onClick={onOpenInteractive}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500">
                <MessageSquareDashed className="h-4 w-4" />
              </div>
              <span className="text-foreground font-medium">
                {t('interactiveMessage')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={inputsDisabled}
              onClick={onOpenQuickReplies}
              className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-500/15 text-yellow-500">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-foreground font-medium">
                {t('quickReplies')}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop horizontal action icons (>= md) */}
      <div className="hidden items-end gap-2 md:flex">
        {/* Attach menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={inputsDisabled || busy}
            title={
              readOnly
                ? t('readOnlyTitle')
                : inputsDisabled
                  ? undefined
                  : t('attachMedia')
            }
            className="text-muted-foreground hover:text-foreground inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md p-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-border bg-popover"
          >
            <DropdownMenuItem onClick={onPickImage}>
              <ImageIcon className="mr-2 h-4 w-4" />
              {t('photo')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPickVideo}>
              <Video className="mr-2 h-4 w-4" />
              {t('video')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPickDocument}>
              <FileText className="mr-2 h-4 w-4" />
              {t('document')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStartRecording}>
              <Mic className="mr-2 h-4 w-4" />
              {t('voiceNote')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* + menu — interactive messages + quick replies */}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={inputsDisabled}
            title={
              readOnly
                ? t('readOnlyTitle')
                : inputsDisabled
                  ? undefined
                  : t('moreActions')
            }
            className="text-muted-foreground hover:text-foreground inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md p-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-border bg-popover"
          >
            <DropdownMenuItem onClick={onOpenInteractive}>
              <MessageSquareDashed className="mr-2 h-4 w-4" />
              {t('interactiveMessage')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenQuickReplies}>
              <Zap className="mr-2 h-4 w-4" />
              {t('quickReplies')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <GatedButton
          variant="ghost"
          size="sm"
          canAct={!readOnly}
          gateReason="send messages"
          title={readOnly ? undefined : t('sendTemplate')}
          className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 p-0"
          onClick={onOpenTemplates}
        >
          <LayoutTemplate className="h-4 w-4" />
        </GatedButton>

        <GatedButton
          variant="ghost"
          size="sm"
          canAct={!readOnly}
          gateReason="send messages"
          disabled={drafting}
          title={readOnly ? undefined : t('draftWithAI')}
          className="text-muted-foreground hover:text-primary h-9 w-9 shrink-0 p-0"
          onClick={onDraftWithAi}
        >
          {drafting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </GatedButton>
      </div>
    </>
  );
}
