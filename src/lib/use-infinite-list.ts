import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'

// Sem lista vinda do servidor, a primeira página também é carregada pelo cliente.
const NONE: never[] = []

type FetchPage<T> = (last: T | null) => Promise<{ items: T[]; hasMore: boolean }>

// Rolagem infinita: mostra `initial` (a primeira página, já vinda do servidor) e, quando o elemento
// `sentinel` aparece na tela e ainda há registros, pede o próximo lote com `fetchPage(últimoItem)`.
// Com `initial` nulo, começa vazia e carrega a primeira página sozinha.
export function useInfiniteList<T>({
  initial,
  initialHasMore,
  fetchPage,
  errorMessage = 'Não foi possível carregar mais itens.',
}: {
  initial: T[] | null
  initialHasMore: boolean
  fetchPage: FetchPage<T>
  errorMessage?: string
}) {
  const source = initial ?? (NONE as T[])
  // Páginas extras ficam amarradas à lista inicial que as originou: quando o servidor manda uma
  // lista nova (filtro mudou, registro salvo ou excluído), `initial` troca de identidade e as extras
  // antigas deixam de valer, sem precisar zerar estado.
  const [more, setMore] = useState<{ for: T[]; rows: T[]; hasMore: boolean } | null>(null)
  const [failedFor, setFailedFor] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(false)

  const current = more && more.for === source ? more : null
  const items = useMemo(() => (current ? [...source, ...current.rows] : source), [source, current])
  const hasMore = current ? current.hasMore : initial ? initialHasMore : true
  const failed = failedFor === source

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const page = await fetchPage(items[items.length - 1] ?? null)
      setMore((prev) => ({
        for: source,
        rows: [...(prev && prev.for === source ? prev.rows : []), ...page.items],
        hasMore: page.hasMore,
      }))
    } catch {
      setFailedFor(source)
      notifications.show({ message: errorMessage, color: 'red' })
    } finally {
      setLoading(false)
    }
  }, [fetchPage, items, source, errorMessage])

  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore || loading || failed) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, failed, loadMore])

  return { items, hasMore, loading, failed, retry: () => setFailedFor(null), sentinel }
}
