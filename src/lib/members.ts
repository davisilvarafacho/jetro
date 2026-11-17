import { prisma } from '@/lib/prisma'
import { fullName } from '@/lib/person-name'

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
}

export type Dependents = {
  liderados: { id: number; name: string }[]
  parcaDe: { id: number; name: string }[]
  ministerios: { id: number; name: string }[]
  celulas: { id: number; name: string }[]
}

const personRef = { select: { id: true, firstName: true, lastName: true } } as const

export async function listMembers(): Promise<MemberRow[]> {
  return prisma.member.findMany({
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      cpf: true,
      firstName: true,
      lastName: true,
      leader: personRef,
      parca: personRef,
    },
  })
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
