import { Prisma } from '@/generated/prisma/client'
import { onlyDigits } from '@/lib/cpf'
import { toDateOnly } from '@/lib/date-only'
import { prisma } from '@/lib/prisma'
import { fullName } from '@/lib/person-name'

// O que a página pública da aula mostra. Nada sobre membros: quem lê o QR Code não tem login.
export type PublicLesson = {
  id: number
  name: string
  courseName: string
  // `YYYY-MM-DD` (aula é "só dia").
  date: string
  teacherName: string
}

export async function getPublicLesson(lessonId: number): Promise<PublicLesson | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      name: true,
      date: true,
      course: { select: { name: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
  })
  if (!lesson) return null
  return {
    id: lesson.id,
    name: lesson.name,
    courseName: lesson.course.name,
    date: toDateOnly(lesson.date),
    teacherName: fullName(lesson.teacher),
  }
}

export type CheckInResult =
  | { kind: 'invalid-cpf' }
  | { kind: 'no-lesson' }
  | { kind: 'not-found'; teacherName: string }
  | { kind: 'confirmed' | 'already'; firstName: string }

// Presença pelo próprio aluno: só confere o CPF. Não olha inscrição no curso nem a data da aula.
export async function checkIn(lessonId: number, cpfInput: string): Promise<CheckInResult> {
  const cpf = onlyDigits(cpfInput)
  if (cpf.length !== 11) return { kind: 'invalid-cpf' }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacher: { select: { firstName: true, lastName: true } } },
  })
  if (!lesson) return { kind: 'no-lesson' }

  const member = await prisma.member.findUnique({
    where: { cpf },
    select: { id: true, firstName: true },
  })
  if (!member) return { kind: 'not-found', teacherName: fullName(lesson.teacher) }

  const existing = await prisma.lessonAttendance.findUnique({
    where: { lessonId_memberId: { lessonId, memberId: member.id } },
    select: { lessonId: true },
  })
  if (existing) return { kind: 'already', firstName: member.firstName }

  try {
    await prisma.lessonAttendance.create({ data: { lessonId, memberId: member.id } })
  } catch (error) {
    // Dois envios seguidos podem passar pela conferência ao mesmo tempo; o segundo cai na chave única.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { kind: 'already', firstName: member.firstName }
    }
    throw error
  }
  return { kind: 'confirmed', firstName: member.firstName }
}
