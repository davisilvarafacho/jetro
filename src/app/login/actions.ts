'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createSession, deleteSession } from '@/lib/session'

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const senha = String(formData.get('senha') ?? '')

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null
  const valid = user !== null && (await bcrypt.compare(senha, user.passwordHash))
  if (!user || !valid) return { error: 'Email ou senha inválidos' }

  await createSession(user.id)
  redirect('/membros')
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
