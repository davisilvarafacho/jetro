// Tamanho de toda página servida pelo banco (listas e seletores com rolagem infinita).
export const PAGE_SIZE = 25

export type Page<T> = { items: T[]; hasMore: boolean }
