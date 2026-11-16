import { listMembers } from '@/lib/members'
import { prisma } from '@/lib/prisma'
import { MinistriesView } from './ministries-view'

export default async function MinisteriosPage() {
  const [ministries, members] = await Promise.all([
    prisma.ministry.findMany({
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
    <MinistriesView
      ministries={ministries.map((m) => ({
        ...m,
        members: m.members.map(({ memberId, role }) => ({
          memberId,
          role: role === 2 ? (2 as const) : (3 as const),
        })),
      }))}
      members={members.map(({ id, firstName, lastName }) => ({ id, firstName, lastName }))}
    />
  )
}
