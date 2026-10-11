"use client";

import { useState } from "react";
import {
  updateEscritorioNome,
  updateEscritorioPlano,
  deleteEscritorio,
  toggleUserAtivo,
  deleteUser,
} from "@/lib/actions/admin";
import { formatDate, formatDateBR } from "@/lib/format";
import AdicionarUsuarioForm from "./adicionar-usuario-form";
import ResetSenhaButton from "./reset-senha-button";
import {
  Avatar,
  PlanoTag,
  StatusBadge,
  PLANO_LABEL,
  STATUS_LABEL,
} from "./ui";
import {
  Pencil,
  Check,
  X,
  Trash2,
  SlidersHorizontal,
  CalendarDays,
  Users2,
  Clock,
} from "lucide-react";

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
};

type Escritorio = {
  id: string;
  nome: string;
  ativo: boolean;
  plano: string;
  status: string;
  trialExpira: string | null;
  trialExpirado: boolean;
  createdAt: string;
  users: Usuario[];
};

const PLANOS = ["TRIAL", "BASICO", "PRO"];
const STATUSES = ["TRIAL", "ATIVO", "SUSPENSO"];

const ICON_BTN =
  "h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-100 hover:text-gray-700 transition-colors";
const CAMPO =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]";

export default function EscritorioCard({
  escritorio,
}: {
  escritorio: Escritorio;
}) {
  const [editando, setEditando] = useState(false);
  const [planoOpen, setPlanoOpen] = useState(false);
  const bloqueado =
    !escritorio.ativo ||
    escritorio.status === "SUSPENSO" ||
    escritorio.trialExpirado;
  const trialInput = escritorio.trialExpira
    ? escritorio.trialExpira.slice(0, 10)
    : "";

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm ${
        bloqueado ? "border-red-200" : "border-slate-200/80"
      }`}
    >
      <div
        className={`px-5 py-4 rounded-t-2xl flex items-center justify-between gap-4 flex-wrap ${
          bloqueado ? "bg-red-50/40" : ""
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar nome={escritorio.nome} size="lg" />
          <div className="min-w-0">
            {editando ? (
              <form
                action={async (formData) => {
                  await updateEscritorioNome(formData);
                  setEditando(false);
                }}
                className="flex items-center gap-1.5"
              >
                <input type="hidden" name="id" value={escritorio.id} />
                <input
                  name="nome"
                  defaultValue={escritorio.nome}
                  autoFocus
                  className={`${CAMPO} font-medium`}
                />
                <button
                  type="submit"
                  title="Salvar"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                >
                  <Check size={15} />
                </button>
                <button
                  type="button"
                  title="Cancelar"
                  onClick={() => setEditando(false)}
                  className={ICON_BTN}
                >
                  <X size={15} />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">
                  {escritorio.nome}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  title="Editar nome"
                  className="h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-slate-100 hover:text-gray-700 shrink-0"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
            <div className="mt-1 flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} /> Desde{" "}
                {formatDateBR(escritorio.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users2 size={12} /> {escritorio.users.length} usuário(s)
              </span>
              {escritorio.status === "TRIAL" && escritorio.trialExpira && (
                <span
                  className={`inline-flex items-center gap-1 ${
                    escritorio.trialExpirado ? "text-red-600" : ""
                  }`}
                >
                  <Clock size={12} />
                  {escritorio.trialExpirado ? "Trial expirou em" : "Trial até"}{" "}
                  {formatDate(escritorio.trialExpira)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PlanoTag plano={escritorio.plano} />
          <StatusBadge
            status={escritorio.status}
            ativo={escritorio.ativo}
            expirado={escritorio.trialExpirado}
          />
          <div className="h-5 w-px bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => setPlanoOpen((v) => !v)}
            title="Plano e status"
            className={`${ICON_BTN} ${
              planoOpen ? "bg-slate-100 text-gray-700" : ""
            }`}
          >
            <SlidersHorizontal size={15} />
          </button>
          <form
            action={deleteEscritorio}
            onSubmit={(e) => {
              if (
                !confirm(
                  `Excluir "${escritorio.nome}"? Todos os processos, clientes, documentos e usuários deste escritório serão apagados. Esta ação não pode ser desfeita.`
                )
              )
                e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={escritorio.id} />
            <button
              type="submit"
              title="Excluir escritório e todos os dados"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </form>
        </div>
      </div>

      {planoOpen && (
        <form
          action={async (formData) => {
            await updateEscritorioPlano(formData);
            setPlanoOpen(false);
          }}
          className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="id" value={escritorio.id} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Plano
            </label>
            <select name="plano" defaultValue={escritorio.plano} className={CAMPO}>
              {PLANOS.map((p) => (
                <option key={p} value={p}>
                  {PLANO_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={escritorio.status}
              className={CAMPO}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Trial expira em
            </label>
            <input
              type="date"
              name="trialExpira"
              defaultValue={trialInput}
              className={CAMPO}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-1.5 shadow-sm"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setPlanoOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-slate-200/60"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {escritorio.users.map((u) => (
          <li
            key={u.id}
            className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60"
          >
            <Avatar nome={u.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium truncate ${
                  u.ativo ? "text-gray-900" : "text-gray-400 line-through"
                }`}
              >
                {u.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{u.email}</p>
            </div>
            <form action={toggleUserAtivo}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="ativo" value={String(u.ativo)} />
              <button
                type="submit"
                title={u.ativo ? "Desativar acesso" : "Reativar acesso"}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ring-1 ring-inset transition-colors ${
                  u.ativo
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100"
                    : "bg-slate-100 text-gray-500 ring-slate-300 hover:bg-slate-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    u.ativo ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
                {u.ativo ? "Ativo" : "Inativo"}
              </button>
            </form>
            <ResetSenhaButton userId={u.id} />
            <form
              action={deleteUser}
              onSubmit={(e) => {
                if (!confirm(`Excluir o usuário ${u.name} (${u.email})?`))
                  e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={u.id} />
              <button
                type="submit"
                title="Excluir usuário"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
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

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
        <AdicionarUsuarioForm escritorioId={escritorio.id} />
      </div>
    </div>
  );
}
