"use client";

import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";

export default function CredenciaisGeradas({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const [copied, setCopied] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(`E-mail: ${email}\nSenha: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
      <p className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
        <KeyRound size={13} /> Credenciais geradas — copie agora, não serão
        mostradas de novo
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-mono text-emerald-900">
          {email} / {password}
        </div>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 shrink-0"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
