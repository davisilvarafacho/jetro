'use client'

import { useCallback, useMemo } from 'react'
import { ActionIcon, Button, Loader, Select } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { loadGroupMembers, searchMembers } from '@/app/(app)/lookups'
import { PersonPill } from '@/components/person'
import { RemoteSelect } from '@/components/remote-select'
import type { GroupKind } from '@/lib/group-members'
import { GROUP_ROLE, isAssignableRole, roleLabel, type AssignableRole } from '@/lib/group-roles'
import type { GroupMemberRow } from '@/lib/groups'
import type { PersonRef } from '@/lib/members'
import { fullName } from '@/lib/person-name'
import { useInfiniteList } from '@/lib/use-infinite-list'
import classes from './group-members-field.module.css'

// A lista de membros de um grupo é paginada: o formulário nunca tem todos os membros na mão. Por
// isso guarda só o que o usuário mudou (adicionou, trocou de papel, removeu) e envia isso.
export type GroupMemberDraft = {
  // Adições e trocas de papel. Quem não estava no grupo entra com a pessoa inteira (para exibir).
  set: { person: PersonRef; role: AssignableRole }[]
  remove: number[]
}
export const EMPTY_DRAFT: GroupMemberDraft = { set: [], remove: [] }

const ROLE_OPTIONS = [GROUP_ROLE.SubLeader, GROUP_ROLE.Member].map((role) => ({
  value: String(role),
  label: roleLabel(role),
}))

const NO_ROWS: GroupMemberRow[] = []
const personValue = (p: PersonRef) => String(p.id)
const personLabel = (p: PersonRef) => fullName(p)
const cursorOf = (p: PersonRef) => ({ firstName: p.firstName, lastName: p.lastName, id: p.id })

type Props = {
  kind: GroupKind
  // Null enquanto o grupo ainda não existe: não há membros para carregar.
  groupId: number | null
  leader: PersonRef | null
  draft: GroupMemberDraft
  onChange: (draft: GroupMemberDraft) => void
}

type Row = { person: PersonRef; role: AssignableRole; added: boolean }

export function GroupMembersField({ kind, groupId, leader, draft, onChange }: Props) {
  const fetchPage = useCallback(
    (last: GroupMemberRow | null) =>
      loadGroupMembers(kind, groupId as number, last ? cursorOf(last.member) : undefined),
    [kind, groupId],
  )
  const { items, hasMore, loading, failed, retry, sentinel } = useInfiniteList({
    initial: groupId === null ? NO_ROWS : null,
    initialHasMore: false,
    fetchPage,
    errorMessage: 'Não foi possível carregar mais membros.',
  })

  const leaderId = leader?.id ?? null
  const rows = useMemo<Row[]>(() => {
    const loaded = new Set(items.map((r) => r.member.id))
    const removed = new Set(draft.remove)
    const roleSet = new Map(draft.set.map((s) => [s.person.id, s.role]))
    // O líder atual não aparece nem é enviado, mas o rascunho fica guardado: se o líder voltar a
    // mudar, quem era sublíder ou membro não se perde.
    const added = draft.set
      .filter((s) => !loaded.has(s.person.id) && s.person.id !== leaderId)
      .map((s) => ({ person: s.person, role: s.role, added: true }))
    const existing = items
      .filter((r) => !removed.has(r.member.id) && r.member.id !== leaderId)
      .map((r) => ({ person: r.member, role: roleSet.get(r.member.id) ?? r.role, added: false }))
    return [...added, ...existing]
  }, [items, draft, leaderId])

  const fetchCandidates = useCallback(
    (q: string, last: PersonRef | null) =>
      searchMembers({
        q,
        after: last ? cursorOf(last) : undefined,
        // Fora das opções: o líder, quem acabou de ser adicionado e quem já está no grupo (o
        // servidor exclui; aqui só o que ainda não foi salvo).
        excludeIds: [...(leaderId ? [leaderId] : []), ...draft.set.map((s) => s.person.id)],
        excludeFromGroup: groupId ? { kind, id: groupId } : undefined,
      }),
    [kind, groupId, leaderId, draft.set],
  )

  function changeRole(row: Row, role: AssignableRole) {
    const set = draft.set.some((s) => s.person.id === row.person.id)
      ? draft.set.map((s) => (s.person.id === row.person.id ? { ...s, role } : s))
      : [...draft.set, { person: row.person, role }]
    onChange({ ...draft, set })
  }

  function remove(row: Row) {
    const set = draft.set.filter((s) => s.person.id !== row.person.id)
    // Quem acabou de ser adicionado só deixa de ser adicionado; quem já estava no grupo é removido.
    onChange({ set, remove: row.added ? draft.remove : [...draft.remove, row.person.id] })
  }

  const payload = {
    set: draft.set
      .filter((s) => s.person.id !== leaderId)
      .map((s) => ({ memberId: s.person.id, role: s.role })),
    remove: draft.remove,
  }
  const empty = rows.length === 0 && !hasMore && !loading

  return (
    <div className={classes.field}>
      <RemoteSelect
        label="Adicionar membro"
        description={leaderId === null ? 'Escolha o líder primeiro' : undefined}
        placeholder="Busque pelo nome"
        nothingFoundMessage="Nenhum membro encontrado"
        fetchPage={fetchCandidates}
        getValue={personValue}
        getLabel={personLabel}
        value={null}
        onChange={(person) => {
          if (person) onChange({ ...draft, set: [...draft.set, { person, role: GROUP_ROLE.Member }] })
        }}
        disabled={leaderId === null}
        clearOnSelect
      />
      {rows.length > 0 && (
        <ul className={classes.list}>
          {rows.map((row) => {
            const name = fullName(row.person)
            return (
              <li key={row.person.id} className={classes.row}>
                <PersonPill name={name} />
                <Select
                  className={classes.role}
                  aria-label={`Papel de ${name}`}
                  data={ROLE_OPTIONS}
                  value={String(row.role)}
                  allowDeselect={false}
                  onChange={(role) => {
                    const next = Number(role)
                    if (isAssignableRole(next)) changeRole(row, next)
                  }}
                />
                <ActionIcon
                  variant="subtle"
                  className={classes.remove}
                  aria-label={`Remover ${name}`}
                  title="Remover"
                  onClick={() => remove(row)}
                >
                  <IconX size={18} stroke={1.75} />
                </ActionIcon>
              </li>
            )
          })}
        </ul>
      )}
      {empty && <p className={classes.empty}>Nenhum membro além do líder ainda.</p>}
      {hasMore && (
        <div ref={sentinel} className={classes.more}>
          {failed ? (
            <Button variant="subtle" onClick={retry}>
              Tentar de novo
            </Button>
          ) : (
            <Loader size="sm" aria-label="Carregando mais membros" />
          )}
        </div>
      )}
      <input type="hidden" name="memberChanges" value={JSON.stringify(payload)} />
    </div>
  )
}
