import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { ProjectState } from "@/types";

export interface ProjectUIState {
  isLoading: boolean;
  currentThreadId: string | null;
  selectedSceneIndex: number;
  isGenerating: boolean;
  generatingStep: string | null;
  error: string | null;
  projectState: ProjectState | null;
  setLoading: (loading: boolean) => void;
  setCurrentThread: (threadId: string | null) => void;
  setSelectedScene: (index: number) => void;
  setGenerating: (generating: boolean, step?: string) => void;
  setError: (error: string | null) => void;
  syncFromAgent: (state: ProjectState) => void;
  reset: () => void;
}

const initialState = {
  isLoading: false,
  currentThreadId: null,
  selectedSceneIndex: 0,
  isGenerating: false,
  generatingStep: null,
  error: null,
  projectState: null,
};

export const useProjectStore = create<ProjectUIState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setLoading: (loading) => set({ isLoading: loading }),

    setCurrentThread: (threadId) => set({ currentThreadId: threadId }),

    setSelectedScene: (index) => set({ selectedSceneIndex: index }),

    setGenerating: (generating, step) =>
      set({
        isGenerating: generating,
        generatingStep: step ?? null,
      }),

    setError: (error) => set({ error }),

    syncFromAgent: (state) => set({ projectState: state }),

    reset: () => set(initialState),
  }))
);
