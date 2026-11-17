import { VisuallyHidden } from '@mantine/core'
import { IconHeart, IconUsersGroup } from '@tabler/icons-react'
import classes from './group-kind-mark.module.css'

// Ícone discreto que distingue ministério de célula quando os dois têm o mesmo nome.
export function GroupKindMark({ kind }: { kind: 'ministry' | 'cell' }) {
  const label = kind === 'ministry' ? 'Ministério' : 'Célula'
  const Icon = kind === 'ministry' ? IconHeart : IconUsersGroup
  return (
    <>
      <span className={classes.mark} title={label} aria-hidden="true">
        <Icon size={16} stroke={1.75} />
      </span>
      <VisuallyHidden>{label}: </VisuallyHidden>
    </>
  )
}
