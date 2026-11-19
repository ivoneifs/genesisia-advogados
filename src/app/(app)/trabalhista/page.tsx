import Link from "next/link";
import { Clock, FileSignature, Gavel, Scale } from "lucide-react";
import { exigirModulo } from "@/lib/modulos-server";
import { ativo } from "@/lib/modulos";
import { CALCULADORAS_TRAB, SECOES_TRAB, funcoesDaCalculadoraTrab } from "@/lib/trab/calc/catalogo";
import CatalogoCalculadoras from "@/components/calc/catalogo-calculadoras";
import ListaCalculos, { type FiltrosCalculo } from "@/components/calc/lista-calculos";

export const metadata = { title: "Cálculos trabalhistas" };

function nomeTipoTrab(tipo: string) {
  return CALCULADORAS_TRAB.find((c) => c.id === tipo)?.nome ?? tipo;
}

export default async function TrabalhistaPage({ searchParams }: { searchParams: Promise<FiltrosCalculo> }) {
  const session = await exigirModulo("trabalhista");
  const filtros = await searchParams;
  const pode = (f: string) => ativo(session.desativados, f);
  const itens = CALCULADORAS_TRAB.filter((c) => funcoesDaCalculadoraTrab(c).every(pode)).map(({ id, secao, nome, fundamento, modo, aba }) => ({ id, secao, nome, fundamento, modo, aba }));
  const atalhos = [
    { href: "/trabalhista/ferramentas/rescisao-completa", titulo: "Rescisão completa", texto: "TRCT com aviso proporcional, férias, 13º, FGTS e multas", icone: FileSignature, ok: pode("trabalhista.rescisao") },
    { href: "/trabalhista/ferramentas/he-50", titulo: "Horas extras e reflexos", texto: "DSR, férias, 13º, FGTS e OJ 394", icone: Clock, ok: pode("trabalhista.horas") },
    { href: "/trabalhista/ferramentas/liquidacao", titulo: "Liquidação de sentença", texto: "ADC 58, Lei 14.905, INSS, IRRF, honorários e custas", icone: Gavel, ok: pode("trabalhista.liquidacao") },
    { href: "/trabalhista/ferramentas/insalubridade-x-periculosidade", titulo: "Adicionais", texto: "Insalubridade, periculosidade e diferenças", icone: Scale, ok: pode("trabalhista.adicionais") },
  ].filter((a) => a.ok);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Cálculos trabalhistas</h1>
        <p className="text-sm text-gray-500 mt-1">Rescisões, jornada, adicionais, FGTS, estabilidades, danos e liquidação de sentença com índices oficiais do Banco Central e relatórios para o cliente.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {atalhos.map(({ href, titulo, texto, icone: Icone }) => (
          <Link key={href} href={href} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[var(--brand)] hover:shadow-sm transition">
            <div className="h-9 w-9 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center"><Icone size={18} /></div>
            <p className="mt-2 text-sm font-semibold text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-500 mt-0.5">{texto}</p>
          </Link>
        ))}
      </div>
      <ListaCalculos area="TRABALHISTA" escritorioId={session.escritorioId!} rotaBase="/trabalhista" filtros={filtros} nomeTipo={nomeTipoTrab} urlCalculo={(c) => `/trabalhista/ferramentas/${c.tipo}?calc=${c.id}`} />
      <CatalogoCalculadoras itens={itens} secoes={SECOES_TRAB} rotaBase="/trabalhista" motorBase="/trabalhista" />
    </div>
  );
}
