"use client";

import { useActionState, useState } from "react";
import { resetUserPassword, type AdminState } from "@/lib/actions/admin";
import CredenciaisGeradas from "./credenciais-geradas";
import { KeyRound, X } from "lucide-react";

export default function ResetSenhaButton({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    resetUserPassword,
    undefined
  );

  return (
    <div className="relative">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm("Gerar uma nova senha? A senha atual deixará de funcionar.")) {
            e.preventDefault();
            return;
          }
          setShow(true);
        }}
      >
        <input type="hidden" name="id" value={userId} />
        <button
          type="submit"
          disabled={pending}
          title="Gerar nova senha"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-100 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <KeyRound size={14} />
        </button>
      </form>
      {show && state && "success" in state && (
        <div className="absolute right-0 top-full mt-2 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white shadow-xl ring-1 ring-slate-200 p-2">
          <button
            type="button"
            onClick={() => setShow(false)}
            title="Fechar"
            className="absolute right-3 top-3 text-emerald-700/60 hover:text-emerald-900"
          >
            <X size={14} />
          </button>
          <CredenciaisGeradas email={state.email} password={state.password} />
        </div>
      )}
    </div>
  );
}
