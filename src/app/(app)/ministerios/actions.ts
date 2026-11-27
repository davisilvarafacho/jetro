'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { applyGroupMemberChanges, parseGroupChangesField } from '@/lib/group-members'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

type Field = 'name' | 'leaderId'
export type MinistryFormState = { ok?: boolean; errors?: Partial<Record<Field, string>> }

function positiveId(value: FormDataEntryValue | null): number | null {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

const DUPLICATE_NAME = 'Já existe um ministério com este nome'

export async function saveMinistry(
  _prev: MinistryFormState,
  formData: FormData,
): Promise<MinistryFormState> {
  await requireUser()

  const id = positiveId(formData.get('id'))
  const leaderId = positiveId(formData.get('leaderId'))
  const name = String(formData.get('name') ?? '').trim()

  const errors: Partial<Record<Field, string>> = {}
  if (!name) errors.name = 'Informe o nome'
  else {
    const other = await prisma.ministry.findUnique({ where: { name }, select: { id: true } })
    if (other && other.id !== id) errors.name = DUPLICATE_NAME
  }

  const leader =
    leaderId === null
      ? null
      : await prisma.member.findUnique({ where: { id: leaderId }, select: { id: true } })
  if (!leader) errors.leaderId = 'Escolha o líder'

  if (Object.keys(errors).length > 0 || !leader) return { errors }

  const changes = parseGroupChangesField(formData.get('memberChanges'))
  const data = { name, leaderId: leader.id }
  try {
    await prisma.$transaction(async (tx) => {
      const previous =
        id === null
          ? null
          : await tx.ministry.findUnique({ where: { id }, select: { leaderId: true } })
      const saved =
        id === null
          ? await tx.ministry.create({ data })
          : await tx.ministry.update({ where: { id }, data })
      await applyGroupMemberChanges(tx, 'ministry', saved.id, {
        leaderId: leader.id,
        previousLeaderId: previous?.leaderId ?? null,
        changes,
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { errors: { name: DUPLICATE_NAME } }
    }
    throw error
  }

  revalidatePath('/ministerios')
  revalidatePath('/membros')
  return { ok: true }
}

export async function deleteMinistry(id: number): Promise<void> {
  await requireUser()

  // deleteMany: excluir um ministério que já não existe não é erro.
  await prisma.ministry.deleteMany({ where: { id } })
  revalidatePath('/ministerios')
  revalidatePath('/membros')
}
