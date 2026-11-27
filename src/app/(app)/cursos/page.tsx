import { countCourses, listCoursesPage } from '@/lib/courses'
import { CoursesView } from './courses-view'

// Só a primeira página sai do servidor; o resto vem por rolagem (loadCourses).
export default async function CursosPage() {
  const [page, total] = await Promise.all([listCoursesPage(), countCourses()])
  return <CoursesView initial={page.items} initialHasMore={page.hasMore} total={total} />
}
