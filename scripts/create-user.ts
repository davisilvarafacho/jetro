import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../src/lib/prisma'

// Só silencia a saída enquanto a senha é digitada (sem eco no terminal).
let muted = false
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk)
    callback()
  },
})

const rl = createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY })
// Iterador de linhas funciona tanto no terminal quanto com entrada via pipe.
const lines = rl[Symbol.asyncIterator]()

async function ask(label: string, hidden = false) {
  process.stdout.write(`${label}: `)
  muted = hidden
  const { value } = await lines.next()
  muted = false
  if (hidden && process.stdin.isTTY) process.stdout.write('\n')
  const answer = String(value ?? '')
  return hidden ? answer : answer.trim()
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function main() {
  const name = await ask('Nome')
  const email = (await ask('Email')).toLowerCase()
  const password = await ask('Senha', true)
  rl.close()

  if (!name) fail('Nome é obrigatório.')
  if (!email) fail('Email é obrigatório.')
  if (!password) fail('Senha é obrigatória.')
  if (!z.email().safeParse(email).success) fail('Email inválido.')
  if (password.length < 6) fail('A senha deve ter no mínimo 6 caracteres.')

  if (await prisma.user.findUnique({ where: { email } })) {
    fail(`Já existe um usuário com o email ${email}`)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({ data: { name, email, passwordHash } })
  console.log(`Usuário ${name} criado.`)
}

main()
  .catch((error) => fail(error instanceof Error ? error.message : String(error)))
  .finally(() => prisma.$disconnect())
