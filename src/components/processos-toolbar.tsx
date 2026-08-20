"use client";

import { Printer, FileSpreadsheet } from "lucide-react";

type Row = {
  numero: string;
  cliente: string;
  area: string;
  status: string;
  tribunal: string;
};

function toCsv(rows: Row[]) {
  const header = ["Número", "Cliente", "Área", "Status", "Tribunal/Vara"];
  const lines = rows.map((r) =>
    [r.numero, r.cliente, r.area, r.status, r.tribunal]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(";")
  );
  return [header.join(";"), ...lines].join("\n");
}

export default function ProcessosToolbar({ rows }: { rows: Row[] }) {
  function handlePrint() {
    window.print();
  }

  function handleExport() {
    const csv = "﻿" + toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "processos.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        title="Imprimir"
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      >
        <Printer size={15} />
      </button>
      <button
        type="button"
        onClick={handleExport}
        title="Exportar para CSV"
        className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
      >
        <FileSpreadsheet size={15} />
      </button>
    </>
  );
}
