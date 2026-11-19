import { BookOpen, FileSearch, PenLine } from "lucide-react";
import AssistenteChat from "@/components/assistente-chat";
import { ativo } from "@/lib/modulos";
import { modulosDesativados } from "@/lib/modulos-server";

const RECURSOS = [
  {
    icone: FileSearch,
    titulo: "Análise e leitura",
    texto: "Lê os autos, resume decisões e organiza as informações relevantes do caso.",
  },
  {
    icone: PenLine,
    titulo: "Argumentação e redação",
    texto: "Estrutura argumentos, pedidos, contratos e minutas de peças com base no processo.",
  },
  {
    icone: BookOpen,
    titulo: "Interpretação jurídica",
    texto: "Aponta legislação, súmulas, jurisprudência e doutrina para embasar o caso concreto.",
  },
];

export default async function AssistentePage() {
  const anexos = ativo(await modulosDesativados(), "assistente.anexos");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Assistente IA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Envie o processo (PDF, Word ou imagens), diga o que você precisa e a IA
          analisa os autos e prepara a solução. Também responde sobre os
          processos, prazos, clientes e financeiro do escritório.
        </p>
      </div>
      <div className="hidden md:grid grid-cols-3 gap-3">
        {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
          <div key={titulo} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
              <Icone size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5">{texto}</p>
            </div>
          </div>
        ))}
      </div>
      <AssistenteChat anexosAtivos={anexos} />
      <p className="text-[11px] text-gray-400">
        Os arquivos enviados ficam guardados no servidor do escritório por até 7 dias e são
        apagados ao clicar em “Nova conversa”. As respostas são minutas geradas por IA e devem ser
        revisadas por um(a) advogado(a).
      </p>
    </div>
  );
}
