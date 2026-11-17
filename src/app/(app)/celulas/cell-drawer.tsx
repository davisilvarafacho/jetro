'use client'

import { useActionState, useState } from 'react'
import { Button, Drawer, Select, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { GroupMembersField, type GroupMemberEntry } from '@/components/group-members-field'
import { fullName } from '@/lib/person-name'
import { saveCell, type CellFormState } from './actions'
import classes from './cell-drawer.module.css'

type PersonRef = { id: number; firstName: string; lastName: string }
export type CellRow = {
  id: number
  name: string
  leader: PersonRef
  members: GroupMemberEntry[]
}

const initialState: CellFormState = {}

type FormProps = { cell: CellRow | null; members: PersonRef[]; onClose: () => void }

function CellForm({ cell, members, onClose }: FormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: CellFormState, formData: FormData) => {
      const result = await saveCell(prev, formData)
      if (result.ok) {
        notifications.show({ message: 'Célula salva', color: 'floresta' })
        onClose()
      }
      return result
    },
    initialState,
  )
  // Campos controlados: a ação reinicia o formulário e apagaria o que foi digitado quando há erro.
  const [name, setName] = useState(cell?.name ?? '')
  const [leaderId, setLeaderId] = useState<string | null>(cell ? String(cell.leader.id) : null)
  const [entries, setEntries] = useState<GroupMemberEntry[]>(cell?.members ?? [])
  // Esconde o erro de um campo assim que ele é editado; volta a valer no próximo envio.
  const [edited, setEdited] = useState<{ state: CellFormState; fields: string[] }>({
    state,
    fields: [],
  })
  const touch = (field: string) =>
    setEdited((e) => ({ state, fields: e.state === state ? [...e.fields, field] : [field] }))
  const errorFor = (field: keyof NonNullable<CellFormState['errors']>) =>
    edited.state === state && edited.fields.includes(field) ? undefined : state.errors?.[field]

  const options = members.map((m) => ({ value: String(m.id), label: fullName(m) }))

  return (
    <form action={formAction} className={classes.form} noValidate>
      {cell && <input type="hidden" name="id" value={cell.id} />}
      <div className={classes.fields}>
        <TextInput
          label="Nome"
          name="name"
          withAsterisk
          placeholder="Ex.: Jovens"
          value={name}
          onChange={(event) => {
            setName(event.currentTarget.value)
            touch('name')
          }}
          error={errorFor('name')}
        />
        {members.length === 0 ? (
          <p className={classes.notice} role="status">
            Cadastre um membro antes de criar uma célula.
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
              // Quem vira líder sai da lista de membros; o líder anterior é tratado ao salvar.
              setEntries((list) => list.filter((e) => String(e.memberId) !== value))
              touch('leaderId')
            }}
            error={errorFor('leaderId')}
            searchable
          />
        )}
        {members.length > 0 && (
          <GroupMembersField
            candidates={members}
            leaderId={leaderId}
            value={entries}
            onChange={setEntries}
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
  cell: CellRow | null
  members: PersonRef[]
  onClose: () => void
}

export function CellDrawer({ opened, cell, members, onClose }: DrawerProps) {
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
              {cell ? 'Editar célula' : 'Nova célula'}
            </Drawer.Title>
            <p className={classes.subtitle}>
              {cell ? cell.name : 'Dê um nome à célula e escolha quem a lidera.'}
            </p>
          </div>
          <Drawer.CloseButton aria-label="Fechar" />
        </Drawer.Header>
        <Drawer.Body className={classes.body}>
          <CellForm
            key={cell?.id ?? 'new'}
            cell={cell}
            members={members}
            onClose={onClose}
          />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
