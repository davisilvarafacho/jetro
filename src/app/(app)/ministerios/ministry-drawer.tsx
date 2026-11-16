'use client'

import { useActionState, useState } from 'react'
import { Button, Drawer, Select, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { fullName } from '@/lib/person-name'
import { saveMinistry, type MinistryFormState } from './actions'
import classes from './ministry-drawer.module.css'

type PersonRef = { id: number; firstName: string; lastName: string }
export type MinistryRow = { id: number; name: string; leader: PersonRef }

const initialState: MinistryFormState = {}

type FormProps = { ministry: MinistryRow | null; members: PersonRef[]; onClose: () => void }

function MinistryForm({ ministry, members, onClose }: FormProps) {
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
  const [leaderId, setLeaderId] = useState<string | null>(ministry ? String(ministry.leader.id) : null)
  // Esconde o erro de um campo assim que ele é editado; volta a valer no próximo envio.
  const [edited, setEdited] = useState<{ state: MinistryFormState; fields: string[] }>({
    state,
    fields: [],
  })
  const touch = (field: string) =>
    setEdited((e) => ({ state, fields: e.state === state ? [...e.fields, field] : [field] }))
  const errorFor = (field: keyof NonNullable<MinistryFormState['errors']>) =>
    edited.state === state && edited.fields.includes(field) ? undefined : state.errors?.[field]

  const options = members.map((m) => ({ value: String(m.id), label: fullName(m) }))

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
        {members.length === 0 ? (
          <p className={classes.notice} role="status">
            Cadastre um membro antes de criar um ministério.
          </p>
        ) : (
          <Select
            label="Líder"
            name="leaderId"
            withAsterisk
            description="Escolha entre os membros cadastrados."
            placeholder="Escolha um membro"
            nothingFoundMessage="Nenhum membro encontrado"
            data={options}
            value={leaderId}
            onChange={(value) => {
              setLeaderId(value)
              touch('leaderId')
            }}
            error={errorFor('leaderId')}
            searchable
          />
        )}
      </div>
      <div className={classes.footer}>
        <Button variant="default" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending} disabled={members.length === 0}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

type DrawerProps = {
  opened: boolean
  ministry: MinistryRow | null
  members: PersonRef[]
  onClose: () => void
}

export function MinistryDrawer({ opened, ministry, members, onClose }: DrawerProps) {
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
            members={members}
            onClose={onClose}
          />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
