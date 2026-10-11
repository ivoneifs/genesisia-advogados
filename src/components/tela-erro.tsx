"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function TelaErro({
  error,
  reset,
  inicio = "/dashboard",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  inicio?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Algo deu errado</h1>
          <p className="text-sm text-gray-500 mt-1">
            Não foi possível carregar esta página agora. Tente novamente em instantes.
          </p>
          {error.digest && (
            <p className="text-[11px] text-gray-400 mt-2 font-mono">Código: {error.digest}</p>
          )}
        </div>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2"
          >
            <RotateCcw size={14} /> Tentar novamente
          </button>
          <Link href={inicio} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100">
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
