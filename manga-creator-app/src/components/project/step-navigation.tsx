"use client";

/**
 * 步骤导航组件
 */

import { Check, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, WorkflowState } from '@/types';

// ==========================================
// 类型定义
// ==========================================
type Step = 'settings' | 'scenes' | 'refine' | 'export';

interface StepNavigationProps {
  currentStep: Step;
  project: Project;
  onStepChange: (step: Step) => void;
}

// ==========================================
// 步骤配置
// ==========================================
const STEPS: Array<{
  id: Step;
  title: string;
  description: string;
  requiredStates: WorkflowState[];
}> = [
  {
    id: 'settings',
    title: '基础设定',
    description: '项目信息与风格',
    requiredStates: ['IDLE', 'DATA_COLLECTING', 'DATA_COLLECTED'],
  },
  {
    id: 'scenes',
    title: '分镜规划',
    description: '生成分镜列表',
    requiredStates: ['SCENE_LIST_GENERATING', 'SCENE_LIST_EDITING', 'SCENE_LIST_CONFIRMED'],
  },
  {
    id: 'refine',
    title: '分镜细化',
    description: '场景与提示词',
    requiredStates: ['SCENE_PROCESSING'],
  },
  {
    id: 'export',
    title: '整合输出',
    description: '导出提示词',
    requiredStates: ['ALL_SCENES_COMPLETE', 'EXPORTING'],
  },
];

// ==========================================
// 获取步骤状态
// ==========================================
function getStepStatus(
  step: Step,
  currentStep: Step,
  workflowState: WorkflowState
): 'completed' | 'current' | 'upcoming' | 'processing' {
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  if (step === currentStep) {
    // 检查是否正在处理中
    if (
      workflowState.includes('GENERATING') ||
      workflowState === 'SCENE_PROCESSING' ||
      workflowState === 'EXPORTING'
    ) {
      return 'processing';
    }
    return 'current';
  }

  if (stepIndex < currentIndex) {
    return 'completed';
  }

  return 'upcoming';
}

// ==========================================
// 步骤导航组件
// ==========================================
export function StepNavigation({ currentStep, project, onStepChange }: StepNavigationProps) {
  const canNavigateTo = (step: Step): boolean => {
    const stepIndex = STEPS.findIndex((s) => s.id === step);
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    
    // 可以返回之前的步骤，或者在当前步骤完成后进入下一步
    return stepIndex <= currentIndex + 1;
  };

  return (
    <nav className="space-y-1">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4 px-3">创作步骤</h2>
      {STEPS.map((step, index) => {
        const status = getStepStatus(step.id, currentStep, project.workflowState);
        const canNavigate = canNavigateTo(step.id);

        return (
          <button
            key={step.id}
            onClick={() => canNavigate && onStepChange(step.id)}
            disabled={!canNavigate}
            className={cn(
              'w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors',
              status === 'current' && 'bg-primary/10 text-primary',
              status === 'processing' && 'bg-primary/10 text-primary',
              status === 'completed' && 'text-muted-foreground hover:bg-muted',
              status === 'upcoming' && 'text-muted-foreground/50',
              canNavigate && status !== 'current' && status !== 'processing' && 'hover:bg-muted cursor-pointer',
              !canNavigate && 'cursor-not-allowed opacity-50'
            )}
          >
            {/* 状态图标 */}
            <div className="mt-0.5">
              {status === 'completed' ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              ) : status === 'processing' ? (
                <div className="flex h-5 w-5 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : status === 'current' ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                  <span className="text-xs text-muted-foreground/50">{index + 1}</span>
                </div>
              )}
            </div>

            {/* 步骤信息 */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{step.title}</div>
              <div className="text-xs text-muted-foreground truncate">{step.description}</div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
