'use client'

import { useState } from 'react'
import { ActionIcon, Modal } from '@mantine/core'
import { IconQrcode } from '@tabler/icons-react'
import { QRCodeSVG } from 'qrcode.react'
import classes from './qr-code-button.module.css'

type Props = { lessonId: number; lessonName: string }

export function QrCodeButton({ lessonId, lessonName }: Props) {
  const [open, setOpen] = useState(false)
  // A origem vem do navegador no momento de abrir: o celular precisa alcançar o endereço desta página.
  const [url, setUrl] = useState('')

  function show() {
    setUrl(`${window.location.origin}/presenca/${lessonId}`)
    setOpen(true)
  }

  return (
    <>
      <ActionIcon
        variant="subtle"
        className={classes.actionIcon}
        aria-label={`QR Code de ${lessonName}`}
        title="QR Code"
        onClick={show}
      >
        <IconQrcode size={18} stroke={1.75} />
      </ActionIcon>

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        centered
        radius="lg"
        padding={32}
        size={460}
        overlayProps={{ color: '#14261F', backgroundOpacity: 0.45 }}
        title={lessonName}
        classNames={{ title: classes.modalTitle }}
      >
        <div className={classes.body}>
          <p className={classes.text}>
            Os alunos leem este QR Code com o celular para registrar presença.
          </p>
          <div className={classes.qr}>
            <QRCodeSVG value={url} size={280} level="M" title={`QR Code de ${lessonName}`} />
          </div>
          <p className={classes.link}>{url}</p>
        </div>
      </Modal>
    </>
  )
}
