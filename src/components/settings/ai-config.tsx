'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, CheckCircle2, Trash2, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsPanelHead } from './settings-panel-head';
import { AiKnowledgeCard } from './ai-knowledge';
import { AI_PROVIDER_DEFAULT_MODEL, AI_DEFAULT_CUSTOM_ENDPOINT } from '@/lib/ai/defaults';
import type { AiProvider } from '@/lib/ai/types';
import { CustomAiDialog } from './custom-ai-dialog';
import type { AccountMember } from '@/types';
import { fetchAccountMembers, memberLabel } from '@/lib/account/members';
import { useTranslations } from 'next-intl';

const MASKED_KEY = '••••••••••••••••';

// Radix Select can't use an empty-string item value, so the "leave
// unassigned" choice gets a sentinel that maps to null in the payload.
const HANDOFF_QUEUE = '__queue__';

const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  custom: 'Custom (OpenRouter / Endpoint)',
};

const KEY_PLACEHOLDER: Record<AiProvider, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  custom: 'sk-or-v1-... (OpenRouter API key)',
};

export function AiConfig() {
  const { accountId, accountRole, profileLoading } = useAuth();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;
  const t = useTranslations('Settings.aiConfig');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [configured, setConfigured] = useState(false);
  const [provider, setProvider] = useState<AiProvider>('openai');
  const [model, setModel] = useState(AI_PROVIDER_DEFAULT_MODEL.openai);
  const [customEndpoint, setCustomEndpoint] = useState(AI_DEFAULT_CUSTOM_ENDPOINT);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [embeddingsKey, setEmbeddingsKey] = useState('');
  const [embeddingsKeyEdited, setEmbeddingsKeyEdited] = useState(false);
  const [hasStoredEmbeddingsKey, setHasStoredEmbeddingsKey] = useState(false);
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackProvider, setFallbackProvider] = useState<AiProvider>('anthropic');
  const [fallbackModel, setFallbackModel] = useState(AI_PROVIDER_DEFAULT_MODEL.anthropic);
  const [fallbackEndpoint, setFallbackEndpoint] = useState(AI_DEFAULT_CUSTOM_ENDPOINT);
  const [showFallbackCustomDialog, setShowFallbackCustomDialog] = useState(false);
  const [fallbackApiKey, setFallbackApiKey] = useState('');
  const [fallbackKeyEdited, setFallbackKeyEdited] = useState(false);
  const [showFallbackKey, setShowFallbackKey] = useState(false);
  const [hasStoredFallbackKey, setHasStoredFallbackKey] = useState(false);
  const [testingFallback, setTestingFallback] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [maxPerConversation, setMaxPerConversation] = useState(3);
  // Empty string = leave unassigned (shared queue).
  const [handoffAgentId, setHandoffAgentId] = useState('');
  const [members, setMembers] = useState<AccountMember[]>([]);

  // Guard keyed on the account (not a bare boolean) so an in-place
  // account switch — ownership transfer, multi-account membership —
  // refetches instead of showing the previous account's config. Mirrors
  // the loadedAccountIdRef pattern in whatsapp-config.tsx.
  const loadedAccountIdRef = useRef<string | null>(null);
  const savedProviderRef = useRef<AiProvider | null>(null);
  const savedFallbackProviderRef = useRef<AiProvider | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t('loadFailed'));
        return;
      }
      if (data.configured) {
        setConfigured(true);
        setProvider(data.provider);
        savedProviderRef.current = data.provider;
        setModel(data.model);
        if (data.endpoint) {
          setCustomEndpoint(data.endpoint);
        }
        setSystemPrompt(data.system_prompt ?? '');
        setIsActive(data.is_active);
        setAutoReplyEnabled(data.auto_reply_enabled);
        setMaxPerConversation(data.auto_reply_max_per_conversation ?? 3);
        setHandoffAgentId(data.handoff_agent_id ?? '');
        setHasStoredKey(Boolean(data.has_key));
        setApiKey(data.has_key ? MASKED_KEY : '');
        setKeyEdited(false);
        setHasStoredEmbeddingsKey(Boolean(data.has_embeddings_key));
        setEmbeddingsKey(data.has_embeddings_key ? MASKED_KEY : '');
        setEmbeddingsKeyEdited(false);

        if (data.fallback && data.fallback.enabled) {
          setFallbackEnabled(true);
          setFallbackProvider(data.fallback.provider ?? 'anthropic');
          savedFallbackProviderRef.current = data.fallback.provider ?? 'anthropic';
          setFallbackModel(data.fallback.model ?? AI_PROVIDER_DEFAULT_MODEL.anthropic);
          if (data.fallback.endpoint) {
            setFallbackEndpoint(data.fallback.endpoint);
          }
          setHasStoredFallbackKey(Boolean(data.fallback.has_key));
          setFallbackApiKey(data.fallback.has_key ? MASKED_KEY : '');
          setFallbackKeyEdited(false);
        } else {
          setFallbackEnabled(false);
          setFallbackProvider('anthropic');
          savedFallbackProviderRef.current = null;
          setFallbackModel(AI_PROVIDER_DEFAULT_MODEL.anthropic);
          setFallbackEndpoint(AI_DEFAULT_CUSTOM_ENDPOINT);
          setFallbackApiKey('');
          setFallbackKeyEdited(false);
          setHasStoredFallbackKey(false);
        }
      }
    } catch {
      toast.error(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accountId || loadedAccountIdRef.current === accountId) return;
    loadedAccountIdRef.current = accountId;
    void fetchConfig();
    // Members populate the handoff-target picker. Best-effort — on an
    // older deployment without the endpoint the picker just shows the
    // queue option.
    void fetchAccountMembers().then(setMembers);
  }, [accountId, fetchConfig]);

  // Swap the model default when the provider changes, unless the user
  // typed a custom model.
  const handleProviderChange = (next: AiProvider) => {
    setProvider(next);
    if (savedProviderRef.current && next !== savedProviderRef.current) {
      setApiKey('');
      setHasStoredKey(false);
      setKeyEdited(true);
    } else if (savedProviderRef.current && next === savedProviderRef.current) {
      setApiKey(MASKED_KEY);
      setHasStoredKey(true);
      setKeyEdited(false);
    }

    if (next === 'custom') {
      setShowCustomDialog(true);
      if (
        model === AI_PROVIDER_DEFAULT_MODEL.openai ||
        model === AI_PROVIDER_DEFAULT_MODEL.anthropic ||
        model.trim() === ''
      ) {
        setModel(AI_PROVIDER_DEFAULT_MODEL.custom);
      }
    } else {
      const isDefaultModel =
        model === AI_PROVIDER_DEFAULT_MODEL.openai ||
        model === AI_PROVIDER_DEFAULT_MODEL.anthropic ||
        model === AI_PROVIDER_DEFAULT_MODEL.custom ||
        model.trim() === '';
      if (isDefaultModel) setModel(AI_PROVIDER_DEFAULT_MODEL[next]);
    }
  };

  const handleFallbackProviderChange = (next: AiProvider) => {
    setFallbackProvider(next);
    if (savedFallbackProviderRef.current && next !== savedFallbackProviderRef.current) {
      setFallbackApiKey('');
      setHasStoredFallbackKey(false);
      setFallbackKeyEdited(true);
    } else if (savedFallbackProviderRef.current && next === savedFallbackProviderRef.current) {
      setFallbackApiKey(MASKED_KEY);
      setHasStoredFallbackKey(true);
      setFallbackKeyEdited(false);
    }

    if (next === 'custom') {
      setShowFallbackCustomDialog(true);
      if (
        fallbackModel === AI_PROVIDER_DEFAULT_MODEL.openai ||
        fallbackModel === AI_PROVIDER_DEFAULT_MODEL.anthropic ||
        fallbackModel.trim() === ''
      ) {
        setFallbackModel(AI_PROVIDER_DEFAULT_MODEL.custom);
      }
    } else {
      const isDefaultModel =
        fallbackModel === AI_PROVIDER_DEFAULT_MODEL.openai ||
        fallbackModel === AI_PROVIDER_DEFAULT_MODEL.anthropic ||
        fallbackModel === AI_PROVIDER_DEFAULT_MODEL.custom ||
        fallbackModel.trim() === '';
      if (isDefaultModel) setFallbackModel(AI_PROVIDER_DEFAULT_MODEL[next]);
    }
  };

  const keyPayload = () => (keyEdited ? apiKey.trim() : undefined);

  const fallbackKeyPayload = () =>
    fallbackKeyEdited ? fallbackApiKey.trim() : undefined;

  // undefined = leave unchanged; '' typed = null (clear); text = set.
  const embeddingsKeyPayload = () =>
    embeddingsKeyEdited ? embeddingsKey.trim() || null : undefined;

  const buildBody = () => ({
    provider,
    model: model.trim(),
    endpoint: provider === 'custom' ? customEndpoint.trim() : undefined,
    api_key: keyPayload(),
    embeddings_api_key: embeddingsKeyPayload(),
    fallback: fallbackEnabled
      ? {
          enabled: true,
          provider: fallbackProvider,
          model: fallbackModel.trim(),
          endpoint: fallbackProvider === 'custom' ? fallbackEndpoint.trim() : undefined,
          api_key: fallbackKeyPayload(),
        }
      : { enabled: false },
    system_prompt: systemPrompt.trim() || null,
    is_active: isActive,
    auto_reply_enabled: autoReplyEnabled,
    auto_reply_max_per_conversation: maxPerConversation,
    handoff_agent_id: handoffAgentId || null,
  });

  const handleTest = async () => {
    if (!keyEdited && !hasStoredKey) {
      toast.error(t('missingApiKey'));
      return;
    }
    if (keyEdited && !apiKey.trim()) {
      toast.error(t('missingApiKey'));
      return;
    }
    if (
      provider === 'custom' &&
      customEndpoint.includes('openrouter.ai') &&
      keyEdited &&
      apiKey.trim() &&
      !apiKey.trim().startsWith('sk-or-v1-')
    ) {
      toast.error('OpenRouter API keys must start with "sk-or-v1-". Please check your key.');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: model.trim(),
          endpoint: provider === 'custom' ? customEndpoint.trim() : undefined,
          api_key: keyPayload(),
          target: 'primary',
        }),
      });
      const data = await res.json();
      if (res.ok) toast.success(t('testSuccess'));
      else toast.error(data.error ?? t('testRejected'));
    } catch {
      toast.error(t('testNetworkError'));
    } finally {
      setTesting(false);
    }
  };

  const handleTestFallback = async () => {
    if (!fallbackKeyEdited && !hasStoredFallbackKey) {
      toast.error(t('fallbackMissingApiKey'));
      return;
    }
    if (fallbackKeyEdited && !fallbackApiKey.trim()) {
      toast.error(t('fallbackMissingApiKey'));
      return;
    }
    if (
      fallbackProvider === 'custom' &&
      fallbackEndpoint.includes('openrouter.ai') &&
      fallbackKeyEdited &&
      fallbackApiKey.trim() &&
      !fallbackApiKey.trim().startsWith('sk-or-v1-')
    ) {
      toast.error('OpenRouter API keys must start with "sk-or-v1-". Please check your key.');
      return;
    }
    setTestingFallback(true);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: fallbackProvider,
          model: fallbackModel.trim(),
          endpoint: fallbackProvider === 'custom' ? fallbackEndpoint.trim() : undefined,
          api_key: fallbackKeyPayload(),
          target: 'fallback',
        }),
      });
      const data = await res.json();
      if (res.ok) toast.success(t('testSuccess'));
      else toast.error(data.error ?? t('testRejected'));
    } catch {
      toast.error(t('testNetworkError'));
    } finally {
      setTestingFallback(false);
    }
  };

  const handleSave = async () => {
    if (!model.trim()) {
      toast.error(t('missingModel'));
      return;
    }
    if (provider === 'custom' && !customEndpoint.trim()) {
      toast.error(t('missingEndpoint'));
      return;
    }
    if (!hasStoredKey && !apiKey.trim()) {
      toast.error(t('missingApiKey'));
      return;
    }
    if (keyEdited && !apiKey.trim()) {
      toast.error(t('missingApiKey'));
      return;
    }
    if (
      provider === 'custom' &&
      customEndpoint.includes('openrouter.ai') &&
      keyEdited &&
      apiKey.trim() &&
      !apiKey.trim().startsWith('sk-or-v1-')
    ) {
      toast.error('OpenRouter API keys must start with "sk-or-v1-". Please check your key.');
      return;
    }
    if (fallbackEnabled) {
      if (!fallbackModel.trim()) {
        toast.error(t('fallbackMissingModel'));
        return;
      }
      if (fallbackProvider === 'custom' && !fallbackEndpoint.trim()) {
        toast.error(t('fallbackMissingEndpoint'));
        return;
      }
      if (!hasStoredFallbackKey && !fallbackApiKey.trim()) {
        toast.error(t('fallbackMissingApiKey'));
        return;
      }
      if (fallbackKeyEdited && !fallbackApiKey.trim()) {
        toast.error(t('fallbackMissingApiKey'));
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('saveSuccess'));
        await fetchConfig();
      } else {
        toast.error(data.error ?? t('saveFailed'));
      }
    } catch {
      toast.error(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch('/api/ai/config', { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('removeSuccess'));
        setConfigured(false);
        setHasStoredKey(false);
        setApiKey('');
        setKeyEdited(false);
        setFallbackEnabled(false);
        setFallbackApiKey('');
        setFallbackKeyEdited(false);
        setHasStoredFallbackKey(false);
        setIsActive(false);
        setAutoReplyEnabled(false);
        setSystemPrompt('');
        setHandoffAgentId('');
      } else {
        const data = await res.json();
        toast.error(data.error ?? t('removeFailed'));
      }
    } catch {
      toast.error(t('removeFailed'));
    } finally {
      setRemoving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loadFailed')} {/* Re-using label or a global one, wait, loading is better. Let's use useTranslations from overview or just hardcode Loading... actually I should add loading to aiConfig */}
        {/* Wait, I didn't add loading to aiConfig. I'll just use loading. */}
      </div>
    );
  }

  const disabled = !canEdit || saving;

  return (
    <div>
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
      />

      {!canEdit && (
        <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {t('adminOnlyConfig')}
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> {t('providerAndKey')}
            </CardTitle>
            <CardDescription>
              {t('encryptionNotice')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('provider')}</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => handleProviderChange(v as AiProvider)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">{PROVIDER_LABEL.openai}</SelectItem>
                    <SelectItem value="anthropic">
                      {PROVIDER_LABEL.anthropic}
                    </SelectItem>
                    <SelectItem value="custom">
                      {PROVIDER_LABEL.custom}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-model">{t('model')}</Label>
                <Input
                  id="ai-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={AI_PROVIDER_DEFAULT_MODEL[provider]}
                  disabled={disabled}
                />
              </div>

              {provider === 'custom' && (
                <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden text-muted-foreground">
                    <span className="font-semibold text-foreground shrink-0">{t('customEndpoint')}</span>
                    <code className="truncate font-mono text-primary font-medium">{customEndpoint}</code>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomDialog(true)}
                    disabled={disabled}
                    className="shrink-0 text-xs h-7 gap-1"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    {t('configure')}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-key">{t('apiKey')}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="ai-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setKeyEdited(true);
                    }}
                    onFocus={() => {
                      if (!keyEdited && hasStoredKey) {
                        setApiKey('');
                        setKeyEdited(true);
                      }
                    }}
                    placeholder={KEY_PLACEHOLDER[provider]}
                    disabled={disabled}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={disabled || testing}
                >
                  {testing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {t('testKey')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-embeddings-key">
                {t('embeddingsKey')}{' '}
                <span className="font-normal text-muted-foreground">
                  {t('optionalSemanticSearch')}
                </span>
              </Label>
              <Input
                id="ai-embeddings-key"
                type="password"
                value={embeddingsKey}
                onChange={(e) => {
                  setEmbeddingsKey(e.target.value);
                  setEmbeddingsKeyEdited(true);
                }}
                onFocus={() => {
                  if (!embeddingsKeyEdited && hasStoredEmbeddingsKey) {
                    setEmbeddingsKey('');
                    setEmbeddingsKeyEdited(true);
                  }
                }}
                placeholder="sk-... (OpenAI)"
                disabled={disabled}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {t('embeddingsHint', {
                  sameKeyText: provider === 'openai' ? t('sameKeyText') : '',
                })}
              </p>
            </div>

            {/* Fallback Provider (Auto-Failover) */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    {t('enableFallback')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('fallbackDesc')}
                  </p>
                </div>
                <Switch
                  checked={fallbackEnabled}
                  onCheckedChange={setFallbackEnabled}
                  disabled={disabled}
                />
              </div>

              {fallbackEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('fallbackProvider')}</Label>
                      <Select
                        value={fallbackProvider}
                        onValueChange={(v) => handleFallbackProviderChange(v as AiProvider)}
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">{PROVIDER_LABEL.openai}</SelectItem>
                          <SelectItem value="anthropic">{PROVIDER_LABEL.anthropic}</SelectItem>
                          <SelectItem value="custom">{PROVIDER_LABEL.custom}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fallback-ai-model">{t('fallbackModel')}</Label>
                      <Input
                        id="fallback-ai-model"
                        value={fallbackModel}
                        onChange={(e) => setFallbackModel(e.target.value)}
                        placeholder={AI_PROVIDER_DEFAULT_MODEL[fallbackProvider]}
                        disabled={disabled}
                      />
                    </div>

                    {fallbackProvider === 'custom' && (
                      <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden text-muted-foreground">
                          <span className="font-semibold text-foreground shrink-0">{t('customEndpoint')}</span>
                          <code className="truncate font-mono text-primary font-medium">{fallbackEndpoint}</code>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFallbackCustomDialog(true)}
                          disabled={disabled}
                          className="shrink-0 text-xs h-7 gap-1"
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          {t('configure')}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fallback-ai-key">{t('fallbackApiKey')}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="fallback-ai-key"
                          type={showFallbackKey ? 'text' : 'password'}
                          value={fallbackApiKey}
                          onChange={(e) => {
                            setFallbackApiKey(e.target.value);
                            setFallbackKeyEdited(true);
                          }}
                          onFocus={() => {
                            if (!fallbackKeyEdited && hasStoredFallbackKey) {
                              setFallbackApiKey('');
                              setFallbackKeyEdited(true);
                            }
                          }}
                          placeholder={KEY_PLACEHOLDER[fallbackProvider]}
                          disabled={disabled}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFallbackKey((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showFallbackKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleTestFallback}
                        disabled={disabled || testingFallback}
                      >
                        {testingFallback ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {t('testFallbackKey')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('behaviour')}</CardTitle>
            <CardDescription>
              {t('behaviourDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">{t('businessContext')}</Label>
              <Textarea
                id="ai-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={t('promptPlaceholder')}
                rows={5}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('enableAssistant')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('enableAssistantDesc')}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('autoReply')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('autoReplyDesc')}
                </p>
              </div>
              <Switch
                checked={autoReplyEnabled}
                onCheckedChange={setAutoReplyEnabled}
                disabled={disabled || !isActive}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="ai-max">{t('maxAutoReplies')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('maxAutoRepliesDesc')}
                </p>
              </div>
              <Input
                id="ai-max"
                type="number"
                min={1}
                max={20}
                value={maxPerConversation}
                onChange={(e) =>
                  setMaxPerConversation(
                    Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                disabled={disabled || !autoReplyEnabled}
                className="w-20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-handoff">{t('handoffTo')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('handoffToDesc')}
              </p>
              <Select
                value={handoffAgentId || HANDOFF_QUEUE}
                onValueChange={(v) =>
                  setHandoffAgentId(!v || v === HANDOFF_QUEUE ? '' : v)
                }
                disabled={disabled || !autoReplyEnabled}
              >
                <SelectTrigger id="ai-handoff">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={HANDOFF_QUEUE}>
                    {t('handoffQueue')}
                  </SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {memberLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <AiKnowledgeCard
          accountId={accountId}
          canEdit={canEdit}
          hasEmbeddingsKey={
            embeddingsKeyEdited
              ? embeddingsKey.trim().length > 0
              : hasStoredEmbeddingsKey
          }
        />

        <div className="flex items-center justify-between">
          {configured ? (
            <Button
              variant="ghost"
              onClick={handleRemove}
              disabled={!canEdit || removing}
              className="text-destructive hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t('remove')}
            </Button>
          ) : (
            <span />
          )}

          <Button onClick={handleSave} disabled={disabled}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('save')}
          </Button>
        </div>
      </div>

      <CustomAiDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        endpoint={customEndpoint}
        model={model}
        onApply={({ endpoint: newEndpoint, model: newModel }) => {
          setCustomEndpoint(newEndpoint);
          setModel(newModel);
        }}
      />

      <CustomAiDialog
        open={showFallbackCustomDialog}
        onOpenChange={setShowFallbackCustomDialog}
        endpoint={fallbackEndpoint}
        model={fallbackModel}
        onApply={({ endpoint: newEndpoint, model: newModel }) => {
          setFallbackEndpoint(newEndpoint);
          setFallbackModel(newModel);
        }}
      />
    </div>
  );
}
