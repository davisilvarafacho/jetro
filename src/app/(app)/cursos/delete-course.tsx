'use client'

import { useState } from 'react'
import { ActionIcon, Button, Modal } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconTrash } from '@tabler/icons-react'
import { deleteCourse } from './actions'
import classes from './delete-course.module.css'

type Props = { id: number; name: string; iconClassName: string }

export function DeleteCourse({ id, name, iconClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function confirm() {
    setLoading(true)
    try {
      await deleteCourse(id)
      notifications.show({ message: 'Curso excluído', color: 'floresta' })
      setOpen(false)
    } catch {
      notifications.show({
        message: 'Não foi possível excluir o curso. Tente novamente.',
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
        title={`Excluir o curso ${name}?`}
        classNames={{ title: classes.confirmTitle }}
      >
        <p className={classes.confirmText}>
          O curso será removido com suas aulas, inscrições e presenças. Os membros continuam cadastrados.
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
