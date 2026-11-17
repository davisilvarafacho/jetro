'use client'

import { useActionState, useState } from 'react'
import { Button, Drawer, MultiSelect, Select, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { GroupKindMark } from '@/components/group-kind-mark'
import { formatCpf, onlyDigits } from '@/lib/cpf'
import { fullName } from '@/lib/person-name'
import type { MemberRow } from '@/lib/members'
import { saveMember, type MemberFormState } from './actions'
import classes from './member-drawer.module.css'

// Máscara progressiva enquanto digita: 000.000.000-00
function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length === 11) return formatCpf(d)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

const initialState: MemberFormState = {}

export type GroupOption = { id: number; name: string }

type FormProps = {
  member: MemberRow | null
  members: MemberRow[]
  ministries: GroupOption[]
  cells: GroupOption[]
  onClose: () => void
}

function MemberForm({ member, members, ministries, cells, onClose }: FormProps) {
  const [state, formAction, pending] = useActionState(
    async (prev: MemberFormState, formData: FormData) => {
      const result = await saveMember(prev, formData)
      if (result.ok) {
        notifications.show({ message: 'Membro salvo', color: 'floresta' })
        onClose()
      }
      return result
    },
    initialState,
  )
  // Campos controlados: a ação reinicia o formulário e apagaria o que foi digitado quando há erro.
  const [cpf, setCpf] = useState(member ? maskCpf(member.cpf) : '')
  const [firstName, setFirstName] = useState(member?.firstName ?? '')
  const [lastName, setLastName] = useState(member?.lastName ?? '')
  const [leaderId, setLeaderId] = useState<string | null>(member?.leader ? String(member.leader.id) : null)
  const [parcaId, setParcaId] = useState<string | null>(member?.parca ? String(member.parca.id) : null)
  // Participação: só os vínculos de sublíder/membro; os grupos que a pessoa lidera ficam de fora.
  const participatingIds = (kind: 'ministry' | 'cell') =>
    member?.participates.filter((g) => g.kind === kind).map((g) => String(g.id)) ?? []
  const [ministryIds, setMinistryIds] = useState<string[]>(() => participatingIds('ministry'))
  const [cellIds, setCellIds] = useState<string[]>(() => participatingIds('cell'))
  // Esconde o erro de um campo assim que ele é editado; volta a valer no próximo envio.
  const [edited, setEdited] = useState<{ state: MemberFormState; fields: string[] }>({ state, fields: [] })
  const touch = (field: string) =>
    setEdited((e) => ({ state, fields: e.state === state ? [...e.fields, field] : [field] }))
  const errorFor = (field: keyof NonNullable<MemberFormState['errors']>) =>
    edited.state === state && edited.fields.includes(field) ? undefined : state.errors?.[field]

  const options = members
    .filter((m) => m.id !== member?.id)
    .map((m) => ({ value: String(m.id), label: fullName(m) }))

  const led = new Set((member?.leads ?? []).map((g) => `${g.kind}-${g.id}`))
  const groupData = (kind: 'ministry' | 'cell', groups: GroupOption[]) =>
    groups.filter((g) => !led.has(`${kind}-${g.id}`)).map((g) => ({ value: String(g.id), label: g.name }))

  return (
    <form action={formAction} className={classes.form} noValidate>
      {member && <input type="hidden" name="id" value={member.id} />}
      <div className={classes.fields}>
        <TextInput
          label="CPF"
          name="cpf"
          withAsterisk
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(event) => {
            setCpf(maskCpf(event.currentTarget.value))
            touch('cpf')
          }}
          error={errorFor('cpf')}
          styles={{ input: { fontVariantNumeric: 'tabular-nums' } }}
        />
        <div className={classes.row2}>
          <TextInput
            label="Nome"
            name="firstName"
            withAsterisk
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.currentTarget.value)
              touch('firstName')
            }}
            error={errorFor('firstName')}
          />
          <TextInput
            label="Sobrenome"
            name="lastName"
            withAsterisk
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => {
              setLastName(event.currentTarget.value)
              touch('lastName')
            }}
            error={errorFor('lastName')}
          />
        </div>
        <div className={classes.group}>
          <h3 className={classes.groupTitle}>Cuidado</h3>
          <Select
            label="Líder"
            name="leaderId"
            description="Quem cuida desta pessoa"
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
            clearable
          />
          <Select
            label="Parça"
            name="parcaId"
            description="Um segundo líder, mais pessoal: sabe da vida, amigos, família, por onde anda"
            placeholder="Escolha um membro"
            nothingFoundMessage="Nenhum membro encontrado"
            data={options}
            value={parcaId}
            onChange={(value) => {
              setParcaId(value)
              touch('parcaId')
            }}
            error={errorFor('parcaId')}
            searchable
            clearable
          />
        </div>
        <div className={classes.group}>
          <h3 className={classes.groupTitle}>Participação</h3>
          {member && member.leads.length > 0 && (
            <p className={classes.led}>
              <span className={classes.ledLabel}>Lidera:</span>{' '}
              {member.leads.map((g, i) => (
                <span key={`${g.kind}-${g.id}`}>
                  {i > 0 && ', '}
                  <GroupKindMark kind={g.kind} />
                  {g.name}
                </span>
              ))}
            </p>
          )}
          <MultiSelect
            label="Ministérios"
            name="ministryIds"
            placeholder={ministryIds.length ? undefined : 'Busque um ministério'}
            nothingFoundMessage="Nenhum ministério encontrado"
            data={groupData('ministry', ministries)}
            value={ministryIds}
            onChange={setMinistryIds}
            searchable
          />
          <MultiSelect
            label="Células"
            name="cellIds"
            placeholder={cellIds.length ? undefined : 'Busque uma célula'}
            nothingFoundMessage="Nenhuma célula encontrada"
            data={groupData('cell', cells)}
            value={cellIds}
            onChange={setCellIds}
            searchable
          />
        </div>
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
  member: MemberRow | null
  members: MemberRow[]
  ministries: GroupOption[]
  cells: GroupOption[]
  onClose: () => void
}

export function MemberDrawer({ opened, member, members, ministries, cells, onClose }: DrawerProps) {
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
              {member ? 'Editar membro' : 'Novo membro'}
            </Drawer.Title>
            <p className={classes.subtitle}>
              {member ? fullName(member) : 'Cadastre uma pessoa e escolha quem cuida dela.'}
            </p>
          </div>
          <Drawer.CloseButton aria-label="Fechar" />
        </Drawer.Header>
        <Drawer.Body className={classes.body}>
          <MemberForm
            key={member?.id ?? 'new'}
            member={member}
            members={members}
            ministries={ministries}
            cells={cells}
            onClose={onClose}
          />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
