// Peças visuais compartilhadas do painel administrativo.

export const PLANO_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  BASICO: "Básico",
  PRO: "Pro",
};

export const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
};

export function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function Avatar({
  nome,
  size = "md",
}: {
  nome: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-10 w-10 text-sm"
      : size === "sm"
        ? "h-7 w-7 text-[11px]"
        : "h-8 w-8 text-xs";
  return (
    <div
      className={`${dim} shrink-0 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] font-semibold flex items-center justify-center ring-1 ring-inset ring-[var(--brand)]/15`}
    >
      {iniciais(nome) || "?"}
    </div>
  );
}

export function StatusBadge({
  status,
  ativo,
  expirado = false,
}: {
  status: string;
  ativo: boolean;
  expirado?: boolean;
}) {
  let txt = STATUS_LABEL[status] ?? status;
  let cls = "bg-gray-50 text-gray-600 ring-gray-500/20";
  let dot = "bg-gray-400";
  if (!ativo || status === "SUSPENSO") {
    txt = "Suspenso";
    cls = "bg-red-50 text-red-700 ring-red-600/20";
    dot = "bg-red-500";
  } else if (status === "TRIAL") {
    txt = expirado ? "Trial expirado" : "Trial";
    cls = expirado
      ? "bg-red-50 text-red-700 ring-red-600/20"
      : "bg-amber-50 text-amber-700 ring-amber-600/20";
    dot = expirado ? "bg-red-500" : "bg-amber-500";
  } else if (status === "ATIVO") {
    txt = "Ativo";
    cls = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    dot = "bg-emerald-500";
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {txt}
    </span>
  );
}

export function PlanoTag({ plano }: { plano: string }) {
  const cls =
    plano === "PRO"
      ? "bg-[var(--brand)] text-white ring-[var(--brand)]"
      : plano === "BASICO"
        ? "bg-white text-[var(--brand)] ring-[var(--brand)]/30"
        : "bg-white text-gray-500 ring-gray-300";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {PLANO_LABEL[plano] ?? plano}
    </span>
  );
}

export function PageHeader({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {titulo}
        </h1>
        {descricao && <p className="text-sm text-gray-500 mt-1">{descricao}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
