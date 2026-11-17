import { prisma } from '@/lib/prisma'
import { fullName } from '@/lib/person-name'
import type { GroupKind } from '@/lib/group-members'
import { GROUP_ROLE, type AssignableRole } from '@/lib/group-roles'

// fullName vive em person-name.ts para componentes de cliente usarem sem puxar o Prisma.
export { fullName }

type PersonRef = { id: number; firstName: string; lastName: string }

export type MemberRow = {
  id: number
  cpf: string
  firstName: string
  lastName: string
  leader: PersonRef | null
  parca: PersonRef | null
  // Liderança vem de Ministry.leaderId / Cell.leaderId (fonte da verdade), não dos vínculos role=1.
  leads: { kind: GroupKind; id: number; name: string }[]
  // Vínculos como sublíder (2) ou membro (3).
  participates: { kind: GroupKind; id: number; name: string; role: AssignableRole }[]
}

export type Dependents = {
  liderados: { id: number; name: string }[]
  parcaDe: { id: number; name: string }[]
  ministerios: { id: number; name: string }[]
  celulas: { id: number; name: string }[]
}

const personRef = { select: { id: true, firstName: true, lastName: true } } as const

export async function listMembers(): Promise<MemberRow[]> {
  const rows = await prisma.member.findMany({
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      cpf: true,
      firstName: true,
      lastName: true,
      leader: personRef,
      parca: personRef,
      ministerios: { select: { id: true, name: true } },
      celulas: { select: { id: true, name: true } },
      ministryLinks: {
        where: { role: { in: [GROUP_ROLE.SubLeader, GROUP_ROLE.Member] } },
        select: { role: true, ministry: { select: { id: true, name: true } } },
      },
      cellLinks: {
        where: { role: { in: [GROUP_ROLE.SubLeader, GROUP_ROLE.Member] } },
        select: { role: true, cell: { select: { id: true, name: true } } },
      },
    },
  })
  const asRole = (role: number): AssignableRole =>
    role === GROUP_ROLE.SubLeader ? GROUP_ROLE.SubLeader : GROUP_ROLE.Member
  // Ministérios antes de células; dentro de cada tipo, por nome.
  const collator = new Intl.Collator('pt-BR')
  const sortGroups = <T extends { kind: GroupKind; name: string }>(items: T[]): T[] =>
    items.sort(
      (a, b) =>
        (a.kind === b.kind ? 0 : a.kind === 'ministry' ? -1 : 1) || collator.compare(a.name, b.name),
    )
  return rows.map(({ ministerios, celulas, ministryLinks, cellLinks, ...m }) => ({
    ...m,
    leads: sortGroups([
      ...ministerios.map((g) => ({ kind: 'ministry' as const, ...g })),
      ...celulas.map((g) => ({ kind: 'cell' as const, ...g })),
    ]),
    participates: sortGroups([
      ...ministryLinks.map((l) => ({
        kind: 'ministry' as const,
        ...l.ministry,
        role: asRole(l.role),
      })),
      ...cellLinks.map((l) => ({ kind: 'cell' as const, ...l.cell, role: asRole(l.role) })),
    ]),
  }))
}

// Sobe a cadeia de líderes a partir do candidato; true se passar por memberId.
export async function isInLeaderChainBelow(
  memberId: number,
  candidateLeaderId: number,
): Promise<boolean> {
  const seen = new Set<number>()
  let current: number | null = candidateLeaderId
  while (current !== null && !seen.has(current)) {
    if (current === memberId) return true
    seen.add(current)
    const row: { leaderId: number | null } | null = await prisma.member.findUnique({
      where: { id: current },
      select: { leaderId: true },
    })
    current = row?.leaderId ?? null
  }
  return false
}

export async function getDependents(id: number): Promise<Dependents> {
  const [liderados, parcaDe, ministerios, celulas] = await Promise.all([
    prisma.member.findMany({
      where: { leaderId: id },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.member.findMany({
      where: { parcaId: id },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.ministry.findMany({
      where: { leaderId: id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.cell.findMany({
      where: { leaderId: id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])
  return {
    liderados: liderados.map((m) => ({ id: m.id, name: fullName(m) })),
    parcaDe: parcaDe.map((m) => ({ id: m.id, name: fullName(m) })),
    ministerios,
    celulas,
  }
}

// Vínculos de participação (sublíder/membro) que somem junto com o membro. Só consulta.
export async function getMemberships(
  id: number,
): Promise<{ kind: GroupKind; id: number; name: string; role: AssignableRole }[]> {
  const roles = [GROUP_ROLE.SubLeader, GROUP_ROLE.Member]
  const [ministryLinks, cellLinks] = await Promise.all([
    prisma.ministryMember.findMany({
      where: { memberId: id, role: { in: roles } },
      select: { role: true, ministry: { select: { id: true, name: true } } },
    }),
    prisma.cellMember.findMany({
      where: { memberId: id, role: { in: roles } },
      select: { role: true, cell: { select: { id: true, name: true } } },
    }),
  ])
  const asRole = (role: number): AssignableRole =>
    role === GROUP_ROLE.SubLeader ? GROUP_ROLE.SubLeader : GROUP_ROLE.Member
  const collator = new Intl.Collator('pt-BR')
  const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name)
  // Ministérios antes de células; dentro de cada tipo, por nome.
  return [
    ...ministryLinks
      .map((l) => ({ kind: 'ministry' as const, ...l.ministry, role: asRole(l.role) }))
      .sort(byName),
    ...cellLinks
      .map((l) => ({ kind: 'cell' as const, ...l.cell, role: asRole(l.role) }))
      .sort(byName),
  ]
}

export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

export function blockedDeleteMessage(name: string, deps: Dependents): string | null {
  const parts: string[] = []
  if (deps.liderados.length) parts.push(`líder de ${joinPt(deps.liderados.map((d) => d.name))}`)
  if (deps.parcaDe.length) parts.push(`parça de ${joinPt(deps.parcaDe.map((d) => d.name))}`)
  if (deps.ministerios.length) {
    const label = deps.ministerios.length > 1 ? 'líder dos ministérios' : 'líder do ministério'
    parts.push(`${label} ${joinPt(deps.ministerios.map((d) => d.name))}`)
  }
  if (deps.celulas.length) {
    const label = deps.celulas.length > 1 ? 'líder das células' : 'líder da célula'
    parts.push(`${label} ${joinPt(deps.celulas.map((d) => d.name))}`)
  }
  if (!parts.length) return null
  return `Não é possível excluir ${name}: ${name} é ${joinPt(parts)}. Troque esses vínculos antes de excluir.`
}
