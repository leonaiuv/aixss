"use client";

/**
 * 提示词导出组件
 * M4: 最终提示词整合与复制
 */

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Copy, Check, ArrowLeft, Download, Eye, EyeOff } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import type { Project, Scene } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// ==========================================
// 组件属性
// ==========================================
interface PromptExporterProps {
  project: Project;
  onBack: () => void;
}

// ==========================================
// 生成 Markdown 格式的完整提示词
// ==========================================
function generateMarkdownOutput(project: Project, scenes: Scene[]): string {
  const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);
  
  let output = `# 项目：${project.title}\n\n`;
  output += `## 视觉风格\n${project.style}\n\n`;
  
  if (project.protagonist) {
    output += `## 主角设定\n${project.protagonist}\n\n`;
  }
  
  output += `---\n\n`;
  
  for (const scene of sortedScenes) {
    output += `## 分镜 ${scene.order}：${scene.summary}\n\n`;
    
    if (scene.sceneDescription) {
      output += `### 场景描述\n${scene.sceneDescription}\n\n`;
    }
    
    if (scene.actionDescription) {
      output += `### 角色动作\n${scene.actionDescription}\n\n`;
    }
    
    if (scene.shotPrompt) {
      output += `### 图像生成提示词
\`\`\`
${scene.shotPrompt}
\`\`\`

`;
    }
    
    output += `---\n\n`;
  }
  
  return output.trim();
}

// ==========================================
// 生成纯提示词列表（仅提示词）
// ==========================================
function generatePromptsOnly(scenes: Scene[]): string {
  const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);
  
  return sortedScenes
    .filter(scene => scene.shotPrompt)
    .map((scene, index) => `[分镜 ${scene.order}] ${scene.summary}\n${scene.shotPrompt}`)
    .join('\n\n---\n\n');
}

// ==========================================
// 提示词导出组件
// ==========================================
export function PromptExporter({ project, onBack }: PromptExporterProps) {
  const { getScenesByProjectId } = useProjectStore();
  const scenes = getScenesByProjectId(project.id);
  
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'full' | 'prompts'>('full');
  const [showPreview, setShowPreview] = useState(true);

  // 生成输出内容
  const fullOutput = useMemo(() => generateMarkdownOutput(project, scenes), [project, scenes]);
  const promptsOnlyOutput = useMemo(() => generatePromptsOnly(scenes), [scenes]);

  const currentOutput = activeTab === 'full' ? fullOutput : promptsOnlyOutput;

  // 复制到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentOutput);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  // 下载为文件
  const handleDownload = () => {
    const blob = new Blob([currentOutput], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || '提示词'}_${activeTab === 'full' ? '完整版' : '提示词'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('文件已下载');
  };

  // 统计信息
  const stats = useMemo(() => {
    const completedScenes = scenes.filter(s => s.status === 'completed');
    return {
      totalScenes: scenes.length,
      completedScenes: completedScenes.length,
      totalPrompts: scenes.filter(s => s.shotPrompt).length,
      wordCount: currentOutput.length,
    };
  }, [scenes, currentOutput]);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>整合输出</CardTitle>
              <CardDescription>
                复制或下载完整的提示词文档
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {showPreview ? '隐藏预览' : '显示预览'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 统计信息 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.totalScenes}</div>
              <div className="text-xs text-muted-foreground">总分镜数</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.completedScenes}</div>
              <div className="text-xs text-muted-foreground">已完成</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.totalPrompts}</div>
              <div className="text-xs text-muted-foreground">提示词数</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{stats.wordCount}</div>
              <div className="text-xs text-muted-foreground">字符数</div>
            </div>
          </div>

          {/* 格式切换 */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'full' | 'prompts')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full">完整文档</TabsTrigger>
              <TabsTrigger value="prompts">仅提示词</TabsTrigger>
            </TabsList>
            
            {showPreview && (
              <TabsContent value={activeTab} className="mt-4">
                <ScrollArea className="h-[400px] w-full rounded-lg border bg-muted/30 p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {currentOutput}
                  </pre>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4 pt-4">
            <Button onClick={handleCopy} size="lg" className="min-w-[140px]">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  复制全部
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleDownload} size="lg">
              <Download className="mr-2 h-4 w-4" />
              下载文件
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使用提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用提示</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. <strong>完整文档</strong>：包含项目信息、场景描述、动作描述和提示词，适合存档和分享</p>
          <p>2. <strong>仅提示词</strong>：只包含每个分镜的提示词，可直接用于 Midjourney、Stable Diffusion 等工具</p>
          <p>3. 提示词默认使用英文输出，以获得更好的生成效果</p>
          <p>4. 建议在使用前根据具体平台要求调整参数（如 --ar, --v 等）</p>
        </CardContent>
      </Card>

      {/* 返回按钮 */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回编辑
        </Button>
      </div>
    </div>
  );
}
