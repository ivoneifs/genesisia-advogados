"use client";

import { Printer, FileSpreadsheet } from "lucide-react";

export default function ProcessosToolbar({ csvHref }: { csvHref: string }) {
  return (
    <>
      <button
        type="button"
        onClick={() => window.print()}
        title="Imprimir"
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      >
        <Printer size={15} />
      </button>
      <a
        href={csvHref}
        title="Exportar todos (CSV)"
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      >
        <FileSpreadsheet size={15} />
      </a>
    </>
  );
}
