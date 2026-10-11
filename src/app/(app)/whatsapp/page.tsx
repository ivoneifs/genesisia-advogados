import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireEscritorioId } from "@/lib/session";
import { formatDateTimeBR } from "@/lib/format";
import {
  salvarConfigWhatsapp,
  salvarWhatsappUsuarios,
  usarNumeroCentral,
} from "@/lib/actions/whatsapp";
import {
  INSTANCIA_CENTRAL,
  estadoInstancia,
  evolutionConfigurada,
  formatarWhatsapp,
  normalizarWhatsapp,
  type EstadoConexao,
} from "@/lib/whatsapp";
import { ConectarNumero, EnviarTeste } from "@/components/whatsapp-conexao";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users2,
  UserRound,
  Pencil,
} from "lucide-react";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  AGENDA: "Agenda",
  PRAZO: "Prazo",
  PUBLICACOES: "Publicações",
  RESUMO: "Resumo diário",
  TESTE: "Teste",
};

const CARD = "rounded-xl border border-gray-200 bg-white";

function Toggle({
  name,
  label,
  descricao,
  checked,
}: {
  name: string;
  label: string;
  descricao: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 py-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--brand)]"
      />
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        <span className="block text-xs text-gray-500">{descricao}</span>
      </span>
    </label>
  );
}

export default async function WhatsappPage() {
  const escritorioId = await requireEscritorioId();

  const [cfg, usuarios, advogados, clientesComTel, historico] = await Promise.all([
    prisma.configWhatsapp.findUnique({ where: { escritorioId } }),
    prisma.user.findMany({
      where: { escritorioId, ativo: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, whatsapp: true },
    }),
    prisma.advogado.findMany({
      where: { escritorioId, ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, oab: true, uf: true, telefone: true },
    }),
    prisma.cliente.count({
      where: { escritorioId, receberWhatsapp: true, telefone: { not: null } },
    }),
    prisma.alertaEnviado.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const configurada = evolutionConfigurada();
  const instancia = cfg?.instancia || INSTANCIA_CENTRAL;
  let estado: EstadoConexao | "erro" = "close";
  if (configurada && instancia) {
    estado = await estadoInstancia(instancia).catch(() => "erro" as const);
  }
  const conectado = estado === "open";
  const proprio = Boolean(cfg?.instancia);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle size={22} className="text-emerald-600" /> Alertas no WhatsApp
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Lembretes da agenda, prazos, novas publicações e um resumo diário
          enviados para os WhatsApps cadastrados.
        </p>
      </div>

      {!configurada && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          O envio por WhatsApp ainda não foi habilitado no servidor. Fale com o
          suporte do Genesis IA.
        </div>
      )}

      {/* Conexão */}
      <section className={`${CARD} p-5 space-y-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-gray-900">Número que envia</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {proprio
                ? "Número próprio do escritório."
                : INSTANCIA_CENTRAL
                  ? "Número central do Genesis IA. Você pode conectar o número do escritório."
                  : "Conecte o número de WhatsApp do escritório."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              conectado
                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                : "bg-red-50 text-red-700 ring-red-600/20"
            }`}
          >
            {conectado ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {conectado ? "Conectado" : estado === "connecting" ? "Aguardando leitura do QR" : "Desconectado"}
          </span>
        </div>
        {configurada && (
          <div className="flex flex-wrap items-start gap-3">
            <ConectarNumero conectado={conectado && proprio} />
            {proprio && INSTANCIA_CENTRAL && (
              <form action={usarNumeroCentral}>
                <button
                  type="submit"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Desconectar e usar o número central
                </button>
              </form>
            )}
          </div>
        )}
        {conectado && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-900 mb-2">Enviar mensagem de teste</p>
            <EnviarTeste />
          </div>
        )}
      </section>

      {/* O que enviar */}
      <section className={CARD}>
        <form action={salvarConfigWhatsapp}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">O que enviar</h2>
          </div>
          <div className="px-5 divide-y divide-gray-100">
            <Toggle
              name="ativo"
              label="Alertas ligados"
              descricao="Chave geral. Desligado, nada é enviado."
              checked={cfg?.ativo ?? false}
            />
            <Toggle
              name="agenda"
              label="Compromissos da agenda"
              descricao="Lembrete na véspera (até 24h antes) e 1 hora antes de cada compromisso."
              checked={cfg?.agenda ?? true}
            />
            <Toggle
              name="prazos"
              label="Prazos processuais"
              descricao="Aviso 3 dias antes, na véspera e no dia do vencimento."
              checked={cfg?.prazos ?? true}
            />
            <Toggle
              name="publicacoes"
              label="Novas publicações"
              descricao="Resumo das publicações que chegarem, entre 7h e 21h."
              checked={cfg?.publicacoes ?? true}
            />
            <Toggle
              name="resumoDiario"
              label="Resumo diário"
              descricao="Agenda do dia, prazos vencendo e publicações pendentes, numa única mensagem."
              checked={cfg?.resumoDiario ?? true}
            />
            <Toggle
              name="clientes"
              label="Avisar clientes de audiências e reuniões"
              descricao={`O cliente do processo recebe um lembrete na véspera. ${clientesComTel} cliente(s) com telefone e aviso permitido.`}
              checked={cfg?.clientes ?? false}
            />
            <div className="py-3 flex items-center gap-3">
              <label htmlFor="horaResumo" className="text-sm font-medium text-gray-900">
                Horário do resumo e dos avisos de prazo
              </label>
              <select
                id="horaResumo"
                name="horaResumo"
                defaultValue={cfg?.horaResumo ?? 7}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white"
              >
                {[5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              type="submit"
              className="rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2"
            >
              Salvar preferências
            </button>
          </div>
        </form>
      </section>

      {/* Quem recebe */}
      <section className={CARD}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Quem recebe</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cada alerta vai para o responsável e para os advogados do processo.
            Sem responsável definido, vai para todos.
          </p>
        </div>

        <form action={salvarWhatsappUsuarios} className="px-5 py-4 space-y-3">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Users2 size={15} className="text-gray-400" /> Usuários do sistema
          </p>
          {usuarios.map((u) => {
            const invalido = u.whatsapp && !normalizarWhatsapp(u.whatsapp);
            return (
              <div key={u.id} className="flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <div>
                  <input
                    name={`whatsapp_${u.id}`}
                    defaultValue={
                      u.whatsapp && !invalido ? formatarWhatsapp(u.whatsapp) : u.whatsapp ?? ""
                    }
                    placeholder="WhatsApp com DDD"
                    className={`w-52 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                      invalido ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {invalido && <p className="text-[11px] text-red-600 mt-0.5">Número inválido</p>}
                </div>
              </div>
            );
          })}
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 px-4 py-1.5"
          >
            Salvar números
          </button>
        </form>

        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <UserRound size={15} className="text-gray-400" /> Advogados cadastrados
          </p>
          <p className="text-xs text-gray-500">
            Usa o telefone do cadastro. Recebem os alertas dos processos em que a OAB aparece.
          </p>
          <ul className="divide-y divide-gray-100">
            {advogados.map((a) => {
              const n = normalizarWhatsapp(a.telefone);
              return (
                <li key={a.id} className="py-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 truncate">{a.nome}</p>
                    <p className="text-xs text-gray-500">OAB {a.oab}/{a.uf}</p>
                  </div>
                  <span className={`text-xs ${n ? "text-gray-700" : "text-amber-700"}`}>
                    {n ? formatarWhatsapp(n) : a.telefone ? "Telefone inválido" : "Sem telefone"}
                  </span>
                  <Link
                    href={`/advogados/${a.id}/editar`}
                    title="Editar"
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={13} />
                  </Link>
                </li>
              );
            })}
            {advogados.length === 0 && (
              <li className="py-2 text-sm text-gray-400">Nenhum advogado cadastrado.</li>
            )}
          </ul>
        </div>
      </section>

      {/* Histórico */}
      <section className={CARD}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Últimos envios</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {historico.map((h) => (
            <li key={h.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
              {h.ok ? (
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              ) : (
                <XCircle size={15} className="text-red-600 shrink-0" />
              )}
              <span className="w-28 shrink-0 text-xs text-gray-500">
                {formatDateTimeBR(h.createdAt)}
              </span>
              <span className="w-28 shrink-0 text-xs font-medium text-gray-700">
                {TIPO_LABEL[h.tipo] ?? h.tipo}
              </span>
              <span className="min-w-0 flex-1 truncate text-gray-700">
                {h.nome ? `${h.nome} · ` : ""}
                {formatarWhatsapp(h.destino)}
                {h.erro && <span className="text-red-600"> — {h.erro}</span>}
              </span>
            </li>
          ))}
          {historico.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-gray-400">
              Nenhum alerta enviado ainda.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
