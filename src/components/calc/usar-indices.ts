"use client";

import { useEffect, useState } from "react";
import type { Indices } from "@/lib/prev/indices";

let cache: Promise<{ indices: Indices; atualizadoEm: Record<string, string> }> | null = null;

/** Índices do Banco Central (INPC, IPCA, IPCA-E, Selic), carregados uma vez por sessão. */
export function useIndices() {
  const [estado, setEstado] = useState<{ indices: Indices; atualizadoEm: Record<string, string>; carregando: boolean; erro: string | null }>({
    indices: {},
    atualizadoEm: {},
    carregando: true,
    erro: null,
  });
  useEffect(() => {
    cache ??= fetch("/api/prev/indices").then(async (r) => {
      if (!r.ok) throw new Error("Não foi possível carregar os índices.");
      return r.json();
    });
    let vivo = true;
    cache
      .then((d) => vivo && setEstado({ ...d, carregando: false, erro: null }))
      .catch((e) => {
        cache = null;
        if (vivo) setEstado((s) => ({ ...s, carregando: false, erro: e.message }));
      });
    return () => {
      vivo = false;
    };
  }, []);
  return estado;
}
