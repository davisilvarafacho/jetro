import Link from 'next/link'
import { Avatar } from '@mantine/core'
import classes from './person.module.css'

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

type InitialsProps = { name: string; size?: number }

export function Initials({ name, size = 34 }: InitialsProps) {
  return (
    <Avatar
      size={size}
      radius="xl"
      styles={{
        root: {
          background: '#D9E8DE',
          color: '#1D4A3C',
          fontWeight: 600,
          fontSize: size <= 26 ? 11 : size >= 56 ? 24 : 13,
          letterSpacing: '0.02em',
        },
      }}
    >
      {initialsOf(name)}
    </Avatar>
  )
}

type PersonPillProps = { name: string; onClick?: () => void; href?: string }

export function PersonPill({ name, onClick, href }: PersonPillProps) {
  const content = (
    <>
      <Initials name={name} size={26} />
      {name}
    </>
  )
  if (href) {
    return (
      <Link href={href} className={`${classes.pill} ${classes.link}`}>
        {content}
      </Link>
    )
  }
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
