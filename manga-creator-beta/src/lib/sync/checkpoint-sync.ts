import type { ProjectCheckpoint } from "@/lib/checkpoint/store";
import { getCheckpointStore } from "@/lib/checkpoint/store";
import { useProjectStore } from "@/stores/projectStore";
import { useCanvasStore } from "@/stores/canvasStore";
import {
  checkpointToProjectState,
  projectInfoToCanvasBlock,
  scenesToCanvasBlocks,
} from "./checkpoint-helpers";

export interface SyncResult {
  success: boolean;
  projectId?: string;
  error?: string;
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
