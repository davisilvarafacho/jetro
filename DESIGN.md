---
version: alpha
name: JETRO Pastoral
description: Sistema visual do JETRO, app de cuidado de membros da Oitava Igreja Presbiteriana de Belo Horizonte. Extraído de prototipo-3-pastoral.html; implementado com Next.js + Mantine.
colors:
  primary: "#21594A"
  primary-hover: "#194536"
  on-primary: "#FFFFFF"
  primary-soft: "#DFEDE4"
  background: "#ECF1EA"
  surface: "#FFFFFF"
  surface-tint: "#F4F8F4"
  surface-hover: "#EAF1EB"
  row-hover: "#F8FAF8"
  pill: "#F0F5F1"
  ink: "#1A2A24"
  ink-2: "#35453F"
  muted: "#5C6C65"
  placeholder: "#8A9A92"
  line: "#DCE4DC"
  line-soft: "#EDF1ED"
  input-line: "#C5D1C8"
  input-line-hover: "#9FB1A5"
  avatar: "#D9E8DE"
  on-avatar: "#1D4A3C"
  flag: "#C9472A"
  flag-container: "#FDEBE4"
  danger: "#C42D3A"
  on-danger: "#FFFFFF"
  danger-container: "#FDECEE"
  on-danger-container: "#8E1F2B"
  login-panel: "#1D4A3D"
  on-login-panel: "#FFFFFF"
  login-panel-muted: "#A9CBBB"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 40px
    fontWeight: "600"
    lineHeight: 1.05
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 36px
    fontWeight: "600"
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: "600"
    lineHeight: 1.1
    letterSpacing: -0.02em
  verse:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: "500"
    lineHeight: 1.25
    letterSpacing: -0.01em
  brand:
    fontFamily: Bricolage Grotesque
    fontSize: 22px
    fontWeight: "700"
    letterSpacing: 0.02em
  title:
    fontFamily: Bricolage Grotesque
    fontSize: 17px
    fontWeight: "600"
    lineHeight: 1.3
  body-lg:
    fontFamily: Figtree
    fontSize: 17px
    fontWeight: "400"
    lineHeight: 1.55
  body-md:
    fontFamily: Figtree
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  name:
    fontFamily: Figtree
    fontSize: 17px
    fontWeight: "600"
    lineHeight: 1.25
  label-md:
    fontFamily: Figtree
    fontSize: 15px
    fontWeight: "600"
    lineHeight: 1.3
  label-sm:
    fontFamily: Figtree
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 1.3
  caption:
    fontFamily: Figtree
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 1.4
rounded:
  sm: 12px
  nav: 14px
  md: 16px
  lg: 22px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 56px
  shell-gap: 20px
  sidebar: 256px
  sidebar-rail: 80px
  row: 72px
  input: 48px
  button: 46px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: "{spacing.button}"
    padding: 0 22px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: "{spacing.button}"
  button-outline-hover:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: "{spacing.button}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: "{spacing.input}"
    padding: 0 12px
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    typography: "{typography.caption}"
  input-label:
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
  input-placeholder:
    textColor: "{colors.placeholder}"
  sidebar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    width: "{spacing.sidebar}"
    padding: 22px 16px 18px
  nav-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.body-md}"
    rounded: "{rounded.nav}"
    height: 48px
  nav-item-hover:
    backgroundColor: "{colors.surface-hover}"
  nav-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
  user-card:
    backgroundColor: "{colors.surface-tint}"
    rounded: 18px
    padding: "{spacing.md}"
  page-title:
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  page-subtitle:
    textColor: "{colors.muted}"
    typography: "{typography.body-lg}"
  table-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  table-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.label-sm}"
    padding: 16px 20px
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    height: "{spacing.row}"
    padding: 12px 20px
  table-row-hover:
    backgroundColor: "{colors.row-hover}"
  member-name:
    textColor: "{colors.ink}"
    typography: "{typography.name}"
  member-pill:
    backgroundColor: "{colors.pill}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 34px
  avatar:
    backgroundColor: "{colors.avatar}"
    textColor: "{colors.on-avatar}"
    rounded: "{rounded.full}"
    size: 34px
  drawer:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    width: 520px
    padding: 28px
  drawer-title:
    textColor: "{colors.ink}"
    typography: "{typography.headline-md}"
  form-group:
    backgroundColor: "{colors.surface-tint}"
    rounded: "{rounded.md}"
    padding: 20px
  modal:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    width: 540px
    padding: "{spacing.xl}"
  modal-block-icon:
    backgroundColor: "{colors.flag-container}"
    textColor: "{colors.flag}"
    rounded: "{rounded.full}"
    size: 56px
  alert-error:
    backgroundColor: "{colors.danger-container}"
    textColor: "{colors.on-danger-container}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 14px 16px
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  login-panel:
    backgroundColor: "{colors.login-panel}"
    textColor: "{colors.on-login-panel}"
    typography: "{typography.verse}"
  login-panel-cite:
    backgroundColor: "{colors.login-panel}"
    textColor: "{colors.login-panel-muted}"
    typography: "{typography.label-md}"
  login-page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
  login-title:
    textColor: "{colors.ink}"
    typography: "{typography.headline-lg}"
  brand-mark:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.brand}"
    rounded: 13px
    size: 40px
  divider:
    backgroundColor: "{colors.line}"
  divider-soft:
    backgroundColor: "{colors.line-soft}"
  input-border:
    backgroundColor: "{colors.input-line}"
  input-border-hover:
    backgroundColor: "{colors.input-line-hover}"
---

## Overview

**Pastoral.** O JETRO nasce de Êxodo 18: Jetro aconselha Moisés a designar líderes de mil, cem,
cinquenta e dez. A interface existe para mostrar a rede de cuidado — quem lidera e quem participa
de cada ministério e célula, e quem é parça de quem.

O tom é acolhedor e calmo, nunca corporativo nem kitsch religioso. Um fundo sálvia claro sustenta
painéis brancos de cantos generosos; o verde-floresta é a única cor de ação; o coral existe só
para um sinal: o **bloqueio de exclusão** (membro que ainda lidera um grupo ou é parça de alguém).
Linhas altas, avatares com iniciais e nomes em destaque fazem
a lista parecer um rol de pessoas, não uma planilha.

Público: liderança e secretaria da igreja, usando num notebook. Toda a interface em português do
Brasil, com texto simples e direto.

## Colors

- **Primary (#21594A) — verde-floresta:** botões principais, item de menu ativo, foco, filtro
  ativo, marca. Hover em `primary-hover` (#194536).
- **Background (#ECF1EA) — sálvia:** fundo de todas as telas logadas e do lado do formulário no login.
- **Surface (#FFFFFF):** menu lateral, cartão da tabela, drawer, modais, campos.
- **Surface-tint (#F4F8F4):** blocos agrupados dentro de superfícies brancas (grupo "Cuidado" no
  formulário, lista de dependentes no modal, cartão do usuário no menu).
- **Ink (#1A2A24) / Ink-2 (#35453F) / Muted (#5C6C65):** texto principal, secundário e de apoio.
- **Flag (#C9472A) — coral:** exclusivo para o ícone do modal de exclusão bloqueada
  (`flag` sobre `flag-container`). Nunca usar coral para outra coisa.
- **Danger (#C42D3A):** erros de validação, alerta de login inválido e o botão de excluir. Não
  confundir com o coral: vermelho é erro do usuário; coral é um vínculo que impede a ação.
- **Login-panel (#1D4A3D):** painel esquerdo do login, com o versículo.

## Typography

Duas famílias, ambas no Google Fonts:

- **Bricolage Grotesque** (500–700) para títulos de página (`display`, 40px), título do login
  (`headline-lg`), títulos de drawer e modal (`headline-md`), o versículo, a marca e títulos de
  grupo (`title`). Tracking negativo nos tamanhos grandes.
- **Figtree** (400–700) para todo o resto: corpo 16px, nomes de membros 17px semibold, rótulos e
  botões 15px semibold, cabeçalho da tabela 14px, mensagens de erro e descrições 13px.

CPF usa algarismos tabulares (`font-variant-numeric: tabular-nums`) e sempre aparece mascarado
`000.000.000-00`.

## Layout

- **Shell:** grade de duas colunas com 16px de margem e 20px de vão. Menu lateral flutuante de
  256px (cartão branco, `rounded.lg`, fixo ao rolar). Abaixo de 1100px o menu vira trilho de
  ícones de 80px, escondendo textos e o nome do usuário.
- **Cabeçalho da página:** título `display` + subtítulo `muted` à esquerda, ação principal
  ("Novo membro") à direita, alinhados pela base; 28px até a barra de busca/filtros.
- **Barra:** busca em pílula de 340px à direita.
- **Tabela:** dentro de um cartão branco; linhas de 72px; colunas Membro (avatar + nome + CPF),
  Parça, Lidera, Participa, ações à direita.
- **Formulários:** drawer à direita, 520px. CPF sozinho, Nome e Sobrenome lado a lado, e dois grupos
  tingidos: Cuidado (Parça) e Participação (Ministérios e Células).
- **Login:** duas colunas — painel verde com marca, árvore abstrata da rede e Êxodo 18:21;
  formulário de 392px centralizado no lado sálvia.
- Ritmo em múltiplos de 4px; espaçamentos mais usados 8, 16, 20, 24, 28.

## Elevation & Depth

Profundidade vem de **contraste tonal**, não de sombra: painéis brancos sobre fundo sálvia, com
no máximo uma linha de 1px quase invisível. Sombras reais só em camadas que flutuam sobre a
página: drawer, modal, lista do select e toast (difusas, 22–35% de opacidade, deslocadas para
baixo). O overlay usa verde-escuro translúcido (`rgba(20,38,31,.45)`), não preto.

## Shapes

Cantos grandes e macios em tudo: campos e botões de ícone 12px, itens de menu 14px, blocos
internos 16px, cartões/drawer/modal 22px. Botões, chips, busca, selos e pílulas de pessoa são
totalmente arredondados. Avatares são círculos com iniciais. Ícones em traço de 1,75px com pontas
arredondadas.

## Components

Implementação com **Mantine**; cada peça abaixo tem um componente correspondente e o tema
(`createTheme`) carrega os tokens deste arquivo: `primaryColor` com uma escala de 10 tons gerada a
partir de #21594A, `fontFamily` Figtree, `headings.fontFamily` Bricolage Grotesque, `radius`
conforme a seção Shapes, `defaultRadius: 'md'`.

- **Shell:** `AppShell` com `navbar` (256px, colapsando para 80px) e `NavLink` para Membros e
  Ministérios; cartão do usuário no rodapé com nome e botão "Sair".
- **Botões:** `Button` com `radius="xl"`; primário `filled`, secundário `default`/`outline`,
  excluir `color="red"`. `ActionIcon` `variant="subtle"` para editar/excluir na linha.
- **Campos:** `TextInput`, `PasswordInput`, `Select` com `searchable` e `clearable` para Parça
  e para o líder de ministério ou célula; `MultiSelect` com `searchable` para vincular ministérios e
  células. Todos os campos têm altura 48px (tamanho `md`, definido por componente em `theme.ts`:
  um componente novo de campo precisa entrar lá). Asterisco vermelho nos obrigatórios. Erro abaixo do
  campo, em `caption` vermelho.
- **Tabela:** `Table` dentro de `Paper`. Pessoa = `Avatar` com iniciais + nome + CPF. Parça =
  pílula com mini-avatar e nome; vazio = travessão cinza. Lidera e Participa = pílulas com o
  ícone do tipo (ministério ou célula).
- **Formulário:** `Drawer` `position="right"`, 520px, título `headline-md` e subtítulo; rodapé
  fixo com "Cancelar" e "Salvar".
- **Exclusão bloqueada:** `Modal` de 540px com ícone em círculo coral, título, a frase completa e
  um bloco tingido listando os dependentes como pílulas clicáveis (levam a trocar o vínculo).
- **Login inválido:** `Alert` vermelho acima do formulário: "Email ou senha inválidos".
- **Sucesso:** `notifications` no topo direito, borda esquerda verde.

## Do's and Don'ts

**Faça**

- Use frase neutra ao falar de uma pessoa, sempre pelo nome: "Não é possível excluir Carlos
  Mendes: Carlos Mendes é parça de Pedro Alves e líder do
  ministério Louvor. Troque esses vínculos antes de excluir." Nunca "ele"/"ela" — não há campo de
  gênero.
- Reserve o coral para o bloqueio de exclusão.
- Mantenha uma ação principal por tela, em verde-floresta.
- Escreva rótulos curtos e concretos: "Novo membro", "Salvar", "Cancelar".
- Mostre o CPF sempre mascarado e com algarismos tabulares.

**Não faça**

- Não use cruzes, pombas, vitrais ou outro imaginário religioso decorativo; o versículo no login
  basta.
- Não use sombras pesadas em cartões fixos, nem gradientes.
- Não use coral para erros.
- Não coloque a barra "Telas" do protótipo no produto — é só andaime de demonstração.
