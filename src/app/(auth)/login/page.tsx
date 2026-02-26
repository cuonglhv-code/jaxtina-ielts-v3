'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Field }  from '@/components/ui/Field'

export default function LoginPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Incorrect email or password. Please try again.'
        : authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md p-8">
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

        <h2 className="text-xl font-bold text-slate-800 mb-1">Sign in</h2>
        <p className="text-sm text-slate-400 mb-6">Welcome back. Enter your details to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" required>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
            />
          </Field>

          <Field label="Password" required>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>

        <p className="text-sm text-slate-400 text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-teal-600 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
