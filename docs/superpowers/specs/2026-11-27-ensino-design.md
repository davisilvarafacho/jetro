# Módulo de ensino: cursos, inscritos, aulas e presença (design curto)

Complementa `2026-11-16-jetro-mvp-design.md`. Trabalho feito direto na `main`, sem worktree, por
decisão do usuário, para deixar o histórico registrado. Aprovado na conversa de 2026-11-27,
incluindo `courseId` e `date` na aula e a presença só de quem veio (falta = sem linha).

## Intenção

A igreja dá cursos. Cada curso tem inscritos (membros), e cada aula tem um professor (membro) e uma
lista de quem esteve presente. Quem esteve presente não precisa estar inscrito no curso. O volume de
presença é o que mais cresce, então ela é modelada desde já para escala.

## Objetivos

- Cadastro de curso (só `name`).
- Inscrição: curso + membro.
- Cadastro de aula: `name`, professor (membro).
- Presença: aula + membro. Membro não inscrito pode ter presença.
- Presença barata de gravar e de consultar nos dois sentidos (quem veio à aula, a quais aulas o
  membro veio).
- Exportar a presença de uma aula em CSV, que o Excel abre direto (pedido do usuário em
  2026-11-27).
- Linha do tempo de um inscrito no curso: as aulas a que foi e as que não foi (pedido do usuário
  em 2026-11-27).
- O aluno registra a própria presença: QR Code da aula leva a uma página pública onde ele informa o
  CPF e confirma (pedido do usuário em 2026-11-27).

## Não objetivos

- Falta explícita, justificativa, nota, certificado, turma ou edição de curso.
- Contador de frequência denormalizado (só se a medição pedir).
- Telas: este documento cobre o modelo e as regras. As telas seguem o padrão de `/ministerios`.

## Abordagens

1. **Tabela de presença própria, linha só para quem veio (escolhida).** Chave composta
   `(lessonId, memberId)`, índice em `memberId`. Escala linear em aulas × presentes e permite
   consultar nos dois sentidos com índice.
2. Lista de IDs dentro da aula (JSON). Rejeitada: sem índice nem integridade, e "aulas do membro X"
   exige varrer todas as aulas.
3. Linha por inscrito × aula com flag presente/ausente. Rejeitada: grava mais linhas, e a regra de
   que não inscrito também tem presença quebraria o modelo.

## Modelo de dados

- `Course`: `id`, `name` único, `createdAt`, `updatedAt`.
- `CourseEnrollment`: `id`, `courseId` (Cascade), `memberId` (Cascade), único em
  `(courseId, memberId)`. Mesmo formato de `MinistryMember` e `CellMember`.
- `Lesson`: `id`, `name`, `courseId` (Cascade), `teacherId` → Member (`Restrict`, como `leaderId`),
  `date`, `createdAt`, `updatedAt`. Índice em `courseId`.
- `LessonAttendance`: `lessonId` (Cascade), `memberId` (Cascade), `@@id([lessonId, memberId])`,
  `@@index([memberId])`. Sem `id` próprio e sem FK para a inscrição.
- `Member` ganha as relações inversas (inscrições, aulas como professor, presenças).

## Escolhas confirmadas

- `Lesson` pertence a um `Course` (`courseId`). Pela sua lista a aula só tinha nome e professor, mas
  sem o curso a inscrição fica desconectada da aula.
- `Lesson` tem `date`. Sem data não há como ordenar nem filtrar por período.
- Presença com chave composta em vez de `id` autoincrement, fugindo do padrão de
  `MinistryMember`/`CellMember`: é a tabela de maior volume e nada a referencia.
- Excluir membro é bloqueado se ele for professor de alguma aula (`Restrict`), na mesma linha do
  bloqueio de líder. Presenças e inscrições dele caem por `Cascade`.

## Regras

- Registrar presença não exige inscrição.
- A chamada grava só os presentes, em lote (`createMany`). Salvar a chamada de novo substitui a
  lista da aula numa transação (apaga o que saiu, insere o que entrou).
- Frequência se calcula com `count`/`groupBy`, sem carregar linhas.
- Apagar curso apaga suas aulas, inscrições e presenças (`Cascade`).

## Linha do tempo do inscrito

Na lista de inscritos do drawer do curso, cada linha tem um ícone "Ver frequência" que abre um
modal com o componente `Timeline` do Mantine (já instalado), com as aulas do curso da mais antiga
para a mais nova:

- Cada aula mostra nome, data (`DD/MM/AAAA`) e o estado: **Presente** (ícone de check, verde),
  **Faltou** (ícone X, vermelho) ou **Agendada** (relógio, neutro).
- Aula com data depois de hoje (fuso `America/Sao_Paulo`) é "Agendada", nunca falta.
- No topo: "Presente em X de Y aulas realizadas" (só conta aulas que já aconteceram).
- Conta a presença registrada na aula do curso, esteja o membro inscrito ou não.
- Uma consulta só: as aulas do curso com a presença do membro. O total de aulas de um curso é
  pequeno, então não pagina.

## Presença pelo próprio aluno (QR Code)

- Página pública `/presenca/[lessonId]`, fora do grupo `(app)` e sem login. `proxy.ts` ganha uma
  exceção para `/presenca/`.
- A página mostra aula, curso, professor e data, um campo de CPF e o botão "Confirmar presença".
- O CPF é reduzido a dígitos (`onlyDigits`). Menos de 11 dígitos: "Informe os 11 números do CPF".
- CPF sem membro cadastrado: **"Membro não cadastrado. Por favor, confira com o professor
  <nome do professor> o seu cadastro de membro."**
- Membro encontrado: grava a presença (idempotente) e mostra "Presença confirmada, <primeiro
  nome>!". Quem já estava presente vê "Sua presença já estava registrada, <primeiro nome>.". A
  página mostra só o primeiro nome, nunca o nome completo.
- Não exige inscrição no curso e não confere a data da aula.
- Na lista de aulas, cada linha ganha o botão "QR Code": um modal com o QR (biblioteca
  `qrcode.react`, dependência nova) que aponta para `<origem do site>/presenca/<id>`, com o link
  escrito embaixo, grande o bastante para projetar.
- **É uma POC e fica aberta de propósito** (decisão do usuário): sem token, sem limite de tentativas
  e sem janela de data. Quem souber o id da aula e o CPF de alguém marca a presença dele, e a
  mensagem de "não cadastrado" revela se um CPF existe. A autenticação será pensada na migração
  para Django.
- Para o celular abrir o QR, o site precisa estar num endereço que ele alcance (não `localhost`).

## Exportação da presença (CSV)

Um botão por aula, na lista de aulas, baixa o CSV da presença **já salva** (não do rascunho aberto
no drawer). Fica atrás do login, como as demais telas. O volume é limitado pelo número de membros,
então sai numa consulta só, sem paginar.

Minhas escolhas (a confirmar):

- Colunas: `Nome` (nome completo) e `Inscrito no curso` (`Sim`/`Não`). Mostra de relance quem veio
  de fora do curso, que é a exceção que o modelo permite. Sem CPF, para não espalhar dado sensível
  em planilha solta.
- Linhas ordenadas por nome, como as listas da tela.
- Formato que o Excel em português abre sem ajuste: UTF-8 com BOM (acentos), separador `;` (a
  vírgula faria o Excel pt-BR abrir tudo numa coluna), quebra de linha CRLF e aspas duplas
  quando o valor tem `;`, aspas ou quebra de linha.
- Valor que começa com `=`, `+`, `-`, `@`, tab ou CR ganha um `'` na frente, para a planilha não
  executar nome de membro como fórmula.
- Arquivo `presenca-<aula>-<AAAA-MM-DD>.csv`, com o nome da aula sem acento nem símbolo.
- Aula que não existe devolve 404.

## Futuro

- Contador denormalizado de presenças por aula, se a contagem ficar lenta.
- Presença com horário de chegada ou justificativa de falta.
- Exportar `.xlsx` de verdade, ou a presença de um curso inteiro, se o CSV não bastar.
- Autenticação da página pública de presença (token no QR, janela de data, limite de tentativas),
  na migração para Django.
- Linha do tempo também no painel do membro (`/membros/[id]`), com todos os cursos dele.
