import { NextRequest, NextResponse } from "next/server";
import { getCheckpointStore, createEmptyCheckpoint } from "@/lib/checkpoint/store";

export async function GET() {
  try {
    const store = await getCheckpointStore();
    const projects = await store.list();
    const projectList = projects.map((p) => ({
      id: p.projectId,
      projectId: p.projectId,
      threadId: p.threadId,
      title: p.title || "未命名项目",
      summary: p.summary,
      workflowState: p.workflowState,
      scenesCount: p.scenes.length,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    }));

    projectList.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ success: true, data: projectList });
  } catch (error) {
    console.error("获取项目列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取项目列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = (body?.title as string) || "未命名项目";
    const projectId = `project-${Date.now()}`;
    const threadId = `thread-${Date.now()}`;

    const store = await getCheckpointStore();
    const checkpoint = createEmptyCheckpoint(projectId, threadId);
    checkpoint.title = title;
    checkpoint.workflowState = "COLLECTING_BASIC_INFO";
    await store.save(checkpoint);

    return NextResponse.json({
      success: true,
      data: { projectId, threadId, title },
    });
  } catch (error) {
    console.error("新建项目失败:", error);
    return NextResponse.json({ success: false, error: "新建项目失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = body?.projectId as string | undefined;
    if (!projectId) {
      return NextResponse.json({ success: false, error: "projectId required" }, { status: 400 });
    }
    const store = await getCheckpointStore();
    await store.delete(projectId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除项目失败:", error);
    return NextResponse.json({ success: false, error: "删除项目失败" }, { status: 500 });
  }
}
