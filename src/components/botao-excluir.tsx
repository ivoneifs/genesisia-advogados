"use client";

import type { ButtonHTMLAttributes } from "react";

/** Botão de envio que pede confirmação antes de excluir. */
export default function BotaoExcluir({
  mensagem,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { mensagem: string }) {
  return (
    <button
      type="submit"
      title="Excluir"
      aria-label="Excluir"
      {...props}
      onClick={(e) => {
        if (!confirm(mensagem)) e.preventDefault();
      }}
    />
  );
}
