import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { getCurrentUser } from '@/lib/session'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <AppShell userName={user.name}>{children}</AppShell>
}
