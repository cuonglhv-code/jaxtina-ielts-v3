export interface CriteriaScores {
  TR:  number
  CC:  number
  LR:  number
  GRA: number
}

export interface ErrorAnnotation {
  quote:      string
  type:       'Grammar' | 'Vocabulary' | 'Spelling' | 'Punctuation'
  issue:      string
  correction: string
}

export interface ExaminerFeedback {
  taskType:            string
  wordCount:           number
  wordCountNote:       string
  criteriaScores: {
    TR:  { band: number; label: string; feedback: string; bandRationale: string }
    CC:  { band: number; label: string; feedback: string; bandRationale: string }
    LR:  { band: number; label: string; feedback: string; bandRationale: string }
    GRA: { band: number; label: string; feedback: string; bandRationale: string }
  }
  overallBand:          number
  examinerSummary:      string
  taskSpecificFeedback: string
  priorityImprovements: string[]
  vocabularyHighlights: { effective: string[]; problematic: string[] }
  errorAnnotations:     ErrorAnnotation[]
  modelParagraph:       string
  originalParagraph:    string
  comparativeLevel:     string
}

export interface Submission {
  id:              string
  student_id:      string
  prompt_id:       string | null
  task_type:       'task1' | 'task2'
  essay_text:      string
  word_count:      number | null
  overall_band:    number | null
  criteria_scores: CriteriaScores | null
  feedback_json:   ExaminerFeedback | null
  created_at:      string
}
