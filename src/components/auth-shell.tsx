import { Scale, Sparkles, CalendarClock, Users2, MessageSquareText } from "lucide-react";

// Moldura das telas de login e recuperação de senha.
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-white">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/40 flex items-center justify-center">
            <Scale size={20} />
          </div>
          <span className="text-xl font-semibold tracking-tight">Genesis IA</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight max-w-md">
            A gestão jurídica que acompanha o ritmo da sua advocacia.
          </h1>
          <p className="text-white/70 max-w-md">
            Processos, prazos, agenda, clientes e financeiro em um só lugar, com
            inteligência artificial para priorizar o que exige atenção agora.
          </p>
          <ul className="grid grid-cols-2 gap-3 pt-2 max-w-md">
            {[
              { icon: CalendarClock, t: "Prazos e audiências sob controle" },
              { icon: MessageSquareText, t: "Alertas no WhatsApp" },
              { icon: Users2, t: "Clientes e processos centralizados" },
              { icon: Sparkles, t: "Peças e pesquisa com IA" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 backdrop-blur p-3 text-sm text-white/85">
                <Icon size={17} className="text-violet-300 mb-2" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/40">
          © {new Date().getFullYear()} Genesis IA · Gestão jurídica inteligente
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center">
              <Scale size={18} />
            </div>
            <span className="text-lg font-semibold">Genesis IA</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
