import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ativo } from "@/lib/modulos";
import { marcaDoEscritorio } from "@/lib/marca";
import type { RelatorioDados } from "@/lib/relatorio";
import BotoesRelatorio from "@/components/calc/botoes-relatorio";

export const metadata = { title: "Relatório de cálculo" };

const fmtDataHora = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function RelatorioCalculo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.escritorioId) redirect("/login");
  const c = await prisma.calculo.findFirst({
    where: { id, escritorioId: session.escritorioId },
    include: { cliente: true, processo: { select: { numero: true } }, escritorio: true },
  });
  if (!c) notFound();
  if (!ativo(session.desativados, c.area === "TRABALHISTA" ? "trabalhista" : "previdenciario")) redirect("/dashboard?modulo-off=1");

  const r = (c.resumo ?? null) as RelatorioDados | null;
  const marca = marcaDoEscritorio(c.escritorio);
  const area = c.area === "TRABALHISTA" ? "Cálculo trabalhista" : "Cálculo previdenciário";

  return (
    <div className="relatorio min-h-screen bg-gray-100 print:bg-white py-6 print:py-0" style={marca.estilo}>
      <BotoesRelatorio id={c.id} titulo={c.titulo} />
      <article className="mx-auto max-w-[210mm] bg-white shadow print:shadow-none px-10 py-10 print:px-0 print:py-0 text-[12px] leading-relaxed text-gray-900">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[var(--brand)] pb-4">
          <div className="flex items-center gap-3">
            {marca.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={marca.logoUrl} alt="" className="h-14 w-14 object-contain" />
            )}
            <div>
              <p className="text-lg font-semibold">{c.escritorio.nome}</p>
              <p className="text-gray-500">{area}</p>
            </div>
          </div>
          <div className="text-right text-gray-500">
            <p>Emitido em {fmtDataHora(new Date())}</p>
            <p>Atualizado em {fmtDataHora(c.updatedAt)}</p>
            {c.criadoPor && <p>Responsável: {c.criadoPor}</p>}
          </div>
        </header>

        <section className="mt-5">
          <h1 className="text-xl font-bold text-[var(--brand)]">{r?.titulo ?? c.titulo}</h1>
          {r?.subtitulo && <p className="text-gray-600 mt-0.5">{r.subtitulo}</p>}
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-gray-50 print:bg-white print:border print:border-gray-300 p-3">
            <p><span className="text-gray-500">Cliente:</span> {c.cliente?.nome ?? "—"}</p>
            <p><span className="text-gray-500">CPF/CNPJ:</span> {c.cliente?.documento ?? "—"}</p>
            <p><span className="text-gray-500">Contato:</span> {[c.cliente?.telefone, c.cliente?.email].filter(Boolean).join(" · ") || "—"}</p>
            <p><span className="text-gray-500">Processo:</span> {c.processo?.numero ?? "—"}</p>
          </div>
        </section>

        {!r && <p className="mt-8 text-gray-500">Este cálculo ainda não tem resultado salvo. Abra o cálculo e clique em “Salvar”.</p>}

        {r?.secoes.map((s, i) => (
          <section key={i} className="mt-6 break-inside-avoid-page">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[var(--brand)] border-b border-gray-200 pb-1">{s.titulo}</h2>
            {s.linhas && s.linhas.length > 0 && (
              <table className="mt-2 w-full">
                <tbody>
                  {s.linhas.map((l, j) => (
                    <tr key={j} className={l.destaque ? "font-semibold bg-[var(--brand)]/5" : ""}>
                      <td className="py-1 pr-4 text-gray-600 w-1/2 align-top">{l.rotulo}</td>
                      <td className="py-1 align-top">{l.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {s.tabela && (
              <div className="mt-2">
                {s.tabela.titulo && <p className="font-medium mb-1">{s.tabela.titulo}</p>}
                <table className="w-full border-collapse text-[10.5px]">
                  <thead>
                    <tr>{s.tabela.colunas.map((col) => <th key={col} className="border border-gray-300 bg-gray-50 px-1.5 py-1 text-left font-semibold">{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {s.tabela.linhas.map((l, j) => (
                      <tr key={j} className="break-inside-avoid">{l.map((cel, k) => <td key={k} className="border border-gray-200 px-1.5 py-0.5">{cel}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.memoria && s.memoria.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-0.5">{s.memoria.map((m, j) => <li key={j}>{m}</li>)}</ul>
            )}
            {s.texto && <div className="mt-2 whitespace-pre-wrap text-justify">{s.texto}</div>}
          </section>
        ))}

        {c.parecer && (
          <section className="mt-6">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[var(--brand)] border-b border-gray-200 pb-1">Parecer</h2>
            <div className="mt-2 whitespace-pre-wrap text-justify">{c.parecer}</div>
          </section>
        )}

        {r?.avisos && r.avisos.length > 0 && (
          <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 print:bg-white p-3 text-[11px] text-amber-900">
            <p className="font-semibold mb-1">Observações</p>
            <ul className="list-disc pl-5">{r.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </section>
        )}

        <footer className="mt-10 border-t border-gray-200 pt-3 text-[10px] text-gray-500">
          Índices oficiais: INPC, IPCA, IPCA-E e Selic (Banco Central/SGS); tábuas de mortalidade do IBGE; salário mínimo e teto conforme portarias interministeriais.
          Cálculo de apoio à decisão profissional — confira os dados de entrada e a legislação aplicável ao caso concreto.
          <span className="block mt-2 text-center">_______________________________________<br />{c.criadoPor ?? "Responsável técnico"}</span>
        </footer>
      </article>
    </div>
  );
}
