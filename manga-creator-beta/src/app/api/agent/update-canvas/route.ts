import { NextRequest, NextResponse } from "next/server";
import { graph } from "@/lib/agent/graph";
import type { SceneStatus, Scene } from "@/types";
import { getCheckpointStore } from "@/lib/checkpoint/store";

interface CanvasBlockData {
  id: string;
  type: "project" | "scene" | "export" | string;
  content: Record<string, unknown>;
}

interface UpdateCanvasRequest {
  projectId: string;
  blocks: CanvasBlockData[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateCanvasRequest;
    const { projectId, blocks } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: "Missing projectId" }, { status: 400 });
    }
    if (!blocks || !Array.isArray(blocks)) {
      return NextResponse.json({ success: false, error: "Missing blocks data" }, { status: 400 });
    }

    const store = await getCheckpointStore();
    const checkpoint = await store.load(projectId);
    const threadId = checkpoint?.threadId ?? projectId;

    const config = { configurable: { thread_id: threadId } };
    const state = await graph.getState(config);

    const currentProject =
      state.values.project ||
      ({
        projectId,
        threadId,
        title: "",
        summary: "",
        artStyle: "",
        protagonist: "",
        workflowState: "IDLE",
        scenes: [],
        currentSceneIndex: 0,
        canvasContent: [],
        characters: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        } as any);

    const changes = extractProjectChanges(currentProject, blocks);
    if (Object.keys(changes).length > 0) {
      const updatedAt = new Date();
      await graph.updateState(config, {
        project: {
          ...currentProject,
          ...changes,
          canvasContent: blocks,
          updatedAt,
        },
      });

      if (checkpoint) {
        await store.save({
          ...checkpoint,
          ...("title" in changes ? { title: changes.title } : {}),
          ...("summary" in changes ? { summary: changes.summary } : {}),
          ...("artStyle" in changes ? { artStyle: changes.artStyle } : {}),
          ...("protagonist" in changes ? { protagonist: changes.protagonist } : {}),
          ...(changes.scenes ? { scenes: changes.scenes } : {}),
          updatedAt: updatedAt.toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { projectId, threadId, updatedAt: new Date().toISOString() },
      message: "Canvas synced to Agent State",
    });
  } catch (error) {
    console.error("[update-canvas] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

function extractProjectChanges(currentProject: any, blocks: CanvasBlockData[]): Record<string, any> {
  const changes: Record<string, any> = {};

  const projectBlock = blocks.find((b) => b.type === "project");
  const sceneBlocks = blocks.filter((b) => b.type === "scene");

  if (projectBlock) {
    const content = projectBlock.content;
    if (content.title !== undefined) changes.title = String(content.title);
    if (content.summary !== undefined) changes.summary = String(content.summary);
    if (content.artStyle !== undefined) changes.artStyle = String(content.artStyle);
    if (content.protagonist !== undefined) changes.protagonist = String(content.protagonist);
  }

  if (sceneBlocks.length > 0) {
    const existingScenesMap = new Map<string, Scene>(
      (currentProject.scenes || []).map((s: Scene) => [s.id, s])
    );

    const newScenes = sceneBlocks.map((block): Scene => {
      const existing = existingScenesMap.get(block.id);
      const content = block.content;
      return {
        id: block.id,
        order: (content.order as number) ?? existing?.order ?? 0,
        summary: (content.summary as string) ?? existing?.summary ?? "",
        status: (content.status as SceneStatus) ?? existing?.status ?? "pending",
        sceneDescription: (content.sceneDescription as string) ?? existing?.sceneDescription,
        keyframePrompt: (content.keyframePrompt as string) ?? existing?.keyframePrompt,
        spatialPrompt: (content.spatialPrompt as string) ?? existing?.spatialPrompt,
        dialogues: existing?.dialogues || [],
      };
    });

    changes.scenes = newScenes;
  }

  return changes;
}
