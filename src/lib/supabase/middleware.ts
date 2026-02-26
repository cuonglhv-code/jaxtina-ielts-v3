import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — do not remove this
  const { data: { user } } = await supabase.auth.getUser()

  const path     = request.nextUrl.pathname
  const isPublic = ['/login', '/register', '/auth'].some(p => path.startsWith(p))

  // Not logged in → send to login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded, role')
      .eq('id', user.id)
      .single()

    // Profile not complete → send to register to finish
    if (profile && !profile.onboarded && !path.startsWith('/register')) {
      return NextResponse.redirect(new URL('/register', request.url))
    }

    // Non-admin trying to access admin area
    if (
      path.startsWith('/admin') &&
      profile?.role !== 'admin' &&
      profile?.role !== 'teacher'
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
