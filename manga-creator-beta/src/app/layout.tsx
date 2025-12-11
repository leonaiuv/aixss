import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manga Creator (Beta)",
  description: "AI 漫剧创作助手",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
