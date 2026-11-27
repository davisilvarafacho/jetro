'use client'

import { useCallback, useState } from 'react'
import { ActionIcon, Button, Loader, Table, Title, VisuallyHidden } from '@mantine/core'
import { IconHeart, IconPencil, IconPlus } from '@tabler/icons-react'
import { PersonPill } from '@/components/person'
import { fullName } from '@/lib/person-name'
import { useInfiniteList } from '@/lib/use-infinite-list'
import { loadGroups } from '../lookups'
import { DeleteMinistry } from './delete-ministry'
import { MinistryDrawer, type MinistryRow } from './ministry-drawer'
import classes from './ministries.module.css'

type Drawer = { open: boolean; ministry: MinistryRow | null }

export function MinistriesView({
  initial,
  initialHasMore,
  total,
}: {
  initial: MinistryRow[]
  initialHasMore: boolean
  total: number
}) {
  const [drawer, setDrawer] = useState<Drawer>({ open: false, ministry: null })

  // Rolagem infinita: o próximo lote vem do servidor, 25 por vez.
  const fetchPage = useCallback(
    (last: MinistryRow | null) => loadGroups('ministry', last ? { name: last.name } : undefined),
    [],
  )
  const { items, hasMore, failed, retry, sentinel } = useInfiniteList({
    initial,
    initialHasMore,
    fetchPage,
    errorMessage: 'Não foi possível carregar mais ministérios.',
  })

  const subtitle =
    total === 0
      ? 'Nenhum ministério cadastrado ainda'
      : `${total} ${total === 1 ? 'ministério' : 'ministérios'}`

  return (
    <>
      <header className={classes.head}>
        <div>
          <Title order={1} className={classes.title}>
            Ministérios
          </Title>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        <Button
          leftSection={<IconPlus size={20} stroke={1.75} />}
          onClick={() => setDrawer({ open: true, ministry: null })}
        >
          Novo ministério
        </Button>
      </header>

      <div className={classes.card}>
        {items.length === 0 ? (
          <p className={classes.empty}>Nenhum ministério cadastrado ainda.</p>
        ) : (
          <Table className={classes.table} verticalSpacing={0} horizontalSpacing={0}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ministério</Table.Th>
                <Table.Th>Líder</Table.Th>
                <Table.Th>
                  <VisuallyHidden>Ações</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((m) => (
                <Table.Tr key={m.id} className={classes.row}>
                  <Table.Td>
                    <div className={classes.who}>
                      <span className={classes.icon} aria-hidden="true">
                        <IconHeart size={20} stroke={1.75} />
                      </span>
                      <span className={classes.name}>{m.name}</span>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <PersonPill name={fullName(m.leader)} />
                  </Table.Td>
                  <Table.Td className={classes.actions}>
                    <ActionIcon
                      variant="subtle"
                      className={classes.actionIcon}
                      aria-label={`Editar ${m.name}`}
                      title="Editar"
                      onClick={() => setDrawer({ open: true, ministry: m })}
                    >
                      <IconPencil size={18} stroke={1.75} />
                    </ActionIcon>
                    <DeleteMinistry
                      id={m.id}
                      name={m.name}
                      iconClassName={`${classes.actionIcon} ${classes.actionDanger}`}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
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
              <Loader size="sm" aria-label="Carregando mais ministérios" />
            )}
          </div>
        )}
      </div>

      <MinistryDrawer
        opened={drawer.open}
        ministry={drawer.ministry}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
