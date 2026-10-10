// Rate limiter simples em memória (janela deslizante por chave).
// Observação: é por instância do servidor. Para múltiplas réplicas,
// trocar por um store compartilhado (Redis). Suficiente para conter
// brute-force de login num deploy single-instance.

type Hit = { count: number; resetAt: number };

const store = new Map<string, Hit>();

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

/**
 * @param key      identificador (ex.: `login:<email>` ou `login:<ip>`)
 * @param limit    número máximo de tentativas na janela
 * @param windowMs tamanho da janela em milissegundos
 */
export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || hit.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (hit.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) };
  }

  hit.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Zera o contador de uma chave (ex.: após login bem-sucedido). */
export function rateLimitReset(key: string): void {
  store.delete(key);
}

// Limpeza preguiçosa para não vazar memória com chaves antigas.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  }, 5 * 60_000);
  // Não segurar o processo vivo por causa do timer.
  (timer as { unref?: () => void })?.unref?.();
}
