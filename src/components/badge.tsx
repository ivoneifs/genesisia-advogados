const STYLES: Record<string, string> = {
  ATIVO: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ARQUIVADO: "bg-gray-100 text-gray-600 ring-gray-500/20",
  ENCERRADO: "bg-gray-100 text-gray-600 ring-gray-500/20",
  PENDENTE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CUMPRIDO: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PAGO: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PERDIDO: "bg-red-50 text-red-700 ring-red-600/20",
  ATRASADO: "bg-red-50 text-red-700 ring-red-600/20",
  ALTA: "bg-red-50 text-red-700 ring-red-600/20",
  NORMAL: "bg-blue-50 text-blue-700 ring-blue-600/20",
  BAIXA: "bg-gray-100 text-gray-600 ring-gray-500/20",
  RECEITA: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DESPESA: "bg-red-50 text-red-700 ring-red-600/20",
  NAO_TRATADA: "bg-amber-50 text-amber-700 ring-amber-600/20",
  TRATADA: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

const LABELS: Record<string, string> = {
  NAO_TRATADA: "Não tratada",
  TRATADA: "Tratada",
  PARTE_CONTRARIA: "Parte contrária",
};

export default function Badge({ value }: { value: string }) {
  const style = STYLES[value] ?? "bg-gray-100 text-gray-600 ring-gray-500/20";
  const label =
    LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}
