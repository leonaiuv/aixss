import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state";
import { checkpointer } from "./checkpoint";
import { createAgentTools } from "./tools";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "sk-placeholder",
  baseURL: "https://api.deepseek.com",
});
const model = deepseek("deepseek-chat");

async function callModel(state: typeof AgentState.State) {
  const { messages, project } = state;

  const systemPrompt = `You are a professional Manga Creation Agent (Beta Version).
Your goal is to help the user create a manga project from scratch.

Current Project Context:
- Title: ${project.title || "(Not set)"}
- Summary: ${project.summary || "(Not set)"}
- Art Style: ${project.artStyle || "(Not set)"}
- Protagonist: ${project.protagonist || "(Not set)"}
- Workflow State: ${project.workflowState}
- Scenes Count: ${project.scenes.length}

Follow the workflow:
1. Collect Basic Info (Title, Summary, Art Style, Protagonist) if missing.
2. Generate Scenes using 'generateScenes' tool.
3. Refine Scenes using 'refineScene' tool.

Always use the provided tools to modify the project state. Do not hallucinate updates.
`;

  const tools = createAgentTools({
    projectId: project.projectId || undefined,
    threadId: project.threadId || project.projectId || undefined,
  });

  const result = await generateText({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    tools,
  });

  return { messages: result.response.messages };
}

export const graph = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile({ checkpointer });
