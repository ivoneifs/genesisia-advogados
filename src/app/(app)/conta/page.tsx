import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/usuario";
import { PAPEL_LABEL, PAPEL_DESCRICAO } from "@/lib/papeis";
import { formatarWhatsapp, normalizarWhatsapp } from "@/lib/whatsapp";
import { MeusDadosForm, SenhaForm } from "@/components/conta-forms";
import { ShieldCheck } from "lucide-react";

export default async function ContaPage() {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  const zap = normalizarWhatsapp(u.whatsapp);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Minha conta</h1>
        <p className="text-sm text-gray-500 mt-1">{u.email}</p>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5 flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
          <ShieldCheck size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Perfil: {PAPEL_LABEL[u.role] ?? u.role}</p>
          <p className="text-xs text-gray-500 mt-0.5">{PAPEL_DESCRICAO[u.role] ?? ""}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Dados pessoais</h2>
        <MeusDadosForm name={u.name} whatsapp={zap ? formatarWhatsapp(zap) : u.whatsapp ?? ""} />
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Alterar senha</h2>
        <SenhaForm />
      </section>
    </div>
  );
}
