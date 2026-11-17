# Vínculos membro↔ministério, células e visão de liderança — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vincular membros a ministérios e células com papel (líder, sublíder, membro), criar o módulo de células e mostrar na lista de membros o que cada um lidera e onde participa.

**Architecture:** Duas tabelas de vínculo (`MinistryMember`, `CellMember`) com `role Int`. `leaderId` em `Ministry`/`Cell` continua a fonte da liderança; o vínculo `role=1` é derivado dele dentro da mesma transação de gravação. Um helper compartilhado (`src/lib/group-members.ts`) serve ministério e célula por um parâmetro `kind`. Exclusão de membro vira dois passos (consulta e confirmação).

**Tech Stack:** o mesmo do MVP (Next.js 16 Server Actions, Prisma 7 + SQLite, Mantine 9, zod 4, pnpm).

**Spec:** `docs/superpowers/specs/2026-11-16-vinculos-celulas-design.md` (e `2026-11-16-jetro-mvp-design.md`; visual em `DESIGN.md`).

## Global Constraints

- Sem testes automatizados (decisão do usuário no MVP). Verificação de cada task = `pnpm exec tsc --noEmit`, `pnpm lint` e o roteiro manual da task (`pnpm dev`).
- Toda a UI em pt-BR. Mensagens sobre pessoas usam frase neutra pelo nome, nunca "ele/ela".
- Papéis: `1` líder, `2` sublíder, `3` membro (padrão `3`). `role=1` só nasce de `leaderId`.
- Coral é exclusivo para "sem líder"; vermelho para erro/excluir. Tokens visuais de `DESIGN.md`.
- Gestão de vínculos só dentro dos forms de membro, ministério e célula; nenhum módulo "vincular".
- Commits: mensagem curta em pt-BR + linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Comentário no ponto de sincronização do líder: `// FUTURO: módulo de logs registrará estas mudanças automaticamente.`

## Review Focus

1. Trocar o líder para quem já é sublíder ou membro do grupo: não duplica (único por grupo+membro), vira `role=1`; o líder antigo vira `role=3` mesmo que não conste na lista enviada. → Task 2.
2. Corpo do form adulterado: id do líder, `role=1` ou id inexistente na lista de membros. O servidor ignora esses itens e o líder nunca perde o vínculo. → Task 2.
3. Editar membro desmarcando um grupo que ele lidera não remove o vínculo `role=1`; sublíder mantido continua sublíder. → Task 4.
4. Entre abrir a confirmação e confirmar, o membro virou líder de algo: `deleteMember` confere de novo e devolve o bloqueio, sem apagar. → Task 5.
5. Nome de célula duplicado (mesmo com outra caixa de letra no UI) vira erro no campo, não erro 500; célula sem membros além do líder salva normalmente. → Task 3.

---

### Task 1: Schema, migração com backfill e helper de vínculos

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_vinculos_celulas/migration.sql` (via `--create-only`, depois editar)
- Create: `src/lib/group-roles.ts`, `src/lib/group-members.ts`

**Interfaces:**
- Produces (`group-roles.ts`): `GROUP_ROLE = { Leader: 1, SubLeader: 2, Member: 3 } as const`; `type GroupRole = 1 | 2 | 3`; `type AssignableRole = 2 | 3`; `roleLabel(role: GroupRole): string` (`Líder`, `Sublíder`, `Membro`); `isAssignableRole(value: unknown): value is AssignableRole`.
- Produces (`group-members.ts`): `type GroupKind = 'ministry' | 'cell'`; `type Tx = Prisma.TransactionClient`;
  - `saveGroupMembers(tx: Tx, kind: GroupKind, groupId: number, opts: { leaderId: number; previousLeaderId: number | null; members: { memberId: number; role: AssignableRole }[] }): Promise<void>` — deixa os vínculos do grupo exatamente assim: líder `role=1`; líder anterior (se mudou e não está em `members`) `role=3`; cada item de `members` com seu papel; todo o resto removido. Ignora itens cujo `memberId` é o líder, duplicado ou inexistente.
  - `setMemberGroups(tx: Tx, kind: GroupKind, memberId: number, groupIds: number[]): Promise<void>` — para o membro: cria `role=3` para ids marcados ainda sem vínculo; remove vínculos não marcados que não sejam `role=1`; vínculos já existentes mantêm o papel.

- [ ] **Step 1: Schema.** Em `prisma/schema.prisma` adicionar `Cell` (igual a `Ministry`: `name @unique`, `leaderId`, `leader` com `onDelete: Restrict`, timestamps), `MinistryMember` e `CellMember` (`id`, `ministryId`/`cellId` e `memberId` com `onDelete: Cascade`, `role Int @default(3)`, `@@unique([ministryId, memberId])` / `@@unique([cellId, memberId])`). Em `Member` manter `ministerios Ministry[]` (liderança) e acrescentar `celulas Cell[]` (liderança), `ministryLinks MinistryMember[]`, `cellLinks CellMember[]`; em `Ministry` acrescentar `members MinistryMember[]`; em `Cell`, `members CellMember[]`.
- [ ] **Step 2:** `pnpm exec prisma migrate dev --create-only --name vinculos_celulas`. No `migration.sql` gerado, acrescentar ao final o backfill: `INSERT INTO "MinistryMember" ("ministryId","memberId","role") SELECT "id","leaderId",1 FROM "Ministry";`
- [ ] **Step 3:** `pnpm exec prisma migrate dev` (aplica e regenera o client). Verificar com `sqlite3 prisma/dev.db "select count(*) from MinistryMember; select count(*) from Ministry;"` — as duas contagens iguais (ajuste o caminho do banco conforme `DATABASE_URL`).
- [ ] **Step 4:** Implementar `group-roles.ts` e `group-members.ts` conforme Interfaces. `group-members.ts` mapeia `kind` para o delegate e a coluna de chave (`ministryMember`/`ministryId`, `cellMember`/`cellId`); pode usar um único cast interno. O comentário `FUTURO: módulo de logs…` fica em `saveGroupMembers`.
- [ ] **Step 5:** `pnpm exec tsc --noEmit && pnpm lint` passam. Commit: `Vínculos de ministério e célula no banco`.

### Task 2: Membros e papéis no drawer de ministério

**Files:**
- Create: `src/components/group-members-field.tsx`, `src/components/group-members-field.module.css`
- Modify: `src/app/(app)/ministerios/actions.ts`, `ministry-drawer.tsx`, `ministries-view.tsx`, `page.tsx`

**Interfaces:**
- Consumes: Task 1 (`saveGroupMembers`, `AssignableRole`, `isAssignableRole`, `roleLabel`).
- Produces: `GroupMembersField` (client) com props `{ candidates: { id: number; firstName: string; lastName: string }[]; leaderId: string | null; value: GroupMemberEntry[]; onChange: (v: GroupMemberEntry[]) => void }`, com `export type GroupMemberEntry = { memberId: number; role: AssignableRole }`. Renderiza um select "Adicionar membro" (busca, exclui o líder e quem já está na lista) e, por linha, `PersonPill`, select de papel (Sublíder/Membro) e botão remover (`aria-label="Remover <nome>"`). Emite `<input type="hidden" name="members" value={JSON.stringify(value)}>`.
- Produces: `MinistryRow` ganha `members: { memberId: number; role: AssignableRole }[]` (só `role` 2 e 3).

- [ ] **Step 1:** `page.tsx` inclui os vínculos `role` 2 e 3 de cada ministério em `MinistryRow.members`.
- [ ] **Step 2:** Implementar `GroupMembersField` e usá-lo em `MinistryForm` abaixo do líder, com estado controlado como os demais campos. Se o líder ainda não foi escolhido, o campo aparece desabilitado com a dica "Escolha o líder primeiro".
- [ ] **Step 3:** `saveMinistry` lê `members` (JSON; zod: array de `{ memberId: positive int, role }` com `isAssignableRole`; JSON inválido vira lista vazia), busca o `leaderId` anterior quando `id` existe, e grava ministério + `saveGroupMembers` numa única `prisma.$transaction`. Mantém o tratamento de `P2002`.
- [ ] **Step 4:** Roteiro manual (`pnpm dev`): (a) criar ministério com líder A → A aparece como `role=1` (conferir com `sqlite3`); (b) adicionar B como sublíder e C como membro; (c) editar trocando o líder para B → B `role=1`, A `role=3`, C intacto, sem duplicata; (d) pelo DevTools, alterar o hidden `members` incluindo o id do líder com role 1 e um id inexistente → salva sem erro e o banco continua coerente (Review Focus 1 e 2); (e) excluir o ministério apaga os vínculos.
- [ ] **Step 5:** tsc e lint passam. Commit: `Membros e papéis no cadastro de ministério`.

### Task 3: Módulo de células

**Files:**
- Create: `src/app/(app)/celulas/` com `page.tsx`, `actions.ts`, `cells-view.tsx`, `cell-drawer.tsx`, `delete-cell.tsx` e os três `.module.css` (copiados de `ministerios/` e renomeados)
- Modify: `src/components/app-shell.tsx` (item "Células", ícone de `@tabler/icons-react` à escolha, logo após Ministérios), `src/lib/members.ts`, `src/app/(app)/membros/actions.ts`, `src/app/(app)/membros/delete-member.tsx`

**Interfaces:**
- Consumes: Tasks 1 e 2.
- Produces: `saveCell(prev: CellFormState, formData: FormData): Promise<CellFormState>` e `deleteCell(id: number): Promise<void>`, espelhando `saveMinistry`/`deleteMinistry` (campos `name`, `leaderId`, `members`; mensagem de duplicado "Já existe uma célula com este nome"); revalidam `/celulas` e `/membros`.
- Produces: `Dependents` ganha `celulas: { id: number; name: string }[]`; `getDependents` as busca por `leaderId`; `blockedDeleteMessage` acrescenta "líder da célula X" / "líder das células X e Y" (mesmo padrão do ministério); `DeleteMemberResult.dependents[].kind` ganha `'celula'`.

- [ ] **Step 1:** Clonar o módulo de ministérios para `celulas/` com os textos trocados (Células, "Nova célula", "Dê um nome à célula e escolha quem a lidera."), reutilizando `GroupMembersField` no drawer e chamando `saveGroupMembers(tx, 'cell', …)` em `saveCell`.
- [ ] **Step 2:** Item de menu em `app-shell.tsx`.
- [ ] **Step 3:** Estender `Dependents`, `getDependents`, `blockedDeleteMessage` e o `toDependentList`/modal de bloqueio em `delete-member.tsx` (grupo "Líder da célula"/"Líder das células", pílulas que levam a `/celulas`).
- [ ] **Step 4:** Roteiro manual: criar célula com líder e sublíder; nome duplicado ("Jovens" e "jovens") mostra erro no campo, não 500; célula só com o líder salva; o mesmo membro entra em duas células; editar a troca de líder igual à Task 2; tentar excluir o líder de uma célula mostra o bloqueio listando a célula; excluir a célula apaga os vínculos.
- [ ] **Step 5:** tsc e lint passam. Commit: `Módulo de células`.

### Task 4: Vínculos no cadastro de membro e visão "Lidera / Participa"

**Files:**
- Modify: `src/lib/members.ts`, `src/app/(app)/membros/page.tsx`, `members-view.tsx`, `member-drawer.tsx`, `actions.ts`, `members.module.css`, `member-drawer.module.css`

**Interfaces:**
- Consumes: Tasks 1–3 (`setMemberGroups`).
- Produces: `MemberRow` ganha `leads: { kind: GroupKind; id: number; name: string }[]` (vem de `Ministry.leaderId`/`Cell.leaderId`, a fonte da liderança) e `participates: { kind: GroupKind; id: number; name: string; role: AssignableRole }[]` (vínculos `role` 2 e 3). `listMembers` as carrega ordenadas por nome. `page.tsx` também entrega `ministries` e `cells` (`{ id, name }[]`) ao view e ao drawer.

- [ ] **Step 1:** Estender `MemberRow` e `listMembers`.
- [ ] **Step 2:** `members-view.tsx`: duas colunas após Parça — **Lidera** (pílulas de texto em destaque, ministérios e células; vazio mostra "—" com texto oculto "Não lidera nada") e **Participa** (pílulas neutras; sublíder leva o sufixo " · sublíder"). Ajustar `members.module.css` para a tabela caber.
- [ ] **Step 3:** `member-drawer.tsx`: grupo "Participação" com `MultiSelect` (busca) "Ministérios" e "Células" gravando `ministryIds`/`cellIds` (`name` do Mantine envia lista separada por vírgula). Os grupos que o membro lidera ficam fora das opções e aparecem num texto fixo "Lidera: …" (leitura).
- [ ] **Step 4:** `saveMember` lê `ministryIds`/`cellIds` (só inteiros positivos; filtra ids inexistentes) e chama `setMemberGroups` para cada `kind` na mesma transação que grava o membro (hoje são `create`/`update` soltos; embrulhar em `prisma.$transaction`).
- [ ] **Step 5:** Roteiro manual: a lista mostra "Lidera" e "Participa" certos para líder, sublíder e membro; marcar dois ministérios e uma célula no cadastro de um membro cria `role=3`; um sublíder existente continua sublíder ao salvar o membro sem mexer; o grupo que ele lidera não aparece no seletor e continua com `role=1` (Review Focus 3); desmarcar remove o vínculo.
- [ ] **Step 6:** tsc e lint passam. Commit: `Vínculos no cadastro de membro e coluna Lidera/Participa`.

### Task 5: Exclusão de membro em dois passos

**Files:**
- Modify: `src/lib/members.ts`, `src/app/(app)/membros/actions.ts`, `delete-member.tsx`

**Interfaces:**
- Consumes: Task 3 (`Dependents` com células).
- Produces: `getDeleteImpact(id: number): Promise<DeleteImpact>` em `actions.ts`, com `type DeleteImpact = { blocked: true; message: string; dependents: DeleteMemberResult['dependents'] } | { blocked: false; memberships: { kind: GroupKind; id: number; name: string; role: AssignableRole }[] }`. Só consulta; nunca apaga. `deleteMember(id)` mantém a assinatura e o retorno atuais e continua conferindo o bloqueio no servidor antes de apagar.

- [ ] **Step 1:** Implementar `getDeleteImpact` reutilizando `getDependents`/`blockedDeleteMessage`; membro inexistente devolve `{ blocked: false, memberships: [] }`.
- [ ] **Step 2:** `delete-member.tsx`: o clique na lixeira chama `getDeleteImpact` (botão em estado de carregando). Bloqueado → modal de bloqueio atual. Livre → modal de confirmação com "Excluir <nome>?", a lista "Será removido de" (ministérios e células, papel em cada) quando houver, e "Esta ação não pode ser desfeita."; "Excluir" chama `deleteMember`, que ainda pode devolver bloqueio (mostra o modal de bloqueio).
- [ ] **Step 3:** Roteiro manual: excluir um membro em 2 ministérios e 1 célula mostra as 3 linhas com papéis e, ao confirmar, os vínculos somem e os grupos permanecem; excluir líder mostra o bloqueio sem passar pela confirmação; abrir a confirmação de um membro, em outra aba torná-lo líder de um ministério e confirmar → bloqueio, nada apagado (Review Focus 4).
- [ ] **Step 4:** tsc e lint passam. Commit: `Exclusão de membro em dois passos`.
