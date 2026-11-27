'use client'

import { useActionState, useState } from 'react'
import { Button, Drawer, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { EMPTY_DRAFT, GroupMembersField, type GroupMemberDraft } from '@/components/group-members-field'
import { RemoteSelect } from '@/components/remote-select'
import type { GroupRow } from '@/lib/groups'
import type { PersonRef } from '@/lib/members'
import { fullName } from '@/lib/person-name'
import { searchMembers } from '../lookups'
import { saveMinistry, type MinistryFormState } from './actions'
import classes from './ministry-drawer.module.css'

export type MinistryRow = GroupRow

const personValue = (p: PersonRef) => String(p.id)
const personLabel = (p: PersonRef) => fullName(p)

// Busca de líder: 25 membros por vez, com busca no servidor.
const fetchMembers = (q: string, last: PersonRef | null) =>
  searchMembers({
    q,
    after: last ? { firstName: last.firstName, lastName: last.lastName, id: last.id } : undefined,
  })

const initialState: MinistryFormState = {}

type FormProps = { ministry: MinistryRow | null; onClose: () => void }

function MinistryForm({ ministry, onClose }: FormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: MinistryFormState, formData: FormData) => {
      const result = await saveMinistry(prev, formData)
      if (result.ok) {
        notifications.show({ message: 'Ministério salvo', color: 'floresta' })
        onClose()
      }
      return result
    },
    initialState,
  )
  // Campos controlados: a ação reinicia o formulário e apagaria o que foi digitado quando há erro.
  const [name, setName] = useState(ministry?.name ?? '')
  const [leader, setLeader] = useState<PersonRef | null>(ministry?.leader ?? null)
  // A lista de membros é paginada: o formulário guarda só o que foi mudado nela.
  const [draft, setDraft] = useState<GroupMemberDraft>(EMPTY_DRAFT)
  // Esconde o erro de um campo assim que ele é editado; volta a valer no próximo envio.
  const [edited, setEdited] = useState<{ state: MinistryFormState; fields: string[] }>({
    state,
    fields: [],
  })
  const touch = (field: string) =>
    setEdited((e) => ({ state, fields: e.state === state ? [...e.fields, field] : [field] }))
  const errorFor = (field: keyof NonNullable<MinistryFormState['errors']>) =>
    edited.state === state && edited.fields.includes(field) ? undefined : state.errors?.[field]

  return (
    <form action={formAction} className={classes.form} noValidate>
      {ministry && <input type="hidden" name="id" value={ministry.id} />}
      <div className={classes.fields}>
        <TextInput
          label="Nome"
          name="name"
          withAsterisk
          placeholder="Ex.: Louvor"
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value)
            touch('name')
          }}
          error={errorFor('name')}
        />
        <RemoteSelect
          label="Líder"
          name="leaderId"
          withAsterisk
          description="Escolha entre os membros cadastrados."
          placeholder="Escolha um membro"
          nothingFoundMessage="Nenhum membro encontrado"
          fetchPage={fetchMembers}
          getValue={personValue}
          getLabel={personLabel}
          value={leader}
          onChange={(value) => {
            setLeader(value)
            touch('leaderId')
          }}
          error={errorFor('leaderId')}
        />
        <GroupMembersField
          kind="ministry"
          groupId={ministry?.id ?? null}
          leader={leader}
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
  ministry: MinistryRow | null
  onClose: () => void
}

export function MinistryDrawer({ opened, ministry, onClose }: DrawerProps) {
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
              {ministry ? 'Editar ministério' : 'Novo ministério'}
            </Drawer.Title>
            <p className={classes.subtitle}>
              {ministry ? ministry.name : 'Dê um nome ao ministério e escolha quem o lidera.'}
            </p>
          </div>
          <Drawer.CloseButton aria-label="Fechar" />
        </Drawer.Header>
        <Drawer.Body className={classes.body}>
          <MinistryForm
            key={ministry?.id ?? 'new'}
            ministry={ministry}
            onClose={onClose}
          />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
