import { ReactNode } from 'react'

interface FieldProps {
  label:    string
  error?:   string
  hint?:    string
  required?: boolean
  children: ReactNode
}

export function Field({ label, error, hint, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="[&>input]:w-full [&>input]:border [&>input]:border-slate-300 [&>input]:rounded-lg [&>input]:px-3 [&>input]:py-2 [&>input]:text-sm [&>input]:text-slate-700 [&>input]:focus:outline-none [&>input]:focus:ring-2 [&>input]:focus:ring-teal-500 [&>input]:focus:border-transparent [&>select]:w-full [&>select]:border [&>select]:border-slate-300 [&>select]:rounded-lg [&>select]:px-3 [&>select]:py-2 [&>select]:text-sm [&>select]:text-slate-700 [&>select]:focus:outline-none [&>select]:focus:ring-2 [&>select]:focus:ring-teal-500 [&>textarea]:w-full [&>textarea]:border [&>textarea]:border-slate-300 [&>textarea]:rounded-lg [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:text-sm [&>textarea]:text-slate-700 [&>textarea]:focus:outline-none [&>textarea]:focus:ring-2 [&>textarea]:focus:ring-teal-500">
        {children}
      </div>
      {hint  && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
