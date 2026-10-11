// Lado do navegador: compara a versão em que a página foi carregada com a do
// servidor. Se mudou (houve deploy), recarrega a página uma única vez.

const CHAVE = "genesis:recarregou-em";

export async function recarregarSeHouverNovaVersao(): Promise<boolean> {
  try {
    const atual = document.querySelector<HTMLMetaElement>('meta[name="app-versao"]')?.content;
    if (!atual) return false;
    const r = await fetch("/api/versao", { cache: "no-store" });
    const { versao } = (await r.json()) as { versao?: string };
    if (!versao || versao === atual) return false;

    // Evita laço de recarga: no máximo uma vez por minuto.
    const ultima = Number(sessionStorage.getItem(CHAVE) || 0);
    if (Date.now() - ultima < 60_000) return false;
    sessionStorage.setItem(CHAVE, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
