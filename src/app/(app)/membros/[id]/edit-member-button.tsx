'use client'

import { useState } from 'react'
import { Button } from '@mantine/core'
import { IconPencil } from '@tabler/icons-react'
import type { MemberRow } from '@/lib/members'
import { MemberDrawer } from '../member-drawer'

export function EditMemberButton({ member }: { member: MemberRow }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button leftSection={<IconPencil size={20} stroke={1.75} />} onClick={() => setOpen(true)}>
        Editar membro
      </Button>
      <MemberDrawer opened={open} member={member} onClose={() => setOpen(false)} />
    </>
  )
}
