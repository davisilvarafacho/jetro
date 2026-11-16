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
      },
    }),
    listMembers(),
  ])
  return (
    <MinistriesView
      ministries={ministries}
      members={members.map(({ id, firstName, lastName }) => ({ id, firstName, lastName }))}
    />
  )
}
