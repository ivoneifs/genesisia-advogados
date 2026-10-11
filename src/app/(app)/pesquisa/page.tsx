import Link from "next/link";
import { requireEscritorioId } from "@/lib/session";
import {
  FONTES,
  LABEL_ENTRADA,
  LABEL_SAIDA,
  LABEL_TIPO,
  rotulo,
  type Fonte,
} from "@/lib/pesquisa";
import { Search, ExternalLink, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

const POR_PAGINA = 40;

type Filtros = { q: string; cat: string; ent: string; sai: string; tipo: string; uf: string };

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function filtrar(f: Filtros, ignorar?: keyof Filtros): Fonte[] {
  const q = normalizar(f.q);
  return FONTES.filter(
    (x) =>
      (ignorar === "cat" || !f.cat || x.categoria === f.cat) &&
      (ignorar === "ent" || !f.ent || x.entrada.includes(f.ent)) &&
      (ignorar === "sai" || !f.sai || x.saida.includes(f.sai)) &&
      (ignorar === "tipo" || !f.tipo || x.tipo === f.tipo) &&
      (ignorar === "uf" || !f.uf || x.links.some((l) => l.uf === f.uf)) &&
      (!q || normalizar(`${x.nome} ${x.categoria} ${x.descricao}`).includes(q))
  );
}

/** Opções de um filtro com contagem, considerando os demais filtros ativos. */
function opcoes(f: Filtros, campo: keyof Filtros, valores: (x: Fonte) => (string | null)[]) {
  const cont = new Map<string, number>();
  for (const x of filtrar(f, campo)) {
    for (const v of new Set(valores(x))) if (v) cont.set(v, (cont.get(v) ?? 0) + 1);
  }
  return [...cont.entries()];
}

export default async function PesquisaPage({
  searchParams,
}: {
  searchParams: Promise<Partial<Filtros> & { p?: string }>;
}) {
  await requireEscritorioId();
  const sp = await searchParams;
  const f: Filtros = {
    q: sp.q?.trim() ?? "",
    cat: sp.cat ?? "",
    ent: sp.ent ?? "",
    sai: sp.sai ?? "",
    tipo: sp.tipo ?? "",
    uf: sp.uf ?? "",
  };

  const resultado = filtrar(f).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const totalPaginas = Math.max(1, Math.ceil(resultado.length / POR_PAGINA));
  const pagina = Math.min(totalPaginas, Math.max(1, Number.parseInt(sp.p ?? "1", 10) || 1));
  const visiveis = resultado.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const porNome = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0], "pt-BR");
  const categorias = opcoes(f, "cat", (x) => [x.categoria]).sort(porNome);
  const entradas = opcoes(f, "ent", (x) => x.entrada)
    .map(([v, n]) => [v, n, rotulo(LABEL_ENTRADA, v)] as const)
    .sort((a, b) => a[2].localeCompare(b[2], "pt-BR"));
  const saidas = opcoes(f, "sai", (x) => x.saida)
    .map(([v, n]) => [v, n, rotulo(LABEL_SAIDA, v)] as const)
    .sort((a, b) => a[2].localeCompare(b[2], "pt-BR"));
  const tipos = opcoes(f, "tipo", (x) => [x.tipo])
    .map(([v, n]) => [v, n, rotulo(LABEL_TIPO, v)] as const)
    .sort((a, b) => a[2].localeCompare(b[2], "pt-BR"));
  const ufs = opcoes(f, "uf", (x) => x.links.map((l) => l.uf)).sort(porNome);

  const ativos = Object.entries(f).filter(([, v]) => v) as [keyof Filtros, string][];
  const url = (mudar: Partial<Filtros> & { p?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, ...mudar })) if (v) qs.set(k, String(v));
    return `/pesquisa${qs.size ? `?${qs}` : ""}`;
  };
  const nomeFiltro = (k: keyof Filtros, v: string) =>
    k === "ent"
      ? `Tenho: ${rotulo(LABEL_ENTRADA, v)}`
      : k === "sai"
        ? `Quero: ${rotulo(LABEL_SAIDA, v)}`
        : k === "tipo"
          ? rotulo(LABEL_TIPO, v)
          : k === "uf"
            ? `UF: ${v}`
            : k === "q"
              ? `"${v}"`
              : v;

  const select =
    "w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Pesquisa</h1>
        <p className="text-sm text-gray-500 mt-1">
          {FONTES.length} fontes públicas de consulta: órgãos, tribunais, registros e
          dados abertos. Filtre pelo dado que você tem e pelo que quer descobrir.
        </p>
      </div>

      <form className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={f.q}
            placeholder="Buscar fonte (ex.: certidão, imóvel, Detran, TJSP)"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Filtro label="Categoria" name="cat" valor={f.cat} classe={select}>
            {categorias.map(([v, n]) => (
              <option key={v} value={v}>
                {v} ({n})
              </option>
            ))}
          </Filtro>
          <Filtro label="O que você tem" name="ent" valor={f.ent} classe={select}>
            {entradas.map(([v, n, l]) => (
              <option key={v} value={v}>
                {l} ({n})
              </option>
            ))}
          </Filtro>
          <Filtro label="O que quer obter" name="sai" valor={f.sai} classe={select}>
            {saidas.map(([v, n, l]) => (
              <option key={v} value={v}>
                {l} ({n})
              </option>
            ))}
          </Filtro>
          <Filtro label="Tipo de fonte" name="tipo" valor={f.tipo} classe={select}>
            {tipos.map(([v, n, l]) => (
              <option key={v} value={v}>
                {l} ({n})
              </option>
            ))}
          </Filtro>
          <Filtro label="UF" name="uf" valor={f.uf} classe={select}>
            {ufs.map(([v, n]) => (
              <option key={v} value={v}>
                {v} ({n})
              </option>
            ))}
          </Filtro>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Filtrar
          </button>
          {ativos.length > 0 && (
            <Link href="/pesquisa" className="text-sm text-gray-500 hover:text-[var(--brand)]">
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {ativos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ativos.map(([k, v]) => (
            <Link
              key={k}
              href={url({ [k]: "", p: 1 })}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] px-3 py-1 text-xs font-medium hover:bg-[var(--brand)]/20"
            >
              {nomeFiltro(k, v)} <X size={12} />
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-500">
          {resultado.length} fonte{resultado.length !== 1 && "s"}
          {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
        </div>
        <ul className="divide-y divide-gray-100">
          {visiveis.map((x) => (
            <li key={x.id} className="px-5 py-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{x.nome}</p>
                  <p className="text-xs text-gray-500">
                    <Link href={url({ cat: x.categoria, p: 1 })} className="hover:text-[var(--brand)] hover:underline">
                      {x.categoria}
                    </Link>{" "}
                    · {rotulo(LABEL_TIPO, x.tipo)}
                  </p>
                  {x.descricao && <p className="text-sm text-gray-600 mt-1">{x.descricao}</p>}
                </div>
              </div>
              {(x.entrada.some((e) => e !== "nenhum") || x.saida.length > 0) && (
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {x.entrada
                    .filter((e) => e !== "nenhum")
                    .map((e) => (
                      <Link
                        key={`e-${e}`}
                        href={url({ ent: e, p: 1 })}
                        className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 hover:bg-gray-200"
                      >
                        Tenho: {rotulo(LABEL_ENTRADA, e)}
                      </Link>
                    ))}
                  {x.saida.map((s) => (
                    <Link
                      key={`s-${s}`}
                      href={url({ sai: s, p: 1 })}
                      className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 hover:bg-emerald-100"
                    >
                      {rotulo(LABEL_SAIDA, s)}
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {(f.uf ? x.links.filter((l) => !l.uf || l.uf === f.uf) : x.links).map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline break-all"
                  >
                    {[l.uf, l.label].filter(Boolean).join(" · ") || host(l.url)}
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                ))}
              </div>
            </li>
          ))}
          {visiveis.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-gray-400">
              Nenhuma fonte com esses filtros.{" "}
              <Link href="/pesquisa" className="text-[var(--brand)] underline">
                Limpar filtros
              </Link>
            </li>
          )}
        </ul>
        {totalPaginas > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            {pagina > 1 ? (
              <Link href={url({ p: pagina - 1 })} className="inline-flex items-center gap-1 text-gray-600 hover:text-[var(--brand)]">
                <ChevronLeft size={15} /> Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-500">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas ? (
              <Link href={url({ p: pagina + 1 })} className="inline-flex items-center gap-1 text-gray-600 hover:text-[var(--brand)]">
                Próxima <ChevronRight size={15} />
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Filtro({
  label,
  name,
  valor,
  classe,
  children,
}: {
  label: string;
  name: string;
  valor: string;
  classe: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <select name={name} defaultValue={valor} className={classe}>
          <option value="">Todos</option>
          {children}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
    </div>
  );
}
