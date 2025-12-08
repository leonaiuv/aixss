/**
 * Project Store 测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/store/project-store';
import type { SceneContextSummary, ProjectContextCache } from '@/types';

// 测试用的默认上下文缓存
const defaultContextCache: ProjectContextCache = {
  styleKeywords: '测试风格',
  protagonistCore: '测试主角',
  storyCore: '测试故事',
  lastUpdated: new Date().toISOString(),
};

// 测试用的默认分镜上下文
const defaultSceneContext: SceneContextSummary = {
  mood: '紧张',
  keyElement: '测试元素',
  transition: '过渡',
};

describe('Project Store', () => {
  beforeEach(() => {
    // 重置 store 状态
    useProjectStore.setState({
      projects: [],
      currentProjectId: null,
      scenes: [],
      isLoading: false,
    });
  });

  describe('createProject', () => {
    it('应该创建新项目并返回ID', () => {
      const store = useProjectStore.getState();
      const projectId = store.createProject({
        title: '测试项目',
        summary: '这是一个测试项目',
        style: '赛博朋克风格',
        protagonist: '机械少女',
        contextCache: defaultContextCache,
        workflowState: 'IDLE',
        currentSceneOrder: 0,
        currentSceneStep: 'scene_description',
      });

      expect(projectId).toBeTruthy();
      expect(store.projects).toHaveLength(0); // getState 是快照

      // 获取最新状态
      const updatedStore = useProjectStore.getState();
      expect(updatedStore.projects).toHaveLength(1);
      expect(updatedStore.projects[0].title).toBe('测试项目');
      expect(updatedStore.currentProjectId).toBe(projectId);
    });
  });

  describe('updateProject', () => {
    it('应该更新项目信息', () => {
      const store = useProjectStore.getState();
      const projectId = store.createProject({
        title: '原始标题',
        summary: '原始摘要',
        style: '风格',
        protagonist: '主角',
        contextCache: defaultContextCache,
        workflowState: 'IDLE',
        currentSceneOrder: 0,
        currentSceneStep: 'scene_description',
      });

      useProjectStore.getState().updateProject(projectId, {
        title: '更新后标题',
        summary: '更新后摘要',
      });

      const updatedProject = useProjectStore.getState().getProjectById(projectId);
      expect(updatedProject?.title).toBe('更新后标题');
      expect(updatedProject?.summary).toBe('更新后摘要');
    });
  });

  describe('deleteProject', () => {
    it('应该删除项目', () => {
      const store = useProjectStore.getState();
      const projectId = store.createProject({
        title: '待删除项目',
        summary: '摘要',
        style: '风格',
        protagonist: '主角',
        contextCache: defaultContextCache,
        workflowState: 'IDLE',
        currentSceneOrder: 0,
        currentSceneStep: 'scene_description',
      });

      expect(useProjectStore.getState().projects).toHaveLength(1);

      useProjectStore.getState().deleteProject(projectId);

      expect(useProjectStore.getState().projects).toHaveLength(0);
      expect(useProjectStore.getState().currentProjectId).toBeNull();
    });
  });

  describe('Scene 管理', () => {
    it('应该添加和更新分镜', () => {
      const store = useProjectStore.getState();
      const projectId = store.createProject({
        title: '项目',
        summary: '摘要',
        style: '风格',
        protagonist: '主角',
        contextCache: defaultContextCache,
        workflowState: 'IDLE',
        currentSceneOrder: 0,
        currentSceneStep: 'scene_description',
      });

      const sceneId = useProjectStore.getState().addScene({
        projectId,
        order: 1,
        summary: '第一个分镜',
        sceneDescription: '',
        actionDescription: '',
        shotPrompt: '',
        contextSummary: defaultSceneContext,
        status: 'pending',
        notes: '',
      });

      expect(sceneId).toBeTruthy();

      useProjectStore.getState().updateScene(sceneId, {
        sceneDescription: '详细场景描述',
      });

      const scenes = useProjectStore.getState().getScenesByProjectId(projectId);
      expect(scenes).toHaveLength(1);
      expect(scenes[0].sceneDescription).toBe('详细场景描述');
    });

    it('应该正确排序分镜', () => {
      const store = useProjectStore.getState();
      const projectId = store.createProject({
        title: '项目',
        summary: '摘要',
        style: '风格',
        protagonist: '主角',
        contextCache: defaultContextCache,
        workflowState: 'IDLE',
        currentSceneOrder: 0,
        currentSceneStep: 'scene_description',
      });

      const createScene = (order: number, summary: string) => ({
        projectId,
        order,
        summary,
        sceneDescription: '',
        actionDescription: '',
        shotPrompt: '',
        contextSummary: defaultSceneContext,
        status: 'pending' as const,
        notes: '',
      });

      const scene1 = useProjectStore.getState().addScene(createScene(1, '场景1'));
      const scene2 = useProjectStore.getState().addScene(createScene(2, '场景2'));
      const scene3 = useProjectStore.getState().addScene(createScene(3, '场景3'));

      // 重新排序
      useProjectStore.getState().reorderScenes([scene3, scene1, scene2]);

      const scenes = useProjectStore.getState().getScenesByProjectId(projectId);
      expect(scenes[0].summary).toBe('场景3');
      expect(scenes[0].order).toBe(1);
    });
  });

  describe('工作流状态', () => {
    it('应该更新工作流状态', () => {
      const store = useProjectStore.getState();
      const projectId = store.createProject({
        title: '项目',
        summary: '摘要',
        style: '风格',
        protagonist: '主角',
        contextCache: defaultContextCache,
        workflowState: 'IDLE',
        currentSceneOrder: 0,
        currentSceneStep: 'scene_description',
      });

      useProjectStore.getState().setWorkflowState(projectId, 'DATA_COLLECTED');

      const project = useProjectStore.getState().getProjectById(projectId);
      expect(project?.workflowState).toBe('DATA_COLLECTED');
    });
  });
});
