'use client'

import { computeRecentBand, buildPersonalisation } from '@/lib/dashboard'
import type { Profile }    from '@/types/profile'
import type { Submission } from '@/types/submission'
import Link from 'next/link'

interface Props {
  profile:     Profile
  submissions: Submission[]
}

export function StudentDashboard({ profile, submissions }: Props) {
  const computedBand = computeRecentBand(submissions) ?? profile.current_band
  const persona      = buildPersonalisation(profile, submissions)
  const progressPct  = Math.min((computedBand / Math.max(profile.target_band, 0.1)) * 100, 100)
  const firstName    = profile.full_name?.split(' ')[0] || 'there'

  const criterionLabels: Record<string, string> = {
    TR: 'Task Response', CC: 'Coherence & Cohesion',
    LR: 'Lexical Resource', GRA: 'Grammatical Range',
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome back, {firstName} 👋</h1>
        <p className="text-slate-500 mt-1">Here is your writing progress overview.</p>
      </div>

      {/* Band progress card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Writing Band Progress</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-black text-teal-600">{computedBand.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-1">Current</p>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Band {computedBand.toFixed(1)}</span>
              <span>Target Band {profile.target_band.toFixed(1)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: persona.bandGap <= 0 ? '#16a34a' : '#0d9488',
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{persona.coachingNote}</p>
          </div>
          <div className="text-center opacity-60">
            <p className="text-4xl font-black text-slate-400">{profile.target_band.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-1">Target</p>
          </div>
        </div>
      </div>

      {/* Priority areas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Priority Areas to Improve</h2>
        <div className="flex gap-2 flex-wrap">
          {persona.emphasisCriteria.map(k => (
            <div key={k} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">{k}</p>
              <p className="text-sm text-amber-800 font-medium">{criterionLabels[k]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/practice" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl p-4 transition-colors">
          <p className="font-bold">✍️ Practice Writing</p>
          <p className="text-teal-100 text-xs mt-1">
            {persona.recommendedTask === 'task1' ? 'Task 1 recommended today'
             : persona.recommendedTask === 'task2' ? 'Task 2 recommended today'
             : 'Task 1 & Task 2 available'}
          </p>
        </Link>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="font-bold text-slate-700">📊 Total Submissions</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{submissions.length}</p>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Recent Submissions</h2>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm">No submissions yet.</p>
            <Link href="/practice" className="text-teal-600 text-sm font-semibold mt-2 inline-block hover:underline">
              Start your first essay →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {submissions.slice(0, 6).map(s => (
              <li key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {s.task_type === 'task2' ? 'Task 2' : 'Task 1'}
                  </span>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  {s.overall_band !== null ? (
                    <span className={`text-lg font-black ${
                      s.overall_band >= 7 ? 'text-teal-600' :
                      s.overall_band >= 6 ? 'text-indigo-600' :
                      s.overall_band >= 5 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      Band {s.overall_band}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
