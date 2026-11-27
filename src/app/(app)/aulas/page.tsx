import { countLessons, listLessonsPage } from '@/lib/lessons'
import { LessonsView } from './lessons-view'

// Só a primeira página sai do servidor; o resto vem por rolagem (loadLessons).
export default async function AulasPage() {
  const [page, total] = await Promise.all([listLessonsPage(), countLessons()])
  return <LessonsView initial={page.items} initialHasMore={page.hasMore} total={total} />
}
