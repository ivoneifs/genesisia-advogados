import Link from "next/link";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { CATEGORIAS_SISTEMAS, SISTEMAS, type Acesso } from "@/data/sistemas-juridicos";

export const metadata = { title: "Sistemas e portais jurídicos" };

const ROTULO_ACESSO: Record<Acesso, { texto: string; cor: string }> = {
  publico: { texto: "Público", cor: "bg-emerald-50 text-emerald-700" },
  advogado: { texto: "Advogado / certificado", cor: "bg-indigo-50 text-indigo-700" },
  restrito: { texto: "Restrito a autoridades", cor: "bg-amber-50 text-amber-800" },
  pago: { texto: "Pago", cor: "bg-gray-100 text-gray-700" },
};

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function SistemasPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; acesso?: string }> }) {
  const { q, cat, acesso } = await searchParams;
  const termo = normal(q?.trim() ?? "");
  const lista = SISTEMAS.filter((s) => (!cat || s.categoria === cat) && (!acesso || s.acesso === acesso) && (!termo || normal(`${s.nome} ${s.descricao}`).includes(termo)));
  const url = (p: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(Object.entries({ q, cat, acesso, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/pesquisa/sistemas${sp.size ? `?${sp}` : ""}`;
  };
  const chip = (ativo: boolean) => `text-xs rounded-full px-3 py-1 border ${ativo ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/pesquisa" className="text-xs text-gray-500 hover:text-[var(--brand)] flex items-center gap-1"><ArrowLeft size={12} /> Pesquisa</Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-1">Sistemas e portais jurídicos</h1>
        <p className="text-sm text-gray-500 mt-1">{SISTEMAS.length} sistemas processuais, criminais, de pesquisa patrimonial, cartórios e ferramentas da advocacia — com o tipo de acesso de cada um.</p>
      </div>
      <form className="relative max-w-xl">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        {cat && <input type="hidden" name="cat" value={cat} />}
        {acesso && <input type="hidden" name="acesso" value={acesso} />}
        <input name="q" defaultValue={q} placeholder="Buscar (ex.: SISBAJUD, protesto, certificado, execução penal)" className="w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" />
      </form>
      <div className="flex flex-wrap gap-1.5">
        <Link href={url({ cat: undefined })} className={chip(!cat)}>Todas as categorias</Link>
        {CATEGORIAS_SISTEMAS.map((c) => <Link key={c} href={url({ cat: c })} className={chip(cat === c)}>{c}</Link>)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Link href={url({ acesso: undefined })} className={chip(!acesso)}>Qualquer acesso</Link>
        {(Object.keys(ROTULO_ACESSO) as Acesso[]).map((a) => <Link key={a} href={url({ acesso: a })} className={chip(acesso === a)}>{ROTULO_ACESSO[a].texto}</Link>)}
      </div>
      {CATEGORIAS_SISTEMAS.filter((c) => lista.some((s) => s.categoria === c)).map((c) => (
        <section key={c}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{c}</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {lista.filter((s) => s.categoria === c).map((s) => (
              <div key={s.nome} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{s.nome}</p>
                  {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-[var(--brand)]" title="Abrir site oficial"><ExternalLink size={14} /></a>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{s.descricao}</p>
                <span className={`inline-block mt-1.5 text-[10px] rounded-full px-2 py-0.5 ${ROTULO_ACESSO[s.acesso].cor}`}>{ROTULO_ACESSO[s.acesso].texto}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
      {!lista.length && <p className="text-sm text-gray-500">Nenhum sistema encontrado.</p>}
      <p className="text-[11px] text-gray-400">Sistemas “restritos” (SISBAJUD, RENAJUD, INFOJUD, SNIPER, interceptações etc.) são operados por magistrados ou autoridades: o advogado requer a pesquisa ao juízo. Links levam aos sites oficiais; confira o endereço do seu tribunal.</p>
    </div>
  );
}
