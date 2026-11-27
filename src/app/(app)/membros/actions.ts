'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { isValidCpf, onlyDigits } from '@/lib/cpf'
import { setMemberGroups, type GroupKind } from '@/lib/group-members'
import type { AssignableRole } from '@/lib/group-roles'
import {
  blockedDeleteMessage,
  getDependents,
  getMemberRow,
  getMemberships,
  listMembersPage,
  type Dependents,
  type MemberRow,
  type MembersPage,
} from '@/lib/members'
import { fullName } from '@/lib/person-name'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

type Field = 'cpf' | 'firstName' | 'lastName' | 'parcaId'
export type MemberFormState = { ok?: boolean; errors?: Partial<Record<Field, string>> }

const schema = z.object({
  cpf: z
    .string()
    .transform(onlyDigits)
    .pipe(z.string().min(1, 'Informe o CPF').refine(isValidCpf, 'CPF inválido')),
  firstName: z.string().trim().min(1, 'Informe o nome'),
  lastName: z.string().trim().min(1, 'Informe o sobrenome'),
})

function optionalId(value: FormDataEntryValue | null): number | null {
  const n = Number(value)
  return typeof value === 'string' && value !== '' && Number.isInteger(n) ? n : null
}

// Lê a lista separada por vírgula do MultiSelect: só inteiros positivos, sem repetição.
function parseIds(value: FormDataEntryValue | null): number[] {
  if (typeof value !== 'string') return []
  const ids = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0)
  return [...new Set(ids)]
}

// Descarta ids inexistentes (a FK falharia) e grupos que a própria pessoa lidera: a liderança
// vem do cadastro do grupo e não se altera por aqui.
async function existingGroupIds(
  tx: Prisma.TransactionClient,
  kind: GroupKind,
  ids: number[],
  memberId: number,
): Promise<number[]> {
  if (!ids.length) return []
  const where = { id: { in: ids } }
  const rows =
    kind === 'ministry'
      ? await tx.ministry.findMany({ where, select: { id: true, leaderId: true } })
      : await tx.cell.findMany({ where, select: { id: true, leaderId: true } })
  return rows.filter((g) => g.leaderId !== memberId).map((g) => g.id)
}

// Os drawers de ministérios e células listam membros, então também dependem do cadastro.
function revalidateMemberPages() {
  revalidatePath('/membros')
  revalidatePath('/membros/[id]', 'page')
  revalidatePath('/ministerios')
  revalidatePath('/celulas')
  revalidatePath('/cursos')
  revalidatePath('/aulas')
}

export async function saveMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireUser()

  const id = optionalId(formData.get('id'))
  const parcaId = optionalId(formData.get('parcaId'))
  const ministryIds = parseIds(formData.get('ministryIds'))
  const cellIds = parseIds(formData.get('cellIds'))

  const errors: Partial<Record<Field, string>> = {}
  const parsed = schema.safeParse({
    cpf: String(formData.get('cpf') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as Field
      errors[key] ??= issue.message
    }
  }

  if (id !== null && parcaId === id) errors.parcaId = 'Um membro não pode ser parça de si mesmo'

  if (parsed.success && !errors.cpf) {
    const other = await prisma.member.findUnique({
      where: { cpf: parsed.data.cpf },
      select: { id: true },
    })
    if (other && other.id !== id) errors.cpf = 'Este CPF já está cadastrado'
  }

  if (Object.keys(errors).length > 0 || !parsed.success) return { errors }

  const data = { ...parsed.data, parcaId }
  try {
    await prisma.$transaction(async (tx) => {
      const saved =
        id !== null
          ? await tx.member.update({ where: { id }, data, select: { id: true } })
          : await tx.member.create({ data, select: { id: true } })
      await setMemberGroups(
        tx,
        'ministry',
        saved.id,
        await existingGroupIds(tx, 'ministry', ministryIds, saved.id),
      )
      await setMemberGroups(
        tx,
        'cell',
        saved.id,
        await existingGroupIds(tx, 'cell', cellIds, saved.id),
      )
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { errors: { cpf: 'Este CPF já está cadastrado' } }
    }
    throw error
  }

  revalidateMemberPages()
  return { ok: true }
}

export type DeleteMemberResult =
  | { ok: true }
  | {
      ok: false
      message: string
      dependents: { id: number; name: string; kind: 'parca' | 'ministerio' | 'celula' | 'aula' }[]
      // Quantas aulas ele leciona no total; a lista traz só as mais recentes.
      aulasTotal: number
    }

function toDependentList(deps: Dependents) {
  return [
    ...deps.parcaDe.map((d) => ({ ...d, kind: 'parca' as const })),
    ...deps.ministerios.map((d) => ({ ...d, kind: 'ministerio' as const })),
    ...deps.celulas.map((d) => ({ ...d, kind: 'celula' as const })),
    ...deps.aulas.map((d) => ({ ...d, kind: 'aula' as const })),
  ]
}

export async function deleteMember(id: number): Promise<DeleteMemberResult> {
  await requireUser()

  const member = await prisma.member.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  })
  if (!member) {
    revalidateMemberPages()
    return { ok: true }
  }

  const deps = await getDependents(id)
  const message = blockedDeleteMessage(fullName(member), deps)
  if (message) {
    return { ok: false, message, dependents: toDependentList(deps), aulasTotal: deps.aulasTotal }
  }

  await prisma.member.delete({ where: { id } })
  revalidateMemberPages()
  return { ok: true }
}

export type DeleteImpact =
  | {
      blocked: true
      message: string
      dependents: Extract<DeleteMemberResult, { ok: false }>['dependents']
      aulasTotal: number
    }
  | {
      blocked: false
      memberships: { kind: GroupKind; id: number; name: string; role: AssignableRole }[]
    }

// Só consulta, nunca apaga: a confirmação mostra o que sairá junto. O bloqueio é conferido de novo
// em deleteMember, porque o membro pode virar líder entre abrir a confirmação e confirmar.
export async function getDeleteImpact(id: number): Promise<DeleteImpact> {
  await requireUser()

  const member = await prisma.member.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  })
  if (!member) return { blocked: false, memberships: [] }

  const deps = await getDependents(id)
  const message = blockedDeleteMessage(fullName(member), deps)
  if (message) {
    return {
      blocked: true,
      message,
      dependents: toDependentList(deps),
      aulasTotal: deps.aulasTotal,
    }
  }

  return { blocked: false, memberships: await getMemberships(id) }
}

const loadMoreSchema = z.object({
  q: z.string().max(100),
  after: z
    .object({ firstName: z.string(), lastName: z.string(), id: z.number().int().positive() })
    .optional(),
})

// Próxima página da rolagem infinita, com o mesmo filtro da página que o usuário está vendo.
export async function loadMoreMembers(params: z.input<typeof loadMoreSchema>): Promise<MembersPage> {
  await requireUser()
  const { after, ...filter } = loadMoreSchema.parse(params)
  return listMembersPage(filter, after)
}

// Um membro que pode não estar na lista carregada (ex.: parça citado no bloqueio de exclusão).
export async function loadMember(id: number): Promise<MemberRow | null> {
  await requireUser()
  return getMemberRow(z.number().int().positive().parse(id))
}
