'use server'

import { z } from 'zod'
import {
  listGroupMembersPage,
  listGroupsPage,
  searchGroupOptions,
  type GroupMemberRow,
  type GroupOption,
  type GroupRow,
} from '@/lib/groups'
import { searchMemberOptions, type PersonRef } from '@/lib/members'
import type { Page } from '@/lib/pagination'
import { requireUser } from '@/lib/session'

// Consultas paginadas que as telas chamam ao rolar (listas) ou ao abrir e buscar (seletores).
// Cada uma valida a entrada, porque chega de um cliente que pode ter sido adulterado.

const kind = z.enum(['ministry', 'cell'])
const id = z.number().int().positive()
const q = z.string().max(100)
const memberCursor = z.object({ firstName: z.string(), lastName: z.string(), id }).optional()
const groupCursor = z.object({ name: z.string() }).optional()

const memberSearch = z.object({
  q,
  after: memberCursor,
  excludeIds: z.array(id).max(200).optional(),
  excludeFromGroup: z.object({ kind, id }).optional(),
})

export async function searchMembers(params: z.input<typeof memberSearch>): Promise<Page<PersonRef>> {
  await requireUser()
  return searchMemberOptions(memberSearch.parse(params))
}

const groupSearch = z.object({ q, after: groupCursor, excludeLeaderId: id.optional() })

export async function searchGroups(
  groupKind: z.input<typeof kind>,
  params: z.input<typeof groupSearch>,
): Promise<Page<GroupOption>> {
  await requireUser()
  return searchGroupOptions(kind.parse(groupKind), groupSearch.parse(params))
}

export async function loadGroups(
  groupKind: z.input<typeof kind>,
  after?: z.input<typeof groupCursor>,
): Promise<Page<GroupRow>> {
  await requireUser()
  return listGroupsPage(kind.parse(groupKind), groupCursor.parse(after))
}

export async function loadGroupMembers(
  groupKind: z.input<typeof kind>,
  groupId: number,
  after?: z.input<typeof memberCursor>,
): Promise<Page<GroupMemberRow>> {
  await requireUser()
  return listGroupMembersPage(kind.parse(groupKind), id.parse(groupId), memberCursor.parse(after))
}
