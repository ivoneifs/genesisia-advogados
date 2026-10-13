import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";
import { SUPORTE_WHATSAPP } from "@/lib/contato";
import { Pencil, UserRound, Mail, Phone, ExternalLink, Lock, MessageCircle } from "lucide-react";

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
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm flex items-start gap-3 text-gray-600">
        <Lock size={16} className="shrink-0 mt-0.5" />
        <p className="flex-1">
          As OABs são cadastradas pelo administrador do Genesis IA e ficam travadas para proteger os
          dados de outros advogados: não podem ser trocadas nem usadas por outro escritório. Para
          incluir ou corrigir uma OAB, fale com o suporte.
        </p>
        <a
          href={SUPORTE_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 font-medium text-[var(--brand)] hover:underline"
        >
          <MessageCircle size={14} /> Suporte
        </a>
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
                  <Lock size={10} className="inline -mt-0.5 mr-1" />
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
              </div>
            </li>
          ))}
          {advogados.length === 0 && (
            <li className="px-5 py-10 text-center text-gray-400 text-sm">
              Nenhuma OAB cadastrada ainda. Peça ao suporte para cadastrar a OAB do escritório.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
