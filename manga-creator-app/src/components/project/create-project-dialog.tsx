"use client";

/**
 * 创建项目对话框
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectStore } from '@/store/project-store';
import { STYLE_PRESETS, LIMITS } from '@/config/constants';
import type { WorkflowState, SceneStep } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ==========================================
// 组件属性
// ==========================================
interface CreateProjectDialogProps {
  children?: React.ReactNode;
}

// ==========================================
// 创建项目对话框
// ==========================================
export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
  const router = useRouter();
  const { createProject } = useProjectStore();
  
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [style, setStyle] = useState('');
  const [protagonist, setProtagonist] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    setIsSubmitting(true);

    try {
      const projectId = createProject({
        title: title.trim(),
        summary: summary.trim(),
        style: style || '自定义风格',
        protagonist: protagonist.trim(),
        contextCache: {
          styleKeywords: style,
          protagonistCore: protagonist.slice(0, 50),
          storyCore: summary.slice(0, 100),
          lastUpdated: new Date().toISOString(),
        },
        workflowState: 'DATA_COLLECTING' as WorkflowState,
        currentSceneOrder: 0,
        currentSceneStep: 'scene_description' as SceneStep,
      });

      toast.success('项目创建成功');
      setOpen(false);
      resetForm();
      router.push(`/project/${projectId}`);
    } catch {
      toast.error('创建项目失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSummary('');
    setStyle('');
    setProtagonist('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            创建新项目
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>创建新项目</DialogTitle>
          <DialogDescription>
            填写项目基本信息，开始你的漫剧创作之旅
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 项目名称 */}
            <div className="grid gap-2">
              <Label htmlFor="title">项目名称 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入项目名称"
                maxLength={LIMITS.projectTitle.max}
              />
            </div>

            {/* 视觉风格 */}
            <div className="grid gap-2">
              <Label htmlFor="style">视觉风格</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="选择视觉风格" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 故事梗概 */}
            <div className="grid gap-2">
              <Label htmlFor="summary">故事梗概</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简要描述你的故事..."
                rows={3}
                maxLength={LIMITS.summary.max}
              />
              <p className="text-xs text-muted-foreground">
                {summary.length}/{LIMITS.summary.max}
              </p>
            </div>

            {/* 主角描述 */}
            <div className="grid gap-2">
              <Label htmlFor="protagonist">主角描述</Label>
              <Textarea
                id="protagonist"
                value={protagonist}
                onChange={(e) => setProtagonist(e.target.value)}
                placeholder="描述主角的外观和特征..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '创建项目'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
