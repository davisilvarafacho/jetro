'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { isValidCpf, onlyDigits } from '@/lib/cpf'
import {
  blockedDeleteMessage,
  getDependents,
  isInLeaderChainBelow,
  type Dependents,
} from '@/lib/members'
import { fullName } from '@/lib/person-name'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

type Field = 'cpf' | 'firstName' | 'lastName' | 'leaderId' | 'parcaId'
export type MemberFormState = { ok?: boolean; errors?: Partial<Record<Field, string>> }

const schema = z.object({
  cpf: z
    .string()
    .transform(onlyDigits)
    .pipe(z.string().min(1, 'Informe o CPF').refine(isValidCpf, 'CPF inválido')),
  firstName: z.string().trim().min(1, 'Informe o nome'),
  lastName: z.string().trim().min(1, 'Informe o sobrenome'),
})

function optionalId(value: FormDataEntryValue | null): number | null {
  const n = Number(value)
  return typeof value === 'string' && value !== '' && Number.isInteger(n) ? n : null
}

export async function saveMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireUser()

  const id = optionalId(formData.get('id'))
  const leaderId = optionalId(formData.get('leaderId'))
  const parcaId = optionalId(formData.get('parcaId'))

  const errors: Partial<Record<Field, string>> = {}
  const parsed = schema.safeParse({
    cpf: String(formData.get('cpf') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as Field
      errors[key] ??= issue.message
    }
  }

  if (id !== null && leaderId === id) errors.leaderId = 'Um membro não pode ser líder de si mesmo'
  if (id !== null && parcaId === id) errors.parcaId = 'Um membro não pode ser parça de si mesmo'
  if (id !== null && leaderId !== null && leaderId !== id) {
    if (await isInLeaderChainBelow(id, leaderId)) {
      const candidate = await prisma.member.findUnique({
        where: { id: leaderId },
        select: { firstName: true, lastName: true },
      })
      if (candidate) {
        errors.leaderId = `${fullName(candidate)} está abaixo deste membro na cadeia de liderança. Escolha outro líder.`
      }
    }
  }

  if (parsed.success && !errors.cpf) {
    const other = await prisma.member.findUnique({
      where: { cpf: parsed.data.cpf },
      select: { id: true },
    })
    if (other && other.id !== id) errors.cpf = 'Este CPF já está cadastrado'
  }

  if (Object.keys(errors).length > 0 || !parsed.success) return { errors }

  const data = { ...parsed.data, leaderId, parcaId }
  try {
    if (id !== null) await prisma.member.update({ where: { id }, data })
    else await prisma.member.create({ data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { errors: { cpf: 'Este CPF já está cadastrado' } }
    }
    throw error
  }

  revalidatePath('/membros')
  return { ok: true }
}

export type DeleteMemberResult =
  | { ok: true }
  | {
      ok: false
      message: string
      dependents: { id: number; name: string; kind: 'liderado' | 'parca' | 'ministerio' }[]
    }

function toDependentList(deps: Dependents) {
  return [
    ...deps.liderados.map((d) => ({ ...d, kind: 'liderado' as const })),
    ...deps.parcaDe.map((d) => ({ ...d, kind: 'parca' as const })),
    ...deps.ministerios.map((d) => ({ ...d, kind: 'ministerio' as const })),
  ]
}

export async function deleteMember(id: number): Promise<DeleteMemberResult> {
  await requireUser()

  const member = await prisma.member.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  })
  if (!member) {
    revalidatePath('/membros')
    return { ok: true }
  }

  const deps = await getDependents(id)
  const message = blockedDeleteMessage(fullName(member), deps)
  if (message) return { ok: false, message, dependents: toDependentList(deps) }

  await prisma.member.delete({ where: { id } })
  revalidatePath('/membros')
  return { ok: true }
}
