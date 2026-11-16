import { listMembers } from '@/lib/members'
import { MembersView } from './members-view'

export default async function MembrosPage() {
  const members = await listMembers()
  return <MembersView members={members} />
}
