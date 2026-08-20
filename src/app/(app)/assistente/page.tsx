import AssistenteChat from "@/components/assistente-chat";

export default function AssistentePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Assistente IA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Converse sobre os processos, prazos, clientes e financeiro do
          escritório, ou peça ajuda para redigir um texto.
        </p>
      </div>
      <AssistenteChat />
    </div>
  );
}
