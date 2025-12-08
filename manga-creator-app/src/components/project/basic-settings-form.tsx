"use client";

/**
 * 基础设定表单
 * M2: 剧本输入与基础设定
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { useConfigStore } from '@/store/config-store';
import { STYLE_PRESETS, LIMITS } from '@/config/constants';
import type { Project } from '@/types';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ==========================================
// 组件属性
// ==========================================
interface BasicSettingsFormProps {
  project: Project;
  onNext: () => void;
}

// ==========================================
// 基础设定表单
// ==========================================
export function BasicSettingsForm({ project, onNext }: BasicSettingsFormProps) {
  const { updateProject } = useProjectStore();
  const { isConfigured } = useConfigStore();

  const [title, setTitle] = useState(project.title);
  const [summary, setSummary] = useState(project.summary);
  const [style, setStyle] = useState(project.style);
  const [customStyle, setCustomStyle] = useState('');
  const [protagonist, setProtagonist] = useState(project.protagonist);
  const [isSaving, setIsSaving] = useState(false);

  // 检查是否为预设风格
  const isPresetStyle = STYLE_PRESETS.some((p) => p.label === style);

  // 自动保存（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== project.title || summary !== project.summary || 
          style !== project.style || protagonist !== project.protagonist) {
        handleSave(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, summary, style, protagonist]);

  // 保存设定
  const handleSave = async (showToast = true) => {
    setIsSaving(true);
    try {
      const finalStyle = isPresetStyle ? style : customStyle || style;
      
      updateProject(project.id, {
        title: title.trim(),
        summary: summary.trim(),
        style: finalStyle,
        protagonist: protagonist.trim(),
        contextCache: {
          styleKeywords: finalStyle,
          protagonistCore: protagonist.slice(0, 50),
          storyCore: summary.slice(0, 100),
          lastUpdated: new Date().toISOString(),
        },
        workflowState: 'DATA_COLLECTED',
      });

      if (showToast) {
        toast.success('设定已保存');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 进入下一步
  const handleNext = async () => {
    if (!title.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    if (!summary.trim()) {
      toast.error('请输入故事梗概');
      return;
    }

    if (!isConfigured) {
      toast.error('请先配置 API Key');
      return;
    }

    await handleSave(false);
    onNext();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>基础设定</CardTitle>
          <CardDescription>
            填写项目的基本信息，这些信息将用于 AI 生成分镜和提示词
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 项目名称 */}
          <div className="space-y-2">
            <Label htmlFor="title">项目名称 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的项目起个名字"
              maxLength={LIMITS.projectTitle.max}
            />
          </div>

          {/* 视觉风格 */}
          <div className="space-y-2">
            <Label htmlFor="style">视觉风格 *</Label>
            <Select
              value={isPresetStyle ? style : 'custom'}
              onValueChange={(v) => {
                if (v === 'custom') {
                  setStyle('自定义风格');
                } else {
                  setStyle(v);
                }
              }}
            >
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
            {!isPresetStyle && (
              <Input
                value={customStyle}
                onChange={(e) => {
                  setCustomStyle(e.target.value);
                  setStyle(e.target.value);
                }}
                placeholder="输入自定义风格描述，如：复古油画风格、梦幻水墨风..."
                className="mt-2"
              />
            )}
            <p className="text-xs text-muted-foreground">
              视觉风格将影响生成的提示词，确保整部作品的视觉一致性
            </p>
          </div>

          {/* 故事梗概 */}
          <div className="space-y-2">
            <Label htmlFor="summary">故事梗概 *</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="简要描述你的故事背景、主要情节和核心冲突..."
              rows={5}
              maxLength={LIMITS.summary.max}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>AI 将根据故事梗概生成分镜列表</span>
              <span>{summary.length}/{LIMITS.summary.max}</span>
            </div>
          </div>

          {/* 主角描述 */}
          <div className="space-y-2">
            <Label htmlFor="protagonist">主角描述</Label>
            <Textarea
              id="protagonist"
              value={protagonist}
              onChange={(e) => setProtagonist(e.target.value)}
              placeholder="描述主角的外观特征、服装、性格等，确保在所有分镜中保持一致..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              详细的主角描述有助于在不同分镜中保持角色一致性
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => handleSave(true)} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存'}
        </Button>
        <Button onClick={handleNext} disabled={!isConfigured}>
          下一步：生成分镜
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {!isConfigured && (
        <p className="text-sm text-destructive text-center">
          请先在右上角配置 API Key 才能继续
        </p>
      )}
    </div>
  );
}
