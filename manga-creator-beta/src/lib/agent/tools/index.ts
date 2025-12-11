import { tool } from "ai";
import {
  generateScenesInputSchema,
  refineSceneInputSchema,
  batchRefineInputSchema,
  setProjectInfoInputSchema,
  exportPromptsInputSchema,
  createProjectInputSchema,
  getProjectStateInputSchema,
  type GenerateScenesInput,
  type RefineSceneInput,
  type BatchRefineInput,
  type SetProjectInfoInput,
  type ExportPromptsInput,
} from "./schemas";
import {
  generateScenesWithAI,
  refineSceneWithAI,
  batchRefineWithAI,
  formatExportData,
  type ExportData,
} from "../services/ai-service";
import {
  getCheckpointStore,
  createEmptyCheckpoint,
  findCheckpointByThreadId,
  type ProjectCheckpoint,
} from "@/lib/checkpoint/store";

export interface AgentToolContext {
  threadId?: string;
  projectId?: string;
}

async function saveCheckpoint(checkpoint: ProjectCheckpoint): Promise<void> {
  const store = await getCheckpointStore();
  await store.save(checkpoint);
}

export function createAgentTools(context: AgentToolContext = {}) {
  let currentProjectId: string | null = context.projectId ?? null;
  let currentThreadId: string | null = context.threadId ?? null;

  const loadCheckpoint = async (): Promise<ProjectCheckpoint | null> => {
    const store = await getCheckpointStore();
    if (currentProjectId) {
      const cp = await store.load(currentProjectId);
      if (cp) return cp;
    }
    if (currentThreadId) {
      const cp = await findCheckpointByThreadId(store, currentThreadId);
      if (cp) return cp;
    }
    return null;
  };

  async function requireProject(): Promise<ProjectCheckpoint> {
    const checkpoint = await loadCheckpoint();
    if (!checkpoint) throw new Error("请先创建项目");
    return checkpoint;
  }

  const createProjectTool = tool({
    description: "创建新的漫剧项目",
    inputSchema: createProjectInputSchema,
    execute: async ({ title }: { title: string }) => {
      const store = await getCheckpointStore();

      // 尝试复用当前线程或项目，避免重复创建
      const existing =
        (currentProjectId ? await store.load(currentProjectId) : null) ||
        (currentThreadId ? await findCheckpointByThreadId(store, currentThreadId) : null);

      if (existing) {
        currentProjectId = existing.projectId;
        currentThreadId = existing.threadId;
        return {
          success: true,
          data: {
            projectId: existing.projectId,
            threadId: existing.threadId,
            title: existing.title || title,
            createdAt: existing.createdAt,
            reused: true,
          },
          message: `已找到现有项目「${existing.title || title}」，继续创作吧。`,
        };
      }

      const projectId = currentProjectId ?? `project-${Date.now()}`;
      const threadId = currentThreadId ?? `thread-${Date.now()}`;

      const checkpoint = createEmptyCheckpoint(projectId, threadId);
      checkpoint.title = title;
      checkpoint.workflowState = "COLLECTING_BASIC_INFO";
      await store.save(checkpoint);

      currentProjectId = projectId;
      currentThreadId = threadId;

      return {
        success: true,
        data: {
          projectId,
          threadId,
          title,
          createdAt: new Date().toISOString(),
        },
        message: `项目「${title}」创建成功！请告诉我故事的简介、画风和主角信息。`,
      };
    },
  });

  const getProjectStateTool = tool({
    description: "获取当前项目的状态信息",
    inputSchema: getProjectStateInputSchema,
    execute: async ({ projectId }: { projectId?: string }) => {
      const store = await getCheckpointStore();

      const checkpoint =
        (projectId ? await store.load(projectId) : null) ?? (await loadCheckpoint());

      if (!checkpoint) {
        return { success: false, error: "未找到对应的项目" };
      }

      currentProjectId = checkpoint.projectId;
      currentThreadId = checkpoint.threadId;

      return {
        success: true,
        data: {
          projectId: checkpoint.projectId,
          threadId: checkpoint.threadId,
          workflowState: checkpoint.workflowState,
          title: checkpoint.title,
          summary: checkpoint.summary,
          artStyle: checkpoint.artStyle,
          protagonist: checkpoint.protagonist,
          scenesCount: checkpoint.scenes.length,
          scenes: checkpoint.scenes,
        },
        message: "获取项目状态成功",
      };
    },
  });

  const setProjectInfoTool = tool({
    description: "设置或更新项目的基础信息（标题、简介、画风、主角）",
    inputSchema: setProjectInfoInputSchema,
    execute: async (input: SetProjectInfoInput) => {
      const checkpoint = await requireProject();
      currentProjectId = checkpoint.projectId;
      currentThreadId = checkpoint.threadId;

      if (input.title) checkpoint.title = input.title;
      if (input.summary) checkpoint.summary = input.summary;
      if (input.artStyle) checkpoint.artStyle = input.artStyle;
      if (input.protagonist) checkpoint.protagonist = input.protagonist;

      if (checkpoint.title && checkpoint.summary && checkpoint.artStyle && checkpoint.protagonist) {
        checkpoint.workflowState = "BASIC_INFO_COMPLETE";
      }

      await saveCheckpoint(checkpoint);

      const updatedFields = Object.entries(input)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k);

      return {
        success: true,
        data: { ...input, projectId: checkpoint.projectId, threadId: checkpoint.threadId },
        message: `已更新项目信息：${updatedFields.join("、")}`,
      };
    },
  });

  const generateScenesTool = tool({
    description: "根据故事梗概生成分镜列表",
    inputSchema: generateScenesInputSchema,
    execute: async ({ count }: GenerateScenesInput) => {
      const checkpoint = await requireProject();
      currentProjectId = checkpoint.projectId;
      currentThreadId = checkpoint.threadId;

      if (!checkpoint.title || !checkpoint.summary || !checkpoint.artStyle) {
        return { success: false, error: "请先完成基础信息收集（标题、简介、画风）" };
      }

      checkpoint.workflowState = "GENERATING_SCENES";
      await saveCheckpoint(checkpoint);

      const result = await generateScenesWithAI({
        title: checkpoint.title,
        summary: checkpoint.summary,
        artStyle: checkpoint.artStyle,
        protagonist: checkpoint.protagonist,
        count,
      });

      if (!result.success || !result.data) {
        return { success: false, error: result.error ?? "AI 生成分镜失败" };
      }

      checkpoint.scenes = result.data.scenes.map((scene) => ({
        ...scene,
        status: "pending" as const,
      }));
      checkpoint.workflowState = "SCENE_LIST_EDITING";
      await saveCheckpoint(checkpoint);

      return {
        success: true,
        data: { scenes: checkpoint.scenes, projectId: checkpoint.projectId, threadId: checkpoint.threadId },
        message: `已生成 ${checkpoint.scenes.length} 个分镜，请确认后开始细化`,
      };
    },
  });

  const refineSceneTool = tool({
    description: "细化单个分镜，生成详细的场景描述和关键帧提示词",
    inputSchema: refineSceneInputSchema,
    execute: async ({ sceneId }: RefineSceneInput) => {
      const checkpoint = await requireProject();
      currentProjectId = checkpoint.projectId;
      currentThreadId = checkpoint.threadId;

      const sceneIndex = checkpoint.scenes.findIndex((s) => s.id === sceneId);
      if (sceneIndex === -1) {
        return { success: false, error: `分镜 ${sceneId} 不存在` };
      }

      const scene = checkpoint.scenes[sceneIndex];
      checkpoint.scenes[sceneIndex].status = "in_progress";
      checkpoint.workflowState = "REFINING_SCENES";
      await saveCheckpoint(checkpoint);

      const result = await refineSceneWithAI({
        sceneId,
        sceneSummary: scene.summary,
        artStyle: checkpoint.artStyle,
        protagonist: checkpoint.protagonist,
        projectTitle: checkpoint.title,
      });

      if (!result.success || !result.data) {
        checkpoint.scenes[sceneIndex].status = "error";
        checkpoint.scenes[sceneIndex].error = result.error;
        await saveCheckpoint(checkpoint);
        return { success: false, error: result.error ?? "AI 细化分镜失败" };
      }

      checkpoint.scenes[sceneIndex] = {
        ...scene,
        sceneDescription: result.data.sceneDescription,
        keyframePrompt: result.data.keyframePrompt,
        spatialPrompt: result.data.spatialPrompt,
        status: "completed",
      };

      const allCompleted = checkpoint.scenes.every((s) => s.status === "completed");
      if (allCompleted) checkpoint.workflowState = "ALL_SCENES_COMPLETE";

      await saveCheckpoint(checkpoint);

      return {
        success: true,
        data: {
          projectId: checkpoint.projectId,
          threadId: checkpoint.threadId,
          sceneId,
          sceneDescription: result.data.sceneDescription,
          keyframePrompt: result.data.keyframePrompt,
          spatialPrompt: result.data.spatialPrompt,
          fullPrompt: result.data.fullPrompt,
          status: "completed",
        },
        message: `分镜 ${scene.order} 细化完成`,
      };
    },
  });

  const batchRefineScenesTool = tool({
    description: "批量细化多个分镜",
    inputSchema: batchRefineInputSchema,
    execute: async ({ sceneIds }: BatchRefineInput) => {
      const checkpoint = await requireProject();
      currentProjectId = checkpoint.projectId;
      currentThreadId = checkpoint.threadId;

      const scenesToRefine = checkpoint.scenes.filter((s) => sceneIds.includes(s.id));
      if (scenesToRefine.length === 0) {
        return { success: false, error: "未找到指定的分镜" };
      }

      checkpoint.workflowState = "REFINING_SCENES";
      for (const id of sceneIds) {
        const idx = checkpoint.scenes.findIndex((s) => s.id === id);
        if (idx !== -1) checkpoint.scenes[idx].status = "in_progress";
      }
      await saveCheckpoint(checkpoint);

      const result = await batchRefineWithAI(
        scenesToRefine.map((s) => ({ sceneId: s.id, sceneSummary: s.summary })),
        {
          artStyle: checkpoint.artStyle,
          protagonist: checkpoint.protagonist,
          projectTitle: checkpoint.title,
        }
      );

      if (!result.success || !result.data) {
        return { success: false, error: result.error ?? "AI 批量细化失败" };
      }

      for (const refined of result.data.results) {
        const idx = checkpoint.scenes.findIndex((s) => s.id === refined.sceneId);
        if (idx !== -1) {
          checkpoint.scenes[idx] = {
            ...checkpoint.scenes[idx],
            sceneDescription: refined.sceneDescription,
            keyframePrompt: refined.keyframePrompt,
            spatialPrompt: refined.spatialPrompt,
            status: "completed",
          };
        }
      }

      const allCompleted = checkpoint.scenes.every((s) => s.status === "completed");
      if (allCompleted) checkpoint.workflowState = "ALL_SCENES_COMPLETE";

      await saveCheckpoint(checkpoint);

      return {
        success: true,
        data: { results: result.data.results, projectId: checkpoint.projectId, threadId: checkpoint.threadId },
        message: `已批量细化 ${result.data.results.length} 个分镜`,
      };
    },
  });

  const exportPromptsTool = tool({
    description: "导出所有分镜的提示词",
    inputSchema: exportPromptsInputSchema,
    execute: async ({ format, includeMetadata }: ExportPromptsInput) => {
      const checkpoint = await requireProject();
      currentProjectId = checkpoint.projectId;
      currentThreadId = checkpoint.threadId;

      const completedScenes = checkpoint.scenes.filter((s) => s.status === "completed");
      if (completedScenes.length === 0) {
        return { success: false, error: "没有已完成的分镜可导出" };
      }

      checkpoint.workflowState = "EXPORTING";
      await saveCheckpoint(checkpoint);

      const exportData: ExportData = {
        projectTitle: checkpoint.title,
        artStyle: checkpoint.artStyle,
        scenes: checkpoint.scenes.map((s) => ({
          order: s.order,
          summary: s.summary,
          sceneDescription: s.sceneDescription,
          keyframePrompt: s.keyframePrompt,
          spatialPrompt: s.spatialPrompt,
          fullPrompt: s.keyframePrompt ? `${checkpoint.artStyle}, ${s.keyframePrompt}` : undefined,
        })),
        exportedAt: new Date().toISOString(),
      };

      const content = formatExportData(exportData, format);
      checkpoint.workflowState = "EXPORTED";
      await saveCheckpoint(checkpoint);

      return {
        success: true,
        data: {
          projectId: checkpoint.projectId,
          threadId: checkpoint.threadId,
          format,
          includeMetadata,
          content,
          scenesCount: completedScenes.length,
          downloadUrl: null,
        },
        message: `提示词已导出为 ${format} 格式，共 ${completedScenes.length} 个分镜`,
      };
    },
  });

  return {
    create_project: createProjectTool,
    get_project_state: getProjectStateTool,
    set_project_info: setProjectInfoTool,
    generate_scenes: generateScenesTool,
    refine_scene: refineSceneTool,
    batch_refine_scenes: batchRefineScenesTool,
    export_prompts: exportPromptsTool,
  };
}

export const agentTools = createAgentTools();

export type AgentToolName = keyof ReturnType<typeof createAgentTools>;
