import Link from "next/link";
import type { Contato } from "@prisma/client";

const TIPOS = [
  { value: "ADVOGADO", label: "Advogado(a) parceiro(a)" },
  { value: "PERITO", label: "Perito" },
  { value: "CORRESPONDENTE", label: "Correspondente" },
  { value: "PARTE_CONTRARIA", label: "Parte contrária" },
  { value: "OUTRO", label: "Outro" },
];

export default function ContatoForm({
  contato,
  action,
}: {
  contato?: Contato | null;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <input
            name="nome"
            defaultValue={contato?.nome}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            name="tipo"
            defaultValue={contato?.tipo ?? "OUTRO"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Empresa/Escritório
          </label>
          <input
            name="empresa"
            defaultValue={contato?.empresa ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail
          </label>
          <input
            type="email"
            name="email"
            defaultValue={contato?.email ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            name="telefone"
            defaultValue={contato?.telefone ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            name="observacoes"
            defaultValue={contato?.observacoes ?? ""}
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
          {contato ? "Salvar alterações" : "Cadastrar contato"}
        </button>
        <Link
          href="/contatos"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2.5"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
