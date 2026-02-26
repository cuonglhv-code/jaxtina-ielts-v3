'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl }   from '@/lib/get-url'
import { Button } from '@/components/ui/Button'
import { Field }  from '@/components/ui/Field'

type FormState = {
  email: string; password: string; full_name: string
  age: string; address: string; phone: string
  current_band: string; target_band: string
}
type FormErrors = Partial<Record<keyof FormState, string>>

function validate(f: FormState): FormErrors {
  const e: FormErrors = {}
  if (!f.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required.'
  if (f.password.length < 8)                         e.password = 'Minimum 8 characters.'
  if (!f.full_name.trim())                           e.full_name = 'Name is required.'
  const age = Number(f.age)
  if (!f.age || isNaN(age) || age < 10 || age > 100) e.age = 'Enter a valid age (10–100).'
  const cb = Number(f.current_band)
  if (isNaN(cb) || cb < 0 || cb > 9)                e.current_band = 'Select a valid band.'
  const tb = Number(f.target_band)
  if (isNaN(tb) || tb < 0 || tb > 9)                e.target_band = 'Select a valid band.'
  if (tb <= cb)                                       e.target_band = 'Target band must be higher than current band.'
  return e
}

const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => (i * 0.5).toFixed(1))

export default function RegisterPage() {
  const supabase = createClient()

  const [form, setForm] = useState<FormState>({
    email: '', password: '', full_name: '', age: '',
    address: '', phone: '', current_band: '5.0', target_band: '6.5',
  })
  const [errors,       setErrors]       = useState<FormErrors>({})
  const [serverError,  setServerError]  = useState('')
  const [success,      setSuccess]      = useState(false)
  const [loading,      setLoading]      = useState(false)

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setServerError('')
    setLoading(true)

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options:  { emailRedirectTo: `${getSiteUrl()}auth/callback` },
    })

    if (authError || !authData.user) {
      setServerError(authError?.message ?? 'Sign-up failed. Please try again.')
      setLoading(false)
      return
    }

    // 2. Upsert full profile
    const { error: profileError } = await supabase.from('profiles').upsert({
      id:           authData.user.id,
      email:        form.email,
      full_name:    form.full_name.trim(),
      age:          Number(form.age),
      address:      form.address.trim()  || null,
      phone:        form.phone.trim()    || null,
      current_band: Number(form.current_band),
      target_band:  Number(form.target_band),
      role:         'student',
      onboarded:    true,
    })

    if (profileError) {
      setServerError(profileError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Check your email</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            We sent a confirmation link to <strong>{form.email}</strong>.
            Click the link in the email to activate your account and start practising.
          </p>
          <p className="text-slate-400 text-xs mt-4">
            Already confirmed?{' '}
            <Link href="/login" className="text-teal-600 hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-lg mx-auto p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">J</span>
          </div>
          <div>
            <h1 className="font-black text-slate-800">Jaxtina IELTS</h1>
            <p className="text-xs text-slate-400">Writing Tutor</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-1">Create your account</h2>
        <p className="text-sm text-slate-400 mb-6">Fill in your details to get started.</p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Full name" error={errors.full_name} required>
            <input type="text" value={form.full_name} onChange={set('full_name')} placeholder="Nguyen Van A" required />
          </Field>

          <Field label="Email" error={errors.email} required>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </Field>

          <Field label="Password" error={errors.password} hint="Minimum 8 characters" required>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
          </Field>

          <Field label="Age" error={errors.age} required>
            <input type="number" value={form.age} onChange={set('age')} min={10} max={100} placeholder="22" required />
          </Field>

          <Field label="Phone number" hint="Optional">
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+84 90 123 4567" />
          </Field>

          <Field label="Address" hint="Optional">
            <input type="text" value={form.address} onChange={set('address')} placeholder="Ho Chi Minh City, Vietnam" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Writing Band" error={errors.current_band} required>
              <select value={form.current_band} onChange={set('current_band')}>
                {BAND_OPTIONS.map(b => <option key={b} value={b}>Band {b}</option>)}
              </select>
            </Field>
            <Field label="Target Writing Band" error={errors.target_band} required>
              <select value={form.target_band} onChange={set('target_band')}>
                {BAND_OPTIONS.map(b => <option key={b} value={b}>Band {b}</option>)}
              </select>
            </Field>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create account
          </Button>
        </form>

        <p className="text-sm text-slate-400 text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-teal-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
