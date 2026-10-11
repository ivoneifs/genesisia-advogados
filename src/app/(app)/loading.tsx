// Esqueleto exibido enquanto uma página do app carrega.
export default function Carregando() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-slate-200/80" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-200/60" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white ring-1 ring-slate-200/80" />
        ))}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-slate-200/80 divide-y divide-slate-100">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-200/70" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-slate-200/80" />
              <div className="h-3 w-1/2 rounded bg-slate-200/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
