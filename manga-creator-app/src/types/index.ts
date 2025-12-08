/**
 * 漫剧创作助手 - 核心类型定义
 * 基于 PRD v2.1-final 设计
 */

// ==========================================
// 工作流状态
// ==========================================
export type WorkflowState =
  | 'IDLE'                    // 初始状态
  | 'DATA_COLLECTING'         // 基础信息填写中
  | 'DATA_COLLECTED'          // 基础信息已填写
  | 'SCENE_LIST_GENERATING'   // 分镜列表生成中
  | 'SCENE_LIST_EDITING'      // 分镜列表编辑中
  | 'SCENE_LIST_CONFIRMED'    // 分镜列表已确认
  | 'SCENE_PROCESSING'        // 分镜细化进行中
  | 'ALL_SCENES_COMPLETE'     // 全部完成
  | 'EXPORTING';              // 导出中

// ==========================================
// 分镜处理步骤
// ==========================================
export type SceneStep = 
  | 'scene_description'   // 生成场景描述
  | 'action_description'  // 生成动作描述
  | 'shot_prompt';        // 生成镜头提示词

// ==========================================
// 分镜状态
// ==========================================
export type SceneStatus = 
  | 'pending'              // 待处理
  | 'scene_generating'     // 场景生成中
  | 'scene_confirmed'      // 场景已确认
  | 'action_generating'    // 动作生成中
  | 'action_confirmed'     // 动作已确认
  | 'prompt_generating'    // 提示词生成中
  | 'completed'            // 全部完成
  | 'needs_update';        // 需更新（上游修改导致）

// ==========================================
// 项目上下文缓存
// ==========================================
export interface ProjectContextCache {
  styleKeywords: string;         // 视觉风格关键词（20字内）
  protagonistCore: string;       // 主角核心特征（50字内）
  storyCore: string;             // 故事核心（100字内）
  lastUpdated: string;           // 缓存更新时间
}

// ==========================================
// 项目实体
// ==========================================
export interface Project {
  id: string;                    // UUID，主键
  title: string;                 // 项目名称
  
  // === 基础设定（L0-L2层融合） ===
  summary: string;               // 故事梗概
  style: string;                 // 视觉风格
  protagonist: string;           // 主角描述
  
  // === 上下文压缩缓存（用于AI调用） ===
  contextCache: ProjectContextCache;
  
  // === 工作流状态 ===
  workflowState: WorkflowState;  // 当前工作流状态
  currentSceneOrder: number;     // 当前处理的分镜序号
  currentSceneStep: SceneStep;   // 当前分镜的处理步骤
  
  // === 元数据 ===
  createdAt: string;             // 创建时间 ISO
  updatedAt: string;             // 更新时间 ISO
}

// ==========================================
// 分镜上下文摘要
// ==========================================
export interface SceneContextSummary {
  mood: string;            // 情绪基调，5字内
  keyElement: string;      // 核心视觉元素，15字内
  transition: string;      // 与下一分镜的过渡提示，20字内
}

// ==========================================
// 分镜实体
// ==========================================
export interface Scene {
  id: string;              // UUID，主键
  projectId: string;       // 外键，关联Project.id
  order: number;           // 分镜序号
  
  // === 分镜内容 ===
  summary: string;             // 分镜概要（用于列表展示，10-20字）
  sceneDescription: string;    // 场景描述（用户确认后）
  actionDescription: string;   // 动作描述（用户确认后）
  shotPrompt: string;          // 镜头提示词（用户确认后）
  
  // === 上下文摘要（用于后续分镜参考） ===
  contextSummary: SceneContextSummary;
  
  // === 状态管理 ===
  status: SceneStatus;         // 分镜状态
  notes: string;               // 用户备注
}

// ==========================================
// 用户配置
// ==========================================
export type AIProvider = 'deepseek' | 'kimi' | 'gemini' | 'openai-compatible';

export interface UserConfig {
  provider: AIProvider;
  apiKey: string;        // 加密存储
  baseURL?: string;      // 可选，用于自定义端点
  model: string;         // 如 'deepseek-chat'
}

// ==========================================
// 上下文类型枚举（用于AI Agent层）
// ==========================================
export type ContextType = 
  | 'project_essence'      // 项目核心信息（压缩后）
  | 'current_scene'        // 当前分镜完整信息
  | 'current_scene_summary' // 当前分镜概要
  | 'prev_scene_summary'   // 前一分镜摘要
  | 'confirmed_content'    // 已确认的当前步骤内容
  | 'scene_list_overview'; // 分镜列表概览

// ==========================================
// 生成任务类型
// ==========================================
export type TaskType = 
  | 'generate_scene_list'     // 生成分镜列表
  | 'generate_scene_desc'     // 生成场景描述
  | 'generate_action_desc'    // 生成动作描述
  | 'generate_shot_prompt'    // 生成镜头提示词
  | 'regenerate';             // 重新生成

// ==========================================
// 生成任务定义
// ==========================================
export interface GenerationTask {
  id: string;
  type: TaskType;
  projectId: string;
  sceneId?: string;
  sceneOrder?: number;
  retryCount: number;
  createdAt: string;
}

// ==========================================
// 生成结果
// ==========================================
export interface GenerationResult {
  success: boolean;
  content?: string;
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ==========================================
// 聊天消息类型
// ==========================================
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ==========================================
// LocalStorage Schema
// ==========================================
export interface LocalStorageSchema {
  'aixs_version': string;                 // 数据结构版本号
  'aixs_projects': Project[];             // 项目列表
  'aixs_scenes_{projectId}': Scene[];     // 各项目的分镜
  'aixs_config': UserConfig;              // 用户API配置（加密）
}
