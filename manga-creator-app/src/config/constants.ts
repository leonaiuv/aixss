/**
 * 应用配置常量
 */

// 视觉风格预设选项
export const STYLE_PRESETS = [
  { value: 'cyberpunk', label: '赛博朋克' },
  { value: 'fantasy', label: '奇幻魔法' },
  { value: 'scifi', label: '科幻未来' },
  { value: 'realistic', label: '写实风格' },
  { value: 'anime', label: '日系动漫' },
  { value: 'watercolor', label: '水彩插画' },
  { value: 'comic', label: '美式漫画' },
  { value: 'noir', label: '黑色电影' },
  { value: 'steampunk', label: '蒸汽朋克' },
  { value: 'custom', label: '自定义风格' },
] as const;

// 边界值限制
export const LIMITS = {
  projectTitle: { min: 1, max: 50 },
  summary: { min: 10, max: 5000 },
  sceneCount: { min: 1, max: 20 },
  sceneDescription: { max: 2000 },
  maxProjects: 50,
} as const;

// AI 超时设置
export const AI_CONFIG = {
  timeout: 30000, // 30秒
  maxRetries: 3,
  debounceDelay: 300, // 防抖延迟
} as const;

// LocalStorage 键名
export const STORAGE_KEYS = {
  version: 'aixs_version',
  projects: 'aixs_projects',
  scenes: 'aixs_scenes_',
  config: 'aixs_config',
  backup: 'aixs_backup',
} as const;

// 当前数据版本
export const CURRENT_VERSION = '1.0.0';

// AI 供应商配置
export const AI_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    defaultModel: 'moonshot-v1-8k',
    baseURL: 'https://api.moonshot.cn/v1',
  },
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-pro',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  },
  'openai-compatible': {
    name: 'OpenAI 兼容',
    defaultModel: 'gpt-4o-mini',
    baseURL: '',
  },
} as const;
