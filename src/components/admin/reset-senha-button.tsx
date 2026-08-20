"use client";

import { useActionState, useState } from "react";
import { resetUserPassword, type AdminState } from "@/lib/actions/admin";
import CredenciaisGeradas from "./credenciais-geradas";
import { KeyRound } from "lucide-react";

export default function ResetSenhaButton({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    resetUserPassword,
    undefined
  );

  return (
    <div>
      <form
        action={formAction}
        onSubmit={() => setShow(true)}
      >
        <input type="hidden" name="id" value={userId} />
        <button
          type="submit"
          disabled={pending}
          title="Gerar nova senha"
          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <KeyRound size={13} />
        </button>
      </form>
      {show && state && "success" in state && (
        <div className="mt-2">
          <CredenciaisGeradas email={state.email} password={state.password} />
        </div>
      )}
    </div>
  );
}
