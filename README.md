# JETRO

Cadastro de membros e ministérios para o cuidado pastoral. Roda localmente, com banco SQLite.

## Como rodar

1. Copie `.env.example` para `.env` e preencha `AUTH_SECRET` com um valor gerado por
   `openssl rand -base64 32`. Faça isso **antes** de instalar: o `pnpm install` roda
   `prisma generate`, que precisa do `DATABASE_URL`.
2. `pnpm install`
3. `pnpm db:migrate` — cria o banco `dev.db`.
4. `pnpm create-user` — cadastra o usuário que vai entrar no sistema (nome, e-mail e senha).
5. `pnpm dev` — abre em http://localhost:3000.
