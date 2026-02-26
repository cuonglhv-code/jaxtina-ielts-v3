'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient }       from '@/lib/supabase/client'
import { Task1Instructions }  from '@/components/Task1Instructions'
import { FeedbackPanel }      from '@/components/FeedbackPanel'
import { Button }             from '@/components/ui/Button'
import type { WritingPrompt, Task1Prompt } from '@/types/prompt'
import type { ExaminerFeedback }           from '@/types/submission'

const countWords = (s: string) =>
  s.trim() === '' ? 0 : s.trim().split(/\s+/).filter(Boolean).length

function Timer({
  secs, running, onEnd,
}: { secs: number; running: boolean; onEnd: () => void }) {
  const [t, setT]     = useState(secs)
  const ref           = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!running) { clearInterval(ref.current); return }
    ref.current = setInterval(() => {
      setT(p => { if (p <= 1) { clearInterval(ref.current); onEnd(); return 0 } return p - 1 })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [running, onEnd])

  const m = Math.floor(t / 60)
  const s = t % 60
  const urgent = t < 300

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${urgent ? 'text-red-600 animate-pulse' : 'text-slate-600'}`}>
      ⏱ {String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  )
}

export default function PracticePage() {
  const supabase = createClient()

  const [taskType,      setTaskType]      = useState<'task1' | 'task2'>('task2')
  const [prompts,       setPrompts]       = useState<WritingPrompt[]>([])
  const [selectedId,    setSelectedId]    = useState<string>('')
  const [essay,         setEssay]         = useState('')
  const [timerRunning,  setTimerRunning]  = useState(false)
  const [submitted,     setSubmitted]     = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [feedback,      setFeedback]      = useState<ExaminerFeedback | null>(null)
  const [error,         setError]         = useState('')
  const feedbackRef = useRef<HTMLDivElement>(null)

  const wordCount = countWords(essay)
  const minWords  = taskType === 'task1' ? 150 : 250
  const recWords  = taskType === 'task1' ? '155–175' : '250–280'
  const timerSecs = taskType === 'task1' ? 1200 : 2400
  const wordPct   = Math.min((wordCount / (minWords * 1.15)) * 100, 100)

  const currentPrompt = prompts.find(p => p.id === selectedId) ?? prompts[0] ?? null

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('writing_prompts')
        .select('*')
        .eq('task', taskType)
        .order('created_at', { ascending: true })
      if (data?.length) {
        setPrompts(data as WritingPrompt[])
        setSelectedId(data[0].id)
      }
    }
    load()
    setEssay(''); setFeedback(null); setSubmitted(false); setTimerRunning(false); setError('')
  }, [taskType])

  async function submitEssay() {
    if (!currentPrompt) return
    if (wordCount < 20) { setError('Please write at least 20 words.'); return }
    setLoading(true); setError(''); setFeedback(null)

    try {
      const res = await fetch('/api/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essay,
          promptText: currentPrompt.prompt_text,
          taskType,
          wordCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Marking failed')
      setFeedback(data.feedback)
      setSubmitted(true)
      setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred. Please try again.')
    }
    setLoading(false)
  }

  function reset() {
    setEssay(''); setFeedback(null); setSubmitted(false)
    setTimerRunning(false); setError('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Task type selector */}
      {!submitted && (
        <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
          {(['task2', 'task1'] as const).map(t => (
            <button key={t} onClick={() => setTaskType(t)}
              className={`py-3 px-4 rounded-xl border text-left transition-all ${
                taskType === t
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white hover:border-teal-300'
              }`}>
              <p className={`font-bold text-sm ${taskType === t ? 'text-teal-700' : 'text-slate-700'}`}>
                {t === 'task2' ? 'Task 2 — Essay' : 'Task 1 — Report'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {t === 'task2' ? '40 min · 250+ words' : '20 min · 150+ words'}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Prompt selector */}
          {!submitted && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Select Question</p>
              <div className="flex gap-2 flex-wrap mb-4">
                {prompts.map(p => (
                  <button key={p.id}
                    onClick={() => { setSelectedId(p.id); setEssay(''); setError('') }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      selectedId === p.id
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'border-slate-200 text-slate-600 hover:border-teal-300'
                    }`}>
                    {p.task === 'task1' ? (p as Task1Prompt).task1_type : p.task2_question_type?.replace(/_/g,' ')}
                  </button>
                ))}
              </div>

              {/* Timer */}
              <div className="flex items-center justify-between">
                <div />
                <div className="flex items-center gap-3">
                  {timerRunning
                    ? <Timer secs={timerSecs} running={timerRunning} onEnd={() => { setTimerRunning(false); submitEssay() }} />
                    : (
                      <button onClick={() => setTimerRunning(true)}
                        className="text-xs text-teal-700 border border-teal-300 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors">
                        ▶ Start {taskType === 'task1' ? '20' : '40'}min Timer
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Question text */}
          {currentPrompt && !submitted && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              {currentPrompt.task === 'task1' ? (
                <Task1Instructions prompt={currentPrompt as Task1Prompt} />
              ) : (
                <>
                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-3 py-1 rounded-full">
                    Task 2 · {currentPrompt.task2_question_type?.replace(/_/g, ' ')}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mt-2">
                    {currentPrompt.prompt_text}
                  </p>
                  <p className="text-xs text-slate-400">Minimum 250 words · Recommended: 250–280 words</p>
                </>
              )}
            </div>
          )}

          {/* Editor */}
          {!submitted ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Answer</p>
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
                  wordCount >= minWords
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {wordCount} / {minWords}+ words
                </span>
              </div>
              <textarea
                value={essay}
                onChange={e => setEssay(e.target.value)}
                className="w-full p-4 text-sm text-slate-700 leading-relaxed focus:outline-none resize-none"
                style={{ minHeight: 360 }}
                placeholder={`Write your ${taskType === 'task1' ? 'Task 1 report' : 'Task 2 essay'} here…\n\nMinimum ${minWords} words · Recommended ${recWords}\nDo NOT copy the question into your answer`}
              />
              {/* Progress bar */}
              <div className="px-4 pb-2">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${wordPct}%`, background: wordCount >= minWords ? '#0d9488' : '#d97706' }} />
                </div>
              </div>
              <div className="px-4 pb-4 flex items-center justify-between">
                <div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
                <div className="flex gap-2">
                  {wordCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setEssay('')}>Clear</Button>
                  )}
                  <Button
                    onClick={submitEssay}
                    loading={loading}
                    disabled={loading || wordCount < 20}
                  >
                    Submit for Marking →
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Submitted view */
            <div className="space-y-4">
              {/* Submitted essay */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Submitted Essay — {wordCount} words
                  </p>
                  <Button variant="secondary" size="sm" onClick={reset}>↺ Write New Essay</Button>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line max-h-52 overflow-y-auto">
                  {essay}
                </div>
              </div>
              {/* Feedback */}
              <div ref={feedbackRef}>
                {feedback && <FeedbackPanel feedback={feedback} essay={essay} />}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Writing tips */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Tips</p>
            {taskType === 'task2' ? (
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex gap-2"><span className="text-teal-500">✓</span> Address ALL parts of the question.</li>
                <li className="flex gap-2"><span className="text-teal-500">✓</span> State your position clearly in the introduction.</li>
                <li className="flex gap-2"><span className="text-teal-500">✓</span> One main idea per body paragraph.</li>
                <li className="flex gap-2"><span className="text-teal-500">✓</span> Support ideas with specific examples.</li>
                <li className="flex gap-2"><span className="text-teal-500">✓</span> Vary cohesive devices — avoid repeating Furthermore/Moreover.</li>
                <li className="flex gap-2"><span className="text-teal-500">✓</span> Aim for 250–280 words. Quality over length.</li>
              </ul>
            ) : (
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex gap-2"><span className="text-amber-500">✓</span> Write an overview paragraph — no data figures.</li>
                <li className="flex gap-2"><span className="text-amber-500">✓</span> Group data meaningfully; do not list every figure.</li>
                <li className="flex gap-2"><span className="text-amber-500">✓</span> Make comparisons between categories/countries.</li>
                <li className="flex gap-2"><span className="text-amber-500">✓</span> Use varied language for trends and changes.</li>
                <li className="flex gap-2"><span className="text-amber-500">✓</span> Aim for 155–175 words.</li>
              </ul>
            )}
          </div>

          {/* Band reference */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Band Reference</p>
            {[
              [9,'Expert','Full operational command'],
              [8,'Very Good','Operational, rare errors'],
              [7,'Good','Operational, some inaccuracy'],
              [6,'Competent','Effective, some inaccuracy'],
              [5,'Modest','Partial command'],
              [4,'Limited','Basic competence'],
            ].map(([b, l, d]) => {
              const bn = Number(b)
              const col = bn >= 7 ? 'bg-teal-50 border-teal-200 text-teal-700' :
                          bn >= 6 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                          bn >= 5 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    'bg-red-50 border-red-200 text-red-700'
              return (
                <div key={String(b)} className="flex items-center gap-2 mb-2">
                  <span className={`w-7 h-7 rounded-lg border text-xs font-black flex items-center justify-center flex-shrink-0 ${col}`}>{b}</span>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{String(l)}</p>
                    <p className="text-xs text-slate-400">{String(d)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scoring formula */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Scoring (4 × 25%)</p>
            {[['TR','Task Response / Achievement'],['CC','Coherence & Cohesion'],['LR','Lexical Resource'],['GRA','Grammatical Range & Accuracy']].map(([k,l]) => (
              <div key={k} className="flex gap-2 mb-2">
                <span className="text-teal-400 font-bold font-mono text-xs w-8">{k}</span>
                <span className="text-slate-300 text-xs">{l}</span>
              </div>
            ))}
            <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">
              Overall = average of 4 criteria (rounded to nearest 0.5)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
