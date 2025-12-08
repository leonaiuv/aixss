"use client";

/**
 * 项目编辑页面
 * 包含基础设定、分镜规划、分镜细化、提示词导出
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { useConfigStore } from '@/store/config-store';
import { StepNavigation } from '@/components/project/step-navigation';
import { BasicSettingsForm } from '@/components/project/basic-settings-form';
import { SceneListEditor } from '@/components/project/scene-list-editor';
import { SceneRefiner } from '@/components/project/scene-refiner';
import { PromptExporter } from '@/components/project/prompt-exporter';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { Button } from '@/components/ui/button';
import type { WorkflowState } from '@/types';

// ==========================================
// 步骤定义
// ==========================================
type Step = 'settings' | 'scenes' | 'refine' | 'export';

const STEP_CONFIG: Record<Step, { title: string; description: string }> = {
  settings: { title: '基础设定', description: '设置项目基本信息' },
  scenes: { title: '分镜规划', description: '生成和编辑分镜列表' },
  refine: { title: '分镜细化', description: '为每个分镜生成详细描述和提示词' },
  export: { title: '整合输出', description: '复制完整的提示词文档' },
};

// 工作流状态到步骤的映射
function workflowToStep(state: WorkflowState): Step {
  switch (state) {
    case 'IDLE':
    case 'DATA_COLLECTING':
    case 'DATA_COLLECTED':
      return 'settings';
    case 'SCENE_LIST_GENERATING':
    case 'SCENE_LIST_EDITING':
    case 'SCENE_LIST_CONFIRMED':
      return 'scenes';
    case 'SCENE_PROCESSING':
      return 'refine';
    case 'ALL_SCENES_COMPLETE':
    case 'EXPORTING':
      return 'export';
    default:
      return 'settings';
  }
}

// ==========================================
// 页面组件
// ==========================================
export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { getProjectById, setCurrentProject, updateProject } = useProjectStore();
  const { isConfigured, loadConfig } = useConfigStore();
  
  const project = getProjectById(projectId);
  
  // 根据工作流状态计算当前步骤
  const currentStep: Step = project ? workflowToStep(project.workflowState) : 'settings';

  // 加载配置和设置当前项目
  useEffect(() => {
    loadConfig();
    if (projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject, loadConfig]);

  // 项目不存在
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">项目不存在</h1>
          <Button onClick={() => router.push('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  // 切换步骤（通过更新工作流状态）
  const handleStepChange = (step: Step) => {
    const stateMap: Record<Step, WorkflowState> = {
      settings: 'DATA_COLLECTING',
      scenes: 'SCENE_LIST_EDITING',
      refine: 'SCENE_PROCESSING',
      export: 'ALL_SCENES_COMPLETE',
    };
    updateProject(projectId, { workflowState: stateMap[step] });
  };

  // 更新工作流状态
  const handleWorkflowChange = (state: WorkflowState) => {
    updateProject(projectId, { workflowState: state });
  };

  // 渲染当前步骤的内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 'settings':
        return (
          <BasicSettingsForm
            project={project}
            onNext={() => handleWorkflowChange('SCENE_LIST_GENERATING')}
          />
        );
      case 'scenes':
        return (
          <SceneListEditor
            project={project}
            onNext={() => handleWorkflowChange('SCENE_PROCESSING')}
            onBack={() => handleWorkflowChange('DATA_COLLECTING')}
          />
        );
      case 'refine':
        return (
          <SceneRefiner
            project={project}
            onNext={() => handleWorkflowChange('ALL_SCENES_COMPLETE')}
            onBack={() => handleWorkflowChange('SCENE_LIST_EDITING')}
          />
        );
      case 'export':
        return (
          <PromptExporter
            project={project}
            onBack={() => handleWorkflowChange('SCENE_PROCESSING')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{project.title || '未命名项目'}</h1>
              <p className="text-xs text-muted-foreground">
                {STEP_CONFIG[currentStep].description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isConfigured && (
              <span className="text-sm text-destructive mr-2">
                请配置 API Key
              </span>
            )}
            <SettingsDialog>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </SettingsDialog>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="flex gap-8">
          {/* 左侧步骤导航 */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <StepNavigation
              currentStep={currentStep}
              project={project}
              onStepChange={handleStepChange}
            />
          </aside>

          {/* 主内容区 */}
          <main className="flex-1 min-w-0">
            {renderStepContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
