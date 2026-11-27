import { prisma } from '@/lib/prisma'
import { toDateOnly, todayDateOnly } from '@/lib/date-only'

export type TimelineLesson = {
  id: number
  name: string
  // `YYYY-MM-DD` (aula é "só dia").
  date: string
  state: 'present' | 'absent' | 'upcoming'
}
// `held` são as aulas já realizadas (todas menos as agendadas); `attended`, as em que o membro esteve.
export type MemberTimeline = { lessons: TimelineLesson[]; attended: number; held: number }

// Aulas do curso em ordem de data e id, cada uma com a presença do membro (no máximo uma linha).
// Uma consulta só: presença por aula em lista, sem N+1 e sem `_count`.
export async function getMemberTimeline(courseId: number, memberId: number): Promise<MemberTimeline> {
  const rows = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      date: true,
      attendances: { where: { memberId }, select: { memberId: true }, take: 1 },
    },
  })
  // Comparar strings `YYYY-MM-DD` já ordena por dia; "hoje" é o dia de Brasília.
  const today = todayDateOnly()
  const lessons = rows.map((row): TimelineLesson => {
    const date = toDateOnly(row.date)
    const state = date > today ? 'upcoming' : row.attendances.length > 0 ? 'present' : 'absent'
    return { id: row.id, name: row.name, date, state }
  })
  const held = lessons.filter((lesson) => lesson.state !== 'upcoming').length
  const attended = lessons.filter((lesson) => lesson.state === 'present').length
  return { lessons, attended, held }
}
