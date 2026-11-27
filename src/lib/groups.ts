import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { GROUP_ROLE, type AssignableRole } from '@/lib/group-roles'
import type { GroupKind } from '@/lib/group-members'
import { PAGE_SIZE, type Page } from '@/lib/pagination'
import type { MemberCursor, PersonRef } from '@/lib/members'

// Ministério e célula têm a mesma forma: nome único, líder e vínculos com papel. As consultas abaixo
// servem aos dois; só muda a tabela.
export type GroupRow = { id: number; name: string; leader: PersonRef }
export type GroupOption = { id: number; name: string }
// Nome é único, então basta para marcar "daqui em diante" na ordem por nome.
export type GroupCursor = { name: string }

const personRef = { select: { id: true, firstName: true, lastName: true } } as const

export async function listGroupsPage(kind: GroupKind, after?: GroupCursor): Promise<Page<GroupRow>> {
  const where: Prisma.MinistryWhereInput & Prisma.CellWhereInput = after ? { name: { gt: after.name } } : {}
  const args = {
    where,
    orderBy: { name: 'asc' as const },
    take: PAGE_SIZE + 1,
    select: { id: true, name: true, leader: personRef },
  }
  const rows = await (kind === 'ministry' ? prisma.ministry.findMany(args) : prisma.cell.findMany(args))
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}

export function countGroups(kind: GroupKind): Promise<number> {
  return kind === 'ministry' ? prisma.ministry.count() : prisma.cell.count()
}

// Seletor "Ministérios"/"Células" do cadastro de membro: busca por nome, sem os grupos que a pessoa
// já lidera (ela os lidera; não se escolhe como participação).
export async function searchGroupOptions(
  kind: GroupKind,
  { q, after, excludeLeaderId }: { q: string; after?: GroupCursor; excludeLeaderId?: number },
): Promise<Page<GroupOption>> {
  const and: (Prisma.MinistryWhereInput & Prisma.CellWhereInput)[] = []
  if (q.trim()) and.push({ name: { contains: q.trim() } })
  if (after) and.push({ name: { gt: after.name } })
  if (excludeLeaderId) and.push({ leaderId: { not: excludeLeaderId } })
  const args = {
    where: { AND: and },
    orderBy: { name: 'asc' as const },
    take: PAGE_SIZE + 1,
    select: { id: true, name: true },
  }
  const rows = await (kind === 'ministry' ? prisma.ministry.findMany(args) : prisma.cell.findMany(args))
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}

export type GroupMemberRow = { member: PersonRef; role: AssignableRole }

// Membros de um grupo para a lista do drawer: sublíderes e membros, por nome. O líder fica de fora
// (aparece no campo Líder) e o cursor é o mesmo dos membros (nome, sobrenome, id).
export async function listGroupMembersPage(
  kind: GroupKind,
  groupId: number,
  after?: MemberCursor,
): Promise<Page<GroupMemberRow>> {
  const afterWhere: Prisma.MinistryMemberWhereInput & Prisma.CellMemberWhereInput = after
    ? {
        OR: [
          { member: { firstName: { gt: after.firstName } } },
          { member: { firstName: after.firstName, lastName: { gt: after.lastName } } },
          { member: { firstName: after.firstName, lastName: after.lastName }, memberId: { gt: after.id } },
        ],
      }
    : {}
  const asc = 'asc' as const
  const common = {
    orderBy: [{ member: { firstName: asc } }, { member: { lastName: asc } }, { memberId: asc }],
    take: PAGE_SIZE + 1,
    select: { role: true, member: personRef },
  }
  const roles = { in: [GROUP_ROLE.SubLeader, GROUP_ROLE.Member] }
  const rows =
    kind === 'ministry'
      ? await prisma.ministryMember.findMany({
          ...common,
          where: { AND: [{ ministryId: groupId, role: roles }, afterWhere] },
        })
      : await prisma.cellMember.findMany({
          ...common,
          where: { AND: [{ cellId: groupId, role: roles }, afterWhere] },
        })
  const asRole = (r: number): AssignableRole =>
    r === GROUP_ROLE.SubLeader ? GROUP_ROLE.SubLeader : GROUP_ROLE.Member
  return {
    items: rows.slice(0, PAGE_SIZE).map((r) => ({ member: r.member, role: asRole(r.role) })),
    hasMore: rows.length > PAGE_SIZE,
  }
}
