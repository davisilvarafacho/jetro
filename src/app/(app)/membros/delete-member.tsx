'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionIcon, Button, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react'
import { PersonPill, TextPill } from '@/components/person'
import { roleLabel } from '@/lib/group-roles'
import { deleteMember, getDeleteImpact, type DeleteImpact } from './actions'
import classes from './delete-member.module.css'

type Dependent = { id: number; name: string; kind: 'liderado' | 'parca' | 'ministerio' | 'celula' }
type Blocked = { message: string; dependents: Dependent[] }
type Memberships = Extract<DeleteImpact, { blocked: false }>['memberships']

type Props = {
  id: number
  name: string
  iconClassName: string
  onOpenMember: (id: number) => void
}

const overlayProps = { color: '#14261F', backgroundOpacity: 0.45 }

export function DeleteMember({ id, name, iconClassName, onOpenMember }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [blocked, setBlocked] = useState<Blocked | null>(null)
  const [memberships, setMemberships] = useState<Memberships>([])

  function close() {
    setOpen(false)
  }

  // Primeiro passo: só consulta o que a exclusão afeta, sem apagar nada.
  async function start() {
    setChecking(true)
    try {
      const impact = await getDeleteImpact(id)
      if (impact.blocked) {
        setBlocked({ message: impact.message, dependents: impact.dependents })
        setMemberships([])
      } else {
        setBlocked(null)
        setMemberships(impact.memberships)
      }
      setOpen(true)
    } catch {
      notifications.show({
        message: 'Não foi possível verificar o membro. Tente novamente.',
        color: 'red',
      })
    } finally {
      setChecking(false)
    }
  }

  async function confirm() {
    setLoading(true)
    try {
      const result = await deleteMember(id)
      if (result.ok) {
        notifications.show({ message: 'Membro excluído', color: 'floresta' })
        close()
      } else {
        setBlocked({ message: result.message, dependents: result.dependents })
      }
    } catch {
      notifications.show({
        message: 'Não foi possível excluir o membro. Tente novamente.',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const group = (kind: Dependent['kind']) => blocked?.dependents.filter((d) => d.kind === kind) ?? []
  const liderados = group('liderado')
  const parcaDe = group('parca')
  const ministerios = group('ministerio')
  const celulas = group('celula')

  function openMember(memberId: number) {
    close()
    onOpenMember(memberId)
  }

  return (
    <>
      <ActionIcon
        variant="subtle"
        className={iconClassName}
        aria-label={`Excluir ${name}`}
        title="Excluir"
        loading={checking}
        onClick={start}
      >
        <IconTrash size={18} stroke={1.75} />
      </ActionIcon>

      <Modal
        opened={open && !blocked}
        onClose={close}
        centered
        radius="lg"
        padding={32}
        size={460}
        overlayProps={overlayProps}
        withCloseButton={false}
        title={`Excluir ${name}?`}
        classNames={{ title: classes.confirmTitle }}
      >
        {memberships.length > 0 && (
          <div className={classes.memberships}>
            <h3 className={classes.depsLabel}>Será removido de</h3>
            <ul className={classes.membershipList}>
              {memberships.map((m) => (
                <li key={`${m.kind}-${m.id}`} className={classes.membership}>
                  <span className={classes.membershipName}>{m.name}</span>
                  <span className={classes.membershipRole}>
                    {m.kind === 'ministry' ? 'Ministério' : 'Célula'} · {roleLabel(m.role)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className={classes.confirmText}>Esta ação não pode ser desfeita.</p>
        <div className={classes.actions}>
          <Button variant="default" onClick={close}>
            Cancelar
          </Button>
          <Button color="red" loading={loading} onClick={confirm}>
            Excluir
          </Button>
        </div>
      </Modal>

      <Modal.Root
        opened={open && blocked !== null}
        onClose={close}
        centered
        radius="lg"
        padding={32}
        size={540}
      >
        <Modal.Overlay {...overlayProps} />
        <Modal.Content>
          <Modal.Body>
            <span className={classes.blockIcon}>
              <IconAlertTriangle size={28} stroke={1.75} />
            </span>
            <Modal.Title className={classes.blockTitle}>Não é possível excluir</Modal.Title>
            <p className={classes.blockText}>{blocked?.message}</p>
            <div className={classes.deps}>
              {liderados.length > 0 && (
                <div>
                  <h3 className={classes.depsLabel}>Líder de</h3>
                  <div className={classes.depsList}>
                    {liderados.map((d) => (
                      <PersonPill key={d.id} name={d.name} onClick={() => openMember(d.id)} />
                    ))}
                  </div>
                </div>
              )}
              {parcaDe.length > 0 && (
                <div>
                  <h3 className={classes.depsLabel}>Parça de</h3>
                  <div className={classes.depsList}>
                    {parcaDe.map((d) => (
                      <PersonPill key={d.id} name={d.name} onClick={() => openMember(d.id)} />
                    ))}
                  </div>
                </div>
              )}
              {ministerios.length > 0 && (
                <div>
                  <h3 className={classes.depsLabel}>
                    {ministerios.length > 1 ? 'Líder dos ministérios' : 'Líder do ministério'}
                  </h3>
                  <div className={classes.depsList}>
                    {ministerios.map((d) => (
                      <TextPill key={d.id} onClick={() => router.push('/ministerios')}>
                        {d.name}
                      </TextPill>
                    ))}
                  </div>
                </div>
              )}
              {celulas.length > 0 && (
                <div>
                  <h3 className={classes.depsLabel}>
                    {celulas.length > 1 ? 'Líder das células' : 'Líder da célula'}
                  </h3>
                  <div className={classes.depsList}>
                    {celulas.map((d) => (
                      <TextPill key={d.id} onClick={() => router.push('/celulas')}>
                        {d.name}
                      </TextPill>
                    ))}
                  </div>
                </div>
              )}
              <p className={classes.hint}>Clique num nome para abrir o cadastro e trocar o vínculo.</p>
            </div>
            <div className={classes.actions}>
              <Button onClick={close}>Entendi</Button>
            </div>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </>
  )
}
