import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const COOKIE_NAME = 'session'
const SESSION_HOURS = 8

function getKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET não está definido.')
  return new TextEncoder().encode(secret)
}

export async function encrypt(payload: { userId: number }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getKey())
}

export async function decrypt(token?: string): Promise<{ userId: number } | null> {
  if (!token) return null
  const key = getKey()
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return typeof payload.userId === 'number' ? { userId: payload.userId } : null
  } catch {
    return null
  }
}

export async function createSession(userId: number): Promise<void> {
  const token = await encrypt({ userId })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000),
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export const getCurrentUser = cache(async (): Promise<{ id: number; name: string } | null> => {
  const cookieStore = await cookies()
  const session = await decrypt(cookieStore.get(COOKIE_NAME)?.value)
  if (!session) return null
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true },
  })
})

export async function requireUser(): Promise<void> {
  if (!(await getCurrentUser())) throw new Error('Não autorizado')
}
