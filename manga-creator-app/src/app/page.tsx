"use client";

/**
 * 首页 - 项目工作台
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Sparkles } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { useConfigStore } from '@/store/config-store';
import { ProjectCard } from '@/components/project/project-card';
import { CreateProjectDialog } from '@/components/project/create-project-dialog';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const { projects, deleteProject, setCurrentProject, isLoading } = useProjectStore();
  const { loadConfig, isConfigured } = useConfigStore();

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 按更新时间排序
  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // 打开项目
  const handleOpenProject = (id: string) => {
    setCurrentProject(id);
    router.push(`/project/${id}`);
  };

  // 删除项目
  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    toast.success('项目已删除');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">漫剧创作助手</span>
          </div>
          <div className="flex items-center gap-2">
            {!isConfigured && (
              <span className="text-sm text-muted-foreground mr-2">
                请先配置 API Key
              </span>
            )}
            <SettingsDialog />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container py-8">
        {/* 标题和操作 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">我的项目</h1>
            <p className="text-muted-foreground mt-1">
              创建和管理你的漫剧创作项目
            </p>
          </div>
          <CreateProjectDialog />
        </div>

        {/* 项目列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : sortedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        ) : (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sparkles className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>还没有项目</EmptyTitle>
              <EmptyDescription>
                创建你的第一个漫剧项目，开启 AI 创作之旅
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <CreateProjectDialog>
                <Button size="lg">
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始创作
                </Button>
              </CreateProjectDialog>
            </EmptyContent>
          </Empty>
        )}
      </main>
    </div>
  );
}
