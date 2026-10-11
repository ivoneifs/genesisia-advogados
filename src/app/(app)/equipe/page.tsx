import { prisma } from "@/lib/db";
import { exigirPagina } from "@/lib/usuario";
import { PAPEL_DESCRICAO, PAPEL_LABEL, PAPEIS } from "@/lib/papeis";
import { formatarWhatsapp, normalizarWhatsapp } from "@/lib/whatsapp";
import { ConvidarMembro, AcoesMembro } from "@/components/equipe-forms";
import { MessageSquareText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const eu = await exigirPagina("gerenciar");
  const membros = await prisma.user.findMany({
    where: { escritorioId: eu.escritorioId, role: { not: "SUPERADMIN" } },
    orderBy: [{ ativo: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, ativo: true, whatsapp: true },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Equipe</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quem acessa o sistema e o que cada perfil pode fazer.
          </p>
        </div>
        <ConvidarMembro />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PAPEIS.map((p) => (
          <div key={p} className="rounded-xl border border-slate-200/80 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">{PAPEL_LABEL[p]}</p>
            <p className="text-xs text-gray-500 mt-1">{PAPEL_DESCRICAO[p]}</p>
            <p className="text-xs text-[var(--brand)] font-medium mt-2">
              {membros.filter((m) => m.role === p && m.ativo).length} pessoa(s)
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {membros.map((m) => {
            const zap = normalizarWhatsapp(m.whatsapp);
            const ini = m.name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
            return (
              <li key={m.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-semibold flex items-center justify-center">
                  {ini}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${m.ativo ? "text-gray-900" : "text-gray-400 line-through"}`}>
                    {m.name} {m.id === eu.id && <span className="text-xs font-normal text-gray-400">(você)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-3">
                    {m.email}
                    {zap && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <MessageSquareText size={11} /> {formatarWhatsapp(zap)}
                      </span>
                    )}
                  </p>
                </div>
                <AcoesMembro id={m.id} role={m.role} ativo={m.ativo} souEu={m.id === eu.id} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
