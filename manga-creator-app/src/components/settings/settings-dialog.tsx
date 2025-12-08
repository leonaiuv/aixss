"use client";

/**
 * 设置对话框
 * 管理 AI API 配置
 */

import { useState, useEffect } from 'react';
import { Settings, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useConfigStore } from '@/store/config-store';
import { AI_PROVIDERS } from '@/config/constants';
import type { AIProvider } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ==========================================
// 组件属性
// ==========================================
interface SettingsDialogProps {
  children?: React.ReactNode;
}

// ==========================================
// 设置对话框
// ==========================================
export function SettingsDialog({ children }: SettingsDialogProps) {
  const { config, isConfigured, setConfig, loadConfig, testConnection } = useConfigStore();
  
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 打开时加载已有配置
  useEffect(() => {
    if (open && config) {
      setProvider(config.provider);
      setApiKey(''); // 不显示已保存的 Key
      setBaseURL(config.baseURL || '');
      setModel(config.model);
    } else if (open && !config) {
      // 设置默认值
      const defaultProvider = AI_PROVIDERS['deepseek'];
      setModel(defaultProvider.defaultModel);
    }
  }, [open, config]);

  // 切换供应商时更新默认值
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    const providerConfig = AI_PROVIDERS[newProvider];
    setModel(providerConfig.defaultModel);
    setBaseURL('');
    setTestResult(null);
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('请输入 API Key');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // 临时保存配置用于测试
    setConfig({
      provider,
      apiKey,
      baseURL: baseURL || undefined,
      model,
    });

    try {
      const success = await testConnection();
      setTestResult(success ? 'success' : 'error');
      if (success) {
        toast.success('连接成功');
      } else {
        toast.error('连接失败，请检查配置');
      }
    } catch {
      setTestResult('error');
      toast.error('测试连接失败');
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const handleSave = () => {
    if (!apiKey && !config?.apiKey) {
      toast.error('请输入 API Key');
      return;
    }

    setConfig({
      provider,
      apiKey: apiKey || (config?.apiKey ? '' : ''), // 如果未输入新Key，保留旧Key
      baseURL: baseURL || undefined,
      model,
    });

    toast.success('配置已保存');
    setOpen(false);
  };

  const providerConfig = AI_PROVIDERS[provider];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>API 配置</DialogTitle>
          <DialogDescription>
            配置你的 AI 服务商 API Key，数据仅存储在本地浏览器中
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 供应商选择 */}
          <div className="grid gap-2">
            <Label htmlFor="provider">AI 供应商</Label>
            <Select value={provider} onValueChange={(v) => handleProviderChange(v as AIProvider)}>
              <SelectTrigger>
                <SelectValue placeholder="选择供应商" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AI_PROVIDERS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="grid gap-2">
            <Label htmlFor="apiKey">
              API Key {isConfigured && <span className="text-xs text-muted-foreground">(已配置)</span>}
            </Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                placeholder={isConfigured ? '输入新 Key 以更新' : '输入你的 API Key'}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* 自定义 Base URL */}
          {provider === 'openai-compatible' && (
            <div className="grid gap-2">
              <Label htmlFor="baseURL">Base URL</Label>
              <Input
                id="baseURL"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.example.com/v1"
              />
              <p className="text-xs text-muted-foreground">
                使用 OpenAI 兼容接口时需填写
              </p>
            </div>
          )}

          {/* 模型名称 */}
          <div className="grid gap-2">
            <Label htmlFor="model">模型名称</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={providerConfig.defaultModel}
            />
            <p className="text-xs text-muted-foreground">
              默认: {providerConfig.defaultModel}
            </p>
          </div>

          {/* 测试连接 */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>
            {testResult === 'success' && (
              <span className="flex items-center text-sm text-green-600">
                <CheckCircle className="mr-1 h-4 w-4" />
                连接成功
              </span>
            )}
            {testResult === 'error' && (
              <span className="flex items-center text-sm text-red-600">
                <XCircle className="mr-1 h-4 w-4" />
                连接失败
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存配置</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
