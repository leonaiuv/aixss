"use client";

import React, { useMemo } from "react";
import {
  readUIMessageStream,
  type UIMessage,
  type UIMessagePart,
  type CoreMessage,
} from "ai";
import type { ProjectCheckpoint } from "@/lib/checkpoint/store";
import {
  checkpointToProjectState,
  projectInfoToCanvasBlock,
  scenesToCanvasBlocks,
} from "@/lib/sync/checkpoint-helpers";
import { useCanvasStore } from "@/stores/canvasStore";
import { ThreeColumnLayout } from "@/components/layout/ThreeColumnLayout";
import ThreadList from "@/components/project/ThreadList";
import { Editor } from "@/components/canvas/Editor";
import { SceneCard } from "@/components/canvas/SceneCard";
import { useProjectStore } from "@/stores/projectStore";

const ChatPanel = () => {
  type AnyUIPart = UIMessagePart<any, any>;
  const [uiMessages, setUiMessages] = React.useState<UIMessage[]>([]);
  const [coreMessages, setCoreMessages] = React.useState<CoreMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const currentThreadId = useProjectStore((state) => state.currentThreadId);
  const projectState = useProjectStore((state) => state.projectState);
  const setCurrentThread = useProjectStore((state) => state.setCurrentThread);
  const syncFromAgent = useProjectStore((state) => state.syncFromAgent);
  const setBlocks = useCanvasStore((state) => state.setBlocks);
  const markSynced = useCanvasStore((state) => state.markSynced);

  const upsertMessage = React.useCallback((message: UIMessage) => {
    setUiMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === message.id);
      if (idx === -1) return [...prev, message];
      const next = [...prev];
      next[idx] = message;
      return next;
    });
  }, []);

  const extractText = (parts: AnyUIPart[] | undefined) =>
    (parts || [])
      .filter((p) => p.type === "text")
      .map((p) => ("text" in p ? p.text : ""))
      .join("");

  const hydrateThreadFromAgent = React.useCallback(
    async (threadId: string) => {
      try {
        const res = await fetch(`/api/agent/state?threadId=${encodeURIComponent(threadId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const checkpoint = data.project as ProjectCheckpoint | undefined;
        if (checkpoint) {
          syncFromAgent(checkpointToProjectState(checkpoint));
          setBlocks([
            projectInfoToCanvasBlock(checkpoint),
            ...scenesToCanvasBlocks(checkpoint.scenes, checkpoint.artStyle),
          ]);
          markSynced();
          setCurrentThread(checkpoint.threadId);
        }
      } catch (err) {
        console.error("同步线程状态失败", err);
      }
    },
    [markSynced, setBlocks, setCurrentThread, syncFromAgent]
  );

  const tryCaptureThreadInfo = (parts: AnyUIPart[] | undefined) => {
    for (const part of parts || []) {
      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
        const output = (part as any).output;
        if (output?.threadId) {
          setCurrentThread(output.threadId as string);
          void hydrateThreadFromAgent(output.threadId as string);
        }
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: input }],
    };
    const nextCoreMessages = [...coreMessages, { role: "user", content: input } as CoreMessage];

    setUiMessages((prev) => [...prev, userMessage]);
    setCoreMessages(nextCoreMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextCoreMessages,
          threadId: currentThreadId ?? undefined,
          projectId: projectState?.projectId ?? undefined,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("聊天接口异常");
      }

      const stream = readUIMessageStream({
        // Next Response.body 类型是 ReadableStream<Uint8Array>，直接转换供解析 UI 消息流。
        stream: res.body as unknown as ReadableStream<any>,
      });
      let latestText = "";

      for await (const message of stream) {
        latestText = extractText(message.parts);
        tryCaptureThreadInfo(message.parts);
        upsertMessage(message);
      }

      if (latestText) {
        setCoreMessages((prev) => [...prev, { role: "assistant", content: latestText }]);
      }
    } catch (error) {
      setUiMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "text", text: "服务调用失败，请稍后重试。" }],
        },
      ]);
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const renderPart = (part: AnyUIPart, idx: number) => {
    if (part.type === "text") {
      return (
        <p key={idx} className="whitespace-pre-wrap text-sm">
          {part.text}
        </p>
      );
    }
    if (part.type === "reasoning") {
      return (
        <p key={idx} className="whitespace-pre-wrap text-xs text-purple-600">
          {part.text}
        </p>
      );
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      const state = (part as any).state;
      const input = (part as any).input;
      const output = (part as any).output;
      const errorText = (part as any).errorText;
      const toolName = part.type.replace("tool-", "");
      return (
        <div
          key={idx}
          className="mt-2 rounded border bg-gray-50 px-3 py-2 text-xs text-gray-700"
        >
          <div className="font-semibold text-gray-800">
            工具调用：{toolName} {state ? `(${state})` : ""}
          </div>
          {input && (
            <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] text-gray-600">
              输入：{JSON.stringify(input, null, 2)}
            </pre>
          )}
          {output && (
            <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] text-emerald-700">
              输出：{JSON.stringify(output, null, 2)}
            </pre>
          )}
          {errorText && <div className="mt-1 text-red-600">错误：{errorText}</div>}
        </div>
      );
    }
    if (part.type === "dynamic-tool") {
      return (
        <div key={idx} className="mt-2 text-xs text-gray-600">
          动态工具：{part.toolName}
        </div>
      );
    }
    if (part.type.startsWith("data-")) {
      return (
        <div key={idx} className="mt-2 text-xs text-gray-500">
          数据：{JSON.stringify((part as any).data)}
        </div>
      );
    }

    return (
      <pre key={idx} className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-500">
        {JSON.stringify(part, null, 2)}
      </pre>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">AI 对话</h2>
        <p className="text-sm text-muted-foreground">使用工具引导完成漫剧创作流程</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {uiMessages.map((m) => (
          <div key={m.id} className="rounded-lg bg-white shadow-sm border p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">
              {m.role === "assistant" ? "助手" : "你"}
            </div>
            <div className="space-y-1">{(m.parts || []).map(renderPart)}</div>
          </div>
        ))}
        {uiMessages.length === 0 && (
          <div className="text-sm text-muted-foreground">
            你好，我是你的漫剧创作助手。先告诉我想做的故事或直接点击左侧创建项目。
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
        <textarea
          className="flex-1 resize-none rounded-md border px-3 py-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息，支持中文。"
          rows={3}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="h-full px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:bg-gray-300"
        >
          发送
        </button>
      </form>
    </div>
  );
};

const CenterPanel = () => {
  const project = useProjectStore((state) => state.projectState);
  const scenes = useMemo(() => project?.scenes ?? [], [project?.scenes]);

  return (
    <div className="flex h-full flex-col">
      <Editor />
      <div className="border-t px-4 py-3 bg-gray-50">
        <h3 className="text-base font-semibold mb-2">分镜预览</h3>
        <div className="max-h-72 overflow-y-auto pr-2">
          {scenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无分镜，请通过 AI 生成或手动补充。</p>
          ) : (
            scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                id={scene.id}
                order={scene.order}
                summary={scene.summary}
                status={scene.status}
                sceneDescription={scene.sceneDescription}
                keyframePrompt={scene.keyframePrompt}
                spatialPrompt={scene.spatialPrompt}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default function ClientPage() {
  return (
    <ThreeColumnLayout
      left={<ThreadList />}
      center={<CenterPanel />}
      right={<ChatPanel />}
    />
  );
}
