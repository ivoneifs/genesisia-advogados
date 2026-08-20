# Genesis IA

Sistema de gestão jurídica para escritórios de advocacia — processos, prazos,
clientes, agenda e financeiro em um só lugar.

Inspirado em ferramentas como o Astrea, construído com Next.js, Prisma e
SQLite.

## Módulos

- **Dashboard** — visão geral com prazos e tarefas próximas, processos
  recentes e valores a receber.
- **Processos** — cadastro de processos judiciais vinculados a clientes, com
  prazos e status.
- **Clientes** — cadastro de pessoas físicas e jurídicas.
- **Agenda** — tarefas, audiências, reuniões e prazos pendentes.
- **Financeiro** — receitas e despesas, honorários e status de pagamento.

## Rodando localmente

```bash
npm install --ignore-scripts
npx prisma generate
npx prisma migrate dev
node prisma/seed.mjs
npm run dev
```

Acesse `http://localhost:3000` e entre com a conta de demonstração:

```
demo@genesisia.com.br / demo123
```

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite
- Autenticação própria via cookie de sessão assinado (JWT/jose)
