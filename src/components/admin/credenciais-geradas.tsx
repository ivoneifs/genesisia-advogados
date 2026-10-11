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
    <div className="rounded-lg bg-emerald-50 ring-1 ring-inset ring-emerald-200 px-4 py-3 space-y-2.5">
      <p className="text-xs font-medium text-emerald-800 flex items-center gap-1.5 pr-5">
        <KeyRound size={13} /> Copie agora: a senha não será mostrada de novo
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-emerald-700/70">E-mail</dt>
        <dd className="font-mono text-emerald-950 break-all">{email}</dd>
        <dt className="text-emerald-700/70">Senha</dt>
        <dd className="font-mono text-emerald-950 break-all">{password}</dd>
      </dl>
      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center gap-1.5 rounded-md bg-white ring-1 ring-inset ring-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copiado" : "Copiar credenciais"}
      </button>
    </div>
  );
}
