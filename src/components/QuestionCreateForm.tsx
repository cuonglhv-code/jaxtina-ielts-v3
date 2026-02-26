'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Field }  from '@/components/ui/Field'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

type FormData = {
  task:                  'task1' | 'task2'
  task1_type:            string
  task2_question_type:   string
  prompt_text:           string
  image_url:             string
  visual_description:    string
  difficulty:            string
  topic_tags:            string
  metadata_raw:          string
}

const INITIAL: FormData = {
  task: 'task2', task1_type: 'graph', task2_question_type: 'agree_disagree',
  prompt_text: '', image_url: '', visual_description: '',
  difficulty: '2', topic_tags: '', metadata_raw: '{}',
}

export function QuestionCreateForm({ onClose, onSuccess }: Props) {
  const supabase = createClient()
  const [form,    setForm]    = useState<FormData>(INITIAL)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.prompt_text.trim()) { setError('Prompt text is required.'); return }

    let metadata: unknown
    try { metadata = JSON.parse(form.metadata_raw) }
    catch { setError('Metadata must be valid JSON (e.g. {}).'); return }

    const payload = {
      task:                 form.task,
      task1_type:           form.task === 'task1' ? form.task1_type : null,
      task2_question_type:  form.task === 'task2' ? form.task2_question_type : null,
      prompt_text:          form.prompt_text.trim(),
      image_url:            form.image_url.trim()          || null,
      visual_description:   form.visual_description.trim() || null,
      difficulty:           Number(form.difficulty),
      topic_tags:           form.topic_tags.split(',').map(t => t.trim()).filter(Boolean),
      metadata,
    }

    setLoading(true)
    const { error: dbError } = await supabase.from('writing_prompts').insert(payload)
    setLoading(false)

    if (dbError) { setError(dbError.message); return }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Add Question</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <Field label="Task" required>
          <select value={form.task} onChange={set('task')}>
            <option value="task2">Task 2 — Essay</option>
            <option value="task1">Task 1 — Report</option>
          </select>
        </Field>

        {form.task === 'task1' && (
          <Field label="Task 1 Type" required>
            <select value={form.task1_type} onChange={set('task1_type')}>
              <option value="graph">Graph / Chart</option>
              <option value="table">Table</option>
              <option value="process">Process</option>
              <option value="map">Map</option>
            </select>
          </Field>
        )}

        {form.task === 'task2' && (
          <Field label="Question Type" required>
            <select value={form.task2_question_type} onChange={set('task2_question_type')}>
              <option value="agree_disagree">Agree / Disagree</option>
              <option value="discuss_both_views">Discuss Both Views</option>
              <option value="problem_solution">Problem / Solution</option>
              <option value="advantages_disadvantages">Advantages & Disadvantages</option>
              <option value="two_direct_questions">Two Direct Questions</option>
            </select>
          </Field>
        )}

        <Field label="Prompt Text" required>
          <textarea value={form.prompt_text} onChange={set('prompt_text')} rows={5} required />
        </Field>

        {form.task === 'task1' && (
          <>
            <Field
              label="Visual Description (for AI marking)"
              hint="Describe the chart/map/diagram in plain text so the AI can assess whether the student described it accurately."
            >
              <textarea value={form.visual_description} onChange={set('visual_description')} rows={3} />
            </Field>
            <Field label="Image URL (optional)" hint="A URL to the actual image if you have one.">
              <input type="url" value={form.image_url} onChange={set('image_url')} />
            </Field>
          </>
        )}

        <Field label="Difficulty">
          <select value={form.difficulty} onChange={set('difficulty')}>
            <option value="1">1 — Foundation (Band 4–5)</option>
            <option value="2">2 — Intermediate (Band 5.5–6.5)</option>
            <option value="3">3 — Advanced (Band 7+)</option>
          </select>
        </Field>

        <Field label="Topic Tags" hint="Comma-separated, e.g: technology, health, environment">
          <input type="text" value={form.topic_tags} onChange={set('topic_tags')} placeholder="technology, health" />
        </Field>

        <Field label="Metadata (JSON)" hint='Extra structured data. For simple questions use {}'>
          <textarea value={form.metadata_raw} onChange={set('metadata_raw')} rows={2}
            className="font-mono text-xs" />
        </Field>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save Question</Button>
        </div>
      </form>
    </div>
  )
}
