import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public routes — no auth needed
  const publicRoutes = ['/login', '/auth/callback', '/auth/reset-password']
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    if (user) return NextResponse.redirect(new URL('/dashboard', request.url))
    return supabaseResponse
  }

  // Webhook/internal API routes — called by Supabase, no session cookie
  const webhookRoutes = ['/api/push-dispatch', '/api/notify', '/api/job-action']
  if (webhookRoutes.some(r => pathname.startsWith(r))) {
    return supabaseResponse
  }

  // Must be logged in
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  // Inactive users
  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=inactive', request.url))
  }

  const role = profile?.role ?? 'foreman'

  // Dual-role users (field_manager + admin) can access everything — no restrictions
  if (role === 'field_manager' || role === 'admin') {
    return supabaseResponse
  }

  // Pure foreman — dashboard is off limits
  if (role === 'foreman' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/my-jobs', request.url))
  }

  // Head office + viewer — foreman view is off limits
  if ((role === 'head_office' || role === 'viewer') && pathname.startsWith('/my-jobs')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
