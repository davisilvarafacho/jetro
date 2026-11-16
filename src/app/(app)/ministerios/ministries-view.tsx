'use client'

import { useState } from 'react'
import { ActionIcon, Button, Table, Title, VisuallyHidden } from '@mantine/core'
import { IconHeart, IconPencil, IconPlus } from '@tabler/icons-react'
import { PersonPill } from '@/components/person'
import { fullName } from '@/lib/person-name'
import { DeleteMinistry } from './delete-ministry'
import { MinistryDrawer, type MinistryRow } from './ministry-drawer'
import classes from './ministries.module.css'

type Member = { id: number; firstName: string; lastName: string }
type Drawer = { open: boolean; ministry: MinistryRow | null }

export function MinistriesView({
  ministries,
  members,
}: {
  ministries: MinistryRow[]
  members: Member[]
}) {
  const [drawer, setDrawer] = useState<Drawer>({ open: false, ministry: null })

  const subtitle =
    ministries.length === 0
      ? 'Nenhum ministério cadastrado ainda'
      : `${ministries.length} ${ministries.length === 1 ? 'ministério' : 'ministérios'}`

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
        {ministries.length === 0 ? (
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
              {ministries.map((m) => (
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
      </div>

      <MinistryDrawer
        opened={drawer.open}
        ministry={drawer.ministry}
        members={members}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
