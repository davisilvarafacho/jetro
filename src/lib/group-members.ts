import type { Prisma } from '@/generated/prisma/client'
import { GROUP_ROLE, isAssignableRole, type AssignableRole } from '@/lib/group-roles'

export type GroupKind = 'ministry' | 'cell'
export type Tx = Prisma.TransactionClient
export type GroupMemberEntry = { memberId: number; role: AssignableRole }

// Lê o campo `members` (JSON) do formulário item a item: um item inválido é descartado
// sem apagar os demais; JSON inválido ou que não seja lista vira [].
export function parseGroupMembersField(raw: FormDataEntryValue | null): GroupMemberEntry[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const entries: GroupMemberEntry[] = []
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue
    const { memberId, role } = item as Record<string, unknown>
    if (typeof memberId !== 'number' || !Number.isInteger(memberId) || memberId <= 0) continue
    if (!isAssignableRole(role)) continue
    entries.push({ memberId, role })
  }
  return entries
}

type Link = { memberId: number; groupId: number; role: number }

// Ministério e célula têm tabelas de vínculo idênticas; só mudam o delegate e a coluna de chave.
type LinkDelegate = {
  findMany(args: { where: Record<string, unknown> }): Promise<Record<string, number>[]>
  createMany(args: { data: Record<string, number>[] }): Promise<unknown>
  updateMany(args: {
    where: Record<string, unknown>
    data: { role: number }
  }): Promise<unknown>
  deleteMany(args: { where: Record<string, unknown> }): Promise<unknown>
}

const KINDS = {
  ministry: { delegate: 'ministryMember', key: 'ministryId' },
  cell: { delegate: 'cellMember', key: 'cellId' },
} as const

function linksOf(tx: Tx, kind: GroupKind) {
  const { delegate, key } = KINDS[kind]
  const table = tx[delegate] as unknown as LinkDelegate
  return {
    key,
    table,
    async list(where: Record<string, unknown>): Promise<Link[]> {
      const rows = await table.findMany({ where })
      return rows.map((r) => ({ memberId: r.memberId, groupId: r[key], role: r.role }))
    },
  }
}

// FUTURO: módulo de logs registrará estas mudanças automaticamente.
export async function saveGroupMembers(
  tx: Tx,
  kind: GroupKind,
  groupId: number,
  opts: {
    leaderId: number
    previousLeaderId: number | null
    members: { memberId: number; role: AssignableRole }[]
  },
): Promise<void> {
  const { leaderId, previousLeaderId, members } = opts
  const { key, table, list } = linksOf(tx, kind)

  const existingMembers = await tx.member.findMany({
    where: { id: { in: members.map((m) => m.memberId) } },
    select: { id: true },
  })
  const existingIds = new Set(existingMembers.map((m) => m.id))

  const desired = new Map<number, number>([[leaderId, GROUP_ROLE.Leader]])
  for (const m of members) {
    // role=1 só vem de leaderId; ignora qualquer outro papel vindo de fora.
    if (!isAssignableRole(m.role)) continue
    if (desired.has(m.memberId) || !existingIds.has(m.memberId)) continue
    desired.set(m.memberId, m.role)
  }
  if (previousLeaderId !== null && !desired.has(previousLeaderId)) {
    desired.set(previousLeaderId, GROUP_ROLE.Member)
  }

  const current = await list({ [key]: groupId })
  const currentByMember = new Map(current.map((l) => [l.memberId, l]))

  await table.deleteMany({
    where: { [key]: groupId, memberId: { notIn: [...desired.keys()] } },
  })

  const toCreate: Record<string, number>[] = []
  for (const [memberId, role] of desired) {
    const link = currentByMember.get(memberId)
    if (!link) toCreate.push({ [key]: groupId, memberId, role })
    else if (link.role !== role) {
      await table.updateMany({ where: { [key]: groupId, memberId }, data: { role } })
    }
  }
  if (toCreate.length) await table.createMany({ data: toCreate })
}

export async function setMemberGroups(
  tx: Tx,
  kind: GroupKind,
  memberId: number,
  groupIds: number[],
): Promise<void> {
  const { key, table, list } = linksOf(tx, kind)
  const wanted = new Set(groupIds)

  const current = await list({ memberId })
  const linked = new Set(current.map((l) => l.groupId))

  const toRemove = current
    .filter((l) => !wanted.has(l.groupId) && l.role !== GROUP_ROLE.Leader)
    .map((l) => l.groupId)
  if (toRemove.length) {
    await table.deleteMany({ where: { memberId, [key]: { in: toRemove } } })
  }

  const toCreate = [...wanted]
    .filter((groupId) => !linked.has(groupId))
    .map((groupId) => ({ memberId, [key]: groupId, role: GROUP_ROLE.Member }))
  if (toCreate.length) await table.createMany({ data: toCreate })
}
