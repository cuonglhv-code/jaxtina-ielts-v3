import { createClient } from '@/lib/supabase/server'
import Anthropic        from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Auth + role check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'teacher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden — admin or teacher role required.' }, { status: 403 })
  }

  // Parse body
  const { task = 'task2', count = 3, task1_type, task2_question_type } = await req.json()
  const safeCount = Math.min(Math.max(Number(count), 1), 5)

  // Fetch sample questions for style examples
  let sampleQ = supabase
    .from('writing_prompts')
    .select('task, task1_type, task2_question_type, prompt_text, difficulty, topic_tags, visual_description, metadata')
    .eq('task', task)
    .limit(10)

  if (task === 'task1' && task1_type)
    sampleQ = sampleQ.eq('task1_type', task1_type)
  if (task === 'task2' && task2_question_type)
    sampleQ = sampleQ.eq('task2_question_type', task2_question_type)

  const { data: samples } = await sampleQ

  // Build schema note for prompt
  const schemaNote = task === 'task1'
    ? `{
  "task": "task1",
  "task1_type": "${task1_type ?? '<graph|table|process|map>'}",
  "task2_question_type": null,
  "prompt_text": "Full IELTS question text including instruction",
  "difficulty": <1|2|3>,
  "topic_tags": ["string"],
  "visual_description": "Plain text description of the visual data for AI marking",
  "metadata": {}
}`
    : `{
  "task": "task2",
  "task1_type": null,
  "task2_question_type": "${task2_question_type ?? '<agree_disagree|discuss_both_views|problem_solution|advantages_disadvantages|two_direct_questions>'}",
  "prompt_text": "Full IELTS question text including instruction",
  "difficulty": <1|2|3>,
  "topic_tags": ["string"],
  "visual_description": null,
  "metadata": {}
}`

  // Call Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let rawText: string
  try {
    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are an expert IELTS test writer with experience at Cambridge Assessment English.
Generate new, original IELTS Writing questions that match the style, difficulty, and format of the examples provided.
Rules:
1. Never copy or paraphrase existing question text.
2. Questions must be realistic, balanced, culturally neutral, and suitable for Vietnamese students.
3. Match the stated difficulty level precisely.
4. For Task 1, include a complete visual_description that an AI examiner can use to assess accuracy.
5. Return ONLY a valid JSON object: { "questions": [...] }. No markdown, no preamble.`,
      messages: [{
        role:    'user',
        content: `Style examples from our question bank:\n${JSON.stringify(samples ?? [], null, 2)}\n\n---\n\nGenerate ${safeCount} new, original IELTS ${task === 'task1' ? 'Task 1' : 'Task 2'} questions${task1_type ? ` (type: ${task1_type})` : ''}${task2_question_type ? ` (type: ${task2_question_type})` : ''}.\n\nEach question must use this exact schema:\n${schemaNote}\n\nReturn ONLY: { "questions": [ ...${safeCount} objects... ] }`,
      }],
    })
    rawText = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Claude API error'
    console.error('[/api/admin/generate-questions] Claude error:', msg)
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 502 })
  }

  // Parse JSON
  let candidates: unknown[]
  try {
    const cleaned = rawText.replace(/```json\n?|```/g, '').trim()
    const parsed  = JSON.parse(cleaned)
    candidates    = parsed.questions ?? parsed
    if (!Array.isArray(candidates)) throw new Error('Expected array')
  } catch {
    console.error('[/api/admin/generate-questions] Parse error. Raw:', rawText.slice(0, 500))
    return NextResponse.json(
      { error: 'AI returned malformed JSON. Please try again.' },
      { status: 422 },
    )
  }

  // Return candidates for manual review — NOT auto-inserted
  return NextResponse.json({ candidates })
}
