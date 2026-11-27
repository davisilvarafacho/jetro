# JETRO

Sistema de cuidado pastoral da 8ª Igreja Presbiteriana de Belo Horizonte: mostra quem lidera, quem participa e quem é parça de quem.

## Escopo

- **Acesso:** login com sessão segura, logout e rotas protegidas; usuários criados por linha de comando.
- **Membros:** cadastro, edição e busca por nome ou CPF, com CPF validado e único.
- **Parça:** vínculo de cuidado entre membros.
- **Ministérios e Células:** cadastro completo, com líder obrigatório e participantes como sublíder ou membro.
- **Visão de liderança:** a listagem mostra o que cada membro lidera e de onde participa.
- **Painel do membro:** indicadores de grupos, pessoas lideradas, papéis e parças.
- **Exclusão segura:** confirmação antes de excluir; membro que lidera um grupo ou é parça de alguém fica bloqueado até a troca dos vínculos.
- **Escala:** rolagem infinita e seletores com busca no servidor.
- **Identidade visual:** design system "Pastoral" documentado, em português.

## Tech Stack

| Camada | Escolha |
| --- | --- |
| Aplicação | Next.js 16 (App Router e Server Actions), React 19, TypeScript |
| Interface | Mantine 9, Tabler Icons |
| Dados | Prisma 7, SQLite |
| Autenticação | JWT em cookie (jose), bcryptjs |
| Validação | Zod |
| Ferramentas | pnpm, ESLint, Faker (dados de teste) |

> **Observação:** quando o MVP for aprovado, o backend será migrado para **Python com Django**.
