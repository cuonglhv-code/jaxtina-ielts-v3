import type { Task1Prompt, ProcessPrompt, MapPrompt } from '@/types/prompt'

const CHECKLIST: Record<string, string[]> = {
  graph: [
    'Write an overview paragraph identifying the 2–3 most significant overall trends — no data figures in the overview.',
    'Group data meaningfully; do not describe every single figure.',
    'Use varied language for change: rose sharply, declined gradually, remained stable, peaked at.',
    'Reference time periods accurately and consistently.',
    'Write at least 150 words in continuous prose — no bullet points.',
  ],
  table: [
    'Write an overview identifying the highest/lowest values and the most notable pattern.',
    'Make comparisons between rows and columns — do not just list all figures.',
    'Avoid describing every cell; select only the most significant data points.',
    'Use approximation language: approximately, roughly, just under, nearly.',
    'Write at least 150 words in two or more paragraphs.',
  ],
  process: [
    'Describe ALL stages in the correct order — do not skip any stage.',
    'Use the passive voice: water is filtered, chemicals are added, particles are removed.',
    'Use sequence markers: first, then, next, subsequently, finally, before, after.',
    'State the overall purpose of the process clearly in your overview.',
    'Write in continuous prose — no bullet points or numbered lists.',
  ],
  map: [
    'Write an overview stating the most significant overall change between the two maps.',
    'Organise spatially: north, south, east, west, centre — not randomly.',
    'Use change language: was replaced by, has been demolished, a new X was constructed.',
    'Note what has remained unchanged as well as what has changed.',
    'Use past tense for the earlier map; present perfect for changes (the park has been replaced).',
  ],
}

const HEADING: Record<string, string> = {
  graph:   'Graph / Chart Report',
  table:   'Table Summary',
  process: 'Process Description',
  map:     'Map Comparison',
}

const INSTRUCTION: Record<string, string> = {
  graph:
    'Summarise the key trends and make comparisons where relevant. Include an overview paragraph. Do not copy the question.',
  table:
    'Select the most significant data, make comparisons, and identify overall patterns. Do not list every figure.',
  process:
    'Describe every stage in the correct sequence using passive voice and sequence language. Include an overview of the process.',
  map:
    'Describe the most significant changes between the two maps. Organise your answer spatially and note what has remained unchanged.',
}

interface Props {
  prompt: Task1Prompt
}

export function Task1Instructions({ prompt }: Props) {
  const type = prompt.task1_type

  return (
    <div className="space-y-4">
      {/* Type badge + instruction */}
      <div>
        <span className="inline-block text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1 rounded-full">
          Task 1 · {HEADING[type]}
        </span>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{INSTRUCTION[type]}</p>
      </div>

      {/* Type-specific metadata hints */}
      {type === 'process' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          This diagram has <strong>{(prompt as ProcessPrompt).metadata.stages} stages</strong> following a{' '}
          <strong>{(prompt as ProcessPrompt).metadata.flow}</strong> flow.
        </div>
      )}
      {type === 'map' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
          Compare <strong>{(prompt as MapPrompt).metadata.years[0]}</strong>{' '}
          with <strong>{(prompt as MapPrompt).metadata.years[1]}</strong>.
          Key changes: {(prompt as MapPrompt).metadata.key_changes.join(', ')}.
        </div>
      )}

      {/* Checklist */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          Examiner Checklist
        </p>
        <ul className="space-y-2">
          {CHECKLIST[type].map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-600">
              <span className="text-teal-500 font-bold flex-shrink-0 mt-0.5">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
