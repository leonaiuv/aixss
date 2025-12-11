import type { WorkflowState, SceneStatus } from "@/types";

export type { WorkflowState, SceneStatus };

export interface Scene {
  id: string;
  order: number;
  summary: string;
  status: SceneStatus;
  sceneDescription?: string;
  keyframePrompt?: string;
  spatialPrompt?: string;
  error?: string;
}

export interface ProjectCheckpoint {
  projectId: string;
  threadId: string;
  workflowState: WorkflowState;
  title: string;
  summary: string;
  artStyle: string;
  protagonist: string;
  scenes: Scene[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckpointStore {
  save(checkpoint: ProjectCheckpoint): Promise<string>;
  load(projectId: string): Promise<ProjectCheckpoint | null>;
  list(): Promise<ProjectCheckpoint[]>;
  delete(projectId: string): Promise<void>;
}

export async function findCheckpointByThreadId(
  store: CheckpointStore,
  threadId: string
): Promise<ProjectCheckpoint | null> {
  const all = await store.list();
  return all.find((item) => item.threadId === threadId) ?? null;
}

export function createMemoryCheckpointStore(): CheckpointStore {
  const store = new Map<string, ProjectCheckpoint>();

  return {
    async save(checkpoint: ProjectCheckpoint): Promise<string> {
      const { projectId } = checkpoint;
      const now = new Date().toISOString();

      const existing = store.get(projectId);
      const saved: ProjectCheckpoint = {
        ...checkpoint,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      store.set(projectId, saved);
      return projectId;
    },

    async load(projectId: string): Promise<ProjectCheckpoint | null> {
      return store.get(projectId) ?? null;
    },

    async list(): Promise<ProjectCheckpoint[]> {
      return Array.from(store.values());
    },

    async delete(projectId: string): Promise<void> {
      store.delete(projectId);
    },
  };
}

export function createEmptyCheckpoint(
  projectId: string,
  threadId: string
): ProjectCheckpoint {
  const now = new Date().toISOString();
  return {
    projectId,
    threadId,
    workflowState: "IDLE",
    title: "",
    summary: "",
    artStyle: "",
    protagonist: "",
    scenes: [],
    createdAt: now,
    updatedAt: now,
  };
}

let memoryStore: CheckpointStore | null = null;

export function getMemoryCheckpointStore(): CheckpointStore {
  if (!memoryStore) memoryStore = createMemoryCheckpointStore();
  return memoryStore;
}

export function resetMemoryCheckpointStore(): void {
  memoryStore = null;
}

export async function getCheckpointStore(): Promise<CheckpointStore> {
  const preferSQLite = process.env.USE_SQLITE_STORE !== "false";

  if (preferSQLite) {
    const { getSQLiteCheckpointStore } = await import("./sqlite-store");
    return getSQLiteCheckpointStore();
  }
  return getMemoryCheckpointStore();
}
