import { describe, it, expect, beforeEach, vi } from "vitest";
import * as aiService from "../services/ai-service";
import { createAgentTools } from "./index";
import { getCheckpointStore, resetMemoryCheckpointStore } from "@/lib/checkpoint/store";

describe("agent tools with scoped context", () => {
  const context = { threadId: "thread-test", projectId: "project-test" };

  beforeEach(async () => {
    resetMemoryCheckpointStore();
    process.env.USE_SQLITE_STORE = "false";

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

  it("creates and reuses a project bound to context thread", async () => {
    const tools = createAgentTools(context);
    const res = await tools.create_project.execute({ title: "New Project" });
    expect(res.success).toBe(true);
    const store = await getCheckpointStore();
    const all = await store.list();
    expect(all[0].projectId).toBe(context.projectId);
    expect(all[0].threadId).toBe(context.threadId);

    const res2 = await tools.create_project.execute({ title: "New Project" });
    expect(res2.data?.reused).toBe(true);
  });

  it("runs workflow end-to-end on the same project", async () => {
    const tools = createAgentTools(context);
    await tools.create_project.execute({ title: "New Project" });
    await tools.set_project_info.execute({
      summary: "sum",
      artStyle: "style",
      protagonist: "hero",
    });
    await tools.generate_scenes.execute({ count: 1 });
    await tools.refine_scene.execute({ sceneId: "scene-1" });
    await tools.batch_refine_scenes.execute({ sceneIds: ["scene-1"] });
    const exportRes = await tools.export_prompts.execute({
      format: "json",
      includeMetadata: true,
    });

    expect(exportRes.success).toBe(true);
    const store = await getCheckpointStore();
    const cp = (await store.list())[0];
    expect(cp.workflowState).toBe("EXPORTED");
    expect(cp.scenes[0].status).toBe("completed");
  });
});
