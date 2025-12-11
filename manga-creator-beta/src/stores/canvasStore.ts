import { create } from "zustand";

export interface CanvasBlock {
  id: string;
  type: "project" | "scene" | "export" | string;
  content: Record<string, unknown>;
}

export interface CanvasState {
  blocks: CanvasBlock[];
  isDirty: boolean;
  lastSyncedAt: Date | null;
  setBlocks: (blocks: CanvasBlock[]) => void;
  addBlock: (block: CanvasBlock) => void;
  updateBlock: (id: string, updates: Partial<CanvasBlock>) => void;
  removeBlock: (id: string) => void;
  markDirty: () => void;
  markSynced: () => void;
  reset: () => void;
}

const initialState = {
  blocks: [] as CanvasBlock[],
  isDirty: false,
  lastSyncedAt: null as Date | null,
};

export const useCanvasStore = create<CanvasState>((set) => ({
  ...initialState,

  setBlocks: (blocks) => set({ blocks, isDirty: true }),

  addBlock: (block) =>
    set((state) => ({
      blocks: [...state.blocks, block],
      isDirty: true,
    })),

  updateBlock: (id, updates) =>
    set((state) => ({
      blocks: state.blocks.map((b) =>
        b.id === id ? { ...b, ...updates, content: { ...b.content, ...updates.content } } : b
      ),
      isDirty: true,
    })),

  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((b) => b.id !== id),
      isDirty: true,
    })),

  markDirty: () => set({ isDirty: true }),

  markSynced: () => set({ isDirty: false, lastSyncedAt: new Date() }),

  reset: () => set(initialState),
}));
