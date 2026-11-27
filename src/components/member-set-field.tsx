'use client'

import { useCallback, useMemo } from 'react'
import { ActionIcon, Button, Loader } from '@mantine/core'
import { IconChecklist, IconX } from '@tabler/icons-react'
import { searchMembers } from '@/app/(app)/lookups'
import { PersonPill } from '@/components/person'
import { RemoteSelect } from '@/components/remote-select'
import type { MemberCursor, PersonRef } from '@/lib/members'
import type { Page } from '@/lib/pagination'
import { fullName } from '@/lib/person-name'
import { useInfiniteList } from '@/lib/use-infinite-list'
import classes from './member-set-field.module.css'

// O conjunto de membros de um curso ou de uma aula (inscritos, presentes) é paginado: o formulário
// nunca tem todos na mão. Por isso guarda só o que o usuário mudou (adicionou, removeu) e envia isso.
export type MemberSetDraft = {
  // Quem entrou no rascunho vem com a pessoa inteira (para exibir).
  add: PersonRef[]
  remove: number[]
}
export const EMPTY_SET_DRAFT: MemberSetDraft = { add: [], remove: [] }

const NO_PEOPLE: PersonRef[] = []
const personValue = (p: PersonRef) => String(p.id)
const personLabel = (p: PersonRef) => fullName(p)
const cursorOf = (p: PersonRef): MemberCursor => ({
  firstName: p.firstName,
  lastName: p.lastName,
  id: p.id,
})

type Props = {
  label: string
  addLabel: string
  emptyText: string
  // Null enquanto o registro ainda não existe: não há ninguém para carregar. Precisa ser estável
  // entre renders (useCallback), porque entra nas dependências da rolagem infinita.
  load: ((after?: MemberCursor) => Promise<Page<PersonRef>>) | null
  // De onde o servidor tira quem já está no conjunto, para não aparecer em "Adicionar".
  excludeFromSet: { kind: 'enrollment' | 'attendance'; id: number } | null
  draft: MemberSetDraft
  onChange: (draft: MemberSetDraft) => void
  // Com a prop, cada linha ganha o ícone "Ver frequência".
  onView?: (person: PersonRef) => void
}

type Row = { person: PersonRef; added: boolean }

export function MemberSetField({
  label,
  addLabel,
  emptyText,
  load,
  excludeFromSet,
  draft,
  onChange,
  onView,
}: Props) {
  const fetchPage = useCallback(
    (last: PersonRef | null) =>
      (load as NonNullable<typeof load>)(last ? cursorOf(last) : undefined),
    [load],
  )
  const { items, hasMore, loading, failed, retry, sentinel } = useInfiniteList({
    initial: load === null ? NO_PEOPLE : null,
    initialHasMore: false,
    fetchPage,
    errorMessage: 'Não foi possível carregar mais membros.',
  })

  const rows = useMemo<Row[]>(() => {
    const removed = new Set(draft.remove)
    const added = draft.add.map((person) => ({ person, added: true }))
    const existing = items
      .filter((p) => !removed.has(p.id))
      .map((person) => ({ person, added: false }))
    return [...added, ...existing]
  }, [items, draft])

  const fetchCandidates = useCallback(
    (q: string, last: PersonRef | null) =>
      searchMembers({
        q,
        after: last ? cursorOf(last) : undefined,
        // Fora das opções: quem acabou de ser adicionado e quem já está no conjunto (o servidor
        // exclui; aqui só o que ainda não foi salvo).
        excludeIds: draft.add.map((p) => p.id),
        excludeFromSet: excludeFromSet ?? undefined,
      }),
    [excludeFromSet, draft.add],
  )

  function remove(row: Row) {
    // Quem acabou de ser adicionado só deixa de ser adicionado; quem já estava no conjunto é removido.
    onChange(
      row.added
        ? { ...draft, add: draft.add.filter((p) => p.id !== row.person.id) }
        : { ...draft, remove: [...draft.remove, row.person.id] },
    )
  }

  const payload = { add: draft.add.map((p) => p.id), remove: draft.remove }
  const empty = rows.length === 0 && !hasMore && !loading

  return (
    <div className={classes.field}>
      <RemoteSelect
        label={addLabel}
        placeholder="Busque pelo nome"
        nothingFoundMessage="Nenhum membro encontrado"
        fetchPage={fetchCandidates}
        getValue={personValue}
        getLabel={personLabel}
        value={null}
        onChange={(person) => {
          if (person) onChange({ ...draft, add: [...draft.add, person] })
        }}
        clearOnSelect
      />
      <p className={classes.label}>{label}</p>
      {rows.length > 0 && (
        <ul className={classes.list}>
          {rows.map((row) => {
            const name = fullName(row.person)
            return (
              <li key={row.person.id} className={classes.row}>
                <PersonPill name={name} />
                {onView && (
                  <ActionIcon
                    variant="subtle"
                    className={classes.action}
                    aria-label={`Ver frequência de ${name}`}
                    title="Ver frequência"
                    onClick={() => onView(row.person)}
                  >
                    <IconChecklist size={18} stroke={1.75} />
                  </ActionIcon>
                )}
                <ActionIcon
                  variant="subtle"
                  className={`${classes.action} ${classes.remove}`}
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
      {empty && <p className={classes.empty}>{emptyText}</p>}
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
