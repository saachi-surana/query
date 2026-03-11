import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  // Allow iframe embedding for /embed routes
  if (request.nextUrl.pathname.startsWith('/embed')) {
    response.headers.delete('X-Frame-Options')
    response.headers.set('Content-Security-Policy', "frame-ancestors *")
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options ?? {})
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = ['/session', '/analytics', '/report', '/create', '/settings'].some(
    path => request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/'
    return NextResponse.redirect(new URL(redirect, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
