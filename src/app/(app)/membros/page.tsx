import { countMembers, listMembersPage } from '@/lib/members'
import { MembersView } from './members-view'

type SearchParams = { q?: string | string[] }

// Só a primeira página sai do servidor; o resto vem por rolagem (loadMoreMembers).
export default async function MembrosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const q = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 100)

  const [page, total] = await Promise.all([listMembersPage({ q }), countMembers()])
  return (
    <MembersView
      initial={page.items}
      initialHasMore={page.hasMore}
      q={q}
      total={total}
    />
  )
}
