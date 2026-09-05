'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Server, Zap, Cpu, Globe, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CustomAiPreset {
  id: string;
  name: string;
  endpoint: string;
  defaultModel: string;
  icon: typeof Sparkles;
  hint: string;
}

export const CUSTOM_AI_PRESETS: CustomAiPreset[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    icon: Globe,
    hint: 'Unified API for 100+ models (Claude, GPT-4o, DeepSeek, Llama 3)',
  },
  {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    icon: Zap,
    hint: 'Ultra low-latency LPU inference for Llama 3 & open models',
  },
  {
    id: 'together',
    name: 'Together AI',
    endpoint: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    icon: Server,
    hint: 'Fast inference for popular open source LLMs',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    icon: Cpu,
    hint: 'Self-hosted local models running without external API costs',
  },
];

interface CustomAiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  model: string;
  onApply: (config: { endpoint: string; model: string }) => void;
}

export function CustomAiDialog({
  open,
  onOpenChange,
  endpoint,
  model,
  onApply,
}: CustomAiDialogProps) {
  const [endpointInput, setEndpointInput] = useState(endpoint || 'https://openrouter.ai/api/v1');
  const [modelInput, setModelInput] = useState(model || 'openai/gpt-4o-mini');
  const [error, setError] = useState<string | null>(null);

  // Sync state when opened
  useEffect(() => {
    if (open) {
      setEndpointInput(endpoint || 'https://openrouter.ai/api/v1');
      setModelInput(model || 'openai/gpt-4o-mini');
      setError(null);
    }
  }, [open, endpoint, model]);

  const handleSelectPreset = (preset: CustomAiPreset) => {
    setEndpointInput(preset.endpoint);
    setModelInput(preset.defaultModel);
    setError(null);
  };

  const handleSave = () => {
    const trimmedEndpoint = endpointInput.trim();
    const trimmedModel = modelInput.trim();

    if (!trimmedEndpoint) {
      setError('Please provide an API endpoint URL.');
      return;
    }

    try {
      const parsed = new URL(trimmedEndpoint);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Endpoint URL must start with http:// or https://');
        return;
      }
    } catch {
      setError('Please enter a valid URL (e.g. https://openrouter.ai/api/v1).');
      return;
    }

    if (!trimmedModel) {
      setError('Please provide a model name or identifier.');
      return;
    }

    onApply({
      endpoint: trimmedEndpoint,
      model: trimmedModel,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Configure Custom AI Provider
          </DialogTitle>
          <DialogDescription>
            Connect OpenRouter or any custom OpenAI-compatible API endpoint to use your choice of models.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Quick Presets
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CUSTOM_AI_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected =
                  endpointInput.replace(/\/+$/, '') === preset.endpoint.replace(/\/+$/, '');
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all hover:bg-accent/50 ${
                      isSelected
                        ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border bg-card'
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {preset.name}
                        </span>
                        {isSelected && <Check className="h-3 w-3 text-primary" />}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {preset.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Endpoint Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-ai-endpoint">API Endpoint / Base URL</Label>
            <Input
              id="custom-ai-endpoint"
              value={endpointInput}
              onChange={(e) => {
                setEndpointInput(e.target.value);
                setError(null);
              }}
              placeholder="https://openrouter.ai/api/v1"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Base URL or direct completion URL (e.g. <code>https://openrouter.ai/api/v1</code>)
            </p>
          </div>

          {/* Model Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-ai-model">Model Identifier</Label>
            <Input
              id="custom-ai-model"
              value={modelInput}
              onChange={(e) => {
                setModelInput(e.target.value);
                setError(null);
              }}
              placeholder="e.g. openai/gpt-4o-mini, anthropic/claude-3.5-sonnet, deepseek/deepseek-chat"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              The exact model slug recognized by your provider
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save & Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
