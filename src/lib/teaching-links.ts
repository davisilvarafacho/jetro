import type { Tx } from '@/lib/group-members'

// Mudanças na lista de inscritos de um curso ou de presentes de uma aula. A lista é paginada na
// tela e nunca está inteira no cliente, então o formulário envia só o que mudou.
export type MemberChanges = { add: number[]; remove: number[] }

const positiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0

// Lê o campo (JSON) do formulário item a item: um item inválido é descartado sem afetar os
// demais; JSON inválido, ausente ou fora do formato vira "sem mudanças".
export function parseMemberChangesField(raw: FormDataEntryValue | null): MemberChanges {
  const none: MemberChanges = { add: [], remove: [] }
  let parsed: unknown
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '{}')
  } catch {
    return none
  }
  if (typeof parsed !== 'object' || parsed === null) return none
  const { add, remove } = parsed as Record<string, unknown>
  return {
    add: (Array.isArray(add) ? add : []).filter(positiveInt),
    remove: (Array.isArray(remove) ? remove : []).filter(positiveInt),
  }
}

// Inscrição e presença têm tabelas de vínculo parecidas; só mudam o delegate e a coluna pai.
type LinkDelegate = {
  findMany(args: { where: Record<string, unknown> }): Promise<Record<string, number>[]>
  createMany(args: { data: Record<string, number>[] }): Promise<unknown>
  deleteMany(args: { where: Record<string, unknown> }): Promise<unknown>
}

const KINDS = {
  enrollment: { delegate: 'courseEnrollment', key: 'courseId' },
  attendance: { delegate: 'lessonAttendance', key: 'lessonId' },
} as const

// Idempotente: ids repetidos, de membro inexistente ou que já têm linha são ignorados, e
// remover quem não tem linha não faz nada. Quem está em `add` e `remove` fica removido.
// FUTURO: módulo de logs registrará estas mudanças automaticamente.
export async function applyMemberChanges(
  tx: Tx,
  kind: 'enrollment' | 'attendance',
  parentId: number,
  changes: MemberChanges,
): Promise<void> {
  const { delegate, key } = KINDS[kind]
  const table = tx[delegate] as unknown as LinkDelegate

  const toRemove = new Set(changes.remove)
  const toAdd = [...new Set(changes.add)].filter((id) => !toRemove.has(id))

  if (toAdd.length) {
    const existing = new Set(
      (await tx.member.findMany({ where: { id: { in: toAdd } }, select: { id: true } })).map((m) => m.id),
    )
    const linked = new Set(
      (await table.findMany({ where: { [key]: parentId, memberId: { in: toAdd } } })).map((l) => l.memberId),
    )
    // Sem `skipDuplicates` (não há garantia no SQLite): só entra quem ainda não tem linha.
    const data = toAdd
      .filter((memberId) => existing.has(memberId) && !linked.has(memberId))
      .map((memberId) => ({ [key]: parentId, memberId }))
    if (data.length) await table.createMany({ data })
  }

  if (toRemove.size) {
    await table.deleteMany({ where: { [key]: parentId, memberId: { in: [...toRemove] } } })
  }
}
