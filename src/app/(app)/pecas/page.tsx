import { prisma } from "@/lib/db";
import PecaGenerator from "@/components/peca-generator";
import { requireEscritorioId } from "@/lib/session";
import { parseAdvogados } from "@/lib/advogados";

export default async function PecasPage({
  searchParams,
}: {
  searchParams: Promise<{ processo?: string }>;
}) {
  const escritorioId = await requireEscritorioId();
  const { processo: processoParam } = await searchParams;
  const [clientes, processos, advogados] = await Promise.all([
    prisma.cliente.findMany({ where: { escritorioId }, orderBy: { nome: "asc" } }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: {
        id: true,
        numero: true,
        vara: true,
        tribunal: true,
        parteContraria: true,
        clienteId: true,
        advogados: true,
      },
    }),
    prisma.advogado.findMany({
      where: { escritorioId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, oab: true, uf: true, email: true },
    }),
  ]);

  // Vindo de um processo: pré-seleciona processo, cliente e o advogado do
  // cadastro cuja OAB aparece no processo.
  const alvo = processoParam ? processos.find((p) => p.id === processoParam) : undefined;
  let inicial: { processoId: string; clienteId: string; advogadoId: string | null } | undefined;
  if (alvo) {
    const oabs = parseAdvogados(alvo.advogados).map((a) => `${a.oab.replace(/^0+/, "")}/${a.uf}`);
    const adv = advogados.find((a) => oabs.includes(`${a.oab.replace(/^0+/, "")}/${a.uf}`));
    inicial = { processoId: alvo.id, clienteId: alvo.clienteId, advogadoId: adv?.id ?? null };
  }
  const processosResumo = processos.map(({ advogados: _a, ...p }) => {
    void _a;
    return p;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Criação de peças
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gere minutas a partir de modelos, com preenchimento automático dos
          dados do cliente e processo.
        </p>
      </div>
      <PecaGenerator clientes={clientes} processos={processosResumo} advogados={advogados} inicial={inicial} />
    </div>
  );
}
