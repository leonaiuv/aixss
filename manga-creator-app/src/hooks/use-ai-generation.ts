"use client";

/**
 * AI 生成 Hook
 * 封装 AI 调用逻辑，支持流式响应和状态管理
 */

import { useState, useCallback, useRef } from 'react';
import { useConfigStore } from '@/store/config-store';
import { useProjectStore } from '@/store/project-store';
import { aiGateway, type AIRequestConfig } from '@/lib/ai-gateway';
import {
  fillTemplate,
  parseSceneListResponse,
  PROMPT_TEMPLATES,
  SYSTEM_PROMPTS,
} from '@/lib/prompts';
import { AI_PROVIDERS } from '@/config/constants';
import type { Scene, TaskType, GenerationResult, SceneStatus } from '@/types';

// ==========================================
// Hook 状态类型
// ==========================================
interface UseAIGenerationState {
  isGenerating: boolean;
  streamingContent: string;
  error: string | null;
}

// ==========================================
// Hook 返回类型
// ==========================================
interface UseAIGenerationReturn extends UseAIGenerationState {
  // 生成分镜列表
  generateSceneList: (sceneCount?: number) => Promise<string[]>;
  // 生成场景描述
  generateSceneDescription: (sceneId: string) => Promise<string>;
  // 生成动作描述
  generateActionDescription: (sceneId: string) => Promise<string>;
  // 生成镜头提示词
  generateShotPrompt: (sceneId: string) => Promise<string>;
  // 通用重新生成
  regenerate: (taskType: TaskType, sceneId?: string) => Promise<string>;
  // 取消生成
  cancelGeneration: () => void;
  // 清除错误
  clearError: () => void;
}

// ==========================================
// useAIGeneration Hook
// ==========================================
export function useAIGeneration(): UseAIGenerationReturn {
  const [state, setState] = useState<UseAIGenerationState>({
    isGenerating: false,
    streamingContent: '',
    error: null,
  });

  const abortRef = useRef(false);

  // Stores
  const { config, getDecryptedApiKey } = useConfigStore();
  const { getCurrentProject, getScenesByProjectId, updateScene, setScenes, addScene } =
    useProjectStore();

  /**
   * 构建 AI 请求配置
   */
  const buildRequestConfig = useCallback(
    (messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, stream = false): AIRequestConfig | null => {
      if (!config) {
        setState((s) => ({ ...s, error: '请先配置 API Key' }));
        return null;
      }

      const apiKey = getDecryptedApiKey();
      const provider = AI_PROVIDERS[config.provider];

      return {
        provider: config.provider,
        apiKey,
        baseURL: config.baseURL || provider.baseURL,
        model: config.model,
        messages,
        stream,
      };
    },
    [config, getDecryptedApiKey]
  );

  /**
   * 执行 AI 生成（非流式）
   */
  const executeGeneration = useCallback(
    async (
      systemPrompt: string,
      userPrompt: string,
    ): Promise<GenerationResult> => {
      const requestConfig = buildRequestConfig([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      if (!requestConfig) {
        return { success: false, error: '配置无效' };
      }

      setState((s) => ({ ...s, isGenerating: true, error: null, streamingContent: '' }));
      abortRef.current = false;

      try {
        const result = await aiGateway.generateChatCompletion(requestConfig);
        if (!result.success) {
          setState((s) => ({ ...s, error: result.error || '生成失败' }));
        }
        return result;
      } finally {
        setState((s) => ({ ...s, isGenerating: false }));
      }
    },
    [buildRequestConfig]
  );

  /**
   * 执行 AI 生成（流式）
   */
  const executeStreamGeneration = useCallback(
    async (
      systemPrompt: string,
      userPrompt: string,
      onChunk?: (chunk: string) => void
    ): Promise<GenerationResult> => {
      const requestConfig = buildRequestConfig(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        true
      );

      if (!requestConfig) {
        return { success: false, error: '配置无效' };
      }

      setState((s) => ({ ...s, isGenerating: true, error: null, streamingContent: '' }));
      abortRef.current = false;

      try {
        let fullContent = '';
        const generator = aiGateway.streamChatCompletion(requestConfig);

        for await (const chunk of generator) {
          if (abortRef.current) {
            aiGateway.abort();
            return { success: false, error: '已取消' };
          }

          if (typeof chunk === 'string') {
            fullContent += chunk;
            setState((s) => ({ ...s, streamingContent: fullContent }));
            onChunk?.(chunk);
          }
        }

        return { success: true, content: fullContent };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '生成失败';
        setState((s) => ({ ...s, error: errorMessage }));
        return { success: false, error: errorMessage };
      } finally {
        setState((s) => ({ ...s, isGenerating: false }));
      }
    },
    [buildRequestConfig]
  );

  /**
   * 生成分镜列表
   */
  const generateSceneList = useCallback(
    async (sceneCount = 5): Promise<string[]> => {
      const project = getCurrentProject();
      if (!project) {
        setState((s) => ({ ...s, error: '请先选择项目' }));
        return [];
      }

      const template = PROMPT_TEMPLATES.sceneList;
      const userPrompt = fillTemplate(template.userPromptTemplate, {
        summary: project.summary,
        style: project.style,
        protagonist: project.protagonist,
        sceneCount: sceneCount.toString(),
      });

      const result = await executeGeneration(template.systemPrompt, userPrompt);

      if (result.success && result.content) {
        const scenes = parseSceneListResponse(result.content);

        // 创建分镜对象
        const newScenes: Omit<Scene, 'id'>[] = scenes.map((summary, index) => ({
          projectId: project.id,
          order: index + 1,
          summary,
          sceneDescription: '',
          actionDescription: '',
          shotPrompt: '',
          contextSummary: { mood: '', keyElement: '', transition: '' },
          status: 'pending' as SceneStatus,
          notes: '',
        }));

        // 保存到 store
        const existingScenes = getScenesByProjectId(project.id);
        if (existingScenes.length > 0) {
          // 清除旧分镜
          setScenes([]);
        }
        for (const scene of newScenes) {
          addScene(scene);
        }

        return scenes;
      }

      return [];
    },
    [getCurrentProject, getScenesByProjectId, setScenes, addScene, executeGeneration]
  );

  /**
   * 生成场景描述
   */
  const generateSceneDescription = useCallback(
    async (sceneId: string): Promise<string> => {
      const project = getCurrentProject();
      if (!project) {
        setState((s) => ({ ...s, error: '请先选择项目' }));
        return '';
      }

      const scenes = getScenesByProjectId(project.id);
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) {
        setState((s) => ({ ...s, error: '分镜不存在' }));
        return '';
      }

      // 获取前一分镜
      const prevScene = scenes.find((s) => s.order === scene.order - 1);

      const template = PROMPT_TEMPLATES.sceneDescription;
      const userPrompt = fillTemplate(template.userPromptTemplate, {
        style: project.style,
        protagonist: project.contextCache?.protagonistCore || project.protagonist,
        storyCore: project.contextCache?.storyCore || project.summary,
        sceneSummary: scene.summary,
        prevSceneSummary: prevScene?.contextSummary?.transition || prevScene?.summary || '',
      });

      // 更新状态为生成中
      updateScene(sceneId, { status: 'scene_generating' });

      const result = await executeStreamGeneration(template.systemPrompt, userPrompt);

      if (result.success && result.content) {
        updateScene(sceneId, {
          sceneDescription: result.content,
          status: 'scene_confirmed',
        });
        return result.content;
      } else {
        updateScene(sceneId, { status: 'pending' });
      }

      return '';
    },
    [getCurrentProject, getScenesByProjectId, updateScene, executeStreamGeneration]
  );

  /**
   * 生成动作描述
   */
  const generateActionDescription = useCallback(
    async (sceneId: string): Promise<string> => {
      const project = getCurrentProject();
      if (!project) {
        setState((s) => ({ ...s, error: '请先选择项目' }));
        return '';
      }

      const scenes = getScenesByProjectId(project.id);
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) {
        setState((s) => ({ ...s, error: '分镜不存在' }));
        return '';
      }

      if (!scene.sceneDescription) {
        setState((s) => ({ ...s, error: '请先生成场景描述' }));
        return '';
      }

      const template = PROMPT_TEMPLATES.actionDescription;
      const userPrompt = fillTemplate(template.userPromptTemplate, {
        protagonist: project.contextCache?.protagonistCore || project.protagonist,
        sceneSummary: scene.summary,
        sceneDescription: scene.sceneDescription,
      });

      // 更新状态为生成中
      updateScene(sceneId, { status: 'action_generating' });

      const result = await executeStreamGeneration(template.systemPrompt, userPrompt);

      if (result.success && result.content) {
        updateScene(sceneId, {
          actionDescription: result.content,
          status: 'action_confirmed',
        });
        return result.content;
      } else {
        updateScene(sceneId, { status: 'scene_confirmed' });
      }

      return '';
    },
    [getCurrentProject, getScenesByProjectId, updateScene, executeStreamGeneration]
  );

  /**
   * 生成镜头提示词
   */
  const generateShotPrompt = useCallback(
    async (sceneId: string): Promise<string> => {
      const project = getCurrentProject();
      if (!project) {
        setState((s) => ({ ...s, error: '请先选择项目' }));
        return '';
      }

      const scenes = getScenesByProjectId(project.id);
      const scene = scenes.find((s) => s.id === sceneId);
      if (!scene) {
        setState((s) => ({ ...s, error: '分镜不存在' }));
        return '';
      }

      if (!scene.sceneDescription || !scene.actionDescription) {
        setState((s) => ({ ...s, error: '请先完成场景和动作描述' }));
        return '';
      }

      const template = PROMPT_TEMPLATES.shotPrompt;
      const userPrompt = fillTemplate(template.userPromptTemplate, {
        style: project.style,
        sceneDescription: scene.sceneDescription,
        actionDescription: scene.actionDescription,
      });

      // 更新状态为生成中
      updateScene(sceneId, { status: 'prompt_generating' });

      const result = await executeStreamGeneration(template.systemPrompt, userPrompt);

      if (result.success && result.content) {
        updateScene(sceneId, {
          shotPrompt: result.content,
          status: 'completed',
        });
        return result.content;
      } else {
        updateScene(sceneId, { status: 'action_confirmed' });
      }

      return '';
    },
    [getCurrentProject, getScenesByProjectId, updateScene, executeStreamGeneration]
  );

  /**
   * 通用重新生成
   */
  const regenerate = useCallback(
    async (taskType: TaskType, sceneId?: string): Promise<string> => {
      switch (taskType) {
        case 'generate_scene_list':
          const scenes = await generateSceneList();
          return scenes.join('\n');
        case 'generate_scene_desc':
          return sceneId ? generateSceneDescription(sceneId) : '';
        case 'generate_action_desc':
          return sceneId ? generateActionDescription(sceneId) : '';
        case 'generate_shot_prompt':
          return sceneId ? generateShotPrompt(sceneId) : '';
        default:
          return '';
      }
    },
    [generateSceneList, generateSceneDescription, generateActionDescription, generateShotPrompt]
  );

  /**
   * 取消生成
   */
  const cancelGeneration = useCallback(() => {
    abortRef.current = true;
    aiGateway.abort();
    setState((s) => ({ ...s, isGenerating: false }));
  }, []);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    generateSceneList,
    generateSceneDescription,
    generateActionDescription,
    generateShotPrompt,
    regenerate,
    cancelGeneration,
    clearError,
  };
}
