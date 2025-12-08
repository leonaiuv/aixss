/**
 * AI Gateway - AI 服务统一调用层
 * 基于工厂模式支持多供应商
 */

import type { AIProvider, ChatMessage, GenerationResult } from '@/types';
import { AI_CONFIG } from '@/config/constants';

// ==========================================
// 请求配置类型
// ==========================================
export interface AIRequestConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  maxTokens?: number;
}

// ==========================================
// AI Gateway 类
// ==========================================
export class AIGateway {
  private abortController: AbortController | null = null;

  /**
   * 发送 Chat Completion 请求
   */
  async generateChatCompletion(config: AIRequestConfig): Promise<GenerationResult> {
    const { messages, provider, apiKey, baseURL, model, stream = false } = config;

    try {
      this.abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, AI_CONFIG.timeout);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          provider,
          apiKey,
          baseURL,
          model,
          stream,
        }),
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API 请求失败: ${response.status}`);
      }

      if (stream && response.body) {
        // 流式响应处理
        return await this.handleStreamResponse(response.body);
      }

      // 非流式响应处理
      const data = await response.json();
      return this.parseResponse(data, provider);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: '请求超时，请重试' };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: '未知错误' };
    }
  }

  /**
   * 流式生成 (返回 AsyncGenerator)
   */
  async *streamChatCompletion(config: AIRequestConfig): AsyncGenerator<string, GenerationResult> {
    const { messages, provider, apiKey, baseURL, model } = config;

    try {
      this.abortController = new AbortController();

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          provider,
          apiKey,
          baseURL,
          model,
          stream: true,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `API 请求失败: ${response.status}` };
      }

      if (!response.body) {
        return { success: false, error: '无响应数据' };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                yield content;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return { success: true, content: fullContent };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: '请求被取消' };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: '未知错误' };
    }
  }

  /**
   * 取消当前请求
   */
  abort(): void {
    this.abortController?.abort();
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(body: ReadableStream<Uint8Array>): Promise<GenerationResult> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              fullContent += content;
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return { success: true, content: fullContent };
    } catch (error) {
      return { success: false, error: '流式响应解析失败' };
    }
  }

  /**
   * 解析不同供应商的响应格式
   */
  private parseResponse(data: unknown, provider: AIProvider): GenerationResult {
    try {
      if (provider === 'gemini') {
        // Gemini 响应格式
        const geminiData = data as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { success: true, content };
      }

      // OpenAI 兼容格式
      const openaiData = data as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = openaiData.choices?.[0]?.message?.content || '';
      const tokenUsage = openaiData.usage
        ? {
            prompt: openaiData.usage.prompt_tokens || 0,
            completion: openaiData.usage.completion_tokens || 0,
            total: openaiData.usage.total_tokens || 0,
          }
        : undefined;

      return { success: true, content, tokenUsage };
    } catch {
      return { success: false, error: '响应解析失败' };
    }
  }
}

// 单例导出
export const aiGateway = new AIGateway();
