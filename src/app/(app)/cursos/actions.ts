'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { applyMemberChanges, parseMemberChangesField } from '@/lib/teaching-links'

export type CourseFormState = { ok?: boolean; errors?: { name?: string } }

function positiveId(value: FormDataEntryValue | null): number | null {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

const DUPLICATE_NAME = 'Já existe um curso com este nome'

export async function saveCourse(_prev: CourseFormState, formData: FormData): Promise<CourseFormState> {
  await requireUser()

  const id = positiveId(formData.get('id'))
  const name = String(formData.get('name') ?? '').trim()

  if (!name) return { errors: { name: 'Informe o nome' } }
  const other = await prisma.course.findUnique({ where: { name }, select: { id: true } })
  if (other && other.id !== id) return { errors: { name: DUPLICATE_NAME } }

  const changes = parseMemberChangesField(formData.get('memberChanges'))
  try {
    await prisma.$transaction(async (tx) => {
      const saved =
        id === null
          ? await tx.course.create({ data: { name } })
          : await tx.course.update({ where: { id }, data: { name } })
      await applyMemberChanges(tx, 'enrollment', saved.id, changes)
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { errors: { name: DUPLICATE_NAME } }
    }
    throw error
  }

  revalidatePath('/cursos')
  return { ok: true }
}

export async function deleteCourse(id: number): Promise<void> {
  await requireUser()

  // deleteMany: excluir um curso que já não existe não é erro. As aulas e inscrições vão junto (cascade).
  await prisma.course.deleteMany({ where: { id } })
  revalidatePath('/cursos')
  revalidatePath('/aulas')
}
