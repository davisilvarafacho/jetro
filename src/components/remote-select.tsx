'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader,
  MultiSelect,
  Select,
  type ComboboxItem,
  type MultiSelectProps,
  type OptionsFilter,
  type SelectProps,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'

// Seletores cujas opções vêm do servidor, 25 por vez: abrem com a primeira página, buscam no servidor
// enquanto se digita e carregam a página seguinte quando a lista chega ao fim. Usam o Select e o
// MultiSelect do Mantine, então têm o mesmo visual (e a mesma altura) dos demais campos.

export type Remote<T> = {
  // Página de opções para a busca `q`; `last` é a última opção já carregada (null na primeira).
  fetchPage: (q: string, last: T | null) => Promise<{ items: T[]; hasMore: boolean }>
  getValue: (item: T) => string
  getLabel: (item: T) => string
}

const DEBOUNCE_MS = 250

// Opções carregadas e busca. `selected` precisa ficar em `data` para o Mantine mostrar o rótulo do
// valor escolhido, mesmo quando ele não está na página carregada.
function useRemoteOptions<T>({ fetchPage, getValue, getLabel }: Remote<T>, selected: T[]) {
  const [loaded, setLoaded] = useState<{ items: T[]; hasMore: boolean; ready: boolean }>({
    items: [],
    hasMore: true,
    ready: false,
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearchValue] = useState('')
  const query = useRef('') // busca vigente no servidor
  const typed = useRef('') // o que foi digitado (vazio quando o campo só mostra o valor escolhido)
  const opened = useRef(false)
  const latest = useRef(0) // descarta respostas de buscas que já foram substituídas
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const load = useCallback(
    async (q: string, last: T | null) => {
      const request = ++latest.current
      setLoading(true)
      try {
        const page = await fetchPage(q, last)
        if (request !== latest.current) return
        setLoaded((prev) => ({
          items: last ? [...prev.items, ...page.items] : page.items,
          hasMore: page.hasMore,
          ready: true,
        }))
      } catch {
        if (request === latest.current) {
          notifications.show({ message: 'Não foi possível carregar as opções.', color: 'red' })
        }
      } finally {
        if (request === latest.current) setLoading(false)
      }
    },
    [fetchPage],
  )

  // Digitar busca no servidor depois de uma pausa. O Mantine também chama onSearchChange sozinho
  // (ao montar, ao escolher, ao fechar, devolvendo ao campo o rótulo do valor escolhido): isso só
  // atualiza o texto e não é busca. Só busca com a lista aberta; o texto digitado antes de ela abrir
  // (a primeira tecla abre a lista depois de alterar o texto) é usado por onDropdownOpen.
  const onSearchChange = (value: string, selectedLabel?: string) => {
    setSearchValue(value)
    const q = value === selectedLabel ? '' : value
    typed.current = q
    if (!opened.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      query.current = q
      void load(q, null)
    }, DEBOUNCE_MS)
  }

  // Texto do campo depois de escolher (o rótulo do valor, ou vazio se nada ficou escolhido).
  const setText = (text: string) => setSearchValue(text)

  // Cada abertura recarrega a primeira página (as exclusões do pai podem ter mudado), já com o que
  // foi digitado.
  const onDropdownOpen = () => {
    opened.current = true
    clearTimeout(timer.current)
    query.current = typed.current
    void load(typed.current, null)
  }

  const onDropdownClose = () => {
    opened.current = false
    clearTimeout(timer.current)
  }

  const onBottomReached = () => {
    if (!loaded.ready || !loaded.hasMore || loading) return
    void load(query.current, loaded.items[loaded.items.length - 1] ?? null)
  }

  const byValue = useMemo(() => {
    const map = new Map<string, T>()
    // Ordem do servidor primeiro: o valor escolhido só entra ao final se não veio na página
    // (fica em `data` para o rótulo, mas fora da lista), em vez de subir para o topo.
    for (const item of [...loaded.items, ...selected]) {
      if (!map.has(getValue(item))) map.set(getValue(item), item)
    }
    return map
  }, [selected, loaded.items, getValue])

  const data: ComboboxItem[] = useMemo(
    () => [...byValue].map(([value, item]) => ({ value, label: getLabel(item) })),
    [byValue, getLabel],
  )

  // Sem filtro no cliente: a busca já foi feita no servidor. O valor escolhido que não veio na
  // página fica só em `data` (para o rótulo), fora da lista.
  const filter: OptionsFilter = useMemo(() => {
    const shown = new Set(loaded.items.map(getValue))
    return ({ options }) =>
      (options as ComboboxItem[]).filter((option) => shown.has(option.value))
  }, [loaded.items, getValue])

  return {
    data,
    byValue,
    filter,
    search,
    loading,
    ready: loaded.ready,
    onSearchChange,
    setText,
    onDropdownOpen,
    onDropdownClose,
    scrollAreaProps: { onBottomReached },
  }
}

type SelectOwn = 'data' | 'value' | 'defaultValue' | 'onChange' | 'filter' | 'searchValue' | 'onSearchChange' | 'onDropdownOpen' | 'onDropdownClose' | 'scrollAreaProps' | 'searchable' | 'nothingFoundMessage' | 'rightSection'

export type RemoteSelectProps<T> = Remote<T> &
  Omit<SelectProps, SelectOwn> & {
    value: T | null
    onChange: (item: T | null) => void
    nothingFoundMessage?: string
    // Seletor usado só para escolher (o valor volta sempre a nulo, ex.: "Adicionar membro"): limpa o
    // texto depois de escolher em vez de deixar o nome no campo.
    clearOnSelect?: boolean
  }

export function RemoteSelect<T>({
  fetchPage,
  getValue,
  getLabel,
  value,
  onChange,
  nothingFoundMessage,
  clearOnSelect = false,
  ...rest
}: RemoteSelectProps<T>) {
  const selected = useMemo(() => (value ? [value] : []), [value])
  const remote = useRemoteOptions({ fetchPage, getValue, getLabel }, selected)
  const selectedLabel = value ? getLabel(value) : undefined

  return (
    <Select
      {...rest}
      searchable
      data={remote.data}
      value={value ? getValue(value) : null}
      onChange={(next) => {
        const item = next ? (remote.byValue.get(next) ?? null) : null
        // Com o valor controlado, o Mantine só repõe o texto do campo quando o rótulo muda: ao trocar
        // por outra pessoa com o mesmo nome o campo ficaria em branco, e um seletor que sempre volta
        // a nulo manteria o texto digitado. Por isso o texto é definido aqui.
        remote.setText(item && !clearOnSelect ? getLabel(item) : '')
        onChange(item)
      }}
      filter={remote.filter}
      searchValue={remote.search}
      onSearchChange={(text) => remote.onSearchChange(text, selectedLabel)}
      onDropdownOpen={remote.onDropdownOpen}
      onDropdownClose={remote.onDropdownClose}
      scrollAreaProps={remote.scrollAreaProps}
      nothingFoundMessage={remote.ready && !remote.loading ? nothingFoundMessage : undefined}
      rightSection={remote.loading ? <Loader size={16} aria-label="Carregando opções" /> : undefined}
    />
  )
}

export type RemoteMultiSelectProps<T> = Remote<T> &
  Omit<MultiSelectProps, SelectOwn | 'loading'> & {
    value: T[]
    onChange: (items: T[]) => void
    nothingFoundMessage?: string
  }

export function RemoteMultiSelect<T>({
  fetchPage,
  getValue,
  getLabel,
  value,
  onChange,
  nothingFoundMessage,
  ...rest
}: RemoteMultiSelectProps<T>) {
  const remote = useRemoteOptions({ fetchPage, getValue, getLabel }, value)

  return (
    <MultiSelect
      {...rest}
      searchable
      data={remote.data}
      value={value.map(getValue)}
      onChange={(next) =>
        onChange(next.flatMap((v) => (remote.byValue.has(v) ? [remote.byValue.get(v) as T] : [])))
      }
      filter={remote.filter}
      searchValue={remote.search}
      onSearchChange={(text) => remote.onSearchChange(text)}
      onDropdownOpen={remote.onDropdownOpen}
      onDropdownClose={remote.onDropdownClose}
      scrollAreaProps={remote.scrollAreaProps}
      nothingFoundMessage={remote.ready && !remote.loading ? nothingFoundMessage : undefined}
      loading={remote.loading}
    />
  )
}
