import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { PAGE_SIZE, type Page } from '@/lib/pagination'
import type { MemberCursor, PersonRef } from '@/lib/members'

export type CourseRow = { id: number; name: string; enrolled: number }
export type CourseOption = { id: number; name: string }
// Nome é único, então basta para marcar "daqui em diante" na ordem por nome.
export type CourseCursor = { name: string }

const personRef = { select: { id: true, firstName: true, lastName: true } } as const

export async function listCoursesPage(after?: CourseCursor): Promise<Page<CourseRow>> {
  const rows = await prisma.course.findMany({
    where: after ? { name: { gt: after.name } } : {},
    orderBy: { name: 'asc' },
    take: PAGE_SIZE + 1,
    select: { id: true, name: true },
  })
  const items = rows.slice(0, PAGE_SIZE)
  // Inscritos só dos cursos desta página; `_count` varreria a tabela de inscrições inteira.
  const counts = await prisma.courseEnrollment.groupBy({
    by: ['courseId'],
    where: { courseId: { in: items.map((c) => c.id) } },
    _count: { _all: true },
  })
  const enrolled = new Map(counts.map((c) => [c.courseId, c._count._all]))
  return {
    items: items.map((c) => ({ ...c, enrolled: enrolled.get(c.id) ?? 0 })),
    hasMore: rows.length > PAGE_SIZE,
  }
}

export function countCourses(): Promise<number> {
  return prisma.course.count()
}

// Seletor "Curso" da aula: busca por nome, mesma ordem e cursor da lista.
export async function searchCourseOptions({
  q,
  after,
}: {
  q: string
  after?: CourseCursor
}): Promise<Page<CourseOption>> {
  const and: Prisma.CourseWhereInput[] = []
  if (q.trim()) and.push({ name: { contains: q.trim() } })
  if (after) and.push({ name: { gt: after.name } })
  const rows = await prisma.course.findMany({
    where: { AND: and },
    orderBy: { name: 'asc' },
    take: PAGE_SIZE + 1,
    select: { id: true, name: true },
  })
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}

// Inscritos de um curso para a lista do drawer, por nome; o cursor é o mesmo dos membros
// (nome, sobrenome, id).
export async function listEnrolledPage(courseId: number, after?: MemberCursor): Promise<Page<PersonRef>> {
  const afterWhere: Prisma.CourseEnrollmentWhereInput = after
    ? {
        OR: [
          { member: { firstName: { gt: after.firstName } } },
          { member: { firstName: after.firstName, lastName: { gt: after.lastName } } },
          { member: { firstName: after.firstName, lastName: after.lastName }, memberId: { gt: after.id } },
        ],
      }
    : {}
  const asc = 'asc' as const
  const rows = await prisma.courseEnrollment.findMany({
    where: { AND: [{ courseId }, afterWhere] },
    orderBy: [{ member: { firstName: asc } }, { member: { lastName: asc } }, { memberId: asc }],
    take: PAGE_SIZE + 1,
    select: { member: personRef },
  })
  return { items: rows.slice(0, PAGE_SIZE).map((r) => r.member), hasMore: rows.length > PAGE_SIZE }
}
