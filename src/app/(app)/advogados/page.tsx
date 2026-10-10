import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";
import { deleteAdvogado } from "@/lib/actions/advogados";
import { Plus, Pencil, Trash2, UserRound, Mail, Phone, ExternalLink } from "lucide-react";

export default async function AdvogadosPage() {
  const escritorioId = await requireEscritorioId();
  const advogados = await prisma.advogado.findMany({
    where: { escritorioId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Advogados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Advogados(as) do escritório. Os dados são usados nas peças geradas.
          </p>
        </div>
        <Link
          href="/advogados/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          <Plus size={16} /> Novo advogado(a)
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {advogados.map((a) => (
            <li key={a.id} className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50">
              <span className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <UserRound size={18} />
              </span>
              <Link href={`/advogados/${a.id}/editar`} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                  {a.nome}
                  {!a.ativo && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset bg-gray-100 text-gray-600 ring-gray-500/20">
                      Inativo
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  OAB {a.oab}/{a.uf}
                  {a.endereco && ` · ${a.endereco}`}
                </p>
                {(a.email || a.telefone) && (
                  <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {a.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={12} /> {a.email}
                      </span>
                    )}
                    {a.telefone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {a.telefone}
                      </span>
                    )}
                  </p>
                )}
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href="https://cna.oab.org.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Consultar no CNA da OAB"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <ExternalLink size={14} />
                </a>
                <Link
                  href={`/advogados/${a.id}/editar`}
                  title="Editar"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil size={14} />
                </Link>
                <form action={deleteAdvogado}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    title="Excluir"
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            </li>
          ))}
          {advogados.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-400 text-sm">
              Nenhum advogado cadastrado.{" "}
              <Link href="/advogados/novo" className="text-[var(--brand)] underline">
                Cadastrar o primeiro
              </Link>{" "}
              ou use a busca por OAB em Processos e clique em &quot;Salvar no
              cadastro&quot;.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
