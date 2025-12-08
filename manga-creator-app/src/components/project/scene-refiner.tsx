"use client";

/**
 * 分镜细化组件
 * M3: 分步式分镜生成与引导 - 步骤2
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowLeft, RefreshCw, Loader2, Check, Edit2,
  ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { useAIGeneration } from '@/hooks/use-ai-generation';
import type { Project, Scene, SceneStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ==========================================
// 组件属性
// ==========================================
interface SceneRefinerProps {
  project: Project;
  onNext: () => void;
  onBack: () => void;
}

// ==========================================
// 状态徽章配置
// ==========================================
const STATUS_CONFIG: Record<SceneStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: '待处理', variant: 'outline' },
  scene_generating: { label: '生成场景中', variant: 'default' },
  scene_confirmed: { label: '场景已确认', variant: 'secondary' },
  action_generating: { label: '生成动作中', variant: 'default' },
  action_confirmed: { label: '动作已确认', variant: 'secondary' },
  prompt_generating: { label: '生成提示词中', variant: 'default' },
  completed: { label: '已完成', variant: 'default' },
  needs_update: { label: '需更新', variant: 'destructive' },
};

// ==========================================
// 分镜细化组件
// ==========================================
export function SceneRefiner({ project, onNext, onBack }: SceneRefinerProps) {
  const { getScenesByProjectId, updateScene, updateProject } = useProjectStore();
  const {
    generateSceneDescription,
    generateActionDescription,
    generateShotPrompt,
    isGenerating,
    streamingContent,
    error,
    cancelGeneration,
    clearError,
  } = useAIGeneration();

  const scenes = getScenesByProjectId(project.id);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [editingField, setEditingField] = useState<'scene' | 'action' | 'prompt' | null>(null);
  const [editValue, setEditValue] = useState('');

  const currentScene = scenes[currentSceneIndex];
  const totalScenes = scenes.length;
  const completedScenes = scenes.filter(s => s.status === 'completed').length;
  const progressPercent = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  // 获取当前步骤
  const getCurrentStep = (): 'scene' | 'action' | 'prompt' | 'done' => {
    if (!currentScene) return 'scene';
    
    if (!currentScene.sceneDescription) return 'scene';
    if (!currentScene.actionDescription) return 'action';
    if (!currentScene.shotPrompt) return 'prompt';
    return 'done';
  };

  const currentStep = getCurrentStep();

  // 生成场景描述
  const handleGenerateScene = async () => {
    if (!currentScene) return;
    clearError();
    
    try {
      const result = await generateSceneDescription(currentScene.id);
      if (result) {
        toast.success('场景描述已生成');
      }
    } catch {
      toast.error('生成失败');
    }
  };

  // 生成动作描述
  const handleGenerateAction = async () => {
    if (!currentScene) return;
    clearError();
    
    try {
      const result = await generateActionDescription(currentScene.id);
      if (result) {
        toast.success('动作描述已生成');
      }
    } catch {
      toast.error('生成失败');
    }
  };

  // 生成镜头提示词
  const handleGeneratePrompt = async () => {
    if (!currentScene) return;
    clearError();
    
    try {
      const result = await generateShotPrompt(currentScene.id);
      if (result) {
        toast.success('提示词已生成');
      }
    } catch {
      toast.error('生成失败');
    }
  };

  // 开始编辑
  const handleStartEdit = (field: 'scene' | 'action' | 'prompt') => {
    if (!currentScene) return;
    
    setEditingField(field);
    switch (field) {
      case 'scene':
        setEditValue(currentScene.sceneDescription);
        break;
      case 'action':
        setEditValue(currentScene.actionDescription);
        break;
      case 'prompt':
        setEditValue(currentScene.shotPrompt);
        break;
    }
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!currentScene || !editingField) return;

    const updates: Partial<Scene> = {};
    switch (editingField) {
      case 'scene':
        updates.sceneDescription = editValue;
        break;
      case 'action':
        updates.actionDescription = editValue;
        break;
      case 'prompt':
        updates.shotPrompt = editValue;
        updates.status = 'completed';
        break;
    }

    updateScene(currentScene.id, updates);
    setEditingField(null);
    setEditValue('');
    toast.success('已保存');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // 切换分镜
  const handlePrevScene = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(currentSceneIndex - 1);
    }
  };

  const handleNextScene = () => {
    if (currentSceneIndex < totalScenes - 1) {
      setCurrentSceneIndex(currentSceneIndex + 1);
    }
  };

  // 完成所有分镜
  const handleComplete = () => {
    const allCompleted = scenes.every(s => s.status === 'completed');
    if (!allCompleted) {
      toast.error('请完成所有分镜');
      return;
    }

    updateProject(project.id, { workflowState: 'ALL_SCENES_COMPLETE' });
    onNext();
  };

  if (!currentScene) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">没有分镜需要处理</p>
        <Button className="mt-4" onClick={onBack}>返回分镜列表</Button>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[currentScene.status] || STATUS_CONFIG.pending;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>总体进度</span>
          <span>{completedScenes}/{totalScenes} 个分镜完成</span>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* 分镜导航 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevScene}
          disabled={currentSceneIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          上一个
        </Button>
        <div className="text-center">
          <div className="font-medium">分镜 {currentSceneIndex + 1}/{totalScenes}</div>
          <div className="text-sm text-muted-foreground">{currentScene.summary}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextScene}
          disabled={currentSceneIndex === totalScenes - 1}
        >
          下一个
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* 分镜内容卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{currentScene.summary}</CardTitle>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <CardDescription>
            依次生成场景描述、动作描述和镜头提示词
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 场景描述 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm flex items-center gap-2">
                场景描述
                {currentScene.sceneDescription && <Check className="h-4 w-4 text-green-500" />}
              </label>
              {currentScene.sceneDescription && (
                <Button variant="ghost" size="sm" onClick={() => handleStartEdit('scene')}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editingField === 'scene' ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>取消</Button>
                  <Button size="sm" onClick={handleSaveEdit}>保存</Button>
                </div>
              </div>
            ) : currentScene.sceneDescription ? (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {currentScene.sceneDescription}
              </p>
            ) : (
              <Button
                onClick={handleGenerateScene}
                disabled={isGenerating}
                className={cn(currentStep === 'scene' && 'animate-pulse')}
              >
                {isGenerating && currentScene.status === 'scene_generating' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {streamingContent ? '生成中...' : '准备中...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成场景描述
                  </>
                )}
              </Button>
            )}
            {isGenerating && currentScene.status === 'scene_generating' && streamingContent && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {streamingContent}
                <span className="animate-blink-cursor">|</span>
              </p>
            )}
          </div>

          {/* 动作描述 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm flex items-center gap-2">
                动作描述
                {currentScene.actionDescription && <Check className="h-4 w-4 text-green-500" />}
              </label>
              {currentScene.actionDescription && (
                <Button variant="ghost" size="sm" onClick={() => handleStartEdit('action')}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editingField === 'action' ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>取消</Button>
                  <Button size="sm" onClick={handleSaveEdit}>保存</Button>
                </div>
              </div>
            ) : currentScene.actionDescription ? (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {currentScene.actionDescription}
              </p>
            ) : currentScene.sceneDescription ? (
              <Button
                onClick={handleGenerateAction}
                disabled={isGenerating}
                className={cn(currentStep === 'action' && 'animate-pulse')}
              >
                {isGenerating && currentScene.status === 'action_generating' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成动作描述
                  </>
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">请先生成场景描述</p>
            )}
          </div>

          {/* 镜头提示词 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm flex items-center gap-2">
                镜头提示词
                {currentScene.shotPrompt && <Check className="h-4 w-4 text-green-500" />}
              </label>
              {currentScene.shotPrompt && (
                <Button variant="ghost" size="sm" onClick={() => handleStartEdit('prompt')}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editingField === 'prompt' ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>取消</Button>
                  <Button size="sm" onClick={handleSaveEdit}>保存</Button>
                </div>
              </div>
            ) : currentScene.shotPrompt ? (
              <pre className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg whitespace-pre-wrap font-mono">
                {currentScene.shotPrompt}
              </pre>
            ) : currentScene.actionDescription ? (
              <Button
                onClick={handleGeneratePrompt}
                disabled={isGenerating}
                className={cn(currentStep === 'prompt' && 'animate-pulse')}
              >
                {isGenerating && currentScene.status === 'prompt_generating' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成提示词
                  </>
                )}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">请先生成动作描述</p>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
              <Button variant="link" size="sm" onClick={clearError} className="ml-2 p-0 h-auto">
                忽略
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回分镜列表
        </Button>
        <Button onClick={handleComplete} disabled={completedScenes < totalScenes}>
          完成所有分镜
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
