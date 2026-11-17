'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { parseGroupMembersField, saveGroupMembers } from '@/lib/group-members'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

type Field = 'name' | 'leaderId'
export type CellFormState = { ok?: boolean; errors?: Partial<Record<Field, string>> }

function positiveId(value: FormDataEntryValue | null): number | null {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

const DUPLICATE_NAME = 'Já existe uma célula com este nome'

export async function saveCell(
  _prev: CellFormState,
  formData: FormData,
): Promise<CellFormState> {
  await requireUser()

  const id = positiveId(formData.get('id'))
  const leaderId = positiveId(formData.get('leaderId'))
  const name = String(formData.get('name') ?? '').trim()

  const errors: Partial<Record<Field, string>> = {}
  if (!name) errors.name = 'Informe o nome'
  else {
    // O índice único do SQLite diferencia maiúsculas; "Jovens" e "jovens" contam como o mesmo nome.
    const key = name.toLocaleLowerCase('pt-BR')
    const cells = await prisma.cell.findMany({ select: { id: true, name: true } })
    if (cells.some((c) => c.id !== id && c.name.toLocaleLowerCase('pt-BR') === key)) {
      errors.name = DUPLICATE_NAME
    }
  }

  const leader =
    leaderId === null
      ? null
      : await prisma.member.findUnique({ where: { id: leaderId }, select: { id: true } })
  if (!leader) errors.leaderId = 'Escolha o líder'

  if (Object.keys(errors).length > 0 || !leader) return { errors }

  const members = parseGroupMembersField(formData.get('members'))
  const data = { name, leaderId: leader.id }
  try {
    await prisma.$transaction(async (tx) => {
      const previous =
        id === null
          ? null
          : await tx.cell.findUnique({ where: { id }, select: { leaderId: true } })
      const saved =
        id === null
          ? await tx.cell.create({ data })
          : await tx.cell.update({ where: { id }, data })
      await saveGroupMembers(tx, 'cell', saved.id, {
        leaderId: leader.id,
        previousLeaderId: previous?.leaderId ?? null,
        members,
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { errors: { name: DUPLICATE_NAME } }
    }
    throw error
  }

  revalidatePath('/celulas')
  revalidatePath('/membros')
  return { ok: true }
}

export async function deleteCell(id: number): Promise<void> {
  await requireUser()

  // deleteMany: excluir uma célula que já não existe não é erro.
  await prisma.cell.deleteMany({ where: { id } })
  revalidatePath('/celulas')
  revalidatePath('/membros')
}
