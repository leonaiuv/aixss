"use client";

/**
 * 分镜列表编辑器
 * M3: 分步式分镜生成与引导 - 步骤1
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Plus, Trash2, GripVertical, ArrowRight, ArrowLeft, 
  RefreshCw, Loader2, Edit2, Check, X 
} from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { useAIGeneration } from '@/hooks/use-ai-generation';
import { LIMITS } from '@/config/constants';
import type { Project, Scene } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ==========================================
// 组件属性
// ==========================================
interface SceneListEditorProps {
  project: Project;
  onNext: () => void;
  onBack: () => void;
}

// ==========================================
// 分镜列表编辑器
// ==========================================
export function SceneListEditor({ project, onNext, onBack }: SceneListEditorProps) {
  const { getScenesByProjectId, addScene, updateScene, deleteScene, updateProject } = useProjectStore();
  const { generateSceneList, isGenerating, error, clearError } = useAIGeneration();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newSceneSummary, setNewSceneSummary] = useState('');
  const [sceneCount, setSceneCount] = useState(5);

  // 加载分镜
  useEffect(() => {
    const loadedScenes = getScenesByProjectId(project.id);
    setScenes(loadedScenes);
  }, [project.id, getScenesByProjectId]);

  // 生成分镜列表
  const handleGenerate = async () => {
    try {
      clearError();
      const generatedScenes = await generateSceneList(sceneCount);
      
      if (generatedScenes.length > 0) {
        // 重新加载分镜
        const loadedScenes = getScenesByProjectId(project.id);
        setScenes(loadedScenes);
        
        // 更新项目状态
        updateProject(project.id, { workflowState: 'SCENE_LIST_EDITING' });
        toast.success(`成功生成 ${generatedScenes.length} 个分镜`);
      }
    } catch {
      toast.error('生成失败，请重试');
    }
  };

  // 开始编辑分镜
  const handleStartEdit = (scene: Scene) => {
    setEditingId(scene.id);
    setEditingValue(scene.summary);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingId && editingValue.trim()) {
      updateScene(editingId, { summary: editingValue.trim() });
      setScenes(scenes.map(s => 
        s.id === editingId ? { ...s, summary: editingValue.trim() } : s
      ));
    }
    setEditingId(null);
    setEditingValue('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  // 删除分镜
  const handleDelete = (id: string) => {
    deleteScene(id);
    setScenes(scenes.filter(s => s.id !== id));
    toast.success('分镜已删除');
  };

  // 添加新分镜
  const handleAddScene = () => {
    if (!newSceneSummary.trim()) {
      toast.error('请输入分镜概要');
      return;
    }

    const maxOrder = Math.max(0, ...scenes.map(s => s.order));
    const newId = addScene({
      projectId: project.id,
      order: maxOrder + 1,
      summary: newSceneSummary.trim(),
      sceneDescription: '',
      actionDescription: '',
      shotPrompt: '',
      contextSummary: { mood: '', keyElement: '', transition: '' },
      status: 'pending',
      notes: '',
    });

    setScenes([...scenes, {
      id: newId,
      projectId: project.id,
      order: maxOrder + 1,
      summary: newSceneSummary.trim(),
      sceneDescription: '',
      actionDescription: '',
      shotPrompt: '',
      contextSummary: { mood: '', keyElement: '', transition: '' },
      status: 'pending',
      notes: '',
    }]);

    setNewSceneSummary('');
    toast.success('分镜已添加');
  };

  // 确认分镜列表
  const handleConfirm = () => {
    if (scenes.length === 0) {
      toast.error('请先生成或添加分镜');
      return;
    }

    updateProject(project.id, { 
      workflowState: 'SCENE_LIST_CONFIRMED',
      currentSceneOrder: 1,
      currentSceneStep: 'scene_description',
    });
    
    onNext();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>分镜规划</CardTitle>
          <CardDescription>
            AI 将根据你的故事梗概生成分镜列表，你可以增删改或调整顺序
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 生成控制 */}
          {scenes.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">分镜数量</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={sceneCount}
                      onChange={(e) => setSceneCount(Math.min(LIMITS.sceneCount.max, Math.max(LIMITS.sceneCount.min, parseInt(e.target.value) || 5)))}
                      min={LIMITS.sceneCount.min}
                      max={LIMITS.sceneCount.max}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      ({LIMITS.sceneCount.min}-{LIMITS.sceneCount.max} 个)
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="mt-6"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      AI 生成分镜
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}

          {/* 分镜列表 */}
          {scenes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">分镜列表 ({scenes.length})</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  重新生成
                </Button>
              </div>

              <div className="space-y-2">
                {scenes.sort((a, b) => a.order - b.order).map((scene) => (
                  <div
                    key={scene.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                  >
                    {/* 拖拽手柄 */}
                    <div className="cursor-grab text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* 序号 */}
                    <Badge variant="outline" className="shrink-0">
                      {scene.order}
                    </Badge>

                    {/* 内容 */}
                    {editingId === scene.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{scene.summary}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleStartEdit(scene)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(scene.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* 添加新分镜 */}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newSceneSummary}
                  onChange={(e) => setNewSceneSummary(e.target.value)}
                  placeholder="输入新分镜概要..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddScene()}
                />
                <Button variant="outline" onClick={handleAddScene}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          上一步
        </Button>
        <Button onClick={handleConfirm} disabled={scenes.length === 0}>
          确认分镜列表
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
