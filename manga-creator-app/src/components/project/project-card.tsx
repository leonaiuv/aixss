"use client";

/**
 * 项目卡片组件
 * 显示项目基本信息和操作
 */

import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MoreHorizontal, Trash2, FolderOpen, Clock, Palette } from 'lucide-react';
import type { Project } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

// ==========================================
// 工作流状态中文映射
// ==========================================
const WORKFLOW_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  IDLE: { label: '未开始', variant: 'outline' },
  DATA_COLLECTING: { label: '填写中', variant: 'secondary' },
  DATA_COLLECTED: { label: '待生成', variant: 'secondary' },
  SCENE_LIST_GENERATING: { label: '生成中', variant: 'default' },
  SCENE_LIST_EDITING: { label: '编辑中', variant: 'secondary' },
  SCENE_LIST_CONFIRMED: { label: '已确认', variant: 'secondary' },
  SCENE_PROCESSING: { label: '处理中', variant: 'default' },
  ALL_SCENES_COMPLETE: { label: '已完成', variant: 'default' },
  EXPORTING: { label: '导出中', variant: 'default' },
};

// ==========================================
// 组件属性
// ==========================================
interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

// ==========================================
// 项目卡片组件
// ==========================================
export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusInfo = WORKFLOW_STATUS_MAP[project.workflowState] || { label: '未知', variant: 'outline' as const };
  const formattedDate = format(new Date(project.updatedAt), 'MM月dd日 HH:mm', { locale: zhCN });

  const handleDelete = () => {
    onDelete(project.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card
        className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
        onClick={() => onOpen(project.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{project.title || '未命名项目'}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {project.summary || '暂无描述'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(project.id); }}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  打开项目
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除项目
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Palette className="h-3.5 w-3.5" />
                <span className="truncate max-w-[80px]">{project.style || '未设置'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后项目「{project.title || '未命名项目'}」及其所有分镜数据将无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
