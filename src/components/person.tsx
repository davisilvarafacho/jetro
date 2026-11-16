import { Avatar } from '@mantine/core'
import classes from './person.module.css'

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

type InitialsProps = { name: string; size?: number; flagged?: boolean }

// flagged = "sem líder": avatar coral (único uso permitido do coral além do selo).
export function Initials({ name, size = 34, flagged = false }: InitialsProps) {
  return (
    <Avatar
      size={size}
      radius="xl"
      styles={{
        root: {
          background: flagged ? '#F8CDBE' : '#D9E8DE',
          color: flagged ? '#8A2C16' : '#1D4A3C',
          fontWeight: 600,
          fontSize: size <= 26 ? 11 : 13,
          letterSpacing: '0.02em',
        },
      }}
    >
      {initialsOf(name)}
    </Avatar>
  )
}

type PersonPillProps = { name: string; onClick?: () => void }

export function PersonPill({ name, onClick }: PersonPillProps) {
  const content = (
    <>
      <Initials name={name} size={26} />
      {name}
    </>
  )
  if (onClick) {
    return (
      <button type="button" className={classes.pill} onClick={onClick}>
        {content}
      </button>
    )
  }
  return <span className={classes.pill}>{content}</span>
}

// Pílula de ministério no mesmo formato, sem avatar (usada no bloqueio de exclusão).
export function TextPill({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" className={`${classes.pill} ${classes.noAvatar}`} onClick={onClick}>
      {children}
    </button>
  )
}
