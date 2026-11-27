import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { PAGE_SIZE, type Page } from '@/lib/pagination'
import { parseDateOnly, toDateOnly } from '@/lib/date-only'
import type { CourseOption } from '@/lib/courses'
import type { MemberCursor, PersonRef } from '@/lib/members'

export type LessonRow = {
  id: number
  name: string
  // `YYYY-MM-DD` (aula é "só dia").
  date: string
  course: CourseOption
  teacher: PersonRef
  present: number
}
// Ordem por data e id, ambos decrescentes. Data sozinha não basta: duas aulas no mesmo dia
// seriam puladas ou repetidas na virada da página.
export type LessonCursor = { date: string; id: number }

const personRef = { select: { id: true, firstName: true, lastName: true } } as const

export async function listLessonsPage(after?: LessonCursor): Promise<Page<LessonRow>> {
  let where: Prisma.LessonWhereInput = {}
  if (after) {
    const date = parseDateOnly(after.date)
    // Cursor malformado não aponta lugar nenhum; devolver a primeira página repetiria linhas.
    if (!date) return { items: [], hasMore: false }
    where = { OR: [{ date: { lt: date } }, { date, id: { lt: after.id } }] }
  }
  const rows = await prisma.lesson.findMany({
    where,
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      name: true,
      date: true,
      course: { select: { id: true, name: true } },
      teacher: personRef,
    },
  })
  const items = rows.slice(0, PAGE_SIZE)
  // Presentes só das aulas desta página; `_count` varreria a tabela de presença inteira.
  const counts = await prisma.lessonAttendance.groupBy({
    by: ['lessonId'],
    where: { lessonId: { in: items.map((l) => l.id) } },
    _count: { _all: true },
  })
  const present = new Map(counts.map((c) => [c.lessonId, c._count._all]))
  return {
    items: items.map((l) => ({ ...l, date: toDateOnly(l.date), present: present.get(l.id) ?? 0 })),
    hasMore: rows.length > PAGE_SIZE,
  }
}

export function countLessons(): Promise<number> {
  return prisma.lesson.count()
}

// Presentes de uma aula para a lista do drawer, por nome; o cursor é o mesmo dos membros
// (nome, sobrenome, id). Inclui quem não está inscrito no curso: presença não exige inscrição.
export async function listAttendancePage(lessonId: number, after?: MemberCursor): Promise<Page<PersonRef>> {
  const afterWhere: Prisma.LessonAttendanceWhereInput = after
    ? {
        OR: [
          { member: { firstName: { gt: after.firstName } } },
          { member: { firstName: after.firstName, lastName: { gt: after.lastName } } },
          { member: { firstName: after.firstName, lastName: after.lastName }, memberId: { gt: after.id } },
        ],
      }
    : {}
  const asc = 'asc' as const
  const rows = await prisma.lessonAttendance.findMany({
    where: { AND: [{ lessonId }, afterWhere] },
    orderBy: [{ member: { firstName: asc } }, { member: { lastName: asc } }, { memberId: asc }],
    take: PAGE_SIZE + 1,
    select: { member: personRef },
  })
  return { items: rows.slice(0, PAGE_SIZE).map((r) => r.member), hasMore: rows.length > PAGE_SIZE }
}
