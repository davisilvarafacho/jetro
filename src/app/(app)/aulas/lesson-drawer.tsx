'use client'

import { useActionState, useMemo, useState } from 'react'
import { Button, Drawer, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { EMPTY_SET_DRAFT, MemberSetField, type MemberSetDraft } from '@/components/member-set-field'
import { RemoteSelect } from '@/components/remote-select'
import type { CourseOption } from '@/lib/courses'
import type { LessonRow } from '@/lib/lessons'
import type { MemberCursor, PersonRef } from '@/lib/members'
import { fullName } from '@/lib/person-name'
import { loadAttendance, searchCourses, searchMembers } from '../lookups'
import { saveLesson, type LessonFormState } from './actions'
import classes from './lesson-drawer.module.css'

export type { LessonRow }

const courseValue = (c: CourseOption) => String(c.id)
const courseLabel = (c: CourseOption) => c.name
const personValue = (p: PersonRef) => String(p.id)
const personLabel = (p: PersonRef) => fullName(p)

// Buscas dos seletores: 25 opções por vez, com busca no servidor.
const fetchCourses = (q: string, last: CourseOption | null) =>
  searchCourses({ q, after: last ? { name: last.name } : undefined })
const fetchMembers = (q: string, last: PersonRef | null) =>
  searchMembers({
    q,
    after: last ? { firstName: last.firstName, lastName: last.lastName, id: last.id } : undefined,
  })

const initialState: LessonFormState = {}

type FormProps = { lesson: LessonRow | null; onClose: () => void }

function LessonForm({ lesson, onClose }: FormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: LessonFormState, formData: FormData) => {
      const result = await saveLesson(prev, formData)
      if (result.ok) {
        notifications.show({ message: 'Aula salva', color: 'floresta' })
        onClose()
      }
      return result
    },
    initialState,
  )
  // Campos controlados: a ação reinicia o formulário e apagaria o que foi digitado quando há erro.
  const [name, setName] = useState(lesson?.name ?? '')
  const [course, setCourse] = useState<CourseOption | null>(lesson?.course ?? null)
  const [teacher, setTeacher] = useState<PersonRef | null>(lesson?.teacher ?? null)
  // `YYYY-MM-DD`, que é o que o campo de data usa e o que o servidor lê: sem `Date`, sem fuso.
  const [date, setDate] = useState(lesson?.date ?? '')
  // A chamada é paginada: o formulário guarda só o que foi mudado nela.
  const [draft, setDraft] = useState<MemberSetDraft>(EMPTY_SET_DRAFT)
  // Esconde o erro de um campo assim que ele é editado; volta a valer no próximo envio.
  const [edited, setEdited] = useState<{ state: LessonFormState; fields: string[] }>({
    state,
    fields: [],
  })
  const touch = (field: string) =>
    setEdited((e) => ({ state, fields: e.state === state ? [...e.fields, field] : [field] }))
  const errorFor = (field: keyof NonNullable<LessonFormState['errors']>) =>
    edited.state === state && edited.fields.includes(field) ? undefined : state.errors?.[field]

  // `load` e `excludeFromSet` ficam estáveis entre renders: o campo os usa como dependências.
  const lessonId = lesson?.id ?? null
  const load = useMemo(
    () => (lessonId === null ? null : (after?: MemberCursor) => loadAttendance(lessonId, after)),
    [lessonId],
  )
  const excludeFromSet = useMemo(
    () => (lessonId === null ? null : { kind: 'attendance' as const, id: lessonId }),
    [lessonId],
  )

  return (
    <form action={formAction} className={classes.form} noValidate>
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      <div className={classes.fields}>
        <TextInput
          label="Nome"
          name="name"
          withAsterisk
          placeholder="Ex.: Aula 1"
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value)
            touch('name')
          }}
          error={errorFor('name')}
        />
        <RemoteSelect
          label="Curso"
          name="courseId"
          withAsterisk
          placeholder="Escolha um curso"
          nothingFoundMessage="Nenhum curso encontrado"
          fetchPage={fetchCourses}
          getValue={courseValue}
          getLabel={courseLabel}
          value={course}
          onChange={(value) => {
            setCourse(value)
            touch('courseId')
          }}
          error={errorFor('courseId')}
        />
        <RemoteSelect
          label="Professor"
          name="teacherId"
          withAsterisk
          description="Escolha entre os membros cadastrados."
          placeholder="Escolha um membro"
          nothingFoundMessage="Nenhum membro encontrado"
          fetchPage={fetchMembers}
          getValue={personValue}
          getLabel={personLabel}
          value={teacher}
          onChange={(value) => {
            setTeacher(value)
            touch('teacherId')
          }}
          error={errorFor('teacherId')}
        />
        <TextInput
          label="Data"
          name="date"
          type="date"
          withAsterisk
          value={date}
          onChange={(event) => {
            setDate(event.currentTarget.value)
            touch('date')
          }}
          error={errorFor('date')}
        />
        <MemberSetField
          label="Chamada"
          addLabel="Registrar presença"
          emptyText="Ninguém registrado nesta aula ainda."
          load={load}
          excludeFromSet={excludeFromSet}
          draft={draft}
          onChange={setDraft}
        />
      </div>
      <div className={classes.footer}>
        <Button variant="default" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

type DrawerProps = {
  opened: boolean
  lesson: LessonRow | null
  onClose: () => void
}

export function LessonDrawer({ opened, lesson, onClose }: DrawerProps) {
  return (
    <Drawer.Root
      className={classes.root}
      opened={opened}
      onClose={onClose}
      position="right"
      size={520}
    >
      <Drawer.Overlay color="#14261F" backgroundOpacity={0.45} />
      <Drawer.Content>
        <Drawer.Header className={classes.header}>
          <div>
            <Drawer.Title className={classes.title}>
              {lesson ? 'Editar aula' : 'Nova aula'}
            </Drawer.Title>
            <p className={classes.subtitle}>
              {lesson ? lesson.name : 'Escolha o curso, o professor e o dia, e registre quem veio.'}
            </p>
          </div>
          <Drawer.CloseButton aria-label="Fechar" />
        </Drawer.Header>
        <Drawer.Body className={classes.body}>
          <LessonForm key={lesson?.id ?? 'new'} lesson={lesson} onClose={onClose} />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
