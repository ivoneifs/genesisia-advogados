"use client";

import { useState } from "react";
import { GRUPOS_PAPEIS } from "@/lib/papeis-processuais";

/** Seleção do papel do cliente no processo, com o exemplo do grupo escolhido. */
export default function SelectPapel({ name = "papelCliente", defaultValue, className }: { name?: string; defaultValue?: string | null; className?: string }) {
  const [valor, setValor] = useState(defaultValue ?? "");
  const grupo = GRUPOS_PAPEIS.find((g) => g.papeis.includes(valor));
  return (
    <div>
      <select name={name} value={valor} onChange={(e) => setValor(e.target.value)} className={className}>
        <option value="">— não informado —</option>
        {GRUPOS_PAPEIS.map((g) => (
          <optgroup key={g.grupo} label={g.grupo}>
            {g.papeis.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="text-[11px] text-gray-500 mt-1">
        {grupo ? `${grupo.grupo}. ${grupo.exemplo}` : "Posição do cliente no processo (ex.: Autor, Réu, Reclamante, Paciente). Ajuda nos filtros e faz a IA escrever do lado certo."}
      </p>
    </div>
  );
}
