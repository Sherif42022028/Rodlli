import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const url = req.nextUrl.clone()

  // Protect dashboard routes
  if (url.pathname.startsWith('/merchant') || url.pathname.startsWith('/buyer')) {
    if (!isLoggedIn) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages
  if (url.pathname === '/login' || url.pathname === '/register') {
    if (isLoggedIn) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - docs/ (wireframes and assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
