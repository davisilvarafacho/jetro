import { NextResponse, type NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'

export async function proxy(req: NextRequest) {
  const session = await decrypt(req.cookies.get('session')?.value)
  const isLogin = req.nextUrl.pathname === '/login'

  if (!session && !isLogin) return NextResponse.redirect(new URL('/login', req.url))
  if (session && isLogin) return NextResponse.redirect(new URL('/membros', req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
