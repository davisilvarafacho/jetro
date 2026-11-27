import Link from 'next/link'
import { IconArrowLeft } from '@tabler/icons-react'
import { Title } from '@mantine/core'
import classes from './member-panel.module.css'

export default function MemberNotFound() {
  return (
    <>
      <Link href="/membros" className={classes.back}>
        <IconArrowLeft size={18} stroke={1.75} />
        Membros
      </Link>
      <Title order={1} className={classes.title}>
        Membro não encontrado
      </Title>
      <p className={classes.cpf}>Este membro não existe ou já foi excluído.</p>
    </>
  )
}
