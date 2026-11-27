import type { Prisma } from '@/generated/prisma/client'
import { onlyDigits } from '@/lib/cpf'
import { PAGE_SIZE, type Page } from '@/lib/pagination'
import { prisma } from '@/lib/prisma'
import { fullName } from '@/lib/person-name'
import type { GroupKind } from '@/lib/group-members'
import { GROUP_ROLE, type AssignableRole } from '@/lib/group-roles'

// fullName vive em person-name.ts para componentes de cliente usarem sem puxar o Prisma.
export { fullName }

export type PersonRef = { id: number; firstName: string; lastName: string }

export type MemberRow = {
  id: number
  cpf: string
  firstName: string
  lastName: string
  parca: PersonRef | null
  // Liderança vem de Ministry.leaderId / Cell.leaderId (fonte da verdade), não dos vínculos role=1.
  leads: { kind: GroupKind; id: number; name: string }[]
  // Vínculos como sublíder (2) ou membro (3).
  participates: { kind: GroupKind; id: number; name: string; role: AssignableRole }[]
}

export type Dependents = {
  parcaDe: { id: number; name: string }[]
  ministerios: { id: number; name: string }[]
  celulas: { id: number; name: string }[]
}

const personRef = { select: { id: true, firstName: true, lastName: true } } as const

const memberSelect = {
  id: true,
  cpf: true,
  firstName: true,
  lastName: true,
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
} satisfies Prisma.MemberSelect

type MemberRecord = Prisma.MemberGetPayload<{ select: typeof memberSelect }>

const asRole = (role: number): AssignableRole =>
  role === GROUP_ROLE.SubLeader ? GROUP_ROLE.SubLeader : GROUP_ROLE.Member

// Ministérios antes de células; dentro de cada tipo, por nome.
const collator = new Intl.Collator('pt-BR')
const sortGroups = <T extends { kind: GroupKind; name: string }>(items: T[]): T[] =>
  items.sort(
    (a, b) =>
      (a.kind === b.kind ? 0 : a.kind === 'ministry' ? -1 : 1) || collator.compare(a.name, b.name),
  )

function toMemberRow({ ministerios, celulas, ministryLinks, cellLinks, ...m }: MemberRecord): MemberRow {
  return {
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
  }
}

const memberOrder = [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }] as const

export type MemberFilter = { q: string }
// Posição do último membro já entregue; a próxima página começa logo depois dele, na mesma ordem
// (nome, sobrenome, id). Não depende de o membro ainda existir, ao contrário de um cursor por id.
export type MemberCursor = { firstName: string; lastName: string; id: number }
export type MembersPage = Page<MemberRow>

function membersWhere(
  { q }: MemberFilter,
  after?: MemberCursor,
  extra: Prisma.MemberWhereInput[] = [],
): Prisma.MemberWhereInput {
  const and: Prisma.MemberWhereInput[] = [...extra]
  // Cada palavra precisa aparecer no nome ou no sobrenome; dígitos também casam com o CPF.
  const terms = q.trim().split(/\s+/).filter(Boolean)
  if (terms.length > 0) {
    const byName: Prisma.MemberWhereInput = {
      AND: terms.map((t) => ({
        OR: [{ firstName: { contains: t } }, { lastName: { contains: t } }],
      })),
    }
    const digits = onlyDigits(q)
    and.push(digits ? { OR: [byName, { cpf: { contains: digits } }] } : byName)
  }

  if (after) {
    and.push({
      OR: [
        { firstName: { gt: after.firstName } },
        { firstName: after.firstName, lastName: { gt: after.lastName } },
        { firstName: after.firstName, lastName: after.lastName, id: { gt: after.id } },
      ],
    })
  }
  return { AND: and }
}

export async function listMembersPage(
  filter: MemberFilter,
  after?: MemberCursor,
): Promise<MembersPage> {
  const rows = await prisma.member.findMany({
    where: membersWhere(filter, after),
    orderBy: [...memberOrder],
    take: PAGE_SIZE + 1,
    select: memberSelect,
  })
  return {
    items: rows.slice(0, PAGE_SIZE).map(toMemberRow),
    hasMore: rows.length > PAGE_SIZE,
  }
}

export async function getMemberRow(id: number): Promise<MemberRow | null> {
  const row = await prisma.member.findUnique({ where: { id }, select: memberSelect })
  return row ? toMemberRow(row) : null
}

// Painel do membro: os vínculos de MemberRow mais o que só o painel precisa (tamanho dos grupos
// que ele lidera, pessoas sob sua liderança, de quem ele é parça).
export type PanelGroup = { kind: GroupKind; id: number; name: string; people: number }
export type MemberPanelData = {
  member: MemberRow
  leads: PanelGroup[]
  // Pessoas distintas nos grupos que ele lidera, sem contá-lo.
  peopleLed: number
  parcaOf: { total: number; preview: PersonRef[] }
}

const PARCA_PREVIEW = 8

export async function getMemberPanel(id: number): Promise<MemberPanelData | null> {
  const member = await getMemberRow(id)
  if (!member) return null
  // O líder também tem vínculo (role=1) no próprio grupo; "pessoas" são os outros.
  const people = { select: { members: { where: { memberId: { not: id } } } } }
  const [ministries, cells, peopleLed, parcaTotal, parcaPreview] = await Promise.all([
    prisma.ministry.findMany({
      where: { leaderId: id },
      select: { id: true, name: true, _count: people },
    }),
    prisma.cell.findMany({
      where: { leaderId: id },
      select: { id: true, name: true, _count: people },
    }),
    prisma.member.count({
      where: {
        id: { not: id },
        OR: [
          { ministryLinks: { some: { ministry: { leaderId: id } } } },
          { cellLinks: { some: { cell: { leaderId: id } } } },
        ],
      },
    }),
    prisma.member.count({ where: { parcaId: id } }),
    prisma.member.findMany({
      where: { parcaId: id },
      orderBy: [...memberOrder],
      take: PARCA_PREVIEW,
      select: personRef.select,
    }),
  ])
  return {
    member,
    leads: sortGroups([
      ...ministries.map((g) => ({ kind: 'ministry' as const, id: g.id, name: g.name, people: g._count.members })),
      ...cells.map((g) => ({ kind: 'cell' as const, id: g.id, name: g.name, people: g._count.members })),
    ]),
    peopleLed,
    parcaOf: { total: parcaTotal, preview: parcaPreview },
  }
}

export function countMembers(): Promise<number> {
  return prisma.member.count()
}

export type MemberOptionQuery = {
  q: string
  after?: MemberCursor
  // Fora da lista: o próprio membro (parça de si mesmo não faz sentido), quem já foi escolhido…
  excludeIds?: number[]
  // …e quem já pertence a este grupo (o seletor "Adicionar membro" só oferece quem ainda não está).
  excludeFromGroup?: { kind: GroupKind; id: number }
  // …ou quem já tem linha neste curso (inscrição) ou nesta aula (presença).
  excludeFromSet?: { kind: 'enrollment' | 'attendance'; id: number }
}

// Página de membros para os selects: só o necessário para escolher uma pessoa, com busca no servidor.
export async function searchMemberOptions({
  q,
  after,
  excludeIds = [],
  excludeFromGroup,
  excludeFromSet,
}: MemberOptionQuery): Promise<Page<PersonRef>> {
  const extra: Prisma.MemberWhereInput[] = []
  if (excludeIds.length) extra.push({ id: { notIn: excludeIds } })
  if (excludeFromGroup) {
    extra.push(
      excludeFromGroup.kind === 'ministry'
        ? { ministryLinks: { none: { ministryId: excludeFromGroup.id } } }
        : { cellLinks: { none: { cellId: excludeFromGroup.id } } },
    )
  }
  if (excludeFromSet) {
    extra.push(
      excludeFromSet.kind === 'enrollment'
        ? { enrollments: { none: { courseId: excludeFromSet.id } } }
        : { attendances: { none: { lessonId: excludeFromSet.id } } },
    )
  }
  const rows = await prisma.member.findMany({
    where: membersWhere({ q }, after, extra),
    orderBy: [...memberOrder],
    take: PAGE_SIZE + 1,
    select: { id: true, firstName: true, lastName: true },
  })
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}

export async function getDependents(id: number): Promise<Dependents> {
  const [parcaDe, ministerios, celulas] = await Promise.all([
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
