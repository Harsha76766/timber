import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh user session before checking auth
  const { data: { user } } = await supabase.auth.getUser()

  // Protect private routes
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/quotes') ||
    request.nextUrl.pathname.startsWith('/inventory') ||
    request.nextUrl.pathname.startsWith('/customers');

  if (user) {
    // Check onboarding status
    const { data: userData } = await supabase
      .from('User')
      .select('orgId')
      .eq('id', user.id)
      .single()

    if (userData?.orgId) {
      const { data: orgData } = await supabase
        .from('Organisation')
        .select('onboardingCompleted, onboardingStep')
        .eq('id', userData.orgId)
        .single()

      if (orgData && !orgData.onboardingCompleted) {
        // If not completed and not already on onboarding page, redirect
        if (!request.nextUrl.pathname.startsWith('/onboarding') && 
            !request.nextUrl.pathname.startsWith('/api')) {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding'
          return NextResponse.redirect(url)
        }
      } else if (orgData?.onboardingCompleted && request.nextUrl.pathname.startsWith('/onboarding')) {
        // If completed but trying to access onboarding, redirect to dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } else {
      // NO ORGID: Force redirection to onboarding to create one
      if (!request.nextUrl.pathname.startsWith('/onboarding') && 
          !request.nextUrl.pathname.startsWith('/api') &&
          !request.nextUrl.pathname.startsWith('/login') &&
          !request.nextUrl.pathname.startsWith('/auth')) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    }
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
