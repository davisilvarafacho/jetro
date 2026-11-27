'use client'

import { useActionState, useMemo, useState } from 'react'
import { Button, Drawer, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { EMPTY_SET_DRAFT, MemberSetField, type MemberSetDraft } from '@/components/member-set-field'
import type { CourseRow } from '@/lib/courses'
import type { MemberCursor, PersonRef } from '@/lib/members'
import { loadEnrolled } from '../lookups'
import { saveCourse, type CourseFormState } from './actions'
import classes from './course-drawer.module.css'
import { MemberTimelineModal } from './member-timeline'

export type { CourseRow }

const initialState: CourseFormState = {}

type FormProps = {
  course: CourseRow | null
  onClose: () => void
  onView: (person: PersonRef) => void
}

function CourseForm({ course, onClose, onView }: FormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: CourseFormState, formData: FormData) => {
      const result = await saveCourse(prev, formData)
      if (result.ok) {
        notifications.show({ message: 'Curso salvo', color: 'floresta' })
        onClose()
      }
      return result
    },
    initialState,
  )
  // Campos controlados: a ação reinicia o formulário e apagaria o que foi digitado quando há erro.
  const [name, setName] = useState(course?.name ?? '')
  // A lista de inscritos é paginada: o formulário guarda só o que foi mudado nela.
  const [draft, setDraft] = useState<MemberSetDraft>(EMPTY_SET_DRAFT)
  // Esconde o erro de um campo assim que ele é editado; volta a valer no próximo envio.
  const [edited, setEdited] = useState<{ state: CourseFormState; fields: string[] }>({
    state,
    fields: [],
  })
  const touch = (field: string) =>
    setEdited((e) => ({ state, fields: e.state === state ? [...e.fields, field] : [field] }))
  const errorFor = (field: keyof NonNullable<CourseFormState['errors']>) =>
    edited.state === state && edited.fields.includes(field) ? undefined : state.errors?.[field]

  // `load` e `excludeFromSet` ficam estáveis entre renders: o campo os usa como dependências.
  const courseId = course?.id ?? null
  const load = useMemo(
    () => (courseId === null ? null : (after?: MemberCursor) => loadEnrolled(courseId, after)),
    [courseId],
  )
  const excludeFromSet = useMemo(
    () => (courseId === null ? null : { kind: 'enrollment' as const, id: courseId }),
    [courseId],
  )

  return (
    <form action={formAction} className={classes.form} noValidate>
      {course && <input type="hidden" name="id" value={course.id} />}
      <div className={classes.fields}>
        <TextInput
          label="Nome"
          name="name"
          withAsterisk
          placeholder="Ex.: Escola Bíblica"
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value)
            touch('name')
          }}
          error={errorFor('name')}
        />
        <MemberSetField
          label="Inscritos"
          addLabel="Inscrever membro"
          emptyText="Nenhum membro inscrito ainda."
          load={load}
          excludeFromSet={excludeFromSet}
          draft={draft}
          onChange={setDraft}
          // Curso novo não tem frequência ainda: o ícone só aparece para curso salvo.
          onView={course ? onView : undefined}
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
  course: CourseRow | null
  onClose: () => void
}

export function CourseDrawer({ opened, course, onClose }: DrawerProps) {
  // Inscrito cuja frequência está aberta no modal.
  const [member, setMember] = useState<PersonRef | null>(null)

  return (
    <Drawer.Root
      className={classes.root}
      opened={opened}
      onClose={onClose}
      position="right"
      size={520}
      // Com o modal aberto, o Esc é dele: senão o drawer fecharia junto e perderia o rascunho.
      closeOnEscape={member === null}
    >
      <Drawer.Overlay color="#14261F" backgroundOpacity={0.45} />
      <Drawer.Content>
        <Drawer.Header className={classes.header}>
          <div>
            <Drawer.Title className={classes.title}>
              {course ? 'Editar curso' : 'Novo curso'}
            </Drawer.Title>
            <p className={classes.subtitle}>
              {course ? course.name : 'Dê um nome ao curso e escolha quem está inscrito.'}
            </p>
          </div>
          <Drawer.CloseButton aria-label="Fechar" />
        </Drawer.Header>
        <Drawer.Body className={classes.body}>
          <CourseForm key={course?.id ?? 'new'} course={course} onClose={onClose} onView={setMember} />
        </Drawer.Body>
        {course && (
          <MemberTimelineModal
            courseId={course.id}
            member={member}
            onClose={() => setMember(null)}
          />
        )}
      </Drawer.Content>
    </Drawer.Root>
  )
}
