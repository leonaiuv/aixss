/**
 * 提示词模板测试
 */
import { describe, it, expect } from 'vitest';
import { fillTemplate, parseSceneListResponse, PROMPT_TEMPLATES } from '@/lib/prompts';

describe('提示词模板', () => {
  describe('fillTemplate', () => {
    it('应该正确替换模板变量', () => {
      const template = '你好，{{name}}！欢迎来到{{place}}。';
      const result = fillTemplate(template, { name: '测试用户', place: '漫剧创作' });
      expect(result).toBe('你好，测试用户！欢迎来到漫剧创作。');
    });

    it('应该保留未提供的变量占位符', () => {
      const template = '项目：{{title}}，风格：{{style}}';
      const result = fillTemplate(template, { title: '测试项目' });
      // 当变量未提供时，保留原始占位符
      expect(result).toBe('项目：测试项目，风格：{{style}}');
    });

    it('应该处理条件块 - 变量存在', () => {
      const template = '{{#if name}}你好，{{name}}{{/if}}';
      const result = fillTemplate(template, { name: '用户' });
      expect(result).toContain('你好，用户');
    });

    it('应该处理条件块 - 变量不存在', () => {
      const template = '开始{{#if name}}，你好 {{name}}{{/if}}结束';
      const result = fillTemplate(template, {});
      expect(result).toBe('开始结束');
    });
  });

  describe('parseSceneListResponse', () => {
    it('应该正确解析编号列表格式', () => {
      const response = `1. 废料场相遇
2. 神秘信号
3. 追逐战
4. 真相揭露`;
      const scenes = parseSceneListResponse(response);
      expect(scenes).toHaveLength(4);
      expect(scenes[0]).toBe('废料场相遇');
      expect(scenes[1]).toBe('神秘信号');
      expect(scenes[2]).toBe('追逐战');
      expect(scenes[3]).toBe('真相揭露');
    });

    it('应该处理带方括号的格式', () => {
      const response = `1. [开场画面]
2. [冲突升级]
3. [高潮对决]`;
      const scenes = parseSceneListResponse(response);
      expect(scenes).toHaveLength(3);
      expect(scenes[0]).toBe('开场画面');
    });

    it('应该处理中文顿号格式', () => {
      const response = `1、第一幕
2、第二幕`;
      const scenes = parseSceneListResponse(response);
      expect(scenes).toHaveLength(2);
    });

    it('应该忽略空行', () => {
      const response = `1. 场景一

2. 场景二

`;
      const scenes = parseSceneListResponse(response);
      expect(scenes).toHaveLength(2);
    });
  });

  describe('PROMPT_TEMPLATES', () => {
    it('应该包含所有必需的模板', () => {
      expect(PROMPT_TEMPLATES.sceneList).toBeDefined();
      expect(PROMPT_TEMPLATES.sceneDescription).toBeDefined();
      expect(PROMPT_TEMPLATES.actionDescription).toBeDefined();
      expect(PROMPT_TEMPLATES.shotPrompt).toBeDefined();
    });

    it('模板应该包含必要的属性', () => {
      const template = PROMPT_TEMPLATES.sceneList;
      expect(template.name).toBe('generate_scene_list');
      expect(template.systemPrompt).toBeTruthy();
      expect(template.userPromptTemplate).toBeTruthy();
      expect(template.maxTokens).toBeGreaterThan(0);
    });
  });
});
