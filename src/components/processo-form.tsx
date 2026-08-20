import Link from "next/link";
import type { Cliente, Processo } from "@prisma/client";

export default function ProcessoForm({
  processo,
  clientes,
  action,
  cancelHref,
}: {
  processo?: Processo | null;
  clientes: Cliente[];
  action: (formData: FormData) => void;
  cancelHref: string;
}) {
  return (
    <form action={action} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número do processo
          </label>
          <input
            name="numero"
            defaultValue={processo?.numero}
            required
            placeholder="0000000-00.0000.0.00.0000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <select
            name="clienteId"
            defaultValue={processo?.clienteId ?? ""}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <option value="" disabled>
              Selecione um cliente
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Área
          </label>
          <input
            name="area"
            defaultValue={processo?.area ?? ""}
            placeholder="Cível, Trabalhista, Família..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            defaultValue={processo?.status ?? "ATIVO"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <option value="ATIVO">Ativo</option>
            <option value="ARQUIVADO">Arquivado</option>
            <option value="ENCERRADO">Encerrado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tribunal
          </label>
          <input
            name="tribunal"
            defaultValue={processo?.tribunal ?? ""}
            placeholder="TJSP, TRT2..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vara
          </label>
          <input
            name="vara"
            defaultValue={processo?.vara ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parte contrária
          </label>
          <input
            name="parteContraria"
            defaultValue={processo?.parteContraria ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valor da causa (R$)
          </label>
          <input
            name="valorCausa"
            defaultValue={processo?.valorCausa ?? ""}
            placeholder="0,00"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição / observações
          </label>
          <textarea
            name="descricao"
            defaultValue={processo?.descricao ?? ""}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          {processo ? "Salvar alterações" : "Cadastrar processo"}
        </button>
        <Link
          href={cancelHref}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2.5"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
