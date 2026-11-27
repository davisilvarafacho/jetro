'use client'

import { useCallback, useState } from 'react'
import { ActionIcon, Button, Loader, Table, Title, VisuallyHidden } from '@mantine/core'
import { IconPencil, IconPlus, IconSchool } from '@tabler/icons-react'
import { useInfiniteList } from '@/lib/use-infinite-list'
import { loadCourses } from '../lookups'
import { CourseDrawer, type CourseRow } from './course-drawer'
import { DeleteCourse } from './delete-course'
import classes from './courses.module.css'

type Drawer = { open: boolean; course: CourseRow | null }

export function CoursesView({
  initial,
  initialHasMore,
  total,
}: {
  initial: CourseRow[]
  initialHasMore: boolean
  total: number
}) {
  const [drawer, setDrawer] = useState<Drawer>({ open: false, course: null })

  // Rolagem infinita: o próximo lote vem do servidor, 25 por vez.
  const fetchPage = useCallback(
    (last: CourseRow | null) => loadCourses(last ? { name: last.name } : undefined),
    [],
  )
  const { items, hasMore, failed, retry, sentinel } = useInfiniteList({
    initial,
    initialHasMore,
    fetchPage,
    errorMessage: 'Não foi possível carregar mais cursos.',
  })

  const subtitle =
    total === 0 ? 'Nenhum curso cadastrado ainda' : `${total} ${total === 1 ? 'curso' : 'cursos'}`

  return (
    <>
      <header className={classes.head}>
        <div>
          <Title order={1} className={classes.title}>
            Cursos
          </Title>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        <Button
          leftSection={<IconPlus size={20} stroke={1.75} />}
          onClick={() => setDrawer({ open: true, course: null })}
        >
          Novo curso
        </Button>
      </header>

      <div className={classes.card}>
        {items.length === 0 ? (
          <p className={classes.empty}>Nenhum curso cadastrado ainda.</p>
        ) : (
          <Table className={classes.table} verticalSpacing={0} horizontalSpacing={0}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Curso</Table.Th>
                <Table.Th>Inscritos</Table.Th>
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
                        <IconSchool size={20} stroke={1.75} />
                      </span>
                      <span className={classes.name}>{c.name}</span>
                    </div>
                  </Table.Td>
                  <Table.Td className={classes.count}>{c.enrolled}</Table.Td>
                  <Table.Td className={classes.actions}>
                    <ActionIcon
                      variant="subtle"
                      className={classes.actionIcon}
                      aria-label={`Editar ${c.name}`}
                      title="Editar"
                      onClick={() => setDrawer({ open: true, course: c })}
                    >
                      <IconPencil size={18} stroke={1.75} />
                    </ActionIcon>
                    <DeleteCourse
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
              <Loader size="sm" aria-label="Carregando mais cursos" />
            )}
          </div>
        )}
      </div>

      <CourseDrawer
        opened={drawer.open}
        course={drawer.course}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
      />
    </>
  )
}
