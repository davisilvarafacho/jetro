import { listMembers } from '@/lib/members'
import { prisma } from '@/lib/prisma'
import { MembersView } from './members-view'

export default async function MembrosPage() {
  const [members, ministries, cells] = await Promise.all([
    listMembers(),
    prisma.ministry.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.cell.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])
  return <MembersView members={members} ministries={ministries} cells={cells} />
}
