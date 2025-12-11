import type { ProjectCheckpoint, Scene } from "@/lib/checkpoint/store";
import { getCheckpointStore } from "@/lib/checkpoint/store";
import { useProjectStore } from "@/stores/projectStore";
import { useCanvasStore, type CanvasBlock } from "@/stores/canvasStore";
import type { ProjectState } from "@/types";

export interface SyncResult {
  success: boolean;
  projectId?: string;
  error?: string;
}

export function checkpointToProjectState(checkpoint: ProjectCheckpoint): ProjectState {
  return {
    projectId: checkpoint.projectId,
    workflowState: checkpoint.workflowState,
    title: checkpoint.title,
    summary: checkpoint.summary,
    artStyle: checkpoint.artStyle,
    protagonist: checkpoint.protagonist,
    scenes: checkpoint.scenes.map((scene) => ({
      id: scene.id,
      order: scene.order,
      summary: scene.summary,
      status: scene.status,
      sceneDescription: scene.sceneDescription,
      keyframePrompt: scene.keyframePrompt,
      spatialPrompt: scene.spatialPrompt,
      dialogues: [],
    })),
    currentSceneIndex: 0,
    canvasContent: [],
    characters: [],
    createdAt: new Date(checkpoint.createdAt),
    updatedAt: new Date(checkpoint.updatedAt),
  };
}

export function scenesToCanvasBlocks(scenes: Scene[], artStyle: string): CanvasBlock[] {
  return scenes.map((scene) => ({
    id: scene.id,
    type: "scene",
    content: {
      sceneId: scene.id,
      order: scene.order,
      summary: scene.summary,
      status: scene.status,
      sceneDescription: scene.sceneDescription,
      keyframePrompt: scene.keyframePrompt,
      spatialPrompt: scene.spatialPrompt,
      fullPrompt: scene.keyframePrompt && artStyle ? `${artStyle}, ${scene.keyframePrompt}` : scene.keyframePrompt || "",
    },
  }));
}

export function projectInfoToCanvasBlock(checkpoint: ProjectCheckpoint): CanvasBlock {
  return {
    id: `basicInfo-${checkpoint.projectId}`,
    type: "basicInfo",
    content: {
      title: checkpoint.title,
      summary: checkpoint.summary,
      artStyle: checkpoint.artStyle,
      protagonist: checkpoint.protagonist,
    },
  };
}

export async function syncCheckpointToStores(
  projectId: string,
  checkpointOverride?: ProjectCheckpoint
): Promise<SyncResult> {
  try {
    const checkpoint =
      checkpointOverride ??
      (await (async () => {
        const store = await getCheckpointStore();
        return store.load(projectId);
      })());

    if (!checkpoint) {
      return { success: false, error: `Project ${projectId} not found` };
    }

    const projectState = checkpointToProjectState(checkpoint);
    useProjectStore.getState().syncFromAgent(projectState);

    const basicInfoBlock = projectInfoToCanvasBlock(checkpoint);
    const sceneBlocks = scenesToCanvasBlocks(checkpoint.scenes, checkpoint.artStyle);
    useCanvasStore.getState().setBlocks([basicInfoBlock, ...sceneBlocks]);
    useCanvasStore.getState().markSynced();

    return { success: true, projectId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function loadProjectAndSync(
  projectId: string,
  threadId?: string,
  checkpoint?: ProjectCheckpoint
): Promise<SyncResult> {
  const projectStore = useProjectStore.getState();
  projectStore.setLoading(true);
  projectStore.setError(null);

  try {
    if (threadId) projectStore.setCurrentThread(threadId);
    const result = await syncCheckpointToStores(projectId, checkpoint);
    if (!result.success) {
      projectStore.setError(result.error || "Failed to load project");
    }
    return result;
  } finally {
    projectStore.setLoading(false);
  }
}
