import { streamText, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAgentTools } from "@/lib/agent/tools";
import { getCheckpointStore, findCheckpointByThreadId } from "@/lib/checkpoint/store";
import type { ProjectCheckpoint } from "@/lib/checkpoint/store";

export const maxDuration = 30;

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com",
});

const BASE_PROMPT = `你是漫剧创作助手，帮助用户创作漫画分镜和提示词。

你的能力包括：
1. 帮助用户创建新的漫剧项目
2. 收集故事基础信息（标题、梗概、画风、主角）
3. 根据故事梗概生成分镜列表
4. 细化每个分镜，生成详细的场景描述和关键帧提示词
5. 导出最终的提示词用于AI绘图

可用工具：
- create_project: 创建新项目
- get_project_state: 获取项目状态
- set_project_info: 设置项目信息
- generate_scenes: 生成分镜
- refine_scene: 细化单个分镜
- batch_refine_scenes: 批量细化分镜
- export_prompts: 导出提示词

在与用户对话时：
- 使用亲切、专业的语气
- 主动引导用户完成创作流程
- 对用户的创意给予积极反馈
- 生成的提示词要具体、详细、适合绘图AI使用

当需要执行操作时，请使用相应的工具。工具调用结果会自动同步到画布显示。`;

function normalizeMessages(raw: any[]): CoreMessage[] {
  return raw?.map((m) => ({
    role: m.role ?? "user",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  })) as CoreMessage[];
}

async function loadCheckpointFromThread(
  threadId?: string,
  projectId?: string
): Promise<ProjectCheckpoint | null> {
  const store = await getCheckpointStore();
  if (projectId) {
    const found = await store.load(projectId);
    if (found) return found;
  }
  if (threadId) {
    return findCheckpointByThreadId(store, threadId);
  }
  return null;
}

function buildSystemPrompt(checkpoint?: ProjectCheckpoint | null): string {
  if (!checkpoint) return BASE_PROMPT;

  const sceneCount = checkpoint.scenes.length;
  return `${BASE_PROMPT}

当前项目上下文：
- Project ID: ${checkpoint.projectId}
- Thread ID: ${checkpoint.threadId}
- 标题: ${checkpoint.title || "未设置"}
- 梗概: ${checkpoint.summary || "未设置"}
- 画风: ${checkpoint.artStyle || "未设置"}
- 主角: ${checkpoint.protagonist || "未设置"}
- 工作流状态: ${checkpoint.workflowState}
- 分镜数量: ${sceneCount}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const messages = normalizeMessages(body.messages || []);
  const threadId = typeof body.threadId === "string" ? body.threadId : undefined;
  const projectId = typeof body.projectId === "string" ? body.projectId : undefined;

  const checkpoint = await loadCheckpointFromThread(threadId, projectId);

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: buildSystemPrompt(checkpoint),
    messages,
    tools: createAgentTools({
      threadId: threadId ?? checkpoint?.threadId,
      projectId: projectId ?? checkpoint?.projectId,
    }),
  });

  return result.toUIMessageStreamResponse();
}
