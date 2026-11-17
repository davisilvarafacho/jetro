'use client'

import { ActionIcon, Select } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { PersonPill } from '@/components/person'
import type { GroupMemberEntry } from '@/lib/group-members'
import { GROUP_ROLE, isAssignableRole, roleLabel } from '@/lib/group-roles'
import { fullName } from '@/lib/person-name'
import classes from './group-members-field.module.css'

export type { GroupMemberEntry }
type Candidate = { id: number; firstName: string; lastName: string }

type Props = {
  candidates: Candidate[]
  leaderId: string | null
  value: GroupMemberEntry[]
  onChange: (value: GroupMemberEntry[]) => void
}

const ROLE_OPTIONS = [GROUP_ROLE.SubLeader, GROUP_ROLE.Member].map((role) => ({
  value: String(role),
  label: roleLabel(role),
}))

export function GroupMembersField({ candidates, leaderId, value, onChange }: Props) {
  const byId = new Map(candidates.map((c) => [c.id, c]))
  const taken = new Set(value.map((v) => v.memberId))
  const options = candidates
    .filter((c) => String(c.id) !== leaderId && !taken.has(c.id))
    .map((c) => ({ value: String(c.id), label: fullName(c) }))

  return (
    <div className={classes.field}>
      <Select
        label="Adicionar membro"
        description={leaderId === null ? 'Escolha o líder primeiro' : undefined}
        placeholder="Busque pelo nome"
        nothingFoundMessage="Nenhum membro encontrado"
        data={options}
        value={null}
        onChange={(id) => {
          if (id) onChange([...value, { memberId: Number(id), role: GROUP_ROLE.Member }])
        }}
        disabled={leaderId === null}
        searchable
      />
      {value.length > 0 && (
        <ul className={classes.list}>
          {value.map((entry) => {
            const person = byId.get(entry.memberId)
            const name = person ? fullName(person) : `Membro ${entry.memberId}`
            return (
              <li key={entry.memberId} className={classes.row}>
                <PersonPill name={name} />
                <Select
                  className={classes.role}
                  aria-label={`Papel de ${name}`}
                  data={ROLE_OPTIONS}
                  value={String(entry.role)}
                  allowDeselect={false}
                  onChange={(role) => {
                    const next = Number(role)
                    if (!isAssignableRole(next)) return
                    onChange(
                      value.map((v) => (v.memberId === entry.memberId ? { ...v, role: next } : v)),
                    )
                  }}
                />
                <ActionIcon
                  variant="subtle"
                  className={classes.remove}
                  aria-label={`Remover ${name}`}
                  title="Remover"
                  onClick={() => onChange(value.filter((v) => v.memberId !== entry.memberId))}
                >
                  <IconX size={18} stroke={1.75} />
                </ActionIcon>
              </li>
            )
          })}
        </ul>
      )}
      <input type="hidden" name="members" value={JSON.stringify(value)} />
    </div>
  )
}
