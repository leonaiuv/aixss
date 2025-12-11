import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export interface DeepSeekConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface DeepSeekClient {
  chat: LanguageModel;
  config: Required<DeepSeekConfig>;
}

export const DEFAULT_CONFIG = {
  model: "deepseek-chat",
  baseURL: "https://api.deepseek.com/v1",
  maxTokens: 4096,
  temperature: 0.7,
} as const;

export function createDeepSeekClient(config: DeepSeekConfig): DeepSeekClient {
  if (!config.apiKey) {
    throw new Error("API Key is required");
  }

  const fullConfig: Required<DeepSeekConfig> = {
    apiKey: config.apiKey,
    model: config.model ?? DEFAULT_CONFIG.model,
    baseURL: config.baseURL ?? DEFAULT_CONFIG.baseURL,
    maxTokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
    temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
  };

  const openai = createOpenAI({
    apiKey: fullConfig.apiKey,
    baseURL: fullConfig.baseURL,
  });

  return {
    chat: openai(fullConfig.model),
    config: fullConfig,
  };
}

export function createDefaultDeepSeekClient(): DeepSeekClient {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set");
  }
  return createDeepSeekClient({ apiKey });
}
