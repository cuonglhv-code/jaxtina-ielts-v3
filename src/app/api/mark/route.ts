import { createClient }    from '@/lib/supabase/server'
import { EXAMINER_SYSTEM } from '@/lib/examiner-prompt'
import Anthropic           from '@anthropic-ai/sdk'
import { NextResponse }    from 'next/server'

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  // Parse body
  let essay: string, promptText: string, taskType: string, wordCount: number
  try {
    const body = await req.json()
    essay      = body.essay
    promptText = body.promptText
    taskType   = body.taskType   ?? 'task2'
    wordCount  = body.wordCount  ?? 0
    if (!essay || !promptText) throw new Error('Missing fields')
  } catch {
    return NextResponse.json({ error: 'Request body must include essay and promptText.' }, { status: 400 })
  }

  // Call Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let rawText: string
  try {
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system:     EXAMINER_SYSTEM,
      messages: [{
        role:    'user',
        content: `IELTS ${taskType === 'task2' ? 'Writing Task 2' : 'Writing Task 1'} Question:\n${promptText}\n\nStudent Essay (${wordCount} words):\n${essay}\n\nMark this essay strictly using the official IELTS band descriptors. Apply all anti-inflation guardrails. Return ONLY the JSON object.`,
      }],
    })
    rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Claude API error'
    console.error('[/api/mark] Claude error:', msg)
    return NextResponse.json({ error: `AI marking failed: ${msg}` }, { status: 502 })
  }

  // Parse JSON
  let feedback: Record<string, unknown>
  try {
    const cleaned = rawText.replace(/```json\n?|```/g, '').trim()
    feedback = JSON.parse(cleaned)
  } catch {
    console.error('[/api/mark] Failed to parse Claude response:', rawText.slice(0, 500))
    return NextResponse.json({ error: 'AI returned malformed feedback. Please try again.' }, { status: 422 })
  }

  // Save submission (non-blocking — don't fail the request if this errors)
  supabase.from('submissions').insert({
    student_id:      user.id,
    task_type:       taskType,
    essay_text:      essay,
    word_count:      wordCount,
    overall_band:    feedback.overallBand,
    criteria_scores: {
      TR:  (feedback.criteriaScores as Record<string, { band: number }>)?.TR?.band,
      CC:  (feedback.criteriaScores as Record<string, { band: number }>)?.CC?.band,
      LR:  (feedback.criteriaScores as Record<string, { band: number }>)?.LR?.band,
      GRA: (feedback.criteriaScores as Record<string, { band: number }>)?.GRA?.band,
    },
    feedback_json: feedback,
  }).then(({ error }) => {
    if (error) console.error('[/api/mark] Submission save error:', error.message)
  })

  return NextResponse.json({ feedback })
}
