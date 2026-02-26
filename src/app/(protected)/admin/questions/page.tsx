'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient }        from '@/lib/supabase/client'
import { QuestionCreateForm }  from '@/components/QuestionCreateForm'
import { Button }              from '@/components/ui/Button'
import { Tag }                 from '@/components/ui/Tag'
import type { WritingPrompt }  from '@/types/prompt'

const PAGE_SIZE = 20

type Filters = {
  task:               'all' | 'task1' | 'task2'
  task1_type:         string
  task2_question_type:string
  difficulty:         string
}

type Candidate = {
  task: string; task1_type: string | null; task2_question_type: string | null
  prompt_text: string; difficulty: number; topic_tags: string[]
  visual_description: string | null; metadata: Record<string, unknown>
}

export default function AdminQuestionsPage() {
  const supabase = createClient()

  const [prompts,      setPrompts]      = useState<WritingPrompt[]>([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(0)
  const [filters,      setFilters]      = useState<Filters>({ task:'all', task1_type:'all', task2_question_type:'all', difficulty:'0' })
  const [showCreate,   setShowCreate]   = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [genLoading,   setGenLoading]   = useState(false)
  const [candidates,   setCandidates]   = useState<Candidate[] | null>(null)
  const [approved,     setApproved]     = useState<Set<number>>(new Set())
  const [genError,     setGenError]     = useState('')

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('writing_prompts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filters.task !== 'all')
      q = q.eq('task', filters.task)
    if (filters.task1_type !== 'all' && filters.task !== 'task2')
      q = q.eq('task1_type', filters.task1_type)
    if (filters.task2_question_type !== 'all' && filters.task !== 'task1')
      q = q.eq('task2_question_type', filters.task2_question_type)
    if (filters.difficulty !== '0')
      q = q.eq('difficulty', Number(filters.difficulty))

    const { data, count } = await q
    setPrompts((data ?? []) as WritingPrompt[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, filters])

  useEffect(() => { fetchPrompts() }, [fetchPrompts])

  async function deletePrompt(id: string) {
    if (!confirm('Delete this question permanently? This cannot be undone.')) return
    await supabase.from('writing_prompts').delete().eq('id', id)
    fetchPrompts()
  }

  async function generateQuestions() {
    setGenLoading(true); setGenError(''); setCandidates(null); setApproved(new Set())
    const res  = await fetch('/api/admin/generate-questions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        task:               filters.task === 'all' ? 'task2' : filters.task,
        count:              3,
        task1_type:         filters.task1_type !== 'all' ? filters.task1_type : undefined,
        task2_question_type:filters.task2_question_type !== 'all' ? filters.task2_question_type : undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setGenError(json.error ?? 'Generation failed.'); setGenLoading(false); return }
    setCandidates(json.candidates ?? [])
    setGenLoading(false)
  }

  async function insertApproved() {
    if (!candidates) return
    const toInsert = candidates.filter((_, i) => approved.has(i))
    if (!toInsert.length) { setCandidates(null); return }
    await supabase.from('writing_prompts').insert(toInsert)
    setCandidates(null); setApproved(new Set())
    fetchPrompts()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Question Bank</h1>
          <p className="text-sm text-slate-400 mt-1">{total} questions · Teachers and admins only</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={generateQuestions} loading={genLoading} size="sm">
            ✨ AI Generate
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm">+ Add Question</Button>
        </div>
      </div>

      {genError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {genError}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 flex-wrap items-center">
        <FilterSel label="Task" value={filters.task}
          options={[['all','All tasks'],['task1','Task 1'],['task2','Task 2']]}
          onChange={v => { setFilters(f => ({ ...f, task: v as Filters['task'] })); setPage(0) }} />

        {filters.task !== 'task2' && (
          <FilterSel label="T1 Type" value={filters.task1_type}
            options={[['all','All'],['graph','Graph'],['table','Table'],['process','Process'],['map','Map']]}
            onChange={v => { setFilters(f => ({ ...f, task1_type: v })); setPage(0) }} />
        )}

        {filters.task !== 'task1' && (
          <FilterSel label="T2 Type" value={filters.task2_question_type}
            options={[
              ['all','All'],['agree_disagree','Agree/Disagree'],
              ['discuss_both_views','Discuss Both Views'],['problem_solution','Problem/Solution'],
              ['advantages_disadvantages','Adv/Disadv'],['two_direct_questions','Two Questions'],
            ]}
            onChange={v => { setFilters(f => ({ ...f, task2_question_type: v })); setPage(0) }} />
        )}

        <FilterSel label="Difficulty" value={filters.difficulty}
          options={[['0','All'],['1','Foundation'],['2','Intermediate'],['3','Advanced']]}
          onChange={v => { setFilters(f => ({ ...f, difficulty: v })); setPage(0) }} />

        {(filters.task !== 'all' || filters.difficulty !== '0') && (
          <button onClick={() => { setFilters({ task:'all', task1_type:'all', task2_question_type:'all', difficulty:'0' }); setPage(0) }}
            className="text-xs text-slate-400 hover:text-slate-600 underline">
            Clear filters
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading questions…</div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
          <p className="text-slate-400 text-sm">No questions match the current filters.</p>
          <button onClick={() => setShowCreate(true)} className="text-teal-600 text-sm font-semibold mt-2 hover:underline">
            Add the first question →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
          {prompts.map(p => (
            <div key={p.id} className="p-4 flex gap-4 items-start hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 flex-wrap mb-2">
                  <Tag color="teal">{p.task === 'task1' ? 'Task 1' : 'Task 2'}</Tag>
                  {p.task === 'task1' && p.task1_type && (
                    <Tag color="amber">{p.task1_type}</Tag>
                  )}
                  {p.task === 'task2' && p.task2_question_type && (
                    <Tag color="indigo">{p.task2_question_type.replace(/_/g, ' ')}</Tag>
                  )}
                  <Tag color={(['','slate','teal','purple'] as const)[p.difficulty]}>
                    {(['','Foundation','Intermediate','Advanced'])[p.difficulty]}
                  </Tag>
                  {p.topic_tags?.slice(0,3).map(t => (
                    <Tag key={t} color="slate">{t}</Tag>
                  ))}
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{p.prompt_text}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Added {new Date(p.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                </p>
              </div>
              <button onClick={() => deletePrompt(p.id)}
                className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2 py-1 rounded-lg transition-colors">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={page === 0}
              onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <span className="text-xs font-mono">Page {page + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <QuestionCreateForm
          onClose={()   => setShowCreate(false)}
          onSuccess={()  => { setShowCreate(false); fetchPrompts() }}
        />
      )}

      {/* AI candidate review modal */}
      {candidates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Review AI-Generated Questions</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Tick the questions you want to add. None are saved until you click &quot;Add Selected&quot;.
                </p>
              </div>
              <button onClick={() => setCandidates(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            {candidates.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No questions were generated. Try again.</p>
            ) : (
              candidates.map((c, i) => (
                <div key={i}
                  onClick={() => setApproved(prev => {
                    const next = new Set(prev)
                    next.has(i) ? next.delete(i) : next.add(i)
                    return next
                  })}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    approved.has(i) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'
                  }`}>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <Tag color="teal">{c.task === 'task1' ? 'Task 1' : 'Task 2'}</Tag>
                    {c.task1_type && <Tag color="amber">{c.task1_type}</Tag>}
                    {c.task2_question_type && <Tag color="indigo">{String(c.task2_question_type).replace(/_/g,' ')}</Tag>}
                    <Tag color="slate">Difficulty {c.difficulty}</Tag>
                    {approved.has(i) && <span className="text-xs text-teal-700 font-bold">✓ Selected</span>}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.prompt_text}</p>
                </div>
              ))
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setCandidates(null)}>Cancel</Button>
              <Button onClick={insertApproved} disabled={approved.size === 0}>
                Add {approved.size} selected question{approved.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterSel({ label, value, options, onChange }: {
  label: string; value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-500 text-xs uppercase tracking-wide">{label}:</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
