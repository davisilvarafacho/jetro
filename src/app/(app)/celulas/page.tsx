import { listMembers } from '@/lib/members'
import { prisma } from '@/lib/prisma'
import { CellsView } from './cells-view'

export default async function CelulasPage() {
  const [cells, members] = await Promise.all([
    prisma.cell.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        leader: { select: { id: true, firstName: true, lastName: true } },
        members: {
          where: { role: { in: [2, 3] } },
          orderBy: { id: 'asc' },
          select: { memberId: true, role: true },
        },
      },
    }),
    listMembers(),
  ])
  return (
    <CellsView
      cells={cells.map((c) => ({
        ...c,
        members: c.members.map(({ memberId, role }) => ({
          memberId,
          role: role === 2 ? (2 as const) : (3 as const),
        })),
      }))}
      members={members.map(({ id, firstName, lastName }) => ({ id, firstName, lastName }))}
    />
  )
}
