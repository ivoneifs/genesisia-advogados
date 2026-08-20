"use client";

import { useState } from "react";
import {
  updateEscritorioNome,
  toggleEscritorioAtivo,
  deleteEscritorio,
  toggleUserAtivo,
  deleteUser,
} from "@/lib/actions/admin";
import AdicionarUsuarioForm from "./adicionar-usuario-form";
import ResetSenhaButton from "./reset-senha-button";
import {
  Pencil,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Building2,
} from "lucide-react";

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
};

export default function EscritorioCard({
  escritorio,
}: {
  escritorio: {
    id: string;
    nome: string;
    ativo: boolean;
    createdAt: Date;
    users: Usuario[];
  };
}) {
  const [editando, setEditando] = useState(false);

  return (
    <div
      className={`rounded-xl border bg-white ${
        escritorio.ativo ? "border-gray-200" : "border-red-200 bg-red-50/30"
      }`}
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={16} className="text-gray-400 shrink-0" />
          {editando ? (
            <form
              action={async (formData) => {
                await updateEscritorioNome(formData);
                setEditando(false);
              }}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="id" value={escritorio.id} />
              <input
                name="nome"
                defaultValue={escritorio.nome}
                autoFocus
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
              <button
                type="submit"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"
              >
                <Check size={14} />
              </button>
            </form>
          ) : (
            <>
              <h2 className="font-medium text-gray-900 truncate">
                {escritorio.nome}
              </h2>
              <button
                type="button"
                onClick={() => setEditando(true)}
                title="Editar título"
                className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0"
              >
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <form action={toggleEscritorioAtivo}>
            <input type="hidden" name="id" value={escritorio.id} />
            <input type="hidden" name="ativo" value={String(escritorio.ativo)} />
            <button
              type="submit"
              className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${
                escritorio.ativo
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {escritorio.ativo ? (
                <ToggleRight size={14} />
              ) : (
                <ToggleLeft size={14} />
              )}
              {escritorio.ativo ? "Ativo" : "Inativo"}
            </button>
          </form>
          <form action={deleteEscritorio}>
            <input type="hidden" name="id" value={escritorio.id} />
            <button
              type="submit"
              title="Excluir escritório e todos os dados"
              className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          </form>
        </div>
      </div>

      <ul className="divide-y divide-gray-100">
        {escritorio.users.map((u) => (
          <li key={u.id} className="px-5 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {u.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{u.email}</p>
            </div>
            <ResetSenhaButton userId={u.id} />
            <form action={toggleUserAtivo}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="ativo" value={String(u.ativo)} />
              <button
                type="submit"
                className={`text-xs font-medium rounded-full px-2 py-1 ${
                  u.ativo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {u.ativo ? "Ativo" : "Inativo"}
              </button>
            </form>
            <form action={deleteUser}>
              <input type="hidden" name="id" value={u.id} />
              <button
                type="submit"
                className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </form>
          </li>
        ))}
        {escritorio.users.length === 0 && (
          <li className="px-5 py-4 text-sm text-gray-400">
            Nenhum usuário neste escritório.
          </li>
        )}
      </ul>

      <div className="px-5 py-3 border-t border-gray-100">
        <AdicionarUsuarioForm escritorioId={escritorio.id} />
      </div>
    </div>
  );
}
