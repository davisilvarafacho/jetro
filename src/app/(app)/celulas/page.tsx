import { countGroups, listGroupsPage } from '@/lib/groups'
import { CellsView } from './cells-view'

// Só a primeira página sai do servidor; o resto vem por rolagem (loadGroups).
export default async function CelulasPage() {
  const [page, total] = await Promise.all([listGroupsPage('cell'), countGroups('cell')])
  return <CellsView initial={page.items} initialHasMore={page.hasMore} total={total} />
}
