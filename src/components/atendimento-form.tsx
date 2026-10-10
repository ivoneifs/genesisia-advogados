import Link from "next/link";
import type { Atendimento } from "@prisma/client";
import { TIPOS_ATENDIMENTO, STATUS_ATENDIMENTO } from "@/lib/atendimentos";
import { toInputDateTimeBR } from "@/lib/format";

const campo =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

export default function AtendimentoForm({
  atendimento,
  inicial,
  clientes,
  processos,
  action,
}: {
  atendimento?: Atendimento | null;
  inicial?: { clienteId?: string; processoId?: string };
  clientes: { id: string; nome: string }[];
  processos: { id: string; numero: string; cliente: { nome: string } }[];
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assunto
          </label>
          <input
            name="titulo"
            defaultValue={atendimento?.titulo}
            required
            placeholder="Ligação, reunião, dúvida sobre andamento..."
            className={campo}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <select
            name="clienteId"
            required
            defaultValue={atendimento?.clienteId ?? inicial?.clienteId ?? ""}
            className={campo}
          >
            <option value="" disabled>
              Selecione
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {clientes.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Nenhum cliente cadastrado.{" "}
              <Link href="/clientes/novo" className="underline">
                Cadastrar cliente
              </Link>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Processo (opcional)
          </label>
          <select
            name="processoId"
            defaultValue={atendimento?.processoId ?? inicial?.processoId ?? ""}
            className={campo}
          >
            <option value="">—</option>
            {processos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.numero} · {p.cliente.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Canal
          </label>
          <select
            name="tipo"
            defaultValue={atendimento?.tipo ?? "PRESENCIAL"}
            className={campo}
          >
            {TIPOS_ATENDIMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Situação
          </label>
          <select
            name="status"
            defaultValue={atendimento?.status ?? "CONCLUIDO"}
            className={campo}
          >
            {STATUS_ATENDIMENTO.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data e hora
          </label>
          <input
            type="datetime-local"
            name="data"
            required
            defaultValue={toInputDateTimeBR(atendimento?.data ?? new Date())}
            className={campo}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detalhes
          </label>
          <textarea
            name="descricao"
            rows={6}
            defaultValue={atendimento?.descricao ?? ""}
            placeholder="O que foi tratado, orientações dadas, próximos passos..."
            className={campo}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          {atendimento ? "Salvar alterações" : "Registrar atendimento"}
        </button>
        <Link
          href="/atendimentos"
          className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium px-5 py-2.5 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
