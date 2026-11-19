import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { ativo, TODOS_MODULOS } from "@/lib/modulos";

function nomeDe(id: string) {
  const [pai] = id.split(".");
  const m = TODOS_MODULOS.find((x) => x.id === pai);
  const f = m?.funcoes?.find((x) => x.id === id);
  return f?.nome ?? m?.nome ?? id;
}

/** Para rotas de API: devolve a resposta 403 se o módulo estiver desligado. */
export function bloqueioApi(session: SessionPayload, id: string): NextResponse | null {
  if (ativo(session.desativados, id)) return null;
  return NextResponse.json(
    { error: `A função "${nomeDe(id)}" está desativada para este escritório. Fale com o administrador.` },
    { status: 403 }
  );
}

/** Para páginas e server actions: volta ao início com aviso se estiver desligado. */
export async function exigirModulo(id: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!ativo(session.desativados, id)) redirect(`/dashboard?modulo-off=${encodeURIComponent(id)}`);
  return session;
}

export async function modulosDesativados(): Promise<string[]> {
  return (await getSession())?.desativados ?? [];
}
