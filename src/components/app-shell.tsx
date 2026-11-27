'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppShell as MantineAppShell, Avatar, Button, NavLink } from '@mantine/core'
import {
  IconBuildingChurch,
  IconCalendarEvent,
  IconLogout,
  IconSchool,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react'
import { logout } from '@/app/login/actions'
import { Brand } from './brand'
import classes from './app-shell.module.css'

const links = [
  { href: '/membros', label: 'Membros', icon: <IconUsers size={21} stroke={1.75} /> },
  { href: '/ministerios', label: 'Ministérios', icon: <IconBuildingChurch size={21} stroke={1.75} /> },
  { href: '/celulas', label: 'Células', icon: <IconUsersGroup size={21} stroke={1.75} /> },
  { href: '/cursos', label: 'Cursos', icon: <IconSchool size={21} stroke={1.75} /> },
  { href: '/aulas', label: 'Aulas', icon: <IconCalendarEvent size={21} stroke={1.75} /> },
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

type AppShellProps = { userName: string; children: ReactNode }

export function AppShell({ userName, children }: AppShellProps) {
  const pathname = usePathname()

  return (
    <MantineAppShell
      navbar={{ width: { base: 80, '1100px': 256 }, breakpoint: 'xs' }}
      padding={0}
    >
      <MantineAppShell.Navbar className={classes.navbar} withBorder={false}>
        <Brand />
        <nav className={classes.nav} aria-label="Principal">
          {links.map((link) => (
            <NavLink
              key={link.href}
              component={Link}
              href={link.href}
              label={link.label}
              aria-label={link.label}
              leftSection={link.icon}
              active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
              variant="subtle"
              classNames={{ root: classes.link, body: classes.linkBody, section: classes.linkSection }}
            />
          ))}
        </nav>
        <div className={classes.me}>
          <div className={classes.person}>
            <Avatar
              size={34}
              radius="xl"
              styles={{ root: { background: '#D9E8DE', color: '#1D4A3C', fontWeight: 600 } }}
            >
              {initials(userName)}
            </Avatar>
            <span className={classes.name}>{userName}</span>
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              fullWidth
              aria-label="Sair"
              className={classes.logout}
              leftSection={<IconLogout size={18} stroke={1.75} />}
            >
              <span className={classes.logoutLabel}>Sair</span>
            </Button>
          </form>
        </div>
      </MantineAppShell.Navbar>
      <MantineAppShell.Main className={classes.main}>{children}</MantineAppShell.Main>
    </MantineAppShell>
  )
}
