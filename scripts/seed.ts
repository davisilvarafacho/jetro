import 'dotenv/config'
import { fakerPT_BR as faker } from '@faker-js/faker'
import { isValidCpf } from '../src/lib/cpf'
import { GROUP_ROLE } from '../src/lib/group-roles'
import { prisma } from '../src/lib/prisma'

// Popula membros, ministérios, células e vínculos com dados aleatórios (só acrescenta, nunca apaga).
const MEMBERS = { min: 10_000, max: 15_000 }
const MINISTRY_SHARE = 0.3 // fração dos membros que participa de ministérios
const CELL_SHARE = 0.7 // fração dos membros que participa de células
const SUBLEADER_CHANCE = 0.08
const SECOND_MINISTRY_CHANCE = 0.25
const CELL_SIZE = { min: 15, max: 30 } // média de participantes por célula
const CHUNK = 2000

const MINISTRY_NAMES = [
  'Louvor', 'Infantil', 'Jovens', 'Adolescentes', 'Intercessão', 'Recepção', 'Mídia',
  'Diaconia', 'Casais', 'Mulheres', 'Homens', 'Missões', 'Ensino', 'Evangelismo',
  'Terceira Idade', 'Escola Bíblica', 'Cozinha', 'Comunicação', 'Aconselhamento',
  'Som e Projeção', 'Dança', 'Teatro', 'Ação Social', 'Capelania',
]

function randomCpf(): string {
  const digits = Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 }))
  for (const length of [9, 10]) {
    const sum = digits.reduce((acc, d, i) => acc + d * (length + 1 - i), 0)
    const rest = (sum * 10) % 11
    digits.push(rest === 10 ? 0 : rest)
  }
  return digits.join('')
}

function uniqueCpfs(count: number, taken: Set<string>): string[] {
  const cpfs: string[] = []
  while (cpfs.length < count) {
    const cpf = randomCpf()
    if (taken.has(cpf) || !isValidCpf(cpf)) continue
    taken.add(cpf)
    cpfs.push(cpf)
  }
  return cpfs
}

function uniqueNames(count: number, candidates: () => string, taken: Set<string>): string[] {
  const names: string[] = []
  while (names.length < count) {
    let name = candidates()
    for (let n = 2; taken.has(name); n++) name = `${name} ${n}`
    taken.add(name)
    names.push(name)
  }
  return names
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK))
  return out
}

// Sorteio com pesos aleatórios por grupo, para que uns fiquem bem maiores que outros.
function weightedPicker(count: number): () => number {
  const cumulative: number[] = []
  let total = 0
  for (let i = 0; i < count; i++) cumulative.push((total += faker.number.float({ min: 0.3, max: 3 })))
  return () => {
    const r = faker.number.float({ min: 0, max: total })
    return cumulative.findIndex((c) => r < c)
  }
}

type Link = { groupId: number; memberId: number; role: number }

function roleFor(): number {
  return faker.datatype.boolean(SUBLEADER_CHANCE) ? GROUP_ROLE.SubLeader : GROUP_ROLE.Member
}

async function main() {
  const total = faker.number.int(MEMBERS)

  const takenCpfs = new Set((await prisma.member.findMany({ select: { cpf: true } })).map((m) => m.cpf))
  const cpfs = uniqueCpfs(total, takenCpfs)
  const memberData = cpfs.map((cpf) => ({
    cpf,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  }))

  const ministryNames = faker.helpers
    .shuffle(MINISTRY_NAMES)
    .slice(0, faker.number.int({ min: 12, max: 20 }))
  const takenMinistries = new Set((await prisma.ministry.findMany({ select: { name: true } })).map((m) => m.name))
  const ministryLabels = uniqueNames(ministryNames.length, () => ministryNames.shift()!, takenMinistries)

  await prisma.$transaction(
    async (tx) => {
      // 1. Membros
      for (const part of chunks(memberData)) await tx.member.createMany({ data: part })
      const ids: number[] = []
      for (const part of chunks(cpfs)) {
        const rows = await tx.member.findMany({ where: { cpf: { in: part } }, select: { id: true } })
        ids.push(...rows.map((r) => r.id))
      }

      // 2. Quem participa de ministérios e de células (sorteios independentes: pode haver sobreposição)
      const ministryPool = faker.helpers.shuffle(ids).slice(0, Math.round(total * MINISTRY_SHARE))
      const cellPool = faker.helpers.shuffle(ids).slice(0, Math.round(total * CELL_SHARE))

      // 3. Grupos, com líderes distintos tirados de quem já participa daquele tipo de grupo
      const cellCount = Math.floor(cellPool.length / faker.number.int(CELL_SIZE))
      const ministryLeaders = ministryPool.splice(0, ministryLabels.length)
      const cellLeaders = cellPool.splice(0, cellCount)

      const takenCells = new Set((await tx.cell.findMany({ select: { name: true } })).map((c) => c.name))
      const cellLabels = uniqueNames(cellCount, () => `Célula ${faker.location.street()}`, takenCells)

      const ministryIds: number[] = []
      for (const [i, name] of ministryLabels.entries()) {
        const { id } = await tx.ministry.create({ data: { name, leaderId: ministryLeaders[i] } })
        ministryIds.push(id)
      }
      const cellIds: number[] = []
      for (const [i, name] of cellLabels.entries()) {
        const { id } = await tx.cell.create({ data: { name, leaderId: cellLeaders[i] } })
        cellIds.push(id)
      }

      // 4. Vínculos: o líder entra no próprio grupo com papel de líder; os demais caem em grupos aleatórios
      const ministryLinks: Link[] = ministryIds.map((groupId, i) => ({
        groupId,
        memberId: ministryLeaders[i],
        role: GROUP_ROLE.Leader,
      }))
      const pickMinistry = weightedPicker(ministryIds.length)
      for (const memberId of ministryPool) {
        const first = pickMinistry()
        ministryLinks.push({ groupId: ministryIds[first], memberId, role: roleFor() })
        if (ministryIds.length > 1 && faker.datatype.boolean(SECOND_MINISTRY_CHANCE)) {
          let second = pickMinistry()
          while (second === first) second = pickMinistry()
          ministryLinks.push({ groupId: ministryIds[second], memberId, role: roleFor() })
        }
      }

      const cellLinks: Link[] = cellIds.map((groupId, i) => ({
        groupId,
        memberId: cellLeaders[i],
        role: GROUP_ROLE.Leader,
      }))
      const pickCell = weightedPicker(cellIds.length)
      for (const memberId of cellPool) {
        cellLinks.push({ groupId: cellIds[pickCell()], memberId, role: roleFor() })
      }

      for (const part of chunks(ministryLinks)) {
        await tx.ministryMember.createMany({
          data: part.map(({ groupId, ...rest }) => ({ ministryId: groupId, ...rest })),
        })
      }
      for (const part of chunks(cellLinks)) {
        await tx.cellMember.createMany({
          data: part.map(({ groupId, ...rest }) => ({ cellId: groupId, ...rest })),
        })
      }

      console.log(`Membros:      ${total}`)
      console.log(
        `Ministérios:  ${ministryIds.length} (${new Set(ministryLinks.map((l) => l.memberId)).size} membros vinculados)`,
      )
      console.log(
        `Células:      ${cellIds.length} (${new Set(cellLinks.map((l) => l.memberId)).size} membros vinculados)`,
      )
    },
    { timeout: 10 * 60_000, maxWait: 60_000 },
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
