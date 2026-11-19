"use client";

import { Printer, ArrowLeft } from "lucide-react";

export default function BotoesRelatorio({ titulo }: { id: string; titulo: string }) {
  return (
    <div className="print:hidden mx-auto max-w-[210mm] mb-3 flex items-center justify-between">
      <button onClick={() => history.length > 1 ? history.back() : window.close()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={15} /> Voltar
      </button>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 hidden sm:inline">{titulo}</span>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand)] text-white text-sm font-medium px-4 py-2">
          <Printer size={15} /> Imprimir / salvar em PDF
        </button>
      </div>
    </div>
  );
}
