'use client'

import { useActionState, useCallback, useMemo, useState } from 'react'
import { Button, Drawer, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { RemoteMultiSelect, RemoteSelect } from '@/components/remote-select'
import { formatCpf, onlyDigits } from '@/lib/cpf'
import { fullName } from '@/lib/person-name'
import type { GroupOption } from '@/lib/groups'
import type { MemberRow, PersonRef } from '@/lib/members'
import { searchGroups, searchMembers } from '../lookups'
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

const personValue = (p: PersonRef) => String(p.id)
const personLabel = (p: PersonRef) => fullName(p)
const groupValue = (g: GroupOption) => String(g.id)
const groupLabel = (g: GroupOption) => g.name

// Busca de ministérios ou células para o seletor, sem os que a pessoa (selfId) lidera.
const groupFetcher =
  (kind: 'ministry' | 'cell', selfId: number | undefined) => (q: string, last: GroupOption | null) =>
    searchGroups(kind, { q, after: last ? { name: last.name } : undefined, excludeLeaderId: selfId })

type FormProps = { member: MemberRow | null; onClose: () => void }

function MemberForm({ member, onClose }: FormProps) {
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
  const [parca, setParca] = useState<PersonRef | null>(member?.parca ?? null)
  // Participação: só os vínculos de sublíder/membro; os grupos que a pessoa lidera ficam de fora.
  const participating = (kind: 'ministry' | 'cell') =>
    member?.participates.filter((g) => g.kind === kind).map(({ id, name }) => ({ id, name })) ?? []
  const [ministries, setMinistries] = useState<GroupOption[]>(() => participating('ministry'))
  const [cells, setCells] = useState<GroupOption[]>(() => participating('cell'))
  // Esconde o erro de um campo assim que ele é editado; volta a valer no próximo envio.
  const [edited, setEdited] = useState<{ state: MemberFormState; fields: string[] }>({ state, fields: [] })
  const touch = (field: string) =>
    setEdited((e) => ({ state, fields: e.state === state ? [...e.fields, field] : [field] }))
  const errorFor = (field: keyof NonNullable<MemberFormState['errors']>) =>
    edited.state === state && edited.fields.includes(field) ? undefined : state.errors?.[field]

  // Opções vêm do servidor, 25 por vez. Fora delas: a própria pessoa (não é parça de si mesma) e os
  // grupos que ela lidera.
  const selfId = member?.id
  const fetchMembers = useCallback(
    (q: string, last: PersonRef | null) =>
      searchMembers({
        q,
        after: last ? { firstName: last.firstName, lastName: last.lastName, id: last.id } : undefined,
        excludeIds: selfId ? [selfId] : undefined,
      }),
    [selfId],
  )
  const fetchMinistries = useMemo(() => groupFetcher('ministry', selfId), [selfId])
  const fetchCells = useMemo(() => groupFetcher('cell', selfId), [selfId])

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
          <RemoteSelect
            label="Parça"
            name="parcaId"
            description="Um segundo líder, mais pessoal: sabe da vida, amigos, família, por onde anda"
            placeholder="Escolha um membro"
            nothingFoundMessage="Nenhum membro encontrado"
            fetchPage={fetchMembers}
            getValue={personValue}
            getLabel={personLabel}
            value={parca}
            onChange={(value) => {
              setParca(value)
              touch('parcaId')
            }}
            error={errorFor('parcaId')}
            clearable
          />
        </div>
        <div className={classes.group}>
          <h3 className={classes.groupTitle}>Participação</h3>
          <RemoteMultiSelect
            label="Ministérios"
            name="ministryIds"
            placeholder={ministries.length ? undefined : 'Busque um ministério'}
            nothingFoundMessage="Nenhum ministério encontrado"
            fetchPage={fetchMinistries}
            getValue={groupValue}
            getLabel={groupLabel}
            value={ministries}
            onChange={setMinistries}
          />
          <RemoteMultiSelect
            label="Células"
            name="cellIds"
            placeholder={cells.length ? undefined : 'Busque uma célula'}
            nothingFoundMessage="Nenhuma célula encontrada"
            fetchPage={fetchCells}
            getValue={groupValue}
            getLabel={groupLabel}
            value={cells}
            onChange={setCells}
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
  onClose: () => void
}

export function MemberDrawer({ opened, member, onClose }: DrawerProps) {
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
              {member ? fullName(member) : 'Cadastre uma pessoa e escolha o parça dela.'}
            </p>
          </div>
          <Drawer.CloseButton aria-label="Fechar" />
        </Drawer.Header>
        <Drawer.Body className={classes.body}>
          <MemberForm key={member?.id ?? 'new'} member={member} onClose={onClose} />
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
