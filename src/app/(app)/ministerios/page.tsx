import { countGroups, listGroupsPage } from '@/lib/groups'
import { MinistriesView } from './ministries-view'

// Só a primeira página sai do servidor; o resto vem por rolagem (loadGroups).
export default async function MinisteriosPage() {
  const [page, total] = await Promise.all([listGroupsPage('ministry'), countGroups('ministry')])
  return <MinistriesView initial={page.items} initialHasMore={page.hasMore} total={total} />
}
