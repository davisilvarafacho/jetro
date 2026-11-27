'use client'

import { useCallback, useState } from 'react'
import { ActionIcon, Button, Loader, Table, Title, VisuallyHidden } from '@mantine/core'
import { IconUsersGroup, IconPencil, IconPlus } from '@tabler/icons-react'
import { PersonPill } from '@/components/person'
import { fullName } from '@/lib/person-name'
import { useInfiniteList } from '@/lib/use-infinite-list'
import { loadGroups } from '../lookups'
import { DeleteCell } from './delete-cell'
import { CellDrawer, type CellRow } from './cell-drawer'
import classes from './cells.module.css'

type Drawer = { open: boolean; cell: CellRow | null }

export function CellsView({
  initial,
  initialHasMore,
  total,
}: {
  initial: CellRow[]
  initialHasMore: boolean
  total: number
}) {
  const [drawer, setDrawer] = useState<Drawer>({ open: false, cell: null })

  // Rolagem infinita: o próximo lote vem do servidor, 25 por vez.
  const fetchPage = useCallback(
    (last: CellRow | null) => loadGroups('cell', last ? { name: last.name } : undefined),
    [],
  )
  const { items, hasMore, failed, retry, sentinel } = useInfiniteList({
    initial,
    initialHasMore,
    fetchPage,
    errorMessage: 'Não foi possível carregar mais células.',
  })

  const subtitle =
    total === 0
      ? 'Nenhuma célula cadastrada ainda'
      : `${total} ${total === 1 ? 'célula' : 'células'}`

  return (
    <>
      <header className={classes.head}>
        <div>
          <Title order={1} className={classes.title}>
            Células
          </Title>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        <Button
          leftSection={<IconPlus size={20} stroke={1.75} />}
          onClick={() => setDrawer({ open: true, cell: null })}
        >
          Nova célula
        </Button>
      </header>

      <div className={classes.card}>
        {items.length === 0 ? (
          <p className={classes.empty}>Nenhuma célula cadastrada ainda.</p>
        ) : (
          <Table className={classes.table} verticalSpacing={0} horizontalSpacing={0}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Célula</Table.Th>
                <Table.Th>Líder</Table.Th>
                <Table.Th>
                  <VisuallyHidden>Ações</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((c) => (
                <Table.Tr key={c.id} className={classes.row}>
                  <Table.Td>
                    <div className={classes.who}>
                      <span className={classes.icon} aria-hidden="true">
                        <IconUsersGroup size={20} stroke={1.75} />
                      </span>
                      <span className={classes.name}>{c.name}</span>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <PersonPill name={fullName(c.leader)} />
                  </Table.Td>
                  <Table.Td className={classes.actions}>
                    <ActionIcon
                      variant="subtle"
                      className={classes.actionIcon}
                      aria-label={`Editar ${c.name}`}
                      title="Editar"
                      onClick={() => setDrawer({ open: true, cell: c })}
                    >
                      <IconPencil size={18} stroke={1.75} />
                    </ActionIcon>
                    <DeleteCell
                      id={c.id}
                      name={c.name}
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
              <Loader size="sm" aria-label="Carregando mais células" />
            )}
          </div>
        )}
      </div>

      <CellDrawer
        opened={drawer.open}
        cell={drawer.cell}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
