import { describe, it, expect, beforeEach, vi } from "vitest";
import * as aiService from "../services/ai-service";

import {
  createProjectTool,
  setProjectInfoTool,
  generateScenesTool,
  refineSceneTool,
  batchRefineScenesTool,
  exportPromptsTool,
  resetCurrentProjectId,
} from "./index";
import { getCheckpointStore, resetMemoryCheckpointStore } from "@/lib/checkpoint/store";

describe("agent tools", () => {
  beforeEach(async () => {
    resetCurrentProjectId();
    resetMemoryCheckpointStore();
    delete process.env.USE_SQLITE_STORE;

    vi.spyOn(aiService, "generateScenesWithAI").mockResolvedValue({
      success: true,
      data: { scenes: [{ id: "scene-1", order: 1, summary: "S1", status: "pending" }] },
    });
    vi.spyOn(aiService, "refineSceneWithAI").mockResolvedValue({
      success: true,
      data: {
        sceneId: "scene-1",
        sceneDescription: "desc",
        keyframePrompt: "key",
        spatialPrompt: "spa",
        fullPrompt: "art, key",
        status: "completed",
      },
    });
    vi.spyOn(aiService, "batchRefineWithAI").mockResolvedValue({
      success: true,
      data: {
        results: [
          {
            sceneId: "scene-1",
            sceneDescription: "desc",
            keyframePrompt: "key",
            spatialPrompt: "spa",
            fullPrompt: "art, key",
            status: "completed",
          },
        ],
      },
    });
    vi.spyOn(aiService, "formatExportData").mockImplementation(
      (data: any, format: string) => `FORMAT:${format}:${data.scenes.length}`
    );
  });

  it("creates a project and stores checkpoint", async () => {
    const res = await createProjectTool.execute({ title: "New Project" });
    expect(res.success).toBe(true);
    const store = await getCheckpointStore();
    const all = await store.list();
    expect(all.length).toBe(1);
    expect(all[0].title).toBe("New Project");
  });

  it("updates project info and marks completion when fields are ready", async () => {
    await createProjectTool.execute({ title: "New Project" });
    const res = await setProjectInfoTool.execute({
      summary: "sum",
      artStyle: "style",
      protagonist: "hero",
    });
    expect(res.success).toBe(true);
    const store = await getCheckpointStore();
    const checkpoint = await store.load((await store.list())[0].projectId);
    expect(checkpoint?.workflowState).toBe("BASIC_INFO_COMPLETE");
  });

  it("generates scenes and updates workflow", async () => {
    await createProjectTool.execute({ title: "New Project" });
    await setProjectInfoTool.execute({
      summary: "sum",
      artStyle: "style",
      protagonist: "hero",
    });
    const res = await generateScenesTool.execute({ count: 1 });
    expect(res.success).toBe(true);
    const store = await getCheckpointStore();
    const list = await store.list();
    expect(list[0].scenes.length).toBe(1);
    expect(list[0].workflowState).toBe("SCENE_LIST_EDITING");
  });

  it("refines a single scene and marks completed", async () => {
    await createProjectTool.execute({ title: "New Project" });
    await setProjectInfoTool.execute({
      summary: "sum",
      artStyle: "style",
      protagonist: "hero",
    });
    await generateScenesTool.execute({ count: 1 });
    const res = await refineSceneTool.execute({ sceneId: "scene-1" });
    expect(res.success).toBe(true);
    const store = await getCheckpointStore();
    const cp = (await store.list())[0];
    expect(cp.scenes[0].status).toBe("completed");
  });

  it("batch refines scenes and marks workflow complete", async () => {
    await createProjectTool.execute({ title: "New Project" });
    await setProjectInfoTool.execute({
      summary: "sum",
      artStyle: "style",
      protagonist: "hero",
    });
    await generateScenesTool.execute({ count: 1 });
    const res = await batchRefineScenesTool.execute({ sceneIds: ["scene-1"] });
    expect(res.success).toBe(true);
    const store = await getCheckpointStore();
    const cp = (await store.list())[0];
    expect(cp.workflowState).toBe("ALL_SCENES_COMPLETE");
  });

  it("exports prompts only when scenes completed", async () => {
    await createProjectTool.execute({ title: "New Project" });
    await setProjectInfoTool.execute({
      summary: "sum",
      artStyle: "style",
      protagonist: "hero",
    });
    await generateScenesTool.execute({ count: 1 });
    await refineSceneTool.execute({ sceneId: "scene-1" });
    const res = await exportPromptsTool.execute({ format: "json", includeMetadata: true });
    expect(res.success).toBe(true);
    const store = await getCheckpointStore();
    const cp = (await store.list())[0];
    expect(cp.workflowState).toBe("EXPORTED");
  });
});
