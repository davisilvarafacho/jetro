# JETRO — MVP (design)

## Intenção

Aplicação web para cuidar dos membros da Oitava Igreja Presbiteriana de Belo Horizonte.
Este MVP será apresentado rodando localmente num notebook: simples, sem deploy, sem sofisticação.

O nome vem de Êxodo 18: Jetro, sogro de Moisés, recomenda que ele designe líderes de mil, cem,
cinquenta e dez. A ideia do JETRO é a rede de cuidado — ver quem lidera quem, cuidar dos que hoje
cuidam dos demais, e (no futuro) ter inteligência e visão sobre líderes e liderados.

## Objetivos

- Login por email e senha.
- Cadastro de membros (foco principal): CPF, nome, sobrenome, líder e parça.
- Cadastro de ministérios: nome e líder (um membro).
- Comando de terminal para criar usuários.

## Fora do escopo

- Redefinição de senha, cadastro de usuário pela tela, perfis/permissões.
- Deploy, testes automatizados, API REST.
- Busca, filtros e paginação nas listas.
- Visões/relatórios da rede de cuidado (árvore, contagem de liderados etc.) — fica para depois.

## Abordagens consideradas (autenticação)

- **Feita à mão (escolhida):** `bcryptjs` para hash de senha + cookie httpOnly com JWT assinado por `jose` + `middleware` protegendo as rotas. Pouco código, tudo visível.
- Auth.js (NextAuth) com Credentials: mais configuração e abstração do que um login email/senha precisa.

## Decisões

- **Stack:** Next.js (App Router), TypeScript, pnpm, Prisma, SQLite local.
- **UI:** Mantine (mantine.dev). Interface em pt-BR.
- **Escrita de dados:** Server Actions; validação com Zod no servidor.
- **Obrigatórios:** CPF, nome e sobrenome do membro; nome e líder do ministério; todos os campos do usuário.
- **Líder e parça do membro são opcionais** (o primeiro membro e quem está no topo não têm a quem apontar).
- **Líder do membro:** quem cuida dele. **Parça:** um segundo líder, mais pessoal — sabe da vida,
  amigos, família, por onde anda. Ambos são relações de mão única (cada membro aponta os seus).
  A mesma pessoa pode ser líder de uns e parça de outros, ou líder e parça do mesmo membro.
- **Regras da rede:**
  - Ninguém é líder nem parça de si mesmo.
  - Sem ciclos na cadeia de liderança: não se pode escolher como líder alguém que está abaixo
    (direta ou indiretamente) na cadeia de líderes.
  - Excluir membro que é líder ou parça de alguém: bloqueado, com mensagem clara listando quem
    depende dele.
- **Membros sem líder aparecem destacados** na lista de membros. Não existe marcação de "topo da
  rede": o pastor também aparece como sem líder, e isso é aceito.
- **Mensagens sobre pessoas usam frase neutra**, pelo nome ("Carlos Mendes é líder de…"), sem
  "ele/ela" — não há campo de gênero.
- **Visual:** direção "Pastoral" (`prototipo-3-pastoral.html`), especificada em `DESIGN.md` na raiz.
- **CPF:** validado pelos dígitos verificadores, único, armazenado só com dígitos, exibido com máscara (`000.000.000-00`).
- **Excluir membro que é líder de ministério:** bloqueado, com mensagem clara dizendo quais ministérios ele lidera e que é preciso trocar o líder antes.
- **Criar usuário:** `pnpm create-user`, que pergunta nome, email e senha no terminal.
- **Git:** `git init`; primeiro commit com a mensagem "Versionamento do projeto".

## Modelo de dados

- `User`: id, name, email (único), passwordHash, createdAt.
- `Member`: id, cpf (único), firstName, lastName, leaderId? → Member, parcaId? → Member
  (ambos `onDelete: Restrict`), createdAt, updatedAt.
- `Ministry`: id, name, leaderId → Member (`onDelete: Restrict`), createdAt, updatedAt.

## Telas

- `/login` — email e senha; erro genérico "Email ou senha inválidos".
- `/membros` — lista (nome completo, CPF, líder, parça; sem líder em destaque), criar, editar,
  excluir (com confirmação). Líder e parça escolhidos em selects pesquisáveis de membros.
- `/ministerios` — lista (nome, líder), criar, editar, excluir; líder escolhido num select de membros.
- `/` redireciona para `/membros`. Layout com menu lateral (Membros, Ministérios) e botão Sair.

## Decisões minhas (pode corrigir)

- Nome do ministério também é único (evita duplicados na demo).
- A regra de ciclo vale só para a cadeia de líderes; para parça vale apenas "não ser de si mesmo".
- Sessão expira em 8 horas; segredo em `AUTH_SECRET` no `.env`.
- Sem dados de exemplo (seed): a demo cadastra ao vivo.
- Erros de validação aparecem no próprio campo; sucesso/erro de ações via notificação do Mantine.

## Deixado para quem implementar

Estrutura de pastas, componentes, textos exatos das mensagens.
