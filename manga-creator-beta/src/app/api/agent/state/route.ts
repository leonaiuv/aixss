import { NextRequest, NextResponse } from "next/server";
import { graph } from "@/lib/agent/graph";
import { getCheckpointStore, findCheckpointByThreadId } from "@/lib/checkpoint/store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json({ error: "threadId is required" }, { status: 400 });
  }

  const store = await getCheckpointStore();
  const checkpoint = await findCheckpointByThreadId(store, threadId);
  const config = { configurable: { thread_id: checkpoint?.threadId ?? threadId } };

  try {
    const state = await graph.getState(config);
    return NextResponse.json({
      project: checkpoint ?? state.values.project ?? {},
      messages: state.values.messages || [],
    });
  } catch (error) {
    console.error("[API] Get Agent State Error:", error);
    return NextResponse.json({ error: "Failed to retrieve agent state" }, { status: 500 });
  }
}
