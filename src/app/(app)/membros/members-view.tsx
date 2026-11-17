'use client'

import { useState } from 'react'
import { ActionIcon, Badge, Button, Table, TextInput, Title, VisuallyHidden } from '@mantine/core'
import { IconAlertTriangle, IconPencil, IconPlus, IconSearch } from '@tabler/icons-react'
import { GroupKindMark } from '@/components/group-kind-mark'
import { Initials, PersonPill } from '@/components/person'
import { onlyDigits, formatCpf } from '@/lib/cpf'
import { GROUP_ROLE } from '@/lib/group-roles'
import { fullName } from '@/lib/person-name'
import type { MemberRow } from '@/lib/members'
import { DeleteMember } from './delete-member'
import { MemberDrawer, type GroupOption } from './member-drawer'
import classes from './members.module.css'

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

type Drawer = { open: boolean; member: MemberRow | null }

export function MembersView({
  members,
  ministries,
  cells,
}: {
  members: MemberRow[]
  ministries: GroupOption[]
  cells: GroupOption[]
}) {
  const [onlyUnled, setOnlyUnled] = useState(false)
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<Drawer>({ open: false, member: null })

  const unledCount = members.filter((m) => !m.leader).length

  const text = normalize(query.trim())
  const digits = onlyDigits(query)
  const visible = members.filter((m) => {
    if (onlyUnled && m.leader) return false
    if (!text) return true
    return normalize(fullName(m)).includes(text) || (digits !== '' && m.cpf.includes(digits))
  })

  function openDrawer(member: MemberRow | null) {
    setDrawer({ open: true, member })
  }

  function openMemberById(id: number) {
    const member = members.find((m) => m.id === id)
    if (member) openDrawer(member)
  }

  const subtitle =
    members.length === 0
      ? 'Nenhuma pessoa cadastrada ainda'
      : `${members.length} ${members.length === 1 ? 'pessoa' : 'pessoas'}, ${unledCount} sem líder`

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
        <div className={classes.chips} role="group" aria-label="Filtro">
          <button
            type="button"
            className={classes.chip}
            aria-pressed={!onlyUnled}
            onClick={() => setOnlyUnled(false)}
          >
            Todos <span className={classes.count}>{members.length}</span>
          </button>
          <button
            type="button"
            className={classes.chip}
            aria-pressed={onlyUnled}
            onClick={() => setOnlyUnled(true)}
          >
            Sem líder <span className={`${classes.count} ${classes.countFlag}`}>{unledCount}</span>
          </button>
        </div>
        <TextInput
          className={classes.search}
          type="search"
          radius="xl"
          placeholder="Buscar por nome ou CPF"
          aria-label="Buscar membro"
          leftSection={<IconSearch size={20} stroke={1.75} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </div>

      <div className={classes.card}>
        {visible.length === 0 ? (
          <p className={classes.empty}>
            {members.length === 0 ? 'Nenhum membro cadastrado ainda.' : 'Nenhum membro encontrado.'}
          </p>
        ) : (
          <Table className={classes.table} verticalSpacing={0} horizontalSpacing={0}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Membro</Table.Th>
                <Table.Th>Líder</Table.Th>
                <Table.Th>Parça</Table.Th>
                <Table.Th>Lidera</Table.Th>
                <Table.Th>Participa</Table.Th>
                <Table.Th>
                  <VisuallyHidden>Ações</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visible.map((m) => {
                const name = fullName(m)
                const unled = !m.leader
                return (
                  <Table.Tr key={m.id} className={`${classes.row} ${unled ? classes.unled : ''}`}>
                    <Table.Td>
                      <div className={classes.who}>
                        <Initials name={name} flagged={unled} />
                        <div>
                          <span className={classes.name}>{name}</span>
                          <span className={classes.cpf}>{formatCpf(m.cpf)}</span>
                        </div>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      {m.leader ? (
                        <PersonPill name={fullName(m.leader)} />
                      ) : (
                        <div className={classes.flagCell}>
                          <Badge
                            className={classes.flag}
                            radius="xl"
                            leftSection={<IconAlertTriangle size={16} stroke={1.75} />}
                          >
                            Sem líder
                          </Badge>
                          <Button
                            variant="subtle"
                            size="sm"
                            className={classes.pick}
                            onClick={() => openDrawer(m)}
                          >
                            Escolher líder
                          </Button>
                        </div>
                      )}
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
      </div>

      <MemberDrawer
        opened={drawer.open}
        member={drawer.member}
        members={members}
        ministries={ministries}
        cells={cells}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
