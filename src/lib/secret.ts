// Segredo único usado para assinar/verificar o cookie de sessão (JWT).
// Em produção (runtime), é OBRIGATÓRIO definir SESSION_SECRET (string longa e
// aleatória). Sem isso, qualquer um poderia forjar uma sessão.
//
// Importante: NÃO falhamos durante `next build` (fase sem env), apenas quando
// o servidor realmente sobe em produção — assim o build do Docker não quebra.

const raw = process.env.SESSION_SECRET;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (process.env.NODE_ENV === "production" && !isBuildPhase) {
  if (!raw || raw.length < 32) {
    throw new Error(
      "SESSION_SECRET ausente ou fraca em produção. Defina SESSION_SECRET com 32+ caracteres aleatórios (ex.: openssl rand -base64 48)."
    );
  }
}

export const sessionSecret = new TextEncoder().encode(
  raw ?? "fallback-dev-secret-only-for-local-development"
);
