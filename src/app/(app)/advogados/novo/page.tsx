import { redirect } from "next/navigation";
import AdvogadoForm from "@/components/advogado-form";
import { createAdvogado } from "@/lib/actions/advogados";
import { requireEscritorioId } from "@/lib/session";
import { MSG_OAB_EM_USO, podeCadastrarOab } from "@/lib/oab-trava";
import { Lock } from "lucide-react";

export default async function NovoAdvogadoPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; oab?: string; uf?: string; emuso?: string }>;
}) {
  const { emuso, ...inicial } = await searchParams;
  const escritorioId = await requireEscritorioId();
  if (!(await podeCadastrarOab(escritorioId))) redirect("/advogados?travada=1");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Cadastrar minha OAB</h1>
        <p className="text-sm text-gray-500 mt-1">
          Os dados preenchem automaticamente as peças assinadas por você.
        </p>
      </div>
      <div className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
        <Lock size={16} className="shrink-0 mt-0.5" />
        <p>
          Confira o número com atenção: depois de salva, a OAB fica <b>travada</b> no escritório. Ela não
          pode ser trocada e não fica disponível para nenhum outro escritório, protegendo os seus dados e
          os de outros advogados.
        </p>
      </div>
      {emuso && (
        <p className="max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {MSG_OAB_EM_USO}
        </p>
      )}
      <AdvogadoForm inicial={inicial} action={createAdvogado} />
    </div>
  );
}
