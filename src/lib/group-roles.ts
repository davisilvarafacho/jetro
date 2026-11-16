export const GROUP_ROLE = { Leader: 1, SubLeader: 2, Member: 3 } as const

export type GroupRole = 1 | 2 | 3
export type AssignableRole = 2 | 3

const LABELS: Record<GroupRole, string> = {
  1: 'Líder',
  2: 'Sublíder',
  3: 'Membro',
}

export function roleLabel(role: GroupRole): string {
  return LABELS[role]
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return value === GROUP_ROLE.SubLeader || value === GROUP_ROLE.Member
}
