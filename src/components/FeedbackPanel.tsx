'use client'

import { useState } from 'react'
import type { ExaminerFeedback } from '@/types/submission'

interface Props {
  feedback: ExaminerFeedback
  essay:    string
}

const BAND_DESCRIPTORS: Record<string, Record<number, string>> = {
  TR: {
    9: 'Fully addresses all parts; position fully developed and well-supported.',
    8: 'Sufficiently addresses all parts; well-developed and relevant.',
    7: 'All parts addressed; clear position; main ideas extended but may over-generalise.',
    6.5: 'All parts addressed but one area underdeveloped; position occasionally unclear.',
    6: 'All parts addressed though some less fully; some ideas inadequately developed.',
    5.5: 'Partial task completion; position present but development often unclear.',
    5: 'Addresses task only partially; main ideas limited.',
    4: 'Responds minimally; position unclear; ideas repetitive.',
  },
  CC: {
    9: 'Cohesion attracts no attention; paragraphing managed with complete skill.',
    8: 'Logically sequenced; cohesion managed well; appropriate paragraphing.',
    7: 'Clear progression; cohesive devices used appropriately with minor over/under-use.',
    6.5: 'Clear progression overall but mechanical device use or minor paragraphing lapses.',
    6: 'Coherent with clear overall progression; some faulty cohesive device use.',
    5.5: 'Organisation present but progression inconsistent; devices over-relied upon.',
    5: 'Some organisation but no clear progression; inadequate cohesive devices.',
    4: 'Ideas not arranged coherently; cohesive devices basic and inaccurate.',
  },
  LR: {
    9: 'Wide range; very natural, sophisticated control; rare slips only.',
    8: 'Wide, fluent range; skilful uncommon lexis use; rare collocational inaccuracy.',
    7: 'Sufficient range; less common lexis with style awareness; occasional minor errors.',
    6.5: 'Adequate range; less common vocabulary attempted with some collocational errors.',
    6: 'Adequate range; attempts less common vocabulary with some inaccuracy.',
    5.5: 'Limited range beginning to impede; errors in spelling and word formation noticeable.',
    5: 'Limited range; minimal adequacy; errors cause difficulty.',
    4: 'Basic vocabulary; repetitive or inappropriate; errors cause strain.',
  },
  GRA: {
    9: 'Wide range of structures; full flexibility and accuracy; rare minor slips.',
    8: 'Wide range; majority error-free; very occasional errors.',
    7: 'Variety of complex structures; frequent error-free sentences; few errors.',
    6.5: 'Simple and complex mix; complex structures attempted but accuracy inconsistent.',
    6: 'Mix of simple and complex; some errors rarely reducing communication.',
    5.5: 'Attempts complex structures; frequent errors; simple more reliable than complex.',
    5: 'Limited range; frequent grammatical errors; punctuation faulty.',
    4: 'Very limited range; errors predominate; punctuation often faulty.',
  },
}

function bandTheme(b: number) {
  if (b >= 7) return { bar: '#0d9488', text: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' }
  if (b >= 6) return { bar: '#6366f1', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' }
  if (b >= 5) return { bar: '#d97706', text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' }
  return             { bar: '#dc2626', text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' }
}

function bandLabel(b: number) {
  if (b >= 9) return 'Expert User'
  if (b >= 8) return 'Very Good User'
  if (b >= 7) return 'Good User'
  if (b >= 6) return 'Competent User'
  if (b >= 5) return 'Modest User'
  return 'Limited User'
}

function BandBar({ band }: { band: number }) {
  const pct = ((band - 1) / 8) * 100
  const { bar } = bandTheme(band)
  return (
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: bar }} />
    </div>
  )
}

const TYPE_COLOURS: Record<string, string> = {
  Grammar:     'bg-amber-100 text-amber-800 border-amber-200',
  Vocabulary:  'bg-indigo-100 text-indigo-800 border-indigo-200',
  Spelling:    'bg-red-100 text-red-800 border-red-200',
  Punctuation: 'bg-green-100 text-green-800 border-green-200',
}

export function FeedbackPanel({ feedback: f }: Props) {
  const [tab, setTab] = useState<'overview' | 'criteria' | 'errors' | 'improve' | 'model'>('overview')
  const criteria = Object.entries(f.criteriaScores) as [string, { band: number; label: string; feedback: string; bandRationale: string }][]
  const { text: overallText } = bandTheme(f.overallBand)

  const tabs = [
    { k: 'overview', l: '📋 Overview' },
    { k: 'criteria', l: '🔍 Criteria' },
    { k: 'errors',   l: '⚠️ Errors'  },
    { k: 'improve',  l: '🎯 Improve' },
    { k: 'model',    l: '✍️ Model'   },
  ] as const

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
              Senior Examiner Assessment · {f.taskType} · {f.wordCount} words
            </p>
            <h2 className="text-2xl font-black mt-1">
              Overall Band:{' '}
              <span className={f.overallBand >= 7 ? 'text-teal-400' : f.overallBand >= 6 ? 'text-indigo-400' : f.overallBand >= 5 ? 'text-amber-400' : 'text-red-400'}>
                {f.overallBand}
              </span>
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">{bandLabel(f.overallBand)}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center min-w-[60px]">
            <p className="text-3xl font-black">{f.overallBand}</p>
            <p className="text-xs text-slate-400">/9.0</p>
          </div>
        </div>
        {/* 4 mini criterion scores */}
        <div className="grid grid-cols-4 gap-2">
          {criteria.map(([key, c]) => (
            <div key={key} className="bg-white/8 rounded-lg p-2.5 text-center">
              <p className="text-slate-400 text-xs font-bold uppercase">{key}</p>
              <p className={`text-xl font-black mt-0.5 ${
                c.band >= 7 ? 'text-teal-400' : c.band >= 6 ? 'text-indigo-400' : c.band >= 5 ? 'text-amber-400' : 'text-red-400'
              }`}>{c.band}</p>
            </div>
          ))}
        </div>
        {f.wordCountNote && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${
            f.wordCount < 150 || (f.taskType === 'Task 2' && f.wordCount < 250)
              ? 'bg-red-500/20 text-red-300'
              : 'bg-white/8 text-slate-400'
          }`}>
            {f.wordCountNote}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Examiner's Summary</p>
            <p className="text-sm text-slate-700 leading-relaxed">{f.examinerSummary}</p>
          </div>
          {f.taskSpecificFeedback && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">Task-Specific Feedback</p>
              <p className="text-sm text-indigo-800 leading-relaxed">{f.taskSpecificFeedback}</p>
            </div>
          )}
          {/* Band bars */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Score Breakdown</p>
            <div className="space-y-3">
              {criteria.map(([key, c]) => {
                const { text } = bandTheme(c.band)
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-8 font-mono">{key}</span>
                    <BandBar band={c.band} />
                    <span className={`text-sm font-black w-8 text-right ${text}`}>{c.band}</span>
                    <span className="text-xs text-slate-400 w-24 hidden sm:block">{bandLabel(c.band)}</span>
                  </div>
                )
              })}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 w-8 font-mono">AVG</span>
                <BandBar band={f.overallBand} />
                <span className={`text-sm font-black w-8 text-right ${overallText}`}>{f.overallBand}</span>
                <span className="text-xs font-semibold text-slate-600 w-24 hidden sm:block">{bandLabel(f.overallBand)}</span>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm text-amber-800 italic">{f.comparativeLevel}</p>
          </div>
        </div>
      )}

      {/* ── CRITERIA ── */}
      {tab === 'criteria' && (
        <div className="space-y-4">
          {criteria.map(([key, c]) => {
            const { text, bg, border } = bandTheme(c.band)
            const descriptor = BAND_DESCRIPTORS[key]?.[c.band] || BAND_DESCRIPTORS[key]?.[Math.floor(c.band)]
            return (
              <div key={key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className={`${bg} ${border} border-b px-5 py-3 flex items-center justify-between`}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{key}</p>
                    <p className="font-bold text-slate-800 mt-0.5">{c.label}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-black ${text}`}>{c.band}</p>
                    <p className="text-xs text-slate-400">{bandLabel(c.band)}</p>
                  </div>
                </div>
                {descriptor && (
                  <div className={`${bg} px-5 py-2 border-b ${border} border-opacity-50`}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Band {c.band} Descriptor</p>
                    <p className="text-sm text-slate-600 italic">{descriptor}</p>
                  </div>
                )}
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{c.feedback}</p>
                  {c.bandRationale && (
                    <div className="bg-slate-50 rounded-lg px-4 py-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Why not higher? </span>
                      <span className="text-sm text-slate-600">{c.bandRationale}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ERRORS ── */}
      {tab === 'errors' && (
        <div className="space-y-4">
          {(!f.errorAnnotations || f.errorAnnotations.length === 0) ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <p className="text-green-700 font-semibold">No specific errors annotated.</p>
              <p className="text-green-600 text-sm mt-1">See the Criteria tab for detailed qualitative feedback.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400">{f.errorAnnotations.length} error{f.errorAnnotations.length !== 1 ? 's' : ''} identified by the examiner.</p>
              {f.errorAnnotations.map((ann, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${TYPE_COLOURS[ann.type] ?? TYPE_COLOURS.Grammar}`}>
                    <span className="text-xs font-bold font-mono">#{i + 1}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${TYPE_COLOURS[ann.type] ?? ''}`}>
                      {ann.type}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-sm font-semibold text-red-700 italic">"{ann.quote}"</p>
                    <p className="text-sm text-slate-600">{ann.issue}</p>
                    {ann.correction && (
                      <div className="flex gap-2 items-start">
                        <span className="text-xs font-bold text-green-600 flex-shrink-0 mt-0.5">✓ Correction:</span>
                        <span className="text-sm text-green-700 italic">{ann.correction}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Vocabulary highlights */}
          {f.vocabularyHighlights && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Vocabulary Assessment</p>
              {f.vocabularyHighlights.effective?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-green-700 mb-2">✓ Used effectively</p>
                  <div className="flex flex-wrap gap-2">
                    {f.vocabularyHighlights.effective.map((v, i) => (
                      <span key={i} className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1 rounded-full italic">{v}</span>
                    ))}
                  </div>
                </div>
              )}
              {f.vocabularyHighlights.problematic?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-700 mb-2">⚠ Needs attention</p>
                  <div className="space-y-1">
                    {f.vocabularyHighlights.problematic.map((v, i) => (
                      <p key={i} className="text-sm text-amber-800 italic">{v}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── IMPROVE ── */}
      {tab === 'improve' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Priority Improvements</p>
          <div className="space-y-3">
            {(f.priorityImprovements || []).map((tip, i) => (
              <div key={i} className="flex gap-3 bg-slate-50 rounded-xl p-4">
                <div className="w-6 h-6 bg-teal-600 text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODEL ── */}
      {tab === 'model' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            The examiner has rewritten your weakest paragraph to Band 7+ quality on the same argument.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Paragraph</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-600 leading-relaxed">{f.originalParagraph || '—'}</p>
              </div>
            </div>
            <div className="bg-white border-2 border-teal-200 rounded-xl overflow-hidden">
              <div className="bg-teal-50 border-b border-teal-200 px-4 py-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Examiner's Model (Band 7+)</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-700 leading-relaxed italic">{f.modelParagraph}</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700">
              ⚠ The model paragraph demonstrates language techniques only. In an exam, your ideas and examples must be original.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
