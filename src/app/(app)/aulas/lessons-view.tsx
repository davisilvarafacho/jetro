'use client'

import { useCallback, useState } from 'react'
import { ActionIcon, Button, Loader, Table, Title, VisuallyHidden } from '@mantine/core'
import { IconCalendarEvent, IconPencil, IconPlus } from '@tabler/icons-react'
import { PersonPill } from '@/components/person'
import { formatDateOnly } from '@/lib/date-only'
import { fullName } from '@/lib/person-name'
import { useInfiniteList } from '@/lib/use-infinite-list'
import { loadLessons } from '../lookups'
import { DeleteLesson } from './delete-lesson'
import { LessonDrawer, type LessonRow } from './lesson-drawer'
import classes from './lessons.module.css'

type Drawer = { open: boolean; lesson: LessonRow | null }

export function LessonsView({
  initial,
  initialHasMore,
  total,
}: {
  initial: LessonRow[]
  initialHasMore: boolean
  total: number
}) {
  const [drawer, setDrawer] = useState<Drawer>({ open: false, lesson: null })

  // Rolagem infinita: o próximo lote vem do servidor, 25 por vez, a partir da data e do id da última aula.
  const fetchPage = useCallback(
    (last: LessonRow | null) => loadLessons(last ? { date: last.date, id: last.id } : undefined),
    [],
  )
  const { items, hasMore, failed, retry, sentinel } = useInfiniteList({
    initial,
    initialHasMore,
    fetchPage,
    errorMessage: 'Não foi possível carregar mais aulas.',
  })

  const subtitle =
    total === 0 ? 'Nenhuma aula cadastrada ainda' : `${total} ${total === 1 ? 'aula' : 'aulas'}`

  return (
    <>
      <header className={classes.head}>
        <div>
          <Title order={1} className={classes.title}>
            Aulas
          </Title>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        <Button
          leftSection={<IconPlus size={20} stroke={1.75} />}
          onClick={() => setDrawer({ open: true, lesson: null })}
        >
          Nova aula
        </Button>
      </header>

      <div className={classes.card}>
        {items.length === 0 ? (
          <p className={classes.empty}>Nenhuma aula cadastrada ainda.</p>
        ) : (
          <Table className={classes.table} verticalSpacing={0} horizontalSpacing={0}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Aula</Table.Th>
                <Table.Th>Curso</Table.Th>
                <Table.Th>Professor</Table.Th>
                <Table.Th>Presentes</Table.Th>
                <Table.Th>
                  <VisuallyHidden>Ações</VisuallyHidden>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((l) => (
                <Table.Tr key={l.id} className={classes.row}>
                  <Table.Td className={classes.date}>{formatDateOnly(l.date)}</Table.Td>
                  <Table.Td>
                    <div className={classes.who}>
                      <span className={classes.icon} aria-hidden="true">
                        <IconCalendarEvent size={20} stroke={1.75} />
                      </span>
                      <span className={classes.name}>{l.name}</span>
                    </div>
                  </Table.Td>
                  <Table.Td>{l.course.name}</Table.Td>
                  <Table.Td>
                    <PersonPill name={fullName(l.teacher)} />
                  </Table.Td>
                  <Table.Td className={classes.count}>{l.present}</Table.Td>
                  <Table.Td className={classes.actions}>
                    <ActionIcon
                      variant="subtle"
                      className={classes.actionIcon}
                      aria-label={`Editar ${l.name}`}
                      title="Editar"
                      onClick={() => setDrawer({ open: true, lesson: l })}
                    >
                      <IconPencil size={18} stroke={1.75} />
                    </ActionIcon>
                    <DeleteLesson
                      id={l.id}
                      name={l.name}
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
              <Loader size="sm" aria-label="Carregando mais aulas" />
            )}
          </div>
        )}
      </div>

      <LessonDrawer
        opened={drawer.open}
        lesson={drawer.lesson}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
