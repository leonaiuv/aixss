import { Annotation } from "@langchain/langgraph";
import { type CoreMessage } from "ai";
import type { ProjectState } from "@/types";

export const AgentState = Annotation.Root({
  project: Annotation<ProjectState>({
    reducer: (current, update) => ({
      ...current,
      ...update,
    }),
    default: () => ({
      projectId: "",
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
    }),
  }),

  messages: Annotation<CoreMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
});
