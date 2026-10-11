import Link from "next/link";
import { Scale } from "lucide-react";

export default function NaoEncontrada() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center">
          <Scale size={22} />
        </div>
        <p className="text-5xl font-semibold tracking-tight text-gray-900">404</p>
        <p className="text-sm text-gray-500">
          Esta página não existe ou foi removida.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-medium px-4 py-2"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
