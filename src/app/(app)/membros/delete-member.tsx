'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionIcon, Button, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react'
import { PersonPill, TextPill } from '@/components/person'
import { deleteMember } from './actions'
import classes from './delete-member.module.css'

type Dependent = { id: number; name: string; kind: 'liderado' | 'parca' | 'ministerio' }
type Blocked = { message: string; dependents: Dependent[] }

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
  const [blocked, setBlocked] = useState<Blocked | null>(null)

  function close() {
    setOpen(false)
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
    } finally {
      setLoading(false)
    }
  }

  const group = (kind: Dependent['kind']) => blocked?.dependents.filter((d) => d.kind === kind) ?? []
  const liderados = group('liderado')
  const parcaDe = group('parca')
  const ministerios = group('ministerio')

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
        onClick={() => {
          setBlocked(null)
          setOpen(true)
        }}
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
