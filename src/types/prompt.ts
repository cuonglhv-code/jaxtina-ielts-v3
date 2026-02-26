export type Task1Type = 'graph' | 'table' | 'process' | 'map'
export type Task2QuestionType =
  | 'agree_disagree'
  | 'discuss_both_views'
  | 'problem_solution'
  | 'advantages_disadvantages'
  | 'two_direct_questions'

interface BasePrompt {
  id:                  string
  prompt_text:         string
  difficulty:          1 | 2 | 3
  topic_tags:          string[]
  image_url:           string | null
  metadata:            Record<string, unknown>
  created_at:          string
}

export interface GraphPrompt extends BasePrompt {
  task: 'task1'; task1_type: 'graph'
  visual_description: string
  task2_question_type: null
}
export interface TablePrompt extends BasePrompt {
  task: 'task1'; task1_type: 'table'
  visual_description: string
  task2_question_type: null
}
export interface ProcessPrompt extends BasePrompt {
  task: 'task1'; task1_type: 'process'
  visual_description: string
  task2_question_type: null
  metadata: { stages: number; flow: 'linear' | 'cyclical'; inputs?: string[]; output?: string }
}
export interface MapPrompt extends BasePrompt {
  task: 'task1'; task1_type: 'map'
  visual_description: string
  task2_question_type: null
  metadata: { years: [number, number]; key_changes: string[]; retained?: string[] }
}
export interface Task2Prompt extends BasePrompt {
  task: 'task2'
  task1_type: null
  task2_question_type: Task2QuestionType
  visual_description: null
}

export type WritingPrompt = GraphPrompt | TablePrompt | ProcessPrompt | MapPrompt | Task2Prompt
export type Task1Prompt   = GraphPrompt | TablePrompt | ProcessPrompt | MapPrompt
