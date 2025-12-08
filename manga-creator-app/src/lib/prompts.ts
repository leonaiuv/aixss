/**
 * AI 提示词模板
 * 基于 PRD 中定义的 Skill 规范
 */

// ==========================================
// 提示词模板类型
// ==========================================
export interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  maxTokens: number;
}

// ==========================================
// 系统提示词 - 角色设定
// ==========================================
export const SYSTEM_PROMPTS = {
  storyboarder: `你是一位专业的电影分镜师和AIGC提示词专家。你精通：
1. 电影叙事结构与分镜脚本创作
2. 视觉构图与镜头语言
3. 高质量AIGC提示词编写（适用于Midjourney/Stable Diffusion）

请根据用户的故事和设定，提供专业、创意且详细的分镜创作建议。
输出时注意：简洁、专业、可直接使用。`,
} as const;

// ==========================================
// 生成分镜列表
// ==========================================
export const SCENE_LIST_PROMPT: PromptTemplate = {
  name: 'generate_scene_list',
  description: '根据故事梗概生成分镜列表',
  systemPrompt: SYSTEM_PROMPTS.storyboarder,
  userPromptTemplate: `请根据以下故事梗概，将其拆解为{{sceneCount}}个关键分镜。

## 故事梗概
{{summary}}

## 视觉风格
{{style}}

## 主角设定
{{protagonist}}

请为每个分镜提供一个简短的概要描述（10-20字），格式如下：
1. [分镜概要]
2. [分镜概要]
...

注意：
- 分镜应涵盖故事的起承转合
- 每个分镜是一个独立的画面或短序列
- 概要需简洁有力，突出核心画面

请直接输出分镜列表，不需要额外解释。`,
  maxTokens: 1000,
};

// ==========================================
// 生成场景描述
// ==========================================
export const SCENE_DESCRIPTION_PROMPT: PromptTemplate = {
  name: 'generate_scene_desc',
  description: '为单个分镜生成详细的场景描述',
  systemPrompt: SYSTEM_PROMPTS.storyboarder,
  userPromptTemplate: `请为以下分镜生成详细的场景描述。

## 项目信息
- 视觉风格：{{style}}
- 主角特征：{{protagonist}}
- 故事背景：{{storyCore}}

## 当前分镜
分镜概要：{{sceneSummary}}
{{#if prevSceneSummary}}
前一分镜：{{prevSceneSummary}}
{{/if}}

## 输出要求
请描述：
1. 场景的空间环境（室内/室外、地点特征）
2. 光线和氛围
3. 关键道具或背景元素
4. 镜头构图建议

直接输出场景描述，200字以内。`,
  maxTokens: 500,
};

// ==========================================
// 生成动作描述
// ==========================================
export const ACTION_DESCRIPTION_PROMPT: PromptTemplate = {
  name: 'generate_action_desc',
  description: '为场景生成角色动作描述',
  systemPrompt: SYSTEM_PROMPTS.storyboarder,
  userPromptTemplate: `请为以下场景生成角色动作描述。

## 主角设定
{{protagonist}}

## 当前分镜
分镜概要：{{sceneSummary}}

## 已确认的场景描述
{{sceneDescription}}

## 输出要求
请描述角色在这个场景中的：
1. 主要动作和姿态
2. 表情和情绪
3. 与环境的互动

直接输出动作描述，150字以内。`,
  maxTokens: 400,
};

// ==========================================
// 生成镜头提示词
// ==========================================
export const SHOT_PROMPT_PROMPT: PromptTemplate = {
  name: 'generate_shot_prompt',
  description: '生成AIGC图像提示词',
  systemPrompt: SYSTEM_PROMPTS.storyboarder,
  userPromptTemplate: `请根据以下场景和动作描述，生成一段高质量的图像生成提示词。

## 视觉风格
{{style}}

## 场景描述
{{sceneDescription}}

## 动作描述
{{actionDescription}}

## 输出要求
1. 提示词需包含：构图、镜头类型、灯光、色彩基调、画质关键词
2. 格式紧凑，适用于Stable Diffusion或Midjourney
3. 使用英文输出
4. 末尾添加常用参数如 --ar 16:9

直接输出提示词，不要额外解释。`,
  maxTokens: 500,
};

// ==========================================
// 模板变量替换函数
// ==========================================
export function fillTemplate(template: string, variables: Record<string, string | undefined>): string {
  let result = template;
  
  // 处理条件块 {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (_, varName, content) => {
    return variables[varName] ? content : '';
  });
  
  // 替换普通变量 {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result.trim();
}

// ==========================================
// 解析分镜列表响应
// ==========================================
export function parseSceneListResponse(response: string): string[] {
  const lines = response.split('\n').filter(line => line.trim());
  const scenes: string[] = [];
  
  for (const line of lines) {
    // 匹配格式: 1. xxx 或 1、xxx 或 1: xxx
    const match = line.match(/^\d+[.、:：]\s*(.+)$/);
    if (match) {
      // 移除方括号
      const summary = match[1].replace(/^\[|\]$/g, '').trim();
      if (summary) {
        scenes.push(summary);
      }
    }
  }
  
  return scenes;
}

// ==========================================
// 导出所有模板
// ==========================================
export const PROMPT_TEMPLATES = {
  sceneList: SCENE_LIST_PROMPT,
  sceneDescription: SCENE_DESCRIPTION_PROMPT,
  actionDescription: ACTION_DESCRIPTION_PROMPT,
  shotPrompt: SHOT_PROMPT_PROMPT,
} as const;
