'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ActionIcon,
  Button,
  Loader,
  Table,
  TextInput,
  Title,
  VisuallyHidden,
} from '@mantine/core'
import { IconLayoutDashboard, IconPencil, IconPlus, IconSearch } from '@tabler/icons-react'
import { GroupKindMark } from '@/components/group-kind-mark'
import { Initials, PersonPill } from '@/components/person'
import { formatCpf } from '@/lib/cpf'
import { GROUP_ROLE } from '@/lib/group-roles'
import { fullName } from '@/lib/person-name'
import type { MemberRow } from '@/lib/members'
import { useInfiniteList } from '@/lib/use-infinite-list'
import { loadMember, loadMoreMembers } from './actions'
import { DeleteMember } from './delete-member'
import { MemberDrawer } from './member-drawer'
import classes from './members.module.css'

type Drawer = { open: boolean; member: MemberRow | null }

// A busca mora na URL: o servidor devolve a primeira página já filtrada.
function listUrl(q: string) {
  return q.trim() ? `/membros?${new URLSearchParams({ q: q.trim() })}` : '/membros'
}

type Props = {
  initial: MemberRow[]
  initialHasMore: boolean
  q: string
  total: number
}

export function MembersView({ initial, initialHasMore, q, total }: Props) {
  const router = useRouter()
  const [navigating, startNavigation] = useTransition()
  const [query, setQuery] = useState(q)
  const [drawer, setDrawer] = useState<Drawer>({ open: false, member: null })

  // Rolagem infinita: o próximo lote vem do servidor com a mesma busca da página.
  const fetchPage = useCallback(
    (last: MemberRow | null) =>
      loadMoreMembers({
        q,
        after: last ? { firstName: last.firstName, lastName: last.lastName, id: last.id } : undefined,
      }),
    [q],
  )
  const { items, hasMore, failed, retry, sentinel } = useInfiniteList({
    initial,
    initialHasMore,
    fetchPage,
    errorMessage: 'Não foi possível carregar mais membros.',
  })

  // Digitar na busca atualiza a URL depois de uma pausa.
  useEffect(() => {
    if (query.trim() === q) return
    const timer = setTimeout(() => {
      startNavigation(() => router.replace(listUrl(query), { scroll: false }))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, q, router])

  function openDrawer(member: MemberRow | null) {
    setDrawer({ open: true, member })
  }

  // O membro pode estar fora das páginas já carregadas; nesse caso busca no servidor.
  async function openMemberById(id: number) {
    const member = items.find((m) => m.id === id) ?? (await loadMember(id))
    if (member) openDrawer(member)
  }

  const subtitle =
    total === 0
      ? 'Nenhuma pessoa cadastrada ainda'
      : `${total} ${total === 1 ? 'pessoa' : 'pessoas'}`

  return (
    <>
      <header className={classes.head}>
        <div>
          <Title order={1} className={classes.title}>
            Membros
          </Title>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        <Button leftSection={<IconPlus size={20} stroke={1.75} />} onClick={() => openDrawer(null)}>
          Novo membro
        </Button>
      </header>

      <div className={classes.bar}>
        <TextInput
          className={classes.search}
          type="search"
          radius="xl"
          placeholder="Buscar por nome ou CPF"
          aria-label="Buscar membro"
          maxLength={100}
          leftSection={<IconSearch size={20} stroke={1.75} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>

      <div className={navigating ? `${classes.card} ${classes.pending}` : classes.card}>
        {items.length === 0 ? (
          <p className={classes.empty}>
            {total === 0 ? 'Nenhum membro cadastrado ainda.' : 'Nenhum membro encontrado.'}
          </p>
        ) : (
          <Table className={classes.table} verticalSpacing={0} horizontalSpacing={0}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Membro</Table.Th>
                <Table.Th>Parça</Table.Th>
                <Table.Th>Lidera</Table.Th>
                <Table.Th>Participa</Table.Th>
                <Table.Th>
                  <VisuallyHidden>Ações</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((m) => {
                const name = fullName(m)
                return (
                  <Table.Tr key={m.id} className={classes.row}>
                    <Table.Td>
                      <div className={classes.who}>
                        <Initials name={name} />
                        <div>
                          <span className={classes.name}>{name}</span>
                          <span className={classes.cpf}>{formatCpf(m.cpf)}</span>
                        </div>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      {m.parca ? (
                        <PersonPill name={fullName(m.parca)} />
                      ) : (
                        <>
                          <span className={classes.dash} aria-hidden="true">
                            —
                          </span>
                          <VisuallyHidden>Sem parça</VisuallyHidden>
                        </>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {m.leads.length > 0 ? (
                        <div className={classes.pills}>
                          {m.leads.map((g) => (
                            <span key={`${g.kind}-${g.id}`} className={classes.leadPill}>
                              <GroupKindMark kind={g.kind} />
                              {g.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className={classes.dash} aria-hidden="true">
                            —
                          </span>
                          <VisuallyHidden>Não lidera nada</VisuallyHidden>
                        </>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {m.participates.length > 0 ? (
                        <div className={classes.pills}>
                          {m.participates.map((g) => (
                            <span key={`${g.kind}-${g.id}`} className={classes.groupPill}>
                              <GroupKindMark kind={g.kind} />
                              {g.role === GROUP_ROLE.SubLeader ? `${g.name} · sublíder` : g.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className={classes.dash} aria-hidden="true">
                            —
                          </span>
                          <VisuallyHidden>Não participa de nada</VisuallyHidden>
                        </>
                      )}
                    </Table.Td>
                    <Table.Td className={classes.actions}>
                      <ActionIcon
                        component={Link}
                        href={`/membros/${m.id}`}
                        variant="subtle"
                        className={classes.actionIcon}
                        aria-label={`Ver painel de ${name}`}
                        title="Painel"
                      >
                        <IconLayoutDashboard size={18} stroke={1.75} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        className={classes.actionIcon}
                        aria-label={`Editar ${name}`}
                        title="Editar"
                        onClick={() => openDrawer(m)}
                      >
                        <IconPencil size={18} stroke={1.75} />
                      </ActionIcon>
                      <DeleteMember
                        id={m.id}
                        name={name}
                        onOpenMember={openMemberById}
                        iconClassName={`${classes.actionIcon} ${classes.actionDanger}`}
                      />
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
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
      </div>

      <MemberDrawer
        opened={drawer.open}
        member={drawer.member}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
