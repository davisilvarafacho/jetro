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

## Futuro

- Contador denormalizado de presenças por aula, se a contagem ficar lenta.
- Presença com horário de chegada ou justificativa de falta.
