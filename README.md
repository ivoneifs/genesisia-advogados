# Genesis IA

Sistema de gestão jurídica para escritórios de advocacia — processos, prazos,
clientes, agenda, financeiro e um assistente de IA em um só lugar.

Inspirado em ferramentas como o Astrea, construído com Next.js, Prisma e
Postgres (Supabase).

## Módulos

- **Área de trabalho** — visão geral com prazos e tarefas próximas, processos
  recentes e valores a receber.
- **Assistente IA** — chat com acesso real aos dados do escritório (processos,
  prazos, clientes, financeiro) e ajuda para redigir minutas.
- **Gestão kanban** — processos organizados por status.
- **Agenda** — tarefas, audiências, reuniões e prazos pendentes.
- **Workflows** — automações reais (ex: prazo de alta prioridade cria tarefa
  de preparação automaticamente).
- **Contatos** — parceiros, peritos, correspondentes e partes contrárias.
- **Atendimentos** — histórico de interações com clientes.
- **Processos e casos** — cadastro de processos judiciais vinculados a
  clientes, com prazos e status.
- **Clientes** — cadastro de pessoas físicas e jurídicas.
- **Publicações** — inbox de publicações, com vínculo a processos.
- **Financeiro** — receitas e despesas, honorários e status de pagamento.
- **Criação de peças** — modelos de minutas com preenchimento automático.
- **Documentos** — upload de arquivos vinculados a processos/clientes.
- **Indicadores** — gráficos de processos, prazos e financeiro.
- **Alertas** — central de pendências urgentes.

## Rodando localmente

```bash
npm install --ignore-scripts
npx prisma generate
npx prisma migrate dev
node prisma/seed.mjs
npm run dev
```

Configure o `.env` (veja `.env.example`) com:

- `DATABASE_URL` — connection string do Postgres (Supabase)
- `SESSION_SECRET` — string aleatória para assinar a sessão
- `OPENAI_API_KEY` / `OPENAI_MODEL` — para o Assistente IA funcionar

Acesse `http://localhost:3000` e entre com a conta de demonstração:

```
demo@genesisia.com.br / demo123
```

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + Postgres (Supabase)
- OpenAI (function calling) para o Assistente IA
- Autenticação própria via cookie de sessão assinado (JWT/jose)
