'use server'

import { revalidatePath } from 'next/cache'
import { parseDateOnly } from '@/lib/date-only'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { applyMemberChanges, parseMemberChangesField } from '@/lib/teaching-links'

type Field = 'name' | 'courseId' | 'teacherId' | 'date'
export type LessonFormState = { ok?: boolean; errors?: Partial<Record<Field, string>> }

function positiveId(value: FormDataEntryValue | null): number | null {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function saveLesson(_prev: LessonFormState, formData: FormData): Promise<LessonFormState> {
  await requireUser()

  const id = positiveId(formData.get('id'))
  const courseId = positiveId(formData.get('courseId'))
  const teacherId = positiveId(formData.get('teacherId'))
  const name = String(formData.get('name') ?? '').trim()
  const date = parseDateOnly(String(formData.get('date') ?? ''))

  const errors: Partial<Record<Field, string>> = {}
  if (!name) errors.name = 'Informe o nome'

  const course =
    courseId === null
      ? null
      : await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) errors.courseId = 'Escolha o curso'

  const teacher =
    teacherId === null
      ? null
      : await prisma.member.findUnique({ where: { id: teacherId }, select: { id: true } })
  if (!teacher) errors.teacherId = 'Escolha o professor'

  if (!date) errors.date = 'Informe uma data válida'

  if (Object.keys(errors).length > 0 || !course || !teacher || !date) return { errors }

  const changes = parseMemberChangesField(formData.get('memberChanges'))
  const data = { name, courseId: course.id, teacherId: teacher.id, date }
  await prisma.$transaction(async (tx) => {
    const saved =
      id === null
        ? await tx.lesson.create({ data })
        : await tx.lesson.update({ where: { id }, data })
    await applyMemberChanges(tx, 'attendance', saved.id, changes)
  })

  revalidatePath('/aulas')
  revalidatePath('/cursos')
  return { ok: true }
}

export async function deleteLesson(id: number): Promise<void> {
  await requireUser()

  // deleteMany: excluir uma aula que já não existe não é erro. As presenças vão junto (cascade).
  await prisma.lesson.deleteMany({ where: { id } })
  revalidatePath('/aulas')
  revalidatePath('/cursos')
}
