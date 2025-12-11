'use client';

import { useState, useEffect, useCallback, type FC } from "react";
import type { ProjectCheckpoint, Scene } from "@/lib/checkpoint/store";
import { useProjectStore } from "@/stores/projectStore";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ProjectState } from "@/types";
import { Plus, FolderOpen, Clock, ChevronRight, Trash2 } from "lucide-react";

interface ProjectListItemProps {
  project: ProjectCheckpoint;
  isSelected: boolean;
  onSelect: (projectId: string, threadId: string) => void;
  onDelete?: (projectId: string) => void;
}

const workflowLabels: Record<string, string> = {
  IDLE: "空闲",
  COLLECTING_BASIC_INFO: "收集信息",
  BASIC_INFO_COMPLETE: "信息完成",
  GENERATING_SCENES: "生成分镜中",
  SCENE_LIST_EDITING: "编辑分镜",
  SCENE_LIST_CONFIRMED: "分镜已确认",
  REFINING_SCENES: "细化中",
  ALL_SCENES_COMPLETE: "已完成",
  EXPORTING: "导出中",
  EXPORTED: "已导出",
};

function checkpointToProjectState(checkpoint: ProjectCheckpoint): ProjectState {
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

function scenesToCanvasBlocks(scenes: Scene[], artStyle: string) {
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
      fullPrompt:
        scene.keyframePrompt && artStyle ? `${artStyle}, ${scene.keyframePrompt}` : scene.keyframePrompt || "",
    },
  }));
}

function projectInfoToCanvasBlock(checkpoint: ProjectCheckpoint) {
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

const ProjectListItem: FC<ProjectListItemProps> = ({ project, isSelected, onSelect, onDelete }) => {
  const formattedDate = new Date(project.updatedAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const workflowLabel = workflowLabels[project.workflowState] || project.workflowState;

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100 text-gray-700"
      }`}
      onClick={() => onSelect(project.projectId, project.threadId)}
    >
      <FolderOpen className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{project.title || "未命名项目"}</div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="truncate">{workflowLabel}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formattedDate}
          </span>
        </div>
      </div>
      {onDelete && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project.projectId);
          }}
          title="删除项目"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      )}
      <ChevronRight className={`h-4 w-4 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
    </div>
  );
};

export interface ThreadListProps {
  className?: string;
  onProjectSelect?: (projectId: string, threadId: string) => void;
  onNewProject?: () => void;
}

export const ThreadList: FC<ThreadListProps> = ({ className, onProjectSelect, onNewProject }) => {
  const [projects, setProjects] = useState<ProjectCheckpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const projectState = useProjectStore((state) => state.projectState);
  const syncFromAgent = useProjectStore((state) => state.syncFromAgent);
  const setCurrentThread = useProjectStore((state) => state.setCurrentThread);
  const setBlocks = useCanvasStore((state) => state.setBlocks);
  const markSynced = useCanvasStore((state) => state.markSynced);

  const selectedProjectId = projectState?.projectId || null;

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "加载失败");
      setProjects(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelect = useCallback(
    async (projectId: string, threadId: string) => {
      const res = await fetch(`/api/agent/state?threadId=${encodeURIComponent(threadId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.project) {
        const checkpoint = data.project as ProjectCheckpoint;
        syncFromAgent(checkpointToProjectState(checkpoint));
        setBlocks([
          projectInfoToCanvasBlock(checkpoint),
          ...scenesToCanvasBlocks(checkpoint.scenes, checkpoint.artStyle),
        ]);
        markSynced();
        setCurrentThread(threadId);
      }
      onProjectSelect?.(projectId, threadId);
    },
    [onProjectSelect, markSynced, setBlocks, setCurrentThread, syncFromAgent]
  );

  const handleDelete = useCallback(
    async (projectId: string) => {
      if (!confirm("确定要删除这个项目吗？此操作不可撤销。")) return;
      try {
        await fetch("/api/projects", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        await loadProjects();
      } catch (err) {
        console.error("删除项目失败:", err);
      }
    },
    [loadProjects]
  );

  const handleNewProject = useCallback(async () => {
    if (onNewProject) {
      onNewProject();
      await loadProjects();
      return;
    }
    const title = prompt("输入新项目标题", "新的漫剧项目");
    if (!title) return;
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await loadProjects();
  }, [onNewProject, loadProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-lg font-semibold">项目列表</h2>
        <button
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          onClick={handleNewProject}
        >
          <Plus className="h-4 w-4" />
          新建
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">加载中...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-red-500">
            <p>{error}</p>
            <button className="mt-2 text-sm text-blue-500 hover:underline" onClick={loadProjects}>
              重试
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <FolderOpen className="h-8 w-8 mb-2" />
            <p>暂无项目</p>
            <button
              className="mt-2 text-sm text-blue-500 hover:underline"
              onClick={handleNewProject}
            >
              创建第一个项目
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <ProjectListItem
                key={project.projectId}
                project={project}
                isSelected={project.projectId === selectedProjectId}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {projects.length > 0 && (
        <div className="px-4 py-2 border-t text-xs text-gray-500">共 {projects.length} 个项目</div>
      )}
    </div>
  );
};

export default ThreadList;
