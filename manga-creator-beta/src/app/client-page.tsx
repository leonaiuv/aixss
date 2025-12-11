"use client";

import React, { useMemo } from "react";
import { ThreeColumnLayout } from "@/components/layout/ThreeColumnLayout";
import ThreadList from "@/components/project/ThreadList";
import { Editor } from "@/components/canvas/Editor";
import { SceneCard } from "@/components/canvas/SceneCard";
import { useProjectStore } from "@/stores/projectStore";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

const ChatPanel = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!res.ok || !res.body) {
        throw new Error("聊天接口异常");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
        );
      }

      acc += decoder.decode();
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
      );
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "服务调用失败，请稍后重试。" },
      ]);
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">AI 对话</h2>
        <p className="text-sm text-muted-foreground">使用工具引导完成漫剧创作流程</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg bg-white shadow-sm border p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">
              {m.role === "assistant" ? "助手" : "你"}
            </div>
            <div className="whitespace-pre-wrap text-sm">{m.content as string}</div>
          </div>
        ))}
        {messages.length === 0 && (
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
