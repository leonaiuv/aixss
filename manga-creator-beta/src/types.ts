export type WorkflowState =
  | "IDLE"
  | "COLLECTING_BASIC_INFO"
  | "BASIC_INFO_COMPLETE"
  | "GENERATING_SCENES"
  | "SCENE_LIST_EDITING"
  | "SCENE_LIST_CONFIRMED"
  | "REFINING_SCENES"
  | "ALL_SCENES_COMPLETE"
  | "EXPORTING"
  | "EXPORTED";

export type SceneStatus =
  | "pending"
  | "in_progress"
  | "scene_confirmed"
  | "keyframe_confirmed"
  | "completed"
  | "error";

export interface Scene {
  id: string;
  order: number;
  summary: string;
  status: SceneStatus;
  sceneDescription?: string;
  keyframePrompt?: string;
  spatialPrompt?: string;
  dialogues?: Array<{ character: string; content: string }>;
  error?: string;
}

export interface ProjectState {
  projectId: string;
  workflowState: WorkflowState;
  title: string;
  summary: string;
  artStyle: string;
  protagonist: string;
  scenes: Scene[];
  currentSceneIndex: number;
  canvasContent: unknown[];
  characters: unknown[];
  createdAt: Date;
  updatedAt: Date;
}
