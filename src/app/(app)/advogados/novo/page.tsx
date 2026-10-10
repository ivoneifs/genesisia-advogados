import AdvogadoForm from "@/components/advogado-form";
import { createAdvogado } from "@/lib/actions/advogados";

export default async function NovoAdvogadoPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; oab?: string; uf?: string }>;
}) {
  const inicial = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Novo advogado(a)</h1>
        <p className="text-sm text-gray-500 mt-1">
          Os dados preenchem automaticamente as peças assinadas por este(a)
          advogado(a).
        </p>
      </div>
      <AdvogadoForm inicial={inicial} action={createAdvogado} />
    </div>
  );
}
