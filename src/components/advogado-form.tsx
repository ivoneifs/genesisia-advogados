import Link from "next/link";
import type { Advogado } from "@prisma/client";
import { UFS } from "@/lib/djen";

const campo =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

export default function AdvogadoForm({
  advogado,
  inicial,
  action,
}: {
  advogado?: Advogado | null;
  inicial?: { nome?: string; oab?: string; uf?: string };
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo
          </label>
          <input
            name="nome"
            required
            defaultValue={advogado?.nome ?? inicial?.nome}
            className={campo}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nº de inscrição na OAB
          </label>
          <input
            name="oab"
            required
            inputMode="numeric"
            defaultValue={advogado?.oab ?? inicial?.oab}
            placeholder="123456"
            className={campo}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            UF
          </label>
          <select
            name="uf"
            required
            defaultValue={advogado?.uf ?? inicial?.uf ?? ""}
            className={campo}
          >
            <option value="" disabled>
              UF
            </option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF
          </label>
          <input name="cpf" defaultValue={advogado?.cpf ?? ""} className={campo} />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail
          </label>
          <input
            type="email"
            name="email"
            defaultValue={advogado?.email ?? ""}
            className={campo}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone / WhatsApp
          </label>
          <input
            name="telefone"
            defaultValue={advogado?.telefone ?? ""}
            className={campo}
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Endereço profissional
          </label>
          <input
            name="endereco"
            defaultValue={advogado?.endereco ?? ""}
            placeholder="Rua, nº, sala, bairro, cidade/UF, CEP"
            className={campo}
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={advogado?.observacoes ?? ""}
            placeholder="Áreas de atuação, especialidades..."
            className={campo}
          />
        </div>

        {advogado && (
          <label className="sm:col-span-4 inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="ativo" defaultChecked={advogado.ativo} />
            Advogado(a) ativo(a) no escritório
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-5 py-2.5 transition-colors"
        >
          {advogado ? "Salvar alterações" : "Cadastrar advogado(a)"}
        </button>
        <Link
          href="/advogados"
          className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium px-5 py-2.5 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
