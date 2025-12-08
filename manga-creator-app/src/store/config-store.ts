/**
 * 用户配置 Store
 * 管理AI API配置
 */
import { create } from 'zustand';
import type { UserConfig, AIProvider } from '@/types';
import { STORAGE_KEYS, AI_PROVIDERS } from '@/config/constants';
import { encrypt, decrypt } from '@/services/storage/encryption';

interface ConfigState {
  // 配置
  config: UserConfig | null;
  isConfigured: boolean;
  
  // Actions
  setConfig: (config: UserConfig) => void;
  clearConfig: () => void;
  getDecryptedApiKey: () => string;
  testConnection: () => Promise<boolean>;
  
  // 初始化
  loadConfig: () => void;
}

const DEFAULT_CONFIG: Partial<UserConfig> = {
  provider: 'deepseek',
  model: 'deepseek-chat',
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  isConfigured: false,
  
  // 设置配置
  setConfig: (config) => {
    // 加密 API Key 后存储
    const encryptedConfig = {
      ...config,
      apiKey: encrypt(config.apiKey),
    };
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(encryptedConfig));
    }
    
    set({
      config: encryptedConfig,
      isConfigured: true,
    });
  },
  
  // 清除配置
  clearConfig: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.config);
    }
    set({
      config: null,
      isConfigured: false,
    });
  },
  
  // 获取解密后的 API Key
  getDecryptedApiKey: () => {
    const { config } = get();
    if (!config?.apiKey) return '';
    return decrypt(config.apiKey);
  },
  
  // 测试连接
  testConnection: async () => {
    const { config } = get();
    if (!config) return false;
    
    try {
      const apiKey = get().getDecryptedApiKey();
      const provider = AI_PROVIDERS[config.provider];
      const baseURL = config.baseURL || provider.baseURL;
      
      // 发送简单的测试请求
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          apiKey,
          baseURL,
          model: config.model,
        }),
      });
      
      return response.ok;
    } catch {
      return false;
    }
  },
  
  // 从 LocalStorage 加载配置
  loadConfig: () => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(STORAGE_KEYS.config);
    if (stored) {
      try {
        const config = JSON.parse(stored) as UserConfig;
        set({
          config,
          isConfigured: !!config.apiKey,
        });
      } catch {
        console.error('加载配置失败');
      }
    }
  },
}));
