import type { Prisma } from '@/generated/prisma/client'
import { GROUP_ROLE, isAssignableRole, type AssignableRole } from '@/lib/group-roles'

export type GroupKind = 'ministry' | 'cell'
export type Tx = Prisma.TransactionClient
export type GroupMemberEntry = { memberId: number; role: AssignableRole }

// Mudanças na lista de membros de um grupo. A lista é paginada na tela e nunca está inteira no
// cliente, então o formulário envia só o que mudou: `set` adiciona ou troca o papel, `remove` tira.
export type GroupMemberChanges = { set: GroupMemberEntry[]; remove: number[] }

const positiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0

// Lê o campo `memberChanges` (JSON) do formulário item a item: um item inválido é descartado
// sem afetar os demais; JSON inválido ou fora do formato vira "sem mudanças".
export function parseGroupChangesField(raw: FormDataEntryValue | null): GroupMemberChanges {
  const none: GroupMemberChanges = { set: [], remove: [] }
  let parsed: unknown
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '{}')
  } catch {
    return none
  }
  if (typeof parsed !== 'object' || parsed === null) return none
  const { set, remove } = parsed as Record<string, unknown>

  const entries: GroupMemberEntry[] = []
  for (const item of Array.isArray(set) ? set : []) {
    if (typeof item !== 'object' || item === null) continue
    const { memberId, role } = item as Record<string, unknown>
    if (positiveInt(memberId) && isAssignableRole(role)) entries.push({ memberId, role })
  }
  return { set: entries, remove: (Array.isArray(remove) ? remove : []).filter(positiveInt) }
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
export async function applyGroupMemberChanges(
  tx: Tx,
  kind: GroupKind,
  groupId: number,
  opts: { leaderId: number; previousLeaderId: number | null; changes: GroupMemberChanges },
): Promise<void> {
  const { leaderId, previousLeaderId, changes } = opts
  const { key, table, list } = linksOf(tx, kind)

  // O líder sempre tem o vínculo role=1 (cria ou promove o que já existia).
  const [leaderLink] = await list({ [key]: groupId, memberId: leaderId })
  if (!leaderLink) await table.createMany({ data: [{ [key]: groupId, memberId: leaderId, role: GROUP_ROLE.Leader }] })
  else if (leaderLink.role !== GROUP_ROLE.Leader) {
    await table.updateMany({
      where: { [key]: groupId, memberId: leaderId },
      data: { role: GROUP_ROLE.Leader },
    })
  }

  // Quem deixou a liderança continua no grupo como membro comum.
  if (previousLeaderId !== null && previousLeaderId !== leaderId) {
    await table.updateMany({
      where: { [key]: groupId, memberId: previousLeaderId, role: GROUP_ROLE.Leader },
      data: { role: GROUP_ROLE.Member },
    })
  }

  // role=1 só vem de leaderId: itens com outro papel, o próprio líder, repetidos ou de membros
  // que não existem são ignorados.
  const requested = new Map<number, number>()
  for (const { memberId, role } of changes.set) {
    if (!isAssignableRole(role) || memberId === leaderId || requested.has(memberId)) continue
    requested.set(memberId, role)
  }
  if (requested.size > 0) {
    const ids = [...requested.keys()]
    const existing = new Set(
      (await tx.member.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((m) => m.id),
    )
    const current = new Map(
      (await list({ [key]: groupId, memberId: { in: ids } })).map((l) => [l.memberId, l.role]),
    )
    const toCreate: Record<string, number>[] = []
    for (const [memberId, role] of requested) {
      if (!existing.has(memberId)) continue
      const currentRole = current.get(memberId)
      if (currentRole === undefined) toCreate.push({ [key]: groupId, memberId, role })
      else if (currentRole !== role) {
        await table.updateMany({ where: { [key]: groupId, memberId }, data: { role } })
      }
    }
    if (toCreate.length) await table.createMany({ data: toCreate })
  }

  // Remoções nunca atingem o líder (role=1).
  const toRemove = changes.remove.filter((id) => id !== leaderId)
  if (toRemove.length) {
    await table.deleteMany({
      where: { [key]: groupId, memberId: { in: toRemove }, role: { not: GROUP_ROLE.Leader } },
    })
  }
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
