import type { ProjectCheckpoint, Scene } from "@/lib/checkpoint/store";
import type { ProjectState } from "@/types";
import type { CanvasBlock } from "@/stores/canvasStore";

export function checkpointToProjectState(checkpoint: ProjectCheckpoint): ProjectState {
  return {
    projectId: checkpoint.projectId,
    threadId: checkpoint.threadId,
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
