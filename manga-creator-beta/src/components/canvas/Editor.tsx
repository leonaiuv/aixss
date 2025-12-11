"use client";

import { type FC } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

export interface EditorProps {
  className?: string;
}

export const Editor: FC<EditorProps> = ({ className }) => {
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "开始创作你的漫剧故事...",
      },
    ],
  });

  return (
    <div className={`flex h-full flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-lg font-semibold">创作画布</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>自动保存中...</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <BlockNoteView editor={editor} theme="light" className="min-h-full" />
      </div>
    </div>
  );
};
