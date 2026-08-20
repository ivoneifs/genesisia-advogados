import { LifeBuoy, Mail, MessageCircle } from "lucide-react";

const FAQ = [
  {
    q: "Como cadastro um novo processo?",
    a: 'Vá em "Processos e casos" → botão "+" e preencha o número, cliente e demais dados.',
  },
  {
    q: "Como vinculo uma publicação a um processo?",
    a: 'Em "Publicações", cole o texto recebido e use o campo "Vincular a processo" na própria publicação.',
  },
  {
    q: "Onde vejo os prazos mais urgentes?",
    a: 'No "Dashboard" e em "Alertas" — prazos vencidos ou a vencer em até 3 dias aparecem destacados.',
  },
];

export default function SuportePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Suporte</h1>
        <p className="text-sm text-gray-500 mt-1">
          Precisa de ajuda? Fale com a gente ou consulte as perguntas
          frequentes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-3">
          <Mail size={18} className="text-[var(--brand)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">E-mail</p>
            <p className="text-sm text-gray-500">suporte@genesisia.com.br</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-start gap-3">
          <MessageCircle size={18} className="text-[var(--brand)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Chat</p>
            <p className="text-sm text-gray-500">Seg. a sex., 9h às 18h</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <LifeBuoy size={16} className="text-gray-500" />
          <h2 className="font-medium text-gray-900">Perguntas frequentes</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {FAQ.map((f) => (
            <li key={f.q} className="px-5 py-4">
              <p className="text-sm font-medium text-gray-900">{f.q}</p>
              <p className="text-sm text-gray-500 mt-1">{f.a}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
