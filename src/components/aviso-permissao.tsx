"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, X } from "lucide-react";

/** Mostra um aviso quando uma ação foi barrada pelo perfil (?sem-permissao=1). */
export default function AvisoPermissao() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ativo = params.get("sem-permissao") === "1";
  const [visivel, setVisivel] = useState(false);
  const [ativoAntes, setAtivoAntes] = useState(false);

  // Mostra quando o parâmetro aparece (padrão do React para reagir a mudança de props).
  if (ativo !== ativoAntes) {
    setAtivoAntes(ativo);
    if (ativo) setVisivel(true);
  }

  // Limpa o parâmetro da URL sem recarregar.
  useEffect(() => {
    if (!ativo) return;
    const p = new URLSearchParams(params);
    p.delete("sem-permissao");
    router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false });
  }, [ativo, params, pathname, router]);

  useEffect(() => {
    if (!visivel) return;
    const t = setTimeout(() => setVisivel(false), 6000);
    return () => clearTimeout(t);
  }, [visivel]);

  if (!visivel) return null;
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 sm:w-96 rounded-xl bg-white shadow-xl ring-1 ring-amber-200 p-4 flex gap-3">
      <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-gray-900">Ação não permitida</p>
        <p className="text-gray-500 mt-0.5">
          Seu perfil de acesso não permite isso. Fale com o sócio responsável pelo escritório.
        </p>
      </div>
      <button type="button" onClick={() => setVisivel(false)} className="text-gray-400 hover:text-gray-700 self-start">
        <X size={16} />
      </button>
    </div>
  );
}
