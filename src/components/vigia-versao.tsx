"use client";

import { useEffect } from "react";
import { recarregarSeHouverNovaVersao } from "@/lib/nova-versao";

/** Erros não tratados após um deploy (ex.: formulário de versão antiga) → recarrega. */
export default function VigiaVersao() {
  useEffect(() => {
    const aoErro = () => {
      void recarregarSeHouverNovaVersao();
    };
    window.addEventListener("unhandledrejection", aoErro);
    window.addEventListener("error", aoErro);
    return () => {
      window.removeEventListener("unhandledrejection", aoErro);
      window.removeEventListener("error", aoErro);
    };
  }, []);
  return null;
}
