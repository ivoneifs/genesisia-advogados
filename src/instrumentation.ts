// Inicia o agendador dos alertas por WhatsApp junto com o servidor Next.
// O app roda em um único container, então um setInterval basta.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ALERTAS_WHATSAPP === "off") return;

  const { processarAlertas } = await import("@/lib/alertas-whatsapp");
  const rodar = () =>
    processarAlertas().catch((e) => console.error("[alertas-whatsapp]", e));

  // Primeira passada 1 min após subir (deixa o migrate/seed terminar).
  setTimeout(rodar, 60_000);
  setInterval(rodar, 5 * 60_000);
}
