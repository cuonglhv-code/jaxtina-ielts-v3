import type { Profile }    from '@/types/profile'
import type { Submission } from '@/types/submission'

export function computeRecentBand(submissions: Submission[], n = 5): number | null {
  const recent = submissions
    .filter(s => s.overall_band !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, n)
  if (!recent.length) return null
  const avg = recent.reduce((sum, s) => sum + (s.overall_band ?? 0), 0) / recent.length
  return Math.round(avg * 2) / 2
}

export type PersonalisationProfile = {
  bandGap:          number
  recommendedTask:  'task1' | 'task2' | 'both'
  emphasisCriteria: ('TR' | 'CC' | 'LR' | 'GRA')[]
  difficulty:       'foundation' | 'intermediate' | 'advanced'
  coachingNote:     string
}

export function buildPersonalisation(
  profile:     Profile,
  submissions: Submission[],
): PersonalisationProfile {
  const computedBand = computeRecentBand(submissions) ?? profile.current_band
  const bandGap      = profile.target_band - computedBand

  const difficulty: PersonalisationProfile['difficulty'] =
    computedBand < 5.5 ? 'foundation' :
    computedBand < 7.0 ? 'intermediate' : 'advanced'

  // Find the two weakest criteria from last 3 submissions
  const recent = submissions.slice(0, 3)
  const criterionAvgs = (['TR', 'CC', 'LR', 'GRA'] as const).map(key => ({
    key,
    avg: recent.length
      ? recent.reduce((s, sub) => s + (sub.criteria_scores?.[key] ?? 0), 0) / recent.length
      : 0,
  }))
  criterionAvgs.sort((a, b) => a.avg - b.avg)
  const emphasisCriteria = criterionAvgs.slice(0, 2).map(c => c.key) as PersonalisationProfile['emphasisCriteria']

  // Recommend the less-practised task type
  const task2Ratio = submissions.length
    ? submissions.filter(s => s.task_type === 'task2').length / submissions.length
    : 0.5
  const recommendedTask: PersonalisationProfile['recommendedTask'] =
    task2Ratio < 0.3 ? 'task2' : task2Ratio > 0.7 ? 'task1' : 'both'

  const weakNames = emphasisCriteria.map(k => ({
    TR: 'Task Response', CC: 'Coherence & Cohesion',
    LR: 'Lexical Resource', GRA: 'Grammatical Range',
  }[k]!)).join(' and ')

  const coachingNote =
    bandGap <= 0 ? 'You have reached your target band. Consider setting a new goal.' :
    bandGap <= 0.5 ? `You are very close to your target. Focus on ${weakNames} for the final push.` :
    `${bandGap.toFixed(1)} bands to your target. Prioritise ${weakNames}.`

  return { bandGap, recommendedTask, emphasisCriteria, difficulty, coachingNote }
}
