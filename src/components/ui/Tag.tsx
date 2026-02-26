import { ReactNode } from 'react'

type TagColor = 'slate' | 'teal' | 'amber' | 'red' | 'indigo' | 'green' | 'purple'

interface TagProps {
  children: ReactNode
  color?:   TagColor
}

const palette: Record<TagColor, string> = {
  slate:  'bg-slate-100 text-slate-700',
  teal:   'bg-teal-100  text-teal-700',
  amber:  'bg-amber-100 text-amber-700',
  red:    'bg-red-100   text-red-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green:  'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Tag({ children, color = 'slate' }: TagProps) {
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${palette[color]}`}>
      {children}
    </span>
  )
}
