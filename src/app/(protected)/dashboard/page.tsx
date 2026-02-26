import { redirect }          from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import { StudentDashboard }   from '@/components/StudentDashboard'
import type { Profile }       from '@/types/profile'
import type { Submission }    from '@/types/submission'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: submissions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('submissions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!profile) redirect('/register')

  return (
    <StudentDashboard
      profile={profile as Profile}
      submissions={(submissions ?? []) as Submission[]}
    />
  )
}
