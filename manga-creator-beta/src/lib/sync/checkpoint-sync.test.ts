import { describe, it, expect, beforeEach } from "vitest";
import { syncCheckpointToStores, scenesToCanvasBlocks, checkpointToProjectState } from "./checkpoint-sync";
import { useProjectStore } from "@/stores/projectStore";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ProjectCheckpoint } from "@/lib/checkpoint/store";

const checkpoint: ProjectCheckpoint = {
  projectId: "p1",
  threadId: "t1",
  workflowState: "SCENE_LIST_EDITING",
  title: "Title",
  summary: "Summary",
  artStyle: "Art",
  protagonist: "Hero",
  scenes: [
    {
      id: "s1",
      order: 1,
      summary: "S1",
      status: "pending",
      sceneDescription: "desc",
      keyframePrompt: "key",
      spatialPrompt: "spa",
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("checkpoint-sync", () => {
  beforeEach(() => {
    process.env.USE_SQLITE_STORE = "false";
    useProjectStore.setState((state) => ({ ...state, projectState: null, currentThreadId: null }));
    useCanvasStore.setState((state) => ({ ...state, blocks: [], isDirty: false, lastSyncedAt: null }));
  });

  it("converts checkpoint to project state", () => {
    const state = checkpointToProjectState(checkpoint);
    expect(state.title).toBe("Title");
    expect(state.scenes[0].sceneDescription).toBe("desc");
  });

  it("converts scenes to canvas blocks with fullPrompt", () => {
    const blocks = scenesToCanvasBlocks(checkpoint.scenes, "Art");
    expect(blocks[0].content.fullPrompt).toContain("Art");
    expect(blocks[0].type).toBe("scene");
  });

  it("syncs checkpoint to zustand stores", async () => {
    const res = await syncCheckpointToStores(checkpoint.projectId, checkpoint);
    expect(res.success).toBe(true);
    const projectState = useProjectStore.getState().projectState;
    expect(projectState?.projectId).toBe("p1");
    const canvasBlocks = useCanvasStore.getState().blocks;
    expect(canvasBlocks.length).toBe(2); // basic info + scene
  });
});
