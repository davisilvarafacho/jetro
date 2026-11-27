// Datas de aula são "só dia": guardadas como meia-noite UTC, trafegadas como `YYYY-MM-DD` e
// exibidas como `DD/MM/AAAA` sem passar por fuso (nenhum `Date` local entra na conta).

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

// `YYYY-MM-DD` -> meia-noite UTC. Formato inválido ou dia inexistente (2026-02-30) vira `null`.
export function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY.exec(value)
  if (!match) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  // O `Date` normaliza dias que não existem (30/02 vira 02/03); a ida e volta denuncia isso.
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) return null
  return date
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// `2026-03-01` -> `01/03/2026`, só rearranjando o texto.
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

// Hoje no fuso de Brasília, que é o que a igreja considera "hoje" (o servidor roda em UTC).
export function todayDateOnly(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
