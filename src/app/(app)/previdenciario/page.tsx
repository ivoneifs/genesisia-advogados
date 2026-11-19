import Link from "next/link";
import { Calculator, FileUp, Landmark, TrendingUp, Wallet } from "lucide-react";
import { exigirModulo } from "@/lib/modulos-server";
import { ativo } from "@/lib/modulos";
import { CALCULADORAS, SECOES, funcoesDaCalculadora } from "@/lib/prev/calc/catalogo";
import CatalogoCalculadoras from "@/components/calc/catalogo-calculadoras";
import ListaCalculos, { type FiltrosCalculo } from "@/components/calc/lista-calculos";

export const metadata = { title: "Cálculos previdenciários" };

function nomeTipoPrev(tipo: string) {
  if (tipo === "COMPLETO_RGPS") return "Análise completa (RGPS)";
  if (tipo === "COMPLETO_RPPS") return "Servidor público (RPPS)";
  return CALCULADORAS.find((c) => c.id === tipo)?.nome ?? tipo;
}

export default async function PrevidenciarioPage({ searchParams }: { searchParams: Promise<FiltrosCalculo> }) {
  const session = await exigirModulo("previdenciario");
  const filtros = await searchParams;
  const pode = (f: string) => ativo(session.desativados, f);
  const itens = CALCULADORAS.filter((c) => funcoesDaCalculadora(c).every(pode)).map(({ id, secao, nome, fundamento, modo, aba }) => ({ id, secao, nome, fundamento, modo, aba }));

  const atalhos = [
    { href: "/previdenciario/calculo/novo", titulo: "Análise completa (INSS)", texto: "CNIS, tempo, todas as regras e o melhor benefício", icone: Calculator, ok: pode("previdenciario.aposentadoria") },
    { href: "/previdenciario/calculo/novo?aba=segurado&importar=1", titulo: "Importar CNIS", texto: "PDF do Meu INSS lido automaticamente", icone: FileUp, ok: pode("previdenciario.cnis") },
    { href: "/previdenciario/calculo/novo?aba=planejamento", titulo: "Planejamento", texto: "Quando e quanto vai receber em cada regra", icone: TrendingUp, ok: pode("previdenciario.planejamento") },
    { href: "/previdenciario/calculo/novo?aba=atrasados", titulo: "Atrasados e revisão", texto: "Liquidação, valor da causa e honorários", icone: Wallet, ok: pode("previdenciario.atrasados") },
    { href: "/previdenciario/calculo/novo?regime=RPPS", titulo: "Servidor público (RPPS)", texto: "EC 41, 47 e 103, integralidade e paridade", icone: Landmark, ok: pode("previdenciario.rpps") },
  ].filter((a) => a.ok);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Cálculos previdenciários</h1>
        <p className="text-sm text-gray-500 mt-1">RGPS e RPPS com índices oficiais do Banco Central, tábuas do IBGE, regras da EC 103 e relatórios completos para o cliente.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {atalhos.map(({ href, titulo, texto, icone: Icone }) => (
          <Link key={href} href={href} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[var(--brand)] hover:shadow-sm transition">
            <div className="h-9 w-9 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center"><Icone size={18} /></div>
            <p className="mt-2 text-sm font-semibold text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-500 mt-0.5">{texto}</p>
          </Link>
        ))}
      </div>
      <ListaCalculos
        area="PREVIDENCIARIO"
        escritorioId={session.escritorioId!}
        rotaBase="/previdenciario"
        filtros={filtros}
        nomeTipo={nomeTipoPrev}
        urlCalculo={(c) => (c.tipo.startsWith("COMPLETO") ? `/previdenciario/calculo/${c.id}` : `/previdenciario/ferramentas/${c.tipo}?calc=${c.id}`)}
      />
      <CatalogoCalculadoras itens={itens} secoes={SECOES} rotaBase="/previdenciario" motorBase="/previdenciario/calculo/novo" />
    </div>
  );
}

