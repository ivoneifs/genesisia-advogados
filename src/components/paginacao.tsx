import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Navegação de páginas para listas (mantém os filtros da URL). */
export default function Paginacao({
  pagina,
  totalPaginas,
  url,
}: {
  pagina: number;
  totalPaginas: number;
  url: (p: number) => string;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <span className="text-xs text-gray-500 mr-1">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina > 1 && (
        <Link href={url(pagina - 1)} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50">
          <ChevronLeft size={14} /> Anterior
        </Link>
      )}
      {pagina < totalPaginas && (
        <Link href={url(pagina + 1)} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50">
          Próxima <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function paginaDe(p: string | undefined) {
  return Math.max(1, Number.parseInt(p ?? "1", 10) || 1);
}

export function urlCom(base: string, filtros: Record<string, string | undefined>, p: number) {
  const sp = new URLSearchParams(Object.entries({ ...filtros, p: String(p) }).filter(([, v]) => v) as [string, string][]);
  return `${base}?${sp}`;
}
