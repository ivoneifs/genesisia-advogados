"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, Bot, Calculator, Check, ChevronDown, ChevronRight, Copy, FileDown, FileText, FileUp,
  Landmark, Loader2, Plus, Save, Send, Sparkles, Trash2, TrendingUp, UserRound, Wallet, Clock, ListOrdered, Scale,
} from "lucide-react";
import { salvarCalculo, type ClienteOpcao } from "@/lib/actions/calculos";
import { relatorioComoTexto, type RelatorioDados, type SecaoRelatorio } from "@/lib/relatorio";
import { EC103, competencia, deBR, fmtAMD, fmtComp, fmtData, idadeEm, somaComp, valida } from "@/lib/prev/datas";
import { calcularMedia } from "@/lib/prev/media";
import { cnisParaCalculo, type ResultadoCnis } from "@/lib/prev/cnis";
import { analisarRgps, melhorRegra, type ResultadoRegra } from "@/lib/prev/rgps";
import { analisarRpps } from "@/lib/prev/rpps";
import { planejar, pontoEquilibrio, type ItemPlanejamento } from "@/lib/prev/planejamento";
import { calcularAtrasados, type ResultadoAtrasados } from "@/lib/prev/atrasados";
import { montarLinha, resumoPeriodo, tempoEm, type Periodo, type TipoPeriodo } from "@/lib/prev/tempo";
import { salarioMinimo, teto } from "@/lib/prev/tabelas";
import { baixarDocx } from "@/lib/exportar-docx";
import { ativo } from "@/lib/modulos";
import ClienteSelect from "@/components/calc/cliente-select";
import { useIndices } from "@/components/calc/usar-indices";
import { dadosIniciais, ROTULO_TIPO, type DadosCompleto } from "./tipos-calculo";

const INPUT = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";
const INPUT_SM = "w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--brand)]";
const brl = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const numBR = (s: string) => Number(String(s).replace(/\./g, "").replace(",", ".")) || 0;

type Aba = "segurado" | "tempo" | "salarios" | "regras" | "planejamento" | "atrasados" | "ia";

export type CalculoCompletoSalvo = {
  id: string;
  titulo: string;
  dados: DadosCompleto;
  parecer: string | null;
  cliente: ClienteOpcao | null;
};

function Campo({ rotulo, children, className = "" }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{rotulo}</label>
      {children}
    </div>
  );
}

export default function CalculoCompleto({
  salvo,
  regimeInicial,
  abaInicial,
  desativados,
}: {
  salvo: CalculoCompletoSalvo | null;
  regimeInicial: "RGPS" | "RPPS";
  abaInicial?: string;
  desativados: string[];
}) {
  const router = useRouter();
  const { indices, carregando: carregandoIndices, atualizadoEm } = useIndices();
  const [dados, setDados] = useState<DadosCompleto>(() => ({ ...dadosIniciais(regimeInicial), ...(salvo?.dados ?? {}) }));
  const [titulo, setTitulo] = useState(salvo?.titulo ?? (regimeInicial === "RPPS" ? "Cálculo de servidor (RPPS)" : "Análise previdenciária completa"));
  const [cliente, setCliente] = useState<ClienteOpcao | null>(salvo?.cliente ?? null);
  const [id, setId] = useState<string | null>(salvo?.id ?? null);
  const abasValidas: Aba[] = ["segurado", "tempo", "salarios", "regras", "planejamento", "atrasados", "ia"];
  const mapaAba: Record<string, Aba> = { rpps: "regras", revisao: "atrasados" };
  const [aba, setAba] = useState<Aba>(() => {
    const a = (abaInicial && (mapaAba[abaInicial] ?? abaInicial)) as Aba;
    return abasValidas.includes(a) ? a : "segurado";
  });
  const [parecer, setParecer] = useState(salvo?.parecer ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const pode = (f: string) => ativo(desativados, f);
  const set = <K extends keyof DadosCompleto>(k: K, v: DadosCompleto[K]) => setDados((d) => ({ ...d, [k]: v }));
  const seg = dados.segurado;
  const pronto = valida(seg.nascimento) && valida(seg.der);

  // ---- Cálculos ----
  const linha = useMemo(() => montarLinha(dados.periodos, seg.sexo, seg.der), [dados.periodos, seg.sexo, seg.der]);
  const tempoDer = useMemo(() => tempoEm(linha, seg.der || "2100-01-01"), [linha, seg.der]);
  const tempo103 = useMemo(() => tempoEm(linha, EC103), [linha]);

  const regras: ResultadoRegra[] = useMemo(() => {
    if (!pronto) return [];
    if (dados.regime === "RPPS") {
      return analisarRpps({
        servidor: { nome: seg.nome, sexo: seg.sexo, nascimento: seg.nascimento, der: seg.der, ingressoServicoPublico: dados.servidor.ingressoServicoPublico || null, remuneracaoCargo: dados.servidor.remuneracaoCargo, rpc: dados.servidor.rpc },
        linha,
        salarios: dados.salarios,
        indices,
      });
    }
    return analisarRgps({ segurado: { nome: seg.nome, sexo: seg.sexo, nascimento: seg.nascimento, der: seg.der, pcdGrau: seg.pcdGrau || null }, linha, salarios: dados.salarios, indices });
  }, [pronto, dados.regime, dados.servidor, dados.salarios, seg, linha, indices]);
  const melhor = useMemo(() => melhorRegra(regras), [regras]);

  const salarioProjetado = useMemo(() => {
    const p = dados.projecao;
    const comp = competencia(seg.der || "2026-01-01");
    if (p.cenario === "minimo") return salarioMinimo(comp);
    if (p.cenario === "teto") return teto(comp);
    if (p.cenario === "personalizado") return p.salario;
    const ultimos = [...dados.salarios].sort((a, b) => (a.comp < b.comp ? 1 : -1));
    return ultimos[0]?.valor ?? salarioMinimo(comp);
  }, [dados.projecao, dados.salarios, seg.der]);

  const plano: ItemPlanejamento[] = useMemo(() => {
    if (aba !== "planejamento" && aba !== "ia" || !pronto || dados.regime !== "RGPS") return [];
    return planejar({ segurado: { nome: seg.nome, sexo: seg.sexo, nascimento: seg.nascimento, der: seg.der, pcdGrau: seg.pcdGrau || null }, linha, salarios: dados.salarios, indices }, dados.periodos, { salario: salarioProjetado, tipo: dados.projecao.tipo, professor: dados.projecao.professor });
  }, [aba, pronto, dados.regime, dados.periodos, dados.salarios, dados.projecao, seg, linha, indices, salarioProjetado]);

  const regraAtrasados = regras.find((r) => r.id === dados.atrasados.regraId) ?? melhor;
  const rmiDevida = dados.atrasados.rmiManual || regraAtrasados?.rmiNaDer || 0;
  const atrasados: ResultadoAtrasados | null = useMemo(() => {
    const a = dados.atrasados;
    if (aba !== "atrasados" && aba !== "ia") return null;
    if (!valida(a.dib) || !valida(a.fim) || !rmiDevida || a.fim < a.dib) return null;
    return calcularAtrasados({ ...a, rmiDevida, citacao: a.citacao || null, ajuizamento: a.ajuizamento || null, sentenca: a.sentenca || null, dibPaga: a.dibPaga || undefined }, indices);
  }, [aba, dados.atrasados, rmiDevida, indices]);

  // ---- Relatório ----
  function montarRelatorio(): RelatorioDados {
    const secoes: SecaoRelatorio[] = [];
    secoes.push({
      titulo: "Dados do segurado",
      linhas: [
        { rotulo: "Nome", valor: seg.nome || cliente?.nome || "—" },
        { rotulo: "CPF", valor: seg.cpf || "—" },
        { rotulo: "Sexo", valor: seg.sexo === "M" ? "Masculino" : "Feminino" },
        { rotulo: "Nascimento", valor: `${fmtData(seg.nascimento)}${pronto ? ` (${idadeEm(seg.nascimento, seg.der).toFixed(1).replace(".", ",")} anos na DER)` : ""}` },
        { rotulo: "DER / data do cálculo", valor: fmtData(seg.der) },
        { rotulo: "Regime", valor: dados.regime === "RPPS" ? "Regime próprio (servidor federal)" : "Regime geral (INSS)" },
        ...(seg.pcdGrau ? [{ rotulo: "Deficiência", valor: seg.pcdGrau }] : []),
        ...(dados.regime === "RPPS" ? [
          { rotulo: "Ingresso no serviço público", valor: fmtData(dados.servidor.ingressoServicoPublico || linha.ingressoServicoPublico) },
          { rotulo: "Remuneração do cargo", valor: brl(dados.servidor.remuneracaoCargo) },
          { rotulo: "Previdência complementar (teto RGPS)", valor: dados.servidor.rpc ? "Sim" : "Não" },
        ] : []),
      ],
    });
    secoes.push({
      titulo: "Tempo de contribuição",
      linhas: [
        { rotulo: "Tempo total na DER", valor: fmtAMD(tempoDer.diasConvertidos), destaque: true },
        { rotulo: "Tempo em 13/11/2019", valor: fmtAMD(tempo103.diasConvertidos) },
        { rotulo: "Carência", valor: `${tempoDer.carencia} contribuições` },
        { rotulo: "Tempo especial (15/20/25)", valor: `${fmtAMD(tempoDer.especial[15])} / ${fmtAMD(tempoDer.especial[20])} / ${fmtAMD(tempoDer.especial[25])}` },
        ...(tempoDer.diasProfessor ? [{ rotulo: "Magistério", valor: fmtAMD(tempoDer.diasProfessor) }] : []),
        ...(dados.regime === "RPPS" ? [{ rotulo: "Serviço público / carreira / cargo", valor: `${fmtAMD(tempoDer.diasServicoPublico)} / ${fmtAMD(tempoDer.diasCarreira)} / ${fmtAMD(tempoDer.diasCargo)}` }] : []),
      ],
      tabela: {
        colunas: ["Período", "Descrição", "Tipo", "Tempo", "Convertido"],
        linhas: dados.periodos.map((p) => {
          const r = resumoPeriodo(p, seg.sexo);
          return [`${fmtData(p.inicio)} a ${fmtData(p.fim)}`, p.descricao ?? "", `${ROTULO_TIPO[p.tipo]}${p.professor ? " · magistério" : ""}${p.carencia === false ? " · sem carência" : ""}`, fmtAMD(r.dias), fmtAMD(r.convertido)];
        }),
      },
    });
    secoes.push({
      titulo: "Análise das regras",
      linhas: melhor ? [{ rotulo: "Melhor benefício na DER", valor: `${melhor.nome} — ${brl(melhor.rmiNaDer)}`, destaque: true }] : [{ rotulo: "Melhor benefício na DER", valor: "Nenhuma regra cumprida na DER" }],
      tabela: {
        colunas: ["Regra", "Fundamento", "Situação", "Coeficiente", "Renda"],
        linhas: regras.filter((r) => r.aplicavel).map((r) => [r.nome, r.fundamento, r.cumpre ? "Cumpre" : `Não cumpre (${r.requisitos.filter((q) => !q.ok).map((q) => q.nome).join(", ")})`, pct(r.coeficiente), r.cumpre && r.rmiNaDer ? brl(r.rmiNaDer) : "—"]),
      },
    });
    if (melhor) {
      secoes.push({ titulo: `Memória de cálculo — ${melhor.nome}`, memoria: [...melhor.requisitos.map((q) => `${q.ok ? "✔" : "✘"} ${q.nome}: exigido ${q.exigido}; atual ${q.atual}`), ...melhor.memoria] });
      if (melhor.media?.itens.length) {
        secoes.push({
          titulo: "Salários de contribuição considerados",
          tabela: { colunas: ["Competência", "Salário", "Limitado", "Fator", "Corrigido", "Situação"], linhas: melhor.media.itens.map((i) => [fmtComp(i.comp), brl(i.valor), brl(i.limitado), i.fator.toFixed(6).replace(".", ","), brl(i.corrigido), i.usado ? "considerado" : i.motivo ?? "descartado"]) },
        });
      }
    }
    if (plano.length) {
      secoes.push({
        titulo: "Planejamento previdenciário",
        linhas: [{ rotulo: "Contribuição projetada", valor: `${brl(salarioProjetado)} por mês (${ROTULO_TIPO[dados.projecao.tipo]})` }],
        tabela: { colunas: ["Regra", "Data provável", "Idade", "Renda estimada", "Meses a contribuir"], linhas: plano.map((p) => [p.regra.nome, p.data ? fmtData(p.data) : "não alcança", p.idadeNaData ? p.idadeNaData.toFixed(1).replace(".", ",") : "—", p.data ? brl(p.regra.rmiNaDer || p.regra.rmi) : "—", p.mesesFaltando !== null ? String(p.mesesFaltando) : "—"]) },
        memoria: ["Rendas em valores de hoje (sem inflação futura), considerando contribuições contínuas no valor projetado."],
      });
    }
    if (atrasados) {
      secoes.push({
        titulo: "Atrasados e valor da causa",
        linhas: [
          { rotulo: "RMI devida", valor: brl(rmiDevida) },
          ...(dados.atrasados.rmiPaga ? [{ rotulo: "RMI paga (revisão)", valor: brl(dados.atrasados.rmiPaga) }] : []),
          { rotulo: "Diferenças (principal)", valor: brl(atrasados.totais.diferenca) },
          { rotulo: "Correção monetária", valor: brl(atrasados.totais.corrigido - atrasados.totais.diferenca) },
          { rotulo: "Juros de mora", valor: brl(atrasados.totais.juros) },
          { rotulo: "Selic (EC 113)", valor: brl(atrasados.totais.selic) },
          { rotulo: "Total atualizado", valor: brl(atrasados.totais.total), destaque: true },
          { rotulo: "Honorários sucumbenciais", valor: brl(atrasados.honorarios) },
          { rotulo: "12 parcelas vincendas", valor: brl(atrasados.vincendas12) },
          { rotulo: "Valor da causa", valor: brl(atrasados.valorCausa), destaque: true },
        ],
        memoria: atrasados.memoria,
        tabela: { colunas: ["Comp.", "Tipo", "Devido", "Pago", "Diferença", "Corrigido", "Juros", "Selic", "Total"], linhas: atrasados.linhas.map((l) => [fmtComp(l.comp), l.tipo, brl(l.devido), brl(l.pago), brl(l.diferenca), brl(l.corrigido), brl(l.juros), brl(l.selic), l.prescrita ? "prescrita" : brl(l.total)]) },
      });
    }
    const avisos = [...dados.avisosCnis, ...(melhor?.observacoes ?? [])];
    return {
      titulo,
      subtitulo: dados.regime === "RPPS" ? "Análise de aposentadoria do servidor público (RPPS)" : "Análise previdenciária completa (RGPS)",
      geradoEm: new Date().toISOString(),
      secoes,
      avisos: [...new Set(avisos)],
      destaque: melhor ? `${brl(melhor.rmiNaDer)} — ${melhor.nome}` : undefined,
    };
  }

  async function salvar(): Promise<string | null> {
    setSalvando(true);
    setMsg(null);
    const r = await salvarCalculo({
      id,
      area: "PREVIDENCIARIO",
      tipo: dados.regime === "RPPS" ? "COMPLETO_RPPS" : "COMPLETO_RGPS",
      titulo,
      dados,
      resumo: montarRelatorio(),
      parecer: parecer || null,
      clienteId: cliente?.id ?? null,
    });
    setSalvando(false);
    if ("error" in r) {
      setMsg({ tipo: "erro", texto: r.error });
      return null;
    }
    if (!id) {
      setId(r.id);
      router.replace(`/previdenciario/calculo/${r.id}`, { scroll: false });
    }
    setMsg({ tipo: "ok", texto: "Cálculo salvo." });
    return r.id;
  }

  async function relatorio() {
    const janela = window.open("about:blank", "_blank");
    const novoId = await salvar();
    if (novoId && janela) janela.location.href = `/relatorio/calculo/${novoId}`;
    else janela?.close();
  }

  const ABAS: { id: Aba; nome: string; icone: typeof UserRound; oculta?: boolean }[] = [
    { id: "segurado", nome: "Segurado e CNIS", icone: UserRound },
    { id: "tempo", nome: "Tempo de contribuição", icone: Clock },
    { id: "salarios", nome: "Salários", icone: ListOrdered },
    { id: "regras", nome: dados.regime === "RPPS" ? "Regras do servidor" : "Aposentadorias", icone: Scale, oculta: !pode("previdenciario.aposentadoria") },
    { id: "planejamento", nome: "Planejamento", icone: TrendingUp, oculta: dados.regime !== "RGPS" || !pode("previdenciario.planejamento") },
    { id: "atrasados", nome: "Atrasados e revisão", icone: Wallet, oculta: !pode("previdenciario.atrasados") },
    { id: "ia", nome: "IA: parecer e assistente", icone: Bot, oculta: !pode("previdenciario.parecer") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/previdenciario" className="text-xs text-gray-500 hover:text-[var(--brand)] flex items-center gap-1"><ArrowLeft size={12} /> Previdenciário</Link>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[var(--brand)] focus:outline-none w-full max-w-xl" />
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            {dados.regime === "RPPS" ? <><Landmark size={12} /> Servidor público federal (RPPS)</> : <><Calculator size={12} /> Regime geral (INSS)</>}
            {carregandoIndices ? <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> índices</span> : atualizadoEm.INPC && <span>· índices do Banco Central atualizados em {new Date(atualizadoEm.INPC).toLocaleDateString("pt-BR")}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-64"><ClienteSelect valor={cliente} onChange={(c) => { setCliente(c); if (c && !seg.nome) set("segurado", { ...seg, nome: c.nome, cpf: c.documento ?? seg.cpf }); }} /></div>
          <button onClick={salvar} disabled={salvando} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
          </button>
          <button onClick={relatorio} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium px-4 py-2 hover:bg-gray-50"><FileText size={14} /> Relatório / PDF</button>
        </div>
      </div>

      {msg && <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${msg.tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.tipo === "ok" ? <Check size={14} /> : <AlertCircle size={14} />} {msg.texto}</div>}

      {/* Resumo fixo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {[
          { r: "Tempo na DER", v: fmtAMD(tempoDer.diasConvertidos) },
          { r: "Em 13/11/2019", v: fmtAMD(tempo103.diasConvertidos) },
          { r: "Carência", v: `${tempoDer.carencia} meses` },
          { r: "Idade na DER", v: pronto ? `${idadeEm(seg.nascimento, seg.der).toFixed(1).replace(".", ",")} anos` : "—" },
          { r: "Melhor benefício", v: melhor ? brl(melhor.rmiNaDer) : "—", d: melhor?.nome },
        ].map((x) => (
          <div key={x.r} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-[11px] text-gray-500">{x.r}</p>
            <p className="text-sm font-semibold text-gray-900">{x.v}</p>
            {x.d && <p className="text-[10px] text-gray-500 truncate">{x.d}</p>}
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {ABAS.filter((a) => !a.oculta).map(({ id: aid, nome, icone: Icone }) => (
          <button key={aid} onClick={() => setAba(aid)} className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px ${aba === aid ? "border-[var(--brand)] text-[var(--brand)] font-medium" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            <Icone size={14} /> {nome}
          </button>
        ))}
      </div>

      {aba === "segurado" && <AbaSegurado dados={dados} setDados={setDados} pode={pode} />}
      {aba === "tempo" && <AbaTempo dados={dados} set={set} tempoDer={tempoDer} tempo103={tempo103} />}
      {aba === "salarios" && <AbaSalarios dados={dados} set={set} indices={indices} />}
      {aba === "regras" && <AbaRegras regras={regras} melhor={melhor} pronto={pronto} />}
      {aba === "planejamento" && <AbaPlanejamento dados={dados} set={set} plano={plano} salarioProjetado={salarioProjetado} melhor={melhor} />}
      {aba === "atrasados" && <AbaAtrasados dados={dados} set={set} regras={regras} atrasados={atrasados} rmiDevida={rmiDevida} />}
      {aba === "ia" && <AbaIA contexto={() => relatorioComoTexto(montarRelatorio(), 80)} cliente={cliente?.nome ?? seg.nome} parecer={parecer} setParecer={setParecer} titulo={titulo} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: segurado e importação do CNIS
// ---------------------------------------------------------------------------

function AbaSegurado({ dados, setDados, pode }: { dados: DadosCompleto; setDados: React.Dispatch<React.SetStateAction<DadosCompleto>>; pode: (f: string) => boolean }) {
  const seg = dados.segurado;
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const setSeg = (k: keyof DadosCompleto["segurado"], v: string) => setDados((d) => ({ ...d, segurado: { ...d.segurado, [k]: v } }));

  async function importar(arquivo: File, ia = false) {
    setEnviando(true);
    setErro(null);
    setInfo(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      if (ia) fd.append("ia", "1");
      const res = await fetch("/api/prev/cnis", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao importar.");
      const r = data.resultado as ResultadoCnis;
      const conv = cnisParaCalculo(r);
      setDados((d) => ({
        ...d,
        segurado: {
          ...d.segurado,
          nome: d.segurado.nome || r.segurado.nome || "",
          cpf: d.segurado.cpf || r.segurado.cpf || "",
          nascimento: d.segurado.nascimento || r.segurado.nascimento || "",
        },
        periodos: conv.periodos,
        salarios: conv.salarios,
        avisosCnis: conv.avisos,
      }));
      setInfo(`${conv.periodos.length} vínculo(s) e ${conv.salarios.length} remuneração(ões) importados ${data.fonte === "ia" ? "pela IA" : "pelo leitor do CNIS"}. Revise as abas Tempo e Salários.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex gap-2">
          {(["RGPS", "RPPS"] as const).map((r) => (
            <button key={r} disabled={r === "RPPS" && !pode("previdenciario.rpps")} onClick={() => setDados((d) => ({ ...d, regime: r, atrasados: { ...d.atrasados, indice: r === "RPPS" ? "IPCAE" : "INPC" } }))} className={`rounded-lg px-3 py-1.5 text-sm border disabled:opacity-40 ${dados.regime === r ? "border-[var(--brand)] bg-[var(--brand)]/5 text-[var(--brand)] font-medium" : "border-gray-200 text-gray-600"}`}>
              {r === "RGPS" ? "INSS (RGPS)" : "Servidor federal (RPPS)"}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Campo rotulo="Nome do segurado" className="sm:col-span-2"><input value={seg.nome} onChange={(e) => setSeg("nome", e.target.value)} className={INPUT} /></Campo>
          <Campo rotulo="CPF"><input value={seg.cpf} onChange={(e) => setSeg("cpf", e.target.value)} className={INPUT} /></Campo>
          <Campo rotulo="Sexo">
            <select value={seg.sexo} onChange={(e) => setSeg("sexo", e.target.value)} className={INPUT}><option value="M">Masculino</option><option value="F">Feminino</option></select>
          </Campo>
          <Campo rotulo="Data de nascimento *"><input type="date" value={seg.nascimento} onChange={(e) => setSeg("nascimento", e.target.value)} className={INPUT} /></Campo>
          <Campo rotulo="DER / data do cálculo *"><input type="date" value={seg.der} onChange={(e) => setSeg("der", e.target.value)} className={INPUT} /></Campo>
          <Campo rotulo="Pessoa com deficiência (LC 142)">
            <select value={seg.pcdGrau} onChange={(e) => setSeg("pcdGrau", e.target.value)} className={INPUT}><option value="">Não</option><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="grave">Grave</option></select>
          </Campo>
        </div>
        {dados.regime === "RPPS" && (
          <div className="grid sm:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
            <Campo rotulo="Ingresso no serviço público"><input type="date" value={dados.servidor.ingressoServicoPublico} onChange={(e) => setDados((d) => ({ ...d, servidor: { ...d.servidor, ingressoServicoPublico: e.target.value } }))} className={INPUT} /></Campo>
            <Campo rotulo="Remuneração atual do cargo"><input inputMode="decimal" defaultValue={dados.servidor.remuneracaoCargo ? String(dados.servidor.remuneracaoCargo).replace(".", ",") : ""} onBlur={(e) => setDados((d) => ({ ...d, servidor: { ...d.servidor, remuneracaoCargo: numBR(e.target.value) } }))} className={INPUT} placeholder="0,00" /></Campo>
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-5"><input type="checkbox" checked={dados.servidor.rpc} onChange={(e) => setDados((d) => ({ ...d, servidor: { ...d.servidor, rpc: e.target.checked } }))} className="h-4 w-4 accent-[var(--brand)]" /> Sujeito ao teto do RGPS (Funpresp)</label>
            <p className="sm:col-span-3 text-[11px] text-gray-500">Na aba Tempo, marque em cada período: regime RPPS, serviço público, carreira e cargo atual — são requisitos das regras do servidor.</p>
          </div>
        )}
      </div>

      {pode("previdenciario.cnis") && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><FileUp size={16} className="text-[var(--brand)]" /> Importar dados do INSS</p>
          <p className="text-xs text-gray-500">Envie o <strong>CNIS (Extrato Previdenciário)</strong> em PDF baixado do Meu INSS. O sistema lê vínculos, datas, indicadores (IEAN, PEXT…) e remunerações. Para carta de concessão, HISCRE ou documento digitalizado, use a leitura por IA.</p>
          <input ref={arquivoRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ""; }} />
          <button onClick={() => arquivoRef.current?.click()} disabled={enviando} className="w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-[var(--brand)] px-4 py-5 text-sm text-gray-600 disabled:opacity-60">
            {enviando ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Lendo o documento...</span> : "Clique para enviar o PDF do CNIS"}
          </button>
          <button onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".pdf,image/*"; inp.onchange = () => inp.files?.[0] && importar(inp.files[0], true); inp.click(); }} disabled={enviando} className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-sm px-3 py-2 disabled:opacity-60">
            <Sparkles size={14} /> Ler outro documento com IA
          </button>
          {info && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">{info}</p>}
          {erro && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-2 py-1.5">{erro}</p>}
          {dados.avisosCnis.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 space-y-1 max-h-60 overflow-y-auto">
              <p className="font-semibold">Pontos de atenção do CNIS</p>
              {dados.avisosCnis.map((a, i) => <p key={i}>• {a}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: tempo de contribuição
// ---------------------------------------------------------------------------

function AbaTempo({ dados, set, tempoDer, tempo103 }: { dados: DadosCompleto; set: <K extends keyof DadosCompleto>(k: K, v: DadosCompleto[K]) => void; tempoDer: ReturnType<typeof tempoEm>; tempo103: ReturnType<typeof tempoEm> }) {
  const sexo = dados.segurado.sexo;
  const atualizar = (i: number, p: Partial<Periodo>) => set("periodos", dados.periodos.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const novo = () => set("periodos", [...dados.periodos, { id: crypto.randomUUID(), inicio: "", fim: "", tipo: "comum", carencia: true, regime: dados.regime, servicoPublico: dados.regime === "RPPS", carreira: dados.regime === "RPPS", cargo: dados.regime === "RPPS", descricao: "" }]);
  const ordenar = () => set("periodos", [...dados.periodos].sort((a, b) => (a.inicio < b.inicio ? -1 : 1)));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2"><p className="text-[11px] text-gray-500">Total (com conversões)</p><p className="font-semibold">{fmtAMD(tempoDer.diasConvertidos)}</p></div>
        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2"><p className="text-[11px] text-gray-500">Sem conversão</p><p className="font-semibold">{fmtAMD(tempoDer.diasBrutos)}</p></div>
        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2"><p className="text-[11px] text-gray-500">Até 13/11/2019</p><p className="font-semibold">{fmtAMD(tempo103.diasConvertidos)}</p></div>
        <div className="rounded-lg bg-white border border-gray-200 px-3 py-2"><p className="text-[11px] text-gray-500">Especial 25/20/15 · magistério</p><p className="font-semibold text-xs">{fmtAMD(tempoDer.especial[25])} / {fmtAMD(tempoDer.especial[20])} / {fmtAMD(tempoDer.especial[15])} · {fmtAMD(tempoDer.diasProfessor)}</p></div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-2 py-2 text-left">Descrição / empregador</th>
              <th className="px-2 py-2 text-left">Início</th>
              <th className="px-2 py-2 text-left">Fim</th>
              <th className="px-2 py-2 text-left">Tipo</th>
              <th className="px-2 py-2" title="Magistério">Prof.</th>
              <th className="px-2 py-2" title="Conta carência">Car.</th>
              <th className="px-2 py-2" title="Pessoa com deficiência">PcD</th>
              {dados.regime === "RPPS" && <><th className="px-2 py-2">RPPS</th><th className="px-2 py-2" title="Serviço público">S.P.</th><th className="px-2 py-2">Carreira</th><th className="px-2 py-2">Cargo</th></>}
              <th className="px-2 py-2 text-right">Tempo</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dados.periodos.map((p, i) => {
              const ok = valida(p.inicio) && valida(p.fim) && p.fim >= p.inicio;
              const r = ok ? resumoPeriodo(p, sexo) : null;
              const chk = (k: keyof Periodo, padrao = false) => (
                <td className="px-2 text-center"><input type="checkbox" checked={(p[k] as boolean | undefined) ?? padrao} onChange={(e) => atualizar(i, { [k]: e.target.checked } as Partial<Periodo>)} className="accent-[var(--brand)]" /></td>
              );
              return (
                <tr key={p.id} className={ok ? "" : "bg-red-50/50"}>
                  <td className="px-2 py-1 min-w-[180px]"><input value={p.descricao ?? ""} onChange={(e) => atualizar(i, { descricao: e.target.value })} className={INPUT_SM} /></td>
                  <td className="px-2 py-1"><input type="date" value={p.inicio} onChange={(e) => atualizar(i, { inicio: e.target.value })} className={INPUT_SM} /></td>
                  <td className="px-2 py-1"><input type="date" value={p.fim} onChange={(e) => atualizar(i, { fim: e.target.value })} className={INPUT_SM} /></td>
                  <td className="px-2 py-1">
                    <select value={p.tipo} onChange={(e) => atualizar(i, { tipo: e.target.value as TipoPeriodo })} className={INPUT_SM}>
                      {Object.entries(ROTULO_TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  {chk("professor")}
                  {chk("carencia", true)}
                  {chk("pcd")}
                  {dados.regime === "RPPS" && (
                    <>
                      <td className="px-2 text-center"><input type="checkbox" checked={p.regime === "RPPS"} onChange={(e) => atualizar(i, { regime: e.target.checked ? "RPPS" : "RGPS" })} className="accent-[var(--brand)]" /></td>
                      {chk("servicoPublico")}
                      {chk("carreira")}
                      {chk("cargo")}
                    </>
                  )}
                  <td className="px-2 py-1 text-right whitespace-nowrap">{r ? <>{fmtAMD(r.dias)}{r.convertido !== r.dias && <span className="block text-[10px] text-emerald-700">conv. {fmtAMD(r.convertido)}</span>}</> : <span className="text-red-600">datas inválidas</span>}</td>
                  <td className="px-2"><button onClick={() => set("periodos", dados.periodos.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600" aria-label="Excluir período"><Trash2 size={13} /></button></td>
                </tr>
              );
            })}
            {!dados.periodos.length && <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-400">Nenhum período. Importe o CNIS na primeira aba ou adicione manualmente.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button onClick={novo} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"><Plus size={14} /> Adicionar período</button>
        <button onClick={ordenar} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Ordenar por data</button>
      </div>
      <p className="text-[11px] text-gray-500">Concomitâncias são descontadas automaticamente. Tempo especial é convertido em comum até 13/11/2019 (fatores {sexo === "M" ? "1,40 / 1,75 / 2,33" : "1,20 / 1,50 / 2,00"}). Desmarque “Car.” para períodos que não contam carência (rural antes de 11/1991, benefício não intercalado).</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: salários de contribuição
// ---------------------------------------------------------------------------

function AbaSalarios({ dados, set, indices }: { dados: DadosCompleto; set: <K extends keyof DadosCompleto>(k: K, v: DadosCompleto[K]) => void; indices: import("@/lib/prev/indices").Indices }) {
  const [colar, setColar] = useState("");
  const media = useMemo(() => (valida(dados.segurado.der) ? calcularMedia({ salarios: dados.salarios, dib: dados.segurado.der, indices, criterio: "100" }) : null), [dados.salarios, dados.segurado.der, indices]);
  function importarTexto() {
    const novos = colar.split("\n").map((l) => l.trim().match(/^(\d{2})\/(\d{4})[\s;\t]+(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)/)).filter(Boolean).map((m) => ({ comp: `${m![2]}-${m![1]}`, valor: numBR(m![3]), origem: "manual" }));
    set("salarios", [...dados.salarios, ...novos]);
    setColar("");
  }
  const ordenados = [...dados.salarios].map((s, i) => ({ ...s, i })).sort((a, b) => (a.comp < b.comp ? -1 : a.comp > b.comp ? 1 : 0));
  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-4">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-3 text-sm">
          <span><strong>{dados.salarios.length}</strong> salário(s)</span>
          {media && <span>Média de 100% corrigida: <strong>{brl(media.media)}</strong></span>}
          {media && media.itens.some((x) => !x.usado) && <span className="text-amber-700">{media.itens.filter((x) => !x.usado).length} abaixo do mínimo após 11/2019</span>}
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 text-gray-600"><tr><th className="px-2 py-1.5 text-left">Competência</th><th className="px-2 py-1.5 text-left">Valor</th><th className="px-2 py-1.5 text-left">Origem</th><th className="px-2 py-1.5 text-right">Teto</th><th /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {ordenados.map((s) => (
                <tr key={s.i}>
                  <td className="px-2 py-1"><input type="month" value={s.comp} onChange={(e) => set("salarios", dados.salarios.map((x, j) => (j === s.i ? { ...x, comp: e.target.value } : x)))} className={INPUT_SM} /></td>
                  <td className="px-2 py-1"><input inputMode="decimal" defaultValue={String(s.valor).replace(".", ",")} onBlur={(e) => set("salarios", dados.salarios.map((x, j) => (j === s.i ? { ...x, valor: numBR(e.target.value) } : x)))} className={INPUT_SM} /></td>
                  <td className="px-2 py-1 text-gray-500 truncate max-w-[200px]">{s.origem}</td>
                  <td className={`px-2 py-1 text-right ${s.comp >= "1994-07" && s.valor > teto(s.comp) ? "text-amber-700" : "text-gray-400"}`}>{s.comp >= "1994-07" ? brl(teto(s.comp)) : "—"}</td>
                  <td className="px-2"><button onClick={() => set("salarios", dados.salarios.filter((_, j) => j !== s.i))} className="text-gray-400 hover:text-red-600" aria-label="Excluir"><Trash2 size={12} /></button></td>
                </tr>
              ))}
              {!dados.salarios.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sem salários. Importe o CNIS ou cole ao lado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold">Colar salários</p>
        <p className="text-xs text-gray-500">Uma competência por linha: <code>MM/AAAA valor</code>. Competências repetidas (vínculos concomitantes) são somadas e limitadas ao teto.</p>
        <textarea value={colar} onChange={(e) => setColar(e.target.value)} rows={10} className={`${INPUT} font-mono text-xs`} placeholder={"01/2020 3.500,00\n02/2020 3.500,00"} />
        <div className="flex gap-2">
          <button onClick={importarTexto} className="rounded-lg bg-[var(--brand)] text-white text-sm px-3 py-1.5">Adicionar</button>
          <button onClick={() => set("salarios", [...dados.salarios, { comp: competencia(dados.segurado.der || "2026-01-01"), valor: 0, origem: "manual" }])} className="rounded-lg border border-gray-300 text-sm px-3 py-1.5">+ Linha</button>
          {dados.salarios.length > 0 && <button onClick={() => confirm("Apagar todos os salários?") && set("salarios", [])} className="ml-auto text-xs text-red-600">Limpar</button>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: regras
// ---------------------------------------------------------------------------

function CartaoRegra({ r, destaque }: { r: ResultadoRegra; destaque: boolean }) {
  const [aberto, setAberto] = useState(destaque);
  return (
    <div className={`rounded-xl border bg-white ${destaque ? "border-emerald-400 ring-1 ring-emerald-300" : r.cumpre ? "border-emerald-200" : "border-gray-200"}`}>
      <button onClick={() => setAberto((a) => !a)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {aberto ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{r.nome} {destaque && <span className="ml-1 text-[10px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">melhor benefício</span>}{r.integralidade && <span className="ml-1 text-[10px] rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5">integralidade + paridade</span>}</p>
          <p className="text-[11px] text-gray-500 truncate">{r.fundamento}</p>
        </div>
        <span className={`text-xs rounded-full px-2 py-0.5 ${r.cumpre ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{r.cumpre ? "Cumpre" : "Não cumpre"}</span>
        <span className={`text-sm w-28 text-right ${r.cumpre ? "font-semibold" : "text-gray-400"}`} title={r.cumpre ? "" : "Renda se cumprisse os requisitos hoje"}>{r.rmiNaDer ? (r.cumpre ? brl(r.rmiNaDer) : `(${brl(r.rmiNaDer)})`) : "—"}</span>
      </button>
      {aberto && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 text-sm">
          <table className="w-full text-xs">
            <thead className="text-gray-500"><tr><th className="text-left py-1">Requisito</th><th className="text-left">Exigido</th><th className="text-left">Atual</th></tr></thead>
            <tbody>{r.requisitos.map((q, i) => <tr key={i} className={q.ok ? "text-emerald-700" : "text-red-700"}><td className="py-0.5">{q.ok ? "✔" : "✘"} {q.nome}</td><td>{q.exigido}</td><td>{q.atual}</td></tr>)}</tbody>
          </table>
          <p className="text-xs text-gray-500">Avaliada em {fmtData(r.dataAvaliacao)} · coeficiente {pct(r.coeficiente)}{r.fator ? ` · fator ${r.fator.valor.toFixed(4)}${r.fator.aplicado ? "" : " (não aplicado)"}` : ""}</p>
          <ul className="list-disc pl-5 text-xs text-gray-700 space-y-0.5">{r.memoria.map((m, i) => <li key={i}>{m}</li>)}</ul>
          {r.observacoes.length > 0 && <div className="text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2">{r.observacoes.map((o, i) => <p key={i}>{o}</p>)}</div>}
        </div>
      )}
    </div>
  );
}

function AbaRegras({ regras, melhor, pronto }: { regras: ResultadoRegra[]; melhor: ResultadoRegra | null; pronto: boolean }) {
  const [mostrarNA, setMostrarNA] = useState(false);
  if (!pronto) return <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-6">Informe a data de nascimento e a DER na aba Segurado.</p>;
  const grupos = [...new Set(regras.map((r) => r.grupo))];
  const naoAplicaveis = regras.filter((r) => !r.aplicavel);
  return (
    <div className="space-y-5">
      {grupos.map((g) => {
        const lista = regras.filter((r) => r.grupo === g && r.aplicavel);
        if (!lista.length) return null;
        return (
          <div key={g} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{g}</p>
            {lista.map((r) => <CartaoRegra key={r.id} r={r} destaque={melhor?.id === r.id} />)}
          </div>
        );
      })}
      {naoAplicaveis.length > 0 && (
        <div>
          <button onClick={() => setMostrarNA((m) => !m)} className="text-xs text-gray-500 hover:text-gray-800">{mostrarNA ? "Ocultar" : "Mostrar"} {naoAplicaveis.length} regra(s) que não se aplicam</button>
          {mostrarNA && <ul className="mt-2 text-xs text-gray-500 space-y-1">{naoAplicaveis.map((r) => <li key={r.id}>• <strong>{r.nome}</strong>: {r.motivoNaoAplicavel}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: planejamento
// ---------------------------------------------------------------------------

function AbaPlanejamento({ dados, set, plano, salarioProjetado, melhor }: { dados: DadosCompleto; set: <K extends keyof DadosCompleto>(k: K, v: DadosCompleto[K]) => void; plano: ItemPlanejamento[]; salarioProjetado: number; melhor: ResultadoRegra | null }) {
  const p = dados.projecao;
  const comFuturo = plano.filter((x) => x.data);
  const maiorRenda = [...comFuturo].sort((a, b) => (b.regra.rmiNaDer || b.regra.rmi) - (a.regra.rmiNaDer || a.regra.rmi))[0];
  const primeiro = comFuturo[0];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <Campo rotulo="Cenário de contribuição">
          <select value={p.cenario} onChange={(e) => set("projecao", { ...p, cenario: e.target.value as DadosCompleto["projecao"]["cenario"] })} className={INPUT}>
            <option value="atual">Manter o último salário</option>
            <option value="minimo">Salário mínimo</option>
            <option value="teto">Teto do INSS</option>
            <option value="personalizado">Valor personalizado</option>
          </select>
        </Campo>
        {p.cenario === "personalizado" && <Campo rotulo="Salário projetado"><input inputMode="decimal" defaultValue={p.salario ? String(p.salario).replace(".", ",") : ""} onBlur={(e) => set("projecao", { ...p, salario: numBR(e.target.value) })} className={INPUT} /></Campo>}
        <Campo rotulo="Natureza do tempo futuro">
          <select value={p.tipo} onChange={(e) => set("projecao", { ...p, tipo: e.target.value as TipoPeriodo })} className={INPUT}>{Object.entries(ROTULO_TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Campo>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={p.professor} onChange={(e) => set("projecao", { ...p, professor: e.target.checked })} className="accent-[var(--brand)]" /> Continua no magistério</label>
        <p className="sm:col-span-2 lg:col-span-4 text-xs text-gray-500">Projeção com {brl(salarioProjetado)}/mês, sem inflação futura (valores de hoje).</p>
      </div>

      {primeiro && (
        <div className="grid sm:grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><p className="text-[11px] text-emerald-800">Aposentadoria mais próxima</p><p className="font-semibold text-sm">{primeiro.regra.nome}</p><p className="text-xs">{fmtData(primeiro.data)} · {brl(primeiro.regra.rmiNaDer || primeiro.regra.rmi)}</p></div>
          {maiorRenda && <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3"><p className="text-[11px] text-indigo-800">Maior renda no horizonte</p><p className="font-semibold text-sm">{maiorRenda.regra.nome}</p><p className="text-xs">{fmtData(maiorRenda.data)} · {brl(maiorRenda.regra.rmiNaDer || maiorRenda.regra.rmi)}</p></div>}
          {primeiro && maiorRenda && maiorRenda !== primeiro && (() => {
            const meses = Math.max(0, Math.round((new Date(maiorRenda.data!).getTime() - new Date(primeiro.data!).getTime()) / (30.4375 * 86400000)));
            const eq = pontoEquilibrio(primeiro.regra.rmiNaDer || primeiro.regra.rmi, maiorRenda.regra.rmiNaDer || maiorRenda.regra.rmi, meses);
            return <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><p className="text-[11px] text-amber-800">Vale esperar?</p><p className="text-xs">Esperando {meses} meses, o ganho compensa {eq ? `após ${eq} meses (${(eq / 12).toFixed(1).replace(".", ",")} anos) de benefício` : "— não compensa"}.</p></div>;
          })()}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600"><tr><th className="px-3 py-2 text-left">Regra</th><th className="px-3 py-2 text-left">Data provável</th><th className="px-3 py-2 text-left">Idade</th><th className="px-3 py-2 text-right">Renda estimada</th><th className="px-3 py-2 text-right">Meses a contribuir</th><th className="px-3 py-2 text-right">Custo (20%)</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {plano.map((x) => (
              <tr key={x.regra.id} className={x.jaCumpre ? "bg-emerald-50/50" : ""}>
                <td className="px-3 py-2"><p className="font-medium">{x.regra.nome}</p><p className="text-[11px] text-gray-500">{x.regra.fundamento}</p></td>
                <td className="px-3 py-2">{x.jaCumpre ? <span className="text-emerald-700 font-medium">Já cumpre</span> : x.data ? fmtData(x.data) : <span className="text-gray-400">não alcança</span>}</td>
                <td className="px-3 py-2">{x.idadeNaData ? x.idadeNaData.toFixed(1).replace(".", ",") : "—"}</td>
                <td className="px-3 py-2 text-right font-medium">{x.data ? brl(x.regra.rmiNaDer || x.regra.rmi) : "—"}</td>
                <td className="px-3 py-2 text-right">{x.mesesFaltando ?? "—"}</td>
                <td className="px-3 py-2 text-right text-gray-500">{x.custoEstimado ? brl(x.custoEstimado) : "—"}</td>
              </tr>
            ))}
            {!plano.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Informe nascimento, DER e períodos.</td></tr>}
          </tbody>
        </table>
      </div>
      {melhor && <p className="text-xs text-gray-500">Benefício já disponível hoje: <strong>{melhor.nome}</strong> ({brl(melhor.rmiNaDer)}). Direito ao melhor benefício: Tema 334/STF; reafirmação da DER: Tema 995/STJ.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: atrasados, revisão e valor da causa
// ---------------------------------------------------------------------------

function AbaAtrasados({ dados, set, regras, atrasados, rmiDevida }: { dados: DadosCompleto; set: <K extends keyof DadosCompleto>(k: K, v: DadosCompleto[K]) => void; regras: ResultadoRegra[]; atrasados: ResultadoAtrasados | null; rmiDevida: number }) {
  const a = dados.atrasados;
  const up = (p: Partial<DadosCompleto["atrasados"]>) => set("atrasados", { ...a, ...p });
  const data = (k: keyof DadosCompleto["atrasados"], rotulo: string) => (
    <Campo rotulo={rotulo}><input type="date" value={String(a[k] ?? "")} onChange={(e) => up({ [k]: e.target.value } as Partial<DadosCompleto["atrasados"]>)} className={INPUT} /></Campo>
  );
  const cumpridas = regras.filter((r) => r.aplicavel && r.cumpre);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Campo rotulo="Benefício devido (RMI)" className="sm:col-span-2">
          <select value={a.regraId} onChange={(e) => up({ regraId: e.target.value, rmiManual: 0 })} className={INPUT}>
            <option value="">Melhor benefício cumprido</option>
            {cumpridas.map((r) => <option key={r.id} value={r.id}>{r.nome} — {brl(r.rmiNaDer)}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Ou RMI informada manualmente"><input inputMode="decimal" defaultValue={a.rmiManual ? String(a.rmiManual).replace(".", ",") : ""} onBlur={(e) => up({ rmiManual: numBR(e.target.value) })} className={INPUT} placeholder={rmiDevida ? brl(rmiDevida) : "0,00"} /></Campo>
        <Campo rotulo="RMI paga (revisão; vazio = concessão)"><input inputMode="decimal" defaultValue={a.rmiPaga ? String(a.rmiPaga).replace(".", ",") : ""} onBlur={(e) => up({ rmiPaga: numBR(e.target.value) })} className={INPUT} /></Campo>
        {data("dib", "DIB devida")}
        {data("fim", "Calcular parcelas até (DIP − 1)")}
        {data("dibPaga", "DIB do benefício pago")}
        {data("dataCalculo", "Atualizar até")}
        {data("ajuizamento", "Ajuizamento")}
        {data("citacao", "Citação")}
        {data("sentenca", "Sentença (Súmula 111)")}
        <Campo rotulo="Honorários (%)"><input inputMode="decimal" value={a.honorariosPercentual ?? 0} onChange={(e) => up({ honorariosPercentual: numBR(e.target.value) })} className={INPUT} /></Campo>
        <Campo rotulo="Correção monetária">
          <select value={a.indice} onChange={(e) => up({ indice: e.target.value as DadosCompleto["atrasados"]["indice"] })} className={INPUT}>
            <option value="INPC">INPC (benefícios do RGPS — Tema 905/STJ)</option>
            <option value="IPCAE">IPCA-E (Fazenda/servidor — Tema 810/STF)</option>
            <option value="IPCA">IPCA</option>
          </select>
        </Campo>
        <Campo rotulo="Juros de mora">
          <select value={a.juros} onChange={(e) => up({ juros: e.target.value as DadosCompleto["atrasados"]["juros"] })} className={INPUT}>
            <option value="poupanca">Poupança (Lei 11.960/09)</option>
            <option value="1">1% ao mês</option>
            <option value="0.5">0,5% ao mês</option>
            <option value="nenhum">Sem juros</option>
          </select>
        </Campo>
        <Campo rotulo="Reajuste da renda">
          <select value={a.reajuste} onChange={(e) => up({ reajuste: e.target.value as "INSS" | "nenhum" })} className={INPUT}>
            <option value="INSS">Índices do INSS (INPC)</option>
            <option value="nenhum">Sem reajuste (paridade/valor fixo)</option>
          </select>
        </Campo>
        <div className="flex flex-col gap-1.5 text-sm text-gray-700 pt-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={a.usarSelicEC113} onChange={(e) => up({ usarSelicEC113: e.target.checked })} className="accent-[var(--brand)]" /> Selic a partir de 12/2021 (EC 113)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={a.prescricao} onChange={(e) => up({ prescricao: e.target.checked })} className="accent-[var(--brand)]" /> Prescrição quinquenal</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={a.incluir13} onChange={(e) => up({ incluir13: e.target.checked })} className="accent-[var(--brand)]" /> Incluir 13º (abono anual)</label>
        </div>
      </div>

      {atrasados ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
            {[
              ["Diferenças", atrasados.totais.diferenca],
              ["Correção", atrasados.totais.corrigido - atrasados.totais.diferenca],
              ["Juros", atrasados.totais.juros],
              ["Selic", atrasados.totais.selic],
              ["Total atualizado", atrasados.totais.total],
              ["Valor da causa", atrasados.valorCausa],
            ].map(([r, v]) => (
              <div key={r as string} className={`rounded-xl border px-3 py-2 ${r === "Total atualizado" || r === "Valor da causa" ? "border-[var(--brand)] bg-[var(--brand)]/5" : "border-gray-200 bg-white"}`}>
                <p className="text-[11px] text-gray-500">{r}</p>
                <p className="text-sm font-semibold">{brl(v as number)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600">Honorários: <strong>{brl(atrasados.honorarios)}</strong> · 12 vincendas: <strong>{brl(atrasados.vincendas12)}</strong> · Prescrito: {brl(atrasados.totais.prescrito)} · JEF (60 SM): {atrasados.valorCausa <= salarioMinimo(competencia(a.ajuizamento || a.dataCalculo)) * 60 ? "dentro do limite" : "acima do limite"}</p>
          <ul className="text-xs text-gray-600 list-disc pl-5">{atrasados.memoria.map((m, i) => <li key={i}>{m}</li>)}</ul>
          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto max-h-[480px]">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 text-gray-600"><tr>{["Comp.", "Tipo", "Devido", "Pago", "Diferença", "Fator", "Corrigido", "Juros %", "Juros", "Selic %", "Selic", "Total"].map((c) => <th key={c} className="px-2 py-1.5 text-left whitespace-nowrap">{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {atrasados.linhas.map((l, i) => (
                  <tr key={i} className={l.prescrita ? "text-gray-400 line-through" : l.tipo === "13º" ? "bg-indigo-50/40" : ""}>
                    <td className="px-2 py-1">{fmtComp(l.comp)}</td><td className="px-2">{l.tipo}</td><td className="px-2">{brl(l.devido)}</td><td className="px-2">{brl(l.pago)}</td><td className="px-2">{brl(l.diferenca)}</td><td className="px-2">{l.fatorCorrecao.toFixed(6).replace(".", ",")}</td><td className="px-2">{brl(l.corrigido)}</td><td className="px-2">{l.jurosPct.toFixed(2).replace(".", ",")}</td><td className="px-2">{brl(l.juros)}</td><td className="px-2">{l.selicPct.toFixed(2).replace(".", ",")}</td><td className="px-2">{brl(l.selic)}</td><td className="px-2 font-medium">{brl(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-6">Informe a DIB, a data final e a RMI devida (ou cumpra uma regra) para gerar a planilha de atrasados.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: IA — parecer, petições e assistente de cálculos
// ---------------------------------------------------------------------------

const DOCUMENTOS = [
  { acao: "parecer", nome: "Parecer técnico" },
  { acao: "planejamento", nome: "Planejamento para o cliente" },
  { acao: "peticao-concessao", nome: "Petição inicial (concessão)" },
  { acao: "peticao-revisao", nome: "Petição inicial (revisão)" },
  { acao: "recurso-administrativo", nome: "Recurso administrativo (CRPS)" },
  { acao: "impugnacao-calculos", nome: "Impugnação de cálculos" },
];

function AbaIA({ contexto, cliente, parecer, setParecer, titulo }: { contexto: () => string; cliente: string; parecer: string; setParecer: (t: string) => void; titulo: string }) {
  const [gerando, setGerando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [instrucoes, setInstrucoes] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerar(acao: string) {
    setGerando(acao);
    setErro(null);
    try {
      const res = await fetch("/api/prev/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area: "PREVIDENCIARIO", acao, contexto: contexto(), cliente, instrucoes }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro na IA.");
      setParecer(data.texto);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na IA.");
    } finally {
      setGerando(null);
    }
  }

  async function perguntar() {
    const q = pergunta.trim();
    if (!q || pensando) return;
    const novo = [...chat, { role: "user" as const, content: q }];
    setChat(novo);
    setPergunta("");
    setPensando(true);
    try {
      const res = await fetch("/api/prev/ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area: "PREVIDENCIARIO", acao: "assistente", contexto: contexto(), cliente, messages: novo }) });
      const data = await res.json().catch(() => ({}));
      setChat([...novo, { role: "assistant", content: res.ok ? data.texto : `⚠ ${data.error ?? "Erro"}` }]);
    } finally {
      setPensando(false);
    }
  }

  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><FileText size={15} className="text-[var(--brand)]" /> Documentos gerados a partir do cálculo</p>
        <textarea value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} rows={2} className={INPUT} placeholder="Orientações opcionais (ex.: pedir tutela; destacar o tempo especial do PPP de 2005)" />
        <div className="flex flex-wrap gap-2">
          {DOCUMENTOS.map((d) => (
            <button key={d.acao} onClick={() => gerar(d.acao)} disabled={!!gerando} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium px-3 py-1.5 disabled:opacity-50">
              {gerando === d.acao ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {d.nome}
            </button>
          ))}
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        {parecer && (
          <div className="rounded-lg border border-gray-200">
            <div className="flex justify-end gap-3 px-3 py-1.5 border-b border-gray-100 text-xs text-gray-500">
              <button onClick={async () => { await navigator.clipboard.writeText(parecer).catch(() => {}); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }} className="flex items-center gap-1 hover:text-[var(--brand)]">{copiado ? <Check size={12} /> : <Copy size={12} />} Copiar</button>
              <button onClick={() => baixarDocx(parecer, titulo)} className="flex items-center gap-1 hover:text-[var(--brand)]"><FileDown size={12} /> Word</button>
              <button onClick={() => setParecer("")} className="hover:text-red-600">Limpar</button>
            </div>
            <textarea value={parecer} onChange={(e) => setParecer(e.target.value)} rows={22} className="w-full p-3 text-sm leading-relaxed focus:outline-none rounded-b-lg" />
          </div>
        )}
        <p className="text-[11px] text-gray-400">O texto fica salvo no cálculo (botão Salvar) e entra no relatório.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white flex flex-col h-[640px]">
        <p className="px-4 py-3 border-b border-gray-100 text-sm font-semibold flex items-center gap-2"><Bot size={15} className="text-[var(--brand)]" /> Assistente de cálculos</p>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!chat.length && (
            <div className="text-sm text-gray-500 space-y-2">
              <p>Pergunte sobre este cálculo. O assistente vê os períodos, salários, regras e valores.</p>
              {["Qual a melhor estratégia para este segurado?", "Há inconsistências no CNIS que eu deva corrigir?", "Vale a pena pedir o reconhecimento do tempo especial?", "Explique em linguagem simples para o cliente."].map((s) => (
                <button key={s} onClick={() => setPergunta(s)} className="block text-left text-xs rounded-full border border-gray-200 px-3 py-1 hover:border-[var(--brand)]">{s}</button>
              ))}
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`text-sm rounded-xl px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-[var(--brand)] text-white ml-10" : "bg-gray-50 text-gray-800 mr-6"}`}>{m.content}</div>
          ))}
          {pensando && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> analisando o cálculo...</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); perguntar(); }} className="border-t border-gray-100 p-3 flex gap-2">
          <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} className={INPUT} placeholder="Pergunte ao assistente..." />
          <button type="submit" disabled={pensando || !pergunta.trim()} className="rounded-lg bg-[var(--brand)] text-white px-3 disabled:opacity-50" aria-label="Enviar"><Send size={15} /></button>
        </form>
      </div>
    </div>
  );
}

export { deBR, somaComp };
