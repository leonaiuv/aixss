'use client';

import { useCallback } from "react";
import { useCanvasStore, type CanvasBlock } from "@/stores/canvasStore";
import type { AgentToolName } from "@/lib/agent/tools";

export interface ToolCallResult {
  toolName: AgentToolName | string;
  result: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    message?: string;
  };
}

interface SceneData {
  id: string;
  order: number;
  summary: string;
  status: "pending" | "in_progress" | "completed" | "error";
  sceneDescription?: string;
  keyframePrompt?: string;
  spatialPrompt?: string;
}

export function useToolCallSync() {
  const { setBlocks, addBlock, updateBlock, blocks } = useCanvasStore();

  const convertScenesToBlocks = useCallback((scenes: SceneData[]): CanvasBlock[] => {
    return scenes.map((scene) => ({
      id: scene.id,
      type: "scene" as const,
      content: {
        order: scene.order,
        summary: scene.summary,
        status: scene.status,
        sceneDescription: scene.sceneDescription,
        keyframePrompt: scene.keyframePrompt,
        spatialPrompt: scene.spatialPrompt,
      },
    }));
  }, []);

  const handleToolResult = useCallback(
    (toolResult: ToolCallResult) => {
      const { toolName, result } = toolResult;
      if (!result.success) {
        console.warn(`Tool ${toolName} failed:`, result.error);
        return;
      }

      const data = result.data;
      if (!data) return;

      switch (toolName) {
        case "create_project": {
          addBlock({
            id: `project-${data.projectId}`,
            type: "project",
            content: {
              projectId: data.projectId,
              title: data.title,
              createdAt: data.createdAt,
            },
          });
          break;
        }

        case "set_project_info": {
          const projectBlock = blocks.find((b) => b.type === "project");
          if (projectBlock) {
            updateBlock(projectBlock.id, {
              content: { ...projectBlock.content, ...data },
            });
          }
          break;
        }

        case "generate_scenes": {
          const scenes = data.scenes as SceneData[];
          if (scenes && Array.isArray(scenes)) {
            const sceneBlocks = convertScenesToBlocks(scenes);
            const projectBlocks = blocks.filter((b) => b.type === "project");
            setBlocks([...projectBlocks, ...sceneBlocks]);
          }
          break;
        }

        case "refine_scene": {
          const sceneId = data.sceneId as string;
          if (sceneId) {
            updateBlock(sceneId, {
              content: {
                sceneDescription: data.sceneDescription,
                keyframePrompt: data.keyframePrompt,
                spatialPrompt: data.spatialPrompt,
                status: data.status ?? "completed",
              },
            });
          }
          break;
        }

        case "batch_refine_scenes": {
          const results = data.results as Array<{ sceneId: string; status: string }>;
          if (results && Array.isArray(results)) {
            results.forEach((r) => {
              updateBlock(r.sceneId, { content: { status: r.status } });
            });
          }
          break;
        }

        case "export_prompts": {
          addBlock({
            id: `export-${Date.now()}`,
            type: "export",
            content: {
              format: data.format,
              content: data.content,
              downloadUrl: data.downloadUrl,
            },
          });
          break;
        }

        default:
          console.log(`Unknown tool: ${toolName}`, data);
      }
    },
    [blocks, addBlock, updateBlock, setBlocks, convertScenesToBlocks]
  );

  return {
    handleToolResult,
    convertScenesToBlocks,
  };
}
