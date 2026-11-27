import { NextResponse, type NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

export async function proxy(req: NextRequest) {
  const session = await decrypt(req.cookies.get('session')?.value)
  const isLogin = req.nextUrl.pathname === '/login'
  // Página de presença por QR Code: o aluno chega sem login.
  const isPublicCheckIn = req.nextUrl.pathname.startsWith('/presenca/')

  if (!session && !isLogin && !isPublicCheckIn) return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
