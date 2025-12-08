/**
 * AI Chat API 路由
 * 作为CORS代理，转发请求到AI服务商
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 30;

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  provider: 'deepseek' | 'kimi' | 'gemini' | 'openai-compatible';
  apiKey: string;
  baseURL?: string;
  model: string;
  stream?: boolean;
}

// 供应商URL映射
const PROVIDER_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  'openai-compatible': '',
};

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { messages, provider, apiKey, baseURL, model, stream = false } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      );
    }

    // 确定目标URL
    let targetURL: string;
    if (provider === 'openai-compatible' && baseURL) {
      targetURL = `${baseURL}/chat/completions`;
    } else if (provider === 'gemini') {
      // Gemini使用不同的API格式
      targetURL = `${baseURL || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent?key=${apiKey}`;
    } else {
      targetURL = PROVIDER_URLS[provider] || baseURL || '';
    }

    if (!targetURL) {
      return NextResponse.json(
        { error: 'Invalid provider or missing baseURL' },
        { status: 400 }
      );
    }

    // Gemini使用不同的请求格式
    if (provider === 'gemini') {
      const geminiResponse = await fetch(targetURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        }),
      });

      if (!geminiResponse.ok) {
        const error = await geminiResponse.text();
        return NextResponse.json(
          { error: `Gemini API error: ${error}` },
          { status: geminiResponse.status }
        );
      }

      return geminiResponse;
    }

    // OpenAI兼容格式请求
    const response = await fetch(targetURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `API error: ${error}` },
        { status: response.status }
      );
    }

    // 流式响应
    if (stream && response.body) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // 非流式响应
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
