"use client";

import { useActionState, useState } from "react";
import { salvarMarca, type MarcaState } from "@/lib/actions/admin";
import { TAMANHOS_FONTE } from "@/lib/marca";
import { Check, ImageUp, Scale } from "lucide-react";

export type MarcaAdmin = {
  nomeTopo: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  corPrimaria: string | null;
  corMenu: string | null;
  tamanhoFonte: number;
};

const CAMPO =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 focus:border-[var(--brand)]";
const ROTULO = "block text-xs font-medium text-gray-600 mb-1";

function CampoImagem({
  tipo,
  titulo,
  dica,
  atual,
  onPrevia,
}: {
  tipo: "logo" | "capa";
  titulo: string;
  dica: string;
  atual: string | null;
  onPrevia: (url: string | null) => void;
}) {
  return (
    <div>
      <p className={ROTULO}>{titulo}</p>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-gray-600 hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <ImageUp size={15} /> Enviar imagem
        <input
          type="file"
          name={tipo}
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            onPrevia(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>
      <p className="mt-1 text-[11px] text-gray-400">{dica}</p>
      {atual && (
        <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" name={`remover_${tipo}`} /> Remover a atual
        </label>
      )}
    </div>
  );
}

/** Painel do superadmin: nome do topo, logo, capa, cores e tamanho das letras. */
export default function PersonalizarEscritorio({
  id,
  nome,
  marca,
  onFechar,
}: {
  id: string;
  nome: string;
  marca: MarcaAdmin;
  onFechar: () => void;
}) {
  const [state, action, pending] = useActionState<MarcaState, FormData>(salvarMarca, undefined);
  const [nomeTopo, setNomeTopo] = useState(marca.nomeTopo ?? "");
  const [usarCor, setUsarCor] = useState(!!marca.corPrimaria);
  const [cor, setCor] = useState(marca.corPrimaria ?? "#4f46e5");
  const [usarMenu, setUsarMenu] = useState(!!marca.corMenu);
  const [corMenu, setCorMenu] = useState(marca.corMenu ?? "#0f172a");
  const [fonte, setFonte] = useState(marca.tamanhoFonte);
  const [logo, setLogo] = useState<string | null>(marca.logoUrl);
  const [capa, setCapa] = useState<string | null>(marca.capaUrl);

  const corBotao = usarCor ? cor : "#4f46e5";
  const fundoMenu = usarMenu ? corMenu : "linear-gradient(180deg,#020617,#0f172a 50%,#1e1b4b)";

  return (
    <form action={action} className="px-5 py-5 bg-slate-50 border-t border-slate-100 grid gap-6 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={ROTULO}>Nome no topo do sistema</label>
          <input
            name="nomeTopo"
            value={nomeTopo}
            onChange={(e) => setNomeTopo(e.target.value)}
            maxLength={60}
            placeholder={`Genesis IA (padrão) · ex.: ${nome}`}
            className={`${CAMPO} w-full`}
          />
        </div>
        <CampoImagem tipo="logo" titulo="Logotipo" dica="PNG, JPG ou WebP, até 2 MB. Quadrado fica melhor." atual={marca.logoUrl} onPrevia={(u) => setLogo(u ?? marca.logoUrl)} />
        <CampoImagem tipo="capa" titulo="Imagem de capa (Área de trabalho)" dica="PNG, JPG ou WebP, até 5 MB. Ideal 1600×400." atual={marca.capaUrl} onPrevia={(u) => setCapa(u ?? marca.capaUrl)} />
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
            <input type="checkbox" name="usarCorPrimaria" checked={usarCor} onChange={(e) => setUsarCor(e.target.checked)} />
            Cor principal (botões e destaques)
          </label>
          <input type="color" name="corPrimaria" value={cor} onChange={(e) => { setCor(e.target.value); setUsarCor(true); }} className="h-9 w-24 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
            <input type="checkbox" name="usarCorMenu" checked={usarMenu} onChange={(e) => setUsarMenu(e.target.checked)} />
            Cor do menu lateral
          </label>
          <input type="color" name="corMenu" value={corMenu} onChange={(e) => { setCorMenu(e.target.value); setUsarMenu(true); }} className="h-9 w-24 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
        </div>
        <div className="sm:col-span-2">
          <label className={ROTULO}>Tamanho das letras</label>
          <div className="flex flex-wrap gap-1.5">
            {TAMANHOS_FONTE.map((t) => (
              <label
                key={t.valor}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                  fonte === t.valor ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]" : "border-slate-200 bg-white text-gray-600"
                }`}
                style={{ fontSize: `${(t.valor / 100) * 0.875}rem` }}
              >
                <input type="radio" name="tamanhoFonte" value={t.valor} checked={fonte === t.valor} onChange={() => setFonte(t.valor)} className="sr-only" />
                {t.label}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-1.5 shadow-sm disabled:opacity-60">
            {pending ? "Salvando..." : "Salvar personalização"}
          </button>
          <button type="button" onClick={onFechar} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-slate-200/60">
            Fechar
          </button>
          {state && "ok" in state && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check size={13} /> Salvo</span>
          )}
          {state && "error" in state && <span className="text-xs text-red-600">{state.error}</span>}
        </div>
      </div>

      {/* Prévia */}
      <div>
        <p className={ROTULO}>Prévia</p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex h-12 items-center gap-2 px-3 text-white" style={{ background: fundoMenu }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-7 w-7 rounded-md object-contain bg-white/10" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500"><Scale size={14} /></span>
            )}
            <span className="truncate text-sm font-semibold">{nomeTopo || "Genesis IA"}</span>
          </div>
          {capa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capa} alt="" className="h-20 w-full object-cover" />
          ) : (
            <div className="flex h-20 items-center justify-center bg-slate-100 text-xs text-gray-400">sem capa</div>
          )}
          <div className="p-3" style={{ fontSize: `${(fonte / 100) * 0.875}rem` }}>
            <p className="font-medium text-gray-900">Área de trabalho</p>
            <p className="text-gray-500">Texto de exemplo com as letras escolhidas.</p>
            <span className="mt-2 inline-block rounded-md px-3 py-1 text-white" style={{ background: corBotao }}>
              Botão
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
