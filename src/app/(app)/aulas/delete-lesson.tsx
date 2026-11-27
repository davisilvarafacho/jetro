'use client'

import { useState } from 'react'
import { ActionIcon, Button, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconTrash } from '@tabler/icons-react'
import { deleteLesson } from './actions'
import classes from './delete-lesson.module.css'

type Props = { id: number; name: string; iconClassName: string }

export function DeleteLesson({ id, name, iconClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function confirm() {
    setLoading(true)
    try {
      await deleteLesson(id)
      notifications.show({ message: 'Aula excluída', color: 'floresta' })
      setOpen(false)
    } catch {
      notifications.show({
        message: 'Não foi possível excluir a aula. Tente novamente.',
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ActionIcon
        variant="subtle"
        className={iconClassName}
        aria-label={`Excluir ${name}`}
        title="Excluir"
        onClick={() => setOpen(true)}
      >
        <IconTrash size={18} stroke={1.75} />
      </ActionIcon>

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        centered
        radius="lg"
        padding={32}
        size={460}
        overlayProps={{ color: '#14261F', backgroundOpacity: 0.45 }}
        withCloseButton={false}
        title={`Excluir a aula ${name}?`}
        classNames={{ title: classes.confirmTitle }}
      >
        <p className={classes.confirmText}>
          A aula será removida junto com as presenças registradas. Os membros continuam cadastrados.
        </p>
        <div className={classes.actions}>
          <Button variant="default" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button color="red" loading={loading} onClick={confirm}>
            Excluir
          </Button>
        </div>
      </Modal>
    </>
  )
}
