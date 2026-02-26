import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const isStaff = profile?.role === 'admin' || profile?.role === 'teacher'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">J</span>
            </div>
            <span className="font-bold text-slate-800 hidden sm:block">Jaxtina IELTS</span>
          </Link>
          <div className="flex gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/practice">Practice</NavLink>
            {isStaff && <NavLink href="/admin/questions">Admin</NavLink>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile?.full_name && (
            <span className="text-sm text-slate-500 hidden sm:block">{profile.full_name}</span>
          )}
          <LogoutButton />
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="text-sm font-medium text-slate-600 hover:text-teal-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
      {children}
    </Link>
  )
}
