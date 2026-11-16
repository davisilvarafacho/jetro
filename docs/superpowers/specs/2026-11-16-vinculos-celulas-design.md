# Vínculos membro↔ministério, células e visão do que cada um lidera (design curto)

Complementa `2026-11-16-jetro-mvp-design.md`. Aprovado na conversa de 2026-11-16.

## Intenção

Ministérios e células têm um líder e vários membros (membros da igreja). Cada vínculo tem um
papel: líder, sublíder ou membro. O líder entra no grupo sozinho. Quem olha a lista de membros
precisa ver, principalmente, o que cada um lidera.

## Objetivos

- Relação membro↔ministério e módulo de células (nome e líder), com a mesma forma.
- Papel em cada vínculo: `1` líder, `2` sublíder, `3` membro.
- Vínculo do líder criado e mantido automaticamente.
- Gestão dos vínculos dentro do form de cada entidade, sem módulo só de vincular.
- Ver, por membro, em quais ministérios e células ele está e o que lidera.

## Não objetivos

- Módulo de logs (ver "Futuro").
- Vinculação em lote além do seletor múltiplo (ver "Futuro").
- Campos de célula além de nome e líder.

## Abordagens

Só uma serve: tabela de vínculo própria para ministério e outra para célula, ambas com `role`.
Uma tabela polimórfica única (grupo genérico) misturaria ministério e célula e perderia as chaves
estrangeiras reais. `leaderId` continua em `Ministry` e `Cell` (já existe, protege com `Restrict`),
e o vínculo `role=1` é derivado dele.

## Modelo de dados

- `MinistryMember`: `id`, `ministryId` (Cascade), `memberId` (Cascade), `role Int @default(3)`,
  único em `(ministryId, memberId)`.
- `Cell`: `id`, `name` único, `leaderId` → Member (`Restrict`), `createdAt`, `updatedAt`.
- `CellMember`: igual a `MinistryMember`, com `cellId`.
- `Member` ganha as relações inversas. Um membro pode estar em vários ministérios e várias células.
- `role` é inteiro; valores e rótulos numa constante em `src/lib/group-roles.ts`, validado na aplicação.
- A migração faz backfill: um vínculo `role=1` para cada ministério existente.

## Regras

- **Criar grupo:** o líder ganha vínculo `role=1`.
- **Trocar líder:** o novo vira `role=1` (cria o vínculo ou promove o existente); o antigo vira
  `role=3`. Tudo na mesma transação que grava o grupo. *(Minha escolha: o antigo continua como
  membro comum. Trocar para "sai do grupo" é uma linha.)*
- `role=1` nunca é atribuído à mão; só `leaderId` o produz. O líder não pode ser removido do grupo.
- **Excluir membro, dois passos:**
  1. `getDeleteImpact(id)` só consulta: devolve o bloqueio (é líder de ministério ou célula, além
     das regras de líder e parça que já existem) ou a lista de ministérios e células de onde ele
     sairá, com o papel em cada um.
  2. O modal mostra essa lista; "Excluir" chama `deleteMember`, que confere o bloqueio de novo no
     servidor e apaga. Os vínculos caem por `Cascade`.

## Telas

- `/celulas`: clone de `/ministerios` (lista, criar, editar, excluir) e item novo no menu.
- Drawer de ministério e de célula: lista de membros com select de papel (sublíder ou membro),
  remover, e um select para adicionar. O líder aparece travado.
- Cadastro de membro: campos "Ministérios" e "Células", seletores múltiplos com busca. O que ele
  marca entra como `role=3`; sublíder já existente é mantido; líder aparece travado; desmarcar remove.
- Lista de membros: duas colunas novas. **Lidera** (destaque, ministérios e células) e **Participa**
  (sublíder marcado como tal). *(Minha escolha de onde mostrar; sem filtro novo por enquanto.)*
- Excluir célula ou ministério apaga os vínculos (`Cascade`).

## Futuro (anotado)

- **Módulo de logs:** acompanhar automaticamente essas mudanças (criação de vínculo, troca de
  líder, mudança de papel, remoção). O ponto de sincronização do líder terá um comentário apontando
  para isto.
- **Vinculação em lote:** uma forma mais prática de vincular vários membros de uma vez (colar lista,
  marcar em lote). Hoje: seletor múltiplo em cada form.

## Fica para quem implementar

Layout exato das colunas e do seletor de papéis, seguindo `DESIGN.md`; nome dos arquivos; mensagens
de erro no padrão dos forms existentes.
