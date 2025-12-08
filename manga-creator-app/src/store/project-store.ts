/**
 * 项目状态管理 Store
 * 基于 Zustand 实现
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project, Scene, WorkflowState, SceneStep } from '@/types';
import { STORAGE_KEYS } from '@/config/constants';

interface ProjectState {
  // 项目列表
  projects: Project[];
  currentProjectId: string | null;
  
  // 当前项目的分镜
  scenes: Scene[];
  
  // 加载状态
  isLoading: boolean;
  
  // Actions - 项目管理
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  
  // Actions - 分镜管理
  setScenes: (scenes: Scene[]) => void;
  addScene: (scene: Omit<Scene, 'id'>) => string;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  reorderScenes: (orderedIds: string[]) => void;
  
  // Actions - 工作流
  setWorkflowState: (projectId: string, state: WorkflowState) => void;
  setCurrentSceneStep: (projectId: string, order: number, step: SceneStep) => void;
  
  // Getters
  getCurrentProject: () => Project | null;
  getProjectById: (id: string) => Project | null;
  getScenesByProjectId: (projectId: string) => Scene[];
}

const generateId = () => crypto.randomUUID();

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      scenes: [],
      isLoading: false,
      
      // 创建项目
      createProject: (projectData) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newProject: Project = {
          ...projectData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: id,
        }));
        
        return id;
      },
      
      // 更新项目
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },
      
      // 删除项目
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          scenes: state.scenes.filter((s) => s.projectId !== id),
          currentProjectId:
            state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },
      
      // 设置当前项目
      setCurrentProject: (id) => {
        set({ currentProjectId: id });
      },
      
      // 设置分镜
      setScenes: (scenes) => {
        set({ scenes });
      },
      
      // 添加分镜
      addScene: (sceneData) => {
        const id = generateId();
        const newScene: Scene = {
          ...sceneData,
          id,
        };
        
        set((state) => ({
          scenes: [...state.scenes, newScene],
        }));
        
        return id;
      },
      
      // 更新分镜
      updateScene: (id, updates) => {
        set((state) => ({
          scenes: state.scenes.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },
      
      // 删除分镜
      deleteScene: (id) => {
        set((state) => ({
          scenes: state.scenes.filter((s) => s.id !== id),
        }));
      },
      
      // 重新排序分镜
      reorderScenes: (orderedIds) => {
        set((state) => {
          const sceneMap = new Map(state.scenes.map((s) => [s.id, s]));
          const reorderedScenes = orderedIds
            .map((id, index) => {
              const scene = sceneMap.get(id);
              return scene ? { ...scene, order: index + 1 } : null;
            })
            .filter((s): s is Scene => s !== null);
          
          return { scenes: reorderedScenes };
        });
      },
      
      // 设置工作流状态
      setWorkflowState: (projectId, state) => {
        get().updateProject(projectId, { workflowState: state });
      },
      
      // 设置当前分镜步骤
      setCurrentSceneStep: (projectId, order, step) => {
        get().updateProject(projectId, {
          currentSceneOrder: order,
          currentSceneStep: step,
        });
      },
      
      // 获取当前项目
      getCurrentProject: () => {
        const state = get();
        return state.projects.find((p) => p.id === state.currentProjectId) || null;
      },
      
      // 根据ID获取项目
      getProjectById: (id) => {
        return get().projects.find((p) => p.id === id) || null;
      },
      
      // 获取项目的分镜
      getScenesByProjectId: (projectId) => {
        return get()
          .scenes.filter((s) => s.projectId === projectId)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: STORAGE_KEYS.projects,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        scenes: state.scenes,
      }),
    }
  )
);
